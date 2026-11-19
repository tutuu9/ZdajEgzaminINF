/**
 * Finds the handbook chapter that explains what a course activity asks for. The match
 * reads the activity's target file type and its example code; graphics, screenshots and
 * hand-in steps get no chapter.
 */
import type { StudyActivity } from '@zdaj/shared';
import { handbookBooks } from './index';
import type { HandbookBookId } from './types';

type Rule = [pattern: RegExp, chapterId: string];

/** Ordered from the most specific pattern to the most general one within each book. */
const RULES: Record<HandbookBookId, Rule[]> = {
  sql: [
    [
      /\b(CREATE\s+(VIEW|USER|DATABASE)|GRANT|INSERT|UPDATE|DELETE|ALTER|DROP)\b|^--\s*(Import|Archiwum)/im,
      'zmiany',
    ],
    [/\bJOIN\b|\bFROM\s+\w+\s*,\s*\w+\s+WHERE\b/i, 'relacje'],
    [/\b(COUNT|MIN|MAX|AVG|SUM)\s*\(|\bGROUP\s+BY\b/i, 'agregaty'],
    [/\bLIKE\b|\bIS\s+(NOT\s+)?NULL\b|!=\s*''|<>\s*''|\bBETWEEN\b/i, 'warunki'],
    [/\bSELECT\b|\bORDER\s+BY\b|\bWHERE\b|\bLIMIT\b/i, 'select'],
  ],
  javascript: [
    [/createElement|appendChild|replaceChildren|\.append\(/, 'nowe-elementy'],
    [/new Date|Math\.|\bdo\s*\{|\bfor\s*\(|%/, 'obliczenia-data'],
    [/\.value\b|\.checked\b|getElementsByName/, 'formularz'],
    [/innerHTML|textContent|innerText|\.style\.|classList/, 'zmiana-strony'],
    [/addEventListener|\bfunction\b|onclick|=>|\blet\b|\bconst\b/, 'zdarzenia'],
  ],
  css: [
    [/:hover|:nth-child|:active/, 'selektory'],
    [/\bfloat\s*:|\bclear\s*:|display\s*:\s*(flex|grid)|grid-template|align-items/, 'uklad'],
    [
      /linear-gradient|background-image|position\s*:|list-style|inline-block|display\s*:\s*block/,
      'tla-pozycja',
    ],
    [/\bpadding|\bmargin|\bborder|box-shadow|overflow|\bwidth\s*:|\bheight\s*:/, 'pudelko'],
    [/\bcolor\s*:|font-|text-|letter-spacing|line-height|background-color/, 'kolory-tekst'],
  ],
  html: [
    [/<!DOCTYPE|<html\b|<meta\b|<title\b|<link\b|<script\b/i, 'szkielet'],
    [/<(form|input|label|select|option|button|textarea)\b/i, 'formularze'],
    [/<(table|tr|td|th|img|a)\b|rowspan|colspan/i, 'obrazy-tabele'],
    [/<(header|nav|main|aside|section|article|footer)\b/i, 'bloki'],
    [/<(h[1-6]|p|ul|ol|li|dl|dt|dd|strong|em|hr)\b/i, 'tresc'],
  ],
};

function bookFor(path: string): HandbookBookId | undefined {
  const name = path.toLowerCase();
  if (/kwerendy\.txt$|\.sql$/.test(name)) return 'sql';
  if (name.endsWith('.js')) return 'javascript';
  if (name.endsWith('.css')) return 'css';
  if (/\.(html?|php)$/.test(name)) return 'html';
  return undefined;
}

export function chapterForActivity(
  activity: Pick<StudyActivity, 'exampleCode' | 'targetFiles'>,
  fileName: string,
) {
  const bookId = bookFor(activity.targetFiles?.[0] ?? fileName);
  if (!bookId) return undefined;
  const code = activity.exampleCode ?? '';
  const rule = RULES[bookId].find(([pattern]) => pattern.test(code));
  if (!rule) return undefined;
  const book = handbookBooks.find((item) => item.id === bookId)!;
  const chapter = book.chapters.find((item) => item.id === rule[1]);
  return chapter ? { book, chapter } : undefined;
}
