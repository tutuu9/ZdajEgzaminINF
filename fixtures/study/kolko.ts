import type { StudyProjectFixture } from './projects.js';

const row = (alternative: boolean) =>
  `<tr>${Array.from({ length: 3 }, () =>
    alternative
      ? '<td><img src="nic.png" alt="puste pole"></td>'
      : '<td><img src="nic.png" alt="pole" onclick="ruch(this)"></td>',
  ).join('')}</tr>`;

const page = (alternative: boolean) => `<!DOCTYPE html>
<html lang="pl"><head><meta charset="UTF-8"><title>Gra</title>
<link rel="stylesheet" href="styl.css"><script src="skrypt.js" defer></script></head><body>
<header><h1>Zagraj w kółko i krzyżyk</h1></header>
<main>
${alternative ? '<section class="gracz kolko">' : '<section id="lewa">'}<h2>Gra kółko</h2></section>
${alternative ? '<section class="plansza">' : '<section id="srodek">'}<table>
${[row(alternative), row(alternative), row(alternative)].join('\n')}
</table></section>
${alternative ? '<section class="gracz krzyzyk">' : '<section id="prawa">'}<h2>Gra krzyżyk</h2></section>
</main>
<footer><a href="https://pl.battleship-game.org/" target="_blank">Zagraj w statki</a>
<p>Grę opracował: 00000000000</p></footer>
</body></html>`;

const floatCss = `* { font-family: "Lucida Console", monospace; }
body { background-color: HoneyDew; text-align: center; }
header, footer { padding: 20px; }
#lewa, #prawa { background-color: PaleGreen; width: 20%; padding: 80px 0; border-radius: 40px; float: left; }
#prawa { visibility: hidden; }
#srodek { width: 60%; box-shadow: 0 0 10px DarkGreen; float: left; }
footer { clear: both; }
img { width: 80%; margin: 10px; cursor: pointer; }
table { width: 90%; margin: 10px; border-collapse: collapse; }
td { border: 3px solid SeaGreen; }
td:active { background-color: SeaGreen; }`;

const gridCss = `* { font-family: 'Lucida Console', monospace; }
body { background: HoneyDew; text-align: center; }
header, footer { padding: 20px; }
main { display: grid; grid-template-columns: 20% 60% 20%; align-items: start; }
.gracz { background: PaleGreen; padding: 80px 0px; border-radius: 40px; }
.krzyzyk { visibility: hidden; }
.plansza { box-shadow: 0px 0px 10px DarkGreen; }
img { width: 80%; margin: 10px; cursor: pointer; }
table { width: 90%; margin: 10px; border-collapse: collapse; }
td { border: 3px solid SeaGreen; }
td:active { background: SeaGreen; }`;

const inlineScript = `let aktualnyGracz = 'o';
function ruch(obraz) {
  if (obraz.getAttribute('src') !== 'nic.png') return;
  const lewa = document.getElementById('lewa');
  const prawa = document.getElementById('prawa');
  if (aktualnyGracz === 'o') {
    obraz.src = 'o.png';
    lewa.style.visibility = 'hidden';
    prawa.style.visibility = 'visible';
    aktualnyGracz = 'x';
  } else {
    obraz.src = 'x.png';
    lewa.style.visibility = 'visible';
    prawa.style.visibility = 'hidden';
    aktualnyGracz = 'o';
  }
}`;

const listenerScript = `const circleSection = document.querySelector('.kolko');
const crossSection = document.querySelector('.krzyzyk');
let circleMoves = true;
function placeMark(cell) {
  const image = cell.querySelector('img');
  if (!image.getAttribute('src').endsWith('nic.png')) return;
  image.setAttribute('src', circleMoves ? 'o.png' : 'x.png');
  circleSection.style.visibility = circleMoves ? 'hidden' : 'visible';
  crossSection.style.visibility = circleMoves ? 'visible' : 'hidden';
  circleMoves = !circleMoves;
}
document.querySelectorAll('.plansza td').forEach((cell) => {
  cell.addEventListener('click', () => placeMark(cell));
});`;

export const kolkoFixtures: StudyProjectFixture[] = [false, true].map((alternative) => ({
  taskId: 'inf03-07-26-06-sg',
  variant: alternative ? 'grid-cell-listeners-boolean' : 'float-inline-handlers-string',
  files: [
    { path: 'gra.html', content: page(alternative) },
    { path: 'styl.css', content: alternative ? gridCss : floatCss },
    { path: 'skrypt.js', content: alternative ? listenerScript : inlineScript },
    {
      path: 'kwerendy.txt',
      content: alternative
        ? 'SELECT nazwa, potrzebne FROM grytowarzyskie WHERE liczbaGraczy > 4;\nSELECT AVG(czasRozgrywki) AS "średnia w minutach" FROM grytowarzyskie WHERE liczbaGraczy = 2;\nSELECT g.nazwa FROM grytowarzyskie g WHERE g.czasRozgrywki IN (SELECT MAX(czasRozgrywki) FROM grytowarzyskie);\nSELECT nazwa FROM grytowarzyskie WHERE potrzebne LIKE "karty%" AND liczbaGraczy < 4;'
        : "SELECT nazwa, potrzebne FROM grytowarzyskie WHERE liczbaGraczy > 4;\nSELECT AVG(czasRozgrywki) AS `średnia w minutach` FROM grytowarzyskie WHERE liczbaGraczy = 2;\nSELECT nazwa FROM grytowarzyskie WHERE czasRozgrywki = (SELECT MAX(czasRozgrywki) FROM grytowarzyskie);\nSELECT nazwa FROM grytowarzyskie WHERE potrzebne LIKE '%karty%' AND liczbaGraczy < 4;",
    },
    {
      path: 'przeglądarka.txt',
      content: 'Chromium (automated code fixture; visual assets remain manual)',
    },
  ],
  manualAssets: ['nic.png', 'o.png', 'x.png', 'import.png', 'kw1.png', 'kw2.png', 'kw3.png', 'kw4.png'],
}));

export const kolkoHtmlMistakes = [
  {
    activityId: 'structure/sections',
    path: 'gra.html',
    source: '<section id="srodek">',
    replacement: '<div id="srodek">',
  },
  {
    activityId: 'content/link',
    path: 'gra.html',
    source: 'target="_blank"',
    replacement: 'target="_self"',
  },
  {
    activityId: 'content/rows',
    path: 'gra.html',
    source: '<td><img src="nic.png" alt="pole" onclick="ruch(this)"></td></tr>',
    replacement: '</tr>',
  },
];
