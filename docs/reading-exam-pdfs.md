# Original examination PDFs and reading guidance

New practical assignments use original CKE papers. The application displays their source bytes, rather than generating an examination-looking replacement. Wędkowanie is retrieved from CKE itself. The two 2025 papers are copies of original sheets retrieved through KURSINF's archive; the interface distinguishes that provenance. Their availability does not establish redistribution permission or complete attachment verification. See [the source register](sources.md).

## Practical sheets

`packages/content/src/official-tasks.ts` supplies navigation metadata for the three papers. Its requirements point to document sections; the PDF remains the complete assignment. These records use `origin: exam`, a source catalogue ID and `supportStatus: catalog-only`. They have no invented starter files, generated substitute images or automatic criteria. A local completion record is not an examination score.

The reviewed-source endpoint is `/api/v1/catalog/:id/sheet.pdf`. It accepts only identifiers from a code-reviewed allowlist, not arbitrary admin-entered URLs. Fetching has size, time and concurrency bounds; redirects are rejected. The server returns the original PDF bytes without a permanent stored copy. The source link remains available if the upstream download fails. An archive copy is never labelled as hosted by CKE.

The viewer permits page navigation and zoom. Platform guidance is outside the PDF and must not be confused with official task requirements. The practical Egzamin workspace hides guidance until the attempt is completed. Reading the catalogue is study outside that attempt; the application does not claim to prevent access to external assistance.

## Reading guide

The original-paper navigation copy lives in `apps/web/src/catalog-pdf-guide-content.ts`. Page numbers are one-based PDF pages; a booklet's printed task-page count can differ because blank pages and final forms are included in the file. The notes have been checked against the three reviewed documents.

Use six scans when explaining how to read a paper:

1. Count the deliverables; copy exact filenames, extensions and destinations.
2. Locate source archives, datasets, images and import instructions.
3. Separate saved SQL queries from the output produced by PHP or JavaScript.
4. Mark exact text, identifiers, CSS values, units and validation ranges.
5. Identify a prescribed implementation method only when the paper requires one.
6. Check the requested evidence and handover instructions, including screenshots only where explicitly required.

The learner's level controls how much support is initially expanded. It does not change the official task. Guidance should help identify a requirement, not supply its solution or add a new one. Do not generalise one paper's screenshot formats, folder names, PESEL instructions or delivery media into requirements for every paper.

Polish examples of platform commentary:

> Ile plików oddajesz i jak dokładnie się nazywają? Wypisz nazwy, rozszerzenia i miejsca zapisu wskazane w tym arkuszu.

> Oddziel wyniki zapytań SQL od treści wyświetlanej przez stronę. Sprawdź, które potwierdzenia wykonania są wymagane w poleceniu.

Wędkowanie's navigation separates data and SQL on page 2, layout and graphics on page 3, CSS/PHP on page 4 and deliverables on page 5. Kursy komputerowe separates database work on page 2, shared layout on page 3, page-specific content/CSS on page 4, JavaScript on page 5 and delivery on page 6. Baza Smoków separates database work on page 2, layout on page 3, CSS/PHP on page 4, JavaScript on page 5, reference tables on page 6 and delivery on page 7.

## Theory excerpts

`packages/content/src/official-questions.ts` references the CKE informator for technik programista, updated 25 August 2022. The INF.03 written examples are on PDF pages 6–17. The pool contains examples 1–11 and 13–26: 25 questions. Example 12 requires embedded video and is excluded.

Each question stores its original number, page and reviewed vertical crop fractions. The interface renders the original question and answer choices from the PDF; A–D selection controls are separate. Platform explanations are explicitly separate commentary and become available in feedback. The source hash is pinned so changed PDF bytes cannot silently invalidate page coordinates or answer mapping.

Cropping is a presentation aid, not answer-key protection. The complete informator includes printed answers and is downloaded to display the excerpt. The source remains accessible. Therefore this pool supports Nauka and Trening only; it cannot support a hidden-key theory Egzamin. It is not expanded to 40 by inventing, duplicating or mixing in authored questions.

Example 10 has a known typographic ambiguity: the printed space between the element name and attribute selector has descendant-selector semantics, whereas the key's intended answer selects the element itself. Preserve the original PDF and CKE key. Feedback explains the distinction instead of silently changing source content. See [the source register](sources.md).

## Compatibility and review

Earlier authored project definitions, generated task-PDF support, explanatory guides and grading fixtures are retained for existing attempts and internal checker testing. They are not offered as new official assignments. `apps/web/src/pdf-guide-content.ts` is the legacy authored-task guide; it must not be presented as the guide for a different original CKE paper.

Before adding a source, inspect original page layout, identifiers, diagrams and answer choices. For theory, compare every stored answer to the printed key and check whether the example needs external media. Inspect each crop to ensure it contains the full question and every option, with no answer line. Record uncertainties and source errors explicitly. After publication, create a new immutable question revision when changing commentary or source coordinates.
