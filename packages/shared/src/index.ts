export type Mode = 'nauka' | 'trening' | 'egzamin';
export type Level = 'beginner' | 'intermediate' | 'advanced';
export type Qualification = 'INF.03' | 'INF.04';
export type CriterionStatus = 'passed' | 'failed' | 'manual' | 'unchecked' | 'error';
export type CheckMethod =
  'file' | 'dom' | 'style' | 'javascript' | 'php' | 'sql' | 'image' | 'manual';
export type RuntimeProfile = 'web' | 'php-mariadb';
export interface ProjectFile {
  path: string;
  content: string;
  encoding?: 'utf8' | 'base64';
}
export interface Topic {
  id: string;
  title: string;
  description: string;
  icon: string;
}
export interface GuidanceStep {
  title: string;
  body: string;
  checkpoint: string;
}
export interface CheckSpec {
  type: string;
  [key: string]: unknown;
}
export interface Criterion {
  id: string;
  title: string;
  description: string;
  method: CheckMethod;
  source: 'educational' | 'official';
  points: number;
  check?: CheckSpec;
}
export interface TaskVersion {
  id: string;
  version: number;
  title: string;
  summary: string;
  qualification: Qualification;
  topicIds: string[];
  technologies: string[];
  durationMinutes: number;
  difficulty: Level;
  runtimeProfile: RuntimeProfile;
  requirements: string[];
  starterFiles: ProjectFile[];
  guidance: Record<Level, GuidanceStep[]>;
  hints: string[];
  criteria: Criterion[];
  followUp: string;
  origin: 'original' | 'exam';
  sourceCatalogId?: string;
  supportStatus?: 'full' | 'partial' | 'catalog-only';
}
export type PublicTask = Omit<TaskVersion, 'criteria' | 'hints'> & {
  criteria: Omit<Criterion, 'check'>[];
};
export interface Lesson {
  id: string;
  version: number;
  topicId: string;
  title: string;
  summary: string;
  minutes: number;
  level: Level;
  body: string;
  objectives: string[];
  exerciseIds: string[];
  order?: number;
}
export interface Exercise {
  id: string;
  topicId: string;
  title: string;
  prompt: string;
  starter: string;
  language: string;
  hints: string[];
  solution: string;
  explanation: string;
}
export type PublicExercise = Omit<Exercise, 'solution' | 'explanation'>;
export interface QuestionOption {
  id: string;
  text: string;
  explanation: string;
}
export interface QuestionRevision {
  id: string;
  version: number;
  topicId: string;
  level: Level;
  prompt: string;
  options: QuestionOption[];
  correctOptionId: string;
  explanation: string;
  reference: string;
  source?: QuestionSource;
}
export interface QuestionSource {
  catalogId: string;
  url: string;
  page: number;
  questionNumber: number;
  top?: number;
  bottom?: number;
}
export interface PublicQuestion {
  id: string;
  version: number;
  topicId: string;
  level: Level;
  prompt: string;
  options: { id: string; text: string }[];
  source?: QuestionSource;
}
export interface StudyActivity {
  id: string;
  title: string;
  explanation: string;
  instruction: string;
  /** Legacy isolated exercises only. Cumulative activities edit the project directly. */
  starterCode?: string;
  exampleCode: string;
  why: string[];
  check: { type: 'self-check'; prompt: string };
  targetFiles?: string[];
  placement?: string;
  checks?: StudyCheckSpec[];
}
export type StudyCheckStatus = 'passed' | 'failed' | 'manual' | 'unsupported' | 'error';
export type StudyCheckSpec = { id: string; title: string } & (
  | { kind: 'file'; path: string; nonEmpty?: boolean }
  | {
      kind: 'html';
      path: string;
      selector: string;
      attribute?: string;
      equals?: string;
      text?: string;
      minCount?: number;
    }
  | {
      kind: 'css';
      path: string;
      entry: string;
      selector: string;
      property: string;
      expected: string[];
    }
  | {
      kind: 'runtime';
      adapter:
        'kursy-calculator' | 'smoki-tabs' | 'firma-contact' | 'salon-calculator' | 'chat-messages';
      entry: string;
    }
  | { kind: 'manual'; prompt: string }
);
export interface StudyCheckRequest {
  token: string;
  guideVersion: number;
  activityId: string;
  projectRevision: number;
  files: ProjectFile[];
}
export interface StudyCheckResult {
  id: string;
  title: string;
  status: StudyCheckStatus;
  evidence: string;
  recommendation: string;
}
export interface StudyCheckReport {
  guideId: string;
  guideVersion: number;
  activityId: string;
  projectRevision: number;
  inputHash: string;
  createdAt: string;
  status: StudyCheckStatus;
  results: StudyCheckResult[];
  disclaimer: string;
}
export interface StudyCheckResponse {
  id: string;
  status: 'queued' | 'running' | 'completed' | 'failed';
  report?: StudyCheckReport;
  error?: string;
}
export interface ExamStudyStep {
  id: string;
  title: string;
  requirement: string;
  page?: number;
  explanation: string;
  starterCode?: string;
  code: string;
  language: string;
  fileName: string;
  why: string[];
  commonMistakes: string[];
  checkpoint: string;
  activities?: StudyActivity[];
}
export interface ExamStudyResource {
  id: string;
  title: string;
  url: string;
  kind: 'starter-archive' | 'solution-archive' | 'walkthrough' | 'criteria';
  publisher: string;
  provenance: 'cke' | 'third-party';
  description: string;
  checkedAt: string;
}
export interface ExamSolutionVariant {
  id: string;
  title: string;
  description: string;
  approach: string;
  url: string;
  downloadUrl?: string;
}
/** Supplemental teaching material; never part of the original CKE task or public bootstrap. */
export interface ExamStudyGuide {
  id: string;
  taskId: string;
  taskVersion: number;
  version: number;
  title: string;
  introduction: string;
  prerequisites: string[];
  steps: ExamStudyStep[];
  resources: ExamStudyResource[];
  variants: ExamSolutionVariant[];
  project?: {
    starterFiles: ProjectFile[];
    requiredFiles: string[];
    coverage: { requirement: string; page: number; activityIds: string[] }[];
  };
}
export interface ExamStudyResponse {
  guide: ExamStudyGuide;
  hintCount: number;
}
export interface QuestionFeedback {
  question: PublicQuestion;
  selectedOptionId: string | null;
  correctOptionId: string;
  correct: boolean;
  explanation: string;
  optionExplanations: Record<string, string>;
}
export interface TheoryResult {
  correct: number;
  total: number;
  percentage: number;
  passed: boolean;
  results: QuestionFeedback[];
  submittedAt: string;
  timedOut?: boolean;
}
export interface CatalogEntry {
  sourcePdf?: { url: string; sourceLabel: string; sourceKind: 'official-source' | 'archive-copy' };
  id: string;
  title: string;
  qualification: Qualification;
  formula: string;
  year: number | null;
  session: string | null;
  identifier: string | null;
  variant: string | null;
  topics: string[];
  technologies: string[];
  sourceUrl: string;
  sourceName: string;
  attachments: { title: string; url: string; type: string; sha256?: string }[];
  criteriaAvailability: 'available' | 'missing' | 'unverified';
  rightsStatus: 'original' | 'unknown' | 'permission-confirmed';
  importStatus: 'metadata-only' | 'verified' | 'incomplete';
  supportStatus: 'full' | 'partial' | 'catalog-only';
  checkedAt: string | null;
  notes: string;
}
export interface CriterionResult {
  criterionId: string;
  title: string;
  method: CheckMethod;
  source: 'educational' | 'official';
  points: number;
  status: CriterionStatus;
  evidence: string;
  recommendation: string;
}
export interface CheckReport {
  taskId: string;
  taskVersion: number;
  createdAt: string;
  results: CriterionResult[];
  confirmedPoints: number;
  checkedPoints: number;
  totalPoints: number;
  complete: boolean;
  percentage: number | null;
  runtimeMs: number;
  disclaimer: string;
  timedOut?: boolean;
}
export interface CheckResponse {
  id: string;
  status: 'queued' | 'running' | 'completed' | 'failed';
  report?: CheckReport;
  error?: string;
}
export interface SiteSettings {
  aiEnabled: boolean;
  checkingEnabled: boolean;
  aiBudgetUsd: number;
  aiDailyLimit: number;
  aiInputTokenLimit: number;
  aiOutputTokenLimit: number;
  aiInputPricePerMillion: number;
  aiOutputPricePerMillion: number;
  queueLimit: number;
}
export const DEFAULT_SETTINGS: SiteSettings = {
  aiEnabled: false,
  checkingEnabled: true,
  aiBudgetUsd: 2,
  aiDailyLimit: 5,
  aiInputTokenLimit: 12000,
  aiOutputTokenLimit: 1500,
  aiInputPricePerMillion: 0.3,
  aiOutputPricePerMillion: 1.2,
  queueLimit: 20,
};
export interface Bootstrap {
  topics: Topic[];
  tasks: PublicTask[];
  lessons: Lesson[];
  exercises: PublicExercise[];
  catalog: CatalogEntry[];
  features: { aiAvailable: boolean; checkingAvailable: boolean };
  questionCount: number;
}
export interface AttemptTicket {
  id: string;
  token: string;
  deadlineAt: string | null;
}
export interface TheoryTicket extends AttemptTicket {
  questions: PublicQuestion[];
}
export interface AttemptSnapshot {
  id: string;
  taskId?: string;
  taskVersion?: number;
  mode: Mode;
  level: Level;
  kind: 'practice' | 'theory';
  title: string;
  createdAt: string;
  updatedAt: string;
  deadlineAt: string | null;
  submittedAt?: string;
  ticket: AttemptTicket;
  files?: ProjectFile[];
  questions?: PublicQuestion[];
  answers?: Record<string, string>;
  hintCount: number;
  revealedHints?: string[];
  report?: CheckReport;
  theoryResult?: TheoryResult;
  checkJob?: { id: string; token: string };
  revision?: number;
  hintOffset?: number;
  legacyProjectId?: string;
  workspace?: {
    view: 'study' | 'code' | 'sheet' | 'preview' | 'report';
    studyPanel?: 'lesson' | 'code' | 'preview';
    sheetPage?: number;
    activeFile: string;
    previewEntry: string;
    editors: Record<string, { anchor: number; head: number; scrollTop: number }>;
  };
  study?: {
    guide: ExamStudyGuide;
    current: string;
    completed: Record<
      string,
      {
        status: 'passed' | 'manual';
        revision: number;
        filesHash: string;
        checkedAt: string;
        evidence: string;
      }
    >;
    viewedExamples: string[];
  };
  recovery?: { id: string; createdAt: string; reason: string; files: ProjectFile[] }[];
}
export interface ContentDraft {
  id: string;
  kind: string;
  key: string;
  version: number;
  status: string;
  payload: unknown;
  createdAt: string;
}
export interface AdminDashboard {
  settings: SiteSettings;
  budget: { spentUsd: number; reservedUsd: number; limitUsd: number };
  stats: Record<string, number>;
  events: { id: string; type: string; detail: unknown; createdAt: string }[];
  jobs: { id: string; status: string; taskId: string; createdAt: string }[];
  balance?: unknown;
}
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
export const MAX_EXTRACTED_BYTES = 50 * 1024 * 1024;
export const MAX_PROJECT_FILES = 500;
export const toPublicQuestion = (q: QuestionRevision): PublicQuestion => ({
  id: q.id,
  version: q.version,
  topicId: q.topicId,
  level: q.level,
  prompt: q.prompt,
  options: q.options.map(({ id, text }) => ({ id, text })),
  ...(q.source ? { source: q.source } : {}),
});
export const toPublicTask = ({ criteria, hints: _hints, ...task }: TaskVersion): PublicTask => ({
  ...task,
  criteria: criteria.map(({ check: _check, ...criterion }) => criterion),
});
export * from './faq.js';
