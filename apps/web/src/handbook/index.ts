import { cssBook } from './css';
import { htmlBook } from './html';
import { javascriptBook } from './javascript';
import { phpBook } from './php';
import { sqlBook } from './sql';
import type { HandbookBook, HandbookChapter, WebExample } from './types';

export type { HandbookBook, HandbookChapter } from './types';

export const handbookBooks: HandbookBook[] = [htmlBook, cssBook, javascriptBook, sqlBook, phpBook];

export function findChapter(bookId: string | undefined, chapterId: string | undefined) {
  const book = handbookBooks.find((item) => item.id === bookId);
  if (!book) return undefined;
  const index = Math.max(
    0,
    book.chapters.findIndex((chapter) => chapter.id === chapterId),
  );
  return {
    book,
    chapter: book.chapters[index]!,
    previous: book.chapters[index - 1] as HandbookChapter | undefined,
    next: book.chapters[index + 1] as HandbookChapter | undefined,
  };
}

/**
 * A self-contained preview document. The content security policy blocks every network
 * request, so an example can only show what its own HTML, CSS and JavaScript produce.
 */
export function previewDocument(example: WebExample) {
  const body = example.html
    .replace(/<!DOCTYPE[^>]*>/gi, '')
    .replace(/<\/?(?:html|head|body)[^>]*>/gi, '')
    .replace(/<(?:meta|link)[^>]*>/gi, '')
    .replace(/<title>[\s\S]*?<\/title>/gi, '')
    .replace(/<script[^>]*src=[^>]*><\/script>/gi, '');
  return `<!DOCTYPE html><html lang="pl"><head><meta charset="UTF-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'">
<style>${example.css ?? 'body { font-family: Verdana, sans-serif; }'}</style></head>
<body>${body}${example.js ? `<script>${example.js}</script>` : ''}</body></html>`;
}

export const chapterKey = (bookId: string, chapterId: string) => `${bookId}/${chapterId}`;
const readKey = 'zdaj:handbook:read';

export function readChapters(): string[] {
  try {
    const value = JSON.parse(localStorage.getItem(readKey) ?? '[]') as unknown;
    return Array.isArray(value) ? value.filter((item) => typeof item === 'string') : [];
  } catch {
    return [];
  }
}

export function markChapter(key: string, read: boolean) {
  const current = new Set(readChapters());
  if (read) current.add(key);
  else current.delete(key);
  try {
    localStorage.setItem(readKey, JSON.stringify([...current]));
  } catch {
    /* Reading progress is a convenience; the handbook works without storage. */
  }
  return [...current];
}
