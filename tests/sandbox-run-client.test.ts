import { describe, expect, it, vi } from 'vitest';
import type { SandboxRunResponse, SandboxRunResult } from '@zdaj/shared';
import {
  awaitRun,
  decodeDump,
  dumpFileName,
  runInputFiles,
  sqlFilePaths,
} from '../apps/web/src/sandbox-run';

const result = { database: 'motory', statements: [] } as unknown as SandboxRunResult;
const job = { id: 'job', token: 'secret' };
function transport(responses: SandboxRunResponse[]) {
  const queue = [...responses];
  return {
    submit: vi.fn(async () => job),
    poll: vi.fn(async () => queue.shift() ?? { id: 'job', status: 'running' as const }),
    acknowledge: vi.fn(async () => ({ ok: true })),
  };
}
const sleep = async () => undefined;

describe('browser side of a learner run', () => {
  it('sends text files only and refuses an input the server would reject', () => {
    const files = [
      { path: 'motor.php', content: '<?php' },
      { path: 'baza.sql', content: 'CREATE TABLE a (id INT);', encoding: 'utf8' as const },
      { path: 'motor.png', content: 'iVBORw0KGgo=', encoding: 'base64' as const },
      { path: 'stara.SQL', content: '' },
    ];
    expect(runInputFiles(files).map((file) => file.path)).toEqual([
      'motor.php',
      'baza.sql',
      'stara.SQL',
    ]);
    expect(sqlFilePaths(files)).toEqual(['baza.sql', 'stara.SQL']);
    // Size is counted in bytes: Polish letters take two each.
    expect(() =>
      runInputFiles([{ path: 'dane.txt', content: 'ż'.repeat(2 * 1024 * 1024 + 1) }]),
    ).toThrow(/4 MiB/);
  });

  it('reads UTF-8 dumps as they are and reports a Windows-1250 fallback', () => {
    const utf8 = new TextEncoder().encode("﻿INSERT INTO a VALUES ('Łódź');");
    expect(decodeDump(utf8.buffer as ArrayBuffer)).toEqual({
      content: "INSERT INTO a VALUES ('Łódź');",
      recoded: false,
    });
    // "Łódź" in Windows-1250 is not valid UTF-8.
    const legacy = new Uint8Array([0xa3, 0xf3, 0x64, 0x9f]);
    expect(decodeDump(legacy.buffer as ArrayBuffer)).toEqual({ content: 'Łódź', recoded: true });
    expect(() => decodeDump(new ArrayBuffer(2 * 1024 * 1024 + 1))).toThrow(/2 MiB/);
  });

  it.each([
    'baza.txt',
    '../baza.sql',
    'a/baza.sql',
    'C:baza.sql',
    '.sql',
    'x'.repeat(240) + '.sql',
  ])('rejects the dump file name %s', (name) => {
    expect(() => dumpFileName(name)).toThrow();
  });
  it('accepts ordinary dump file names', () => {
    expect(dumpFileName('bazasmoki.sql')).toBe('bazasmoki.sql');
    expect(dumpFileName('Egzamin 2024.SQL')).toBe('Egzamin 2024.SQL');
  });

  it('waits through queue states, returns the result and releases the server copy', async () => {
    const channel = transport([
      { id: 'job', status: 'queued' },
      { id: 'job', status: 'running' },
      { id: 'job', status: 'completed', result },
    ]);
    const seen: string[] = [];
    expect(await awaitRun(channel, { sleep, onStatus: (status) => seen.push(status) })).toBe(
      result,
    );
    expect(seen).toEqual(['queued', 'running', 'completed']);
    expect(channel.submit).toHaveBeenCalledTimes(1);
    expect(channel.acknowledge).toHaveBeenCalledWith(job);
  });

  it('reports a failed environment without inventing a result', async () => {
    const channel = transport([
      { id: 'job', status: 'failed', error: 'Środowisko nie ukończyło.' },
    ]);
    await expect(awaitRun(channel, { sleep })).rejects.toThrow('Środowisko nie ukończyło.');
    expect(channel.acknowledge).toHaveBeenCalledTimes(1);
  });

  it('stops waiting at the deadline and when the view is closed', async () => {
    let time = 0;
    const slow = transport([]);
    await expect(
      awaitRun(slow, {
        sleep: async () => {
          time += 1000;
        },
        now: () => time,
        timeoutMs: 3000,
      }),
    ).rejects.toThrow(/Minął czas oczekiwania/);
    expect(slow.poll).toHaveBeenCalledTimes(3);
    expect(slow.acknowledge).not.toHaveBeenCalled();

    let polls = 0;
    const closed = transport([]);
    expect(await awaitRun(closed, { sleep, active: () => polls++ < 2 })).toBeNull();
  });

  it('keeps a result even when the acknowledgment is lost', async () => {
    const channel = transport([{ id: 'job', status: 'completed', result }]);
    channel.acknowledge.mockRejectedValueOnce(new Error('offline'));
    expect(await awaitRun(channel, { sleep })).toBe(result);
  });
});
