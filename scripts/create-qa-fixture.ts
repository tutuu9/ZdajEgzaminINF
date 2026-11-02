import { zipSync, strToU8 } from 'fflate';
import { validSolutions } from '../fixtures/content/index.js';
import { mkdir, writeFile } from 'node:fs/promises';
await mkdir('artifacts', { recursive: true });
await writeFile(
  'artifacts/warsztaty-qa.zip',
  zipSync(Object.fromEntries(validSolutions.warsztaty[0].map((f) => [f.path, strToU8(f.content)]))),
);
