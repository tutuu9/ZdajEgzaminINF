import {
  css,
  delivery,
  documentScaffold,
  edit,
  html,
  manual,
  project,
  step,
} from './study-project-helpers.js';

const page = 'wedkuj.php';
const style = 'styl_1.css';
const sql = 'kwerendy.txt';
const c = (selector: string, property: string, expected: string[]) =>
  css(style, page, selector, property, expected);
const databaseCheck = manual(
  'Uruchom odpowiednią kwerendę w lokalnej bazie wedkowanie. Sprawdź wybrane kolumny i rekordy, a następnie zapisz wymagany własny zrzut. SQL jest tutaj kontrolowany ręcznie.',
);
const phpCheck = manual(
  'Uruchom wedkuj.php przez lokalny adres http://localhost z PHP i bazą wedkowanie. Porównaj dane z phpMyAdmin; podgląd HTML platformy nie wykonuje PHP.',
);

export const wedkowanieProjectSteps = [
  step(
    'html',
    'Zbuduj stronę dla dwóch wyników PHP',
    3,
    page,
    'Dokument HTML5, układ sekcji, obraz, lista, tabela i odsyłacz',
    [
      edit(
        'document',
        'Sprawdź gotowy początek dokumentu',
        page,
        'Początek wedkuj.php i head.',
        'Rozszerzenie PHP pozwala później dodać kod serwera, ale nie zastępuje struktury HTML5. Szkielet projektu pozostaje ten sam przez całe zadanie.',
        'Zachowaj DOCTYPE, lang pl i UTF-8. Nie przepisuj poprawnego elementu tylko po to, żeby wykonać krok.',
        `<html lang="pl">
<meta charset="UTF-8">`,
        [
          html(page, 'html[lang|="pl" i]'),
          html(page, 'meta[charset="utf-8" i], meta[charset="utf8" i]'),
        ],
      ),
      edit(
        'head',
        'Ustaw tytuł i plik stylów',
        page,
        'Zastąp treść title; link dopisz w head.',
        'Tytuł Wędkowanie zawiera polski znak. Nazwa styl_1.css zawiera podkreślenie i cyfrę, które muszą zgadzać się w plikach.',
        'Zmień title i dodaj link do styl_1.css.',
        `<title>Wędkowanie</title>
<link rel="stylesheet" href="styl_1.css">`,
        [
          html(page, 'title', { text: 'Wędkowanie' }),
          html(page, 'link[rel="stylesheet"]', { attribute: 'href', equals: style }),
        ],
      ),
      edit(
        'main-blocks',
        'Dodaj obszary dokumentu',
        page,
        'W pustym body.',
        'header obejmie baner, main trzy obszary pracy, footer podpis. Są to znaczniki sekcji o wyraźnych rolach.',
        'Dodaj trzy puste bloki.',
        `<header></header>
<main></main>
<footer></footer>`,
        [html(page, 'body > header'), html(page, 'body > main'), html(page, 'body > footer')],
      ),
      edit(
        'sections',
        'Utwórz dwa bloki lewe i prawy',
        page,
        'W main, w podanej kolejności.',
        'Identyfikatory są naszymi nazwami do CSS. W wariancie z float prawy blok umieszczamy przed drugim lewym; efekt ma odpowiadać ilustracji, a inne poprawne układy są możliwe.',
        'Dodaj section rzeki, aside prawy i section drapiezniki.',
        `<section id="rzeki"></section>
<aside id="prawy"></aside>
<section id="drapiezniki"></section>`,
        [html(page, '#rzeki'), html(page, '#prawy'), html(page, '#drapiezniki')],
      ),
      edit(
        'banner-footer',
        'Dodaj tytuł i podpis',
        page,
        'h1 w header, p w footer.',
        'Nagłówek banera ma poziom h1. Stopka jest akapitem z numerem treningowym; nie musisz wpisywać PESEL.',
        'Wstaw Portal dla wędkarzy i Stronę wykonał: z fikcyjnym numerem.',
        `<h1>Portal dla wędkarzy</h1>
<!-- W footer: -->
<p>Stronę wykonał: 00000000000</p>`,
        [
          html(page, 'header h1', { text: 'Portal dla wędkarzy' }),
          html(page, 'footer p', { text: 'Stronę wykonał:' }),
        ],
      ),
      edit(
        'river-list',
        'Przygotuj uporządkowaną listę',
        page,
        'W #rzeki.',
        'ol tworzy numerowaną listę. Zostaw ją pustą: jej elementy li wygeneruje skrypt z wyniku zapytania 3.',
        'Dodaj h3 Ryby zamieszkujące rzeki i pustą ol.',
        `<h3>Ryby zamieszkujące rzeki</h3>
<ol></ol>`,
        [html(page, '#rzeki h3', { text: 'Ryby zamieszkujące rzeki' }), html(page, '#rzeki ol')],
      ),
      edit(
        'predator-heading',
        'Nazwij drugą część',
        page,
        'W #drapiezniki.',
        'Nagłówek zapowiada dane drugiego skryptu. To inna grupa ryb niż ryby z łowisk rzecznych.',
        'Dodaj wymagany nagłówek h3.',
        '<h3>Ryby drapieżne naszych wód</h3>',
        [html(page, '#drapiezniki h3', { text: 'Ryby drapieżne naszych wód' })],
      ),
      edit(
        'table',
        'Dodaj tylko nagłówki tabeli',
        page,
        'W #drapiezniki za h3.',
        'tr obejmuje jeden wiersz, th nagłówek komórki. Dane będą dodawane osobnymi tr przez PHP.',
        'Dodaj table z nagłówkami L.p., Gatunek, Występowanie.',
        `<table>
  <tr><th>L.p.</th><th>Gatunek</th><th>Występowanie</th></tr>
</table>`,
        [
          html(page, '#drapiezniki table th', { minCount: 3 }),
          manual('Czy kolejność i treść trzech nagłówków jest zgodna z PDF?'),
        ],
      ),
      edit(
        'image',
        'Wstaw rybę w prawym bloku',
        page,
        'W #prawy.',
        'img wyświetli JPEG, który przygotujesz później w części graficznej. Na razie obraz może się nie ładować. Tekst alternatywny Sum jest wymagany niezależnie od dostępności pliku.',
        'Dodaj ryba1.jpg z alt Sum.',
        '<img src="ryba1.jpg" alt="Sum">',
        [html(page, '#prawy img[src="ryba1.jpg"]', { attribute: 'alt', equals: 'Sum' })],
      ),
      edit(
        'download',
        'Połącz stronę z własnymi kwerendami',
        page,
        'W #prawy za obrazem.',
        'br przenosi kolejny element do nowej linii. Względny href odwołuje się do Twojego pliku w tym samym projekcie.',
        'Dodaj br i odsyłacz Pobierz kwerendy do kwerendy.txt.',
        `<br>
<a href="kwerendy.txt">Pobierz kwerendy</a>`,
        [html(page, '#prawy a[href="kwerendy.txt"]', { text: 'Pobierz kwerendy' })],
      ),
    ],
  ),
  step(
    'css',
    'Odtwórz wymagane formatowanie',
    4,
    style,
    'Pełny CSS i wyraźnie wymagane selektory znaczników',
    [
      edit(
        'font',
        'Nadaj domyślną czcionkę',
        style,
        'Początek pustego styl_1.css.',
        'Reguła * obejmuje wszystkie elementy. Helvetica jest czcionką wskazaną w arkuszu; sans-serif to dodatkowy krój awaryjny.',
        'Dodaj regułę font-family.',
        '* { font-family: Helvetica, sans-serif; }',
        [c('body', 'font-family', ['Helvetica, sans-serif', 'Helvetica'])],
      ),
      edit(
        'header-colors',
        'Wspólnie sformatuj baner i stopkę',
        style,
        'Nowa reguła header, footer.',
        'Dwa selektory oddzielone przecinkiem otrzymują identyczne ustawienia. Biały tekst ma odróżniać się od turkusowego tła.',
        'Dodaj background-color #00838F i color white.',
        `header, footer {
  background-color: #00838F;
  color: white;
}`,
        [
          c('header', 'background-color', ['rgb(0, 131, 143)']),
          c('footer', 'color', ['rgb(255, 255, 255)']),
        ],
      ),
      edit(
        'header-spacing',
        'Dopisz rozmiar i wyrównanie',
        style,
        'W istniejącej regule header, footer.',
        '130% jest rozmiarem tekstu względem rodzica. padding 5px dodaje odstęp wewnątrz każdego bloku.',
        'Dopisz padding 5px, font-size 130% i text-align center.',
        `padding: 5px;
font-size: 130%;
text-align: center;`,
        [
          c('header', 'padding-top', ['5px']),
          c('footer', 'text-align', ['center']),
          manual('Czy wspólna reguła zawiera font-size:130%?'),
        ],
      ),
      edit(
        'left',
        'Nadaj wspólny wygląd lewym blokom',
        style,
        'Nowa reguła #rzeki, #drapiezniki.',
        'Oba lewe bloki mają szerokość 55% i takie samo tło. float jest naszym wariantem realizacji wyglądu, nie obowiązkową techniką z PDF.',
        'Dodaj tło #EFEFEF, width 55% i float left.',
        `#rzeki, #drapiezniki {
  background-color: #EFEFEF;
  width: 55%; float: left;
}`,
        [
          c('#rzeki', 'background-color', ['rgb(239, 239, 239)']),
          manual('Czy oba lewe bloki mają szerokość 55% całej części głównej?'),
        ],
      ),
      edit(
        'heights',
        'Rozdziel wysokości lewych bloków',
        style,
        'Dwie osobne reguły za wspólną.',
        'Pierwszy blok ma 150px, drugi 300px. Suma odpowiada 450px bloku prawego.',
        'Ustaw różne wysokości po id.',
        `#rzeki { height: 150px; }
#drapiezniki { height: 300px; }`,
        [c('#rzeki', 'height', ['150px']), c('#drapiezniki', 'height', ['300px'])],
      ),
      edit(
        'right',
        'Uzupełnij prawy blok',
        style,
        'Nowa reguła #prawy.',
        'Pozostałe 45% szerokości przypada prawej stronie. Tekst i obraz są w niej wyśrodkowane.',
        'Dodaj tło, szerokość 45%, wysokość 450px i wyrównanie. W naszym wariancie użyj float right.',
        `#prawy {
  background-color: #4FB3BF; width: 45%;
  height: 450px; text-align: center;
  float: right;
}`,
        [
          c('#prawy', 'height', ['450px']),
          c('#prawy', 'background-color', ['rgb(79, 179, 191)']),
          c('#prawy', 'text-align', ['center']),
        ],
      ),
      edit(
        'layout',
        'Zatrzymaj opływanie w części głównej',
        style,
        'Nowa reguła main; dotyczy wybranego wariantu float.',
        'display flow-root sprawia, że main obejmuje wysokość pływających dzieci. Dzięki temu stopka jest pod nimi. Możesz uzyskać ten sam układ innym poprawnym sposobem.',
        'Dodaj flow-root i porównaj cały układ z ilustracją. Nie jest to dodatkowy wymóg egzaminacyjny, tylko domknięcie naszego wariantu.',
        'main { display: flow-root; }',
        [
          manual(
            'Czy rzeki są nad drapieżnikami po lewej, blok prawy zajmuje pełne 450px, a stopka jest pod nimi?',
          ),
        ],
      ),
      edit(
        'image',
        'Dodaj cień i margines obrazu',
        style,
        'Nowa reguła img.',
        'box-shadow podaje przesunięcie X, Y, rozmycie i kolor. Wymagany jest selektor znacznika img.',
        'Ustaw cień 10px 10px 7px DimGray oraz margin 20px.',
        `img {
  box-shadow: 10px 10px 7px DimGray;
  margin: 20px;
}`,
        [
          c('img', 'margin-top', ['20px']),
          manual(
            'Czy reguła img zawiera cień 10px w obu osiach, rozmycie 7px i kolor DimGray? Obraz nadal ma prawdziwą szerokość 400px.',
          ),
        ],
      ),
      edit(
        'borders',
        'Połącz obramowania tabeli',
        style,
        'Nowa wspólna reguła table, td, th.',
        'Przecinki grupują znaczniki. border-collapse collapse scala sąsiednie obramowania tabeli i komórek.',
        'Dodaj 1px solid #4FB3BF oraz border-collapse collapse.',
        `table, td, th {
  border: 1px solid #4FB3BF;
  border-collapse: collapse;
}`,
        [
          c('table', 'border-collapse', ['collapse']),
          c('th', 'border-top-color', ['rgb(79, 179, 191)']),
          c('th', 'border-top-width', ['1px']),
        ],
      ),
      edit(
        'table',
        'Ustaw szerokość i środek tabeli',
        style,
        'Osobna reguła table.',
        'Szerokość 80% odnosi się do lewego bloku. margin auto wylicza równe wolne miejsce po bokach.',
        'Dodaj width 80% i margin auto.',
        'table { width: 80%; margin: auto; }',
        [
          manual(
            'Czy reguła znacznika table ma width:80% i margin:auto? Sprawdź tabelę wewnątrz drugiego lewego bloku.',
          ),
        ],
      ),
      edit(
        'cells',
        'Dodaj odstęp wewnątrz komórek',
        style,
        'Nowa reguła td, th.',
        'padding oddziela treść od ramki komórki. margin nie daje tego samego efektu.',
        'Dodaj padding 4px dla obu rodzajów komórek.',
        'td, th { padding: 4px; }',
        [c('th', 'padding-top', ['4px'])],
      ),
      edit(
        'hover',
        'Wyróżnij najechany wiersz',
        style,
        'Nowa reguła tr:hover.',
        'Reguła obejmuje cały wiersz, a nie tylko pojedynczą komórkę. Nie wymaga JavaScript.',
        'Dodaj zmianę tła na #4FB3BF. Sprawdź również wymagane selektory img, table, td i th w całym pliku.',
        'tr:hover { background-color: #4FB3BF; }',
        [
          manual(
            'Czy cały najechany wiersz zmienia tło? Czy wymagane style są w zewnętrznym pliku i używają selektorów znaczników?',
          ),
        ],
      ),
    ],
  ),
  step(
    'database',
    'Przygotuj pliki i bazę',
    2,
    sql,
    'pliki1.zip, baza wedkowanie, struktura danych oraz import.png',
    [
      edit(
        'archive',
        'Rozpakuj wejściowe archiwum',
        sql,
        'Folder lokalnego projektu; kwerendy.txt pozostaje pusty.',
        'Przykład CKE i zgodny arkusz archiwalny korzystają z baza.sql oraz ryba1.jpg. Odnośnik do archiwum opisuje jego zewnętrzne pochodzenie, nie gwarancję praw do ponownej publikacji.',
        'Rozpakuj pliki1.zip hasłem WedkoWaniE& do oddzielnego folderu. W treningu nadaj folderowi fikcyjny numer.',
        '-- Archiwum wejściowe nie jest gotowym rozwiązaniem.',
        [manual('Czy masz oryginalny baza.sql i ryba1.jpg, a nie ZIP z cudzym gotowym projektem?')],
      ),
      edit(
        'import',
        'Wybierz nazwę bazy i zaimportuj',
        sql,
        'Lokalny phpMyAdmin; nie dopisuj importu do kwerendy.txt.',
        'Baza nazywa się wedkowanie bez polskiego znaku. Rzeczywisty import ma małe nazwy tabel ryby, lowisko i okres_ochronny, mimo wielkich liter na schemacie PDF.',
        'Utwórz wedkowanie i zaimportuj baza.sql. Obejrzyj strukturę trzech potrzebnych tabel; dodatkowe tabele importu nie zmieniają polecenia.',
        'CREATE DATABASE wedkowanie;',
        [databaseCheck],
      ),
      edit(
        'proof',
        'Zapisz import jako PNG',
        'import.png',
        'Dodaj plik z własnego zrzutu stanowiska.',
        'W tym konkretnym zadaniu import ma format PNG, a późniejsze kwerendy JPEG. Nie zamieniaj tych formatów z innym arkuszem.',
        'Wykonaj niekadrowany zrzut pełnego monitora z paskiem zadań, pokazujący udany import. Zapisz import.png.',
        '// Format importu: PNG.',
        [
          manual(
            'Czy import.png potwierdza import do właściwej bazy i obejmuje cały ekran wraz z paskiem zadań?',
          ),
        ],
      ),
    ],
  ),
  step(
    'graphics',
    'Przygotuj plik obrazu o szerokości 400 px',
    3,
    'ryba1.jpg',
    'Rzeczywiste skalowanie ryba1.jpg z zachowaniem proporcji',
    [
      edit(
        'open',
        'Otwórz oryginalną grafikę',
        'ryba1.jpg',
        'Edytor grafiki, kopia obrazu wejściowego.',
        'Zmiana grafiki to odrębny rezultat. Przeskalowanie przez CSS nie zmienia wymiarów pliku.',
        'Otwórz ryba1.jpg w edytorze grafiki i odczytaj obecne wymiary.',
        '// Zachowaj kopię oryginalnego obrazu.',
        [
          manual(
            'Czy pracujesz na obrazie z załącznika i potrafisz wskazać jego rzeczywiste wymiary?',
          ),
        ],
      ),
      edit(
        'scale',
        'Zmień wyłącznie szerokość docelową',
        'ryba1.jpg',
        'Okno skalowania obrazu w programie graficznym.',
        'Zachowanie proporcji wyliczy wysokość automatycznie. Osobne narzucenie wysokości mogłoby rozciągnąć rybę.',
        'Włącz zachowanie proporcji i ustaw szerokość dokładnie 400 px.',
        '// Szerokość obrazu: 400 px; wysokość wynika z proporcji.',
        [manual('Czy szerokość to 400 px, a kształt obrazu nie jest rozciągnięty?')],
      ),
      edit(
        'save',
        'Zapisz właściwy JPEG',
        'ryba1.jpg',
        'Zapis i dodanie pliku do projektu.',
        'Docelowa nazwa jest używana przez HTML. Sprawdzenie ponownie otwartego pliku potwierdza, że zapis faktycznie zachował zmianę.',
        'Zapisz ryba1.jpg jako JPEG, ponownie otwórz i dodaj do projektu.',
        '// Docelowy plik: ryba1.jpg',
        [manual('Czy ponownie otwarty ryba1.jpg ma szerokość 400 px i prawidłowy format JPEG?')],
      ),
    ],
  ),
  step(
    'select',
    'Zapisz dwa odczyty z pojedynczych tabel',
    2,
    sql,
    'Zapytania 1 i 2 oraz kw1.jpg i kw2.jpg',
    [
      edit(
        'columns',
        'Wybierz trzy pola ryby',
        sql,
        'Pierwsze zapytanie w pustym kwerendy.txt.',
        'SELECT wymienia pola wyniku, FROM tabelę. Gwiazdka dodałaby pole styl_zycia, którego wynik zapytania 1 nie ma zawierać.',
        'Wpisz id, nazwa i wystepowanie z ryby.',
        'SELECT id, nazwa, wystepowanie FROM ryby;',
        [databaseCheck],
      ),
      edit(
        'predators',
        'Ogranicz wynik do drapieżników',
        sql,
        'Przed średnikiem pierwszego zapytania.',
        'W opisie bazy styl_zycia = 1 oznacza drapieżniki, a 2 spokojny żer. Warunek dotyczy cechy, nie stałej listy id.',
        'Dodaj WHERE styl_zycia = 1. Uruchom całość i zapisz kw1.jpg jako pełny ekran.',
        'WHERE styl_zycia = 1;',
        [databaseCheck],
      ),
      edit(
        'protection-columns',
        'Wybierz identyfikator i wymiar ochronny',
        sql,
        'Drugie zapytanie pod pierwszym.',
        'Ryby_id wskazuje rybę, a wymiar_ochronny jest osobną wartością. W rzeczywistym pliku importu Ryby_id ma wielkie R.',
        'Zacznij SELECT dwóch pól z okres_ochronny.',
        'SELECT Ryby_id, wymiar_ochronny FROM okres_ochronny;',
        [databaseCheck],
      ),
      edit(
        'under-thirty',
        'Dodaj ścisłe ograniczenie wymiaru',
        sql,
        'Przed średnikiem drugiego zapytania.',
        'Mniejszy niż 30 oznacza < 30, bez równości. Nie zastępuj tego <= 30.',
        'Dopisz warunek wymiar_ochronny < 30, uruchom i zapisz kw2.jpg.',
        'WHERE wymiar_ochronny < 30;',
        [databaseCheck],
      ),
    ],
  ),
  step(
    'join',
    'Połącz gatunki z łowiskami i zmień strukturę',
    2,
    sql,
    'Zapytanie relacyjne 3, kolumna dobowy_limit i dokumentacja',
    [
      edit(
        'fields',
        'Wskaż źródło każdej kolumny',
        sql,
        'Początek trzeciego zapytania.',
        'Nazwa gatunku jest w ryby, akwen i wojewodztwo w lowisko. Pełne nazwy zapobiegają pomyleniu tabel.',
        'Zacznij SELECT trzech wymaganych pól i FROM ryby; następny krok doda drugą tabelę.',
        `SELECT ryby.nazwa, lowisko.akwen, lowisko.wojewodztwo
FROM ryby`,
        [manual('Czy wypisane są dokładnie nazwa, akwen i wojewodztwo, z właściwych tabel?')],
      ),
      edit(
        'relation',
        'Powiąż łowisko z rybą',
        sql,
        'Kontynuacja zapytania 3, po FROM ryby.',
        'lowisko.Ryby_id wskazuje ryby.id. lowisko.id jest identyfikatorem samego łowiska i nie nadaje się do tego połączenia.',
        'Dodaj JOIN lowisko z warunkiem relacji.',
        'JOIN lowisko ON lowisko.Ryby_id = ryby.id',
        [manual('Czy ON porównuje Ryby_id do id ryby, a nie dwa niezależne id?')],
      ),
      edit(
        'river',
        'Wybierz łowiska będące rzekami',
        sql,
        'Koniec zapytania 3.',
        'Kod rodzaju łowiska jest opisany w PDF: 3 to rzeka. Warunek odnosi się do lowisko.',
        'Dodaj WHERE lowisko.rodzaj = 3 i średnik. Uruchom całe zapytanie; zapisz kw3.jpg.',
        'WHERE lowisko.rodzaj = 3;',
        [databaseCheck],
      ),
      edit(
        'limit-column',
        'Dodaj liczbę z przedziału 0–255',
        sql,
        'Czwarte zapytanie, na końcu pliku.',
        'TINYINT jest małym typem całkowitym. UNSIGNED usuwa liczby ujemne i daje zakres 0–255 wymagany w arkuszu.',
        'Dodaj dobowy_limit do ryby jako TINYINT UNSIGNED. Uruchom tylko raz, sprawdź strukturę i zapisz kw4.jpg.',
        'ALTER TABLE ryby ADD dobowy_limit TINYINT UNSIGNED;',
        [databaseCheck],
      ),
    ],
  ),
  step(
    'php-connection',
    'Ustal początek i koniec połączenia',
    4,
    page,
    'Lokalne połączenie PHP z wedkowanie i jego zamknięcie',
    [
      edit(
        'open',
        'Dodaj obszar PHP na początku',
        page,
        'Przed <!DOCTYPE html>.',
        'PHP tworzy odpowiedź na serwerze. Połączenie utworzone na początku tego pliku będzie dostępne obu fragmentom w jego treści.',
        'Dodaj pusty obszar <?php ... ?> na początku.',
        `<?php
?>`,
        [phpCheck],
      ),
      edit(
        'connect',
        'Połącz z bazą zadania',
        page,
        'W pierwszym obszarze PHP.',
        'Kolejność argumentów mysqli_connect to serwer, użytkownik, hasło, baza. Te publiczne dane opisują lokalny XAMPP, nie publiczny serwer produkcyjny.',
        'Utwórz $db dla localhost, root, pustego hasła i wedkowanie.',
        "$db = mysqli_connect('localhost', 'root', '', 'wedkowanie');",
        [phpCheck],
      ),
      edit(
        'encoding',
        'Ustaw kodowanie danych',
        page,
        'Po mysqli_connect.',
        'Polskie znaki muszą być poprawnie przesłane także między PHP a bazą. HTML meta charset dotyczy innego etapu.',
        'Ustaw utf8mb4 na połączeniu.',
        "mysqli_set_charset($db, 'utf8mb4');",
        [phpCheck],
      ),
      edit(
        'close',
        'Zamknij po ostatnim skrypcie',
        page,
        'Nowy obszar PHP po footer, przed </body>.',
        'Zamknięcie po wygenerowaniu obu bloków kończy pracę z bazą. Przedwczesne close zepsułoby drugi skrypt.',
        'Dodaj końcowe mysqli_close($db).',
        '<?php mysqli_close($db); ?>',
        [phpCheck],
      ),
    ],
  ),
  step(
    'php-list',
    'Wypełnij listę wynikiem zapytania 3',
    4,
    page,
    'Skrypt 1: wszystkie ryby rzeczne i opis miejsca w li',
    [
      edit(
        'query',
        'Przenieś sprawdzone zapytanie',
        page,
        'Wewnątrz pustej ol w #rzeki.',
        'To samo zapytanie 3 z kwerendy.txt wykorzystasz do listy. Wynik ma zawierać nazwa, akwen i wojewodztwo.',
        'Dodaj PHP z mysqli_query i swoim kompletnym zapytaniem 3. Zapisz wynik w $rzeki.',
        `<?php
$rzeki = mysqli_query($db, 'SELECT ryby.nazwa, lowisko.akwen, lowisko.wojewodztwo FROM ryby JOIN lowisko ON lowisko.Ryby_id = ryby.id WHERE lowisko.rodzaj = 3');
?>`,
        [phpCheck],
      ),
      edit(
        'loop',
        'Pobieraj rekord po rekordzie',
        page,
        'W tym PHP po zapytaniu, przed ?>.',
        'while powtarza ciało dla kolejnych wyników. fetch_assoc pozwala odczytywać pola po nazwach.',
        'Dodaj pustą pętlę z $ryba = mysqli_fetch_assoc($rzeki).',
        `while ($ryba = mysqli_fetch_assoc($rzeki)) {
}`,
        [phpCheck],
      ),
      edit(
        'name',
        'Przygotuj nazwę gatunku',
        page,
        'W środku pętli while.',
        'htmlspecialchars koduje tekst dla HTML; dane nie stają się przypadkowo znacznikami strony.',
        'Przypisz bezpiecznie zakodowaną nazwę do $nazwa.',
        "$nazwa = htmlspecialchars($ryba['nazwa'], ENT_QUOTES, 'UTF-8');",
        [phpCheck],
      ),
      edit(
        'place',
        'Przygotuj dwa pola miejsca',
        page,
        'W tej samej pętli po $nazwa.',
        'akwen i wojewodztwo pochodzą z tabeli lowisko. Przygotowanie osobnych zmiennych ułatwia odczyt końcowego zdania.',
        'Dodaj $akwen oraz $wojewodztwo z kodowaniem HTML.',
        `$akwen = htmlspecialchars($ryba['akwen'], ENT_QUOTES, 'UTF-8');
$wojewodztwo = htmlspecialchars($ryba['wojewodztwo'], ENT_QUOTES, 'UTF-8');`,
        [phpCheck],
      ),
      edit(
        'item',
        'Wypisz jedno li na rekord',
        page,
        'W pętli za przygotowaniem tekstów.',
        'echo łączy tekst stały i wartości. Każdy rekord musi mieć własny element li, zawierający opis wskazany w PDF.',
        'Dodaj echo ze zdaniem pływa w rzece i przecinkiem przed województwem.',
        "echo '<li>' . $nazwa . ' pływa w rzece ' . $akwen . ', ' . $wojewodztwo . '</li>';",
        [
          phpCheck,
          manual(
            'Czy liczba li i ich treść odpowiadają wszystkim wierszom zapytania 3, bez wpisanych na stałe gatunków?',
          ),
        ],
      ),
    ],
  ),
  step(
    'php',
    'Wypełnij istniejącą tabelę drapieżnikami',
    4,
    page,
    'Skrypt 2: zapytanie 1, osobne wiersze tabeli i wszystkie trzy kolumny',
    [
      edit(
        'query',
        'Pobierz drapieżniki',
        page,
        'W table za wierszem nagłówkowym i przed </table>.',
        'Zapytanie 1 zwraca id, nazwa i wystepowanie. Drugi wynik korzysta z istniejącego $db; nie trzeba zamykać i otwierać połączenia między skryptami.',
        'Dodaj obszar PHP z SELECT dla styl_zycia = 1 i zapisz wynik w $drapiezniki.',
        `<?php
$drapiezniki = mysqli_query($db, 'SELECT id, nazwa, wystepowanie FROM ryby WHERE styl_zycia = 1');
?>`,
        [phpCheck],
      ),
      edit(
        'rows',
        'Przygotuj pusty wiersz dla rekordu',
        page,
        'W drugim PHP za zapytaniem.',
        'tr musi obejmować wszystkie trzy komórki jednej ryby. Powtarzasz cały wiersz wewnątrz while.',
        'Dodaj pętlę z wypisaniem otwarcia i zamknięcia tr.',
        `while ($ryba = mysqli_fetch_assoc($drapiezniki)) {
  echo '<tr>';
  echo '</tr>';
}`,
        [phpCheck],
      ),
      edit(
        'id-cell',
        'Dodaj numer z bazy',
        page,
        'W pętli, między echo <tr> i echo </tr>.',
        'Pierwsze pole wyniku to id. Nie zastępuj go nowym licznikiem, jeśli baza ma inne identyfikatory.',
        'Wypisz td z id rekordu zakodowanym jako tekst.',
        "echo '<td>' . htmlspecialchars((string) $ryba['id'], ENT_QUOTES, 'UTF-8') . '</td>';",
        [phpCheck],
      ),
      edit(
        'name-cell',
        'Dodaj komórkę gatunku',
        page,
        'W tej samej pętli za id.',
        'Druga komórka odpowiada nagłówkowi Gatunek. Powinna pobierać nazwa z bieżącego rekordu.',
        'Dodaj td z nazwą ryby.',
        "echo '<td>' . htmlspecialchars($ryba['nazwa'], ENT_QUOTES, 'UTF-8') . '</td>';",
        [phpCheck],
      ),
      edit(
        'habitat-cell',
        'Dodaj występowanie i sprawdź obie części',
        page,
        'W tej samej pętli za nazwą, przed zamknięciem tr.',
        'Trzecia kolumna kończy rekord. Wspólne połączenie zamyka się dopiero za oboma skryptami, w miejscu już przygotowanym na końcu strony.',
        'Dodaj td z wystepowanie. Otwórz stronę lokalnie i porównaj listę oraz tabelę z dwoma zapytaniami.',
        "echo '<td>' . htmlspecialchars($ryba['wystepowanie'], ENT_QUOTES, 'UTF-8') . '</td>';",
        [
          phpCheck,
          manual(
            'Czy tabela ma wszystkie rekordy zapytania 1, każdy w osobnym tr z trzema td, a lista nadal pokazuje zapytanie 3?',
          ),
        ],
      ),
    ],
  ),
  delivery('delivery', 5, [
    'import.png',
    'kw1.jpg',
    'kw2.jpg',
    'kw3.jpg',
    'kw4.jpg',
    sql,
    'przeglądarka.txt',
    'ryba1.jpg',
    style,
    page,
  ]),
];

export const wedkowanieProject = project(
  wedkowanieProjectSteps,
  [
    { path: page, content: documentScaffold },
    { path: style, content: '' },
    { path: sql, content: '' },
    { path: 'przeglądarka.txt', content: '' },
  ],
  [
    'import.png',
    'kw1.jpg',
    'kw2.jpg',
    'kw3.jpg',
    'kw4.jpg',
    sql,
    'przeglądarka.txt',
    'ryba1.jpg',
    style,
    page,
  ],
);
