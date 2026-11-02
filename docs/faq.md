# Examination questions and answers

The learner page is `/faq`. It starts with 35 reviewed Polish answers in seven groups: examination basics, registration and dates, written examination, practical examination, results and retakes, accommodations, and the service itself. Search covers both questions and answers, tolerates missing Polish diacritics, and combines with the category filter. Each answer has a stable `#id` link, source sections, a review date, and a school year when relevant. The accordion uses native `details` and `summary` elements.

## Content and provenance

`packages/shared/src/faq.ts` defines `FaqRevision`, the seven stable category IDs, source records, and the response contract. `packages/content/src/faq.ts` contains the reviewed initial publications. The browser imports only shared contracts, never private seed content.

Answers distinguish official examination rules (`rules`), learning advice (`advice`), and service behavior (`service`). Plain-text paragraphs are rendered as text, not HTML or executable content. Sources retain their title, HTTPS address, and relevant section or page. An administrator-entered address is a link only; it does not authorize downloading or importing a document.

The initial review date is 2026-11-02. Session dates refer explicitly to school year 2026/2027. Before updating dates or procedures, inspect the current CKE document and the appropriate OKE procedure. Do not infer a document year from an index title, describe the example question pool as a complete official bank, generalize the software configuration of this service to an examination center, or describe platform advice as an official CKE quotation. Applicable absence, retake, fee, and accommodation rules depend on the candidate's situation.

## Publication and administration

`GET /api/v1/faq` returns `{ entries: FaqRevision[] }`, taking only the highest **published** version for each stable ID and sorting by category, editorial order, and ID. A later draft does not hide the last publication. FAQ records use the existing `ContentRevision` table with `kind: faq`; no database migration is required.

The administrator's **Pytania i odpowiedzi** tab offers ordinary fields for the question, answer, category, type, order, review date, school year, and sources. The live preview shows the same answer component as the public page. Saving creates a new draft through `POST /api/v1/admin/content/drafts`; publication uses `POST /api/v1/admin/content/:id/publish`. Both operations retain the existing administrator authentication and CSRF checks. Unsaved form changes disable publication. Published payloads remain immutable.

The server validates category and type values, field limits, real calendar dates, consecutive school years, and one to twelve attributed HTTPS sources. Source URLs containing credentials are rejected. Seeding creates missing initial revisions without modifying existing publications or drafts. Later source corrections require new revisions.

## Verification

- `tests/faq.test.ts`: initial count, category coverage, provenance, date/source validation, and Polish search behavior.
- `tests/faq.integration.test.ts`: real Nest API and a disposable PostgreSQL database, including draft visibility, latest publication, preserved old versions, authentication, CSRF, and invalid source data. Included in `npm run test:api` and therefore `npm run test:integration`.
- `tests/e2e/faq.spec.ts`: the real seeded public endpoint, search, filters, retry and empty states, keyboard/deep-link restoration, narrow-screen layout, and the administrator form. The administrator form test mocks publication responses; server authentication and persistence are exercised separately by the integration suite.

Run `npm run db:seed` before browser tests against a previously initialized database. Normal deployment seeding also creates the FAQ records. Exporting or clearing learner progress does not alter the published FAQ.
