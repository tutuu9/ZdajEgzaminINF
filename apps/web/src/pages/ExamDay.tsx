import { Link, useNavigate } from 'react-router-dom';
import { useApp } from '../context';
import { ArrowRight, ExternalLink as ExternalIcon, Shuffle, Timer } from 'lucide-react';
import { PageHeading } from '../components/common';
import { EXAM_CHECKLIST } from '../components/ExamPlan';
import {
  EXAM_DAY_SOURCES,
  EXAM_DAY_STAGES,
  ORIGIN_LABELS,
  type PointOrigin,
} from '../exam-day-content';
import '../exam-day.css';

function OriginBadge({ origin }: { origin: PointOrigin }) {
  return <span className={`origin-badge origin-${origin}`}>{ORIGIN_LABELS[origin]}</span>;
}

/** The practical part of INF.03, stage by stage, with the origin of every statement. */
export function ExamDay() {
  const { data } = useApp();
  const navigate = useNavigate();
  const papers = (data?.tasks ?? []).filter(
    (task) => task.origin === 'exam' && task.sourceCatalogId,
  );
  const drawPaper = () => {
    const paper = papers[Math.floor(Math.random() * papers.length)];
    if (paper) navigate(`/praktyka/${encodeURIComponent(paper.id)}?tryb=egzamin`);
  };
  return (
    <div className="exam-day-page">
      <PageHeading kicker="Część praktyczna INF.03" title="Jak wygląda egzamin">
        Od stanowiska po nagranie płyty. Każdy punkt ma oznaczenie, czy to zasada CKE, przykład z
        arkusza, czy nasza porada.
      </PageHeading>

      <section className="exam-day-legend" aria-label="Oznaczenia">
        <p>
          <OriginBadge origin="cke" /> wynika z dokumentów CKE.
        </p>
        <p>
          <OriginBadge origin="sheet" /> pochodzi z arkusza INF.03-02-24.06-SG — w Twoim arkuszu
          nazwy, hasło i wymagania mogą być inne.
        </p>
        <p>
          <OriginBadge origin="advice" /> to wskazówka z praktyki, nie przepis.
        </p>
      </section>

      <ol className="exam-day-stages">
        {EXAM_DAY_STAGES.map((stage, index) => (
          <li key={stage.id} className="exam-day-stage" aria-labelledby={`etap-${stage.id}`}>
            <span className="exam-day-number" aria-hidden="true">
              {index + 1}
            </span>
            <div className="exam-day-body">
              <p className="exam-day-when">{stage.when}</p>
              <h2 id={`etap-${stage.id}`}>{stage.title}</h2>
              <ul>
                {stage.points.map((point) => (
                  <li key={point.text}>
                    <OriginBadge origin={point.origin} />
                    <span>{point.text}</span>
                  </li>
                ))}
              </ul>
              {(stage.faq.length > 0 || stage.practice) && (
                <div className="exam-day-links">
                  {stage.faq.map((entry) => (
                    <Link key={entry.id} to={`/faq#${entry.id}`}>
                      {entry.label}
                    </Link>
                  ))}
                  {stage.practice && (
                    <Link className="exam-day-practice" to={stage.practice.to}>
                      {stage.practice.label}
                      <ArrowRight size={15} />
                    </Link>
                  )}
                </div>
              )}
            </div>
          </li>
        ))}
      </ol>

      <section className="exam-day-rehearsal glass-panel" aria-labelledby="proba-generalna">
        <Timer size={26} />
        <div>
          <h2 id="proba-generalna">Zrób próbę generalną</h2>
          <p>
            Tryb <strong>Egzamin</strong> otwiera symulowane stanowisko: 10 minut na zapoznanie się
            z arkuszem, potem 150 minut pracy bez podpowiedzi, folder nazwany numerem zdającego i
            sprawdzenie plików przed „nagraniem płyty”.
          </p>
          <ul>
            {EXAM_CHECKLIST.slice(0, 3).map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <div className="exam-day-rehearsal-actions">
            <button className="button primary" disabled={papers.length === 0} onClick={drawPaper}>
              <Shuffle size={17} />
              Losuj arkusz i zacznij
            </button>
            <Link className="button secondary" to="/arkusze">
              Wybierz arkusz
              <ArrowRight size={17} />
            </Link>
          </div>
        </div>
      </section>

      <section className="exam-day-sources" aria-labelledby="zrodla">
        <h2 id="zrodla">Źródła</h2>
        <ul>
          {EXAM_DAY_SOURCES.map((source) => (
            <li key={source.url}>
              <a href={source.url} target="_blank" rel="noreferrer">
                {source.title}
                <ExternalIcon size={14} aria-hidden="true" />
              </a>
              <span>{source.note}</span>
            </li>
          ))}
        </ul>
        <p>
          Szczegółowe odpowiedzi z datą sprawdzenia źródeł znajdziesz w{' '}
          <Link to="/faq">pytaniach i odpowiedziach</Link>. Serwis nie jest stroną CKE.
        </p>
      </section>
    </div>
  );
}
