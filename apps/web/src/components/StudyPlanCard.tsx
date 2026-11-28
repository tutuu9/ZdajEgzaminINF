import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { useApp } from '../context';
import {
  dailyStudyAction,
  daysUntilExam,
  localStudyDay,
  readStudyPlan,
  saveStudyPlan,
  validStudyMinutes,
  type StudyPlan,
} from '../study-plan';
import { ErrorNotice, plural } from './common';
import { TheoryReviewButton } from './TheoryReviewButton';
import '../study-plan.css';

export function StudyPlanCard() {
  const { data, attempts, progressLoaded } = useApp();
  const headingId = useId();
  const [plan, setPlan] = useState(readStudyPlan);
  const [editing, setEditing] = useState(false);
  const [today, setToday] = useState(localStudyDay);
  const [error, setError] = useState('');
  const editButton = useRef<HTMLButtonElement>(null);
  const wasEditing = useRef(false);
  useEffect(() => {
    const interval = window.setInterval(() => setToday(localStudyDay()), 60_000);
    return () => window.clearInterval(interval);
  }, []);
  useEffect(() => {
    if (!editing && wasEditing.current) editButton.current?.focus();
    wasEditing.current = editing;
  }, [editing]);

  const days = plan ? daysUntilExam(plan.examDate, today) : null;
  const action =
    plan && data && progressLoaded ? dailyStudyAction(plan, today, attempts, data) : undefined;
  const update = (value: StudyPlan | null) => {
    try {
      saveStudyPlan(value);
      setPlan(value);
      setEditing(false);
      setError('');
    } catch {
      setError('Nie udało się zapisać planu w tej przeglądarce.');
    }
  };
  const cancel = () => {
    setEditing(false);
    setError('');
  };

  return (
    <section className="study-plan surface-panel" aria-labelledby={headingId}>
      <div className="study-plan-heading">
        <div>
          <h2 id={headingId}>Plan nauki</h2>
          <p>
            {days === null
              ? 'Wybierz termin egzaminu i ile czasu chcesz poświęcić na naukę.'
              : days < 0
                ? 'Termin minął. Ustaw nową datę, aby wznowić plan.'
                : days === 0
                  ? 'Egzamin jest dziś.'
                  : `${days} ${days === 1 ? 'dzień' : 'dni'} do egzaminu · ${plan!.minutesPerDay} min dziennie`}
          </p>
        </div>
        {!editing && (
          <button ref={editButton} className="button secondary" onClick={() => setEditing(true)}>
            {plan ? 'Zmień plan' : 'Ułóż plan'}
          </button>
        )}
      </div>
      {editing && <StudyPlanForm plan={plan} today={today} onSave={update} onCancel={cancel} />}
      <ErrorNotice message={error} />
      {!editing && action && (
        <div className="study-plan-action">
          <div>
            <h3>Na dziś</h3>
            {action.kind === 'review' ? (
              <p>
                Wróć do pytań CKE z ostatnimi błędami ·{' '}
                {plural(action.questionIds.length, 'pytanie', 'pytania', 'pytań')}
              </p>
            ) : (
              <p>
                {action.kind === 'practice'
                  ? 'Przećwicz zapytania SQL z arkusza '
                  : action.kind === 'follow-up'
                    ? 'Po próbnym egzaminie · '
                    : 'Zrób jeden krok w nauce · '}
                <strong>{action.title}</strong>
              </p>
            )}
          </div>
          {action.kind === 'review' ? (
            <TheoryReviewButton questionIds={action.questionIds} />
          ) : (
            <Link className="button primary" to={action.href}>
              {action.kind === 'practice' || action.kind === 'follow-up'
                ? 'Otwórz trening'
                : 'Przejdź do nauki'}
              <ArrowRight size={17} aria-hidden />
            </Link>
          )}
        </div>
      )}
    </section>
  );
}

function StudyPlanForm({
  plan,
  today,
  onSave,
  onCancel,
}: {
  plan: StudyPlan | null;
  today: string;
  onSave: (plan: StudyPlan | null) => void;
  onCancel: () => void;
}) {
  const [examDate, setExamDate] = useState(plan?.examDate ?? '');
  const [minutes, setMinutes] = useState(String(plan?.minutesPerDay ?? 20));
  const [invalid, setInvalid] = useState<'date' | 'minutes'>();
  const errorId = useId();
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const days = daysUntilExam(examDate, today);
    const minutesPerDay = Number(minutes);
    if (!Number.isFinite(days) || days < 0) setInvalid('date');
    else if (!validStudyMinutes(minutesPerDay)) setInvalid('minutes');
    else {
      setInvalid(undefined);
      onSave({ examDate, minutesPerDay });
    }
  };
  return (
    <form className="study-plan-form" onSubmit={submit} noValidate>
      <div className="study-plan-fields">
        <label className="field">
          <span>Data egzaminu</span>
          <input
            type="date"
            autoFocus
            min={today}
            value={examDate}
            aria-invalid={invalid === 'date'}
            aria-describedby={invalid === 'date' ? errorId : undefined}
            onChange={(event) => setExamDate(event.target.value)}
            required
          />
        </label>
        <label className="field">
          <span>Minuty nauki dziennie</span>
          <input
            type="number"
            inputMode="numeric"
            min={1}
            max={1440}
            value={minutes}
            aria-invalid={invalid === 'minutes'}
            aria-describedby={invalid === 'minutes' ? errorId : undefined}
            onChange={(event) => setMinutes(event.target.value)}
            required
          />
        </label>
      </div>
      {invalid && (
        <p id={errorId} className="study-plan-error" role="alert">
          {invalid === 'date'
            ? 'Wybierz dzisiejszą lub przyszłą datę egzaminu.'
            : 'Wpisz pełną liczbę minut od 1 do 1440.'}
        </p>
      )}
      <div className="button-row">
        <button type="submit" className="button primary">
          Zapisz plan
        </button>
        <button type="button" className="button secondary" onClick={onCancel}>
          Anuluj
        </button>
        {plan && (
          <button type="button" className="button quiet" onClick={() => onSave(null)}>
            Usuń plan
          </button>
        )}
      </div>
    </form>
  );
}
