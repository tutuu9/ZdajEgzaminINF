import { describe, expect, it } from 'vitest';
import { strToU8, zipSync } from 'fflate';
import { MAX_EXTRACTED_BYTES, type AttemptSnapshot } from '@zdaj/shared';
import { extractBrowserZip, safePath } from '../apps/web/src/safe-zip';
import { validateBackupAttempts, validateBackupLearning } from '../apps/web/src/backup-validation';
import {
  planBackupMerge,
  readProgressBackup,
  type ProgressBackup,
} from '../apps/web/src/backup-merge';
import { validateCachedGuide } from '../apps/web/src/backup-guide-validation';
import { allExamStudyGuides, examStudyGuides } from '../packages/content/src/exam-study';

function centralOffset(bytes: Uint8Array) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  for (let offset = 0; offset < bytes.length - 4; offset++)
    if (view.getUint32(offset, true) === 0x02014b50) return offset;
  throw new Error('No central directory');
}

describe('bounded browser ZIP import', () => {
  it('extracts UTF-8 project files and verifies their CRC', async () => {
    const files = await extractBrowserZip(
      zipSync({
        'index.html': strToU8('<h1>Zażółć gęślą jaźń</h1>'),
        'css/styl.css': strToU8('body { color: blue; }'),
      }),
    );
    expect(new TextDecoder().decode(files['index.html'])).toContain('Zażółć gęślą jaźń');
    expect(Object.keys(files)).toEqual(['index.html', 'css/styl.css']);
  });
  it('rejects traversal, duplicate case variants and nested archives before extraction', async () => {
    await expect(extractBrowserZip(zipSync({ '../escape.txt': strToU8('bad') }))).rejects.toThrow(
      'ścieżka',
    );
    await expect(
      extractBrowserZip(zipSync({ 'Index.html': strToU8('a'), 'index.html': strToU8('b') })),
    ).rejects.toThrow('powtarzać');
    await expect(extractBrowserZip(zipSync({ 'nested.zip': strToU8('bad') }))).rejects.toThrow(
      'kolejnego archiwum',
    );
  });
  it('rejects declared expansion beyond the limit before allocating output', async () => {
    const archive = zipSync({ 'bomb.txt': strToU8('small') });
    new DataView(archive.buffer).setUint32(
      centralOffset(archive) + 24,
      MAX_EXTRACTED_BYTES + 1,
      true,
    );
    await expect(extractBrowserZip(archive)).rejects.toThrow('50 MiB');
  });
  it('bounds actual decompression when the size metadata has been forged', async () => {
    const archive = zipSync({ 'bomb.txt': strToU8('a'.repeat(100000)) });
    const view = new DataView(archive.buffer);
    view.setUint32(centralOffset(archive) + 24, 2, true);
    view.setUint32(22, 2, true);
    await expect(extractBrowserZip(archive)).rejects.toThrow('Rzeczywisty rozmiar');
  });
  it('rejects symbolic links and corrupted CRC', async () => {
    const symlink = zipSync({ 'link.txt': strToU8('target') });
    new DataView(symlink.buffer).setUint32(centralOffset(symlink) + 38, 0xa1ff0000, true);
    await expect(extractBrowserZip(symlink)).rejects.toThrow('dowiązań');
    const corrupt = zipSync({ 'index.html': strToU8('text') });
    new DataView(corrupt.buffer).setUint32(centralOffset(corrupt) + 16, 123, true);
    await expect(extractBrowserZip(corrupt)).rejects.toThrow('suma kontrolna');
  });
  it('rejects absolute paths and control characters', () => {
    for (const path of [
      '/etc/passwd',
      'C:/secret',
      'foo\\bar',
      'a\u0000b',
      '../file',
      'folder//file',
    ])
      expect(() => safePath(path)).toThrow();
  });
});

const attempt = (): AttemptSnapshot => ({
  id: 'attempt-1',
  kind: 'practice',
  taskId: 'warsztaty',
  taskVersion: 1,
  title: 'Kalkulator',
  mode: 'nauka',
  level: 'beginner',
  createdAt: '2026-11-02T10:00:00.000Z',
  updatedAt: '2026-11-02T10:01:00.000Z',
  deadlineAt: null,
  ticket: { id: 'attempt-1', token: 'a'.repeat(43), deadlineAt: null },
  files: [{ path: 'index.html', content: '<h1>Próba</h1>', encoding: 'utf8' }],
  hintCount: 0,
});

describe('progress backup shape validation', () => {
  it('preserves official question references and rejects unsafe source links or crop coordinates', () => {
    const question = {
      id: 'cke-question-1',
      version: 1,
      topicId: 'html-css',
      level: 'beginner',
      prompt: 'Przykład CKE 1',
      options: ['a', 'b', 'c', 'd'].map((id) => ({ id, text: id.toUpperCase() })),
      source: {
        catalogId: 'cke-inf03-informator-2022',
        url: 'https://bip.cke.gov.pl/attachments/download/8580',
        page: 6,
        questionNumber: 1,
        top: 0.35,
        bottom: 0.48,
      },
    };
    const value = { ...attempt(), kind: 'theory', questions: [question], answers: {} };
    expect(validateBackupAttempts([value])[0]?.questions?.[0]?.source).toEqual(question.source);
    for (const change of [
      { url: 'javascript:alert(1)' },
      { top: -1 },
      { bottom: 0.1 },
      { page: 0 },
    ]) {
      expect(() =>
        validateBackupAttempts([
          { ...value, questions: [{ ...question, source: { ...question.source, ...change } }] },
        ]),
      ).toThrow();
    }
  });
  it('accepts a restorable draft without changing its ticket or files', () => {
    const value = attempt();
    expect(validateBackupAttempts([value])).toEqual([value]);
  });
  it('accepts published identifiers with dots and validates learning entries', () => {
    const value = { ...attempt(), taskId: 'project.v2' };
    expect(validateBackupAttempts([value])[0]?.taskId).toBe('project.v2');
    expect(
      validateBackupLearning(
        {
          'exercise:html.1': '<h1>Tekst</h1>',
          'lesson.1': { completedAt: '2026-11-02T10:00:00.000Z' },
        },
        ['lesson.1'],
      ),
    ).toEqual({
      completed: ['lesson.1'],
      exercises: { 'exercise:html.1': '<h1>Tekst</h1>' },
      records: { 'lesson.1': { completedAt: '2026-11-02T10:00:00.000Z' } },
    });
    expect(() => validateBackupLearning({ 'exercise:html': {} }, [])).toThrow();
    expect(() => validateBackupLearning({}, ['exercise:html'])).toThrow();
  });
  it('rejects malformed reports, invalid dates and conflicting deadlines before IndexedDB writes', () => {
    expect(() =>
      validateBackupAttempts([{ ...attempt(), report: { results: 'not-an-array' } }]),
    ).toThrow('Nie zaimportowano');
    expect(() => validateBackupAttempts([{ ...attempt(), updatedAt: 'not-a-date' }])).toThrow();
    expect(() =>
      validateBackupAttempts([{ ...attempt(), deadlineAt: '2026-11-02T10:00:00.000Z' }]),
    ).toThrow();
  });
  it('rejects unsafe file paths, malformed binary contents and duplicate attempt IDs', () => {
    expect(() =>
      validateBackupAttempts([{ ...attempt(), files: [{ path: '../secret', content: 'bad' }] }]),
    ).toThrow();
    expect(() =>
      validateBackupAttempts([
        { ...attempt(), files: [{ path: 'logo.png', content: '<script>', encoding: 'base64' }] },
      ]),
    ).toThrow();
    expect(() => validateBackupAttempts([attempt(), attempt()])).toThrow();
  });
});

function cumulativeAttempt(): AttemptSnapshot {
  const guide = structuredClone(examStudyGuides[0]!);
  const step = guide.steps[0]!,
    activity = step.activities![0]!;
  const current = `${step.id}/${activity.id}`;
  const file = guide.project!.starterFiles[0]!;
  return {
    ...attempt(),
    id: 'local-project-1',
    taskId: guide.taskId,
    taskVersion: guide.taskVersion,
    ticket: { id: 'renewed-server-ticket', token: 'b'.repeat(43), deadlineAt: null },
    revision: 12,
    hintOffset: 3,
    files: structuredClone(guide.project!.starterFiles),
    workspace: {
      view: 'study',
      studyPanel: 'preview',
      sheetPage: 4,
      activeFile: file.path,
      previewEntry: file.path,
      editors: { [file.path]: { anchor: 3, head: 7, scrollTop: 12.5 } },
    },
    study: {
      guide,
      current,
      viewedExamples: [current],
      completed: {
        [current]: {
          status: 'passed',
          revision: 11,
          filesHash: 'f'.repeat(64),
          checkedAt: '2026-11-02T10:00:00.000Z',
          evidence: 'Potwierdzone kryterium.',
        },
      },
    },
    recovery: [
      {
        id: 'recovery-1',
        reason: 'Przed zmianą plików',
        createdAt: '2026-11-02T10:00:00.000Z',
        files: [{ path: 'stary.html', content: '<h1>Wcześniejszy tekst</h1>' }],
      },
    ],
  };
}
const backup = (attempts = [attempt()]): ProgressBackup => ({
  format: 'zdaj-egzamin-inf',
  version: 2,
  exportedAt: '2026-11-02T12:00:00.000Z',
  attempts,
  level: 'beginner',
  completedLessons: [],
  learning: {},
});

describe('versioned project backups', () => {
  it('accepts every shipped guide revision and all declarative checks', () => {
    for (const guide of allExamStudyGuides) expect(validateCachedGuide(guide).guide).toEqual(guide);
  });
  it('round-trips cumulative files, cached guide, editor position, renewed ticket and recovery', () => {
    const source = backup([cumulativeAttempt()]);
    const restored = readProgressBackup(JSON.parse(JSON.stringify(source)));
    expect(restored).toEqual(source);
    expect(restored.attempts[0]!.id).not.toBe(restored.attempts[0]!.ticket.id);
    expect(restored.attempts[0]!.workspace!.editors).toEqual(
      source.attempts[0]!.workspace!.editors,
    );
    expect(restored.attempts[0]!.workspace).toMatchObject({ studyPanel: 'preview', sheetPage: 4 });
  });
  it('accepts an older workspace without optional panel and PDF position', () => {
    const source = cumulativeAttempt();
    delete source.workspace!.studyPanel;
    delete source.workspace!.sheetPage;
    expect(readProgressBackup(backup([source])).attempts[0]).toEqual(source);
  });
  it.each([
    { studyPanel: 'unknown' },
    { studyPanel: ['code'] },
    { studyPanel: null },
    { sheetPage: 0 },
    { sheetPage: -1 },
    { sheetPage: 1.5 },
    { sheetPage: '2' },
    { sheetPage: null },
    { sheetPage: Number.MAX_SAFE_INTEGER + 1 },
  ])('rejects invalid restored panel/page state: %j', (position) => {
    const source = cumulativeAttempt();
    Object.assign(source.workspace!, position);
    expect(() => readProgressBackup(backup([source]))).toThrow('Nie zaimportowano');
  });
  it('accepts v1 without upgrading or overwriting its original files', () => {
    const old = {
      ...backup(),
      version: 1,
      completedLessons: ['lesson-1'],
      learning: { 'exercise:study-attempt-1-sql': 'SELECT nazwa FROM ryby;' },
    };
    const parsed = readProgressBackup(old);
    expect(parsed.attempts).toEqual(old.attempts);
    expect(parsed.learning['lesson-1']).toEqual({ completedAt: old.exportedAt });
    expect(parsed.learning['exercise:study-attempt-1-sql']).toBe('SELECT nazwa FROM ryby;');
    expect(() => readProgressBackup({ ...old, version: 99 })).toThrow('Nieobsługiwany');
  });
  it.each([
    { kind: 'runtime', adapter: 'arbitrary-js', entry: 'index.html' },
    { kind: 'runtime', adapter: 'kursy-calculator', entry: 'index.html', code: 'process.exit()' },
    { kind: 'html', path: '../private', selector: 'body' },
    { kind: 'javascript', code: 'alert(1)' },
    { kind: ['file'], path: 'index.html' },
  ])('rejects executable or unsafe imported check definitions: %j', (definition) => {
    const source = cumulativeAttempt();
    source.study!.guide.steps[0]!.activities![0]!.checks = [
      { id: 'test:check #id', title: 'Test', ...definition },
    ] as never;
    expect(() => validateBackupAttempts([source])).toThrow('Nie zaimportowano');
  });
  it('rejects unsafe links, state references, editor coordinates and recovery paths', () => {
    const cases = [
      (source: AttemptSnapshot) => {
        source.study!.guide.resources[0]!.url = 'javascript:alert(1)';
      },
      (source: AttemptSnapshot) => {
        source.study!.current = 'unknown/activity';
      },
      (source: AttemptSnapshot) => {
        source.study!.viewedExamples = ['unknown/activity'];
      },
      (source: AttemptSnapshot) => {
        Object.values(source.workspace!.editors)[0]!.anchor = -1;
      },
      (source: AttemptSnapshot) => {
        source.recovery![0]!.files[0]!.path = '../secret';
      },
      (source: AttemptSnapshot) => {
        source.study!.guide.taskId = 'another-task';
      },
      (source: AttemptSnapshot) => {
        source.workspace!.view = ['study'] as never;
      },
      (source: AttemptSnapshot) => {
        source.revision = -1;
      },
    ];
    for (const change of cases) {
      const source = cumulativeAttempt();
      change(source);
      expect(() => validateBackupAttempts([source])).toThrow();
    }
  });
  it('does not import a study cache into an unfinished exam', () => {
    const source = { ...cumulativeAttempt(), mode: 'egzamin' as const };
    expect(() => validateBackupAttempts([source])).toThrow();
    expect(() =>
      validateBackupAttempts([{ ...source, submittedAt: '2026-11-02T12:00:00.000Z' }]),
    ).not.toThrow();
  });
});

describe('conflict-preserving backup merge', () => {
  it('preserves both project versions even when the incoming timestamp is newer, and deduplicates reimport', () => {
    const local = cumulativeAttempt();
    const imported = structuredClone(local);
    imported.files![0]!.content = '<h1>Inna wersja ucznia</h1>';
    imported.updatedAt = '2026-11-03T12:00:00.000Z';
    const before = structuredClone(local);
    const first = planBackupMerge([local], {}, backup([imported]), () => 'imported-project-2');
    expect(local).toEqual(before);
    expect(first.attempts).toHaveLength(1);
    expect(first.attempts[0]).toEqual({
      ...imported,
      id: 'imported-project-2',
      legacyProjectId: local.id,
    });
    expect(first.attempts[0]!.ticket).toEqual(imported.ticket);
    expect(validateBackupAttempts(first.attempts)).toEqual(first.attempts);
    const second = planBackupMerge([local, ...first.attempts], {}, backup([imported]), () => {
      throw new Error('No ID should be allocated');
    });
    expect(second.attempts).toEqual([]);
    expect(second.conflicts).toBe(0);
  });
  it('skips identical objects despite property order and never mutates the incoming backup', () => {
    const local = attempt();
    const reordered = Object.fromEntries(
      Object.entries(local).reverse(),
    ) as unknown as AttemptSnapshot;
    const incoming = backup([reordered]);
    const before = structuredClone(incoming);
    expect(planBackupMerge([local], {}, incoming).attempts).toEqual([]);
    expect(incoming).toEqual(before);
  });
  it('keeps different legacy notes and completion dates as distinct recoverable entries', () => {
    const key = 'exercise:study-attempt-1-html';
    const existing = {
      [key]: '<h1>Lokalna praca</h1>',
      lesson: { completedAt: '2026-11-01T10:00:00.000Z' },
    };
    const incoming = {
      ...backup([]),
      learning: {
        [key]: '<h1>Kopia do zachowania</h1>',
        lesson: { completedAt: '2026-11-02T10:00:00.000Z' },
      },
    };
    let serial = 0;
    const first = planBackupMerge([], existing, incoming, () => `copy-${++serial}`);
    expect(first.learning[key]).toBeUndefined();
    expect(first.learning.lesson).toBeUndefined();
    const entries = Object.entries(first.learning);
    expect(entries).toHaveLength(2);
    expect(entries.find(([name]) => name.startsWith(key))?.[1]).toBe(
      '<h1>Kopia do zachowania</h1>',
    );
    expect(Object.values(first.learning)).toContain(
      JSON.stringify({ originalKey: 'lesson', completedAt: '2026-11-02T10:00:00.000Z' }),
    );
    expect(() => validateBackupLearning(first.learning, [])).not.toThrow();
    const second = planBackupMerge([], { ...existing, ...first.learning }, incoming);
    expect(second.learning).toEqual({});
  });
  it('bounds suffixed keys to the existing backup identifier limit', () => {
    const key = `exercise:${'a'.repeat(128)}`;
    const result = planBackupMerge(
      [],
      { [key]: 'local' },
      { ...backup([]), learning: { [key]: 'incoming' } },
      () => '12345678-1234-1234-1234-123456789012',
    );
    const copy = Object.keys(result.learning)[0]!;
    expect(copy.slice(9)).toHaveLength(128);
    expect(() => validateBackupLearning(result.learning, [])).not.toThrow();
  });
});
