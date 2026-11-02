import { ArrowRight, BookOpen, CheckCircle2, Clock3, Code2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import '../study.css';
import { useApp } from '../context';
import { EmptyState, LevelPicker, Loading, Notice, PageHeading, Tags } from '../components/common';

export function PracticeList() {
  const { data, loading, level, setLevel, attempts } = useApp();
  if (!data)
    return loading ? (
      <Loading />
    ) : (
      <EmptyState title="Projekty są chwilowo niedostępne">
        Spróbuj ponownie połączyć się z serwerem.
      </EmptyState>
    );
  return (
    <>
      <PageHeading kicker="Od pomysłu do działającego rozwiązania" title="Zadania praktyczne">
        Pracuj z oryginalnymi arkuszami CKE. Pisz we własnej IDE albo w przeglądarce i zachowaj
        rozwiązanie lokalnie.
      </PageHeading>
      <LevelPicker value={level} onChange={setLevel} />
      <div className="practice-projects">
        {data.tasks.map((task, index) => {
          const past = attempts.filter((a) => a.taskId === task.id);
          const draft = past.find((a) => !a.submittedAt);
          return (
            <article className="practice-project" key={task.id}>
              <div className={`practice-project-art project-${index}`}>
                <Code2 size={38} />
                <strong>
                  {(
                    {
                      'cke-wedkowanie': 'PHP + SQL',
                      'inf03-01-25-01-sg': 'HTML / CSS / JS',
                      'inf03-08-25-06-sg': 'Pełna aplikacja',
                    } as Record<string, string>
                  )[task.id] ?? task.technologies.join(' / ')}
                </strong>
                <span>{String(index + 1).padStart(2, '0')}</span>
              </div>
              <div className="practice-project-body">
                <div className="project-title-row">
                  <span className="pill subtle">Arkusz CKE</span>
                  <span className="meta-line">
                    <Clock3 size={15} />
                    {task.durationMinutes} min
                  </span>
                </div>
                <h2>{task.title}</h2>
                <p>{task.summary}</p>
                <Tags items={task.technologies} />
                <Link
                  className="practice-study-link"
                  to={`/praktyka/${task.id}?tryb=nauka&widok=nauka`}
                >
                  <BookOpen size={18} />
                  <span>
                    Ucz się pisać kod z tym arkuszem
                    <small>Kroki, własny notatnik, przykłady i pliki rozwiązania</small>
                  </span>
                  <ArrowRight size={16} />
                </Link>
                <div className="project-requirements">
                  {task.requirements.slice(0, 3).map((requirement) => (
                    <span key={requirement}>
                      <CheckCircle2 size={15} />
                      {requirement}
                    </span>
                  ))}
                </div>
                <div className="project-action-row">
                  <span>
                    {past.length
                      ? `${past.length} zapisane próby`
                      : 'Czeka na Twoje pierwsze rozwiązanie'}
                  </span>
                  <Link
                    className="button primary"
                    to={`/praktyka/${task.id}${draft ? `?proba=${draft.id}` : ''}`}
                  >
                    {draft ? 'Kontynuuj próbę' : 'Otwórz arkusz'}
                    <ArrowRight size={17} />
                  </Link>
                </div>
              </div>
            </article>
          );
        })}
      </div>
      <Notice>
        Zadania pochodzą z arkuszy CKE. Podgląd pokazuje oryginalny PDF z jawnym źródłem. Dla
        arkuszy bez adaptera sprawdzania dostępne są zapis plików, własna kontrola i zakończenie
        próby bez punktacji.
      </Notice>
    </>
  );
}
