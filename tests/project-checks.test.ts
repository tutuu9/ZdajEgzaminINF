import { describe, expect, it } from 'vitest';
import {
  attributeMatches,
  filesHash,
  htmlEvidence,
  readableCheckTitle,
  readableSelector,
} from '../apps/web/src/project-checks';
import { staticPhpMarkup } from '../apps/web/src/preview';

describe('project check evidence', () => {
  it('previews literal PHP template markup without evaluating or leaking PHP code', () => {
    expect(staticPhpMarkup('<h1>Smoki</h1><?php echo "?>hidden"; ?><footer>Koniec</footer>')).toBe(
      '<h1>Smoki</h1><footer>Koniec</footer>',
    );
    expect(staticPhpMarkup('<p>Ryby</p>')).toBe('<p>Ryby</p>');
    expect(staticPhpMarkup('<?php while(true){}')).toBe('');
  });
  it('accepts equivalent HTML attribute spellings and relative resource paths', () => {
    expect(attributeMatches('charset', 'UTF8', 'utf-8')).toBe(true);
    expect(attributeMatches('method', 'POST', 'post')).toBe(true);
    expect(attributeMatches('href', './styl.css', 'styl.css')).toBe(true);
    expect(attributeMatches('src', './obrazy/../logo.png', 'logo.png')).toBe(true);
    expect(attributeMatches('href', 'https://outside.invalid/styl.css', 'styl.css')).toBe(false);
    expect(attributeMatches('id', 'Wynik', 'wynik')).toBe(false);
    expect(attributeMatches('lang', null, 'pl')).toBe(false);
  });
  it('binds evidence to file contents with stable order and encoding defaults', async () => {
    const files = [
      { path: 'a.html', content: 'A' },
      { path: 'b.css', content: 'B' },
    ];
    expect(await filesHash(files)).toBe(
      await filesHash([...files].reverse().map((file) => ({ ...file, encoding: 'utf8' }))),
    );
    expect(await filesHash(files)).not.toBe(
      await filesHash([{ path: 'a.html', content: 'changed' }, files[1]!]),
    );
  });
  it('describes HTML checks in learner language with correct Polish number forms', () => {
    expect(htmlEvidence(1, 'header')).toBe('Znaleziono 1 pasujący element: header.');
    expect(htmlEvidence(3, 'li')).toBe('Znaleziono 3 pasujące elementy: li.');
    expect(htmlEvidence(5, 'li')).toBe('Znaleziono 5 pasujących elementów: li.');
    expect(htmlEvidence(0, 'nav')).toBe('Znaleziono 0 pasujących elementów: nav.');
    expect(htmlEvidence(22, 'li')).toBe('Znaleziono 22 pasujące elementy: li.');
    expect(htmlEvidence(1, 'li', 3)).toBe(
      'Znaleziono 1 pasujący element: li. Wymagane: co najmniej 3.',
    );
  });
  it('removes selector case flags and joins alternatives without splitting nested commas', () => {
    expect(readableSelector('meta[charset="UTF-8" i], meta[charset="utf8" i]')).toBe(
      'meta[charset="UTF-8"] lub meta[charset="utf8"]',
    );
    expect(readableSelector('html[lang|="pl" i]')).toBe('html[lang|="pl"]');
    expect(readableSelector('input[type="text"], input:not([type])')).toBe(
      'input[type="text"] lub input:not([type])',
    );
    expect(readableSelector(':is(h1, h2) > a[title="a, b"]')).toBe(':is(h1, h2) > a[title="a, b"]');
    expect(readableSelector('a[title="say \\" i]"]')).toBe('a[title="say \\" i]"]');
    expect(readableCheckTitle('HTML: main, section')).toBe('HTML: main lub section');
    expect(readableCheckTitle('Treść nagłówka')).toBe('Treść nagłówka');
  });
});
