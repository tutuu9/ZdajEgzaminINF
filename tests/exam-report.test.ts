import { describe, expect, it } from 'vitest';
import { examTiming, matchHandInFiles } from '../apps/web/src/exam-report';

const files = (...paths: string[]) => paths.map((path) => ({ path, content: '' }));

describe('exam report facts', () => {
  it('matches printed file names, reporting case differences and missing files', () => {
    const result = matchHandInFiles(
      ['chat.html', 'Jolka.jpg', 'kw1.jpg', 'kwerendy.txt'],
      files('chat.html', 'jolka.jpg', 'obrazy/kw1.jpg'),
    );
    expect(result).toEqual([
      { name: 'chat.html', status: 'present' },
      { name: 'Jolka.jpg', status: 'wrong-case', actual: 'jolka.jpg' },
      { name: 'kw1.jpg', status: 'present' },
      { name: 'kwerendy.txt', status: 'missing' },
    ]);
  });
  it('lets a name printed without an extension match any extension', () => {
    expect(
      matchHandInFiles(['baner1', 'index', 'Logo'], files('baner1.png', 'index.html', 'logo.svg')),
    ).toEqual([
      { name: 'baner1', status: 'present', actual: 'baner1.png' },
      { name: 'index', status: 'present', actual: 'index.html' },
      { name: 'Logo', status: 'wrong-case', actual: 'logo.svg' },
    ]);
    // A printed extension is part of the name.
    expect(matchHandInFiles(['styl.css'], files('styl.scss'))[0]!.status).toBe('missing');
  });
  it('measures time from the timed start to hand-in', () => {
    const deadline = '2026-11-17T12:00:00.000Z';
    expect(examTiming(deadline, '2026-11-17T11:40:30.000Z', 150)).toEqual({
      limitMinutes: 150,
      usedMinutes: 131,
      overtime: false,
    });
    expect(examTiming(deadline, '2026-11-17T12:05:00.000Z', 150).overtime).toBe(true);
  });
});
