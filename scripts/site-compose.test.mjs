import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

const root = fileURLToPath(new URL('../', import.meta.url));

for (const key of ['', 'synthetic-site-provider-key']) {
  test(`site configuration ${key ? 'with optional AI' : 'without AI'} keeps initialization and execution isolated`, () => {
    const configuration = JSON.parse(
      execFileSync(
        'docker',
        [
          'compose',
          '--env-file',
          'infra/site.env.example',
          '-f',
          'infra/compose.site.yaml',
          'config',
          '--format',
          'json',
        ],
        {
          cwd: root,
          encoding: 'utf8',
          env: {
            ...process.env,
            SITE_IMAGE: 'zdaj-inf-site:synthetic-config-test',
            POSTGRES_IMAGE: 'postgres:17-bookworm',
            POSTGRES_PASSWORD: 'synthetic-database-password',
            APP_SECRET: 'a'.repeat(48),
            IP_HASH_SECRET: 'b'.repeat(48),
            PUBLIC_WEB_ORIGIN: 'https://zdajegzamin.sbs',
            PUBLIC_TRUST_PROXY: '172.30.0.1/32',
            SITE_DEEPSEEK_API_KEY: key,
            SITE_DEEPSEEK_BASE_URL: 'https://api.deepseek.com',
            SITE_DEEPSEEK_MODEL: 'deepseek-flash',
          },
        },
      ),
    );
    const { api, initialize, postgres } = configuration.services;
    assert.deepEqual(Object.keys(configuration.services).sort(), ['api', 'initialize', 'postgres']);
    assert.equal(api.environment.DEEPSEEK_API_KEY, key);
    assert.equal(api.environment.DEEPSEEK_BASE_URL, 'https://api.deepseek.com');
    assert.equal(api.environment.DEEPSEEK_MODEL, 'deepseek-flash');
    assert.equal(initialize.environment.DEEPSEEK_API_KEY, '');
    assert.equal(postgres.environment.DEEPSEEK_API_KEY, undefined);
    for (const service of [api, initialize]) {
      assert.equal(service.environment.RUNNER_PROFILE, 'public-sandbox');
      assert.equal(service.environment.PUBLIC_SANDBOX_VERIFIED, 'false');
      assert.equal(service.build, undefined);
      assert.ok(!(service.volumes ?? []).some((volume) => volume.target?.includes('docker.sock')));
    }
    assert.equal(api.ports.length, 1);
    assert.equal(api.ports[0].host_ip, '127.0.0.1');
    assert.equal(postgres.ports, undefined);
  });
}
