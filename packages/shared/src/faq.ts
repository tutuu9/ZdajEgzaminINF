export const FAQ_CATEGORIES = [
  { id: 'about', label: 'O egzaminie' },
  { id: 'registration', label: 'Zapisy i terminy' },
  { id: 'written', label: 'Część pisemna' },
  { id: 'practical', label: 'Część praktyczna' },
  { id: 'results', label: 'Wyniki i poprawki' },
  { id: 'accommodations', label: 'Dostosowania' },
  { id: 'service', label: 'Działanie serwisu' },
] as const;

export type FaqCategoryId = (typeof FAQ_CATEGORIES)[number]['id'];
export type FaqType = 'rules' | 'advice' | 'service';

export const FAQ_TYPE_LABELS: Record<FaqType, string> = {
  rules: 'Zasady egzaminu',
  advice: 'Wskazówki do nauki',
  service: 'Działanie serwisu',
};

export interface FaqSource {
  title: string;
  url: string;
  section: string;
}

export interface FaqRevision {
  id: string;
  version: number;
  categoryId: FaqCategoryId;
  question: string;
  /** Plain text paragraphs, separated by a blank line. Never executable HTML. */
  answer: string;
  order: number;
  sources: FaqSource[];
  reviewedAt: string;
  schoolYear?: string;
  type: FaqType;
}

export interface FaqResponse {
  entries: FaqRevision[];
}
