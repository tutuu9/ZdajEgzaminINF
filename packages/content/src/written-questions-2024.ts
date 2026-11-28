import type { QuestionRevision } from '@zdaj/shared';

export const writtenExam2024Source = {
  id: 'cke-inf03-written-2024',
  url: 'https://cke.gov.pl/images/_EGZAMIN_ZAWODOWY/Formula_2019/Przykladowe_zadania/Pisemny/inf_03_pisemny.pdf',
  sourceLabel: 'CKE — przykładowy arkusz części pisemnej INF.03 (2024)',
  sha256: '596d946e546d05b8a964baa84dcbd2050c314817e0b6822bd742b24f6b6c0e06',
} as const;

const letters = ['a', 'b', 'c', 'd'] as const;

interface WrittenQuestion {
  number: number;
  page: number;
  crop: [top: number, bottom: number];
  topic: string;
  title: string;
  answer: (typeof letters)[number];
  explanation: string;
  reasons: [string, string, string, string];
}

// The PDF contains the questions and options. The answers and explanations below
// are platform editorial work. Question 6 uses conflicting source file extensions.
const questions: WrittenQuestion[] = [
  {
    number: 1,
    page: 2,
    crop: [0.0399, 0.39819],
    topic: 'graphics-security',
    title: 'Znak ostrzegawczy z płomieniem',
    answer: 'b',
    explanation:
      'Płomień nad okręgiem ostrzega o materiałach utleniających, które mogą podtrzymywać lub nasilać pożar.',
    reasons: [
      'Znak materiałów łatwo zapalnych ma płomień bez okręgu.',
      'Okrąg pod płomieniem oznacza właściwości utleniające.',
      'Zakaz otwartego ognia ma okrągły znak z przekreśleniem.',
      'Zakaz gaszenia wodą pokazuje przekreślony symbol użycia wody.',
    ],
  },
  {
    number: 2,
    page: 2,
    crop: [0.42118, 0.55269],
    topic: 'html',
    title: 'Znacznik kodu',
    answer: 'c',
    explanation:
      'Element code nadaje fragmentowi semantykę kodu komputerowego. Dłuższy, wcięty fragment można umieścić w pre.',
    reasons: [
      'em oznacza akcent w wypowiedzi.',
      'span grupuje fragment tekstu bez szczególnego znaczenia.',
      'code oznacza fragment kodu.',
      'blockquote oznacza dłuższy cytat.',
    ],
  },
  {
    number: 3,
    page: 2,
    crop: [0.57725, 0.72478],
    topic: 'html',
    title: 'Poziomy nagłówków',
    answer: 'b',
    explanation:
      'HTML ma sześć poziomów nagłówków. h1 ma najwyższy poziom w hierarchii, a h6 najniższy.',
    reasons: [
      'Zakres pomija h5 i h6.',
      'Zakres obejmuje wszystkie sześć nagłówków.',
      'HTML nie definiuje h7 ani h8 jako nagłówków.',
      'Ostatnim nagłówkiem HTML jest h6.',
    ],
  },
  {
    number: 4,
    page: 2,
    crop: [0.74787, 0.88993],
    topic: 'html',
    title: 'Cel odnośnika',
    answer: 'b',
    explanation:
      'Wartość _blank otwiera docelowy dokument w nowym kontekście przeglądania. Zależnie od ustawień będzie to karta albo okno.',
    reasons: [
      '_parent wskazuje kontekst nadrzędny.',
      '_blank prosi o nową kartę lub okno.',
      '_self używa aktualnego kontekstu.',
      '_top wskazuje istniejący kontekst najwyższego poziomu.',
    ],
  },
  {
    number: 5,
    page: 3,
    crop: [0.0399, 0.18196],
    topic: 'html',
    title: 'Alternatywa tekstowa obrazu',
    answer: 'a',
    explanation:
      'alt przekazuje tekstową alternatywę obrazu. Dla obrazu informacyjnego powinna oddawać informację, którą obraz wnosi do strony.',
    reasons: [
      'alt udostępnia alternatywny opis.',
      'src jest adresem pliku.',
      'sizes opisuje rozmiar obrazu używany przy wyborze źródła.',
      'border dotyczy obramowania.',
    ],
  },
  {
    number: 7,
    page: 3,
    crop: [0.37686, 0.5098],
    topic: 'css',
    title: 'Wyrównanie w pionie',
    answer: 'a',
    explanation:
      'middle jest wartością vertical-align, używaną m.in. do pionowego wyrównania zawartości komórki tabeli. Dla dowolnego bloku dobór metody zależy od układu.',
    reasons: [
      'middle jest prawidłową wartością vertical-align.',
      'center nie jest wartością vertical-align.',
      'text-align wyrównuje tekst w poziomie.',
      'align nie jest właściwością CSS.',
    ],
  },
  {
    number: 8,
    page: 4,
    crop: [0.05629, 0.6072],
    topic: 'css',
    title: 'Obramowanie i odstępy',
    answer: 'c',
    explanation:
      'Podgląd pokazuje ciągłe czarne obramowanie. Odstęp wewnętrzny tworzy padding, a odstęp poza obramowaniem tworzy margin.',
    reasons: [
      'Kolor obramowania i oba odstępy różnią się od wymagań.',
      'Obramowanie jest kropkowane i ma kolor tła.',
      'Ciągła czarna linia oraz oba odstępy odpowiadają przykładowi.',
      'Linia na ilustracji jest ciągła, a nie kropkowana.',
    ],
  },
  {
    number: 9,
    page: 5,
    crop: [0.05629, 0.47874],
    topic: 'tools',
    title: 'Rozpoznawanie systemu CMS',
    answer: 'b',
    explanation: 'Znak Joomla! składa się z czterech połączonych elementów w różnych kolorach.',
    reasons: [
      'Niebieska kropla to znak innego systemu CMS.',
      'Cztery splecione elementy tworzą znak Joomla!.',
      'Pomarańczowy znak nie ma czterech splecionych elementów.',
      'Litera W w okręgu oznacza WordPress.',
    ],
  },
  {
    number: 10,
    page: 5,
    crop: [0.50172, 0.64376],
    topic: 'graphics-security',
    title: 'Kadrowanie grafiki',
    answer: 'b',
    explanation:
      'Kadrowanie zachowuje obszar wewnątrz wybranego kadru i odrzuca to, co jest poza nim.',
    reasons: [
      'Skalowanie zmienia rozmiar całego obrazu.',
      'Kadrowanie pozwala zostawić wybrany obszar.',
      'Odbicie odwraca obraz względem osi.',
      'Łączenie warstw nie usuwa obszaru poza kadrem.',
    ],
  },
  {
    number: 11,
    page: 5,
    crop: [0.66678, 0.84701],
    topic: 'css',
    title: 'Wspólny styl wybranych elementów',
    answer: 'a',
    explanation:
      'Tę samą klasę można dodać do elementów różnych typów i objąć je jedną regułą CSS.',
    reasons: [
      'Klasa może występować na dowolnej liczbie wybranych elementów.',
      'Pseudoklasa opisuje stan lub warunek dopasowania.',
      'Identyfikator powinien być unikatowy w dokumencie.',
      'Selektor akapitu nie obejmie nagłówków.',
    ],
  },
  {
    number: 12,
    page: 6,
    crop: [0.0399, 0.16828],
    topic: 'tools',
    title: 'Przesyłanie plików na serwer',
    answer: 'a',
    explanation:
      'FTP służy do przesyłania plików. W zadaniu chodzi o przesłanie plików witryny na serwer.',
    reasons: [
      'FTP obsługuje transfer plików.',
      'ICMP służy m.in. do komunikatów diagnostycznych sieci.',
      'SMTP służy do przesyłania poczty elektronicznej.',
      'NNTP służy do przesyłania wiadomości grup dyskusyjnych.',
    ],
  },
  {
    number: 13,
    page: 6,
    crop: [0.19127, 0.33334],
    topic: 'sql',
    title: 'Płaska struktura danych',
    answer: 'c',
    explanation:
      'W terminologii tego zadania jedna tabela z całą prostą listą danych odpowiada modelowi jednorodnemu, określanemu też jako płaski.',
    reasons: [
      'Model sieciowy opisuje rekordy połączone powiązaniami.',
      'Model relacyjny opiera się na relacjach i nie jest określeniem charakterystycznym dla jednej płaskiej listy.',
      'Model jednorodny odpowiada opisowi prostej jednotabelowej struktury.',
      'Model hierarchiczny opisuje układ drzewa.',
    ],
  },
  {
    number: 14,
    page: 6,
    crop: [0.35648, 0.48341],
    topic: 'sql',
    title: 'Relacja dwóch kluczy głównych',
    answer: 'c',
    explanation:
      'Każdy z dwóch kluczy jest unikatowy. Wiersz z jednej strony może mieć co najwyżej jeden pasujący wiersz z drugiej strony.',
    reasons: [
      'Unikatowość po obu stronach wyklucza wiele dopasowań.',
      'Klucz główny po drugiej stronie też jest unikatowy.',
      'Dwa unikatowe klucze dają powiązanie typu jeden do jednego.',
      'Po stronie pierwszego klucza nie ma powtarzających się wartości.',
    ],
  },
  {
    number: 15,
    page: 6,
    crop: [0.50657, 0.6335],
    topic: 'tools',
    title: 'Obsługa bazy w XAMPP',
    answer: 'b',
    explanation: 'phpMyAdmin to przeglądarkowy panel do zarządzania bazą, dołączany do XAMPP.',
    reasons: [
      'MySQL Workbench to osobne narzędzie desktopowe.',
      'phpMyAdmin jest panelem dostarczanym z XAMPP.',
      'pgAdmin jest narzędziem do PostgreSQL.',
      'SQLite to silnik bazy danych.',
    ],
  },
  {
    number: 16,
    page: 6,
    crop: [0.65649, 0.80355],
    topic: 'sql',
    title: 'Kontrola zmienionych tabel',
    answer: 'a',
    explanation:
      'Opcja CHANGED sprawdza tabele zmienione od poprzedniej kontroli albo niepoprawnie zamknięte w silnikach, które obsługują tę opcję.',
    reasons: [
      'Uwzględnione są zmiany od kontroli oraz niepoprawne zamknięcie.',
      'Ten opis pomija tabele zmodyfikowane.',
      'Punktem odniesienia jest poprzednia kontrola, nie początek sesji.',
      'Opcja nie zależy od istnienia odwołań do innych tabel.',
    ],
  },
  {
    number: 17,
    page: 7,
    crop: [0.0399, 0.16974],
    topic: 'sql',
    title: 'Łączenie ciągów tekstowych',
    answer: 'b',
    explanation: 'CONCAT składa podane fragmenty w jeden tekst, zachowując ich kolejność.',
    reasons: [
      'CONCAT nie usuwa fragmentów.',
      'Funkcja łączy napisy.',
      'Do skracania używa się funkcji wybierających fragment tekstu.',
      'Pobranie fragmentu to zadanie SUBSTR lub SUBSTRING.',
    ],
  },
  {
    number: 18,
    page: 7,
    crop: [0.19284, 0.32669],
    topic: 'sql',
    title: 'Definicja nowej tabeli',
    answer: 'c',
    explanation: 'CREATE TABLE definiuje nową tabelę, jej kolumny, typy danych i ograniczenia.',
    reasons: [
      'INSERT INTO dodaje wiersze do istniejącej tabeli.',
      'ALTER TABLE zmienia istniejącą tabelę.',
      'CREATE TABLE tworzy strukturę tabeli.',
      'CREATE DATABASE tworzy bazę, w której można potem utworzyć tabele.',
    ],
  },
  {
    number: 19,
    page: 7,
    crop: [0.34835, 0.62851],
    topic: 'sql',
    title: 'Kolumny i granica w zapytaniu',
    answer: 'c',
    explanation:
      'SELECT powinien pobrać wyłącznie imię i nazwisko. Operator < odrzuca również wiersze z rokiem równym 2002.',
    reasons: [
      'Gwiazdka zwraca wszystkie kolumny, a <= obejmuje również rok 2002.',
      'LIKE nie opisuje granicy roku, a gwiazdka zwraca wszystkie kolumny.',
      'Zgadza się zarówno lista kolumn, jak i ścisła granica roku.',
      'Data ostatniej wizyty nie zastępuje roku urodzenia.',
    ],
  },
  {
    number: 20,
    page: 7,
    crop: [0.65307, 0.81623],
    topic: 'sql',
    title: 'Fragment zapisu roku',
    answer: 'a',
    explanation:
      'SUBSTR wybiera dwa znaki od trzeciej pozycji. Dla roku 2017 daje to 17. Samo porównanie sufiksu nie rozróżnia stuleci.',
    reasons: [
      '2017 kończy się cyframi 17.',
      'Zapytanie nie używa porównania „większe niż”.',
      'Zapytanie nie używa porównania „mniejsze niż”.',
      'W zapytaniu użyto równości, nie wykluczenia.',
    ],
  },
  {
    number: 21,
    page: 8,
    crop: [0.0399, 0.37624],
    topic: 'sql',
    title: 'Łączenie warunków filtrowania',
    answer: 'a',
    explanation:
      'AND zachowuje tylko wiersze spełniające oba warunki. NULL w dacie szczepienia nie spełnia porównania z rokiem 2016.',
    reasons: [
      'Te dwa wpisy spełniają oba warunki.',
      'Figaro ma NULL w polu szczepienia.',
      'Fafik i Brutus mają inny rodzaj.',
      'SELECT zwraca imiona zwierząt, a nie nazwiska właścicieli.',
    ],
  },
  {
    number: 22,
    page: 8,
    crop: [0.39937, 0.52633],
    topic: 'sql',
    title: 'Obiekty do zestawiania danych',
    answer: 'a',
    explanation:
      'Raport nadaje danym układ prezentacji i wydruku. Jego źródłem mogą być dane z zapytania.',
    reasons: [
      'Raport jest obiektem przeznaczonym do prezentacji i wydruku.',
      'Zapytanie wybiera lub oblicza dane wejściowe.',
      'Formularz służy przede wszystkim do pracy z danymi na ekranie.',
      'W tym podziale obiektów bazodanowych właściwą nazwą jest raport.',
    ],
  },
  {
    number: 23,
    page: 8,
    crop: [0.54932, 0.67924],
    topic: 'sql',
    title: 'Zmiana struktury tabeli',
    answer: 'c',
    explanation:
      'ALTER TABLE zmienia definicję istniejącej tabeli, na przykład dodaje kolumnę lub zmienia jej typ.',
    reasons: [
      'Całą tabelę usuwa DROP TABLE.',
      'Nową tabelę tworzy CREATE TABLE.',
      'ALTER TABLE zmienia strukturę tabeli.',
      'Do zmiany wartości w rekordach służy UPDATE.',
    ],
  },
  {
    number: 24,
    page: 8,
    crop: [0.70227, 0.86711],
    topic: 'sql',
    title: 'Pozostałe uprawnienia do tabeli',
    answer: 'a',
    explanation:
      'Odebranie czterech wskazanych uprawnień pozostawia inne uprawnienia przyznane do tabeli, w tym ALTER.',
    reasons: [
      'Polecenie nie odbiera uprawnienia ALTER.',
      'DELETE jest na liście odebranych uprawnień.',
      'SELECT jest na liście odebranych uprawnień.',
      'INSERT jest na liście odebranych uprawnień.',
    ],
  },
  {
    number: 25,
    page: 9,
    crop: [0.0399, 0.15716],
    topic: 'javascript',
    title: 'Instrukcja wyboru',
    answer: 'd',
    explanation:
      'switch dopasowuje wartość do przypadków case i może użyć gałęzi default, gdy nie ma dopasowania.',
    reasons: [
      'enum nie jest instrukcją wyboru w JavaScript.',
      'break opuszcza pętlę lub blok switch.',
      'while powtarza fragment kodu.',
      'switch wybiera przypadek na podstawie wartości.',
    ],
  },
  {
    number: 26,
    page: 9,
    crop: [0.18172, 0.3238],
    topic: 'javascript',
    title: 'Maksimum z trzech liczb',
    answer: 'c',
    explanation:
      'Najpierw porównaj dwie liczby. Większą z nich porównaj z trzecią. Do ustalenia maksimum wystarczą dwa porównania.',
    reasons: [
      'Dla stałej liczby trzech wartości pętla nie jest potrzebna.',
      'Porównania nie wymagają tworzenia tablic.',
      'Dwa warunki pozwalają rozstrzygnąć oba porównania.',
      'Algorytm nie wymaga pięciu zmiennych.',
    ],
  },
  {
    number: 27,
    page: 9,
    crop: [0.34693, 0.48885],
    topic: 'php',
    title: 'Inicjalizacja obiektu',
    answer: 'c',
    explanation:
      'Konstruktor jest wywoływany przy tworzeniu obiektu i może ustawić jego początkowy stan.',
    reasons: [
      'Obiekt jest instancją klasy.',
      'Destruktor dotyczy końca życia obiektu.',
      'Konstruktor inicjalizuje nowy obiekt.',
      'Specyfikator dostępu określa widoczność składnika klasy.',
    ],
  },
  {
    number: 28,
    page: 9,
    crop: [0.51198, 0.65858],
    topic: 'php',
    title: 'Stała w PHP',
    answer: 'd',
    explanation:
      'Funkcja define przyjmuje nazwę stałej i jej wartość. Z tak zdefiniowanej stałej korzysta się bez prefiksu $.',
    reasons: [
      'Tworzenie zwykłej zmiennej nie wymaga define.',
      'Drugi argument nie oznacza rozmiaru tablicy.',
      'Podana liczba nie jest indeksem obiektu.',
      'Pierwszy argument to nazwa stałej, a drugi to jej wartość.',
    ],
  },
  {
    number: 29,
    page: 10,
    crop: [0.0399, 0.48516],
    topic: 'php',
    title: 'Parametry funkcji z pętlą',
    answer: 'd',
    explanation:
      'Funkcja potrzebuje literału tekstowego i liczby powtórzeń. Licznik od zera ze ścisłą górną granicą daje n iteracji.',
    reasons: [
      'Argument @ musi tu być literałem w cudzysłowie.',
      'W tym wariancie funkcja nie otrzymuje wartości n.',
      'Wywołanie przekazuje jeden argument zamiast dwóch.',
      'Przekazano właściwy znak i liczbę iteracji.',
    ],
  },
  {
    number: 30,
    page: 10,
    crop: [0.50828, 0.63521],
    topic: 'javascript',
    title: 'Prefiks literału liczbowego',
    answer: 'd',
    explanation:
      'Prefiks 0x oznacza zapis o podstawie 16. Literał z zadania ma wartość dziesiętną 322.',
    reasons: [
      'Dziesiętny zapis tej liczby nie używa prefiksu 0x.',
      'Literał dwójkowy zaczyna się od 0b.',
      'Literał ósemkowy może używać prefiksu 0o.',
      '0x oznacza zapis szesnastkowy.',
    ],
  },
  {
    number: 31,
    page: 10,
    crop: [0.65823, 0.81979],
    topic: 'php',
    title: 'Warunek dla otwartego przedziału',
    answer: 'a',
    explanation:
      'Liczba musi jednocześnie przekraczać dolną granicę i pozostawać poniżej górnej. Otwarte granice wymagają porównań ścisłych.',
    reasons: [
      'Koniunkcja łączy oba poprawnie skierowane warunki zakresu.',
      'Pierwsze porównanie wybiera również liczby poniżej przedziału.',
      'Ta alternatywa opisuje wartości po zewnętrznych stronach granic.',
      'Alternatywa nie wymaga, by oba ograniczenia były spełnione.',
    ],
  },
  {
    number: 32,
    page: 11,
    crop: [0.0399, 0.1878],
    topic: 'html',
    title: 'Dołączanie pliku JavaScript',
    answer: 'b',
    explanation: 'Atrybut src elementu script wskazuje przeglądarce plik, z którego ma pobrać kod.',
    reasons: [
      'Treść między znacznikami jest traktowana jak kod, a nie ścieżka.',
      'src wskazuje zewnętrzny plik skryptu.',
      'link nie jest atrybutem wskazującym źródło elementu script.',
      'Taki element link nie ładuje pliku jako wykonywanego skryptu.',
    ],
  },
  {
    number: 33,
    page: 11,
    crop: [0.21236, 0.34674],
    topic: 'javascript',
    title: 'Zwiększanie wartości zmiennej',
    answer: 'c',
    explanation:
      'Dla zmiennej liczbowej samodzielna instrukcja a++ zwiększa jej wartość o jeden. W wyrażeniu przyrostek ++ dodatkowo zwraca poprzednią wartość.',
    reasons: [
      'Przesunięcie bitowe nie jest dodaniem jedynki.',
      'Literał 1 nie może być celem przypisania.',
      'Przypisanie sumy do a zwiększa liczbę o jeden.',
      'Operacja & jest koniunkcją bitową.',
    ],
  },
  {
    number: 34,
    page: 11,
    crop: [0.3713, 0.53887],
    topic: 'javascript',
    title: 'Wyszukiwanie przez klasę CSS',
    answer: 'd',
    explanation:
      'getElementsByClassName dopasowuje nazwę klasy w atrybucie class, również gdy element ma kilka klas.',
    reasons: [
      'Widoczny tekst akapitu nie jest jego klasą.',
      'id to osobny atrybut.',
      'href wskazuje adres docelowy.',
      'Atrybut class zawiera szukaną nazwę.',
    ],
  },
  {
    number: 35,
    page: 11,
    crop: [0.56343, 0.84509],
    topic: 'php',
    title: 'Śledzenie wartości zwracanej',
    answer: 'a',
    explanation:
      'Pierwsze dwa warunki zwracają argument, który jest większy. Gdy żaden nie zachodzi dla równych liczb, działa ostatnia gałąź z wartością -1.',
    reasons: [
      'Opis uwzględnia obie nierówności i przypadek równości.',
      'Gałęzie nierówności wybierają większą liczbę.',
      'Dla równych liczb wykonywana jest ostatnia gałąź.',
      'Funkcja nie wybiera mniejszej wartości ani nie zwraca argumentu przy równości.',
    ],
  },
  {
    number: 36,
    page: 12,
    crop: [0.0399, 0.20761],
    topic: 'php',
    title: 'Odczyt danych z formularza',
    answer: 'b',
    explanation:
      'PHP udostępnia pola standardowego formularza wysłanego metodą POST w tablicy $_POST.',
    reasons: [
      '$_GET zawiera parametry adresu.',
      '$_POST udostępnia pola przesłane metodą POST.',
      '$_COOKIE zawiera dane ciasteczek.',
      'PHP nie udostępnia takiej standardowej tablicy jak $_ACTION.',
    ],
  },
  {
    number: 37,
    page: 12,
    crop: [0.23217, 0.39519],
    topic: 'php',
    title: 'Odczyt wierszy wyniku MySQLi',
    answer: 'c',
    explanation:
      'Pomyślne zapytanie SELECT zwraca obiekt wyniku. Kolejne wywołania mysqli_fetch_row pobierają z niego po jednym wierszu.',
    reasons: [
      'Zmienna połączenia nie jest wynikiem zapytania.',
      'mysql_fetch nie jest funkcją korzystającą z wyniku MySQLi.',
      'Pętla pobiera każdy kolejny wiersz wyniku.',
      'Obiekt wyniku nie jest tablicą imion.',
    ],
  },
  {
    number: 38,
    page: 12,
    crop: [0.41833, 0.65178],
    topic: 'javascript',
    title: 'Brakująca iteracja',
    answer: 'd',
    explanation:
      'Przy i < 5 mnożenie kończy się na 4. Warunek i < 6 uwzględni 5. W uruchamianym kodzie użyj też nazwy console pisanej małą literą.',
    reasons: [
      'Początkowe zero wyzerowałoby cały iloczyn.',
      'Mnożenie od zera również wyzerowałoby wynik.',
      'Zmniejszanie licznika nie doprowadzi go do brakującej wartości 5.',
      'Nowa granica pozwala wykonać iterację dla i równego 5.',
    ],
  },
  {
    number: 39,
    page: 12,
    crop: [0.67619, 0.83319],
    topic: 'tools',
    title: 'Mienie powierzone pracownikowi',
    answer: 'c',
    explanation:
      'Odpowiedź wynika z art. 124 Kodeksu pracy. Decydujące jest powierzenie mienia z obowiązkiem zwrotu lub rozliczenia.',
    reasons: [
      'Opis dotyczy opuszczenia miejsca pracy.',
      'Nienależyte wykonanie obowiązków nie oznacza samo w sobie powierzenia mienia.',
      'Ten wariant opisuje powierzenie z obowiązkiem zwrotu lub rozliczenia.',
      'Wyrok sądu nie jest w pytaniu warunkiem uznania mienia za powierzone.',
    ],
  },
  {
    number: 40,
    page: 13,
    crop: [0.0399, 0.19692],
    topic: 'tools',
    title: 'Szkolenie przed podjęciem pracy',
    answer: 'd',
    explanation:
      'Pytanie dotyczy szkolenia BHP przed dopuszczeniem do pracy. Szkolenie obejmuje zasady bezpieczeństwa i zagrożenia właściwe dla danego stanowiska.',
    reasons: [
      'Zmiana rozkładu godzin nie zastępuje szkolenia BHP.',
      'Obsługa sprzętu biurowego nie jest opisanym szkoleniem stanowiskowym.',
      'Wyposażenie stanowiska nie zastępuje szkolenia.',
      'Odpowiedź wskazuje szkolenie BHP przed rozpoczęciem pracy na stanowisku.',
    ],
  },
];

export const writtenQuestions2024: QuestionRevision[] = questions.map(
  ({ number, page, crop: [top, bottom], topic, title, answer, explanation, reasons }) => ({
    id: 'cke-inf03-2024-q' + String(number).padStart(2, '0'),
    version: 1,
    topicId: topic,
    level: 'intermediate',
    prompt: 'Arkusz CKE 2024 · ' + title,
    options: letters.map((id, index) => ({
      id,
      text: id.toUpperCase(),
      explanation: reasons[index]!,
    })),
    correctOptionId: answer,
    explanation: 'Objaśnienie platformy. ' + explanation,
    reference: writtenExam2024Source.url + '#page=' + page,
    source: {
      catalogId: writtenExam2024Source.id,
      url: writtenExam2024Source.url,
      page,
      questionNumber: number,
      top,
      bottom,
    },
  }),
);
