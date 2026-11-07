import type { ExamStudyGuide, ExamStudyStep, StudyActivity } from '@zdaj/shared';
import { emmetExamples, type EmmetExample } from './catalog';

export interface EmmetTeachingTip {
  example: EmmetExample;
  fileName: string;
  placement: string;
  note?: string;
}

type ExampleKey = keyof typeof emmetExamples;
type TipSpec = { example: ExampleKey; abbreviation?: string };
type GuideTips = {
  id: string;
  version: number;
  activities: Record<string, TipSpec>;
};
const tip = (example: ExampleKey, abbreviation?: string): TipSpec => ({ example, abbreviation });
const text = (tag: string): TipSpec => tip('text', `${tag}{Treść}`);
const element = (tag: string): TipSpec => tip('element', tag);

/** Reviewed against the published cumulative guides. No private guide content is bundled here. */
export const emmetGuideBindings: Record<string, GuideTips> = {
  'cke-wedkowanie': {
    id: 'cke-wedkowanie-study',
    version: 3,
    activities: {
      'html/document': tip('document'),
      'html/head': tip('stylesheet'),
      'html/main-blocks': tip('siblings'),
      'html/sections': tip('identifier'),
      'html/banner-footer': text('h1'),
      'html/river-list': element('ol'),
      'html/predator-heading': text('h3'),
      'html/table': tip('table'),
      'html/image': tip('image'),
      'html/download': tip('link'),
    },
  },
  'inf03-01-25-01-sg': {
    id: 'kursy-komputerowe-study',
    version: 3,
    activities: {
      'structure/document': tip('document'),
      'structure/title': text('title'),
      'structure/stylesheet': tip('stylesheet'),
      'structure/blocks': tip('siblings', 'header+nav+main+footer'),
      'structure/banner': tip('image'),
      'structure/home-link': tip('link'),
      'structure/other-links': tip('link'),
      'structure/footer': text('p'),
      'structure/second-page': tip('stylesheet'),
      'home/heading': text('h3'),
      'home/table-header': tip('table'),
      'home/react-row': tip('cells'),
      'home/javascript-row': tip('cells'),
      'home/contact-list': tip('list', 'ul>li*2'),
      'home/mail': tip('link'),
      'controls/heading': text('h3'),
      'controls/react-control': tip('input', 'input[type="checkbox"]'),
      'controls/javascript-control': tip('input', 'input[type="checkbox"]'),
      'controls/installments': tip('input', 'input[type="number"]'),
      'controls/city': tip('child', 'select>option*3'),
      'controls/button': tip('button'),
    },
  },
  'inf03-08-25-06-sg': {
    id: 'baza-smokow-study',
    version: 3,
    activities: {
      'structure/document': tip('document'),
      'structure/head': tip('stylesheet'),
      'structure/blocks': tip('siblings', 'header+nav+main+footer'),
      'structure/header-footer': text('h2'),
      'structure/nav-first': tip('identifier', 'button#opis[type="button"]'),
      'structure/nav-other': tip('identifier', 'button#opis[type="button"]'),
      'structure/sections': tip('identifier'),
      'structure/section-headings': text('h3'),
      'form/select': element('select'),
      'form/submit': tip('button', 'button[type="submit"]{Wyślij}'),
      'form/table': tip('table'),
      'descriptions/definition-list': element('dl'),
      'descriptions/first-image': tip('image'),
      'descriptions/other-images': tip('image'),
    },
  },
  'inf03-01-24-01-sg': {
    id: 'firma-it-study',
    version: 1,
    activities: {
      'structure/document': tip('document'),
      'structure/title': text('title'),
      'structure/stylesheet': tip('stylesheet'),
      'structure/blocks': tip('siblings', 'header+nav+section+main+footer'),
      'common/logo': tip('image'),
      'common/home-link': tip('link'),
      'common/other-links': tip('link'),
      'common/animation': tip('image'),
      'common/signature': text('strong'),
      'home/heading': text('h2'),
      'home/description': text('p'),
      'home/separator': element('hr'),
      'services/shared-shell': tip('stylesheet'),
      'services/heading': text('h2'),
      'services/list-start': tip('child', 'ol>li'),
      'services/list-rest': tip('items', 'li*3'),
      'contact/shared-shell': tip('stylesheet'),
      'contact/heading': text('h2'),
      'contact/table': element('table'),
      'contact/first-name': tip('cells', 'tr>td*2'),
      'contact/last-name': tip('input'),
      'contact/email': tip('input', 'input[type="email"]'),
      'contact/message': element('textarea'),
      'contact/consent': tip('input', 'input[type="checkbox"]'),
      'contact/buttons': tip('button'),
      'contact/result-place': tip('siblings', 'hr+p'),
    },
  },
  'inf03-05-24-01-sg': {
    id: 'salon-study',
    version: 1,
    activities: {
      'structure/document': tip('document'),
      'structure/title': text('title'),
      'structure/style-link': tip('stylesheet'),
      'structure/left': tip('siblings', 'section+section'),
      'structure/right': tip('siblings', 'header+section'),
      'structure/footer': tip('child', 'footer>p'),
      'offer/heading': text('h2'),
      'offer/list': tip('list', 'ol>li*3'),
      'offer/link': tip('link'),
      'offer/nested': tip('list', 'ul>li*2'),
      'offer/home-link': tip('link'),
      'offer/main-title': text('h1'),
      'welcome/personnel': tip('image'),
      'welcome/greeting': text('p'),
      'welcome/relax': tip('image'),
      'welcome/telephone': text('h3'),
      'calculator-html/shared-shell': tip('stylesheet'),
      'calculator-html/heading': text('h3'),
      'calculator-html/peeling': tip('input', 'input[type="checkbox"]'),
      'calculator-html/mask': tip('input', 'input[type="checkbox"]'),
      'calculator-html/massage': tip('input', 'input[type="checkbox"]'),
      'calculator-html/makeup': tip('input', 'input[type="checkbox"]'),
      'calculator-html/button': tip('button'),
      'calculator-html/result': element('p'),
    },
  },
  'inf03-01-24-06-sg': {
    id: 'motocykle-study',
    version: 1,
    activities: {
      'html/document': tip('document'),
      'html/title': text('title'),
      'html/stylesheet': tip('stylesheet'),
      'html/banner': element('header'),
      'html/left': element('main'),
      'html/footer': element('footer'),
      'content/motor-image': tip('image'),
      'content/banner-title': text('h1'),
      'content/trip-title': text('h2'),
      'content/description-list': element('dl'),
      'content/buy-title': text('h2'),
      'content/buy-list': tip('list', 'ol>li*5'),
      'content/statistics-title': text('h2'),
      'content/statistics': tip('siblings', 'p+p+p'),
      'content/signature': text('p'),
    },
  },
  'inf03-02-24-06-sg': {
    id: 'chat-study',
    version: 1,
    activities: {
      'structure/document': tip('document'),
      'structure/title': text('title'),
      'structure/style-link': tip('stylesheet'),
      'structure/header': tip('child', 'header>h2'),
      'structure/main': element('main'),
      'structure/aside': element('aside'),
      'structure/footer': tip('child', 'footer>h5'),
      'sidebar/heading': text('h3'),
      'sidebar/outer-list': tip('list', 'ul>li*2'),
      'sidebar/nested-list': tip('list', 'ol>li*2'),
      'sidebar/remaining-topics': tip('items'),
      'sidebar/participants-heading': text('h3'),
      'sidebar/jolanta': tip('image'),
      'sidebar/krzysztof': tip('image'),
      'conversation/window': element('div'),
      'conversation/jolanta': tip('image'),
      'conversation/krzysztof': tip('image'),
      'conversation/input': tip('input'),
      'conversation/send': tip('button'),
      'conversation/random': tip('button'),
    },
  },
  'inf03-03-24-06-sg': {
    id: 'poziomy-rzek-study',
    version: 1,
    activities: {
      'html/document': tip('document'),
      'html/title': text('title'),
      'html/stylesheet': tip('stylesheet'),
      'html/banners': element('header'),
      'html/menu': element('nav'),
      'html/footer': element('footer'),
      'html/banner-content': tip('image'),
      'form/radio-all': tip('input', 'input[type="radio"]'),
      'form/radio-warning': tip('input', 'input[type="radio"]'),
      'form/radio-alarm': tip('input', 'input[type="radio"]'),
      'table/date-title': text('h3'),
      'table/table-shell': element('table'),
      'table/headers': tip('cellsOnly', 'th*5'),
      'information/information-title': text('h3'),
      'information/messages': tip('list'),
      'information/average-title': text('h3'),
      'information/link': tip('link'),
      'information/river-image': tip('image'),
      'information/signature': text('p'),
    },
  },
};

export function getEmmetTeachingTip(
  guide: ExamStudyGuide,
  step: ExamStudyStep,
  activity: StudyActivity,
): EmmetTeachingTip | undefined {
  if (!guide.project || guide.taskVersion !== 1 || !Object.hasOwn(emmetGuideBindings, guide.taskId))
    return;
  const mapping = emmetGuideBindings[guide.taskId]!;
  if (guide.id !== mapping.id || guide.version !== mapping.version) return;
  const key = `${step.id}/${activity.id}`;
  if (!Object.hasOwn(mapping.activities, key)) return;
  const checks = activity.checks?.filter((check) => check.kind === 'html') ?? [];
  const fileName = checks[0]?.path;
  if (!fileName || !/\.(?:html?|php)$/i.test(fileName)) return;
  if (checks.some((check) => check.path !== fileName)) return;
  if (activity.checks?.some((check) => check.kind === 'runtime')) return;
  const spec = mapping.activities[key]!;
  const base = emmetExamples[spec.example];
  let note: string | undefined;
  if (spec.example === 'stylesheet') {
    const stylesheet = checks.find(
      (check) =>
        check.selector === 'link[rel="stylesheet"]' &&
        check.attribute === 'href' &&
        typeof check.equals === 'string',
    );
    if (!stylesheet?.equals) return;
    note =
      stylesheet.equals === 'style.css'
        ? 'Ten krok wymaga href="style.css" — nazwa z rozwinięcia jest właściwa. Upewnij się, że plik istnieje. Jeśli link jest już poprawny, nie dodawaj go drugi raz.'
        : `Ten krok wymaga href="${stylesheet.equals}". Po rozwinięciu zamień style.css na ${stylesheet.equals} i sprawdź, czy taki plik istnieje. Nie dodawaj drugiego linku, jeśli wystarczy poprawić istniejący.`;
  }
  return {
    example: spec.abbreviation ? { ...base, abbreviation: spec.abbreviation } : base,
    fileName,
    placement:
      activity.placement ?? 'W miejscu wskazanym w poleceniu, poza kodem PHP i atrybutami HTML.',
    note,
  };
}
