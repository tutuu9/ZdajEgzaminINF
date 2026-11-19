import { describe, expect, it } from 'vitest';
import { catalog } from '../packages/content/src/catalog';
import { officialTasks } from '../packages/content/src/official-tasks';
import {
  DEFAULT_FILTERS,
  SAMPLE_YEAR,
  filterPapers,
  readFilters,
  sessionKey,
  sessionLabel,
  writeFilters,
  yearOptions,
} from '../apps/web/src/practice-filters';

const run = (change: Partial<typeof DEFAULT_FILTERS>) =>
  filterPapers(officialTasks, catalog, { ...DEFAULT_FILTERS, ...change });
const entry = (taskId: string) =>
  catalog.find(
    (item) => item.id === officialTasks.find((task) => task.id === taskId)?.sourceCatalogId,
  );

describe('paper list filters', () => {
  it('lists newest sessions first and keeps every paper by default', () => {
    const all = run({});
    expect(all).toHaveLength(officialTasks.length);
    const keys = all.map((task) => sessionKey(entry(task.id)));
    expect(keys).toEqual([...keys].sort((a, b) => b - a));
    expect(all.at(-1)!.id).toBe('cke-wedkowanie');
    expect(run({ order: 'oldest' })[0]!.id).toBe('cke-wedkowanie');
  });

  it('filters by year, by the CKE sample and without PHP', () => {
    expect(yearOptions(catalog)).toEqual(['2026', '2025', '2024']);
    for (const task of run({ year: '2025' })) expect(entry(task.id)!.year).toBe(2025);
    expect(run({ year: SAMPLE_YEAR }).map((task) => task.id)).toEqual(['cke-wedkowanie']);
    const withoutPhp = run({ withoutPhp: true });
    expect(withoutPhp.length).toBeGreaterThan(0);
    expect(withoutPhp.every((task) => !task.technologies.includes('PHP'))).toBe(true);
  });

  it('searches titles, ids and printed paper codes, ignoring case', () => {
    expect(run({ search: 'inf.03-02-25.06' }).map((task) => task.id)).toEqual([
      'inf03-02-25-06-sg',
    ]);
    expect(run({ search: 'CHAT' }).map((task) => task.id)).toEqual(['inf03-02-24-06-sg']);
    expect(run({ search: 'nie ma takiego' })).toEqual([]);
  });

  it('labels sessions in Polish and puts the undated sample last', () => {
    expect(sessionLabel(entry('inf03-02-25-06-sg'))).toBe('czerwiec 2025');
    expect(sessionLabel(entry('cke-wedkowanie'))).toBe('przykład CKE');
    expect(sessionKey(entry('inf03-06-25-01-sg'))).toBeLessThan(
      sessionKey(entry('inf03-02-25-06-sg')),
    );
  });

  it('round-trips filters through the address and omits defaults', () => {
    expect(writeFilters(DEFAULT_FILTERS).toString()).toBe('');
    const filters = {
      search: 'rzek',
      technology: 'PHP',
      year: '2024',
      withoutPhp: true,
      order: 'oldest' as const,
    };
    expect(readFilters(writeFilters(filters))).toEqual(filters);
    expect(readFilters(new URLSearchParams('kolejnosc=zle'))).toEqual(DEFAULT_FILTERS);
  });
});
