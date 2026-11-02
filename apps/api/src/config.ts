import { config as loadEnv } from 'dotenv';
import { randomBytes } from 'node:crypto';
import { resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const projectRoot = fileURLToPath(new URL('../../../', import.meta.url));
loadEnv({ path: join(projectRoot, '.env'), quiet: true });

export const config = {
  port: Number(process.env.API_PORT ?? process.env.PORT ?? 3001),
  host: process.env.API_HOST ?? process.env.HOST ?? '127.0.0.1',
  dataDir: resolve(projectRoot, process.env.DATA_DIR ?? '.data'),
  production: process.env.NODE_ENV === 'production',
  secret: process.env.APP_SECRET ?? process.env.SESSION_SECRET ?? randomBytes(48).toString('hex'),
  ipSecret: process.env.IP_HASH_SECRET,
  origins: new Set(
    (
      process.env.APP_ORIGIN ??
      process.env.WEB_ORIGIN ??
      process.env.FRONTEND_ORIGIN ??
      'http://localhost:5173,http://127.0.0.1:5173,http://localhost:3001,http://127.0.0.1:3001'
    )
      .split(',')
      .map((x) => x.trim()),
  ),
  deepseekKey: process.env.DEEPSEEK_API_KEY ?? '',
  runnerProfile: process.env.RUNNER_PROFILE ?? 'local-development',
  publicSandboxVerified: process.env.PUBLIC_SANDBOX_VERIFIED === 'true',
};
if (!['local-development', 'public-sandbox'].includes(config.runnerProfile)) {
  throw new Error('RUNNER_PROFILE must be local-development or public-sandbox.');
}
if (
  config.production &&
  ((!process.env.APP_SECRET && !process.env.SESSION_SECRET) || config.secret.length < 32)
) {
  throw new Error('APP_SECRET of at least 32 characters is required in production.');
}
for (const origin of [...config.origins]) {
  const local = new URL(origin);
  if (local.hostname === 'localhost' || local.hostname === '127.0.0.1') {
    local.hostname = local.hostname === 'localhost' ? '127.0.0.1' : 'localhost';
    config.origins.add(local.origin);
  }
}
export const DAY_MS = 86_400_000;
