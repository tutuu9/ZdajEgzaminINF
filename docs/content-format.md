# Content format and authoring

The source contracts are in `packages/shared/src/index.ts`. Seed content lives in `packages/content/src`. New public tasks and questions use verified published CKE INF.03 sources only. Published content is versioned in PostgreSQL; edits in the administrator panel create new draft revisions.

## Topics and lessons

The first six topic IDs are `tools`, `html-css`, `javascript`, `sql`, `php`, and `graphics-security`. A lesson has a stable `id`, numeric `version`, topic, title, summary, estimated minutes, learning level, Markdown body, objectives and linked exercise IDs.

Write Polish explanations that lead from a requirement to an observable result. A lesson should explain why a step is useful, include a small example, identify a likely mistake and lead to an exercise. Markdown is text content, not executable MDX or a way to inject arbitrary HTML.

The former authored short exercises are retained as internal legacy material. The public bootstrap returns no such exercises and removes their lesson links; the solution-reveal route is unavailable. Lessons remain explanatory material, distinct from official assignments.

### Exam-specific study guides

`ExamStudyGuide` is separate supplemental teaching content, matched to an exact official `taskId` and `taskVersion`. Its own `version` identifies a reviewed explanation. The current three guides live in `exam-study.ts` and `study-wedkowanie.ts`; they are maintained in source control, not through arbitrary administrator-supplied executable code.

Each step points to a requirement/page and contains an original explanation, a scratchpad starter, a short example, reasoning, common mistakes and a self-check. Revision 2 adds ordered `StudyActivity` entries from `study-activities.ts`: a single concept, a small writing instruction, starter/example code, an explanation and a manual self-check prompt. The learner reads before opening the editor, compares after trying, and explicitly confirms the checkpoint before proceeding. This confirmation is not automatic validation of code or an exam score. Completed activities remain available for review.

Revision 1 remains in `legacyExamStudyGuides`; its source snippets and notebook identifiers are preserved. New sequence progress uses separate versioned local data. These snippets are not presented as a complete or official CKE solution. Published external projects are linked with their provenance; their source code is not republished under the repository's MIT license. Input archives, criteria and completed solution archives are distinct resources. See [solution sources](solution-sources.md).

`POST /api/v1/attempts/:id/study` accepts the attempt secret and requires CSRF protection. It rejects an unfinished Egzamin attempt and mismatched task versions. Nauka/Trening and completed exams can retrieve the guide. Each request while an attempt is open counts as use of assistance; completed attempts retain their historical count. Guide code and solution URLs are absent from bootstrap and public task DTOs. The frontend caches a guide within the current page session; reloading can record another opening.

Study progress is stored as one validated JSON string in the local exercise store per attempt and guide version. It includes the current activity, explanation/writing/comparison phase, completed checkpoints and separate drafts. It travels with existing progress exports. Earlier attempt/step notebook records remain separately readable. Neither kind replaces the project files submitted by the learner. Neither external archives nor scratchpad PHP/SQL are automatically executed by the guide.

## Theory questions

`QuestionRevision` contains:

- Stable ID and revision, topic, level and a self-contained prompt.
- Four options with stable option IDs, distinct texts and individual explanations.
- Exactly one `correctOptionId`, a general explanation and a primary reference URL.

Answers use stable option IDs, not positions in an array. Check that there is only one defensible answer under the stated conditions. Qualify language and database behaviour where a missing condition would change the answer. Avoid distractors that are merely paraphrases of one another.

The public set contains 25 static INF.03 examples from the CKE informator. `QuestionSource` records the reviewed PDF catalogue ID, official URL, one-based page and example number, plus top/bottom crop fractions. The viewer displays the original question, diagrams and A–D options; the stored key matches the published key. Explanations are separately authored teaching notes. Example 12 requires video and is excluded pending multimedia support. Former authored questions remain internal regression fixtures and cannot enter a new public attempt.

The informator contains answers in the same document. Cropping improves practice presentation but does not secure the source key. Full theory Egzamin mode stays unavailable; Nauka and Trening use the verified examples without filling missing questions with invented material.

## Practical tasks

`TaskVersion` contains requirements, starter files, runtime profile, three levels of guidance, hints, criteria and a follow-up reference. Official tasks use `origin: "exam"`, `qualification: "INF.03"`, a reviewed `sourceCatalogId` and an explicit `supportStatus`. The original PDF is authoritative; navigation notes must not replace or silently rewrite its requirements. Current original papers have `catalog-only` checking support: local editor/import/export and manual completion, with no automatic grade. No substitute starter database or assets are invented for a missing original package.

Legacy authored task IDs `biblioteka`, `warsztaty` and `planszowki` are retained only for existing attempts and checker regression fixtures; new public attempts reject them.

Files use `{ path, content, encoding? }`. Paths are relative POSIX-style paths; text defaults to UTF-8. Binary content uses base64. Starter SQL is trusted input supplied by the task, not an untrusted instruction to the platform. Do not include the completed solution in starter files.

Each criterion has an ID, title, description, method, source, points and a private declarative check. Supported check types are `file`, `dom`, `style`, `javascript`, `php`, `sql`, `image`, and `manual`. Only fixed operations admitted by the checker whitelist are supported; an administrator cannot add an arbitrary shell command or JavaScript evaluator through content JSON.

DOM/PHP checks declare selectors and text/count expectations. Style checks compare the rendered computed style. SQL checks declare a query file, zero-based query index and expected results; order is significant only when declared. JavaScript actions are fixed project-specific behaviours. Image checks inspect metadata; they do not claim to understand visual composition.

New automatic checking behaviour belongs in reviewed code with alternative correct and focused incorrect fixtures. The current fixtures use MySQLi and PDO, joins and equivalent subqueries, and more than one JavaScript organisation. See `fixtures/content` and [checking](checking.md).

## Source catalogue

`CatalogEntry` records qualification, formula, year/session/identifier/variant, topics, technologies, provenance URL, attachments, criteria availability, rights status, import status, checking support and last verification time. Unknown values remain `null` or explicitly unknown; do not infer a session from a page heading.

The importer previews metadata, reports duplicate IDs/source URLs/exam identifiers/known hashes and then imports metadata. It does not download or republish original archives. Preserve the distinction between a source containing a link, a verified file, a complete task package and a task with a tested grading adapter.

## Publication checklist

Verify Polish wording, correctness, primary references, stable IDs, compatibility with the runtime, explanation of limitations and data ownership. Run content tests. For changed task behaviour run the appropriate checker fixtures. Publish a new version rather than rewriting one already used by an attempt.
