import { describe, expect, it } from 'vitest';
import { EditorState, type Transaction } from '@codemirror/state';
import { html } from '@codemirror/lang-html';
import { parseFragment, type DefaultTreeAdapterMap } from 'parse5';
import { examStudyGuides } from '../packages/content/src/exam-study';
import {
  emmetChainParts,
  emmetExamples,
  emmetTopics,
} from '../apps/web/src/emmet-learning/catalog';
import { emmetGuideBindings, getEmmetTeachingTip } from '../apps/web/src/emmet-learning/learning';
import {
  expandHtmlAbbreviation,
  expandHtmlShortcut,
} from '../apps/web/src/components/editor-abbreviation';

function editorExpansion(abbreviation: string) {
  const target = {
    state: EditorState.create({
      doc: abbreviation,
      selection: { anchor: abbreviation.length },
      extensions: [html()],
    }),
    dispatch(transaction: Transaction) {
      target.state = transaction.state;
    },
  };
  expect(expandHtmlAbbreviation('index.html')(target), abbreviation).toBe(true);
  return target.state.doc.toString();
}

const examples = emmetTopics.flatMap((topic) => topic.examples);
const positions = (guide: (typeof examStudyGuides)[number]) =>
  guide.steps.flatMap((step) => (step.activities ?? []).map((activity) => ({ step, activity })));
const elements = (
  node: DefaultTreeAdapterMap['documentFragment'] | DefaultTreeAdapterMap['element'],
) =>
  node.childNodes.filter((child): child is DefaultTreeAdapterMap['element'] => 'tagName' in child);

function countTags(source: string, tag: string) {
  const count = (node: DefaultTreeAdapterMap['node']): number =>
    ('tagName' in node && node.tagName === tag ? 1 : 0) +
    ('childNodes' in node ? node.childNodes.reduce((sum, child) => sum + count(child), 0) : 0);
  return count(parseFragment(source));
}

function courseTip(taskId: string, key: string) {
  const guide = examStudyGuides.find((item) => item.taskId === taskId)!;
  const position = positions(guide).find(
    ({ step, activity }) => `${step.id}/${activity.id}` === key,
  )!;
  const result = getEmmetTeachingTip(guide, position.step, position.activity);
  expect(result, `${taskId}/${key}`).toBeDefined();
  return result!;
}

describe('Emmet teaching catalog', () => {
  it('offers seven Polish topics and examples that match real editor expansion', () => {
    expect(emmetTopics).toHaveLength(7);
    expect(new Set(emmetTopics.map((topic) => topic.id)).size).toBe(emmetTopics.length);
    expect(new Set(examples.map((example) => example.id)).size).toBe(examples.length);
    for (const topic of emmetTopics) {
      expect(topic.description.length).toBeGreaterThan(20);
      expect(topic.examples.length).toBeGreaterThan(0);
    }
    for (const example of examples) {
      expect(example.explanation.length, example.id).toBeGreaterThan(30);
      const expansion = expandHtmlShortcut(example.abbreviation);
      expect(expansion, example.id).not.toBeNull();
      expect(expansion!.text).toBe(editorExpansion(example.abbreviation));
    }
  });

  it('teaches actual stylesheet defaults and the existing Polish document scaffold', () => {
    expect(expandHtmlShortcut(emmetExamples.stylesheet.abbreviation)?.text).toBe(
      '<link rel="stylesheet" href="style.css">',
    );

    expect(emmetExamples.stylesheet.explanation).toContain('href="style.css"');
    expect(emmetExamples.stylesheet.caution).toContain('nie tworzy pliku CSS');
    expect(emmetExamples.stylesheet.caution).toContain('drugi');
    expect(expandHtmlShortcut(emmetExamples.document.abbreviation)?.text).toContain(
      '<html lang="pl">',
    );
    expect(emmetExamples.document.caution).toContain('nie dodawaj drugiego html, head ani body');
  });

  it('explains a growing chain whose final elements are siblings, preserving Polish text', () => {
    expect(emmetChainParts.map((part) => part.abbreviation)).toEqual([
      'header',
      'header>h1{Tytuł}',
      'header>h1{Tytuł}^main',
      'header>h1{Tytuł}^main>p{Treść}',
      'header>h1{Tytuł}^main>p{Treść}^footer',
    ]);
    for (const part of emmetChainParts) {
      expect(expandHtmlShortcut(part.abbreviation)?.text).toBe(editorExpansion(part.abbreviation));
      expect(part.explanation.length).toBeGreaterThan(20);
    }
    const expanded = expandHtmlShortcut(emmetChainParts.at(-1)!.abbreviation)!.text;
    const roots = elements(parseFragment(expanded));
    expect(roots.map((node) => node.tagName)).toEqual(['header', 'main', 'footer']);
    expect(elements(roots[0]!)[0]?.tagName).toBe('h1');
    expect(elements(roots[1]!)[0]?.tagName).toBe('p');
    expect(expanded).toContain('Tytuł');
    expect(expanded).toContain('Treść');
    const climb = elements(
      parseFragment(expandHtmlShortcut(emmetExamples.doubleUp.abbreviation)!.text),
    );
    expect(climb.map((node) => node.tagName)).toEqual(['main', 'footer']);
    expect(elements(climb[0]!)[0]?.tagName).toBe('section');
  });

  it('distinguishes a repeated position from visible list numbering and grouped siblings', () => {
    const numbered = expandHtmlShortcut(emmetExamples.numbering.abbreviation)!.text;
    expect(numbered).toContain('class="punkt1"');
    expect(numbered).toContain('class="punkt3"');
    expect(emmetExamples.numbering.explanation).toContain('nie widoczne numery listy');
    const grouped = elements(
      parseFragment(expandHtmlShortcut(emmetExamples.grouping.abbreviation)!.text),
    );
    expect(grouped.map((node) => node.tagName)).toEqual(['section', 'aside']);
    expect(elements(grouped[0]!).map((node) => node.tagName)).toEqual(['h2', 'p']);
  });
});

describe('Pinned course Emmet guidance', () => {
  it('binds every reviewed entry to an existing activity in the exact published guide', () => {
    for (const [taskId, binding] of Object.entries(emmetGuideBindings)) {
      const guide = examStudyGuides.find((item) => item.taskId === taskId)!;
      expect(guide.id).toBe(binding.id);
      expect(guide.version).toBe(binding.version);
      for (const key of Object.keys(binding.activities)) {
        const position = positions(guide).find(
          ({ step, activity }) => `${step.id}/${activity.id}` === key,
        );
        expect(position, `${taskId}/${key}`).toBeDefined();
        expect(
          getEmmetTeachingTip(guide, position!.step, position!.activity),
          `${taskId}/${key}`,
        ).toBeDefined();
      }
    }
  });

  it('preserves cumulative list sizes instead of repeating already-written items', () => {
    const remaining = courseTip('inf03-01-24-01-sg', 'services/list-rest');
    const expanded = expandHtmlShortcut(remaining.example.abbreviation)!.text;
    expect(countTags(`<ol><li>Wcześniejsza usługa</li>${expanded}</ol>`, 'li')).toBe(4);
    expect(expanded).not.toContain('<ol>');
    const models = courseTip('inf03-01-24-06-sg', 'content/buy-list');
    expect(countTags(expandHtmlShortcut(models.example.abbreviation)!.text, 'li')).toBe(5);
  });

  it('creates initial tables but only adds cells when a row already exists', () => {
    for (const [taskId, key] of [
      ['cke-wedkowanie', 'html/table'],
      ['inf03-01-25-01-sg', 'home/table-header'],
      ['inf03-08-25-06-sg', 'form/table'],
    ]) {
      const tip = courseTip(taskId!, key!);
      const source = expandHtmlShortcut(tip.example.abbreviation)!.text;
      expect(countTags(source, 'table')).toBe(1);
      expect(countTags(source, 'tr')).toBe(1);
      expect(countTags(source, 'th')).toBe(3);
      expect(tip.example.title).toContain('Nowa tabela');
    }
    const river = courseTip('inf03-03-24-06-sg', 'table/headers');
    const source = expandHtmlShortcut(river.example.abbreviation)!.text;
    expect(source).not.toContain('<tr>');
    expect(countTags(`<table><thead><tr>${source}</tr></thead></table>`, 'tr')).toBe(1);
    expect(countTags(`<table><thead><tr>${source}</tr></thead></table>`, 'th')).toBe(5);
    expect(river.example.explanation).toContain('istniejącego tr');
  });

  it('matches the reviewed navigation element and structural roles of each course', () => {
    for (const key of ['structure/nav-first', 'structure/nav-other']) {
      const tip = courseTip('inf03-08-25-06-sg', key);
      const source = expandHtmlShortcut(tip.example.abbreviation)!.text;
      expect(elements(parseFragment(source))[0]?.tagName).toBe('button');
      expect(source).toContain('type="button"');
    }
    const firma = courseTip('inf03-01-24-01-sg', 'structure/blocks');
    expect(
      elements(parseFragment(expandHtmlShortcut(firma.example.abbreviation)!.text)).map(
        (node) => node.tagName,
      ),
    ).toEqual(['header', 'nav', 'section', 'main', 'footer']);
    const salon = courseTip('inf03-05-24-01-sg', 'structure/right');
    expect(
      elements(parseFragment(expandHtmlShortcut(salon.example.abbreviation)!.text)).map(
        (node) => node.tagName,
      ),
    ).toEqual(['header', 'section']);
  });

  it('maps appropriate HTML activities in all eight guides without altering their requirements', () => {
    const before = JSON.stringify(examStudyGuides);
    expect(examStudyGuides).toHaveLength(8);
    for (const guide of examStudyGuides) {
      let count = 0;
      for (const { step, activity } of positions(guide)) {
        const tip = getEmmetTeachingTip(guide, step, activity);
        if (!tip) continue;
        count += 1;
        expect(
          activity.checks?.some((check) => check.kind === 'html' && check.path === tip.fileName),
        ).toBe(true);
        expect(tip.placement).toBe(activity.placement);
        expect(
          expandHtmlShortcut(tip.example.abbreviation)?.text,
          `${guide.taskId}/${step.id}/${activity.id}`,
        ).toBe(editorExpansion(tip.example.abbreviation));
      }
      expect(count, guide.taskId).toBeGreaterThanOrEqual(10);
    }
    expect(JSON.stringify(examStudyGuides)).toBe(before);
  });

  it('teaches link:css using the exact href criterion on initial and repeated page steps', () => {
    const seen = new Set<string>();
    const names = new Set<string>();
    for (const guide of examStudyGuides) {
      for (const { step, activity } of positions(guide)) {
        const stylesheet = activity.checks?.find(
          (check) =>
            check.kind === 'html' &&
            check.selector === 'link[rel="stylesheet"]' &&
            check.attribute === 'href',
        );
        if (!stylesheet || stylesheet.kind !== 'html') continue;
        const tip = getEmmetTeachingTip(guide, step, activity)!;
        expect(tip, `${guide.taskId}/${step.id}/${activity.id}`).toBeDefined();
        expect(tip.example.abbreviation).toBe('link:css');
        expect(tip.fileName).toBe(stylesheet.path);
        expect(tip.note).toContain(`href="${stylesheet.equals}"`);
        names.add(stylesheet.equals!);
        seen.add(guide.taskId);
      }
    }
    expect(seen.size).toBe(8);
    expect([...names].sort()).toEqual(['styl.css', 'styl7.css', 'styl_1.css', 'style.css']);
  });

  it('keeps literal HTML teaching in PHP files without teaching PHP or executable scripts', () => {
    const phpGuides = examStudyGuides.filter((guide) =>
      guide.project?.starterFiles.some((file) => file.path.endsWith('.php')),
    );
    expect(phpGuides).toHaveLength(4);
    for (const guide of phpGuides) {
      const tips = positions(guide)
        .map(({ step, activity }) => getEmmetTeachingTip(guide, step, activity))
        .filter((tip) => tip !== undefined);
      expect(tips.some((tip) => tip.fileName.endsWith('.php'))).toBe(true);
      for (const { step, activity } of positions(guide)) {
        if (!activity.checks?.some((check) => check.kind === 'html'))
          expect(getEmmetTeachingTip(guide, step, activity)).toBeUndefined();
      }
    }
  });

  it('does not infer a filename when the stylesheet requirement is absent or changed in shape', () => {
    const guide = examStudyGuides.find((item) => item.taskId === 'inf03-01-24-01-sg')!;
    const { step, activity } = positions(guide).find(
      ({ activity: item }) => item.id === 'stylesheet',
    )!;
    const changed = structuredClone(activity);
    changed.checks = [
      {
        id: 'link',
        title: 'Link',
        kind: 'html',
        path: 'index.html',
        selector: 'link[rel="stylesheet"]',
        attribute: 'href',
      },
    ];
    expect(getEmmetTeachingTip(guide, step, changed)).toBeUndefined();
    changed.checks[0] = {
      ...changed.checks[0]!,
      kind: 'html',
      path: 'index.html',
      selector: 'link[rel="stylesheet"]',
      attribute: 'href',
      equals: 'folder/specjalny.css',
    };
    expect(getEmmetTeachingTip(guide, step, changed)?.note).toContain(
      'href="folder/specjalny.css"',
    );
  });

  it('falls back to the reference for unknown or legacy guides and unmapped activities', () => {
    const guide = examStudyGuides[0]!;
    const { step, activity } = positions(guide)[0]!;
    expect(getEmmetTeachingTip(guide, step, activity)).toBeDefined();
    for (const changed of [
      { ...guide, version: 1 },
      { ...guide, version: 4 },
      { ...guide, taskVersion: 2 },
      { ...guide, taskId: 'constructor' },
      { ...guide, id: 'different-guide' },
      { ...guide, project: undefined },
    ])
      expect(getEmmetTeachingTip(changed, step, activity)).toBeUndefined();
    expect(
      getEmmetTeachingTip(guide, step, { ...activity, id: 'future-activity' }),
    ).toBeUndefined();
    expect(getEmmetTeachingTip(guide, step, { ...activity, checks: [] })).toBeUndefined();
  });
});
