import type { HandbookBook } from './types';

export const htmlBook: HandbookBook = {
  id: 'html',
  title: 'HTML',
  description: 'Szkielet strony, bloki, treść, obrazy, tabele i formularze.',
  chapters: [
    {
      id: 'szkielet',
      title: 'Szkielet dokumentu',
      summary: 'Pięć linii, które każdy arkusz sprawdza na początku oceny strony.',
      sections: [
        {
          heading: 'Co zawsze musi się znaleźć',
          body: `Każdy arkusz INF.03 wymaga tych samych elementów nagłówka:

- \`<!DOCTYPE html>\` — deklaracja HTML5, pierwsza linia pliku;
- \`<html lang="pl">\` — język treści (to nie jest kodowanie);
- \`<meta charset="UTF-8">\` — jawnie podane kodowanie polskich znaków;
- \`<title>\` — tekst na karcie przeglądarki, dokładnie jak w arkuszu;
- \`<link rel="stylesheet" href="styl.css">\` — arkusz stylów o nazwie z arkusza.

W edytorze z Emmetem wpisz \`!\` i naciśnij Tab — dostaniesz gotowy szkielet. Zostaje tylko poprawić \`lang\`, tytuł i dodać link do CSS.`,
          example: {
            kind: 'web',
            show: 'html',
            html: `<!DOCTYPE html>
<html lang="pl">
<head>
  <meta charset="UTF-8">
  <title>Planer zadań</title>
  <link rel="stylesheet" href="styl.css">
</head>
<body>
  <p>Zażółć gęślą jaźń — polskie znaki działają.</p>
</body>
</html>`,
          },
        },
        {
          heading: 'Nazwy plików są częścią zadania',
          body: `Arkusz podaje nazwy plików: \`styl.css\`, \`style.css\`, \`styl_1.css\` — to różne pliki. W *Panelach podłogowych* plik nazywa się \`style.css\`, a w większości innych arkuszy \`styl.css\`. Przepisz nazwę z arkusza, nie z pamięci.

Wielkość liter też ma znaczenie: \`Jolka.jpg\` i \`jolka.jpg\` to dla serwera dwa różne pliki. W Windows strona zadziała, a u egzaminatora już nie.`,
        },
        {
          heading: 'Skrypt na końcu albo z defer',
          body: `Plik JavaScript podłączasz znacznikiem \`<script src="skrypt.js"></script>\`. Jeśli wstawisz go w \`<head>\`, dodaj atrybut \`defer\` — skrypt uruchomi się dopiero po zbudowaniu strony, więc znajdzie elementy, których szuka. Bez \`defer\` wstaw go tuż przed \`</body>\`.`,
        },
      ],
      mistakes: [
        '`lang="pl"` w miejsce `charset` — to dwa osobne wymagania.',
        'Tytuł strony wpisany w `<h1>` zamiast w `<title>`.',
        'Inna nazwa arkusza stylów niż w arkuszu (np. `style.css` zamiast `styl.css`).',
        'Style w atrybucie `style=""` — kryteria wymagają, by formatowanie było tylko w pliku CSS.',
      ],
      papers: [
        {
          taskId: 'inf03-02-25-01-sg',
          title: 'Panele podłogowe',
          note: 'Arkusz stylów nazywa się style.css, a układ powtarza się na trzech stronach.',
        },
        {
          taskId: 'inf03-02-25-06-sg',
          title: 'Moje zadania',
          note: 'Tytuł „Planer zadań” i styl.css; skrypt podłączony do jednej strony.',
        },
      ],
    },
    {
      id: 'bloki',
      title: 'Bloki semantyczne',
      summary: 'header, nav, main, aside, section, footer — który do czego i ile razy.',
      sections: [
        {
          heading: 'Znacznik mówi, czym jest blok',
          body: `Arkusze wymagają „semantycznych znaczników HTML5”. Kryteria sprawdzają zwykle, że część nagłówkowa to \`header\`, a stopka to \`footer\`; pozostałe bloki mogą być \`nav\`, \`main\`, \`aside\` albo \`section\` (często dopuszczony jest też \`div\`).

- \`header\` — górna część z tytułem lub logo;
- \`nav\` — menu, odnośniki, czasem pole do dodawania wpisu;
- \`main\` — główna treść strony, tylko jeden na stronę;
- \`aside\` — blok boczny z treścią uzupełniającą;
- \`section\` — kolejne bloki obok siebie, np. „lewy, środkowy, prawy”;
- \`footer\` — stopka; może wystąpić kilka razy (*Salon rowerowy* ma dwie).`,
          example: {
            kind: 'web',
            show: 'html',
            html: `<header><h1>Atlas drzew</h1></header>
<aside>Blok boczny</aside>
<nav>Nawigacja</nav>
<main>Blok główny</main>
<footer>Stopka</footer>`,
            css: `body { font-family: Verdana, sans-serif; margin: 0; }
header, aside, nav, main, footer { padding: 8px; border: 1px dashed #888; }
aside { float: left; width: 25%; height: 160px; }
nav, main { float: left; width: 70%; }
main { height: 100px; }
footer { clear: both; }`,
          },
        },
        {
          heading: 'Kolejność w kodzie a układ na ekranie',
          body: `HTML ustala kolejność czytania, a CSS ustawia bloki obok siebie. Zapisz bloki w kodzie w tej kolejności, w jakiej czytasz ilustrację układu: od góry, od lewej. Rozmieszczenie (float, flex, grid) to zadanie arkusza stylów — patrz rozdział *Układ bloków* w podręczniku CSS.`,
        },
      ],
      mistakes: [
        'Wszystkie bloki jako `div` — kryteria wymagają znaczników semantycznych.',
        'Dwa elementy `main` na jednej stronie.',
        'Treść bloku (np. obraz) wstawiona za zamkniętym znacznikiem bloku zamiast do środka.',
      ],
      papers: [
        {
          taskId: 'inf03-11-26-06-sg',
          title: 'Atlas drzew',
          note: 'Pięć bloków: header, aside, nav, main i footer, z nawigacją nad blokiem głównym.',
        },
        {
          taskId: 'inf03-12-26-06-sg',
          title: 'Salon rowerowy',
          note: 'Dwa bloki footer obok siebie pod blokiem głównym i bocznym.',
        },
        {
          taskId: 'inf03-06-25-01-sg',
          title: 'Systemy liczbowe',
          note: 'Trzy bloki obok siebie między nagłówkiem a stopką.',
        },
      ],
    },
    {
      id: 'tresc',
      title: 'Nagłówki, listy i wyróżnienia',
      summary: 'Poziomy nagłówków, listy zagnieżdżone, listy definicji, strong i em.',
      sections: [
        {
          heading: 'Poziom nagłówka to wymaganie',
          body: `Arkusz pisze „nagłówek drugiego stopnia” — to \`<h2>\`, nie dowolny duży tekst. Kryteria sprawdzają poziom, więc \`<h3>\` zamiast \`<h2>\` nie zostanie uznany, nawet jeśli wygląda podobnie.`,
        },
        {
          heading: 'Listy: zwykłe, zagnieżdżone i definicji',
          body: `- \`ul\` — lista punktowana (nieuporządkowana), \`ol\` — numerowana; elementy to zawsze \`li\`.
- Lista zagnieżdżona stoi **wewnątrz** elementu \`li\`, przed jego \`</li>\`. Wstawiona po zamkniętym \`li\` należałaby już do całej listy.
- Lista definicji \`dl\` składa się z par: termin \`dt\` i jego opis \`dd\`.`,
          example: {
            kind: 'web',
            show: 'html',
            html: `<ul>
  <li>górskie
    <ul>
      <li>koła 29 cali</li>
      <li>koła 26 cali</li>
    </ul>
  </li>
  <li>szosowe</li>
</ul>
<dl>
  <dt>Binarny</dt>
  <dd>system o podstawie 2</dd>
</dl>`,
            css: 'body { font-family: Verdana, sans-serif; }',
          },
        },
        {
          heading: 'strong i em zamiast b i i',
          body: `\`<strong>\` oznacza tekst ważny, \`<em>\` — tekst uwypuklony. Przeglądarka pokazuje je pogrubieniem i kursywą, ale liczy się znaczenie: gdy arkusz mówi o „semantycznym znaczniku tekstu ważnego”, \`<b>\` nie wystarczy.`,
          example: {
            kind: 'web',
            show: 'html',
            html: `<p>Witamy w naszym <strong>Atlasie drzew</strong>.</p>
<p>Stronę opracował: <em>00000000000</em></p>`,
            css: 'body { font-family: Georgia, serif; }',
          },
        },
      ],
      mistakes: [
        'Lista zagnieżdżona dopisana za `</li>` zamiast w środku pierwszego elementu.',
        'Tekst listy wpisany bez `li` albo `li` bez `ul`/`ol`.',
        '`<b>` zamiast `<strong>`, `<i>` zamiast `<em>`.',
      ],
      papers: [
        {
          taskId: 'inf03-12-26-06-sg',
          title: 'Salon rowerowy',
          note: 'Pierwszy element listy zagnieżdża drugą listę.',
        },
        {
          taskId: 'inf03-06-25-01-sg',
          title: 'Systemy liczbowe',
          note: 'Słowniczek jako lista definicji; numer zdającego w znaczniku em.',
        },
        {
          taskId: 'inf03-11-26-06-sg',
          title: 'Atlas drzew',
          note: 'Fragment „Atlasie drzew” w znaczniku strong.',
        },
      ],
    },
    {
      id: 'obrazy-tabele',
      title: 'Obrazy, odnośniki i tabele',
      summary: 'alt, ścieżki względne, odnośnik do pliku, scalanie komórek.',
      sections: [
        {
          heading: 'Obraz zawsze z tekstem alternatywnym',
          body: `\`<img src="obraz.jpg" alt="notatki">\` — \`src\` to nazwa pliku z projektu, \`alt\` to tekst z arkusza. Tekst alternatywny jest pokazywany, gdy obraz się nie wczyta, i czytany przez czytniki ekranu. Rozmiar pliku zmieniasz w programie graficznym, a rozmiar wyświetlania — w CSS.`,
        },
        {
          heading: 'Odnośnik do strony albo do pliku',
          body: `\`<a href="oferta.html">Oferta</a>\` otwiera stronę z tego samego folderu. Odnośnik może prowadzić też do obrazu (\`iglaste.png\`) albo adresu w internecie (\`https://…\`). Adres przepisz z arkusza znak po znaku — razem z podkreśleniami i wielkością liter.`,
        },
        {
          heading: 'Tabela i scalone komórki',
          body: `Tabela to \`table\`, wiersze \`tr\`, komórki \`td\`, a komórki nagłówkowe \`th\`. \`rowspan="2"\` rozciąga komórkę na dwa wiersze, \`colspan="2"\` na dwie kolumny. Dlatego wiersz ze scaleniami ma mniej komórek: miejsce zajmują komórki z wiersza wyżej.`,
          example: {
            kind: 'web',
            show: 'html',
            html: `<table>
  <tr>
    <td rowspan="2">Rodzaj paneli</td>
    <td colspan="2">Rozmiar</td>
    <td rowspan="2">Koszt montażu</td>
  </tr>
  <tr><td>Szerokość</td><td>Długość</td></tr>
  <tr><td>Laminowane</td><td>30</td><td>200</td><td>12</td></tr>
</table>`,
            css: `body { font-family: Georgia, serif; }
table, td { border: 1px solid Sienna; border-collapse: collapse; }
td { padding: 5px; text-align: center; }`,
          },
        },
      ],
      mistakes: [
        'Brak `alt` albo `alt` inny niż w arkuszu.',
        'Ścieżka z dysku (`C:\\Users\\…`) zamiast samej nazwy pliku.',
        'Pełny wiersz komórek tam, gdzie miejsce zajmuje `rowspan` z wiersza wyżej — tabela się rozjeżdża.',
      ],
      papers: [
        {
          taskId: 'inf03-02-25-01-sg',
          title: 'Panele podłogowe',
          note: 'Tabela 4 × 5 z rowspan i colspan; odnośniki między trzema stronami.',
        },
        {
          taskId: 'inf03-11-26-06-sg',
          title: 'Atlas drzew',
          note: 'Dziewięć obrazów z alt z nazwy pliku; odnośniki do plików PNG.',
        },
        {
          taskId: 'inf03-06-25-01-sg',
          title: 'Systemy liczbowe',
          note: 'Tabela 3 × 7 z wierszem komórek th.',
        },
      ],
    },
    {
      id: 'formularze',
      title: 'Pola formularza i etykiety',
      summary: 'Typy pól, podpowiedź, wartość domyślna, grupa radio i label.',
      sections: [
        {
          heading: 'Typ pola i jego atrybuty',
          body: `- \`type="text"\` — tekst, \`type="number"\` — tylko liczby, \`type="range"\` — suwak z \`min\`, \`max\` i \`value\`.
- \`placeholder\` — szara podpowiedź, która znika po wpisaniu tekstu. To nie to samo co \`value\`, które jest prawdziwą zawartością pola.
- \`id\` nadaj polom, które odczytuje skrypt.`,
          example: {
            kind: 'web',
            show: 'html',
            html: `<input type="number" id="liczba" placeholder="Wpisz liczbę dziesiętną">
<input type="range" min="100" max="220" value="150">
<button>Przelicz na binarny</button>`,
            css: 'body { font-family: Verdana, sans-serif; } input { margin: 4px; }',
          },
        },
        {
          heading: 'Radio: jedna grupa, jeden wybór',
          body: `Pola \`type="radio"\` z **tym samym** \`name\` tworzą grupę — można zaznaczyć tylko jedno. \`checked\` zaznacza pole domyślnie. W \`value\` możesz zapisać wartość potrzebną skryptowi, np. stawkę za m².`,
        },
        {
          heading: 'Etykieta powiązana z polem',
          body: `\`<label>\` opisuje pole. Powiązanie robisz na dwa sposoby: \`for\` w etykiecie równe \`id\` pola, albo pole umieszczone wewnątrz etykiety. Kliknięcie etykiety zaznacza wtedy pole. Atrybut \`title\` daje podpowiedź w „dymku” po najechaniu kursorem.`,
          example: {
            kind: 'web',
            show: 'html',
            html: `<label for="laminowane">Panele laminowane</label>
<input type="radio" name="panel" id="laminowane" value="12" checked>
<br>
<label title="szosa">
  <input type="radio" name="panel" value="14"> szosa
</label>`,
            css: 'body { font-family: Verdana, sans-serif; }',
          },
        },
      ],
      mistakes: [
        'Podpowiedź wpisana w `value` — pole nie jest wtedy puste i skrypt odczyta ten tekst.',
        'Pola radio z różnym `name` — można zaznaczyć kilka naraz.',
        '`for` w etykiecie inny niż `id` pola.',
      ],
      papers: [
        {
          taskId: 'inf03-12-26-06-sg',
          title: 'Salon rowerowy',
          note: 'Radio w etykietach z dymkiem, suwak 100–220 i pole liczbowe.',
        },
        {
          taskId: 'inf03-02-25-01-sg',
          title: 'Panele podłogowe',
          note: 'Dwa pola liczbowe z etykietami i trzy pola opcji w jednej grupie.',
        },
        {
          taskId: 'inf03-02-25-06-sg',
          title: 'Moje zadania',
          note: 'Pole z podpowiedzią „Dodaj zadanie...” i przycisk Dodaj.',
        },
      ],
    },
  ],
};
