import { describe, expect, it } from 'vitest';
import type { StudyCheckResult, StudyCheckSpec } from '@zdaj/shared';
import { examStudyGuides } from '../packages/content/src/exam-study';
import { diagnoseCssCheck } from '../apps/web/src/css-diagnostics';

type CssCheck = Extract<StudyCheckSpec, { kind: 'css' }>;

const check: CssCheck = {
  kind: 'css',
  id: 'header-padding',
  title: 'header — padding-top',
  entry: 'index.html',
  path: 'styl.css',
  selector: 'header',
  property: 'padding-top',
  expected: ['20px'],
};
const failed: StudyCheckResult = {
  id: check.id,
  title: check.title,
  status: 'failed',
  evidence: 'padding-top: 4px',
  recommendation: '',
};

function diagnose(css: string, spec = check, result = failed) {
  const advice = diagnoseCssCheck(
    [
      { path: spec.path, content: css },
      { path: spec.entry, content: '<header></header>' },
    ],
    spec,
    result,
  );
  const range = advice?.range;
  return {
    advice,
    selection: range && css.replace(/\r\n?/g, '\n').slice(range.from, range.to),
  };
}

describe('CSS source guidance', () => {
  const guides = examStudyGuides.filter((guide) => guide.taskId !== 'inf03-01-24-01-sg');

  it.each(guides)('locates properties checked in the published guide $title', (guide) => {
    const checks = guide.steps
      .flatMap((step) => step.activities ?? [])
      .flatMap((activity) => activity.checks ?? [])
      .filter((spec): spec is CssCheck => spec.kind === 'css');
    expect(checks.length).toBeGreaterThan(0);
    for (const spec of checks) {
      const declaration = `${spec.property}: initial`;
      const { advice, selection } = diagnose(`${spec.selector} { ${declaration}; }`, spec, {
        ...failed,
        id: spec.id,
        evidence: declaration,
      });
      expect(advice?.path).toBe(spec.path);
      expect(selection).toBe(declaration);
      expect(advice?.explanation).toContain(spec.expected[0]);
    }
  });

  it('uses the measured value and reveals the authored shorthand with LF/UTF-16 offsets', () => {
    const source =
      '/* Ćwiczenie 🐟 header { padding-top:20px } */\r\nmain, header { PADDING: 4px 2px }';
    const { advice, selection } = diagnose(source);
    expect(selection).toBe('PADDING: 4px 2px');
    expect(advice?.explanation).toContain('padding-top: 4px');
    expect(advice?.explanation).toContain('20px');
  });

  it('reveals the selector for a missing declaration, and avoids guessing in ambiguous rules', () => {
    expect(diagnose('header { color: red; }').selection).toBe('header');
    for (const source of [
      'header { padding:4px } header { padding:6px }',
      '@media screen { header { padding:4px } }',
      'header { padding:4px; padding-top:6px }',
      '.site-head { padding:4px }',
    ]) {
      const { advice, selection } = diagnose(source);
      expect(advice?.path).toBe('styl.css');
      expect(selection).toBeUndefined();
    }
    expect(
      diagnose('header {padding:0}', { ...check, selector: 'header, footer' }).selection,
    ).toBeUndefined();
  });

  it('directs missing elements to the actual markup, and keeps manual inspection and errors distinct', () => {
    expect(
      diagnose('header{}', check, { ...failed, evidence: 'Nie znaleziono elementu header.' })
        .advice,
    ).toMatchObject({ path: 'index.html' });
    const { advice, selection } = diagnose(
      'header{padding:0}',
      { ...check, entry: 'rzeki.php' },
      {
        ...failed,
        status: 'manual',
        evidence: 'Brakuje statycznego widoku HTML do bezpiecznego pomiaru stylu.',
      },
    );
    expect(selection).toBe('padding:0');
    expect(advice?.explanation).toContain('lokalnym serwerze');
    expect(advice?.explanation).not.toContain('Podgląd pokazuje');
    for (const status of ['passed', 'error', 'unsupported'] as const) {
      expect(diagnose('header{}', check, { ...failed, status }).advice).toBeUndefined();
    }
  });

  it('offers an existing entry file when the named stylesheet is missing', () => {
    const advice = diagnoseCssCheck([{ path: 'index.html', content: '' }], check, failed);
    expect(advice?.path).toBe('index.html');
    expect(advice?.range).toBeUndefined();
    expect(advice?.explanation).toContain('Dodaj ten plik');
    expect(diagnoseCssCheck([], check, failed)).toBeUndefined();
  });
});
