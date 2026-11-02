import {
  ArrowRight,
  BookOpen,
  Check,
  ChevronRight,
  Code2,
  FileCode2,
  GraduationCap,
  Play,
  Settings2,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useApp } from '../context';
import { resumeHref, resumeStep } from '../resume';
import { EmptyState, LevelPicker, Loading, TopicIcon } from '../components/common';

export function Home() {
  const { data, loading, level, setLevel, attempts, completed } = useApp();
  if (loading && !data) return <Loading />;
  if (!data)
    return (
      <EmptyState
        title="Nie udało się wczytać nauki"
        to="/moje-prace"
        label="Otwórz zapisane prace"
      >
        Sprawdź połączenie z serwerem. Twoje zapisane pliki nadal są w tej przeglądarce.
      </EmptyState>
    );
  const recent = attempts.find((attempt) => !attempt.submittedAt);
  const currentActivity = recent ? resumeStep(recent) : undefined;
  return (
    <div className="learning-home">
      <header className="learning-heading">
        <div>
          <p className="qualification-label">Przygotowanie do INF.03</p>
          <h1>Ucz się. Po swojemu.</h1>
          <p>Najpierw zrozum mały krok. Potem napisz go sam.</p>
        </div>
        <details className="learning-preferences">
          <summary aria-label="Ustawienia nauki">
            <Settings2 size={20} />
            <span>Poziom pomocy</span>
          </summary>
          <div className="preference-popover glass-panel">
            <h2>Ile objaśnień potrzebujesz?</h2>
            <LevelPicker value={level} onChange={setLevel} />
            <p>Poziom zmienia ilość pomocy. Wymagania arkusza pozostają takie same.</p>
          </div>
        </details>
      </header>
      {recent && (
        <section className="continue-panel glass-panel">
          <div className="continue-symbol">
            <Play size={25} fill="currentColor" />
          </div>
          <div>
            <span className="subtle-label">Wróć do ostatniej pracy</span>
            <h2>{recent.title}</h2>
            <p>
              {currentActivity ??
                (recent.kind === 'theory'
                  ? 'Twoje odpowiedzi czekają w zapisanej serii.'
                  : 'Otwórz zapisane pliki i miejsce, w którym skończyłeś.')}
            </p>
          </div>
          <Link className="button primary" to={resumeHref(recent)}>
            Kontynuuj
            <ArrowRight size={17} />
          </Link>
        </section>
      )}
      <section className="learning-projects surface-panel">
        <div className="section-heading">
          <div>
            <h2>{recent ? 'Nauka z arkuszami CKE' : 'Od którego arkusza zaczniemy?'}</h2>
            <p>Oryginalny arkusz, małe kroki i Twój własny projekt.</p>
          </div>
          <Link className="text-link" to="/arkusze">
            Wszystkie arkusze
            <ChevronRight size={16} />
          </Link>
        </div>
        <div className="learning-project-list">
          {data.tasks.map((task, index) => (
            <Link
              className="learning-project-row"
              key={task.id}
              to={`/praktyka/${task.id}?tryb=nauka&widok=nauka`}
            >
              <span className={`exam-app-icon exam-color-${index % 3}`}>
                <FileCode2 size={27} strokeWidth={1.6} />
              </span>
              <div>
                <h3>{task.title}</h3>
                <p>{task.technologies.join(' / ')}</p>
                <span>
                  {index === 0
                    ? 'Zacznij tutaj, jeśli uczysz się od podstaw.'
                    : 'Przejdź od wymagań do działającego rozwiązania.'}
                </span>
              </div>
              <span className="learning-row-action">
                Ucz się
                <ChevronRight size={18} />
              </span>
            </Link>
          ))}
        </div>
      </section>
      <div className="learning-secondary">
        <section className="foundation-section">
          <div className="section-heading">
            <div>
              <h2>Potrzebujesz podstaw?</h2>
              <p>Wróć do jednego tematu, kiedy go potrzebujesz.</p>
            </div>
            <Link
              className="icon-button"
              aria-label="Wszystkie lekcje podstaw"
              to="/nauka/podstawy"
            >
              <ArrowRight size={19} />
            </Link>
          </div>
          <div className="foundation-list">
            {data.topics.map((topic) => {
              const lessons = data.lessons.filter((lesson) => lesson.topicId === topic.id);
              const done =
                lessons.length > 0 && lessons.every((lesson) => completed.includes(lesson.id));
              return (
                <Link key={topic.id} to={`/nauka/podstawy?temat=${topic.id}`}>
                  <span className="foundation-icon">
                    <TopicIcon id={topic.id} size={19} />
                  </span>
                  <span>{topic.title}</span>
                  {done ? <Check size={17} className="text-green" /> : <ChevronRight size={16} />}
                </Link>
              );
            })}
          </div>
        </section>
        <aside className="theory-shortcut glass-panel">
          <span className="shortcut-icon">
            <GraduationCap size={32} strokeWidth={1.5} />
          </span>
          <h2>Chwila na teorię.</h2>
          <p>Krótka seria pytań CKE. Po odpowiedzi zobaczysz, co warto powtórzyć.</p>
          <Link className="button secondary" to="/teoria">
            Otwórz teorię
            <ArrowRight size={17} />
          </Link>
          <small>{data.questionCount} opublikowanych przykładów CKE</small>
          <div className="shortcut-foot">
            <BookOpen size={16} />
            <span>Spokojnie, we własnym tempie.</span>
          </div>
        </aside>
      </div>
      <div className="learning-footnote">
        <Code2 size={18} />
        <p>Omówienia pomagają w nauce. Oryginalne wymagania zawsze znajdziesz w arkuszu CKE.</p>
      </div>
    </div>
  );
}
