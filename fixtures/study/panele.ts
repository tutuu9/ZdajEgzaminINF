import type { StudyProjectFixture } from './projects.js';

/** Rows of illustration 4 in INF.03-02-25.01-SG; private test data. */
export const paneleRows = [
  ['Laminowane', '30', '200', '12'],
  ['Winylowe', '20', '200', '14'],
  ['Deska', '10', '100', '18'],
];

const shell = (alternative: boolean, main: string, script = '') => `<!DOCTYPE html>
<html lang="pl"><head><meta charset="UTF-8"><title>Montaż paneli podłogowych</title>
<link rel="stylesheet" href="${alternative ? './style.css' : 'style.css'}">${script}</head><body>
<header><img src="montaz_paneli.png" alt="firma usługowa"></header>
<nav>${
  alternative
    ? '<ul class="menu"><li><a href="./index.html">Strona Główna</a></li><li><a href="./oferta.html">Oferta</a></li><li><a href="./koszty.html">Kalkulator kosztów</a></li></ul>'
    : '<a href="index.html">Strona Główna</a><a href="oferta.html">Oferta</a><a href="koszty.html">Kalkulator kosztów</a>'
}</nav>
<main>${main}</main>
<footer><h5>Autor strony: 00000000000</h5></footer>
</body></html>`;

const homeMain = `<h1>Panele podłogowe</h1>
<img src="laminowane.png" alt="Laminowane"><p>Panele laminowane</p>
<img src="winylowe.png" alt="Winylowe"><p>Panele winylowe</p>
<img src="deska.png" alt="Deska"><p>Deska podłogowa</p>`;

const offerMain = `<h1>Koszt montażu paneli podłogowych</h1>
<table>
<tr><td rowspan="2">Rodzaj paneli</td><td colspan="2">Rozmiar</td><td rowspan="2">Koszt montażu</td></tr>
<tr><td>Szerokość</td><td>Długość</td></tr>
${paneleRows.map((row) => `<tr>${row.map((cell) => `<td>${cell}</td>`).join('')}</tr>`).join('\n')}
</table>`;

const costsMain = (alternative: boolean) =>
  alternative
    ? `<h1>Kalkulator kosztów montażu</h1>
<label>Szerokość pomieszczenia [m]: <input type="number" name="width"></label>
<label>Długość pomieszczenia [m]: <input type="number" name="length"></label>
<p>Typ panelu</p>
<label><input type="radio" name="panelType" data-rate="12"> Panele laminowane</label><br>
<label><input type="radio" name="panelType" data-rate="14"> Panele winylowe</label><br>
<label><input type="radio" name="panelType" data-rate="18"> Deska podłogowa</label><br>
<button type="button" class="calculate">Oblicz</button>
<p id="summary"></p>`
    : `<h1>Kalkulator kosztów montażu</h1>
<label for="szerokosc">Szerokość pomieszczenia [m]: </label><input type="number" id="szerokosc">
<label for="dlugosc">Długość pomieszczenia [m]: </label><input type="number" id="dlugosc">
<p>Typ panelu</p>
<input type="radio" name="panel" id="laminowane" value="12"><label for="laminowane">Panele laminowane</label><br>
<input type="radio" name="panel" id="winylowe" value="14"><label for="winylowe">Panele winylowe</label><br>
<input type="radio" name="panel" id="deska" value="18"><label for="deska">Deska podłogowa</label><br>
<button onclick="obliczKoszt()">Oblicz</button>
<p id="wynik"></p>`;

const directCss = `* { font-family: Georgia, serif; }
body { text-align: center; }
header { padding: 30px; background-image: linear-gradient(#A0522D, #F5DEB3); }
nav { background-color: Wheat; padding: 14px; }
main { background-color: Wheat; padding: 50px; }
footer { padding: 30px; background-image: linear-gradient(#F5DEB3, #A0522D); }
a { background-color: Sienna; color: white; font-weight: bold; text-decoration: none; padding: 10px; margin: 20px; }
a:hover { text-decoration: underline; }
table, td { border: 1px solid Sienna; border-collapse: collapse; }
table { width: 70%; margin: auto; }
td { padding: 5px; }`;

const alternativeCss = `* { font-family: Georgia; }
body { text-align: center; margin: 0; }
header, footer { padding: 30px; }
header { background: linear-gradient(to bottom, #A0522D, #F5DEB3); }
footer { background: linear-gradient(to bottom, #F5DEB3, #A0522D); }
nav, main { background: wheat; }
nav { padding: 14px; }
main { padding: 50px; }
.menu { list-style: none; margin: 0; padding: 0; }
.menu li { display: inline-block; }
a { background: sienna; color: #fff; font-weight: 700; text-decoration: none; padding: 10px; margin: 20px; }
a:hover { text-decoration: underline; }
table { width: 70%; margin: 0 auto; }
table, td { border: 1px solid sienna; border-collapse: collapse; }
td { padding: 5px; }`;

const directScript = `function obliczKoszt() {
  const szerokosc = document.getElementById('szerokosc').value;
  const dlugosc = document.getElementById('dlugosc').value;
  let stawka = 0;
  for (const opcja of document.getElementsByName('panel')) {
    if (opcja.checked) stawka = Number(opcja.value);
  }
  const wynik = document.getElementById('wynik');
  if (szerokosc === '' || dlugosc === '' || stawka === 0) {
    wynik.textContent = 'Wprowadź poprawne dane.';
    return;
  }
  const pole = szerokosc * dlugosc;
  const koszt = pole * stawka;
  wynik.textContent = 'Pole powierzchni pomieszczenia: ' + pole + ', koszt montażu ' + koszt;
}`;

const alternativeScript = `const widthField = document.querySelector('input[name="width"]');
const lengthField = document.querySelector('input[name="length"]');
const summary = document.getElementById('summary');
function selectedRate() {
  const options = document.querySelectorAll('input[name="panelType"]');
  for (let index = 0; index < options.length; index++) {
    if (options[index].checked) return parseFloat(options[index].dataset.rate);
  }
  return null;
}
function showCost() {
  const rate = selectedRate();
  if (!widthField.value || !lengthField.value || rate === null) {
    summary.innerHTML = 'Wprowadź poprawne dane.';
    return;
  }
  const area = parseFloat(widthField.value) * parseFloat(lengthField.value);
  summary.innerHTML = \`Pole powierzchni pomieszczenia: \${area}, koszt montażu \${area * rate}\`;
}
document.querySelector('button.calculate').addEventListener('click', showCost);`;

export const paneleFixtures: StudyProjectFixture[] = [false, true].map((alternative) => ({
  taskId: 'inf03-02-25-01-sg',
  variant: alternative ? 'list-menu-data-rates' : 'inline-links-radio-values',
  files: [
    { path: 'index.html', content: shell(alternative, homeMain) },
    { path: 'oferta.html', content: shell(alternative, offerMain) },
    {
      path: 'koszty.html',
      content: shell(
        alternative,
        costsMain(alternative),
        alternative
          ? '<script src="./skrypt.js" defer></script>'
          : '<script src="skrypt.js" defer></script>',
      ),
    },
    { path: 'style.css', content: alternative ? alternativeCss : directCss },
    { path: 'skrypt.js', content: alternative ? alternativeScript : directScript },
    {
      path: 'kwerendy.txt',
      content: alternative
        ? 'SELECT osoby.imie, osoby.nazwisko FROM osoby WHERE osoby.imie LIKE "A%";\nSELECT zadanie, data FROM zadania WHERE zadanie LIKE "%mebli%" ORDER BY data ASC;\nSELECT nazwisko, COUNT(zadania.id_zadania) AS "Liczba zadań" FROM osoby LEFT JOIN zadania ON id_osoba = osoba_id GROUP BY nazwisko;\nALTER TABLE osoby DROP telefon;'
        : "SELECT imie, nazwisko FROM osoby WHERE imie LIKE 'A%';\nSELECT zadanie, data FROM zadania WHERE zadanie LIKE '%mebli%' ORDER BY data;\nSELECT nazwisko, COUNT(id_zadania) AS `Liczba zadań` FROM osoby JOIN zadania ON osoby.id_osoba = zadania.osoba_id GROUP BY nazwisko;\nALTER TABLE osoby DROP COLUMN telefon;",
    },
    {
      path: 'przeglądarka.txt',
      content: 'Chromium (automated code fixture; visual assets remain manual)',
    },
  ],
  manualAssets: [
    'montaz_paneli.png',
    'kolor.png',
    'laminowane.png',
    'winylowe.png',
    'deska.png',
    'import.png',
    'kw1.png',
    'kw2.png',
    'kw3.png',
    'kw4.png',
  ],
}));

export const paneleHtmlMistakes = [
  {
    activityId: 'structure/footer',
    path: 'index.html',
    source: '<footer><h5>Autor strony: 00000000000</h5></footer>',
    replacement: '<footer><h4>Autor strony: 00000000000</h4></footer>',
  },
  {
    activityId: 'offer/merged-header',
    path: 'oferta.html',
    source: '<td colspan="2">Rozmiar</td>',
    replacement: '<td>Rozmiar</td>',
  },
  {
    activityId: 'calculator-page/sizes',
    path: 'koszty.html',
    source: '<input type="number" id="dlugosc">',
    replacement: '<input type="text" id="dlugosc">',
  },
  {
    activityId: 'structure/menu',
    path: 'index.html',
    source: '<a href="koszty.html">Kalkulator kosztów</a>',
    replacement: '<a href="kalkulator.html">Kalkulator kosztów</a>',
  },
];
