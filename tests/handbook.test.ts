import { describe, expect, it } from 'vitest';
import { catalog } from '../packages/content/src/catalog';
import { findChapter, handbookBooks, previewDocument } from '../apps/web/src/handbook';

const chapters = handbookBooks.flatMap((book) =>
  book.chapters.map((chapter) => ({ book, chapter })),
);

describe('handbook content', () => {
  it('has four books of distinct, complete chapters', () => {
    expect(handbookBooks.map((book) => book.id)).toEqual(['html', 'css', 'javascript', 'sql']);
    for (const book of handbookBooks) {
      const ids = book.chapters.map((chapter) => chapter.id);
      expect(new Set(ids).size, book.id).toBe(ids.length);
      expect(ids.length, book.id).toBeGreaterThanOrEqual(5);
    }
    for (const { book, chapter } of chapters) {
      const where = `${book.id}/${chapter.id}`;
      expect(chapter.sections.length, where).toBeGreaterThanOrEqual(2);
      expect(chapter.mistakes.length, where).toBeGreaterThanOrEqual(2);
      expect(chapter.papers.length, where).toBeGreaterThanOrEqual(1);
      expect(
        chapter.sections.some((section) => section.example),
        where,
      ).toBe(true);
    }
  });

  it('links only to catalogued CKE papers under their catalogue titles', () => {
    const titles = new Map(catalog.map((entry) => [entry.id, entry.title]));
    for (const { chapter } of chapters)
      for (const paper of chapter.papers) {
        expect(titles.has(paper.taskId), paper.taskId).toBe(true);
        expect(paper.title, paper.taskId).toBe(titles.get(paper.taskId));
        expect(paper.note.length).toBeGreaterThan(10);
      }
  });

  it('keeps every SQL result table rectangular and sourced from a paper database', () => {
    for (const { chapter } of chapters)
      for (const section of chapter.sections) {
        if (section.example?.kind !== 'sql' || !section.example.result) continue;
        const { columns, rows, source } = section.example.result;
        for (const row of rows) expect(row.length, section.heading).toBe(columns.length);
        expect(source).toMatch(/z arkusza INF\.03-\d\d-\d\d\.\d\d-SG/);
      }
  });

  it('builds previews that cannot load anything from the network', () => {
    for (const { chapter } of chapters)
      for (const section of chapter.sections) {
        if (section.example?.kind !== 'web') continue;
        const document = previewDocument(section.example);
        expect(document).toContain("default-src 'none'");
        expect(document).not.toMatch(/<link\b|<script[^>]*\bsrc=|https?:\/\//i);
      }
  });

  it('finds chapters and their neighbours, falling back to the first chapter', () => {
    const found = findChapter('css', 'pudelko')!;
    expect(found.previous?.id).toBe('kolory-tekst');
    expect(found.next?.id).toBe('uklad');
    expect(findChapter('sql', undefined)!.chapter.id).toBe('select');
    expect(findChapter('php', 'x')).toBeUndefined();
  });
});
