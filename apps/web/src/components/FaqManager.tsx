import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Check, FilePlus2, Plus, Save, Trash2, Upload } from 'lucide-react';
import {
  FAQ_CATEGORIES,
  FAQ_TYPE_LABELS,
  type ContentDraft,
  type FaqRevision,
  type FaqSource,
  type FaqType,
} from '@zdaj/shared';
import { api, errorMessage } from '../api';
import { ErrorNotice, Loading } from './common';
import { FaqAnswer } from './FaqAnswer';
import '../faq.css';

const blankSource = (): FaqSource => ({ title: '', url: '', section: '' });
const blankEntry = (): FaqRevision => ({
  id: '',
  version: 1,
  categoryId: 'about',
  question: '',
  answer: '',
  order: 100,
  sources: [blankSource()],
  reviewedAt: new Date().toISOString().slice(0, 10),
  type: 'rules',
});

export function FaqManager() {
  const [rows, setRows] = useState<ContentDraft[]>([]);
  const [selected, setSelected] = useState<ContentDraft | null>(null);
  const [entry, setEntry] = useState<FaqRevision>(blankEntry);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const load = useCallback(async () => {
    setRows((await api<ContentDraft[]>('/admin/content')).filter((row) => row.kind === 'faq'));
  }, []);
  useEffect(() => {
    void load()
      .catch((error) => setError(errorMessage(error)))
      .finally(() => setLoading(false));
  }, [load]);
  const choose = (row: ContentDraft) => {
    setSelected(row);
    setEntry(structuredClone(row.payload as FaqRevision));
    setError('');
    setNotice('');
  };
  const change = <K extends keyof FaqRevision>(key: K, value: FaqRevision[K]) => {
    setEntry((current) => ({ ...current, [key]: value }));
    setNotice('');
  };
  const changeSource = (index: number, key: keyof FaqSource, value: string) => {
    change(
      'sources',
      entry.sources.map((source, position) =>
        position === index ? { ...source, [key]: value } : source,
      ),
    );
  };
  const dirty = !selected || JSON.stringify(selected.payload) !== JSON.stringify(entry);
  const save = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const saved = await api<ContentDraft>('/admin/content/drafts', {
        method: 'POST',
        body: { kind: 'faq', key: entry.id, payload: entry },
      });
      choose(saved);
      await load();
      setNotice('Zapisano szkic. Sprawdź odpowiedź i źródła w podglądzie przed publikacją.');
    } catch (error) {
      setError(errorMessage(error));
    } finally {
      setBusy(false);
    }
  };
  const publish = async () => {
    if (!selected || selected.status !== 'draft' || dirty) return;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const published = await api<ContentDraft>(`/admin/content/${selected.id}/publish`, {
        method: 'POST',
        body: {},
      });
      choose(published);
      await load();
      setNotice('Opublikowano odpowiedź. Czytelnicy zobaczą tę wersję po odświeżeniu strony FAQ.');
    } catch (error) {
      setError(errorMessage(error));
    } finally {
      setBusy(false);
    }
  };
  const visible = rows.filter((row) =>
    `${row.key} ${(row.payload as FaqRevision).question}`
      .toLocaleLowerCase('pl')
      .includes(search.toLocaleLowerCase('pl')),
  );
  if (loading) return <Loading label="Ładowanie odpowiedzi do edycji…" />;
  return (
    <section className="faq-admin">
      <div className="admin-section-heading">
        <div>
          <h2>Pytania i odpowiedzi</h2>
          <p>Zapisz szkic, sprawdź podgląd i opublikuj nową wersję.</p>
        </div>
        <button
          className="button secondary"
          disabled={busy}
          onClick={() => {
            setSelected(null);
            setEntry(blankEntry());
            setNotice('');
            setError('');
          }}
        >
          <FilePlus2 size={17} aria-hidden="true" />
          Nowe pytanie
        </button>
      </div>
      <ErrorNotice message={error} />
      {notice && (
        <div className="notice success" role="status">
          <Check size={18} aria-hidden="true" />
          {notice}
        </div>
      )}
      <div className="faq-admin-layout">
        <aside className="faq-library" aria-label="Wersje odpowiedzi">
          <label className="field">
            <span>Szukaj odpowiedzi do edycji</span>
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>
          <div className="content-list">
            {visible.map((row) => (
              <button
                key={row.id}
                className={row.id === selected?.id ? 'active' : ''}
                disabled={busy}
                onClick={() => choose(row)}
              >
                <strong>{(row.payload as FaqRevision).question}</strong>
                <span>
                  {row.status === 'published' ? 'Opublikowano' : 'Szkic'} · wersja {row.version}
                </span>
              </button>
            ))}
            {!visible.length && <p>Brak odpowiedzi pasujących do wyszukiwania.</p>}
          </div>
        </aside>
        <div className="faq-edit-and-preview">
          <form className="faq-editor" onSubmit={(event) => void save(event)}>
            <fieldset disabled={busy}>
              <legend>Treść odpowiedzi</legend>
              <div className="faq-form-pair">
                <label className="field">
                  <span>Identyfikator odpowiedzi</span>
                  <input
                    required
                    maxLength={101}
                    pattern="[a-z0-9][a-z0-9._\-]*"
                    readOnly={Boolean(selected)}
                    value={entry.id}
                    onChange={(event) => change('id', event.target.value)}
                    placeholder="np. inf03-czas-praktyki"
                  />
                  <small>
                    Stały adres odpowiedzi. Po zapisie identyfikator pozostaje bez zmian.
                  </small>
                </label>
                <label className="field">
                  <span>Kategoria</span>
                  <select
                    value={entry.categoryId}
                    onChange={(event) =>
                      change('categoryId', event.target.value as FaqRevision['categoryId'])
                    }
                  >
                    {FAQ_CATEGORIES.map((category) => (
                      <option value={category.id} key={category.id}>
                        {category.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <label className="field">
                <span>Pytanie</span>
                <input
                  required
                  maxLength={240}
                  value={entry.question}
                  onChange={(event) => change('question', event.target.value)}
                />
              </label>
              <label className="field">
                <span id="faq-editor-answer-label">Odpowiedź</span>
                <textarea
                  aria-labelledby="faq-editor-answer-label"
                  aria-describedby="faq-editor-answer-hint"
                  required
                  rows={9}
                  maxLength={8000}
                  value={entry.answer}
                  onChange={(event) => change('answer', event.target.value)}
                />
                <small id="faq-editor-answer-hint">
                  Oddzielaj akapity pustym wierszem. Treść jest wyświetlana jako zwykły tekst.
                </small>
              </label>
              <div className="faq-form-pair">
                <label className="field">
                  <span>Rodzaj odpowiedzi</span>
                  <select
                    value={entry.type}
                    onChange={(event) => change('type', event.target.value as FaqType)}
                  >
                    {Object.entries(FAQ_TYPE_LABELS).map(([id, label]) => (
                      <option key={id} value={id}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  <span>Kolejność w kategorii</span>
                  <input
                    required
                    type="number"
                    min={0}
                    max={9999}
                    value={entry.order}
                    onChange={(event) => change('order', Number(event.target.value))}
                  />
                </label>
                <label className="field">
                  <span>Data sprawdzenia źródeł</span>
                  <input
                    required
                    type="date"
                    value={entry.reviewedAt}
                    onChange={(event) => change('reviewedAt', event.target.value)}
                  />
                </label>
                <label className="field">
                  <span>Rok szkolny (opcjonalnie)</span>
                  <input
                    placeholder="2026/2027"
                    pattern="20[0-9]{2}/20[0-9]{2}"
                    value={entry.schoolYear ?? ''}
                    onChange={(event) => {
                      const schoolYear = event.target.value;
                      setEntry((current) => {
                        const { schoolYear: _old, ...rest } = current;
                        return schoolYear ? { ...rest, schoolYear } : rest;
                      });
                      setNotice('');
                    }}
                  />
                  <small>
                    Wymagany w treści dotyczącej konkretnej sesji; nie uogólniaj dat na inne lata.
                  </small>
                </label>
              </div>
            </fieldset>
            <fieldset disabled={busy} className="faq-source-editor">
              <legend>Źródła</legend>
              <p>
                Podaj sprawdzony dokument i miejsce, które uzasadnia odpowiedź. Link nie jest
                pobierany ani publikowany automatycznie.
              </p>
              {entry.sources.map((source, index) => (
                <fieldset className="faq-source-fields" key={index}>
                  <legend>Źródło {index + 1}</legend>
                  <label className="field">
                    <span>Nazwa źródła {index + 1}</span>
                    <input
                      required
                      maxLength={240}
                      value={source.title}
                      onChange={(event) => changeSource(index, 'title', event.target.value)}
                    />
                  </label>
                  <label className="field">
                    <span>Adres źródła {index + 1}</span>
                    <input
                      required
                      type="url"
                      maxLength={2000}
                      pattern="https://.*"
                      placeholder="https://"
                      value={source.url}
                      onChange={(event) => changeSource(index, 'url', event.target.value)}
                    />
                  </label>
                  <label className="field">
                    <span>Rozdział lub strona źródła {index + 1}</span>
                    <input
                      required
                      maxLength={400}
                      value={source.section}
                      onChange={(event) => changeSource(index, 'section', event.target.value)}
                    />
                  </label>
                  <button
                    type="button"
                    className="text-button"
                    disabled={entry.sources.length === 1}
                    onClick={() =>
                      change(
                        'sources',
                        entry.sources.filter((_, position) => position !== index),
                      )
                    }
                  >
                    <Trash2 size={16} aria-hidden="true" />
                    Usuń źródło {index + 1}
                  </button>
                </fieldset>
              ))}
              <button
                type="button"
                className="button secondary small"
                disabled={entry.sources.length >= 12}
                onClick={() => change('sources', [...entry.sources, blankSource()])}
              >
                <Plus size={16} aria-hidden="true" />
                Dodaj źródło
              </button>
            </fieldset>
            <div className="faq-editor-actions">
              <button type="submit" className="button primary" disabled={busy}>
                <Save size={16} aria-hidden="true" />
                Zapisz nowy szkic
              </button>
              <button
                type="button"
                className="button secondary"
                disabled={busy || selected?.status !== 'draft' || dirty}
                onClick={() => void publish()}
              >
                <Upload size={16} aria-hidden="true" />
                Publikuj zapisany szkic
              </button>
            </div>
            <p className="fine-print">
              {selected
                ? `Wybrana wersja: ${selected.version}. ${selected.status === 'published' ? 'Opublikowanej wersji nie zmieniamy; zapis utworzy nowy szkic.' : 'Szkic jest widoczny tylko dla administratora.'}`
                : 'Nowa odpowiedź pojawi się publicznie dopiero po publikacji.'}{' '}
              {dirty && 'Najpierw zapisz bieżące zmiany.'}
            </p>
          </form>
          <aside className="faq-editor-preview" aria-label="Podgląd odpowiedzi">
            <h2>Podgląd odpowiedzi</h2>
            <h3 className="faq-preview-question">{entry.question || 'Tutaj pojawi się pytanie'}</h3>
            {entry.answer ? (
              <FaqAnswer entry={entry} />
            ) : (
              <p>Wpisz odpowiedź, aby zobaczyć jej wygląd przed publikacją.</p>
            )}
          </aside>
        </div>
      </div>
    </section>
  );
}
