import { describe, it, expect } from 'vitest';
import { zipSync, strToU8 } from 'fflate';
import { extractZip, validateProjectFiles, validateTaskChecks, makeReport } from '@zdaj/checker';
import type { TaskVersion } from '@zdaj/shared';

describe('project import boundary', () => {
  it('accepts UTF-8 files and strips a single enclosing IDE folder', async () => {
    const archive = zipSync({
      'projekt/index.html': strToU8('<h1>Zażółć gęślą</h1>'),
      'projekt/style.css': strToU8('h1 { color: blue; }'),
    });
    const files = await extractZip(Buffer.from(archive));
    expect(files.map((file) => file.path)).toEqual(['index.html', 'style.css']);
    expect(files[0].content).toContain('Zażółć');
  });
  it.each([
    '../outside.php',
    'C:/outside.php',
    '/outside.php',
    'folder\\file.php',
    'a/../../b.php',
    '.env',
    'a/.git/config.txt',
    'con.txt',
    'nested.zip',
  ])('rejects unsafe or executable archive path %s', (path) => {
    expect(() => validateProjectFiles([{ path, content: 'content' }])).toThrow();
  });
  it('rejects ZIP traversal before extracting any file', async () => {
    const archive = zipSync({ '../escape.php': strToU8('<?php echo 1;') });
    await expect(extractZip(Buffer.from(archive))).rejects.toThrow();
  });
  it('rejects symlinks and encrypted entries', async () => {
    const archive = zipSync({ 'link.txt': [strToU8('outside'), { attrs: 0o120777 << 16, os: 3 }] });
    await expect(extractZip(Buffer.from(archive))).rejects.toThrow();
  });
  it('rejects duplicate names across case-insensitive filesystems', () => {
    expect(() =>
      validateProjectFiles([
        { path: 'Index.php', content: '' },
        { path: 'index.php', content: '' },
      ]),
    ).toThrow();
  });
  it('rejects more than 500 files and oversize individual files', () => {
    expect(() =>
      validateProjectFiles(
        Array.from({ length: 501 }, (_, i) => ({ path: `${i}.txt`, content: '' })),
      ),
    ).toThrow();
    expect(() =>
      validateProjectFiles([{ path: 'big.txt', content: 'a'.repeat(10 * 1024 * 1024 + 1) }]),
    ).toThrow();
  });
  it('rejects invalid base64 rather than silently truncating it', () => {
    expect(() =>
      validateProjectFiles([{ path: 'image.png', encoding: 'base64', content: 'not base64?' }]),
    ).toThrow();
  });
});
describe('grading contracts', () => {
  const task = {
    id: 'test',
    version: 1,
    criteria: [
      {
        id: 'file',
        title: 'Plik',
        description: 'Jest plik',
        method: 'file',
        source: 'educational',
        points: 2,
        check: { type: 'file', path: 'index.html' },
      },
      {
        id: 'review',
        title: 'Kontrola',
        description: 'Ręcznie',
        method: 'manual',
        source: 'educational',
        points: 1,
      },
    ],
  } as TaskVersion;
  it('does not invent a precise total when manual criteria remain', () => {
    const results = task.criteria.map((criterion) => ({
      ...criterion,
      criterionId: criterion.id,
      status: criterion.method === 'manual' ? ('manual' as const) : ('passed' as const),
      evidence: '',
      recommendation: '',
    }));
    const report = makeReport(task, results, 12);
    expect(report.confirmedPoints).toBe(2);
    expect(report.percentage).toBeNull();
    expect(report.complete).toBe(false);
  });
  it('refuses arbitrary checker command types', () => {
    expect(() =>
      validateTaskChecks({
        ...task,
        criteria: [
          {
            ...task.criteria[0],
            check: { type: 'shell', path: 'index.html', command: 'echo unsafe' },
          },
        ],
      }),
    ).toThrow();
  });
  it('accepts local PHP query parameters but rejects remote URLs', () => {
    expect(() =>
      validateTaskChecks({
        ...task,
        criteria: [
          {
            ...task.criteria[0],
            method: 'php',
            check: { type: 'php', path: 'index.php?minPlayers=4' },
          },
        ],
      }),
    ).not.toThrow();
    expect(() =>
      validateTaskChecks({
        ...task,
        criteria: [
          {
            ...task.criteria[0],
            method: 'php',
            check: { type: 'php', path: 'https://outside.test/index.php' },
          },
        ],
      }),
    ).toThrow();
  });
});
