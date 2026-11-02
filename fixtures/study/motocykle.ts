import type { StudyProjectFixture } from './projects.js';

/** Private authored examples, not official answers. No fabricated screenshots or image bytes. */
const manualAssets = ['droga1.jpg', 'droga2.jpg', 'droga3.jpg', 'droga4.jpg', 'droga5.jpg', 'motor.png', 'import.png', 'kw1.jpg', 'kw2.jpg', 'kw3.jpg', 'kw4.jpg'];
const procedural = `<?php
$polaczenie = mysqli_connect('localhost', 'root', '', 'motory');
mysqli_set_charset($polaczenie, 'utf8mb4');
$wycieczki = mysqli_query($polaczenie, 'SELECT w.nazwa, w.opis, w.poczatek, z.zrodlo FROM wycieczki w JOIN zdjecia z ON w.zdjecia_id=z.id');
$wynikLiczby = mysqli_query($polaczenie, 'SELECT COUNT(*) AS liczba FROM wycieczki');
$statystyka = mysqli_fetch_assoc($wynikLiczby);
?>
<!DOCTYPE html>
<html lang="pl"><head><meta charset="UTF-8"><title>Motocykle</title>
<link rel="stylesheet" href="styl.css"></head><body>
<img src="motor.png" alt="motocykl">
<header><h1>Motocykle - moja pasja</h1></header>
<main class="wycieczki"><h2>Gdzie pojechać?</h2><dl>
<?php while ($wycieczka = mysqli_fetch_assoc($wycieczki)): ?>
<dt><?= htmlspecialchars($wycieczka['nazwa'], ENT_QUOTES, 'UTF-8') ?>, rozpoczyna się w <?= htmlspecialchars($wycieczka['poczatek'], ENT_QUOTES, 'UTF-8') ?>, <a href="<?= htmlspecialchars($wycieczka['zrodlo'].'.jpg', ENT_QUOTES, 'UTF-8') ?>">zobacz zdjęcie</a></dt>
<dd><?= htmlspecialchars($wycieczka['opis'], ENT_QUOTES, 'UTF-8') ?></dd>
<?php endwhile; ?>
</dl></main>
<aside class="zakupy"><h2>Co kupić?</h2><ol><li>Honda CBR125R</li><li>Yamaha YBR125</li><li>Honda VFR800i</li><li>Honda CBR1100XX</li><li>BMW R1200GS LC</li></ol></aside>
<aside class="statystyki"><h2>Statystyki</h2><p>Wpisanych wycieczek: <?= (int)$statystyka['liczba'] ?></p><p>Użytkowników forum: 200</p><p>Przesłanych zdjęć: 1300</p></aside>
<footer><p>Stronę wykonał: 00000000000</p></footer>
<?php mysqli_close($polaczenie); ?>
</body></html>`;
const proceduralCss = `* {font-family: Verdana, sans-serif}
body {position:relative}
img[src="motor.png"] {display:block;position:absolute;left:15%;width:70%;z-index:-1}
header,footer {background-color:rgba(60,120,160,.9);color:white;padding:10px}
header {font-size:150%}
.wycieczki,.zakupy,.statystyki {float:left;background-color:rgba(0,100,0,.6);box-shadow:10px 10px 7px DimGray}
.wycieczki {margin:2%;width:75%;height:600px;font-size:120%;overflow:auto}
.zakupy,.statystyki {margin:1%;width:15%;height:300px}
footer {clear:both}
h1,h2 {text-align:center;font-style:italic}
a,dt {color:white}
dd {padding:1%}
dd:hover {background-color:LightGreen}`;

// Independently composed PDO implementation with different semantic blocks and identifiers.
const objectOriented = `<?php
$database = new PDO('mysql:host=localhost;dbname=motory;charset=utf8mb4', 'root', '', [PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION]);
$journeyStatement = $database->query('SELECT wycieczki.nazwa, wycieczki.opis, wycieczki.poczatek, zdjecia.zrodlo FROM zdjecia INNER JOIN wycieczki ON zdjecia.id=wycieczki.zdjecia_id');
$journeys = $journeyStatement->fetchAll(PDO::FETCH_ASSOC);
$journeyStatement = null;
$countStatement = $database->query('SELECT COUNT(id) FROM wycieczki');
$journeyCount = $countStatement->fetchColumn();
$countStatement = null;
function escapeText($value) { return htmlspecialchars((string)$value, ENT_QUOTES, 'UTF-8'); }
?>
<!doctype html>
<html lang="pl"><head><meta charset="utf-8"><title>Motocykle</title><link href="styl.css" rel="stylesheet"></head>
<body><img alt="motocykl" src="motor.png">
<header><h1>Motocykle - moja pasja</h1></header>
<article id="trasy"><h2>Gdzie pojechać?</h2><dl>
<?php foreach ($journeys as $journey) { ?>
<dt><?= escapeText($journey['nazwa']) ?>, rozpoczyna się w <?= escapeText($journey['poczatek']) ?>, <a href="<?= escapeText($journey['zrodlo']) ?>.jpg">zobacz zdjęcie</a></dt>
<dd><?= escapeText($journey['opis']) ?></dd>
<?php } ?>
</dl></article>
<section class="boczny"><h2>Co kupić?</h2><ol>
<li>Honda CBR125R</li><li>Yamaha YBR125</li><li>Honda VFR800i</li><li>Honda CBR1100XX</li><li>BMW R1200GS LC</li>
</ol></section>
<section class="boczny"><h2>Statystyki</h2>
<p>Wpisanych wycieczek: <?= (int)$journeyCount ?></p>
<p>Użytkowników forum: 200</p><p>Przesłanych zdjęć: 1300</p></section>
<footer><p>Stronę wykonał: 11111111111</p></footer>
<?php $database = null; ?>
</body></html>`;
const objectCss = `*{font-family:Verdana,sans-serif}
body{position:relative}
body>img{display:block;position:absolute;left:15%;width:70%;z-index:-1}
header{font-size:150%;padding:10px;background:rgba(60,120,160,0.9);color:#fff}
footer{clear:both;padding:10px;color:#fff;background:rgba(60,120,160,0.9)}
#trasy{float:left;width:75%;height:600px;margin:2%;overflow:auto;font-size:120%;background:rgba(0,100,0,0.6);box-shadow:10px 10px 7px DimGray}
.boczny{float:left;width:15%;height:300px;margin:1%;background:rgba(0,100,0,0.6);box-shadow:10px 10px 7px DimGray}
h1{text-align:center;font-style:italic}h2{text-align:center;font-style:italic}
dt,a{color:white}dd{padding:1%}dd:hover{background:LightGreen}`;

export const motocykleFixtures: StudyProjectFixture[] = [
  { taskId: 'inf03-01-24-06-sg', variant: 'mysqli-associative-loop', manualAssets, files: [
    {path:'motor.php',content:procedural}, {path:'styl.css',content:proceduralCss},
    {path:'kwerendy.txt',content:"SELECT nazwa FROM wycieczki WHERE poczatek IN ('Muszyna','Wieliczka');\nSELECT w.nazwa,w.opis,w.poczatek,z.zrodlo FROM wycieczki w JOIN zdjecia z ON w.zdjecia_id=z.id;\nSELECT COUNT(*) AS liczba FROM wycieczki;\nALTER TABLE wycieczki ADD COLUMN ocena INT;"},
    {path:'przeglądarka.txt',content:'Mozilla Firefox'},
  ] },
  { taskId: 'inf03-01-24-06-sg', variant: 'pdo-foreach-distinct-selectors', manualAssets, files: [
    {path:'motor.php',content:objectOriented}, {path:'styl.css',content:objectCss},
    {path:'kwerendy.txt',content:"SELECT nazwa FROM wycieczki WHERE poczatek='Muszyna' OR poczatek='Wieliczka';\nSELECT wycieczki.nazwa,wycieczki.opis,wycieczki.poczatek,zdjecia.zrodlo FROM zdjecia INNER JOIN wycieczki ON zdjecia.id=wycieczki.zdjecia_id;\nSELECT COUNT(id) FROM wycieczki;\nALTER TABLE wycieczki ADD ocena INTEGER;"},
    {path:'przeglądarka.txt',content:'Mozilla Firefox'},
  ] },
];

export const motocykleHtmlMistakes = [
  { name:'wrong language', activityId:'html/document', content:procedural.replace('lang="pl"','lang="en"') },
  { name:'wrong title', activityId:'html/title', content:procedural.replace('<title>Motocykle</title>','<title>Dokument</title>') },
  { name:'wrong stylesheet', activityId:'html/stylesheet', content:procedural.replace('href="styl.css"','href="style.css"') },
  { name:'missing alternative text', activityId:'content/motor-image', content:procedural.replace('alt="motocykl"','alt=""') },
  { name:'incomplete ordered list', activityId:'content/buy-list', content:procedural.replace('<li>BMW R1200GS LC</li>','') },
  { name:'missing description list', activityId:'content/description-list', content:procedural.replace('<dl>','<div>').replace('</dl>','</div>') },
];
