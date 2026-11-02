import { describe, expect, it } from 'vitest';
import type { ExamStudyGuide, StudyActivity } from '@zdaj/shared';
import {
  canVisitActivity,
  completeStudyActivity,
  hasWrittenAttempt,
  initialStudyProgress,
  parseStudyProgress,
  serializeStudyProgress,
  studySequence,
} from '../apps/web/src/study-progress';
import { validateBackupLearning } from '../apps/web/src/backup-validation';

const activity = (id: string): StudyActivity => ({
  id,
  title: id,
  explanation: 'Najpierw wyjaśnienie.',
  instruction: 'Napisz fragment.',
  starterCode: '// początek',
  exampleCode: 'const suma = 2;',
  why: ['Wyjaśnienie'],
  check: { type: 'self-check', prompt: 'Sprawdź wynik.' },
});
const guide: ExamStudyGuide = {
  id: 'study-kursy',
  taskId: 'inf03-01-25-01-sg',
  taskVersion: 1,
  version: 2,
  title: 'Nauka',
  introduction: 'Wstęp',
  prerequisites: [],
  resources: [],
  variants: [],
  steps: ['sql', 'html'].map((id) => ({
    id,
    title: id,
    requirement: 'Wymaganie',
    explanation: 'Wyjaśnienie',
    code: 'cały fragment',
    language: 'JavaScript',
    fileName: 'app.js',
    why: [],
    commonMistakes: [],
    checkpoint: 'Sprawdź',
    activities: [activity('a'), activity('b')],
  })),
};
const sequence = studySequence(guide);

describe('sequential study progress and recovery', () => {
  it('opens with explanation only and keeps future macro stages locked', () => {
    const progress = initialStudyProgress(guide);
    expect(progress.current).toBe('sql/a');
    expect(progress.phases[progress.current] ?? 'explain').toBe('explain');
    expect(canVisitActivity(progress, sequence, 'sql/a')).toBe(true);
    expect(canVisitActivity(progress, sequence, 'sql/b')).toBe(false);
    expect(canVisitActivity(progress, sequence, 'html/a')).toBe(false);
    expect(() => completeStudyActivity(progress, sequence)).toThrow('własny fragment');
  });
  it('requires an actual changed fragment and explicit manual confirmation, not correctness', () => {
    const progress = initialStudyProgress(guide);
    progress.phases['sql/a'] = 'write';
    progress.drafts['sql/a'] = '  // początek  ';
    progress.selfChecks['sql/a'] = true;
    expect(hasWrittenAttempt(progress, sequence[0]!)).toBe(false);
    expect(() => completeStudyActivity(progress, sequence)).toThrow();
    progress.drafts['sql/a'] = '// własna próba, bez oceny poprawności';
    progress.selfChecks['sql/a'] = false;
    expect(() => completeStudyActivity(progress, sequence)).toThrow();
    progress.selfChecks['sql/a'] = true;
    const next = completeStudyActivity(progress, sequence);
    expect(next.current).toBe('sql/b');
    expect(next.completed).toEqual(['sql/a']);
    expect(next.phases[next.current] ?? 'explain').toBe('explain');
    expect(canVisitActivity(next, sequence, 'html/a')).toBe(false);
    expect(canVisitActivity(next, sequence, 'sql/a')).toBe(true);
  });
  it('restores drafts, comparison phase, manual checks and exact position through backup serialization', () => {
    let progress = initialStudyProgress(guide);
    for (const id of ['sql/a', 'sql/b']) {
      progress.drafts[id] = `const tekst = "Zażółć ${id}";`;
      progress.phases[id] = 'compare';
      progress.selfChecks[id] = true;
      progress = completeStudyActivity(progress, sequence);
    }
    progress.drafts['html/a'] = '<h1>Moja próba</h1>';
    progress.phases['html/a'] = 'write';
    const key = 'exercise:study-flow-12345678-1234-1234-1234-123456789012-v2';
    const backup = validateBackupLearning({ [key]: JSON.stringify(progress) }, []);
    const restored = parseStudyProgress(backup.exercises[key]!, guide);
    expect(restored).toEqual(progress);
    expect(restored.current).toBe('html/a');
    expect(canVisitActivity(restored, sequence, 'html/a')).toBe(true);
    expect(canVisitActivity(restored, sequence, 'html/b')).toBe(false);
    expect(completeStudyActivity({ ...restored, current: 'sql/a' }, sequence).completed).toEqual([
      'sql/a',
      'sql/b',
    ]);
  });
  it.each([
    ['out-of-order completion', { completed: ['sql/b'] }],
    ['duplicate completion', { completed: ['sql/a', 'sql/a'] }],
    ['locked current activity', { current: 'html/b' }],
    ['previous guide version', { guideVersion: 1 }],
    ['different guide', { guideId: 'another-guide' }],
    ['unknown phase', { phases: { 'sql/a': 'finished' } }],
    ['array phase coerced to a string', { phases: { 'sql/a': ['write'] } }],
    ['future draft', { drafts: { 'html/b': 'future draft' } }],
    ['future comparison phase', { phases: { 'html/b': 'compare' } }],
    ['future self-check', { selfChecks: { 'html/b': true } }],
    ['non-boolean confirmation', { selfChecks: { 'sql/a': 'yes' } }],
    ['oversized draft', { drafts: { 'sql/a': 'x'.repeat(100_001) } }],
    ['non-string draft', { drafts: { 'sql/a': 42 } }],
    ['array in place of drafts', { drafts: [] }],
    ['unknown format field', { autoPassed: true }],
    ['string format number', { format: '1' }],
  ])(
    'rejects corrupted or incompatible progress without repairing it silently: %s',
    (_label, changed) => {
      expect(() =>
        parseStudyProgress(JSON.stringify({ ...initialStudyProgress(guide), ...changed }), guide),
      ).toThrow('Zachowaliśmy');
    },
  );
  it('rejects truncated JSON and prototype-shaped keys', () => {
    expect(() => parseStudyProgress('{"format":', guide)).toThrow('Zachowaliśmy');
    const raw = JSON.stringify(initialStudyProgress(guide)).replace(
      '"drafts":{}',
      '"drafts":{"__proto__":"bad"}',
    );
    expect(() => parseStudyProgress(raw, guide)).toThrow('Zachowaliśmy');
  });
  it('finishes exactly once and allows revisiting without adding duplicate completions', () => {
    let progress = initialStudyProgress(guide);
    for (const position of sequence) {
      progress.drafts[position.id] = 'Moja próba';
      progress.phases[position.id] = 'write';
      progress.selfChecks[position.id] = true;
      progress = completeStudyActivity(progress, sequence);
    }
    expect(progress.completed).toHaveLength(4);
    expect(completeStudyActivity(progress, sequence).completed).toHaveLength(4);
    expect(parseStudyProgress(JSON.stringify(progress), guide)).toEqual(progress);
  });
  it('keeps explanation, writing and comparison distinct on reload', () => {
    const progress = initialStudyProgress(guide);
    progress.drafts['sql/a'] = 'const mojaProba = 1;';
    progress.selfChecks['sql/a'] = true;
    for (const phase of ['explain', 'write', 'compare'] as const) {
      progress.phases['sql/a'] = phase;
      const restored = parseStudyProgress(serializeStudyProgress(progress), guide);
      expect(restored.phases['sql/a']).toBe(phase);
      if (phase === 'explain')
        expect(() => completeStudyActivity(restored, sequence)).toThrow('własny fragment');
      else expect(completeStudyActivity(restored, sequence).current).toBe('sql/b');
    }
  });
  it('does not let an unknown or locked activity complete or mutate earlier progress', () => {
    const progress = initialStudyProgress(guide);
    const original = serializeStudyProgress(progress);
    for (const current of ['missing/activity', 'html/a']) {
      const changed = {
        ...progress,
        current,
        drafts: { [current]: 'własny tekst' },
        selfChecks: { [current]: true },
        phases: { [current]: 'write' as const },
      };
      expect(canVisitActivity(changed, sequence, current)).toBe(false);
      expect(() => completeStudyActivity(changed, sequence)).toThrow('poprzedni krok');
    }
    expect(serializeStudyProgress(progress)).toBe(original);
  });
  it('preserves an empty first scratchpad but requires writing before completion', () => {
    const blankGuide = {
      ...guide,
      steps: [{ ...guide.steps[0]!, activities: [{ ...activity('empty'), starterCode: '' }] }],
    };
    const positions = studySequence(blankGuide);
    const progress = initialStudyProgress(blankGuide);
    for (const draft of ['', ' \n\t']) {
      progress.drafts[progress.current] = draft;
      expect(
        parseStudyProgress(serializeStudyProgress(progress), blankGuide).drafts[progress.current],
      ).toBe(draft);
      expect(hasWrittenAttempt(progress, positions[0]!)).toBe(false);
    }
    progress.drafts[progress.current] = '!';
    expect(hasWrittenAttempt(progress, positions[0]!)).toBe(true);
  });
  it('round-trips a draft at the exact limit and rejects a longer draft without changing it', () => {
    const progress = initialStudyProgress(guide);
    progress.drafts['sql/a'] = 'ą'.repeat(100_000);
    const saved = serializeStudyProgress(progress);
    expect(parseStudyProgress(saved, guide)).toEqual(progress);
    progress.drafts['sql/a'] += 'ż';
    expect(() => serializeStudyProgress(progress)).toThrow('100 000');
    expect(progress.drafts['sql/a']).toHaveLength(100_001);
    expect(parseStudyProgress(saved, guide).drafts['sql/a']).toHaveLength(100_000);
  });
  it('applies the total serialized-size limit even when every draft is individually valid', () => {
    const largeGuide = {
      ...guide,
      steps: [
        {
          ...guide.steps[0]!,
          activities: Array.from({ length: 20 }, (_, index) => activity(`a${index}`)),
        },
      ],
    };
    const positions = studySequence(largeGuide);
    const progress = initialStudyProgress(largeGuide);
    progress.completed = positions.slice(0, 19).map((item) => item.id);
    progress.current = positions[19]!.id;
    for (const position of positions.slice(0, 19))
      progress.drafts[position.id] = 'x'.repeat(100_000);
    const saved = serializeStudyProgress(progress);
    expect(saved.length).toBeLessThan(2_000_000);
    expect(parseStudyProgress(saved, largeGuide)).toEqual(progress);
    progress.drafts[positions[19]!.id] = 'x'.repeat(100_000);
    expect(() => serializeStudyProgress(progress)).toThrow('2 miliony');
    expect(() => parseStudyProgress(JSON.stringify(progress), largeGuide)).toThrow('Zachowaliśmy');
    expect(parseStudyProgress(saved, largeGuide).drafts[positions[19]!.id]).toBeUndefined();
  });
  it.each(['null', '[]', '42', '{}'])('rejects a malformed top-level backup: %s', (raw) => {
    expect(() => parseStudyProgress(raw, guide)).toThrow('Zachowaliśmy');
  });
});
