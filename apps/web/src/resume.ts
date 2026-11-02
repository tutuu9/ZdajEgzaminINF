import type { AttemptSnapshot } from '@zdaj/shared';

export function resumeHref(attempt: AttemptSnapshot): string {
  if (attempt.kind === 'theory') return `/teoria?proba=${encodeURIComponent(attempt.id)}`;
  const view =
    attempt.workspace?.view ??
    (attempt.study
      ? 'study'
      : attempt.submittedAt
        ? 'report'
        : attempt.mode === 'nauka'
          ? 'study'
          : 'code');
  const query = new URLSearchParams({
    proba: attempt.id,
    widok: view === 'study' ? 'nauka' : view,
  });
  return `/praktyka/${encodeURIComponent(attempt.taskId ?? '')}?${query}`;
}

export function resumeStep(attempt: AttemptSnapshot): string | undefined {
  const study = attempt.study;
  if (!study) return undefined;
  for (const step of study.guide.steps) {
    const activity = step.activities?.find((item) => `${step.id}/${item.id}` === study.current);
    if (activity) return activity.title;
  }
  return undefined;
}
