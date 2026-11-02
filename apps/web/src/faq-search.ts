import type { FaqCategoryId, FaqRevision } from '@zdaj/shared';

const normalizeSearch = (value: string) =>
  value
    .toLocaleLowerCase('pl')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replaceAll('ł', 'l');

export function filterFaqEntries(
  entries: FaqRevision[],
  query: string,
  category: FaqCategoryId | 'all',
): FaqRevision[] {
  const terms = normalizeSearch(query).trim().split(/\s+/).filter(Boolean);
  return entries.filter((entry) => {
    if (category !== 'all' && entry.categoryId !== category) return false;
    const text = normalizeSearch(`${entry.question} ${entry.answer}`);
    return terms.every((term) => text.includes(term));
  });
}
