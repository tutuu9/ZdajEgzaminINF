import { randomBytes } from 'node:crypto';
import { writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
const root = process.cwd();
const password = randomBytes(24).toString('hex');
const data = path.resolve(root, 'data').replaceAll('\\', '/');
const configuration = `POSTGRES_PASSWORD=${password}\nDATABASE_URL=postgresql://zdaj:${password}@127.0.0.1:54329/zdaj\nDATA_DIR=${data}\nDATA_DIR_HOST=${data}\nPORT=3001\nHOST=127.0.0.1\nWEB_ORIGIN=http://127.0.0.1:5173\nFRONTEND_ORIGIN=http://127.0.0.1:5173\nSESSION_SECRET=${randomBytes(32).toString('hex')}\nIP_HASH_SECRET=${randomBytes(32).toString('hex')}\nDEEPSEEK_API_KEY=\nDEEPSEEK_BASE_URL=https://api.deepseek.com\nRUNNER_PROFILE=local-development\nSANDBOX_IMAGE=zdaj-inf-sandbox:0.3.0\nPUBLIC_SANDBOX_VERIFIED=false\nCOOKIE_SECURE=false\nTRUST_PROXY=false\n`;
await mkdir(data, { recursive: true });
try {
  await writeFile(path.join(root, '.env'), configuration, { flag: 'wx', mode: 0o600 });
  console.log('Created private .env and data directory. Existing settings are never overwritten.');
} catch (error) {
  if (error.code === 'EEXIST') console.log('.env already exists; left unchanged.');
  else throw error;
}
