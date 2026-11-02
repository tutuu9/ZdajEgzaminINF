/** Grader fixtures only. Never import this module from the browser bundle or public content DTOs. */
import type { ProjectFile } from '@zdaj/shared';
import { tasks } from '../../packages/content/src/tasks.js';

function filesFor(taskId: string, replacements: Record<string, string>): ProjectFile[] {
  const task = tasks.find((item) => item.id === taskId);
  if (!task) throw new Error(`Unknown fixture task ${taskId}`);
  return task.starterFiles.map((file) => ({...file, content: replacements[file.path] ?? file.content}));
}

const commonStyle = `* { box-sizing: border-box; }
body { color: #172b4d; background: #f5f8fc; font-family: Arial, sans-serif; margin: 24px; line-height: 1.6; }
main { max-width: 960px; margin: 0 auto; }
header, footer { max-width: 960px; margin: 20px auto; }
button, input, select { font: inherit; padding: 8px; }
:focus-visible { outline: 3px solid #2361b8; outline-offset: 3px; }
li { padding: 8px; }
img { max-width: 100%; height: auto; }
[hidden] { display: none !important; }
`;
const logo = '<svg xmlns="http://www.w3.org/2000/svg" width="320" height="160" viewBox="0 0 640 320"><rect width="640" height="320" rx="24" fill="#e4efff"/><path d="M140 75h150q30 0 30 30v145q-25-25-55-25H140zm360 0H350q-30 0-30 30v145q25-25 55-25h125z" fill="#2361b8"/><path d="M320 105v145" stroke="#172b4d" stroke-width="10"/></svg>';

const libraryMysqli = `<?php
mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);
try {
  $db = new mysqli('localhost', 'root', '', 'biblioteka');
  $db->set_charset('utf8mb4');
  $result = $db->query('SELECT b.title, a.name FROM books b JOIN authors a ON a.id = b.author_id WHERE b.available = 1 ORDER BY b.title');
  $books = $result->fetch_all(MYSQLI_ASSOC);
  $db->close();
} catch (Throwable $error) { http_response_code(503); $books = []; $message = 'Nie można teraz pobrać katalogu.'; }
?>
<!doctype html><html lang="pl"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Biblioteka szkolna</title><link rel="stylesheet" href="style.css"></head><body>
<header><h1>Biblioteka szkolna</h1><img src="logo.svg" alt="Książka"></header><main>
<?php if (isset($message)): ?><p><?= htmlspecialchars($message, ENT_QUOTES, 'UTF-8') ?></p><?php endif; ?>
<ul id="ksiazki"><?php foreach ($books as $book): ?><li><?= htmlspecialchars($book['title'], ENT_QUOTES, 'UTF-8') ?> — <?= htmlspecialchars($book['name'], ENT_QUOTES, 'UTF-8') ?></li><?php endforeach; ?></ul>
<?php if (!$books && !isset($message)): ?><p>Brak dostępnych książek.</p><?php endif; ?>
</main><footer>Autorska biblioteka szkoleniowa.</footer></body></html>`;

const libraryPdo = `<?php
try {
  $pdo = new PDO('mysql:host=localhost;dbname=biblioteka;charset=utf8mb4','root','',[PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION]);
  $rows = $pdo->query('SELECT title, (SELECT name FROM authors WHERE authors.id=books.author_id) AS autor FROM books WHERE available=1 ORDER BY title')->fetchAll(PDO::FETCH_ASSOC);
} catch (Throwable $exception) { http_response_code(503); $rows=[]; $problem=true; }
function e($text) { return htmlspecialchars((string)$text, ENT_QUOTES, 'UTF-8'); }
?>
<!doctype html><html lang="pl"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Biblioteka szkolna</title><link rel="stylesheet" href="style.css"></head><body><header><img alt="Książka" src="logo.svg"><h1>Biblioteka szkolna</h1></header><main>
<?php if (isset($problem)): ?><p>Katalog jest chwilowo niedostępny.</p><?php endif; ?>
<ul id="ksiazki"><?php foreach($rows as $row) { echo '<li><span>'.e($row['title']).'</span> — <span>'.e($row['autor']).'</span></li>'; } ?></ul>
<?php if (!$rows && !isset($problem)): ?><p>Brak dostępnych książek.</p><?php endif; ?>
</main><footer>Ćwiczenie z bazą.</footer></body></html>`;

const librarySqlA = 'SELECT b.title, a.name FROM books AS b JOIN authors AS a ON b.author_id = a.id WHERE b.available = 1 ORDER BY b.title;\nSELECT COUNT(*) AS liczba FROM books WHERE available = 1;';
const librarySqlB = 'SELECT title, (SELECT name FROM authors WHERE authors.id = books.author_id) AS autor FROM books WHERE available = 1 ORDER BY title ASC;\nSELECT SUM(CASE WHEN available = 1 THEN 1 ELSE 0 END) AS liczba FROM books;';

const workshopHtml = `<!doctype html><html lang="pl"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Kalkulator warsztatów</title><link rel="stylesheet" href="style.css"><script src="app.js" defer></script></head><body><header><h1>Kalkulator warsztatów</h1></header><nav><a href="oferta.html">Oferta</a></nav><main>
<form id="kalkulator"><label for="kurs">Kurs</label><select id="kurs" name="kurs"><option value="html">HTML</option><option value="js">JavaScript</option><option value="php">PHP</option></select>
<label for="osoby">Liczba osób</label><input id="osoby" name="osoby" type="number" min="1" max="20" step="1" required>
<label for="rabat"><input id="rabat" name="rabat" type="checkbox"> Rabat 10%</label><button type="submit">Oblicz</button></form>
<output id="wynik" aria-live="polite"></output></main></body></html>`;
const workshopOffer = `<!doctype html><html lang="pl"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Oferta warsztatów</title><link rel="stylesheet" href="style.css"></head><body><h1>Oferta warsztatów</h1><nav><a href="index.html">Kalkulator</a></nav><main><table><caption>Ceny warsztatów za osobę</caption><thead><tr><th scope="col">Kurs</th><th scope="col">Cena</th></tr></thead><tbody><tr><td>HTML</td><td>120 zł</td></tr><tr><td>JavaScript</td><td>180 zł</td></tr><tr><td>PHP</td><td>220 zł</td></tr></tbody></table></main></body></html>`;
const workshopStyle = commonStyle + 'main { display:grid; gap:24px; }\nform { display:grid; gap:12px; max-width:450px; }\ntable { border-collapse:collapse; } th,td { padding:12px; border:1px solid #64748b; }\n@media (max-width:600px) { body {margin:12px;} main {grid-template-columns:1fr;} }';
const workshopJsA = `const form = document.querySelector('#kalkulator');
const result = document.querySelector('#wynik');
const prices = { html:120, js:180, php:220 };
form.addEventListener('input', () => { result.textContent = ''; });
form.addEventListener('submit', (event) => {
  event.preventDefault();
  const raw = document.querySelector('#osoby').value;
  const people = Number(raw);
  if (!raw.trim() || !Number.isInteger(people) || people < 1 || people > 20) { result.textContent = 'Podaj całkowitą liczbę osób od 1 do 20.'; return; }
  const price = prices[document.querySelector('#kurs').value];
  if (!price) { result.textContent = 'Wybierz kurs.'; return; }
  const discount = document.querySelector('#rabat').checked ? 0.9 : 1;
  result.textContent = (price * people * discount).toFixed(2) + ' zł';
});`;
const workshopJsB = `const calculator = document.getElementById('kalkulator');
const target = document.getElementById('wynik');
function quote(course, people, discount) {
  const prices = new Map([['html',120],['js',180],['php',220]]);
  if (!prices.has(course) || !Number.isInteger(people) || people < 1 || people > 20) return null;
  return prices.get(course) * people * (discount ? 90 : 100) / 100;
}
calculator.oninput = () => { target.textContent = ''; };
calculator.onsubmit = function(event) {
  event.preventDefault();
  const numberField = document.getElementById('osoby');
  const cost = numberField.value.trim() === '' ? null : quote(document.getElementById('kurs').value, Number(numberField.value), document.getElementById('rabat').checked);
  target.textContent = cost === null ? 'Uzupełnij poprawnie pola.' : cost.toFixed(2).replace('.', ',') + ' zł';
};`;

const clubPdo = `<?php
$minimum = filter_input(INPUT_GET, 'minPlayers', FILTER_VALIDATE_INT);
if ($minimum === false || $minimum === null || $minimum < 1) $minimum = 1;
try {
  $db = new PDO('mysql:host=localhost;dbname=planszowki;charset=utf8mb4', 'root', '', [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);
  $stmt = $db->prepare('SELECT title, players FROM games WHERE players >= :minimum ORDER BY title');
  $stmt->execute(['minimum' => $minimum]);
  $games = $stmt->fetchAll(PDO::FETCH_ASSOC);
} catch (Throwable $error) { http_response_code(503); $games=[]; $problem=true; }
function escapeText($value) { return htmlspecialchars((string)$value, ENT_QUOTES, 'UTF-8'); }
?>
<!doctype html><html lang="pl"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Klub planszówkowy</title><link rel="stylesheet" href="style.css"><script src="app.js" defer></script></head><body><header><h1>Klub planszówkowy</h1></header><main>
<nav><button type="button" data-panel="gry-panel">Gry</button><button type="button" data-panel="spotkania-panel">Spotkania</button></nav>
<section id="gry-panel"><h2>Katalog gier</h2><form method="get"><label for="minPlayers">Minimalna liczba graczy</label><input id="minPlayers" name="minPlayers" type="number" min="1" value="<?= escapeText($minimum) ?>"><button type="submit">Filtruj</button></form>
<?php if (isset($problem)): ?><p>Nie można pobrać gier. Spróbuj później.</p><?php endif; ?>
<ul id="gry"><?php foreach ($games as $game): ?><li><?= escapeText($game['title']) ?> — <?= escapeText($game['players']) ?> graczy</li><?php endforeach; ?></ul>
<?php if (!$games && !isset($problem)): ?><p>Brak gier spełniających warunek.</p><?php endif; ?></section>
<section id="spotkania-panel" hidden><h2>Spotkania klubu</h2><p>Wybierz grę i poznaj innych graczy.</p></section></main></body></html>`;

const clubMysqli = clubPdo.replace(
  "$db = new PDO('mysql:host=localhost;dbname=planszowki;charset=utf8mb4', 'root', '', [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);\n  $stmt = $db->prepare('SELECT title, players FROM games WHERE players >= :minimum ORDER BY title');\n  $stmt->execute(['minimum' => $minimum]);\n  $games = $stmt->fetchAll(PDO::FETCH_ASSOC);",
  "mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);\n  $db = new mysqli('localhost','root','','planszowki');\n  $db->set_charset('utf8mb4');\n  $stmt = $db->prepare('SELECT title, players FROM games WHERE players >= ? ORDER BY title');\n  $stmt->bind_param('i', $minimum);\n  $stmt->execute();\n  $games = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);\n  $stmt->close();\n  $db->close();",
);

const clubJsA = `const panels = ['gry-panel', 'spotkania-panel'];
document.querySelectorAll('[data-panel]').forEach((button) => {
  button.addEventListener('click', () => {
    for (const id of panels) document.getElementById(id).hidden = id !== button.dataset.panel;
  });
});`;
const clubJsB = `document.querySelector('nav').addEventListener('click', (event) => {
  const button = event.target.closest('[data-panel]');
  if (!button) return;
  document.querySelectorAll('main > section').forEach((section) => { section.hidden = section.id !== button.getAttribute('data-panel'); });
});`;
const clubSqlA = 'SELECT g.title, m.seats FROM meetings m JOIN games g ON m.game_id=g.id ORDER BY m.id;\nSELECT g.title, COUNT(m.id) AS liczba FROM games g LEFT JOIN meetings m ON m.game_id=g.id GROUP BY g.id,g.title ORDER BY g.title;';
const clubSqlB = 'SELECT (SELECT title FROM games WHERE games.id=meetings.game_id) AS title, seats FROM meetings ORDER BY id;\nSELECT title, (SELECT COUNT(*) FROM meetings WHERE meetings.game_id=games.id) AS liczba FROM games ORDER BY title;';

export const validSolutions: Record<string, ProjectFile[][]> = {
  biblioteka:[
    filesFor('biblioteka',{'index.php':libraryMysqli,'style.css':commonStyle,'kwerendy.sql':librarySqlA,'logo.svg':logo}),
    filesFor('biblioteka',{'index.php':libraryPdo,'style.css':commonStyle,'kwerendy.sql':librarySqlB,'logo.svg':logo}),
  ],
  warsztaty:[
    filesFor('warsztaty',{'index.html':workshopHtml,'oferta.html':workshopOffer,'style.css':workshopStyle,'app.js':workshopJsA}),
    filesFor('warsztaty',{'index.html':workshopHtml.replace('<label for="osoby">Liczba osób</label><input id="osoby" name="osoby" type="number" min="1" max="20" step="1" required>', '<label>Liczba osób <input id="osoby" name="osoby" type="number" min="1" max="20" step="1" required></label>'),'oferta.html':workshopOffer.replace('<thead>', '').replace('</thead>', ''),'style.css':workshopStyle,'app.js':workshopJsB}),
  ],
  planszowki:[
    filesFor('planszowki',{'index.php':clubPdo,'style.css':commonStyle,'app.js':clubJsA,'kwerendy.sql':clubSqlA}),
    filesFor('planszowki',{'index.php':clubMysqli,'style.css':commonStyle,'app.js':clubJsB,'kwerendy.sql':clubSqlB}),
  ],
};

function replaceFile(files: ProjectFile[], path: string, transform: (content: string) => string): ProjectFile[] {
  return files.map((file) => file.path === path ? {...file, content:transform(file.content)} : {...file});
}

export const invalidSolutions: Record<string, {name: string; files: ProjectFile[]; expectedFailures: string[]}[]> = {
  biblioteka:[
    {name:'missing-availability-filter',files:replaceFile(validSolutions.biblioteka[0], 'index.php', (text)=>text.replace('WHERE b.available = 1 ','')),expectedFailures:['library-list','library-data']},
    {name:'wrong-count-query',files:replaceFile(validSolutions.biblioteka[0], 'kwerendy.sql', (text)=>text.replace('COUNT(*) AS liczba FROM books WHERE available = 1','COUNT(*) AS liczba FROM books')),expectedFailures:['library-query-count']},
    {name:'static-catalog',files:replaceFile(validSolutions.biblioteka[0], 'index.php', ()=>'<html><head><link rel="stylesheet" href="style.css"></head><body><h1>Biblioteka szkolna</h1><main><ul id="ksiazki"><li>Atlas chmur — Anna Lis</li><li>Czas na kod — Anna Lis</li><li>Dom nad jeziorem — Ewa Kot</li></ul></main></body></html>'),expectedFailures:['library-data']},
  ],
  warsztaty:[
    {name:'ignored-discount',files:replaceFile(validSolutions.warsztaty[0], 'app.js', (text)=>text.replace('0.9 : 1','1 : 1')),expectedFailures:['workshop-calculate']},
    {name:'missing-label',files:replaceFile(validSolutions.warsztaty[0], 'index.html', (text)=>text.replace('<label for="osoby">Liczba osób</label>','')),expectedFailures:['workshop-labels']},
    {name:'duplicate-labels-for-one-field',files:replaceFile(validSolutions.warsztaty[0], 'index.html', (text)=>text.replace('for="osoby"', 'for="kurs"').replace('for="rabat"', 'for="kurs"').replace('<input id="rabat" name="rabat" type="checkbox"> Rabat 10%</label>', 'Rabat 10%</label><input id="rabat" name="rabat" type="checkbox">')),expectedFailures:['workshop-labels']},
    {name:'missing-table-headers',files:replaceFile(validSolutions.warsztaty[0], 'oferta.html', (text)=>text.replace('<thead><tr><th scope="col">Kurs</th><th scope="col">Cena</th></tr></thead>', '')),expectedFailures:['workshop-table-headers']},
    {name:'missing-table-caption',files:replaceFile(validSolutions.warsztaty[0], 'oferta.html', (text)=>text.replace('<caption>Ceny warsztatów za osobę</caption>', '')),expectedFailures:['workshop-table-caption']},
    {name:'missing-course-row',files:replaceFile(validSolutions.warsztaty[0], 'oferta.html', (text)=>text.replace('<tr><td>PHP</td><td>220 zł</td></tr>', '')),expectedFailures:['workshop-table-rows', 'workshop-table']},
  ],
  planszowki:[
    {name:'ignored-minimum',files:replaceFile(validSolutions.planszowki[0], 'index.php', (text)=>text.replace("$stmt->execute(['minimum' => $minimum]);","$stmt->execute(['minimum' => 1]);")),expectedFailures:['club-filter']},
    {name:'no-panel-script',files:replaceFile(validSolutions.planszowki[0], 'app.js', ()=>''),expectedFailures:['club-panels']},
  ],
};

export const fixtureManifest = Object.entries(validSolutions).flatMap(([taskId, solutions]) => solutions.map((files, index) => ({taskId,name:`valid-${index+1}`,files})));
