import { AlertCircle, CheckCircle2, ClipboardCheck, HelpCircle, XCircle } from 'lucide-react';
import type { CheckReport, CriterionStatus, Criterion } from '@zdaj/shared';
const methodLabels: Record<Criterion['method'], string> = {
  file: 'pliki',
  dom: 'struktura strony',
  style: 'style CSS',
  javascript: 'zachowanie JavaScript',
  php: 'działanie PHP',
  sql: 'zapytania MariaDB',
  image: 'właściwości obrazu',
  manual: 'przegląd samodzielny',
};
const labels: Record<CriterionStatus, string> = {
  passed: 'Spełnione',
  failed: 'Do poprawy',
  manual: 'Sprawdź samodzielnie',
  unchecked: 'Nie sprawdzono',
  error: 'Błąd sprawdzania',
};
export function Report({ report }: { report: CheckReport }) {
  return (
    <div className="check-report">
      <header className="report-header">
        <span className="report-symbol">
          <ClipboardCheck size={26} />
        </span>
        <div>
          <span className="eyebrow">Informacja zwrotna</span>
          <h2>
            {report.complete
              ? 'Twoje rozwiązanie zostało sprawdzone'
              : 'Część kryteriów wymaga dodatkowej oceny'}
          </h2>
          <p>
            {report.complete && report.percentage !== null
              ? `${report.percentage}% punktów w tym ćwiczeniu`
              : `Potwierdzono ${report.confirmedPoints} z ${report.totalPoints} możliwych punktów. Automatycznie sprawdzono kryteria warte ${report.checkedPoints} punktów.`}
          </p>
        </div>
      </header>
      <p className="report-disclaimer">{report.disclaimer}</p>
      <div className="criterion-results">
        {report.results.map((result) => (
          <article className={`criterion-result status-${result.status}`} key={result.criterionId}>
            <span className="criterion-icon">
              {result.status === 'passed' ? (
                <CheckCircle2 size={21} />
              ) : result.status === 'failed' ? (
                <XCircle size={21} />
              ) : result.status === 'error' ? (
                <AlertCircle size={21} />
              ) : (
                <HelpCircle size={21} />
              )}
            </span>
            <div>
              <div className="criterion-title">
                <h3>{result.title}</h3>
                <span className={`result-badge ${result.status}`}>{labels[result.status]}</span>
              </div>
              <p>{result.evidence}</p>
              {result.recommendation && (
                <p className="recommendation">
                  <strong>Następny krok: </strong>
                  {result.recommendation}
                </p>
              )}
              <div className="criterion-meta">
                <span>
                  {result.source === 'official' ? 'Kryterium oficjalne' : 'Kryterium ćwiczenia'}
                </span>
                <span>Metoda: {methodLabels[result.method]}</span>
                <span>{result.points} pkt</span>
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
