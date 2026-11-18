import type { HandbookBook } from './types';

const page = `<header>Nagłówek</header>
<nav>Menu</nav>
<main>Blok główny</main>
<footer>Stopka</footer>`;

export const cssBook: HandbookBook = {
  id: 'css',
  title: 'CSS',
  description: 'Selektory, kolory i tekst, model pudełkowy, układ bloków i efekty.',
  chapters: [
    {
      id: 'selektory',
      title: 'Selektory i kolejność reguł',
      summary: 'Znacznik, klasa, id, grupy, potomek, :hover i :nth-child.',
      sections: [
        {
          heading: 'Jak wskazać element',
          body: `- \`*\` — wszystkie elementy (np. domyślna czcionka);
- \`p\`, \`table\`, \`img\` — selektor znacznika;
- \`.opis\` — klasa (kropka), może być nadana wielu elementom;
- \`#wynik\` — identyfikator (krzyżyk), jeden na stronę;
- \`header, nav, footer\` — grupa: ta sama reguła dla kilku selektorów;
- \`aside img\` — potomek: tylko obrazy wewnątrz \`aside\`.

Gdy arkusz zastrzega „wyłącznie przy pomocy selektora znacznika”, reguła ma mieć postać \`table { … }\`, a nie \`.tabela { … }\` — nawet jeśli wygląd będzie ten sam.`,
        },
        {
          heading: 'Kilka klas w jednym atrybucie',
          body: `Element może mieć kilka klas, rozdzielonych spacją w **jednym** atrybucie: \`class="logo1 prawa"\`. Dwa atrybuty \`class\` w jednym znaczniku to błąd — przeglądarka weźmie tylko pierwszy.`,
          example: {
            kind: 'web',
            show: 'css',
            html: `<p class="logo1 prawa">cup</p>
<p class="logo2">glass</p>`,
            css: `.logo1 { font-size: 50px; text-transform: uppercase; font-style: italic; }
.logo2 { font-size: 30px; text-decoration: underline; font-family: Impact; }
.prawa { text-align: right; }`,
          },
        },
        {
          heading: 'Pseudoklasy i kolejność',
          body: `\`li:nth-child(even)\` wybiera parzyste elementy, \`li:hover\` — element pod kursorem. Przy tej samej szczegółowości wygrywa reguła zapisana **później**, dlatego \`:hover\` zapisz pod regułą \`:nth-child\`, inaczej parzyste wiersze nie zmienią koloru.`,
          example: {
            kind: 'web',
            show: 'css',
            html: `<ul>
  <li>Wyprowadzić psa</li>
  <li>Gimnastyka</li>
  <li>Zakupy</li>
  <li>Spacer z kumplem</li>
</ul>`,
            css: `body { font-family: Verdana, sans-serif; }
ul { list-style: none; width: 260px; border: 2px solid MediumPurple; padding: 0; }
li { padding: 10px; }
li:nth-child(even) { background-color: #DDCADD; }
li:hover { background-color: Lavender; }`,
          },
        },
      ],
      mistakes: [
        'Kropka zamiast krzyżyka (albo odwrotnie) — selektor nie trafia w blok.',
        'Klasa tam, gdzie arkusz wymaga selektora znacznika.',
        '`:hover` zapisany przed regułą, która go nadpisuje.',
      ],
      papers: [
        {
          taskId: 'inf03-12-26-06-sg',
          title: 'Salon rowerowy',
          note: 'Akapity z dwiema klasami; styl ul i img tylko selektorem znacznika.',
        },
        {
          taskId: 'inf03-02-25-06-sg',
          title: 'Moje zadania',
          note: 'Parzyste elementy listy i zmiana tła pod kursorem.',
        },
        {
          taskId: 'inf03-06-25-01-sg',
          title: 'Systemy liczbowe',
          note: 'Wspólne marginesy dla table, p i dt zapisane selektorami znaczników.',
        },
      ],
    },
    {
      id: 'kolory-tekst',
      title: 'Kolory i tekst',
      summary: 'Nazwy kolorów, #hex, rgb(a), czcionka z rodziną zapasową i cechy tekstu.',
      sections: [
        {
          heading: 'Trzy zapisy koloru',
          body: `- nazwa: \`MediumPurple\`, \`Crimson\`, \`Wheat\` — przepisz dokładnie z arkusza;
- szesnastkowo: \`#824555\`, \`#02220a\`;
- \`rgb(60, 120, 160)\` albo z przezroczystością \`rgba(0, 100, 0, 0.6)\`.

\`color\` zmienia kolor tekstu, \`background-color\` — kolor tła.`,
        },
        {
          heading: 'Czcionka i jej cechy',
          body: `\`font-family: Chiller, fantasy;\` — najpierw wybrana czcionka, na końcu rodzina zapasowa, gdy jej brak. Pozostałe cechy:

- \`font-size\` (px albo % rozmiaru odziedziczonego), \`font-weight: bold\`, \`font-style: italic\`;
- \`text-align: center | right | justify\`;
- \`text-transform: uppercase\` — wielkie litery tylko w wyglądzie, w HTML zostają małe;
- \`text-decoration: none | underline\`, \`letter-spacing\`, \`line-height\`;
- \`text-shadow: 4px 4px DimGray\` — przesunięcie w poziomie, w pionie i kolor.`,
          example: {
            kind: 'web',
            show: 'css',
            html: `<h1>Atlas drzew</h1>
<p class="opis">Tekst wyjustowany ma równe krawędzie z obu stron, jeśli zajmuje kilka wierszy.</p>
<a href="#">drzewa liściaste</a>`,
            css: `h1 { font-family: Chiller, fantasy; color: Crimson; letter-spacing: 10px; margin: 0; }
.opis { font-size: 120%; line-height: 150%; text-align: justify; width: 280px; }
a { color: #382828; text-decoration: none; text-transform: uppercase; }`,
          },
        },
      ],
      mistakes: [
        'Literówka w nazwie koloru — przeglądarka po cichu zignoruje deklarację.',
        '`text-align` na obrazie zamiast na jego bloku.',
        'Wielkie litery wpisane w HTML zamiast `text-transform`.',
      ],
      papers: [
        {
          taskId: 'inf03-11-26-06-sg',
          title: 'Atlas drzew',
          note: 'h1 w Chiller z rodziną fantasy, odstęp liter 30 px; odsyłacze wielkimi literami.',
        },
        {
          taskId: 'inf03-02-25-06-sg',
          title: 'Moje zadania',
          note: 'Cień tekstu 4px 4px DimGray dla trzech bloków.',
        },
      ],
    },
    {
      id: 'pudelko',
      title: 'Model pudełkowy',
      summary:
        'Szerokość i wysokość, padding, margin, obramowanie, zaokrąglenie, cień, przewijanie.',
      sections: [
        {
          heading: 'Wewnątrz i na zewnątrz',
          body: `- \`padding\` — margines wewnętrzny, między treścią a ramką;
- \`border\` — ramka, np. \`2px solid MediumPurple\`;
- \`margin\` — margines zewnętrzny, odstęp od innych elementów.

Skrót z jedną wartością ustawia cztery strony. Dwie wartości to „góra i dół”, potem „lewo i prawo”: \`margin: 40px auto\`. Gdy arkusz wymaga „jedynie górnego marginesu”, użyj \`margin-top\`, nie skrótu.

\`margin: auto\` przy ustalonej szerokości wyśrodkowuje blok.`,
          example: {
            kind: 'web',
            show: 'css',
            html: '<ul><li>Lista o szerokości 70%</li><li>wyśrodkowana marginesem auto</li></ul>',
            css: `body { font-family: Verdana, sans-serif; }
ul { width: 70%; margin: 40px auto; border: 2px solid MediumPurple; list-style: none; padding: 0; }
li { padding: 10px; }`,
          },
        },
        {
          heading: 'Ramka z wybranych stron, zaokrąglenie i cień',
          body: `\`border-right\` i \`border-bottom\` ustawiają ramkę tylko z dwóch stron. \`border-radius: 50%\` zmienia kwadrat w koło. \`box-shadow: 0 0 25px Grey\` to cień bez przesunięcia, rozmyty równo dookoła bloku.`,
          example: {
            kind: 'web',
            show: 'css',
            html: '<div class="karta">Blok z cieniem</div><div class="ramka">Ramka z prawej i u dołu</div>',
            css: `body { font-family: Verdana, sans-serif; padding: 20px; }
.karta { padding: 22px; box-shadow: 0 0 25px Grey; margin-bottom: 20px; }
.ramka { padding: 10px; border-right: 4px solid Crimson; border-bottom: 4px solid Crimson; border-radius: 25px; }`,
          },
        },
        {
          heading: 'Przewijanie tylko gdy trzeba',
          body: `\`overflow: auto\` pokazuje pasek przewijania dopiero wtedy, gdy treść nie mieści się w ustalonej wysokości. \`overflow: scroll\` pokazuje go zawsze. Bez ustalonej \`height\` blok rośnie z treścią i przewijania nie będzie.`,
        },
      ],
      mistakes: [
        'Skrót `padding: 10px` tam, gdzie arkusz wymaga jedynie górnego marginesu wewnętrznego.',
        '`overflow` bez ustalonej wysokości bloku.',
        'Cień z przesunięciem, gdy arkusz mówi „bez przesunięcia”.',
      ],
      papers: [
        {
          taskId: 'inf03-11-26-06-sg',
          title: 'Atlas drzew',
          note: 'Cień 0 0 25px Grey, ramka tylko prawa i dolna, zaokrąglenie 25 px.',
        },
        {
          taskId: 'inf03-02-25-06-sg',
          title: 'Moje zadania',
          note: 'Lista 70% z marginesem 40px auto i blok główny z overflow auto.',
        },
      ],
    },
    {
      id: 'uklad',
      title: 'Układ bloków',
      summary: 'float z clear, flex i grid — trzy sposoby na ten sam układ z ilustracji.',
      sections: [
        {
          heading: 'Kryteria dopuszczają każdy sposób',
          body: `Arkusze oceniają, czy układ zgadza się z ilustracją i czy żaden blok nie zachodzi na inny. Kryteria wymieniają float z clear, flex, grid albo position — wybierz ten, który znasz najlepiej. Szerokości w procentach muszą się sumować: 20% + 80% mieści się w jednym wierszu, ale padding dodaje się do szerokości.`,
        },
        {
          heading: 'float i clear',
          body: `\`float: left\` ustawia blok przy lewej krawędzi, a kolejne bloki opływają go. \`clear: both\` sprowadza element pod wszystkie opływane bloki — tak schodzi stopka.`,
          example: {
            kind: 'web',
            show: 'css',
            html: page,
            css: `body { font-family: Verdana, sans-serif; margin: 0; }
header, nav, main, footer { padding: 8px; border: 1px dashed #888; }
nav { float: left; width: 20%; height: 120px; }
main { float: left; width: 70%; height: 120px; }
footer { clear: both; }`,
          },
        },
        {
          heading: 'grid',
          body: `\`display: grid\` na rodzicu i \`grid-template-columns\` z szerokościami kolumn. Szerokości kolumn mogą zastąpić \`width\` bloków — kryteria to dopuszczają.`,
          example: {
            kind: 'web',
            show: 'css',
            html: page,
            css: `body { font-family: Verdana, sans-serif; margin: 0; display: grid; grid-template-columns: 20% 80%; }
header, nav, main, footer { padding: 8px; border: 1px dashed #888; }
header, footer { grid-column: 1 / 3; }
nav, main { height: 120px; }`,
          },
        },
      ],
      mistakes: [
        'Brak `clear: both` — stopka wjeżdża pod opływane bloki.',
        'Szerokość 80% w kolumnie gridu, która już ma 80% — blok staje się węższy.',
        'Padding doliczony ponad 100% szerokości — ostatni blok spada do nowego wiersza.',
      ],
      papers: [
        {
          taskId: 'inf03-11-26-06-sg',
          title: 'Atlas drzew',
          note: 'Blok boczny 25% obok nawigacji i bloku głównego 55%.',
        },
        {
          taskId: 'inf03-06-25-01-sg',
          title: 'Systemy liczbowe',
          note: 'Trzy bloki obok siebie: 30%, 30% i 40%.',
        },
      ],
    },
    {
      id: 'tla-pozycja',
      title: 'Tła, gradienty, listy i pozycja',
      summary: 'Obraz tła, gradient pionowy, inline-block, odnośniki i nagłówek przypięty do okna.',
      sections: [
        {
          heading: 'Obraz i gradient jako tło',
          body: `\`background-image: url("naglowek.png")\` kładzie obraz pod treścią bloku. Gradient to również obraz tła: \`background-image: linear-gradient(#A0522D, #F5DEB3)\` przechodzi z góry na dół, bo to domyślny kierunek.`,
          example: {
            kind: 'web',
            show: 'css',
            html: '<header>Gradient z góry na dół</header><footer>I odwrotnie w stopce</footer>',
            css: `body { font-family: Georgia, serif; text-align: center; }
header { padding: 30px; background-image: linear-gradient(#A0522D, #F5DEB3); }
footer { padding: 30px; background-image: linear-gradient(#F5DEB3, #A0522D); }`,
          },
        },
        {
          heading: 'Lista jako menu',
          body: `\`list-style: none\` usuwa punktory. \`display: inline-block\` stawia elementy listy obok siebie, ale pozwala nadać im szerokość i wysokość — zwykłe \`inline\` ich nie przyjmuje. \`display: block\` sprawia, że odnośnik wypełnia cały element listy.`,
          example: {
            kind: 'web',
            show: 'css',
            html: `<ul>
  <li><a href="#">drzewa liściaste</a></li>
  <li><a href="#">drzewa iglaste</a></li>
  <li><a href="#">drzewa owocowe</a></li>
</ul>`,
            css: `ul { list-style: none; padding: 0; }
li { display: inline-block; width: 30%; }
a { display: block; color: #382828; text-decoration: none; text-transform: uppercase; }
a:hover { text-decoration: underline; }`,
          },
        },
        {
          heading: 'Blok przypięty do okna',
          body: `\`position: fixed; top: 0;\` przypina blok do górnej krawędzi okna — zostaje na miejscu przy przewijaniu. Taki blok nie zajmuje miejsca w układzie, więc kolejne bloki potrzebują marginesu górnego równego jego wysokości. Element fixed nie dziedziczy szerokości rodzica, więc szerokość nadaj mu wprost.`,
        },
      ],
      mistakes: [
        'Gradient zapisany w `background-color` — nie zadziała, bo to obraz tła.',
        '`inline` zamiast `inline-block` przy elementach, którym trzeba nadać szerokość.',
        'Nagłówek fixed bez marginesu górnego kolejnych bloków — zasłania treść.',
      ],
      papers: [
        {
          taskId: 'inf03-02-25-01-sg',
          title: 'Panele podłogowe',
          note: 'Przeciwne gradienty pionowe w nagłówku i stopce; odnośniki z podkreśleniem pod kursorem.',
        },
        {
          taskId: 'inf03-12-26-06-sg',
          title: 'Salon rowerowy',
          note: 'Nagłówek przypięty position: fixed; top: 0.',
        },
        {
          taskId: 'inf03-11-26-06-sg',
          title: 'Atlas drzew',
          note: 'Obraz tła w nagłówku; elementy listy inline-block o szerokości 30%.',
        },
      ],
    },
  ],
};
