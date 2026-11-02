import PDFDocument from 'pdfkit';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { TaskVersion } from '@zdaj/shared';
import { projectRoot } from './config.js';

const FONT_DIRECTORY = join(projectRoot, 'assets', 'fonts');
const palette = {
  ink: '#172B4D',
  blue: '#2361B8',
  muted: '#52627A',
  pale: '#F0F5FC',
  line: '#D6DFEB',
};
const LEFT = 44;
const WIDTH = 507.28;
const BODY_SIZE = 10.5;
const fileRoles: Record<string, string> = {
  'baza.sql': 'Dostarczona struktura i dane bazy',
  'kwerendy.sql': 'Zapytania SQL przygotowane przez zdającego',
  'index.php': 'Strona z obsługą PHP',
  'index.html': 'Struktura strony internetowej',
  'style.css': 'Zewnętrzny arkusz stylów',
  'skrypt.js': 'Logika JavaScript',
  'script.js': 'Logika JavaScript',
  'app.js': 'Logika JavaScript',
  'oferta.html': 'Strona oferty warsztatów',
  'logo.svg': 'Grafika wektorowa',
};
const methodLabels = {
  file: 'Pliki',
  dom: 'Struktura HTML',
  style: 'Style CSS',
  javascript: 'Działanie JavaScript',
  php: 'Wynik działania PHP',
  sql: 'Wynik zapytań SQL',
  image: 'Właściwości grafiki',
  manual: 'Przegląd ręczny',
};

/** Only public CREATE TABLE declarations are summarized; no private check data is read. */
function databaseStructure(task: TaskVersion): { name: string; definition: string }[] {
  const source = task.starterFiles.find(
    (file) => file.path === 'baza.sql' && file.encoding !== 'base64',
  )?.content;
  if (!source) return [];
  return [
    ...source.matchAll(
      /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?`?([\w]+)`?\s*\(([\s\S]*?)\)\s*;/gi,
    ),
  ].map((match) => ({
    name: match[1]!,
    definition: match[2]!.replace(/\s+/g, ' ').trim(),
  }));
}

/** Generates a student-facing sheet from a single immutable, published task revision. */
export async function createTaskSheet(task: TaskVersion): Promise<Buffer> {
  const [regular, semibold] = await Promise.all([
    readFile(join(FONT_DIRECTORY, 'SourceSans3-Regular.otf')),
    readFile(join(FONT_DIRECTORY, 'SourceSans3-Semibold.otf')),
  ]);
  const doc = new PDFDocument({
    size: 'A4',
    margin: LEFT,
    autoFirstPage: false,
    bufferPages: true,
    info: {
      Title: `${task.title} — ${task.qualification} — wersja ${task.version}`,
      Author: 'Zdaj Egzamin INF',
      Subject: 'Autorskie zadanie szkoleniowe — nie oficjalny arkusz CKE',
      Creator: 'Zdaj Egzamin INF',
    },
    lang: 'pl-PL',
  });
  doc.registerFont('Regular', regular);
  doc.registerFont('Semibold', semibold);
  const chunks: Buffer[] = [];
  const result = new Promise<Buffer>((resolve, reject) => {
    doc.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
  });

  const bottom = () => doc.page.height - 66;
  const newPage = (label: string) => {
    doc.addPage({ margins: { top: 70, right: LEFT, bottom: 66, left: LEFT } });
    doc
      .font('Semibold')
      .fontSize(10)
      .fillColor(palette.blue)
      .text('ZDAJ EGZAMIN INF', LEFT, 28, { lineBreak: false });
    doc
      .font('Regular')
      .fontSize(9)
      .fillColor(palette.muted)
      .text(label, LEFT + 200, 29, { width: WIDTH - 200, align: 'right', lineBreak: false });
    doc
      .moveTo(LEFT, 49)
      .lineTo(LEFT + WIDTH, 49)
      .lineWidth(0.8)
      .strokeColor(palette.line)
      .stroke();
    doc.x = LEFT;
    doc.y = 70;
  };
  const ensure = (height: number) => {
    if (doc.y + height > bottom()) newPage(`${task.title} · kontynuacja`);
  };
  const text = (value: string, size = BODY_SIZE, color = palette.ink) => {
    doc.font('Regular').fontSize(size).fillColor(color);
    doc.text(value, LEFT, doc.y, { width: WIDTH, lineGap: 2.5 });
    doc.y += 8;
  };
  const heading = (value: string, needed = 50) => {
    ensure(needed);
    doc
      .font('Semibold')
      .fontSize(15)
      .fillColor(palette.ink)
      .text(value, LEFT, doc.y, { width: WIDTH });
    doc.y += 8;
  };
  const row = (label: string, value: string, labelWidth = 122) => {
    doc.font('Regular').fontSize(10);
    const height = Math.max(
      28,
      doc.heightOfString(value, { width: WIDTH - labelWidth - 20, lineGap: 2 }) + 14,
    );
    ensure(height + 3);
    const y = doc.y;
    doc.rect(LEFT, y, WIDTH, height).fill(palette.pale);
    doc
      .font('Semibold')
      .fontSize(10)
      .fillColor(palette.ink)
      .text(label, LEFT + 9, y + 7, { width: labelWidth - 12, lineGap: 2 });
    doc
      .font('Regular')
      .fontSize(10)
      .text(value, LEFT + labelWidth, y + 7, { width: WIDTH - labelWidth - 10, lineGap: 2 });
    doc.y = y + height + 3;
  };

  newPage('ARKUSZ ĆWICZENIOWY');
  doc
    .font('Semibold')
    .fontSize(27)
    .fillColor(palette.ink)
    .text(task.title, LEFT, doc.y, { width: WIDTH, lineGap: 0 });
  doc.y += 10;
  row(
    'Kwalifikacja',
    `${task.qualification}   |   Wersja ${task.version}   |   Czas pracy: ${task.durationMinutes} minut`,
  );
  text(task.summary, 11);
  text(
    task.origin === 'original'
      ? 'Autorskie zadanie szkoleniowe. Ten dokument nie jest oficjalnym arkuszem CKE, a wynik służy nauce.'
      : 'Pomocniczy wydruk materiału do nauki. Ten dokument nie zastępuje oryginalnego arkusza ani oficjalnych zasad oceniania.',
    9.5,
    palette.muted,
  );
  heading('Pliki do pracy', 90);
  for (const file of task.starterFiles)
    row(
      file.path,
      fileRoles[file.path] ?? 'Plik projektu — zastosowanie określają wymagania zadania',
    );
  doc.y += 7;
  const structure = databaseStructure(task);
  if (structure.length) {
    heading('Baza danych — struktura wejściowa', 95);
    for (const table of structure) row(table.name, table.definition);
    text(
      'Dane i pełna definicja bazy znajdują się w dostarczonym pliku baza.sql. Zachowaj wymagania dotyczące danych wejściowych.',
      9.5,
      palette.muted,
    );
  }
  heading('Środowisko i oddanie w aplikacji', 90);
  text(
    task.runtimeProfile === 'php-mariadb'
      ? 'Profil ćwiczenia: PHP 8.4 i MariaDB 11.4. Połączenie z localhost dotyczy wyłącznie odizolowanej bazy zadania; dane połączenia podano w wymaganiach. Zapytania SQL są wykonywane w MariaDB.'
      : 'Profil ćwiczenia: HTML, CSS i JavaScript w przeglądarce. Automatyczne próby działania korzystają z Chromium. Zachowaj wymagane nazwy plików i powiązania między nimi.',
    10,
  );
  text(
    'Pracuj w edytorze strony lub we własnym środowisku. Oddaj komplet plików projektu przez przycisk „Oddaj do sprawdzenia”; możesz wczytać przygotowane archiwum ZIP. Sam arkusz PDF nie jest rozwiązaniem.',
    10,
  );

  newPage('WYMAGANIA ZADANIA');
  heading('Wykonaj zadanie według wymagań', 70);
  text(
    'Poniższe punkty dotyczą tej samej wersji zadania. Wybrany poziom pomocy nie zmienia wymagań pracy.',
    10,
    palette.muted,
  );
  for (const [index, requirement] of task.requirements.entries()) {
    doc.font('Regular').fontSize(11);
    const height = doc.heightOfString(requirement, { width: WIDTH - 32, lineGap: 3 }) + 17;
    ensure(height);
    const y = doc.y;
    doc
      .font('Semibold')
      .fontSize(11)
      .fillColor(palette.blue)
      .text(`${index + 1}.`, LEFT, y, { width: 24 });
    doc
      .font('Regular')
      .fontSize(11)
      .fillColor(palette.ink)
      .text(requirement, LEFT + 32, y, { width: WIDTH - 32, lineGap: 3 });
    doc.y = y + height;
  }

  newPage('ODDANIE I OCENA PRACY');
  heading('Lista przed oddaniem', 80);
  for (const item of [
    'Wszystkie wymagane pliki są zapisane pod właściwymi nazwami.',
    'Otworzono stronę i sprawdzono jej działanie oraz polskie znaki.',
    'Przejrzano każdy punkt wymagań oraz kryteria poniżej.',
  ]) {
    const y = doc.y;
    doc
      .rect(LEFT, y + 3, 8, 8)
      .lineWidth(0.8)
      .strokeColor(palette.muted)
      .stroke();
    doc
      .font('Regular')
      .fontSize(10)
      .fillColor(palette.ink)
      .text(item, LEFT + 18, y, { width: WIDTH - 18, lineGap: 2 });
    doc.y += 7;
  }
  doc.y += 8;
  heading('Kryteria i przegląd pracy', 75);
  text(
    'Raport rozdziela sprawdzone elementy i przegląd ręczny. Przy niepełnym pokryciu nie podaje całościowego procentu. Błąd środowiska nie oznacza błędu rozwiązania.',
    9.5,
    palette.muted,
  );
  for (const criterion of task.criteria) {
    doc.font('Semibold').fontSize(10.5);
    const titleHeight = doc.heightOfString(criterion.title, { width: WIDTH - 130 });
    doc.font('Regular').fontSize(10);
    const descriptionHeight = doc.heightOfString(criterion.description, {
      width: WIDTH,
      lineGap: 2,
    });
    const height = titleHeight + descriptionHeight + 15;
    ensure(height);
    const y = doc.y;
    doc
      .font('Semibold')
      .fontSize(10.5)
      .fillColor(palette.ink)
      .text(criterion.title, LEFT, y, { width: WIDTH - 130 });
    doc
      .font('Regular')
      .fontSize(9)
      .fillColor(palette.blue)
      .text(methodLabels[criterion.method], LEFT + WIDTH - 125, y + 1, {
        width: 125,
        align: 'right',
      });
    doc
      .font('Regular')
      .fontSize(10)
      .fillColor(palette.muted)
      .text(criterion.description, LEFT, y + titleHeight + 3, { width: WIDTH, lineGap: 2 });
    doc
      .moveTo(LEFT, y + height - 5)
      .lineTo(LEFT + WIDTH, y + height - 5)
      .lineWidth(0.5)
      .strokeColor(palette.line)
      .stroke();
    doc.y = y + height;
  }

  const { start, count } = doc.bufferedPageRange();
  for (let page = start; page < start + count; page++) {
    doc.switchToPage(page);
    // Footer is outside the body margin; prevent PDFKit from creating an overflow page.
    const bottomMargin = doc.page.margins.bottom;
    doc.page.margins.bottom = 0;
    const y = doc.page.height - 39;
    doc
      .font('Regular')
      .fontSize(8)
      .fillColor(palette.muted)
      .text(`${task.id} · wersja ${task.version} · materiał szkoleniowy`, LEFT, y, {
        width: WIDTH - 90,
        lineBreak: false,
      });
    doc.text(`Strona ${page + 1} z ${count}`, LEFT + WIDTH - 90, y, {
      width: 90,
      align: 'right',
      lineBreak: false,
    });
    doc.page.margins.bottom = bottomMargin;
  }
  doc.end();
  return result;
}
