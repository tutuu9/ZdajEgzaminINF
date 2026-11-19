# Handbook (Podręcznik)

`/nauka/podrecznik` is a short handbook of HTML, CSS, JavaScript and SQL, opened from a card on the learning page. Four books of five chapters each live in `apps/web/src/handbook/`; the reader is `apps/web/src/pages/Handbook.tsx`.

## Content boundary

The handbook is explanatory teaching material, kept separate from the CKE papers as `AGENTS.md` requires:

- It authors no practical tasks, theory questions, quizzes or answer keys. Practice always happens on the original papers.
- Each chapter ends with "Gdzie to jest w arkuszach CKE": the catalogued papers that require the topic, under their catalogue titles, with a one-line note of what the paper asks. A unit test checks every link against the catalogue.
- SQL result tables are copied from queries run on the papers' own database exports (the same exports reviewed for the courses), and each table names its source paper. The order of grouped rows can differ in MySQL, which the source note says where it matters.
- Statements about marking criteria (e.g. `innerHTML +=` counted as an error, `IS NOT NULL` wrong for empty-text data, JOIN or LEFT JOIN both accepted) repeat what the reviewed criteria documents say for the named paper.

## Live examples

HTML, CSS and JavaScript examples render in a sandboxed `iframe` (`sandbox="allow-scripts"`, no same-origin) from a generated document whose Content Security Policy is `default-src 'none'` with inline styles and scripts only. External stylesheets and script sources are stripped, so an example can show only what its own code produces. An end-to-end test runs every example in Chromium and checks that none throws.

## Progress

"Przeczytane" is stored per chapter in this browser (`localStorage` key `zdaj:handbook:read`); the handbook works without storage.

## Links from course steps

The "Pomoc" tab of a course step shows "Więcej w podręczniku: …" when the step's topic has a chapter. `apps/web/src/handbook/match.ts` chooses the book from the step's target file (`.html`/`.php` → HTML, `.css` → CSS, `.js` → JavaScript, `kwerendy.txt` → SQL) and the chapter from ordered patterns in the step's example code (for example `JOIN` → relations, `createElement` → new elements, `rowspan` → tables). PHP code, graphics, screenshots and hand-in steps get no link, because the handbook has no chapter for them. Pinned guides are not changed; the link is derived in the browser. A unit test checks known matches on real course steps and that every chapter is reached from at least one course; the link opens in a new tab, so the course stays in place.
