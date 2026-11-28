import type { SandboxRunStatement, SqlResultFeedback } from '@zdaj/shared';

// INF.03-03-24.06-SG, page 2, query 3. The original dump is supplied by the learner.
export const riverWarningQuery = `SELECT w.nazwa, w.rzeka, w.stanOstrzegawczy, w.stanAlarmowy, p.stanWody
FROM wodowskazy w JOIN pomiary p ON w.id = p.wodowskazy_id
WHERE p.dataPomiaru = '2022-05-05' AND p.stanWody > w.stanOstrzegawczy`;

type Row = (string | null)[];

function unmatchedRows(rows: Row[], other: Row[]): Row[] {
  const counts = new Map<string, number>();
  for (const row of other) {
    const key = JSON.stringify(row);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return rows.filter((row) => {
    const key = JSON.stringify(row);
    const remaining = counts.get(key) ?? 0;
    if (remaining === 0) return true;
    counts.set(key, remaining - 1);
    return false;
  });
}

export function compareSqlResults(
  reference: SandboxRunStatement | undefined,
  answers: SandboxRunStatement[],
  omitted: number,
): SqlResultFeedback {
  if (reference?.status !== 'rows' || !reference.columns?.length || !reference.rows?.length)
    return { status: 'unavailable', reason: 'reference' };
  const [answer] = answers;
  if (
    answers.length !== 1 ||
    omitted ||
    answer?.status !== 'rows' ||
    !answer.columns ||
    !answer.rows
  )
    return { status: 'unavailable', reason: 'statement' };
  if (reference.truncated || answer.truncated)
    return { status: 'unavailable', reason: 'truncated' };
  const names = answer.columns.map((name) => name.toLowerCase());
  const positions = reference.columns.map((name) => names.indexOf(name.toLowerCase()));
  if (answer.columns.length !== reference.columns.length) {
    const missing = reference.columns.filter((_, index) => positions[index] === -1);
    const allColumnsNamed = names.every((_, index) => positions.includes(index));
    return {
      status: 'columns',
      expected: reference.columns,
      actualCount: answer.columns.length,
      ...(missing.length && allColumnsNamed ? { missing } : {}),
    };
  }

  const answerRows = positions.every((index) => index >= 0)
    ? answer.rows.map((row) => positions.map((index) => row[index]!))
    : answer.rows;
  const missing = unmatchedRows(reference.rows, answerRows);
  const extra = unmatchedRows(answerRows, reference.rows);
  return missing.length || extra.length ? { status: 'rows', missing, extra } : { status: 'match' };
}
