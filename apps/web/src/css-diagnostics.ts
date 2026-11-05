import { cssLanguage } from '@codemirror/lang-css';
import type { ProjectFile, StudyCheckResult, StudyCheckSpec } from '@zdaj/shared';
import type { CodeDiagnostic } from './code-diagnostic';

type CssCheck = Extract<StudyCheckSpec, { kind: 'css' }>;
type CssNode = ReturnType<typeof cssLanguage.parser.parse>['topNode'];

// These shorthands can set the measured properties in the published courses.
const shorthands: Record<string, string[]> = {
  'background-color': ['background'],
  'border-top-color': ['border', 'border-top', 'border-color'],
  'border-top-style': ['border', 'border-top', 'border-style'],
  'border-top-width': ['border', 'border-top', 'border-width'],
  'border-top-left-radius': ['border-radius'],
  'font-family': ['font'],
  'font-weight': ['font'],
  'font-style': ['font'],
  'list-style-type': ['list-style'],
  'margin-top': ['margin'],
  'margin-left': ['margin'],
  'padding-top': ['padding'],
  'padding-right': ['padding'],
  'padding-left': ['padding'],
  'overflow-y': ['overflow'],
};

function selectors(rule: CssNode, source: string) {
  const names = [];
  for (let node = rule.firstChild; node && node.name !== 'Block'; node = node.nextSibling) {
    if (node.name.endsWith('Selector')) names.push(source.slice(node.from, node.to));
  }
  return names;
}

/** Locate an authored rule for inspection. Computed styles remain the grading evidence. */
function cssLocation(rawSource: string, check: CssCheck) {
  if (rawSource.length > 1_000_000) return;
  // CodeMirror positions are UTF-16 offsets with a single character for each line break.
  const source = rawSource.replace(/\r\n?/g, '\n');
  const expectedRule = check.selector + '{}';
  const rule = cssLanguage.parser.parse(expectedRule).topNode.getChild('RuleSet');
  if (!rule) return;
  const targets = selectors(rule, expectedRule);
  const candidates: CssNode[] = [];
  cssLanguage.parser.parse(source).iterate({
    enter(ref) {
      if (ref.name !== 'RuleSet') return;
      if (selectors(ref.node, source).some((selector) => targets.includes(selector)))
        candidates.push(ref.node);
    },
  });
  // Different rules, conditional groups or partial multi-selector matches need file-level guidance.
  const candidate = candidates[0];
  if (candidates.length !== 1 || candidate.parent?.name !== 'StyleSheet') return;
  const names = selectors(candidate, source);
  if (!targets.every((selector) => names.includes(selector))) return;
  const block = candidate.getChild('Block');
  if (!block) return;
  const accepted = [check.property, ...(shorthands[check.property] ?? [])];
  const declarations = block.getChildren('Declaration').filter((declaration) => {
    const key = declaration.getChild('PropertyName');
    return key && accepted.includes(source.slice(key.from, key.to).toLowerCase());
  });
  if (declarations.length > 1) return;
  const declaration = declarations[0];
  if (declaration)
    return { declaration: true, range: { from: declaration.from, to: declaration.to } };
  // With a missing declaration, reveal the selector where the learner can add one.
  const selectorText = source.slice(candidate.from, block.from).trimEnd();
  return {
    declaration: false,
    range: { from: candidate.from, to: candidate.from + selectorText.length },
  };
}

export function diagnoseCssCheck(
  files: ProjectFile[],
  check: CssCheck,
  result: StudyCheckResult,
): CodeDiagnostic | undefined {
  if (result.status !== 'failed' && result.status !== 'manual') return;
  const file = files.find((item) => item.path === check.path);
  const entry = files.find((item) => item.path === check.entry);
  if (!file || file.encoding === 'base64') {
    if (!entry || entry.encoding === 'base64') return;
    return {
      path: entry.path,
      explanation: `W projekcie brakuje tekstowego arkusza ${check.path}. Dodaj ten plik i sprawdź odwołanie do niego w ${entry.path}.`,
    };
  }
  if (
    entry &&
    entry.encoding !== 'base64' &&
    result.evidence.startsWith('Nie znaleziono elementu ')
  ) {
    return {
      path: entry.path,
      explanation: `W podglądzie ${entry.path} nie znaleziono elementu pasującego do selektora „${check.selector}”. Sprawdź w tym pliku znacznik i jego atrybuty, zanim zmienisz styl.`,
    };
  }
  const target = `Dla „${check.selector}” oczekiwana wartość właściwości ${check.property} to ${check.expected.join(' lub ')}.`;
  const location = cssLocation(file.content, check);
  let action = `W ${file.path} odszukaj reguły wpływające na ${check.property} tego elementu.`;
  if (location)
    action = location.declaration
      ? `Porównaj zaznaczoną deklarację w ${file.path} z tym wymaganiem.`
      : `W zaznaczonej regule w ${file.path} możesz ustawić właściwość ${check.property}.`;
  else if (!file.content.trim())
    action = `Plik ${file.path} jest pusty. Dodaj regułę dla „${check.selector}” i ustaw w niej ${check.property}.`;
  if (result.status === 'failed' && location?.declaration)
    action += ` Jeśli wartość jest już poprawna, sprawdź w narzędziach przeglądarki, która reguła nadaje styl elementowi.`;
  const explanation =
    result.status === 'manual'
      ? `${target} ${entry ? `Uruchom stronę ${check.entry} na lokalnym serwerze i sprawdź styl elementu w przeglądarce.` : `Dodaj brakujący plik strony ${check.entry}, aby zobaczyć działanie stylu.`} ${action}`
      : `Podgląd pokazuje „${result.evidence}”. ${target} ${action}`;
  return { path: file.path, explanation, range: location?.range };
}
