import type { ExamStudyStep, ProjectFile, StudyActivity, StudyCheckSpec } from '@zdaj/shared';
import { adapter } from 'parse5-htmlparser2-tree-adapter';
import { parse as parseSelector } from 'css-what';
import { htmlSource } from '../course-diagnostics-html';
import { indexInspectorCss } from '../inspector/css-index';
import { explainTag } from '../inspector/explanations';
import type { InspectionSource } from '../inspector/types';
import { reviewedPropertyExplanation } from './explanations';

export interface ChangePrediction {
  id: string;
  question: string;
  options: { id: string; label: string; explanation: string }[];
  correctOptionId: string;
}

export interface ChangeLesson {
  id: string;
  kind: 'html' | 'css';
  title: string;
  explanation: string;
  watchFor: string;
  diagram?: 'spacing' | 'flow' | 'html';
  prediction?: ChangePrediction;
  targetFiles: string[];
  entry?: string;
}

type HtmlCheck = Extract<StudyCheckSpec, { kind: 'html' }>;
type CssCheck = Extract<StudyCheckSpec, { kind: 'css' }>;
const htmlPath = /\.html?$/i;
const textPath = /\.(?:html?|css|php)$/i;
const maxSource = 200_000;
function preferredCssCheck(activity: StudyActivity): CssCheck | undefined {
  const checks = (activity.checks ?? []).filter((check): check is CssCheck => check.kind === 'css');
  return (
    checks.find((check) =>
      /^(?:padding|margin|(?:row-|column-)?gap)(?:-|$)/i.test(check.property),
    ) ?? checks[0]
  );
}
const tagExplanation = (tag: string) => {
  const explanation = explainTag(tag);
  return typeof explanation === 'string' ? explanation : undefined;
};

/** Activity metadata selects a teaching aid; it never changes a published requirement. */
export function isChangeUnderstandActivity(step: ExamStudyStep, activity: StudyActivity) {
  const checks = activity.checks ?? [];
  if (/^(?:javascript|js|typescript|ts|sql)$/i.test(step.language)) return false;
  if (checks.some((check) => check.kind === 'runtime')) return false;
  if (checks.some((check) => check.kind === 'html' || check.kind === 'css')) return true;
  if (step.activities?.some((sibling) => sibling.checks?.some((check) => check.kind === 'runtime')))
    return false;
  if (!/^(?:html|css)$/i.test(step.language)) return false;
  const paths = activity.targetFiles?.length ? activity.targetFiles : [step.fileName];
  return paths.some((path) => /\.(?:html?|css)$/i.test(path));
}

function prediction(
  id: string,
  question: string,
  correct: string,
  alternative: string,
  explanation: string,
): ChangePrediction {
  const options = [
    { id: 'meaning', label: correct, explanation },
    { id: 'other', label: alternative, explanation },
  ];
  return {
    id,
    question,
    correctOptionId: 'meaning',
    options: id.length % 2 ? options.reverse() : options,
  };
}

function cssConcept(property: string): Omit<ChangeLesson, 'targetFiles' | 'entry'> {
  const meaning = reviewedPropertyExplanation(property);
  const base = meaning ? property.replace(/^(padding|margin)-.+$/, '$1') : property;
  const common = {
    id: `css-${property}`,
    kind: 'css' as const,
    title: `Jedna właściwość: ${property}`,
    explanation:
      meaning ??
      `Ten krok dotyczy właściwości ${property}. Jej wymaganą wartość odczytaj z polecenia kroku i oryginalnego PDF.`,
    watchFor:
      'Porównaj ten sam element w widoku Przed i Po. Inne reguły, dziedziczenie i szerokość podglądu mogą wpływać na wynik.',
  };
  if (base === 'padding' || base === 'margin') {
    const inner = base === 'padding';
    return {
      ...common,
      title: inner ? 'Odstęp wewnątrz: padding' : 'Odstęp na zewnątrz: margin',
      diagram: 'spacing',
      prediction: prediction(
        common.id,
        `Który odstęp warto obserwować po zmianie ${property}?`,
        inner ? 'Między treścią a obramowaniem' : 'Na zewnątrz obramowania',
        inner ? 'Na zewnątrz obramowania' : 'Między treścią a obramowaniem',
        common.explanation,
      ),
    };
  }
  if (['gap', 'row-gap', 'column-gap'].includes(property))
    return {
      ...common,
      diagram: 'flow',
      prediction: prediction(
        common.id,
        'Co porównasz, zmieniając gap w układzie flex lub grid?',
        'Przerwy pomiędzy elementami układu',
        'Wewnętrzny odstęp każdego elementu od jego ramki',
        'Gap tworzy przerwy w obsługiwanym układzie. Padding dotyczy wnętrza pojedynczego elementu.',
      ),
    };
  if (
    ['display', 'flex-direction', 'flex-wrap', 'justify-content', 'align-items'].includes(property)
  )
    return {
      ...common,
      diagram: 'flow',
      prediction:
        property === 'display'
          ? prediction(
              common.id,
              'Co może zmienić display: flex na kontenerze?',
              'Sposób ułożenia jego bezpośrednich dzieci',
              'Nazwy plików HTML w projekcie',
              'Flex organizuje układ dzieci kontenera. Nie zmienia ich treści ani nazw plików.',
            )
          : undefined,
    };
  if (['color', 'background', 'background-color'].includes(property)) {
    const text = property === 'color';
    return {
      ...common,
      prediction: prediction(
        common.id,
        `Na którą część elementu wpływa ${property}?`,
        text ? 'Na kolor tekstu' : 'Na tło elementu',
        text ? 'Wyłącznie na kolor tła' : 'Wyłącznie na kolor liter',
        text
          ? 'Color określa kolor tekstu. Tło ustawiasz przez background lub background-color.'
          : 'Background dotyczy tła. Kolor tekstu ustawiasz oddzielną właściwością color.',
      ),
    };
  }
  if (/^(?:(?:min|max)-)?(?:width|height)$/.test(property))
    return {
      ...common,
      diagram: 'spacing',
      prediction: prediction(
        common.id,
        'Czy zadany rozmiar zawsze obejmuje padding i border?',
        'Nie, trzeba sprawdzić box-sizing',
        'Tak, niezależnie od box-sizing',
        'Przy content-box szerokość dotyczy treści. Przy border-box obejmuje także padding i border; układ i ograniczenia mogą wpłynąć na wynik.',
      ),
    };
  return common;
}

function selectorTag(selector: string) {
  try {
    const tags = parseSelector(selector).map(
      (branch) => branch.filter((token) => token.type === 'tag').at(-1)?.name,
    );
    if (tags.length && tags.every((tag) => tag === tags[0])) return tags[0]?.toLowerCase();
  } catch {
    // Unsupported selector syntax gets the general structure explanation.
  }
}

function htmlConcept(check?: HtmlCheck): Omit<ChangeLesson, 'targetFiles' | 'entry'> {
  const attribute = check?.attribute?.toLowerCase();
  const selector = check?.selector ?? '';
  const tag = selectorTag(selector);
  if (attribute === 'lang')
    return {
      id: 'html-lang',
      kind: 'html',
      title: 'Język dokumentu: lang',
      diagram: 'html',
      explanation:
        'Lang opisuje język treści dokumentu. Pomaga m.in. czytnikom ekranu; nie tłumaczy napisów i nie ustawia kodowania.',
      watchFor:
        'Zmiana języka może nie dać widocznej różnicy. Sprawdź atrybut w swoim kodzie, a nie tylko wygląd strony.',
      prediction: prediction(
        'html-lang',
        'Czy lang="pl" przetłumaczy angielski tekst strony?',
        'Nie, opisuje język już napisanej treści',
        'Tak, automatycznie zmieni napisy na polskie',
        'Lang informuje narzędzia o języku. Treść tekstu zmieniasz samodzielnie.',
      ),
    };
  if (attribute === 'charset' || /\bcharset\b/i.test(selector))
    return {
      id: 'html-charset',
      kind: 'html',
      title: 'Polskie znaki i kodowanie',
      diagram: 'html',
      explanation:
        'Meta charset informuje przeglądarkę, jak odczytać znaki w pliku. UTF-8 obsługuje m.in. ą, ć, ł i ż; plik również musi być zapisany w tym kodowaniu.',
      watchFor:
        'Podgląd przeglądarkowy używa już tekstu Unicode. Poprawną deklarację sprawdź w kodzie, a zapisany plik także w lokalnym środowisku.',
    };
  if (tag === 'link')
    return {
      id: 'html-stylesheet',
      kind: 'html',
      title: 'Połącz HTML z własnym CSS',
      diagram: 'html',
      explanation:
        'Link z rel="stylesheet" wskazuje arkusz CSS. Href musi prowadzić do istniejącego pliku względem położenia strony HTML.',
      watchFor:
        'Sprawdź pisownię nazwy i folderu. Samo dodanie link nie utworzy brakującego pliku CSS.',
      prediction: prediction(
        'html-stylesheet',
        'Czy href="styl.css" utworzy plik styl.css?',
        'Nie, plik musi już istnieć w projekcie',
        'Tak, przeglądarka sama go zapisze',
        'Href jest adresem zasobu. Plik tworzysz i zapisujesz oddzielnie.',
      ),
    };
  if (tag === 'img')
    return {
      id: 'html-image',
      kind: 'html',
      title: 'Obraz: źródło i opis',
      diagram: 'html',
      explanation: tagExplanation('img')!,
      watchFor:
        'Porównaj właściwy obraz i jego opis alt. Rozmiar nadany przez CSS nie zmienia rozmiarów pliku graficznego wymaganych w arkuszu.',
      prediction: prediction(
        'html-image',
        'Który atrybut wskazuje plik obrazu?',
        'Src',
        'Alt',
        'Src wskazuje zasób. Alt opisuje znaczenie obrazu, gdy nie można go zobaczyć.',
      ),
    };
  if (tag === 'a' || attribute === 'href')
    return {
      id: 'html-link',
      kind: 'html',
      title: 'Tekst odnośnika i jego cel',
      diagram: 'html',
      explanation:
        'Tekst między <a> i </a> to podpis odnośnika. Href określa jego cel; napis „Kontakt” sam nie wskazuje pliku kontakt.html.',
      watchFor:
        'Sprawdź podpis oraz href i istnienie pliku. W porównaniu statycznym nawigacja jest wyłączona; działanie odnośnika sprawdzisz w zwykłym podglądzie.',
      prediction: prediction(
        'html-link',
        'Czy zmiana napisu odnośnika zmienia także jego href?',
        'Nie, to dwa oddzielne miejsca w HTML',
        'Tak, cel wynika z napisu',
        'Podpis jest treścią elementu, a adres jest wartością atrybutu href.',
      ),
    };
  if (tag && ['form', 'label', 'input', 'select', 'textarea', 'button', 'option'].includes(tag))
    return {
      id: 'html-form',
      kind: 'html',
      title: 'Nazwij i uporządkuj pola formularza',
      diagram: 'html',
      explanation: tagExplanation(tag)!,
      watchFor:
        'Porównaj widoczne etykiety, typy pól i ich kolejność. To porównanie nie wysyła formularza i nie sprawdza działania PHP ani JavaScript.',
      prediction:
        tag === 'label'
          ? prediction(
              'html-form',
              'Do czego powinien prowadzić atrybut for w label?',
              'Do id odpowiadającego pola',
              'Do nazwy pliku CSS',
              'For łączy etykietę z polem przez jego id. Dzięki temu etykieta opisuje właściwą kontrolkę.',
            )
          : undefined,
    };
  return {
    id: tag ? `html-${tag}` : 'html-structure',
    kind: 'html',
    title: tag ? `Znacznik <${tag}> w strukturze strony` : 'Struktura HTML krok po kroku',
    explanation:
      (tag && tagExplanation(tag)) ||
      'HTML opisuje strukturę dokumentu. Znacznik otwierający, treść i znacznik zamykający określają element; część znaczników, np. img, nie ma znacznika zamykającego.',
    watchFor:
      'Zmieniaj tylko fragment opisany w poleceniu. Porównaj jego miejsce, treść i zagnieżdżenie, zachowując wcześniej napisane elementy.',
    diagram: 'html',
    prediction:
      tag && ['ul', 'ol', 'li'].includes(tag)
        ? prediction(
            'html-list',
            'Gdzie powinien znaleźć się element li należący do listy?',
            'Wewnątrz ul lub ol',
            'Poza całą listą',
            'Li jest pozycją listy. Zagnieżdżenie określa jej strukturę, a CSS nadaje wygląd.',
          )
        : undefined,
  };
}

export function getChangeLesson(
  step: ExamStudyStep,
  activity: StudyActivity,
): ChangeLesson | undefined {
  if (!isChangeUnderstandActivity(step, activity)) return;
  const css = preferredCssCheck(activity);
  const html = activity.checks?.find((check): check is HtmlCheck => check.kind === 'html');
  const paths = [
    ...new Set(
      [
        ...(activity.targetFiles ?? []),
        ...(activity.checks ?? []).flatMap((check) =>
          check.kind === 'html' || check.kind === 'css' ? [check.path] : [],
        ),
        step.fileName,
      ].filter((path) => textPath.test(path)),
    ),
  ];
  const concept = css
    ? cssConcept(css.property.toLowerCase())
    : !html && step.language.toLowerCase() === 'css'
      ? {
          id: 'css-rule',
          kind: 'css' as const,
          title: 'Selektor i deklaracje CSS',
          explanation:
            'Selektor wskazuje elementy. W nawiasach klamrowych zapisujesz deklaracje: właściwość, dwukropek i wartość. Nie każda zmiana musi od razu dać widoczny efekt.',
          watchFor:
            'Odczytaj wymaganie kroku, zmień jedną deklarację i porównaj tę samą stronę przy tej samej szerokości.',
        }
      : htmlConcept(html);
  return {
    ...concept,
    targetFiles: paths,
    entry: css?.entry ?? html?.path ?? paths.find((path) => htmlPath.test(path)),
  };
}

/** Navigation is a source lookup, not an assertion that a particular rule wins the cascade. */
export function findActivitySource(
  files: ProjectFile[],
  step: ExamStudyStep,
  activity: StudyActivity,
): InspectionSource | undefined {
  const lesson = getChangeLesson(step, activity);
  if (!lesson) return;
  const check =
    preferredCssCheck(activity) ??
    activity.checks?.find((item): item is HtmlCheck => item.kind === 'html');
  const path = check && 'path' in check ? check.path : lesson.targetFiles[0];
  if (!path) return;
  const file = files.find((item) => item.path === path && item.encoding !== 'base64');
  if (!file)
    return { path, note: 'Tego pliku jeszcze nie ma. Utwórz go zgodnie z poleceniem kroku.' };
  if (file.content.length > maxSource)
    return {
      path,
      note: 'Plik jest zbyt duży, aby bezpiecznie wyznaczyć fragment. Odszukaj wymaganie kroku w tym pliku.',
    };
  try {
    if (check?.kind === 'html') {
      const source = htmlSource(file.content);
      const candidates = source.query(check.selector);
      if (candidates.length === 1) {
        const location = adapter.getNodeSourceCodeLocation(candidates[0]!);
        const range = source.range(
          check.attribute
            ? (location?.attrs?.[check.attribute] ?? location?.startTag)
            : location?.startTag,
        );
        if (range) return { path, range };
      }
    } else if (check?.kind === 'css' && /\.css$/i.test(path)) {
      const rules = indexInspectorCss({ path, css: file.content, idPrefix: 'change-source' });
      const candidates = rules.filter((rule) => rule.selector.trim() === check.selector.trim());
      const declarations = candidates.flatMap((rule) =>
        rule.declarations.filter((item) => item.property === check.property.toLowerCase()),
      );
      if (declarations.length === 1) return declarations[0]!.source;
      if (declarations.length === 0 && candidates.length === 1) return candidates[0]!.source;
    }
  } catch {
    // Partial learner code and unsupported selectors still get a useful file-level link.
  }
  return {
    path,
    note: 'Odszukaj fragment opisany w bieżącym kroku. Nie można wskazać jednego pewnego miejsca w aktualnym kodzie.',
  };
}
