import type { StudyProjectFixture } from './projects.js';

/** Private independent code examples; real graphic edits and evidence are intentionally absent. */
const manualAssets = ['import.png','kw1.jpg','kw2.jpg','kw3.jpg','kw4.jpg','obraz1.png','obraz2.jpg'];
const mysqliPage = `<?php
$polaczenie = mysqli_connect('localhost', 'root', '', 'rzeki');
mysqli_set_charset($polaczenie, 'utf8mb4');
$filtr = $_POST['poziom'] ?? 'wszystkie';
if (!in_array($filtr, ['wszystkie','ostrzegawczy','alarmowy'], true)) $filtr = 'wszystkie';
$zapytanie = "SELECT w.nazwa,w.rzeka,w.stanOstrzegawczy,w.stanAlarmowy,p.stanWody FROM wodowskazy w JOIN pomiary p ON w.id=p.wodowskazy_id WHERE p.dataPomiaru='2022-05-05'";
if ($filtr === 'ostrzegawczy') $zapytanie .= ' AND p.stanWody>w.stanOstrzegawczy';
if ($filtr === 'alarmowy') $zapytanie .= ' AND p.stanWody>w.stanAlarmowy';
$pomiary = mysqli_query($polaczenie, $zapytanie);
$srednie = mysqli_query($polaczenie, 'SELECT dataPomiaru,AVG(stanWody) AS srednia FROM pomiary GROUP BY dataPomiaru');
?>
<!DOCTYPE html><html lang="pl"><head><meta charset="UTF-8"><title>Poziomy rzek</title><link rel="stylesheet" href="styl.css"></head>
<body><header><section class="baner"><img src="obraz1.png" alt="Mapa Polski"></section><section class="baner"><h1>Rzeki w województwie dolnośląskim</h1></section></header>
<nav><form method="post" action="poziomRzek.php">
<label class="opcja"><input type="radio" name="poziom" value="wszystkie" <?= $filtr === 'wszystkie' ? 'checked' : '' ?>> Wszystkie</label>
<label class="opcja"><input type="radio" name="poziom" value="ostrzegawczy" <?= $filtr === 'ostrzegawczy' ? 'checked' : '' ?>> Ponad stan ostrzegawczy</label>
<label class="opcja"><input type="radio" name="poziom" value="alarmowy" <?= $filtr === 'alarmowy' ? 'checked' : '' ?>> Ponad stan alarmowy</label>
<button type="submit">Pokaż</button></form></nav>
<main><h3>Stany na dzień 2022-05-05</h3><table><thead><tr><th>Wodomierz</th><th>Rzeka</th><th>Ostrzegawczy</th><th>Alarmowy</th><th>Aktualny</th></tr></thead><tbody>
<?php while ($pomiar = mysqli_fetch_assoc($pomiary)): ?>
<tr><td><?= htmlspecialchars($pomiar['nazwa'], ENT_QUOTES, 'UTF-8') ?></td><td><?= htmlspecialchars($pomiar['rzeka'], ENT_QUOTES, 'UTF-8') ?></td><td><?= (int)$pomiar['stanOstrzegawczy'] ?></td><td><?= (int)$pomiar['stanAlarmowy'] ?></td><td><?= (int)$pomiar['stanWody'] ?></td></tr>
<?php endwhile; ?>
</tbody></table></main>
<aside><h3>Informacje</h3><ul><li>Brak ostrzeżeń o burzach z gradem</li><li>Smog w mieście Wrocław</li><li>Silny wiatr w Karkonoszach</li></ul>
<h3>Średnie stany wód</h3>
<?php while ($dzien = mysqli_fetch_assoc($srednie)): ?>
<p><?= htmlspecialchars($dzien['dataPomiaru'], ENT_QUOTES, 'UTF-8') ?>: <?= htmlspecialchars($dzien['srednia'], ENT_QUOTES, 'UTF-8') ?></p>
<?php endwhile; ?>
<a href="https://komunikaty.pl">Dowiedz się więcej</a><img src="obraz2.jpg" alt="rzeka"></aside>
<footer><p>Stronę wykonał: 00000000000</p></footer>
<?php mysqli_close($polaczenie); ?>
</body></html>`;
const floatCss = `*{font-family:Georgia,serif}
header{display:flex}
.baner{background-color:Navy;color:white;text-align:center;height:100px;width:50%}
nav{background-color:Navy;padding:20px}
.opcja{color:Silver;margin:50px}.opcja:hover{color:white;text-decoration:underline}
main,aside{background-color:Azure;height:550px;float:left}
main{width:70%}aside{width:30%}
footer{clear:both;background-color:Navy;color:white}
table{border:1px solid Navy;margin:auto;width:70%}
tr:hover{background-color:SkyBlue}
aside img{width:90%}`;

// A separately authored implementation: PDO, filtering in PHP, a grid layout and different form names.
const pdoPage = `<?php
$connection = new PDO('mysql:host=localhost;dbname=rzeki;charset=utf8mb4','root','',[PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION]);
$chosenLevel = $_POST['level'] ?? 'all';
if (!in_array($chosenLevel, ['all','warning','alarm'], true)) $chosenLevel = 'all';
$readingsStatement = $connection->query("SELECT wodowskazy.nazwa,wodowskazy.rzeka,wodowskazy.stanOstrzegawczy,wodowskazy.stanAlarmowy,pomiary.stanWody FROM pomiary INNER JOIN wodowskazy ON pomiary.wodowskazy_id=wodowskazy.id WHERE pomiary.dataPomiaru='2022-05-05'");
$readings = $readingsStatement->fetchAll(PDO::FETCH_ASSOC);
$readingsStatement = null;
$averagesStatement = $connection->query('SELECT dataPomiaru,AVG(stanWody) AS average FROM pomiary GROUP BY dataPomiaru');
$dailyAverages = $averagesStatement->fetchAll(PDO::FETCH_ASSOC);
$averagesStatement = null;
function escaped($value) { return htmlspecialchars((string)$value, ENT_QUOTES, 'UTF-8'); }
?>
<!doctype html><html lang="pl"><head><meta charset="utf-8"><title>Poziomy rzek</title><link href="styl.css" rel="stylesheet"></head><body>
<header><section class="half"><img alt="Mapa Polski" src="obraz1.png"></section><section class="half"><h1>Rzeki w województwie dolnośląskim</h1></section></header>
<nav><form method="POST">
<label class="choice"><input value="all" name="level" type="radio" <?= $chosenLevel==='all' ? 'checked' : '' ?>> Wszystkie</label>
<label class="choice"><input value="warning" name="level" type="radio" <?= $chosenLevel==='warning' ? 'checked' : '' ?>> Ponad stan ostrzegawczy</label>
<label class="choice"><input value="alarm" name="level" type="radio" <?= $chosenLevel==='alarm' ? 'checked' : '' ?>> Ponad stan alarmowy</label>
<input type="submit" value="Pokaż"></form></nav>
<article class="readings"><h3>Stany na dzień 2022-05-05</h3><table><thead><tr><th>Wodomierz</th><th>Rzeka</th><th>Ostrzegawczy</th><th>Alarmowy</th><th>Aktualny</th></tr></thead><tbody>
<?php foreach ($readings as $reading) {
    if ($chosenLevel==='warning' && (int)$reading['stanWody'] <= (int)$reading['stanOstrzegawczy']) continue;
    if ($chosenLevel==='alarm' && (int)$reading['stanWody'] <= (int)$reading['stanAlarmowy']) continue;
?>
<tr><td><?= escaped($reading['nazwa']) ?></td><td><?= escaped($reading['rzeka']) ?></td><td><?= escaped($reading['stanOstrzegawczy']) ?></td><td><?= escaped($reading['stanAlarmowy']) ?></td><td><?= escaped($reading['stanWody']) ?></td></tr>
<?php } ?>
</tbody></table></article>
<section class="details"><h3>Informacje</h3><ul><li>Brak ostrzeżeń o burzach z gradem</li><li>Smog w mieście Wrocław</li><li>Silny wiatr w Karkonoszach</li></ul><h3>Średnie stany wód</h3>
<?php foreach ($dailyAverages as $dailyAverage) { ?>
<p><?= escaped($dailyAverage['dataPomiaru']) ?>: <?= escaped($dailyAverage['average']) ?></p>
<?php } ?>
<a href="https://komunikaty.pl">Dowiedz się więcej</a><img alt="rzeka" src="obraz2.jpg"></section>
<footer><p>Stronę wykonał: 11111111111</p></footer>
<?php $connection=null; ?>
</body></html>`;
const gridCss = `*{font-family:Georgia,serif}
body{display:grid;grid-template-columns:repeat(10,minmax(0,1fr))}
header{display:contents}
.half{grid-column:span 5;height:100px;background:Navy;color:#fff;text-align:center}
nav{grid-column:1/-1;background:Navy;padding:20px}
.choice{margin:50px;color:Silver}.choice:hover{color:white;text-decoration:underline}
.readings{grid-column:span 7;background:Azure;height:550px}
.details{grid-column:span 3;background:Azure;height:550px}
footer{grid-column:1/-1;background:Navy;color:white}
table{width:70%;margin:auto;border:1px solid Navy}
tr:hover{background:SkyBlue}
.details img{width:90%}`;

export const rzekiFixtures: StudyProjectFixture[] = [
  {taskId:'inf03-03-24-06-sg',variant:'mysqli-sql-filters-float',manualAssets,files:[
    {path:'poziomRzek.php',content:mysqliPage},{path:'styl.css',content:floatCss},
    {path:'kwerendy.txt',content:"SELECT nazwa,rzeka,stanAlarmowy FROM wodowskazy;\nSELECT w.nazwa,w.rzeka,w.stanOstrzegawczy,w.stanAlarmowy,p.stanWody FROM wodowskazy w JOIN pomiary p ON w.id=p.wodowskazy_id WHERE p.dataPomiaru='2022-05-05';\nSELECT w.nazwa,w.rzeka,w.stanOstrzegawczy,w.stanAlarmowy,p.stanWody FROM wodowskazy w JOIN pomiary p ON w.id=p.wodowskazy_id WHERE p.dataPomiaru='2022-05-05' AND p.stanWody>w.stanOstrzegawczy;\nSELECT dataPomiaru,AVG(stanWody) AS srednia FROM pomiary GROUP BY dataPomiaru;"},
    {path:'przeglądarka.txt',content:'Mozilla Firefox'},
  ]},
  {taskId:'inf03-03-24-06-sg',variant:'pdo-php-filters-grid',manualAssets,files:[
    {path:'poziomRzek.php',content:pdoPage},{path:'styl.css',content:gridCss},
    {path:'kwerendy.txt',content:"SELECT nazwa,rzeka,stanAlarmowy FROM wodowskazy;\nSELECT nazwa,rzeka,stanOstrzegawczy,stanAlarmowy,stanWody FROM pomiary INNER JOIN wodowskazy ON pomiary.wodowskazy_id=wodowskazy.id WHERE dataPomiaru='2022-05-05';\nSELECT nazwa,rzeka,stanOstrzegawczy,stanAlarmowy,stanWody FROM pomiary INNER JOIN wodowskazy ON pomiary.wodowskazy_id=wodowskazy.id WHERE dataPomiaru='2022-05-05' AND stanWody>stanOstrzegawczy;\nSELECT dataPomiaru,AVG(stanWody) AS average FROM pomiary GROUP BY dataPomiaru;"},
    {path:'przeglądarka.txt',content:'Mozilla Firefox'},
  ]},
];

export const rzekiHtmlMistakes = [
  {name:'wrong language',activityId:'html/document',content:mysqliPage.replace('lang="pl"','lang="en"')},
  {name:'wrong stylesheet filename',activityId:'html/stylesheet',content:mysqliPage.replace('href="styl.css"','href="style.css"')},
  {name:'GET instead of POST',activityId:'form/form-post',content:mysqliPage.replace('method="post"','method="get"')},
  {name:'missing radio option',activityId:'form/radio-alarm',content:mysqliPage.replace('type="radio" name="poziom" value="alarmowy"','type="text" name="poziom" value="alarmowy"')},
  {name:'ordinary cell instead of header',activityId:'table/headers',content:mysqliPage.replace('<th>Alarmowy</th>','<td>Alarmowy</td>')},
  {name:'wrong observation date',activityId:'table/date-title',content:mysqliPage.replace('Stany na dzień 2022-05-05','Stany na dzień 2022-05-06')},
  {name:'missing map alternative text',activityId:'html/banner-content',content:mysqliPage.replace('alt="Mapa Polski"','alt=""')},
  {name:'wrong communication URL',activityId:'information/link',content:mysqliPage.replace('href="https://komunikaty.pl"','href="https://example.com"')},
];
