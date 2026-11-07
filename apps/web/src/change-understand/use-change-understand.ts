import { useEffect, useMemo, useRef, useState } from 'react';
import type { AttemptSnapshot, ExamStudyStep, ProjectFile, StudyActivity } from '@zdaj/shared';
import { errorMessage } from '../api';
import type { ProjectStore } from '../project-store';
import { findStudyCheckpoint } from '../study-comparison-state';
import { compareProjectFiles, describeProjectChanges } from './diff';
import { findActivitySource, getChangeLesson } from './learning';

export type ChangeStep = { id: string; step: ExamStudyStep; activity: StudyActivity };

export function useChangeUnderstand(
  store: ProjectStore,
  project: AttemptSnapshot,
  current?: ChangeStep,
) {
  const available =
    project.mode === 'nauka' && !project.submittedAt && !!project.study?.guide.project;
  const lesson = useMemo(
    () => (available && current ? getChangeLesson(current.step, current.activity) : undefined),
    [available, current?.step, current?.activity],
  );
  const checkpoint = available && lesson ? findStudyCheckpoint(project, current?.id) : undefined;
  const [problem, setProblem] = useState('');
  const [comparisonOpen, setComparisonOpen] = useState(false);
  const [predictionChecked, setPredictionChecked] = useState(false);
  const [confirmation, setConfirmation] = useState<{ id: string; files: ProjectFile[] }>();
  const [copyId, setCopyId] = useState('');
  const [restoring, setRestoring] = useState(false);
  const generation = useRef(0);
  const compareButton = useRef<HTMLButtonElement>(null);
  const prediction = lesson?.prediction;
  const choice =
    checkpoint?.prediction?.questionId === prediction?.id
      ? checkpoint?.prediction?.choiceId
      : undefined;
  useEffect(() => {
    generation.current++;
    let active = true;
    setComparisonOpen(false);
    setPredictionChecked(false);
    setConfirmation(undefined);
    setProblem('');
    setCopyId('');
    setRestoring(false);
    if (lesson && current)
      void store.ensureStudyCheckpoint(current.id).catch((cause) => {
        if (active) setProblem(store.get().error ? '' : errorMessage(cause));
      });
    return () => {
      active = false;
      generation.current++;
    };
  }, [store, current?.id, lesson?.id, available]);
  const changes = useMemo(
    () => (checkpoint ? compareProjectFiles(checkpoint.files, project.files ?? []) : undefined),
    [checkpoint?.files, project.files],
  );
  const explanations = useMemo(
    () =>
      checkpoint ? describeProjectChanges(checkpoint.files, project.files ?? [], changes) : [],
    [checkpoint?.files, project.files, changes],
  );
  const source = useMemo(
    () =>
      lesson && current
        ? findActivitySource(project.files ?? [], current.step, current.activity)
        : undefined,
    [project.files, lesson, current?.step, current?.activity],
  );
  const operationIsCurrent = () => {
    const started = generation.current;
    return () => {
      const latest = store.get().project;
      return (
        started === generation.current &&
        latest.id === project.id &&
        latest.study?.current === current?.id &&
        latest.mode === 'nauka' &&
        !latest.submittedAt
      );
    };
  };
  const choose = (choiceId: string) => {
    if (!checkpoint || !prediction) return;
    const isCurrent = operationIsCurrent();
    setPredictionChecked(false);
    void store.setStudyPrediction(checkpoint.id, prediction.id, choiceId).catch((cause) => {
      if (isCurrent()) setProblem(errorMessage(cause));
    });
  };
  const retryCheckpoint = async () => {
    if (!current || !lesson) return;
    const isCurrent = operationIsCurrent();
    setProblem('');
    try {
      await store.ensureStudyCheckpoint(current.id);
    } catch (cause) {
      if (isCurrent()) setProblem(store.get().error ? '' : errorMessage(cause));
    }
  };
  const restore = async () => {
    if (!confirmation || confirmation.files !== project.files || confirmation.id !== checkpoint?.id)
      return;
    const isCurrent = operationIsCurrent();
    setRestoring(true);
    setProblem('');
    try {
      const savedCopy = await store.restoreStudyCheckpoint(confirmation.id, confirmation.files);
      if (!isCurrent()) return;
      setCopyId(savedCopy);
      setConfirmation(undefined);
      setComparisonOpen(false);
    } catch (cause) {
      if (isCurrent()) setProblem(errorMessage(cause));
    } finally {
      if (isCurrent()) setRestoring(false);
    }
  };
  return {
    lesson,
    checkpoint,
    changes,
    explanations,
    source,
    problem,
    comparisonOpen,
    setComparisonOpen,
    predictionChecked,
    setPredictionChecked,
    choice,
    choose,
    retryCheckpoint,
    confirmation,
    setConfirmation,
    restoring,
    restore,
    copyId,
    compareButton,
  };
}
export type ChangeModel = ReturnType<typeof useChangeUnderstand>;
