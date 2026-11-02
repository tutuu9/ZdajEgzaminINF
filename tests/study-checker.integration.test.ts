import { afterAll, describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { mkdir, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { ProjectFile } from '@zdaj/shared';
import { command, runStudyProject, studyInputHash } from '@zdaj/checker';
import { invalidStudyProjects, validStudyProjects } from '../fixtures/study/projects.js';

const dataDir = path.resolve('data', 'study-checker-tests');
const samples: { adapter: string; durationMs: number; status: string }[] = [];
const calculatorHtml = `<!doctype html><html lang="pl"><head><meta charset="utf-8"><title>Kursy</title></head><body>
<input id="react" type="checkbox"><label for="react">Kurs React.js</label>
<input id="javascript" type="checkbox"><label for="javascript">Kurs JavaScript</label>
<input id="raty" type="number"><select id="miasto"><option>Warszawa</option><option>Katowice</option><option>Gdańsk</option></select>
<button id="oblicz" type="button">Oblicz</button><p id="wynik"></p><script src="raty.js"></script></body></html>`;
const calculatorA = `document.getElementById('oblicz').onclick = function () {
 const count = document.getElementById('raty').valueAsNumber;
 let total = 0;
 if (document.getElementById('react').checked) total += 5000;
 if (document.getElementById('javascript').checked) total += 3000;
 document.getElementById('wynik').textContent = 'Kurs odbędzie się w ' + document.getElementById('miasto').value + '. Koszt całkowity: ' + total + ' zł. Płacisz ' + count + ' rat po ' + total / count + ' zł';
};`;
const calculatorB = `document.querySelector('#oblicz').addEventListener('click', () => {
 const count = Number(document.querySelector('#raty').value);
 const total = [...document.querySelectorAll('input[type=checkbox]')].reduce((sum, field, index) => sum + (field.checked ? [5000, 3000][index] : 0), 0);
 document.querySelector('#wynik').innerText = ['Kurs odbędzie się w', document.querySelector('select').value, '. Koszt całkowity:', total.toFixed(2).replace('.', ','), 'zł. Płacisz', count, 'rat po', (total/count).toFixed(2).replace('.', ','), 'zł'].join(' ');
});`;
const dragonPhp = `<?php throw new Exception('This PHP must never execute in a JS check'); ?>
<!doctype html><html lang="pl"><head><meta charset="utf-8"><title>Smoki</title><style>#opisy,#galeria{display:none}nav>button{background-color:#FFAEA5}</style></head><body>
<nav><button id="nav-baza">Baza</button><button id="nav-opisy">Opisy</button><button id="nav-galeria">Galeria</button></nav>
<main><section id="baza">Baza smoków</section><section id="opisy">Opisy smoków</section><section id="galeria">Galeria smoków</section></main>
<script src="widoki.js"></script></body></html>`;
const dragonA = `const ids = ['baza', 'opisy', 'galeria'];
function show(active) { for (const id of ids) { document.getElementById(id).style.display = id === active ? 'block' : 'none'; document.getElementById('nav-' + id).style.backgroundColor = id === active ? 'MistyRose' : '#FFAEA5'; } }
for (const id of ids) document.getElementById('nav-' + id).onclick = () => show(id);`;
const dragonB = `document.querySelector('nav').addEventListener('click', event => {
 const chosen = event.target.id.replace('nav-', '');
 ['baza','opisy','galeria'].forEach(id => { document.querySelector('#'+id).style.display = chosen === id ? 'block' : 'none'; document.querySelector('#nav-'+id).style.backgroundColor = chosen === id ? '#ffe4e1' : 'rgb(255,174,165)'; });
});`;
const calculator = (code: string): ProjectFile[] => [
  { path: 'raty.html', content: calculatorHtml },
  { path: 'raty.js', content: code },
];
const dragons = (code: string): ProjectFile[] => [
  { path: 'smoki.php', content: dragonPhp },
  { path: 'widoki.js', content: code },
];

async function check(kind: 'kursy' | 'smoki', files: ProjectFile[], timeoutMs?: number) {
  const started = Date.now();
  const report = await runStudyProject(
    {
      taskId: kind === 'kursy' ? 'inf03-01-25-01-sg' : 'inf03-08-25-06-sg',
      taskVersion: 1,
      guideId: `study-${kind}`,
      guideVersion: 3,
      activityId: kind === 'kursy' ? 'calculator/calculator-check' : 'tabs/tabs-check',
      projectRevision: 4,
      inputHash: studyInputHash(files),
      criterionId: 'runtime',
      criterionTitle: 'Kontrola edukacyjna',
    },
    files,
    { dataDir, profile: 'local-development', jobId: randomUUID(), timeoutMs },
  );
  samples.push({ adapter: kind, durationMs: Date.now() - started, status: report.status });
  expect(report).not.toHaveProperty('percentage');
  expect(report.projectRevision).toBe(4);
  expect(report.inputHash).toBe(studyInputHash(files));
  return report;
}
afterAll(async () => {
  await mkdir('artifacts', { recursive: true });
  await writeFile(
    'artifacts/study-checker-report.json',
    JSON.stringify(
      { recordedAt: new Date().toISOString(), profile: 'local-development', samples },
      null,
      2,
    ),
  );
});

describe('educational JavaScript adapters in the isolated runtime', () => {
  for (const [name, code] of [
    ['event property', calculatorA],
    ['listener and reduction', calculatorB],
  ])
    it(`accepts calculator using ${name}`, async () => {
      const report = await check('kursy', calculator(code!));
      expect(report.status, JSON.stringify(report.results)).toBe('passed');
    });
  for (const [name, code] of [
    ['function and loop', dragonA],
    ['delegated event', dragonB],
  ])
    it(`accepts dragon tabs using ${name} without executing PHP`, async () => {
      const report = await check('smoki', dragons(code!));
      expect(report.status, JSON.stringify(report.results)).toBe('passed');
    });
  it('reports an incorrect total as a learning failure', async () => {
    const calculatorReport = await check(
      'kursy',
      calculator(calculatorA.replace('total += 5000', 'total += 50')),
    );
    expect(calculatorReport.status).toBe('failed');
    expect(calculatorReport.results[0]?.evidence).toContain('oczekiwano');
  });
  it('reports an incomplete section switch as a learning failure', async () => {
    const tabsReport = await check(
      'smoki',
      dragons(dragonA.replace("id === active ? 'block' : 'none'", "'block'")),
    );
    expect(tabsReport.status).toBe('failed');
  });
  it('bounds an infinite JavaScript loop and accepts the next ordinary job', async () => {
    const start = Date.now();
    try {
      const looping = await check('kursy', calculator('while(true){}'), 25_000);
      expect(['failed', 'error']).toContain(looping.status);
    } catch (error) {
      // A stuck browser can require the outer container deadline. The worker then
      // exposes an infrastructure failure, with no invented grade or percentage.
      expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).toBe('Przekroczono czas oczekiwania na środowisko.');
    }
    // Up to two 30 s Docker probes precede the separate 25 s execution deadline.
    expect(Date.now() - start).toBeLessThan(100_000);
    expect((await check('kursy', calculator(calculatorA))).status).toBe('passed');
  }, 120_000);
  for (const fixture of validStudyProjects.filter((item) => item.taskId !== 'cke-wedkowanie'))
    it(`accepts the complete ${fixture.taskId} project: ${fixture.variant}`, async () => {
      const kind = fixture.taskId === 'inf03-01-25-01-sg' ? 'kursy' : 'smoki';
      const report = await check(kind, fixture.files);
      expect(report.status, JSON.stringify(report.results)).toBe('passed');
      expect(report.disclaimer).toContain('Kod PHP i zapytania SQL nie są wykonywane');
    });
  for (const { fixture } of invalidStudyProjects.filter((item) => item.expected === 'runtime'))
    it(`rejects the complete project runtime fault: ${fixture.variant}`, async () => {
      const kind = fixture.taskId === 'inf03-01-25-01-sg' ? 'kursy' : 'smoki';
      const report = await check(kind, fixture.files);
      expect(report.status, JSON.stringify(report.results)).toBe('failed');
      expect(report.results[0]?.evidence).toBeTruthy();
    });
  it('does not let a forged virtual HTML entry replace a missing PHP project file', async () => {
    const report = await check('smoki', [
      { path: '__study_smoki.html', content: dragonPhp.replace(/<\?php[\s\S]*?\?>/, '') },
      { path: 'widoki.js', content: dragonA },
    ]);
    expect(report.status).toBe('failed');
  });
  it('cleans sandbox directories and containers after all checks', async () => {
    expect(await readdir(path.join(dataDir, 'sandbox')).catch(() => [])).toEqual([]);
    const containers = await command(['ps', '-aq', '--filter', 'label=zdaj.role=sandbox']);
    expect(containers.stdout.trim()).toBe('');
  });
});
