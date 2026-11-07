import { describe, expect, it } from 'vitest';
import type { ExamStudyStep, ProjectFile, StudyActivity, StudyCheckSpec } from '@zdaj/shared';
import { examStudyGuides } from '../packages/content/src/exam-study';
import {
  findActivitySource,
  getChangeLesson,
  isChangeUnderstandActivity,
} from '../apps/web/src/change-understand/learning';

function fixture(checks: StudyCheckSpec[], language = 'html', path = 'index.html') {
  const activity: StudyActivity = {
    id: 'one',
    title: 'Jedna zmiana',
    explanation: 'Wyjaśnienie',
    instruction: 'Wykonaj zmianę.',
    exampleCode: '',
    why: [],
    check: { type: 'self-check', prompt: 'Sprawdź plik.' },
    targetFiles: [path],
    checks,
  };
  const step: ExamStudyStep = {
    id: 'section',
    title: 'Sekcja',
    requirement: 'Wymaganie CKE',
    page: 3,
    explanation: '',
    code: '',
    language,
    fileName: path,
    why: [],
    commonMistakes: [],
    checkpoint: '',
    activities: [activity],
  };
  return { step, activity };
}
const css = (property: string): StudyCheckSpec => ({
  id: 'css',
  title: 'Styl',
  kind: 'css',
  path: 'styl.css',
  entry: 'index.html',
  selector: 'button',
  property,
  expected: ['20px'],
});
const html = (selector: string, attribute?: string): Extract<StudyCheckSpec, { kind: 'html' }> => ({
  id: 'html',
  title: 'HTML',
  kind: 'html',
  path: 'index.html',
  selector,
  attribute,
});
const file = (path: string, content: string): ProjectFile => ({ path, content });

describe('Zmień i zrozum teaching metadata', () => {
  it('offers HTML and CSS explanations in each of the eight pinned course guides without editing them', () => {
    const original = JSON.stringify(examStudyGuides);
    expect(examStudyGuides).toHaveLength(8);
    for (const guide of examStudyGuides) {
      const lessons = guide.steps
        .flatMap((step) =>
          (step.activities ?? []).map((activity) => getChangeLesson(step, activity)),
        )
        .filter((lesson) => lesson !== undefined);
      expect(lessons.length, guide.taskId).toBeGreaterThan(10);
      expect(
        lessons.some((lesson) => lesson.kind === 'html'),
        guide.taskId,
      ).toBe(true);
      expect(
        lessons.some((lesson) => lesson.kind === 'css'),
        guide.taskId,
      ).toBe(true);
      expect(
        lessons.some((lesson) => lesson.prediction),
        guide.taskId,
      ).toBe(true);
      for (const lesson of lessons) {
        expect(lesson.title.length).toBeGreaterThan(3);
        expect(lesson.explanation.length).toBeGreaterThan(15);
        expect(lesson.targetFiles.length).toBeGreaterThan(0);
      }
    }
    expect(JSON.stringify(examStudyGuides)).toBe(original);
  });

  it('excludes JavaScript, SQL, runtime and graphics while allowing literal HTML inside PHP', () => {
    const manual: StudyCheckSpec = {
      id: 'manual',
      kind: 'manual',
      title: 'Ręcznie',
      prompt: 'Sprawdź.',
    };
    for (const [language, path] of [
      ['javascript', 'skrypt.js'],
      ['sql', 'kwerendy.sql'],
      ['php', 'wynik.php'],
      ['html', 'logo.png'],
    ]) {
      const { step, activity } = fixture([manual], language, path);
      expect(isChangeUnderstandActivity(step, activity)).toBe(false);
    }
    const runtime = fixture([
      css('gap'),
      {
        id: 'runtime',
        title: 'JS',
        kind: 'runtime',
        adapter: 'chat-messages',
        entry: 'index.html',
      },
    ]);
    expect(isChangeUnderstandActivity(runtime.step, runtime.activity)).toBe(false);
    const manualRuntime = { ...runtime.activity, id: 'manual-runtime', checks: [manual] };
    expect(isChangeUnderstandActivity(runtime.step, manualRuntime)).toBe(false);
    const template = fixture([{ ...html('header'), path: 'strona.php' }], 'php', 'strona.php');
    expect(isChangeUnderstandActivity(template.step, template.activity)).toBe(true);
    const create = fixture(
      [{ id: 'file', title: 'Plik', kind: 'file', path: 'styl.css' }],
      'css',
      'styl.css',
    );
    expect(getChangeLesson(create.step, create.activity)?.kind).toBe('css');
  });

  it('distinguishes padding, margin and gap and gives explanation for either prediction choice', () => {
    for (const property of ['padding-top', 'margin', 'gap']) {
      const { step, activity } = fixture([css(property)], 'css', 'styl.css');
      const lesson = getChangeLesson(step, activity)!;
      expect(lesson.entry).toBe('index.html');
      expect(lesson.prediction?.options).toHaveLength(2);
      expect(lesson.prediction?.options.every((option) => option.explanation.length > 20)).toBe(
        true,
      );
      expect(
        lesson.prediction?.options.find(
          (option) => option.id === lesson.prediction?.correctOptionId,
        ),
      ).toBeDefined();
      expect(lesson.explanation).toMatch(
        property === 'margin' ? /zewnątrz/ : property === 'gap' ? /między/ : /wewnątrz/,
      );
    }
  });

  it('does not invent semantics for unknown CSS properties', () => {
    for (const property of [
      '--custom-property',
      'constructor',
      '__proto__',
      'padding-nonsense',
      'border-collapse',
    ]) {
      const { step, activity } = fixture([css(property)], 'css', 'styl.css');
      const lesson = getChangeLesson(step, activity)!;
      expect(lesson.prediction).toBeUndefined();
      expect(lesson.explanation).toContain('odczytaj z polecenia');
      expect(lesson.explanation).not.toContain('kolor');
    }
  });

  it('uses the target HTML tag instead of its ancestor or attribute text', () => {
    const anchor = fixture([html('nav > a', 'href')]);
    expect(getChangeLesson(anchor.step, anchor.activity)?.id).toBe('html-link');
    const attributeText = fixture([html('[title="img a"]')]);
    expect(getChangeLesson(attributeText.step, attributeText.activity)?.id).toBe('html-structure');
  });

  it('focuses a mixed style step on spacing and reveals the same selected declaration', () => {
    const { step, activity } = fixture(
      [css('background-color'), css('padding-top'), css('font-weight')],
      'css',
      'styl.css',
    );
    const source = 'button { background-color: red; padding-top: 12px; font-weight: bold }';
    expect(getChangeLesson(step, activity)?.id).toBe('css-padding-top');
    const target = findActivitySource([file('styl.css', source)], step, activity)!;
    expect(source.slice(target.range!.from, target.range!.to)).toBe('padding-top: 12px');
  });

  it('explains invisible language and charset edits without promising a visual difference', () => {
    const language = fixture([html('html', 'lang')]);
    const encoding = fixture([html('meta[charset]', 'charset')]);
    expect(getChangeLesson(language.step, language.activity)?.watchFor).toContain(
      'nie dać widocznej różnicy',
    );
    expect(getChangeLesson(encoding.step, encoding.activity)?.watchFor).toContain('Unicode');
  });

  it('keeps source ranges aligned with CRLF, Polish text and PHP before the HTML', () => {
    const path = 'strona.php';
    const source =
      '<?php $text = "<html lang=\'xx\'>"; ?>\r\n<!-- Żółć 🐟 -->\r\n<html lang="en"><body>Tekst</body></html>';
    const { step, activity } = fixture([{ ...html('html', 'lang'), path }], 'php', path);
    const target = findActivitySource([file(path, source)], step, activity)!;
    expect(source.replace(/\r\n/g, '\n').slice(target.range!.from, target.range!.to)).toBe(
      'lang="en"',
    );
  });

  it('uses file-level navigation for ambiguous or PHP-spanning tags', () => {
    const link = fixture([html('a', 'href')]);
    expect(
      findActivitySource(
        [file('index.html', '<a href="a">A</a><a href="b">B</a>')],
        link.step,
        link.activity,
      )?.range,
    ).toBeUndefined();
    const template = fixture(
      [{ ...html('html', 'lang'), path: 'strona.php' }],
      'php',
      'strona.php',
    );
    expect(
      findActivitySource(
        [file('strona.php', '<html lang="<?php echo $lang; ?>"><body>x</body></html>')],
        template.step,
        template.activity,
      )?.range,
    ).toBeUndefined();
  });

  it('reveals authored CSS declaration offsets and falls back to its selector for shorthand', () => {
    const raw = '/* Zażółć 🐟 */\r\n@media screen {\r\nbutton { padding: 12px; }\r\n}';
    const padding = fixture([css('padding')], 'css', 'styl.css');
    const target = findActivitySource([file('styl.css', raw)], padding.step, padding.activity)!;
    expect(raw.replace(/\r\n/g, '\n').slice(target.range!.from, target.range!.to)).toBe(
      'padding: 12px',
    );
    const side = fixture([css('padding-top')], 'css', 'styl.css');
    const fallback = findActivitySource([file('styl.css', raw)], side.step, side.activity)!;
    expect(raw.replace(/\r\n/g, '\n').slice(fallback.range!.from, fallback.range!.to)).toBe(
      'button',
    );
  });

  it('handles missing and large files without making up a position', () => {
    const { step, activity } = fixture([html('html', 'lang')]);
    expect(findActivitySource([], step, activity)).toMatchObject({
      path: 'index.html',
      note: expect.stringContaining('jeszcze nie ma'),
    });
    expect(
      findActivitySource([file('index.html', 'x'.repeat(200_001))], step, activity)?.range,
    ).toBeUndefined();
    expect(
      findActivitySource([file('index.html', 'x'.repeat(200_001))], step, activity)?.note,
    ).toContain('zbyt duży');
  });
});
