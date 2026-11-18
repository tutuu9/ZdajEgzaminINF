import type { StudyProjectFixture } from './projects.js';

/** Arrays and intro text copied from verified pliki21/do_strony.txt; private test data. */
export const atlasTreeNames: string[] = [
  "buk",
  "lipa",
  "wierzba",
  "brzoza",
  "dąb",
  "kasztanowiec",
  "jarzębina",
  "klon",
  "magnolia"
];
export const atlasTreeDescriptions: string[] = [
  "Duże drzewo liściaste z gładką, szarą korą i gęstą, rozłożystą koroną. Ma błyszczące, ciemnozielone liście, które jesienią przebarwiają się na złociste lub czerwonawe odcienie. Buk kwitnie wiosną, a jego owoce to jadalne orzeszki zwane bukwią, zamknięte w kolczastej okrywie. Rośnie na żyznych, przepuszczalnych glebach w klimacie umiarkowanym i jest ważnym elementem lasów liściastych. Drewno buka jest twarde i wytrzymałe, wykorzystywane w meblarstwie i stolarstwie.",
  "drzewo liściaste o szerokiej, gęstej koronie i gładkiej, szarobrązowej korze, która z wiekiem staje się spękana. Ma duże, sercowate liście o piłkowanych brzegach. Kwiaty lipy są małe, żółtawobiałe, zebrane w wonne, zwisające baldachy, które kwitną na przełomie czerwca i lipca. Owoce to niewielkie orzeszki z trwałymi skrzydełkami. Lipa preferuje żyzne, wilgotne gleby i rośnie w klimacie umiarkowanym. Jest ceniona za drewno używane w rzeźbiarstwie oraz kwiaty stosowane w ziołolecznictwie, szczególnie w formie naparów na przeziębienia.",
  "Drzewo liściaste z długimi, zwisającymi gałęziami i elastycznymi pędami. Ma wąskie, lancetowate liście, które są zazwyczaj zielone na górnej stronie i srebrzyste lub niebieskawe na spodzie. Wierzba kwitnie wczesną wiosną, a jej kwiaty tworzą kotki. Rośnie na wilgotnych, często podmokłych terenach, w pobliżu rzek, jezior i innych zbiorników wodnych. Drewno wierzby jest lekkie i elastyczne, używane do produkcji koszy, mebli oraz w wikliniarstwie. Wierzba jest także ceniona w medycynie ludowej, a kora wierzby białej jest źródłem salicyny, stosowanej jako naturalny środek przeciwbólowy i przeciwgorączkowy.",
  "Drzewo liściaste o charakterystycznej białej, łuszczącej się korze. Ma delikatne, jasnozielone liście o trójkątnym lub romboidalnym kształcie, z piłkowanymi brzegami. Brzoza kwitnie wiosną, a jej kwiaty tworzą zwisające, żółtawe kotki. Owoce to drobne orzeszki z cienkimi skrzydełkami. Drzewo to rośnie na różnych typach gleb, często w lasach mieszanych i na obrzeżach pól, dobrze znosi chłodny klimat. Drewno brzozy jest twarde, ale łatwe w obróbce, używane w stolarstwie, do wyrobu mebli i sklejki. Brzoza jest również ceniona za sok brzozowy, który ma zastosowanie w ziołolecznictwie i kosmetyce.",
  "Majestatyczne drzewo liściaste o szerokiej, rozłożystej koronie i grubej, spękanej korze. Ma duże, klapowane liście, które jesienią przebarwiają się na złote i brązowe odcienie. Dąb kwitnie wiosną, a jego kwiaty są niepozorne, zebrane w kotki. Owoce dębu to żołędzie, które są ważnym źródłem pożywienia dla wielu zwierząt. Dąb rośnie na żyznych, dobrze przepuszczalnych glebach i jest długowieczny, mogąc żyć nawet kilkaset lat. Drewno dębu jest twarde, wytrzymałe i cenione w meblarstwie, stolarstwie oraz do produkcji beczek. Dąb symbolizuje siłę, wytrzymałość i długowieczność.",
  "Drzewo o dużych, skrętoległych liściach złożonych z pięciu do siedmiu lancetowatych lub eliptycznych listków. Kwiaty kasztanowca są okazałe, zebrane w stożkowate kłosy i występują zazwyczaj w kolorach białym, różowym lub czerwonym. Owoce kasztanowca to duże, skorupiaste torebki zawierające jadalne orzechy, które są popularne w kuchni i ozdobnych zastosowaniach. Kasztanowiec rośnie w umiarkowanym klimacie na żyznych, dobrze przepuszczalnych glebach.",
  "Drzewo lub krzew z rodziny różowatych (Rosaceae). Charakteryzuje się złożonymi liśćmi składającymi się z 9-15 lancetowatych listków o piłkowanych brzegach. Kwiaty są białe lub kremowe, zebrane w baldachy lub wiechy, pojawiające się wiosną lub wczesnym latem. Owoce jarzębiny to czerwone lub pomarańczowe jagody, które są atrakcyjne dla ptaków i czasem używane do wyrobu dżemów i napojów. Jarzębina rośnie na różnych typach gleb i jest popularna jako roślina ozdobna ze względu na swoje piękne kwiaty i owoce.",
  "Charakteryzuje się dłoniastymi liśćmi o pięciu łatkach, często z wyraźnymi wcięciami. Kwiaty klonu są zazwyczaj niepozorne, zebrane w baldachy lub grona, pojawiające się przed rozwojem liści wczesną wiosną. Owoce klonu to skrzydlaki, czyli nasiona zamknięte w długich, błoniastych osnówkach ułatwiających rozprzestrzenianie przez wiatr. Klony są szeroko rozpowszechnione na całym świecie i są cenione zarówno jako rośliny ozdobne, jak i źródło drewna.",
  "Magnolia to drzewo lub krzew o dużych, skórzastych liściach i pięknych, często pachnących kwiatach. Kwiaty magnolii mogą być białe, różowe lub fioletowe, czasem pełne, a czasem w baldachach. Owoce to czerwone lub różowe jagody. Magnolie są cenione za swój estetyczny wygląd i aromatyczne kwiaty, często stosowane w ogrodach i jako rośliny ozdobne."
];
const intro = "Witamy w naszym \"Atlasie drzew\", miejscu stworzonym dla miłośników przyrody, badaczy i wszystkich, którzy chcą zgłębić tajemnice drzew. Drzewa, te majestatyczne i różnorodne elementy naszej planety, pełnią kluczową rolę w ekosystemach na całym świecie. Od pradawnych lasów deszczowych po miejskie parki, drzewa dostarczają nam nie tylko tlenu, ale także inspiracji, piękna i zrozumienia natury.";
const imageFiles = ['buk', 'lipa', 'wierzba', 'brzoza', 'dab', 'kasztanowiec', 'jarzebina', 'klon', 'magnolia'];
export const atlasMissingMessage =
  'Drzewa, o którym chcesz znaleźć informacje, nie ma w naszym Atlasie drzew.';
const strongIntro = intro.replace('"Atlasie drzew"', '"<strong>Atlasie drzew</strong>"');

const page = (alternative: boolean) => `<!DOCTYPE html>
<html lang="pl"><head><meta charset="UTF-8"><title>Atlas drzew</title>
<link rel="stylesheet" href="styl.css"><script src="skrypt.js" defer></script></head><body>
<header><h1>Atlas drzew</h1></header>
<aside><h3>Wybierz drzewo, aby przeczytać o nim informacje</h3>
${
  alternative
    ? `<section class="galeria">${imageFiles.map((name) => `<img src="${name}.jpg" alt="${name}" class="miniatura">`).join('')}</section>
<input name="tree" placeholder="Wyszukaj drzewo..."><button type="button" id="search">Szukaj</button>`
    : `<div class="obrazy">${imageFiles.map((name, index) => `<img src="${name}.jpg" alt="${name}" onclick="pokazDrzewo(${index})">`).join('\n')}</div>
<input type="text" id="szukane" placeholder="Wyszukaj drzewo…"><button onclick="szukajDrzewa()">Szukaj</button>`
}
</aside>
<nav><ul><li><a href="lisciaste.html">drzewa liściaste</a></li><li><a href="iglaste.png">drzewa iglaste</a></li><li><a href="owocowe.png">drzewa owocowe</a></li></ul></nav>
<main><p class="opis">${strongIntro}</p></main>
<footer><p>Autor: 00000000000</p></footer>
</body></html>`;

const commonCss = `header { background-image: url("naglowek.png"); height: 170px; }
aside { width: 25%; height: 720px; text-align: center; }
nav, main { width: 55%; }
nav { height: 90px; }
main { padding: 22px; margin-left: 3%; box-shadow: 0 0 25px Grey; }
footer { background-color: Crimson; }
.opis { font-size: 150%; line-height: 150%; text-align: justify; }
li { display: inline-block; width: 30%; }
a { display: block; color: #382828; font-size: 180%; text-decoration: none; text-transform: uppercase; }
h1 { font-family: Chiller, fantasy; color: Crimson; font-size: 152px; letter-spacing: 30px; margin: 0; }
`;
const floatCss = `${commonCss}.obrazy, main { height: 530px; overflow: auto; }
aside, nav, main { float: left; }
footer { clear: both; }
aside img { border-right: 4px solid Crimson; border-bottom: 4px solid Crimson; border-radius: 25px; }
aside img:hover { border-color: Teal; }`;
const gridCss = `${commonCss}body { display: grid; grid-template-columns: 25% 3% 55% 1fr; grid-template-rows: 170px 90px 630px auto; }
/* Widths come from the grid columns here, which the criteria accept instead of width. */
aside, nav, main { width: auto; }
header, footer { grid-column: 1 / -1; }
aside { grid-column: 1; grid-row: 2 / 4; }
nav { grid-column: 3; grid-row: 2; }
main { grid-column: 2 / 4; grid-row: 3; height: 530px; overflow: auto; }
.galeria { height: 530px; overflow: auto; }
.miniatura { border-style: none solid solid none; border-width: 4px; border-color: Crimson; border-radius: 25px; }
.miniatura:hover { border-color: Teal; }`;

const domScript = `const nazwyDrzew = ${JSON.stringify(atlasTreeNames)};
const opisyDrzew = ${JSON.stringify(atlasTreeDescriptions)};
function pokazDrzewo(indeks) {
  const blokGlowny = document.querySelector('main');
  blokGlowny.replaceChildren();
  const naglowek = document.createElement('h2');
  naglowek.innerText = nazwyDrzew[indeks];
  const opis = document.createElement('p');
  opis.innerText = opisyDrzew[indeks];
  opis.classList.add('opis');
  blokGlowny.appendChild(naglowek);
  blokGlowny.appendChild(opis);
}
function szukajDrzewa() {
  const szukane = document.getElementById('szukane').value.trim().toLowerCase();
  const indeks = nazwyDrzew.indexOf(szukane);
  if (indeks !== -1) {
    pokazDrzewo(indeks);
  } else {
    const blokGlowny = document.querySelector('main');
    blokGlowny.replaceChildren();
    const komunikat = document.createElement('p');
    komunikat.innerText = ${JSON.stringify(atlasMissingMessage)};
    blokGlowny.appendChild(komunikat);
  }
}`;

const listenerScript = `const treeNames = ${JSON.stringify(atlasTreeNames)};
const treeDescriptions = ${JSON.stringify(atlasTreeDescriptions)};
const content = document.querySelector('main');
function showEntry(title, text) {
  while (content.firstChild) content.removeChild(content.firstChild);
  if (title) {
    const heading = document.createElement('h2');
    heading.textContent = title;
    content.appendChild(heading);
  }
  const paragraph = document.createElement('p');
  paragraph.textContent = text;
  if (title) paragraph.classList.add('opis');
  content.appendChild(paragraph);
}
function showTree(index) {
  showEntry(treeNames[index], treeDescriptions[index]);
}
document.querySelectorAll('.miniatura').forEach((image, index) => {
  image.addEventListener('click', () => showTree(index));
});
document.getElementById('search').addEventListener('click', () => {
  const query = document.querySelector('input[name="tree"]').value.trim().toLowerCase();
  const index = treeNames.indexOf(query);
  if (index >= 0) showTree(index);
  else showEntry('', ${JSON.stringify(atlasMissingMessage)});
});`;

export const atlasFixtures: StudyProjectFixture[] = [false, true].map((alternative) => ({
  taskId: 'inf03-11-26-06-sg',
  variant: alternative ? 'grid-classes-listeners' : 'float-inline-handlers',
  files: [
    { path: 'lisciaste.html', content: page(alternative) },
    { path: 'styl.css', content: alternative ? gridCss : floatCss },
    { path: 'skrypt.js', content: alternative ? listenerScript : domScript },
    {
      path: 'kwerendy.txt',
      content: alternative
        ? "SELECT nazwa, nazwaNaukowa, sredniaDlugoscZycia FROM gatunki WHERE rodzaj = 2 ORDER BY sredniaDlugoscZycia DESC;\nSELECT drzewa.id, drzewa.stanZdrowia, gatunki.nazwa FROM drzewa, gatunki WHERE gatunki.id = drzewa.gatunek_id AND drzewa.dataPosadzenia = '2008-06-06';\nSELECT rodzaj, COUNT(id) AS \"ilość\" FROM gatunki GROUP BY rodzaj;\nSELECT gatunki.nazwa, drzewa.dataPosadzenia, drzewa.stanZdrowia FROM drzewa INNER JOIN gatunki ON gatunki.id = drzewa.gatunek_id INNER JOIN lokalizacje ON lokalizacje.id = drzewa.lokalizacja_id WHERE lokalizacje.opis = \"Gdańsk, Polska\" AND gatunki.nazwa LIKE \"%a\";"
        : "SELECT nazwa, nazwaNaukowa, sredniaDlugoscZycia FROM gatunki WHERE rodzaj = 2 ORDER BY sredniaDlugoscZycia DESC;\nSELECT drzewa.id, stanZdrowia, nazwa FROM drzewa JOIN gatunki ON gatunki.id = drzewa.gatunek_id WHERE dataPosadzenia = '2008-06-06';\nSELECT rodzaj, COUNT(*) AS `ilość` FROM gatunki GROUP BY rodzaj;\nSELECT nazwa, dataPosadzenia, stanZdrowia FROM drzewa JOIN gatunki ON gatunki.id = drzewa.gatunek_id JOIN lokalizacje ON drzewa.lokalizacja_id = lokalizacje.id WHERE opis = 'Gdańsk, Polska' AND nazwa LIKE '%a';",
    },
    { path: 'przegladarka.txt', content: 'Chromium (automated code fixture; visual assets remain manual)' },
  ],
  manualAssets: [
    ...imageFiles.map((name) => `${name}.jpg`),
    'iglaste.png',
    'owocowe.png',
    'import.png',
    'kw1.png',
    'kw2.png',
    'kw3.png',
    'kw4.png',
  ],
}));

export const atlasHtmlMistakes = [
  {
    activityId: 'content/strong',
    path: 'lisciaste.html',
    source: '<strong>Atlasie drzew</strong>',
    replacement: '<b>Atlasie drzew</b>',
  },
  {
    activityId: 'sidebar/remaining-images',
    path: 'lisciaste.html',
    source: '<img src="dab.jpg" alt="dab" onclick="pokazDrzewo(4)">',
    replacement: '<img src="dab.jpg" onclick="pokazDrzewo(4)">',
  },
  {
    activityId: 'content/links',
    path: 'lisciaste.html',
    source: '<a href="iglaste.png">',
    replacement: '<a href="iglaste.html">',
  },
  {
    activityId: 'structure/footer',
    path: 'lisciaste.html',
    source: '<footer><p>Autor: 00000000000</p></footer>',
    replacement: '<footer>Autor: 00000000000</footer>',
  },
];
