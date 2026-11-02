import { describe, expect, it } from 'vitest';
import { load } from 'cheerio';
import type { StudyCheckSpec } from '@zdaj/shared';
import { firmaGuide } from '../packages/content/src/study-project-firma.js';
import { firmaFixtures, firmaHtmlMistakes } from '../fixtures/study/firma.js';
import { salonGuide } from '../packages/content/src/study-project-salon.js';
import { salonFixtures, salonHtmlMistakes } from '../fixtures/study/salon.js';

const courses = [
  { guide: firmaGuide, fixtures: firmaFixtures, mistakes: firmaHtmlMistakes },
  { guide: salonGuide, fixtures: salonFixtures, mistakes: salonHtmlMistakes },
];
function accepts(source: string, check: Extract<StudyCheckSpec, { kind: 'html' }>) {
  const $ = load(source);
  return (
    $(check.selector).filter((_, element) => {
      const node = $(element);
      const actual = check.attribute ? node.attr(check.attribute) : undefined;
      const equal =
        check.equals === undefined ||
        (['href', 'src'].includes(check.attribute ?? '')
          ? new URL(actual ?? '', 'https://fixture.invalid/').href ===
            new URL(check.equals, 'https://fixture.invalid/').href
          : actual === check.equals);
      return (
        (!check.attribute || actual !== undefined) &&
        equal &&
        (!check.text || node.text().replace(/\s+/g, ' ').includes(check.text))
      );
    }).length >= (check.minCount ?? 1)
  );
}

describe('new CKE JavaScript cumulative routes', () => {
  for (const { guide, fixtures, mistakes } of courses) {
    describe(guide.taskId, () => {
      it('pins version one and covers every cumulative action with a paper page', () => {
        expect(guide.version).toBe(1);
        expect(guide.taskVersion).toBe(1);
        expect(guide.steps[0]!.activities![0]!.id).toBe('document');
        const keys = guide.steps.flatMap((section) =>
          section.activities!.map((activity) => `${section.id}/${activity.id}`),
        );
        expect(new Set(keys).size).toBe(keys.length);
        expect(new Set(guide.project!.coverage.flatMap((item) => item.activityIds))).toEqual(
          new Set(keys),
        );
        expect(guide.project!.coverage.every((item) => item.page >= 2 && item.page <= 7)).toBe(
          true,
        );
        const known = new Set([
          ...guide.project!.starterFiles.map((file) => file.path),
          ...guide.project!.requiredFiles,
        ]);
        for (const activity of guide.steps.flatMap((section) => section.activities!)) {
          expect(activity).not.toHaveProperty('starterCode');
          expect(activity.placement!.length).toBeGreaterThan(5);
          expect(activity.explanation!.length).toBeGreaterThan(20);
          expect(activity.checks!.length).toBeGreaterThan(0);
          for (const path of activity.targetFiles!) {
            expect(known.has(path), path).toBe(true);
            expect(path).not.toMatch(/(^\/|\.\.|:|\\)/);
          }
        }
        for (const file of guide.project!.starterFiles) {
          if (file.path.endsWith('.html'))
            expect(load(file.content)('body').children().length).toBe(0);
          else expect(file.content).toBe('');
        }
      });
      it('accepts independently implemented complete HTML and rejects focused defects', () => {
        expect(fixtures.length).toBeGreaterThanOrEqual(2);
        for (const fixture of fixtures) {
          for (const section of guide.steps)
            for (const activity of section.activities!)
              for (const check of activity.checks!) {
                if (check.kind !== 'html') continue;
                const file = fixture.files.find((file) => file.path === check.path)!;
                expect(
                  accepts(file.content, check),
                  `${fixture.variant} ${section.id}/${activity.id}: ${check.selector}`,
                ).toBe(true);
              }
          for (const path of fixture.manualAssets)
            expect(fixture.files.some((file) => file.path === path)).toBe(false);
        }
        for (const mistake of mistakes) {
          const [sectionId, activityId] = mistake.activityId.split('/');
          const checks = guide.steps
            .find((section) => section.id === sectionId)!
            .activities!.find((activity) => activity.id === activityId)!.checks!;
          const original = fixtures[0]!.files.find((file) => file.path === mistake.path)!.content;
          expect(original).toContain(mistake.source);
          const broken = original.replace(mistake.source, mistake.replacement);
          expect(
            checks.some(
              (check) =>
                check.kind === 'html' && check.path === mistake.path && !accepts(broken, check),
            ),
            mistake.activityId,
          ).toBe(true);
        }
      });
      it('uses one fixed behaviour scenario and keeps source assets explicitly manual', () => {
        const runtime = guide.steps.flatMap((section) =>
          section.activities!.flatMap((activity) =>
            activity
              .checks!.filter((check) => check.kind === 'runtime')
              .map((check) => ({ key: `${section.id}/${activity.id}`, check })),
          ),
        );
        expect(runtime).toHaveLength(1);
        expect(runtime[0]!.key).toBe('runtime/runtime-check');
        expect(fixtures[0]!.manualAssets.length).toBeGreaterThan(0);
        expect(
          guide.resources.every(
            (resource) =>
              resource.provenance === 'third-party' && resource.checkedAt === '2026-11-02',
          ),
        ).toBe(true);
        expect(guide.variants).toEqual([]);
      });
    });
  }
});
