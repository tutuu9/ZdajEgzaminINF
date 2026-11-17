import type { StudyProjectFixture } from './projects.js';

/** Exact six entries from verified pliki2/zadania.txt; private test data. */
export const mojeZadaniaEntries = [
  'Wyprowadzić psa',
  'Gimnastyka',
  'Zakupy',
  'Spacer z kumplem',
  'Odrabianie lekcji z młodszą siostrą',
  'Projekt na geografię',
];

const items = (alternative: boolean) =>
  mojeZadaniaEntries
    .map((entry) =>
      alternative
        ? `<li><span>${entry}</span> <button type="button" class="done">Wykonane</button></li>`
        : `<li>${entry} <button onclick="oznaczWykonane(this)">Wykonane</button></li>`,
    )
    .join('\n');

const page = (alternative: boolean) => `<!DOCTYPE html>
<html lang="pl"><head><meta charset="UTF-8"><title>Planer zadań</title>
<link rel="stylesheet" href="styl.css"><script src="${alternative ? './skrypt.js' : 'skrypt.js'}" defer></script></head><body>
<aside><img src="obraz.jpg" alt="notatki"></aside>
<header><h2>Moje zadania</h2></header>
${
  alternative
    ? '<nav><input name="task" placeholder="Dodaj zadanie..."><button type="button">Dodaj</button></nav>'
    : '<nav><input type="text" id="zadanie" placeholder="Dodaj zadanie..."> <button onclick="dodajZadanie()">Dodaj</button></nav>'
}
<main><ul${alternative ? '' : ' id="lista"'}>
${items(alternative)}
</ul></main>
<footer><h3>Notatki: 00000000000</h3></footer>
</body></html>`;

const floatCss = `* { font-family: Verdana, sans-serif; }
aside { width: 20%; height: 610px; float: left; }
img { width: 100%; height: 610px; }
header, nav, footer { background-color: MediumPurple; color: white; width: 80%; height: 50px; text-align: center; text-shadow: 4px 4px DimGray; float: left; }
nav { padding-top: 10px; }
main { background-color: Thistle; width: 80%; height: 450px; overflow: auto; float: left; }
ul { margin-top: 40px; margin-bottom: 40px; margin-left: auto; margin-right: auto; width: 70%; font-size: 25px; border: 2px solid MediumPurple; list-style-type: none; }
li { padding: 10px; }
li:nth-child(even) { background-color: #DDCADD; }
li:hover { background-color: Lavender; }
li button { float: right; background-color: MediumPurple; color: white; height: 30px; border: none; }`;

const gridCss = `* { font-family: Verdana; }
body { display: grid; grid-template-columns: 20% 80%; grid-template-rows: 50px 60px 450px 50px; margin: 0; }
aside { grid-column: 1; grid-row: 1 / 5; height: 610px; }
aside img { width: 100%; height: 610px; }
header, nav, footer { grid-column: 2; background: MediumPurple; color: #fff; height: 50px; text-align: center; text-shadow: 4px 4px 0 DimGray; }
nav { padding-top: 10px; }
main { grid-column: 2; background: Thistle; height: 450px; overflow: auto; }
main ul { margin: 40px auto; width: 70%; font-size: 25px; border: 2px solid MediumPurple; list-style: none; }
main li { padding: 10px; }
main li:nth-child(2n) { background: #DDCADD; }
main li:hover { background: Lavender; }
.done { float: right; background: MediumPurple; color: white; height: 30px; border: 0 none; }
.completed span { text-decoration: line-through; }`;

const attributeScript = `function oznaczWykonane(przycisk) {
  const wpis = przycisk.parentElement;
  wpis.style.textDecoration = 'line-through';
}
function dodajZadanie() {
  const tresc = document.getElementById('zadanie').value;
  const wpis = document.createElement('li');
  wpis.textContent = tresc + ' ';
  const przycisk = document.createElement('button');
  przycisk.textContent = 'Wykonane';
  przycisk.onclick = function () {
    oznaczWykonane(przycisk);
  };
  wpis.appendChild(przycisk);
  document.getElementById('lista').appendChild(wpis);
}`;

const delegatedScript = `const taskList = document.querySelector('main ul');
const taskInput = document.querySelector('nav input');
taskList.addEventListener('click', (event) => {
  const doneButton = event.target.closest('button.done');
  if (doneButton) doneButton.closest('li').classList.add('completed');
});
function addTask() {
  const item = document.createElement('li');
  const label = document.createElement('span');
  label.textContent = taskInput.value;
  const doneButton = document.createElement('button');
  doneButton.type = 'button';
  doneButton.className = 'done';
  doneButton.textContent = 'Wykonane';
  item.append(label, ' ', doneButton);
  taskList.append(item);
}
document.querySelector('nav button').addEventListener('click', addTask);`;

export const mojeZadaniaFixtures: StudyProjectFixture[] = [false, true].map((alternative) => ({
  taskId: 'inf03-02-25-06-sg',
  variant: alternative ? 'grid-delegated-class' : 'float-inline-handlers',
  files: [
    { path: 'notatki.html', content: page(alternative) },
    { path: 'styl.css', content: alternative ? gridCss : floatCss },
    { path: 'skrypt.js', content: alternative ? delegatedScript : attributeScript },
    {
      path: 'kwerendy.txt',
      content: alternative
        ? "SELECT priorytet FROM notatki WHERE Osoby_id = 3 ORDER BY priorytet ASC LIMIT 1;\nSELECT nazwa, priorytet FROM notatki WHERE nazwa LIKE \"%na%\";\nSELECT osoby.imie, notatki.nazwa FROM osoby, notatki WHERE osoby.id = notatki.Osoby_id AND notatki.priorytet = 5;\nSELECT osoby.imie, COUNT(*) FROM osoby INNER JOIN notatki ON notatki.Osoby_id = osoby.id GROUP BY osoby.imie;"
        : "SELECT MIN(priorytet) FROM notatki WHERE Osoby_id = 3;\nSELECT nazwa, priorytet FROM notatki WHERE nazwa LIKE '%na%';\nSELECT imie, nazwa FROM notatki JOIN osoby ON notatki.Osoby_id = osoby.id WHERE priorytet = 5;\nSELECT imie, COUNT(notatki.id) FROM notatki JOIN osoby ON notatki.Osoby_id = osoby.id GROUP BY imie;",
    },
    {
      path: 'przeglądarka.txt',
      content: 'Chromium (automated code fixture; visual assets remain manual)',
    },
  ],
  manualAssets: ['obraz.jpg', 'import.png', 'kw1.jpg', 'kw2.jpg', 'kw3.jpg', 'kw4.jpg'],
}));

export const mojeZadaniaHtmlMistakes = [
  {
    activityId: 'structure/footer',
    path: 'notatki.html',
    source: '<footer><h3>Notatki: 00000000000</h3></footer>',
    replacement: '<footer><h4>Notatki: 00000000000</h4></footer>',
  },
  {
    activityId: 'content/image',
    path: 'notatki.html',
    source: 'alt="notatki"',
    replacement: 'alt="obraz"',
  },
  {
    activityId: 'content/input',
    path: 'notatki.html',
    source: 'placeholder="Dodaj zadanie..."',
    replacement: 'value="Dodaj zadanie..."',
  },
  {
    activityId: 'content/remaining-items',
    path: 'notatki.html',
    source: '<li>Zakupy <button onclick="oznaczWykonane(this)">Wykonane</button></li>',
    replacement: '',
  },
];
