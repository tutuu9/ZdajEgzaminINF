import type { AttemptSnapshot, ExamStudyGuide } from '@zdaj/shared';

export function comparisonProject(): AttemptSnapshot {
  const guide: ExamStudyGuide = {
    id: 'test-guide',
    taskId: 'test-paper',
    taskVersion: 1,
    version: 1,
    title: 'Przewodnik testowy',
    introduction: 'Tylko dane testowe.',
    prerequisites: [],
    resources: [],
    variants: [],
    project: { starterFiles: [], requiredFiles: ['index.html'], coverage: [] },
    steps: Array.from({ length: 12 }, (_, index) => ({
      id: `step-${index}`,
      title: 'HTML',
      requirement: 'Język dokumentu',
      explanation: 'Wyjaśnienie',
      code: '',
      language: 'html',
      fileName: 'index.html',
      why: [],
      commonMistakes: [],
      checkpoint: 'Sprawdź język.',
      activities: [
        {
          id: 'edit',
          title: 'Język',
          explanation: 'Zmień język.',
          instruction: 'Ustaw język polski.',
          exampleCode: '',
          why: [],
          targetFiles: ['index.html'],
          check: { type: 'self-check' as const, prompt: 'Sprawdź język.' },
          checks: [
            {
              id: 'language',
              kind: 'html' as const,
              title: 'Język HTML',
              path: 'index.html',
              selector: 'html',
              attribute: 'lang',
              equals: 'pl',
            },
          ],
        },
      ],
    })),
  };
  return {
    id: 'comparison-project',
    ticket: { id: 'original-ticket', token: 'a'.repeat(32), deadlineAt: null },
    kind: 'practice',
    taskId: guide.taskId,
    taskVersion: 1,
    title: 'Mój projekt',
    mode: 'nauka',
    level: 'beginner',
    createdAt: '2026-11-07T10:00:00.000Z',
    updatedAt: '2026-11-07T10:00:00.000Z',
    deadlineAt: null,
    hintCount: 7,
    revision: 0,
    files: [
      { path: 'index.html', content: '<html lang="en">\r\nŻółć 🌱\r\n</html>', encoding: 'utf8' },
      { path: 'styl.css', content: '', encoding: 'utf8' },
    ],
    workspace: {
      view: 'study',
      activeFile: 'index.html',
      previewEntry: 'index.html',
      editors: { 'index.html': { anchor: 5, head: 5, scrollTop: 0 } },
    },
    study: { guide, current: 'step-0/edit', completed: {}, viewedExamples: [] },
  };
}
