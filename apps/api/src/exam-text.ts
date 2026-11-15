import { createBriefCache, originalExamSheet } from './exam-pdf.js';

/** Upper bound of the paper text given to the assistant; a typical paper is far below it. */
export const MAX_SHEET_TEXT_BYTES = 24_000;
const MAX_PAGES = 20;
/** A scanned paper without a text layer yields almost nothing; treat it as unavailable. */
const MIN_USEFUL_CHARACTERS = 400;

export function clipBytes(text: string, maxBytes: number): string {
  if (Buffer.byteLength(text, 'utf8') <= maxBytes) return text;
  // Never split a multi-byte character: decode the cut buffer and drop a broken tail.
  return Buffer.from(text, 'utf8')
    .subarray(0, maxBytes)
    .toString('utf8')
    .replace(/\uFFFD+$/, '');
}

/**
 * Plain text of a PDF, page by page. Illustrations and layout are lost; the result is
 * reading material for the assistant, never a replacement for the original document.
 */
export async function pdfText(bytes: Uint8Array): Promise<string> {
  const { getDocument } = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const task = getDocument({
    // pdf.js takes ownership of the buffer, so it receives its own copy.
    data: new Uint8Array(bytes),
    disableFontFace: true,
    useSystemFonts: false,
    verbosity: 0,
  });
  try {
    const document = await task.promise;
    const pages: string[] = [];
    for (let number = 1; number <= Math.min(document.numPages, MAX_PAGES); number++) {
      const page = await document.getPage(number);
      const content = await page.getTextContent();
      let text = '';
      for (const item of content.items) {
        if (!('str' in item)) continue;
        text += item.str;
        if (item.hasEOL) text += '\n';
      }
      const lines = text
        .split('\n')
        .map((line) => line.replace(/[ \t\xa0]+/g, ' ').trim())
        .filter(Boolean);
      if (lines.length) pages.push(`--- Strona ${number} ---\n${lines.join('\n')}`);
    }
    return pages.join('\n\n');
  } finally {
    await task.destroy();
  }
}

// The text is derived from a reviewed document and is small, so it may stay longer than
// the PDF bytes themselves. Failures are not kept: the next question tries again.
const sheets = createBriefCache<string>(6 * 3_600_000, 12);

/** Text of a reviewed original paper, or null when it cannot be obtained right now. */
export async function examSheetText(catalogId: string): Promise<string | null> {
  try {
    return await sheets(catalogId, async () => {
      const { bytes } = await originalExamSheet(catalogId);
      const text = await pdfText(bytes);
      if (text.length < MIN_USEFUL_CHARACTERS) throw new Error('sheet_text_unavailable');
      return clipBytes(text, MAX_SHEET_TEXT_BYTES);
    });
  } catch {
    return null;
  }
}
