import { beforeEach, describe, expect, it } from 'vitest';
import {
  guideMilliseconds,
  guideTimeLabel,
  readTheoryExam,
  saveTheoryExam,
  SECONDS_PER_TASK,
  theoryExamDeadline,
} from '../apps/web/src/theory-exam';

beforeEach(() => {
  const values = new Map<string, string>();
  (globalThis as { localStorage?: unknown }).localStorage = {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
  };
});

describe('theory exam-system view', () => {
  it('gives each task the official 60 minutes / 40 tasks share', () => {
    expect(SECONDS_PER_TASK).toBe(90);
    expect(guideMilliseconds(40)).toBe(60 * 60_000);
    expect(guideTimeLabel(25)).toBe('37 min 30 s');
    expect(guideTimeLabel(40)).toBe('60 min');
  });

  it('starts the clock only after Start and keeps it in this browser', () => {
    saveTheoryExam('a', { questionCount: 25 });
    expect(theoryExamDeadline(readTheoryExam('a')!)).toBeUndefined();
    saveTheoryExam('a', { questionCount: 25, startedAt: '2026-11-26T10:00:00.000Z' });
    expect(theoryExamDeadline(readTheoryExam('a')!)).toBe('2026-11-26T10:37:30.000Z');
  });

  it('ignores damaged records', () => {
    localStorage.setItem('zdaj:theory-exam:b', '{');
    expect(readTheoryExam('b')).toBeUndefined();
    localStorage.setItem('zdaj:theory-exam:c', JSON.stringify({ questionCount: 0 }));
    expect(readTheoryExam('c')).toBeUndefined();
    localStorage.setItem(
      'zdaj:theory-exam:d',
      JSON.stringify({ questionCount: 5, startedAt: 'never' }),
    );
    expect(readTheoryExam('d')).toEqual({ questionCount: 5 });
  });
});
