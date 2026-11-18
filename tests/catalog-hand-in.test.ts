import { describe, expect, it } from 'vitest';
import { catalog } from '../packages/content/src/catalog';
import { validateContent } from '../apps/api/src/validation';

describe('catalogue hand-in lists', () => {
  it('every reviewed paper lists its result files and five assessed results', () => {
    for (const entry of catalog) {
      expect(entry.handIn, entry.id).toBeDefined();
      expect(() => validateContent('catalog', entry), entry.id).not.toThrow();
      const { files, results, page } = entry.handIn!;
      expect(results, entry.id).toHaveLength(5);
      expect(page).toBeGreaterThan(1);
      expect(new Set(files).size, entry.id).toBe(files.length);
      // Every paper asks for the browser note; all but one print file extensions,
      // and INF.03-11-26.06-SG prints its name without the Polish letter (przegladarka).
      expect(
        files.some((file) => /^przegl[ąa]darka(\.txt)?$/.test(file)),
        entry.id,
      ).toBe(true);
    }
  });
  it('keeps the printed spelling of names, including letter case', () => {
    const chat = catalog.find((entry) => entry.id === 'inf03-02-24-06-sg')!;
    expect(chat.handIn!.files).toContain('Jolka.jpg');
    expect(chat.handIn!.files).toContain('kw5.jpg');
    const firma = catalog.find((entry) => entry.id === 'inf03-01-24-01-sg')!;
    expect(firma.handIn!.files.every((file) => !file.includes('.'))).toBe(true);
  });
});
