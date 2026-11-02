import { isIP } from 'node:net';
import type { PrismaClient } from '@prisma/client';

/** Reject an accidental local/runner-enabled initialization before changing the database. */
export function validateSiteEnvironment(env: NodeJS.ProcessEnv): void {
  if (
    env.NODE_ENV !== 'production' ||
    env.RUNNER_PROFILE !== 'public-sandbox' ||
    env.PUBLIC_SANDBOX_VERIFIED !== 'false' ||
    env.DEEPSEEK_API_KEY
  ) {
    throw new Error(
      'Site-only initialization requires production, unverified public sandbox and no AI key.',
    );
  }
  const origin = new URL(env.APP_ORIGIN ?? '');
  if (
    origin.protocol !== 'https:' ||
    origin.origin !== env.APP_ORIGIN ||
    origin.username ||
    origin.password
  ) {
    throw new Error('APP_ORIGIN must be a canonical HTTPS origin without a path.');
  }
  for (const key of ['APP_SECRET', 'IP_HASH_SECRET'] as const) {
    if (!env[key] || env[key].length < 32 || env[key].startsWith('REPLACE_')) {
      throw new Error(`${key} must be a new production secret of at least 32 characters.`);
    }
  }
  if (env.APP_SECRET === env.IP_HASH_SECRET) {
    throw new Error('APP_SECRET and IP_HASH_SECRET must be different.');
  }
  const [address, prefix, extra] = (env.TRUST_PROXY ?? '').split('/');
  const family = isIP(address ?? '');
  if (
    !family ||
    extra !== undefined ||
    (prefix !== undefined && prefix !== (family === 4 ? '32' : '128'))
  ) {
    throw new Error(
      'TRUST_PROXY must be the exact nginx-side Docker gateway IP, optionally /32 or /128.',
    );
  }
}

/** Atomic JSON update preserves budgets, limits and any other existing site settings. */
export async function disableServerFeatures(db: Pick<PrismaClient, '$executeRaw'>): Promise<void> {
  const changed = await db.$executeRaw`
    UPDATE "Setting"
    SET "value" = "value" || '{"aiEnabled":false,"checkingEnabled":false}'::jsonb,
        "updatedAt" = NOW()
    WHERE "id" = 'site'
  `;
  if (changed !== 1)
    throw new Error('Seeded site settings are missing; initialization failed closed.');
}
