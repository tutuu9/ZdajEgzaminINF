import { Link } from 'react-router-dom';
import { ArrowLeftRight, Code2, History, Lightbulb } from 'lucide-react';
import type { AttemptSnapshot } from '@zdaj/shared';
import type { ChangeModel } from '../change-understand/use-change-understand';
import type { InspectionSource } from '../inspector/types';
import { ErrorNotice } from './common';
import '../change-understand.css';

function ConceptDiagram({ kind }: { kind: 'spacing' | 'flow' | 'html' }) {
  if (kind === 'spacing')
    return (
      <div className="change-diagram" aria-label="Schemat odstępów">
        <span>margin · na zewnątrz</span>
        <div>
          <span>border · obramowanie</span>
          <div>
            <span>padding · wewnątrz</span>
            <strong>treść</strong>
          </div>
        </div>
      </div>
    );
  if (kind === 'flow')
    return (
      <div className="change-flow" aria-label="Przerwa między elementami">
        <span>element</span>
        <small>gap</small>
        <span>element</span>
      </div>
    );
  return (
    <p className="change-html">
      <code>&lt;znacznik&gt;</code> treść <code>&lt;/znacznik&gt;</code>
    </p>
  );
}

export function ChangeUnderstand({
  model,
  project,
  blocked,
  saving,
  saveError,
  onReveal,
  onCompare,
}: {
  model: ChangeModel;
  project: AttemptSnapshot;
  blocked: boolean;
  saving: boolean;
  saveError: string;
  onReveal: (source: InspectionSource) => void;
  onCompare: () => void;
}) {
  const { lesson, checkpoint } = model;
  if (!lesson) return null;
  const prediction = lesson.prediction;
  const option = prediction?.options.find((item) => item.id === model.choice);
  const staleConfirmation = !!model.confirmation && model.confirmation.files !== project.files;
  return (
    <section className="change-understand" aria-label="Zmień i zrozum">
      <header>
        <Lightbulb size={17} aria-hidden="true" />
        <h4>Zmień i zrozum</h4>
      </header>
      <strong>{lesson.title}</strong>
      <p>{lesson.explanation}</p>
      {lesson.diagram && <ConceptDiagram kind={lesson.diagram} />}
      <p>{lesson.watchFor}</p>
      {prediction && (
        <details className="change-prediction">
          <summary>
            Najpierw przewidź wynik <span>(opcjonalnie)</span>
          </summary>
          <fieldset disabled={blocked || !checkpoint || model.restoring}>
            <legend>Jak myślisz, co się zmieni?</legend>
            <p>{prediction.question}</p>
            {prediction.options.map((item) => (
              <label key={item.id}>
                <input
                  type="radio"
                  name={`prediction-${checkpoint?.id ?? lesson.id}`}
                  checked={model.choice === item.id}
                  onChange={() => model.choose(item.id)}
                />
                <span>{item.label}</span>
              </label>
            ))}
            <button
              type="button"
              className="button secondary small"
              disabled={!model.choice}
              onClick={() => model.setPredictionChecked(true)}
            >
              Sprawdź przewidywanie
            </button>
          </fieldset>
          {model.predictionChecked && option && (
            <p className="change-feedback" role="status">
              <strong>
                {model.choice === prediction.correctOptionId
                  ? 'Właśnie tak. '
                  : 'Przyjrzyj się tej różnicy. '}
              </strong>
              {option.explanation} To objaśnienie, nie ocena kroku.
            </p>
          )}
        </details>
      )}
      <div className="change-actions">
        <button
          type="button"
          className="button secondary small"
          disabled={blocked || !model.source || model.restoring}
          onClick={() => model.source && onReveal(model.source)}
        >
          <Code2 size={15} aria-hidden="true" />
          Pokaż miejsce zmiany
        </button>
        {model.source?.note && <p className="fine-print">{model.source.note}</p>}
        <button
          ref={model.compareButton}
          type="button"
          className="button secondary small"
          disabled={blocked || !checkpoint || model.restoring}
          onClick={onCompare}
        >
          <ArrowLeftRight size={15} aria-hidden="true" />
          Porównaj przed i po
        </button>
      </div>
      <ErrorNotice message={model.problem} />
      <details className="change-checkpoint">
        <summary>
          <History size={14} aria-hidden="true" />
          Punkt sprzed kroku
        </summary>
        <p>
          {checkpoint
            ? saveError
              ? 'Nie udało się potwierdzić zapisu punktu. Pobierz pracę i ponów zapis przy komunikacie o błędzie.'
              : saving
                ? 'Zapisywanie punktu i bieżącej pracy…'
                : `Zapisano ${new Date(checkpoint.createdAt).toLocaleString('pl-PL')}. Porównujesz własne pliki z tego momentu.`
            : 'Przygotowujemy zapis Twoich bieżących plików. Kod nie zostanie zastąpiony.'}
        </p>
        {!checkpoint && model.problem && (
          <button
            type="button"
            className="button secondary small"
            disabled={blocked || model.restoring}
            onClick={() => void model.retryCheckpoint()}
          >
            Spróbuj zapisać punkt ponownie
          </button>
        )}
        <p className="fine-print">
          Przechowujemy do 8 ostatnich punktów, łącznie do 20 MiB. Najstarsze punkty ustępują
          miejsca nowym; bieżące pliki pozostają w projekcie.
        </p>
        <button
          type="button"
          className="button quiet small"
          disabled={blocked || !checkpoint || model.restoring}
          onClick={() =>
            checkpoint && model.setConfirmation({ id: checkpoint.id, files: project.files ?? [] })
          }
        >
          Przywróć punkt sprzed kroku
        </button>
        {model.confirmation && (
          <div className="change-confirm" role="group" aria-label="Potwierdź przywrócenie">
            <p>
              Najpierw zachowamy Twoją bieżącą pracę jako oddzielny projekt w „Moje prace”. Potem
              przywrócimy pliki z punktu sprzed kroku.
            </p>
            {staleConfirmation && (
              <p role="status">
                Pliki zmieniły się. Anuluj i ponownie wybierz punkt, aby zachować najnowszą pracę.
              </p>
            )}
            <button
              type="button"
              className="button secondary small"
              disabled={blocked || staleConfirmation || model.restoring}
              onClick={() => void model.restore()}
            >
              {model.restoring ? 'Zapisywanie kopii…' : 'Zachowaj kopię i przywróć'}
            </button>
            <button
              type="button"
              className="button quiet small"
              disabled={model.restoring}
              onClick={() => model.setConfirmation(undefined)}
            >
              Anuluj
            </button>
          </div>
        )}
      </details>
    </section>
  );
}

export function ChangeRestoreNotice({ model, taskId }: { model: ChangeModel; taskId?: string }) {
  if (!model.copyId) return null;
  return (
    <p className="change-restored" role="status">
      Przywrócono zapis. Nowszy kod jest w oddzielnej pracy.{' '}
      <Link to={`/praktyka/${taskId}?proba=${model.copyId}&widok=nauka`}>
        Otwórz zachowaną kopię
      </Link>
    </p>
  );
}

export function ChangeDiff({
  model,
  onReveal,
}: {
  model: ChangeModel;
  onReveal: (source: InspectionSource) => void;
}) {
  if (!model.lesson || !model.checkpoint || !model.changes) return null;
  const changes = model.changes;
  return (
    <details className="change-diff">
      <summary>Co zmieniłem?</summary>
      <div className="change-diff-content">
        <p>
          Porównanie z punktem sprzed tego kroku. Zmiany HTML/CSS w Twoich plikach; to nie gotowe
          rozwiązanie.
        </p>
        {changes.note && <p>{changes.note}</p>}
        {!changes.changedFileCount && <p>Jeszcze nie ma zmian HTML/CSS do porównania.</p>}
        {model.explanations.map((item, index) => (
          <p key={index}>
            <strong>{item.title}</strong> {item.explanation}
          </p>
        ))}
        {changes.files.map((file) => (
          <section key={file.path} className="change-file" aria-label={`Zmiany: ${file.path}`}>
            <header>
              <strong>{file.path}</strong>
              <span>
                {file.status === 'added'
                  ? 'Nowy plik'
                  : file.status === 'removed'
                    ? 'Usunięty plik'
                    : 'Zmieniony plik'}
              </span>
              {file.source && (
                <button
                  type="button"
                  className="button quiet small"
                  onClick={() => onReveal(file.source!)}
                >
                  Otwórz {file.path}
                </button>
              )}
            </header>
            {file.note && <p>{file.note}</p>}
            <ol className="change-lines" aria-label="Zmienione wiersze">
              {file.rows.map((row, index) => (
                <li key={index} className={`change-line ${row.kind}`}>
                  <span
                    className="change-line-mark"
                    aria-label={
                      row.kind === 'added'
                        ? 'Dodano'
                        : row.kind === 'removed'
                          ? 'Usunięto'
                          : 'Kontekst'
                    }
                  >
                    {row.kind === 'added' ? '+' : row.kind === 'removed' ? '−' : ' '}
                  </span>
                  <span
                    className="change-line-number"
                    aria-label={`Wiersz ${row.afterLine ?? row.beforeLine ?? ''}`}
                  >
                    {row.afterLine ?? row.beforeLine ?? '…'}
                  </span>
                  <code>{row.text || ' '}</code>
                </li>
              ))}
            </ol>
          </section>
        ))}
      </div>
    </details>
  );
}
