import type { StudyProjectFixture } from './projects.js';

/** The two paragraphs of verified pliki3/opisFotel.txt; private test data. */
export const kartaDescription: string[] = [
  "Nasz żółty fotel może być przygotowany w trzech wariantach, które można przeglądać na grafikach. Jest wygodny i elegancki. Wariant 1 polecamy do wnętrz klasycznych. Wariant 3 jest utrzymany w stylu glamour, a guzik na środku oparcia jest wykonany z kryształka. Wygodne podłokietniki sprawiają, że w tym fotelu naprawdę się odpoczywa. Wykonany z elastycznej pianki - materiału, który wyróżnia się plastycznością oraz sprężystością, zapewniając komfort siedzenia.",
  "Zorganizujemy dla Ciebie bezpłatną dostawę oraz wniesiemy towar."
];

const chairs = ['fotel1.png', 'fotel2.png', 'fotel3.png'];

const page = (alternative: boolean) => `<!DOCTYPE html>
<html lang="pl"><head><meta charset="UTF-8"><title>Fotel</title>
<link rel="stylesheet" href="styl.css"><script src="skrypt.js" defer></script></head><body>
<header><h1>Sklep meblowy</h1><hr></header>
<main>
<section>
${
  alternative
    ? '<img src="fotel1.png" alt="fotel" class="obraz">'
    : '<img src="fotel1.png" alt="fotel" class="obraz" id="glowny" onclick="otworzOkno()">'
}
<div>${chairs
  .map((chair) =>
    alternative
      ? `<img src="${chair}" alt="miniatura" class="miniatury">`
      : `<img src="${chair}" alt="miniatura" class="miniatury" onclick="zmienObraz(this)">`,
  )
  .join('')}</div>
${
  alternative
    ? '<div class="okno"><span class="zamknij">&times;</span><img class="obrazOkno" alt="podgląd"></div>'
    : '<div class="okno" id="okno"><span class="zamknij" onclick="zamknijOkno()">&times;</span><img class="obrazOkno" id="obrazOkno" alt="podgląd"></div>'
}
</section>
<article>
<h2>Żółty Fotel</h2>
${kartaDescription.map((paragraph) => `<p>${paragraph}</p>`).join('\n')}
<p><strong>Wybierz wariant fotela</strong>
<select><option>wariant 1</option><option>wariant 2</option><option>wariant 3</option></select></p>
<p><button${alternative ? ' type="button"' : ''}>KUP TERAZ</button></p>
<p><a href="sklep.html">Do strony głównej</a></p>
</article>
</main>
<footer><hr><p>Autor strony: <em>00000000000</em></p></footer>
</body></html>`;

const shop = (alternative: boolean) => `<!DOCTYPE html>
<html lang="pl"><head><meta charset="UTF-8"><title>Sklep</title></head><body>
${alternative ? '<h1>strona w trakcie budowy</h1>' : '<p>strona w trakcie budowy</p>'}
</body></html>`;

const commonCss = `.obraz { width: 40%; padding: 20px; border: 1px solid Tan; }
.miniatury { width: 15%; }
.obrazOkno { margin: auto; display: block; }
.zamknij { position: absolute; top: 15px; right: 35px; color: Beige; font-weight: bold; font-size: 40px; }
.zamknij:hover { cursor: pointer; }
`;
const flexCss = `* { font-family: "Century Gothic", sans-serif; }
body { background-color: Beige; font-size: 140%; }
header, footer { text-align: center; padding: 20px; }
main { display: flex; }
section, article { width: 50%; height: 600px; }
button { background-color: Tan; border-radius: 20px; padding: 10px; font-size: 150%; }
.okno { background-color: rgba(0, 0, 0, 0.7); width: 80%; position: fixed; left: 0; top: 0; z-index: 1; display: none; }
${commonCss}`;
const floatCss = `* { font-family: 'Century Gothic', sans-serif; }
body { background: Beige; font-size: 140%; }
header, footer { text-align: center; padding: 20px; }
section, article { width: 50%; height: 600px; float: left; }
footer { clear: both; }
button { background: Tan; border-radius: 20px; padding: 10px; font-size: 150%; }
.okno { background: rgba(0, 0, 0, .7); width: 80%; position: fixed; left: 0px; top: 0px; z-index: 10; display: none; }
${commonCss}`;

const inlineScript = `function zmienObraz(miniatura) {
  document.getElementById('glowny').src = miniatura.src;
}
function otworzOkno() {
  document.getElementById('okno').style.display = 'block';
  document.getElementById('obrazOkno').src = document.getElementById('glowny').src;
}
function zamknijOkno() {
  document.getElementById('okno').style.display = 'none';
}`;

const listenerScript = `const mainImage = document.querySelector('.obraz');
const previewWindow = document.querySelector('.okno');
const previewImage = document.querySelector('.obrazOkno');
for (const thumbnail of document.querySelectorAll('.miniatury')) {
  thumbnail.addEventListener('click', () => {
    mainImage.setAttribute('src', thumbnail.getAttribute('src'));
  });
}
mainImage.addEventListener('click', () => {
  previewImage.setAttribute('src', mainImage.getAttribute('src'));
  previewWindow.style.display = 'block';
});
document.querySelector('.zamknij').addEventListener('click', () => {
  previewWindow.style.display = 'none';
});`;

export const kartaFixtures: StudyProjectFixture[] = [false, true].map((alternative) => ({
  taskId: 'inf03-03-26-06-sg',
  variant: alternative ? 'float-class-listeners' : 'flex-ids-inline-handlers',
  files: [
    { path: 'kartaProduktu.html', content: page(alternative) },
    { path: 'sklep.html', content: shop(alternative) },
    { path: 'styl.css', content: alternative ? floatCss : flexCss },
    { path: 'skrypt.js', content: alternative ? listenerScript : inlineScript },
    {
      path: 'kwerendy.txt',
      content: alternative
        ? 'SELECT nazwa, styl, cena FROM meble WHERE czyNowy = 1 AND cena <= 1000 ORDER BY cena ASC;\nCREATE VIEW komody AS SELECT meble.idMeble, meble.nazwa, meble.kategoria, meble.cena FROM meble WHERE meble.kategoria = 3;\nSELECT ROUND(AVG(cena)) AS "Średnia cena komód", MIN(cena) AS "Minimalna", MAX(cena) AS "Maksymalna" FROM komody;\nDELETE FROM klienci WHERE nazwisko = "Nowak" AND imie = "Tomasz";'
        : "SELECT nazwa, styl, cena FROM meble WHERE czyNowy = 1 AND cena <= 1000 ORDER BY cena;\nCREATE VIEW komody AS SELECT idMeble, nazwa, kategoria, cena FROM meble WHERE kategoria = 3;\nSELECT ROUND(AVG(cena), 0) AS `Średnia cena komód`, MIN(cena) AS `Minimalna`, MAX(cena) AS `Maksymalna` FROM komody;\nDELETE FROM klienci WHERE imie = 'Tomasz' AND nazwisko = 'Nowak';",
    },
    {
      path: 'przeglądarka.txt',
      content: 'Chromium (automated code fixture; visual assets remain manual)',
    },
  ],
  manualAssets: [...chairs, 'import.png', 'kw1.png', 'kw2.png', 'kw3.png', 'kw4.png'],
}));

export const kartaHtmlMistakes = [
  {
    activityId: 'structure/main',
    path: 'kartaProduktu.html',
    source: '<article>',
    replacement: '<div>',
  },
  {
    activityId: 'article/variant',
    path: 'kartaProduktu.html',
    source: '<strong>Wybierz wariant fotela</strong>',
    replacement: '<b>Wybierz wariant fotela</b>',
  },
  {
    activityId: 'gallery/window',
    path: 'kartaProduktu.html',
    source: '<span class="zamknij" onclick="zamknijOkno()">&times;</span>',
    replacement: '<span class="zamknij" onclick="zamknijOkno()">X</span>',
  },
  {
    activityId: 'structure/footer',
    path: 'kartaProduktu.html',
    source: '<em>00000000000</em>',
    replacement: '<i>00000000000</i>',
  },
]
;
