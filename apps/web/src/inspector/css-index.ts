import { cssLanguage } from '@codemirror/lang-css';
import type {
  InspectionCondition,
  InspectionDeclaration,
  InspectionRule,
  InspectionSource,
} from './types';

type CssNode = ReturnType<typeof cssLanguage.parser.parse>['topNode'];

export interface InspectorCssInput {
  path: string;
  css: string;
  /** Offset of this fragment in the LF-normalized original file. */
  offset?: number;
  /** Decoded style attributes cannot always be mapped character for character. */
  fallbackRange?: { from: number; to: number };
  /** PHP can split a CSS fragment, leaving only a file-level source location. */
  omitRanges?: boolean;
  sourceNote?: string;
  inlineElementId?: string;
  conditions?: InspectionCondition[];
  idPrefix: string;
}

const maxSourceLength = 1_000_000;
const maxRules = 2_000;
const maxDeclarations = 10_000;
const maxAncestors = 64;

function selectorOf(node: CssNode, source: string) {
  const block = node.getChild('Block');
  return block ? source.slice(node.from, block.from).trim() : '';
}

function conditionOf(node: CssNode, source: string): InspectionCondition | undefined {
  const block = node.getChild('Block');
  if (!block) return;
  const header = source.slice(node.from, block.from).trim();
  if (node.name === 'MediaStatement')
    return { kind: 'media', text: header.replace(/^@media\s*/i, '') };
  if (node.name === 'SupportsStatement')
    return { kind: 'supports', text: header.replace(/^@supports\s*/i, '') };
  if (header.startsWith('@')) return { kind: 'unsupported', text: header };
  if (node.name === 'RuleSet')
    return { kind: 'unsupported', text: `Zagnieżdżony selektor: ${header}` };
}

function enclosingConditions(node: CssNode, source: string) {
  const result: InspectionCondition[] = [];
  let depth = 0;
  for (let parent = node.parent; parent; parent = parent.parent) {
    if (++depth > maxAncestors) return;
    const condition = conditionOf(parent, source);
    if (condition) result.unshift(condition);
  }
  return result;
}

/**
 * Index authored CSS before preview resources are rewritten. These are source
 * candidates, not cascade winners; only the preview can measure computed values.
 */
export function indexInspectorCss(input: InspectorCssInput): InspectionRule[] {
  if (input.css.length > maxSourceLength) return [];
  const offset = input.offset ?? 0;
  if (!Number.isSafeInteger(offset) || offset < 0) return [];
  if (
    input.fallbackRange &&
    (!Number.isSafeInteger(input.fallbackRange.from) ||
      !Number.isSafeInteger(input.fallbackRange.to) ||
      input.fallbackRange.from < 0 ||
      input.fallbackRange.to < input.fallbackRange.from)
  )
    return [];

  const css = input.css.replace(/\r\n?/g, '\n');
  const inline = input.inlineElementId !== undefined;
  // CSS declarations need a rule context for the existing CodeMirror parser.
  const prefix = inline ? 'x{' : '';
  const parsedSource = inline ? `${prefix}${css}}` : css;
  const tree = cssLanguage.parser.parse(parsedSource);
  const result: InspectionRule[] = [];
  let declarationCount = 0;
  let exceeded = false;

  const sourceLocation = (from: number, to: number, note?: string): InspectionSource => ({
    path: input.path,
    ...(!input.omitRanges
      ? {
          range: input.fallbackRange ?? {
            from: offset + Math.max(0, from - prefix.length),
            to: offset + Math.min(css.length, to - prefix.length),
          },
        }
      : {}),
    ...(input.sourceNote
      ? { note: input.sourceNote }
      : input.fallbackRange
        ? { note: 'Zaznaczono cały atrybut style zapisany w pliku HTML.' }
        : note
          ? { note }
          : {}),
  });

  const addRule = (node: CssNode) => {
    const block = node.getChild('Block');
    if (!block || (inline && node.from !== 0)) return;
    const inheritedConditions = inline ? [] : enclosingConditions(node, parsedSource);
    if (!inheritedConditions) {
      exceeded = true;
      return;
    }
    const selector = inline ? '[style]' : selectorOf(node, parsedSource);
    if (!selector) return;
    const id = `${input.idPrefix}-r${result.length}`;
    const declarations: InspectionDeclaration[] = [];
    for (const declaration of block.getChildren('Declaration')) {
      const propertyNode =
        declaration.getChild('PropertyName') ?? declaration.getChild('VariableName');
      const colon = declaration.getChild(':');
      if (!propertyNode || !colon) continue;
      const propertyText = parsedSource.slice(propertyNode.from, propertyNode.to);
      const value = parsedSource.slice(colon.to, declaration.to).trim();
      if (!value) continue;
      if (++declarationCount > maxDeclarations) {
        exceeded = true;
        return;
      }
      declarations.push({
        id: `${id}-d${declarations.length}`,
        property: propertyText.startsWith('--') ? propertyText : propertyText.toLowerCase(),
        value,
        source: sourceLocation(declaration.from, declaration.to),
      });
    }
    const nested =
      [
        ...block.getChildren('RuleSet'),
        ...block.getChildren('MediaStatement'),
        ...block.getChildren('SupportsStatement'),
        ...block.getChildren('AtRule'),
      ].length > 0;
    const selectorEnd =
      block.from - parsedSource.slice(node.from, block.from).match(/\s*$/)![0].length;
    result.push({
      id,
      selector,
      source: sourceLocation(
        inline ? prefix.length : node.from,
        inline ? prefix.length + css.length : selectorEnd,
        nested
          ? 'Reguła zawiera zagnieżdżony CSS. Inspektor nie rozstrzyga jego pełnego działania.'
          : undefined,
      ),
      declarations,
      conditions: [...(input.conditions ?? []), ...inheritedConditions],
      ...(inline ? { inlineElementId: input.inlineElementId } : {}),
    });
    if (result.length > maxRules) exceeded = true;
  };

  tree.iterate({
    enter(node) {
      if (exceeded) return false;
      if (node.name === 'RuleSet') {
        addRule(node.node);
        // A style attribute cannot introduce another stylesheet rule.
        if (inline) return false;
      }
    },
  });
  return exceeded ? [] : result;
}
