import type { ProjectFile, StudyCheckResult, StudyCheckSpec } from '@zdaj/shared';
import type { CodeDiagnostic } from './code-diagnostic';
import { diagnoseHtmlCheck, htmlSource } from './course-diagnostics-html';
import { diagnoseCssCheck } from './css-diagnostics';

/** Derive guidance from the checks in the learner's pinned guide. Never change a result. */
export function diagnoseCourseChecks(
  files: ProjectFile[],
  checks: StudyCheckSpec[],
  results: StudyCheckResult[],
  targetFiles: string[],
  previousChecks: StudyCheckSpec[] = [],
): (CodeDiagnostic | undefined)[] {
  const sources = new Map<string, ReturnType<typeof htmlSource>>();
  const textFile = (path: string) =>
    files.find((file) => file.path === path && file.encoding !== 'base64');
  return results.map((result, index) => {
    const check = checks[index];
    if (!check || check.id !== result.id || result.status === 'error') return;
    if (check.kind === 'css') {
      try {
        return diagnoseCssCheck(files, check, result);
      } catch {
        if (result.status !== 'passed' && textFile(check.path))
          return {
            path: check.path,
            explanation: `W pliku ${check.path} odszukaj regułę dla ${check.selector} i porównaj właściwość ${check.property} z poleceniem.`,
          };
        return;
      }
    }
    if (check.kind === 'html') {
      if (result.status === 'unsupported') return;
      const file = textFile(check.path);
      if (!file) return;
      if (
        result.status === 'passed' &&
        !/\b(?:src|href|action)\b/.test(`${check.attribute} ${check.selector}`)
      )
        return;
      if (file.content.length > 1_000_000) {
        if (result.status !== 'passed')
          return {
            path: file.path,
            explanation: `W pliku ${file.path} odszukaj element pasujący do ${check.selector} i porównaj go z poleceniem.`,
          };
        return;
      }
      try {
        let doc = sources.get(file.path);
        if (!doc) {
          doc = htmlSource(file.content);
          sources.set(file.path, doc);
        }
        const neighbours = [...previousChecks, ...checks].filter(
          (item): item is Extract<StudyCheckSpec, { kind: 'html' }> =>
            item.kind === 'html' && item !== check && item.path === check.path,
        );
        return diagnoseHtmlCheck(files, check, result.status, doc, neighbours);
      } catch {
        // An old imported selector or unusually complex markup must never hide a completed check.
        if (result.status === 'failed')
          return {
            path: file.path,
            explanation: `Otwórz ${file.path} i porównaj element ${check.selector} z poleceniem kroku.`,
          };
      }
      return;
    }
    if (result.status === 'passed') return;
    if (check.kind === 'file') {
      const file = textFile(check.path);
      if (file && check.nonEmpty && !file.content.trim())
        return {
          path: file.path,
          explanation: `Plik ${file.path} jest pusty. Otwórz go i wpisz treść wymaganą w tym kroku.`,
        };
      return;
    }
    const target = targetFiles.find(
      (path) => /\.(?:html?|php|css|js|sql)$|(?:^|\/)kwerendy\.txt$/i.test(path) && textFile(path),
    );
    if (!target) return;
    if (check.kind === 'runtime') {
      const explanation =
        result.status === 'failed'
          ? `Otwórz ${target} i sprawdź obsługę zdarzenia opisanego w raporcie. Uruchom ponownie ten sam scenariusz po zmianie kodu.`
          : `Otwórz ${target} i przejdź przez scenariusz kroku w podglądzie lub lokalnej przeglądarce.`;
      return { path: target, explanation };
    }
    if (result.status === 'manual')
      return {
        path: target,
        explanation: `Porównaj kod w ${target} z punktem kontroli ręcznej powyżej.`,
      };
  });
}
