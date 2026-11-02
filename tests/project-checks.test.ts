import { describe, expect, it } from 'vitest';
import { attributeMatches, filesHash } from '../apps/web/src/project-checks';
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
});
