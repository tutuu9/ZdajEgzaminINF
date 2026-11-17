import { useState } from 'react';
import {
  AlertTriangle,
  Check,
  ClipboardList,
  ExternalLink as ExternalIcon,
  Timer,
} from 'lucide-react';
import type { AttemptSnapshot, CatalogEntry } from '@zdaj/shared';
import {
  examTiming,
  loadReview,
  matchHandInFiles,
  saveReview,
  type ExamReview,
  type ResultReview,
} from '../exam-report';
import '../exam-report.css';

const REVIEW_OPTIONS: { value: ResultReview; label: string }[] = [
  { value: 'done', label: 'Zrobione' },
  { value: 'partial', label: 'Częściowo' },
  { value: 'missing', label: 'Brak' },
];

/**
 * Report after a simulated exam: time used, the paper's hand-in list compared with the
 * project, and the learner's own review of the assessed results. No points are given.
 */
export function ExamReport({
  attempt,
  entry,
  limitMinutes,
}: {
  attempt: AttemptSnapshot;
  entry: CatalogEntry;
  limitMinutes: number;
}) {
  const handIn = entry.handIn!;
  const [review, setReview] = useState<ExamReview>(() => loadReview(attempt.id));
  const update = (next: ExamReview) => {
    setReview(next);
    saveReview(attempt.id, next);
  };
  const files = matchHandInFiles(handIn.files, attempt.files ?? []);
  const confirmed = new Set(review.confirmedFiles);
  const ready = files.filter(
    (file) => file.status === 'present' || confirmed.has(file.name),
  ).length;
  const reviewed = handIn.results.filter((result) => review.results[result]);
  const done = handIn.results.filter((result) => review.results[result] === 'done').length;
  const timing =
    attempt.mode === 'egzamin' && attempt.deadlineAt && attempt.submittedAt
      ? examTiming(attempt.deadlineAt, attempt.submittedAt, limitMinutes)
      : null;
  const criteria = entry.attachments.find((item) => /kryteri|zasad/i.test(item.title));

  return (
    <section className="exam-report" aria-labelledby="exam-report-title">
      <h2 id="exam-report-title">
        <ClipboardList size={20} /> Podsumowanie próby
      </h2>
      {timing && (
        <p className={`exam-report-time${timing.overtime ? ' overtime' : ''}`}>
          <Timer size={17} />
          {timing.overtime
            ? `Oddano po czasie (limit ${timing.limitMinutes} minut).`
            : `Oddano po ${timing.usedMinutes} z ${timing.limitMinutes} minut.`}
        </p>
      )}

      <div className="exam-report-block">
        <h3>
          Pliki do oddania ({ready}/{files.length})
        </h3>
        <p className="exam-report-note">
          Lista ze strony {handIn.page} arkusza. Pliki z projektu zaznaczamy automatycznie; zrzuty i
          obrazy, które masz tylko w swoim folderze, potwierdź sam.
        </p>
        <ul className="exam-report-files">
          {files.map((file) => (
            <li key={file.name} className={file.status}>
              {file.status === 'present' ? (
                <span className="exam-report-mark" aria-label="W projekcie">
                  <Check size={16} />
                </span>
              ) : (
                <input
                  type="checkbox"
                  aria-label={`Mam plik ${file.name} w folderze`}
                  checked={confirmed.has(file.name)}
                  onChange={(event) =>
                    update({
                      ...review,
                      confirmedFiles: event.target.checked
                        ? [...review.confirmedFiles, file.name]
                        : review.confirmedFiles.filter((name) => name !== file.name),
                    })
                  }
                />
              )}
              <code>{file.name}</code>
              {file.status === 'present' && file.actual && <small>({file.actual})</small>}
              {file.status === 'wrong-case' && (
                <small className="warning">
                  <AlertTriangle size={13} /> w projekcie jest „{file.actual}” — inna wielkość liter
                </small>
              )}
            </li>
          ))}
        </ul>
      </div>

      <div className="exam-report-block">
        <h3>Twoja samoocena rezultatów</h3>
        <p className="exam-report-note">
          Arkusz ocenia {handIn.results.length} rezultatów. Porównaj swoją pracę z zasadami
          oceniania i zaznacz, co według Ciebie jest gotowe.
        </p>
        <ul className="exam-report-results">
          {handIn.results.map((result) => (
            <li key={result}>
              <span>{result}</span>
              <div role="radiogroup" aria-label={`Samoocena: ${result}`}>
                {REVIEW_OPTIONS.map((option) => (
                  <label key={option.value} className={`review-${option.value}`}>
                    <input
                      type="radio"
                      name={`review-${result}`}
                      checked={review.results[result] === option.value}
                      onChange={() =>
                        update({
                          ...review,
                          results: { ...review.results, [result]: option.value },
                        })
                      }
                    />
                    {option.label}
                  </label>
                ))}
              </div>
            </li>
          ))}
        </ul>
        {reviewed.length === handIn.results.length && (
          <p className="exam-report-summary" role="status">
            Według Twojej samooceny gotowe: {done} z {handIn.results.length} rezultatów. To nie jest
            wynik CKE — egzaminator ocenia każde kryterium osobno.
          </p>
        )}
        {criteria && (
          <a className="exam-report-criteria" href={criteria.url} target="_blank" rel="noreferrer">
            Otwórz zasady oceniania tego arkusza
            <ExternalIcon size={14} aria-hidden="true" />
          </a>
        )}
      </div>
    </section>
  );
}
