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

const index = 'index.html';
const rates = 'raty.html';
const style = 'style.css';
const sql = 'kwerendy.txt';
const js = 'raty.js';
const checkCss = (selector: string, property: string, expected: string[]) =>
  css(style, index, selector, property, expected);
const sqlCheck = manual(
  'Uruchom tylko tę instrukcję w lokalnej bazie obuwie. Porównaj kolumny, warunek lub uprawnienia z PDF. Zapisz własny zrzut całego ekranu.',
);

export const kursyProjectSteps = [
  step(
    'structure',
    'Zbuduj wspólną strukturę dwóch stron',
    3,
    index,
    'HTML5, polski język, kodowanie, nazwa karty, semantyczny układ i nawigacja',
    [
      edit(
        'document',
        'Rozpoznaj gotowy szkielet',
        index,
        'Początek index.html oraz element head.',
        'Projekt otrzymuje szkielet tylko raz. DOCTYPE oznacza HTML5, lang język dokumentu, charset kodowanie znaków. Jeśli te elementy już są poprawne, niczego nie przepisuj.',
        'Sprawdź istniejący szkielet. Zachowaj lang="pl" i UTF-8. viewport jest dodatkowym ustawieniem mobilnego podglądu, nie nowym wymaganiem arkusza.',
        `<html lang="pl">
<meta charset="UTF-8">`,
        [
          html(index, 'html[lang|="pl" i]'),
          html(index, 'meta[charset="utf-8" i], meta[charset="utf8" i]'),
        ],
      ),
      edit(
        'title',
        'Nazwij kartę przeglądarki',
        index,
        'Zastąp wyłącznie tekst wewnątrz istniejącego title.',
        'title opisuje kartę przeglądarki. Nie jest widocznym nagłówkiem h3 w treści strony.',
        'Zmień Dokument na Kursy komputerowe.',
        '<title>Kursy komputerowe</title>',
        [html(index, 'title', { text: 'Kursy komputerowe' })],
      ),
      edit(
        'stylesheet',
        'Połącz z arkuszem stylów',
        index,
        'W head, po title i przed </head>.',
        'link wskazuje osobny plik. rel="stylesheet" mówi, że to arkusz CSS; href jest ścieżką względną.',
        'Dodaj jeden link do style.css. Jeśli poprawny link już istnieje, zachowaj go.',
        '<link rel="stylesheet" href="style.css">',
        [html(index, 'link[rel="stylesheet"]', { attribute: 'href', equals: style })],
      ),
      edit(
        'blocks',
        'Wstaw cztery role strony',
        index,
        'W pustym body, w podanej kolejności.',
        'header to widoczny nagłówek, nav grupuje nawigację, main treść główną, footer stopkę. To semantyczne znaczniki wymagane w arkuszu.',
        'Dodaj cztery puste bloki. Treść wstawisz do nich osobno.',
        `<header></header>
<nav></nav>
<main></main>
<footer></footer>`,
        [
          html(index, 'body > header'),
          html(index, 'body > nav'),
          html(index, 'body > main'),
          html(index, 'body > footer'),
        ],
      ),
      edit(
        'banner',
        'Wstaw obraz nagłówka',
        index,
        'Pomiędzy <header> i </header>.',
        'img jest znacznikiem bez pary zamykającej. src wskazuje plik, alt podaje tekst zastępczy. Sam baner przygotujesz później w części graficznej; na razie brak obrazu jest oczekiwany.',
        'Dodaj baner.png i tekst alternatywny kursy komputerowe.',
        '<img src="baner.png" alt="kursy komputerowe">',
        [
          html(index, 'header img', { attribute: 'src', equals: 'baner.png' }),
          html(index, 'header img', { attribute: 'alt', equals: 'kursy komputerowe' }),
        ],
      ),
      edit(
        'home-link',
        'Dodaj pierwszy odsyłacz',
        index,
        'W pustym nav.',
        'a tworzy odsyłacz. href określa cel, a tekst pomiędzy znacznikami jest etykietą.',
        'Dodaj odsyłacz Strona główna prowadzący do index.html.',
        '<a href="index.html">Strona główna</a>',
        [html(index, 'nav a[href="index.html"]', { text: 'Strona główna' })],
      ),
      edit(
        'other-links',
        'Dodaj pozostałe cele menu',
        index,
        'W nav, za pierwszym odsyłaczem.',
        'Ścieżka raty.html otwiera drugą stronę projektu. Adres zaczynający się https:// prowadzi poza projekt.',
        'Dodaj Koszt rat do raty.html i Nasz partner do adresu z PDF.',
        `<a href="raty.html">Koszt rat</a>
<a href="https://moje-szkolenia.pl/">Nasz partner</a>`,
        [
          html(index, 'nav a[href="raty.html"]', { text: 'Koszt rat' }),
          html(index, 'nav a[href="https://moje-szkolenia.pl/"]', { text: 'Nasz partner' }),
        ],
      ),
      edit(
        'footer',
        'Podpisz stronę treningową',
        index,
        'W footer.',
        'p tworzy akapit. W treningu użyj fikcyjnego numeru, np. 00000000000; nie trzeba podawać danych osobowych platformie.',
        'Dodaj akapit Autor strony: i własny treningowy numer.',
        '<p>Autor strony: 00000000000</p>',
        [html(index, 'footer p', { text: 'Autor strony:' })],
      ),
      edit(
        'second-page',
        'Zachowaj wspólną strukturę',
        rates,
        'Cały raty.html tylko na tym etapie, zanim dodasz jego treść.',
        'Dwie strony mają wspólny nagłówek, menu i stopkę, ale inne main. Kopiujesz własny ukończony szkielet; późniejsze zmiany treści będą niezależne.',
        'Przenieś obecną strukturę index.html do raty.html. Oba main są jeszcze puste. Sprawdź przechodzenie linkami w obie strony.',
        '<!-- W obu plikach pozostaw osobne <main></main>. -->',
        [
          html(rates, 'title', { text: 'Kursy komputerowe' }),
          html(rates, 'link[rel="stylesheet"]', { attribute: 'href', equals: style }),
          html(rates, 'header img'),
          html(rates, 'nav a[href="index.html"]'),
          html(rates, 'main'),
          html(rates, 'footer p'),
        ],
      ),
    ],
  ),
  step(
    'home',
    'Uzupełnij stronę główną',
    4,
    index,
    'Tabela kursów oraz dane kontaktowe index.html',
    [
      edit(
        'heading',
        'Nazwij ofertę kursów',
        index,
        'Na początku main w index.html.',
        'h3 jest nagłówkiem trzeciego poziomu. Arkusz podaje zarówno poziom, jak i tekst.',
        'Dodaj wymagany nagłówek o programowaniu.',
        '<h3>Kursy komputerowe - programowanie</h3>',
        [html(index, 'main h3', { text: 'Kursy komputerowe - programowanie' })],
      ),
      edit(
        'table-header',
        'Utwórz nagłówek tabeli',
        index,
        'W main, po pierwszym h3.',
        'table obejmuje tabelę; tr to jeden wiersz, th komórka nagłówkowa. Tabela ma trzy kolumny.',
        'Dodaj table z jednym wierszem tr i trzema komórkami th.',
        `<table>
  <tr><th>Nazwa</th><th>Liczba godzin</th><th>Cena</th></tr>
</table>`,
        [html(index, 'main table tr:first-child th', { minCount: 3 })],
      ),
      edit(
        'react-row',
        'Dodaj pierwszy kurs',
        index,
        'W table, za wierszem nagłówków i przed </table>.',
        'td to komórka danych. Kolejność odpowiada nagłówkom: nazwa, godziny, cena.',
        'Dodaj wiersz Kurs React.js, 220, 5000.',
        '<tr><td>Kurs React.js</td><td>220</td><td>5000</td></tr>',
        [
          html(index, 'table tr', { text: 'Kurs React.js' }),
          html(index, 'table td', { text: '5000' }),
        ],
      ),
      edit(
        'javascript-row',
        'Dodaj drugi kurs',
        index,
        'W table, za pierwszym kursem.',
        'Drugi wiersz danych ma te same trzy kolumny. Razem z nagłówkiem daje trzy wiersze.',
        'Dodaj Kurs JavaScript, 150, 3000. Porównaj tabelę z ilustracją 4.',
        '<tr><td>Kurs JavaScript</td><td>150</td><td>3000</td></tr>',
        [
          html(index, 'table tr', { minCount: 3 }),
          html(index, 'table td', { text: '3000' }),
          manual(
            'Czy tabela ma dokładnie 3 kolumny i 3 wiersze, z poprawnymi godzinami 220/150 i cenami 5000/3000?',
          ),
        ],
      ),
      edit(
        'contact-list',
        'Dodaj dwa punkty kontaktowe',
        index,
        'W main za tabelą.',
        'ul oznacza listę nieuporządkowaną, a li jeden punkt. Adres i telefon są tekstem z arkusza.',
        'Dodaj h3 Adres do korespondencji i ul z dwoma li.',
        `<h3>Adres do korespondencji</h3>
<ul>
  <li>Adres: Katowice, ul. Mariacka 5</li>
  <li>Telefon: 32 888 88 88</li>
</ul>`,
        [
          html(index, 'main h3', { text: 'Adres do korespondencji' }),
          html(index, 'main ul li', { minCount: 2 }),
        ],
      ),
      edit(
        'mail',
        'Dodaj kontakt pocztowy',
        index,
        'W main za listą kontaktową.',
        'mailto: wskazuje adres e-mail, a nie stronę HTTP. Ten link nie jest w nav i nie powinien dostać stylu menu.',
        'Dodaj odsyłacz skontaktuj się do kursy@komputerowe.pl.',
        '<a href="mailto:kursy@komputerowe.pl">skontaktuj się</a>',
        [html(index, 'main a[href="mailto:kursy@komputerowe.pl"]', { text: 'skontaktuj się' })],
      ),
    ],
  ),
  step(
    'controls',
    'Dodaj po jednej kontrolce kalkulatora',
    4,
    rates,
    'Formularz kalkulatora rat i pusty paragraf wyniku',
    [
      edit(
        'heading',
        'Nazwij kalkulator',
        rates,
        'Na początku main w raty.html.',
        'Treść drugiej strony różni się od oferty. Nie wstawiaj tu tabeli kursów z index.html.',
        'Dodaj h3 Oblicz miesięczną ratę.',
        '<h3>Oblicz miesięczną ratę</h3>',
        [html(rates, 'main h3', { text: 'Oblicz miesięczną ratę' })],
      ),
      edit(
        'react-control',
        'Połącz checkbox i etykietę',
        rates,
        'Za h3 w main.',
        'type="checkbox" tworzy pole wyboru. Identyfikator react jest naszym powiązaniem HTML z późniejszym skryptem, a for łączy opis z polem.',
        'Dodaj checkbox #react z klasą kontrolki i etykietą Kurs React.js. Na końcu dodaj br.',
        `<input type="checkbox" id="react" class="kontrolki">
<label for="react">Kurs React.js</label><br>`,
        [
          html(rates, '#react[type="checkbox"].kontrolki'),
          html(rates, 'label[for="react"]', { text: 'Kurs React.js' }),
        ],
      ),
      edit(
        'javascript-control',
        'Dodaj drugi wybór',
        rates,
        'Za pierwszym checkboxem i jego br.',
        'Drugie pole potrzebuje innego id, ale może mieć tę samą klasę. Klasa wspólnie formatuje kontrolki.',
        'Dodaj #javascript i jego etykietę. Zakończ linię przez br.',
        `<input type="checkbox" id="javascript" class="kontrolki">
<label for="javascript">Kurs JavaScript</label><br>`,
        [
          html(rates, '#javascript[type="checkbox"].kontrolki'),
          html(rates, 'label[for="javascript"]', { text: 'Kurs JavaScript' }),
        ],
      ),
      edit(
        'installments',
        'Dodaj liczbę rat',
        rates,
        'Za wyborem drugiego kursu.',
        'Pole number przechowuje wpisaną liczbę. Dodatkowe min i step pomagają wybierać dodatnie całkowite raty; skrypt nadal powinien obsłużyć błędne dane.',
        'Dodaj etykietę Liczba rat: i pole #raty typu number z klasą kontrolki.',
        `<label for="raty">Liczba rat:</label>
<input id="raty" class="kontrolki" type="number" min="1" step="1"><br>`,
        [
          html(rates, '#raty[type="number"].kontrolki'),
          html(rates, 'label[for="raty"]', { text: 'Liczba rat:' }),
        ],
      ),
      edit(
        'city',
        'Dodaj listę miast',
        rates,
        'Za polem rat, w main.',
        'select wybiera jedną option. Tekst opcji będzie również jej wartością, jeśli nie podasz osobnego value.',
        'Dodaj #miasto z trzema opcjami i klasą kontrolki.',
        `<select id="miasto" class="kontrolki" aria-label="Miasto kursu">
  <option>Warszawa</option>
  <option>Katowice</option>
  <option>Gdańsk</option>
</select>`,
        [
          html(rates, '#miasto.kontrolki option', { minCount: 3 }),
          html(rates, '#miasto option', { text: 'Gdańsk' }),
        ],
      ),
      edit(
        'button',
        'Dodaj przycisk i miejsce wyniku',
        rates,
        'Za select, w main.',
        'Przycisk uruchomi JavaScript; type="button" zapobiega przypadkowemu wysłaniu formularza. Pusty p jest przygotowany na wynik.',
        'Dodaj Oblicz z id oblicz oraz klasą kontrolki, a pod nim pusty p o id wynik.',
        `<button id="oblicz" class="kontrolki" type="button">Oblicz</button>
<p id="wynik"></p>`,
        [html(rates, '#oblicz.kontrolki', { text: 'Oblicz' }), html(rates, 'p#wynik')],
      ),
    ],
  ),
  step(
    'selectors',
    'Buduj zewnętrzny CSS po jednej regule',
    4,
    style,
    'Wszystkie reguły CSS oraz wskazane selektory znaczników',
    [
      edit(
        'font',
        'Ustaw wspólną czcionkę',
        style,
        'Na początku pustego style.css.',
        'Gwiazdka jest selektorem uniwersalnym. Czcionka Helvetica ma obowiązywać domyślnie wszystkie elementy.',
        'Dodaj regułę * z font-family Helvetica.',
        '* { font-family: Helvetica, sans-serif; }',
        [checkCss('body', 'font-family', ['Helvetica, sans-serif', 'Helvetica'])],
      ),
      edit(
        'body',
        'Ustaw tło strony',
        style,
        'Nowa reguła za regułą *.',
        'Arkusz wymaga selektora znacznika body. Tło strony nie powinno być zastąpione klasą na innym elemencie.',
        'Dodaj body z kolorem tła #EAEAEA.',
        'body { background-color: #EAEAEA; }',
        [checkCss('body', 'background-color', ['rgb(234, 234, 234)'])],
      ),
      edit(
        'menu-footer',
        'Połącz dwa bloki jedną regułą',
        style,
        'Nowa reguła za body.',
        'Przecinek grupuje selektory. nav i footer dostaną to samo tło, kolor, odstęp wewnętrzny i wyrównanie.',
        'Dodaj cztery deklaracje dla nav, footer.',
        `nav, footer {
  background-color: #625B5B; color: white;
  padding: 20px; text-align: center;
}`,
        [
          checkCss('nav', 'padding-top', ['20px']),
          checkCss('footer', 'background-color', ['rgb(98, 91, 91)']),
          checkCss('footer', 'color', ['rgb(255, 255, 255)']),
        ],
      ),
      edit(
        'image-list',
        'Sformatuj obraz i punkty listy',
        style,
        'Dwie nowe reguły na końcu.',
        'img i ul to wymagane selektory znaczników. circle oznacza okrągły pusty punktor; 100% obrazu odnosi się do szerokości kontenera.',
        'Dodaj szerokość img i dwa ustawienia ul.',
        `img { width: 100%; }
ul { margin-left: 40px; list-style-type: circle; }`,
        [
          checkCss('ul', 'margin-left', ['40px']),
          checkCss('ul', 'list-style-type', ['circle']),
          manual('Czy img ma regułę width:100%, a obraz wypełnia szerokość nagłówka?'),
        ],
      ),
      edit(
        'menu-link-colors',
        'Ogranicz styl do linków w menu',
        style,
        'Nowa reguła nav a.',
        'Spacja oznacza potomka: nav a obejmuje link wewnątrz menu. Nie obejmuje linku pocztowego w main.',
        'Dodaj pogrubienie oraz oba kolory dla nav a.',
        `nav a {
  font-weight: bold;
  background-color: #EAEAEA;
  color: #625B5B;
}`,
        [
          checkCss('nav a', 'font-weight', ['700']),
          checkCss('nav a', 'color', ['rgb(98, 91, 91)']),
        ],
      ),
      edit(
        'menu-link-spacing',
        'Dodaj odstępy i zaokrąglenie',
        style,
        'Wewnątrz istniejącej reguły nav a, przed jej }.',
        'padding jest wewnątrz linku, margin na zewnątrz. border-radius zaokrągla rogi jego powierzchni.',
        'Dopisz padding 10px, margin 50px i border-radius 20px.',
        `padding: 10px;
margin: 50px;
border-radius: 20px;`,
        [
          checkCss('nav a', 'padding-top', ['10px']),
          checkCss('nav a', 'margin-left', ['50px']),
          checkCss('nav a', 'border-top-left-radius', ['20px']),
        ],
      ),
      edit(
        'hover',
        'Dodaj zmianę po najechaniu',
        style,
        'Osobna reguła nav a:hover za nav a.',
        ':hover oznacza stan najechania. Nowa reguła zmienia tylko wskazane cechy i nie usuwa wcześniejszych odstępów.',
        'Zapisz zamienione kolory i obramowanie 1px solid #EAEAEA.',
        `nav a:hover {
  background-color: #625B5B;
  color: #EAEAEA;
  border: 1px solid #EAEAEA;
}`,
        [
          manual(
            'Najedź na każdy link menu: czy tło i tekst zamieniają kolory, a obramowanie ma 1px? Link pocztowy ma pozostać poza tą regułą.',
          ),
        ],
      ),
      edit(
        'table',
        'Sformatuj tabelę selektorem table',
        style,
        'Nowa reguła table.',
        'dashed to linia kreskowa. Szerokość 60% i lewy margines 40px to niezależne właściwości.',
        'Dodaj cztery wymagane właściwości tabeli.',
        `table {
  border: 1px dashed #625B5B;
  width: 60%; margin-left: 40px;
  text-align: center;
}`,
        [
          checkCss('table', 'border-top-style', ['dashed']),
          checkCss('table', 'border-top-width', ['1px']),
          checkCss('table', 'margin-left', ['40px']),
          manual(
            'Czy reguła table ustawia width:60% i text-align:center? Reguły body, img, ul i table muszą używać selektorów znaczników.',
          ),
        ],
      ),
      edit(
        'controls',
        'Sformatuj wspólną klasę',
        style,
        'Nowa reguła .kontrolki.',
        'Kropka wybiera klasę. Jeden zapis obejmuje oba checkboxy, liczbę, listę i przycisk.',
        'Dodaj margin:5px do .kontrolki. Sprawdź wszystkie pięć kontrolek na raty.html.',
        '.kontrolki { margin: 5px; }',
        [
          css(style, rates, '.kontrolki', 'margin-top', ['5px']),
          manual(
            'Czy wszystkie pięć kontrolek ma klasę kontrolki i rozmieszczenie zgodne z ilustracją 5?',
          ),
        ],
      ),
    ],
  ),
  step(
    'calculator',
    'Dopisz działanie przycisku do własnej strony',
    5,
    js,
    'Odczyt pól, ceny kursów, raty i pełny komunikat JavaScript',
    [
      edit(
        'script-link',
        'Podłącz pusty skrypt',
        rates,
        'W head po link do CSS.',
        'src wskazuje plik JavaScript, a defer czeka na zbudowanie HTML. Ten skrypt należy tylko do raty.html.',
        'Dodaj script z src raty.js i defer. Nie dopisuj go ponownie, jeśli już istnieje.',
        '<script src="raty.js" defer></script>',
        [html(rates, 'script[src="raty.js"]')],
      ),
      edit(
        'function',
        'Przygotuj funkcję obliczenia',
        js,
        'Na początku pustego raty.js.',
        'Funkcja zbiera instrukcje wykonywane przy każdym kliknięciu. Na razie jest pusta i niczego nie oblicza.',
        'Wpisz funkcję obliczRate z pustym ciałem. Kolejne fragmenty dodawaj między jej klamrami.',
        `function obliczRate() {
}`,
        [manual('Czy funkcja ma parę nawiasów () i klamer {}, a nazwa opisuje zadanie?')],
      ),
      edit(
        'read-values',
        'Odczytaj liczbę i miasto',
        js,
        'W obliczRate, zaraz po otwierającej klamrze.',
        'getElementById odnajduje kontrolkę. valueAsNumber odczytuje liczbę z input number, value tekst opcji select.',
        'Dodaj dwie stałe: liczba i miasto.',
        `const liczba = document.getElementById('raty').valueAsNumber;
const miasto = document.getElementById('miasto').value;`,
        [
          manual(
            'Czy obie nazwy id zgadzają się z Twoim HTML? Odczyty muszą być wewnątrz funkcji, żeby reagowały na nowe wartości.',
          ),
        ],
      ),
      edit(
        'valid-number',
        'Zatrzymaj obliczenie bez poprawnej liczby',
        js,
        'W funkcji po odczytaniu liczba i miasto, przed sumowaniem cen.',
        'To dodatkowa kontrola użyteczności. Number.isInteger odrzuca puste pole i ułamki, a liczba <= 0 odrzuca zero i wartości ujemne. return kończy bieżące wywołanie funkcji.',
        'Dodaj warunek z komunikatem i return. Dzięki temu nie podzielisz kwoty przez zero.',
        `if (!Number.isInteger(liczba) || liczba <= 0) {
  document.getElementById('wynik').textContent = 'Podaj dodatnią całkowitą liczbę rat.';
  return;
}`,
        [
          manual(
            'Czy puste pole i zero pokazują komunikat zamiast Infinity, a poprawne dane nadal przechodzą do obliczenia?',
          ),
        ],
      ),
      edit(
        'reset-total',
        'Zacznij sumę od zera',
        js,
        'W funkcji po dwóch odczytach.',
        'let pozwala później zwiększać sumę. Wewnątrz funkcji zero wraca przy każdym kliknięciu, więc opłaty się nie kumulują.',
        'Dodaj let kwota = 0.',
        'let kwota = 0;',
        [manual('Czy kwota jest zerowana przy każdym wywołaniu, wewnątrz obliczRate?')],
      ),
      edit(
        'react-price',
        'Dolicz pierwszy wybrany kurs',
        js,
        'W funkcji za zerowaniem kwoty.',
        'checked jest wartością logiczną zaznaczenia. if uruchamia dodawanie tylko wtedy, gdy wybrano ten kurs.',
        'Jeśli #react jest zaznaczony, dodaj 5000 do kwota.',
        `if (document.getElementById('react').checked) {
  kwota += 5000;
}`,
        [manual('Czy cena React.js pochodzi z tabeli i wynosi 5000, a warunek odczytuje checked?')],
      ),
      edit(
        'javascript-price',
        'Dolicz drugi kurs niezależnie',
        js,
        'W funkcji za pierwszym if.',
        'Dwa niezależne if pozwalają wybrać oba kursy. else oznaczałoby, że drugi może być pominięty po wybraniu pierwszego.',
        'Dodaj osobny if dla #javascript i ceny 3000.',
        `if (document.getElementById('javascript').checked) {
  kwota += 3000;
}`,
        [manual('Czy są dwa niezależne warunki, tak aby oba kursy dawały 8000?')],
      ),
      edit(
        'division',
        'Oblicz jedną ratę',
        js,
        'W funkcji za oboma warunkami.',
        'Operator / dzieli sumę przez wpisaną liczbę rat. Arkusz wymaga prostego podziału, bez odsetek.',
        'Dodaj const rata = kwota / liczba. Dla dodatnich całkowitych rat sprawdź rachunek ręcznie.',
        'const rata = kwota / liczba;',
        [
          manual(
            'Czy 8000 podzielone przez 10 daje 800? Dodatkowo obsłuż puste pole i zero komunikatem, bez Infinity.',
          ),
        ],
      ),
      edit(
        'result',
        'Zbuduj wymagany komunikat',
        js,
        'W funkcji za wyliczeniem rata.',
        'textContent wpisuje tekst do istniejącego p. Literał w odwrotnych apostrofach wstawia wartości w miejscach ${...}.',
        'Przypisz do #wynik pełne zdanie z miastem, kwotą, liczbą i ratą.',
        `document.getElementById('wynik').textContent =
  \`Kurs odbędzie się w \${miasto}. Koszt całkowity: \${kwota} zł. Płacisz \${liczba} rat po \${rata} zł\`;`,
        [
          manual(
            'Czy wynik zawiera wszystkie cztery zmienne i dokładną treść komunikatu z arkusza?',
          ),
        ],
      ),
      edit(
        'event',
        'Uruchom funkcję po kliknięciu',
        js,
        'Po zamykającej klamrze funkcji; poza obliczRate.',
        'addEventListener rejestruje reakcję. Sama nazwa funkcji przekazuje ją do późniejszego wywołania; obliczRate() uruchomiłoby ją od razu.',
        'Powiąż kliknięcie #oblicz z funkcją obliczRate.',
        "document.getElementById('oblicz').addEventListener('click', obliczRate);",
        [
          manual(
            'Czy kliknięcie Oblicz aktualizuje p#wynik, a samo otwarcie strony go nie wypełnia?',
          ),
        ],
      ),
      edit(
        'calculator-check',
        'Sprawdź różne wybory',
        js,
        'Cały zapisany projekt; kod pozostaje bez zmian, jeśli działa.',
        'Sprawdzanie zachowania przyjmuje różne poprawne sposoby implementacji. Nie jest wymagana identyczna składnia jak w przykładach.',
        'Uruchom kontrolę. Sprawdź także ręcznie oba kursy/10 rat, JavaScript/3 raty i ponowne kliknięcie po zmianie miasta.',
        '// Oczekiwania: 8000 / 10 = 800; 3000 / 3 = 1000.',
        [
          {
            id: 'calculator-runtime',
            title: 'Zachowanie kalkulatora',
            kind: 'runtime',
            adapter: 'kursy-calculator',
            entry: rates,
          },
          manual(
            'Czy pełny komunikat, układ i błędne dane sprawdziłeś także w swojej przeglądarce?',
          ),
        ],
      ),
    ],
  ),
  step(
    'database',
    'Przygotuj lokalną bazę i jej dokumentację',
    2,
    sql,
    'Archiwum pliki10, baza obuwie i dowód importu',
    [
      edit(
        'archive',
        'Otwórz dane wejściowe',
        sql,
        'Czynność poza edytorem; kwerendy.txt pozostaje pusty.',
        'Załącznik zawiera dane, od których zaczyna się zadanie, a nie rozwiązanie. Baza obuwie jest osobną częścią pracy mimo tematu kursów na stronie.',
        'Pobierz archiwum pliki10 z odnośnika do danych, rozpakuj hasłem KuRsyKompuTerow3& i umieść baza.sql oraz klawiatura.jpg w roboczym folderze.',
        '-- Nie kopiuj zawartości baza.sql do kwerendy.txt.',
        [
          manual(
            'Czy rozpakowane pliki to baza.sql i klawiatura.jpg? Folder treningu może mieć fikcyjny numer zdającego.',
          ),
        ],
      ),
      edit(
        'import',
        'Zaimportuj bazę obuwie',
        sql,
        'phpMyAdmin lokalnego XAMPP; bez zmiany plików strony.',
        'Import tworzy tabele i wypełnia je danymi. Sam plik SQL nie jest działającą bazą.',
        'W phpMyAdmin utwórz obuwie z kodowaniem polskich znaków, np. utf8_unicode_ci. Zaimportuj baza.sql do tej bazy.',
        'CREATE DATABASE obuwie CHARACTER SET utf8 COLLATE utf8_unicode_ci;',
        [
          manual(
            'Czy phpMyAdmin pokazuje tabele buty, kategorie i produkt w bazie obuwie oraz ich dane? Polecenie jest objaśnieniem; bazę utwórz tylko raz.',
          ),
        ],
      ),
      edit(
        'import-proof',
        'Zapisz dowód importu',
        'import.jpg',
        'Dodaj własny plik obrazu z lokalnego stanowiska.',
        'Arkusz wymaga pełnego ekranu z paskiem zadań i informacją potwierdzającą import. Zrzut samej tabeli nie wystarcza.',
        'Zapisz niekadrowany zrzut jako import.jpg. Sprawdź rzeczywisty format JPEG.',
        '// Czynność w narzędziu do zrzutów ekranu.',
        [manual('Czy import.jpg pokazuje poprawny import do obuwie, cały monitor i pasek zadań?')],
      ),
    ],
  ),
  step(
    'graphics',
    'Przygotuj rzeczywisty plik banera',
    3,
    'baner.png',
    'Kadrowanie 1000 × 100 i napis na grafice',
    [
      edit(
        'crop',
        'Wykadruj obraz klawiatury',
        'baner.png',
        'Edytor grafiki; plik klawiatura.jpg z archiwum.',
        'Kadrowanie usuwa fragment obrazu. Zmiana szerokości w CSS tylko zmienia wyświetlanie i nie przygotowuje wymaganego pliku.',
        'Otwórz klawiatura.jpg i wykadruj fragment do 1000 × 100 px, według ilustracji 2 w PDF.',
        '// Pracujesz w edytorze grafiki, nie w CSS.',
        [manual('Czy plik ma dokładnie 1000 × 100 px, a kadr odpowiada ilustracji 2?')],
      ),
      edit(
        'banner-title',
        'Dodaj jeden napis',
        'baner.png',
        'Na środku wykadrowanej grafiki.',
        'Napis ma być częścią obrazu. Arial, pogrubienie, pochylenie i rozmiar 60 dotyczą narzędzia tekstowego edytora grafiki.',
        'Dodaj biały napis Kursy komputerowe; wybierz Arial, bold i italic, rozmiar 60. Wyśrodkuj go na obrazie.',
        'Kursy komputerowe',
        [manual('Czy tekst jest biały, wyśrodkowany, pogrubiony i pochylony w Arial 60?')],
      ),
      edit(
        'export-banner',
        'Wyeksportuj PNG',
        'baner.png',
        'Zapis grafiki i dodanie pliku do projektu.',
        'Rozszerzenie nie zmienia formatu. Eksport PNG tworzy plik o wymaganej nazwie i rzeczywistym kodowaniu obrazu.',
        'Wyeksportuj baner.png, otwórz ponownie i dodaj do listy plików projektu.',
        '// Wymagany rezultat: baner.png',
        [manual('Czy plik baner.png daje się otworzyć, jest PNG i nadal ma 1000 × 100 px?')],
      ),
    ],
  ),
  step(
    'sql-permissions',
    'Zapisz cztery zapytania w jednym pliku',
    2,
    sql,
    'Cztery wymagane operacje SQL oraz kw1.png–kw4.png',
    [
      edit(
        'select-columns',
        'Wybierz dwie kolumny produktu',
        sql,
        'Pierwsze zapytanie na początku kwerendy.txt.',
        'SELECT określa kolumny wyniku. FROM wskazuje tabelę; tu kolor i material należą do produkt.',
        'Wpisz SELECT kolor, material FROM produkt; i obejrzyj wynik w bazie.',
        'SELECT kolor, material FROM produkt;',
        [
          manual(
            'Czy wynik ma tylko kolor i material? To etap zapytania 1; następna czynność doda filtr.',
          ),
        ],
      ),
      edit(
        'height-filter',
        'Zawęź pierwsze zapytanie',
        sql,
        'W pierwszym zapytaniu, przed jego średnikiem.',
        'WHERE wybiera wiersze. Znak > oznacza ściśle większe, więc but o wysokości 10 nie spełnia warunku.',
        'Dopisz WHERE wysokosc_buta > 10 przed średnikiem. Uruchom poprawioną wersję i zapisz pełny ekran jako kw1.png.',
        'WHERE wysokosc_buta > 10;',
        [sqlCheck],
      ),
      edit(
        'join-columns',
        'Zacznij drugie zapytanie',
        sql,
        'Po zapytaniu 1, w nowej linii.',
        'Nazwy pól poprzedzone tabelą pokazują pochodzenie danych. Nazwa kategorii jest w innej tabeli niż cena buta.',
        'Zapisz początek drugiego SELECT: nazwę i cenę z buty oraz nazwę kategorii. Nie uruchamiaj nieukończonego zapytania.',
        `SELECT buty.nazwa, buty.cena, kategorie.nazwa_kat
FROM buty`,
        [
          manual(
            'Czy widzisz trzy wybrane kolumny i ich tabele? Zapytanie dokończysz w następnym kroku.',
          ),
        ],
      ),
      edit(
        'join-relation',
        'Połącz kategorię po jej kluczu',
        sql,
        'Dalszy ciąg zapytania 2, po FROM buty.',
        'buty.id_kat wskazuje kategorię buta. JOIN dopasowuje wiersze po tym samym kluczu, zamiast łączyć wszystkie kombinacje.',
        'Dodaj JOIN i warunek ON, zakończ średnikiem. Uruchom całe zapytanie 2 i zapisz kw2.png.',
        'JOIN kategorie ON buty.id_kat = kategorie.id_kat;',
        [sqlCheck],
      ),
      edit(
        'create-user',
        'Utwórz lokalne konto',
        sql,
        'Po zapytaniu 2, jako zapytanie 3.',
        'CREATE USER tworzy konto, a nie rekord w tabeli produkt. Człon localhost ogranicza miejsce połączenia. Są to publiczne dane zadania do lokalnego stanowiska.',
        'Wpisz CREATE USER dla Marka z hasłem M@reK. Wykonaj raz; powtórne utworzenie istniejącego konta może zgłosić błąd. Zapisz kw3.png.',
        "CREATE USER 'Marek'@'localhost' IDENTIFIED BY 'M@reK';",
        [sqlCheck],
      ),
      edit(
        'grant',
        'Nadaj dokładnie dwa uprawnienia',
        sql,
        'Na końcu kwerendy.txt, jako zapytanie 4.',
        'SELECT pozwala czytać, UPDATE zmieniać istniejące dane. obuwie.produkt ogranicza prawa do jednej tabeli, a nie całego serwera.',
        'Dodaj GRANT SELECT, UPDATE dla utworzonego konta i tabeli produkt. Zapisz kw4.png. Dodatkowo obejrzyj SHOW GRANTS w phpMyAdmin.',
        "GRANT SELECT, UPDATE ON obuwie.produkt TO 'Marek'@'localhost';",
        [sqlCheck],
      ),
    ],
  ),
  delivery('delivery', 6, [
    'baner.png',
    'import.jpg',
    'index.html',
    'kw1.png',
    'kw2.png',
    'kw3.png',
    'kw4.png',
    'kwerendy.txt',
    'raty.html',
    'przeglądarka.txt',
    'style.css',
  ]),
];

export const kursyProject = project(
  kursyProjectSteps,
  [
    { path: index, content: documentScaffold },
    { path: rates, content: documentScaffold },
    { path: style, content: '' },
    { path: js, content: '' },
    { path: sql, content: '' },
    { path: 'przeglądarka.txt', content: '' },
  ],
  [
    'baner.png',
    'import.jpg',
    index,
    'kw1.png',
    'kw2.png',
    'kw3.png',
    'kw4.png',
    sql,
    rates,
    'przeglądarka.txt',
    style,
  ],
);
