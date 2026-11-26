import { beforeEach, describe, expect, it } from 'vitest';
import {
  candidateProblem,
  clearReading,
  fileSize,
  folderFiles,
  practiceCandidate,
  readReading,
  readStation,
  readingDeadline,
  saveReading,
  saveStation,
  stationClock,
} from '../apps/web/src/exam-station';

class MemoryStorage {
  private values = new Map<string, string>();
  getItem(key: string) {
    return this.values.get(key) ?? null;
  }
  setItem(key: string, value: string) {
    this.values.set(key, value);
  }
  removeItem(key: string) {
    this.values.delete(key);
  }
}

beforeEach(() => {
  (globalThis as { localStorage?: unknown }).localStorage = new MemoryStorage();
});

describe('exam workstation', () => {
  it('accepts a practice number that can name a folder and refuses a PESEL', () => {
    expect(candidateProblem('Z042317')).toBeUndefined();
    expect(candidateProblem('  ')).toMatch(/Wpisz numer/);
    expect(candidateProblem('05210112345')).toMatch(/PESEL/);
    expect(candidateProblem('Zdający 1')).toMatch(/bez polskich znaków/);
    expect(candidateProblem('../wyniki')).toBeDefined();
    expect(practiceCandidate(() => 0.042317)).toBe('Z042317');
    expect(candidateProblem(practiceCandidate())).toBeUndefined();
  });

  it('keeps the reading phase across reloads until it is stale or cleared', () => {
    const start = Date.parse('2026-11-26T10:00:00Z');
    const phase = { startedAt: new Date(start).toISOString(), candidate: 'Z1' };
    saveReading('task', 2, phase);
    expect(readReading('task', 2, start + 5 * 60_000)).toEqual(phase);
    expect(readReading('task', 1, start)).toBeUndefined();
    expect(readingDeadline(phase)).toBe('2026-11-26T10:10:00.000Z');
    expect(readReading('task', 2, start + 71 * 60_000)).toBeUndefined();
    // A stale phase is removed, not just ignored.
    expect(readReading('task', 2, start)).toBeUndefined();
    saveReading('task', 2, phase);
    clearReading('task', 2);
    expect(readReading('task', 2, start)).toBeUndefined();
  });

  it('ignores unreadable or invalid stored records', () => {
    localStorage.setItem('zdaj:exam-reading:task:1', '{broken');
    expect(readReading('task', 1)).toBeUndefined();
    localStorage.setItem('zdaj:exam-station:a', JSON.stringify({ candidate: '05210112345' }));
    expect(readStation('a')).toBeUndefined();
    saveStation('b', { candidate: 'Z7', readingMinutes: 4 });
    expect(readStation('b')).toEqual({ candidate: 'Z7', readingMinutes: 4 });
  });

  it('puts every file inside the numbered folder and formats the clock', () => {
    expect(
      folderFiles(
        [
          { path: 'index.html', content: '' },
          { path: 'obrazy/a.png', content: 'AA==', encoding: 'base64' },
        ],
        'Z7',
      ).map((file) => file.path),
    ).toEqual(['Z7/index.html', 'Z7/obrazy/a.png']);
    expect(stationClock(150 * 60_000)).toBe('2:30:00');
    expect(stationClock(61_001)).toBe('0:01:02');
    expect(stationClock(-5)).toBe('0:00:00');
    expect(fileSize({ path: 'a.txt', content: 'zażółć' })).toBe('10 B');
    expect(fileSize({ path: 'a.png', content: 'A'.repeat(4096), encoding: 'base64' })).toBe(
      '3,0 KB',
    );
  });
});
