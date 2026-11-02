import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Code2,
  GraduationCap,
  Lightbulb,
  Play,
  Terminal,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useApp } from '../context';
import { EmptyState, LevelPicker, Loading, Tags, TopicIcon, modeLabel } from '../components/common';

export function Home() {
  const { data, loading, level, setLevel, attempts, completed } = useApp();
  if (loading && !data) return <Loading />;
  if (!data)
    return (
      <EmptyState title="Pracownia czeka na połączenie">
        Połącz się z serwerem, aby wczytać lekcje. Zapisany postęp możesz wyeksportować w zakładce
        Moje postępy.
      </EmptyState>
    );
  const recent = attempts.find((a) => !a.submittedAt),
    nextLesson = data.lessons.find((l) => !completed.includes(l.id)) ?? data.lessons[0];
  return (
    <>
      <div className="home-intro">
        <span className="eyebrow">Dobrze, że jesteś. Zróbmy kolejny krok.</span>
        <h1>
          Od pierwszej linijki
          <br />
          do gotowego projektu.
        </h1>
        <p>
          Przygotuj się do INF.03 we własnym tempie.
          <br />
          Zrozum, spróbuj samodzielnie i sprawdź rezultat.
        </p>
        <div className="intro-actions">
          <Link
            to={
              recent
                ? recent.kind === 'practice'
                  ? `/praktyka/${recent.taskId}?proba=${recent.id}`
                  : `/teoria?proba=${recent.id}`
                : '/nauka'
            }
            className="button primary"
          >
            {recent ? 'Wróć do swojej pracy' : 'Rozpocznij naukę'}
            <ArrowRight size={18} />
          </Link>
          <Link to="/praktyka" className="button quiet">
            Zobacz zadania
            <ChevronRight size={17} />
          </Link>
        </div>
        <div className="hero-art" aria-hidden="true">
          <div className="art-file">
            <div className="art-tab">
              <span />
              <span />
              <span />
              <small>moja-strona.html</small>
            </div>
            <div className="art-code">
              <span>
                &lt;<b>main</b>&gt;
              </span>
              <span>
                &nbsp; &lt;<b>h1</b>&gt;Cześć, świecie!&lt;/<b>h1</b>&gt;
              </span>
              <span>
                &nbsp; &lt;<b>p</b>&gt;Umiem to zrobić.&lt;/<b>p</b>&gt;
              </span>
              <span>
                &lt;/<b>main</b>&gt;
              </span>
            </div>
          </div>
          <div className="art-result">
            <span className="art-check">
              <CheckCircle2 size={20} />
            </span>
            <div>
              <strong>Mały krok. Realna umiejętność.</strong>
              <small>Twoja pierwsza strona działa.</small>
            </div>
          </div>
          <div className="art-grid" />
        </div>
      </div>
      <section className="level-section">
        <div className="section-label">
          <h2>Od czego zaczynamy?</h2>
          <p>Wybierz poziom pomocy. Możesz go zmienić w każdej chwili.</p>
        </div>
        <LevelPicker value={level} onChange={setLevel} />
      </section>
      <div className="home-columns">
        <section className="learning-route">
          <div className="section-heading">
            <div>
              <span className="eyebrow">Twoja ścieżka</span>
              <h2>Sześć obszarów. Jeden cel.</h2>
            </div>
            <Link to="/nauka" className="text-link">
              Wszystkie lekcje
              <ArrowRight size={16} />
            </Link>
          </div>
          <div className="topic-list">
            {data.topics.map((topic, index) => {
              const lessons = data.lessons.filter((l) => l.topicId === topic.id);
              const done = lessons.filter((l) => completed.includes(l.id)).length;
              return (
                <Link to={`/nauka?temat=${topic.id}`} className="topic-row" key={topic.id}>
                  <span className={`topic-symbol topic-${topic.id}`}>
                    <TopicIcon id={topic.id} />
                  </span>
                  <div className="topic-row-body">
                    <div>
                      <span className="route-number">{String(index + 1).padStart(2, '0')}</span>
                      <h3>{topic.title}</h3>
                    </div>
                    <p>{topic.description}</p>
                  </div>
                  <span className="topic-count">
                    {done ? `${done}/${lessons.length} ukończono` : `${lessons.length} lekcje`}
                  </span>
                  <ChevronRight size={17} />
                </Link>
              );
            })}
          </div>
        </section>
        <aside className="home-aside">
          <div className="next-step">
            <span className="pill">
              <BookOpen size={14} />
              Dobry kolejny krok
            </span>
            <h2>{recent ? recent.title : nextLesson?.title || 'Zacznij od podstaw'}</h2>
            <p>
              {recent
                ? `Masz rozpoczętą próbę w trybie ${modeLabel(recent.mode).toLowerCase()}. Jej pliki i postęp są zapisane.`
                : nextLesson?.summary}
            </p>
            <div className="meta-line">
              <Clock3 size={15} />
              {recent ? 'Kontynuuj we własnym tempie' : `${nextLesson?.minutes ?? 15} minut`}
            </div>
            <Link
              className="button primary full"
              to={
                recent
                  ? recent.kind === 'practice'
                    ? `/praktyka/${recent.taskId}?proba=${recent.id}`
                    : `/teoria?proba=${recent.id}`
                  : `/nauka/${nextLesson?.id}`
              }
            >
              <Play size={16} />
              {recent ? 'Kontynuuj próbę' : 'Otwórz lekcję'}
            </Link>
          </div>
          <div className="study-note">
            <Lightbulb size={23} />
            <h3>Nie musisz znać odpowiedzi.</h3>
            <p>
              Najpierw spróbuj. Przeczytaj oryginalny arkusz i porównaj wymagania ze swoim
              rozwiązaniem. Zobacz, co warto powtórzyć.
            </p>
          </div>
          <Link to="/teoria" className="theory-invite">
            <GraduationCap size={24} />
            <div>
              <strong>Chwila na teorię?</strong>
              <span>{data.questionCount} opublikowanych przykładów CKE</span>
            </div>
            <ArrowRight size={18} />
          </Link>
        </aside>
      </div>
      <section className="project-section">
        <div className="section-heading">
          <div>
            <span className="eyebrow">Sprawdź wiedzę w działaniu</span>
            <h2>Zadania z arkuszy CKE</h2>
          </div>
          <Link to="/praktyka" className="text-link">
            Otwórz pracownię
            <ArrowRight size={16} />
          </Link>
        </div>
        <div className="project-grid">
          {data.tasks.map((task, index) => (
            <Link to={`/praktyka/${task.id}`} className="project-card" key={task.id}>
              <div className="project-card-top">
                <span className={`project-illustration project-${index}`}>
                  <Terminal size={28} />
                  <span>
                    {(
                      {
                        'cke-wedkowanie': 'SELECT *',
                        'inf03-01-25-01-sg': '<form>',
                        'inf03-08-25-06-sg': 'mysqli()',
                      } as Record<string, string>
                    )[task.id] ?? task.technologies[0]}
                  </span>
                </span>
                <span className="pill subtle">Arkusz CKE</span>
              </div>
              <h3>{task.title}</h3>
              <p>{task.summary}</p>
              <Tags items={task.technologies} />
              <div className="project-card-bottom">
                <span>
                  <Clock3 size={14} />
                  {task.durationMinutes} min w trybie egzaminu
                </span>
                <ArrowRight size={18} />
              </div>
            </Link>
          ))}
        </div>
      </section>
      <div className="bottom-note">
        <Code2 size={19} />
        <p>
          To miejsce do samodzielnej pracy. Kod piszesz Ty — pracownia pomaga zrozumieć wymagania i
          sprawdzić wynik.
        </p>
      </div>
    </>
  );
}
