/**
 * The handbook is explanatory teaching material: short chapters with examples. It holds no
 * tasks, questions or answer keys; practice always happens on the original CKE papers, which
 * each chapter links to.
 */
export type HandbookBookId = 'html' | 'css' | 'javascript' | 'sql';

/** A live example: the parts are joined into one sandboxed preview document. */
export interface WebExample {
  kind: 'web';
  /** Which part the reader sees as code; the other parts only build the preview. */
  show: 'html' | 'css' | 'js';
  html: string;
  css?: string;
  js?: string;
}

/** An SQL example with a result read from the paper's own database export. */
export interface SqlExample {
  kind: 'sql';
  code: string;
  result?: { columns: string[]; rows: string[][]; source: string };
}

export interface HandbookSection {
  heading: string;
  /** Markdown: paragraphs, lists and inline code. */
  body: string;
  example?: WebExample | SqlExample;
}

/** A paper in the catalogue where the chapter's topic is required. */
export interface PaperUse {
  taskId: string;
  title: string;
  /** What exactly that paper asks for, in one short sentence. */
  note: string;
}

export interface HandbookChapter {
  id: string;
  title: string;
  summary: string;
  sections: HandbookSection[];
  mistakes: string[];
  papers: PaperUse[];
}

export interface HandbookBook {
  id: HandbookBookId;
  title: string;
  description: string;
  chapters: HandbookChapter[];
}
