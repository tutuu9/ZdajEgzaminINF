import { useEffect, useState } from 'react';
import { ClipboardCheck, Flag } from 'lucide-react';
import '../exam-plan.css';

/**
 * An orientation plan for a timed attempt. The split is advice for practice, not a CKE
 * rule; papers differ and the learner may reorder parts.
 */
const STAGES = [
  {
    share: 10 / 150,
    title: 'Arkusz i pliki',
    hint: 'Przeczytaj całe polecenie, rozpakuj archiwum i utwórz folder o wymaganej nazwie.',
  },
  {
    share: 30 / 150,
    title: 'Baza i kwerendy',
    hint: 'Import, zapytania w kwerendy.txt i pełne zrzuty po każdej kwerendzie.',
  },
  {
    share: 15 / 150,
    title: 'Grafika',
    hint: 'Obróbka obrazu i zapis pod wymaganą nazwą oraz w wymaganym formacie.',
  },
  {
    share: 45 / 150,
    title: 'Strona HTML i CSS',
    hint: 'Struktura bloków, potem style z jednego zewnętrznego pliku.',
  },
  {
    share: 30 / 150,
    title: 'Skrypt JS lub PHP',
    hint: 'Najpierw działanie dla danych z polecenia, potem szczegóły.',
  },
  {
    share: 20 / 150,
    title: 'Kontrola końcowa',
    hint: 'Lista poniżej: nazwy plików, zrzuty, kwerendy, sprawdzenie w przeglądarce.',
  },
];

export const EXAM_CHECKLIST = [
  'Folder i pliki mają dokładnie te nazwy, które podaje arkusz (wielkość liter i rozszerzenia).',
  'Zrzuty ekranu spełniają warunki z arkusza (często: cały ekran z paskiem zadań, bez kadrowania) i mają wymaganą nazwę.',
  'kwerendy.txt zawiera wszystkie zapytania w kolejności z arkusza; każde kończy się średnikiem.',
  'Zapytania wybierają tylko wymagane kolumny — bez SELECT *, jeśli polecenie wymienia pola.',
  'W XAMPP działają Apache i MySQL; stronę PHP otwierasz przez http://localhost/…, nie przez file://.',
  'Style są w zewnętrznym pliku CSS, a strona ma tytuł, język i kodowanie z polecenia.',
  'Strona otwiera się bez błędów w przeglądarce; formularz i skrypt działają dla danych z polecenia.',
  'Połączenie z bazą jest zamykane, a w kodzie PHP nie ma błędów widocznych na stronie.',
];

export function ExamChecklist({ open = false }: { open?: boolean }) {
  return (
    <details className="exam-checklist" open={open}>
      <summary>
        <ClipboardCheck size={17} /> Lista kontrolna przed oddaniem
      </summary>
      <ul>
        {EXAM_CHECKLIST.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
      <p>
        Zebrane z zasad oceniania arkuszy i porad zdających. To pomoc w ćwiczeniu, nie oficjalna
        lista CKE.
      </p>
    </details>
  );
}

export function ExamPlan({
  deadlineAt,
  durationMinutes,
}: {
  deadlineAt: string;
  durationMinutes: number;
}) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 15_000);
    return () => clearInterval(interval);
  }, []);
  const total = durationMinutes * 60_000;
  const elapsed = Math.min(total, Math.max(0, now - (Date.parse(deadlineAt) - total)));
  let start = 0;
  const stages = STAGES.map((stage) => {
    const from = start;
    start += stage.share * total;
    return { ...stage, from, to: start, minutes: Math.round(stage.share * durationMinutes) };
  });
  const current = stages.find((stage) => elapsed < stage.to) ?? stages[stages.length - 1]!;
  const left = Math.max(0, Math.ceil((current.to - elapsed) / 60_000));
  return (
    <section className="exam-plan" aria-label="Plan czasu egzaminu">
      <div className="exam-plan-head">
        <Flag size={16} />
        <strong>Teraz: {current.title}</strong>
        <span>{left > 0 ? `na ten etap zostało ok. ${left} min` : 'czas na ten etap minął'}</span>
      </div>
      <ol className="exam-plan-bar">
        {stages.map((stage) => (
          <li
            key={stage.title}
            style={{ flexGrow: stage.share }}
            className={stage === current ? 'current' : elapsed >= stage.to ? 'done' : undefined}
            aria-current={stage === current ? 'step' : undefined}
            title={`${stage.title}: ok. ${stage.minutes} min. ${stage.hint}`}
          >
            <span>{stage.title}</span>
            <small>{stage.minutes} min</small>
          </li>
        ))}
      </ol>
      <p className="exam-plan-hint">{current.hint}</p>
      <ExamChecklist open={current === stages[stages.length - 1]} />
    </section>
  );
}
