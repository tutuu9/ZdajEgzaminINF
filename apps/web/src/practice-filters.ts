/**
 * Filtering and ordering of the paper list. Pure functions, so the page stays a thin view
 * and the rules can be tested without a browser.
 */
import type { CatalogEntry, TaskVersion } from '@zdaj/shared';

export type PaperOrder = 'newest' | 'oldest';
export interface PaperFilters {
  search: string;
  technology: string;
  /** A year as text, "przyklad" for the CKE sample paper, or "all". */
  year: string;
  withoutPhp: boolean;
  order: PaperOrder;
}

export const DEFAULT_FILTERS: PaperFilters = {
  search: '',
  technology: 'all',
  year: 'all',
  withoutPhp: false,
  order: 'newest',
};

/** The sample paper has no session; it is offered as its own choice. */
export const SAMPLE_YEAR = 'przyklad';

const SESSION_MONTH: Record<string, number> = { Styczeń: 1, Czerwiec: 6 };

/** Sort key: year and month of the session; the sample paper sorts as the oldest. */
export function sessionKey(entry: CatalogEntry | undefined) {
  if (!entry?.year) return 0;
  return entry.year * 100 + (SESSION_MONTH[entry.session ?? ''] ?? 0);
}

/** "czerwiec 2026", or a note for the undated CKE sample paper. */
export function sessionLabel(entry: CatalogEntry | undefined) {
  if (!entry?.year) return 'przykład CKE';
  return `${entry.session ? `${entry.session.toLocaleLowerCase('pl')} ` : ''}${entry.year}`;
}

export function yearOptions(entries: CatalogEntry[]) {
  const years = [...new Set(entries.map((entry) => entry.year).filter((year) => year !== null))];
  return years.sort((a, b) => b - a).map(String);
}

/** The fields of a task the list filters on; both full and public tasks have them. */
type ListedTask = Pick<TaskVersion, 'id' | 'title' | 'technologies' | 'sourceCatalogId'>;

export function filterPapers<T extends ListedTask>(
  tasks: T[],
  catalog: CatalogEntry[],
  filters: PaperFilters,
): T[] {
  const entry = (task: T) => catalog.find((item) => item.id === task.sourceCatalogId);
  const query = filters.search.trim().toLocaleLowerCase('pl');
  const matching = tasks.filter((task) => {
    const source = entry(task);
    const text = `${task.title} ${task.id} ${source?.identifier ?? ''} ${task.technologies.join(' ')}`;
    if (query && !text.toLocaleLowerCase('pl').includes(query)) return false;
    if (filters.technology !== 'all' && !task.technologies.includes(filters.technology))
      return false;
    if (filters.withoutPhp && task.technologies.includes('PHP')) return false;
    if (filters.year === SAMPLE_YEAR) return !source?.year;
    if (filters.year !== 'all' && String(source?.year) !== filters.year) return false;
    return true;
  });
  const direction = filters.order === 'newest' ? -1 : 1;
  // Stable sort keeps the catalogue order within one session.
  return matching
    .map((task, index) => ({ task, index, key: sessionKey(entry(task)) }))
    .sort((a, b) => (a.key - b.key) * direction || a.index - b.index)
    .map((item) => item.task);
}

/** Filters kept in the address, so a link or a reload reopens the same view. */
export function readFilters(params: URLSearchParams): PaperFilters {
  const order = params.get('kolejnosc');
  return {
    search: params.get('szukaj') ?? '',
    technology: params.get('technologia') ?? 'all',
    year: params.get('rok') ?? 'all',
    withoutPhp: params.get('bez-php') === '1',
    order: order === 'najstarsze' ? 'oldest' : 'newest',
  };
}

export function writeFilters(filters: PaperFilters): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.search) params.set('szukaj', filters.search);
  if (filters.technology !== 'all') params.set('technologia', filters.technology);
  if (filters.year !== 'all') params.set('rok', filters.year);
  if (filters.withoutPhp) params.set('bez-php', '1');
  if (filters.order === 'oldest') params.set('kolejnosc', 'najstarsze');
  return params;
}
