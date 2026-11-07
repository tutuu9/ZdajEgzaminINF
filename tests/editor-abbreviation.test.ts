import { describe, expect, it } from 'vitest';
import { EditorSelection, EditorState, type Extension, type Transaction } from '@codemirror/state';
import { history, indentMore, undo } from '@codemirror/commands';
import { CompletionContext } from '@codemirror/autocomplete';
import { html } from '@codemirror/lang-html';
import { php } from '@codemirror/lang-php';
import {
  expandHtmlAbbreviation,
  expandHtmlShortcut,
  htmlAbbreviationCompletions,
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

describe('Emmet HTML shortcuts', () => {
  it('connects a stylesheet and lets the learner replace only its filename before undoing', async () => {
    const original = '<head>\n  <title>Kurs</title>\n  link:css\n</head>';
    const target = editor(original, 'index.html', original.indexOf('link:css') + 8);
    const suggestions = await htmlAbbreviationCompletions(
      new CompletionContext(target.state, target.state.selection.main.head, false),
    );
    expect(suggestions?.options).toContainEqual(
      expect.objectContaining({
        label: 'link:css',
        info: '<link rel="stylesheet" href="style.css">',
      }),
    );
    expect(expandHtmlAbbreviation('index.html')(target)).toBe(true);
    const selection = target.state.selection.main;
    expect(target.state.sliceDoc(selection.from, selection.to)).toBe('style');
    target.dispatch(
      target.state.update({
        changes: { from: selection.from, to: selection.to, insert: 'styl' },
        selection: { anchor: selection.from + 4 },
        userEvent: 'input.type',
      }),
    );
    expect(target.state.doc.toString()).toBe(
      '<head>\n  <title>Kurs</title>\n  <link rel="stylesheet" href="styl.css">\n</head>',
    );
    expect(undo(target)).toBe(true);
    expect(target.state.doc.toString()).toContain('href="style.css"');
    expect(undo(target)).toBe(true);
    expect(target.state.doc.toString()).toBe(original);
  });

  it('keeps climb-up levels in a complete Polish structural expression', () => {
    const shortcut =
      'header>h1{Zwiedzaj Islandię}^aside>h3{Do zwiedzania}+ul>li{Wodospady}+li{Siedliska zwierząt}^^main>h2{Galeria}+section^footer>hr+p{Autor: 0123456789}';
    const target = editor('<body>\n  ' + shortcut + '\n</body>', 'index.html', 9 + shortcut.length);
    expect(expandHtmlAbbreviation('index.html')(target)).toBe(true);
    expect(target.state.doc.toString()).toBe(
      [
        '<body>',
        '  <header>',
        '    <h1>Zwiedzaj Islandię</h1>',
        '  </header>',
        '  <aside>',
        '    <h3>Do zwiedzania</h3>',
        '    <ul>',
        '      <li>Wodospady</li>',
        '      <li>Siedliska zwierząt</li>',
        '    </ul>',
        '  </aside>',
        '  <main>',
        '    <h2>Galeria</h2>',
        '    <section></section>',
        '  </main>',
        '  <footer>',
        '    <hr>',
        '    <p>Autor: 0123456789</p>',
        '  </footer>',
        '</body>',
      ].join('\n'),
    );
  });

  it('keeps correct field offsets after Polish text and CRLF input in HTML after PHP', () => {
    const original =
      '<?php $title = "Zażółć gęślą jaźń"; ?>\r\n<head>\r\n  <title>Łódź</title>\r\n  link:css\r\n</head>';
    const normalized = original.replace(/\r\n/g, '\n');
    const target = editor(original, 'strona.php', normalized.indexOf('link:css') + 8);
    expect(expandHtmlAbbreviation('strona.php')(target)).toBe(true);
    const { from, to } = target.state.selection.main;
    expect(target.state.sliceDoc(from, to)).toBe('style');
    expect(target.state.doc.toString()).toBe(
      normalized.replace('link:css', '<link rel="stylesheet" href="style.css">'),
    );
    expect(undo(target)).toBe(true);
    expect(target.state.doc.toString()).toBe(normalized);
  });

  it('expands all requested cells and list items within the repeat budget', () => {
    for (const [shortcut, tag, count] of [
      ['tr*8>td*8', '<td>', 64],
      ['li*65', '<li>', 65],
    ] as const) {
      const target = editor(shortcut);
      expect(expandHtmlAbbreviation('index.html')(target)).toBe(true);
      expect(target.state.doc.toString().split(tag).length - 1).toBe(count);
    }
  });

  it.each(['li*9999999999', '(tr*64>td*64)*10', ' '.repeat(4096) + 'div'])(
    'declines oversized expansions instead of inserting partial markup',
    async (doc) => {
      const target = editor(doc);
      expect(
        await htmlAbbreviationCompletions(new CompletionContext(target.state, doc.length, false)),
      ).toBeNull();
      expect(expandHtmlAbbreviation('index.html')(target)).toBe(false);
      expect(target.state.doc.toString()).toBe(doc);
    },
  );

  it.each(['projekt.html', 'STRONA.HTM', 'kontakt.php'])(
    'suggests and expands a tag in %s with the cursor between the tags',
    async (path) => {
      const target = editor('<main>div</main>', path, '<main>div'.length);
      const context = new CompletionContext(target.state, target.state.selection.main.head, false);
      const result = await htmlAbbreviationCompletions(context);
      expect(result?.options).toContainEqual(
        expect.objectContaining({ label: 'div', info: '<div></div>' }),
      );
      expect(expandHtmlAbbreviation(path)(target)).toBe(true);
      expect(target.state.doc.toString()).toBe('<main><div></div></main>');
      expect(target.state.selection.main.anchor).toBe('<main><div>'.length);
      expect(undo(target)).toBe(true);
      expect(target.state.doc.toString()).toBe('<main>div</main>');
    },
  );

  it('suggests real tags for a prefix and expands classes, IDs and nested repeated elements', async () => {
    const partial = editor('di');
    const result = await htmlAbbreviationCompletions(
      new CompletionContext(partial.state, 2, false),
    );
    expect(result?.options.map(({ label }) => label)).toContain('div');
    const shortcut = 'ul#oferta.lista>li*3';
    const target = editor('  ' + shortcut);
    expect(expandHtmlAbbreviation('index.html')(target)).toBe(true);
    const text = target.state.doc.toString();
    expect(text).toBe(
      '  <ul id="oferta" class="lista">\n    <li></li>\n    <li></li>\n    <li></li>\n  </ul>',
    );
    expect(target.state.selection.main.head).toBe(text.indexOf('</li>'));
  });

  it.each([
    ['<style>div</style>', 'projekt.html'],
    ['<script>div</script>', 'projekt.html'],
    ['<?php echo "div"; ?>', 'index.php'],
    ['<main title="div">', 'projekt.html'],
    ['<!-- div -->', 'projekt.html'],
    ['Wpisz tutaj div', 'projekt.html'],
    ['division', 'projekt.html'],
  ])('keeps normal editing in %s', async (doc, path) => {
    const pos = doc.indexOf('div') + 3;
    const target = editor(doc, path, pos);
    expect(
      await htmlAbbreviationCompletions(new CompletionContext(target.state, pos, false)),
    ).toBeNull();
    expect(expandHtmlAbbreviation(path)(target)).toBe(false);
    expect(target.state.doc.toString()).toBe(doc);
  });

  it.each([
    ['<style>link:css</style>', 'projekt.html'],
    ['<script>link:css</script>', 'projekt.html'],
    ['<?php echo "link:css"; ?>', 'index.php'],
    ['<main title="link:css">', 'projekt.html'],
    ['<!-- link:css -->', 'projekt.html'],
    ['Wpisz tutaj link:css', 'projekt.html'],
  ])('does not expand stylesheet shortcuts outside HTML text: %s', async (doc, path) => {
    const pos = doc.indexOf('link:css') + 8;
    const target = editor(doc, path, pos);
    expect(
      await htmlAbbreviationCompletions(new CompletionContext(target.state, pos, false)),
    ).toBeNull();
    expect(expandHtmlAbbreviation(path)(target)).toBe(false);
    expect(target.state.doc.toString()).toBe(doc);
  });
});

describe('shared HTML shortcut expansion for teaching', () => {
  it.each([
    [
      '(header>h1{Tytuł})+main+footer',
      '<header>\n  <h1>Tytuł</h1>\n</header>\n<main></main>\n<footer></footer>',
    ],
    ['a[href="kontakt.html"]{Kontakt}', '<a href="kontakt.html">Kontakt</a>'],
    [
      'ul>li.punkt$*3',
      '<ul>\n  <li class="punkt1"></li>\n  <li class="punkt2"></li>\n  <li class="punkt3"></li>\n</ul>',
    ],
  ])('shows the exact expansion used by the editor for %s', (shortcut, expected) => {
    const expansion = expandHtmlShortcut(shortcut);
    expect(expansion?.text).toBe(expected);
    const target = editor(shortcut);
    expect(expandHtmlAbbreviation('index.html')(target)).toBe(true);
    expect(target.state.doc.toString()).toBe(expected);
    expect(target.state.selection.main.anchor).toBe(expansion?.anchor);
    expect(target.state.selection.main.head).toBe(expansion?.head);
  });

  it('preserves the Polish boilerplate and bounded indentation', () => {
    const expansion = expandHtmlShortcut('!', '  ');
    expect(expansion?.text).toContain('\n  <html lang="pl">');
    expect(expansion?.text.slice(0, expansion.anchor)).toMatch(/<body>\n    $/);
    expect(expandHtmlShortcut('ul>li', ' '.repeat(128))?.text).toContain('<li>');
  });

  it.each([
    '',
    'div'.repeat(86),
    'div\np',
    'p{tekst\r\nciąg dalszy}',
    'napisz tutaj div',
    'div ',
    'lorem999999999',
    'div>lorem999999999',
    'li*9999999999',
    '(tr*64>td*64)*10',
    'div[',
    'm10',
    'division',
  ])(
    'rejects unsupported or unbounded direct input without returning partial HTML: %s',
    (shortcut) => {
      expect(expandHtmlShortcut(shortcut)).toBeNull();
    },
  );

  it('rejects excessive output and invalid indentation before returning an expansion', () => {
    expect(expandHtmlShortcut('div', ' '.repeat(129))).toBeNull();
    expect(expandHtmlShortcut('div', '\n')).toBeNull();
    expect(expandHtmlShortcut('div', '<script>')).toBeNull();
    expect(expandHtmlShortcut('div>'.repeat(60) + 'div*128', ' '.repeat(128))).toBeNull();
  });
});
