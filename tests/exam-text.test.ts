import PDFDocument from 'pdfkit';
import { describe, expect, it } from 'vitest';
import { clipBytes, pdfText } from '../apps/api/src/exam-text';

function pdf(pages: string[][]): Promise<Buffer> {
  const document = new PDFDocument({ autoFirstPage: false });
  const chunks: Buffer[] = [];
  const done = new Promise<Buffer>((resolve, reject) => {
    document.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
    document.on('end', () => resolve(Buffer.concat(chunks)));
    document.on('error', reject);
  });
  for (const lines of pages) {
    document.addPage();
    for (const line of lines) document.text(line);
  }
  document.end();
  return done;
}

describe('paper text for the assistant', () => {
  it('reads a PDF page by page and keeps the page numbers', async () => {
    const bytes = await pdf([
      ['Zadanie egzaminacyjne', 'Utworz plik   kwerendy.txt'],
      ['Witryna internetowa', 'Plik index.php i styl.css'],
    ]);
    expect(await pdfText(bytes)).toBe(
      '--- Strona 1 ---\nZadanie egzaminacyjne\nUtworz plik kwerendy.txt\n\n' +
        '--- Strona 2 ---\nWitryna internetowa\nPlik index.php i styl.css',
    );
    // The caller's buffer stays usable: the original bytes are served to learners as well.
    expect(bytes.subarray(0, 5).toString('ascii')).toBe('%PDF-');
  });

  it('cuts long text on a character boundary', () => {
    const clipped = clipBytes('żółć'.repeat(10), 9);
    expect(clipped).toBe('żółć');
    expect(Buffer.byteLength(clipped, 'utf8')).toBeLessThanOrEqual(9);
    expect(clipBytes('abc', 10)).toBe('abc');
  });
});
