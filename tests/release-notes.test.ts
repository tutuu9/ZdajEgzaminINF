import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  inlineParts,
  localHref,
  parseRelease,
  releaseHistory,
} from '../apps/web/src/release-notes';

const releasesDir = resolve(__dirname, '..', 'docs', 'releases');
const files = Object.fromEntries(
  readdirSync(releasesDir)
    .filter((name) => name.endsWith('.md'))
    .map((name) => [`../docs/releases/${name}`, readFileSync(resolve(releasesDir, name), 'utf8')]),
);

describe('release notes for learners', () => {
  it('reads only the Polish summary and its bullet list', () => {
    const release = parseRelease(
      'v9.1.0.md',
      '# v9.1.0 — Nowy tytuł\r\n\r\n## English\r\n\r\nEnglish text.\r\n\r\n## Polski\r\n\r\nWstęp\r\nw dwóch wierszach.\r\n\r\n- Pierwszy\r\n  ciąg dalszy.\r\n- Drugi\r\n\r\nSzczegóły wdrożenia.\r\n',
    );
    expect(release).toEqual({
      version: '9.1.0',
      title: 'Nowy tytuł',
      intro: 'Wstęp\nw dwóch wierszach.',
      items: ['Pierwszy ciąg dalszy.', 'Drugi'],
    });
  });

  it('ignores files without a version, a title or a Polish section', () => {
    expect(parseRelease('notes.md', '# x — y\n\n## Polski\n\nTekst')).toBeUndefined();
    expect(parseRelease('v1.0.0.md', '# x — y\n\n## English\n\nText')).toBeUndefined();
    expect(parseRelease('v1.0.0.md', '## Polski\n\nTekst')).toBeUndefined();
  });

  it('lists every published release newest first and skips the unpublished 1.6.0', () => {
    const history = releaseHistory(files);
    const versions = history.map((release) => release.version);
    expect(versions).not.toContain('1.6.0');
    expect(versions).toContain('1.0.0');
    expect(versions).toEqual(
      [...versions].sort((a, b) =>
        b.localeCompare(a, undefined, { numeric: true, sensitivity: 'base' }),
      ),
    );
    for (const release of history) {
      expect(release.title, release.version).not.toMatch(/^v\d/);
      expect(release.intro || release.items.length, release.version).toBeTruthy();
    }
  });

  it('turns links to the public site into in-app paths only', () => {
    expect(localHref('https://zdajegzamin.sbs/faq')).toBe('/faq');
    expect(localHref('https://zdajegzamin.sbs')).toBe('/');
    expect(localHref('https://zdajegzamin.sbs.example.com/faq')).toBeUndefined();
    expect(localHref('https://github.com/tutuu9/ZdajEgzaminINF')).toBeUndefined();
  });

  it('splits the supported inline Markdown without interpreting anything else', () => {
    expect(
      inlineParts('Użyj **Nauka**, wpisz `div` i [otwórz FAQ](https://zdajegzamin.sbs/faq).'),
    ).toEqual([
      { kind: 'text', text: 'Użyj ' },
      { kind: 'strong', text: 'Nauka' },
      { kind: 'text', text: ', wpisz ' },
      { kind: 'code', text: 'div' },
      { kind: 'text', text: ' i ' },
      { kind: 'link', text: 'otwórz FAQ', href: 'https://zdajegzamin.sbs/faq' },
      { kind: 'text', text: '.' },
    ]);
    expect(inlineParts('<script>alert(1)</script>')).toEqual([
      { kind: 'text', text: '<script>alert(1)</script>' },
    ]);
  });
});
