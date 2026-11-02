import type { StudyProjectFixture } from './projects.js';

const page = (body: string, alternative: boolean, script = false) => `<!doctype html>
<html lang="pl"><head><meta charset="UTF-8"><title>Firma IT</title>
<link rel="stylesheet" href="${alternative ? './styl.css' : 'styl.css'}"><link rel="icon" href="logo.png">
${script ? '<script src="kontakt.js" defer></script>' : ''}</head><body>
<section class="${alternative ? 'witryna' : 'container'}">
<header><section class="logo"><img src="logo.png" alt="firma it"></section>
<nav><a href="index.html">Strona Główna</a><a href="uslugi.html">Usługi</a><a href="kontakt.html">Kontakt</a></nav></header>
<section class="banner"><img src="animacja.gif" alt="Usługi informatyczne"></section>
<main>${body}</main><footer>Autor strony: <strong>00000000000</strong></footer></section></body></html>`;

const form = (alternative: boolean) => {
  const names = alternative
    ? ['first', 'family', 'address', 'issue', 'agreement']
    : ['imie', 'nazwisko', 'email', 'zgloszenie', 'zgoda'];
  return `<h2>Kontakt</h2><form><table>
<tr><td><label for="${names[0]}">Imię:</label></td><td><input id="${names[0]}" name="${names[0]}" type="text"></td></tr>
<tr><td><label for="${names[1]}">Nazwisko:</label></td><td><input id="${names[1]}" name="${names[1]}" type="text"></td></tr>
<tr><td><label for="${names[2]}">E-mail:</label></td><td><input id="${names[2]}" name="${names[2]}" type="email"></td></tr>
<tr><td><label for="${names[3]}">Zgłoszenie</label></td><td><textarea id="${names[3]}" name="${names[3]}" rows="10" cols="40"></textarea></td></tr>
<tr><td></td><td><label><input id="${names[4]}" name="${names[4]}" type="checkbox">Zapoznałam/em się z regulaminem</label></td></tr>
<tr><td></td><td><button type="reset">Resetuj</button><button type="button">Prześlij</button></td></tr>
</table></form><hr><p class="result"></p>`;
};
const commonStyle = `body{background:#EEEEEE;font-family:Helvetica,sans-serif}
.container,.witryna{width:90%;margin:auto}.logo,nav{background:LightBlue;height:100px;width:50%;padding:10px 0}
.banner{background:#DDDDDD;height:200px}main{color:Navy;margin:50px;height:400px}
footer{text-align:right;background:LightBlue;padding:10px}button{background:LightBlue;color:Navy}
nav a{color:Navy;font-size:150%;font-weight:bold;text-decoration:none;margin:10px;padding:5px}
nav a:hover{border:1px solid Navy}`;
const directScript = `const showRequest = () => {
  const firstName = document.getElementById('imie').value;
  const lastName = document.getElementById('nazwisko').value;
  const email = document.getElementById('email').value;
  const request = document.getElementById('zgloszenie').value;
  const consent = document.getElementById('zgoda').checked;
  const result = document.querySelector('.result');
  result.dataset.email = email;
  if (!consent) { result.textContent = 'Musisz zapoznać się z regulaminem'; result.style.color = 'red'; return; }
  result.style.color = 'Navy';
  result.replaceChildren(document.createTextNode(firstName.toUpperCase() + ' ' + lastName.toUpperCase()), document.createElement('br'), document.createTextNode('Treść Twojej sprawy: ' + request));
};
document.querySelector('button[type="button"]').addEventListener('click', showRequest);`;
const alternativeScript = `const contactForm = document.forms[0];
function renderContact() {
  const fields = contactForm.elements;
  const result = document.querySelector('main > p');
  const emailAddress = fields.namedItem('address').value;
  result.dataset.email = emailAddress;
  result.style.whiteSpace = 'pre-line';
  if (fields.namedItem('agreement').checked) {
    const fullName = [fields.namedItem('first').value, fields.namedItem('family').value].join(' ').toUpperCase();
    result.textContent = fullName + String.fromCharCode(10) + 'Treść Twojej sprawy: ' + fields.namedItem('issue').value;
    result.style.color = '#000080';
  } else { result.textContent = 'Musisz zapoznać się z regulaminem'; result.style.color = '#f00'; }
}
contactForm.querySelector('button:last-child').onclick = renderContact;`;

export const firmaFixtures: StudyProjectFixture[] = [false, true].map((alternative) => ({
  taskId: 'inf03-01-24-01-sg',
  variant: alternative ? 'float-named-fields-text-content' : 'flex-dom-nodes',
  files: [
    {
      path: 'index.html',
      content: page(
        '<h2>Firma IT</h2><p>Jesteśmy firmą z wieloletnim doświadczeniem w zakresie IT.</p><hr>',
        alternative,
      ),
    },
    {
      path: 'uslugi.html',
      content: page(
        '<h2>Oferta</h2><ol><li>Outsourcing IT</li><li>Konfiguracja komputerów</li><li>Sprzęt komputerowy</li><li>Strony internetowe</li></ol><hr>',
        alternative,
      ),
    },
    { path: 'kontakt.html', content: page(form(alternative), alternative, true) },
    {
      path: 'styl.css',
      content:
        commonStyle +
        (alternative ? '\n.logo,nav{float:left}.banner{clear:both}' : '\nheader{display:flex}'),
    },
    { path: 'kontakt.js', content: alternative ? alternativeScript : directScript },
    { path: 'przeglądarka.txt', content: 'Chromium (automated fixture; not a learner screenshot)' },
  ],
  manualAssets: ['logo.png', 'baner1.png', 'baner2.png', 'animacja.gif', 'klatki.jpg'],
}));

export const firmaHtmlMistakes = [
  {
    activityId: 'contact/message',
    path: 'kontakt.html',
    source: 'rows="10"',
    replacement: 'rows="2"',
  },
  {
    activityId: 'common/signature',
    path: 'index.html',
    source: '<strong>00000000000</strong>',
    replacement: '<b>00000000000</b>',
  },
  {
    activityId: 'contact/email',
    path: 'kontakt.html',
    source: 'type="email"',
    replacement: 'type="text"',
  },
];
