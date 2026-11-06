import { phpLanguage } from '@codemirror/lang-php';
import type { ProjectFile } from '@zdaj/shared';
import { parse, serialize, type DefaultTreeAdapterMap } from 'parse5';
import { indexInspectorCss } from './css-index';
import type { InspectionCondition, InspectionIndex, InspectionSource } from './types';

type Node = DefaultTreeAdapterMap['node'];
type Element = DefaultTreeAdapterMap['element'];
const MAX_SOURCE = 1_000_000;
const MAX_ELEMENTS = 2_000;
const MAX_RULES = 1_000;
const omitted = new Set([
  'head',
  'title',
  'meta',
  'script',
  'style',
  'link',
  'base',
  'iframe',
  'object',
  'embed',
  'template',
]);

/** Keep a segment map while removing PHP, so rendered offsets never become editor offsets. */
export function inspectionMarkup(raw: string, php: boolean) {
  const source = raw.replace(/\r\n?/g, '\n');
  const parts: string[] = [];
  const segments: { from: number; to: number; sourceFrom: number }[] = [];
  let length = 0;
  const append = (from: number, to: number) => {
    parts.push(source.slice(from, to));
    segments.push({ from: length, to: length + to - from, sourceFrom: from });
    length += to - from;
  };
  if (source.length <= MAX_SOURCE) {
    if (php)
      phpLanguage.parser
        .configure({ top: 'Template' })
        .parse(source)
        .iterate({
          enter(node) {
            if (node.name === 'Text') append(node.from, node.to);
          },
        });
    else append(0, source.length);
  }
  const range = (location?: { startOffset: number; endOffset: number } | null) => {
    if (!location) return;
    const segment = segments.find(
      (part) => part.from <= location.startOffset && part.to >= location.endOffset,
    );
    if (!segment) return;
    return {
      from: segment.sourceFrom + location.startOffset - segment.from,
      to: segment.sourceFrom + location.endOffset - segment.from,
    };
  };
  return { source, markup: parts.join(''), range };
}

function localPath(from: string, target: string) {
  if (!target || /^(?:[a-z]+:|\/\/|#)/i.test(target)) return;
  const parts = target.startsWith('/') ? [] : from.split('/').slice(0, -1);
  for (const part of target.split(/[?#]/)[0]!.split('/')) {
    if (part === '..') {
      if (!parts.length) return;
      parts.pop();
    } else if (part && part !== '.') parts.push(part);
  }
  return parts.join('/');
}

function label(element: Element) {
  const attr = (name: string) => element.attrs.find((item) => item.name === name)?.value;
  const id = attr('id');
  const classes = attr('class')?.trim().split(/\s+/).slice(0, 2).join('.');
  const text = element.childNodes
    .filter((child): child is DefaultTreeAdapterMap['textNode'] => child.nodeName === '#text')
    .map((child) => child.value)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
  const description = attr('aria-label') || attr('alt') || text;
  return `${element.tagName}${id ? `#${id}` : classes ? `.${classes}` : ''}${description ? ` — ${description}` : ''}`.slice(
    0,
    180,
  );
}

/** Instrument only the disposable preview, never the saved project files. */
export function prepareInspection(files: ProjectFile[], entry: string) {
  const generation = crypto.randomUUID();
  const index: InspectionIndex = {
    generation,
    entry,
    attribute: `data-zdaj-inspect-${generation.replaceAll('-', '')}`,
    elements: [],
    rules: [],
  };
  const file = files.find((item) => item.path === entry && item.encoding !== 'base64');
  const mapping = inspectionMarkup(file?.content ?? '', /\.php$/i.test(entry));
  if (!file || mapping.source.length > MAX_SOURCE) {
    index.note = 'Ten plik jest niedostępny albo zbyt duży do badania. Otwórz go w edytorze.';
    return { markup: '', index };
  }
  const tree = parse(mapping.markup, { sourceCodeLocationInfo: true });
  const queue: { node: Node; parentId?: string }[] = [{ node: tree }];
  let ruleGroup = 0;
  let cssBudget = 2_000_000;
  let cssLimited = false;
  let complexCss = false;
  const canIndexCss = (text: string) => {
    if (/@(?:import|container|layer)\b|::[\w-]+|:(?:before|after)\b/i.test(text)) complexCss = true;
    if (text.length > MAX_SOURCE || text.length > cssBudget || index.rules.length >= MAX_RULES) {
      cssLimited = true;
      return false;
    }
    cssBudget -= text.length;
    return true;
  };
  while (queue.length) {
    const { node, parentId } = queue.pop()!;
    if (!('tagName' in node)) {
      if ('childNodes' in node)
        for (const child of [...node.childNodes].reverse()) queue.push({ node: child, parentId });
      continue;
    }
    // Learner-authored markers must never impersonate an indexed element.
    node.attrs = node.attrs.filter((attribute) => !attribute.name.startsWith('data-zdaj-inspect-'));
    const attr = (name: string) => node.attrs.find((item) => item.name === name)?.value;
    const location = node.sourceCodeLocation;
    const opening = mapping.range(location?.startTag);
    const source: InspectionSource = {
      path: entry,
      range: opening,
      ...(!opening && {
        note: location?.startTag
          ? 'Znacznik zawiera fragment PHP. Odszukaj go w pliku; PHP nie jest tutaj wykonywany.'
          : 'Ten element został uzupełniony przez przeglądarkę. Sprawdź strukturę HTML w pliku.',
      }),
    };
    let id: string | undefined;
    if (!omitted.has(node.tagName) && index.elements.length < MAX_ELEMENTS) {
      id = `e${index.elements.length}`;
      node.attrs.push({ name: index.attribute, value: id });
      index.elements.push({ id, tag: node.tagName, label: label(node), parentId, source });
    }
    const conditions: InspectionCondition[] = attr('media')
      ? [{ kind: 'media', text: attr('media')! }]
      : [];
    if (node.tagName === 'link' && /(?:^|\s)stylesheet(?:\s|$)/i.test(attr('rel') ?? '')) {
      const target = localPath(entry, attr('href') ?? '');
      const stylesheet = files.find((item) => item.path === target && item.encoding !== 'base64');
      if (stylesheet && canIndexCss(stylesheet.content)) {
        if (attr('disabled') !== undefined || /(?:^|\s)alternate(?:\s|$)/i.test(attr('rel') ?? ''))
          conditions.push({ kind: 'unsupported', text: 'Arkusz wyłączony lub alternatywny' });
        index.rules.push(
          ...indexInspectorCss({
            path: stylesheet.path,
            css: stylesheet.content.replace(/\r\n?/g, '\n'),
            idPrefix: `r${ruleGroup++}`,
            conditions,
          }),
        );
      }
    }
    if (node.tagName === 'style' && location?.startTag) {
      const start = location.startTag.endOffset;
      const end = location.endTag?.startOffset ?? location.endOffset;
      const contentRange = mapping.range({ startOffset: start, endOffset: end });
      const css = mapping.markup.slice(start, end);
      if (canIndexCss(css))
        index.rules.push(
          ...indexInspectorCss({
            path: entry,
            css,
            offset: contentRange?.from,
            fallbackRange: contentRange ? undefined : opening,
            omitRanges: !contentRange && !opening,
            sourceNote: !contentRange ? 'Styl zawiera PHP; sprawdź jego treść w pliku.' : undefined,
            idPrefix: `r${ruleGroup++}`,
            conditions,
          }),
        );
    }
    if (id && attr('style') !== undefined && canIndexCss(attr('style')!)) {
      const attributeRange = mapping.range(location?.attrs?.style);
      index.rules.push(
        ...indexInspectorCss({
          path: entry,
          css: attr('style')!,
          fallbackRange: attributeRange,
          omitRanges: !attributeRange,
          sourceNote: !attributeRange
            ? 'Atrybut style zawiera PHP; sprawdź go w pliku.'
            : undefined,
          inlineElementId: id,
          idPrefix: `r${ruleGroup++}`,
        }),
      );
    }
    if (!['template', 'iframe', 'object', 'embed'].includes(node.tagName))
      for (const child of [...node.childNodes].reverse())
        queue.push({ node: child, parentId: id ?? parentId });
  }
  if (index.elements.length >= MAX_ELEMENTS || index.rules.length > MAX_RULES || cssLimited)
    index.note = 'Duży dokument: pokazujemy do 2000 elementów i 1000 reguł CSS.';
  if (
    complexCss ||
    index.rules.some((rule) =>
      rule.conditions.some((condition) => condition.kind === 'unsupported'),
    )
  )
    index.note = `${index.note ? `${index.note} ` : ''}Pseudoelementy, importy i część zaawansowanych reguł CSS nie są w pełni analizowane. Wartości obliczone dotyczą zaznaczonego elementu.`;
  index.rules = index.rules.slice(0, MAX_RULES);
  return { markup: serialize(tree), index };
}
