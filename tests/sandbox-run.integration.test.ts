import { afterAll, describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { mkdir, readdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { command, runPlayground } from '@zdaj/checker';
import type { ProjectFile, SandboxRunRequest, SandboxRunResult } from '@zdaj/shared';

const suiteId = randomUUID();
const dataDir = path.resolve('data', `run-${suiteId}`);
const samples: { name: string; durationMs: number; sampledPeakMiB: number }[] = [];

// Authored for these tests only. It is not taken from any examination package.
const dump = `-- synthetic shop
CREATE TABLE kategorie (id INT PRIMARY KEY, nazwa VARCHAR(40) NOT NULL) DEFAULT CHARSET=utf8mb4;
CREATE TABLE produkty (
  id INT PRIMARY KEY AUTO_INCREMENT,
  kategorie_id INT NOT NULL,
  nazwa VARCHAR(60) NOT NULL,
  cena DECIMAL(8,2) NOT NULL,
  dodano DATE NOT NULL
) DEFAULT CHARSET=utf8mb4;
INSERT INTO kategorie VALUES (1, 'Żywność'), (2, 'Narzędzia');
INSERT INTO produkty (kategorie_id, nazwa, cena, dodano) VALUES
  (1, 'Chleb żytni', 6.50, '2024-01-10'),
  (1, 'Masło; solone', 8.99, '2024-01-11'),
  (2, 'Młotek', 34.00, '2024-02-01');
`;
const html = { path: 'index.html', content: '<!doctype html><title>Sklep</title>' };
const base = (extra: ProjectFile[] = []): ProjectFile[] => [
  html,
  { path: 'baza.sql', content: dump },
  ...extra,
];

afterAll(async () => {
  await mkdir('artifacts', { recursive: true });
  await writeFile(
    'artifacts/sandbox-run-benchmark.json',
    JSON.stringify(
      {
        environment: { profile: 'local-development', platform: process.platform },
        scope: 'Run mode without Chromium. Does not certify the public gVisor profile.',
        recordedAt: new Date().toISOString(),
        samples,
      },
      null,
      2,
    ),
  );
  const allowedRoot = path.resolve('data') + path.sep;
  if (!dataDir.startsWith(allowedRoot) || path.basename(dataDir) !== `run-${suiteId}`)
    throw new Error('Unsafe fixture cleanup path.');
  await rm(dataDir, { recursive: true, force: true });
});

async function run(
  name: string,
  request: Partial<SandboxRunRequest>,
  files: ProjectFile[],
): Promise<SandboxRunResult> {
  const jobId = randomUUID();
  let peak = 0;
  const result = await runPlayground(
    { database: 'Sklep_2024', dumpPath: 'baza.sql', sql: '', php: null, ...request },
    files,
    {
      dataDir,
      profile: 'local-development',
      jobId,
      diagnostics: true,
      onResourceSample: (bytes) => {
        peak = Math.max(peak, bytes);
      },
    },
  );
  samples.push({
    name,
    durationMs: result.runtimeMs,
    sampledPeakMiB: Math.round((peak / 1048576) * 10) / 10,
  });
  const containers = await command(['ps', '-aq', '--filter', `label=zdaj.job=${jobId}`]);
  expect(containers.stdout.trim(), 'The sandbox container must be removed.').toBe('');
  expect(await readdir(path.join(dataDir, 'sandbox')).catch(() => [])).toEqual([]);
  return result;
}
const php = (body: string) =>
  `<?php mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT); ${body}`;

describe.sequential('learner-initiated SQL and PHP runs', () => {
  it('imports a dump into a learner-named database and reports each statement', async () => {
    const result = await run(
      'import-and-statements',
      {
        sql: `SELECT p.nazwa, k.nazwa AS kategoria, p.cena FROM produkty p JOIN kategorie k ON k.id = p.kategorie_id ORDER BY p.id;
-- a comment between statements
INSERT INTO produkty (kategorie_id, nazwa, cena, dodano) VALUES (2, 'Piła', 59.90, '2024-03-05');
UPDATE produkty SET cena = cena + 1 WHERE kategorie_id = 1;
ALTER TABLE produkty ADD ocena INT NULL;
SELECT COUNT(*) AS liczba, MAX(ocena) AS ocena FROM produkty;
SELEC nazwa FROM produkty;
SELECT * FROM nie_ma_takiej;`,
      },
      base(),
    );
    expect(result.database).toBe('Sklep_2024');
    expect(result.import).toEqual({
      ok: true,
      tables: [
        { name: 'kategorie', rows: 2 },
        { name: 'produkty', rows: 3 },
      ],
    });
    const [joined, inserted, updated, altered, counted, syntax, missing] = result.statements;
    expect(joined).toMatchObject({
      status: 'rows',
      columns: ['nazwa', 'kategoria', 'cena'],
      rows: [
        ['Chleb żytni', 'Żywność', '6.50'],
        ['Masło; solone', 'Żywność', '8.99'],
        ['Młotek', 'Narzędzia', '34.00'],
      ],
      truncated: false,
    });
    expect(inserted).toMatchObject({ status: 'ok', affectedRows: 1 });
    expect(updated).toMatchObject({ status: 'ok', affectedRows: 2 });
    expect(altered?.status).toBe('ok');
    expect(counted).toMatchObject({ columns: ['liczba', 'ocena'], rows: [['4', null]] });
    // A learner mistake is a result to read, not an environment failure.
    expect(syntax).toMatchObject({ status: 'error', error: { code: 1064, sqlState: '42000' } });
    expect(missing).toMatchObject({ status: 'error', error: { code: 1146 } });
    expect(result.statements).toHaveLength(7);
    expect(result.serverStopped).toBe(false);
    expect(result.disclaimer).toMatch(/nie ocena CKE/);
    expect(result).not.toHaveProperty('percentage');
  });

  it('bounds runaway queries, large results and file access', async () => {
    const result = await run(
      'query-guards',
      {
        dumpPath: null,
        sql: `SELECT COUNT(*) FROM information_schema.COLUMNS a, information_schema.COLUMNS b, information_schema.COLUMNS c, information_schema.COLUMNS d;
SELECT seq FROM seq_1_to_500;
SELECT REPEAT('a', 10000) AS dlugi;
SELECT LOAD_FILE('/etc/passwd') AS plik;
SELECT 1 INTO OUTFILE '/tmp/db/wyciek.txt';
SELECT 1 INTO OUTFILE '/tmp/no-files/wyciek.txt';
SELECT 1 \\! touch /tmp/pwned.txt;
SELECT 2 AS dalej;`,
      },
      [html],
    );
    const [runaway, large, wide, file, outside, inside, client, after] = result.statements;
    expect(runaway).toMatchObject({ status: 'error', error: { code: 1969 } });
    expect(large).toMatchObject({ status: 'rows', truncated: true });
    expect(large?.rows).toHaveLength(200);
    expect(wide?.rows?.[0]?.[0]).toHaveLength(4096);
    expect(wide?.truncated).toBe(true);
    expect(file?.rows).toEqual([[null]]);
    expect(outside?.status).toBe('error');
    expect(inside?.status).toBe('error');
    // Statements go through a protocol connector: client commands are plain syntax errors.
    expect(client).toMatchObject({ status: 'error', error: { code: 1064 } });
    expect(after).toMatchObject({ status: 'rows', rows: [['2']] });
    expect(result.runtimeMs).toBeLessThan(40_000);
  });

  it('rejects client commands in a dump and executes nothing after a failed import', async () => {
    const result = await run('dump-with-client-command', { sql: 'SELECT 1;' }, [
      html,
      {
        path: 'baza.sql',
        content: 'CREATE TABLE a (id INT);\nsystem touch /tmp/pwned.txt\nINSERT INTO a VALUES (1);',
      },
    ]);
    expect(result.import?.ok).toBe(false);
    expect(result.import?.error).toMatch(/polecenie klienta bazy/);
    expect(result.statements).toEqual([]);

    const broken = await run('dump-with-syntax-error', {}, [
      html,
      { path: 'baza.sql', content: 'CREATE TABLE a (id INT);\nINSERT INTO a VALUES (1;\n' },
    ]);
    expect(broken.import?.ok).toBe(false);
    expect(broken.import?.error).toMatch(/ERROR 1064 .* at line 2/);
  });

  it('survives a learner stopping their own server and serves the next run', async () => {
    const stopped = await run('learner-shutdown', { sql: 'SHUTDOWN; SELECT 1;' }, base());
    expect(stopped.serverStopped).toBe(true);
    expect(stopped.statements[1]?.status).not.toBe('rows');

    const next = await run('after-shutdown', { sql: 'SELECT COUNT(*) FROM produkty;' }, base());
    expect(next.statements[0]).toMatchObject({ status: 'rows', rows: [['3']] });
  });

  it('renders a mysqli page with GET fields after the learner statements', async () => {
    const result = await run(
      'php-mysqli-get',
      {
        sql: "INSERT INTO produkty (kategorie_id, nazwa, cena, dodano) VALUES (2, 'Dłuto', 21.00, '2024-04-01');",
        php: { entry: 'sklep.php', method: 'GET', fields: [['kategoria', '2']] },
      },
      base([
        {
          path: 'sklep.php',
          content: php(
            `$db = mysqli_connect('localhost', 'root', '', 'Sklep_2024'); mysqli_set_charset($db, 'utf8mb4');
$id = (int) ($_GET['kategoria'] ?? 0);
$wynik = mysqli_query($db, "SELECT nazwa FROM produkty WHERE kategorie_id = $id ORDER BY id");
echo '<ul id="lista">'; while ($w = mysqli_fetch_assoc($wynik)) echo '<li>' . htmlspecialchars($w['nazwa']) . '</li>'; echo '</ul>';
$gniazdo = @stream_socket_client('tcp://192.0.2.1:80', $kod, $opis, 0.5);
echo '<p id="siec">' . ($gniazdo === false ? 'NET_BLOCKED' : 'NET_OPEN') . '</p>';`,
          ),
        },
      ]),
    );
    expect(result.php).toMatchObject({ status: 200, truncated: false });
    expect(result.php?.finalPath).toBe('/sklep.php?kategoria=2');
    expect(result.php?.html).toContain('<li>Młotek</li><li>Dłuto</li>');
    expect(result.php?.html).not.toContain('Chleb');
    expect(result.php?.html).toContain('NET_BLOCKED');
  });

  it('sends POST fields to a PDO page', async () => {
    const result = await run(
      'php-pdo-post',
      {
        php: {
          entry: 'szukaj.php',
          method: 'POST',
          fields: [
            ['fraza', 'Masło; solone'],
            ['tryb', 'dokładny'],
          ],
        },
      },
      base([
        {
          path: 'szukaj.php',
          content: `<?php $pdo = new PDO('mysql:host=localhost;dbname=Sklep_2024;charset=utf8mb4', 'root', '', [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);
$pytanie = $pdo->prepare('SELECT cena FROM produkty WHERE nazwa = ?'); $pytanie->execute([$_POST['fraza'] ?? '']);
echo '<p id="wynik">' . $_SERVER['REQUEST_METHOD'] . ' ' . htmlspecialchars($_POST['tryb'] ?? '') . ' ' . $pytanie->fetchColumn() . '</p>';`,
        },
      ]),
    );
    expect(result.php?.status).toBe(200);
    expect(result.php?.html).toContain('<p id="wynik">POST dokładny 8.99</p>');
  });

  it('returns PHP messages for a wrong database name and bounds an endless page', async () => {
    const wrong = await run(
      'php-wrong-database',
      { php: { entry: 'zla.php', method: 'GET', fields: [] } },
      base([
        {
          path: 'zla.php',
          content:
            "<?php $db = mysqli_connect('localhost', 'root', '', 'sklep_literowka'); echo 'po polaczeniu';",
        },
      ]),
    );
    expect(wrong.php?.messages).toMatch(/Unknown database 'sklep_literowka'/);
    expect(wrong.php?.html).not.toContain('po polaczeniu');

    const endless = await run(
      'php-endless-loop',
      { php: { entry: 'petla.php', method: 'GET', fields: [] } },
      base([{ path: 'petla.php', content: '<?php while (true) {}' }]),
    );
    expect(endless.php?.html ?? '').not.toContain('<li>');
    expect(endless.runtimeMs).toBeLessThan(45_000);

    const next = await run('after-endless-loop', { sql: 'SELECT 1;' }, base());
    expect(next.statements[0]?.status).toBe('rows');
  });
});
