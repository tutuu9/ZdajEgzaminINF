import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ save: vi.fn(), restore: vi.fn(), read: vi.fn() }));
vi.mock('../apps/web/src/storage', () => ({
  saveProjectRevision: mocks.save,
  saveStudyCheckpointRestore: mocks.restore,
  readAttempt: mocks.read,
}));
import { ProjectStore } from '../apps/web/src/project-store';
import { findStudyCheckpoint, withStudyCheckpoint } from '../apps/web/src/study-comparison-state';
import { comparisonProject } from './study-comparison-fixture';

beforeEach(() => {
  vi.clearAllMocks();
  mocks.save.mockResolvedValue(undefined);
  mocks.restore.mockResolvedValue(undefined);
});

const edited = () => {
  const project = withStudyCheckpoint(comparisonProject(), 'step-0/edit');
  project.files = [{ path: 'index.html', content: 'keep this newer code' }];
  return project;
};

describe('durable checkpoint operations', () => {
  it('deduplicates initial capture and persists predictions across a new store instance', async () => {
    const store = new ProjectStore(comparisonProject());
    const [first, second] = await Promise.all([
      store.ensureStudyCheckpoint('step-0/edit'),
      store.ensureStudyCheckpoint('step-0/edit'),
    ]);
    expect(first?.id).toBe(second?.id);
    expect(mocks.save).toHaveBeenCalledTimes(1);
    await store.setStudyPrediction(first!.id, 'padding', 'inside');
    const loaded = new ProjectStore(structuredClone(store.get().project));
    expect(findStudyCheckpoint(loaded.get().project)!.prediction).toEqual({
      questionId: 'padding',
      choiceId: 'inside',
    });
    await loaded.ensureStudyCheckpoint('step-0/edit');
    expect(mocks.save).toHaveBeenCalledTimes(2);
  });

  it('never reports a captured point as saved when its IndexedDB write failed', async () => {
    mocks.save.mockRejectedValueOnce(new Error('quota'));
    const project = comparisonProject();
    const store = new ProjectStore(project);
    await expect(store.ensureStudyCheckpoint('step-0/edit')).rejects.toThrow('quota');
    expect(store.get().project.files).toBe(project.files);
    await expect(store.ensureStudyCheckpoint('step-0/edit')).rejects.toThrow('quota');
    await store.retry();
    expect((await store.ensureStudyCheckpoint('step-0/edit'))?.files).toEqual(project.files);
  });

  it('changes visible files only after the copy-and-restore transaction commits', async () => {
    const source = edited();
    const store = new ProjectStore(source);
    let commit = () => {};
    mocks.restore.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          commit = resolve;
        }),
    );
    const pending = store.restoreStudyCheckpoint(findStudyCheckpoint(source)!.id, source.files!);
    await vi.waitFor(() => expect(mocks.restore).toHaveBeenCalledOnce());
    expect(store.get().saving).toBe(true);
    expect(store.get().project.files).toBe(source.files);
    const [restored, copy, revision] = mocks.restore.mock.calls[0]!;
    expect(copy.files).toEqual(source.files);
    expect(revision).toBe(0);
    commit();
    expect(await pending).toBe(copy.id);
    expect(store.get().project).toEqual(restored);
    expect(store.get().saving).toBe(false);
  });

  it.each(['quota', 'inna karta'])(
    'preserves all visible files when restore fails with %s',
    async (message) => {
      mocks.restore.mockRejectedValueOnce(new Error(message));
      const source = edited();
      const store = new ProjectStore(source);
      await expect(
        store.restoreStudyCheckpoint(findStudyCheckpoint(source)!.id, source.files!),
      ).rejects.toThrow(message);
      expect(store.get().project).toBe(source);
      expect(store.get().saving).toBe(false);
      expect(mocks.save).not.toHaveBeenCalled();
    },
  );

  it('aborts the pending restore when typing arrives and persists the newer code', async () => {
    const source = edited();
    const store = new ProjectStore(source);
    mocks.restore.mockImplementation(
      (_next, _copy, _revision, signal: AbortSignal) =>
        new Promise<void>((_resolve, reject) =>
          signal.addEventListener('abort', () => reject(new Error('cancelled'))),
        ),
    );
    const restoring = store.restoreStudyCheckpoint(findStudyCheckpoint(source)!.id, source.files!);
    const rejected = expect(restoring).rejects.toThrow('cancelled');
    await vi.waitFor(() => expect(mocks.restore).toHaveBeenCalledOnce());
    await store.patch((project) => ({
      ...project,
      files: [{ path: 'index.html', content: 'typed during restore' }],
    }));
    await rejected;
    expect(store.get().project.files![0]!.content).toBe('typed during restore');
    expect(mocks.save.mock.calls.at(-1)![1]).toBe(0);
    expect(store.get().project.revision).toBeGreaterThan(1);
  });

  it('does not overwrite typing even if a commit completion arrives too late to abort', async () => {
    const source = edited();
    const store = new ProjectStore(source);
    let commit = () => {};
    mocks.restore.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          commit = resolve;
        }),
    );
    const restoring = store.restoreStudyCheckpoint(findStudyCheckpoint(source)!.id, source.files!);
    const rejected = expect(restoring).rejects.toThrow('Projekt zmienił');
    await vi.waitFor(() => expect(mocks.restore).toHaveBeenCalledOnce());
    commit();
    const typing = store.patch((project) => ({
      ...project,
      files: [{ path: 'index.html', content: 'late typing' }],
    }));
    await rejected;
    await typing;
    expect(store.get().project.files![0]!.content).toBe('late typing');
    expect(mocks.save.mock.calls.at(-1)![1]).toBe(1);
    expect(store.get().project.revision).toBe(2);
  });

  it('rejects a stale confirmation or duplicate restore without starting another transaction', async () => {
    const source = edited();
    const store = new ProjectStore(source);
    await expect(
      store.restoreStudyCheckpoint(findStudyCheckpoint(source)!.id, [...source.files!]),
    ).rejects.toThrow('Kod zmienił');
    expect(mocks.restore).not.toHaveBeenCalled();
    let commit = () => {};
    mocks.restore.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          commit = resolve;
        }),
    );
    const pending = store.restoreStudyCheckpoint(findStudyCheckpoint(source)!.id, source.files!);
    await vi.waitFor(() => expect(mocks.restore).toHaveBeenCalledOnce());
    await expect(
      store.restoreStudyCheckpoint(findStudyCheckpoint(source)!.id, source.files!),
    ).rejects.toThrow('już trwa');
    commit();
    await pending;
    expect(mocks.restore).toHaveBeenCalledOnce();
  });
});
