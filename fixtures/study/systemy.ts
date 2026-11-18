import type { StudyProjectFixture } from './projects.js';

/** Rows of illustration 4 in INF.03-06-25.01-SG; private test data. */
export const systemyHexRows = [
  ['A', '1010', '10'],
  ['B', '1011', '11'],
  ['C', '1100', '12'],
  ['D', '1101', '13'],
  ['E', '1110', '14'],
  ['F', '1111', '15'],
];

/** Terms and definitions from verified systemy.txt; private test data. */
const glossary = [
  [
    'Binarny',
    'pozycyjny system liczbowy, w którym podstawą jest liczba 2, a do zapisu liczb potrzebne są tylko dwie cyfry: 0 i 1.',
  ],
  [
    'Decymalny',
    'pozycyjny system liczbowy, w którym podstawą jest liczba 10; do zapisu liczb stosuje się 10 cyfr: 0, 1, 2, 3, 4, 5, 6, 7, 8, 9.',
  ],
  [
    'Heksadecymalny',
    'pozycyjny system liczbowy, w którym podstawą jest liczba 16. Do zapisu liczb w tym systemie potrzebne jest szesnaście znaków.',
  ],
];

const link = 'https://szesnastkowy_system_liczbowy.pl';
const table = `<table>
<tr><th>HEX</th><th>BIN</th><th>DEC</th></tr>
${systemyHexRows.map((row) => `<tr>${row.map((cell) => `<td>${cell}</td>`).join('')}</tr>`).join('\n')}
</table>`;
const terms = glossary
  .map(
    ([term, definition]) =>
      `<dt>${term === 'Heksadecymalny' ? `<a href="${link}">${term}</a>` : term}</dt><dd>${definition}</dd>`,
  )
  .join('\n');

const page = (alternative: boolean) => `<!DOCTYPE html>
<html lang="pl"><head><meta charset="utf-8"><title>Systemy liczbowe</title>
<link rel="stylesheet" href="styl.css"><script src="skrypt.js" defer></script></head><body>
<header><img src="cyfry.gif" alt="Cyfry szesnastkowe"><h1>Pozycyjne systemy liczbowe</h1></header>
${
  alternative
    ? `<main>
<div class="kolumna tabela">${table}</div>
<div class="kolumna przelicznik"><input type="number" name="decimal" placeholder="Wpisz liczbę dziesiętną"><button type="button">Przelicz na binarny</button><p class="result">Brak obliczeń</p></div>
<div class="kolumna slownik"><h2>Słowniczek</h2><dl>${terms}</dl></div>
</main>`
    : `<section id="lewy">${table}</section>
<section id="srodkowy"><input type="number" id="liczba" placeholder="Wpisz liczbę dziesiętną">
<button onclick="przeliczNaBinarny()">Przelicz na binarny</button>
<p id="wynik">Brak obliczeń</p></section>
<section id="prawy"><h2>Słowniczek</h2><dl>${terms}</dl></section>`
}
<footer><p>Stronę opracował: <em>00000000000</em></p></footer>
</body></html>`;

const floatCss = `body { font-family: Georgia, serif; color: white; }
header, footer { background-color: #824555; text-align: center; padding: 20px; }
#lewy, #srodkowy { width: 30%; height: 350px; float: left; }
#lewy { background-color: #A26475; }
#srodkowy { background-color: #824555; }
#prawy { background-color: #A26470; width: 40%; height: 350px; overflow: auto; float: left; }
footer { clear: both; }
img { float: left; width: 50px; }
table, p, dt { margin: 10px; }
dt { padding-top: 20px; }
td, th { border: 3px solid #824555; padding: 5px; }`;

const flexCss = `body { font-family: Georgia; color: #FFFFFF; margin: 0; }
header, footer { background: #824555; text-align: center; padding: 20px; }
main { display: flex; }
.kolumna { height: 350px; }
.tabela { flex: 0 0 30%; background: #A26475; }
.przelicznik { flex: 0 0 30%; background: #824555; }
.slownik { flex: 0 0 40%; background: #A26470; overflow: auto; }
header img { float: left; width: 50px; }
table, p, dt { margin: 10px; }
dt { padding-top: 20px; }
th, td { border: 3px solid #824555; padding: 5px; }`;

const loopScript = `function przeliczNaBinarny() {
  let liczba = Number(document.getElementById('liczba').value);
  let binarna = '';
  do {
    binarna = (liczba % 2) + binarna;
    liczba = Math.floor(liczba / 2);
  } while (liczba > 0);
  let pogrupowana = '';
  for (let i = binarna.length; i > 0; i -= 4) {
    const grupa = binarna.slice(Math.max(0, i - 4), i);
    pogrupowana = pogrupowana ? grupa + ' ' + pogrupowana : grupa;
  }
  document.getElementById('wynik').innerHTML = pogrupowana + '<sub>(2)</sub>';
}`;

const builtInScript = `const decimalInput = document.querySelector('input[name="decimal"]');
const resultParagraph = document.querySelector('.result');
function groupDigits(digits) {
  const padded = digits.padStart(Math.ceil(digits.length / 4) * 4, ' ');
  return padded.match(/.{4}/g).map((group) => group.trim()).join(' ');
}
function showBinary() {
  const value = Math.floor(Math.abs(Number(decimalInput.value)));
  resultParagraph.textContent = groupDigits(value.toString(2));
  const base = document.createElement('sub');
  base.textContent = '(2)';
  resultParagraph.append(base);
}
document.querySelector('main button').addEventListener('click', showBinary);`;

export const systemyFixtures: StudyProjectFixture[] = [false, true].map((alternative) => ({
  taskId: 'inf03-06-25-01-sg',
  variant: alternative ? 'flex-classes-to-string' : 'float-ids-division-loop',
  files: [
    { path: 'systemy.html', content: page(alternative) },
    { path: 'styl.css', content: alternative ? flexCss : floatCss },
    { path: 'skrypt.js', content: alternative ? builtInScript : loopScript },
    {
      path: 'kwerendy.txt',
      content: alternative
        ? "SELECT pseudonim FROM zawodnicy WHERE data_zdobycia BETWEEN '2020-07-01' AND '2020-07-31';\nSELECT pseudonim, tytul FROM zawodnicy WHERE klasa = \"3A\" AND tytul <> \"\";\nSELECT pseudonim, klasa, ranking FROM zawodnicy ORDER BY ranking DESC LIMIT 10;\nSELECT pseudonim, data_zdobycia, DATEDIFF(NOW(), data_zdobycia) dni FROM zawodnicy WHERE tytul <> '';"
        : "SELECT pseudonim FROM zawodnicy WHERE data_zdobycia LIKE '2020-07%';\nSELECT pseudonim, tytul FROM zawodnicy WHERE klasa = '3A' AND tytul != '';\nSELECT pseudonim, klasa, ranking FROM zawodnicy ORDER BY ranking LIMIT 10;\nSELECT pseudonim, data_zdobycia, DATEDIFF(CURDATE(), data_zdobycia) AS dni FROM zawodnicy WHERE tytul != '';",
    },
    {
      path: 'przeglądarka.txt',
      content: 'Chromium (automated code fixture; visual assets remain manual)',
    },
  ],
  manualAssets: [
    '2.png',
    'cyfry.gif',
    'parametry_animacji.png',
    'import.png',
    'kw1.png',
    'kw2.png',
    'kw3.png',
    'kw4.png',
  ],
}));

export const systemyHtmlMistakes = [
  {
    activityId: 'structure/footer',
    path: 'systemy.html',
    source: '<em>00000000000</em>',
    replacement: '<i>00000000000</i>',
  },
  {
    activityId: 'table/header-row',
    path: 'systemy.html',
    source: '<tr><th>HEX</th><th>BIN</th><th>DEC</th></tr>',
    replacement: '<tr><td>HEX</td><td>BIN</td><td>DEC</td></tr>',
  },
  {
    activityId: 'converter/input',
    path: 'systemy.html',
    source: 'type="number" id="liczba"',
    replacement: 'type="text" id="liczba"',
  },
  {
    activityId: 'glossary/link',
    path: 'systemy.html',
    source: `<a href="${link}">Heksadecymalny</a>`,
    replacement: 'Heksadecymalny',
  },
];
