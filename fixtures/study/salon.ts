import type { StudyProjectFixture } from './projects.js';

const shared = `<h2>Nasza oferta</h2><ol><li><a href="twarz.html">Oczyszczanie twarzy</a><ul><li>Peeling</li><li>Maska</li></ul></li><li>Masaż</li><li>Makijaż</li></ol><a href="index.html" class="home">Strona główna</a>`;
const welcome =
  '<p>Witaj! Miło nam, że odwiedziłeś nasz salon. Zapoznaj się z ofertą lub skontaktuj się z nami.</p><img src="obraz2.jpg" alt="Zrelaksuj się"><h3>Telefon: 111 222 333</h3>';
const controls = (alternative: boolean) =>
  '<h3>Kalkulator ceny wizyty</h3>' +
  [
    ['peeling', 'Peeling', 45],
    ['maska', 'Maska', 30],
    ['masaz', 'Masaż twarzy', 20],
    ['makijaz', 'Makijaż', 50],
  ]
    .map(([id, label, price], index) =>
      alternative
        ? `<label><input class="treatment" type="checkbox" value="${price}" name="service-${index}">${label}</label><br>`
        : `<input type="checkbox" id="${id}"><label for="${id}">${label}</label><br>`,
    )
    .join('') +
  '<button type="button">Oblicz cenę</button><p class="price"></p>';
const page = (body: string, alternative: boolean, calculator: boolean) => `<!doctype html>
<html lang="pl"><head><meta charset="UTF-8"><title>Salon kosmetyczny</title>
<link rel="stylesheet" href="${alternative ? './styl7.css' : 'styl7.css'}">${calculator ? '<script src="salon.js" defer></script>' : ''}</head>
<body><section class="offer">${shared}</section><header class="title"><h1>Usługi kosmetyczne</h1></header>
<section class="content">${body}</section><section class="staff"><img src="obraz1.jpg" alt="Personel"></section>
<footer><p>Autor: 00000000000</p></footer></body></html>`;
const style = `*{font-family:Cambria,serif}.offer,.staff{background:#E1BEE7}.offer{height:400px}.staff{height:330px}
.title,.content{font-size:170%;text-align:center}.title{background:#9C64A6;color:white;height:150px;letter-spacing:5px}
.content{color:Indigo;height:580px}footer{background:#9C64A6;color:white;padding:10px}
h2{text-align:center}ul{list-style-type:circle}img{padding:4px;margin:15px}
img:hover{padding:3px;border:1px dashed Indigo}.home{padding:25px}`;
const directScript = `function calculateTreatments() {
  let sum = 0;
  if (document.getElementById('peeling').checked) sum += 45;
  if (document.getElementById('maska').checked) sum += 30;
  if (document.getElementById('masaz').checked) sum += 20;
  if (document.getElementById('makijaz').checked) sum += 50;
  document.querySelector('.price').textContent = 'Cena zabiegów: ' + sum;
}
document.querySelector('button').addEventListener('click', calculateTreatments);`;
const alternativeScript = `const calculateSelected = () => {
  const treatments = Array.from(document.querySelectorAll('.treatment'));
  const totalPrice = treatments.reduce((total, treatment) => total + (treatment.checked ? Number(treatment.value) : 0), 0);
  document.querySelector('.price').replaceChildren(document.createTextNode('Cena zabiegów: ' + totalPrice));
};
document.querySelector('button').onclick = calculateSelected;`;

export const salonFixtures: StudyProjectFixture[] = [false, true].map((alternative) => ({
  taskId: 'inf03-05-24-01-sg',
  variant: alternative ? 'grid-valued-checkboxes-reduce' : 'float-explicit-conditions',
  files: [
    { path: 'index.html', content: page(welcome, alternative, false) },
    { path: 'twarz.html', content: page(controls(alternative), alternative, true) },
    {
      path: 'styl7.css',
      content:
        style +
        (alternative
          ? '\nbody{display:grid;grid-template-columns:25% 75%;grid-template-rows:150px 250px 330px auto}.offer{grid-column:1;grid-row:1/3}.staff{grid-column:1;grid-row:3}.title{grid-column:2;grid-row:1}.content{grid-column:2;grid-row:2/4}footer{grid-column:1/3;grid-row:4}'
          : '\n.offer,.staff{width:25%;float:left}.title,.content{width:75%;float:right}footer{clear:both}'),
    },
    { path: 'salon.js', content: alternative ? alternativeScript : directScript },
    {
      path: 'kwerendy.txt',
      content: alternative
        ? "SELECT nazwa,cena FROM uslugi WHERE 50 <= cena;\nSELECT AVG(cena) AS srednia,COUNT(id) AS liczba FROM uslugi WHERE rodzaj=1;\nCREATE USER 'kosmetyczka'@'localhost' IDENTIFIED BY 'Kosmet34';\nGRANT UPDATE,SELECT ON salon.uslugi TO 'kosmetyczka'@'localhost';"
        : "SELECT nazwa,cena FROM uslugi WHERE cena >= 50;\nSELECT AVG(cena),COUNT(*) FROM uslugi WHERE rodzaj=1;\nCREATE USER 'kosmetyczka'@'localhost' IDENTIFIED BY 'Kosmet34';\nGRANT SELECT,UPDATE ON salon.uslugi TO 'kosmetyczka'@'localhost';",
    },
    {
      path: 'przeglądarka.txt',
      content: 'Chromium (automated fixture; screenshots remain manual)',
    },
  ],
  manualAssets: [
    'import.png',
    'kw1.jpg',
    'kw2.jpg',
    'kw3.jpg',
    'kw4.jpg',
    'obraz1.jpg',
    'obraz2.jpg',
  ],
}));

export const salonHtmlMistakes = [
  {
    activityId: 'offer/nested',
    path: 'index.html',
    source: '<ul><li>Peeling</li><li>Maska</li></ul>',
    replacement: '',
  },
  {
    activityId: 'calculator-html/makeup',
    path: 'twarz.html',
    source: '<input type="checkbox" id="makijaz">',
    replacement: '<input type="radio" id="makijaz">',
  },
  {
    activityId: 'structure/style-link',
    path: 'index.html',
    source: 'href="styl7.css"',
    replacement: 'href="styl.css"',
  },
];
