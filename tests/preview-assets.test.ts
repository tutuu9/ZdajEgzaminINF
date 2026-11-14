import { describe, expect, it, vi } from 'vitest';
import { assetLookup, resolvePath, rewriteCssUrls } from '../apps/web/src/preview';
import { createBriefCache } from '../apps/api/src/exam-pdf';
import {
  appendConsoleEntry,
  CONSOLE_MESSAGE,
  MAX_CONSOLE_ENTRIES,
  readConsoleMessage,
  type ConsoleEntry,
} from '../apps/web/src/preview-console';

const files = [
  { path: 'index.html' },
  { path: 'smok1.JPG' },
  { path: 'pliki2/Jolka.jpg' },
  { path: 'img/moje foto.png' },
  { path: 'img/zdjęcie.jpg' },
  { path: 'podstrony/kontakt.html' },
];

describe('preview asset lookup', () => {
  const { find, suggest } = assetLookup(files);

  it('resolves addresses the way a browser on the examination workstation does', () => {
    expect(resolvePath('index.html', 'img\\moje%20foto.png?v=2#top')).toBe('img/moje foto.png');
    expect(resolvePath('podstrony/kontakt.html', '../smok1.JPG')).toBe('smok1.JPG');
    expect(resolvePath('podstrony/kontakt.html', '/smok1.JPG')).toBe('smok1.JPG');
    expect(resolvePath('index.html', '100%.png')).toBe('100%.png');
  });

  it('never resolves external, embedded or escaping addresses to a project file', () => {
    for (const address of [
      '',
      '#top',
      '//cdn.invalid/a.png',
      'https://cdn.invalid/a.png',
      'data:image/png;base64,AAAA',
      'javascript:alert(1)',
      '../outside.png',
    ])
      expect(resolvePath('index.html', address)).toBeNull();
    expect(find('index.html', 'https://cdn.invalid/smok1.JPG')).toBeUndefined();
  });

  it('ignores letter case but prefers the exact spelling', () => {
    expect(find('index.html', 'smok1.jpg')?.path).toBe('smok1.JPG');
    expect(find('index.html', 'SMOK1.JPG')?.path).toBe('smok1.JPG');
    expect(find('index.html', 'IMG/zdj%C4%99cie.jpg')?.path).toBe('img/zdjęcie.jpg');
    const both = assetLookup([{ path: 'Logo.png' }, { path: 'logo.png' }]);
    expect(both.find('index.html', 'logo.png')?.path).toBe('logo.png');
    expect(both.find('index.html', 'Logo.png')?.path).toBe('Logo.png');
  });

  it('suggests a file from another folder instead of silently using it', () => {
    expect(find('index.html', 'Jolka.jpg')).toBeUndefined();
    expect(suggest('Jolka.jpg')).toBe('pliki2/Jolka.jpg');
    expect(suggest('obrazy/jolka.JPG')).toBe('pliki2/Jolka.jpg');
    expect(suggest('brak.png')).toBeUndefined();
  });
});

describe('stylesheet addresses', () => {
  it('rewrites bare, quoted and space-containing url() values', () => {
    const seen: string[] = [];
    const css = rewriteCssUrls(
      `a{background:url(tlo.png)}b{background:url( 'img/moje foto.png' )}c{background:URL("x y.jpg")}`,
      (url) => {
        seen.push(url);
        return `R${seen.length}`;
      },
    );
    expect(seen).toEqual(['tlo.png', 'img/moje foto.png', 'x y.jpg']);
    expect(css).toBe('a{background:url("R1")}b{background:url("R2")}c{background:url("R3")}');
  });
});

describe('brief cache for pinned exam documents', () => {
  it('joins simultaneous loads, reuses a fresh value and reloads after it expires', async () => {
    vi.useFakeTimers();
    try {
      const cache = createBriefCache<string>(1000, 2);
      let release!: (value: string) => void;
      const load = vi.fn(() => new Promise<string>((resolve) => (release = resolve)));
      const first = cache('a', load);
      const second = cache('a', load);
      expect(load).toHaveBeenCalledOnce();
      release('bytes');
      expect(await Promise.all([first, second])).toEqual(['bytes', 'bytes']);
      expect(await cache('a', load)).toBe('bytes');
      expect(load).toHaveBeenCalledOnce();
      vi.advanceTimersByTime(1001);
      const again = cache('a', load);
      release('newer');
      expect(await again).toBe('newer');
      expect(load).toHaveBeenCalledTimes(2);
    } finally {
      vi.useRealTimers();
    }
  });

  it('does not keep failures and evicts the oldest entry beyond its size', async () => {
    const cache = createBriefCache<string>(60_000, 2);
    const failing = vi.fn(async () => {
      throw new Error('źródło niedostępne');
    });
    await expect(cache('a', failing)).rejects.toThrow('źródło niedostępne');
    expect(await cache('a', async () => 'A')).toBe('A');
    await cache('b', async () => 'B');
    await cache('c', async () => 'C');
    const reload = vi.fn(async () => 'A2');
    expect(await cache('a', reload)).toBe('A2');
    expect(reload).toHaveBeenCalledOnce();
    expect(await cache('c', reload)).toBe('C');
  });
});

describe('preview console messages', () => {
  it('accepts only the expected shape and limits what the frame can make the page hold', () => {
    const base = { type: CONSOLE_MESSAGE, level: 'error', text: 'x is not defined' };
    expect(readConsoleMessage({ ...base, file: 'js/app.js', line: 3 })).toEqual({
      level: 'error',
      text: 'x is not defined',
      file: 'js/app.js',
      line: 3,
    });
    // The frame's own address is not a project file, and a line needs a file.
    expect(readConsoleMessage({ ...base, file: 'about:srcdoc', line: 9 })).toEqual({
      level: 'error',
      text: 'x is not defined',
    });
    expect(readConsoleMessage({ ...base, file: '', line: 9 })).not.toHaveProperty('line');
    expect(readConsoleMessage({ ...base, file: 'app.js', line: -1 })).not.toHaveProperty('line');
    expect(readConsoleMessage({ ...base, text: 'a'.repeat(5000) })!.text).toHaveLength(2000);
    for (const invalid of [
      null,
      'text',
      { ...base, type: 'zdaj-preview-navigate' },
      { ...base, level: 'table' },
      { ...base, text: { html: '<b>x</b>' } },
    ])
      expect(readConsoleMessage(invalid)).toBeNull();
  });

  it('keeps only the newest entries', () => {
    let entries: ConsoleEntry[] = [];
    for (let index = 0; index < MAX_CONSOLE_ENTRIES + 5; index++)
      entries = appendConsoleEntry(entries, { level: 'log', text: String(index) });
    expect(entries).toHaveLength(MAX_CONSOLE_ENTRIES);
    expect(entries[0]!.text).toBe('5');
  });
});
