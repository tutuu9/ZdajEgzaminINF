import { afterAll, describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { mkdir, readdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { command, runStudyProject, studyInputHash } from '@zdaj/checker';
import type { StudyCheckReport } from '@zdaj/shared';
import { firmaFixtures } from '../fixtures/study/firma.js';
import { salonFixtures } from '../fixtures/study/salon.js';
import { chatFixtures, chatReplies } from '../fixtures/study/chat.js';
import type { StudyProjectFixture } from '../fixtures/study/projects.js';

const suiteId = randomUUID();
const dataDir = path.resolve('data', `new-study-runtime-${suiteId}`);
const samples: { taskId: string; variant: string; durationMs: number; status: string }[] = [];

/** Fail loudly if fixture changes make an intended mutation a no-op. */
function mutate(
  fixture: StudyProjectFixture,
  name: string,
  filePath: string,
  source: string,
  replacement: string,
): StudyProjectFixture {
  const original = fixture.files.find((file) => file.path === filePath);
  expect(original, `Missing fixture file ${filePath}`).toBeDefined();
  expect(original!.content.split(source)).toHaveLength(2);
  return {
    ...fixture,
    variant: name,
    files: fixture.files.map((file) =>
      file.path === filePath
        ? { ...file, content: file.content.replace(source, replacement) }
        : { ...file },
    ),
  };
}

async function check(fixture: StudyProjectFixture, timeoutMs?: number): Promise<StudyCheckReport> {
  const started = Date.now();
  const jobId = randomUUID();
  let status = 'error';
  try {
    const report = await runStudyProject(
      {
        taskId: fixture.taskId,
        taskVersion: 1,
        guideId: `study-${fixture.taskId}`,
        guideVersion: 1,
        activityId: 'runtime/runtime-check',
        projectRevision: 7,
        inputHash: studyInputHash(fixture.files),
        criterionId: 'runtime',
        criterionTitle: 'Kontrola edukacyjna',
      },
      fixture.files,
      { dataDir, profile: 'local-development', jobId, timeoutMs },
    );
    status = report.status;
    expect(report).not.toHaveProperty('percentage');
    expect(report.projectRevision).toBe(7);
    expect(report.inputHash).toBe(studyInputHash(fixture.files));
    expect(report.disclaimer).toContain('nie ocena całego arkusza CKE');
    return report;
  } finally {
    samples.push({
      taskId: fixture.taskId,
      variant: fixture.variant,
      durationMs: Date.now() - started,
      status,
    });
    expect(await readdir(path.join(dataDir, 'sandbox')).catch(() => [])).toEqual([]);
    const containers = await command(['ps', '-aq', '--filter', `label=zdaj.job=${jobId}`]);
    expect(containers.code).toBe(0);
    expect(containers.stdout.trim(), 'The owned sandbox must be removed even after failure.').toBe(
      '',
    );
  }
}

async function expectFailure(fixture: StudyProjectFixture, evidence: string | RegExp) {
  const report = await check(fixture);
  expect(report.status, JSON.stringify(report.results)).toBe('failed');
  expect(report.results[0]?.evidence).toMatch(evidence);
}

async function expectManual(fixture: StudyProjectFixture, evidence: string | RegExp) {
  const report = await check(fixture);
  expect(report.status, JSON.stringify(report.results)).toBe('unsupported');
  expect(report.results[0]?.status).toBe('manual');
  expect(report.results[0]?.evidence).toMatch(evidence);
}

afterAll(async () => {
  await mkdir('artifacts', { recursive: true });
  await writeFile(
    'artifacts/new-study-runtime-report.json',
    JSON.stringify(
      {
        recordedAt: new Date().toISOString(),
        profile: 'local-development',
        scope:
          'Fixed JavaScript scenarios in Docker Desktop/runc. This does not certify public gVisor isolation.',
        samples,
      },
      null,
      2,
    ),
  );
  if (
    !dataDir.startsWith(path.resolve('data') + path.sep) ||
    path.basename(dataDir) !== `new-study-runtime-${suiteId}`
  )
    throw new Error('Unsafe runtime fixture cleanup path.');
  await rm(dataDir, { recursive: true, force: true });
});

describe('Firma IT trusted runtime adapter', () => {
  for (const fixture of firmaFixtures)
    it(`accepts ${fixture.variant}`, async () => {
      const report = await check(fixture);
      expect(report.status, JSON.stringify(report.results)).toBe('passed');
      expect(report.results[0]?.evidence).toContain('Dwa zestawy danych z polskimi znakami');
    });

  it('accepts the visible text color applied to nested spans', async () => {
    const listener = `document.querySelector('button[type="button"]').addEventListener('click', showRequest);`;
    const wrapped = mutate(
      firmaFixtures[0]!,
      'visible-span-colors',
      'kontakt.js',
      listener,
      listener +
        `
document.querySelector('button[type="button"]').addEventListener('click', () => {
  const paragraph = document.querySelector('.result');
  const agreed = document.getElementById('zgoda').checked;
  const span = document.createElement('span');
  span.style.color = agreed ? 'Navy' : 'red';
  span.append(...paragraph.childNodes);
  paragraph.replaceChildren(span);
  paragraph.style.color = agreed ? 'red' : 'Navy';
});`,
    );
    const report = await check(wrapped);
    expect(report.status, JSON.stringify(report.results)).toBe('passed');
  });

  it('rejects sending the request before agreement', async () => {
    await expectFailure(
      mutate(
        firmaFixtures[0]!,
        'missing-consent-branch',
        'kontakt.js',
        'if (!consent)',
        'if (false)',
      ),
      /Bez zaznaczenia regulaminu/,
    );
  });

  it('rejects omitted Polish uppercase conversion', async () => {
    await expectFailure(
      mutate(
        firmaFixtures[0]!,
        'missing-uppercase',
        'kontakt.js',
        'firstName.toUpperCase()',
        'firstName',
      ),
      /ŁUCJA ŻÓŁKOWSKA/,
    );
  });

  it('rejects stale input captured before the next submitted request', async () => {
    await expectFailure(
      mutate(
        firmaFixtures[0]!,
        'cached-first-request',
        'kontakt.js',
        "const firstName = document.getElementById('imie').value;",
        "const firstName = (window.cachedFirstName ??= document.getElementById('imie').value);",
      ),
      /PAWEŁ ĆWIK/,
    );
  });

  for (const [source, replacement, evidence] of [
    ["result.style.color = 'red'", "result.style.color = 'Navy'", /czerwony kolor/],
    ["result.style.color = 'Navy'", "result.style.color = 'red'", /kolor Navy/],
  ] as const)
    it(`rejects incorrect result color: ${source}`, async () => {
      await expectFailure(
        mutate(firmaFixtures[0]!, 'wrong-result-color', 'kontakt.js', source, replacement),
        evidence,
      );
    });

  it('rejects a result paragraph placed above the horizontal line', async () => {
    await expectFailure(
      mutate(
        firmaFixtures[0]!,
        'result-above-line',
        'kontakt.html',
        '<hr><p class="result"></p>',
        '<p class="result"></p><hr>',
      ),
      /pod linią poziomą/,
    );
  });

  it('rejects an omitted line break between the name and request', async () => {
    await expectFailure(
      mutate(
        firmaFixtures[0]!,
        'missing-line-break',
        'kontakt.js',
        "document.createElement('br')",
        "document.createTextNode(' ')",
      ),
      /łamania linii/,
    );
  });

  it('rejects a reset button that leaves entered data in the form', async () => {
    await expectFailure(
      mutate(
        firmaFixtures[0]!,
        'reset-does-nothing',
        'kontakt.html',
        'type="reset"',
        'type="submit" onclick="event.preventDefault()"',
      ),
      /Resetuj powinien wyczyścić/,
    );
  });
});

describe('Salon trusted runtime adapter', () => {
  for (const fixture of salonFixtures)
    it(`accepts all 16 price combinations using ${fixture.variant}`, async () => {
      const report = await check(fixture);
      expect(report.status, JSON.stringify(report.results)).toBe('passed');
      expect(report.results[0]?.evidence).toContain('wszystkie 16 zestawów');
    });

  it('rejects one wrong service price', async () => {
    await expectFailure(
      mutate(salonFixtures[0]!, 'wrong-makeup-price', 'salon.js', 'sum += 50', 'sum += 49'),
      /Makijaż oczekiwano 50/,
    );
  });

  it('rejects a wrong total only for an intermediate three-service subset', async () => {
    const total = "'Cena zabiegów: ' + sum";
    const changed =
      "'Cena zabiegów: ' + (document.getElementById('peeling').checked && !document.getElementById('maska').checked && document.getElementById('masaz').checked && document.getElementById('makijaz').checked ? sum + 1 : sum)";
    await expectFailure(
      mutate(salonFixtures[0]!, 'wrong-subset-13', 'salon.js', total, changed),
      /Peeling, Masaż twarzy, Makijaż oczekiwano 115/,
    );
  });

  it('rejects totals accumulated from previous clicks', async () => {
    await expectFailure(
      mutate(
        salonFixtures[0]!,
        'accumulated-price',
        'salon.js',
        'function calculateTreatments() {\n  let sum = 0;',
        'let sum = 0;\nfunction calculateTreatments() {',
      ),
      /Przy każdym kliknięciu zacznij sumę od zera/,
    );
  });

  it('rejects a correct price displayed above its calculation button', async () => {
    await expectFailure(
      mutate(
        salonFixtures[0]!,
        'price-above-button',
        'twarz.html',
        '<button type="button">Oblicz cenę</button><p class="price"></p>',
        '<p class="price"></p><button type="button">Oblicz cenę</button>',
      ),
      /pod przyciskiem/,
    );
  });
});

describe('Chat trusted runtime adapter', () => {
  for (const fixture of chatFixtures)
    it(`accepts nine replies and preserved scrolling history using ${fixture.variant}`, async () => {
      const report = await check(fixture);
      expect(report.status, JSON.stringify(report.results)).toBe('passed');
      expect(report.results[0]?.evidence).toContain('wszystkie dziewięć');
    });

  it('accepts a different reply order and round-based index selection', async () => {
    const reordered = mutate(
      chatFixtures[0]!,
      'reversed-replies',
      'chat.js',
      `const answers = ${JSON.stringify(chatReplies)};`,
      `const answers = ${JSON.stringify([...chatReplies].reverse())};`,
    );
    const rounded = mutate(
      reordered,
      'reversed-replies-rounded-index',
      'chat.js',
      'Math.floor(Math.random() * answers.length)',
      'Math.round(Math.random() * (answers.length - 1))',
    );
    const report = await check(rounded);
    expect(report.status, JSON.stringify(report.results)).toBe('passed');
  });

  it('rejects replacing earlier messages instead of appending', async () => {
    await expectFailure(
      mutate(
        chatFixtures[0]!,
        'erased-history',
        'chat.js',
        'conversation.appendChild(message);',
        'conversation.replaceChildren(message);',
      ),
      /Zachowaj wszystkie wcześniejsze wiadomości/,
    );
  });

  it('does not award full success when only eight replies were observed', async () => {
    // The scenario does not inspect source: finite observations cannot prove
    // whether the ninth reply is unreachable or merely absent from this sample.
    await expectManual(
      mutate(
        chatFixtures[0]!,
        'only-eight-replies',
        'chat.js',
        'Math.random() * answers.length',
        'Math.random() * 8',
      ),
      /uzyskano 8 z dziewięciu/,
    );
  });

  it('rejects a random index outside the nine-element array', async () => {
    await expectFailure(
      mutate(
        chatFixtures[0]!,
        'out-of-range-reply',
        'chat.js',
        'Math.floor(Math.random() * answers.length)',
        'Math.round(Math.random() * answers.length)',
      ),
      /granice indeksu 0–8/,
    );
  });

  it('rejects the wrong author image on appended responses', async () => {
    await expectFailure(
      mutate(
        chatFixtures[0]!,
        'wrong-remote-avatar',
        'chat.js',
        "avatar.src = author === 'jolanta' ? 'Jolka.jpg' : 'Krzysiek.jpg';",
        "avatar.src = 'Jolka.jpg';",
      ),
      /obrazu Krzysiek.jpg/,
    );
  });

  for (const author of ['jolanta', 'krzysztof'])
    it(`rejects scrolling omitted for ${author}`, async () => {
      const other = author === 'jolanta' ? 'krzysztof' : 'jolanta';
      await expectFailure(
        mutate(
          chatFixtures[0]!,
          `no-${author}-scroll`,
          'chat.js',
          'conversation.scrollTop = conversation.scrollHeight;',
          `if (author === '${other}') conversation.scrollTop = conversation.scrollHeight;`,
        ),
        /przewiń wypełniony blok chatu/,
      );
    });

  it('requests manual verification when its controlled sampler cannot establish the reply range', async () => {
    // An uncontrolled source can produce one value throughout this bounded observation.
    // It must not be called a verified random implementation or an automatic success.
    const fixture = mutate(
      chatFixtures[0]!,
      'uncontrolled-random-source',
      'chat.js',
      'Math.random()',
      '0.5',
    );
    await expectManual(fixture, /Samodzielnie sprawdź pełną tablicę i zakres wyboru/);
  });

  it('does not fail a valid uniform scaled-modulo random index', async () => {
    await expectManual(
      mutate(
        chatFixtures[0]!,
        'valid-scaled-modulo',
        'chat.js',
        'Math.floor(Math.random() * answers.length)',
        'Math.floor(Math.random() * 90) % 9',
      ),
      /nie rozstrzyga, czy pozostałe są osiągalne/,
    );
  });

  it('keeps an unsteerable crypto sample manual despite unrelated Math.random calls', async () => {
    const declaration = `const answers = ${JSON.stringify(chatReplies)};`;
    // Deterministic test provider: the uncontrolled crypto source happens to
    // yield the same word during this finite run. It is not a correctness claim.
    const sampled = mutate(
      chatFixtures[0]!,
      'fixed-crypto-observations',
      'chat.js',
      declaration,
      `crypto.getRandomValues = (target) => { target[0] = 4; return target; };\n${declaration}`,
    );
    const fixture = mutate(
      sampled,
      'crypto-with-unrelated-math',
      'chat.js',
      'Math.floor(Math.random() * answers.length)',
      '(Math.random(), crypto.getRandomValues(new Uint32Array(1))[0] % answers.length)',
    );
    await expectManual(fixture, /uzyskano 1 z dziewięciu/);
  });

  it('bounds an infinite reply handler, cleans it up and accepts the next job', async () => {
    const fixture = mutate(
      chatFixtures[0]!,
      'infinite-reply-handler',
      'chat.js',
      'function randomAnswer() {',
      'function randomAnswer() { while (true) {}',
    );
    const started = Date.now();
    try {
      const report = await check(fixture, 25_000);
      expect(['failed', 'error']).toContain(report.status);
    } catch (error) {
      expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).toBe('Przekroczono czas oczekiwania na środowisko.');
    }
    // The two trusted Docker probes have their own 30-second startup bounds.
    expect(Date.now() - started).toBeLessThan(100_000);
    const report = await check(chatFixtures[0]!);
    expect(report.status, JSON.stringify(report.results)).toBe('passed');
  }, 120_000);
});
