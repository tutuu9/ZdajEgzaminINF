import { describe, expect, it } from 'vitest';
import { faq } from '@zdaj/content';
import { FAQ_CATEGORIES } from '@zdaj/shared';
import { faqSchema } from '../apps/api/src/faq-validation.js';
import { filterFaqEntries } from '../apps/web/src/faq-search.js';

describe('reviewed INF.03 FAQ', () => {
  it('publishes exactly 35 complete, attributed answers in the seven agreed groups', () => {
    expect(faq).toHaveLength(35);
    expect(new Set(faq.map((entry) => entry.id)).size).toBe(35);
    expect(
      FAQ_CATEGORIES.map(
        (category) => faq.filter((entry) => entry.categoryId === category.id).length,
      ),
    ).toEqual([5, 5, 5, 11, 5, 1, 3]);
    for (const entry of faq) {
      expect(faqSchema.safeParse(entry).success, entry.id).toBe(true);
      expect(entry.reviewedAt).toBe('2026-11-02');
      expect(entry.answer.trim().length).toBeGreaterThan(80);
      expect(entry.sources.every((source) => source.section.length > 0)).toBe(true);
    }
    const dated = faq.find((entry) => entry.id === 'inf03-session-dates')!;
    expect(dated.schoolYear).toBe('2026/2027');
    expect(dated.answer).toContain('7–13 stycznia 2027 r. i 2–10 czerwca 2027 r.');
  });

  it('rejects invalid categories, incomplete provenance, unsafe links and impossible dates', () => {
    const entry = faq[0]!;
    const invalid = [
      { ...entry, categoryId: 'invented' },
      { ...entry, sources: [] },
      { ...entry, sources: [{ ...entry.sources[0], section: '' }] },
      { ...entry, sources: [{ ...entry.sources[0], url: 'javascript:alert(1)' }] },
      { ...entry, sources: [{ ...entry.sources[0], url: 'http://example.com/paper.pdf' }] },
      {
        ...entry,
        sources: [{ ...entry.sources[0], url: 'https://user:password@example.com/paper.pdf' }],
      },
      { ...entry, reviewedAt: '2026-02-30' },
      { ...entry, schoolYear: '2026/2028' },
      { ...entry, answer: '   ' },
      { ...entry, unexpected: 'no unvalidated fields' },
    ];
    for (const value of invalid) expect(faqSchema.safeParse(value).success).toBe(false);
  });

  it('searches the question and answer together, including Polish words without diacritics', () => {
    const result = filterFaqEntries(faq, 'zrzuty kadrowac', 'practical');
    expect(result.map((entry) => entry.id)).toEqual(['inf03-screenshots']);
    expect(filterFaqEntries(faq, 'dyplom', 'results')).toEqual([]);
    expect(filterFaqEntries(faq, 'nieistniejacywyraz', 'all')).toEqual([]);
    expect(filterFaqEntries(faq, '   ', 'service')).toHaveLength(3);
  });
});
