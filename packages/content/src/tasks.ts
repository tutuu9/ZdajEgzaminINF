import type { Criterion, GuidanceStep, ProjectFile, TaskVersion } from '@zdaj/shared';

export const libraryDatabase = `CREATE DATABASE IF NOT EXISTS biblioteka CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE biblioteka;
CREATE TABLE authors (id INT PRIMARY KEY, name VARCHAR(100) NOT NULL);
CREATE TABLE books (id INT PRIMARY KEY, title VARCHAR(120) NOT NULL, author_id INT NOT NULL, available TINYINT NOT NULL, FOREIGN KEY (author_id) REFERENCES authors(id));
INSERT INTO authors VALUES (1,'Anna Lis'),(2,'Jan Nowak'),(3,'Ewa Kot');
INSERT INTO books VALUES (1,'Atlas chmur',1,1),(2,'Błękitny szlak',2,0),(3,'Czas na kod',1,1),(4,'Dom nad jeziorem',3,1);`;

export const clubDatabase = `CREATE DATABASE IF NOT EXISTS planszowki CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE planszowki;
CREATE TABLE games (id INT PRIMARY KEY, title VARCHAR(100) NOT NULL, players INT NOT NULL);
CREATE TABLE meetings (id INT PRIMARY KEY, game_id INT NOT NULL, seats INT NOT NULL, FOREIGN KEY (game_id) REFERENCES games(id));
INSERT INTO games VALUES (1,'Leśne ścieżki',2),(2,'Miasto pomysłów',4),(3,'Wyprawa na Marsa',6);
INSERT INTO meetings VALUES (1,1,2),(2,2,4),(3,2,3),(4,3,5);`;

const libraryLogo = (width: number, height: number) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 640 320"><rect width="640" height="320" rx="24" fill="#e4efff"/><path d="M140 75h150q30 0 30 30v145q-25-25-55-25H140zm360 0H350q-30 0-30 30v145q25-25 55-25h125z" fill="#2361b8"/><path d="M320 105v145" stroke="#172b4d" stroke-width="10"/></svg>`;

const criterion = (
  id: string,
  title: string,
  description: string,
  method: Criterion['method'],
  check: Criterion['check'],
  points = 1,
): Criterion => ({ id, title, description, method, source: 'educational', points, check });
const step = (title: string, body: string, checkpoint: string): GuidanceStep => ({
  title,
  body,
  checkpoint,
});
const htmlStart = (title: string, body: string, script = '') => `<!doctype html>
<html lang="pl">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>${title}</title><link rel="stylesheet" href="style.css">${script}</head>
<body>${body}</body>
</html>`;

const libraryFiles: ProjectFile[] = [
  { path: 'baza.sql', content: libraryDatabase },
  {
    path: 'index.php',
    content: htmlStart(
      'Biblioteka szkolna',
      '\n<header><h1>Biblioteka szkolna</h1></header>\n<main><p>W tym miejscu wyświetl dostępne książki i autorów pobranych z bazy.</p><ul id="ksiazki"></ul></main>\n<footer>Projekt edukacyjny — własne dane.</footer>',
    ),
  },
  {
    path: 'style.css',
    content:
      '/* Dodaj własne style. Zachowaj czytelny kontrast i widoczny fokus. */\nbody { font-family: sans-serif; }\n',
  },
  {
    path: 'kwerendy.sql',
    content:
      '-- 1. Tytuły dostępnych książek i ich autorzy, rosnąco według tytułu.\n\n-- 2. Liczba dostępnych książek, kolumna o nazwie liczba.\n',
  },
  { path: 'logo.svg', content: libraryLogo(640, 320) },
];

export const tasks: TaskVersion[] = [
  {
    id: 'biblioteka',
    version: 2,
    title: 'Biblioteka szkolna',
    summary:
      'Połącz stronę PHP z bazą biblioteki. Wyświetl dostępne książki, przygotuj zapytania i dopracuj czytelny układ.',
    qualification: 'INF.03',
    topicIds: ['html-css', 'sql', 'php'],
    technologies: ['HTML', 'CSS', 'PHP', 'SQL', 'SVG'],
    durationMinutes: 150,
    difficulty: 'beginner',
    runtimeProfile: 'php-mariadb',
    origin: 'original',
    requirements: [
      'Pracuj na plikach index.php, style.css, baza.sql, kwerendy.sql i logo.svg. To autorskie zadanie szkoleniowe, nie arkusz CKE.',
      'Zaimportuj baza.sql do MariaDB. Baza biblioteka zawiera authors(id, name) oraz books(id, title, author_id, available). Nie zmieniaj danych wejściowych.',
      'W kwerendy.sql zapisz dwa zapytania zakończone średnikami: najpierw tytuł i nazwisko autora każdej dostępnej książki (available = 1), rosnąco według tytułu; potem liczbę dostępnych książek w kolumnie liczba.',
      'W index.php użyj połączenia z MariaDB na localhost: baza biblioteka, użytkownik root, puste hasło. Te dane dotyczą wyłącznie odizolowanego środowiska ćwiczenia. Możesz użyć MySQLi lub PDO.',
      'Strona ma mieć język polski, UTF-8, nagłówek h1 Biblioteka szkolna oraz listę ul#ksiazki. Każda dostępna książka jest osobnym elementem li zawierającym tytuł i autora. Treść pobierz zapytaniem z bazy; nie wpisuj wyników ręcznie do HTML.',
      'Dodaj logo.svg z tekstem alternatywnym Książka. Ustaw rozmiar pliku SVG na 320 × 160 bez zmiany proporcji rysunku.',
      'Połącz zewnętrzny arkusz style.css. Ustaw kolor tekstu body na #172b4d, szerokość maksymalną main na 960px i czytelne odstępy.',
      'Sprawdź polskie znaki, odczyt wszystkich dostępnych rekordów oraz obsługę błędu połączenia bez ujawniania danych technicznych. W treści HTML poprawnie koduj dane z bazy.',
    ],
    starterFiles: libraryFiles,
    guidance: {
      beginner: [
        step(
          'Poznaj pliki',
          'Otwórz baza.sql i odnajdź dwie tabele. author_id wskazuje autora książki. available = 1 oznacza dostępny egzemplarz. Najpierw uruchom sam import w swojej bazie.',
          'Widzisz 3 autorów i 4 książki.',
        ),
        step(
          'Sprawdź SQL osobno',
          'Ułóż zapytanie łączące books z authors po identyfikatorze autora. Dodaj warunek dostępności i sortowanie tytułu. Zanim napiszesz PHP, uruchom je w narzędziu bazy.',
          'Wynik zawiera trzy książki oraz odpowiadających im autorów.',
        ),
        step(
          'Połącz PHP z danymi',
          'Otwórz połączenie, ustaw utf8mb4 i wykonaj sprawdzone zapytanie. Pętla tworzy jeden element li z każdego wiersza. Koduj tekst przy wstawianiu do HTML.',
          'Lista zmienia się razem z danymi, a nie jest wpisana na stałe.',
        ),
        step(
          'Dopracuj i sprawdź',
          'Dodaj obraz i zewnętrzny CSS. Sprawdź rozmiar SVG, polskie znaki oraz komplet plików. Dopiero potem oddaj pracę.',
          'Po ponownym otwarciu strony nie ma błędów, a lista jest czytelna.',
        ),
      ],
      intermediate: [
        step(
          'Rozdziel warstwy',
          'Najpierw zweryfikuj relację i wyniki dwóch zapytań. Następnie połącz dane z istniejącym znacznikiem ul#ksiazki.',
          'Zapytania i wyświetlanie możesz testować niezależnie.',
        ),
        step(
          'Sprawdź przypadki brzegowe',
          'Przetestuj pusty wynik, polskie znaki i błąd połączenia. Zachowaj wymagania plików oraz stylów.',
          'Pusta lista nie powoduje awarii ani wycieku informacji.',
        ),
      ],
      advanced: [
        step(
          'Zaplanuj weryfikację',
          'Zbuduj rozwiązanie według kryteriów. Sprawdź, czy zmiana dostępności w testowej kopii bazy zmienia listę i licznik. Przywróć dane wejściowe przed oddaniem.',
          'Wynik zależy od bazy, a każdy warunek zadania ma własny test.',
        ),
      ],
    },
    hints: [
      'Rozdziel problem: poprawny import, poprawny SQL, dopiero potem HTML generowany przez PHP.',
      'Do połączenia rekordów potrzebujesz zgodności books.author_id z authors.id oraz warunku available = 1.',
      'Przejdź po wierszach wyniku zapytania i utwórz li dla każdego z nich. htmlspecialchars pomaga bezpiecznie wstawić tekst do HTML.',
    ],
    criteria: [
      criterion(
        'library-files',
        'Plik wejściowy PHP',
        'Istnieje plik wejściowy index.php.',
        'file',
        {
          type: 'file',
          path: 'index.php',
        },
      ),
      criterion(
        'library-heading',
        'Nagłówek strony',
        'Wyświetlono nagłówek Biblioteka szkolna.',
        'php',
        { type: 'php', path: 'index.php', selector: 'h1', text: 'Biblioteka szkolna' },
      ),
      criterion(
        'library-list',
        'Dostępne książki',
        'Lista zawiera trzy pozycje pobrane z bazy.',
        'php',
        { type: 'php', path: 'index.php', selector: '#ksiazki li', minCount: 3, maxCount: 3 },
      ),
      criterion(
        'library-data',
        'Dane książek i autorów',
        'Na stronie obecne są tytuły oraz autorzy dostępnych książek.',
        'php',
        {
          type: 'php',
          path: 'index.php',
          selector: '#ksiazki',
          texts: ['Atlas chmur', 'Czas na kod', 'Dom nad jeziorem', 'Anna Lis', 'Ewa Kot'],
          absentTexts: ['Błękitny szlak'],
        },
        2,
      ),
      criterion(
        'library-query-join',
        'Zapytanie z relacją',
        'Pierwsze zapytanie zwraca tytuł i autora dostępnych książek w kolejności tytułów.',
        'sql',
        {
          type: 'sql',
          path: 'kwerendy.sql',
          database: 'biblioteka',
          queryIndex: 0,
          expectedRows: [
            ['Atlas chmur', 'Anna Lis'],
            ['Czas na kod', 'Anna Lis'],
            ['Dom nad jeziorem', 'Ewa Kot'],
          ],
          orderMatters: true,
        },
        2,
      ),
      criterion(
        'library-query-count',
        'Liczba dostępnych książek',
        'Drugie zapytanie zwraca jedną kolumnę liczba i wartość 3.',
        'sql',
        {
          type: 'sql',
          path: 'kwerendy.sql',
          database: 'biblioteka',
          queryIndex: 1,
          expectedColumns: ['liczba'],
          expectedRows: [[3]],
        },
      ),
      criterion(
        'library-color',
        'Czytelny tekst',
        'Kolor tekstu body odpowiada #172b4d.',
        'style',
        {
          type: 'style',
          path: 'index.php',
          selector: 'body',
          property: 'color',
          value: 'rgb(23, 43, 77)',
        },
      ),
      criterion(
        'library-width',
        'Szerokość treści',
        'main ma maksymalną szerokość 960px.',
        'style',
        {
          type: 'style',
          path: 'index.php',
          selector: 'main',
          property: 'max-width',
          value: '960px',
        },
      ),
      criterion(
        'library-image',
        'Rozmiar grafiki',
        'Własny plik SVG ma wymiary 320 × 160.',
        'image',
        { type: 'image', path: 'logo.svg', width: 320, height: 160, format: 'svg' },
      ),
      criterion(
        'library-review',
        'Samodzielna kontrola jakości',
        'Samodzielnie sprawdź komplet plików i import niezmienionego baza.sql, język i UTF-8 strony, przypisanie autorów do książek, osadzenie logo z alt="Książka", proporcje rysunku, zewnętrzny CSS, kodowanie wyjścia HTML, czytelność i zachowanie po utracie połączenia. Testy automatyczne nie potwierdzają wszystkich tych wymagań.',
        'manual',
        { type: 'manual' },
      ),
    ],
    followUp:
      'Dodaj do własnej kopii projektu filtr autora. Użyj parametru zapytania i sprawdź autora, który nie ma dostępnych książek.',
  },
  {
    id: 'warsztaty',
    version: 2,
    title: 'Kalkulator warsztatów',
    summary:
      'Zbuduj dwie strony oferty i formularz, który oblicza koszt warsztatów z liczbą uczestników oraz rabatem.',
    qualification: 'INF.03',
    topicIds: ['html-css', 'javascript'],
    technologies: ['HTML', 'CSS', 'JavaScript'],
    durationMinutes: 150,
    difficulty: 'intermediate',
    runtimeProfile: 'web',
    origin: 'original',
    requirements: [
      'Utwórz index.html, oferta.html, style.css i app.js. Obie strony mają polski język, UTF-8, wspólny arkusz stylów i nawigację między stronami.',
      'Na index.html umieść h1 Kalkulator warsztatów i formularz #kalkulator. Dodaj select#kurs z wartościami html, js, php; input#osoby typu number z zakresem 1–20; checkbox#rabat; przycisk submit oraz output#wynik.',
      'Ceny za osobę wynoszą: HTML — 120 zł, JavaScript — 180 zł, PHP — 220 zł. Zaznaczony rabat obniża cały koszt o 10%.',
      'Po wysłaniu formularza oblicz koszt bez przeładowania strony. Wynik wyświetl z dwiema cyframi po separatorze dziesiętnym i jednostką zł. Dopuszczalny jest przecinek lub kropka dziesiętna.',
      'Nie pokazuj nowej poprawnej wyceny dla pustej liczby, zera, liczby ujemnej, niecałkowitej lub większej niż 20. Wyświetl czytelny komunikat albo skorzystaj z wbudowanej walidacji formularza.',
      'W oferta.html umieść tabelę z trzema kursami i cenami, nagłówkami kolumn oraz podpisem. Formularz ma mieć etykiety powiązane z polami.',
      'Ustaw display: grid na main, gap: 24px oraz kolor tła body #f5f8fc. Przy wąskim oknie układ powinien dać się czytać bez poziomego przewijania całej strony.',
    ],
    starterFiles: [
      {
        path: 'index.html',
        content: htmlStart(
          'Kalkulator warsztatów',
          '\n<header><h1>Kalkulator warsztatów</h1></header>\n<nav><a href="oferta.html">Oferta</a></nav>\n<main><form id="kalkulator"><!-- Dodaj pola i przycisk. --></form><output id="wynik" aria-live="polite"></output></main>',
          '<script src="app.js" defer></script>',
        ),
      },
      {
        path: 'oferta.html',
        content: htmlStart(
          'Oferta warsztatów',
          '<h1>Oferta warsztatów</h1><nav><a href="index.html">Kalkulator</a></nav><main><!-- Dodaj tabelę oferty. --></main>',
        ),
      },
      {
        path: 'style.css',
        content: 'body { font-family: sans-serif; margin: 24px; }\n/* Zbuduj czytelny układ. */\n',
      },
      { path: 'app.js', content: '// Połącz formularz z obliczeniem kosztu.\n' },
    ],
    guidance: {
      beginner: [
        step(
          'Zbuduj formularz',
          'Dodaj pola jedno po drugim i nadaj im wymagane identyfikatory. Każde pole musi mieć label. Przed JavaScriptem sprawdź wybór kursu i ograniczenia liczby osób.',
          'Możesz wypełnić formularz samą klawiaturą.',
        ),
        step(
          'Policz przykład na kartce',
          'Dla dwóch osób na JavaScript koszt to 360 zł, a z rabatem 324 zł. Zapisz kolejność obliczeń: cena razy liczba osób, następnie rabat.',
          'Masz znane wyniki do porównania z programem.',
        ),
        step(
          'Obsłuż zdarzenie',
          'Nasłuchuj submit na formularzu. Zatrzymaj domyślne wysłanie, zamień wartość pola na liczbę, sprawdź zakres, oblicz koszt i wpisz tekst do output.',
          'Strona nie przeładowuje się przy poprawnej wycenie.',
        ),
        step(
          'Zmień dane testowe',
          'Sprawdź każdy kurs, rabat i granice 1 oraz 20 osób. Sprawdź też puste pole i 21 osób.',
          'Niepoprawne dane nie dają wiarygodnie wyglądającej wyceny.',
        ),
      ],
      intermediate: [
        step(
          'Oddziel obliczenie od interfejsu',
          'Funkcja obliczająca koszt powinna dostać wybrany kurs, liczbę osób i rabat. Obsługa formularza pobiera dane i pokazuje wynik.',
          'Możesz ręcznie sprawdzić funkcję dla kilku zestawów.',
        ),
        step(
          'Zadbaj o dostępność',
          'Powiąż etykiety, użyj output i widocznego fokusu. Przetestuj obie strony w wąskim oknie.',
          'Treść pozostaje dostępna przy powiększeniu.',
        ),
      ],
      advanced: [
        step(
          'Przygotuj macierz przypadków',
          'Przetestuj trzy ceny, oba stany rabatu, granice zakresu, liczbę niecałkowitą i ponowne przeliczenie po zmianie kursu.',
          'Wynik zawsze odnosi się do aktualnych danych formularza.',
        ),
      ],
    },
    hints: [
      'Wartość pola formularza jest tekstem. Przed mnożeniem i kontrolą zakresu zamień ją świadomie na liczbę.',
      'Przy rabacie pomnóż cenę całkowitą przez 0.9. Weryfikuj liczbę całkowitą od 1 do 20.',
      'Obsłuż submit, wywołaj preventDefault i aktualizuj textContent elementu #wynik. Wynik liczbowy możesz sformatować metodą toFixed(2).',
    ],
    criteria: [
      criterion('workshop-files', 'Druga strona oferty', 'Istnieje oferta.html.', 'file', {
        type: 'file',
        path: 'oferta.html',
      }),
      criterion('workshop-heading', 'Nagłówek', 'Strona zawiera właściwy nagłówek.', 'dom', {
        type: 'dom',
        path: 'index.html',
        selector: 'h1',
        text: 'Kalkulator warsztatów',
      }),
      criterion(
        'workshop-fields',
        'Formularz',
        'Formularz zawiera listę kursów, pole liczbowe i checkbox; na stronie jest element output wyniku.',
        'dom',
        {
          type: 'dom',
          path: 'index.html',
          selector:
            '#kalkulator select#kurs, #kalkulator input#osoby[type="number"], #kalkulator input#rabat[type="checkbox"], output#wynik',
          minCount: 4,
          maxCount: 4,
        },
      ),
      criterion('workshop-labels', 'Etykiety pól', 'Każde pole ma przypisaną etykietę.', 'dom', {
        type: 'dom',
        path: 'index.html',
        selector:
          'body:has(label[for="kurs"], label #kurs):has(label[for="osoby"], label #osoby):has(label[for="rabat"], label #rabat)',
      }),
      criterion(
        'workshop-table',
        'Treść tabeli oferty',
        'Tabela zawiera nazwy HTML, JavaScript i PHP oraz wartości 120, 180 i 220.',
        'dom',
        {
          type: 'dom',
          path: 'oferta.html',
          selector: 'table',
          texts: ['HTML', 'JavaScript', 'PHP', '120', '180', '220'],
        },
      ),
      criterion(
        'workshop-table-rows',
        'Wiersze oferty',
        'Tabela ma trzy wiersze z komórkami danych td.',
        'dom',
        {
          type: 'dom',
          path: 'oferta.html',
          selector: 'table tr:has(td)',
          minCount: 3,
          maxCount: 3,
        },
      ),
      criterion(
        'workshop-table-headers',
        'Nagłówki tabeli',
        'Tabela zawiera co najmniej dwie komórki nagłówkowe th.',
        'dom',
        {
          type: 'dom',
          path: 'oferta.html',
          selector: 'table tr > th',
          minCount: 2,
        },
      ),
      criterion(
        'workshop-table-caption',
        'Podpis tabeli',
        'Tabela zawiera podpis w elemencie caption.',
        'dom',
        {
          type: 'dom',
          path: 'oferta.html',
          selector: 'table > caption:not(:empty)',
        },
      ),
      criterion(
        'workshop-calculate',
        'Obliczenia i walidacja',
        'Koszt zależy od kursu, liczby osób i rabatu; niepoprawne liczby są odrzucane.',
        'javascript',
        { type: 'javascript', path: 'index.html', action: 'workshop-calculator' },
        3,
      ),
      criterion('workshop-grid', 'Układ treści', 'main korzysta z układu grid.', 'style', {
        type: 'style',
        path: 'index.html',
        selector: 'main',
        property: 'display',
        value: 'grid',
      }),
      criterion(
        'workshop-gap',
        'Odstępy w siatce',
        'Odstęp pomiędzy elementami main wynosi 24px.',
        'style',
        { type: 'style', path: 'index.html', selector: 'main', property: 'gap', value: '24px' },
      ),
      criterion('workshop-background', 'Tło', 'Tło body ma kolor #f5f8fc.', 'style', {
        type: 'style',
        path: 'index.html',
        selector: 'body',
        property: 'background-color',
        value: 'rgb(245, 248, 252)',
      }),
      criterion(
        'workshop-review',
        'Układ i obsługa klawiaturą',
        'Samodzielnie sprawdź język polski i UTF-8 obu stron, wspólny zewnętrzny CSS, nawigację w obie strony, przypisanie cen do odpowiednich kursów, znaczenie nagłówków i podpisu tabeli, zrozumiałe etykiety, czytelność na telefonie, komunikat błędu i widoczność fokusu. Testy struktury tabeli nie potwierdzają poprawności wszystkich tych wymagań.',
        'manual',
        { type: 'manual' },
      ),
    ],
    followUp:
      'Dodaj drugi rodzaj rabatu: stałe 30 zł od zamówienia. Wyjaśnij, czy rabaty można łączyć, i przygotuj testy tej zasady.',
  },
  {
    id: 'planszowki',
    version: 2,
    title: 'Klub planszówkowy',
    summary:
      'Połącz bazę gier z filtrem PHP i przełączanymi panelami JavaScript. Sprawdź relacje i podsumowania w SQL.',
    qualification: 'INF.03',
    topicIds: ['javascript', 'sql', 'php'],
    technologies: ['HTML', 'CSS', 'JavaScript', 'PHP', 'SQL'],
    durationMinutes: 150,
    difficulty: 'advanced',
    runtimeProfile: 'php-mariadb',
    origin: 'original',
    requirements: [
      'Przygotuj index.php, style.css, app.js, baza.sql i kwerendy.sql. Zaimportuj bazę planszowki z pliku wejściowego. Nie zmieniaj danych wejściowych.',
      'Tabela games zawiera id, title i players. meetings zawiera id, game_id i seats; game_id wskazuje grę. Połączenie ćwiczenia: localhost, użytkownik root, puste hasło, baza planszowki.',
      'W kwerendy.sql pierwsze zapytanie ma zwracać tytuł gry i liczbę miejsc każdego spotkania, rosnąco według meetings.id. Drugie ma zwracać tytuł gry i liczbę spotkań (kolumna liczba), rosnąco według tytułu.',
      'Strona ma zawierać h1 Klub planszówkowy, formularz GET z polem name="minPlayers" i listę ul#gry. Domyślnie pokaż trzy gry. Parametr minPlayers oznacza minimalną wartość players; dla 4 pokaż Miasto pomysłów i Wyprawa na Marsa.',
      'Pobieraj listę z bazy przy użyciu zweryfikowanego parametru i zapytania parametryzowanego. Każda gra ma być osobnym li zawierającym jej tytuł oraz liczbę graczy. Koduj tekst wyświetlany w HTML.',
      'Dodaj przyciski data-panel="gry-panel" i data-panel="spotkania-panel". W sekcjach o tych identyfikatorach umieść odpowiednio katalog gier i opis spotkań. Początkowo widoczny jest wyłącznie gry-panel. Po kliknięciu przycisku widoczna jest tylko wskazana sekcja, bez przeładowania.',
      'Użyj zewnętrznych style.css i app.js. body ma kolor tekstu #172b4d; main ma maksymalną szerokość 960px. Zadbaj o etykietę pola, tekst informujący o pustym wyniku i możliwość obsługi klawiaturą.',
    ],
    starterFiles: [
      { path: 'baza.sql', content: clubDatabase },
      {
        path: 'index.php',
        content: htmlStart(
          'Klub planszówkowy',
          '<header><h1>Klub planszówkowy</h1></header>\n<main><nav><button type="button" data-panel="gry-panel">Gry</button><button type="button" data-panel="spotkania-panel">Spotkania</button></nav>\n<section id="gry-panel"><form method="get"><label for="minPlayers">Minimalna liczba graczy</label><input id="minPlayers" name="minPlayers" type="number" min="1"><button>Filtruj</button></form><ul id="gry"></ul></section>\n<section id="spotkania-panel" hidden><h2>Spotkania klubu</h2><p>Przyjdź poznać nowe gry i innych graczy.</p></section></main>',
          '<script src="app.js" defer></script>',
        ),
      },
      { path: 'style.css', content: 'body { font-family: sans-serif; }\n' },
      { path: 'app.js', content: '// Przełącz widoczność sekcji według przycisku data-panel.\n' },
      {
        path: 'kwerendy.sql',
        content:
          '-- 1. Tytuł gry i liczba miejsc każdego spotkania, według meetings.id.\n\n-- 2. Tytuł gry i liczba spotkań w kolumnie liczba, według tytułu.\n',
      },
    ],
    guidance: {
      beginner: [
        step(
          'Odczytaj relację',
          'W jednej grze może odbyć się kilka spotkań. Połącz game_id z id gry i sprawdź wynik przed dodaniem grupowania.',
          'Pierwsze zapytanie zwraca cztery wiersze.',
        ),
        step(
          'Zbuduj filtr',
          'Parametr GET najpierw zweryfikuj. Dopiero potem przekaż liczbę do zapytania parametryzowanego. Brak parametru powinien dać pełną listę.',
          'Dla wartości 4 widzisz dokładnie dwie gry.',
        ),
        step(
          'Przełącz panele',
          'Przy kliknięciu odczytaj dataset.panel. Ukryj obie sekcje, następnie pokaż wybraną. Nie ukrywaj nawigacji.',
          'Możesz wrócić ze spotkań do gier bez utraty formularza.',
        ),
      ],
      intermediate: [
        step(
          'Testuj części oddzielnie',
          'Sprawdź relację SQL, filtr PHP i przełączanie paneli w osobnych próbach. Dopiero później połącz pełny interfejs.',
          'Wiesz, która warstwa odpowiada za ewentualną usterkę.',
        ),
        step(
          'Sprawdź brak danych',
          'Wprowadź minimum większe od liczby graczy każdej gry. Pokaż zrozumiałą informację zamiast pustej, nieopisanej sekcji.',
          'Niepoprawny parametr nie staje się fragmentem SQL.',
        ),
      ],
      advanced: [
        step(
          'Zbuduj listę ryzyk',
          'Zweryfikuj filtrowanie 1, 4, 7, pustą wartość i tekst zamiast liczby. Sprawdź, czy po zmianie panelu stan filtra nadal jest czytelny.',
          'Kod rozdziela pobieranie danych, renderowanie i zachowanie interfejsu.',
        ),
      ],
    },
    hints: [
      'Odróżnij pojedyncze spotkania od podsumowania: JOIN tworzy wiersze połączone, GROUP BY grupuje je według gry.',
      'Nie doklejaj parametru GET do tekstu SQL. Zweryfikuj liczbę i przekaż ją jako parametr zapytania.',
      'Do przełączania sekcji możesz użyć właściwości hidden. Identyfikator sekcji odczytasz z przycisku przez dataset.panel.',
    ],
    criteria: [
      criterion('club-files', 'Skrypt JavaScript', 'Istnieje zewnętrzny app.js.', 'file', {
        type: 'file',
        path: 'app.js',
      }),
      criterion('club-heading', 'Nagłówek', 'Wyświetlono tytuł Klubu planszówkowego.', 'php', {
        type: 'php',
        path: 'index.php',
        selector: 'h1',
        text: 'Klub planszówkowy',
      }),
      criterion('club-list', 'Lista początkowa', 'Bez filtra lista zawiera trzy gry.', 'php', {
        type: 'php',
        path: 'index.php',
        selector: '#gry li',
        minCount: 3,
        maxCount: 3,
      }),
      criterion(
        'club-filter',
        'Filtr liczby graczy',
        'Dla minPlayers=4 lista zawiera właściwe dwie gry.',
        'php',
        {
          type: 'php',
          path: 'index.php?minPlayers=4',
          selector: '#gry',
          texts: ['Miasto pomysłów', 'Wyprawa na Marsa'],
          absentTexts: ['Leśne ścieżki'],
        },
        2,
      ),
      criterion(
        'club-join',
        'Spotkania i gry',
        'Pierwsze zapytanie łączy gry z każdym spotkaniem.',
        'sql',
        {
          type: 'sql',
          path: 'kwerendy.sql',
          database: 'planszowki',
          queryIndex: 0,
          expectedRows: [
            ['Leśne ścieżki', 2],
            ['Miasto pomysłów', 4],
            ['Miasto pomysłów', 3],
            ['Wyprawa na Marsa', 5],
          ],
          orderMatters: true,
        },
        2,
      ),
      criterion(
        'club-group',
        'Podsumowanie spotkań',
        'Drugie zapytanie podaje liczbę spotkań dla każdej gry.',
        'sql',
        {
          type: 'sql',
          path: 'kwerendy.sql',
          database: 'planszowki',
          queryIndex: 1,
          expectedRows: [
            ['Leśne ścieżki', 1],
            ['Miasto pomysłów', 2],
            ['Wyprawa na Marsa', 1],
          ],
          orderMatters: true,
        },
        2,
      ),
      criterion(
        'club-panels',
        'Przełączanie sekcji',
        'Kliknięcie zmienia widoczny panel i pozwala wrócić.',
        'javascript',
        {
          type: 'javascript',
          path: 'index.php',
          action: 'panel-switching',
          panels: ['gry-panel', 'spotkania-panel'],
        },
        2,
      ),
      criterion('club-width', 'Szerokość treści', 'main ma maksymalną szerokość 960px.', 'style', {
        type: 'style',
        path: 'index.php',
        selector: 'main',
        property: 'max-width',
        value: '960px',
      }),
      criterion(
        'club-review',
        'Jakość i bezpieczeństwo',
        'Samodzielnie sprawdź komplet plików i import niezmienionej bazy, alias liczba w drugim zapytaniu, liczbę graczy przy każdej grze, zapytania parametryzowane, kodowanie wyjścia HTML, formularz GET i etykietę pola, pusty wynik, treść paneli, zewnętrzne pliki CSS/JS, kolor tekstu body #172b4d i obsługę klawiaturą. Automatyczne testy nie potwierdzają wszystkich tych wymagań.',
        'manual',
        { type: 'manual' },
      ),
    ],
    followUp:
      'Dodaj formularz zapisu na spotkanie z walidacją liczby miejsc. Najpierw opisz zachowanie, gdy ostatnie miejsce próbują zająć dwie osoby.',
  },
];

export const resizedLibraryLogo = libraryLogo(320, 160);
