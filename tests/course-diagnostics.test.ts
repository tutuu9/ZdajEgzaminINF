import { describe, expect, it } from 'vitest';
import type { ProjectFile, StudyCheckResult, StudyCheckSpec } from '@zdaj/shared';
import { diagnoseCourseChecks } from '../apps/web/src/course-diagnostics';
import { chatSteps } from '../packages/content/src/study-project-chat';
import { kursyProjectSteps } from '../packages/content/src/study-project-kursy';
import { motocykleProjectSteps } from '../packages/content/src/study-project-motocykle';
import { rzekiProjectSteps } from '../packages/content/src/study-project-rzeki';
import { salonSteps } from '../packages/content/src/study-project-salon';
import { smokiProjectSteps } from '../packages/content/src/study-project-smoki';
import { wedkowanieProjectSteps } from '../packages/content/src/study-project-wedkowanie';

type HtmlCheck = Extract<StudyCheckSpec, { kind: 'html' }>;
const courses = {
  kursy: kursyProjectSteps,
  wedkowanie: wedkowanieProjectSteps,
  smoki: smokiProjectSteps,
  salon: salonSteps,
  motocykle: motocykleProjectSteps,
  chat: chatSteps,
  rzeki: rzekiProjectSteps,
};
function checksFor(course: keyof typeof courses) {
  return courses[course].flatMap((step) =>
    step.activities!.flatMap((activity) => activity.checks!),
  );
}
function criterion(course: keyof typeof courses, selector: string, text?: string) {
  return checksFor(course).find(
    (check): check is HtmlCheck =>
      check.kind === 'html' && check.selector === selector && (!text || check.text === text),
  )!;
}
function inspect(
  check: HtmlCheck,
  content: string,
  status: StudyCheckResult['status'] = 'failed',
  additional: ProjectFile[] = [],
  previous: StudyCheckSpec[] = [],
) {
  const files: ProjectFile[] = [{ path: check.path, content }, ...additional];
  const result: StudyCheckResult = {
    id: check.id,
    title: check.title,
    status,
    evidence: '',
    recommendation: '',
  };
  const [advice] = diagnoseCourseChecks(files, [check], [result], [check.path], previous);
  const range = advice?.range;
  return { advice, selected: range && content.replace(/\r\n?/g, '\n').slice(range.from, range.to) };
}

describe('source guidance for published INF.03 courses', () => {
  it('keeps earlier headings, images and section IDs while helping add their siblings', () => {
    const oldHeading = criterion('chat', 'aside h3', 'Chaty');
    const newHeading = criterion('chat', 'aside h3', 'Uczestnicy');
    const first = '<aside><h3>Chaty</h3>';
    expect(
      inspect(newHeading, first + '</aside>', 'failed', [], [oldHeading]).selected,
    ).toBeUndefined();
    expect(
      inspect(newHeading, first + '<h3>Uczesnicy</h3></aside>', 'failed', [], [oldHeading])
        .selected,
    ).toBe('Uczesnicy');
    const oldImage = criterion('chat', 'aside img[alt="Jolanta Nowak"]');
    const newImage = criterion('chat', 'aside img[alt="Krzysztof Łukasiński"]');
    const image = '<aside><img src="Jolka.jpg" alt="Jolanta Nowak"></aside>';
    expect(inspect(newImage, image, 'failed', [], [oldImage]).selected).toBeUndefined();
    const oldSection = criterion('smoki', 'main section#baza');
    const newSection = criterion('smoki', 'main section#opisy');
    const section = '<main><section id="baza"></section>';
    expect(
      inspect(newSection, section + '</main>', 'failed', [], [oldSection]).selected,
    ).toBeUndefined();
    expect(
      inspect(
        newSection,
        section + '<section id="opis"></section></main>',
        'failed',
        [],
        [oldSection],
      ).selected,
    ).toBe('id="opis"');
  });

  it('opens the href of the correctly labelled link when menu destinations are swapped', () => {
    const old = criterion('kursy', 'nav a[href="index.html"]', 'Strona główna');
    const current = criterion('kursy', 'nav a[href="raty.html"]', 'Koszt rat');
    const swapped =
      '<nav><a href="raty.html">Strona główna</a><a href="index.html">Koszt rat</a></nav>';
    expect(inspect(current, swapped, 'failed', [], [old]).selected).toBe('href="index.html"');
  });
  it.each(Object.keys(courses) as (keyof typeof courses)[])(
    '%s locates the actual language attribute in the pinned guide',
    (course) => {
      const check = criterion(course, 'html[lang|="pl" i]');
      const bad = inspect(check, "<!doctype html>\r\n<!-- Żółć 🐟 -->\r\n<HTML LANG = 'en'>");
      expect(bad.selected).toBe("LANG = 'en'");
      expect(bad.advice?.explanation).toContain('lang="en"');
      expect(bad.advice?.path).toBe(check.path);
      expect(inspect(check, '<html lang="pl-PL">', 'passed').advice).toBeUndefined();
      expect(inspect(check, '<html class="strona">').selected).toBe('<html class="strona">');
      expect(inspect(check, '').selected).toBeUndefined();
    },
  );

  it('identifies the destination of a labelled link in the correct menu, even beside valid links', () => {
    const check = criterion('kursy', 'nav a[href="raty.html"]', 'Koszt rat');
    const before = '<a href="poza.html">Koszt rat</a><nav><a href="index.html">Strona główna</a>';
    const bad = inspect(check, before + '<a href="raaty.html"><span>Koszt rat</span></a></nav>');
    expect(bad.selected).toBe('href="raaty.html"');
    expect(bad.advice?.explanation).toContain('raty.html');
    const ambiguous = inspect(
      check,
      before + '<a href="a">Koszt rat</a><a href="b">Koszt rat</a></nav>',
    );
    expect(ambiguous.selected).toBeUndefined();
  });

  it('distinguishes the encoding declaration from a viewport meta and targets the wrong resource', () => {
    const encoding = criterion('smoki', 'meta[charset="utf-8" i], meta[charset="utf8" i]');
    expect(inspect(encoding, '<meta name="viewport"><meta charset="ASCII">').selected).toBe(
      'charset="ASCII"',
    );
    const sheet = criterion('salon', 'link[rel="stylesheet"]');
    const css = '<link rel="icon" href="logo.png"><link rel="stylesheet" HREF="style.css">';
    expect(inspect(sheet, css).selected).toBe('HREF="style.css"');
    expect(inspect(sheet, '<link rel="icon" href="logo.png">').selected).toBeUndefined();
  });

  it('selects text in the title, a missing class on the intended control, and an unambiguous list container', () => {
    expect(inspect(criterion('motocykle', 'title'), '<title>Motory</title>').selected).toBe(
      'Motory',
    );
    const control = criterion('kursy', '#react[type="checkbox"].kontrolki');
    expect(inspect(control, '<input type="checkbox" id="react" class="inne">').selected).toBe(
      'class="inne"',
    );
    const items = criterion('chat', 'aside ul > li:nth-child(2) > ol > li');
    const list =
      '<aside><ul><li>A</li><li>B<ol data-region="druga"><li>C</li></ol></li></ul></aside>';
    expect(inspect(items, list).selected).toBe('<ol data-region="druga">');
  });

  it('ignores HTML examples inside templates, comments and quoted PHP strings', () => {
    const check = criterion('wedkowanie', 'header h1', 'Portal dla wędkarzy');
    const html =
      '<!-- <h1>z komentarza</h1> --><template><header><h1>z szablonu</h1></header></template>' +
      '<header><h1>Tytuł ucznia</h1></header>';
    expect(inspect(check, html).selected).toBe('Tytuł ucznia');
    const php =
      '<?php echo "<header><h1>PHP</h1></header>"; ?>\r\n<!-- różne 🐟 -->\r\n<header><h1 class="real">';
    const manual = inspect(check, php, 'manual');
    expect(manual.selected).toBe('<h1 class="real">');
    expect(manual.advice?.explanation).toContain('localhost');
    expect(
      inspect(check, '<?php echo "<header><h1>PHP</h1></header>"; ?>', 'manual').selected,
    ).toBeUndefined();
    const dynamic = inspect(
      criterion('smoki', 'html[lang|="pl" i]'),
      '<html lang="<?= $lang ?>">',
      'manual',
    );
    expect(dynamic.selected).toBeUndefined();
  });

  it('separates a valid local reference with a missing file from external URLs', () => {
    const style = criterion('kursy', 'link[rel="stylesheet"]');
    const html = '<link rel="stylesheet" href="./style.css">';
    expect(inspect(style, html, 'passed').advice?.warning).toBe('missing-file');
    expect(inspect(style, html, 'passed').selected).toBe('href="./style.css"');
    expect(
      inspect(style, html, 'passed', [{ path: 'style.css', content: '' }]).advice,
    ).toBeUndefined();
    const external = criterion('rzeki', 'a', 'Dowiedz się więcej');
    expect(
      inspect(external, '<a href="https://komunikaty.pl">Dowiedz się więcej</a>', 'passed').advice,
    ).toBeUndefined();
  });

  it('offers file-level fallback for unusable selectors and preserves a checker error', () => {
    const check = criterion('kursy', 'title');
    expect(inspect({ ...check, selector: ':bogus(' }, '<html>').advice).toMatchObject({
      path: check.path,
    });
    expect(inspect(check, 'x'.repeat(1_000_001)).selected).toBeUndefined();
    expect(inspect(check, '<title>Zły</title>', 'error').advice).toBeUndefined();
  });

  it('keeps SQL and runtime guidance file-only, and leaves binary or absent files to the original report', () => {
    const manual: StudyCheckSpec = {
      kind: 'manual',
      id: 'sql',
      title: 'SQL',
      prompt: 'Sprawdź zapytanie.',
    };
    const runtime: StudyCheckSpec = {
      kind: 'runtime',
      id: 'js',
      title: 'Chat',
      adapter: 'chat-messages',
      entry: 'chat.html',
    };
    const criterion: StudyCheckSpec = {
      kind: 'file',
      id: 'text',
      title: 'Plik',
      path: 'przeglądarka.txt',
      nonEmpty: true,
    };
    const results: StudyCheckResult[] = [manual, runtime, criterion].map(({ id, title }, i) => ({
      id,
      title,
      evidence: 'Z raportu',
      recommendation: '',
      status: i === 0 ? 'manual' : 'failed',
    }));
    const files = [
      { path: 'kwerendy.txt', content: 'SELECT' },
      { path: 'chat.js', content: '' },
      { path: 'przeglądarka.txt', content: '\n' },
    ];
    expect(diagnoseCourseChecks(files, [manual], [results[0]!], ['kwerendy.txt'])[0]).toMatchObject(
      { path: 'kwerendy.txt' },
    );
    const js = diagnoseCourseChecks(files, [runtime], [results[1]!], ['chat.js'])[0];
    expect(js?.path).toBe('chat.js');
    expect(js?.range).toBeUndefined();
    expect(
      diagnoseCourseChecks(files, [criterion], [results[2]!], [criterion.path])[0]?.explanation,
    ).toContain('pusty');
    expect(
      diagnoseCourseChecks([], [criterion], [results[2]!], [criterion.path])[0],
    ).toBeUndefined();
    expect(
      diagnoseCourseChecks(
        [{ path: 'obraz.jpg', content: 'AAA=', encoding: 'base64' }],
        [manual],
        [results[0]!],
        ['obraz.jpg'],
      )[0],
    ).toBeUndefined();
  });
});
