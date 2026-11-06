import { describe, expect, it } from 'vitest';
import { indexInspectorCss } from '../apps/web/src/inspector/css-index';

function index(css: string) {
  return indexInspectorCss({ path: 'css/styl.css', css, idPrefix: 'sheet-1' });
}

describe('preview inspector CSS source index', () => {
  it('retains competing rules, duplicate declarations, groups and important without choosing a winner', () => {
    const css = 'nav, .menu { gap: 20px; gap: 1rem !important } nav { gap: 4px }';
    const rules = index(css);
    expect(rules.map((rule) => rule.selector)).toEqual(['nav, .menu', 'nav']);
    expect(rules[0]?.declarations.map(({ property, value }) => [property, value])).toEqual([
      ['gap', '20px'],
      ['gap', '1rem !important'],
    ]);
    expect(
      new Set(rules.flatMap((rule) => [rule.id, ...rule.declarations.map(({ id }) => id)])).size,
    ).toBe(5);
    const declaration = rules[0]!.declarations[1]!;
    expect(css.slice(declaration.source.range!.from, declaration.source.range!.to)).toBe(
      'gap: 1rem !important',
    );
  });

  it('maps a style block back to the original HTML with Polish characters, emoji and Windows newlines', () => {
    const before = '<!-- Zażółć 🐟 -->\n<style>\n';
    const css = 'nav {\r\n  PADDING: 10px 20px;\r\n  background: url("../obraz.jpg");\r\n}';
    const document = before + css.replace(/\r\n/g, '\n') + '</style>';
    const [rule] = indexInspectorCss({
      path: 'index.html',
      css,
      offset: before.length,
      idPrefix: 'embedded',
    });
    expect(document.slice(rule!.source.range!.from, rule!.source.range!.to)).toBe('nav');
    const [padding, background] = rule!.declarations;
    expect(padding!.property).toBe('padding');
    expect(document.slice(padding!.source.range!.from, padding!.source.range!.to)).toBe(
      'PADDING: 10px 20px',
    );
    expect(document.slice(background!.source.range!.from, background!.source.range!.to)).toBe(
      'background: url("../obraz.jpg")',
    );
  });

  it('retains nested media/supports conditions and a linked stylesheet media condition', () => {
    const rules = indexInspectorCss({
      path: 'styl.css',
      idPrefix: 'linked',
      css: '@media (max-width: 600px) { @supports (display: grid) { main {display: grid} } }',
      conditions: [{ kind: 'media', text: 'screen' }],
    });
    expect(rules[0]!.conditions).toEqual([
      { kind: 'media', text: 'screen' },
      { kind: 'media', text: '(max-width: 600px)' },
      { kind: 'supports', text: '(display: grid)' },
    ]);
  });

  it('marks container queries, layers and nesting as unsupported instead of unconditional rules', () => {
    const rules = index(
      '@container karta (width > 10px) { p{color:red} } @layer theme {p{color:blue}} main{color:black; & p{color:green} }',
    );
    expect(rules[0]!.conditions).toEqual([
      { kind: 'unsupported', text: '@container karta (width > 10px)' },
    ]);
    expect(rules[1]!.conditions).toEqual([{ kind: 'unsupported', text: '@layer theme' }]);
    expect(rules[2]!.conditions).toEqual([]);
    expect(rules[2]!.source.note).toContain('zagnieżdżony CSS');
    expect(rules[3]!.conditions).toEqual([
      { kind: 'unsupported', text: 'Zagnieżdżony selektor: main' },
    ]);
  });

  it('maps decoded inline declarations to the original complete attribute', () => {
    const html = '<p style="font-family: &quot;A B&quot;; color: red">Tekst</p>';
    const from = html.indexOf('style='),
      to = html.indexOf('>');
    const [rule] = indexInspectorCss({
      path: 'index.html',
      css: 'font-family: "A B"; color: red',
      idPrefix: 'inline',
      inlineElementId: 'element-7',
      fallbackRange: { from, to },
    });
    expect(rule!.inlineElementId).toBe('element-7');
    expect(rule!.declarations.map(({ value }) => value)).toEqual(['"A B"', 'red']);
    for (const declaration of rule!.declarations) {
      expect(html.slice(declaration.source.range!.from, declaration.source.range!.to)).toBe(
        'style="font-family: &quot;A B&quot;; color: red"',
      );
      expect(declaration.source.note).toContain('cały atrybut');
    }
  });

  it('does not turn inline attribute text into extra stylesheet rules', () => {
    const rules = indexInspectorCss({
      path: 'index.html',
      css: 'color:red} body{display:none}',
      inlineElementId: 'el',
      idPrefix: 'attribute',
    });
    expect(rules).toHaveLength(1);
    expect(rules[0]!.declarations.map(({ property }) => property)).toEqual(['color']);
  });

  it('keeps PHP-spanning CSS at file level instead of inventing source offsets', () => {
    const [rule] = indexInspectorCss({
      path: 'motocykle.php',
      css: 'header{color:red}',
      idPrefix: 'php-style',
      omitRanges: true,
      sourceNote: 'Fragment zawiera pominięty kod PHP.',
    });
    expect(rule!.source).toEqual({
      path: 'motocykle.php',
      note: 'Fragment zawiera pominięty kod PHP.',
    });
    expect(rule!.declarations[0]!.source).toEqual(rule!.source);
  });

  it('preserves custom-property case and skips missing values and non-element at-rules', () => {
    const rules = index(
      '@font-face{font-family:X} @keyframes fade{from{opacity:0}to{opacity:1}} a{--MyColor: red; COLOR: var(--MyColor); padding:; width:10px}',
    );
    expect(rules).toHaveLength(1);
    expect(rules[0]!.declarations.map(({ property, value }) => [property, value])).toEqual([
      ['--MyColor', 'red'],
      ['color', 'var(--MyColor)'],
      ['width', '10px'],
    ]);
  });

  it('bounds large inputs and never exposes a misleading partial rule collection', () => {
    expect(index('x'.repeat(1_000_001))).toEqual([]);
    expect(index('p{color:red}'.repeat(2_001))).toEqual([]);
    expect(index('p{' + 'color:red;'.repeat(10_001) + '}')).toEqual([]);
    expect(
      indexInspectorCss({ path: 'styl.css', css: 'p{color:red}', offset: -1, idPrefix: 'bad' }),
    ).toEqual([]);
  });

  it('reports exceeded limits separately from an empty stylesheet', () => {
    for (const css of [
      'x'.repeat(1_000_001),
      'p{color:red}'.repeat(2_001),
      'p{' + 'color:red;'.repeat(10_001) + '}',
      '@media screen{'.repeat(33) + 'p{color:red}' + '}'.repeat(33),
    ]) {
      let notices = 0;
      expect(
        indexInspectorCss({
          path: 'styl.css',
          css,
          idPrefix: 'limited',
          onLimit: () => {
            notices++;
          },
        }),
      ).toEqual([]);
      expect(notices).toBe(1);
    }
    let limited = false;
    expect(
      indexInspectorCss({
        path: 'styl.css',
        css: '/* empty */',
        idPrefix: 'empty',
        onLimit: () => {
          limited = true;
        },
      }),
    ).toEqual([]);
    expect(limited).toBe(false);
  });
});
