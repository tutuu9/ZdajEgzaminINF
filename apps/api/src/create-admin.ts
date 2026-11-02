import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import { hash } from 'bcryptjs';
import { db } from '@zdaj/database';

async function passwordPrompt(): Promise<string> {
  if (!stdin.isTTY)
    throw new Error(
      'Use an interactive terminal, or pass ADMIN_PASSWORD through a secure environment.',
    );
  stdout.write('Password (minimum 12 characters): ');
  stdin.setRawMode(true);
  stdin.resume();
  return new Promise((resolve, reject) => {
    let value = '';
    const done = () => {
      stdin.setRawMode(false);
      stdin.pause();
      stdin.off('data', onData);
      stdout.write('\n');
    };
    const onData = (chunk: Buffer) => {
      for (const char of chunk.toString('utf8')) {
        if (char === '\u0003') {
          done();
          reject(new Error('Cancelled.'));
          return;
        }
        if (char === '\r' || char === '\n') {
          done();
          resolve(value);
          return;
        }
        if (char === '\u007f' || char === '\b') value = value.slice(0, -1);
        else if (char >= ' ') value += char;
      }
    };
    stdin.on('data', onData);
  });
}
try {
  let username = process.env.ADMIN_USERNAME;
  if (!username) {
    const input = createInterface({ input: stdin, output: stdout });
    username = (await input.question('Administrator username: ')).trim();
    input.close();
  }
  const password = process.env.ADMIN_PASSWORD ?? (await passwordPrompt());
  if (!/^[a-zA-Z0-9_.-]{3,50}$/.test(username))
    throw new Error('Username must contain 3–50 letters, digits, dots, underscores or hyphens.');
  if (password.length < 12 || Buffer.byteLength(password, 'utf8') > 72)
    throw new Error('Password must contain at least 12 characters and at most 72 UTF-8 bytes.');
  const exists = await db.admin.findUnique({ where: { username } });
  if (exists)
    throw new Error('An administrator with this username already exists. No password was changed.');
  await db.admin.create({ data: { username, passwordHash: await hash(password, 12) } });
  console.log(`Administrator ${username} created. No password is stored in plaintext.`);
} finally {
  await db.$disconnect();
}
