import { Script } from 'node:vm';
import { describe, expect, it } from 'vitest';
import { inspectionMarkup, prepareInspection } from '../apps/web/src/inspector/source';
import { createInspectionBridge, readInspectionMessage } from '../apps/web/src/inspector/bridge';
import type { InspectionIndex, InspectionSelection } from '../apps/web/src/inspector/types';

describe('inspection source mapping', () => {
  it('keeps distinct source positions for repeated elements and leaves files untouched', () => {
    const content =
      '<html lang="pl"><body><nav><a href="a.html">Kontakt</a><a href="b.html">Kontakt</a></nav></body></html>';
    const files = [{ path: 'index.html', content }];
    const { index, markup } = prepareInspection(files, 'index.html');
    const links = index.elements.filter((element) => element.tag === 'a');
    expect(links).toHaveLength(2);
    expect(links[0]!.source.range).not.toEqual(links[1]!.source.range);
    expect(links[0]!.parentId).toBe(index.elements.find((element) => element.tag === 'nav')!.id);
    expect(content.slice(links[1]!.source.range!.from, links[1]!.source.range!.to)).toBe(
      '<a href="b.html">',
    );
    expect(markup).toContain(index.attribute);
    expect(files).toEqual([{ path: 'index.html', content }]);
  });

  it('maps LF editor offsets after CRLF and Polish Unicode text', () => {
    const content = '<body>Zażółć gęślą 😀\r\n<h1>Łódź</h1></body>';
    const { index } = prepareInspection([{ path: 'a.html', content }], 'a.html');
    const target = index.elements.find((element) => element.tag === 'h1')!;
    const normalized = content.replaceAll('\r\n', '\n');
    expect(target.source.range).toEqual({
      from: normalized.indexOf('<h1>'),
      to: normalized.indexOf('<h1>') + 4,
    });
  });

  it('maps literal HTML following PHP without indexing tags inside PHP strings', () => {
    const content =
      '<body><?php echo "<h1>Fałszywy</h1>"; ?>\r\n<header><h1>Prawdziwy</h1></header></body>';
    const { index } = prepareInspection([{ path: 'a.php', content }], 'a.php');
    const headings = index.elements.filter((element) => element.tag === 'h1');
    expect(headings).toHaveLength(1);
    expect(headings[0]!.label).toContain('Prawdziwy');
    expect(headings[0]!.source.range?.from).toBe(
      content.replaceAll('\r\n', '\n').lastIndexOf('<h1>'),
    );
  });

  it('uses file-only guidance when a start tag crosses PHP', () => {
    const { index } = prepareInspection(
      [{ path: 'a.php', content: '<body><h1 class="<?= $class ?>">Tytuł</h1></body>' }],
      'a.php',
    );
    const heading = index.elements.find((element) => element.tag === 'h1')!;
    expect(heading.source.range).toBeUndefined();
    expect(heading.source.note).toContain('PHP');
  });

  it('does not invent a range for a browser-inserted tbody', () => {
    const { index } = prepareInspection(
      [{ path: 'a.html', content: '<table><tr><td>1</td></tr></table>' }],
      'a.html',
    );
    const tbody = index.elements.find((element) => element.tag === 'tbody')!;
    expect(tbody.source.range).toBeUndefined();
    expect(tbody.source.note).toContain('przeglądarkę');
  });

  it('indexes local external, embedded and decoded inline styles at their actual source', () => {
    const content =
      '<html><head><link rel="stylesheet" href="../css/site.css" media="screen"><style>h1 { color: blue }</style></head><body><h1 style="font-family: &quot;Arial&quot;;">A</h1></body></html>';
    const css = '/* Łódź */\r\nh1 { padding: 20px; }';
    const { index } = prepareInspection(
      [
        { path: 'pages/a.html', content },
        { path: 'css/site.css', content: css },
      ],
      'pages/a.html',
    );
    const external = index.rules.find((rule) => rule.source.path === 'css/site.css')!;
    expect(external.conditions).toEqual([{ kind: 'media', text: 'screen' }]);
    expect(
      css.replaceAll('\r\n', '\n').slice(external.source.range!.from, external.source.range!.to),
    ).toBe('h1');
    const embedded = index.rules.find((rule) =>
      rule.declarations.some((declaration) => declaration.property === 'color'),
    )!;
    expect(content.slice(embedded.source.range!.from, embedded.source.range!.to)).toBe('h1');
    const inline = index.rules.find((rule) => !!rule.inlineElementId)!;
    expect(content.slice(inline.source.range!.from, inline.source.range!.to)).toBe(
      'style="font-family: &quot;Arial&quot;;"',
    );
    expect(inline.declarations[0]!.value).toContain('"Arial"');
  });

  it('does not map a PHP-split inline style into another part of the file', () => {
    const { index } = prepareInspection(
      [{ path: 'a.php', content: '<p style="color: <?= $color ?>; padding: 2px">A</p>' }],
      'a.php',
    );
    const inline = index.rules.find((rule) => !!rule.inlineElementId)!;
    expect(inline.source.range).toBeUndefined();
    expect(inline.declarations.every((declaration) => !declaration.source.range)).toBe(true);
  });

  it('drops spoofed markers and inert-template elements from selection', () => {
    const { index, markup } = prepareInspection(
      [
        {
          path: 'a.html',
          content:
            '<main data-zdaj-inspect-fake="e0"><template><h1>Ukryty</h1></template><iframe><p>Obcy</p></iframe></main>',
        },
      ],
      'a.html',
    );
    expect(markup).not.toContain('data-zdaj-inspect-fake');
    expect(index.elements.some((element) => element.tag === 'h1' || element.tag === 'p')).toBe(
      false,
    );
    expect(new Set(index.elements.map((element) => element.id)).size).toBe(index.elements.length);
  });

  it('caps inspection and warns when unsupported CSS cannot be fully explained', () => {
    expect(inspectionMarkup('x'.repeat(1_000_001), false).markup).toBe('');
    const { index } = prepareInspection(
      [{ path: 'a.html', content: '<style>h1::before { content:"A" }</style><h1>A</h1>' }],
      'a.html',
    );
    expect(index.note).toContain('Pseudoelementy');
  });

  it('explains skipped oversized CSS and still indexes another available stylesheet', () => {
    const { index } = prepareInspection(
      [
        {
          path: 'a.html',
          content:
            '<link rel="stylesheet" href="large.css"><style>h1{padding:2px}</style><h1>A</h1>',
        },
        { path: 'large.css', content: 'h1{color:red}'.repeat(2_001) },
      ],
      'a.html',
    );
    expect(index.rules).toHaveLength(1);
    expect(index.rules[0]!.declarations[0]!.property).toBe('padding');
    expect(index.note).toContain('Część CSS pominięto z powodu rozmiaru lub złożoności');
  });

  it('reports inline declaration and nested style-block limits', () => {
    for (const content of [
      '<h1 style="' + 'color:red;'.repeat(10_001) + '">A</h1>',
      '<style>' +
        '@media screen{'.repeat(33) +
        'h1{color:red}' +
        '}'.repeat(33) +
        '</style><h1>A</h1>',
    ]) {
      const { index } = prepareInspection([{ path: 'a.html', content }], 'a.html');
      expect(index.rules).toEqual([]);
      expect(index.note).toContain('Część CSS pominięto');
    }
  });

  it('serializes hostile CSS selectors as data, never as executable script markup', () => {
    const { index } = prepareInspection([{ path: 'a.html', content: '<p>A</p>' }], 'a.html');
    index.rules.push({
      id: 'r',
      selector: '[data-x="</script><script>alert(1)</script>"]',
      source: { path: 'a.css' },
      conditions: [],
      declarations: [],
    });
    const bridge = createInspectionBridge(index);
    expect(bridge).not.toContain('</script>');
    expect(() => new Script(bridge)).not.toThrow();
    expect(bridge).not.toContain('a.css');
    expect(() =>
      new Script(bridge).runInNewContext({
        parent: { postMessage: () => undefined },
        document: { addEventListener: () => undefined },
        addEventListener: () => undefined,
        ResizeObserver: class {
          observe() {
            return undefined;
          }
          disconnect() {
            return undefined;
          }
        },
      }),
    ).not.toThrow();
  });
});

const frame = {} as Window;
const index: InspectionIndex = {
  generation: 'generation-a',
  entry: 'a.html',
  attribute: 'data-inspect-test',
  elements: [
    {
      id: 'parent',
      tag: 'main',
      label: 'main',
      source: { path: 'a.html', range: { from: 0, to: 6 } },
    },
    {
      id: 'child',
      parentId: 'parent',
      tag: 'h1',
      label: 'h1',
      source: { path: 'a.html', range: { from: 6, to: 10 } },
    },
    { id: 'other', tag: 'p', label: 'p', source: { path: 'a.html' } },
  ],
  rules: [
    { id: 'rule', selector: 'h1', source: { path: 'a.css' }, declarations: [], conditions: [] },
  ],
};
function message() {
  const sides = { top: 0, right: 0, bottom: 0, left: 0 };
  const selection: InspectionSelection = {
    elementId: 'child',
    matches: [{ ruleId: 'rule', active: true }],
    computed: { display: 'block' },
    box: {
      rect: { x: 0, y: 0, width: 100, height: 40 },
      margin: sides,
      padding: sides,
      border: sides,
      content: { width: 100, height: 40 },
      viewport: { width: 800, height: 600 },
      precise: true,
    },
  };
  return {
    source: frame,
    origin: 'null',
    data: { type: 'zdaj-inspector', generation: index.generation, kind: 'select', selection },
  };
}

describe('inspection message boundary', () => {
  it('accepts current opaque-frame messages and source IDs only', () => {
    const event = message();
    Object.assign(event.data.selection, {
      source: { path: 'forged.php', range: { from: 999, to: 1000 } },
    });
    const result = readInspectionMessage(event, frame, index);
    expect(result?.kind).toBe('select');
    expect(result && 'selection' in result && 'source' in result.selection).toBe(false);
  });

  it('rejects another window, same-origin messages and stale generations', () => {
    expect(
      readInspectionMessage({ ...message(), source: {} as Window }, frame, index),
    ).toBeUndefined();
    expect(
      readInspectionMessage({ ...message(), origin: 'https://example.test' }, frame, index),
    ).toBeUndefined();
    const event = message();
    event.data.generation = 'previous';
    expect(readInspectionMessage(event, frame, index)).toBeUndefined();
  });

  it('rejects unknown elements and rules, duplicate rules and false inheritance', () => {
    const unknown = message();
    unknown.data.selection.elementId = 'forged';
    expect(readInspectionMessage(unknown, frame, index)).toBeUndefined();
    const rule = message();
    rule.data.selection.matches[0]!.ruleId = 'forged';
    expect(readInspectionMessage(rule, frame, index)).toBeUndefined();
    const duplicate = message();
    duplicate.data.selection.matches.push({ ruleId: 'rule', active: true });
    expect(readInspectionMessage(duplicate, frame, index)).toBeUndefined();
    const inheritance = message();
    inheritance.data.selection.matches[0]!.inheritedFrom = 'other';
    expect(readInspectionMessage(inheritance, frame, index)).toBeUndefined();
  });

  it('allows real ancestors and distinguishes geometry updates from new selections', () => {
    const event = message();
    event.data.selection.matches[0]!.inheritedFrom = 'parent';
    event.data.kind = 'update';
    expect(readInspectionMessage(event, frame, index)?.kind).toBe('update');
  });

  it.each([Infinity, Number.NaN, 10_000_001, -2])('rejects invalid box width %s', (width) => {
    const event = message();
    event.data.selection.box.rect.width = width;
    expect(readInspectionMessage(event, frame, index)).toBeUndefined();
  });

  it('rejects oversized or unrecognized computed values', () => {
    const event = message();
    event.data.selection.computed.display = 'x'.repeat(513);
    expect(readInspectionMessage(event, frame, index)).toBeUndefined();
    const unknown = message();
    Object.assign(unknown.data.selection.computed, { secret: 'value' });
    expect(readInspectionMessage(unknown, frame, index)).toBeUndefined();
  });

  it('accepts Escape only from the current generation and frame', () => {
    const event = {
      source: frame,
      origin: 'null',
      data: { type: 'zdaj-inspector', kind: 'exit', generation: index.generation },
    };
    expect(readInspectionMessage(event, frame, index)?.kind).toBe('exit');
    expect(readInspectionMessage(event, null, index)).toBeUndefined();
  });
});
