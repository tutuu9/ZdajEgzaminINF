import type { ProjectFile } from '@zdaj/shared';
import { indexInspectorCss } from '../inspector/css-index';
import type { InspectionSource } from '../inspector/types';
import { reviewedPropertyExplanation } from './explanations';

export interface ChangeLine {
  kind: 'added' | 'removed' | 'context' | 'gap';
  text: string;
  beforeLine?: number;
  afterLine?: number;
  truncated?: boolean;
}
export interface ChangedFile {
  path: string;
  status: 'added' | 'removed' | 'modified';
  rows: ChangeLine[];
  addedLines: number;
  removedLines: number;
  truncated: boolean;
  approximate: boolean;
  note?: string;
  source?: InspectionSource;
}
export interface ProjectChanges {
  files: ChangedFile[];
  changedFileCount: number;
  truncated: boolean;
  note?: string;
}

const normalize = (source: string) => source.replace(/\r\n?/g, '\n');
const supported = (file: ProjectFile) =>
  /\.(?:html?|css|php)$/i.test(file.path) && file.encoding !== 'base64';
const maxSource = 200_000;
const maxLines = 8_000;
const maxCells = 40_000;
const maxFiles = 20;
const maxRows = 120;
const maxText = 400;
const maxTotalSource = 2_000_000;
const maxTotalRows = 360;

function compressContext(rows: ChangeLine[]): ChangeLine[] {
  const result: ChangeLine[] = [];
  for (let i = 0; i < rows.length;) {
    if (rows[i]!.kind !== 'context') {
      result.push(rows[i++]!);
      continue;
    }
    let end = i;
    while (rows[end]?.kind === 'context') end++;
    if (end - i <= 4) result.push(...rows.slice(i, end));
    else {
      result.push(...rows.slice(i, i + 2));
      result.push({ kind: 'gap', text: `… ${end - i - 4} niezmienionych wierszy …` });
      result.push(...rows.slice(end - 2, end));
    }
    i = end;
  }
  return result;
}

function lineDiff(before: string[], after: string[]) {
  let prefix = 0;
  while (prefix < before.length && prefix < after.length && before[prefix] === after[prefix])
    prefix++;
  let suffix = 0;
  while (
    suffix < before.length - prefix &&
    suffix < after.length - prefix &&
    before[before.length - 1 - suffix] === after[after.length - 1 - suffix]
  )
    suffix++;
  const old = before.slice(prefix, before.length - suffix),
    next = after.slice(prefix, after.length - suffix);
  const rows: ChangeLine[] = [];
  for (let i = Math.max(0, prefix - 2); i < prefix; i++)
    rows.push({ kind: 'context', text: before[i]!, beforeLine: i + 1, afterLine: i + 1 });
  const approximate = (old.length + 1) * (next.length + 1) > maxCells;
  let i = 0,
    j = 0;
  let table: Uint16Array | undefined;
  const width = next.length + 1;
  if (!approximate) {
    table = new Uint16Array((old.length + 1) * width);
    for (let x = old.length - 1; x >= 0; x--)
      for (let y = next.length - 1; y >= 0; y--)
        table[x * width + y] =
          old[x] === next[y]
            ? table[(x + 1) * width + y + 1]! + 1
            : Math.max(table[(x + 1) * width + y]!, table[x * width + y + 1]!);
  }
  while (i < old.length || j < next.length) {
    if (!approximate && i < old.length && j < next.length && old[i] === next[j]) {
      rows.push({
        kind: 'context',
        text: old[i]!,
        beforeLine: prefix + i + 1,
        afterLine: prefix + j + 1,
      });
      i++;
      j++;
    } else if (
      i < old.length &&
      (approximate ||
        j >= next.length ||
        table![(i + 1) * width + j]! >= table![i * width + j + 1]!)
    ) {
      rows.push({ kind: 'removed', text: old[i]!, beforeLine: prefix + i + 1 });
      i++;
    } else {
      rows.push({ kind: 'added', text: next[j]!, afterLine: prefix + j + 1 });
      j++;
    }
  }
  for (let k = 0; k < Math.min(2, suffix); k++)
    rows.push({
      kind: 'context',
      text: before[before.length - suffix + k]!,
      beforeLine: before.length - suffix + k + 1,
      afterLine: after.length - suffix + k + 1,
    });
  return { rows, approximate, prefix };
}

/** Bounded source diff: no learner code execution and no unbounded quadratic work. */
export function compareProjectFiles(before: ProjectFile[], after: ProjectFile[]): ProjectChanges {
  const old = new Map(before.filter(supported).map((file) => [file.path, file]));
  const next = new Map(after.filter(supported).map((file) => [file.path, file]));
  const paths = [...new Set([...old.keys(), ...next.keys()])].sort();
  const changed = paths.filter(
    (path) =>
      !old.has(path) ||
      !next.has(path) ||
      (old.get(path)!.content !== next.get(path)!.content &&
        (old.get(path)!.content.length > maxSource ||
          next.get(path)!.content.length > maxSource ||
          normalize(old.get(path)!.content) !== normalize(next.get(path)!.content))),
  );
  const files: ChangedFile[] = [];
  let textBudget = maxTotalSource,
    rowBudget = maxTotalRows;
  for (const path of changed.slice(0, maxFiles)) {
    const previous = old.get(path),
      current = next.get(path);
    const status = !previous ? 'added' : !current ? 'removed' : 'modified';
    const result: ChangedFile = {
      path,
      status,
      rows: [],
      addedLines: 0,
      removedLines: 0,
      truncated: false,
      approximate: false,
      ...(current ? { source: { path } } : {}),
    };
    if (
      (previous?.content.length ?? 0) + (current?.content.length ?? 0) > textBudget ||
      (previous?.content.length ?? 0) > maxSource ||
      (current?.content.length ?? 0) > maxSource ||
      rowBudget === 0
    ) {
      files.push({
        ...result,
        truncated: true,
        note: 'Plik zmienił się, ale przekracza limit bezpiecznego porównania. Otwórz źródło, aby obejrzeć całość.',
      });
      continue;
    }
    const previousText = normalize(previous?.content ?? ''),
      currentText = normalize(current?.content ?? '');
    textBudget -= previousText.length + currentText.length;
    const beforeLines = previous ? previousText.split('\n') : [],
      afterLines = current ? currentText.split('\n') : [];
    if (beforeLines.length > maxLines || afterLines.length > maxLines) {
      files.push({
        ...result,
        truncated: true,
        note: 'Plik ma zbyt wiele wierszy. Otwórz źródło, aby obejrzeć całość.',
      });
      continue;
    }
    const diff = lineDiff(beforeLines, afterLines);
    result.addedLines = diff.rows.filter((row) => row.kind === 'added').length;
    result.removedLines = diff.rows.filter((row) => row.kind === 'removed').length;
    result.approximate = diff.approximate;
    if (current) {
      const line = Math.min(diff.prefix, Math.max(0, afterLines.length - 1));
      const from = afterLines
        .slice(0, line)
        .reduce((offset, value) => offset + value.length + 1, 0);
      result.source = { path, range: { from, to: from + (afterLines[line]?.length ?? 0) } };
    }
    const compact = compressContext(diff.rows),
      count = Math.min(maxRows, rowBudget);
    result.rows = compact
      .slice(0, count)
      .map((row) =>
        row.text.length > maxText
          ? { ...row, text: row.text.slice(0, maxText) + '…', truncated: true }
          : row,
      );
    result.truncated = compact.length > count || result.rows.some((row) => row.truncated);
    if (result.approximate)
      result.note =
        'Duży fragment pokazano jako zastąpiony blok. Wiersze wewnątrz mogą zawierać także niezmieniony kod.';
    if (result.truncated)
      result.note = `${result.note ? result.note + ' ' : ''}Widok skrócono; pełna treść pozostaje w Twoich plikach.`;
    rowBudget -= result.rows.length;
    files.push(result);
  }
  const truncated = changed.length > maxFiles || files.some((file) => file.truncated);
  return {
    files,
    changedFileCount: changed.length,
    truncated,
    ...(truncated
      ? { note: 'Porównanie ma limity rozmiaru. Nie zmieniono ani nie usunięto żadnego pliku.' }
      : {}),
  };
}

export interface ChangeObservation {
  title: string;
  explanation: string;
}

/** A source observation never claims a declaration is the browser's winning rule. */
export function describeProjectChanges(
  before: ProjectFile[],
  after: ProjectFile[],
  changes: ProjectChanges = compareProjectFiles(before, after),
): ChangeObservation[] {
  if (!changes.changedFileCount)
    return [
      {
        title: 'Jeszcze bez zmian w HTML/CSS',
        explanation:
          'Porównujemy z zapisanym początkiem tego kroku. Wykonaj jedną małą zmianę opisaną w poleceniu.',
      },
    ];
  if (
    changes.changedFileCount === 1 &&
    changes.files[0]?.status === 'modified' &&
    /\.css$/i.test(changes.files[0].path)
  ) {
    const path = changes.files[0].path;
    const previous = before.find((file) => file.path === path)!,
      current = after.find((file) => file.path === path)!;
    if (previous.content.length <= maxSource && current.content.length <= maxSource) {
      const oldText = normalize(previous.content),
        nextText = normalize(current.content);
      const oldRules = indexInspectorCss({ path, css: oldText, idPrefix: 'before' });
      const newRules = indexInspectorCss({ path, css: nextText, idPrefix: 'after' });
      const oldDeclarations = oldRules.flatMap((rule) =>
        rule.declarations.map((declaration) => ({ ...declaration, selector: rule.selector })),
      );
      const newDeclarations = newRules.flatMap((rule) =>
        rule.declarations.map((declaration) => ({ ...declaration, selector: rule.selector })),
      );
      const differences = oldDeclarations.flatMap((declaration, index) => {
        const other = newDeclarations[index];
        return !other ||
          declaration.property !== other.property ||
          declaration.selector !== other.selector ||
          declaration.value !== other.value
          ? [index]
          : [];
      });
      if (oldDeclarations.length === newDeclarations.length && differences.length === 1) {
        const old = oldDeclarations[differences[0]!]!,
          next = newDeclarations[differences[0]!]!;
        const a = old.source.range!,
          b = next.source.range!;
        if (
          old.property === next.property &&
          old.selector === next.selector &&
          old.value !== next.value &&
          oldText.slice(0, a.from) === nextText.slice(0, b.from) &&
          oldText.slice(a.to) === nextText.slice(b.to)
        ) {
          const meaning = reviewedPropertyExplanation(next.property);
          return [
            {
              title: `Zmieniono deklarację ${next.property}`,
              explanation: `W regule „${next.selector.slice(0, 100)}” wartość zmieniła się z „${old.value.slice(0, 100)}” na „${next.value.slice(0, 100)}”. ${meaning ?? 'Dla tej właściwości nie mamy gotowego objaśnienia.'} Porównaj Przed i Po; inne reguły lub warunki mogą zmienić efekt tej deklaracji.`,
            },
          ];
        }
      }
    }
  }
  return [
    {
      title: 'Zmiany w Twoich plikach',
      explanation:
        'Poniżej widać dodane i usunięte wiersze. Porównaj stronę Przed i Po przy tej samej szerokości. Sama różnica w źródle nie dowodzi, która reguła odpowiada za wygląd.',
    },
  ];
}
