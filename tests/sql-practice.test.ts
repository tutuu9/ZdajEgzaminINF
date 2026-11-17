import { describe, expect, it } from 'vitest';
import {
  comparePractice,
  lintQueries,
  parseDump,
  practiceSteps,
} from '../apps/web/src/sql-practice';
import { examStudyGuides } from '../packages/content/src/exam-study.js';

const steps = examStudyGuides.flatMap((guide) =>
  practiceSteps(guide).map((step) => ({ taskId: guide.taskId, ...step })),
);
const reference = (taskId: string, id: string) => {
  const step = steps.find((item) => item.taskId === taskId && item.id === id);
  expect(step?.reference).toBeTruthy();
  return step!.reference!;
};
const messages = (sql: string, ref: string) =>
  comparePractice(sql, ref)
    .findings.map((finding) => finding.message)
    .join('\n');

describe('SQL practice references', () => {
  it('assembles a statement for every SQL step of the eight courses and matches itself', () => {
    const withSql = steps.filter((step) => step.reference);
    expect(withSql.length).toBeGreaterThanOrEqual(45);
    for (const step of withSql) {
      expect(comparePractice(step.reference!, step.reference!).status, step.id).toBe('match');
      // Layout and the closing semicolon do not matter.
      const loose = step
        .reference!.replace(/\n/g, '\n\n  ')
        .replace(/, /g, ' ,\n ')
        .replace(/;\s*$/, '');
      expect(comparePractice(loose, step.reference!).status, step.id).toBe('match');
    }
  });
  it('builds incremental queries and names the database', () => {
    expect(reference('cke-wedkowanie', 'join/river')).toMatch(
      /FROM ryby\s+JOIN lowisko ON lowisko\.Ryby_id = ryby\.id\s+WHERE lowisko\.rodzaj = 3/,
    );
    expect(reference('inf03-02-24-06-sg', 'queries/floor-alias')).toBe(
      'SELECT FLOOR(AVG(rokUr)) AS `Średni rok urodzenia` FROM uczestnicy;',
    );
    expect(
      steps.find((step) => step.taskId === 'inf03-01-24-06-sg' && step.id === 'queries/query-one')
        ?.database,
    ).toBe('motory');
    expect(
      steps.find((step) => step.taskId === 'cke-wedkowanie' && step.id === 'database/archive')
        ?.reference,
    ).toBeNull();
  });
});

describe('equivalent solutions are accepted', () => {
  it.each([
    [
      'cke-wedkowanie',
      'join/river',
      'select r.NAZWA, l.akwen, l.wojewodztwo from ryby r, lowisko l where r.id = l.Ryby_id and l.rodzaj = 3',
    ],
    [
      'inf03-01-24-06-sg',
      'queries/query-one',
      "SELECT nazwa FROM wycieczki WHERE poczatek = 'Wieliczka' OR poczatek = 'Muszyna';",
    ],
    [
      'inf03-03-24-06-sg',
      'queries/query-three',
      'SELECT wodowskazy.nazwa, rzeka, stanOstrzegawczy, stanAlarmowy, stanWody FROM pomiary INNER JOIN wodowskazy ON pomiary.wodowskazy_id = wodowskazy.id WHERE stanOstrzegawczy < stanWody AND dataPomiaru = "2022-05-05";',
    ],
    [
      'inf03-08-25-06-sg',
      'sql/group-years',
      'SELECT parada.rok, AVG(smok.dlugosc) AS `Średnia długość` FROM parada JOIN udzial ON parada.id = udzial.id_parada JOIN smok ON smok.id = udzial.id_smok WHERE parada.rok > 2005 GROUP BY parada.rok;',
    ],
    [
      'inf03-01-25-01-sg',
      'sql-permissions/grant',
      "grant update, select on obuwie.produkt to 'Marek'@'localhost';",
    ],
    [
      'inf03-01-25-01-sg',
      'database/import',
      'create database obuwie charset utf8 collate utf8_unicode_ci;',
    ],
    [
      'inf03-02-24-06-sg',
      'queries/insert',
      "INSERT INTO logowanie (nick, id, haslo) VALUES ('Jeremi', 3, 'Jer123');",
    ],
    ['inf03-01-24-06-sg', 'queries/query-four', 'alter table wycieczki add ocena integer;'],
    [
      'inf03-08-25-06-sg',
      'sql/distinct',
      'SELECT DISTINCT pochodzenie FROM smok ORDER BY pochodzenie;',
    ],
  ])('%s %s', (taskId, id, sql) => {
    const result = comparePractice(sql, reference(taskId, id));
    expect(result.findings.filter((finding) => finding.level !== 'info')).toEqual([]);
    expect(result.status).toBe('match');
  });
});

describe('targeted mistakes are explained', () => {
  it('SELECT * instead of the required columns', () => {
    const ref = reference('cke-wedkowanie', 'select/columns');
    expect(comparePractice('SELECT * FROM ryby;', ref).status).toBe('different');
    expect(messages('SELECT * FROM ryby;', ref)).toContain('SELECT * zwraca wszystkie kolumny');
  });
  it('a missing filter and a non-strict comparison', () => {
    expect(
      messages(
        'SELECT id, nazwa, wystepowanie FROM ryby;',
        reference('cke-wedkowanie', 'select/predators'),
      ),
    ).toContain('Brakuje warunków: „styl_zycia = 1”');
    const three = reference('inf03-03-24-06-sg', 'queries/query-three');
    const wrong = three.replace(
      'p.stanWody > w.stanOstrzegawczy',
      'p.stanWody >= w.stanOstrzegawczy',
    );
    expect(comparePractice(wrong, three).status).toBe('different');
  });
  it('tables without a join condition and a join on the wrong columns', () => {
    const ref = reference('inf03-01-25-01-sg', 'sql-permissions/join-relation');
    expect(
      messages('SELECT buty.nazwa, buty.cena, kategorie.nazwa_kat FROM buty, kategorie;', ref),
    ).toContain('Tabele nie są połączone warunkiem');
    expect(
      comparePractice(
        'SELECT buty.nazwa, buty.cena, kategorie.nazwa_kat FROM buty JOIN kategorie ON buty.id_kat = buty.id_kat;',
        ref,
      ).status,
    ).toBe('different');
    expect(
      comparePractice(
        'SELECT buty.nazwa, buty.cena, kategorie.nazwa_kat FROM buty LEFT JOIN kategorie ON buty.id_kat = kategorie.id_kat;',
        ref,
      ).status,
    ).toBe('different');
  });
  it('a missing alias, extra column, wrong privileges and a changed password', () => {
    expect(
      messages(
        'SELECT FLOOR(AVG(rokUr)) FROM uczestnicy;',
        reference('inf03-02-24-06-sg', 'queries/floor-alias'),
      ),
    ).toContain('alias');
    expect(
      messages(
        'SELECT nazwa, cena, rodzaj FROM uslugi;',
        reference('inf03-05-24-01-sg', 'queries/select-columns'),
      ),
    ).toContain('Dodatkowe kolumny');
    expect(
      comparePractice(
        "GRANT ALL PRIVILEGES ON salon.uslugi TO 'kosmetyczka'@'localhost';",
        reference('inf03-05-24-01-sg', 'queries/permissions'),
      ).status,
    ).toBe('different');
    expect(
      comparePractice(
        "CREATE USER 'Marek'@'localhost' IDENTIFIED BY 'm@rek';",
        reference('inf03-01-25-01-sg', 'sql-permissions/create-user'),
      ).status,
    ).toBe('different');
    expect(
      messages(
        "INSERT INTO logowanie VALUES (3, 'Jeremi', 'Jer123');",
        reference('inf03-02-24-06-sg', 'queries/insert'),
      ),
    ).toContain('Brakuje części');
  });
  it('a different statement kind and a missing GROUP BY', () => {
    expect(
      messages(
        'UPDATE uslugi SET cena = 1;',
        reference('inf03-05-24-01-sg', 'queries/select-columns'),
      ),
    ).toContain('inny rodzaj instrukcji');
    expect(
      messages(
        'SELECT dataPomiaru, AVG(stanWody) AS srednia FROM pomiary;',
        reference('inf03-03-24-06-sg', 'queries/query-four'),
      ),
    ).toContain('GROUP BY');
  });
});

describe('kwerendy.txt lint', () => {
  it('flags common mistakes without a reference', () => {
    const text = [
      'SELECT * FROM ryby',
      "SELECT nazwa FROM ryby WHERE opis = NULL AND nazwa LIKE 'Szczupak';",
      'SELECT a.x, b.y FROM a, b;',
    ].join('\n');
    const result = lintQueries(text)
      .map((finding) => finding.message)
      .join('\n');
    expect(result).toContain('brakuje średnika');
    expect(result).toContain('IS NULL');
    expect(result).toContain('LIKE bez %');
    expect(result).toContain('nie są połączone');
    expect(lintQueries("SELECT nazwa FROM ryby WHERE nazwa LIKE 'S%';\n")).toEqual([]);
  });
});

describe('dump structure', () => {
  it('reads tables, primary keys and rows from a phpMyAdmin-style dump without executing it', () => {
    const tables = parseDump(`-- phpMyAdmin SQL Dump
CREATE TABLE \`ryby\` (
  \`id\` int(10) UNSIGNED NOT NULL,
  \`nazwa\` text COLLATE utf8_unicode_ci DEFAULT NULL,
  \`styl_zycia\` int(10) UNSIGNED NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8;
INSERT INTO \`ryby\` (\`id\`, \`nazwa\`, \`styl_zycia\`) VALUES
(1, 'Szczupak', 1),
(2, 'Karp, \\'król\\'', 2);
ALTER TABLE \`ryby\` ADD PRIMARY KEY (\`id\`);
CREATE TABLE IF NOT EXISTS lowisko (id INT PRIMARY KEY, akwen VARCHAR(50));`);
    expect(tables.map((table) => table.name)).toEqual(['ryby', 'lowisko']);
    expect(tables[0]!.columns).toEqual([
      { name: 'id', type: 'int(10) UNSIGNED', primary: true },
      { name: 'nazwa', type: 'text', primary: false },
      { name: 'styl_zycia', type: 'int(10) UNSIGNED', primary: false },
    ]);
    expect(tables[0]!.rowCount).toBe(2);
    expect(tables[0]!.rows[1]).toEqual(['2', "Karp, 'król'", '2']);
    expect(tables[1]!.columns[0]).toEqual({ name: 'id', type: 'INT', primary: true });
  });
});
