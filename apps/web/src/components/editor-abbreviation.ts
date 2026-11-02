import { EditorState, type StateCommand } from '@codemirror/state';
import { isolateHistory } from '@codemirror/commands';
import { htmlLanguage } from '@codemirror/lang-html';
import { ensureSyntaxTree } from '@codemirror/language';

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

export function expandHtmlAbbreviation(path: string): StateCommand {
  return ({ state, dispatch }) => {
    if (
      !supportsHtmlAbbreviation(path) ||
      state.facet(EditorState.readOnly) ||
      state.selection.ranges.length !== 1 ||
      !state.selection.main.empty
    )
      return false;

    const cursor = state.selection.main.head;
    const line = state.doc.lineAt(cursor);
    const match = /^([\t ]*)![\t ]*$/.exec(line.text);
    if (!match || cursor !== line.from + match[1].length + 1) return false;

    // Mixed PHP/HTML parsing distinguishes real HTML text from PHP strings,
    // operators, comments, and embedded JavaScript/CSS. Incomplete parsing
    // safely leaves Tab to the normal indentation command.
    const tree = ensureSyntaxTree(state, cursor, 30);
    if (
      !tree ||
      !htmlLanguage.isActiveAt(state, cursor, -1) ||
      tree.resolveInner(cursor, -1).name !== 'Text'
    )
      return false;

    const indentation = match[1];
    const lines = htmlLines.map((text) => indentation + text);
    const bodyCursor = lines.slice(0, 8).join('\n').length + 1 + indentation.length + 2;
    dispatch(
      state.update({
        changes: { from: line.from, to: line.to, insert: lines.join('\n') },
        selection: { anchor: line.from + bodyCursor },
        annotations: isolateHistory.of('full'),
        userEvent: 'input.complete',
        scrollIntoView: true,
      }),
    );
    return true;
  };
}
