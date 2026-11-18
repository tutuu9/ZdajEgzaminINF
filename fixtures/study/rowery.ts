import type { StudyProjectFixture } from './projects.js';

const options = [
  ['gorski', 'górski z kołami 29', '0.26'],
  ['szosa', 'szosa', '0.3'],
  ['trekking', 'trekking', '0.28'],
];
const logos = [
  ['logo1 prawa', 'cup'],
  ['logo2', 'glass'],
  ['logo1 srodek', 'spoon'],
  ['logo2 prawa', 'teaspoon'],
  ['logo1', 'fork'],
];

const page = (alternative: boolean) => `<!DOCTYPE html>
<html lang="pl"><head><meta charset="UTF-8"><title>Salon rowerowy</title>
<link rel="stylesheet" href="styl.css"><script src="skrypt.js" defer></script></head>
<body${alternative ? '' : ' onload="pokazDate()"'}>
<header>${[1, 2, 3, 4, 5].map((number) => `<img src="${number}.jpg" alt="rower">`).join('')}</header>
<main>
<h1>Dobierz rozmiar ramy roweru do wzrostu</h1>
<h2>Wybierz rodzaj roweru</h2>
${options
  .map(([id, text, factor], index) =>
    alternative
      ? `<input type="radio" name="bike" id="${id}" data-factor="${factor}"${index === 0 ? ' checked' : ''}><label for="${id}" class="klasa_etykiety" title="${text}">${text}</label>`
      : `<label class="klasa_etykiety" title="${text}"><input type="radio" name="rower" value="${factor}"${index === 0 ? ' checked' : ''}> ${text}</label>`,
  )
  .join('\n')}
<h2>Podaj swój wzrost</h2>
${
  alternative
    ? '<input type="range" name="heightRange" min="100" max="220" value="150"><input type="number" name="height" value="150">'
    : '<input type="range" id="suwak" min="100" max="220" value="150" oninput="przepiszWzrost()"><input type="number" id="wzrost" value="150">'
}
<br><button class="klasa_etykiety"${alternative ? ' type="button"' : ' onclick="obliczRame()"'}>Sprawdź</button>
<p${alternative ? ' class="frame-result"' : ' id="wynik"'}></p>
</main>
<aside><h1>Polecane firmy</h1>
${logos.map(([classes, name]) => `<p class="${classes}">${name}</p>`).join('\n')}
</aside>
<footer><h4>Oferowane typy rowerów</h4>
<ul><li>górskie<ul><li>koła 29 cali</li><li>koła 26 cali</li></ul></li><li>szosowe</li><li>miejskie</li></ul>
</footer>
<footer><h4>Informacje</h4>
<table><tr><td>Autor: </td><td>00000000000</td></tr><tr><td>Aktualna data: </td><td${alternative ? ' class="today"' : ' id="data"'}></td></tr></table>
</footer>
</body></html>`;

const sharedCss = `img { width: 16%; margin: 8px; padding: 3px; border-radius: 50%; }
.klasa_etykiety { width: 18%; height: 60px; line-height: 60px; display: inline-block; background-color: #02220a; color: white; text-align: center; overflow: hidden; }
.klasa_etykiety:hover { background-color: ForestGreen; }
.logo1 { font-size: 50px; text-transform: uppercase; font-style: italic; }
.logo2 { font-size: 30px; text-decoration: underline; font-family: Impact; }
.prawa { text-align: right; }
.srodek { text-align: center; }
ul { list-style-type: none; }
`;
const floatCss = `body { width: 80%; margin: auto; }
header { position: fixed; top: 0; width: 80%; height: 200px; background-color: white; text-align: center; }
main { width: 60%; height: 650px; padding: 0 2%; margin-top: 200px; float: left; }
aside { width: 20%; height: 650px; box-shadow: 0 0 100px #02220a; margin-top: 200px; float: right; }
footer { width: 50%; height: 170px; background-color: #02220a; color: white; float: left; clear: both; }
footer + footer { clear: none; }
${sharedCss}`;
const flexCss = `body { width: 80%; margin: 0 auto; display: flex; flex-wrap: wrap; justify-content: space-between; }
header { position: fixed; top: 0px; left: 10%; right: 10%; height: 200px; background: #FFFFFF; text-align: center; }
main { width: 60%; height: 650px; padding-left: 2%; padding-right: 2%; margin-top: 200px; }
aside { width: 20%; height: 650px; box-shadow: 0px 0px 100px #02220a; margin-top: 200px; }
footer { width: 50%; height: 170px; background: #02220a; color: #fff; }
${sharedCss}`;

const inlineScript = `function przepiszWzrost() {
  document.getElementById('wzrost').value = document.getElementById('suwak').value;
}
function obliczRame() {
  const wzrost = Number(document.getElementById('wzrost').value);
  let wspolczynnik = 0;
  for (const opcja of document.getElementsByName('rower')) {
    if (opcja.checked) wspolczynnik = Number(opcja.value);
  }
  const rozmiar = Math.round((wzrost * wspolczynnik) / 2.54);
  document.getElementById('wynik').innerText = 'Zalecany rozmiar ramy to: ' + rozmiar + ' cali';
}
function pokazDate() {
  const dzisiaj = new Date();
  const dzien = String(dzisiaj.getDate()).padStart(2, '0');
  const miesiac = String(dzisiaj.getMonth() + 1).padStart(2, '0');
  document.getElementById('data').innerText = dzien + '.' + miesiac + '.' + dzisiaj.getFullYear();
}`;

const listenerScript = `const heightRange = document.querySelector('input[name="heightRange"]');
const heightField = document.querySelector('input[name="height"]');
heightRange.addEventListener('change', () => {
  heightField.value = heightRange.value;
});
document.querySelector('main button').addEventListener('click', () => {
  const selected = [...document.querySelectorAll('input[name="bike"]')].find((option) => option.checked);
  const factor = selected ? parseFloat(selected.dataset.factor) : 0;
  const frameInches = Math.round((Number(heightField.value) * factor) / 2.54);
  document.querySelector('.frame-result').textContent = \`Zalecany rozmiar ramy to: \${frameInches} cali\`;
});
window.addEventListener('load', () => {
  const today = new Date();
  document.querySelector('.today').textContent = today.toLocaleDateString('pl-PL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
});`;

export const roweryFixtures: StudyProjectFixture[] = [false, true].map((alternative) => ({
  taskId: 'inf03-12-26-06-sg',
  variant: alternative ? 'flex-for-labels-listeners' : 'float-nested-labels-inline',
  files: [
    { path: 'index.html', content: page(alternative) },
    { path: 'styl.css', content: alternative ? flexCss : floatCss },
    { path: 'skrypt.js', content: alternative ? listenerScript : inlineScript },
    {
      path: 'kwerendy.txt',
      content: alternative
        ? 'SELECT model, rozmiar_ramy, rozmiar_kol, kolor, cena FROM rowery WHERE typ = "górski" AND cena <= 4500;\nSELECT producenci.nazwa, MIN(rowery.cena) AS "najtańszy", AVG(rowery.cena) AS "średnia cena", MAX(rowery.cena) AS "najdroższy" FROM rowery, producenci WHERE producenci.id = rowery.producent_id GROUP BY rowery.producent_id;\nSELECT id, model, typ, rozmiar_kol FROM rowery WHERE model LIKE "%carbon%" AND rozmiar_ramy = "L";\nUPDATE rowery SET cena = cena - cena * 0.25 WHERE typ = "gravel";'
        : "SELECT model, rozmiar_ramy, rozmiar_kol, kolor, cena FROM rowery WHERE typ = 'górski' AND cena <= 4500;\nSELECT producenci.nazwa, MIN(cena) AS `najtańszy`, AVG(cena) AS `średnia cena`, MAX(cena) AS `najdroższy` FROM rowery JOIN producenci ON producenci.id = rowery.producent_id GROUP BY producenci.nazwa;\nSELECT id, model, typ, rozmiar_kol FROM rowery WHERE model LIKE '%Carbon%' AND rozmiar_ramy = 'L';\nUPDATE rowery SET cena = cena * 0.75 WHERE typ = 'gravel';",
    },
    {
      path: 'przegladarka.txt',
      content: 'Chromium (automated code fixture; visual assets remain manual)',
    },
  ],
  manualAssets: [
    '1.jpg',
    '2.jpg',
    '3.jpg',
    '4.jpg',
    '5.jpg',
    'import.png',
    'kw1.png',
    'kw2.png',
    'kw3.png',
    'kw4.png',
  ],
}));

export const roweryHtmlMistakes = [
  {
    activityId: 'form/height',
    path: 'index.html',
    source: 'min="100" max="220" value="150" oninput',
    replacement: 'min="0" max="220" value="150" oninput',
  },
  {
    activityId: 'aside/logos',
    path: 'index.html',
    source: '<p class="logo1 srodek">spoon</p>',
    replacement: '<p class="logo1" class="srodek">spoon</p>',
  },
  {
    activityId: 'footers/list',
    path: 'index.html',
    source: '<li>górskie<ul><li>koła 29 cali</li><li>koła 26 cali</li></ul></li>',
    replacement: '<li>górskie</li><ul><li>koła 29 cali</li><li>koła 26 cali</li></ul>',
  },
  {
    activityId: 'form/first-option',
    path: 'index.html',
    source: 'value="0.26" checked>',
    replacement: 'value="0.26">',
  },
];
