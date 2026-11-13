import { spawn } from 'node:child_process';
import { readFile, mkdir, chown, stat } from 'node:fs/promises';
import { Buffer } from 'node:buffer';
import path from 'node:path';
import { chromium } from 'playwright-core';
import {
  checkFirmaContact,
  checkSalonCalculator,
  checkChatMessages,
  installChatRandomControl,
} from './study-adapters.mjs';

// The checking specification arrives on the controller's standard input. It is
// never written to a path that learner PHP, running as another user, can read.
async function readConfiguration() {
  let source = '';
  for await (const chunk of process.stdin) {
    source += chunk;
    if (source.length > 8 * 1024 * 1024) throw new Error('Configuration is too large.');
  }
  return JSON.parse(source);
}
const task = await readConfiguration();
const SQL_CLIENT = { uid: 10004, gid: 10004 };
const SYSTEM_SCHEMAS = ['mysql', 'information_schema', 'performance_schema', 'sys'];
const quoteIdentifier = (name) => '`' + name.replaceAll('`', '``') + '`';
const processes = [];
let browser;
let diagnostics = 0;
const services = [];
class InfrastructureError extends Error {}
class ClientCommandError extends Error {}
function assertServices() {
  if (diagnostics > 1024 * 1024)
    throw new InfrastructureError('Przekroczono limit diagnostyki środowiska.');
  if (services.some((child) => child.exitCode !== null) || (browser && !browser.isConnected()))
    throw new InfrastructureError('Proces środowiska zakończył pracę.');
}
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
function start(executable, args, options = {}) {
  const child = spawn(executable, args, { stdio: ['pipe', 'pipe', 'pipe'], ...options });
  processes.push(child);
  child.on('error', () => undefined);
  for (const stream of [child.stdout, child.stderr])
    stream.on('data', (chunk) => {
      diagnostics += chunk.length;
      if (diagnostics > 1024 * 1024) {
        for (const process of processes) process.kill('SIGKILL');
      }
    });
  return child;
}
function run(executable, args, input = '', options = {}) {
  return new Promise((resolve, reject) => {
    const child = start(executable, args, options);
    let out = '';
    let err = '';
    let settled = false;
    const timer = setTimeout(() => {
      child.kill('SIGKILL');
      finish(new Error('Przekroczono czas operacji.'));
    }, 10000);
    const finish = (error, result) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (error) reject(error);
      else resolve(result);
    };
    child.stdout.on('data', (data) => {
      out += data;
      if (out.length > 1024 * 1024) {
        child.kill('SIGKILL');
        finish(new Error('Zbyt długi wynik.'));
      }
    });
    child.stderr.on('data', (data) => {
      err += data;
      if (err.length > 8192) err = err.slice(-8192);
    });
    child.on('error', (error) => finish(error));
    child.on('close', (code) =>
      code === 0 ? finish(null, out) : finish(new Error(err || 'Operacja nie powiodła się.')),
    );
    child.stdin.on('error', () => undefined);
    child.stdin.end(input);
  });
}
async function sql(query, database, reader = false) {
  try {
    return await run(
      'mariadb',
      [
        '--no-defaults',
        '--socket=/tmp/mysql.sock',
        '--default-character-set=utf8mb4',
        '--batch',
        '--raw',
        // Without this the client executes `\!`, `system` and `source` found in SQL text.
        '--sandbox',
        reader ? '-ucheck_reader' : '-uroot',
        ...(database ? [database] : []),
      ],
      query,
      // The client parses learner text, so it never runs with the controller's identity.
      SQL_CLIENT,
    );
  } catch (error) {
    if (/ERROR (2002|2003|2006|2013)\b/.test(error.message))
      throw new InfrastructureError('Baza ćwiczenia jest niedostępna.');
    if (/Not allowed in the sandbox mode/.test(error.message))
      throw new ClientCommandError('Niedozwolone polecenie klienta bazy.');
    throw error;
  }
}
async function resetDatabase() {
  if (task.runtimeProfile !== 'php-mariadb') return;
  try {
    // Learner PHP connects as root and may create databases under any name, so every
    // non-system schema is removed. HEX keeps unusual names intact in the client output.
    const listed = await sql(
      `SELECT HEX(SCHEMA_NAME) FROM information_schema.SCHEMATA WHERE SCHEMA_NAME NOT IN (${SYSTEM_SCHEMAS.map((name) => `'${name}'`).join(', ')});`,
    );
    const names = listed
      .split('\n')
      .slice(1)
      .filter((line) => /^(?:[0-9A-F]{2})+$/.test(line))
      .map((line) => Buffer.from(line, 'hex').toString('utf8'));
    await sql(
      names.map((name) => `DROP DATABASE IF EXISTS ${quoteIdentifier(name)};`).join('\n') +
        '\n' +
        task.seed,
    );
  } catch {
    throw new InfrastructureError('Nie udało się odtworzyć danych testowych.');
  }
}
async function boot() {
  for (const [dir, uid] of [
    ['/tmp/db', 10002],
    ['/tmp/php', 10001],
    ['/tmp/browser', 10003],
  ]) {
    await mkdir(dir, { recursive: true });
    await chown(dir, uid, uid);
  }
  if (task.runtimeProfile === 'php-mariadb') {
    await run(
      'mariadb-install-db',
      [
        '--no-defaults',
        '--datadir=/tmp/db',
        '--auth-root-authentication-method=normal',
        '--skip-test-db',
      ],
      '',
      { uid: 10002, gid: 10002 },
    );
    services.push(
      start(
        'mariadbd',
        [
          '--no-defaults',
          '--datadir=/tmp/db',
          '--socket=/tmp/mysql.sock',
          '--pid-file=/tmp/mysql.pid',
          '--bind-address=127.0.0.1',
          '--port=3306',
          '--innodb-buffer-pool-size=64M',
          '--key-buffer-size=8M',
          '--max-connections=10',
          '--skip-log-bin',
          '--secure-file-priv=/tmp/db',
        ],
        { uid: 10002, gid: 10002 },
      ),
    );
    let ready = false;
    for (let attempt = 0; attempt < 70; attempt++) {
      try {
        await sql('SELECT 1;');
        ready = true;
        break;
      } catch {
        await delay(100);
      }
    }
    if (!ready) throw new Error('Nie uruchomiono bazy ćwiczenia.');
    await resetDatabase();
    await sql(
      "CREATE USER 'check_reader'@'localhost' IDENTIFIED BY ''; GRANT SELECT ON *.* TO 'check_reader'@'localhost';",
    );
  }
  services.push(
    start(
      'php',
      [
        '-d',
        'mysqli.default_socket=/tmp/mysql.sock',
        '-d',
        'pdo_mysql.default_socket=/tmp/mysql.sock',
        '-d',
        'display_errors=0',
        '-d',
        'log_errors=1',
        '-d',
        'error_log=/tmp/php/errors.log',
        '-d',
        'session.save_path=/tmp/php',
        '-d',
        'upload_tmp_dir=/tmp/php',
        '-d',
        'memory_limit=128M',
        '-d',
        'max_execution_time=10',
        '-S',
        '127.0.0.1:8080',
        '-t',
        '/project',
      ],
      { uid: 10001, gid: 10001 },
    ),
  );
  for (let attempt = 0; attempt < 50; attempt++) {
    try {
      await fetch('http://127.0.0.1:8080/');
      break;
    } catch {
      await delay(100);
    }
  }
  browser = await chromium.launch({
    executablePath: '/opt/checker/chromium-wrapper',
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-dev-shm-usage',
      '--disable-background-networking',
      '--disable-crash-reporter',
    ],
    env: { ...process.env, HOME: '/tmp/browser', TMPDIR: '/tmp/browser' },
  });
}
function statements(source) {
  const output = [];
  let value = '';
  let quote = '';
  let lineComment = false;
  let blockComment = false;
  for (let i = 0; i < source.length; i++) {
    const c = source[i],
      next = source[i + 1];
    if (lineComment) {
      if (c === '\n') {
        lineComment = false;
        value += ' ';
      }
      continue;
    }
    if (blockComment) {
      if (c === '*' && next === '/') {
        blockComment = false;
        i++;
        value += ' ';
      }
      continue;
    }
    if (quote) {
      value += c;
      if (c === '\\' && next) {
        value += next;
        i++;
      } else if (c === quote) {
        if (next === quote) {
          value += next;
          i++;
        } else quote = '';
      }
      continue;
    }
    if (c === '-' && next === '-' && /\s/.test(source[i + 2] ?? ' ')) {
      lineComment = true;
      i++;
      continue;
    }
    if (c === '#') {
      lineComment = true;
      continue;
    }
    if (c === '/' && next === '*') {
      blockComment = true;
      i++;
      continue;
    }
    if (["'", '"', '`'].includes(c)) {
      quote = c;
      value += c;
      continue;
    }
    if (c === ';') {
      if (value.trim()) output.push(value.trim());
      value = '';
    } else value += c;
  }
  if (value.trim()) output.push(value.trim());
  return output;
}
function normalizedRows(rows, ordered) {
  const normalized = rows.map((row) =>
    row.map((value) => (value === null ? 'NULL' : String(value))),
  );
  return ordered
    ? normalized
    : normalized.sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
}
async function checkSql(check) {
  const source = await readFile(path.join('/project', check.path), 'utf8');
  const query = statements(source)[check.queryIndex ?? 0];
  if (!query || !/^(SELECT|WITH)\b/i.test(query))
    return [false, 'Brak zapytania SELECT w wymaganym miejscu.'];
  const execute = async (expectedRows) => {
    const result = await sql(
      `SET STATEMENT max_statement_time=2 FOR ${query};`,
      check.database,
      true,
    );
    const lines = result.trimEnd().split('\n');
    const columns = lines.shift()?.split('\t') ?? [];
    const rows = lines.filter(Boolean).map((line) => line.split('\t'));
    const correct =
      JSON.stringify(normalizedRows(rows, check.orderMatters)) ===
      JSON.stringify(normalizedRows(expectedRows, check.orderMatters));
    const headings =
      !check.expectedColumns || JSON.stringify(columns) === JSON.stringify(check.expectedColumns);
    return correct && headings;
  };
  await resetDatabase();
  if (!(await execute(check.expectedRows)))
    return [false, 'Wiersze lub nazwy kolumn nie odpowiadają wymaganiom.'];
  // A second data set rejects answers consisting only of hard-coded result rows.
  if (task.taskId === 'biblioteka') {
    await sql("INSERT INTO books VALUES (5,'Echo lasu',2,1);", 'biblioteka');
    const expected =
      check.queryIndex === 0 ? [...check.expectedRows, ['Echo lasu', 'Jan Nowak']] : [[4]];
    if (!(await execute(expected)))
      return [false, 'Zapytanie nie reaguje poprawnie na dodatkowe dane testowe.'];
  }
  if (task.taskId === 'planszowki') {
    await sql('INSERT INTO meetings VALUES (5,1,7);', 'planszowki');
    const expected =
      check.queryIndex === 0
        ? [...check.expectedRows, ['Leśne ścieżki', 7]]
        : [
            ['Leśne ścieżki', 2],
            ['Miasto pomysłów', 2],
            ['Wyprawa na Marsa', 1],
          ];
    if (!(await execute(expected)))
      return [false, 'Zapytanie nie reaguje poprawnie na dodatkowe dane testowe.'];
  }
  return [true, 'Wynik poprawny dla danych początkowych i zmienionego zestawu.'];
}
async function imageDimensions(check) {
  const bytes = await readFile(path.join('/project', check.path));
  let width, height, format;
  if (check.path.toLowerCase().endsWith('.svg')) {
    format = 'svg';
    const text = bytes.toString();
    const opening = text.match(/<svg\b[^>]*>/i)?.[0] ?? '';
    width = Number(opening.match(/\bwidth\s*=\s*["']([\d.]+)(?:px)?["']/i)?.[1]);
    height = Number(opening.match(/\bheight\s*=\s*["']([\d.]+)(?:px)?["']/i)?.[1]);
  } else if (
    bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) &&
    bytes.length >= 24
  ) {
    format = 'png';
    width = bytes.readUInt32BE(16);
    height = bytes.readUInt32BE(20);
  } else return [false, 'Nieobsługiwany format grafiki dla tego kryterium.'];
  return [
    (!check.width || width === check.width) &&
      (!check.height || height === check.height) &&
      (!check.format || format === check.format),
    `Wymiary: ${width} × ${height}; format: ${format}.`,
  ];
}
async function checkCourseCalculator(page) {
  const checkboxes = page.locator('input[type="checkbox"]');
  const react = (await page.locator('#react').count()) ? page.locator('#react') : checkboxes.nth(0);
  const javascript = (await page.locator('#javascript').count())
    ? page.locator('#javascript')
    : checkboxes.nth(1);
  const installments = (await page.locator('#raty').count())
    ? page.locator('#raty')
    : page.locator('input[type="number"]').first();
  const cities = (await page.locator('#miasto').count())
    ? page.locator('#miasto')
    : page.locator('select').first();
  const button = page.getByRole('button', { name: /^Oblicz$/i }).first();
  for (const [reactSelected, javascriptSelected, count, city, total, installment] of [
    [true, true, 10, 'Katowice', 8000, 800],
    [true, false, 5, 'Warszawa', 5000, 1000],
    [false, true, 3, 'Gdańsk', 3000, 1000],
    [true, true, 8, 'Warszawa', 8000, 1000],
    [false, false, 4, 'Gdańsk', 0, 0],
    [true, false, 2, 'Katowice', 5000, 2500],
  ]) {
    await react.setChecked(reactSelected);
    await javascript.setChecked(javascriptSelected);
    await installments.fill(String(count));
    await cities.selectOption({ label: city });
    await button.click();
    const result = (await page.locator('#wynik').count())
      ? page.locator('#wynik')
      : page
          .locator('p')
          .filter({ hasText: /Kurs odbędzie się|Koszt całkowity/i })
          .last();
    const text = await result.innerText();
    const numbers = (text.match(/\d+(?:[ \u00a0]\d{3})*(?:[.,]\d+)?/g) ?? []).map((value) =>
      Number(value.replace(/[ \u00a0]/g, '').replace(',', '.')),
    );
    const includesNumber = (expected) => numbers.some((value) => Math.abs(value - expected) < 0.01);
    if (
      !text.toLocaleLowerCase('pl').includes(city.toLocaleLowerCase('pl')) ||
      !includesNumber(total) ||
      !includesNumber(installment) ||
      !includesNumber(count) ||
      (total === installment && numbers.filter((value) => value === total).length < 2)
    )
      return [
        false,
        `Dla wyboru React.js: ${reactSelected ? 'tak' : 'nie'}, JavaScript: ${javascriptSelected ? 'tak' : 'nie'}, ${count} rat i miasta ${city} oczekiwano kwoty ${total} zł oraz raty ${installment} zł w komunikacie.`,
      ];
  }
  return [
    true,
    'Sprawdzono oba kursy osobno i razem, brak zaznaczeń, różne miasta i liczby rat oraz wielokrotne kliknięcie bez sumowania poprzednich wyników.',
  ];
}

async function checkDragonTabs(page) {
  const ids = ['baza', 'opisy', 'galeria'];
  for (const id of ids) {
    if ((await page.locator(`#${id}`).isVisible()) !== (id === 'baza'))
      return [
        false,
        'Początkowo ma być widoczny tylko widok Baza; Opisy i Galeria powinny być ukryte.',
      ];
  }
  for (const selected of ['galeria', 'opisy', 'baza', 'galeria', 'baza']) {
    await page.locator(`#nav-${selected}`).click();
    for (const id of ids) {
      const visible = await page.locator(`#${id}`).isVisible();
      const display = await page
        .locator(`#${id}`)
        .evaluate((element) => getComputedStyle(element).display);
      if (visible !== (id === selected) || display !== (id === selected ? 'block' : 'none'))
        return [
          false,
          `Po kliknięciu ${selected} wyświetl ten widok i ukryj pozostałe dwa. Sprawdź także powrót do wcześniejszego widoku.`,
        ];
      const color = await page
        .locator(`#nav-${id}`)
        .evaluate((element) => getComputedStyle(element).backgroundColor);
      const expected = id === selected ? 'rgb(255,228,225)' : 'rgb(255,174,165)';
      if (color.replace(/\s/g, '') !== expected)
        return [
          false,
          `Po kliknięciu ${selected} tylko aktywna nawigacja powinna mieć MistyRose; pozostałe powinny wrócić do #FFAEA5.`,
        ];
    }
  }
  return [
    true,
    'Pięć kolejnych przełączeń zachowuje dokładnie jeden widoczny widok i właściwe kolory wszystkich trzech elementów nawigacji.',
  ];
}

async function rendered(check, criterion) {
  await resetDatabase();
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    locale: 'pl-PL',
    serviceWorkers: 'block',
  });
  await context.route('**/*', (route) => {
    const url = new URL(route.request().url());
    return url.origin === 'http://127.0.0.1:8080' ? route.continue() : route.abort();
  });
  const page = await context.newPage();
  page.setDefaultTimeout(2500);
  if (check.action === 'chat-messages') await context.addInitScript(installChatRandomControl);
  try {
    const response = await page.goto(`http://127.0.0.1:8080/${check.path}`, {
      waitUntil: 'load',
      timeout: 7000,
    });
    if (!response || response.status() >= 400)
      return [false, 'Strona nie zwróciła poprawnej odpowiedzi.'];
    if (check.type === 'style') {
      const actual = await page
        .locator(check.selector)
        .first()
        .evaluate(
          (element, property) => getComputedStyle(element).getPropertyValue(property).trim(),
          check.property,
        );
      return [actual === check.value, `Odczytana właściwość ${check.property}: ${actual}.`];
    }
    if (check.type === 'javascript') {
      if (check.action === 'kursy-calculator') return await checkCourseCalculator(page);
      if (check.action === 'smoki-tabs') return await checkDragonTabs(page);
      if (check.action === 'firma-contact') return await checkFirmaContact(page);
      if (check.action === 'salon-calculator') return await checkSalonCalculator(page);
      if (check.action === 'chat-messages') return await checkChatMessages(page);
      if (check.action === 'workshop-calculator') {
        for (const [course, count, discount, expected] of [
          ['html', '1', false, 120],
          ['js', '2', true, 324],
          ['php', '20', false, 4400],
          ['html', '3', true, 324],
        ]) {
          await page.locator('#kurs').selectOption(course);
          await page.locator('#osoby').fill(count);
          await page.locator('#rabat').setChecked(discount);
          await page.locator('#kalkulator').evaluate((form) => form.requestSubmit());
          const text = await page.locator('#wynik').innerText();
          const match = text.replace(/\s/g, '').match(/(\d+[,.]\d{2})/);
          if (
            !match ||
            Math.abs(Number(match[1].replace(',', '.')) - expected) > 0.001 ||
            !text.includes('zł')
          )
            return [
              false,
              `Nieprawidłowa wycena dla kursu ${course}, liczby osób ${count} i rabatu ${discount ? 'tak' : 'nie'}.`,
            ];
        }
        for (const count of ['0', '21', '1.5', '-1', '']) {
          await page.locator('#osoby').fill(count);
          await page.locator('#wynik').evaluate((element) => {
            element.textContent = '';
          });
          await page.locator('#kalkulator').evaluate((form) => form.requestSubmit());
          const text = await page.locator('#wynik').innerText();
          if (/\d+[,.]\d{2}\s*zł/.test(text))
            return [false, 'Niepoprawna liczba uczestników prowadzi do wyceny.'];
        }
        return [true, 'Sprawdzono ceny, rabat, granice zakresu i niepoprawne dane.'];
      }
      if (check.action === 'panel-switching') {
        const panels = check.panels ?? ['gry-panel', 'spotkania-panel'];
        if (
          !(await page.locator(`#${panels[0]}`).isVisible()) ||
          (await page.locator(`#${panels[1]}`).isVisible())
        )
          return [false, 'Nieprawidłowy panel początkowy.'];
        for (const target of [panels[1], panels[0]]) {
          await page.locator(`[data-panel="${target}"]`).click();
          for (const panel of panels)
            if ((await page.locator(`#${panel}`).isVisible()) !== (panel === target))
              return [false, 'Przełączenie nie pozostawia jednego widocznego panelu.'];
        }
        return [true, 'Przełączanie działa w obie strony.'];
      }
    }
    const locator = page.locator(check.selector);
    const count = await locator.count();
    const text = (await locator.allTextContents()).join(' ');
    let correct =
      count > 0 &&
      (check.minCount === undefined || count >= check.minCount) &&
      (check.maxCount === undefined || count <= check.maxCount) &&
      (!check.text || text.includes(check.text)) &&
      (!check.texts || check.texts.every((value) => text.includes(value))) &&
      (!check.absentTexts || check.absentTexts.every((value) => !text.includes(value)));
    if (correct && criterion.id === 'library-data') {
      await sql(
        "UPDATE books SET available=0 WHERE id=1; INSERT INTO books VALUES (5,'Echo lasu',2,1);",
        'biblioteka',
      );
      await page.reload();
      const changed = await page.locator('#ksiazki').innerText();
      correct = changed.includes('Echo lasu') && !changed.includes('Atlas chmur');
    }
    if (correct && criterion.id === 'club-filter') {
      await sql('UPDATE games SET players=2 WHERE id=2;', 'planszowki');
      await page.reload();
      const changed = await page.locator('#gry').innerText();
      correct = changed.includes('Wyprawa na Marsa') && !changed.includes('Miasto pomysłów');
    }
    return [
      correct,
      correct
        ? 'Wymagane elementy i zachowanie są obecne.'
        : 'Brakuje wymaganych elementów, danych lub reakcji na zmianę bazy.',
    ];
  } finally {
    await context.close();
  }
}
try {
  await boot();
  const results = [];
  for (const criterion of task.criteria) {
    const base = {
      criterionId: criterion.id,
      title: criterion.title,
      method: criterion.method,
      source: criterion.source,
      points: criterion.points,
    };
    if (criterion.method === 'manual') {
      results.push({
        ...base,
        status: 'manual',
        evidence: 'To kryterium wymaga samodzielnego sprawdzenia.',
        recommendation: criterion.description,
      });
      continue;
    }
    try {
      assertServices();
      const check = criterion.check;
      let outcome;
      if (check.type === 'file') {
        const present = await stat(path.join('/project', check.path))
          .then((value) => value.isFile())
          .catch(() => false);
        outcome = [present, present ? 'Plik istnieje.' : 'Brak wymaganego pliku.'];
      } else if (check.type === 'sql') outcome = await checkSql(check);
      else if (check.type === 'image') outcome = await imageDimensions(check);
      else outcome = await rendered(check, criterion);
      results.push({
        ...base,
        status: outcome[0] === null ? 'manual' : outcome[0] ? 'passed' : 'failed',
        evidence: outcome[1],
        recommendation: outcome[0] ? '' : criterion.description,
      });
    } catch (error) {
      let infrastructure = error instanceof InfrastructureError;
      try {
        assertServices();
      } catch {
        infrastructure = true;
      }
      const expected =
        error instanceof ClientCommandError ||
        error.code === 'ENOENT' ||
        error.name === 'TimeoutError' ||
        /ERROR \d{4}/.test(error.message);
      infrastructure ||= !expected;
      results.push({
        ...base,
        status: infrastructure ? 'error' : 'failed',
        evidence: infrastructure
          ? 'Błąd środowiska sprawdzania. Kryterium nie zostało ocenione.'
          : error.code === 'ENOENT'
            ? 'Brak sprawdzanego pliku.'
            : error instanceof ClientCommandError
              ? 'Zapytanie zawiera polecenie klienta bazy (np. \\! lub system), a nie instrukcję SQL. Nie zostało wykonane.'
              : 'Nie udało się wykonać wymaganej operacji na rozwiązaniu.',
        recommendation: infrastructure
          ? 'Ponów sprawdzanie w nowej próbie.'
          : criterion.description,
      });
    }
  }
  process.stdout.write(JSON.stringify({ results }));
} catch (error) {
  process.stderr.write('Nie udało się uruchomić środowiska sprawdzania.\n');
  process.exitCode = 1;
  if (process.env.CHECKER_DEBUG === '1') process.stderr.write(String(error) + '\n');
} finally {
  if (browser) await browser.close().catch(() => undefined);
  for (const child of processes) if (child.exitCode === null) child.kill('SIGKILL');
}
