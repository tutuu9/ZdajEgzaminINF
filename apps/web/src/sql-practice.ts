/**
 * Approximate SQL practice for the public site, where no database server runs.
 *
 * Nothing here executes SQL. A learner's statement is parsed into its parts (columns,
 * tables, join and filter conditions, grouping, account and privilege details) and
 * compared with the reference statement assembled from the course's own example code
 * for that step. Differences become learner-facing hints. A match only means "the same
 * as the prepared variant"; the real result must still be checked in a local MariaDB.
 */
import type { ExamStudyGuide, ProjectFile } from '@zdaj/shared';

type TokenType = 'word' | 'ident' | 'string' | 'number' | 'op' | 'punct';
export interface Token {
  type: TokenType;
  value: string;
  start: number;
  end: number;
}

const OPERATORS = ['>=', '<=', '<>', '!=', '||', '=', '<', '>', '+', '-', '*', '/', '%'];

export function tokenize(sql: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  while (i < sql.length) {
    const char = sql[i]!;
    if (/\s/.test(char)) {
      i++;
    } else if (char === '-' && sql[i + 1] === '-') {
      while (i < sql.length && sql[i] !== '\n') i++;
    } else if (char === '#') {
      while (i < sql.length && sql[i] !== '\n') i++;
    } else if (char === '/' && sql[i + 1] === '*') {
      const close = sql.indexOf('*/', i + 2);
      i = close < 0 ? sql.length : close + 2;
    } else if (char === "'" || char === '"' || char === '`') {
      const start = i++;
      let value = '';
      while (i < sql.length) {
        const next = sql[i]!;
        if (next === '\\' && char !== '`') {
          value += sql[i + 1] ?? '';
          i += 2;
        } else if (next === char) {
          if (sql[i + 1] === char) {
            value += char;
            i += 2;
          } else {
            i++;
            break;
          }
        } else {
          value += next;
          i++;
        }
      }
      tokens.push({ type: char === '`' ? 'ident' : 'string', value, start, end: i });
    } else if (/[0-9]/.test(char)) {
      const match = /^[0-9]+(?:\.[0-9]+)?/.exec(sql.slice(i))!;
      tokens.push({ type: 'number', value: match[0], start: i, end: i + match[0].length });
      i += match[0].length;
    } else if (/[\p{L}_$]/u.test(char)) {
      const match = /^[\p{L}\p{N}_$]+/u.exec(sql.slice(i))!;
      tokens.push({ type: 'word', value: match[0], start: i, end: i + match[0].length });
      i += match[0].length;
    } else {
      const operator = OPERATORS.find((item) => sql.startsWith(item, i));
      if (operator) {
        tokens.push({ type: 'op', value: operator, start: i, end: i + operator.length });
        i += operator.length;
      } else {
        tokens.push({ type: 'punct', value: char, start: i, end: i + 1 });
        i++;
      }
    }
  }
  return tokens;
}

const upper = (token: Token | undefined) =>
  token?.type === 'word' ? token.value.toUpperCase() : '';
const isWord = (token: Token | undefined, ...words: string[]) => words.includes(upper(token));
const isPunct = (token: Token | undefined, value: string) =>
  token?.type === 'punct' && token.value === value;

/** Statements separated by top-level semicolons; empty statements are dropped. */
export function splitStatements(sql: string): { tokens: Token[]; text: string }[] {
  const tokens = tokenize(sql);
  const statements: { tokens: Token[]; text: string }[] = [];
  let current: Token[] = [];
  const flush = () => {
    if (current.length)
      statements.push({
        tokens: current,
        text: sql.slice(current[0]!.start, current[current.length - 1]!.end),
      });
    current = [];
  };
  for (const token of tokens) {
    if (isPunct(token, ';')) flush();
    else current.push(token);
  }
  flush();
  return statements;
}

/** Splits tokens at top-level occurrences chosen by `at`. */
function splitTop(tokens: Token[], at: (token: Token, index: number) => boolean): Token[][] {
  const parts: Token[][] = [[]];
  let depth = 0;
  tokens.forEach((token, index) => {
    if (isPunct(token, '(')) depth++;
    if (isPunct(token, ')')) depth = Math.max(0, depth - 1);
    if (depth === 0 && at(token, index)) parts.push([]);
    else parts[parts.length - 1]!.push(token);
  });
  return parts.filter((part) => part.length);
}

const KEYWORDS = new Set(
  (
    'SELECT DISTINCT FROM WHERE GROUP BY HAVING ORDER LIMIT JOIN INNER LEFT RIGHT OUTER CROSS ' +
    'ON AS AND OR NOT ASC DESC IN LIKE IS NULL BETWEEN TRUE FALSE'
  ).split(' '),
);

interface Term {
  /** With table aliases resolved to table names. */
  qualified: string;
  /** Without any table qualifier. */
  bare: string;
  hasUnqualified: boolean;
  /** Original text for messages. */
  text: string;
}

const literal = (token: Token) =>
  token.type === 'number' ||
  (token.type === 'string' && /^-?[0-9]+(?:\.[0-9]+)?$/.test(token.value))
    ? String(Number(token.value))
    : `'${token.value}'`;

function term(tokens: Token[], aliases: Map<string, string>, source: string): Term {
  const qualified: string[] = [];
  const bare: string[] = [];
  let hasUnqualified = false;
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i]!;
    const next = tokens[i + 1];
    const isName = token.type === 'ident' || (token.type === 'word' && !KEYWORDS.has(upper(token)));
    if (isName && isPunct(next, '.') && tokens[i + 2]) {
      const table = token.value.toLowerCase();
      const column = tokens[i + 2]!.type === 'op' ? '*' : tokens[i + 2]!.value.toLowerCase();
      qualified.push(`${aliases.get(table) ?? table}.${column}`);
      bare.push(column);
      i += 2;
    } else if (token.type === 'word' && (KEYWORDS.has(upper(token)) || isPunct(next, '('))) {
      qualified.push(upper(token));
      bare.push(upper(token));
    } else if (isName) {
      qualified.push(token.value.toLowerCase());
      bare.push(token.value.toLowerCase());
      hasUnqualified = true;
    } else if (token.type === 'string' || token.type === 'number') {
      qualified.push(literal(token));
      bare.push(literal(token));
    } else {
      const value = token.value === '!=' ? '<>' : token.value;
      qualified.push(value);
      bare.push(value);
    }
  }
  const join = (parts: string[]) =>
    parts
      .join(' ')
      .replace(/\s*\(\s*/g, '(')
      .replace(/\s*\)/g, ')')
      .replace(/\s*,\s*/g, ', ')
      .replace(/(\w)\(/g, '$1(');
  const text = tokens.length
    ? source.slice(tokens[0]!.start, tokens[tokens.length - 1]!.end).replace(/\s+/g, ' ')
    : '';
  return { qualified: join(qualified), bare: join(bare), hasUnqualified, text };
}

const sameTerm = (a: Term, b: Term) =>
  a.qualified === b.qualified || ((a.hasUnqualified || b.hasUnqualified) && a.bare === b.bare);

const COMPARISON = ['=', '<>', '!=', '<', '>', '<=', '>='];
const FLIP: Record<string, string> = { '<': '>', '>': '<', '<=': '>=', '>=': '<=' };

/** Canonical predicate: comparisons ordered, OR of equalities on one column as IN. */
function predicate(tokens: Token[], aliases: Map<string, string>, source: string): Term {
  while (isPunct(tokens[0], '(') && isPunct(tokens[tokens.length - 1], ')')) {
    let depth = 0,
      wraps = true;
    tokens.forEach((token, index) => {
      if (isPunct(token, '(')) depth++;
      if (isPunct(token, ')')) depth--;
      if (depth === 0 && index < tokens.length - 1) wraps = false;
    });
    if (!wraps) break;
    tokens = tokens.slice(1, -1);
  }
  const whole = term(tokens, aliases, source);
  // a = 1 OR a = 2  ->  a IN (1, 2)
  const alternatives = splitTop(tokens, (token) => isWord(token, 'OR'));
  const collect = (left: Term, values: string[]) => ({
    qualified: `${left.qualified} IN(${[...values].sort().join(', ')})`,
    bare: `${left.bare} IN(${[...values].sort().join(', ')})`,
    hasUnqualified: left.hasUnqualified,
    text: whole.text,
  });
  if (alternatives.length > 1) {
    const sides = alternatives.map((part) => {
      const index = part.findIndex((token) => token.type === 'op' && token.value === '=');
      return index > 0 && part.length === index + 2
        ? { left: term(part.slice(0, index), aliases, source), value: literal(part[index + 1]!) }
        : null;
    });
    if (sides.every((side) => side && side.left.qualified === sides[0]!.left.qualified))
      return collect(
        sides[0]!.left,
        sides.map((side) => side!.value),
      );
    return whole;
  }
  const inIndex = tokens.findIndex((token) => isWord(token, 'IN'));
  if (inIndex > 0 && !isWord(tokens[inIndex - 1], 'NOT') && isPunct(tokens[inIndex + 1], '(')) {
    const values = splitTop(tokens.slice(inIndex + 2, -1), (token) => isPunct(token, ','));
    if (values.every((value) => value.length === 1))
      return collect(
        term(tokens.slice(0, inIndex), aliases, source),
        values.map((value) => literal(value[0]!)),
      );
  }
  const parts = splitTop(
    tokens,
    (token) => token.type === 'op' && COMPARISON.includes(token.value),
  );
  const operatorToken = tokens.find(
    (token, index) =>
      token.type === 'op' &&
      COMPARISON.includes(token.value) &&
      tokens.slice(0, index).filter((item) => isPunct(item, '(')).length ===
        tokens.slice(0, index).filter((item) => isPunct(item, ')')).length,
  );
  if (parts.length === 2 && operatorToken) {
    let left = term(parts[0]!, aliases, source),
      right = term(parts[1]!, aliases, source);
    let operator = operatorToken.value === '!=' ? '<>' : operatorToken.value;
    const swap = () => {
      [left, right] = [right, left];
      operator = FLIP[operator] ?? operator;
    };
    if (left.qualified > right.qualified) swap();
    return {
      qualified: `${left.qualified} ${operator} ${right.qualified}`,
      // Bare order is decided independently so that the bare forms also match.
      bare:
        left.bare <= right.bare || !(operator in FLIP) || operator === '=' || operator === '<>'
          ? [left.bare, right.bare].sort().join(` ${operator} `)
          : `${right.bare} ${FLIP[operator]} ${left.bare}`,
      hasUnqualified: left.hasUnqualified || right.hasUnqualified,
      text: whole.text,
    };
  }
  return whole;
}

export interface SelectQuery {
  kind: 'SELECT';
  distinct: boolean;
  star: boolean;
  items: { term: Term; alias: string }[];
  tables: string[];
  outerJoin: boolean;
  predicates: Term[];
  groupBy: Term[];
  having: Term[];
  orderBy: { term: Term; descending: boolean }[];
  limit: string;
}
export interface OtherStatement {
  kind: string;
  /** Named parts compared one by one, e.g. user, host, privileges. */
  parts: Record<string, string>;
  text: string;
}
export type ParsedStatement = SelectQuery | OtherStatement;

const CLAUSES = ['FROM', 'WHERE', 'GROUP', 'HAVING', 'ORDER', 'LIMIT'];

function parseSelect(tokens: Token[], source: string): SelectQuery {
  const bounds = new Map<string, number>();
  let depth = 0;
  tokens.forEach((token, index) => {
    if (isPunct(token, '(')) depth++;
    if (isPunct(token, ')')) depth--;
    if (depth === 0 && CLAUSES.includes(upper(token)) && !bounds.has(upper(token)))
      bounds.set(upper(token), index);
  });
  const section = (name: string, skip = 1) => {
    const start = bounds.get(name);
    if (start === undefined) return [];
    const ends = [...bounds.values()].filter((index) => index > start);
    return tokens.slice(start + skip, ends.length ? Math.min(...ends) : tokens.length);
  };
  let selectTokens = tokens.slice(1, bounds.get('FROM') ?? tokens.length);
  const distinct = isWord(selectTokens[0], 'DISTINCT');
  if (distinct) selectTokens = selectTokens.slice(1);

  // Tables and aliases first, so that column qualifiers can be resolved.
  const aliases = new Map<string, string>();
  const tables: string[] = [];
  const joinConditions: Token[][] = [];
  let outerJoin = false;
  const fromTokens = section('FROM');
  const refs = splitTop(fromTokens, (token) => isPunct(token, ',') || isWord(token, 'JOIN'));
  for (let ref of refs) {
    while (isWord(ref[ref.length - 1], 'INNER', 'LEFT', 'RIGHT', 'OUTER', 'CROSS')) {
      if (isWord(ref[ref.length - 1], 'LEFT', 'RIGHT')) outerJoin = true;
      ref = ref.slice(0, -1);
    }
    const on = ref.findIndex((token) => isWord(token, 'ON'));
    const head = on < 0 ? ref : ref.slice(0, on);
    if (on >= 0) joinConditions.push(ref.slice(on + 1));
    let nameIndex = 0;
    if (isPunct(head[1], '.')) nameIndex = 2;
    const table = head[nameIndex]?.value.toLowerCase();
    if (!table) continue;
    tables.push(table);
    const rest = head.slice(nameIndex + 1).filter((token) => !isWord(token, 'AS'));
    if (rest[0]) aliases.set(rest[0].value.toLowerCase(), table);
  }
  for (const preceding of fromTokens) if (isWord(preceding, 'LEFT', 'RIGHT')) outerJoin = true;

  let star = false;
  const items: SelectQuery['items'] = [];
  for (const item of splitTop(selectTokens, (token) => isPunct(token, ','))) {
    if (item.length === 1 && item[0]!.type === 'op' && item[0]!.value === '*') {
      star = true;
      continue;
    }
    let expression = item,
      alias = '';
    const as = item.findIndex((token) => isWord(token, 'AS'));
    if (as > 0) {
      expression = item.slice(0, as);
      alias = item[as + 1]?.value ?? '';
    } else if (item.length >= 2) {
      const last = item[item.length - 1]!,
        before = item[item.length - 2]!;
      const lastIsName =
        last.type === 'ident' ||
        last.type === 'string' ||
        (last.type === 'word' && !KEYWORDS.has(upper(last)));
      if (lastIsName && !isPunct(before, '.') && before.type !== 'op') {
        expression = item.slice(0, -1);
        alias = last.value;
      }
    }
    items.push({ term: term(expression, aliases, source), alias: alias.toLowerCase() });
  }

  const predicates: Term[] = [];
  const addConditions = (condition: Token[]) => {
    let afterBetween = false;
    for (const part of splitTop(condition, (token) => {
      if (isWord(token, 'BETWEEN')) afterBetween = true;
      else if (isWord(token, 'AND')) {
        if (afterBetween) {
          afterBetween = false;
          return false;
        }
        return true;
      }
      return false;
    }))
      predicates.push(predicate(part, aliases, source));
  };
  joinConditions.forEach(addConditions);
  addConditions(section('WHERE'));
  const list = (tokens: Token[]) =>
    splitTop(tokens, (token) => isPunct(token, ',')).map((part) => term(part, aliases, source));
  const having = section('HAVING').length ? [predicate(section('HAVING'), aliases, source)] : [];
  const orderBy = splitTop(section('ORDER', 2), (token) => isPunct(token, ',')).map((part) => {
    const descending = isWord(part[part.length - 1], 'DESC');
    const expression = isWord(part[part.length - 1], 'ASC', 'DESC') ? part.slice(0, -1) : part;
    return { term: term(expression, aliases, source), descending };
  });
  return {
    kind: 'SELECT',
    distinct,
    star,
    items,
    tables,
    outerJoin,
    predicates,
    groupBy: list(section('GROUP', 2)),
    having,
    orderBy,
    limit: section('LIMIT')
      .map((token) => token.value)
      .join(''),
  };
}

const quotedName = (tokens: Token[]) => tokens.map((token) => token.value).join('');

function parseOther(tokens: Token[], source: string): OtherStatement {
  const words = tokens.map(upper);
  const text = source.slice(tokens[0]!.start, tokens[tokens.length - 1]!.end);
  const lowerJoined = (part: Token[]) =>
    part
      .map((token) => (token.type === 'string' ? `'${token.value}'` : token.value.toLowerCase()))
      .join(' ')
      .replace(/\s*([(),.@])\s*/g, '$1');
  if (words[0] === 'CREATE' && (words[1] === 'DATABASE' || words[1] === 'SCHEMA')) {
    let index = 2;
    if (words[2] === 'IF') index = 5;
    const parts: Record<string, string> = { baza: tokens[index]?.value.toLowerCase() ?? '' };
    for (let i = index + 1; i < tokens.length; i++) {
      if (words[i] === 'CHARACTER' || words[i] === 'CHARSET') {
        i += words[i] === 'CHARACTER' ? 2 : 1;
        if (tokens[i]?.type === 'op') i++;
        parts['zestaw znaków'] = tokens[i]?.value.toLowerCase() ?? '';
      } else if (words[i] === 'COLLATE') {
        i++;
        if (tokens[i]?.type === 'op') i++;
        parts['porównywanie'] = tokens[i]?.value.toLowerCase() ?? '';
      }
    }
    return { kind: 'CREATE DATABASE', parts, text };
  }
  if (words[0] === 'CREATE' && words[1] === 'USER') {
    const at = tokens.findIndex((token) => isPunct(token, '@'));
    const by = words.indexOf('BY');
    return {
      kind: 'CREATE USER',
      parts: {
        użytkownik: tokens[2]?.value ?? '',
        host: at > 0 ? (tokens[at + 1]?.value.toLowerCase() ?? '') : '%',
        hasło: by > 0 ? (tokens[by + 1]?.value ?? '') : '',
      },
      text,
    };
  }
  if (words[0] === 'GRANT') {
    const on = words.indexOf('ON'),
      to = words.indexOf('TO');
    const privileges = splitTop(tokens.slice(1, on), (token) => isPunct(token, ','))
      .map((part) => part.map(upper).join(' '))
      .sort();
    const user = tokens.slice(to + 1);
    const at = user.findIndex((token) => isPunct(token, '@'));
    return {
      kind: 'GRANT',
      parts: {
        uprawnienia: privileges.join(', '),
        obiekt: quotedName(tokens.slice(on + 1, to)).toLowerCase(),
        użytkownik: user[0]?.value ?? '',
        host: at > 0 ? (user[at + 1]?.value.toLowerCase() ?? '') : '%',
      },
      text,
    };
  }
  if (words[0] === 'INSERT') {
    const into = words.indexOf('INTO');
    const table = tokens[into + 1]?.value.toLowerCase() ?? '';
    const values = words.indexOf('VALUES');
    const columnsTokens = tokens.slice(into + 2, values);
    const columns = isPunct(columnsTokens[0], '(')
      ? splitTop(columnsTokens.slice(1, -1), (token) => isPunct(token, ',')).map((part) =>
          part[0]!.value.toLowerCase(),
        )
      : [];
    const open = values + 1;
    let close = open,
      depth = 0;
    for (let i = open; i < tokens.length; i++) {
      if (isPunct(tokens[i], '(')) depth++;
      if (isPunct(tokens[i], ')')) depth--;
      if (depth === 0) {
        close = i;
        break;
      }
    }
    const valueList = splitTop(tokens.slice(open + 1, close), (token) => isPunct(token, ',')).map(
      (part) =>
        part
          .map((token) =>
            token.type === 'string' || token.type === 'number'
              ? literal(token)
              : upper(token) || token.value,
          )
          .join(''),
    );
    const parts: Record<string, string> = { tabela: table };
    if (columns.length)
      columns.forEach((column, index) => (parts[column] = valueList[index] ?? ''));
    else parts['wartości'] = valueList.join(', ');
    return { kind: 'INSERT', parts, text };
  }
  if (words[0] === 'ALTER' && words[1] === 'TABLE') {
    const add = words.indexOf('ADD');
    let index = add + 1;
    if (words[index] === 'COLUMN') index++;
    const type = tokens
      .slice(index + 1)
      .map((token) => upper(token) || token.value)
      .join(' ')
      .replace(/\bINTEGER\b/, 'INT')
      .replace(/\s*\(\s*/g, '(')
      .replace(/\s+\)/g, ')')
      .replace(/\s*,\s*/g, ',');
    return {
      kind: 'ALTER TABLE',
      parts: {
        tabela: tokens[2]?.value.toLowerCase() ?? '',
        operacja: add > 0 ? 'ADD' : (words[3] ?? ''),
        kolumna: tokens[index]?.value.toLowerCase() ?? '',
        typ: type,
      },
      text,
    };
  }
  return { kind: words.slice(0, 2).join(' '), parts: { instrukcja: lowerJoined(tokens) }, text };
}

export function parseStatement(tokens: Token[], source: string): ParsedStatement | null {
  if (!tokens.length) return null;
  return isWord(tokens[0], 'SELECT') ? parseSelect(tokens, source) : parseOther(tokens, source);
}

export interface PracticeFinding {
  level: 'error' | 'warning' | 'info';
  message: string;
}
export interface PracticeComparison {
  status: 'match' | 'different' | 'empty';
  findings: PracticeFinding[];
}

const list = (values: string[]) => values.map((value) => `„${value}”`).join(', ');

function compareSelect(mine: SelectQuery, reference: SelectQuery): PracticeFinding[] {
  const findings: PracticeFinding[] = [];
  if (mine.star && !reference.star)
    findings.push({
      level: 'error',
      message: `SELECT * zwraca wszystkie kolumny tabeli. Wypisz tylko wymagane: ${list(
        reference.items.map((item) => item.term.text),
      )}.`,
    });
  const unmatched = [...mine.items];
  const missing: string[] = [];
  for (const wanted of reference.items) {
    const index = unmatched.findIndex((item) => sameTerm(item.term, wanted.term));
    if (index < 0) {
      missing.push(wanted.term.text);
      continue;
    }
    const [found] = unmatched.splice(index, 1);
    if (wanted.alias && found!.alias !== wanted.alias)
      findings.push({
        level: 'error',
        message: `Kolumna ${found!.term.text} ma mieć nazwę (alias) „${wanted.alias}”.`,
      });
  }
  if (missing.length && !(mine.star && !reference.star))
    findings.push({ level: 'error', message: `Brakuje kolumn: ${list(missing)}.` });
  if (unmatched.length)
    findings.push({
      level: 'error',
      message: `Dodatkowe kolumny, których polecenie nie wymaga: ${list(
        unmatched.map((item) => item.term.text),
      )}.`,
    });
  if (reference.distinct !== mine.distinct)
    findings.push({
      level: 'error',
      message: reference.distinct
        ? 'Wynik ma być bez powtórzeń: dodaj DISTINCT.'
        : 'DISTINCT usuwa powtórzenia, których polecenie nie każe usuwać.',
    });
  const missingTables = reference.tables.filter((table) => !mine.tables.includes(table));
  const extraTables = mine.tables.filter((table) => !reference.tables.includes(table));
  if (missingTables.length)
    findings.push({ level: 'error', message: `Brakuje tabel: ${list(missingTables)}.` });
  if (extraTables.length)
    findings.push({ level: 'error', message: `Niepotrzebne tabele: ${list(extraTables)}.` });
  if (mine.outerJoin !== reference.outerJoin)
    findings.push({
      level: 'warning',
      message: mine.outerJoin
        ? 'LEFT/RIGHT JOIN dołącza też wiersze bez pary. Tu wystarczy zwykły JOIN.'
        : 'Polecenie wymaga złączenia zewnętrznego (LEFT/RIGHT JOIN).',
    });
  const remaining = [...mine.predicates];
  const missingConditions: string[] = [];
  for (const wanted of reference.predicates) {
    const index = remaining.findIndex((item) => sameTerm(item, wanted));
    if (index < 0) missingConditions.push(wanted.text);
    else remaining.splice(index, 1);
  }
  if (mine.tables.length > 1 && !mine.predicates.some((item) => /=/.test(item.qualified)))
    findings.push({
      level: 'error',
      message:
        'Tabele nie są połączone warunkiem (ON lub WHERE). Bez niego każdy wiersz łączy się z każdym.',
    });
  if (missingConditions.length)
    findings.push({ level: 'error', message: `Brakuje warunków: ${list(missingConditions)}.` });
  if (remaining.length)
    findings.push({
      level: 'warning',
      message: `Dodatkowe warunki, których ten krok nie wymaga: ${list(
        remaining.map((item) => item.text),
      )}.`,
    });
  const sameList = (a: Term[], b: Term[]) =>
    a.length === b.length && a.every((item) => b.some((other) => sameTerm(item, other)));
  if (!sameList(mine.groupBy, reference.groupBy))
    findings.push({
      level: 'error',
      message: reference.groupBy.length
        ? `Pogrupuj wynik: GROUP BY ${reference.groupBy.map((item) => item.text).join(', ')}.`
        : 'GROUP BY nie jest tu potrzebne.',
    });
  if (!sameList(mine.having, reference.having))
    findings.push({ level: 'error', message: 'Warunek HAVING różni się od wymaganego.' });
  const sameOrder =
    mine.orderBy.length === reference.orderBy.length &&
    mine.orderBy.every(
      (item, index) =>
        sameTerm(item.term, reference.orderBy[index]!.term) &&
        item.descending === reference.orderBy[index]!.descending,
    );
  if (!sameOrder)
    findings.push({
      level: 'error',
      message: reference.orderBy.length
        ? `Posortuj: ORDER BY ${reference.orderBy
            .map((item) => `${item.term.text}${item.descending ? ' DESC' : ' ASC'}`)
            .join(', ')}.`
        : 'Sortowanie nie jest tu wymagane.',
    });
  if (mine.limit !== reference.limit)
    findings.push({
      level: 'error',
      message: reference.limit
        ? `Ogranicz wynik: LIMIT ${reference.limit}.`
        : 'LIMIT nie jest tu wymagany.',
    });
  if (
    !findings.length &&
    mine.items.length === reference.items.length &&
    mine.items.some((item, index) => !sameTerm(item.term, reference.items[index]!.term))
  )
    findings.push({
      level: 'info',
      message:
        'Kolumny są w innej kolejności niż w poleceniu. Wynik będzie ten sam, ale ułóż je jak w arkuszu.',
    });
  return findings;
}

function compareOther(mine: OtherStatement, reference: OtherStatement): PracticeFinding[] {
  const findings: PracticeFinding[] = [];
  for (const [name, value] of Object.entries(reference.parts)) {
    const actual = mine.parts[name];
    if (actual === undefined || actual === '')
      findings.push({ level: 'error', message: `Brakuje części: ${name} (${value}).` });
    else if (actual !== value)
      findings.push({
        level: 'error',
        message: `${name[0]!.toUpperCase()}${name.slice(1)}: masz „${actual}”, wymagane „${value}”.`,
      });
  }
  for (const name of Object.keys(mine.parts))
    if (!(name in reference.parts))
      findings.push({ level: 'warning', message: `Dodatkowa część instrukcji: ${name}.` });
  return findings;
}

/** Compares the last statement the learner wrote with the prepared reference. */
export function comparePractice(learnerSql: string, referenceSql: string): PracticeComparison {
  const statements = splitStatements(learnerSql);
  const last = statements[statements.length - 1];
  if (!last) return { status: 'empty', findings: [] };
  const referenceStatement = splitStatements(referenceSql).at(-1);
  const reference = referenceStatement
    ? parseStatement(referenceStatement.tokens, referenceStatement.text)
    : null;
  const mine = parseStatement(last.tokens, last.text);
  if (!reference || !mine) return { status: 'empty', findings: [] };
  const findings: PracticeFinding[] = [];
  if (statements.length > 1)
    findings.push({
      level: 'info',
      message: `Porównuję ostatnią z ${statements.length} instrukcji.`,
    });
  if (mine.kind !== reference.kind) {
    findings.push({
      level: 'error',
      message: `To inny rodzaj instrukcji: ten krok wymaga ${reference.kind}, a masz ${mine.kind}.`,
    });
    return { status: 'different', findings };
  }
  findings.push(
    ...(mine.kind === 'SELECT'
      ? compareSelect(mine as SelectQuery, reference as SelectQuery)
      : compareOther(mine as OtherStatement, reference as OtherStatement)),
  );
  return {
    status: findings.some((finding) => finding.level !== 'info') ? 'different' : 'match',
    findings,
  };
}

/** Common kwerendy.txt mistakes that do not depend on a reference. */
export function lintQueries(text: string): PracticeFinding[] {
  const findings: PracticeFinding[] = [];
  const statements = splitStatements(text);
  statements.forEach((statement, index) => {
    const label = `Instrukcja ${index + 1}`;
    const parsed = parseStatement(statement.tokens, statement.text);
    if (parsed?.kind === 'SELECT') {
      const select = parsed as SelectQuery;
      if (select.star)
        findings.push({
          level: 'warning',
          message: `${label}: SELECT * zwraca wszystkie kolumny. Arkusz zwykle wymaga konkretnych pól.`,
        });
      if (select.tables.length > 1 && !select.predicates.some((item) => /=/.test(item.qualified)))
        findings.push({
          level: 'error',
          message: `${label}: tabele nie są połączone warunkiem ON/WHERE.`,
        });
      if (select.predicates.some((item) => /= NULL\b|NULL =/.test(item.qualified)))
        findings.push({
          level: 'error',
          message: `${label}: do porównania z NULL użyj IS NULL / IS NOT NULL.`,
        });
      if (select.predicates.some((item) => / LIKE '[^%_']*'/.test(item.qualified)))
        findings.push({
          level: 'warning',
          message: `${label}: LIKE bez % lub _ działa jak zwykłe =. Do „zaczyna się od” użyj np. 'J%'.`,
        });
    }
  });
  // A statement without a closing semicolon is glued to the next one by phpMyAdmin.
  const tokens = tokenize(text);
  const statementStarts = tokens.filter(
    (token, index) =>
      isWord(token, 'SELECT', 'INSERT', 'UPDATE', 'DELETE', 'CREATE', 'ALTER', 'GRANT', 'DROP') &&
      !isPunct(tokens[index - 1], '(') &&
      index > 0 &&
      !isPunct(tokens[index - 1], ';') &&
      !(isWord(token, 'SELECT') && isWord(tokens[index - 1], 'UNION', 'ALL')),
  );
  if (statementStarts.length)
    findings.push({
      level: 'error',
      message: `Przed „${statementStarts[0]!.value}” brakuje średnika kończącego poprzednią instrukcję.`,
    });
  const lastToken = tokens[tokens.length - 1];
  if (lastToken && !isPunct(lastToken, ';'))
    findings.push({
      level: 'info',
      message:
        'Ostatnia instrukcja nie kończy się średnikiem. Dodaj go, by kolejne kwerendy nie skleiły się.',
    });
  return findings;
}

const STATEMENT_START = [
  'SELECT',
  'INSERT',
  'UPDATE',
  'DELETE',
  'CREATE',
  'ALTER',
  'GRANT',
  'DROP',
];
const CLAUSE_START = [
  'FROM',
  'JOIN',
  'INNER',
  'LEFT',
  'RIGHT',
  'WHERE',
  'AND',
  'OR',
  'GROUP',
  'ORDER',
  'HAVING',
  'LIMIT',
];

export interface PracticeStep {
  /** `${stepId}/${activityId}`, as in the course progress. */
  id: string;
  title: string;
  /** null when the step happens outside SQL (unpacking, importing through the interface). */
  reference: string | null;
  /** Course questions describing the expected result, shown after a matching statement. */
  expect: string[];
  database: string;
}

/**
 * Builds a reference statement for each SQL step of a course from the step's example
 * fragments: a SELECT followed by its WHERE/JOIN additions, or a select expression that
 * wraps an earlier column (e.g. FLOOR(AVG(x)) AS ...).
 */
export function practiceSteps(guide: ExamStudyGuide): PracticeStep[] {
  const steps: PracticeStep[] = [];
  let current = '';
  let database = '';
  for (const step of guide.steps)
    for (const activity of step.activities ?? []) {
      const files = activity.targetFiles ?? [step.fileName];
      if (!files.some((file) => file.toLowerCase() === 'kwerendy.txt')) continue;
      const fragment = activity.exampleCode.trim();
      const tokens = tokenize(fragment);
      const first = upper(tokens[0]);
      let reference: string | null = null;
      // Interface-only steps name the database as "motory — utf8_unicode_ci".
      const named = /^([A-Za-z0-9_]+)\s+—\s+utf8/.exec(fragment);
      if (named) database = named[1]!;
      if (STATEMENT_START.includes(first)) {
        current = fragment;
        reference = current;
        if (first === 'CREATE' && isWord(tokens[1], 'DATABASE')) database = tokens[2]?.value ?? '';
      } else if (CLAUSE_START.includes(first) && /^\s*SELECT\b/i.test(current)) {
        let addition = fragment;
        const hasWhere = splitStatements(current)[0]!.tokens.some((token) =>
          isWord(token, 'WHERE'),
        );
        if (first === 'WHERE' && hasWhere) addition = fragment.replace(/^\s*WHERE\b/i, 'AND');
        current = `${current.replace(/;\s*$/, '')}\n${addition}`;
        reference = current;
      } else if (
        tokens[0]?.type === 'word' &&
        isPunct(tokens[1], '(') &&
        /^\s*SELECT\b/i.test(current)
      ) {
        // A wrapping expression replaces the select item it contains.
        const statement = splitStatements(current)[0]!;
        const selectEnd = statement.tokens.findIndex((token) => isWord(token, 'FROM'));
        const items = splitTop(statement.tokens.slice(1, selectEnd), (token) =>
          isPunct(token, ','),
        );
        const expression = fragment.replace(/;\s*$/, '');
        const target = items.find((item) => {
          const text = current.slice(item[0]!.start, item[item.length - 1]!.end);
          return expression.toLowerCase().includes(text.toLowerCase());
        });
        if (target) {
          current =
            current.slice(0, target[0]!.start) +
            expression +
            current.slice(target[target.length - 1]!.end);
          reference = current;
        }
      }
      steps.push({
        id: `${step.id}/${activity.id}`,
        title: activity.title,
        reference: reference && splitStatements(reference).length ? reference : null,
        expect: (activity.checks ?? [])
          .filter((check) => check.kind === 'manual' && /^Czy\b/.test(check.prompt))
          .map((check) => (check.kind === 'manual' ? check.prompt : '')),
        database,
      });
    }
  return steps;
}

export interface DumpTable {
  name: string;
  columns: { name: string; type: string; primary: boolean }[];
  rows: string[][];
  rowCount: number;
}

const MAX_PREVIEW_ROWS = 200;

/** Reads table structure and data from the learner's own .sql file. Nothing is executed. */
export function parseDump(text: string): DumpTable[] {
  const tables = new Map<string, DumpTable>();
  const table = (name: string) => {
    const key = name.toLowerCase();
    if (!tables.has(key)) tables.set(key, { name, columns: [], rows: [], rowCount: 0 });
    return tables.get(key)!;
  };
  for (const { tokens } of splitStatements(text)) {
    const words = tokens.map(upper);
    if (words[0] === 'CREATE' && words[1] === 'TABLE') {
      let index = 2;
      if (words[2] === 'IF') index = 5;
      const name = tokens[index]?.value;
      const open = tokens.findIndex((token, at) => at > index && isPunct(token, '('));
      if (!name || open < 0) continue;
      const target = table(name);
      let depth = 0,
        close = open;
      for (let i = open; i < tokens.length; i++) {
        if (isPunct(tokens[i], '(')) depth++;
        if (isPunct(tokens[i], ')')) depth--;
        if (depth === 0) {
          close = i;
          break;
        }
      }
      for (const definition of splitTop(tokens.slice(open + 1, close), (token) =>
        isPunct(token, ','),
      )) {
        const head = upper(definition[0]);
        if (
          ['PRIMARY', 'KEY', 'UNIQUE', 'CONSTRAINT', 'INDEX', 'FOREIGN', 'FULLTEXT'].includes(head)
        ) {
          if (head === 'PRIMARY')
            for (const token of definition) {
              const column = target.columns.find(
                (item) => item.name.toLowerCase() === token.value.toLowerCase(),
              );
              if (column && (token.type === 'ident' || token.type === 'word'))
                column.primary = true;
            }
          continue;
        }
        const stop = definition.findIndex(
          (token, at) =>
            at > 1 &&
            [
              'NOT',
              'NULL',
              'DEFAULT',
              'AUTO_INCREMENT',
              'PRIMARY',
              'COMMENT',
              'CHARACTER',
              'COLLATE',
              'UNIQUE',
              'REFERENCES',
            ].includes(upper(token)),
        );
        const type = definition
          .slice(1, stop < 0 ? undefined : stop)
          .map((token) => token.value)
          .join(' ')
          .replace(/\s*\(\s*/g, '(')
          .replace(/\s+\)/g, ')')
          .replace(/\s*,\s*/g, ',');
        target.columns.push({
          name: definition[0]!.value,
          type,
          primary: definition.some((token) => upper(token) === 'PRIMARY'),
        });
      }
    } else if (words[0] === 'ALTER' && words[1] === 'TABLE') {
      const target = tables.get(tokens[2]?.value.toLowerCase() ?? '');
      const primary = words.indexOf('PRIMARY');
      if (target && primary > 0) {
        const open = tokens.findIndex((token, at) => at > primary && isPunct(token, '('));
        for (let i = open + 1; i < tokens.length && !isPunct(tokens[i], ')'); i++) {
          const column = target.columns.find(
            (item) => item.name.toLowerCase() === tokens[i]!.value.toLowerCase(),
          );
          if (column) column.primary = true;
        }
      }
    } else if (words[0] === 'INSERT') {
      const into = words.indexOf('INTO');
      const name = tokens[into + 1]?.value;
      const values = words.indexOf('VALUES');
      if (!name || values < 0) continue;
      const target = table(name);
      for (const tuple of splitTop(tokens.slice(values + 1), (token) => isPunct(token, ','))) {
        const inner = isPunct(tuple[0], '(') ? tuple.slice(1, -1) : tuple;
        target.rowCount++;
        if (target.rows.length < MAX_PREVIEW_ROWS)
          target.rows.push(
            splitTop(inner, (token) => isPunct(token, ',')).map((cell) =>
              cell.length === 1 && isWord(cell[0], 'NULL')
                ? 'NULL'
                : cell.map((token) => token.value).join(''),
            ),
          );
      }
    }
  }
  return [...tables.values()];
}

export function sqlDumpFiles(files: ProjectFile[]): ProjectFile[] {
  return files.filter(
    (file) => file.path.toLowerCase().endsWith('.sql') && file.encoding !== 'base64',
  );
}
