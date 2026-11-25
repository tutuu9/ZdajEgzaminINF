# Examination questions and answers

The learner page is `/faq`. It starts with 51 reviewed Polish answers in eight groups, including 16 XAMPP and MariaDB answers. Search covers questions and answers, tolerates missing Polish diacritics, and combines with the category filter. Each answer has a stable `#id` link, source sections, a review date, and a school year when relevant. The accordion uses native `details` and `summary` elements.

## Content and provenance

`packages/shared/src/faq.ts` defines `FaqRevision`, the stable category IDs, source records, and the response contract. `packages/content/src/faq.ts` collects the reviewed initial publications. The browser imports only shared contracts, never private seed content.

Answers distinguish official examination rules (`rules`), learning advice (`advice`), and service behavior (`service`). Plain-text paragraphs are rendered as text, not HTML or executable content. Sources retain their title, HTTPS address, and relevant section or page. An administrator-entered address is a link only; it does not authorize downloading or importing a document.

The initial review date is 2026-11-02. The XAMPP guidance was reviewed on 2026-11-24. Session dates refer explicitly to school year 2026/2027. Before updating dates or procedures, inspect the current CKE document and the appropriate OKE procedure. Do not infer a document year from an index title, describe the example question pool as a complete official bank, generalize the software configuration of this service to an examination center, or describe platform advice as an official CKE quotation. Applicable absence, retake, fee, and accommodation rules depend on the candidate's situation.

## XAMPP rehearsal

The category link is `/faq?category=xampp`. The **Baza i PHP** workbench opens `#xampp-start` in learning and training, and after an exam attempt is submitted. The PHP handbook and exam-day guide also link to the startup and import instructions.

The localhost result, phpMyAdmin import, and Apache bind error were captured in a headless browser using an isolated [Apache Friends XAMPP Portable 8.2.12 distribution](https://sourceforge.net/projects/xampp/files/XAMPP%20Windows/8.2.12/), with loopback ports and sample data. The guide links to [Jayprakash12345’s XAMPP Control Panel screenshot](https://commons.wikimedia.org/wiki/File:Xampp_Control_Panel.jpg), licensed CC BY-SA 4.0.

The examples and screenshots are app-owned assets tied to the FAQ entry ID and version. When publishing a revision with changed instructions, review its assets and update the matching version in the web component. `miasta.sql` creates one table in the database selected for import and inserts two sample cities. Learners copy the PHP examples and run them in their own XAMPP.

## Publication and administration

`GET /api/v1/faq` returns `{ entries: FaqRevision[] }`, taking only the highest **published** version for each stable ID and sorting by category, editorial order, and ID. A later draft does not hide the last publication. FAQ records use the existing `ContentRevision` table with `kind: faq`; no database migration is required.

The administrator's **Pytania i odpowiedzi** tab offers ordinary fields for the question, answer, category, type, order, review date, school year, and sources. The live preview shows the same answer component as the public page. Saving creates a new draft through `POST /api/v1/admin/content/drafts`; publication uses `POST /api/v1/admin/content/:id/publish`. Both operations retain the existing administrator authentication and CSRF checks. Unsaved form changes disable publication. Published payloads remain immutable.

The server validates category and type values, field limits, real calendar dates, consecutive school years, and one to twelve attributed HTTPS sources. Source URLs containing credentials are rejected. Seeding creates missing initial revisions without modifying existing publications or drafts. Later source corrections require new revisions.

## Verification

- `tests/faq.test.ts`: initial count, category coverage, provenance, date/source validation, and Polish search behavior.
- `tests/faq.integration.test.ts`: real Nest API and a disposable PostgreSQL database, including draft visibility, latest publication, preserved old versions, authentication, CSRF, and invalid source data. Included in `npm run test:api` and therefore `npm run test:integration`.
- `tests/e2e/faq.spec.ts`: the real seeded public endpoint, search, filters, retry and empty states, keyboard/deep-link restoration, mobile XAMPP images, PHP copy and SQL download, and the administrator form. The administrator form test mocks publication responses; server authentication and persistence are exercised separately by the integration suite.

To check the rehearsal on Windows, start Apache and MariaDB in XAMPP and open `sprawdz.php` under `localhost`. Import the sample into an empty `inf03_xampp_demo` database through phpMyAdmin, then open `miasta.php` with your local connection settings. Expect `PHP działa` and the two city names `Łódź` and `Gdańsk`. Try the documented wrong URL and unknown database, then correct them and repeat the successful requests.

Run `npm run db:seed` before browser tests against a previously initialized database. Normal deployment seeding also creates the FAQ records. Exporting or clearing learner progress does not alter the published FAQ.
