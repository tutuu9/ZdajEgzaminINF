// Fixed educational scenarios. They inspect behaviour, never compare solution source text.
const normalized = (value) => value.replace(/\s+/g, ' ').trim();

async function field(page, name, selector, index = 0) {
  const labelled = page.getByLabel(name);
  if ((await labelled.count()) === 1) return labelled;
  const row = page.locator('tr').filter({ hasText: name }).locator(selector);
  if ((await row.count()) === 1) return row;
  return page.locator(selector).nth(index);
}

async function resultBelow(element, anchor) {
  return element.evaluate((paragraph, selector) => {
    const preceding = [...document.querySelectorAll(selector)].filter(
      (node) => node.compareDocumentPosition(paragraph) & Node.DOCUMENT_POSITION_FOLLOWING,
    );
    for (
      let parent = paragraph.parentElement;
      parent && parent !== document.body;
      parent = parent.parentElement
    ) {
      if (
        ['MAIN', 'SECTION', 'ARTICLE', 'DIV', 'FORM'].includes(parent.tagName) &&
        preceding.some((node) => parent.contains(node))
      )
        return true;
    }
    return false;
  }, anchor);
}

export async function checkFirmaContact(page) {
  const first = await field(page, /^Imię\s*:?\s*$/i, 'input:not([type]), input[type="text"]', 0);
  const last = await field(page, /^Nazwisko\s*:?\s*$/i, 'input:not([type]), input[type="text"]', 1);
  const email = page.locator('input[type="email"]').first();
  const message = page.locator('textarea').first();
  const agreement = page.locator('input[type="checkbox"]').first();
  const submit = page.getByRole('button', { name: /^Prześlij$/i }).first();
  for (const [given, surname, text] of [
    ['Łucja', 'Żółkowska', 'Proszę o przygotowanie strony szkoły.'],
    ['Paweł', 'Ćwik', 'Druga wiadomość — konfiguracja komputera.'],
  ]) {
    await first.fill(given);
    await last.fill(surname);
    await email.fill('uczen@example.invalid');
    await message.fill(text);
    await agreement.uncheck();
    await submit.click();
    const warning = page
      .locator('p')
      .filter({ hasText: /^\s*Musisz zapoznać się z regulaminem\s*$/ })
      .last();
    if (!(await warning.count()) || !(await warning.isVisible()))
      return [
        false,
        'Bez zaznaczenia regulaminu oczekiwano widocznego akapitu „Musisz zapoznać się z regulaminem”.',
      ];
    if (
      (await warning.evaluate((node) => getComputedStyle(node).color)).replace(/\s/g, '') !==
      'rgb(255,0,0)'
    )
      return [false, 'Komunikat bez zgody jest obecny, ale powinien mieć czerwony kolor.'];
    if (!(await resultBelow(warning, 'hr')))
      return [false, 'Umieść akapit z komunikatem w bloku głównym pod linią poziomą.'];
    await agreement.check();
    await submit.click();
    const result = page.locator('p').filter({ hasText: 'Treść Twojej sprawy:' }).last();
    if (!(await result.count()) || !(await result.isVisible()))
      return [
        false,
        'Po zgodzie oczekiwano widocznego akapitu z imieniem, nazwiskiem i treścią zgłoszenia.',
      ];
    const actual = (await result.innerText()).trim();
    const name = `${given.toLocaleUpperCase('pl')} ${surname.toLocaleUpperCase('pl')}`;
    if (
      normalized(actual) !== `${name} Treść Twojej sprawy: ${text}` ||
      !actual.startsWith(name) ||
      !/^\s*\n/.test(actual.slice(name.length))
    )
      return [
        false,
        `Oczekiwano ${name}, następnie łamania linii oraz „Treść Twojej sprawy: ${text}”. Odczytuj aktualne kontrolki przy każdym kliknięciu.`,
      ];
    if (
      (await result.evaluate((node) => getComputedStyle(node).color)).replace(/\s/g, '') !==
      'rgb(0,0,128)'
    )
      return [false, 'Po zaznaczeniu regulaminu akapit z wynikiem powinien mieć kolor Navy.'];
    if (!(await resultBelow(result, 'hr')))
      return [false, 'Wynik powinien pozostać w bloku głównym, pod linią poziomą.'];
  }
  await page
    .getByRole('button', { name: /^Resetuj$/i })
    .first()
    .click();
  if (
    (await first.inputValue()) ||
    (await last.inputValue()) ||
    (await email.inputValue()) ||
    (await message.inputValue()) ||
    (await agreement.isChecked())
  )
    return [
      false,
      'Resetuj powinien wyczyścić pola tekstowe, e-mail, zgłoszenie i zaznaczenie regulaminu.',
    ];
  return [
    true,
    'Dwa zestawy danych z polskimi znakami: obie gałęzie zgody, aktualizacja wyniku, wielkie litery, łamanie linii, kolory, położenie akapitu i Resetuj działają poprawnie.',
  ];
}

export async function checkSalonCalculator(page) {
  const names = ['Peeling', 'Maska', 'Masaż twarzy', 'Makijaż'];
  const prices = [45, 30, 20, 50];
  const controls = [];
  for (let index = 0; index < names.length; index++) {
    const labelled = page.getByRole('checkbox', {
      name: new RegExp(`^${names[index]}(?:\\s|$)`, 'i'),
    });
    controls.push(
      (await labelled.count()) === 1 ? labelled : page.locator('input[type="checkbox"]').nth(index),
    );
  }
  const button = page.getByRole('button', { name: /^Oblicz cenę$/i }).first();
  for (const mask of [...Array.from({ length: 16 }, (_, index) => index), 0, 15, 0, 10]) {
    let expected = 0;
    for (let index = 0; index < controls.length; index++) {
      const selected = Boolean(mask & (1 << index));
      await controls[index].setChecked(selected);
      if (selected) expected += prices[index];
    }
    await button.click();
    const result = page
      .locator('p')
      .filter({ hasText: /^\s*Cena zabiegów:/ })
      .last();
    if (!(await result.count()) || !(await result.isVisible()))
      return [
        false,
        'Po kliknięciu oczekiwano widocznego akapitu „Cena zabiegów: …” pod przyciskiem.',
      ];
    const text = normalized(await result.innerText());
    const number = text.match(/^Cena zabiegów:\s*(\d+(?:[.,]\d+)?)(?:\s*(?:zł|PLN))?\.?$/iu);
    if (!number || Number(number[1].replace(',', '.')) !== expected) {
      const chosen = names.filter((_, index) => mask & (1 << index)).join(', ') || 'brak usług';
      return [
        false,
        `Dla wyboru ${chosen} oczekiwano ${expected}. Otrzymano: ${text.slice(0, 160)}. Przy każdym kliknięciu zacznij sumę od zera.`,
      ];
    }
    const afterButton = await result.evaluate((paragraph) =>
      [...document.querySelectorAll('button,input[type="button"],input[type="submit"]')].some(
        (node) =>
          /^Oblicz cenę$/i.test((node.textContent || node.getAttribute('value') || '').trim()) &&
          Boolean(node.compareDocumentPosition(paragraph) & Node.DOCUMENT_POSITION_FOLLOWING),
      ),
    );
    if (!afterButton)
      return [
        false,
        'Cena jest poprawna, ale akapit z wynikiem powinien znajdować się pod przyciskiem.',
      ];
  }
  return [
    true,
    'Sprawdzono wszystkie 16 zestawów usług (45/30/20/50), w tym 0 i 145, oraz ponowne odznaczanie i obliczanie bez sumowania poprzednich wyników.',
  ];
}

// Exact phrases from the verified CKE input tekstyDoChatu.txt, INF.03-02-24.06-SG.
const chatReplies = [
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

export function installChatRandomControl() {
  // Installed before page scripts; caching Math.random still keeps the controlled function.
  const state = { value: 0, calls: 0 };
  Object.defineProperty(window, '__zdajStudyRandom', { value: state });
  Math.random = () => {
    state.calls++;
    return state.value;
  };
}

async function chatSelector(page) {
  return page.evaluate(() => {
    const paragraphs = [...document.querySelectorAll('p')];
    const normalize = (value) => value.replace(/\s+/g, ' ').trim();
    const first = paragraphs.find(
      (node) => normalize(node.textContent) === 'Cześć idziesz jutro do kina?',
    );
    const second = paragraphs.find((node) => normalize(node.textContent) === 'Tak! A ty?');
    if (!first || !second) return null;
    let common = first.parentElement;
    while (common && !common.contains(second)) common = common.parentElement;
    if (!common || common === document.body) return null;
    const parts = [];
    for (
      let current = common;
      current && current !== document.body;
      current = current.parentElement
    ) {
      parts.unshift(
        `${current.tagName.toLowerCase()}:nth-child(${[...current.parentElement.children].indexOf(current) + 1})`,
      );
    }
    return `body > ${parts.join(' > ')}`;
  });
}

async function inspectMessage(chat, expectedText, author, previous) {
  await chat.evaluate(async (container) => {
    for (
      let attempt = 0;
      attempt < 20 && container.scrollHeight - container.clientHeight - container.scrollTop > 3;
      attempt++
    ) {
      await new Promise((resolve) => setTimeout(resolve, 25));
    }
  });
  const state = await chat.evaluate(
    (container, expected) => {
      const messages = [...container.querySelectorAll('p')];
      const paragraph = messages.at(-1);
      const texts = messages.map((node) => node.innerText.trim());
      if (!paragraph) return { texts, block: false };
      let block = paragraph.parentElement;
      while (block && block !== container && !block.querySelector('img'))
        block = block.parentElement;
      if (!block || block === container) return { texts, block: false };
      const image = [...block.querySelectorAll('img')].find((node) => {
        try {
          return (
            decodeURIComponent(new URL(node.src).pathname).split('/').at(-1) === expected.image
          );
        } catch {
          return false;
        }
      });
      const style = getComputedStyle(block);
      const bounds = block.getBoundingClientRect();
      const viewport = container.getBoundingClientRect();
      const visibleTop = viewport.top + container.clientTop;
      return {
        texts,
        block: true,
        image: Boolean(image),
        background: style.backgroundColor.replace(/\s/g, ''),
        align: style.textAlign,
        float: image ? getComputedStyle(image).float : '',
        overflow: container.scrollHeight > container.clientHeight + 2,
        atBottom: container.scrollHeight - container.clientHeight - container.scrollTop <= 3,
        messageVisible:
          bounds.top >= visibleTop - 3 && bounds.bottom <= visibleTop + container.clientHeight + 3,
      };
    },
    { image: author === 'jolanta' ? 'Jolka.jpg' : 'Krzysiek.jpg' },
  );
  if (
    state.texts.length !== previous.length + 1 ||
    previous.some((text, index) => state.texts[index] !== text)
  )
    return 'Nowa wypowiedź powinna być dopisana na końcu. Zachowaj wszystkie wcześniejsze wiadomości.';
  if (state.texts.at(-1) !== expectedText)
    return 'Treść ostatniej wiadomości nie odpowiada wpisanemu tekstowi lub wylosowanej odpowiedzi.';
  if (!state.block || !state.image)
    return `Nowa wypowiedź wymaga osobnego bloku, paragrafu i obrazu ${author === 'jolanta' ? 'Jolka.jpg' : 'Krzysiek.jpg'}.`;
  if (
    state.background !== (author === 'jolanta' ? 'rgb(238,238,238)' : 'rgb(204,204,204)') ||
    state.float !== (author === 'jolanta' ? 'left' : 'right') ||
    (author === 'krzysztof' && state.align !== 'right')
  )
    return `Nowa wypowiedź powinna zachować tło, stronę obrazu i wyrównanie właściwe dla ${author === 'jolanta' ? 'Jolanty' : 'Krzysztofa'}. Sprawdź CSS dodawanego bloku.`;
  if (state.overflow && !state.atBottom && !state.messageVisible)
    return 'Po dopisaniu wiadomości przewiń wypełniony blok chatu do nowej wypowiedzi.';
  return null;
}

export async function checkChatMessages(page) {
  const selector = await chatSelector(page);
  if (!selector)
    return [
      false,
      'Oczekiwano wspólnego bloku chatu z początkowymi wypowiedziami „Cześć idziesz jutro do kina?” i „Tak! A ty?”.',
    ];
  const chat = page.locator(selector);
  const input = page.locator('input:not([type]),input[type="text"]').first();
  const send = page.getByRole('button', { name: /^Wyślij$/i }).first();
  const random = page.getByRole('button', { name: /^Generuj losową odpowiedź$/i }).first();
  let previous = await chat.locator('p').allTextContents();
  previous = previous.map((text) => text.trim());
  const sendMessage = async (text) => {
    await input.fill(text);
    await send.click();
    const failure = await inspectMessage(chat, text, 'jolanta', previous);
    previous = (await chat.locator('p').allTextContents()).map((value) => value.trim());
    return failure;
  };
  for (const text of ['Sprawdzam polskie znaki: Łódź, żółć.', 'To druga niezależna wiadomość.']) {
    const failure = await sendMessage(text);
    if (failure) return [false, failure];
  }
  const seen = new Set();
  // Includes both bounds and covers floor/round based selection without assuming array order.
  for (const value of [0, 0.05, 0.15, 0.25, 0.35, 0.45, 0.55, 0.65, 0.75, 0.85, 0.95, 0.999999]) {
    await page.evaluate((next) => {
      window.__zdajStudyRandom.value = next;
    }, value);
    await random.click();
    const text = (await chat.locator('p').last().innerText()).trim();
    if (!chatReplies.includes(text))
      return [
        false,
        'Wylosowana wypowiedź powinna być jedną z dziewięciu oryginalnych fraz tekstyDoChatu.txt. Sprawdź też granice indeksu 0–8.',
      ];
    const failure = await inspectMessage(chat, text, 'krzysztof', previous);
    if (failure) return [false, failure];
    previous = (await chat.locator('p').allTextContents()).map((entry) => entry.trim());
    seen.add(text);
  }
  // Verify scrolling for the other author after the history already overflows.
  const failure = await sendMessage('Ostatnia wiadomość Jolanty po wielu odpowiedziach.');
  if (failure) return [false, failure];
  const overflowing = await chat.evaluate((node) => node.scrollHeight > node.clientHeight + 2);
  if (!overflowing)
    return [
      false,
      'W tej próbie blok chatu nie przepełnił się mimo wielu wiadomości. Sprawdź wymaganą wysokość 470 px i paski przewijania, aby można było ocenić przewijanie.',
    ];
  if (seen.size !== 9) {
    const calls = await page.evaluate(() => window.__zdajStudyRandom.calls);
    if (!calls)
      return [
        null,
        'Wysyłanie, historia i przewijanie działają. Ten sposób losowania nie podlega sterowaniu scenariusza; samodzielnie sprawdź dostępność wszystkich dziewięciu odpowiedzi. Nie potwierdzono automatycznie całego kroku.',
      ];
    return [
      false,
      `W kontrolowanej próbie uzyskano ${seen.size} z dziewięciu różnych odpowiedzi. Sprawdź pełną tablicę, zakres indeksu i wybór przy każdym kliknięciu.`,
    ];
  }
  return [
    true,
    'Sprawdzono dopisywanie obu autorów, zachowanie historii, wszystkie dziewięć oryginalnych odpowiedzi, granice losowania, obrazy, style uczestników i przewijanie po obu działaniach. Nazewnictwo zmiennych i zapis tablicy pozostają osobną kontrolą kodu.',
  ];
}
