type ResultCategory = 'database' | 'content' | 'behaviour' | 'style' | 'script' | 'graphics';

const resultCategories = new Map<string, ResultCategory>([
  ['operacje na bazie danych', 'database'],
  ['zawartość witryny internetowej', 'content'],
  ['wygląd witryny internetowej', 'content'],
  ['działanie witryny internetowej', 'behaviour'],
  ['styl CSS witryny internetowej', 'style'],
  ['skrypt', 'script'],
  ['skrypty', 'script'],
  ['skrypt połączenia z bazą', 'script'],
  ['grafika i animacja', 'graphics'],
]);

// Navigation from the printed result to a relevant stage of its existing course.
const practiceSteps: Record<string, Partial<Record<ResultCategory, string>>> = {
  'cke-wedkowanie': {
    database: 'select',
    content: 'html',
    behaviour: 'php-list',
    style: 'css',
    script: 'php-connection',
  },
  'inf03-01-25-01-sg': {
    database: 'sql-permissions',
    content: 'structure',
    behaviour: 'calculator',
    style: 'selectors',
    script: 'calculator',
  },
  'inf03-08-25-06-sg': {
    database: 'sql',
    content: 'structure',
    behaviour: 'tabs',
    style: 'css',
    script: 'php-filter',
  },
  'inf03-01-24-06-sg': {
    database: 'queries',
    content: 'content',
    behaviour: 'php-count',
    style: 'layout',
    script: 'php-list',
  },
  'inf03-03-24-06-sg': {
    database: 'queries',
    content: 'form',
    behaviour: 'php-rows',
    style: 'layout',
    script: 'php-form',
  },
  'inf03-01-24-01-sg': {
    content: 'structure',
    behaviour: 'runtime',
    style: 'appearance',
    script: 'javascript',
    graphics: 'graphics',
  },
  'inf03-05-24-01-sg': {
    database: 'queries',
    content: 'offer',
    behaviour: 'runtime',
    style: 'appearance',
    script: 'javascript',
  },
  'inf03-02-24-06-sg': {
    database: 'queries',
    content: 'conversation',
    behaviour: 'runtime',
    style: 'appearance',
    script: 'send-script',
  },
  'inf03-02-25-06-sg': {
    database: 'queries',
    content: 'content',
    behaviour: 'behaviour',
    style: 'layout',
    script: 'script',
  },
  'inf03-06-25-01-sg': {
    database: 'queries',
    content: 'table',
    behaviour: 'behaviour',
    style: 'layout',
    script: 'script',
  },
  'inf03-02-25-01-sg': {
    database: 'queries',
    content: 'offer',
    behaviour: 'behaviour',
    style: 'style',
    script: 'script',
  },
  'inf03-11-26-06-sg': {
    database: 'queries',
    content: 'content',
    behaviour: 'behaviour',
    style: 'layout',
    script: 'script',
  },
  'inf03-12-26-06-sg': {
    database: 'queries',
    content: 'form',
    behaviour: 'behaviour',
    style: 'layout',
    script: 'script',
  },
  'inf03-07-26-06-sg': {
    database: 'queries',
    content: 'content',
    behaviour: 'behaviour',
    style: 'layout',
    script: 'script',
  },
  'inf03-03-26-06-sg': {
    database: 'queries',
    content: 'gallery',
    behaviour: 'behaviour',
    style: 'layout',
    script: 'script',
  },
};

export function practiceStepForResult(taskId: string, result: string): string | undefined {
  const category = resultCategories.get(result);
  if (category && Object.hasOwn(practiceSteps, taskId)) return practiceSteps[taskId]?.[category];
}

export function practiceSkillForResult(
  paperId: string,
  result: string,
  technologies: string[],
): 'sql' | 'php' | undefined {
  const step = practiceStepForResult(paperId, result);
  if (!step) return undefined;
  const category = resultCategories.get(result);
  if (category === 'database') return 'sql';
  if (
    step.startsWith('php-') ||
    (category === 'script' && step === 'script' && technologies.includes('PHP'))
  )
    return 'php';
}
