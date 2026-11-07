import type {
  AttemptSnapshot,
  AttemptTicket,
  ExamStudyGuide,
  ExamStudyResponse,
  ProjectFile,
} from '@zdaj/shared';
import { api, ApiError } from './api';
import { readAttempt, saveProjectRevision, saveStudyCheckpointRestore } from './storage';
import {
  findStudyCheckpoint,
  getStudyComparisonActivity,
  prepareStudyRestore,
  withStudyCheckpoint,
} from './study-comparison-state';

export type ProjectPatch = (current: AttemptSnapshot) => AttemptSnapshot;
export interface ProjectState {
  project: AttemptSnapshot;
  saving: boolean;
  error: string;
}
export class ProjectStore {
  private state: ProjectState;
  private persistedRevision: number;
  private tail: Promise<void> = Promise.resolve();
  private listeners = new Set<() => void>();
  private renewing?: Promise<void>;
  private guideLoading?: Promise<ExamStudyGuide>;
  private retrying?: Promise<void>;
  private restoring?: AbortController;
  constructor(project: AttemptSnapshot) {
    this.state = { project, saving: false, error: '' };
    this.persistedRevision = project.revision ?? 0;
  }
  get = () => this.state;
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };
  private emit(state: ProjectState) {
    this.state = state;
    this.listeners.forEach((listener) => listener());
  }
  restoreIfNewer(project: AttemptSnapshot) {
    if (
      !this.state.saving &&
      !this.state.error &&
      (project.revision ?? 0) > (this.state.project.revision ?? 0)
    ) {
      this.persistedRevision = project.revision ?? 0;
      this.emit({ project, saving: false, error: '' });
    }
  }
  patch = (change: ProjectPatch): Promise<void> => {
    const previous = this.state.project;
    const changed = change(previous);
    if (changed === previous) return this.tail;
    // Typing and navigation win over a pending explicit restore, never the reverse.
    const restoring = this.restoring;
    this.restoring?.abort();
    const next = {
      ...changed,
      // Reserve the restore's revision even when its transaction is being cancelled.
      // A late completion can then never make a subsequent edit reuse that revision.
      revision: (previous.revision ?? 0) + (restoring ? 2 : 1),
      updatedAt: new Date().toISOString(),
    };
    // Keep accepting local edits after a failed write so the emergency download
    // always contains what is currently visible in the editor.
    if (this.state.error) {
      if (changed.files !== previous.files)
        this.emit({
          project: {
            ...previous,
            files: changed.files,
            recovery: changed.recovery,
            revision: next.revision,
            updatedAt: next.updatedAt,
          },
          saving: false,
          error: this.state.error,
        });
      return Promise.reject(new Error(this.state.error));
    }
    this.emit({ project: next, saving: true, error: '' });
    const operation = this.tail
      .then(async () => {
        if (this.state.error) throw new Error(this.state.error);
        await saveProjectRevision(next, this.persistedRevision);
        this.persistedRevision = next.revision;
        if (this.state.project.revision === next.revision)
          this.emit({ project: next, saving: false, error: '' });
      })
      .catch((cause: unknown) => {
        const message =
          cause instanceof Error
            ? cause.message
            : 'Nie udało się zapisać projektu. Pobierz kopię swojej pracy.';
        this.emit({ ...this.state, saving: false, error: message });
        throw cause;
      });
    this.tail = operation.catch(() => undefined);
    return operation;
  };
  flush = () =>
    this.tail.then(() => {
      if (this.state.error) throw new Error(this.state.error);
    });
  ensureStudyCheckpoint = async (activityId: string) => {
    await this.patch((project) => withStudyCheckpoint(project, activityId));
    await this.flush();
    return findStudyCheckpoint(this.state.project, activityId);
  };
  setStudyPrediction = async (checkpointId: string, questionId: string, choiceId: string) => {
    if (![questionId, choiceId].every((value) => /^[a-z0-9][a-z0-9._-]{0,127}$/i.test(value)))
      throw new Error('Nieprawidłowy wybór przewidywania.');
    await this.patch((project) => {
      const checkpoint = findStudyCheckpoint(project);
      if (!getStudyComparisonActivity(project) || checkpoint?.id !== checkpointId)
        throw new Error('Krok zmienił się. Wybierz ponownie.');
      if (
        checkpoint.prediction?.questionId === questionId &&
        checkpoint.prediction?.choiceId === choiceId
      )
        return project;
      return {
        ...project,
        studyComparison: {
          ...project.studyComparison!,
          checkpoints: project.studyComparison!.checkpoints.map((item) =>
            item.id === checkpointId ? { ...item, prediction: { questionId, choiceId } } : item,
          ),
        },
      };
    });
  };
  restoreStudyCheckpoint = async (checkpointId: string, expectedFiles: ProjectFile[]) => {
    if (this.restoring) throw new Error('Przywracanie już trwa.');
    await this.flush();
    if (this.restoring) throw new Error('Przywracanie już trwa.');
    const source = this.state.project;
    if (source.files !== expectedFiles)
      throw new Error('Kod zmienił się od wyboru punktu. Sprawdź go przed przywróceniem.');
    const { restored, copy } = prepareStudyRestore(source, checkpointId);
    const controller = new AbortController();
    this.restoring = controller;
    this.emit({ ...this.state, saving: true });
    const operation = this.tail
      .then(async () => {
        await saveStudyCheckpointRestore(restored, copy, this.persistedRevision, controller.signal);
        this.persistedRevision = restored.revision ?? 0;
        if (this.state.project !== source)
          throw new Error(
            'Projekt zmienił się podczas przywracania. Zachowano bieżący kod. Spróbuj ponownie.',
          );
        this.emit({ project: restored, saving: false, error: '' });
      })
      .catch((cause: unknown) => {
        if (this.state.project === source) this.emit({ ...this.state, saving: false });
        throw cause;
      })
      .finally(() => {
        if (this.restoring === controller) this.restoring = undefined;
      });
    this.tail = operation.catch(() => undefined);
    await operation;
    return copy.id;
  };
  retry = async () => {
    if (this.retrying) return this.retrying;
    this.retrying = (async () => {
      await this.tail;
      if (!this.state.error) return;
      do {
        const next = this.state.project;
        this.emit({ ...this.state, saving: true });
        await saveProjectRevision(next, this.persistedRevision);
        this.persistedRevision = next.revision ?? 0;
        if (this.state.project.revision === next.revision) {
          this.emit({ project: this.state.project, saving: false, error: '' });
          return;
        }
        // A learner may keep typing while the retry transaction is pending.
      } while (this.state.project.revision !== this.persistedRevision);
    })()
      .catch((cause: unknown) => {
        this.emit({
          ...this.state,
          saving: false,
          error: cause instanceof Error ? cause.message : 'Nie udało się ponownie zapisać pracy.',
        });
        throw cause;
      })
      .finally(() => {
        this.retrying = undefined;
      });
    return this.retrying;
  };
  reload = async () => {
    await this.tail;
    await this.retrying?.catch(() => undefined);
    const saved = await readAttempt(this.state.project.id);
    if (!saved) throw new Error('Nie znaleziono zapisanej pracy. Pobierz bieżące pliki.');
    this.persistedRevision = saved.revision ?? 0;
    this.emit({ project: saved, saving: false, error: '' });
  };
  /** Transport renewal never changes the local project, mode, exam clock or guide. */
  private renew = async () => {
    if (this.renewing) return this.renewing;
    const project = this.state.project;
    if (project.mode === 'egzamin' || project.submittedAt || !project.taskId)
      throw new Error('Ta próba nie może otrzymać nowego klucza. Pliki pozostają zapisane.');
    this.renewing = (async () => {
      const ticket = await api<AttemptTicket>('/attempts', {
        method: 'POST',
        body: {
          taskId: project.taskId,
          taskVersion: project.taskVersion,
          mode: project.mode,
          level: project.level,
        },
      });
      await this.patch((current) => ({ ...current, ticket, hintOffset: current.hintCount }));
    })().finally(() => {
      this.renewing = undefined;
    });
    return this.renewing;
  };
  request = async <T>(operation: (project: AttemptSnapshot) => Promise<T>): Promise<T> => {
    await this.flush();
    const first = this.state.project;
    try {
      return await operation(first);
    } catch (cause) {
      if (
        !(cause instanceof ApiError) ||
        ![404, 410].includes(cause.status) ||
        first.mode === 'egzamin' ||
        first.submittedAt
      )
        throw cause;
      if (first.ticket.id === this.state.project.ticket.id) await this.renew();
      return operation(this.state.project);
    }
  };
  loadGuide = async () => {
    if (this.state.project.study?.guide.project) return this.state.project.study.guide;
    if (this.guideLoading) return this.guideLoading;
    this.guideLoading = this.fetchGuide().finally(() => {
      this.guideLoading = undefined;
    });
    return this.guideLoading;
  };
  private fetchGuide = async () => {
    const result = await this.request((project) =>
      api<ExamStudyResponse>(`/attempts/${project.ticket.id}/study`, {
        method: 'POST',
        body: { token: project.ticket.token },
      }),
    );
    await this.patch((project) => ({
      ...project,
      hintCount: Math.max(project.hintCount, (project.hintOffset ?? 0) + result.hintCount),
      study: {
        guide: result.guide,
        current: `${result.guide.steps[0]?.id}/${result.guide.steps[0]?.activities?.[0]?.id}`,
        completed: {},
        viewedExamples: [],
      },
    }));
    return result.guide;
  };
}

const stores = new Map<string, ProjectStore>();
export function projectStore(project: AttemptSnapshot) {
  let store = stores.get(project.id);
  if (!store) {
    store = new ProjectStore(project);
    stores.set(project.id, store);
  } else store.restoreIfNewer(project);
  return store;
}
export function recoverySnapshot(project: AttemptSnapshot, reason: string) {
  return [
    ...(project.recovery ?? []).slice(-4),
    {
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      reason,
      files: structuredClone(project.files ?? []),
    },
  ];
}
