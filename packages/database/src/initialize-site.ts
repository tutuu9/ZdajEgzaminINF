import { execFileSync } from 'node:child_process';
import { validateSiteEnvironment, disableServerFeatures } from './site-only.js';

validateSiteEnvironment(process.env);
// This entry point runs inside the prepared Linux image, never builds on the VPS.
for (const command of ['db:migrate', 'db:seed']) {
  execFileSync('npm', ['run', command], { stdio: 'inherit', env: process.env });
}
const { db } = await import('./index.js');
try {
  await disableServerFeatures(db);
  console.log('Site-only initialization complete. Server checking and AI are disabled.');
} finally {
  await db.$disconnect();
}
