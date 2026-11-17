/**
 * Facts for the report after a simulated exam: time used and which of the paper's
 * required files exist in the project. Nothing here is a score; the learner's own
 * review of the assessed results is kept separately in this browser.
 */
import type { ProjectFile } from '@zdaj/shared';

export type HandInStatus = 'present' | 'wrong-case' | 'missing';
export interface HandInFile {
  /** As printed in the paper. */
  name: string;
  status: HandInStatus;
  /** The project file that matched, when its name differs from the printed one. */
  actual?: string;
}

const baseName = (path: string) => path.split('/').pop() ?? path;
const withoutExtension = (name: string) => name.replace(/\.[^.]+$/, '');

/**
 * Compares printed names with the project. A name printed without an extension (as in
 * INF.03-01-24.01-SG) matches any extension. Letter case matters on the examiner's side,
 * so a case-only difference is reported separately.
 */
export function matchHandInFiles(required: string[], files: ProjectFile[]): HandInFile[] {
  const names = files.map((file) => baseName(file.path));
  return required.map((name) => {
    const comparable = (candidate: string) =>
      name.includes('.') ? candidate : withoutExtension(candidate);
    const exact = names.find((candidate) => comparable(candidate) === name);
    if (exact)
      return exact === name
        ? { name, status: 'present' }
        : { name, status: 'present', actual: exact };
    const loose = names.find(
      (candidate) => comparable(candidate).toLowerCase() === name.toLowerCase(),
    );
    return loose ? { name, status: 'wrong-case', actual: loose } : { name, status: 'missing' };
  });
}

export interface ExamTiming {
  limitMinutes: number;
  usedMinutes: number;
  overtime: boolean;
}

/** Time from the start of the timed attempt (deadline minus duration) to hand-in. */
export function examTiming(
  deadlineAt: string,
  submittedAt: string,
  limitMinutes: number,
): ExamTiming {
  const start = Date.parse(deadlineAt) - limitMinutes * 60_000;
  const used = Math.max(0, Date.parse(submittedAt) - start);
  return {
    limitMinutes,
    usedMinutes: Math.ceil(used / 60_000),
    overtime: Date.parse(submittedAt) > Date.parse(deadlineAt),
  };
}

export type ResultReview = 'done' | 'partial' | 'missing';
export interface ExamReview {
  /** Files the learner confirms having outside this project (e.g. screenshots). */
  confirmedFiles: string[];
  results: Record<string, ResultReview>;
}

const reviewKey = (attemptId: string) => `zdaj:exam-review:${attemptId}`;

export function loadReview(attemptId: string): ExamReview {
  try {
    const value = JSON.parse(localStorage.getItem(reviewKey(attemptId)) ?? 'null') as ExamReview;
    if (value && Array.isArray(value.confirmedFiles) && typeof value.results === 'object')
      return value;
  } catch {
    /* A missing or unreadable review starts empty. */
  }
  return { confirmedFiles: [], results: {} };
}

export function saveReview(attemptId: string, review: ExamReview) {
  try {
    localStorage.setItem(reviewKey(attemptId), JSON.stringify(review));
  } catch {
    /* The review still works for this visit without storage. */
  }
}
