import { describe, expect, it } from 'vitest';
import { EditorSelection, EditorState, type Extension, type Transaction } from '@codemirror/state';
import { history, indentMore, undo } from '@codemirror/commands';
import { html } from '@codemirror/lang-html';
import { php } from '@codemirror/lang-php';
import {
  expandHtmlAbbreviation,
  supportsHtmlAbbreviation,
} from '../apps/web/src/components/editor-abbreviation';

function editor(
  doc: string,
  path = 'index.html',
  cursor = doc.length,
  extensions: Extension[] = [],
) {
  const target = {
    state: EditorState.create({
      doc,
      selection: { anchor: cursor },
      extensions: [/\.php$/i.test(path) ? php() : html(), history(), ...extensions],
    }),
    dispatch(transaction: Transaction) {
      target.state = transaction.state;
    },
  };
  return target;
}

describe('HTML boilerplate abbreviation', () => {
  it.each(['index.html', 'oferta.HTM', 'strona.php'])(
    'expands ! in %s with the caret in the body',
    (path) => {
      const target = editor('!', path);
      expect(expandHtmlAbbreviation(path)(target)).toBe(true);
      const text = target.state.doc.toString();
      expect(text).toContain('<!DOCTYPE html>\n<html lang="pl">');
      expect(text).toContain('<meta charset="UTF-8">');
      expect(text).toContain(
        '<meta name="viewport" content="width=device-width, initial-scale=1.0">',
      );
      expect(text).toContain('<title>Dokument</title>');
      expect(text).toContain('<body>\n  \n</body>');
      expect(target.state.selection.main.head).toBe(
        text.indexOf('<body>\n  ') + '<body>\n  '.length,
      );
    },
  );

  it('replaces only the abbreviation line and keeps its indentation and surrounding text', () => {
    const before = '<!-- przed -->\n  !  \n<!-- po -->';
    const target = editor(before, 'index.html', before.indexOf('!  ') + 1);
    expect(expandHtmlAbbreviation('index.html')(target)).toBe(true);
    expect(target.state.doc.toString()).toMatch(/^<!-- przed -->\n {2}<!DOCTYPE html>/);
    expect(target.state.doc.toString()).toMatch(/ {2}<\/html>\n<!-- po -->$/);
    expect(target.state.doc.lineAt(target.state.selection.main.head).text).toBe('    ');
    expect(undo(target)).toBe(true);
    expect(target.state.doc.toString()).toBe(before);
  });

  it('isolates expansion from earlier typing and undoes it in one action', () => {
    const target = editor('');
    target.dispatch(
      target.state.update({
        changes: { from: 0, insert: '!' },
        selection: { anchor: 1 },
        userEvent: 'input.type',
      }),
    );
    expect(expandHtmlAbbreviation('index.html')(target)).toBe(true);
    expect(undo(target)).toBe(true);
    expect(target.state.doc.toString()).toBe('!');
    expect(target.state.selection.main.head).toBe(1);
    expect(undo(target)).toBe(true);
    expect(target.state.doc.toString()).toBe('');
  });

  it('expands real HTML text after a PHP block without changing that block', () => {
    const prefix = '<?php $title = "Strona"; ?>\n';
    const target = editor(prefix + '!', 'index.php');
    expect(expandHtmlAbbreviation('index.php')(target)).toBe(true);
    expect(target.state.doc.toString().startsWith(prefix + '<!DOCTYPE html>')).toBe(true);
  });

  it.each([
    '<?php\n!\n$enabled;',
    '<?php $value = "\n!\n";',
    "<?php $value = '\n!\n';",
    '<?php $value = "?>\n!\n";',
    '<?php /*\n!\n*/',
    '<?php $value = <<<TEXT\n!\nTEXT;',
    '<!--\n!\n-->',
    '<script>\n!\n</script>',
    '<style>\n!\n</style>',
    '<div title="\n!\n">',
  ])('does not expand outside HTML text: %s', (doc) => {
    const target = editor(doc, 'index.php', doc.indexOf('\n!') + 2);
    expect(expandHtmlAbbreviation('index.php')(target)).toBe(false);
    expect(target.state.doc.toString()).toBe(doc);
  });

  it.each(['x!', '!x', '!!', '<p>!</p>'])(
    'leaves non-standalone abbreviations unchanged: %s',
    (doc) => {
      const target = editor(doc);
      expect(expandHtmlAbbreviation('index.html')(target)).toBe(false);
      expect(target.state.doc.toString()).toBe(doc);
    },
  );

  it('does not overwrite a selection, expand multiple cursors, or alter a read-only editor', () => {
    const selection = editor('!');
    selection.dispatch(selection.state.update({ selection: { anchor: 0, head: 1 } }));
    expect(expandHtmlAbbreviation('index.html')(selection)).toBe(false);
    const multiple = editor('!\n!', 'index.html', 1, [
      EditorState.allowMultipleSelections.of(true),
    ]);
    multiple.dispatch(
      multiple.state.update({
        selection: EditorSelection.create([EditorSelection.cursor(1), EditorSelection.cursor(3)]),
      }),
    );
    expect(expandHtmlAbbreviation('index.html')(multiple)).toBe(false);
    const readOnly = editor('!', 'index.html', 1, [EditorState.readOnly.of(true)]);
    expect(expandHtmlAbbreviation('index.html')(readOnly)).toBe(false);
    expect(readOnly.state.doc.toString()).toBe('!');
  });

  it('declines unrelated files and allows the normal indentation fallback', () => {
    for (const path of ['style.css', 'app.js', 'baza.sql', 'notes.txt']) {
      expect(supportsHtmlAbbreviation(path)).toBe(false);
      const target = editor('!', path);
      expect(expandHtmlAbbreviation(path)(target)).toBe(false);
    }
    const target = editor('<p>Tekst</p>');
    expect(expandHtmlAbbreviation('index.html')(target)).toBe(false);
    expect(indentMore(target)).toBe(true);
    expect(target.state.doc.toString()).toBe('  <p>Tekst</p>');
  });

  it('requires the cursor immediately after ! and a parsed HTML context', () => {
    const beforeBang = editor('!', 'index.html', 0);
    expect(expandHtmlAbbreviation('index.html')(beforeBang)).toBe(false);
    const target = {
      state: EditorState.create({ doc: '!', selection: { anchor: 1 } }),
      dispatch: () => {
        throw new Error('must not dispatch');
      },
    };
    expect(expandHtmlAbbreviation('index.html')(target)).toBe(false);
  });
});
