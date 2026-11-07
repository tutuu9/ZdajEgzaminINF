import { describe, expect, it } from 'vitest';
import { MAX_STUDY_CHECKPOINT_BYTES } from '@zdaj/shared';
import {
  checkpointFilesBytes,
  findStudyCheckpoint,
  getStudyComparisonActivity,
  prepareStudyRestore,
  withStudyCheckpoint,
} from '../apps/web/src/study-comparison-state';
import { validateBackupAttempts } from '../apps/web/src/backup-validation';
import { readProgressBackup } from '../apps/web/src/backup-merge';
import { comparisonProject } from './study-comparison-fixture';

describe('bounded teaching checkpoints', () => {
  it('captures the original bytes once and keeps them after edits, reload and revisiting', () => {
    const source = comparisonProject();
    const captured = withStudyCheckpoint(source, source.study!.current);
    const checkpoint = findStudyCheckpoint(captured)!;
    expect(captured.files).toBe(source.files);
    expect(checkpoint.files).toEqual(source.files);
    expect(checkpoint.files).not.toBe(source.files);
    const edited = structuredClone(captured);
    edited.files![0]!.content = '<html lang="pl">Nowy tekst</html>';
    expect(withStudyCheckpoint(edited, edited.study!.current)).toBe(edited);
    expect(findStudyCheckpoint(edited)!.files[0]!.content).toContain('\r\nŻółć 🌱\r\n');
    expect(findStudyCheckpoint(edited)!.files[1]!.content).toBe('');
  });

  it.each(['trening', 'egzamin', 'closed', 'without-guide', 'runtime', 'sql'])(
    'does not capture a checkpoint in %s',
    (scenario) => {
      const source = comparisonProject();
      if (scenario === 'trening' || scenario === 'egzamin') source.mode = scenario;
      if (scenario === 'closed') source.submittedAt = source.updatedAt;
      if (scenario === 'without-guide') delete source.study;
      if (scenario === 'runtime')
        source.study!.guide.steps[0]!.activities![0]!.checks = [
          {
            id: 'runtime',
            title: 'JS',
            kind: 'runtime',
            entry: 'index.html',
            adapter: 'chat-messages',
          },
        ];
      if (scenario === 'sql') {
        const step = source.study!.guide.steps[0]!;
        step.language = 'sql';
        step.fileName = 'kwerendy.sql';
        step.activities![0]!.targetFiles = ['kwerendy.sql'];
        step.activities![0]!.checks = [
          { id: 'manual', title: 'SQL', kind: 'manual', prompt: 'Sprawdź SQL' },
        ];
      }
      expect(getStudyComparisonActivity(source, 'step-0/edit')).toBeUndefined();
      expect(withStudyCheckpoint(source, 'step-0/edit')).toBe(source);
    },
  );

  it('retains the latest eight checkpoints without deleting current project files', () => {
    let source = comparisonProject();
    for (let index = 0; index < 10; index++) {
      source = { ...source, study: { ...source.study!, current: `step-${index}/edit` } };
      source = withStudyCheckpoint(source, source.study!.current);
    }
    expect(source.studyComparison!.checkpoints).toHaveLength(8);
    expect(source.studyComparison!.checkpoints[0]!.activityId).toBe('step-2/edit');
    expect(source.files).toEqual(comparisonProject().files);
  });

  it('enforces the total byte budget and refuses an oversized new point without changing files', () => {
    let source = comparisonProject();
    source.files = [{ path: 'index.html', content: 'x'.repeat(11 * 1024 * 1024) }];
    source = withStudyCheckpoint(source, source.study!.current);
    source = { ...source, study: { ...source.study!, current: 'step-1/edit' } };
    source = withStudyCheckpoint(source, source.study!.current);
    expect(source.studyComparison!.checkpoints).toHaveLength(1);
    expect(checkpointFilesBytes(source.studyComparison!.checkpoints[0]!.files)).toBeLessThanOrEqual(
      MAX_STUDY_CHECKPOINT_BYTES,
    );
    source = {
      ...source,
      study: { ...source.study!, current: 'step-2/edit' },
      files: [{ path: 'index.html', content: 'x'.repeat(MAX_STUDY_CHECKPOINT_BYTES + 1) }],
    };
    expect(() => withStudyCheckpoint(source, source.study!.current)).toThrow('20 MiB');
    expect(source.studyComparison!.checkpoints[0]!.activityId).toBe('step-1/edit');
    expect(source.files![0]!.content.length).toBe(MAX_STUDY_CHECKPOINT_BYTES + 1);
  });

  it('prepares an independent complete copy before an explicit restore', () => {
    const source = withStudyCheckpoint(comparisonProject(), 'step-0/edit');
    const checkpoint = findStudyCheckpoint(source)!;
    source.files = [
      { path: 'index.html', content: 'latest code' },
      { path: 'new.css', content: 'new' },
    ];
    source.revision = 12;
    source.study!.completed['step-0/edit'] = {
      status: 'passed',
      filesHash: 'a'.repeat(64),
      revision: 12,
      checkedAt: source.updatedAt,
      evidence: 'Old check stays historical.',
    };
    const { copy, restored } = prepareStudyRestore(source, checkpoint.id);
    expect(copy.files).toEqual(source.files);
    expect(copy.study).toEqual(source.study);
    expect(copy.hintCount).toBe(7);
    expect(copy.hintOffset).toBe(7);
    expect(copy.id).not.toBe(source.id);
    expect(copy.ticket.id).not.toBe(source.ticket.id);
    expect(copy.ticket.token).not.toBe(source.ticket.token);
    expect(copy.title).toContain('kopia przed przywróceniem');
    expect(restored.files).toEqual(checkpoint.files);
    expect(restored.workspace!.editors).toEqual({});
    expect(restored.studyComparison!.restorationId).toBeTruthy();
    expect(restored.study!.completed).toEqual(source.study!.completed);
    expect(restored.revision).toBe(13);
    expect(source.files[0]!.content).toBe('latest code');
    expect(validateBackupAttempts([copy, restored])).toHaveLength(2);
  });

  it('refuses a checkpoint from a different step or pinned guide', () => {
    const source = withStudyCheckpoint(comparisonProject(), 'step-0/edit');
    const id = findStudyCheckpoint(source)!.id;
    source.study!.current = 'step-1/edit';
    expect(() => prepareStudyRestore(source, id)).toThrow('bieżącego kroku');
    source.study!.current = 'step-0/edit';
    source.study!.guide.version++;
    expect(() => prepareStudyRestore(source, id)).toThrow('bieżącego kroku');
  });
});

describe('checkpoint backup compatibility', () => {
  it.each([1, 2])(
    'round-trips optional checkpoints and accepts old format %s backups',
    (version) => {
      const source = withStudyCheckpoint(comparisonProject(), 'step-0/edit');
      source.studyComparison!.checkpoints[0]!.prediction = {
        questionId: 'padding',
        choiceId: 'inside',
      };
      const payload = {
        format: 'zdaj-egzamin-inf',
        version,
        exportedAt: source.updatedAt,
        attempts: [source],
        level: 'beginner',
        completedLessons: [],
        learning: {},
      };
      expect(readProgressBackup(JSON.parse(JSON.stringify(payload))).attempts).toEqual([source]);
      delete source.studyComparison;
      expect(readProgressBackup(payload).attempts).toEqual([source]);
    },
  );

  it.each(['path', 'duplicate', 'guide', 'prediction', 'count', 'budget'])(
    'rejects malformed checkpoint %s data before importing any project',
    (scenario) => {
      const source = withStudyCheckpoint(comparisonProject(), 'step-0/edit');
      const checkpoint = source.studyComparison!.checkpoints[0]!;
      if (scenario === 'path') checkpoint.files[0]!.path = '../outside.html';
      if (scenario === 'duplicate')
        source.studyComparison!.checkpoints.push(structuredClone(checkpoint));
      if (scenario === 'guide') checkpoint.guideVersion++;
      if (scenario === 'prediction')
        checkpoint.prediction = { questionId: '__proto__', choiceId: 'x' };
      if (scenario === 'count') source.studyComparison!.checkpoints = Array(9).fill(checkpoint);
      if (scenario === 'budget')
        checkpoint.files = [
          { path: 'index.html', content: 'x'.repeat(MAX_STUDY_CHECKPOINT_BYTES + 1) },
        ];
      expect(() => validateBackupAttempts([source])).toThrow();
    },
  );
});
