import { describe, expect, it } from 'vitest';
import { validateSiteEnvironment } from '../packages/database/src/site-only.js';

const valid = {
  NODE_ENV: 'production',
  RUNNER_PROFILE: 'public-sandbox',
  PUBLIC_SANDBOX_VERIFIED: 'false',
  APP_ORIGIN: 'https://zdajegzamin.sbs',
  APP_SECRET: 'a'.repeat(48),
  IP_HASH_SECRET: 'b'.repeat(48),
  TRUST_PROXY: '172.30.0.1/32',
};

describe('site-only initialization boundary', () => {
  it('accepts an explicit gateway with optional single-address CIDR', () => {
    for (const gateway of ['172.30.0.1', '172.30.0.1/32', 'fd00::1/128']) {
      expect(() => validateSiteEnvironment({ ...valid, TRUST_PROXY: gateway })).not.toThrow();
    }
  });

  it.each([
    { NODE_ENV: 'development' },
    { RUNNER_PROFILE: 'local-development' },
    { PUBLIC_SANDBOX_VERIFIED: 'true' },
    { DEEPSEEK_API_KEY: 'unexpected-key' },
    { APP_ORIGIN: 'http://zdajegzamin.sbs' },
    { APP_ORIGIN: 'https://zdajegzamin.sbs/faq' },
    { APP_ORIGIN: 'https://name:password@zdajegzamin.sbs' },
    { APP_SECRET: 'short' },
    { IP_HASH_SECRET: 'a'.repeat(48) },
    { IP_HASH_SECRET: 'REPLACE_WITH_A_DIFFERENT_RANDOM_SECRET_AT_LEAST_32_CHARACTERS' },
    { TRUST_PROXY: 'true' },
    { TRUST_PROXY: '172.30.0.0/16' },
    { TRUST_PROXY: '172.30.0.1/32/32' },
    { TRUST_PROXY: '172.30.0.1,172.31.0.1' },
  ])('rejects unsafe initialization settings: %j', (override) => {
    expect(() => validateSiteEnvironment({ ...valid, ...override })).toThrow();
  });
});
