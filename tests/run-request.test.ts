import { describe, expect, it } from 'vitest';
import { validateRunRequest } from '@zdaj/checker';
import { MAX_RUN_DUMP_BYTES, type ProjectFile } from '@zdaj/shared';

const files: ProjectFile[] = [
  { path: 'baza.sql', content: 'CREATE TABLE a (id INT);' },
  { path: 'motor.php', content: '<?php echo 1;' },
  { path: 'kwerendy.txt', content: 'SELECT 1;' },
];
const valid = { database: 'motory', dumpPath: 'baza.sql', sql: 'SELECT 1;', php: null };

describe('learner run request boundary', () => {
  it('normalises a complete request and keeps field order', () => {
    expect(
      validateRunRequest(
        {
          ...valid,
          php: {
            entry: 'motor.php',
            method: 'POST',
            fields: [
              ['a', '1'],
              ['a', ''],
            ],
          },
          unknown: 'dropped',
        },
        files,
      ),
    ).toEqual({
      ...valid,
      php: {
        entry: 'motor.php',
        method: 'POST',
        fields: [
          ['a', '1'],
          ['a', ''],
        ],
      },
    });
    expect(validateRunRequest({ database: 'x', sql: 'SELECT 1' }, files)).toEqual({
      database: 'x',
      dumpPath: null,
      sql: 'SELECT 1',
      php: null,
    });
  });

  it.each([
    ['a system database', { database: 'mysql' }],
    ['an injected database name', { database: 'a`; DROP DATABASE mysql; --' }],
    ['a dump outside the project', { dumpPath: '../baza.sql' }],
    ['a dump that was not submitted', { dumpPath: 'inna.sql' }],
    ['a dump with another extension', { dumpPath: 'kwerendy.txt' }],
    ['oversized statements', { sql: 'x'.repeat(64 * 1024 + 1) }],
    ['a page that was not submitted', { php: { entry: 'brak.php', method: 'GET', fields: [] } }],
    ['a non-page entry', { php: { entry: 'baza.sql', method: 'GET', fields: [] } }],
    ['an absolute entry', { php: { entry: '/etc/passwd.php', method: 'GET', fields: [] } }],
    ['another method', { php: { entry: 'motor.php', method: 'PUT', fields: [] } }],
    [
      'too many fields',
      {
        php: {
          entry: 'motor.php',
          method: 'GET',
          fields: Array.from({ length: 21 }, (_, index) => [`p${index}`, '1']),
        },
      },
    ],
    ['an unnamed field', { php: { entry: 'motor.php', method: 'GET', fields: [['', '1']] } }],
    ['a non-text field', { php: { entry: 'motor.php', method: 'GET', fields: [['a', 1]] } }],
    ['nothing to run', { dumpPath: null, sql: '  ', php: null }],
  ])('rejects %s', (_, override) => {
    expect(() => validateRunRequest({ ...valid, ...override }, files)).toThrow();
  });

  it('rejects a dump above the size limit before any container starts', () => {
    const large = [{ path: 'baza.sql', content: 'x'.repeat(MAX_RUN_DUMP_BYTES + 1) }];
    expect(() => validateRunRequest(valid, large)).toThrow(/2 MiB/);
  });
});
