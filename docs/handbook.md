# Handbook (Podręcznik)

`/nauka/podrecznik` is a short handbook of HTML, CSS, JavaScript, SQL and PHP, opened from a card on the learning page. The books live in `apps/web/src/handbook/`; the reader is `apps/web/src/pages/Handbook.tsx`.

## Content boundary

The handbook is explanatory teaching material, kept separate from the CKE papers as `AGENTS.md` requires:

- It authors no practical tasks, theory questions, quizzes or answer keys. Practice always happens on the original papers.
- Each chapter ends with "Gdzie to jest w arkuszach CKE": the catalogued papers that require the topic, under their catalogue titles, with a one-line note of what the paper asks. A unit test checks every link against the catalogue.
- SQL result tables are copied from queries run on the papers' own database exports (the same exports reviewed for the courses), and each table names its source paper. The order of grouped rows can differ in MySQL, which the source note says where it matters.
- Statements about marking criteria (e.g. `innerHTML +=` counted as an error, `IS NOT NULL` wrong for empty-text data, JOIN or LEFT JOIN both accepted) repeat what the reviewed criteria documents say for the named paper.

## Live examples

HTML, CSS and JavaScript examples render in a sandboxed `iframe` (`sandbox="allow-scripts"`, no same-origin) from a generated document whose Content Security Policy is `default-src 'none'` with inline styles and scripts only. External stylesheets and script sources are stripped, so an example can show only what its own code produces. An end-to-end test runs every example in Chromium and checks that none throws.

PHP examples are displayed as code for the learner's local XAMPP environment. The chapters cover localhost setup, POST, MariaDB connections, parameterized queries, rendering result rows and troubleshooting. Each chapter links to a published CKE paper that uses the technique.

## Progress

"Przeczytane" is stored per chapter in this browser (`localStorage` key `zdaj:handbook:read`); the handbook works without storage.

## Links from course steps

The "Pomoc" tab of a course step shows "Więcej w podręczniku: …" when the target file and example match a chapter. For `.php` files, the matcher checks PHP patterns first and matches pure markup against the HTML chapters. Examples include `$_POST` for forms, `mysqli_connect` for connections and `mysqli_fetch_assoc` for reading rows. The browser derives links from the pinned guide and opens them in a new tab. A unit test checks known matches and verifies that each chapter is linked from at least one course.
