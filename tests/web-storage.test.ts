import { describe, expect, it } from 'vitest';
import { strToU8, zipSync } from 'fflate';
import { MAX_EXTRACTED_BYTES, type AttemptSnapshot } from '@zdaj/shared';
import { extractBrowserZip, safePath } from '../apps/web/src/safe-zip';
import { validateBackupAttempts, validateBackupLearning } from '../apps/web/src/backup-validation';

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
    ).toEqual({ completed: ['lesson.1'], exercises: { 'exercise:html.1': '<h1>Tekst</h1>' } });
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
