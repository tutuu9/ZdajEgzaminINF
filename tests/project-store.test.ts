import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AttemptSnapshot, ExamStudyGuide } from '@zdaj/shared';
const mocks = vi.hoisted(() => ({ save: vi.fn(), read: vi.fn(), api: vi.fn() }));
vi.mock('../apps/web/src/storage', () => ({
  saveProjectRevision: mocks.save,
  readAttempt: mocks.read,
}));
vi.mock('../apps/web/src/api', async (original) => ({
  ...(await original<object>()),
  api: mocks.api,
}));
import { ApiError } from '../apps/web/src/api';
import { ProjectStore } from '../apps/web/src/project-store';
import { resumeHref } from '../apps/web/src/resume';

const initial = (): AttemptSnapshot => ({
  id: 'local-project',
  ticket: { id: 'old-ticket', token: 'test-token', deadlineAt: null },
  kind: 'practice',
  taskId: 'inf03-01-25-01-sg',
  taskVersion: 1,
  title: 'Kursy',
  mode: 'nauka',
  level: 'beginner',
  createdAt: '2026-11-02T10:00:00.000Z',
  updatedAt: '2026-11-02T10:00:00.000Z',
  deadlineAt: null,
  hintCount: 7,
  revision: 0,
  files: [{ path: 'index.html', content: '<html></html>' }],
  workspace: { view: 'study', activeFile: 'index.html', previewEntry: 'index.html', editors: {} },
});

beforeEach(() => {
  vi.clearAllMocks();
  mocks.save.mockResolvedValue(undefined);
});
describe('one durable cumulative project', () => {
  it('restores a newer saved revision from another tab only when its own state is clean', async () => {
    const store = new ProjectStore(initial());
    store.restoreIfNewer({
      ...initial(),
      revision: 7,
      files: [{ path: 'index.html', content: 'newer saved' }],
    });
    expect(store.get().project.files![0]!.content).toBe('newer saved');
    mocks.save.mockRejectedValueOnce(new Error('conflict'));
    await expect(
      store.patch((current) => ({
        ...current,
        files: [{ path: 'index.html', content: 'unsaved work' }],
      })),
    ).rejects.toThrow();
    store.restoreIfNewer({ ...initial(), revision: 10 });
    expect(store.get().project.files![0]!.content).toBe('unsaved work');
  });
  it('serializes rapid edits and merges delayed metadata into the newest code', async () => {
    const store = new ProjectStore(initial());
    const first = store.patch((current) => ({
      ...current,
      files: [{ path: 'index.html', content: '<html lang="pl"></html>' }],
    }));
    const second = store.patch((current) => ({
      ...current,
      files: current.files!.map((file) => ({
        ...file,
        content: file.content.replace('</html>', '<head></head></html>'),
      })),
    }));
    const hint = store.patch((current) => ({ ...current, hintCount: current.hintCount + 1 }));
    await Promise.all([first, second, hint]);
    expect(store.get().project.files![0]!.content).toBe('<html lang="pl"><head></head></html>');
    expect(store.get().project.hintCount).toBe(8);
    expect(mocks.save.mock.calls.map((call) => call[1])).toEqual([0, 1, 2]);
    expect(store.get().saving).toBe(false);
  });
  it('does not report a completed save while an older write is still pending', async () => {
    let release = () => {};
    mocks.save.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          release = resolve;
        }),
    );
    const store = new ProjectStore(initial());
    const editing = store.patch((current) => ({
      ...current,
      files: [{ path: 'index.html', content: 'moj kod' }],
    }));
    const moving = store.patch((current) => ({
      ...current,
      workspace: { ...current.workspace!, activeFile: 'style.css' },
    }));
    await Promise.resolve();
    expect(store.get().saving).toBe(true);
    expect(mocks.save).toHaveBeenCalledTimes(1);
    release();
    await Promise.all([editing, moving]);
    expect(store.get().project.files![0]!.content).toBe('moj kod');
    expect(store.get().project.workspace!.activeFile).toBe('style.css');
  });
  it('retains unsaved code after quota failure and retries without reapplying a scaffold', async () => {
    mocks.save.mockRejectedValueOnce(new Error('quota'));
    const store = new ProjectStore(initial());
    await expect(
      store.patch((current) => ({
        ...current,
        files: [{ path: 'index.html', content: 'zachowaj mnie' }],
      })),
    ).rejects.toThrow('quota');
    expect(store.get().project.files![0]!.content).toBe('zachowaj mnie');
    await expect(store.patch((current) => ({ ...current, hintCount: 0 }))).rejects.toThrow('quota');
    await store.retry();
    expect(store.get().error).toBe('');
    expect(mocks.save.mock.calls.at(-1)![0].files[0].content).toBe('zachowaj mnie');
    expect(store.get().project.hintCount).toBe(7);
  });
  it('keeps conflicting in-memory work until an explicit reload', async () => {
    mocks.save.mockRejectedValueOnce(new Error('inna karta'));
    const store = new ProjectStore(initial());
    await expect(
      store.patch((current) => ({
        ...current,
        files: [{ path: 'index.html', content: 'pierwsza karta' }],
      })),
    ).rejects.toThrow();
    mocks.read.mockResolvedValue({
      ...initial(),
      revision: 5,
      files: [{ path: 'index.html', content: 'druga karta' }],
    });
    expect(store.get().project.files![0]!.content).toBe('pierwsza karta');
    await store.reload();
    expect(store.get().project.files![0]!.content).toBe('druga karta');
    expect(store.get().project.revision).toBe(5);
  });
  it('persists typing that arrives while a failed save is being retried', async () => {
    const store = new ProjectStore(initial());
    mocks.save.mockRejectedValueOnce(new Error('quota'));
    await expect(
      store.patch((current) => ({
        ...current,
        files: [{ path: 'index.html', content: 'before retry' }],
      })),
    ).rejects.toThrow();
    let release = () => {};
    mocks.save.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          release = resolve;
        }),
    );
    const retry = store.retry();
    await Promise.resolve();
    await expect(
      store.patch((current) => ({
        ...current,
        files: [{ path: 'index.html', content: 'typed during retry' }],
      })),
    ).rejects.toThrow();
    release();
    await retry;
    expect(store.get().project.files![0]!.content).toBe('typed during retry');
    expect(mocks.save.mock.calls.at(-1)![0].files[0].content).toBe('typed during retry');
    expect(store.get().error).toBe('');
  });
  it('deduplicates expired learning-ticket replacement while preserving the local project', async () => {
    const store = new ProjectStore(initial());
    mocks.api.mockResolvedValue({ id: 'fresh-ticket', token: 'fresh-token', deadlineAt: null });
    const operation = vi.fn(async (project: AttemptSnapshot) => {
      if (project.ticket.id === 'old-ticket') throw new ApiError('expired', 410);
      return project.ticket.id;
    });
    expect(await Promise.all([store.request(operation), store.request(operation)])).toEqual([
      'fresh-ticket',
      'fresh-ticket',
    ]);
    expect(mocks.api).toHaveBeenCalledTimes(1);
    expect(store.get().project).toMatchObject({
      id: 'local-project',
      hintCount: 7,
      hintOffset: 7,
      createdAt: initial().createdAt,
      files: initial().files,
    });
    expect(mocks.save.mock.calls[0]![0].ticket.id).toBe('fresh-ticket');
  });
  it.each([0, 403, 500])(
    'does not replace a ticket on transport/permission error %s',
    async (status) => {
      const store = new ProjectStore(initial());
      await expect(
        store.request(async () => {
          throw new ApiError('failure', status);
        }),
      ).rejects.toThrow();
      expect(mocks.api).not.toHaveBeenCalled();
    },
  );
  it.each(['exam', 'closed'])('never resets the deadline or reopens a %s project', async (kind) => {
    const project = initial();
    if (kind === 'exam') {
      project.mode = 'egzamin';
      project.deadlineAt = '2026-11-02T12:30:00Z';
    } else project.submittedAt = '2026-11-02T11:00:00Z';
    const store = new ProjectStore(project);
    await expect(
      store.request(async () => {
        throw new ApiError('expired', 410);
      }),
    ).rejects.toThrow();
    expect(mocks.api).not.toHaveBeenCalled();
    expect(store.get().project).toEqual(project);
  });
  it('uses the authorized pinned guide and keeps the selected view in resume links', async () => {
    const project = initial();
    const guide = {
      id: 'guide',
      version: 3,
      taskId: project.taskId,
      taskVersion: 1,
      steps: [],
      project: { starterFiles: [], requiredFiles: [], coverage: [] },
    } as unknown as ExamStudyGuide;
    project.study = { guide, current: 'html/lang', completed: {}, viewedExamples: [] };
    const store = new ProjectStore(project);
    expect(await store.loadGuide()).toBe(guide);
    expect(mocks.api).not.toHaveBeenCalled();
    expect(resumeHref(project)).toBe('/praktyka/inf03-01-25-01-sg?proba=local-project&widok=nauka');
    expect(project.files).toEqual(initial().files);
  });

  it('resolves and pins the latest available guide without assuming revision three', async () => {
    const project = initial();
    const guide = {
      id: 'new-paper-guide',
      version: 1,
      taskId: project.taskId,
      taskVersion: 1,
      steps: [{ id: 'html', activities: [{ id: 'document' }] }],
      project: { starterFiles: [], requiredFiles: [], coverage: [] },
    } as unknown as ExamStudyGuide;
    mocks.api.mockResolvedValue({ guide, hintCount: 1 });
    const store = new ProjectStore(project);
    expect(await store.loadGuide()).toEqual(guide);
    expect(mocks.api).toHaveBeenCalledWith('/attempts/old-ticket/study', {
      method: 'POST',
      body: { token: project.ticket.token },
    });
    expect(store.get().project.files).toEqual(project.files);
    expect(store.get().project.study?.guide.version).toBe(1);
    await store.loadGuide();
    expect(mocks.api).toHaveBeenCalledTimes(1);
  });
  it('keeps edits made during a save failure available for emergency export and retry', async () => {
    const store = new ProjectStore(initial());
    mocks.save.mockRejectedValueOnce(new Error('quota'));
    await expect(
      store.patch((current) => ({ ...current, files: [{ path: 'index.html', content: 'first' }] })),
    ).rejects.toThrow('quota');
    await expect(
      store.patch((current) => ({
        ...current,
        files: [{ path: 'index.html', content: 'still writing' }],
      })),
    ).rejects.toThrow('quota');
    expect(store.get().project.files![0]!.content).toBe('still writing');
    await store.retry();
    expect(mocks.save.mock.calls.at(-1)![0].files[0].content).toBe('still writing');
    expect(store.get().error).toBe('');
  });
  it('deduplicates concurrent guide loading without resetting a newly selected step', async () => {
    const store = new ProjectStore(initial());
    const guide = {
      id: 'guide',
      version: 3,
      steps: [{ id: 'html', activities: [{ id: 'lang' }] }],
      project: { starterFiles: [], requiredFiles: [], coverage: [] },
    } as unknown as ExamStudyGuide;
    mocks.api.mockResolvedValue({ guide, hintCount: 1 });
    await Promise.all([store.loadGuide(), store.loadGuide()]);
    expect(mocks.api).toHaveBeenCalledTimes(1);
    await store.patch((project) => ({
      ...project,
      study: { ...project.study!, current: 'html/title' },
    }));
    await store.loadGuide();
    expect(store.get().project.study!.current).toBe('html/title');
    expect(store.get().project.files).toEqual(initial().files);
  });
});
