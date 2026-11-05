/** Advice for the current editor snapshot. Positions use CodeMirror's LF/UTF-16 offsets. */
export interface CodeDiagnostic {
  explanation: string;
  path: string;
  range?: { from: number; to: number };
  warning?: 'missing-file' | 'menu-target';
}
