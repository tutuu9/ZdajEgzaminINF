import type { QuestionRevision } from '@zdaj/shared';

const sourceUrl = 'https://bip.cke.gov.pl/attachments/download/8580';

interface PublishedExample {
  number: number;
  page: number;
  top: number;
  bottom: number;
  answer: 'a' | 'b' | 'c' | 'd';
  topic: string;
  title: string;
  explanation: string;
  reasons: [string, string, string, string];
}

/**
 * Original question text and options are displayed from the reviewed PDF crop.
 * These labels and explanations are separate platform commentary, not CKE text.
 * The source includes its answer key: learning/practice only, never hidden-key exam.
 * Example 12 requires an embedded video and is deliberately not offered.
 */
const examples: PublishedExample[] = [
  {
    number: 1,
    page: 6,
    top: 0.35985,
    bottom: 0.48339,
    answer: 'b',
    topic: 'tools',
    title: 'Oświetlenie stanowiska',
    explanation:
      'Klucz tego opublikowanego przykładu wskazuje 500 lx. Luks jest jednostką natężenia oświetlenia. Odpowiedź odnosi się do treści informatora, a nie do indywidualnej oceny stanowiska pracy.',
    reasons: [
      'Wartość w A nie odpowiada kluczowi tego przykładu.',
      'B podaje wartość wskazaną przez klucz CKE: 500 lx.',
      'Wartość w C nie odpowiada kluczowi tego przykładu.',
      'Wartość w D nie odpowiada kluczowi tego przykładu.',
    ],
  },
  {
    number: 2,
    page: 6,
    top: 0.70969,
    bottom: 0.83316,
    answer: 'c',
    topic: 'graphics-security',
    title: 'Dostępność treści',
    explanation:
      'WCAG opisuje wytyczne dostępności treści internetowych. Rozpoznaj nazwę konkretnych wytycznych, a nie samą organizację lub ogólną serię dokumentów technicznych.',
    reasons: [
      'IEEE nie jest nazwą wskazanych wytycznych dostępności WWW.',
      'RFC to rodzina dokumentów technicznych, nie nazwa WCAG.',
      'WCAG jest nazwą wytycznych dostępności treści internetowych.',
      'W3C jest organizacją rozwijającą standardy; pytanie dotyczy nazwy wytycznych.',
    ],
  },
  {
    number: 3,
    page: 7,
    top: 0.16773,
    bottom: 0.305,
    answer: 'c',
    topic: 'graphics-security',
    title: 'Rozpoznawanie zagrożeń',
    explanation:
      'Brute force oznacza systematyczne sprawdzanie możliwych kombinacji. Odróżnij tę metodę od wyłudzania danych i ataków na dostępność usługi.',
    reasons: [
      'DDoS jest atakiem na dostępność usługi.',
      'Phishing polega na oszukiwaniu odbiorcy w celu wyłudzenia informacji.',
      'C odpowiada metodzie brute force wskazanej w kluczu.',
      'Wstrzykiwanie kodu nie jest sprawdzaniem kolejnych kombinacji hasła.',
    ],
  },
  {
    number: 4,
    page: 7,
    top: 0.52135,
    bottom: 0.64487,
    answer: 'a',
    topic: 'html-css',
    title: 'Grafika wektorowa w HTML',
    explanation:
      'Element svg pozwala opisać grafikę wektorową bezpośrednio w dokumencie. Elementy służące do wyboru lub osadzania pliku obrazu pełnią inną rolę.',
    reasons: [
      'svg jest elementem przeznaczonym do grafiki wektorowej SVG.',
      'img osadza obraz; nie opisuje jego wektorowych kształtów.',
      'source wskazuje alternatywne źródło zasobu.',
      'picture grupuje źródła obrazów; nie opisuje wektorowych kształtów.',
    ],
  },
  {
    number: 5,
    page: 7,
    top: 0.79886,
    bottom: 0.92238,
    answer: 'b',
    topic: 'html-css',
    title: 'Semantyka tekstu HTML',
    explanation:
      'Akapit tekstu oznacza się elementem p. Zwracaj uwagę na znaczenie elementu, a nie tylko na odstęp widoczny po jego użyciu.',
    reasons: [
      'Element a z href tworzy odsyłacz.',
      'Element p oznacza akapit.',
      'h1 oznacza nagłówek najwyższego poziomu.',
      'div jest ogólnym kontenerem, bez semantyki akapitu.',
    ],
  },
  {
    number: 6,
    page: 8,
    top: 0.19595,
    bottom: 0.6252,
    answer: 'a',
    topic: 'html-css',
    title: 'Grupowanie pól formularza',
    explanation:
      'Pola radio tworzą grupę pojedynczego wyboru przez wspólny atrybut name. Różne nazwy tworzą odrębne grupy, a checkbox pozwala zaznaczać niezależne odpowiedzi.',
    reasons: [
      'Pola radio mają wspólną nazwę grupy, więc wybór jednej opcji wyklucza drugą.',
      'Różne nazwy pól radio nie tworzą wspólnej grupy pojedynczego wyboru.',
      'Checkboxy są niezależnymi polami zaznaczenia.',
      'Checkboxy nie zapewniają wzajemnego wykluczania wyboru.',
    ],
  },
  {
    number: 7,
    page: 8,
    top: 0.7968,
    bottom: 0.92031,
    answer: 'a',
    topic: 'html-css',
    title: 'Selektory CSS',
    explanation:
      'Gwiazdka jest selektorem uniwersalnym CSS. Nazwa elementu wybiera tylko elementy tego typu; nawet html i body nie oznaczają wszystkich elementów dokumentu.',
    reasons: [
      'Gwiazdka oznacza selektor uniwersalny.',
      'html jest selektorem elementu głównego.',
      'body wybiera element body, a nie każdy element dokumentu.',
      'section wybiera elementy typu section.',
    ],
  },
  {
    number: 8,
    page: 9,
    top: 0.18099,
    bottom: 0.30443,
    answer: 'c',
    topic: 'html-css',
    title: 'Właściwości tekstu CSS',
    explanation:
      'Za grubość pisma odpowiada font-weight. Wielkość, pochylenie oraz wariant kroju są odrębnymi właściwościami.',
    reasons: [
      'font-size określa wielkość pisma.',
      'font-style służy między innymi do ustawiania kursywy.',
      'font-weight określa grubość pisma.',
      'font-variant określa warianty typograficzne, a nie grubość.',
    ],
  },
  {
    number: 9,
    page: 9,
    top: 0.4761,
    bottom: 0.59962,
    answer: 'd',
    topic: 'html-css',
    title: 'Wartości właściwości CSS',
    explanation:
      'bottom jest prawidłową wartością vertical-align. Nazw wartości nie można swobodnie przenosić między właściwościami dotyczącymi różnych osi lub sposobów wyrównania.',
    reasons: [
      'Wartość z A nie należy do poprawnych wartości vertical-align.',
      'Wartość z B nie należy do poprawnych wartości vertical-align.',
      'Wartość z C nie należy do poprawnych wartości vertical-align.',
      'bottom jest poprawną wartością vertical-align.',
    ],
  },
  {
    number: 10,
    page: 9,
    top: 0.77126,
    bottom: 0.92609,
    answer: 'c',
    topic: 'html-css',
    title: 'Selektor atrybutu CSS',
    explanation:
      'Klucz CKE wskazuje C i operator ~=, który sprawdza cały wyraz w wartości atrybutu. Uwaga do zapisu źródłowego: wydrukowana spacja po p oznacza w CSS selektor potomka. Aby wybrać pokazany akapit, poprawny selektor tego samego elementu nie ma tej spacji: p[title~="jest"]. Zachowujemy oryginalny PDF oraz jego klucz, a tę nieścisłość wyjaśniamy oddzielnie.',
    reasons: [
      'Selektor dziecka nie sprawdza wartości atrybutu akapitu.',
      'Równość atrybutu wymaga całej wartości, a nie jednego jej wyrazu.',
      'C jest odpowiedzią klucza CKE; zapis wymaga uwagi dotyczącej spacji opisanej w objaśnieniu.',
      'Wartość atrybutu nie jest równa wyrazowi wskazanemu w D.',
    ],
  },
  {
    number: 11,
    page: 10,
    top: 0.21099,
    bottom: 0.45237,
    answer: 'b',
    topic: 'html-css',
    title: 'Model pudełkowy CSS',
    explanation:
      'W pokazanym modelu content-box szerokość zawartości wynosi 500 px, a lewy i prawy padding po 10 px. Suma wynosi 520 px; pionowe odstępy nie zwiększają szerokości.',
    reasons: [
      'A nie uwzględnia prawidłowo obu poziomych odstępów wewnętrznych.',
      '500 + 10 + 10 daje 520 px.',
      'C nie odpowiada sumie szerokości i poziomego paddingu.',
      'D nie odpowiada sumie szerokości i poziomego paddingu.',
    ],
  },
  {
    number: 13,
    page: 11,
    top: 0.18099,
    bottom: 0.30443,
    answer: 'c',
    topic: 'graphics-security',
    title: 'Model barw',
    explanation:
      'W modelu CMYK składnik K oznacza czarną farbę drukarską. Skróty nazw modeli i składowych trzeba odczytywać w kontekście danego modelu.',
    reasons: [
      'Nasycenie nie jest dodatkowym składnikiem K.',
      'K nie oznacza bieli.',
      'K oznacza czarny składnik modelu CMYK.',
      'K nie oznacza kanału przezroczystości.',
    ],
  },
  {
    number: 14,
    page: 11,
    top: 0.4761,
    bottom: 0.79347,
    answer: 'a',
    topic: 'graphics-security',
    title: 'Rozpoznawanie efektu graficznego',
    explanation:
      'Klucz CKE wiąże pokazany efekt z filtrem grawerowania. Porównuj charakter linii i uproszczenie tonów w obu przedstawionych obrazach.',
    reasons: [
      'Filtr grawerowania jest odpowiedzią wskazaną w kluczu do pokazanej pary obrazów.',
      'Efekt z B nie jest odpowiedzią wskazaną dla tej pary obrazów.',
      'Efekt z C nie jest odpowiedzią wskazaną dla tej pary obrazów.',
      'Efekt z D nie jest odpowiedzią wskazaną dla tej pary obrazów.',
    ],
  },
  {
    number: 15,
    page: 12,
    top: 0.19595,
    bottom: 0.31947,
    answer: 'a',
    topic: 'html-css',
    title: 'Struktura semantyczna strony',
    explanation:
      'Element nav służy do oznaczania części zawierającej główne odsyłacze nawigacyjne. Sam fakt umieszczenia odsyłacza nie nadaje każdemu kontenerowi tej samej semantyki.',
    reasons: [
      'nav oznacza sekcję nawigacji.',
      'link opisuje relację dokumentu z zasobem, np. arkuszem CSS.',
      'aside oznacza treść poboczną.',
      'section jest sekcją tematyczną bez konkretnej semantyki nawigacji.',
    ],
  },
  {
    number: 16,
    page: 12,
    top: 0.54764,
    bottom: 0.70914,
    answer: 'b',
    topic: 'sql',
    title: 'Odczytywanie relacji',
    explanation:
      'Oznaczenia końców relacji na diagramie wskazują relację jeden do wielu. Odczytuj znaczniki krotności, zamiast wnioskować z samej liczby narysowanych tabel.',
    reasons: [
      'A nie odpowiada krotności oznaczonej na diagramie.',
      'Znaczniki diagramu wskazują relację jeden do wielu.',
      'C nie odpowiada krotności oznaczonej na diagramie.',
      'D nie odpowiada krotności oznaczonej na diagramie.',
    ],
  },
  {
    number: 17,
    page: 13,
    top: 0.19595,
    bottom: 0.36116,
    answer: 'b',
    topic: 'sql',
    title: 'Wzorzec LIKE',
    explanation:
      'Podkreślenie we wzorcu LIKE zastępuje dokładnie jeden znak, a procent dowolny ciąg. W pokazanym wzorcu litera a musi więc zajmować drugą pozycję.',
    reasons: [
      'A nie odpowiada pozycji litery wyznaczonej przez podkreślenie.',
      'Podkreślenie zajmuje pierwszą pozycję, więc a znajduje się na drugiej.',
      'C nie odpowiada znaczeniu znaków specjalnych we wzorcu.',
      'D nie odpowiada znaczeniu znaków specjalnych we wzorcu.',
    ],
  },
  {
    number: 18,
    page: 13,
    top: 0.54779,
    bottom: 0.81292,
    answer: 'a',
    topic: 'sql',
    title: 'Sortowanie i ograniczanie wyników',
    explanation:
      'Aby otrzymać dwa najwcześniejsze zakończenia, trzeba posortować datę rosnąco i pobrać dwa pierwsze wiersze. OFFSET pomija początek wyniku, a sortowanie malejące odwraca kolejność.',
    reasons: [
      'Rosnące sortowanie po dacie i limit dwóch wierszy wybierają wymagane rekordy.',
      'LIMIT 1, 2 pomija pierwszy wiersz posortowanego wyniku.',
      'DESC wybiera od najpóźniejszych dat, nie od najwcześniejszych.',
      'DESC odwraca wymaganą kolejność, a przesunięcie dodatkowo pomija pierwszy wiersz.',
    ],
  },
  {
    number: 19,
    page: 14,
    top: 0.19595,
    bottom: 0.31947,
    answer: 'b',
    topic: 'sql',
    title: 'Typy całkowite w bazie danych',
    explanation:
      'W rodzinie typów całkowitych MySQL/MariaDB TINYINT zajmuje 1 bajt, SMALLINT 2, MEDIUMINT 3, a INT 4. Nie jest to uniwersalne nazewnictwo wszystkich systemów SQL.',
    reasons: [
      'INT zajmuje 4 bajty.',
      'TINYINT zajmuje 1 bajt.',
      'SMALLINT zajmuje 2 bajty.',
      'MEDIUMINT zajmuje 3 bajty.',
    ],
  },
  {
    number: 20,
    page: 14,
    top: 0.5289,
    bottom: 0.71014,
    answer: 'c',
    topic: 'javascript',
    title: 'Wynik porównania JavaScript',
    explanation:
      'Najpierw wykonywana jest zamiana liter na małe, następnie porównanie. Wyrażenie przekazane do wypisania daje wartość logiczną true, a nie sam zmieniony napis.',
    reasons: [
      'A jest napisem; wypisywany jest wynik porównania.',
      'B jest napisem; wypisywany jest wynik porównania.',
      'Porównanie po zamianie liter na małe jest prawdziwe.',
      'Porównywane wartości po zamianie liter są równe.',
    ],
  },
  {
    number: 21,
    page: 15,
    top: 0.19695,
    bottom: 0.43869,
    answer: 'd',
    topic: 'php',
    title: 'Prześledzenie rekurencji PHP',
    explanation:
      'Kolejne wywołania dodają wartości 5, 4, 3, 2 i 1. Przypadek bazowy zwraca 0, więc cały wynik to 15. Śledź również zwracane wartości przy powrocie z rekurencji.',
    reasons: [
      '0 jest wynikiem tylko przypadku bazowego.',
      '10 pomija część sumy dla wywołania z argumentem 5.',
      '14 nie jest sumą wszystkich wartości od 1 do 5.',
      '5 + 4 + 3 + 2 + 1 + 0 daje 15.',
    ],
  },
  {
    number: 22,
    page: 15,
    top: 0.61035,
    bottom: 0.76416,
    answer: 'b',
    topic: 'php',
    title: 'Nazwa typu zwracana przez PHP',
    explanation:
      'Literał z częścią dziesiętną ma typ zmiennoprzecinkowy. Funkcja gettype używa dla niego historycznej nazwy double, choć w dokumentacji samego typu spotkasz także float.',
    reasons: [
      'Literał liczbowy nie jest tutaj napisem.',
      'gettype zwraca dla tego typu nazwę double.',
      'Zapis z częścią dziesiętną nie ma tutaj typu integer.',
      'Wyrażenie nie ma typu boolean.',
    ],
  },
  {
    number: 23,
    page: 16,
    top: 0.32265,
    bottom: 0.43113,
    answer: 'b',
    topic: 'html-css',
    title: 'Angielski opis składni HTML',
    explanation:
      'Angielskie objaśnienie dotyczy znaczników HTML i nawiasów ostrych otaczających ich nazwy. Łączy rozumienie tekstu technicznego ze znajomością składni.',
    reasons: [
      'Nawiasy kwadratowe nie otaczają nazw znaczników HTML.',
      'Nazwy znaczników HTML są otaczane nawiasami ostrymi.',
      'Znaki z C nie otaczają nazw znaczników HTML.',
      'Znaki z D nie otaczają nazw znaczników HTML.',
    ],
  },
  {
    number: 24,
    page: 16,
    top: 0.70641,
    bottom: 0.86345,
    answer: 'b',
    topic: 'tools',
    title: 'Angielski opis usługi',
    explanation:
      'Opis mówi o projekcie dopasowanym do indywidualnych wymagań, bez gotowego szablonu. Nie wynika z niego automatycznie responsywność ani wybór sprawdzonego motywu.',
    reasons: [
      'Dostosowanie do różnych urządzeń nie jest głównym znaczeniem tego opisu.',
      'B oddaje indywidualny charakter projektu i dopasowanie do wymagań.',
      'Opis nie oznacza po prostu wykorzystania sprawdzonych rozwiązań.',
      'Gotowy motyw przeczy informacji o braku szablonu.',
    ],
  },
  {
    number: 25,
    page: 17,
    top: 0.23194,
    bottom: 0.35538,
    answer: 'c',
    topic: 'tools',
    title: 'Komunikacja podczas prezentacji',
    explanation:
      'W kontekście zadania zaciśnięta pięść jest niepożądanym sygnałem niewerbalnym. Ocena dotyczy wskazanej sytuacji komunikacyjnej i opublikowanego klucza.',
    reasons: [
      'Kontakt wzrokowy nie jest zachowaniem wskazanym w kluczu do unikania.',
      'Gest powitania nie jest zachowaniem wskazanym w kluczu do unikania.',
      'Zaciśnięta pięść może być odebrana jako sygnał agresji.',
      'D nie jest zachowaniem wskazanym w kluczu do tego przykładu.',
    ],
  },
  {
    number: 26,
    page: 17,
    top: 0.578,
    bottom: 0.70152,
    answer: 'c',
    topic: 'tools',
    title: 'Koordynacja pracy zespołu',
    explanation:
      'Krótkie codzienne spotkanie służy zorientowaniu się w postępie i planie pracy. Nie jest z definicji wyborem nowego lidera, spotkaniem z klientem ani dobieraniem par.',
    reasons: [
      'Codzienny wybór lidera nie jest wskazanym celem spotkania.',
      'Takie spotkanie nie oznacza regularnego kontaktu całego zespołu z klientem.',
      'C opisuje sprawdzenie postępu i ustalenie planu na dany dzień.',
      'Dobieranie par nie jest wskazanym celem tego spotkania.',
    ],
  },
];

export const officialQuestions: QuestionRevision[] = examples.map((example) => ({
  id: `cke-inf03-2022-q${String(example.number).padStart(2, '0')}`,
  // Preserve the first locally seeded revision when clarifying answer commentary.
  version: [3, 4, 5, 7, 8, 10, 13, 15, 18].includes(example.number) ? 2 : 1,
  topicId: example.topic,
  level: 'intermediate',
  prompt: `Przykład ${example.number} — ${example.title}`,
  options: ['a', 'b', 'c', 'd'].map((id, index) => ({
    id,
    text: id.toUpperCase(),
    explanation: example.reasons[index]!,
  })),
  correctOptionId: example.answer,
  explanation: `Objaśnienie platformy: ${example.explanation}`,
  reference: `${sourceUrl}#page=${example.page}`,
  source: {
    catalogId: 'cke-inf03-informator-2022',
    url: sourceUrl,
    page: example.page,
    questionNumber: example.number,
    top: example.top,
    bottom: example.bottom,
  },
}));
