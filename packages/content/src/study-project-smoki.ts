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

const page = 'smoki.php';
const style = 'styl.css';
const sql = 'kwerendy.txt';
const js = 'widoki.js';
const c = (selector: string, property: string, expected: string[]) =>
  css(style, page, selector, property, expected);
const databaseCheck = manual(
  'Sprawdź wynik w lokalnej MariaDB/MySQL z importem bazasmoki.sql. Ta czynność nie jest automatycznie oceniana przez platformę.',
);
const phpCheck = manual(
  'Otwórz smoki.php przez lokalne http://localhost, z uruchomionymi PHP i bazą smoki. Sprawdź wynik i brak błędów PHP; podgląd HTML w platformie nie wykonuje PHP.',
);

export const smokiProjectSteps = [
  step(
    'structure',
    'Zbuduj jeden dokument i trzy widoki',
    3,
    page,
    'HTML5, semantyczne bloki, nagłówki, nawigacja i stopka',
    [
      edit(
        'document',
        'Sprawdź szkielet PHP z HTML',
        page,
        'Początek smoki.php i jego head.',
        'Plik .php może zawierać zwykły HTML. Dostajesz poprawny szkielet raz; serwer wykona dopiero fragmenty zamknięte w znacznikach PHP.',
        'Zachowaj DOCTYPE, lang="pl" i UTF-8. Jeśli są już poprawne, nie zmieniaj ich.',
        `<html lang="pl">
<meta charset="UTF-8">`,
        [
          html(page, 'html[lang|="pl" i]'),
          html(page, 'meta[charset="utf-8" i], meta[charset="utf8" i]'),
        ],
      ),
      edit(
        'head',
        'Nazwij kartę i podłącz CSS',
        page,
        'Istniejący title oraz head przed </head>.',
        'Tytuł karty ma brzmieć Smoki. link wskazuje osobny styl.css; nazwa nie jest taka sama jak style.css w innym zadaniu.',
        'Zmień title na Smoki i dodaj link do styl.css.',
        `<title>Smoki</title>
<link rel="stylesheet" href="styl.css">`,
        [
          html(page, 'title', { text: 'Smoki' }),
          html(page, 'link[rel="stylesheet"]', { attribute: 'href', equals: style }),
        ],
      ),
      edit(
        'blocks',
        'Dodaj cztery główne bloki',
        page,
        'W body.',
        'header, nav, main i footer opisują role obszarów. Później CSS ustawi nawigację obok części głównej.',
        'Dodaj puste bloki w tej kolejności.',
        `<header></header>
<nav></nav>
<main></main>
<footer></footer>`,
        [
          html(page, 'body > header'),
          html(page, 'body > nav'),
          html(page, 'body > main'),
          html(page, 'body > footer'),
        ],
      ),
      edit(
        'header-footer',
        'Uzupełnij dwa krótkie podpisy',
        page,
        'h2 w header, p w footer.',
        'Arkusz wymaga nagłówka drugiego stopnia w nagłówku oraz akapitu autora w stopce. Trening nie wymaga prawdziwego numeru PESEL.',
        'Dodaj Poznaj smoki! oraz Stronę opracował: z fikcyjnym numerem.',
        `<h2>Poznaj smoki!</h2>
<!-- W footer: -->
<p>Stronę opracował: 00000000000</p>`,
        [
          html(page, 'header h2', { text: 'Poznaj smoki!' }),
          html(page, 'footer p', { text: 'Stronę opracował:' }),
        ],
      ),
      edit(
        'nav-first',
        'Dodaj pierwszy blok nawigacji',
        page,
        'W pustym nav.',
        'Przycisk jest elementem bloku nawigacji i działa z klawiatury. Nasze id nav-baza będzie potrzebne do zmiany jego koloru.',
        'Dodaj przycisk Baza z type button i id nav-baza.',
        '<button type="button" id="nav-baza">Baza</button>',
        [html(page, 'nav #nav-baza', { text: 'Baza' })],
      ),
      edit(
        'nav-other',
        'Dodaj dwa pozostałe bloki',
        page,
        'W nav za Baza.',
        'Unikalne id łączą konkretny przycisk z konkretnym widokiem. Nie kopiuj id pierwszego przycisku.',
        'Dodaj Opisy i Galeria z id nav-opisy oraz nav-galeria.',
        `<button type="button" id="nav-opisy">Opisy</button>
<button type="button" id="nav-galeria">Galeria</button>`,
        [
          html(page, 'nav #nav-opisy', { text: 'Opisy' }),
          html(page, 'nav #nav-galeria', { text: 'Galeria' }),
        ],
      ),
      edit(
        'sections',
        'Utwórz trzy sekcje',
        page,
        'W pustym main.',
        'Każda section jest oddzielną częścią treści. Wszystkie istnieją w dokumencie, ale CSS i JavaScript będą pokazywać tylko jedną.',
        'Dodaj trzy sekcje z id baza, opisy i galeria.',
        `<section id="baza"></section>
<section id="opisy"></section>
<section id="galeria"></section>`,
        [
          html(page, 'main section#baza'),
          html(page, 'main section#opisy'),
          html(page, 'main section#galeria'),
        ],
      ),
      edit(
        'section-headings',
        'Nadaj każdej sekcji nagłówek',
        page,
        'Po jednym h3 wewnątrz każdej section.',
        'Nagłówek mówi, jaki widok został wybrany. W bazie wymagany tekst to Baza Smoków, a w opisach Opisy smoków.',
        'Wstaw odpowiednie h3 do trzech istniejących sekcji.',
        `<!-- baza: --><h3>Baza Smoków</h3>
<!-- opisy: --><h3>Opisy smoków</h3>
<!-- galeria: --><h3>Galeria</h3>`,
        [
          html(page, '#baza h3', { text: 'Baza Smoków' }),
          html(page, '#opisy h3', { text: 'Opisy smoków' }),
          html(page, '#galeria h3', { text: 'Galeria' }),
        ],
      ),
    ],
  ),
  step(
    'form',
    'Przygotuj formularz i pustą tabelę',
    3,
    page,
    'Formularz do tego samego pliku oraz trzy nagłówki tabeli',
    [
      edit(
        'post',
        'Utwórz formularz POST',
        page,
        'W #baza, za h3.',
        'action wskazuje skrypt odbierający, method post przesyła dane w treści żądania. POST sam nie szyfruje połączenia; nie nazywamy go szyfrowaniem.',
        'Dodaj form z action smoki.php i method post.',
        `<form action="smoki.php" method="post">
</form>`,
        [
          html(page, '#baza form[method="post" i]'),
          html(page, '#baza form', { attribute: 'action', equals: page }),
        ],
      ),
      edit(
        'select',
        'Nazwij przesyłane pole',
        page,
        'W form.',
        'name jest nazwą danych otrzymanych przez PHP. Pustą listę później wypełni skrypt bazy, więc nie wpisuj krajów na stałe.',
        'Dodaj select z name kraj i etykietą dla dostępności.',
        `<select name="kraj" aria-label="Kraj pochodzenia">
</select>`,
        [html(page, '#baza form select', { attribute: 'name', equals: 'kraj' })],
      ),
      edit(
        'submit',
        'Dodaj wysłanie danych',
        page,
        'W form, za select.',
        'type submit wysyła formularz. To inny typ przycisku niż przyciski nawigacji, które nie mają niczego wysyłać.',
        'Dodaj przycisk Szukaj typu submit.',
        '<button type="submit">Szukaj</button>',
        [html(page, '#baza form button[type="submit"]', { text: 'Szukaj' })],
      ),
      edit(
        'table',
        'Zostaw miejsce dla wierszy PHP',
        page,
        'W #baza za zamkniętym form.',
        'th oznacza nagłówek kolumny. Później każdy rekord będzie osobnym tr z trzema td; nie wpisuj wyników z bazy ręcznie.',
        'Dodaj table z jednym wierszem nagłówków Nazwa, Długość, Szerokość.',
        `<table>
  <tr><th>Nazwa</th><th>Długość</th><th>Szerokość</th></tr>
</table>`,
        [
          html(page, '#baza table th', { minCount: 3 }),
          manual(
            'Czy trzy nagłówki mają dokładnie tekst Nazwa, Długość, Szerokość, w tej kolejności?',
          ),
        ],
      ),
    ],
  ),
  step(
    'descriptions',
    'Przenieś opisy oraz przygotuj galerię',
    3,
    page,
    'Lista definicji z opis.txt, grafika i teksty alternatywne',
    [
      edit(
        'definition-list',
        'Utwórz listę definicji',
        page,
        'W #opisy, za h3.',
        'dl grupuje definicje. dt jest nazwą pojęcia lub smoka, dd jego opisem. Nie zastępuj tego listą ul.',
        'Dodaj pustą listę dl.',
        `<dl>
</dl>`,
        [html(page, '#opisy dl')],
      ),
      edit(
        'first-definition',
        'Dodaj pierwszą parę z pliku',
        page,
        'W dl.',
        'Kopiujesz treść z dostarczonego opis.txt, zachowując nazwy i opisy. Przykład pokazuje strukturę, a nie tekst do oddania.',
        'Pobierz archiwum wejściowe pliki7 z odnośnika do danych i rozpakuj hasłem SmoKi-Swi@ta#. Otwórz opis.txt; umieść nazwę pierwszego smoka w dt, a pozostałe dane w dd. Zachowaj zdjęcia i bazasmoki.sql do następnych części.',
        `<dt>Nazwa skopiowana z opis.txt</dt>
<dd>Opis skopiowany z opis.txt</dd>`,
        [
          manual(
            'Czy w dt i dd jest rzeczywista treść pierwszego wpisu z opis.txt, bez pozostawionych tekstów przykładowych?',
          ),
        ],
      ),
      edit(
        'other-definitions',
        'Uzupełnij pozostałe pary',
        page,
        'W tym samym dl, po pierwszym dd.',
        'Każda następna nazwa rozpoczyna dt, a jej opis dd. Zachowujesz jedną listę i powtarzasz parę znaczników.',
        'Dodaj pozostałe wpisy z opis.txt. Sprawdź pełną zgodność tekstu z plikiem i ilustracją 5.',
        '<!-- Następne rzeczywiste pary dt + dd z opis.txt. -->',
        [
          manual(
            'Czy żadna nazwa ani informacja z opis.txt nie została pominięta lub podmieniona na przykładowy tekst?',
          ),
        ],
      ),
      edit(
        'resize',
        'Zmień rzeczywisty rozmiar smok1',
        'smok1.jpg',
        'Edytor grafiki i dodanie wyeksportowanego pliku do projektu.',
        'Skalowanie z zachowaniem proporcji zmienia oba wymiary razem. CSS height nie zmienia danych JPEG.',
        'Otwórz smok1.JPG, ustaw wysokość 300 px przy zachowanych proporcjach i zapisz jako smok1.jpg. Pozostałe zdjęcia zachowaj jako smok2.jpg i smok3.jpg.',
        '// To praca na plikach obrazów, nie reguła CSS.',
        [
          manual(
            'Czy smok1.jpg ma rzeczywistą wysokość 300 px i poprawne proporcje? Czy wszystkie trzy docelowe nazwy mają małe .jpg?',
          ),
        ],
      ),
      edit(
        'first-image',
        'Wstaw pierwszy obraz galerii',
        page,
        'W #galeria za h3.',
        'src jest dokładną nazwą pliku. alt ma opisywać ten konkretny obraz.',
        'Dodaj smok1.jpg z alt Smok czerwony.',
        '<img src="smok1.jpg" alt="Smok czerwony">',
        [
          html(page, '#galeria img[src="smok1.jpg"]', {
            attribute: 'alt',
            equals: 'Smok czerwony',
          }),
        ],
      ),
      edit(
        'other-images',
        'Wstaw dwa pozostałe obrazy',
        page,
        'W #galeria za pierwszym img.',
        'Każda grafika otrzymuje osobny tekst alternatywny. Wielkość liter w ścieżkach może mieć znaczenie na serwerze.',
        'Dodaj smok2.jpg i smok3.jpg z wymaganymi opisami.',
        `<img src="smok2.jpg" alt="Smok wielki">
<img src="smok3.jpg" alt="Skrzydlaty łaciaty">`,
        [
          html(page, '#galeria img[src="smok2.jpg"]', { attribute: 'alt', equals: 'Smok wielki' }),
          html(page, '#galeria img[src="smok3.jpg"]', {
            attribute: 'alt',
            equals: 'Skrzydlaty łaciaty',
          }),
        ],
      ),
    ],
  ),
  step(
    'css',
    'Zapisz wygląd i początkowy widok',
    4,
    style,
    'Pełny CSS, proporcje bloków i wymagane selektory table oraz dt',
    [
      edit(
        'base',
        'Ustaw tekst całej strony',
        style,
        'Na początku pustego styl.css.',
        'Selektor * obejmuje wszystkie elementy. Georgia i wyśrodkowanie mają działać domyślnie.',
        'Dodaj font-family Georgia i text-align center.',
        '* { font-family: Georgia, serif; text-align: center; }',
        [
          c('body', 'font-family', ['Georgia, serif', 'Georgia']),
          c('body', 'text-align', ['center']),
        ],
      ),
      edit(
        'header-footer',
        'Połącz nagłówek ze stopką',
        style,
        'Nowa reguła header, footer.',
        'Wspólna reguła oszczędza powtarzanie identycznego wyglądu. Tomato i MistyRose są nazwami kolorów CSS.',
        'Dodaj tło Tomato, kolor MistyRose i padding 10px.',
        `header, footer {
  background-color: Tomato;
  color: MistyRose;
  padding: 10px;
}`,
        [
          c('header', 'background-color', ['rgb(255, 99, 71)']),
          c('footer', 'color', ['rgb(255, 228, 225)']),
          c('header', 'padding-top', ['10px']),
        ],
      ),
      edit(
        'columns',
        'Ustaw bloki obok siebie',
        style,
        'Nowe reguły nav, main i footer.',
        'Szerokości 20% i 80% zajmują całą linię. float to wybrany tu sposób układu; arkusz wymaga wyglądu, więc poprawny Grid lub Flex także może być użyty.',
        'Ustaw nav na 20%, main na 80% i ustaw je obok siebie. Gdy używasz float, stopka musi wyczyścić opływanie.',
        `nav { width: 20%; float: left; }
main { width: 80%; float: left; }
footer { clear: both; }`,
        [
          manual(
            'Czy nav zajmuje lewą część 20%, main prawą 80%, a stopka biegnie pod oboma? Porównaj ilustrację 3.',
          ),
        ],
      ),
      edit(
        'main',
        'Określ wysokość i przewijanie',
        style,
        'Dopisz do istniejącej reguły main.',
        'overflow auto dodaje przewijanie tylko wtedy, gdy treść nie mieści się w ustalonej wysokości.',
        'Dodaj tło MistyRose, height 510px i overflow auto.',
        `background-color: MistyRose;
height: 510px;
overflow: auto;`,
        [
          c('main', 'height', ['510px']),
          c('main', 'overflow-y', ['auto']),
          c('main', 'background-color', ['rgb(255, 228, 225)']),
        ],
      ),
      edit(
        'nav-blocks',
        'Sformatuj trzy bloki nawigacji',
        style,
        'Nowa reguła nav button.',
        'Wysokość 170px pomnożona przez trzy daje 510px części głównej. display block układa przyciski pionowo; width i border są technicznym uzupełnieniem naszego wariantu z button.',
        'Dodaj wysokość, rozmiar tekstu 200%, tło #FFAEA5 oraz pionowy układ przycisków.',
        `nav button {
  display: block; width: 100%; border: 0;
  height: 170px; font-size: 200%;
  background-color: #FFAEA5;
}`,
        [
          c('#nav-opisy', 'height', ['170px']),
          c('#nav-galeria', 'background-color', ['rgb(255, 174, 165)']),
          manual('Czy trzy bloki są jeden pod drugim, a tekst ma 200% rozmiaru rodzica?'),
        ],
      ),
      edit(
        'active-initial',
        'Oznacz pierwszy widok jako aktywny',
        style,
        'Nowe reguły za nav button.',
        'Pierwsza sekcja pozostaje widoczna. display none ukrywa pozostałe i usuwa ich miejsce z układu, ale nie usuwa węzłów DOM.',
        'Ustaw MistyRose na #nav-baza i ukryj #opisy oraz #galeria.',
        `#nav-baza { background-color: MistyRose; }
#opisy, #galeria { display: none; }`,
        [
          c('#nav-baza', 'background-color', ['rgb(255, 228, 225)']),
          c('#opisy', 'display', ['none']),
          c('#galeria', 'display', ['none']),
        ],
      ),
      edit(
        'table',
        'Dodaj styl tabeli',
        style,
        'Nowa reguła table.',
        'Arkusz wymaga selektora znacznika table. margin auto centruje tabelę o mniejszej szerokości.',
        'Dodaj margin auto, width 60% oraz 1px dashed Indigo.',
        `table {
  margin: auto; width: 60%;
  border: 1px dashed Indigo;
}`,
        [
          c('table', 'border-top-style', ['dashed']),
          c('table', 'border-top-color', ['rgb(75, 0, 130)']),
          manual('Czy użyto selektora table, a szerokość wynosi 60% i oba poziome marginesy auto?'),
        ],
      ),
      edit(
        'controls',
        'Rozsuń kontrolki formularza',
        style,
        'Nowa reguła select, #baza button.',
        'Zewnętrzny margines odsuwa listę i przycisk od otoczenia. Ograniczenie button do bazy chroni układ nawigacji.',
        'Ustaw margin 20px dla select oraz przycisku Szukaj.',
        'select, #baza button { margin: 20px; }',
        [c('select', 'margin-top', ['20px']), c('#baza button', 'margin-top', ['20px'])],
      ),
      edit(
        'definition',
        'Wyróżnij nazwy smoków',
        style,
        'Nowa reguła dt.',
        'Termin listy definicji ma być pogrubiony i pochylony. Użycie wymaganego selektora dt obejmie wszystkie terminy.',
        'Dodaj bold i italic dla dt.',
        'dt { font-weight: bold; font-style: italic; }',
        [c('dt', 'font-weight', ['700']), c('dt', 'font-style', ['italic'])],
      ),
      edit(
        'definition-hover',
        'Dodaj powiększenie terminu',
        style,
        'Osobna reguła dt:hover.',
        '180% jest proporcją rozmiaru tekstu; 180px byłoby innym, bardzo dużym rozmiarem.',
        'Po najechaniu powiększ tekst dt do 180%. Do próby usuń na chwilę #opisy z reguły display: none, sprawdź najechanie i przywróć ukrywanie. Przyciski przełączania dodasz później.',
        'dt:hover { font-size: 180%; }',
        [
          manual(
            'Czy najechany termin powiększa się do 180%, a reguły wyglądu używają dt oraz dt:hover?',
          ),
        ],
      ),
    ],
  ),
  step(
    'database',
    'Przygotuj dane i dowód importu',
    2,
    sql,
    'Archiwum pliki7, baza smoki i import.jpg',
    [
      edit(
        'archive',
        'Otwórz dane zadania',
        sql,
        'Lokalny folder zadania; kwerendy.txt pozostaje pusty.',
        'Dane wejściowe zawierają bazę, opisy oraz trzy zdjęcia. Nazwy rozpakowanych obrazów mają rozszerzenie .JPG; docelowe pliki strony mają nazwy .jpg z arkusza.',
        'W używanym już folderze pliki7 znajdź bazasmoki.sql, opis.txt i trzy zdjęcia. Jeżeli potrzebujesz ponownie rozpakować archiwum, hasło to SmoKi-Swi@ta#. Zachowaj oryginały.',
        '-- Nie kopiuj importu do pliku z własnymi kwerendami.',
        [manual('Czy masz wszystkie pięć wejściowych plików i pracujesz w oddzielnym folderze?')],
      ),
      edit(
        'import',
        'Utwórz smoki i importuj tabele',
        sql,
        'phpMyAdmin na lokalnym stanowisku.',
        'Kodowanie bazy pozwala poprawnie przechowywać polskie znaki. smok i parada są połączone przez tabelę udzial.',
        'Utwórz bazę smoki, np. z utf8_polish_ci, i zaimportuj bazasmoki.sql. Obejrzyj kolumny trzech tabel.',
        'CREATE DATABASE smoki CHARACTER SET utf8 COLLATE utf8_polish_ci;',
        [databaseCheck],
      ),
      edit(
        'proof',
        'Zapisz pełny ekran',
        'import.jpg',
        'Nowy własny plik grafiki dołączony do projektu.',
        'Zrzut powinien potwierdzać rzeczywisty import. W tym zadaniu formatem importu jest JPEG.',
        'Zapisz import.jpg bez kadrowania, z widocznym paskiem zadań i informacją o poprawnym imporcie.',
        '// Własny zrzut ekranu, nie obraz ze strony z rozwiązaniem.',
        [manual('Czy import.jpg jest rzeczywiście JPEG i pokazuje pełny ekran oraz bazę smoki?')],
      ),
    ],
  ),
  step(
    'sql',
    'Zbuduj i zachowaj cztery kwerendy',
    2,
    sql,
    'SELECT, DISTINCT, relacje i średnia po latach, ALTER TABLE',
    [
      edit(
        'columns',
        'Wybierz wymiary i nazwę',
        sql,
        'Początek pustego kwerendy.txt.',
        'SELECT określa trzy kolumny, FROM tabelę. Odróżnij dlugosc od szerokosc: obie mają znaleźć się w wyniku.',
        'Zacznij pierwszą kwerendę od trzech wymaganych pól z smok.',
        'SELECT nazwa, dlugosc, szerokosc FROM smok;',
        [databaseCheck],
      ),
      edit(
        'poland',
        'Dodaj warunek kraju',
        sql,
        'Przed średnikiem pierwszej kwerendy.',
        'Tekst Polska zapisuje się w apostrofach. WHERE usuwa z wyniku wiersze z innym krajem, ale nie usuwa ich z bazy.',
        'Dodaj pochodzenie = Polska jako warunek. Uruchom pełne zapytanie i zapisz kw1.png.',
        "WHERE pochodzenie = 'Polska';",
        [databaseCheck],
      ),
      edit(
        'distinct',
        'Utwórz listę krajów bez powtórzeń',
        sql,
        'Nowa kwerenda pod pierwszą.',
        'DISTINCT scala powtarzające się wartości wyniku. ORDER BY porządkuje kraje rosnąco; ASC jest kierunkiem rosnącym.',
        'Zapisz drugie zapytanie, wybierające jedną kolumnę pochodzenie. Uruchom i zapisz kw2.png.',
        `SELECT DISTINCT pochodzenie
FROM smok ORDER BY pochodzenie ASC;`,
        [databaseCheck],
      ),
      edit(
        'average',
        'Nazwij wynik średniej',
        sql,
        'Początek trzeciej kwerendy pod drugą.',
        'AVG liczy średnią wartości liczbowych. AS nadaje nagłówkowi wynikowej kolumny dokładną nazwę wymaganą w PDF.',
        'Wybierz rok z parada i AVG długości smoka z aliasem Średnia długość. Na razie nie uruchamiaj nieukończonego zapytania.',
        `SELECT parada.rok, AVG(smok.dlugosc) AS 'Średnia długość'
FROM parada`,
        [manual('Czy wybrane są tylko rok i średnia, a alias zawiera polskie znaki?')],
      ),
      edit(
        'joins',
        'Przejdź przez tabelę udziału',
        sql,
        'Kontynuacja zapytania 3, po FROM parada.',
        'udzial.id_parada wskazuje paradę, udzial.id_smok konkretnego smoka. Oba połączenia są potrzebne, aby liczyć średnią uczestników danej parady.',
        'Dodaj dwa JOIN z właściwymi warunkami ON.',
        `JOIN udzial ON udzial.id_parada = parada.id
JOIN smok ON udzial.id_smok = smok.id`,
        [
          manual(
            'Czy każda relacja prowadzi przez udzial, bez łączenia niezależnych id smoka i parady?',
          ),
        ],
      ),
      edit(
        'group-years',
        'Ogranicz i pogrupuj lata',
        sql,
        'Końcowe linie zapytania 3.',
        'WHERE wybiera lata po 2005; GROUP BY tworzy jedną średnią dla roku. Pole rok w wejściowym schemacie jest tekstowe CHAR(4).',
        'Dodaj warunek roku i grupowanie, zakończ średnikiem. Uruchom całość oraz zapisz kw3.png.',
        `WHERE parada.rok > '2005'
GROUP BY parada.rok;`,
        [databaseCheck],
      ),
      edit(
        'alter',
        'Dodaj kolumnę lokalizacji',
        sql,
        'Czwarte zapytanie na końcu kwerendy.txt.',
        'ALTER TABLE zmienia strukturę. VARCHAR(100) przechowuje tekst długości do 100 znaków, a nie stałą liczbę 100.',
        'Dodaj lokalizacja do parada. Uruchom raz, sprawdź strukturę i zapisz kw4.png. Nie wkładaj tej instrukcji do strony PHP.',
        'ALTER TABLE parada ADD lokalizacja VARCHAR(100);',
        [databaseCheck],
      ),
    ],
  ),
  step(
    'php-connection',
    'Otwórz połączenie przed oboma skryptami',
    4,
    page,
    'PHP, lokalna baza smoki i zamknięcie po ostatnim użyciu',
    [
      edit(
        'region',
        'Dodaj początek wykonywania PHP',
        page,
        'Przed <!DOCTYPE html> na samym początku smoki.php.',
        'Kod między <?php i ?> wykonuje serwer. Umieszczenie połączenia przed HTML udostępnia je późniejszym fragmentom tej samej odpowiedzi.',
        'Dodaj pusty obszar PHP na początku pliku.',
        `<?php
?>`,
        [phpCheck],
      ),
      edit(
        'connection',
        'Połącz z właściwą bazą',
        page,
        'W pierwszym obszarze PHP.',
        'Kolejne argumenty to serwer, użytkownik, hasło i baza. root bez hasła odwzorowuje wyłącznie lokalne stanowisko podane w PDF.',
        'Przypisz mysqli_connect do $db z bazą smoki.',
        "$db = mysqli_connect('localhost', 'root', '', 'smoki');",
        [phpCheck],
      ),
      edit(
        'charset',
        'Ustaw kodowanie połączenia',
        page,
        'Po utworzeniu $db, w tym samym PHP.',
        'Kodowanie połączenia jest odrębne od meta charset w HTML. utf8mb4 poprawnie przesyła polskie znaki.',
        'Dodaj mysqli_set_charset dla $db.',
        "mysqli_set_charset($db, 'utf8mb4');",
        [phpCheck],
      ),
      edit(
        'close',
        'Zamknij połączenie na końcu',
        page,
        'Osobny obszar PHP po footer i przed </body>.',
        'Oba skrypty dodasz między początkiem a końcem dokumentu. Zamknięcie po nich pozwala korzystać z jednego połączenia.',
        'Dodaj mysqli_close($db) na końcu strony, nie zaraz po otwarciu połączenia.',
        '<?php mysqli_close($db); ?>',
        [phpCheck],
      ),
    ],
  ),
  step(
    'php-options',
    'Wypełnij istniejącą listę krajami z bazy',
    4,
    page,
    'Skrypt 1 wykorzystujący zapytanie 2 i wszystkie jego wiersze',
    [
      edit(
        'query',
        'Wyślij gotowy SELECT',
        page,
        'Wewnątrz pustego select name="kraj".',
        'To drugie zapytanie z kwerendy.txt. Wynik przechowujemy w $kraje; samo zapytanie jeszcze nie tworzy opcji.',
        'Dodaj obszar PHP i przypisz wynik SELECT DISTINCT z sortowaniem.',
        `<?php
$kraje = mysqli_query($db, 'SELECT DISTINCT pochodzenie FROM smok ORDER BY pochodzenie ASC');
?>`,
        [phpCheck],
      ),
      edit(
        'loop',
        'Pobierz każdy wiersz',
        page,
        'W tym samym PHP, za mysqli_query i przed ?>.',
        'mysqli_fetch_assoc odczytuje jeden kolejny rekord. while powtarza ciało, dopóki wynik zawiera następny rekord.',
        'Dodaj pustą pętlę while przypisującą rekord do $kraj.',
        `while ($kraj = mysqli_fetch_assoc($kraje)) {
}`,
        [phpCheck],
      ),
      edit(
        'escape',
        'Przygotuj bezpieczny tekst kraju',
        page,
        'W ciele tej pętli.',
        'htmlspecialchars zamienia znaki mające znaczenie w HTML na tekst. Nie zmienia kraju w bazie; chroni wyświetlany dokument.',
        'Przypisz zabezpieczone pochodzenie do $tekst.',
        "$tekst = htmlspecialchars($kraj['pochodzenie'], ENT_QUOTES, 'UTF-8');",
        [phpCheck],
      ),
      edit(
        'option',
        'Wypisz jedną option na rekord',
        page,
        'W pętli, po przypisaniu $tekst.',
        'echo wypisuje HTML. Operator . skleja tekst; bez osobnego value przeglądarka prześle tekst wybranej opcji.',
        'Wypisz otwarcie option, tekst kraju i zamknięcie. Usuń wcześniejsze statyczne opcje, jeśli je dopisałeś.',
        "echo '<option>' . $tekst . '</option>';",
        [
          phpCheck,
          manual(
            'Czy lista zawiera wszystkie różne kraje w kolejności rosnącej i zmienia się po zmianie danych w bazie?',
          ),
        ],
      ),
    ],
  ),
  step(
    'php-filter',
    'Pokaż wiersze dopiero po wysłaniu formularza',
    4,
    page,
    'Skrypt 2, kraj z formularza i pełne wiersze wynikowej tabeli',
    [
      edit(
        'guard',
        'Sprawdź, czy pole zostało wysłane',
        page,
        'W table za wierszem th, przed </table>.',
        'isset sprawdza obecność pola. Przy pierwszym otwarciu formularz niczego jeszcze nie wysłał, więc skrypt nie powinien uruchamiać odczytu dla przypadkowego kraju.',
        'Dodaj obszar PHP z pustym if dla $_POST["kraj"].',
        `<?php
if (isset($_POST['kraj'])) {
}
?>`,
        [phpCheck],
      ),
      edit(
        'prepare',
        'Przygotuj zapytanie z parametrem',
        page,
        'W ciele if.',
        'Znak ? oznacza miejsce na wartość. Parametr pozostaje danymi, nawet gdy zawiera apostrof; nie sklejamy surowego POST z SQL.',
        'Przygotuj SELECT trzech kolumn z warunkiem pochodzenie = ?.',
        "$zapytanie = mysqli_prepare($db, 'SELECT nazwa, dlugosc, szerokosc FROM smok WHERE pochodzenie = ?');",
        [phpCheck],
      ),
      edit(
        'bind',
        'Powiąż kraj z parametrem',
        page,
        'W if za mysqli_prepare.',
        's oznacza parametr tekstowy. Najpierw zapisujemy przesłaną wartość, potem wiążemy ją z przygotowanym zapytaniem.',
        'Odczytaj kraj i wywołaj mysqli_stmt_bind_param.',
        `$wybranyKraj = (string) $_POST['kraj'];
mysqli_stmt_bind_param($zapytanie, 's', $wybranyKraj);`,
        [phpCheck],
      ),
      edit(
        'execute',
        'Wykonaj i odbierz wynik',
        page,
        'W if za powiązaniem parametru.',
        'Wykonanie zapytania i odebranie wyniku to dwa kolejne działania. $smoki będzie źródłem rekordów pętli.',
        'Dodaj execute oraz get_result.',
        `mysqli_stmt_execute($zapytanie);
$smoki = mysqli_stmt_get_result($zapytanie);`,
        [phpCheck],
      ),
      edit(
        'rows',
        'Przygotuj powtarzanie wierszy',
        page,
        'W if za przypisaniem $smoki.',
        'Każdy rekord ma trzy pola. Pętla po wszystkich rekordach ma tworzyć kompletny tr, a nie jeden wielki wiersz dla całego wyniku.',
        'Dodaj while z pustym tr: echo otwarcia i zamknięcia wiersza.',
        `while ($smok = mysqli_fetch_assoc($smoki)) {
  echo '<tr>';
  echo '</tr>';
}`,
        [phpCheck],
      ),
      edit(
        'name-cell',
        'Dodaj komórkę nazwy',
        page,
        'W while między wypisaniem <tr> i </tr>.',
        'Każdy tekst z bazy bezpiecznie kodujemy przed wstawieniem w td. Pierwsza kolumna odpowiada nagłówkowi Nazwa.',
        'Dodaj echo td z nazwą smoka.',
        "echo '<td>' . htmlspecialchars($smok['nazwa'], ENT_QUOTES, 'UTF-8') . '</td>';",
        [phpCheck],
      ),
      edit(
        'dimensions',
        'Dodaj obie komórki wymiarów',
        page,
        'W tym samym while za komórką nazwy.',
        'Kolejność pól musi odpowiadać nagłówkom Długość, Szerokość. Rzutowanie na string umożliwia bezpieczne formatowanie liczb jako tekstu.',
        'Dodaj dwa td z dlugosc i szerokosc.',
        `echo '<td>' . htmlspecialchars((string) $smok['dlugosc'], ENT_QUOTES, 'UTF-8') . '</td>';
echo '<td>' . htmlspecialchars((string) $smok['szerokosc'], ENT_QUOTES, 'UTF-8') . '</td>';`,
        [phpCheck],
      ),
      edit(
        'close-statement',
        'Zakończ zapytanie i sprawdź formularz',
        page,
        'Po pętli while, ale przed zamykającą klamrą if.',
        'Zamykasz przygotowane zapytanie; wspólne połączenie $db pozostaje zamykane na końcu dokumentu.',
        'Dodaj mysqli_stmt_close. Otwórz stronę bez POST, następnie wybierz Polskę i Francję. Porównaj wyniki z bazą.',
        'mysqli_stmt_close($zapytanie);',
        [
          phpCheck,
          manual(
            'Czy przed wysłaniem brak wierszy danych, a po wysłaniu wszystkie wiersze odpowiadają wybranemu krajowi? Czy lista i tabela są generowane z bazy, nie wpisane na stałe?',
          ),
        ],
      ),
    ],
  ),
  step(
    'tabs',
    'Dodawaj przełączanie po jednej instrukcji',
    5,
    js,
    'Jeden widok i jeden aktywny kolor po każdym kliknięciu',
    [
      edit(
        'script',
        'Podłącz skrypt widoków',
        page,
        'W head, przed </head>.',
        'defer uruchomi skrypt po zbudowaniu elementów strony. Nie trzeba ręcznie wywoływać PHP, żeby JavaScript rozpoznał sekcje.',
        'Dodaj script widoki.js z defer.',
        '<script src="widoki.js" defer></script>',
        [html(page, 'script[src="widoki.js"]')],
      ),
      edit(
        'names',
        'Zapisz trzy identyfikatory',
        js,
        'Początek pustego widoki.js.',
        'Tablica przechowuje kolejne wartości. To identyfikatory naszych sekcji, a nie teksty przycisków.',
        'Dodaj stałą widoki z trzema napisami.',
        "const widoki = ['baza', 'opisy', 'galeria'];",
        [manual('Czy trzy napisy odpowiadają dokładnie id sekcji w HTML?')],
      ),
      edit(
        'function',
        'Przygotuj wybór widoku',
        js,
        'Za tablicą widoki.',
        'Parametr wybrany dostanie id sekcji, którą kliknięcie ma pokazać. Jedna funkcja może w ten sposób obsłużyć wszystkie trzy przypadki.',
        'Dodaj pustą funkcję pokaz(wybrany).',
        `function pokaz(wybrany) {
}`,
        [
          manual(
            'Czy wybrany jest parametrem między nawiasami, a ciało funkcji jest jeszcze puste?',
          ),
        ],
      ),
      edit(
        'loop',
        'Przejdź przez wszystkie sekcje',
        js,
        'W ciele pokaz.',
        'for...of przypisuje zmiennej id kolejno każdą wartość tablicy. Każde kliknięcie ustawi również dwa nieaktywne widoki.',
        'Dodaj pustą pętlę po widoki wewnątrz funkcji.',
        `for (const id of widoki) {
}`,
        [manual('Czy klamry pętli znajdują się wewnątrz klamer funkcji?')],
      ),
      edit(
        'condition',
        'Rozpoznaj aktualnie wybrany id',
        js,
        'W środku pętli.',
        '=== porównuje wartości. aktywny jest true tylko dla jednego id zgodnego z parametrem wybrany.',
        'Dodaj stałą aktywny.',
        'const aktywny = id === wybrany;',
        [manual('Czy jest porównanie ===, a nie przypisanie = wewnątrz tego wyrażenia?')],
      ),
      edit(
        'display',
        'Ustaw widoczność każdej sekcji',
        js,
        'W pętli, po aktywny.',
        'Operator warunek ? a : b wybiera jedną z dwóch wartości. style.display zmienia sposób wyświetlania istniejącego elementu.',
        'Dla aktywnej sekcji przypisz block, dla pozostałych none.',
        "document.getElementById(id).style.display = aktywny ? 'block' : 'none';",
        [
          manual(
            'Czy pętla ustawia również none na dwóch pozostałych sekcjach, bez usuwania ich z DOM?',
          ),
        ],
      ),
      edit(
        'color',
        'Ustaw aktywny kolor nawigacji',
        js,
        'W tej samej pętli, po zmianie display.',
        'Dodanie nav- do id daje identyfikator przycisku. W JavaScript nazwa właściwości to backgroundColor, bez łącznika.',
        'Ustaw MistyRose dla aktywnego przycisku i #FFAEA5 dla pozostałych.',
        `document.getElementById('nav-' + id).style.backgroundColor =
  aktywny ? 'MistyRose' : '#FFAEA5';`,
        [manual('Czy kolor jest ustalany dla wszystkich trzech przycisków przy każdym wywołaniu?')],
      ),
      edit(
        'events',
        'Powiąż kliknięcia z funkcją',
        js,
        'Po całej funkcji pokaz, poza jej klamrami.',
        'Druga pętla rejestruje kliknięcia raz. Krótka funkcja () => odracza pokaz(id) do chwili kliknięcia właściwego przycisku.',
        'Dodaj rejestrację click dla trzech przycisków.',
        `for (const id of widoki) {
  document.getElementById('nav-' + id).addEventListener('click', () => pokaz(id));
}`,
        [manual('Czy rejestracja jest poza pokaz, a każda reakcja przekazuje id swojego widoku?')],
      ),
      edit(
        'tabs-check',
        'Sprawdź całą kolejność kliknięć',
        js,
        'Projekt jako całość.',
        'Test sprawdza widoczność i kolory po różnych kliknięciach, nie wymaga skopiowanej składni. PHP i dane bazy pozostają osobną kontrolą ręczną.',
        'Uruchom sprawdzanie i kliknij także samodzielnie Baza → Galeria → Opisy → Baza.',
        '// W każdej chwili: jedna widoczna sekcja, jeden aktywny blok.',
        [
          {
            id: 'tabs-runtime',
            title: 'Przełączanie trzech widoków',
            kind: 'runtime',
            adapter: 'smoki-tabs',
            entry: page,
          },
          manual(
            'Czy wszystkie trzy widoki zawierają właściwe treści? Test JavaScript nie sprawdza wykonania PHP.',
          ),
        ],
      ),
    ],
  ),
  delivery('delivery', 7, [
    'import.jpg',
    'kw1.png',
    'kw2.png',
    'kw3.png',
    'kw4.png',
    sql,
    'przeglądarka.txt',
    'smok1.jpg',
    'smok2.jpg',
    'smok3.jpg',
    page,
    style,
  ]),
];

export const smokiProject = project(
  smokiProjectSteps,
  [
    { path: page, content: documentScaffold },
    { path: style, content: '' },
    { path: js, content: '' },
    { path: sql, content: '' },
    { path: 'przeglądarka.txt', content: '' },
  ],
  [
    'import.jpg',
    'kw1.png',
    'kw2.png',
    'kw3.png',
    'kw4.png',
    sql,
    'przeglądarka.txt',
    'smok1.jpg',
    'smok2.jpg',
    'smok3.jpg',
    page,
    style,
  ],
);
