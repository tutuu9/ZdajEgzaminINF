import type { ProjectFile, StudyCheckResult, StudyCheckSpec } from '@zdaj/shared';
import { createPreview, inertDocument } from './preview';

/** Compare HTML semantics without requiring the spelling of one example solution. */
export function attributeMatches(name: string, actual: string | null, expected: string) {
  if (actual === null) return false;
  if (['lang', 'charset', 'method', 'type', 'rel'].includes(name.toLowerCase())) {
    const normalize = (value: string) =>
      name.toLowerCase() === 'charset'
        ? value
            .trim()
            .toLowerCase()
            .replace(/^utf8$/, 'utf-8')
        : value.trim().toLowerCase();
    return normalize(actual) === normalize(expected);
  }
  if (['href', 'src', 'action'].includes(name.toLowerCase())) {
    try {
      return (
        new URL(actual, 'https://project.invalid/').href ===
        new URL(expected, 'https://project.invalid/').href
      );
    } catch {
      return actual === expected;
    }
  }
  return actual === expected;
}

export async function filesHash(files: ProjectFile[]): Promise<string> {
  const source = JSON.stringify(
    files
      .map((file) => ({
        path: file.path,
        content: file.content,
        encoding: file.encoding ?? 'utf8',
      }))
      .sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0)),
  );
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(source));
  return [...new Uint8Array(bytes)].map((value) => value.toString(16).padStart(2, '0')).join('');
}

export async function checkProjectLocally(
  files: ProjectFile[],
  checks: StudyCheckSpec[],
): Promise<StudyCheckResult[]> {
  const results: StudyCheckResult[] = [];
  for (const check of checks) {
    const result: StudyCheckResult = {
      id: check.id,
      title: check.title,
      status: 'unsupported',
      evidence: '',
      recommendation: '',
    };
    try {
      if (check.kind === 'manual') {
        result.status = 'manual';
        result.evidence = 'Ten punkt wymaga samodzielnego potwierdzenia.';
        result.recommendation = check.prompt;
      } else if (check.kind === 'runtime') {
        result.evidence = 'Zachowanie skryptu sprawdza osobny wykonawca.';
        result.recommendation =
          'Uruchom sprawdzenie lub skorzystaj z jawnej kontroli ręcznej, gdy wykonawca jest niedostępny.';
      } else {
        const file = files.find((item) => item.path === check.path);
        if (!file) {
          result.status = 'failed';
          result.evidence = `Brakuje pliku ${check.path}.`;
          result.recommendation = 'Utwórz plik o nazwie wskazanej w poleceniu.';
        } else if (check.kind === 'file') {
          result.status = !check.nonEmpty || file.content.trim() ? 'passed' : 'failed';
          result.evidence =
            result.status === 'passed'
              ? `Plik ${check.path} jest dostępny.`
              : 'Plik jest jeszcze pusty.';
          result.recommendation =
            result.status === 'failed' ? 'Uzupełnij go zgodnie z tym krokiem.' : '';
        } else if (check.kind === 'html') {
          if (file.encoding === 'base64' || /<\?(?:php|=)/i.test(file.content)) {
            result.status = 'manual';
            result.evidence = 'Plik zawiera PHP. Ta kontrola lokalna nie uruchamia PHP.';
            result.recommendation = 'Sprawdź wynik w lokalnym środowisku PHP według instrukcji.';
          } else {
            const { root } = inertDocument(file.content);
            const elements = [...root.querySelectorAll(check.selector)];
            if (root.matches(check.selector)) elements.unshift(root);
            const matching = elements.filter(
              (element) =>
                (!check.attribute ||
                  (check.equals === undefined
                    ? element.hasAttribute(check.attribute)
                    : attributeMatches(
                        check.attribute,
                        element.getAttribute(check.attribute),
                        check.equals,
                      ))) &&
                (!check.text || element.textContent?.replace(/\s+/g, ' ').includes(check.text)),
            );
            result.status = matching.length >= (check.minCount ?? 1) ? 'passed' : 'failed';
            result.evidence = `Znaleziono ${matching.length} pasujących elementów (${check.selector}).`;
            result.recommendation =
              result.status === 'passed'
                ? ''
                : `Sprawdź ${check.attribute ? `atrybut ${check.attribute}${check.equals !== undefined ? `="${check.equals}"` : ''}` : check.text ? `treść „${check.text}”` : 'strukturę elementu'} w pliku ${check.path}.`;
          }
        } else if (check.kind === 'css') {
          const entry = files.find((item) => item.path === check.entry);
          if (!entry || /<\?(?:php|=)/i.test(entry.content)) {
            result.status = 'manual';
            result.evidence = 'Brakuje statycznego widoku HTML do bezpiecznego pomiaru stylu.';
            result.recommendation = 'Sprawdź ten styl w przeglądarce lokalnego serwera PHP.';
          } else {
            const values = await computedValues(files, check.entry, check.selector, check.property);
            result.status =
              values.length > 0 &&
              values.every((value) =>
                check.expected.some(
                  (expected) => value.trim().toLowerCase() === expected.trim().toLowerCase(),
                ),
              )
                ? 'passed'
                : 'failed';
            result.evidence = values.length
              ? `${check.property}: ${[...new Set(values)].join(', ')}`
              : `Nie znaleziono elementu ${check.selector}.`;
            result.recommendation =
              result.status === 'passed'
                ? ''
                : `Oczekiwano ${check.property}: ${check.expected.join(' lub ')}. Sprawdź selektor i podłączenie arkusza CSS.`;
          }
        }
      }
    } catch {
      result.status = 'error';
      result.evidence = 'Nie udało się bezpiecznie wykonać tego sprawdzenia.';
      result.recommendation = 'Zachowaj kod i ponów sprawdzenie. To nie jest ocena Twojej pracy.';
    }
    results.push(result);
  }
  return results;
}

async function computedValues(
  files: ProjectFile[],
  entry: string,
  selector: string,
  property: string,
): Promise<string[]> {
  const frame = document.createElement('iframe');
  // Same-origin allows reading styles; scripts are forbidden by sandbox AND removed from the source.
  frame.setAttribute('sandbox', 'allow-same-origin');
  frame.setAttribute('aria-hidden', 'true');
  frame.tabIndex = -1;
  frame.inert = true;
  frame.style.cssText =
    'position:fixed;left:-10000px;top:0;width:1280px;height:800px;visibility:hidden;pointer-events:none';
  const preview = createPreview(files, entry, {
    scripts: false,
    preserveResourceAttributes: true,
  });
  try {
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Style inspection timeout')), 2500);
      frame.onload = () => {
        clearTimeout(timer);
        resolve();
      };
      frame.srcdoc = preview.html;
      document.body.append(frame);
    });
    const doc = frame.contentDocument,
      view = frame.contentWindow;
    return doc && view
      ? [...doc.querySelectorAll(selector)].map((element) =>
          view.getComputedStyle(element).getPropertyValue(property),
        )
      : [];
  } finally {
    frame.remove();
    preview.dispose();
  }
}
