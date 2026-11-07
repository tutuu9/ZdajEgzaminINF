import { type Completion, type CompletionSource, pickedCompletion } from '@codemirror/autocomplete';
import { isolateHistory } from '@codemirror/commands';
import { htmlLanguage } from '@codemirror/lang-html';
import { ensureSyntaxTree } from '@codemirror/language';
import { EditorState, type StateCommand } from '@codemirror/state';
import expand, { extract } from 'emmet';

export function supportsHtmlAbbreviation(path: string): boolean {
  return /\.(html?|php)$/i.test(path);
}

const htmlLines = [
  '<!DOCTYPE html>',
  '<html lang="pl">',
  '<head>',
  '  <meta charset="UTF-8">',
  '  <meta name="viewport" content="width=device-width, initial-scale=1.0">',
  '  <title>Dokument</title>',
  '</head>',
  '<body>',
  '  ',
  '</body>',
  '</html>',
];

const tags = (
  'a abbr address article aside audio b blockquote body br button canvas caption cite code col ' +
  'colgroup data datalist dd details dialog div dl dt em embed fieldset figcaption figure footer ' +
  'form h1 h2 h3 h4 h5 h6 head header hgroup hr html i iframe img input label legend li link main ' +
  'mark menu meta nav noscript ol optgroup option output p picture pre progress q script section ' +
  'select small source span strong style sub summary sup table tbody td textarea tfoot th thead ' +
  'time title tr ul video'
).split(' ');

const repeatLimit = 128;

function withinRepeatBudget(token: string) {
  // Emmet silently truncates when maxRepeat is reached. Even if all repeaters
  // are nested, each can run at most the product of their counts.
  const repeats = [...token.matchAll(/\*(\d*)/g)];
  const upperBound = repeats.reduce(
    (bound, [, count]) => bound * Math.max(1, Number(count)),
    repeats.length,
  );
  return upperBound <= repeatLimit;
}

function validShortcut(token: string, indentation: string) {
  if (
    !token ||
    token.length > 256 ||
    /[\r\n]/.test(token) ||
    indentation.length > 128 ||
    !/^[\t ]*$/.test(indentation)
  )
    return false;
  if (token === '!') return true;
  // Reject unbounded lorem generation before passing user input to Emmet.
  if (!/^[a-z.#(]/i.test(token) || /!|lorem/i.test(token) || !withinRepeatBudget(token))
    return false;
  return extract(token, token.length, { lookAhead: false })?.abbreviation === token;
}

function abbreviationAt(state: EditorState) {
  const { main, ranges } = state.selection;
  if (state.readOnly || ranges.length !== 1 || !main.empty) return null;
  const cursor = main.head;
  const line = state.doc.lineAt(cursor);
  if (line.length > 32_768) return null;
  const before = line.text.slice(0, cursor - line.from);
  // Only look inside a short sequence of HTML text. Leave prose, tag attributes,
  // PHP code, scripts and style content to their normal editing commands.
  const match = extract(before.slice(-257), Math.min(before.length, 257), { lookAhead: false });
  if (!match || match.abbreviation.length > 256) return null;
  const from = cursor - match.abbreviation.length;
  const prefix = before.slice(0, from - line.from);
  if (prefix.trimEnd() && !prefix.trimEnd().endsWith('>')) return null;
  if (/^[\w.#-]/.test(line.text.slice(cursor - line.from))) return null;
  const tree = ensureSyntaxTree(state, cursor, 30);
  if (
    !tree ||
    !htmlLanguage.isActiveAt(state, cursor, -1) ||
    tree.resolveInner(cursor, -1).name !== 'Text'
  )
    return null;

  const token = match.abbreviation;
  const indentation = /^\s*/.exec(line.text)![0];
  if (!validShortcut(token, indentation)) return null;
  if (token === '!') {
    if (line.text.trim() !== '!') return null;
    return { token, indentation, from, to: line.to };
  }
  return { token, indentation, from, to: cursor };
}

type Abbreviation = NonNullable<ReturnType<typeof abbreviationAt>>;
export function expandHtmlShortcut(
  label: string,
  indentation = '',
): { text: string; anchor: number; head: number } | null {
  if (!validShortcut(label, indentation) || !candidates(label).includes(label)) return null;
  if (label === '!') {
    const lines = htmlLines.map((line, index) => (index ? indentation + line : line));
    const anchor = lines.slice(0, 9).join('\n').length;
    return { text: lines.join('\n'), anchor, head: anchor };
  }
  let field: { anchor: number; head: number } | undefined;
  try {
    const text = expand(label, {
      syntax: 'html',
      maxRepeat: repeatLimit,
      options: {
        'output.indent': '  ',
        'output.baseIndent': indentation,
        'output.field': (_index, value, offset) => {
          field ??= { anchor: offset, head: offset + value.length };
          return value;
        },
      },
    });
    if (!text || text.length > 32_768) return null;
    return { text, ...(field ?? { anchor: text.length, head: text.length }) };
  } catch {
    return null; // The next keystroke can complete an unfinished abbreviation.
  }
}

function insert(
  { state, dispatch }: Parameters<StateCommand>[0],
  abbr: Abbreviation,
  label: string,
  completion?: Completion,
) {
  const expansion = expandHtmlShortcut(label, abbr.indentation);
  if (!expansion) return false;
  dispatch(
    state.update({
      changes: { from: abbr.from, to: abbr.to, insert: expansion.text },
      selection: { anchor: abbr.from + expansion.anchor, head: abbr.from + expansion.head },
      annotations: completion
        ? [isolateHistory.of('full'), pickedCompletion.of(completion)]
        : isolateHistory.of('full'),
      userEvent: 'input.complete',
      scrollIntoView: true,
    }),
  );
  return true;
}

function candidates(token: string) {
  // During plain typing offer familiar tag names (e.g. "di" → "div").
  // An explicit Emmet expression may also use classes, IDs and custom elements.
  return /^[a-z0-9]+$/i.test(token) ? tags.filter((tag) => tag.startsWith(token)) : [token];
}

export const htmlAbbreviationCompletions: CompletionSource = ({ state }) => {
  const abbr = abbreviationAt(state);
  if (!abbr) return null;
  const options: Completion[] = [];
  for (const label of candidates(abbr.token)) {
    const result = expandHtmlShortcut(label, abbr.indentation);
    if (!result) continue;
    options.push({
      label,
      type: 'type',
      detail: 'Skrót Emmet',
      info: result.text,
      boost: label === abbr.token ? 5 : 0,
      apply(view, completion) {
        const current = abbreviationAt(view.state);
        if (current && current.from === abbr.from && label.startsWith(current.token)) {
          insert(view, current, label, completion);
        }
      },
    });
  }
  return options.length ? { from: abbr.from, options } : null;
};

export function expandHtmlAbbreviation(path: string): StateCommand {
  return (target) => {
    if (!supportsHtmlAbbreviation(path)) return false;
    const abbr = abbreviationAt(target.state);
    if (!abbr || !candidates(abbr.token).includes(abbr.token)) return false;
    return insert(target, abbr, abbr.token);
  };
}
