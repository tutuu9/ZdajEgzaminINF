# Content format and authoring

The source contracts are in `packages/shared/src/index.ts`. Seed content lives in `packages/content/src`. New public tasks and questions use verified published CKE INF.03 sources only. Published content is versioned in PostgreSQL; edits in the administrator panel create new draft revisions.

## Topics and lessons

The first six topic IDs are `tools`, `html-css`, `javascript`, `sql`, `php`, and `graphics-security`. A lesson has a stable `id`, numeric `version`, topic, title, summary, estimated minutes, learning level, Markdown body, objectives and linked exercise IDs.

Write Polish explanations that lead from a requirement to an observable result. A lesson should explain why a step is useful, include a small example, identify a likely mistake and lead to an exercise. Markdown is text content, not executable MDX or a way to inject arbitrary HTML.

The former authored short exercises are retained as internal legacy material. The public bootstrap returns no such exercises and removes their lesson links; the solution-reveal route is unavailable. Lessons remain explanatory material, distinct from official assignments.

### Exam-specific study guides

`ExamStudyGuide` is separately authored teaching content, matched to an exact official `taskId`, `taskVersion` and guide `version`. Revision 3 is the current cumulative learning route. `exam-study.ts` assembles it from `study-project-kursy.ts`, `study-project-smoki.ts` and `study-project-wedkowanie.ts`, using shared authoring helpers. Guides remain reviewed source data, not administrator-supplied executable checking code.

Each revision 3 guide has `project.starterFiles`, `requiredFiles` and `coverage`. Starter files are one minimal document scaffold plus empty CSS, JavaScript, SQL and browser-note files as appropriate. Initialize them only when beginning that new project; never use them as a per-step reset or overwrite existing work. External original assets are acquired through the separately labelled source links. `coverage` maps a requirement and its one-based PDF page to compound `stepId/activityId` references. It documents the learning route, not an automatic grading percentage. See [the complete source coverage map](cumulative-guide-coverage.md).

An activity explains one concept, gives a small action and names `targetFiles` and `placement`. Its `exampleCode` is an addition or a clearly identified local replacement in the existing project. Revision 3 activities do not provide `starterCode`. The same project files feed the editor, preview, save/restore, export and submission. A learner may keep already correct content; passing a check does not require retyping the sample. Examples, manual instructions and completed activities remain available for review according to the learning mode.

`checks` contains only declarative `StudyCheckSpec` entries:

- `file`: existence and optional non-empty content; not proof that an image or report is authentic.
- `html`: selector, attribute/equality, text and minimum count. These describe the inspected structure rather than an exact source-code string.
- `css`: stylesheet path, preview entry, selector, property and accepted computed values. Use canonical values such as `rgb(...)` and `px`. A computed value does not prove use of a mandated selector; explicitly check that method manually when the original paper requires it.
- `runtime`: only the compiled `kursy-calculator`, `smoki-tabs`, `firma-contact`, `salon-calculator` and `chat-messages` adapters. The server binds each to the exact task, guide revision and compound activity ID; content cannot add commands or an arbitrary evaluator.
- `manual`: an explicit observable prompt for local PHP/SQL, graphics, imports, screenshots, hover/visual comparison or another unsupported point.

Every activity also retains a self-check prompt. Manual confirmation is not automatic success or a CKE score. Runtime reports identify the source hash and project revision so results from older code can be recognized as stale. Missing execution support, infrastructure errors and unsupported checks must remain distinguishable from an incorrect learner result. The Smoki JavaScript adapter inspects the static template and JavaScript only; it never executes uploaded PHP. PHP and SQL in these official routes remain manual in the learner's local environment.

`allExamStudyGuides` preserves revisions 1, 2 and 3 of the original three courses and revision 1 of the five 2024 courses. `legacyExamStudyGuides` retains the original revision-1 notebooks; `examStudyGuides` exposes each latest revision. Old isolated snippets and revision-2 notebooks remain readable as their original version. A new project requests the latest guide without hardcoding version 3, then pins the returned revision. Requesting an unavailable exact revision must fail rather than silently loading a newer route. Publishing a correction creates a new revision. Importing an old notebook must not paste its isolated fragment over the cumulative project.

`POST /api/v1/attempts/:id/study` accepts the attempt secret and an optional exact `guideVersion`, with CSRF protection. It rejects an unfinished Egzamin attempt and mismatched task versions. Nauka/Trening and completed exams can retrieve the matching guide. Opening assistance during an unfinished attempt counts as assistance; completed attempts preserve their historical count. Guide examples, cumulative scaffolds and completed-solution URLs do not belong in bootstrap or public task DTOs.

Input archives, published criteria, third-party walkthroughs and finished solution archives remain distinct resources. Preserve the publisher, reviewed URL, provenance label and limitations. Links do not grant redistribution rights: neither original assets nor external complete solutions are copied into MIT teaching content. Local project progress and reports travel with export/import; temporary server checking jobs are not a permanent learner-code history. See [solution sources](solution-sources.md) and [architecture](architecture.md).

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
