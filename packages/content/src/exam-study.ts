import type { ExamStudyGuide } from '@zdaj/shared';
import { wedkowanieStudy } from './study-wedkowanie.js';
import { studyActivities } from './study-activities.js';
import { kursyProject, kursyProjectSteps } from './study-project-kursy.js';
import { smokiProject, smokiProjectSteps } from './study-project-smoki.js';
import { wedkowanieProject, wedkowanieProjectSteps } from './study-project-wedkowanie.js';

const checkedAt = '2026-11-02';
const kursySource =
  'https://zawodowe.edu.pl/arkusze-praktyczne/inf-03/inf03-2025-styczen-01/rozwiazanie/';
const smokiSource =
  'https://zawodowe.edu.pl/arkusze-praktyczne/inf-03/inf03-2025-czerwiec-08/rozwiazanie/';

const kursyStudy: ExamStudyGuide = {
  id: 'kursy-komputerowe-study',
  taskId: 'inf03-01-25-01-sg',
  taskVersion: 1,
  version: 1,
  title: 'Kursy komputerowe: od polecenia do działającego kalkulatora',
  introduction:
    'To nasze objaśnienia do oryginalnego arkusza CKE, a nie oficjalne rozwiązanie komisji. Najpierw napisz fragment sam, następnie porównaj go z przykładem. Fragmenty uczą konkretnych umiejętności; nie stanowią kompletnego rozwiązania. Gotowe projekty znajdziesz w osobno oznaczonych materiałach zewnętrznych.',
  prerequisites: [
    'Pobierz oryginalny arkusz i pliki10.7z. Hasło z arkusza: KuRsyKompuTerow3&. W środku są baza.sql i klawiatura.jpg.',
    'Do pełnego zadania potrzebujesz lokalnej MariaDB/MySQL z phpMyAdmin, edytora oraz programu graficznego. Baza nazywa się obuwie — mimo że witryna dotyczy kursów.',
    'Utwórz osobny folder roboczy. Brudnopis poniżej zapisuje się lokalnie; pliki do oddania przygotuj w zakładce Pliki i kod albo we własnym edytorze.',
  ],
  steps: [
    {
      id: 'structure',
      title: '1. Zbuduj szkielet i połącz dwa pliki',
      page: 3,
      requirement: 'Wspólna struktura index.html oraz raty.html.',
      explanation:
        'HTML opisuje elementy, CSS ich wygląd, a JavaScript zachowanie. Zacznij od dokumentu, który otwiera się bez błędów. head zawiera ustawienia, body widoczną stronę. Ten szkielet zastosuj do obu podstron; później wypełnisz main ich różną zawartością.',
      language: 'html',
      fileName: 'raty.html',
      starterCode:
        '<!doctype html>\n<!-- Dodaj język, kodowanie, tytuł, arkusz CSS i bloki strony. -->',
      code: `<!doctype html>
<html lang="pl">
<head>
  <meta charset="UTF-8">
  <title>Kursy komputerowe</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <header><img src="baner.png" alt="kursy komputerowe"></header>
  <nav>
    <a href="index.html">Strona główna</a>
    <a href="raty.html">Koszt rat</a>
    <a href="https://moje-szkolenia.pl/">Nasz partner</a>
  </nav>
  <main><!-- Tu dodasz zawartość tej podstrony. --></main>
  <footer><p>Autor strony: NUMER_ZDAJĄCEGO</p></footer>
</body>
</html>`,
      why: [
        'lang opisuje język dokumentu; charset ustala interpretację znaków.',
        'href wskazuje plik względem bieżącego folderu. Obie strony mogą używać jednego CSS.',
        'Semantyczne bloki mówią, jaką rolę pełni zawartość. Nie zastępuj ich samymi div.',
      ],
      commonMistakes: [
        'style.css i styl.css to różne nazwy.',
        'Samo ustawienie szerokości obrazka w CSS nie tworzy wymaganego pliku baner.png. Przygotuj go w edytorze grafiki.',
      ],
      checkpoint:
        'Otwórz index.html i przejdź odnośnikiem do raty.html. Sprawdź polskie znaki i tytuł karty. Dopełnij treść index.html według strony 4 PDF.',
    },
    {
      id: 'controls',
      title: '2. Nadaj kontrolkom nazwy, których użyje skrypt',
      page: 4,
      requirement: 'Formularz obliczania rat na raty.html.',
      explanation:
        'id pozwala JavaScriptowi znaleźć dokładnie jeden element. Etykieta label z for łączy opis z polem: kliknięcie opisu zaznacza checkbox. Checkbox udostępnia stan checked, pole liczbowe wartość, a select wybraną opcję. Wstaw fragment do main.',
      language: 'html',
      fileName: 'raty.html',
      starterCode:
        '<h3>Oblicz miesięczną ratę</h3>\n<!-- Dodaj 2 checkboxy, liczbę rat, miasta, przycisk i pusty wynik. -->',
      code: `<h3>Oblicz miesięczną ratę</h3>
<input class="kontrolki" id="react" type="checkbox">
<label for="react">Kurs React.js</label><br>
<input class="kontrolki" id="javascript" type="checkbox">
<label for="javascript">Kurs JavaScript</label><br>
<label for="raty">Liczba rat:</label>
<input class="kontrolki" id="raty" type="number" min="1" step="1"><br>
<select class="kontrolki" id="miasto" aria-label="Miasto kursu">
  <option>Warszawa</option><option>Katowice</option><option>Gdańsk</option>
</select>
<button class="kontrolki" id="oblicz" type="button">Oblicz</button>
<p id="wynik"></p>
<script src="raty.js" defer></script>`,
      why: [
        'Wspólna klasa kontrolki służy formatowaniu; unikalne id służą odczytowi konkretnych danych.',
        'type="button" nie wysyła formularza i nie odświeża strony.',
        'defer pozwala wykonać plik skryptu po zbudowaniu dokumentu.',
      ],
      commonMistakes: [
        'Dwa pola z takim samym id utrudniają odczyt.',
        'value checkboxa nie mówi, czy jest zaznaczony. Do tego służy checked.',
      ],
      checkpoint:
        'Kliknij etykietę kursu. Powinna zmienić zaznaczenie. Wybierz każde miasto i sprawdź, czy przycisk nie przeładowuje strony.',
    },
    {
      id: 'selectors',
      title: '3. Czytaj selektor od prawej do lewej',
      page: 4,
      requirement: 'Style znaczników oraz odnośników tylko w menu.',
      explanation:
        'Reguła CSS składa się z selektora i deklaracji. nav a oznacza odnośnik znajdujący się wewnątrz nav. Dzięki temu link pocztowy w main zachowuje inne formatowanie. Poniżej tylko część CSS: dopisz pozostałe reguły z PDF.',
      language: 'css',
      fileName: 'style.css',
      starterCode:
        '/* Zapisz font dla wszystkich elementów, tło body, styl nav a oraz stan hover. */',
      code: `* { font-family: Helvetica, sans-serif; }
body { background-color: #EAEAEA; }
img { width: 100%; }
.kontrolki { margin: 5px; }
nav a {
  font-weight: bold;
  background-color: #EAEAEA;
  color: #625B5B;
  padding: 10px;
  margin: 50px;
  border-radius: 20px;
}
nav a:hover {
  background-color: #625B5B;
  color: #EAEAEA;
  border: 1px solid #EAEAEA;
}`,
      why: [
        'Kropka wybiera klasę, nazwa znacznika wybiera wszystkie takie elementy.',
        'padding tworzy odstęp wewnątrz tła, margin poza nim.',
        ':hover działa, gdy wskaźnik jest nad elementem.',
      ],
      commonMistakes: [
        'Samo a zmieni wszystkie odnośniki, również poza menu.',
        'Nie zastępuj selektorów znaczników klasami tam, gdzie arkusz wprost wymaga konkretnego selektora.',
      ],
      checkpoint:
        'Najedź na menu, a potem na link pocztowy. Tylko menu powinno otrzymać opisany efekt. Sprawdź pozostałe style w PDF, nie tylko podobieństwo do ilustracji.',
    },
    {
      id: 'calculator',
      title: '4. Odczytaj dane, oblicz, pokaż wynik',
      page: 5,
      requirement: 'Obsługa przycisku Oblicz i miesięcznej raty.',
      explanation:
        'Rozbij zadanie na trzy etapy. Odczytaj zaznaczenia i liczbę rat, dodaj ceny wybranych kursów, podziel sumę. Na końcu wpisz wynik do istniejącego paragrafu. Ceny w tabeli arkusza wynoszą 5000 i 3000 zł. Walidacja niepoprawnej liczby rat jest dodatkowym zabezpieczeniem przykładu.',
      language: 'javascript',
      fileName: 'raty.js',
      starterCode:
        "function obliczRate() {\n  // Odczytaj pola. Policz kwotę i ratę. Uzupełnij paragraf.\n}\ndocument.getElementById('oblicz').addEventListener('click', obliczRate);",
      code: `function obliczRate() {
  const liczbaRat = document.getElementById('raty').valueAsNumber;
  const wynik = document.getElementById('wynik');
  if (!Number.isInteger(liczbaRat) || liczbaRat <= 0) {
    wynik.textContent = 'Podaj dodatnią całkowitą liczbę rat.';
    return;
  }
  let kwota = 0;
  if (document.getElementById('react').checked) kwota += 5000;
  if (document.getElementById('javascript').checked) kwota += 3000;
  const miasto = document.getElementById('miasto').value;
  const rata = kwota / liczbaRat;
  wynik.textContent = 'Kurs odbędzie się w ' + miasto +
    '. Koszt całkowity: ' + kwota + ' zł. Płacisz ' +
    liczbaRat + ' rat po ' + rata + ' zł';
}
document.getElementById('oblicz').addEventListener('click', obliczRate);`,
      why: [
        'valueAsNumber odczytuje liczbę; puste pole daje NaN.',
        'let pozwala zwiększać sumę, const utrzymuje pozostałe odczyty w jednym wywołaniu.',
        'textContent wpisuje tekst. Nie potrzebujesz w tym miejscu interpretacji HTML.',
        'Wymagana tabela nie oznacza użycia frameworka React. React.js jest nazwą kursu.',
      ],
      commonMistakes: [
        'Dzielenie przez zero daje Infinity.',
        'Umieszczenie let kwota poza funkcją może sumować ceny między kliknięciami.',
        'Nie pomyl dodawania liczb ze sklejaniem napisów.',
      ],
      checkpoint:
        'Oba kursy i 10 rat: 8000 zł, rata 800 zł. Sam JavaScript i 3 raty: 3000 zł, rata 1000 zł. Sprawdź też puste pole, zero i wielokrotne kliknięcia.',
    },
    {
      id: 'sql-permissions',
      title: '5. Oddziel stronę od operacji na bazie',
      page: 2,
      requirement: 'Osobna część SQL dotycząca bazy obuwie.',
      explanation:
        'To zadanie łączy dwie niezależne prace: stronę o kursach i operacje na bazie obuwie. Nie twórz tabel kursów zamiast importu. Po zapytaniach SELECT wykonaj instrukcje konta i uprawnień. Poniższe dane są publicznymi danymi ćwiczenia CKE; używaj ich wyłącznie w lokalnej bazie egzaminacyjnej.',
      language: 'sql',
      fileName: 'kwerendy.txt',
      starterCode:
        '-- Po imporcie zapisz zapytania 1 i 2 z PDF.\n-- Następnie utwórz konto oraz nadaj dokładnie wymagane uprawnienia.',
      code: `SELECT kolor, material FROM produkt WHERE wysokosc_buta > 10;
SELECT buty.nazwa, buty.cena, kategorie.nazwa_kat
FROM buty JOIN kategorie ON buty.id_kat = kategorie.id_kat;
CREATE USER 'Marek'@'localhost' IDENTIFIED BY 'M@reK';
GRANT SELECT, UPDATE ON obuwie.produkt TO 'Marek'@'localhost';
-- Kontrola dodatkowa; nie zastępuje czterech kwerend zadania:
SHOW GRANTS FOR 'Marek'@'localhost';`,
      why: [
        'SELECT określa kolumny, WHERE wybiera wiersze. JOIN łączy pasujące klucze, a nie dowolne rekordy.',
        'CREATE USER tworzy tożsamość, GRANT nadaje jej konkretne możliwości.',
        'obuwie.produkt ogranicza uprawnienia do jednej tabeli.',
        'SELECT odczytuje dane, UPDATE zmienia istniejące rekordy.',
      ],
      commonMistakes: [
        'GRANT ALL daje szersze uprawnienia niż wymagane.',
        'Powtórny CREATE USER dla istniejącego konta może zgłosić błąd. Nie powtarzaj go bez zrozumienia stanu bazy.',
        'Nie wykonuj tych poleceń na bazie platformy ani na zdalnym serwerze.',
      ],
      checkpoint:
        'Porównaj SHOW GRANTS z wymaganiami. Wykonaj własne zrzuty pełnego ekranu. Pliki z cudzymi zrzutami nie dokumentują Twojej pracy.',
    },
  ],
  resources: [
    {
      id: 'kursy-input',
      title: 'Pliki wejściowe: baza.sql i klawiatura.jpg',
      url: 'https://nuwaflrhlwnsdvnciltx.supabase.co/storage/v1/object/public/kursinf_main/exam_sheets/inf03/1753367876851_files.7z',
      kind: 'starter-archive',
      publisher: 'KURSINF — kopia załącznika do arkusza CKE',
      provenance: 'third-party',
      description:
        'Oryginalne dane zadania, nie gotowe rozwiązanie. Archiwum 7z; hasło podane w PDF. Sprawdzono listę plików.',
      checkedAt,
    },
    {
      id: 'kursy-criteria',
      title: 'Zasady oceniania — kopia w archiwum',
      url: 'https://zawodowe.edu.pl/arkusz-praktyczny/inf03-2025-styczen-01/klucz-odpowiedzi.pdf',
      kind: 'criteria',
      publisher: 'zawodowe.edu.pl',
      provenance: 'third-party',
      description:
        'Porównaj kryteria z identyfikatorem INF.03-01-25.01-SG na swoim arkuszu. To nie wynik automatycznej kontroli platformy.',
      checkedAt,
    },
  ],
  variants: [
    {
      id: 'classic',
      title: 'Gotowy projekt: wariant egzaminacyjny',
      description:
        'Zewnętrzne rozwiązanie z plikami HTML, CSS, JavaScript i SQL. Najpierw przeczytaj objaśnienia autora; nie kopiuj bez zrozumienia.',
      approach:
        'Czytaj kolejno HTML → CSS → JavaScript → kwerendy. Autor: Bartosz Bryniarski / zawodowe.edu.pl. Nie jest to oficjalna odpowiedź CKE.',
      url: kursySource,
      downloadUrl: kursySource + 'pobierz.zip',
    },
    {
      id: 'modern',
      title: 'Drugi wariant: organizacja kodu i współczesny układ',
      description:
        'Porównaj inny sposób organizacji kodu na stronie autora. Wymagania PDF pozostają nadrzędne; nazwa „nowoczesny” nie gwarantuje zgodności z każdym kryterium.',
      approach:
        'Zewnętrzny wariant z oddzielnym skryptem i układem CSS Grid; materiał do porównania rozwiązań, bez gwarancji wyniku.',
      url: kursySource + 'nowoczesny/',
      downloadUrl: kursySource + 'nowoczesny/pobierz.zip',
    },
  ],
};

const smokiStudy: ExamStudyGuide = {
  id: 'baza-smokow-study',
  taskId: 'inf03-08-25-06-sg',
  taskVersion: 1,
  version: 1,
  title: 'Baza Smoków: połącz formularz, PHP i JavaScript',
  introduction:
    'Omówienie edukacyjne do arkusza CKE. Zobacz, co dzieje się w przeglądarce, a co na serwerze. Każdy krok dotyczy fragmentu wymagań; pełny projekt nadal trzeba porównać z PDF. Zewnętrzne gotowe rozwiązania są opisane oddzielnie.',
  prerequisites: [
    'Pobierz pliki7.7z; hasło z arkusza: SmoKi-Swi@ta#. Zawiera bazasmoki.sql, opis.txt oraz trzy obrazy smoków.',
    'Uruchom Apache/PHP i MariaDB/MySQL w lokalnym środowisku. Zaimportuj bazasmoki.sql do bazy smoki. PHP otwieraj przez adres localhost, nie dwuklikiem pliku.',
    'Podgląd HTML w platformie nie wykonuje PHP. Brudnopis służy pisaniu i porównywaniu; pełny projekt PHP testuj w swoim środowisku.',
  ],
  steps: [
    {
      id: 'form',
      title: '1. Zrozum drogę danych z formularza',
      page: 3,
      requirement: 'Formularz w pierwszej sekcji strony smoki.php.',
      explanation:
        'Przeglądarka wysyła pole o nazwie kraj do PHP. method="post" wybiera sposób przesłania danych, a action wskazuje skrypt odbierający. PHP odczyta wartość z $_POST. POST sam w sobie nie szyfruje danych; poufność transportu zapewnia HTTPS. Poniższe opcje są chwilowym przykładem — w pełnym zadaniu wypełni je zapytanie.',
      language: 'html',
      fileName: 'smoki.php',
      starterCode:
        '<form>\n  <!-- Dodaj listę krajów i przycisk. Ustaw metodę oraz adres. -->\n</form>',
      code: `<form action="smoki.php" method="post">
  <select name="kraj" aria-label="Kraj pochodzenia">
    <option>Polska</option>
    <option>Francja</option>
  </select>
  <button type="submit">Szukaj</button>
</form>
<table>
  <tr><th>Nazwa</th><th>Długość</th><th>Szerokość</th></tr>
  <!-- Tu skrypt PHP wygeneruje kolejne wiersze. -->
</table>`,
      why: [
        'name jest kluczem wysłanego pola; id sam nie wystarcza do przesłania wartości.',
        'Wybrana opcja bez atrybutu value wysyła swój tekst.',
        'Nagłówek tabeli pozostaje stały, a kolejne tr powstają z wyniku zapytania.',
      ],
      commonMistakes: [
        '$_GET nie odczyta tego formularza POST.',
        'Statyczne Polska i Francja służą zrozumieniu formularza; pozostawienie ich zamiast skryptu 1 nie spełnia pełnego zadania.',
      ],
      checkpoint:
        'Wyjaśnij własnymi słowami różnicę między name, id oraz method. W narzędziach przeglądarki sprawdź, że kliknięcie Szukaj wysyła POST.',
    },
    {
      id: 'css',
      title: '2. Ukryj sekcję, zachowując jej elementy',
      page: 4,
      requirement: 'Style tabeli, definicji i początkowa widoczność sekcji.',
      explanation:
        'display: none ukrywa element i usuwa jego miejsce z układu. Nie usuwa węzła z drzewa DOM: JavaScript nadal może go znaleźć i ponownie pokazać. Tak należy rozumieć skrót użyty w tabeli pomocniczej arkusza. Przykład obejmuje część CSS; dopisz resztę zgodnie z PDF.',
      language: 'css',
      fileName: 'styl.css',
      starterCode: '/* Ukryj sekcje opisy i galeria. Dodaj style table, dt oraz dt:hover. */',
      code: `#opisy, #galeria { display: none; }
table {
  margin: auto;
  width: 60%;
  border: 1px dashed Indigo;
}
dt { font-weight: bold; font-style: italic; }
dt:hover { font-size: 180%; }
main { overflow: auto; }`,
      why: [
        'Przecinek łączy dwa selektory, które mają otrzymać te same deklaracje.',
        'table i dt to wymagane selektory znaczników.',
        'overflow: auto pokazuje przewijanie dopiero przy nadmiarze zawartości.',
      ],
      commonMistakes: [
        'visibility: hidden zostawia puste miejsce.',
        'remove() usuwa element z DOM i nie pozwoli go pokazać samą zmianą display.',
        '180px oraz 180% oznaczają różne rozmiary.',
      ],
      checkpoint:
        'W narzędziach przeglądarki znajdź ukrytą sekcję i zmień display na block. Powinna się pojawić bez ponownego tworzenia HTML.',
    },
    {
      id: 'tabs',
      title: '3. Jedna funkcja może obsłużyć trzy widoki',
      page: 5,
      requirement: 'Przełączanie widoków Baza, Opisy i Galeria.',
      explanation:
        'Każde kliknięcie powinno ustawić cały stan: jeden widok jest widoczny, dwa ukryte; jeden przycisk ma aktywne tło, dwa pozostałe nie. Ustal identyfikatory sekcji baza, opisy, galeria i bloków nawigacji nav-baza, nav-opisy, nav-galeria. Skrypt umieść po HTML lub użyj defer.',
      language: 'javascript',
      fileName: 'widoki.js',
      starterCode:
        'function pokaz(wybrany) {\n  // Przejdź przez trzy identyfikatory, ustaw display i kolor tła.\n}',
      code: `const widoki = ['baza', 'opisy', 'galeria'];
function pokaz(wybrany) {
  for (const id of widoki) {
    const aktywny = id === wybrany;
    document.getElementById(id).style.display = aktywny ? 'block' : 'none';
    document.getElementById('nav-' + id).style.backgroundColor =
      aktywny ? 'MistyRose' : '#FFAEA5';
  }
}
for (const id of widoki) {
  document.getElementById('nav-' + id).addEventListener('click', () => pokaz(id));
}`,
      why: [
        'Parametr wybrany sprawia, że jedna funkcja obsługuje wszystkie trzy przypadki.',
        'Operator warunek ? a : b wybiera jedną z dwóch wartości.',
        'Pętla aktualizuje również nieaktywne widoki, więc nic nie zostaje przypadkowo otwarte.',
      ],
      commonMistakes: [
        'Zmiana tylko klikniętej sekcji może zostawić dwa widoki naraz.',
        'Identyfikatory w HTML i JavaScript muszą być identyczne.',
        'background-color to nazwa CSS; w obiekcie style użyj backgroundColor.',
      ],
      checkpoint:
        'Kliknij Baza → Galeria → Opisy → Baza. Za każdym razem policz widoczne sekcje i aktywne kolory: ma być dokładnie po jednym.',
    },
    {
      id: 'php-connection',
      title: '4. Połączenie PHP ma określony czas życia',
      page: 4,
      requirement: 'Połączenie z lokalną bazą smoki oraz zamknięcie go.',
      explanation:
        'PHP wykonuje się na serwerze i wysyła do przeglądarki wynikowy HTML. mysqli tworzy połączenie z bazą. Wykonaj oba skrypty podczas jego działania i zamknij je dopiero po ostatnim zapytaniu. Parametry root bez hasła są wymaganiami lokalnego stanowiska w tym arkuszu, nie konfiguracją publicznego serwera.',
      language: 'php',
      fileName: 'smoki.php',
      starterCode:
        '<?php\n// Otwórz połączenie z bazą smoki, ustaw kodowanie, potem je zamknij.\n?>',
      code: `<?php
$polaczenie = new mysqli('localhost', 'root', '', 'smoki');
$polaczenie->set_charset('utf8mb4');
// Tutaj wykonaj zapytania i wygeneruj HTML obu skryptów.
$polaczenie->close();
?>`,
      why: [
        'Kolejne argumenty to serwer, użytkownik, hasło oraz nazwa bazy.',
        'Kodowanie połączenia jest odrębne od meta charset w HTML.',
        'Po close nie można używać tego połączenia do kolejnego zapytania.',
      ],
      commonMistakes: [
        'Otwarcie pliku przez file:// nie uruchamia PHP.',
        'Nazwa smoki i istnienie zaimportowanych tabel muszą zgadzać się z konfiguracją.',
        'Powyższy fragment sam nie wypełnia listy ani tabeli — to rusztowanie dwóch skryptów.',
      ],
      checkpoint:
        'Uruchom przez localhost i sprawdź, czy serwer nie zgłasza błędu połączenia. Kod PHP nie powinien pojawiać się jako tekst strony.',
    },
    {
      id: 'sql',
      title: '5. Zanim napiszesz PHP, sprawdź zapytanie',
      page: 2,
      requirement: 'Zapytania bazy smoki i relacja przez tabelę udzial.',
      explanation:
        'Najpierw wykonaj SELECT w phpMyAdmin i obejrzyj wynik. Dopiero sprawdzony odczyt przenieś do PHP. smok i parada łączą się przez udzial. Bez tej tabeli pośredniej średnia mogłaby być liczona dla niewłaściwych smoków. Ostatnia instrukcja zmienia strukturę i nie powinna być uruchamiana przez każde odświeżenie strony.',
      language: 'sql',
      fileName: 'kwerendy.txt',
      starterCode:
        '-- Wybierz polskie smoki; wypisz kraje bez powtórzeń.\n-- Połącz smok → udzial → parada i oblicz średnie roczne.\n-- Dodaj kolumnę lokalizacja do parada.',
      code: `SELECT nazwa, dlugosc, szerokosc FROM smok WHERE pochodzenie = 'Polska';
SELECT DISTINCT pochodzenie FROM smok ORDER BY pochodzenie ASC;
SELECT parada.rok, AVG(smok.dlugosc) AS 'Średnia długość'
FROM parada
JOIN udzial ON udzial.id_parada = parada.id
JOIN smok ON udzial.id_smok = smok.id
WHERE parada.rok > '2005'
GROUP BY parada.rok;
ALTER TABLE parada ADD lokalizacja VARCHAR(100);`,
      why: [
        'DISTINCT usuwa powtórzenia, ORDER BY ustala kolejność.',
        'GROUP BY tworzy grupę dla każdego roku; AVG oblicza średnią w grupie.',
        'rok jest w pliku wejściowym polem CHAR(4). Czterocyfrowe lata mają zgodny porządek napisowy i chronologiczny.',
        'ALTER TABLE zmienia definicję tabeli, nie jej pojedynczy rekord.',
      ],
      commonMistakes: [
        'Połączenie smok.id = parada.id nie odwzorowuje tej relacji.',
        'SELECT * zwraca także kolumny, o które nie poproszono.',
        'Ponowne dodanie istniejącej kolumny lokalizacja zakończy się błędem.',
      ],
      checkpoint:
        'Wynik drugiego zapytania ma każdy kraj tylko raz. Dla wybranego roku policz średnią ręcznie i porównaj z trzecim zapytaniem.',
    },
    {
      id: 'php-options',
      title: '6. Zamień wynik SQL na opcje formularza',
      page: 4,
      requirement: 'Skrypt 1 wypełnia listę rozwijaną.',
      explanation:
        'Wstaw ten fragment między znacznikami select z kroku 1, w miejscu przykładowych opcji. Zmienna polaczenie pochodzi z kroku 4 i musi być jeszcze otwarta. Pętla pobiera po jednym wierszu aż skończą się dane. htmlspecialchars chroni granice HTML, gdy tekst zawiera znaki specjalne.',
      language: 'php',
      fileName: 'smoki.php',
      starterCode: '<?php\n// Wykonaj SELECT DISTINCT, pobieraj wiersze i wypisz option.\n?>',
      code: `<?php
$kraje = $polaczenie->query('SELECT DISTINCT pochodzenie FROM smok ORDER BY pochodzenie');
while ($wiersz = $kraje->fetch_assoc()) {
    $krajHtml = htmlspecialchars($wiersz['pochodzenie'], ENT_QUOTES, 'UTF-8');
    echo '<option value="' . $krajHtml . '">' . $krajHtml . '</option>';
}
?>`,
      why: [
        'fetch_assoc daje kolumny pod ich nazwami, nie numerami.',
        'Kropka w PHP skleja napisy.',
        'Kodowanie HTML stosujemy przy wypisywaniu. Nie zmieniamy w ten sposób danych zapisanych w bazie.',
      ],
      commonMistakes: [
        'Wypisanie option poza select nie utworzy poprawnej listy.',
        'Zapytanie bez DISTINCT może powtarzać ten sam kraj dla każdego smoka.',
      ],
      checkpoint:
        'Lista w przeglądarce powinna mieć te same kraje i kolejność co wynik zapytania 2. Nie dopisuj krajów ręcznie.',
    },
    {
      id: 'php-filter',
      title: '7. Oddziel wartość z formularza od składni SQL',
      page: 4,
      requirement: 'Skrypt 2 filtruje smoki po kraju otrzymanym przez POST.',
      explanation:
        'Wstaw fragment po nagłówku tabeli z kroku 1. Połączenie z kroku 4 nadal musi być otwarte. Znak zapytania w prepare jest miejscem na wartość. bind_param przekazuje kraj jako dane, dzięki czemu apostrof w wartości nie zmienia składni zapytania. To jeden z poprawnych sposobów wykonania filtrowania, nie dodatkowy wymóg komisji.',
      language: 'php',
      fileName: 'smoki.php',
      starterCode:
        "<?php\nif (isset($_POST['kraj']) && is_string($_POST['kraj'])) {\n    // Przygotuj zapytanie z parametrem, pobierz wynik, wypisz tr i td.\n}\n?>",
      code: `<?php
if (isset($_POST['kraj']) && is_string($_POST['kraj'])) {
    $kraj = $_POST['kraj'];
    $zapytanie = $polaczenie->prepare(
        'SELECT nazwa, dlugosc, szerokosc FROM smok WHERE pochodzenie = ?'
    );
    $zapytanie->bind_param('s', $kraj);
    $zapytanie->execute();
    $wynik = $zapytanie->get_result();
    while ($smok = $wynik->fetch_assoc()) {
        echo '<tr>';
        foreach (['nazwa', 'dlugosc', 'szerokosc'] as $kolumna) {
            echo '<td>' . htmlspecialchars((string) $smok[$kolumna], ENT_QUOTES, 'UTF-8') . '</td>';
        }
        echo '</tr>';
    }
    $zapytanie->close();
}
// Po obu skryptach zamknij $polaczenie, jak w kroku 4.
?>`,
      why: [
        'Warunek rozróżnia pierwsze otwarcie strony od wysłanego formularza.',
        's oznacza parametr tekstowy.',
        'Każdy rekord to jeden tr, każda z trzech wartości to td.',
        'Parametry SQL oraz kodowanie HTML rozwiązują dwa różne problemy.',
      ],
      commonMistakes: [
        'Nie sklejaj $_POST bezpośrednio z tekstem zapytania.',
        'get_result wymaga sterownika mysqlnd, dostępnego w typowej instalacji XAMPP; w innej konfiguracji użyj bind_result i fetch.',
        'Zamknięcie połączenia przed wykonaniem tego fragmentu zatrzyma pobieranie danych.',
      ],
      checkpoint:
        'Przed wysłaniem formularza widoczny jest tylko nagłówek tabeli. Po wybraniu Francji porównaj wiersze z takim samym SELECT w phpMyAdmin. Nieznany kraj ma dać pustą tabelę, a nie błąd SQL.',
    },
  ],
  resources: [
    {
      id: 'smoki-input',
      title: 'Pliki wejściowe: baza, opis i trzy obrazy',
      url: 'https://nuwaflrhlwnsdvnciltx.supabase.co/storage/v1/object/public/kursinf_main/exam_sheets/inf03/1761142765820_files.7z',
      kind: 'starter-archive',
      publisher: 'KURSINF — kopia załącznika do arkusza CKE',
      provenance: 'third-party',
      description:
        'Archiwum pliki7.7z, dane do wykonania zadania. Sprawdzono listę plików. Uważaj na wielkość liter rozszerzeń JPG na systemie Linux.',
      checkedAt,
    },
    {
      id: 'smoki-criteria',
      title: 'Zasady oceniania — kopia w archiwum',
      url: 'https://zawodowe.edu.pl/arkusz-praktyczny/inf03-2025-czerwiec-08/klucz-odpowiedzi.pdf',
      kind: 'criteria',
      publisher: 'zawodowe.edu.pl',
      provenance: 'third-party',
      description:
        'Kryteria odpowiadające oznaczeniu INF.03-08-25.06-SG. Porównuj z konkretnym poleceniem, nie tylko ze zrzutem wyglądu.',
      checkedAt,
    },
  ],
  variants: [
    {
      id: 'classic',
      title: 'Gotowy projekt: wariant egzaminacyjny',
      description:
        'Zewnętrzny projekt PHP/CSS/JavaScript/SQL do odczytania i porównania z własną pracą. Sprawdź pliki oraz instrukcję uruchomienia na stronie autora.',
      approach:
        'Wariant zbliżony do typowego stanowiska egzaminacyjnego. Autor: Bartosz Bryniarski / zawodowe.edu.pl. Nie jest oficjalnym rozwiązaniem CKE.',
      url: smokiSource,
      downloadUrl: smokiSource + 'pobierz.zip',
    },
    {
      id: 'modern',
      title: 'Drugi wariant: PDO i inna organizacja układu',
      description:
        'Porównanie interfejsu PDO z mysqli oraz organizacji CSS. Kryteria dopuszczają PDO i Grid; pozostałe wymagania nadal trzeba sprawdzić oddzielnie.',
      approach:
        'Materiał autora do poszerzenia umiejętności. Nie zmieniaj jawnie wymaganych nazw, selektorów ani zachowania.',
      url: smokiSource + 'nowoczesny/',
      downloadUrl: smokiSource + 'nowoczesny/pobierz.zip',
    },
  ],
};

/** Preserve published revision 1, including its original examples and notebook identifiers. */
export const legacyExamStudyGuides: ExamStudyGuide[] = [wedkowanieStudy, kursyStudy, smokiStudy];
const revisionTwoExamStudyGuides: ExamStudyGuide[] = legacyExamStudyGuides.map((guide) => ({
  ...guide,
  version: 2,
  introduction:
    'Ucz się spokojnie, po jednej małej czynności. Najpierw przeczytaj krótkie wyjaśnienie, potem napisz kilka znaków lub wierszy i samodzielnie sprawdź efekt. Kolejny krok otworzy się po potwierdzeniu. Możesz wracać do ukończonych kroków; miejsce nauki i kod zapisują się w tej przeglądarce.',
  steps: guide.steps.map((step) => ({
    ...step,
    activities: studyActivities[`${guide.taskId}:${step.id}`] ?? [],
  })),
}));

const cumulativeProjects = {
  'cke-wedkowanie': { project: wedkowanieProject, steps: wedkowanieProjectSteps },
  'inf03-01-25-01-sg': { project: kursyProject, steps: kursyProjectSteps },
  'inf03-08-25-06-sg': { project: smokiProject, steps: smokiProjectSteps },
};

/** Revision 3 edits one persistent project. Old notebooks retain revisions 1 and 2. */
export const examStudyGuides: ExamStudyGuide[] = legacyExamStudyGuides.map((guide) => {
  const cumulative = cumulativeProjects[guide.taskId as keyof typeof cumulativeProjects];
  return {
    ...guide,
    version: 3,
    introduction:
      'Zbudujesz jeden projekt krok po kroku. Każda czynność zmienia te same zapisane pliki; krótki przykład pokazuje tylko wskazany fragment. Poprawny element, który już istnieje, możesz zachować. To nasze objaśnienia do oryginalnego PDF CKE, nie oficjalne rozwiązanie ani ocena egzaminu. SQL, PHP, grafika, zrzuty i zgodność wizualna wymagają opisanej kontroli ręcznej.',
    prerequisites: [
      'Otwórz oryginalny arkusz oraz zweryfikowany odnośnik do jego danych wejściowych. Materiały zewnętrzne zachowują własne oznaczenie źródła.',
      'Minimalny szkielet otrzymujesz tylko przy rozpoczęciu nowego projektu. Nie nadpisuj wcześniejszej pracy; każdy przykład dopisz we wskazanym miejscu istniejącego pliku.',
      'Do importu bazy i uruchamiania PHP użyj lokalnego XAMPP z phpMyAdmin. Podgląd HTML i kontrola JavaScript nie wykonują PHP ani SQL.',
      'Grafikę i zrzuty przygotuj samodzielnie w odpowiednich programach, a następnie dodaj do projektu. W treningu używaj fikcyjnego numeru zdającego.',
    ],
    ...cumulative,
  };
});

export const allExamStudyGuides: ExamStudyGuide[] = [
  ...legacyExamStudyGuides,
  ...revisionTwoExamStudyGuides,
  ...examStudyGuides,
];
