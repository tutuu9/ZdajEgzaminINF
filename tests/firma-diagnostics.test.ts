import { describe, expect, it } from 'vitest';
import type { StudyCheckResult } from '@zdaj/shared';
import { firmaGuide } from '../packages/content/src/study-project-firma';
import { diagnoseFirmaChecks } from '../apps/web/src/firma-diagnostics';
import type { CodeDiagnostic } from '../apps/web/src/code-diagnostic';

function check(
  activity: string,
  html: string,
  options: { passed?: boolean; missing?: string } = {},
) {
  const [section, action] = activity.split('/');
  const step = firmaGuide.steps.find((item) => item.id === section)!;
  const checks = step.activities!.find((item) => item.id === action)!.checks!;
  const files = ['index.html', 'uslugi.html', 'kontakt.html', 'styl.css']
    .filter((path) => path !== options.missing)
    .map((path) => ({ path, content: path === step.fileName ? html : '' }));
  const results: StudyCheckResult[] = checks.map(({ id, title }) => ({
    id,
    title,
    status: options.passed ? 'passed' : 'failed',
    evidence: '',
    recommendation: '',
  }));
  return diagnoseFirmaChecks(files, checks, results, activity);
}

function selected(html: string, advice: CodeDiagnostic | undefined) {
  const range = advice?.range;
  return range && html.replace(/\r\n?/g, '\n').slice(range.from, range.to);
}

describe('Firma IT learning advice', () => {
  it('locates the original language attribute after a CRLF and multibyte characters', () => {
    const html = '<!DOCTYPE html>\r\n<!-- ćwiczenie 🐟 -->\r\n<HTML data-tab="lang" LANG = \'en\'>';
    const [language, charset] = check('structure/document', html);
    expect(language?.explanation).toContain('lang="en"');
    expect(selected(html, language)).toBe("LANG = 'en'");
    expect(charset).toBeUndefined();
  });

  it('locates an explicit start tag for a missing language and never selects a synthesized tag', () => {
    const html = '<html class="strona"><body></body></html>';
    expect(selected(html, check('structure/document', html)[0])).toBe('<html class="strona">');
    const implied = check('structure/document', '<p>Treść</p>')[0];
    expect(implied?.path).toBe('index.html');
    expect(implied?.range).toBeUndefined();
    expect(implied?.explanation).toContain('dodaj <html lang="pl">');
    expect(check('structure/document', '<html lang="pl-PL">', { passed: true })[0]).toBeUndefined();
  });

  it.each(['structure/stylesheet', 'services/shared-shell', 'contact/shared-shell'])(
    'points to the stylesheet attribute on %s, ignoring the favicon and a commented example',
    (activity) => {
      const html =
        '<link rel="icon" href="logo.png"><!-- <link rel="stylesheet" href="styl.css"> --><link rel="stylesheet" href="style.css">';
      const advice = check(activity, html).at(-1);
      expect(selected(html, advice)).toBe('href="style.css"');
      expect(advice?.explanation).toContain('style.css');
      expect(advice?.explanation).toContain('styl.css');
    },
  );

  it('recognizes two wrong menu links with the same check ID independently of source order', () => {
    const html =
      '<a href="kontkat.html" aria-label="Kontakt">→</a> <a href="usługi.html"><em>Usługi</em></a>';
    const [services, contact] = check('common/other-links', html);
    expect(selected(html, services)).toBe('href="usługi.html"');
    expect(selected(html, contact)).toBe('href="kontkat.html"');
    expect(contact?.explanation).toContain('kontakt.html');
    expect(services?.explanation).toContain('uslugi.html');
  });

  it('offers only file navigation if a menu item or stylesheet cannot be uniquely located', () => {
    const links = '<a href="first.html">Kontakt</a><a href="second.html">Kontakt</a>';
    const [services, contact] = check('common/other-links', links);
    expect(services).toMatchObject({ path: 'index.html', range: undefined });
    expect(contact).toMatchObject({ path: 'index.html', range: undefined });
    const css = '<link rel="stylesheet" href="one.css"><link rel="stylesheet" href="two.css">';
    expect(check('structure/stylesheet', css)[0]?.range).toBeUndefined();
  });

  it.each([
    ['<nav>', '</nav>'],
    ['<div role="navigation">', '</div>'],
  ])('prefers a unique menu link inside %s to a matching footer label', (open, close) => {
    const html =
      open +
      '<p><a href="kontkat.html">Kontakt</a></p>' +
      close +
      '<footer><a href="stopka.html">Kontakt</a></footer>';
    expect(selected(html, check('common/other-links', html)[1])).toBe('href="kontkat.html"');
    const duplicate = html + '<nav><a href="adres.html">Kontakt</a></nav>';
    expect(check('common/other-links', duplicate)[1]?.range).toBeUndefined();
  });

  it('distinguishes a correct equivalent href with a missing target from a misspelled href', () => {
    const html = '<a href="./uslugi.html">Usługi</a><a href="./strony/../kontakt.html">Kontakt</a>';
    const [services, contact] = check('common/other-links', html, {
      passed: true,
      missing: 'kontakt.html',
    });
    expect(services).toBeUndefined();
    expect(contact?.warning).toBe('missing-file');
    expect(contact?.explanation).toContain('brakuje pliku kontakt.html');
    expect(selected(html, contact)).toBe('href="./strony/../kontakt.html"');
    expect(
      check('structure/stylesheet', '<link rel="stylesheet" href="./styl.css">', { passed: true }),
    ).toEqual([undefined]);
  });

  it('advises on each named menu item when swapped hrefs pass the v1 presence checks', () => {
    const html = '<nav><a href="./kontakt.html">Usługi</a><a href="uslugi.html">Kontakt</a></nav>';
    const [services, contact] = check('common/other-links', html, { passed: true });
    expect(services?.warning).toBe('menu-target');
    expect(contact?.warning).toBe('menu-target');
    expect(selected(html, services)).toBe('href="./kontakt.html"');
    expect(selected(html, contact)).toBe('href="uslugi.html"');
  });

  it.each([
    ['<a href="kontkat.html">', 'href="kontkat.html"'],
    ['<a class="kontakt">', '<a class="kontakt">'],
  ])('finds %s in the menu when a correct footer href masks the mistake', (tag, expected) => {
    const html = `<nav>${tag}Kontakt</a></nav><footer><a href="kontakt.html">Kontakt</a></footer>`;
    const contact = check('common/other-links', html, { passed: true })[1];
    expect(contact?.warning).toBe('menu-target');
    expect(selected(html, contact)).toBe(expected);
  });

  it('locates the named menu item for a deleted target and falls back when the menu is ambiguous', () => {
    const footer = '<footer><a href="kontakt.html">Kontakt</a></footer>';
    const menu = '<nav><a href="./kontakt.html">Kontakt</a></nav>';
    const options = { passed: true, missing: 'kontakt.html' };
    const html = menu + footer;
    const contact = check('common/other-links', html, options)[1];
    expect(contact?.warning).toBe('missing-file');
    expect(selected(html, contact)).toBe('href="./kontakt.html"');
    const ambiguous = check('common/other-links', menu + menu + footer, options)[1];
    expect(ambiguous?.warning).toBe('missing-file');
    expect(ambiguous?.range).toBeUndefined();
  });

  it('respects an accepted alternate label and does not mistake a footer for the named menu link', () => {
    const html =
      '<nav><a href="kontakt.html">Napisz do nas</a></nav><footer><a href="poczta.html">Kontakt</a></footer>';
    expect(check('common/other-links', html, { passed: true })[1]).toBeUndefined();
  });

  it('does not invent diagnoses for other steps or links to missing source files', () => {
    expect(check('structure/title', '<html lang="en">')).toEqual([undefined]);
    expect(check('structure/stylesheet', '', { missing: 'index.html' })).toEqual([undefined]);
  });
});
