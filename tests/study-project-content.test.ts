import { describe, expect, it } from 'vitest';
import { load } from 'cheerio';
import { parser as phpParser } from '@lezer/php';
import type { StudyCheckSpec } from '@zdaj/shared';
import { allExamStudyGuides, examStudyGuides as currentGuides } from '@zdaj/content';
import { staticPhpTemplate, studyRuntimeAdapter } from '@zdaj/checker';
import { validStudyProjects, invalidStudyProjects } from '../fixtures/study/projects.js';

const examStudyGuides = currentGuides.filter((guide) => guide.version === 3);

function htmlMatches(source: string, check: Extract<StudyCheckSpec, { kind: 'html' }>): boolean {
  const $ = load(source.includes('<?') ? staticPhpTemplate(source) : source);
  const matches = $(check.selector).filter((_, element) => {
    const node = $(element);
    return (
      (!check.attribute ||
        (check.equals === undefined
          ? node.attr(check.attribute) !== undefined
          : node.attr(check.attribute) === check.equals)) &&
      (!check.text || node.text().replace(/\s+/g, ' ').includes(check.text))
    );
  });
  return matches.length >= (check.minCount ?? 1);
}

describe('cumulative CKE project guides, revision 3', () => {
  it('starts every route in the existing document before external setup', () => {
    for (const guide of examStudyGuides) {
      const first = guide.steps[0]!;
      expect(['structure', 'html']).toContain(first.id);
      expect(first.activities![0]!.id).toBe('document');
      expect(first.activities![0]!.checks!.some((check) => check.kind === 'html')).toBe(true);
      expect(guide.steps.findIndex((section) => section.id === 'database')).toBeGreaterThan(0);
    }
    const kursy = examStudyGuides.find((guide) => guide.taskId === 'inf03-01-25-01-sg')!;
    expect(kursy.steps[0]!.activities!.slice(0, 2).map((activity) => activity.id)).toEqual([
      'document',
      'title',
    ]);
    const order = kursy.steps.map((section) => section.id);
    expect(order.indexOf('calculator')).toBeLessThan(order.indexOf('database'));
    expect(order.indexOf('calculator')).toBeLessThan(order.indexOf('graphics'));
  });

  it('preserves both previous published revisions and initializes only a minimal project', () => {
    const previous = allExamStudyGuides.filter((guide) =>
      examStudyGuides.some((current) => current.id === guide.id),
    );
    expect(previous).toHaveLength(9);
    expect(new Set(previous.map((guide) => `${guide.id}:${guide.version}`)).size).toBe(9);
    for (const guide of examStudyGuides) {
      expect(guide.version).toBe(3);
      expect(
        allExamStudyGuides
          .filter((candidate) => candidate.id === guide.id)
          .map((candidate) => candidate.version),
      ).toEqual([1, 2, 3]);
      expect(guide.project).toBeDefined();
      const scaffold = guide.project!.starterFiles;
      expect(scaffold.some((file) => file.content.includes('<body>\n</body>'))).toBe(true);
      expect(
        scaffold.every(
          (file) =>
            !file.content.includes('mysqli_') &&
            !file.content.includes('function ') &&
            !file.content.includes('CREATE USER'),
        ),
      ).toBe(true);
      for (const activity of guide.steps.flatMap((section) => section.activities ?? [])) {
        expect(activity).not.toHaveProperty('starterCode');
        expect(activity.targetFiles!.length).toBeGreaterThan(0);
        expect(activity.placement!.trim()).not.toBe('');
        expect(activity.checks!.length).toBeGreaterThan(0);
        expect(new Set(activity.checks!.map((check) => check.id)).size).toBe(
          activity.checks!.length,
        );
      }
    }
  });

  it('maps every action to the paper without orphaned, duplicated or unsafe targets', () => {
    for (const guide of examStudyGuides) {
      const keys = guide.steps.flatMap((section) =>
        section.activities!.map((activity) => `${section.id}/${activity.id}`),
      );
      expect(new Set(keys).size).toBe(keys.length);
      const covered = guide.project!.coverage.flatMap((item) => item.activityIds);
      expect(new Set(covered)).toEqual(new Set(keys));
      const knownFiles = new Set([
        ...guide.project!.starterFiles.map((file) => file.path),
        ...guide.project!.requiredFiles,
      ]);
      for (const section of guide.steps) {
        expect(section.activities!.length).toBeGreaterThanOrEqual(3);
        for (const activity of section.activities!) {
          for (const path of activity.targetFiles!) {
            expect(knownFiles.has(path), `${guide.taskId}:${path}`).toBe(true);
            expect(path).not.toMatch(/(^\/|\.\.|:|\\)/);
          }
          for (const check of activity.checks!) {
            if (check.kind === 'runtime') {
              const fixed = studyRuntimeAdapter(guide.taskId, 3, `${section.id}/${activity.id}`);
              expect(fixed?.id).toBe(check.adapter);
              expect(fixed?.entry).toBe(check.entry);
            }
          }
        }
      }
    }
  });

  it('keeps the paper-specific screenshot formats and source deliverables distinct', () => {
    const fishing = examStudyGuides.find((guide) => guide.taskId === 'cke-wedkowanie')!;
    expect(fishing.project!.requiredFiles).toContain('import.png');
    expect(fishing.project!.requiredFiles).toEqual(
      expect.arrayContaining([
        'kw1.jpg',
        'kw2.jpg',
        'kw3.jpg',
        'kw4.jpg',
        'ryba1.jpg',
        'styl_1.css',
        'wedkuj.php',
      ]),
    );
    for (const guide of examStudyGuides.filter((candidate) => candidate !== fishing)) {
      expect(guide.project!.requiredFiles).toContain('import.jpg');
      expect(guide.project!.requiredFiles).toEqual(
        expect.arrayContaining(['kw1.png', 'kw2.png', 'kw3.png', 'kw4.png']),
      );
    }
    expect(
      examStudyGuides.find((guide) => guide.taskId === 'inf03-01-25-01-sg')!.project!.requiredFiles,
    ).toEqual(expect.arrayContaining(['index.html', 'raty.html', 'baner.png', 'style.css']));
    expect(
      examStudyGuides.find((guide) => guide.taskId === 'inf03-08-25-06-sg')!.project!.requiredFiles,
    ).toEqual(
      expect.arrayContaining(['smoki.php', 'styl.css', 'smok1.jpg', 'smok2.jpg', 'smok3.jpg']),
    );
  });

  for (const fixture of validStudyProjects) {
    it(`accepts the static HTML contracts of ${fixture.taskId}/${fixture.variant}`, () => {
      const guide = examStudyGuides.find((candidate) => candidate.taskId === fixture.taskId)!;
      const checks = guide.steps.flatMap((section) =>
        section.activities!.flatMap((activity) => activity.checks ?? []),
      );
      for (const check of checks) {
        if (check.kind !== 'html') continue;
        const source = fixture.files.find((file) => file.path === check.path)!;
        expect(source, check.path).toBeDefined();
        expect(htmlMatches(source.content, check), `${fixture.variant}: ${check.id}`).toBe(true);
      }
      expect(fixture.manualAssets.length).toBeGreaterThan(0);
    });
  }

  it('rejects targeted HTML mistakes rather than accepting mere file existence', () => {
    for (const sample of invalidStudyProjects.filter((item) => item.expected === 'html')) {
      const guide = examStudyGuides.find(
        (candidate) => candidate.taskId === sample.fixture.taskId,
      )!;
      const [stepId, activityId] = sample.activityId.split('/');
      const checks = guide.steps
        .find((section) => section.id === stepId)!
        .activities!.find((activity) => activity.id === activityId)!.checks!;
      const htmlChecks = checks.filter(
        (check): check is Extract<StudyCheckSpec, { kind: 'html' }> => check.kind === 'html',
      );
      expect(
        htmlChecks.some(
          (check) =>
            !htmlMatches(
              sample.fixture.files.find((file) => file.path === check.path)!.content,
              check,
            ),
        ),
      ).toBe(true);
    }
  });

  it('accepts an already correct case-insensitive charset and regional Polish language', () => {
    const guide = examStudyGuides.find((item) => item.taskId === 'inf03-01-25-01-sg')!;
    const activity = guide.steps
      .find((section) => section.id === 'structure')!
      .activities!.find((item) => item.id === 'document')!;
    const source = guide
      .project!.starterFiles.find((file) => file.path === 'index.html')!
      .content.replace('lang="pl"', 'lang="PL-pl"')
      .replace('charset="UTF-8"', 'charset="utf-8"');
    for (const check of activity.checks!) {
      if (check.kind === 'html') expect(htmlMatches(source, check)).toBe(true);
    }
  });

  it('keeps independently authored PHP fixtures syntactically valid without executing PHP', () => {
    for (const fixture of validStudyProjects) {
      for (const file of fixture.files.filter((entry) => entry.path.endsWith('.php'))) {
        const errors: number[] = [];
        phpParser
          .configure({ top: 'Template' })
          .parse(file.content)
          .iterate({
            enter(node) {
              if (node.type.isError) errors.push(node.from);
            },
          });
        expect(errors, `${fixture.taskId}/${fixture.variant}/${file.path}`).toEqual([]);
      }
    }
  });
});
