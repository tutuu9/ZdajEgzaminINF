import { describe, expect, it } from 'vitest';
import type { ProjectFile, SandboxRunResult } from '@zdaj/shared';
import {
  MAX_AI_FILE_CHARACTERS,
  MAX_FINDINGS_CHARACTERS,
  collectFindings,
  lineAt,
  missingReferences,
  selectAiFiles,
} from '../apps/web/src/ai-findings';

const text = (path: string, content: string): ProjectFile => ({ path, content });
const page = `<!DOCTYPE html>
<html lang="pl">
<head>
  <link rel="stylesheet" href="styl.css">
  <script src="./js/Skrypt.js"></script>
</head>
<body>
  <img src="baner.png" alt="baner">
  <a href="https://cke.gov.pl/">CKE</a>
  <a href="#gora">Do góry</a>
  <a href="raty.html?x=1#y">Raty</a>
  <form action="<?php echo $cel; ?>"></form>
</body>
</html>`;

describe('project findings for the assistant', () => {
  it('finds the line of an offset', () => {
    expect(lineAt('a\nb\nc', 0)).toBe(1);
    expect(lineAt('a\nb\nc', 4)).toBe(3);
  });

  it('reports links to files the project does not have, with the line', () => {
    const files = [
      text('index.html', page),
      text('style.css', 'body { background: url("img/tlo.png"); }'),
      text('js/skrypt.js', ''),
      text('raty.html', '<p>Raty</p>'),
    ];
    expect(missingReferences(files)).toEqual([
      { path: 'index.html', line: 4, source: 'href="styl.css"', target: 'styl.css' },
      {
        path: 'index.html',
        line: 5,
        source: 'src="./js/Skrypt.js"',
        target: 'js/Skrypt.js',
        similar: 'js/skrypt.js',
      },
      { path: 'index.html', line: 8, source: 'src="baner.png"', target: 'baner.png' },
      { path: 'style.css', line: 1, source: 'url="img/tlo.png"', target: 'img/tlo.png' },
    ]);
  });

  it('stays silent about a consistent project', () => {
    const files = [
      text('index.html', '<link rel="stylesheet" href="style.css"><img src="logo.png">'),
      text('style.css', 'body { margin: 0; }'),
      { path: 'logo.png', content: 'AAAA', encoding: 'base64' as const },
    ];
    expect(collectFindings({ files, requiredFiles: ['index.html', 'STYLE.css', 'logo.png'] })).toBe(
      '',
    );
  });

  it('collects missing deliverables, failed checks, console errors and failed queries', () => {
    const files = [text('index.html', page), text('raty.html', ' '), text('raty.js', 'let a = ;')];
    const run: SandboxRunResult = {
      database: 'obuwie',
      import: { ok: false, error: 'Table already exists', tables: null },
      statements: [
        { index: 0, text: 'SELECT 1', status: 'ok' },
        {
          index: 1,
          text: 'SELEC nazwa FROM buty',
          status: 'error',
          error: { code: 1064, sqlState: '42000', message: 'You have an error in your SQL syntax' },
        },
      ],
      omittedStatements: 0,
      php: {
        status: 500,
        contentType: 'text/html',
        html: '',
        truncated: false,
        finalPath: 'index.php',
        messages: 'PHP Fatal error: Uncaught mysqli_sql_exception in index.php:7',
      },
      serverStopped: false,
      runtimeMs: 10,
      disclaimer: '',
    };
    const findings = collectFindings({
      files,
      requiredFiles: ['index.html', 'style.css', 'kwerendy.txt'],
      checks: [
        {
          activity: 'Połącz z arkuszem stylów',
          result: {
            id: 'stylesheet-1',
            title: 'HTML: link[rel="stylesheet"]',
            status: 'failed',
            evidence: 'Atrybut href ma inną wartość.',
            recommendation: 'Porównaj nazwę pliku z arkuszem.',
          },
          diagnostic: {
            path: 'index.html',
            explanation: 'Ten link wskazuje inny plik.',
            range: { from: page.indexOf('<link'), to: page.indexOf('<link') + 5 },
          },
        },
        {
          activity: 'Nazwij kartę',
          result: { id: 't', title: 'title', status: 'passed', evidence: '', recommendation: '' },
        },
      ],
      console: [
        { level: 'log', text: 'start' },
        {
          level: 'error',
          text: 'Uncaught SyntaxError: Unexpected token ;',
          file: 'raty.js',
          line: 1,
        },
      ],
      run,
    });
    expect(findings).toContain(
      'Wymagane pliki, których jeszcze nie ma w projekcie: style.css, kwerendy.txt',
    );
    expect(findings).toContain('Puste pliki: raty.html');
    expect(findings).toContain('- index.html:4 href="styl.css" → brak pliku styl.css');
    expect(findings).toContain(
      '- „Połącz z arkuszem stylów” · HTML: link[rel="stylesheet"]: Atrybut href ma inną wartość. Porównaj nazwę pliku z arkuszem. [index.html:4: Ten link wskazuje inny plik.]',
    );
    expect(findings).not.toContain('Nazwij kartę');
    expect(findings).toContain('- error: Uncaught SyntaxError: Unexpected token ; (raty.js:1)');
    expect(findings).not.toContain('start');
    expect(findings).toContain('- import bazy obuwie: Table already exists');
    expect(findings).toContain(
      '- zapytanie 2 „SELEC nazwa FROM buty”: [1064] You have an error in your SQL syntax',
    );
    expect(findings).toContain('- strona PHP odpowiedziała kodem 500');
    expect(findings).toContain('mysqli_sql_exception');
  });

  it('never exceeds the size accepted by the server', () => {
    const files = [
      text(
        'index.html',
        Array.from({ length: 400 }, (_, index) => `<img src="obraz-${index}.png">`).join('\n'),
      ),
    ];
    const findings = collectFindings({
      files,
      checks: Array.from({ length: 30 }, (_, index) => ({
        activity: `Czynność ${index}`,
        result: {
          id: `c${index}`,
          title: 'HTML: body > nav',
          status: 'failed' as const,
          evidence: 'e'.repeat(500),
          recommendation: 'r'.repeat(500),
        },
        diagnostic: { path: 'index.html', explanation: 'd'.repeat(500) },
      })),
      console: Array.from({ length: 50 }, () => ({
        level: 'error' as const,
        text: 'x'.repeat(1900),
      })),
    });
    expect(findings.length).toBeLessThanOrEqual(MAX_FINDINGS_CHARACTERS);
    expect(findings).toContain('pominięto dalsze pozycje');
  });

  it('selects readable text files and leaves out images, huge dumps and unsafe names', () => {
    const files: ProjectFile[] = [
      text('index.html', '<p>a</p>'),
      text('style.css', 'p{}'),
      text('pusty.txt', ''),
      text('baza.sql', 'x'.repeat(MAX_AI_FILE_CHARACTERS + 1)),
      text('zly[1].js', 'let a;'),
      { path: 'logo.png', content: 'AAAA', encoding: 'base64' },
    ];
    const selection = selectAiFiles(files, 'index.html');
    expect(selection.active).toEqual({ path: 'index.html', content: '<p>a</p>' });
    expect(selection.files).toEqual([{ path: 'style.css', content: 'p{}' }]);
    expect(selection.fileNames).toEqual([
      'index.html',
      'style.css',
      'pusty.txt',
      'baza.sql',
      'logo.png',
    ]);
    expect(selectAiFiles(files, 'logo.png').active).toBeUndefined();
  });
});
