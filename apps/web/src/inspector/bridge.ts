import {
  INSPECTED_PROPERTIES,
  type InspectionBox,
  type InspectionIndex,
  type InspectionMessage,
  type InspectionSelection,
  type InspectionSides,
  type InspectedProperty,
} from './types';

interface BridgeConfig {
  generation: string;
  attribute: string;
  elements: string[];
  properties: readonly string[];
  rules: {
    id: string;
    selector: string;
    conditions: InspectionIndex['rules'][number]['conditions'];
    inlineElementId?: string;
    inherited: boolean;
  }[];
}

/** This function is serialized into the opaque-origin frame. It has no outer dependencies. */
function startInspection(config: BridgeConfig) {
  const known = new Set(config.elements);
  let selected: Element | undefined;
  let pending = false;
  const idOf = (element: Element | null) => element?.getAttribute(config.attribute) ?? '';
  const send = (message: Record<string, unknown>) =>
    parent.postMessage({ type: 'zdaj-inspector', generation: config.generation, ...message }, '*');
  const number = (value: number) =>
    Number.isFinite(value) ? Math.max(-10_000_000, Math.min(10_000_000, value)) : 0;
  const measure = (element: Element, style: CSSStyleDeclaration) => {
    const rect = element.getBoundingClientRect();
    const sides = (name: string, suffix = '') => ({
      top: number(parseFloat(style.getPropertyValue(`${name}-top${suffix}`))),
      right: number(parseFloat(style.getPropertyValue(`${name}-right${suffix}`))),
      bottom: number(parseFloat(style.getPropertyValue(`${name}-bottom${suffix}`))),
      left: number(parseFloat(style.getPropertyValue(`${name}-left${suffix}`))),
    });
    const margin = sides('margin');
    const padding = sides('padding');
    const border = sides('border', '-width');
    let precise = element.getClientRects().length === 1 && style.display !== 'contents';
    let ancestor: Element | null = element;
    for (let depth = 0; ancestor && depth < 64; depth++, ancestor = ancestor.parentElement) {
      const ancestorStyle = getComputedStyle(ancestor);
      if (
        ancestorStyle.transform !== 'none' ||
        ['translate', 'rotate', 'scale'].some((property) => {
          const value = ancestorStyle.getPropertyValue(property);
          return value && value !== 'none';
        }) ||
        (ancestorStyle.zoom !== '1' && ancestorStyle.zoom !== 'normal')
      )
        precise = false;
    }
    if (Object.values(margin).some((value) => value < 0)) precise = false;
    const parentDisplay = element.parentElement
      ? getComputedStyle(element.parentElement).display
      : '';
    const marginsCanCollapse =
      (margin.top !== 0 || margin.bottom !== 0) &&
      !/flex|grid/.test(parentDisplay) &&
      !['absolute', 'fixed'].includes(style.position) &&
      style.cssFloat === 'none' &&
      !style.display.startsWith('inline');
    if (marginsCanCollapse) precise = false;
    const dimension = (name: 'width' | 'height') => {
      const authored = style.getPropertyValue(name);
      const edges =
        name === 'width'
          ? padding.left + padding.right + border.left + border.right
          : padding.top + padding.bottom + border.top + border.bottom;
      if (/^\d+(?:\.\d+)?px$/.test(authored))
        return number(
          Math.max(0, parseFloat(authored) - (style.boxSizing === 'border-box' ? edges : 0)),
        );
      const unscaled =
        element instanceof HTMLElement
          ? name === 'width'
            ? element.offsetWidth
            : element.offsetHeight
          : rect[name];
      return number(Math.max(0, unscaled - edges));
    };
    return {
      rect: {
        x: number(rect.x),
        y: number(rect.y),
        width: number(rect.width),
        height: number(rect.height),
      },
      margin,
      padding,
      border,
      content: {
        width: dimension('width'),
        height: dimension('height'),
      },
      viewport: { width: innerWidth, height: innerHeight },
      precise,
      ...(!precise && {
        note: marginsCanCollapse
          ? 'Pionowe marginesy mogą się łączyć. Schemat pokazuje wartości CSS, nie sumę odległości na stronie.'
          : 'Układ, transformacja lub ujemny margines utrudnia dokładne zaznaczenie. Sprawdź wartości w schemacie.',
      }),
    };
  };
  const matchesRule = (element: Element, rule: BridgeConfig['rules'][number]) => {
    if (rule.inlineElementId) return rule.inlineElementId === idOf(element);
    try {
      return element.matches(rule.selector);
    } catch {
      return false;
    }
  };
  const report = (kind: 'select' | 'update') => {
    if (!selected?.isConnected || !known.has(idOf(selected))) return;
    const style = getComputedStyle(selected);
    const computed = Object.fromEntries(
      config.properties.map((property) => [
        property,
        style.getPropertyValue(property).slice(0, 512),
      ]),
    );
    const matches: { ruleId: string; active: boolean; inheritedFrom?: string }[] = [];
    for (const rule of config.rules) {
      let candidate: Element | null = selected;
      let matched: Element | undefined;
      for (let depth = 0; candidate && depth < 64; depth++, candidate = candidate.parentElement) {
        if (known.has(idOf(candidate)) && matchesRule(candidate, rule)) {
          matched = candidate;
          break;
        }
        if (!rule.inherited) break;
      }
      if (!matched) continue;
      const active = rule.conditions.every((condition) => {
        try {
          if (condition.kind === 'media') return matchMedia(condition.text).matches;
          if (condition.kind === 'supports') return CSS.supports(condition.text);
        } catch {
          return false;
        }
        return false;
      });
      matches.push({
        ruleId: rule.id,
        active,
        ...(matched !== selected && { inheritedFrom: idOf(matched) }),
      });
    }
    send({
      kind,
      selection: { elementId: idOf(selected), matches, computed, box: measure(selected, style) },
    });
  };
  const observer = new ResizeObserver(() => schedule());
  const select = (element: Element) => {
    if (!known.has(idOf(element))) return;
    observer.disconnect();
    selected = element;
    observer.observe(element);
    report('select');
  };
  function schedule() {
    if (pending || !selected) return;
    pending = true;
    requestAnimationFrame(() => {
      pending = false;
      report('update');
    });
  }
  document.addEventListener(
    'click',
    (event) => {
      event.preventDefault();
      event.stopImmediatePropagation();
      const target =
        event.target instanceof Element ? event.target.closest(`[${config.attribute}]`) : null;
      if (target) select(target);
    },
    true,
  );
  document.addEventListener(
    'submit',
    (event) => {
      event.preventDefault();
      event.stopImmediatePropagation();
    },
    true,
  );
  document.addEventListener(
    'keydown',
    (event) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      event.stopImmediatePropagation();
      send({ kind: 'exit' });
    },
    true,
  );
  addEventListener('message', (event) => {
    const data = event.data;
    if (
      event.source !== parent ||
      data?.type !== 'zdaj-inspector-select' ||
      data.generation !== config.generation ||
      typeof data.elementId !== 'string' ||
      !known.has(data.elementId)
    )
      return;
    const element = document.querySelector(`[${config.attribute}="${data.elementId}"]`);
    if (element) {
      element.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'instant' });
      select(element);
    }
  });
  addEventListener('scroll', schedule, true);
  addEventListener('resize', schedule);
  document.addEventListener('load', schedule, true);
  void document.fonts?.ready.then(schedule);
}

export function createInspectionBridge(index: InspectionIndex) {
  const inherited =
    /^(?:color|font(?:-.+)?|line-height|text-(?:align|indent|transform)|letter-spacing|word-spacing|white-space|visibility|cursor|list-style(?:-.+)?|--.+)$/;
  const config: BridgeConfig = {
    generation: index.generation,
    attribute: index.attribute,
    elements: index.elements.map((element) => element.id),
    properties: INSPECTED_PROPERTIES,
    rules: index.rules.map((rule) => ({
      id: rule.id,
      selector: rule.selector,
      conditions: rule.conditions,
      inlineElementId: rule.inlineElementId,
      inherited: rule.declarations.some((declaration) => inherited.test(declaration.property)),
    })),
  };
  // Neither a selector nor any learner text can terminate the trusted script element.
  return `(${startInspection.toString()})(${JSON.stringify(config).replaceAll('<', '\\u003c')});`;
}

function object(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}
function finite(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && Math.abs(value) <= 10_000_000;
}
function sides(value: unknown): value is InspectionSides {
  return object(value) && ['top', 'right', 'bottom', 'left'].every((key) => finite(value[key]));
}
function box(value: unknown): value is InspectionBox {
  if (!object(value) || !object(value.rect) || !object(value.content) || !object(value.viewport))
    return false;
  const { rect, content, viewport } = value;
  return (
    ['x', 'y', 'width', 'height'].every((key) => finite(rect[key])) &&
    ['width', 'height'].every(
      (key) =>
        finite(content[key]) &&
        content[key] >= 0 &&
        finite(viewport[key]) &&
        viewport[key] >= 0 &&
        finite(rect[key]) &&
        rect[key] >= 0,
    ) &&
    sides(value.margin) &&
    sides(value.padding) &&
    sides(value.border) &&
    typeof value.precise === 'boolean' &&
    (value.note === undefined || (typeof value.note === 'string' && value.note.length <= 250))
  );
}

/** Validate frame identity, generation and IDs; source paths and offsets only come from our index. */
export function readInspectionMessage(
  event: Pick<MessageEvent, 'data' | 'source' | 'origin'>,
  frameWindow: Window | null | undefined,
  index: InspectionIndex | undefined,
): InspectionMessage | undefined {
  if (!frameWindow || !index || event.source !== frameWindow || event.origin !== 'null') return;
  const data: unknown = event.data;
  if (!object(data) || data.type !== 'zdaj-inspector' || data.generation !== index.generation)
    return;
  if (data.kind === 'exit')
    return { type: 'zdaj-inspector', kind: 'exit', generation: index.generation };
  if ((data.kind !== 'select' && data.kind !== 'update') || !object(data.selection)) return;
  const selection = data.selection;
  const element = index.elements.find((candidate) => candidate.id === selection.elementId);
  if (
    !element ||
    !Array.isArray(selection.matches) ||
    selection.matches.length > index.rules.length ||
    !object(selection.computed) ||
    !box(selection.box)
  )
    return;
  const ancestors = new Set<string>();
  let parent = element.parentId;
  while (parent && !ancestors.has(parent)) {
    ancestors.add(parent);
    parent = index.elements.find((candidate) => candidate.id === parent)?.parentId;
  }
  const matches: InspectionSelection['matches'] = [];
  const seen = new Set<string>();
  for (const match of selection.matches) {
    if (
      !object(match) ||
      typeof match.ruleId !== 'string' ||
      typeof match.active !== 'boolean' ||
      seen.has(match.ruleId)
    )
      return;
    const rule = index.rules.find((candidate) => candidate.id === match.ruleId);
    if (
      !rule ||
      (match.inheritedFrom !== undefined &&
        (typeof match.inheritedFrom !== 'string' || !ancestors.has(match.inheritedFrom)))
    )
      return;
    if (rule.inlineElementId && rule.inlineElementId !== (match.inheritedFrom ?? element.id))
      return;
    seen.add(match.ruleId);
    matches.push({
      ruleId: rule.id,
      active: match.active,
      ...(typeof match.inheritedFrom === 'string' && { inheritedFrom: match.inheritedFrom }),
    });
  }
  const computed: InspectionSelection['computed'] = {};
  const allowed: readonly string[] = INSPECTED_PROPERTIES;
  for (const [key, value] of Object.entries(selection.computed)) {
    if (!allowed.includes(key) || typeof value !== 'string' || value.length > 512) return;
    computed[key as InspectedProperty] = value;
  }
  return {
    type: 'zdaj-inspector',
    kind: data.kind,
    generation: index.generation,
    selection: { elementId: element.id, matches, computed, box: selection.box },
  };
}
