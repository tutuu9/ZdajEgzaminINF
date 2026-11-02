import { describe, expect, it } from 'vitest';
import { load } from 'cheerio';
import { parser as phpParser } from '@lezer/php';
import type { ExamStudyGuide, StudyCheckSpec } from '@zdaj/shared';
import { staticPhpTemplate } from '@zdaj/checker';
import { motocykleGuide } from '../packages/content/src/study-project-motocykle.js';
import { motocykleFixtures, motocykleHtmlMistakes } from '../fixtures/study/motocykle.js';

type HtmlCheck = Extract<StudyCheckSpec, { kind: 'html' }>;
function matches(source: string, check: HtmlCheck): boolean {
  const $ = load(staticPhpTemplate(source));
  return (
    $(check.selector).filter((_, element) => {
      const node = $(element);
      return (
        (!check.attribute ||
          (check.equals === undefined
            ? node.attr(check.attribute) !== undefined
            : node.attr(check.attribute) === check.equals)) &&
        (!check.text || node.text().replace(/\s+/g, ' ').includes(check.text))
      );
    }).length >= (check.minCount ?? 1)
  );
}

function verifyGuide(guide: ExamStudyGuide) {
  const actions = guide.steps.flatMap((section) =>
    section.activities!.map((activity) => ({ key: `${section.id}/${activity.id}`, activity })),
  );
  expect(guide.version).toBe(1);
  expect(guide.taskVersion).toBe(1);
  expect(new Set(actions.map(({ key }) => key)).size).toBe(actions.length);
  expect(
    new Set(guide.project!.coverage.flatMap((requirement) => requirement.activityIds)),
  ).toEqual(new Set(actions.map(({ key }) => key)));
  expect(guide.steps[0]!.activities![0]!.id).toBe('document');
  expect(guide.project!.starterFiles.filter((file) => file.content !== '')).toHaveLength(1);
  expect(guide.project!.starterFiles[0]!.content).toContain('<body>\n</body>');
  const knownFiles = new Set([
    ...guide.project!.requiredFiles,
    ...guide.project!.starterFiles.map((file) => file.path),
  ]);
  for (const { activity } of actions) {
    expect(activity).not.toHaveProperty('starterCode');
    expect(activity.placement).toBeTruthy();
    expect(activity.explanation.length).toBeGreaterThan(30);
    expect(activity.checks!.length).toBeGreaterThan(0);
    expect(activity.checks!.some((check) => check.kind === 'runtime')).toBe(false);
    for (const path of activity.targetFiles!) expect(knownFiles.has(path), path).toBe(true);
  }
  for (const resource of guide.resources) {
    expect(resource.provenance).toBe('third-party');
    expect(resource.checkedAt).toBe('2026-11-02');
  }
}

describe('Motocykle cumulative original-paper course', () => {
  it('starts minimally and maps every small action without silently implementing manual assets', () => {
    verifyGuide(motocykleGuide);
    expect(motocykleGuide.project!.requiredFiles).toEqual(
      expect.arrayContaining([
        'motor.php',
        'motor.png',
        'styl.css',
        'droga1.jpg',
        'droga5.jpg',
        'import.png',
        'kw1.jpg',
        'kw2.jpg',
        'kw3.jpg',
        'kw4.jpg',
        'kwerendy.txt',
        'przeglądarka.txt',
      ]),
    );
    expect(
      motocykleGuide.steps.flatMap((section) => section.activities!).length,
    ).toBeGreaterThanOrEqual(55);
  });

  for (const fixture of motocykleFixtures) {
    it(`accepts alternate static structure and valid PHP syntax: ${fixture.variant}`, () => {
      const source = fixture.files.find((file) => file.path === 'motor.php')!.content;
      const errors: number[] = [];
      phpParser
        .configure({ top: 'Template' })
        .parse(source)
        .iterate({
          enter(node) {
            if (node.type.isError) errors.push(node.from);
          },
        });
      expect(errors).toEqual([]);
      for (const check of motocykleGuide.steps.flatMap((section) =>
        section.activities!.flatMap((activity) => activity.checks!),
      )) {
        if (check.kind === 'html') expect(matches(source, check), check.id).toBe(true);
      }
      for (const asset of fixture.manualAssets)
        expect(fixture.files.some((file) => file.path === asset)).toBe(false);
      expect(new Set([...fixture.files.map((file) => file.path), ...fixture.manualAssets])).toEqual(
        new Set(motocykleGuide.project!.requiredFiles),
      );
    });
  }

  for (const mistake of motocykleHtmlMistakes) {
    it(`detects ${mistake.name} at its own learning activity`, () => {
      const [sectionId, activityId] = mistake.activityId.split('/');
      const activity = motocykleGuide.steps
        .find((section) => section.id === sectionId)!
        .activities!.find((candidate) => candidate.id === activityId)!;
      expect(
        activity
          .checks!.filter((check): check is HtmlCheck => check.kind === 'html')
          .some((check) => !matches(mistake.content, check)),
      ).toBe(true);
    });
  }

  it('teaches actual database fields, image extensions and separate manual evidence', () => {
    const actions = motocykleGuide.steps.flatMap((section) => section.activities!);
    expect(actions.find((activity) => activity.id === 'photo-link')!.exampleCode).toContain(
      "['zrodlo'] . '.jpg'",
    );
    expect(actions.find((activity) => activity.id === 'query-two')!.exampleCode).toContain(
      'w.zdjecia_id = z.id',
    );
    expect(actions.find((activity) => activity.id === 'query-four')!.exampleCode).toContain(
      'ocena INT',
    );
    for (const section of motocykleGuide.steps.filter((section) =>
      ['graphics', 'database', 'queries', 'php-list', 'php-count', 'delivery'].includes(section.id),
    )) {
      for (const activity of section.activities!)
        expect(
          activity.checks!.some((check) => check.kind === 'manual'),
          activity.id,
        ).toBe(true);
    }
  });
});
