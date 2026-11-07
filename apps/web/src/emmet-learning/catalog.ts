export interface EmmetExample {
  id: string;
  title: string;
  abbreviation: string;
  explanation: string;
  placement?: string;
  caution?: string;
}

export interface EmmetTopic {
  id: string;
  title: string;
  description: string;
  examples: EmmetExample[];
}

/** Reviewed teaching fragments, not CKE answers. Expansions come from the editor engine. */
export const emmetExamples = {
  element: {
    id: 'element',
    title: 'Jeden znacznik',
    abbreviation: 'section',
    explanation:
      'Wpisz nazwę potrzebnego znacznika i naciśnij Tab. Dla zwykłego elementu powstanie para znaczników z kursorem w środku. Elementy puste, takie jak img, nie mają znacznika zamykającego.',
    caution:
      'Dodawaj tylko brakujący element we właściwym rodzicu. Nie zastępuj wcześniejszego kodu.',
  },
  document: {
    id: 'document',
    title: 'Nowy dokument: !',
    abbreviation: '!',
    explanation:
      'W pustym pliku wpisz ! w osobnym wierszu i naciśnij Tab. Edytor utworzy szkielet HTML5 z lang="pl" i UTF-8.',
    placement: 'Tylko w nowym, pustym dokumencie HTML lub HTML wewnątrz pliku PHP.',
    caution:
      'Jeżeli projekt ma już szkielet, nie dodawaj drugiego html, head ani body. Jeśli początek jest poprawny, zostaw go i przejdź dalej.',
  },
  stylesheet: {
    id: 'stylesheet',
    title: 'Połączenie z CSS: link:css',
    abbreviation: 'link:css',
    explanation:
      'Wpisz link:css wewnątrz head i naciśnij Tab. Powstanie znacznik link z rel="stylesheet" i href="style.css". Zaznaczone będzie słowo style; możesz od razu wpisać właściwą nazwę bez zmiany końcówki .css.',
    placement: 'Wewnątrz head, poza innym znacznikiem i jego atrybutami.',
    caution:
      'To skrót HTML, nie CSS. Nazwę w href dopasuj samodzielnie do zadania i swoich plików. Skrót nie tworzy pliku CSS. Jeżeli link już istnieje, popraw go zamiast dodawać drugi.',
  },
  image: {
    id: 'image',
    title: 'Obraz: img',
    abbreviation: 'img',
    explanation:
      'Img tworzy znacznik obrazu z pustymi src i alt. Src wskazuje plik, a alt opisuje znaczenie obrazu. Po rozwinięciu kursor jest w pierwszym pustym polu; do drugiego przejdź samodzielnie.',
    caution: 'Skrót nie przygotowuje grafiki. Wpisz nazwę i opis wymagane w bieżącym kroku.',
  },
  link: {
    id: 'link',
    title: 'Odnośnik: a',
    abbreviation: 'a',
    explanation:
      'A tworzy odnośnik. Uzupełnij href adresem, a między znacznikami wpisz widoczny podpis. Sam napis nie zmienia celu linku.',
    caution: 'Wpisz cel z polecenia. Utworzenie odnośnika nie tworzy strony, do której prowadzi.',
  },
  child: {
    id: 'child',
    title: 'Wewnątrz elementu: >',
    abbreviation: 'header>h1',
    explanation:
      'Znak > umieszcza element po prawej wewnątrz elementu po lewej. Po rozwinięciu sprawdź wcięcia i pary znaczników: pokażą rodzica i jego dzieci.',
    caution:
      'Jeżeli rodzic już istnieje, wpisz tylko skrót dziecka w jego wnętrzu. Nie twórz drugiego rodzica.',
  },
  siblings: {
    id: 'siblings',
    title: 'Obok siebie: +',
    abbreviation: 'header+main+footer',
    explanation:
      'Plus tworzy kolejne elementy na tym samym poziomie: obok siebie w strukturze HTML, a nie jeden wewnątrz drugiego. Ich ułożenie na ekranie zależy też od CSS.',
    caution: 'Dopisuj tylko brakujące elementy i zachowaj kolejność z polecenia.',
  },
  text: {
    id: 'text',
    title: 'Treść pomiędzy znacznikami: {}',
    abbreviation: 'h2{Mój tytuł}',
    explanation:
      'Tekst w klamrach trafi pomiędzy znaczniki. Polskie znaki i spacje są częścią tekstu. Po rozwinięciu otrzymasz zwykły HTML, który nadal możesz zmieniać.',
    caution:
      'Tekst jest przykładowy. Dobierz znacznik i treść do kroku. Jeżeli element już istnieje, zmień jego tekst zamiast go powielać.',
  },
  up: {
    id: 'up',
    title: 'Poziom wyżej: ^',
    abbreviation: 'header>h1{Tytuł}^main',
    explanation:
      'Po > piszesz wewnątrz header. Znak ^ wraca o jeden poziom, więc main powstaje obok header. Bez ^ zapis +main dodałby main obok h1, wewnątrz header.',
  },
  doubleUp: {
    id: 'double-up',
    title: 'Dwa poziomy wyżej: ^^',
    abbreviation: 'main>section>h2{Temat}^^footer',
    explanation:
      'Pierwszy ^ wychodzi z section do main, a drugi z main. Footer jest więc rodzeństwem main. Licz poziomy po kolejnych znakach >, zamiast zgadywać liczbę ^.',
  },
  list: {
    id: 'list',
    title: 'Kilka pozycji listy: *',
    abbreviation: 'ul>li*3',
    explanation:
      'Lista ul lub ol powstaje raz, a liczba po li* określa liczbę jej pozycji. Po rozwinięciu każdą pozycję wypełnij osobno.',
    caution:
      'Wybierz ul lub ol i liczbę pozycji z polecenia. W istniejącej liście dodawaj samo li, bez kolejnego ul lub ol.',
  },
  items: {
    id: 'items',
    title: 'Dopisz elementy w istniejącym rodzicu',
    abbreviation: 'li*2',
    explanation:
      'Liczba po li* określa liczbę nowych pozycji. Wpisz skrót wewnątrz już istniejącego ul albo ol; nie zastępuj wcześniejszych pozycji.',
  },
  numbering: {
    id: 'numbering',
    title: 'Numerowanie nazw: $',
    abbreviation: 'ul>li.punkt$*3',
    explanation:
      'Przy powtarzaniu znak $ zmienia się w 1, 2 i 3. Przykład tworzy klasy punkt1, punkt2 i punkt3. To numery w nazwach klas, nie widoczne numery listy.',
    caution:
      'Numeruj nazwy tylko wtedy, gdy są potrzebne. Wspólny wygląd zwykle obsłuży jedna klasa.',
  },
  cells: {
    id: 'cells',
    title: 'Wiersz i komórki',
    abbreviation: 'tr>td*3',
    explanation:
      'Wiersz tr zawiera komórki td albo nagłówki th. Liczba po * określa ich liczbę. Rozwijaj taki wiersz wewnątrz istniejącej tabeli; teksty uzupełnisz później.',
    caution:
      'Liczbę i rodzaj komórek sprawdź w poleceniu. Nie dodawaj drugiej tabeli do istniejącej.',
  },
  table: {
    id: 'table',
    title: 'Nowa tabela z wierszem nagłówków',
    abbreviation: 'table>tr>th*3',
    explanation:
      'Table tworzy tabelę, tr jej pierwszy wiersz, a th*3 trzy komórki nagłówkowe. To sama struktura; treść każdej komórki uzupełnij osobno według polecenia.',
    caution:
      'Jeżeli tabela lub wiersz już istnieje, dodawaj tylko brakujące dzieci wewnątrz niego.',
  },
  cellsOnly: {
    id: 'cells-only',
    title: 'Komórki w istniejącym wierszu',
    abbreviation: 'th*3',
    explanation:
      'Th tworzy komórkę nagłówkową, a liczba po * określa ich liczbę. Rozwiń skrót wewnątrz istniejącego tr, bez dodawania drugiego wiersza.',
    caution: 'Uzupełnij treść każdej komórki i sprawdź kolejność wymaganą w poleceniu.',
  },
  className: {
    id: 'class',
    title: 'Klasa: .',
    abbreviation: 'section.panel',
    explanation:
      'Kropka zapisuje class="panel" na elemencie section. Taką klasę możesz później wybrać w CSS przez .panel. Skrót tworzy tylko HTML, nie regułę CSS.',
    caution:
      'Panel jest przykładową nazwą. Użyj nazwy zgodnej z własnym kodem i wymaganiami kroku.',
  },
  identifier: {
    id: 'identifier',
    title: 'Identyfikator: #',
    abbreviation: 'section#opis',
    explanation:
      'Znak # dodaje id="opis". Identyfikator powinien być unikalny w dokumencie. W CSS można wybrać ten element przez #opis.',
    caution: 'Opis to przykład. Nie duplikuj identyfikatora istniejącego elementu.',
  },
  attributes: {
    id: 'attributes',
    title: 'Atrybuty: []',
    abbreviation: 'a[href="strona.html"]{Czytaj}',
    explanation:
      'Nawiasy kwadratowe zapisują atrybuty, a klamry tekst. Tutaj href określa adres, zaś Czytaj jest podpisem. Wartość ze spacjami umieść w cudzysłowie.',
    caution: 'Strona.html i Czytaj są przykładowe. Zamień je na adres i podpis z kroku.',
  },
  input: {
    id: 'input',
    title: 'Typ pola w atrybucie',
    abbreviation: 'input[type="text"]',
    explanation:
      'Input z atrybutem type tworzy pole wskazanego rodzaju. Text, email, number, checkbox i radio oznaczają różne kontrolki. Dopisz również wymagane etykiety oraz atrybuty.',
    caution: 'Samo pole nie zastępuje etykiety. For w label musi odpowiadać id właściwego pola.',
  },
  button: {
    id: 'button',
    title: 'Atrybut i podpis przycisku',
    abbreviation: 'button[type="button"]{Sprawdź}',
    explanation:
      'W [] podajesz typ przycisku, a w {} jego napis. Typ button nie wysyła formularza, submit służy do wysłania, a reset do przywrócenia początkowych wartości kontrolek. Wybierz typ z polecenia.',
    caution: 'Skrót tworzy element HTML. Nie dopisuje obsługi JavaScript ani PHP.',
  },
  grouping: {
    id: 'grouping',
    title: 'Grupa elementów: ()',
    abbreviation: '(section>h2+p)+aside',
    explanation:
      'Nawiasy obejmują section wraz z jego dziećmi h2 i p. Zapis +aside po zamknięciu grupy dodaje aside obok section. Łatwiej wtedy zobaczyć, gdzie kończy się jedna część struktury.',
    caution:
      'Długą strukturę buduj małymi fragmentami. Nie zastępuj już napisanej strony jednym wielkim skrótem.',
  },
} satisfies Record<string, EmmetExample>;

export const emmetTopics: EmmetTopic[] = [
  {
    id: 'basics',
    title: 'Podstawy: !, link:css, img, a',
    description:
      'Zacznij od jednego znacznika. Wpisz skrót i użyj Tab, potem przeczytaj powstały HTML.',
    examples: [
      emmetExamples.element,
      emmetExamples.document,
      emmetExamples.stylesheet,
      emmetExamples.image,
      emmetExamples.link,
    ],
  },
  {
    id: 'structure',
    title: 'Wewnątrz i obok: > oraz +',
    description: 'Najpierw zdecyduj, który element jest rodzicem, a które są jego dziećmi.',
    examples: [emmetExamples.child, emmetExamples.siblings],
  },
  {
    id: 'text',
    title: 'Tekst: {}',
    description: 'Oddziel treść strony od nazw znaczników i atrybutów.',
    examples: [emmetExamples.text],
  },
  {
    id: 'climb',
    title: 'Powrót do rodzica: ^ i ^^',
    description: 'Sprawdź, na którym poziomie ma się znaleźć kolejny element.',
    examples: [emmetExamples.up, emmetExamples.doubleUp],
  },
  {
    id: 'repeat',
    title: 'Powtarzanie i numerowanie: * oraz $',
    description:
      'Powtarzaj krótki fragment, a nie cały dokument. Zawsze sprawdź otrzymaną liczbę elementów.',
    examples: [
      emmetExamples.list,
      emmetExamples.items,
      emmetExamples.numbering,
      emmetExamples.cells,
      emmetExamples.table,
      emmetExamples.cellsOnly,
    ],
  },
  {
    id: 'attributes',
    title: 'Klasy, identyfikatory i atrybuty: . # []',
    description:
      'Te znaki pomagają zapisać atrybuty HTML. Nie są poleceniami wykonującymi CSS ani JavaScript.',
    examples: [
      emmetExamples.className,
      emmetExamples.identifier,
      emmetExamples.attributes,
      emmetExamples.input,
      emmetExamples.button,
    ],
  },
  {
    id: 'groups',
    title: 'Grupowanie: ()',
    description: 'Po poznaniu krótkich skrótów możesz łączyć czytelne fragmenty w grupy.',
    examples: [emmetExamples.grouping],
  },
];

/** Each prefix is independently expandable, so the learner can inspect the growing tree. */
export const emmetChainParts = [
  {
    abbreviation: 'header',
    explanation: 'Zacznij od jednego elementu header. Na razie jest pusty.',
  },
  {
    abbreviation: 'header>h1{Tytuł}',
    explanation: '> wprowadza h1 do header. Klamry dodają do h1 tekst Tytuł.',
  },
  {
    abbreviation: 'header>h1{Tytuł}^main',
    explanation: '^ wychodzi z header. Main powstaje na tym samym poziomie co header.',
  },
  {
    abbreviation: 'header>h1{Tytuł}^main>p{Treść}',
    explanation: 'Kolejny > umieszcza akapit p z tekstem Treść wewnątrz main.',
  },
  {
    abbreviation: 'header>h1{Tytuł}^main>p{Treść}^footer',
    explanation:
      'Ostatni ^ wychodzi z main. Footer jest obok header i main, a nie w środku akapitu.',
  },
];
