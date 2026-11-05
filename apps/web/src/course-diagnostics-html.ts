import { phpLanguage } from '@codemirror/lang-php';
import type { ProjectFile, StudyCheckSpec } from '@zdaj/shared';
import { is, selectAll } from 'css-select';
import {
  isTraversal,
  parse as parseSelector,
  stringify,
  type AttributeSelector,
  type Selector,
} from 'css-what';
import { parse } from 'parse5';
import { adapter, type Htmlparser2TreeAdapterMap } from 'parse5-htmlparser2-tree-adapter';
import type { CodeDiagnostic } from './code-diagnostic';
import { attributeMatches } from './project-checks';

type HtmlCheck = Extract<StudyCheckSpec, { kind: 'html' }>;
type Element = Htmlparser2TreeAdapterMap['element'];
type Node = Htmlparser2TreeAdapterMap['node'];

/** Mask PHP at its original UTF-16 offsets. PHP strings cannot become candidate HTML tags. */
function literalHtml(source: string) {
  if (!/<\?(?:php|=)/i.test(source)) return source;
  const parts: string[] = [];
  let previous = 0;
  phpLanguage.parser
    .configure({ top: 'Template' })
    .parse(source)
    .iterate({
      enter(node) {
        if (node.name !== 'Text') return;
        parts.push(' '.repeat(node.from - previous), source.slice(node.from, node.to));
        previous = node.to;
      },
    });
  return parts.join('') + ' '.repeat(source.length - previous);
}

export function htmlSource(content: string) {
  const source = content.replace(/\r\n?/g, '\n');
  const markup = literalHtml(source);
  const document = parse(markup, { treeAdapter: adapter, sourceCodeLocationInfo: true });
  const query = (selector: string) => selectAll<Node, Element>(selector, document.children);
  // Browser querySelectorAll does not descend into a template's separate document fragment.
  for (const template of query('template')) template.children = [];
  function range(location: { startOffset: number; endOffset: number } | undefined | null) {
    if (!location) return;
    const { startOffset: from, endOffset: to } = location;
    if (source.slice(from, to) === markup.slice(from, to)) return { from, to };
  }
  return { query, range };
}
type Source = ReturnType<typeof htmlSource>;

function elementText(element: Element) {
  const pending: Node[] = [element];
  const text: string[] = [];
  while (pending.length) {
    const node = pending.pop()!;
    if (node.type === 'text') text.push(node.data);
    if ('children' in node)
      for (let i = node.children.length - 1; i >= 0; i--) pending.push(node.children[i]!);
  }
  return text.join('').replace(/\s+/g, ' ');
}

function unique<T>(items: T[]) {
  return items.length === 1 ? items[0] : undefined;
}

function choose(candidates: Element[], check: HtmlCheck) {
  if (check.text) {
    const labelled = candidates.filter((element) => elementText(element).includes(check.text!));
    if (labelled.length) return unique(labelled);
  }
  return unique(candidates);
}

function detailsMatch(element: Element, check: HtmlCheck) {
  const actual = check.attribute ? element.attribs[check.attribute] : undefined;
  return (
    (!check.attribute ||
      (actual !== undefined &&
        (check.equals === undefined || attributeMatches(check.attribute, actual, check.equals)))) &&
    (!check.text || elementText(element).includes(check.text))
  );
}

/** Preserve a heading, URL or ID that already fulfils a different part of the cumulative project. */
function servesEarlierStep(element: Element, field: string, previous: HtmlCheck[]) {
  if (field !== 'textContent' && element.attribs[field] === undefined) return false;
  return previous.some((other) => {
    if (!is<Node, Element>(element, other.selector) || !detailsMatch(element, other)) return false;
    if (field === 'textContent') return !!other.text;
    if (other.attribute === field && other.equals !== undefined) return true;
    return parseSelector(other.selector).some((branch) =>
      branch
        .slice(branch.findLastIndex(isTraversal) + 1)
        .some(
          (token) =>
            token.type === 'attribute' && token.name === field && token.action !== 'exists',
        ),
    );
  });
}

function opening(doc: Source, element?: Element, attr?: string) {
  const location = element && adapter.getNodeSourceCodeLocation(element);
  return doc.range((attr && location?.attrs?.[attr]) || location?.startTag);
}

function describeAttribute(
  check: HtmlCheck,
  doc: Source,
  element: Element,
  name: string,
  expected?: string,
): CodeDiagnostic {
  const actual = element.attribs[name];
  const observation =
    actual === undefined
      ? `W znaczniku <${element.name}> brakuje atrybutu ${name}.`
      : `W znaczniku <${element.name}> masz ${name}="${actual}".`;
  const advice =
    name === 'lang'
      ? 'Strona ma być w języku polskim. Ustaw lang="pl".'
      : name === 'class' && expected && check.attribute !== 'class'
        ? `Dodaj klasę „${expected}” do listy klas tego elementu.`
        : expected === undefined
          ? `Dodaj atrybut ${name} zgodnie z poleceniem kroku.`
          : `Sprawdź wartość ${name}. W tym kroku oczekiwana jest „${expected}”.`;
  return {
    path: check.path,
    explanation: `${observation} ${advice}`,
    range: opening(doc, element, name),
  };
}

/** Try one missing or mistyped attribute at a time, preserving the element's context. */
function nearAttribute(
  doc: Source,
  selectors: Selector[][],
  check: HtmlCheck,
  previous: HtmlCheck[],
) {
  const found = new Map<Element, AttributeSelector>();
  for (const branch of selectors) {
    const split = branch.findLastIndex(isTraversal);
    for (let i = split + 1; i < branch.length; i++) {
      const token = branch[i]!;
      if (token.type !== 'attribute') continue;
      const remaining = branch.filter((_, index) => index !== i);
      // A bare ID does not identify which arbitrary element should receive it.
      if (remaining.length <= split + 1) continue;
      let candidates = doc.query(stringify([remaining]));
      if (token.name !== 'class')
        candidates = candidates.filter((item) => !servesEarlierStep(item, token.name, previous));
      if (token.name === 'charset') {
        const encodingTags = candidates.filter((element) => element.attribs.charset !== undefined);
        candidates = encodingTags.length
          ? encodingTags
          : candidates.filter(
              (element) =>
                element.attribs.name === undefined &&
                element.attribs['http-equiv'] === undefined &&
                element.attribs.property === undefined,
            );
      }
      if (token.name === 'rel' && check.attribute === 'href')
        candidates = candidates.filter((element) =>
          attributeMatches('href', element.attribs.href ?? null, check.equals ?? ''),
        );
      if (token.name === 'href' && check.text)
        candidates = candidates.filter((element) => elementText(element).includes(check.text!));
      if (check.attribute && check.equals !== undefined) {
        const named = candidates.filter((element) =>
          attributeMatches(
            check.attribute!,
            element.attribs[check.attribute!] ?? null,
            check.equals!,
          ),
        );
        if (named.length) candidates = named;
      }
      const matched = choose(candidates, check);
      if (!matched) continue;
      const existing = found.get(matched);
      if (existing && existing.name !== token.name) return;
      if (!existing) found.set(matched, token);
    }
  }
  return unique([...found.entries()]);
}

function containingElement(doc: Source, selectors: Selector[][]) {
  const containers = new Set<Element>();
  for (const branch of selectors) {
    const split = branch.findLastIndex(isTraversal);
    // A sibling is a useful landmark but is not the container for a new element.
    if (branch[split]?.type !== 'child' && branch[split]?.type !== 'descendant') return;
    for (const parent of doc.query(stringify([branch.slice(0, split)]))) containers.add(parent);
  }
  return unique([...containers]);
}

function resourceTarget(check: HtmlCheck, selectors: Selector[][]) {
  const fileAttrs = ['src', 'href', 'action'];
  if (check.attribute && check.equals && fileAttrs.includes(check.attribute))
    return { name: check.attribute, value: check.equals };
  if (selectors.length !== 1) return;
  const branch = selectors[0]!;
  const token = branch
    .slice(branch.findLastIndex(isTraversal) + 1)
    .find(
      (item): item is AttributeSelector =>
        item.type === 'attribute' && item.action === 'equals' && fileAttrs.includes(item.name),
    );
  if (token) return { name: token.name, value: token.value };
}

function missingResource(
  files: ProjectFile[],
  check: HtmlCheck,
  doc: Source,
  selectors: Selector[][],
  matched: Element[],
) {
  const target = resourceTarget(check, selectors);
  if (!target) return;
  const base = new URL(check.path, 'https://project.invalid/');
  const url = new URL(target.value, base);
  if (url.origin !== base.origin) return;
  const path = decodeURIComponent(url.pathname.slice(1));
  if (!path || files.some((file) => file.path === path)) return;
  const element = choose(matched, check);
  return {
    path: check.path,
    range: opening(doc, element, target.name),
    warning: 'missing-file' as const,
    explanation: `Adres w atrybucie ${target.name} wskazuje na ${path}, którego brakuje w projekcie. Przywróć plik pod tą nazwą, aby przeglądarka mogła go otworzyć.`,
  };
}

export function diagnoseHtmlCheck(
  files: ProjectFile[],
  check: HtmlCheck,
  status: 'passed' | 'failed' | 'manual',
  doc: Source,
  previous: HtmlCheck[],
): CodeDiagnostic | undefined {
  const branches = parseSelector(check.selector);
  const selected = doc.query(check.selector);
  const matched = selected.filter((element) => detailsMatch(element, check));
  if (status === 'passed') return missingResource(files, check, doc, branches, matched);
  const { path } = check;
  if (status === 'manual') {
    const near = selected.length ? undefined : nearAttribute(doc, branches, check, previous);
    const visible = matched.length
      ? matched
      : selected.filter(
          (item) => !servesEarlierStep(item, check.attribute ?? 'textContent', previous),
        );
    const candidate = choose(visible, check) ?? near?.[0];
    return {
      path,
      range: opening(doc, candidate, check.attribute ?? near?.[1].name),
      explanation: `Odszukaj w szablonie element pasujący do ${check.selector}. Uruchom stronę przez localhost i porównaj wygenerowany HTML z poleceniem.`,
    };
  }
  const attributeCandidate =
    check.attribute &&
    choose(
      selected.filter((item) => !servesEarlierStep(item, check.attribute!, previous)),
      check,
    );
  if (attributeCandidate && check.attribute && !matched.length) {
    const actual = attributeCandidate.attribs[check.attribute];
    if (
      actual === undefined ||
      (check.equals !== undefined && !attributeMatches(check.attribute, actual, check.equals))
    )
      return describeAttribute(check, doc, attributeCandidate, check.attribute, check.equals);
  }
  if (
    !selected.length ||
    (check.text && !matched.length && resourceTarget(check, branches)?.name === 'href')
  ) {
    const near = nearAttribute(doc, branches, check, previous);
    if (near) {
      const [candidate, attr] = near;
      if (candidate.name === 'html' && !adapter.getNodeSourceCodeLocation(candidate)?.startTag)
        return {
          path,
          explanation:
            'W pliku brakuje otwierającego znacznika <html> z językiem dokumentu. Po deklaracji <!DOCTYPE html> dodaj <html lang="pl">.',
        };
      return describeAttribute(
        check,
        doc,
        candidate,
        attr.name,
        attr.action === 'exists' ? undefined : attr.value,
      );
    }
  }
  const textCandidate =
    check.text &&
    choose(
      selected.filter((item) => !servesEarlierStep(item, 'textContent', previous)),
      check,
    );
  if (textCandidate && check.text && !matched.length) {
    const textNode = unique(textCandidate.children);
    const range =
      textNode?.type === 'text'
        ? doc.range(adapter.getNodeSourceCodeLocation(textNode))
        : undefined;
    const actual = elementText(textCandidate).trim();
    return {
      path,
      range: range ?? opening(doc, textCandidate),
      explanation: `${actual ? `W <${textCandidate.name}> jest tekst „${actual.slice(0, 120)}”.` : `Znacznik <${textCandidate.name}> jest pusty.`} Uzupełnij jego treść o „${check.text}”.`,
    };
  }
  const count = check.minCount ?? 1;
  const parent =
    count > 1 ||
    (!selected.length &&
      branches.every(
        (branch) =>
          !branch
            .slice(branch.findLastIndex(isTraversal) + 1)
            .some((token) => token.type === 'attribute'),
      ))
      ? containingElement(doc, branches)
      : undefined;
  const observation =
    count > 1
      ? `Krok wymaga co najmniej ${count} elementów pasujących do ${check.selector}. W pliku znaleziono ${matched.length}.`
      : selected.length
        ? `Liczba elementów pasujących do ${check.selector} w pliku ${path}: ${selected.length}. Żaden nie spełnia całego wymagania tego kroku.`
        : `W pliku ${path} brakuje elementu pasującego do ${check.selector}.`;
  const requirement = check.attribute
    ? ` Sprawdź atrybut ${check.attribute}${check.equals !== undefined ? `="${check.equals}"` : ''}.`
    : '';
  const action = check.text
    ? `Odszukaj lub dodaj element z tekstem „${check.text}”.`
    : `Porównaj układ znaczników${parent ? ` wewnątrz <${parent.name}>` : ''} z poleceniem kroku.`;
  return {
    path,
    range: opening(doc, parent),
    explanation: `${observation}${requirement} ${action}`,
  };
}
