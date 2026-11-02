import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Download,
  FileCheck2,
  FolderOpen,
  GraduationCap,
  ShieldCheck,
  Trash2,
  Upload,
} from 'lucide-react';
import { useApp } from '../context';
import { exportProgress, importProgress, removeAttempt } from '../storage';
import { errorMessage } from '../api';
import { EmptyState, ErrorNotice, PageHeading, dateLabel, modeLabel } from '../components/common';

export function Progress() {
  const { data, attempts, completed, refreshProgress } = useApp();
  const [error, setError] = useState(''),
    [notice, setNotice] = useState(''),
    [busy, setBusy] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const theory = attempts.filter((a) => a.theoryResult),
    practice = attempts.filter((a) => a.kind === 'practice' && a.submittedAt);
  const weak = new Map<string, number>();
  for (const attempt of theory)
    for (const result of attempt.theoryResult?.results ?? [])
      if (!result.correct)
        weak.set(result.question.topicId, (weak.get(result.question.topicId) ?? 0) + 1);
  for (const attempt of practice)
    for (const result of attempt.report?.results ?? [])
      if (result.status === 'failed') {
        const topic =
          result.method === 'sql'
            ? 'sql'
            : result.method === 'php'
              ? 'php'
              : result.method === 'javascript'
                ? 'javascript'
                : result.method === 'dom' || result.method === 'style'
                  ? 'html-css'
                  : result.method === 'image'
                    ? 'graphics-security'
                    : 'tools';
        weak.set(topic, (weak.get(topic) ?? 0) + 1);
      }
  const weakTopics = [...weak].sort((a, b) => b[1] - a[1]);
  const backup = async () => {
    setError('');
    try {
      await exportProgress();
      setNotice('Kopia postępu została przygotowana do pobrania.');
    } catch (e) {
      setError(errorMessage(e));
    }
  };
  const restore = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    setError('');
    try {
      const count = await importProgress(file);
      await refreshProgress();
      setNotice(
        `Wczytano kopię zawierającą ${count} prób. Nowsze lokalne zapisy zostały zachowane.`,
      );
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
      if (input.current) input.current.value = '';
    }
  };
  const remove = async (id: string) => {
    if (
      !window.confirm(
        'Usunąć tę próbę z przeglądarki? Tej czynności nie można cofnąć bez kopii zapasowej.',
      )
    )
      return;
    try {
      await removeAttempt(id);
      await refreshProgress();
    } catch (e) {
      setError(errorMessage(e));
    }
  };
  return (
    <>
      <PageHeading kicker="Twoja praca, Twój postęp" title="Małe kroki się sumują.">
        Zapisane projekty, ukończone lekcje i tematy, do których warto wrócić.
      </PageHeading>
      <ErrorNotice message={error} />
      {notice && (
        <div className="notice success" role="status">
          <CheckCircle2 size={19} />
          {notice}
        </div>
      )}
      <div className="progress-stats">
        <div>
          <BookOpen size={24} />
          <strong>
            {completed.length}
            <small>/{data?.lessons.length ?? 12}</small>
          </strong>
          <span>ukończonych lekcji</span>
        </div>
        <div>
          <GraduationCap size={25} />
          <strong>{theory.length}</strong>
          <span>rozwiązanych testów</span>
        </div>
        <div>
          <FileCheck2 size={25} />
          <strong>{practice.length}</strong>
          <span>zakończonych prób praktycznych</span>
        </div>
        <div>
          <FolderOpen size={25} />
          <strong>{attempts.filter((a) => !a.submittedAt).length}</strong>
          <span>rozpoczętych prób</span>
        </div>
      </div>
      <div className="progress-columns">
        <section>
          <div className="section-heading">
            <h2>Historia Twojej pracy</h2>
            <span className="muted">Tylko w tej przeglądarce</span>
          </div>
          {attempts.length ? (
            <div className="attempt-list">
              {attempts.map((attempt) => (
                <article className="attempt-row" key={attempt.id}>
                  <span className="attempt-icon">
                    {attempt.kind === 'theory' ? (
                      <GraduationCap size={22} />
                    ) : (
                      <FileCheck2 size={22} />
                    )}
                  </span>
                  <div>
                    <Link
                      to={
                        attempt.kind === 'theory'
                          ? `/teoria?proba=${attempt.id}`
                          : `/praktyka/${attempt.taskId}?proba=${attempt.id}`
                      }
                    >
                      <h3>{attempt.title}</h3>
                    </Link>
                    <p>
                      {modeLabel(attempt.mode)} · {dateLabel(attempt.updatedAt)}
                    </p>
                    <span className={`attempt-status ${attempt.submittedAt ? 'submitted' : ''}`}>
                      {attempt.theoryResult
                        ? `${attempt.theoryResult.correct}/${attempt.theoryResult.total} poprawnych`
                        : attempt.report
                          ? attempt.report.complete && attempt.report.percentage !== null
                            ? `${attempt.report.percentage}% · wynik ćwiczeniowy`
                            : 'Raport z częściową oceną'
                          : attempt.submittedAt
                            ? attempt.checkJob
                              ? 'Oddano do sprawdzenia'
                              : 'Zakończono samodzielnie'
                            : 'W trakcie pracy'}
                    </span>
                  </div>
                  <button
                    className="icon-button danger"
                    aria-label={`Usuń próbę ${attempt.title}`}
                    onClick={() => void remove(attempt.id)}
                  >
                    <Trash2 size={16} />
                  </button>
                  <Link
                    className="icon-button"
                    aria-label={`Otwórz próbę ${attempt.title}`}
                    to={
                      attempt.kind === 'theory'
                        ? `/teoria?proba=${attempt.id}`
                        : `/praktyka/${attempt.taskId}?proba=${attempt.id}`
                    }
                  >
                    <ArrowRight size={18} />
                  </Link>
                </article>
              ))}
            </div>
          ) : (
            <EmptyState title="Tutaj pojawi się Twoja pierwsza próba" to="/nauka">
              Zacznij od lekcji lub krótkiego testu. Postęp będzie zapisywany automatycznie.
            </EmptyState>
          )}
        </section>
        <aside>
          <section className="repeat-panel">
            <h2>Warto powtórzyć</h2>
            {weakTopics.length ? (
              <div className="weak-topics">
                {weakTopics.map(([topic, count]) => (
                  <Link key={topic} to={`/nauka?temat=${topic}`}>
                    <div>
                      <strong>
                        {data?.topics.find((item) => item.id === topic)?.title ?? topic}
                      </strong>
                      <small>{count} punktów do powtórki w zapisanych próbach</small>
                    </div>
                    <ChevronArrow />
                  </Link>
                ))}
              </div>
            ) : (
              <p>Po sprawdzeniu pierwszych prób zobaczysz tu tematy wymagające uwagi.</p>
            )}
          </section>
          <section className="backup-panel">
            <ShieldCheck size={25} />
            <h2>Zadbaj o swoją kopię.</h2>
            <p>
              Usunięcie danych przeglądarki usuwa również postęp. Eksport pozwala przenieść go na
              inne urządzenie.
            </p>
            <button className="button primary full" disabled={busy} onClick={() => void backup()}>
              <Download size={17} />
              Eksportuj postęp
            </button>
            <button
              className="button secondary full"
              disabled={busy}
              onClick={() => input.current?.click()}
            >
              <Upload size={17} />
              {busy ? 'Wczytywanie…' : 'Importuj kopię'}
            </button>
            <input
              className="visually-hidden"
              ref={input}
              type="file"
              accept=".zip"
              onChange={(e) => void restore(e.target.files?.[0])}
            />
            <p className="fine-print">
              Kopia zawiera Twój kod i prywatne identyfikatory prób. Przechowuj ją u siebie.
            </p>
          </section>
        </aside>
      </div>
    </>
  );
}
function ChevronArrow() {
  return <ArrowRight size={17} />;
}
