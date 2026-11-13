import { describe, expect, it } from 'vitest';
import { quoteIdentifier, validateDatabaseName } from '@zdaj/checker';

describe('learner-chosen database names', () => {
  it.each(['motory', 'Baza_2024', 'a', '9lives', 'x'.repeat(64)])('accepts %s', (name) => {
    expect(validateDatabaseName(name)).toBe(name);
  });

  it.each([
    '',
    'x'.repeat(65),
    'moja baza',
    'baza-1',
    'baza;DROP DATABASE mysql',
    'baza`',
    'rzeki.pomiary',
    'żółw',
    '../mysql',
    'mysql',
    'MySQL',
    'information_schema',
    'performance_schema',
    'sys',
    null,
    42,
    ['motory'],
  ])('rejects %j', (name) => {
    expect(() => validateDatabaseName(name)).toThrow(/Nazwa bazy/);
  });
});

describe('identifier quoting', () => {
  it('keeps an embedded backtick inside the identifier', () => {
    expect(quoteIdentifier('motory')).toBe('`motory`');
    expect(quoteIdentifier('a`; DROP DATABASE mysql; --')).toBe('`a``; DROP DATABASE mysql; --`');
    expect(quoteIdentifier('``')).toBe('``````');
  });
});
