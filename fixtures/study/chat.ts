import type { StudyProjectFixture } from './projects.js';

/** Exact nine input phrases from verified pliki2/tekstyDoChatu.txt; private test data. */
export const chatReplies = [
  'Świetnie!',
  'Kto gra główną rolę?',
  'Lubisz filmy Tego reżysera?',
  'Będę 10 minut wcześniej',
  'Może kupimy sobie popcorn?',
  'Ja wolę Colę',
  'Zaproszę jeszcze Grześka',
  'Tydzień temu też byłem w kinie na Diunie',
  'Ja funduję bilety',
];

const sidebar = `<h3>Chaty</h3><ul><li>Ogólny</li><li>Tematyczne<ol><li>Turystyczny</li><li>Żeglarski</li><li>Filatelistyczny</li><li>Hodowla zwierzątek domowych</li></ol></li></ul>
<h3>Uczestnicy</h3><p>Jolanta Nowak</p><img src="Jolka.jpg" alt="Jolanta Nowak"><p>Krzysztof Łukasiński</p><img src="Krzysiek.jpg" alt="Krzysztof Łukasiński">`;
const page = (
  alternative: boolean,
) => `<!doctype html><html lang="pl"><head><meta charset="UTF-8"><title>Chat</title>
<link rel="stylesheet" href="${alternative ? './styl.css' : 'styl.css'}"><script src="chat.js" defer></script></head><body>
<header><h2>Chat</h2></header><main>${
  alternative
    ? '<section class="history"><article class="entry local"><img src="Jolka.jpg" alt="Jolanta Nowak"><p>Cześć idziesz jutro do kina?</p></article><article class="entry remote"><img src="Krzysiek.jpg" alt="Krzysztof Łukasiński"><p>Tak! A ty?</p></article></section><label>Wpisz wiadomość:<input type="text" name="message"></label>'
    : '<div id="timeline"><div class="message jolanta"><img src="Jolka.jpg" alt="Jolanta Nowak"><p>Cześć idziesz jutro do kina?</p></div><div class="message krzysztof"><img src="Krzysiek.jpg" alt="Krzysztof Łukasiński"><p>Tak! A ty?</p></div></div><label for="message-text">Wpisz wiadomość:</label><input id="message-text" type="text">'
}
<button type="button">Wyślij</button><br><button type="button">Generuj losową odpowiedź</button></main>
<aside>${sidebar}</aside><footer><h5>Chat wykonał: 00000000000</h5></footer></body></html>`;

const commonCss = `*{font-family:Garamond,serif}header{background:Tomato;color:white;text-align:center;height:80px}
main{height:600px}aside{background:Coral;height:680px}footer{background:Tomato;color:white;text-align:center}
img{border-radius:50%;padding-left:10px;padding-right:10px}
button{background:Tomato;border:1px solid DarkRed;padding:5px;font-weight:bold}input[type=text]{width:500px}`;
const directCss = `header,main{width:80%;float:left}aside{width:20%;float:right;margin-top:-80px}footer{clear:both}
#timeline{border:1px solid Tomato;margin:15px;height:470px;overflow:scroll}
.message{border-radius:5px;width:90%;height:70px;margin:2%;padding:3px}
.jolanta{background:#EEE}.jolanta img{float:left}.krzysztof{background:#CCC;text-align:right}.krzysztof img{float:right}`;
const alternativeCss = `body{display:grid;grid-template-columns:80% 20%;grid-template-rows:80px 600px auto}
header{grid-column:1;grid-row:1}main{grid-column:1;grid-row:2}aside{grid-column:2;grid-row:1/3}footer{grid-column:1/3;grid-row:3}
.history{border:1px solid Tomato;margin:15px;height:470px;overflow:scroll}
.entry{border-radius:5px;width:90%;height:70px;margin:2%;padding:3px}
.local{background:#EEE}.local img{float:left}.remote{background:#CCC;text-align:right}.remote img{float:right}`;
const directScript = `const answers = ${JSON.stringify(chatReplies)};
const conversation = document.getElementById('timeline');
function appendMessage(text, author) {
  const message = document.createElement('div');
  message.classList.add('message', author);
  const avatar = document.createElement('img');
  avatar.src = author === 'jolanta' ? 'Jolka.jpg' : 'Krzysiek.jpg';
  avatar.alt = author === 'jolanta' ? 'Jolanta Nowak' : 'Krzysztof Łukasiński';
  const paragraph = document.createElement('p');
  paragraph.textContent = text;
  message.append(avatar, paragraph);
  conversation.appendChild(message);
  conversation.scrollTop = conversation.scrollHeight;
}
function sendMessage() { appendMessage(document.getElementById('message-text').value, 'jolanta'); }
function randomAnswer() { const index = Math.floor(Math.random() * answers.length); appendMessage(answers[index], 'krzysztof'); }
const controls = document.querySelectorAll('button');
controls[0].addEventListener('click', sendMessage);
controls[1].addEventListener('click', randomAnswer);`;
const alternativeScript = `const replies = ${JSON.stringify(chatReplies)};
const history = document.querySelector('.history');
const localTemplate = history.querySelector('.local').cloneNode(true);
const remoteTemplate = history.querySelector('.remote').cloneNode(true);
function addReply(template, content) {
  const entry = template.cloneNode(true);
  entry.querySelector('p').textContent = content;
  history.append(entry);
  entry.scrollIntoView({block:'nearest', inline:'nearest'});
}
const buttons = document.querySelectorAll('main button');
buttons[0].onclick = function sendCurrentText() { addReply(localTemplate, document.querySelector('input[name="message"]').value); };
buttons[1].onclick = function chooseReply() { const chosenIndex = Math.floor(9 * Math.random()); addReply(remoteTemplate, replies[chosenIndex]); };`;

export const chatFixtures: StudyProjectFixture[] = [false, true].map((alternative) => ({
  taskId: 'inf03-02-24-06-sg',
  variant: alternative ? 'grid-cloned-articles-scroll-into-view' : 'float-created-nodes-scroll-top',
  files: [
    { path: 'chat.html', content: page(alternative) },
    { path: 'styl.css', content: commonCss + (alternative ? alternativeCss : directCss) },
    { path: 'chat.js', content: alternative ? alternativeScript : directScript },
    {
      path: 'kwerendy.txt',
      content: alternative
        ? "INSERT INTO logowanie (id,nick,haslo) SELECT logowanie_id,'Jeremi','Jer123' FROM uczestnicy WHERE imie='Jeremi' AND nazwisko='Kowalski';\nSELECT FLOOR(AVG(rokUr)) AS `Średni rok urodzenia` FROM uczestnicy;\nSELECT uczestnicy.imie,uczestnicy.nazwisko,logowanie.nick,logowanie.haslo FROM uczestnicy INNER JOIN logowanie ON logowanie.id=uczestnicy.logowanie_id WHERE uczestnicy.imie LIKE 'J%';\nCREATE USER 'uczestnik'@'localhost' IDENTIFIED BY 'Ucz123&';\nGRANT UPDATE,SELECT ON chat.uczestnicy TO 'uczestnik'@'localhost';"
        : "INSERT INTO logowanie (id,nick,haslo) VALUES (3,'Jeremi','Jer123');\nSELECT FLOOR(AVG(rokUr)) AS `Średni rok urodzenia` FROM uczestnicy;\nSELECT imie,nazwisko,nick,haslo FROM uczestnicy JOIN logowanie ON uczestnicy.logowanie_id=logowanie.id WHERE imie LIKE 'J%';\nCREATE USER 'uczestnik'@'localhost' IDENTIFIED BY 'Ucz123&';\nGRANT SELECT,UPDATE ON chat.uczestnicy TO 'uczestnik'@'localhost';",
    },
    {
      path: 'przeglądarka.txt',
      content: 'Chromium (automated code fixture; visual assets remain manual)',
    },
  ],
  manualAssets: [
    'import.png',
    'Jolka.jpg',
    'Krzysiek.jpg',
    'kw1.jpg',
    'kw2.jpg',
    'kw3.jpg',
    'kw4.jpg',
    'kw5.jpg',
  ],
}));

export const chatHtmlMistakes = [
  {
    activityId: 'structure/footer',
    path: 'chat.html',
    source: '<footer><h5>Chat wykonał: 00000000000</h5></footer>',
    replacement: '<div><h5>Chat wykonał: 00000000000</h5></div>',
  },
  {
    activityId: 'sidebar/nested-list',
    path: 'chat.html',
    source:
      '<ol><li>Turystyczny</li><li>Żeglarski</li><li>Filatelistyczny</li><li>Hodowla zwierzątek domowych</li></ol>',
    replacement: '',
  },
  {
    activityId: 'conversation/input',
    path: 'chat.html',
    source: 'id="message-text" type="text"',
    replacement: 'id="message-text" type="number"',
  },
];
