/**
 * The exam-system view of a theory series. It follows the CKE description of the electronic
 * written part (40 closed tasks, 60 minutes, Start button, answers in any order, unanswered
 * tasks marked, "Zakończ egzamin" once every task has an answer). Here it is a training run
 * over published CKE examples. The API treats it as "trening". The guide time
 * and the start moment stay in this browser only.
 */
export const OFFICIAL_TASKS = 40;
export const OFFICIAL_MINUTES = 60;
/** 60 minutes for 40 tasks: 90 seconds for each task of a shorter series. */
export const SECONDS_PER_TASK = (OFFICIAL_MINUTES * 60) / OFFICIAL_TASKS;

export interface TheoryExamRecord {
  questionCount: number;
  startedAt?: string;
}

const key = (attemptId: string) => `zdaj:theory-exam:${attemptId}`;

export function guideMilliseconds(questionCount: number) {
  return Math.max(1, questionCount) * SECONDS_PER_TASK * 1000;
}

export function readTheoryExam(attemptId: string): TheoryExamRecord | undefined {
  try {
    const value = JSON.parse(localStorage.getItem(key(attemptId)) ?? 'null') as TheoryExamRecord;
    if (!value || !Number.isInteger(value.questionCount) || value.questionCount < 1)
      return undefined;
    if (value.startedAt !== undefined && !Number.isFinite(Date.parse(value.startedAt)))
      return { questionCount: value.questionCount };
    return value;
  } catch {
    return undefined;
  }
}

export function saveTheoryExam(attemptId: string, record: TheoryExamRecord) {
  try {
    localStorage.setItem(key(attemptId), JSON.stringify(record));
  } catch {
    /* Without storage the view still works for this visit. */
  }
}

export function theoryExamDeadline(record: TheoryExamRecord) {
  if (!record.startedAt) return undefined;
  return new Date(
    Date.parse(record.startedAt) + guideMilliseconds(record.questionCount),
  ).toISOString();
}

/** "37 min 30 s" for 25 tasks. */
export function guideTimeLabel(questionCount: number) {
  const seconds = guideMilliseconds(questionCount) / 1000;
  const minutes = Math.floor(seconds / 60);
  const rest = Math.round(seconds % 60);
  return rest ? `${minutes} min ${rest} s` : `${minutes} min`;
}
