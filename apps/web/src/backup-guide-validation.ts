import { MAX_EXTRACTED_BYTES, MAX_PROJECT_FILES, type ExamStudyGuide } from '@zdaj/shared';
import { safePath } from './safe-zip';

const fail = (): never => {
  throw new Error(
    'Kopia zawiera nieprawidłowe dane przewodnika lub projektu. Nie zaimportowano żadnych zmian.',
  );
};
const record = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : fail();
const text = (value: unknown, max = 100_000): string =>
  typeof value === 'string' && value.length <= max ? value : fail();
const list = (value: unknown, max = 1000): unknown[] =>
  Array.isArray(value) && value.length <= max ? value : fail();
const id = (value: unknown): string => {
  const result = text(value, 128);
  return /^[a-z0-9][a-z0-9._-]*$/i.test(result) &&
    !['constructor', 'prototype', '__proto__'].includes(result)
    ? result
    : fail();
};
const integer = (value: unknown, max = Number.MAX_SAFE_INTEGER): number =>
  typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= max
    ? value
    : fail();
const member = (value: unknown, values: readonly string[]): string =>
  typeof value === 'string' && values.includes(value) ? value : fail();
const fields = (value: Record<string, unknown>, allowed: string[]) => {
  if (Object.keys(value).some((key) => !allowed.includes(key))) fail();
};
const path = (value: unknown) => {
  try {
    return safePath(text(value, 240));
  } catch {
    return fail();
  }
};
const date = (value: unknown) => {
  const result = text(value, 40);
  if (!Number.isFinite(Date.parse(result))) fail();
};
const strings = (value: unknown, max = 1000, length = 20_000) =>
  list(value, max).forEach((item) => text(item, length));
const https = (value: unknown) => {
  try {
    const url = new URL(text(value, 4000));
    if (url.protocol !== 'https:' || url.username || url.password) fail();
  } catch {
    fail();
  }
};

export function validateProjectFiles(value: unknown): void {
  const paths = new Set<string>();
  let bytes = 0;
  for (const raw of list(value, MAX_PROJECT_FILES)) {
    const file = record(raw);
    fields(file, ['path', 'content', 'encoding']);
    const name = path(file.path).toLocaleLowerCase('pl');
    if (paths.has(name)) fail();
    paths.add(name);
    const content = text(file.content, MAX_EXTRACTED_BYTES);
    if (file.encoding !== undefined) member(file.encoding, ['utf8', 'base64']);
    if (file.encoding === 'base64') {
      if (!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(content)) fail();
      bytes += (content.length * 3) / 4;
    } else bytes += new TextEncoder().encode(content).length;
    if (bytes > MAX_EXTRACTED_BYTES) fail();
  }
}

/** Only declarative built-in checks survive import. No executable checker payloads. */
function validateCheck(value: unknown): void {
  const check = record(value);
  text(check.id, 1000);
  text(check.title, 1000);
  switch (check.kind) {
    case 'file':
      fields(check, ['id', 'title', 'kind', 'path', 'nonEmpty']);
      path(check.path);
      if (check.nonEmpty !== undefined && typeof check.nonEmpty !== 'boolean') fail();
      break;
    case 'html':
      fields(check, [
        'id',
        'title',
        'kind',
        'path',
        'selector',
        'attribute',
        'equals',
        'text',
        'minCount',
      ]);
      path(check.path);
      text(check.selector, 2000);
      for (const key of ['attribute', 'equals', 'text'])
        if (check[key] !== undefined) text(check[key], 5000);
      if (check.minCount !== undefined) integer(check.minCount, 10000);
      break;
    case 'css':
      fields(check, ['id', 'title', 'kind', 'path', 'entry', 'selector', 'property', 'expected']);
      path(check.path);
      path(check.entry);
      text(check.selector, 2000);
      if (!/^(?:--)?[a-zA-Z][a-zA-Z0-9-]*$/.test(text(check.property, 200))) fail();
      strings(check.expected, 100, 2000);
      break;
    case 'runtime':
      fields(check, ['id', 'title', 'kind', 'adapter', 'entry']);
      member(check.adapter, [
        'kursy-calculator',
        'smoki-tabs',
        'firma-contact',
        'salon-calculator',
        'chat-messages',
      ]);
      path(check.entry);
      break;
    case 'manual':
      fields(check, ['id', 'title', 'kind', 'prompt']);
      text(check.prompt);
      break;
    default:
      fail();
  }
}

export function validateCachedGuide(value: unknown): {
  guide: ExamStudyGuide;
  activityIds: Set<string>;
} {
  const guide = record(value);
  fields(guide, [
    'id',
    'taskId',
    'taskVersion',
    'version',
    'title',
    'introduction',
    'prerequisites',
    'steps',
    'resources',
    'variants',
    'project',
  ]);
  id(guide.id);
  id(guide.taskId);
  if (!integer(guide.version, 10000) || !integer(guide.taskVersion, 10000)) fail();
  text(guide.title, 1000);
  text(guide.introduction);
  strings(guide.prerequisites);
  const stepIds = new Set<string>(),
    activityIds = new Set<string>();
  for (const raw of list(guide.steps, 100)) {
    const step = record(raw),
      stepId = id(step.id);
    fields(step, [
      'id',
      'title',
      'requirement',
      'page',
      'explanation',
      'starterCode',
      'code',
      'language',
      'fileName',
      'why',
      'commonMistakes',
      'checkpoint',
      'activities',
    ]);
    if (stepIds.has(stepId)) fail();
    stepIds.add(stepId);
    for (const key of ['title', 'requirement', 'explanation', 'code', 'language', 'checkpoint'])
      text(step[key]);
    if (step.starterCode !== undefined) text(step.starterCode);
    if (step.page !== undefined && !integer(step.page, 1000)) fail();
    path(step.fileName);
    strings(step.why);
    strings(step.commonMistakes);
    if (step.activities !== undefined)
      for (const activityRaw of list(step.activities, 100)) {
        const activity = record(activityRaw),
          activityId = `${stepId}/${id(activity.id)}`;
        fields(activity, [
          'id',
          'title',
          'explanation',
          'instruction',
          'starterCode',
          'exampleCode',
          'why',
          'check',
          'targetFiles',
          'placement',
          'checks',
        ]);
        if (activityIds.has(activityId)) fail();
        activityIds.add(activityId);
        for (const key of ['title', 'explanation', 'instruction', 'exampleCode'])
          text(activity[key]);
        if (activity.starterCode !== undefined) text(activity.starterCode);
        if (activity.placement !== undefined) text(activity.placement);
        strings(activity.why);
        const check = record(activity.check);
        fields(check, ['type', 'prompt']);
        member(check.type, ['self-check']);
        text(check.prompt);
        if (activity.targetFiles !== undefined)
          list(activity.targetFiles, MAX_PROJECT_FILES).forEach(path);
        if (activity.checks !== undefined) list(activity.checks, 100).forEach(validateCheck);
      }
  }
  for (const raw of list(guide.resources, 100)) {
    const resource = record(raw);
    fields(resource, [
      'id',
      'title',
      'url',
      'kind',
      'publisher',
      'provenance',
      'description',
      'checkedAt',
    ]);
    id(resource.id);
    text(resource.title, 1000);
    https(resource.url);
    member(resource.kind, ['starter-archive', 'solution-archive', 'walkthrough', 'criteria']);
    member(resource.provenance, ['cke', 'third-party']);
    text(resource.publisher, 1000);
    text(resource.description);
    date(resource.checkedAt);
  }
  for (const raw of list(guide.variants, 100)) {
    const variant = record(raw);
    fields(variant, ['id', 'title', 'description', 'approach', 'url', 'downloadUrl']);
    id(variant.id);
    text(variant.title, 1000);
    text(variant.description);
    text(variant.approach);
    https(variant.url);
    if (variant.downloadUrl !== undefined) https(variant.downloadUrl);
  }
  if (guide.project !== undefined) {
    const project = record(guide.project);
    fields(project, ['starterFiles', 'requiredFiles', 'coverage']);
    validateProjectFiles(project.starterFiles);
    list(project.requiredFiles, MAX_PROJECT_FILES).forEach(path);
    for (const raw of list(project.coverage, 500)) {
      const coverage = record(raw);
      fields(coverage, ['requirement', 'page', 'activityIds']);
      text(coverage.requirement);
      if (!integer(coverage.page, 1000)) fail();
      for (const activityId of list(coverage.activityIds, 100))
        if (typeof activityId !== 'string' || !activityIds.has(activityId)) fail();
    }
  }
  return { guide: value as ExamStudyGuide, activityIds };
}

export function validateProjectState(item: Record<string, unknown>): void {
  if (item.revision !== undefined) integer(item.revision);
  if (item.hintOffset !== undefined) integer(item.hintOffset);
  if (item.legacyProjectId !== undefined) id(item.legacyProjectId);
  if (item.workspace !== undefined) {
    const workspace = record(item.workspace);
    fields(workspace, ['view', 'studyPanel', 'sheetPage', 'activeFile', 'previewEntry', 'editors']);
    member(workspace.view, ['study', 'code', 'sheet', 'preview', 'report']);
    if (workspace.studyPanel !== undefined)
      member(workspace.studyPanel, ['lesson', 'code', 'preview']);
    if (workspace.sheetPage !== undefined) {
      integer(workspace.sheetPage);
      if (workspace.sheetPage === 0) fail();
    }
    if (workspace.activeFile !== '') path(workspace.activeFile);
    if (workspace.previewEntry !== '') path(workspace.previewEntry);
    const entries = Object.entries(record(workspace.editors));
    if (entries.length > MAX_PROJECT_FILES) fail();
    for (const [key, raw] of entries) {
      path(key);
      const editor = record(raw);
      fields(editor, ['anchor', 'head', 'scrollTop']);
      integer(editor.anchor, MAX_EXTRACTED_BYTES);
      integer(editor.head, MAX_EXTRACTED_BYTES);
      if (
        typeof editor.scrollTop !== 'number' ||
        !Number.isFinite(editor.scrollTop) ||
        editor.scrollTop < 0 ||
        editor.scrollTop > 1_000_000_000
      )
        fail();
    }
  }
  if (item.study !== undefined) {
    if (item.kind !== 'practice' || (item.mode === 'egzamin' && item.submittedAt === undefined))
      fail();
    const study = record(item.study);
    fields(study, ['guide', 'current', 'completed', 'viewedExamples']);
    const { guide, activityIds } = validateCachedGuide(study.guide);
    if (
      guide.taskId !== item.taskId ||
      guide.taskVersion !== item.taskVersion ||
      typeof study.current !== 'string' ||
      !activityIds.has(study.current)
    )
      fail();
    for (const [activityId, raw] of Object.entries(record(study.completed))) {
      if (!activityIds.has(activityId)) fail();
      const completed = record(raw);
      fields(completed, ['status', 'revision', 'filesHash', 'checkedAt', 'evidence']);
      member(completed.status, ['passed', 'manual']);
      integer(completed.revision);
      date(completed.checkedAt);
      text(completed.evidence);
      if (!/^[a-f0-9]{64}$/i.test(text(completed.filesHash, 64))) fail();
    }
    for (const activityId of list(study.viewedExamples, 10000))
      if (typeof activityId !== 'string' || !activityIds.has(activityId)) fail();
  }
  if (item.recovery !== undefined)
    for (const raw of list(item.recovery, 20)) {
      const recovery = record(raw);
      fields(recovery, ['id', 'createdAt', 'reason', 'files']);
      id(recovery.id);
      date(recovery.createdAt);
      text(recovery.reason);
      validateProjectFiles(recovery.files);
    }
}
