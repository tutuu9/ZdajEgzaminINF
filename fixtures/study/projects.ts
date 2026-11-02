import type { ProjectFile } from '@zdaj/shared';

/** Private, independently authored code fixtures. Never export these from @zdaj/content. */
export interface StudyProjectFixture {
  taskId: string;
  variant: string;
  files: ProjectFile[];
  manualAssets: string[];
}
const file = (path: string, content: string): ProjectFile => ({ path, content });
const document = (title: string, style: string, body: string, script = '') => `<!DOCTYPE html>
<html lang="pl"><head><meta charset="UTF-8"><title>${title}</title>
<link rel="stylesheet" href="${style}">${script ? `<script src="${script}" defer></script>` : ''}</head>
<body>${body}</body></html>`;
const courseHeader = `<header><img src="baner.png" alt="kursy komputerowe"></header>
<nav><a href="index.html">Strona główna</a><a href="raty.html">Koszt rat</a><a href="https://moje-szkolenia.pl/">Nasz partner</a></nav>`;
const courseFooter = '<footer><p>Autor strony: 00000000000</p></footer>';
const courseHome = document('Kursy komputerowe', 'style.css', `${courseHeader}<main>
<h3>Kursy komputerowe - programowanie</h3><table>
<tr><th>Nazwa</th><th>Liczba godzin</th><th>Cena</th></tr>
<tr><td>Kurs React.js</td><td>220</td><td>5000</td></tr>
<tr><td>Kurs JavaScript</td><td>150</td><td>3000</td></tr></table>
<h3>Adres do korespondencji</h3><ul><li>Adres: Katowice, ul. Mariacka 5</li><li>Telefon: 32 888 88 88</li></ul>
<a href="mailto:kursy@komputerowe.pl">skontaktuj się</a></main>${courseFooter}`);
const courseRates = document('Kursy komputerowe', 'style.css', `${courseHeader}<main>
<h3>Oblicz miesięczną ratę</h3>
<input class="kontrolki" id="react" type="checkbox"><label for="react">Kurs React.js</label><br>
<input class="kontrolki" id="javascript" type="checkbox"><label for="javascript">Kurs JavaScript</label><br>
<label for="raty">Liczba rat:</label><input class="kontrolki" id="raty" type="number" min="1" step="1"><br>
<select class="kontrolki" id="miasto" aria-label="Miasto kursu"><option>Warszawa</option><option>Katowice</option><option>Gdańsk</option></select>
<button class="kontrolki" id="oblicz" type="button">Oblicz</button><p id="wynik"></p>
</main>${courseFooter}`, 'raty.js');
const courseCss = `*{font-family:Helvetica,sans-serif}body{background-color:#EAEAEA}
nav,footer{background-color:#625B5B;color:white;padding:20px;text-align:center}
img{width:100%}ul{margin-left:40px;list-style-type:circle}
nav a{font-weight:bold;background-color:#EAEAEA;color:#625B5B;padding:10px;margin:50px;border-radius:20px}
nav a:hover{background-color:#625B5B;color:#EAEAEA;border:1px solid #EAEAEA}
table{border:1px dashed #625B5B;width:60%;margin-left:40px;text-align:center}
.kontrolki{margin:5px}`;
const courseSql = `SELECT kolor, material FROM produkt WHERE wysokosc_buta > 10;
SELECT buty.nazwa, buty.cena, kategorie.nazwa_kat FROM buty JOIN kategorie ON buty.id_kat = kategorie.id_kat;
CREATE USER 'Marek'@'localhost' IDENTIFIED BY 'M@reK';
GRANT SELECT, UPDATE ON obuwie.produkt TO 'Marek'@'localhost';`;
const courseJs = `function obliczRate() {
  const liczba = document.getElementById('raty').valueAsNumber;
  const miasto = document.getElementById('miasto').value;
  if (!Number.isInteger(liczba) || liczba <= 0) {
    document.getElementById('wynik').textContent = 'Podaj dodatnią całkowitą liczbę rat.';
    return;
  }
  let kwota = 0;
  if (document.getElementById('react').checked) kwota += 5000;
  if (document.getElementById('javascript').checked) kwota += 3000;
  const rata = kwota / liczba;
  document.getElementById('wynik').textContent = 'Kurs odbędzie się w ' + miasto + '. Koszt całkowity: ' + kwota + ' zł. Płacisz ' + liczba + ' rat po ' + rata + ' zł';
}
document.getElementById('oblicz').addEventListener('click', obliczRate);`;
const courseAlternativeJs = `document.querySelector('#oblicz').onclick = function wyliczKoszt() {
  const liczbaRat = Number(document.querySelector('#raty').value);
  const wynik = document.querySelector('#wynik');
  if (!Number.isInteger(liczbaRat) || liczbaRat < 1) { wynik.textContent = 'Podaj poprawną liczbę rat.'; return; }
  const cena = [['react', 5000], ['javascript', 3000]].reduce((suma, [id, koszt]) => suma + (document.querySelector('#' + id).checked ? koszt : 0), 0);
  const rata = cena / liczbaRat;
  const miasto = document.querySelector('#miasto').value;
  wynik.replaceChildren(document.createTextNode('Kurs odbędzie się w ' + miasto + '. Koszt całkowity: ' + cena + ' zł. Płacisz ' + liczbaRat + ' rat po ' + rata + ' zł'));
};`;

const dragonCss = `*{text-align:center;font-family:Georgia,serif}
header,footer{background-color:Tomato;color:MistyRose;padding:10px}
nav{width:20%;float:left}main{width:80%;float:left;background-color:MistyRose;height:510px;overflow:auto}footer{clear:both}
nav button{display:block;width:100%;border:0;background-color:#FFAEA5;height:170px;font-size:200%}
#nav-baza{background-color:MistyRose}#opisy,#galeria{display:none}
table{margin:auto;width:60%;border:1px dashed Indigo}
select,#baza button{margin:20px}dt{font-weight:bold;font-style:italic}dt:hover{font-size:180%}`;
const dragonJs = `const widoki = ['baza', 'opisy', 'galeria'];
function pokaz(wybrany) {
  for (const id of widoki) {
    const aktywny = id === wybrany;
    document.getElementById(id).style.display = aktywny ? 'block' : 'none';
    document.getElementById('nav-' + id).style.backgroundColor = aktywny ? 'MistyRose' : '#FFAEA5';
  }
}
for (const id of widoki) document.getElementById('nav-' + id).addEventListener('click', () => pokaz(id));`;
const dragonAlternativeJs = `document.getElementById('nav-baza').onclick = function baza() {
  document.getElementById('baza').style.display='block';document.getElementById('opisy').style.display='none';document.getElementById('galeria').style.display='none';
  document.getElementById('nav-baza').style.backgroundColor='MistyRose';document.getElementById('nav-opisy').style.backgroundColor='#FFAEA5';document.getElementById('nav-galeria').style.backgroundColor='#FFAEA5';
};
document.getElementById('nav-opisy').onclick = function opisy() {
  document.getElementById('baza').style.display='none';document.getElementById('opisy').style.display='block';document.getElementById('galeria').style.display='none';
  document.getElementById('nav-baza').style.backgroundColor='#FFAEA5';document.getElementById('nav-opisy').style.backgroundColor='MistyRose';document.getElementById('nav-galeria').style.backgroundColor='#FFAEA5';
};
document.getElementById('nav-galeria').onclick = function galeria() {
  document.getElementById('baza').style.display='none';document.getElementById('opisy').style.display='none';document.getElementById('galeria').style.display='block';
  document.getElementById('nav-baza').style.backgroundColor='#FFAEA5';document.getElementById('nav-opisy').style.backgroundColor='#FFAEA5';document.getElementById('nav-galeria').style.backgroundColor='MistyRose';
};`;
const dragonSql = `SELECT nazwa, dlugosc, szerokosc FROM smok WHERE pochodzenie = 'Polska';
SELECT DISTINCT pochodzenie FROM smok ORDER BY pochodzenie ASC;
SELECT parada.rok, AVG(smok.dlugosc) AS 'Średnia długość' FROM parada JOIN udzial ON udzial.id_parada = parada.id JOIN smok ON udzial.id_smok = smok.id WHERE parada.rok > '2005' GROUP BY parada.rok;
ALTER TABLE parada ADD lokalizacja VARCHAR(100);`;
const dragonPhp = `<?php
$db = mysqli_connect('localhost', 'root', '', 'smoki');
mysqli_set_charset($db, 'utf8mb4');
?>${document('Smoki', 'styl.css', `<header><h2>Poznaj smoki!</h2></header>
<nav><button type="button" id="nav-baza">Baza</button><button type="button" id="nav-opisy">Opisy</button><button type="button" id="nav-galeria">Galeria</button></nav>
<main><section id="baza"><h3>Baza Smoków</h3><form action="smoki.php" method="post">
<select name="kraj" aria-label="Kraj pochodzenia"><?php
$kraje = mysqli_query($db, 'SELECT DISTINCT pochodzenie FROM smok ORDER BY pochodzenie ASC');
while ($kraj = mysqli_fetch_assoc($kraje)) echo '<option>' . htmlspecialchars($kraj['pochodzenie'], ENT_QUOTES, 'UTF-8') . '</option>';
?></select><button type="submit">Szukaj</button></form>
<table><tr><th>Nazwa</th><th>Długość</th><th>Szerokość</th></tr><?php
if (isset($_POST['kraj'])) {
  $zapytanie = mysqli_prepare($db, 'SELECT nazwa, dlugosc, szerokosc FROM smok WHERE pochodzenie = ?');
  $wybranyKraj = (string) $_POST['kraj'];
  mysqli_stmt_bind_param($zapytanie, 's', $wybranyKraj);
  mysqli_stmt_execute($zapytanie);
  $smoki = mysqli_stmt_get_result($zapytanie);
  while ($smok = mysqli_fetch_assoc($smoki)) {
    echo '<tr>';
    foreach (['nazwa','dlugosc','szerokosc'] as $kolumna) echo '<td>' . htmlspecialchars((string) $smok[$kolumna], ENT_QUOTES, 'UTF-8') . '</td>';
    echo '</tr>';
  }
  mysqli_stmt_close($zapytanie);
}
?></table></section>
<section id="opisy"><h3>Opisy smoków</h3><dl><dt>Własny termin testowy</dt><dd>Tekst fixture; rzeczywiste opis.txt sprawdza się ręcznie.</dd></dl></section>
<section id="galeria"><h3>Galeria</h3><img src="smok1.jpg" alt="Smok czerwony"><img src="smok2.jpg" alt="Smok wielki"><img src="smok3.jpg" alt="Skrzydlaty łaciaty"></section></main>
<footer><p>Stronę opracował: 00000000000</p></footer><?php mysqli_close($db); ?>`, 'widoki.js')}`;

const fishSql = `SELECT id, nazwa, wystepowanie FROM ryby WHERE styl_zycia = 1;
SELECT Ryby_id, wymiar_ochronny FROM okres_ochronny WHERE wymiar_ochronny < 30;
SELECT ryby.nazwa, lowisko.akwen, lowisko.wojewodztwo FROM ryby JOIN lowisko ON lowisko.Ryby_id = ryby.id WHERE lowisko.rodzaj = 3;
ALTER TABLE ryby ADD dobowy_limit TINYINT UNSIGNED;`;
const fishCss = `*{font-family:Helvetica,sans-serif}
header,footer{background-color:#00838F;color:white;padding:5px;font-size:130%;text-align:center}
main{display:flow-root}#rzeki,#drapiezniki{background-color:#EFEFEF;width:55%;float:left}#rzeki{height:150px}#drapiezniki{height:300px}
#prawy{background-color:#4FB3BF;width:45%;height:450px;text-align:center;float:right}
img{box-shadow:10px 10px 7px DimGray;margin:20px}
table,td,th{border:1px solid #4FB3BF;border-collapse:collapse}table{margin:auto;width:80%}td,th{padding:4px}tr:hover{background-color:#4FB3BF}`;
const fishPhp = `<?php $db=mysqli_connect('localhost','root','','wedkowanie'); mysqli_set_charset($db,'utf8mb4'); ?>${document('Wędkowanie', 'styl_1.css', `<header><h1>Portal dla wędkarzy</h1></header><main>
<section id="rzeki"><h3>Ryby zamieszkujące rzeki</h3><ol><?php
$rzeki=mysqli_query($db,'SELECT ryby.nazwa, lowisko.akwen, lowisko.wojewodztwo FROM ryby JOIN lowisko ON lowisko.Ryby_id=ryby.id WHERE lowisko.rodzaj=3');
while($ryba=mysqli_fetch_assoc($rzeki)) {
  $nazwa=htmlspecialchars($ryba['nazwa'],ENT_QUOTES,'UTF-8');
  $akwen=htmlspecialchars($ryba['akwen'],ENT_QUOTES,'UTF-8');
  $wojewodztwo=htmlspecialchars($ryba['wojewodztwo'],ENT_QUOTES,'UTF-8');
  echo '<li>'.$nazwa.' pływa w rzece '.$akwen.', '.$wojewodztwo.'</li>';
}
?></ol></section>
<aside id="prawy"><img src="ryba1.jpg" alt="Sum"><br><a href="kwerendy.txt">Pobierz kwerendy</a></aside>
<section id="drapiezniki"><h3>Ryby drapieżne naszych wód</h3><table><tr><th>L.p.</th><th>Gatunek</th><th>Występowanie</th></tr><?php
$drapiezniki=mysqli_query($db,'SELECT id, nazwa, wystepowanie FROM ryby WHERE styl_zycia=1');
while($ryba=mysqli_fetch_assoc($drapiezniki)) {
  echo '<tr>';
  foreach(['id','nazwa','wystepowanie'] as $kolumna) echo '<td>'.htmlspecialchars((string)$ryba[$kolumna],ENT_QUOTES,'UTF-8').'</td>';
  echo '</tr>';
}
?></table></section></main><footer><p>Stronę wykonał: 00000000000</p></footer><?php mysqli_close($db); ?>`)}`;
const fishAlternativePhp = fishPhp
  .replace("$db=mysqli_connect('localhost','root','','wedkowanie'); mysqli_set_charset($db,'utf8mb4');", "$db=new PDO('mysql:host=localhost;dbname=wedkowanie;charset=utf8mb4','root','');")
  .replaceAll('mysqli_query($db,', '$db->query(')
  .replace('mysqli_fetch_assoc($rzeki)', '$rzeki->fetch(PDO::FETCH_ASSOC)')
  .replace('mysqli_fetch_assoc($drapiezniki)', '$drapiezniki->fetch(PDO::FETCH_ASSOC)')
  .replace('mysqli_close($db);', '$db = null;');

export const validStudyProjects: StudyProjectFixture[] = [
  { taskId: 'inf03-01-25-01-sg', variant: 'procedural', files: [file('index.html',courseHome),file('raty.html',courseRates),file('style.css',courseCss),file('raty.js',courseJs),file('kwerendy.txt',courseSql),file('przeglądarka.txt','Firefox')], manualAssets: ['baner.png','import.jpg','kw1.png','kw2.png','kw3.png','kw4.png'] },
  { taskId: 'inf03-01-25-01-sg', variant: 'reduce-and-dom', files: [file('index.html',courseHome),file('raty.html',courseRates),file('style.css',courseCss),file('raty.js',courseAlternativeJs),file('kwerendy.txt',courseSql.replace('buty JOIN kategorie ON buty.id_kat = kategorie.id_kat','buty INNER JOIN kategorie USING (id_kat)')),file('przeglądarka.txt','Firefox')], manualAssets: ['baner.png','import.jpg','kw1.png','kw2.png','kw3.png','kw4.png'] },
  { taskId: 'inf03-08-25-06-sg', variant: 'loop', files: [file('smoki.php',dragonPhp),file('styl.css',dragonCss),file('widoki.js',dragonJs),file('kwerendy.txt',dragonSql),file('przeglądarka.txt','Firefox')], manualAssets: ['opis.txt content','smok1.jpg','smok2.jpg','smok3.jpg','import.jpg','kw1.png','kw2.png','kw3.png','kw4.png'] },
  { taskId: 'inf03-08-25-06-sg', variant: 'three-functions', files: [file('smoki.php',dragonPhp),file('styl.css',dragonCss),file('widoki.js',dragonAlternativeJs),file('kwerendy.txt',dragonSql),file('przeglądarka.txt','Firefox')], manualAssets: ['opis.txt content','smok1.jpg','smok2.jpg','smok3.jpg','import.jpg','kw1.png','kw2.png','kw3.png','kw4.png'] },
  { taskId: 'cke-wedkowanie', variant: 'mysqli-float', files: [file('wedkuj.php',fishPhp),file('styl_1.css',fishCss),file('kwerendy.txt',fishSql),file('przeglądarka.txt','Firefox')], manualAssets: ['ryba1.jpg','import.png','kw1.jpg','kw2.jpg','kw3.jpg','kw4.jpg'] },
  { taskId: 'cke-wedkowanie', variant: 'pdo-grid', files: [file('wedkuj.php',fishAlternativePhp),file('styl_1.css',fishCss + '\nmain{display:grid;grid-template-columns:55% 45%;grid-template-rows:150px 300px}#rzeki,#drapiezniki{width:auto;float:none;grid-column:1}#rzeki{grid-row:1}#drapiezniki{grid-row:2}#prawy{width:auto;float:none;grid-column:2;grid-row:1 / span 2}'),file('kwerendy.txt',fishSql),file('przeglądarka.txt','Firefox')], manualAssets: ['ryba1.jpg','import.png','kw1.jpg','kw2.jpg','kw3.jpg','kw4.jpg'] },
];

function changed(fixture: StudyProjectFixture, variant: string, path: string, before: string, after: string): StudyProjectFixture {
  return { ...fixture, variant, files: fixture.files.map((entry) => entry.path === path ? {...entry, content:entry.content.replace(before,after)} : {...entry}) };
}

export const invalidStudyProjects = [
  { fixture: changed(validStudyProjects[0]!, 'wrong-price', 'raty.js', 'kwota += 5000', 'kwota += 500'), activityId: 'calculator/calculator-check', expected: 'runtime' },
  { fixture: changed(validStudyProjects[0]!, 'missing-city', 'raty.js', "const miasto = document.getElementById('miasto').value", "const miasto = 'Warszawa'"), activityId: 'calculator/calculator-check', expected: 'runtime' },
  { fixture: changed(validStudyProjects[0]!, 'wrong-language', 'index.html', 'lang="pl"', 'lang="en"'), activityId: 'structure/document', expected: 'html' },
  { fixture: changed(validStudyProjects[0]!, 'wrong-table-border', 'style.css', '1px dashed #625B5B', '1px solid #625B5B'), activityId: 'selectors/table', expected: 'css' },
  { fixture: changed(validStudyProjects[2]!, 'two-visible-panels', 'widoki.js', "aktywny ? 'block' : 'none'", "'block'"), activityId: 'tabs/tabs-check', expected: 'runtime' },
  { fixture: changed(validStudyProjects[2]!, 'no-active-colors', 'widoki.js', "aktywny ? 'MistyRose' : '#FFAEA5'", "'#FFAEA5'"), activityId: 'tabs/tabs-check', expected: 'runtime' },
  { fixture: changed(validStudyProjects[4]!, 'wrong-image-alt', 'wedkuj.php', 'alt="Sum"', 'alt="Obraz"'), activityId: 'html/image', expected: 'html' },
  { fixture: changed(validStudyProjects[4]!, 'wrong-cell-padding', 'styl_1.css', 'padding:4px', 'padding:40px'), activityId: 'css/cells', expected: 'css' },
];
