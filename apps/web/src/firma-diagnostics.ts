import type { ProjectFile, StudyCheckResult, StudyCheckSpec } from '@zdaj/shared';
import { parse, type DefaultTreeAdapterMap } from 'parse5';
import { attributeMatches } from './project-checks';
import type { CodeDiagnostic } from './code-diagnostic';

type Element = DefaultTreeAdapterMap['element'];
type Node = DefaultTreeAdapterMap['node'];

const lessonFiles = new Map([
  ['structure/document', 'index.html'],
  ['structure/stylesheet', 'index.html'],
  ['common/home-link', 'index.html'],
  ['common/other-links', 'index.html'],
  ['services/shared-shell', 'uslugi.html'],
  ['contact/shared-shell', 'kontakt.html'],
]);
const menuLabels = new Map([
  ['index.html', 'Strona Główna'],
  ['uslugi.html', 'Usługi'],
  ['kontakt.html', 'Kontakt'],
]);

function elementsIn(source: string) {
  // CodeMirror measures UTF-16 offsets in a document with LF line breaks.
  const document = parse(source.replace(/\r\n?/g, '\n'), { sourceCodeLocationInfo: true });
  const elements: Element[] = [];
  const pending: Node[] = [document];
  while (pending.length) {
    const node = pending.pop()!;
    if ('tagName' in node && node.namespaceURI === 'http://www.w3.org/1999/xhtml') {
      elements.push(node);
    }
    if ('childNodes' in node) {
      for (const child of node.childNodes) pending.push(child);
    }
  }
  return elements;
}

function attribute(element: Element, name: string) {
  return element.attrs.find((attr) => attr.name === name)?.value;
}

function sourceRange(element: Element | undefined, name: string): CodeDiagnostic['range'] {
  const location = element?.sourceCodeLocation;
  const span =
    element && attribute(element, name) !== undefined
      ? location?.attrs?.[name]
      : location?.startTag;
  return span && { from: span.startOffset, to: span.endOffset };
}

function linkLabel(element: Element) {
  const label = attribute(element, 'aria-label');
  if (label?.trim()) return label.trim();
  const parts: string[] = [];
  const pending: Node[] = [element];
  while (pending.length) {
    const node = pending.pop()!;
    if ('value' in node) parts.push(node.value);
    else if ('tagName' in node && node.tagName === 'img') parts.push(attribute(node, 'alt') ?? '');
    else if ('childNodes' in node) {
      for (let i = node.childNodes.length - 1; i >= 0; i--) pending.push(node.childNodes[i]!);
    }
  }
  return parts.join('').replace(/\s+/g, ' ').trim();
}

function unique(elements: Element[]) {
  return elements.length === 1 ? elements[0] : undefined;
}

function inLandmark(link: Element, tag: string, role: string) {
  let parent = link.parentNode;
  while (parent && 'tagName' in parent) {
    if (parent.tagName === tag || attribute(parent, 'role')?.trim().toLowerCase() === role)
      return true;
    parent = parent.parentNode;
  }
  return false;
}

function menuLink(links: Element[], label: string) {
  const navigation = links.filter((link) => inLandmark(link, 'nav', 'navigation'));
  const candidates = navigation.length
    ? navigation
    : links.filter((link) => !inLandmark(link, 'footer', 'contentinfo'));
  return unique(
    candidates.filter(
      (link) => linkLabel(link).toLocaleLowerCase('pl') === label.toLocaleLowerCase('pl'),
    ),
  );
}

function languageDiagnostic(path: string, elements: Element[]): CodeDiagnostic {
  const html = elements.find((element) => element.tagName === 'html');
  const actual = html && attribute(html, 'lang');
  if (actual === undefined && !html?.sourceCodeLocation?.startTag) {
    return {
      path,
      explanation: `W pliku ${path} brakuje otwierającego znacznika <html>. Na początku dokumentu, po deklaracji <!doctype html>, dodaj <html lang="pl">, aby określić język strony.`,
    };
  }
  const explanation =
    actual === undefined
      ? `W pliku ${path} brakuje języka dokumentu. W otwierającym znaczniku <html> dodaj lang="pl", aby określić język strony.`
      : `W znaczniku <html> masz lang="${actual}". Arkusz wymaga języka polskiego. Zmień wartość atrybutu na „pl”.`;
  return { path, explanation, range: sourceRange(html, 'lang') };
}

function linkDiagnostic(
  path: string,
  elements: Element[],
  expected: string,
  label: string | undefined,
  targetExists: boolean,
  passed: boolean,
): CodeDiagnostic | undefined {
  const links = label
    ? elements.filter((element) => element.tagName === 'a')
    : elements.filter(
        (element) =>
          element.tagName === 'link' && attribute(element, 'rel')?.toLowerCase() === 'stylesheet',
      );
  const matchesTarget = (link: Element) =>
    attributeMatches('href', attribute(link, 'href') ?? null, expected);
  const link = label ? menuLink(links, label) : unique(links);
  // Guide v1 accepts the expected href anywhere. A named menu item can still point elsewhere.
  const menuMismatch = label && link && !matchesTarget(link);
  if (passed && !menuMismatch) {
    if (targetExists) return;
    const linked = label ? link : unique(links.filter(matchesTarget));
    return {
      path,
      explanation: `Adres w href jest poprawny, ale w projekcie brakuje pliku ${expected}. Przywróć go, aby ${label ? 'odnośnik otwierał stronę' : 'przeglądarka wczytała style'}.`,
      range: sourceRange(linked, 'href'),
      warning: 'missing-file',
    };
  }

  const subject = label ? `odnośnik „${label}”` : 'odnośnik do arkusza stylów';
  const actual = link && attribute(link, 'href');
  const observation = !link
    ? `W pliku ${path} odszukaj lub dodaj ${label ? `w menu ${subject}` : `w <head> znacznik <link rel="stylesheet">`}.`
    : actual === undefined
      ? `W pliku ${path} ${subject} nie ma atrybutu href.`
      : `W pliku ${path} ${subject} wskazuje na „${actual}”.`;
  const instruction = targetExists
    ? `W projekcie masz plik ${expected}. Ustaw href tak, aby ${label ? 'otwierał tę stronę' : 'wskazywał ten arkusz stylów'}.`
    : `Arkusz wymaga pliku ${expected}. Przywróć ten plik w projekcie i wpisz jego nazwę w href.`;
  return {
    path,
    explanation: `${observation} ${instruction}`,
    range: sourceRange(link, 'href'),
    warning: passed ? 'menu-target' : undefined,
  };
}

/** Attach advice to the original check ordinal: two menu checks in guide v1 share their ID. */
export function diagnoseFirmaChecks(
  files: ProjectFile[],
  checks: StudyCheckSpec[],
  results: StudyCheckResult[],
  activityId: string,
): (CodeDiagnostic | undefined)[] {
  const path = lessonFiles.get(activityId);
  const file = files.find((item) => item.path === path);
  let elements: Element[] | undefined;
  return results.map((result, index) => {
    const check = checks[index];
    if (
      !file ||
      file.encoding === 'base64' ||
      check?.kind !== 'html' ||
      check.path !== file.path ||
      check.id !== result.id
    )
      return;
    if (result.status !== 'failed' && result.status !== 'passed') return;

    if (check.selector === 'html[lang|="pl" i]') {
      if (result.status === 'failed')
        return languageDiagnostic(file.path, (elements ??= elementsIn(file.content)));
      return;
    }
    if (check.attribute !== 'href' || !check.equals) return;
    const menuLabel = check.selector === 'a' ? menuLabels.get(check.equals) : undefined;
    const stylesheet = check.selector === 'link[rel="stylesheet"]' && check.equals === 'styl.css';
    if (!menuLabel && !stylesheet) return;
    const targetExists = files.some((item) => item.path === check.equals);
    if (result.status === 'passed' && targetExists && stylesheet) return;
    return linkDiagnostic(
      file.path,
      (elements ??= elementsIn(file.content)),
      check.equals,
      menuLabel,
      targetExists,
      result.status === 'passed',
    );
  });
}
