import { useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import Markdown from 'react-markdown';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  BookMarked,
  Check,
  ChevronRight,
  FileText,
} from 'lucide-react';
import { PageHeading, plural, usePageTitle } from '../components/common';
import {
  chapterKey,
  findChapter,
  handbookBooks,
  markChapter,
  previewDocument,
  readChapters,
  type HandbookChapter,
} from '../handbook';
import type { HandbookSection } from '../handbook/types';
import '../handbook.css';

const LANGUAGE = { html: 'HTML', css: 'CSS', js: 'JavaScript' } as const;

function Example({
  example,
  title,
}: {
  example: NonNullable<HandbookSection['example']>;
  title: string;
}) {
  if (example.kind === 'sql')
    return (
      <figure className="handbook-example">
        <figcaption>SQL</figcaption>
        <pre>
          <code>{example.code}</code>
        </pre>
        {example.result && (
          <div className="handbook-result">
            <table>
              <caption>Wynik — {example.result.source}</caption>
              <thead>
                <tr>
                  {example.result.columns.map((column) => (
                    <th key={column}>{column}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {example.result.rows.map((row, index) => (
                  <tr key={index}>
                    {row.map((cell, cellIndex) => (
                      <td key={cellIndex}>{cell}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </figure>
    );
  const code =
    example.show === 'html' ? example.html : example.show === 'css' ? example.css! : example.js!;
  return (
    <figure className="handbook-example">
      <figcaption>{LANGUAGE[example.show]}</figcaption>
      <pre>
        <code>{code}</code>
      </pre>
      <iframe
        title={`Podgląd: ${title}`}
        className="handbook-preview"
        sandbox="allow-scripts"
        srcDoc={previewDocument(example)}
      />
    </figure>
  );
}

function BookList({ read }: { read: Set<string> }) {
  return (
    <div className="handbook-books">
      {handbookBooks.map((book) => {
        const done = book.chapters.filter((chapter) => read.has(chapterKey(book.id, chapter.id)));
        return (
          <section key={book.id} className="handbook-book surface-panel">
            <h2>{book.title}</h2>
            <p>{book.description}</p>
            <ol>
              {book.chapters.map((chapter) => (
                <li key={chapter.id}>
                  <Link to={`/nauka/podrecznik/${book.id}/${chapter.id}`}>
                    {read.has(chapterKey(book.id, chapter.id)) && (
                      <Check size={15} aria-label="Przeczytane" />
                    )}
                    {chapter.title}
                  </Link>
                </li>
              ))}
            </ol>
            <small>
              Przeczytane: {done.length} z {book.chapters.length}
            </small>
          </section>
        );
      })}
    </div>
  );
}

function Chapter({
  chapter,
  read,
  onRead,
}: {
  chapter: HandbookChapter;
  read: boolean;
  onRead: (read: boolean) => void;
}) {
  return (
    <article className="handbook-chapter" aria-labelledby="handbook-chapter-title">
      <h1 id="handbook-chapter-title">{chapter.title}</h1>
      <p className="handbook-summary">{chapter.summary}</p>
      {chapter.sections.map((section) => (
        <section key={section.heading}>
          <h2>{section.heading}</h2>
          <div className="prose">
            <Markdown>{section.body}</Markdown>
          </div>
          {section.example && <Example example={section.example} title={section.heading} />}
        </section>
      ))}
      <section className="handbook-mistakes">
        <h2>
          <AlertTriangle size={18} /> Częste błędy
        </h2>
        <ul>
          {chapter.mistakes.map((mistake) => (
            <li key={mistake}>
              <Markdown>{mistake}</Markdown>
            </li>
          ))}
        </ul>
      </section>
      <section className="handbook-papers">
        <h2>
          <FileText size={18} /> Gdzie to jest w arkuszach CKE
        </h2>
        <ul>
          {chapter.papers.map((paper) => (
            <li key={paper.taskId}>
              <Link to={`/praktyka/${paper.taskId}`}>
                {paper.title}
                <ChevronRight size={15} aria-hidden="true" />
              </Link>
              <span>{paper.note}</span>
            </li>
          ))}
        </ul>
        <p className="handbook-note">
          Ćwicz na oryginalnym arkuszu — w zakładce Nauka znajdziesz kurs krok po kroku.
        </p>
      </section>
      <label className="handbook-read">
        <input type="checkbox" checked={read} onChange={(event) => onRead(event.target.checked)} />
        Przeczytane
      </label>
    </article>
  );
}

/**
 * A small handbook of HTML, CSS, JavaScript and SQL: explanations and live examples, each
 * chapter linked to the CKE papers that require it. No tasks or questions are authored here.
 */
export function Handbook() {
  const { book: bookId, chapter: chapterId } = useParams();
  const [read, setRead] = useState(() => new Set(readChapters()));
  const found = bookId ? findChapter(bookId, chapterId) : undefined;
  usePageTitle(found ? `${found.chapter.title} — ${found.book.title}` : 'Podręcznik');

  if (bookId && !found) return <Navigate replace to="/nauka/podrecznik" />;
  if (!found)
    return (
      <div className="handbook-page">
        <PageHeading kicker="Podręcznik" title="HTML, CSS, JavaScript i SQL">
          Krótkie rozdziały z przykładami, które działają od razu. Czytaj w dowolnej kolejności —
          każdy rozdział wskazuje arkusze CKE, w których jest potrzebny.
        </PageHeading>
        <BookList read={read} />
      </div>
    );

  const { book, chapter, previous, next } = found;
  const key = chapterKey(book.id, chapter.id);
  const done = book.chapters.filter((item) => read.has(chapterKey(book.id, item.id))).length;
  return (
    <div className="handbook-page handbook-reader">
      <nav className="handbook-toc surface-panel" aria-label={`Rozdziały: ${book.title}`}>
        <Link className="handbook-back" to="/nauka/podrecznik">
          <BookMarked size={16} /> Podręcznik
        </Link>
        <h2>{book.title}</h2>
        <small>
          {plural(
            done,
            'rozdział przeczytany',
            'rozdziały przeczytane',
            'rozdziałów przeczytanych',
          )}
        </small>
        <ol>
          {book.chapters.map((item) => (
            <li key={item.id}>
              <Link
                to={`/nauka/podrecznik/${book.id}/${item.id}`}
                aria-current={item.id === chapter.id ? 'page' : undefined}
              >
                {read.has(chapterKey(book.id, item.id)) && (
                  <Check size={14} aria-label="Przeczytane" />
                )}
                {item.title}
              </Link>
            </li>
          ))}
        </ol>
      </nav>
      <div>
        <Chapter
          key={key}
          chapter={chapter}
          read={read.has(key)}
          onRead={(value) => setRead(new Set(markChapter(key, value)))}
        />
        <div className="handbook-pager">
          {previous ? (
            <Link className="button secondary" to={`/nauka/podrecznik/${book.id}/${previous.id}`}>
              <ArrowLeft size={16} /> {previous.title}
            </Link>
          ) : (
            <span />
          )}
          {next && (
            <Link className="button primary" to={`/nauka/podrecznik/${book.id}/${next.id}`}>
              {next.title} <ArrowRight size={16} />
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
