import type { ExamStudyGuide, ExamStudyStep, StudyActivity, StudyCheckSpec } from '@zdaj/shared';

export const documentScaffold = `<!DOCTYPE html>
<html lang="pl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Dokument</title>
</head>
<body>
</body>
</html>
`;

export function html(
  path: string,
  selector: string,
  details: { attribute?: string; equals?: string; text?: string; minCount?: number } = {},
): StudyCheckSpec {
  return {
    id: `${path}:${selector}:${details.attribute ?? details.text ?? 'element'}`,
    title: `HTML: ${selector}`,
    kind: 'html',
    path,
    selector,
    ...details,
  };
}

export function css(
  path: string,
  entry: string,
  selector: string,
  property: string,
  expected: string[],
): StudyCheckSpec {
  return {
    id: `${selector}:${property}`,
    title: `${selector} — ${property}`,
    kind: 'css',
    path,
    entry,
    selector,
    property,
    expected,
  };
}

export function manual(prompt: string): StudyCheckSpec {
  return { id: 'manual', title: 'Kontrola samodzielna', kind: 'manual', prompt };
}

/** Examples are additions to persistent files, never a replacement initial project. */
export function edit(
  id: string,
  title: string,
  path: string,
  placement: string,
  explanation: string,
  instruction: string,
  exampleCode: string,
  checks: StudyCheckSpec[],
  why?: string,
): StudyActivity {
  const prompt =
    checks.find((check) => check.kind === 'manual')?.prompt ??
    'Sprawdź wskazany fragment i podgląd. Zielony wynik potwierdza tylko opisane kontrole, nie pełną zgodność z arkuszem.';
  return {
    id,
    title,
    targetFiles: [path],
    placement,
    explanation,
    instruction,
    exampleCode,
    why: [why ?? explanation],
    check: { type: 'self-check', prompt },
    checks: checks.map((check, index) => ({ ...check, id: `${id}-${index + 1}` })),
  };
}

export function step(
  id: string,
  title: string,
  page: number,
  fileName: string,
  requirement: string,
  activities: StudyActivity[],
): ExamStudyStep {
  const language = fileName.endsWith('.css')
    ? 'css'
    : fileName.endsWith('.js')
      ? 'javascript'
      : fileName.endsWith('.php')
        ? 'php'
        : fileName.endsWith('.html')
          ? 'html'
          : 'sql';
  return {
    id,
    title,
    page,
    fileName,
    requirement,
    language,
    explanation:
      'Pracujesz cały czas na tych samych plikach projektu. Wykonuj małe zmiany we wskazanym miejscu; nie zastępuj całego pliku przykładem.',
    code: '',
    why: [
      'Kolejne działania rozszerzają poprzednią pracę; zapisane pliki pozostają źródłem projektu.',
    ],
    commonMistakes: [
      'Nie wklejaj fragmentu w miejsce całego dokumentu.',
      'Wynik częściowej kontroli nie jest oficjalną oceną CKE.',
    ],
    checkpoint:
      'Sprawdź każdą czynność przed przejściem dalej. Kontrole ręczne wymagają rzeczywistego obejrzenia wyniku.',
    activities,
  };
}

export function project(
  steps: ExamStudyStep[],
  starterFiles: { path: string; content: string }[],
  requiredFiles: string[],
): NonNullable<ExamStudyGuide['project']> {
  return {
    starterFiles,
    requiredFiles,
    coverage: steps.flatMap((section) =>
      (section.activities ?? []).map((activity) => ({
        requirement: `${section.requirement}: ${activity.title}`,
        page: section.page ?? 1,
        activityIds: [`${section.id}/${activity.id}`],
      })),
    ),
  };
}

export function delivery(
  id: string,
  page: number,
  requiredFiles: string[],
  browserFile = 'przeglądarka.txt',
): ExamStudyStep {
  return step(
    id,
    'Sprawdź i przygotuj rezultaty',
    page,
    browserFile,
    'Dokumentacja, komplet plików i przekazanie rezultatów według końca arkusza',
    [
      edit(
        'browser-name',
        'Zapisz nazwę przeglądarki',
        browserFile,
        'Cały pusty plik tekstowy.',
        'Nazwa programu dokumentuje środowisko, w którym rzeczywiście sprawdzono stronę. Nie wpisuj przeglądarki, której nie użyłeś.',
        'Uruchom projekt lokalnie i wpisz nazwę swojej przeglądarki do tego pliku.',
        'Mozilla Firefox',
        [
          {
            id: 'browser-file',
            title: 'Plik z nazwą przeglądarki',
            kind: 'file',
            path: browserFile,
            nonEmpty: true,
          },
          manual(
            'Czy nazwa odpowiada przeglądarce, w której osobiście sprawdziłeś działanie strony?',
          ),
        ],
      ),
      edit(
        'required-files',
        'Porównaj komplet plików',
        browserFile,
        'Nie zmieniaj kodu. Otwórz listę plików i folder lokalnego projektu.',
        'Kod, grafika i zrzuty to różne rezultaty. Puste pliki lub cudze zrzuty nie dokumentują wykonania zadania.',
        `Porównaj swój folder z listą: ${requiredFiles.join(', ')}. Dodaj wymagane własne pliki.`,
        '// Lista kontrolna — tego komentarza nie dopisuj do przeglądarka.txt.',
        [
          manual(
            'Czy każdy wymagany plik istnieje, ma właściwy format i zawiera rzeczywisty rezultat Twojej pracy?',
          ),
        ],
      ),
      edit(
        'handoff',
        'Sprawdź przekazanie pracy',
        browserFile,
        'Lokalny folder rezultatów; bez dopisywania do źródeł.',
        'Arkusz opisuje folder i płytę oznaczone numerem zdającego. W treningu użyj fikcyjnego numeru; strona nie wymaga Twojego PESEL.',
        'Otwórz kopię wyeksportowanego projektu. Na prawdziwym stanowisku wykonaj również instrukcje nagrania, sprawdzenia odczytu i opisania nośnika z PDF.',
        '// Czynność ręczna poza edytorem kodu.',
        [
          manual(
            'Czy kopia otwiera się poprawnie, odnośniki działają, a przekazanie jest zgodne z instrukcją Twojego arkusza?',
          ),
        ],
      ),
    ],
  );
}
