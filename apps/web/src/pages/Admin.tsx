import { useCallback, useEffect, useState, type FormEvent } from 'react';
import {
  Activity,
  Check,
  ChevronRight,
  DollarSign,
  FilePlus2,
  Globe,
  Loader2,
  LockKeyhole,
  LogOut,
  RefreshCw,
  Save,
  Settings2,
  ShieldCheck,
  Sparkles,
  Upload,
} from 'lucide-react';
import Markdown from 'react-markdown';
import type { AdminDashboard, CatalogEntry, ContentDraft, SiteSettings } from '@zdaj/shared';
import { useApp } from '../context';
import { api, errorMessage } from '../api';
import { ErrorNotice, Loading, Notice, PageHeading, dateLabel } from '../components/common';
import { FaqManager } from '../components/FaqManager';

const usd = (value: number) =>
  new Intl.NumberFormat('pl-PL', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 5,
  }).format(value);
const kindLabels: Record<string, string> = {
  task: 'Projekt',
  lesson: 'Lekcja',
  question: 'Pytanie',
  catalog: 'Źródło',
};
const payloadObject = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
function ContentPreview({ payload }: { payload: unknown }) {
  const object = payloadObject(payload);
  return (
    <div className="content-preview">
      <span className="eyebrow">Podgląd treści</span>
      <h3>{String(object.title || object.prompt || 'Nowy materiał')}</h3>
      {typeof object.summary === 'string' && <p>{object.summary}</p>}
      {typeof object.body === 'string' && (
        <div className="prose">
          <Markdown>{object.body}</Markdown>
        </div>
      )}
      {Array.isArray(object.options) && (
        <ol>
          {object.options.map((item, index) => {
            const option = payloadObject(item);
            return (
              <li key={index}>
                <strong>{String(option.text ?? '')}</strong>
                {option.id === object.correctOptionId && <span className="pill">Poprawna</span>}
                <p>{String(option.explanation ?? '')}</p>
              </li>
            );
          })}
        </ol>
      )}
      {Array.isArray(object.requirements) && (
        <ul>
          {object.requirements.map((item, index) => (
            <li key={index}>{String(item)}</li>
          ))}
        </ul>
      )}
      {Array.isArray(object.objectives) && (
        <ul>
          {object.objectives.map((item, index) => (
            <li key={index}>{String(item)}</li>
          ))}
        </ul>
      )}
      {typeof object.explanation === 'string' && <p>{object.explanation}</p>}
    </div>
  );
}

function ContentManager() {
  const [rows, setRows] = useState<ContentDraft[]>([]),
    [kind, setKind] = useState('lesson'),
    [key, setKey] = useState(''),
    [text, setText] = useState('{}'),
    [selected, setSelected] = useState<ContentDraft | null>(null),
    [error, setError] = useState(''),
    [notice, setNotice] = useState(''),
    [busy, setBusy] = useState(false),
    [search, setSearch] = useState('');
  const { reload } = useApp();
  const load = useCallback(async () => {
    setRows(await api<ContentDraft[]>('/admin/content'));
  }, []);
  useEffect(() => {
    void load().catch((e) => setError(errorMessage(e)));
  }, [load]);
  const select = (row: ContentDraft) => {
    setSelected(row);
    setKind(row.kind);
    setKey(row.key);
    setText(JSON.stringify(row.payload, null, 2));
    setNotice('');
    setError('');
  };
  const create = () => {
    setSelected(null);
    setKey('nowy-material');
    const examples: Record<string, unknown> = {
      lesson: {
        id: 'nowy-material',
        version: 1,
        topicId: 'html-css',
        title: 'Nowa lekcja',
        summary: 'Krótki opis lekcji.',
        minutes: 15,
        level: 'beginner',
        body: '## Cel lekcji\n\nWyjaśnij temat i dodaj przykład.',
        objectives: ['Uczeń potrafi wyjaśnić temat.'],
        exerciseIds: [],
      },
      question: {
        id: 'nowy-material',
        version: 1,
        topicId: 'html-css',
        level: 'beginner',
        prompt: 'Treść pytania?',
        options: [
          { id: 'a', text: 'Odpowiedź A', explanation: 'Uzasadnienie A.' },
          { id: 'b', text: 'Odpowiedź B', explanation: 'Uzasadnienie B.' },
          { id: 'c', text: 'Odpowiedź C', explanation: 'Uzasadnienie C.' },
          { id: 'd', text: 'Odpowiedź D', explanation: 'Uzasadnienie D.' },
        ],
        correctOptionId: 'a',
        explanation: 'Pełne wyjaśnienie.',
        reference: 'https://developer.mozilla.org/',
      },
      catalog: {
        id: 'nowy-material',
        title: 'Nowy materiał',
        qualification: 'INF.03',
        formula: '2019',
        year: null,
        session: null,
        identifier: null,
        variant: null,
        topics: [],
        technologies: [],
        sourceUrl: 'https://cke.gov.pl/',
        sourceName: 'CKE',
        attachments: [],
        criteriaAvailability: 'unverified',
        rightsStatus: 'unknown',
        importStatus: 'metadata-only',
        supportStatus: 'catalog-only',
        checkedAt: null,
        notes: 'Do sprawdzenia.',
      },
    };
    const example =
      examples[kind] ??
      rows.find((row) => row.kind === 'task' && row.status === 'published')?.payload ??
      {};
    setText(
      JSON.stringify(
        {
          ...payloadObject(example),
          id: 'nowy-material',
          ...(kind === 'task' ? { title: 'Nowy projekt' } : {}),
        },
        null,
        2,
      ),
    );
    setNotice('Uzupełnij treść i stabilny identyfikator. Zapis tworzy nowy szkic.');
  };
  let preview: unknown;
  try {
    preview = JSON.parse(text);
  } catch {
    preview = null;
  }
  const save = async () => {
    setBusy(true);
    setError('');
    try {
      const payload = JSON.parse(text) as unknown;
      if (!key.trim()) throw new Error('Podaj identyfikator materiału.');
      const draft = await api<ContentDraft>('/admin/content/drafts', {
        method: 'POST',
        body: { kind, key: key.trim(), payload: { ...payloadObject(payload), id: key.trim() } },
      });
      await load();
      select(draft);
      setNotice('Szkic zapisany. Sprawdź podgląd przed publikacją.');
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };
  const publish = async () => {
    if (!selected || selected.status !== 'draft') return;
    setBusy(true);
    setError('');
    try {
      const result = await api<ContentDraft>(`/admin/content/${selected.id}/publish`, {
        method: 'POST',
        body: {},
      });
      await load();
      select(result);
      setNotice('Opublikowano nową wersję. Wcześniejsze próby nadal korzystają z poprzedniej.');
      await reload();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };
  const filtered = rows.filter(
    (row) =>
      row.kind === kind &&
      `${row.key} ${String(payloadObject(row.payload).title ?? payloadObject(row.payload).prompt ?? '')}`
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  return (
    <>
      <div className="admin-section-heading">
        <div>
          <h2>Materiały i ich wersje</h2>
          <p>Zmiany w opublikowanej treści zapisujesz jako nową wersję.</p>
        </div>
        <button className="button secondary" onClick={create}>
          <FilePlus2 size={16} />
          Nowy materiał
        </button>
      </div>
      <ErrorNotice message={error} />
      {notice && (
        <div className="notice success" role="status">
          <Check size={18} />
          {notice}
        </div>
      )}
      <div className="admin-content-layout">
        <aside className="content-library">
          <label className="field">
            <span>Rodzaj materiału</span>
            <select
              value={kind}
              onChange={(e) => {
                setKind(e.target.value);
                setSelected(null);
                setText('{}');
                setKey('');
              }}
            >
              {Object.entries(kindLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <input
            className="search-input"
            aria-label="Szukaj materiału"
            placeholder="Szukaj materiału…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div className="content-list">
            {filtered.map((row) => (
              <button
                className={selected?.id === row.id ? 'active' : ''}
                key={row.id}
                onClick={() => select(row)}
              >
                <strong>
                  {String(
                    payloadObject(row.payload).title ??
                      payloadObject(row.payload).prompt ??
                      row.key,
                  )}
                </strong>
                <span>
                  {row.status === 'published' ? 'Opublikowano' : 'Szkic'} · v{row.version}
                </span>
              </button>
            ))}
          </div>
        </aside>
        <section className="content-edit">
          <label className="field">
            <span>Stabilny identyfikator</span>
            <input
              value={key}
              onChange={(e) => setKey(e.target.value)}
              placeholder="np. html-struktura"
            />
          </label>
          <label className="field">
            <span>Treść materiału (JSON)</span>
            <textarea
              className="json-editor"
              spellCheck={false}
              rows={20}
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
          </label>
          <p className="fine-print">
            Treść jest walidowana przez serwer. Automatyczne kryteria mogą korzystać tylko z
            obsługiwanych typów sprawdzania.
          </p>
          <div className="button-row">
            <button
              className="button primary"
              disabled={busy || !preview || !key.trim()}
              onClick={() => void save()}
            >
              <Save size={16} />
              Zapisz nowy szkic
            </button>
            <button
              className="button secondary"
              disabled={
                busy ||
                selected?.status !== 'draft' ||
                JSON.stringify(selected.payload, null, 2) !== text
              }
              onClick={() => void publish()}
            >
              <Upload size={16} />
              Publikuj zapisany szkic
            </button>
          </div>
          {selected && (
            <p className="fine-print">
              Wybrana wersja: {selected.version} ·{' '}
              {selected.status === 'published' ? 'opublikowana' : 'szkic'} ·{' '}
              {dateLabel(selected.createdAt)}
            </p>
          )}
        </section>
        <aside className="content-preview-panel">
          {preview ? (
            <ContentPreview payload={preview} />
          ) : (
            <p>Popraw składnię JSON, aby zobaczyć podgląd.</p>
          )}
        </aside>
      </div>
    </>
  );
}

function SourcesManager() {
  const { data, reload } = useApp();
  const [text, setText] = useState('[]'),
    [preview, setPreview] = useState<{
      entries: CatalogEntry[];
      duplicates: string[];
      issues: string[];
    } | null>(null),
    [error, setError] = useState(''),
    [notice, setNotice] = useState(''),
    [busy, setBusy] = useState(false);
  const inspect = async () => {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const entries = JSON.parse(text) as unknown;
      setPreview(await api('/admin/sources/preview', { method: 'POST', body: { entries } }));
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };
  const importEntries = async () => {
    if (!preview) return;
    setBusy(true);
    setError('');
    try {
      const result = await api<{ imported: number }>('/admin/sources/import', {
        method: 'POST',
        body: { entries: preview.entries },
      });
      setNotice(`Zaimportowano ${result.imported} wpisów katalogu.`);
      setPreview(null);
      await reload();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <div className="admin-section-heading">
        <div>
          <h2>Rejestr źródeł</h2>
          <p>Najpierw sprawdź pochodzenie i kompletność. Następnie dodaj metadane do katalogu.</p>
        </div>
        <button
          className="button secondary"
          onClick={() => {
            const entries =
              data?.catalog
                .slice(0, 1)
                .map((entry) =>
                  Object.fromEntries(Object.entries(entry).filter(([key]) => key !== 'sourcePdf')),
                ) ?? [];
            setText(JSON.stringify(entries, null, 2));
            setPreview(null);
          }}
        >
          Wczytaj przykład formatu
        </button>
      </div>
      <Notice>
        Import dotyczy metadanych i odnośników. Nie pobiera ani nie publikuje kopii cudzych arkuszy.
        Status praw pozostaje jawny.
      </Notice>
      <ErrorNotice message={error} />
      {notice && (
        <div className="notice success">
          <Check size={18} />
          {notice}
        </div>
      )}
      <div className="sources-layout">
        <section>
          <label className="field">
            <span>Lista materiałów (JSON)</span>
            <textarea
              className="json-editor"
              rows={23}
              spellCheck={false}
              value={text}
              onChange={(e) => {
                setText(e.target.value);
                setPreview(null);
              }}
            />
          </label>
          <button className="button primary" disabled={busy} onClick={() => void inspect()}>
            {busy ? <Loader2 size={17} className="spin" /> : <ShieldCheck size={17} />}Sprawdź przed
            importem
          </button>
        </section>
        <aside className="source-preview">
          <h3>Podgląd importu</h3>
          {preview ? (
            <>
              <p>
                {preview.entries.length} wpisów · {preview.duplicates.length} duplikatów ·{' '}
                {preview.issues.length} problemów
              </p>
              {preview.issues.length > 0 && (
                <div className="notice error">
                  <ul>
                    {preview.issues.map((issue, index) => (
                      <li key={index}>{issue}</li>
                    ))}
                  </ul>
                </div>
              )}
              {preview.duplicates.length > 0 && (
                <div className="notice warning">
                  <div>
                    <strong>Znalezione duplikaty</strong>
                    <ul>
                      {preview.duplicates.map((item, index) => (
                        <li key={index}>{item}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
              <ul className="source-entry-list">
                {preview.entries.map((entry) => (
                  <li key={entry.id}>
                    <strong>{entry.title}</strong>
                    <span>
                      {entry.sourceName} · {entry.identifier ?? 'bez identyfikatora'}
                    </span>
                    <small>
                      {entry.rightsStatus === 'unknown'
                        ? 'Prawa do ponownej publikacji niewyjaśnione'
                        : 'Sprawdź zgodność opisu praw ze źródłem'}
                    </small>
                  </li>
                ))}
              </ul>
              <button
                className="button primary full"
                disabled={busy || preview.issues.length > 0 || !preview.entries.length}
                onClick={() => void importEntries()}
              >
                <Upload size={17} />
                Potwierdź import metadanych
              </button>
            </>
          ) : (
            <p>Wynik walidacji i lista duplikatów pojawią się po sprawdzeniu danych.</p>
          )}
        </aside>
      </div>
    </>
  );
}

function Overview() {
  const { reload } = useApp();
  const [dashboard, setDashboard] = useState<AdminDashboard | null>(null),
    [settings, setSettings] = useState<SiteSettings | null>(null),
    [error, setError] = useState(''),
    [notice, setNotice] = useState(''),
    [busy, setBusy] = useState(false),
    [balance, setBalance] = useState<unknown>(undefined);
  const load = useCallback(async () => {
    const next = await api<AdminDashboard>('/admin/dashboard');
    setDashboard(next);
    setSettings(next.settings);
  }, []);
  useEffect(() => {
    void load().catch((e) => setError(errorMessage(e)));
  }, [load]);
  const save = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await api('/admin/settings', { method: 'PATCH', body: settings });
      await load();
      await reload();
      setNotice('Ustawienia zostały zapisane. Nowe wywołania korzystają z aktualnych limitów.');
    } catch (error) {
      setError(errorMessage(error));
    } finally {
      setBusy(false);
    }
  };
  const settle = async () => {
    setBusy(true);
    setError('');
    try {
      await api('/admin/ai/settle-uncertain', { method: 'POST', body: {} });
      await load();
      setNotice('Niepewne wywołania rozliczono według maksymalnej zarezerwowanej wartości.');
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };
  const refreshBalance = async () => {
    setBusy(true);
    try {
      setBalance(await api('/admin/ai/balance'));
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };
  const setNumber = (key: keyof SiteSettings, value: string) => {
    if (settings) setSettings({ ...settings, [key]: Number(value) });
  };
  if (!dashboard || !settings)
    return (
      <>
        <ErrorNotice message={error} />
        {!error && <Loading label="Wczytywanie panelu…" />}
      </>
    );
  const provider = payloadObject(balance),
    balanceInfos = Array.isArray(provider.balance_infos) ? provider.balance_infos : [];
  const statLabels: Record<string, string> = {
    'checks.submitted': 'Przesłane rozwiązania',
    'checks.completed': 'Ukończone sprawdzenia',
    'checks.failed': 'Błędy sprawdzania',
    'ai.completed': 'Odpowiedzi AI',
    'ai.requests': 'Zapytania AI',
    'theory.submitted': 'Oddane testy',
    'checks.durationMs': 'Łączny czas sprawdzania (ms)',
  };
  return (
    <>
      <ErrorNotice message={error} />
      {notice && (
        <div className="notice success" role="status">
          <Check size={18} />
          {notice}
        </div>
      )}
      <div className="admin-overview-cards">
        <section>
          <span>
            <DollarSign size={18} />
            Wykorzystany budżet AI
          </span>
          <strong>
            {usd(dashboard.budget.spentUsd)}
            <small> / {usd(dashboard.budget.limitUsd)}</small>
          </strong>
          <div className="progress-track">
            <span
              style={{
                width: `${Math.min(100, ((dashboard.budget.spentUsd + dashboard.budget.reservedUsd) / Math.max(0.01, dashboard.budget.limitUsd)) * 100)}%`,
              }}
            />
          </div>
          <p>
            Zarezerwowano: {usd(dashboard.budget.reservedUsd)}. Limit łączny, bez automatycznego
            odnawiania.
          </p>
        </section>
        <section>
          <span>
            <Activity size={18} />
            Kolejka sprawdzania
          </span>
          <strong>
            {dashboard.jobs.filter((job) => ['queued', 'running'].includes(job.status)).length}
            <small> z {settings.queueLimit}</small>
          </strong>
          <p>
            Jedno rozwiązanie jest sprawdzane naraz. Dane uczniów są przechowywane tylko tymczasowo.
          </p>
          <button
            className="text-button"
            onClick={() => void load().catch((e) => setError(errorMessage(e)))}
          >
            <RefreshCw size={15} />
            Odśwież statystyki
          </button>
        </section>
        <section>
          <span>
            <Sparkles size={18} />
            Stan funkcji AI
          </span>
          <strong className={settings.aiEnabled ? 'text-green' : 'muted'}>
            {settings.aiEnabled ? 'Włączona' : 'Wyłączona'}
          </strong>
          <p>Brak klucza, limit lub nierozliczone wywołanie może zatrzymać nowe odpowiedzi.</p>
          <button className="text-button" disabled={busy} onClick={() => void refreshBalance()}>
            Sprawdź saldo DeepSeek
            <ChevronRight size={15} />
          </button>
          {balance !== undefined && (
            <div className="balance-result">
              {balanceInfos.length ? (
                balanceInfos.map((item, index) => {
                  const info = payloadObject(item);
                  return (
                    <span key={index}>
                      Saldo: {String(info.total_balance ?? '—')} {String(info.currency ?? '')}
                    </span>
                  );
                })
              ) : (
                <span>
                  {String(
                    provider.reason ??
                      (provider.available === false
                        ? 'Saldo jest niedostępne.'
                        : 'Odpowiedź dostawcy została otrzymana.'),
                  )}
                </span>
              )}
            </div>
          )}
        </section>
      </div>
      <form className="admin-settings" onSubmit={(e) => void save(e)}>
        <div className="admin-section-heading">
          <div>
            <h2>Dostępność i limity</h2>
            <p>
              Wyłączenie AI zatrzymuje nowe wywołania. Wysłane wcześniej mogą jeszcze zostać
              rozliczone.
            </p>
          </div>
          <button className="button primary" disabled={busy} type="submit">
            <Save size={17} />
            Zapisz ustawienia
          </button>
        </div>
        <div className="toggle-settings">
          <label>
            <div>
              <strong>Pomoc AI</strong>
              <span>Podpowiedzi i objaśnienia przez DeepSeek.</span>
            </div>
            <input
              type="checkbox"
              checked={settings.aiEnabled}
              onChange={(e) => setSettings({ ...settings, aiEnabled: e.target.checked })}
            />
          </label>
          <label>
            <div>
              <strong>Sprawdzanie na serwerze</strong>
              <span>Przyjmowanie nowych rozwiązań do kolejki.</span>
            </div>
            <input
              type="checkbox"
              checked={settings.checkingEnabled}
              onChange={(e) => setSettings({ ...settings, checkingEnabled: e.target.checked })}
            />
          </label>
        </div>
        <div className="settings-grid">
          <label className="field">
            <span>Łączny budżet strony (USD)</span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={settings.aiBudgetUsd}
              onChange={(e) => setNumber('aiBudgetUsd', e.target.value)}
            />
          </label>
          <label className="field">
            <span>Zapytania AI na sesję dziennie</span>
            <input
              type="number"
              min="1"
              max="100"
              value={settings.aiDailyLimit}
              onChange={(e) => setNumber('aiDailyLimit', e.target.value)}
            />
          </label>
          <label className="field">
            <span>Limit tokenów wejściowych</span>
            <input
              type="number"
              min="1000"
              max="12000"
              value={settings.aiInputTokenLimit}
              onChange={(e) => setNumber('aiInputTokenLimit', e.target.value)}
            />
          </label>
          <label className="field">
            <span>Limit tokenów odpowiedzi</span>
            <input
              type="number"
              min="100"
              max="1500"
              value={settings.aiOutputTokenLimit}
              onChange={(e) => setNumber('aiOutputTokenLimit', e.target.value)}
            />
          </label>
          <label className="field">
            <span>Cena wejścia / 1 mln tokenów (USD)</span>
            <input
              type="number"
              min="0.001"
              step="0.001"
              value={settings.aiInputPricePerMillion}
              onChange={(e) => setNumber('aiInputPricePerMillion', e.target.value)}
            />
          </label>
          <label className="field">
            <span>Cena wyjścia / 1 mln tokenów (USD)</span>
            <input
              type="number"
              min="0.001"
              step="0.001"
              value={settings.aiOutputPricePerMillion}
              onChange={(e) => setNumber('aiOutputPricePerMillion', e.target.value)}
            />
          </label>
          <label className="field">
            <span>Maksymalna długość kolejki</span>
            <input
              type="number"
              min="1"
              max="20"
              value={settings.queueLimit}
              onChange={(e) => setNumber('queueLimit', e.target.value)}
            />
          </label>
        </div>
        <p className="fine-print">
          Podawaj najwyższe aktualne stawki dostawcy, bez rabatów za pamięć podręczną. Zmiana limitu
          nie doładowuje konta DeepSeek.
        </p>
      </form>
      {dashboard.budget.reservedUsd > 0 && (
        <div className="notice warning">
          <div>
            <strong>Środki zarezerwowane na odpowiedzi AI</strong>
            <p>
              Jeśli po przerwanym połączeniu pozostały niepewne wywołania, możesz rozliczyć ich
              maksymalny koszt. To nie wykonuje płatności ani nowego zapytania do AI.
            </p>
            <button
              className="button secondary small"
              disabled={busy}
              onClick={() => void settle()}
            >
              Rozlicz niepewne wywołania
            </button>
          </div>
        </div>
      )}
      <div className="admin-log-grid">
        <section>
          <h2>Statystyka zbiorcza</h2>
          {Object.keys(dashboard.stats).length ? (
            <dl className="stat-list">
              {Object.entries(dashboard.stats).map(([key, value]) => (
                <div key={key}>
                  <dt>{statLabels[key] ?? key.replaceAll('.', ' ')}</dt>
                  <dd>{new Intl.NumberFormat('pl-PL').format(value)}</dd>
                </div>
              ))}
            </dl>
          ) : (
            <p className="muted">Statystyka pojawi się po pierwszych próbach.</p>
          )}
        </section>
        <section>
          <h2>Ostatnie zdarzenia</h2>
          <p className="fine-print">
            Dziennik techniczny nie zawiera kodu ani historii odpowiedzi uczniów.
          </p>
          <div className="event-list">
            {dashboard.events.slice(0, 20).map((event) => (
              <div key={event.id}>
                <span className="event-dot" />
                <div>
                  <strong>{event.type}</strong>
                  <small>{dateLabel(event.createdAt)}</small>
                </div>
              </div>
            ))}
            {!dashboard.events.length && <p className="muted">Brak zdarzeń do wyświetlenia.</p>}
          </div>
        </section>
      </div>
    </>
  );
}

export function Admin() {
  const [authenticated, setAuthenticated] = useState(false),
    [checking, setChecking] = useState(true),
    [username, setUsername] = useState(''),
    [password, setPassword] = useState(''),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false),
    [tab, setTab] = useState('overview');
  useEffect(() => {
    void api<{ authenticated: boolean; username?: string }>('/admin/me')
      .then((result) => {
        setAuthenticated(result.authenticated);
        if (result.username) setUsername(result.username);
      })
      .catch((e) => setError(errorMessage(e)))
      .finally(() => setChecking(false));
  }, []);
  const login = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await api('/admin/login', { method: 'POST', body: { username, password } });
      setPassword('');
      setAuthenticated(true);
    } catch (error) {
      setError(errorMessage(error));
    } finally {
      setBusy(false);
    }
  };
  const logout = async () => {
    try {
      await api('/admin/logout', { method: 'POST', body: {} });
      setAuthenticated(false);
    } catch (e) {
      setError(errorMessage(e));
    }
  };
  if (checking) return <Loading label="Sprawdzanie dostępu…" />;
  if (!authenticated)
    return (
      <div className="admin-login">
        <span className="login-icon">
          <LockKeyhole size={29} />
        </span>
        <h1>Panel administratora</h1>
        <p>Zarządzaj materiałami, dostępnością sprawdzania i budżetem AI.</p>
        <form onSubmit={(e) => void login(e)}>
          <ErrorNotice message={error} />
          <label className="field">
            <span>Nazwa administratora</span>
            <input
              autoComplete="username"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </label>
          <label className="field">
            <span>Hasło</span>
            <input
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
          <button type="submit" className="button primary full" disabled={busy}>
            {busy ? <Loader2 size={17} className="spin" /> : <LockKeyhole size={17} />}Zaloguj się
          </button>
        </form>
        <p className="fine-print">
          To wejście dla właściciela witryny. Uczniowie korzystają z pracowni bez konta.
        </p>
      </div>
    );
  return (
    <>
      <PageHeading
        kicker="Administracja"
        title="Twoja pracownia pod kontrolą"
        action={
          <button className="button secondary small" onClick={() => void logout()}>
            <LogOut size={16} />
            Wyloguj
          </button>
        }
      >
        Treści, limity i statystyka. Rozwiązania pozostają u uczniów.
      </PageHeading>
      <ErrorNotice message={error} />
      <div className="admin-tabs" role="tablist" aria-label="Sekcja administracji">
        {[
          { id: 'overview', label: 'Przegląd i ustawienia', icon: Settings2 },
          { id: 'content', label: 'Materiały', icon: FilePlus2 },
          { id: 'faq', label: 'Pytania i odpowiedzi', icon: FilePlus2 },
          { id: 'sources', label: 'Źródła i import', icon: Globe },
        ].map(({ id, label, icon: Icon }) => (
          <button role="tab" aria-selected={tab === id} key={id} onClick={() => setTab(id)}>
            <Icon size={17} />
            {label}
          </button>
        ))}
      </div>
      {tab === 'overview' ? (
        <Overview />
      ) : tab === 'content' ? (
        <ContentManager />
      ) : tab === 'faq' ? (
        <FaqManager />
      ) : (
        <SourcesManager />
      )}
    </>
  );
}
