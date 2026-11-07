import { describe, expect, it } from 'vitest';
import type { ProjectFile } from '@zdaj/shared';
import {
  compareProjectFiles,
  describeProjectChanges,
} from '../apps/web/src/change-understand/diff';

const file = (content: string, path = 'styl.css'): ProjectFile => ({ path, content });

describe('bounded learner source comparison', () => {
  it('shows only the edited lines with a little context and exact current UTF-16 navigation', () => {
    const before = '/* Zażółć 🐟 */\r\nbutton {\r\n  padding: 10px;\r\n}\r\n';
    const after = before.replace('10px', '20px');
    const change = compareProjectFiles([file(before)], [file(after)]).files[0]!;
    expect(change.rows.filter((row) => row.kind === 'removed')).toEqual([
      { kind: 'removed', text: '  padding: 10px;', beforeLine: 3 },
    ]);
    expect(change.rows.filter((row) => row.kind === 'added')).toEqual([
      { kind: 'added', text: '  padding: 20px;', afterLine: 3 },
    ]);
    const range = change.source!.range!;
    expect(after.replace(/\r\n/g, '\n').slice(range.from, range.to)).toBe('  padding: 20px;');
    expect(change.addedLines).toBe(1);
    expect(change.removedLines).toBe(1);
    expect(change.truncated).toBe(false);
  });

  it('treats newline normalization alone as unchanged and retains empty user files', () => {
    expect(compareProjectFiles([file('a\r\nb')], [file('a\nb')]).changedFileCount).toBe(0);
    const added = compareProjectFiles([], [file('')]).files[0]!;
    expect(added.status).toBe('added');
    expect(added.source?.range).toEqual({ from: 0, to: 0 });
    const emptied = compareProjectFiles([file('button {}')], [file('')]).files[0]!;
    expect(emptied.status).toBe('modified');
    expect(emptied.source?.range).toEqual({ from: 0, to: 0 });
  });

  it('represents renamed files as deletion and addition without guessing their identity', () => {
    const result = compareProjectFiles([file('a {}', 'old.css')], [file('a {}', 'new.css')]);
    expect(result.files.map(({ path, status }) => [path, status])).toEqual([
      ['new.css', 'added'],
      ['old.css', 'removed'],
    ]);
    expect(result.files[1]!.source).toBeUndefined();
  });

  it('lists literal source changes in PHP but excludes JavaScript, SQL and binary assets', () => {
    const source = '<?php echo $title; ?>\n<h1>Żółć</h1>';
    const before = [
      file(source, 'strona.php'),
      file('old', 'skrypt.js'),
      file('old', 'kwerendy.sql'),
      { ...file('old', 'obraz.png'), encoding: 'base64' as const },
    ];
    const after = before.map((item) => ({
      ...item,
      content: item.content.replace('Żółć', 'Łódź').replace('old', 'new'),
    }));
    const changes = compareProjectFiles(before, after);
    expect(changes.changedFileCount).toBe(1);
    expect(changes.files[0]?.path).toBe('strona.php');
    expect(changes.files[0]?.rows.some((row) => row.text.includes('Łódź'))).toBe(true);
  });

  it('uses bounded block replacement for large divergent regions and labels the limit', () => {
    const result = compareProjectFiles(
      [file(Array.from({ length: 1000 }, (_, i) => `before-${i}`).join('\n'))],
      [file(Array.from({ length: 1000 }, (_, i) => `after-${i}`).join('\n'))],
    );
    expect(result.files[0]?.approximate).toBe(true);
    expect(result.files[0]?.note).toContain('zastąpiony blok');
    expect(result.files[0]?.rows.length).toBeLessThanOrEqual(120);
    expect(result.truncated).toBe(true);
  });

  it('caps both displayed file count and long source lines explicitly', () => {
    const files = Array.from({ length: 25 }, (_, i) => file('x'.repeat(500), `${i}.css`));
    const result = compareProjectFiles([], files);
    expect(result.changedFileCount).toBe(25);
    expect(result.files).toHaveLength(20);
    expect(result.files[0]?.rows[0]?.truncated).toBe(true);
    expect(result.files[0]?.rows[0]?.text.length).toBeLessThanOrEqual(401);
    expect(result.note).toContain('Nie zmieniono');
  });

  it('skips oversized source and excessive line counts without truncating learner data', () => {
    const source = 'a'.repeat(200_001);
    const files = [file(source), file('\n'.repeat(8_001), 'lines.css')];
    const original = structuredClone(files);
    const result = compareProjectFiles([], files);
    expect(result.files.every((item) => item.truncated && !item.rows.length)).toBe(true);
    expect(files).toEqual(original);
  });

  it('compresses unchanged interior regions while preserving separate edits', () => {
    const old = ['old', ...Array.from({ length: 20 }, (_, i) => `same${i}`), 'old2'].join('\n');
    const result = compareProjectFiles(
      [file(old)],
      [file(old.replace('old', 'new').replace('old2', 'new2'))],
    );
    expect(result.files[0]?.rows.filter((row) => row.kind === 'gap')).toHaveLength(1);
    expect(result.files[0]?.addedLines).toBe(2);
    expect(result.files[0]?.removedLines).toBe(2);
  });
});

describe('observations never invent browser results', () => {
  it('explains a single known CSS declaration change without asserting it wins the cascade', () => {
    const result = describeProjectChanges(
      [file('button { padding:10px }')],
      [file('button { padding:20px }')],
    );
    expect(result[0]?.title).toContain('padding');
    expect(result[0]?.explanation).toContain('10px');
    expect(result[0]?.explanation).toContain('20px');
    expect(result[0]?.explanation).toContain('wewnątrz');
    expect(result[0]?.explanation).toContain('inne reguły');
    expect(result[0]?.explanation).not.toContain('teraz dalej');
  });

  it('does not claim that a conditional rule is active', () => {
    const source = '@media (max-width:1px) { button { padding:10px } }';
    const result = describeProjectChanges([file(source)], [file(source.replace('10px', '20px'))]);
    expect(result[0]?.explanation).toContain('warunki');
    expect(result[0]?.explanation).not.toContain('aktywn');
  });

  it('does not fabricate a meaning for custom properties', () => {
    const result = describeProjectChanges(
      [file('button { --my-value:10px }')],
      [file('button { --my-value:20px }')],
    );
    expect(result[0]?.explanation).toContain('nie mamy gotowego objaśnienia');
    expect(result[0]?.explanation).not.toContain('odstęp');
  });

  it('uses a neutral explanation for multiple changes, selector changes and HTML', () => {
    for (const [before, after, path] of [
      ['button { color:red; padding:10px }', 'button { color:blue; padding:20px }', 'styl.css'],
      ['button { color:red }', 'main { color:blue }', 'styl.css'],
      ['<html lang="en">', '<html lang="pl">', 'index.html'],
    ]) {
      const result = describeProjectChanges([file(before!, path)], [file(after!, path)]);
      expect(result[0]?.title).toBe('Zmiany w Twoich plikach');
      expect(result[0]?.explanation).toContain('nie dowodzi');
    }
  });
});
