# Checking solutions

## What is evaluated

Only tasks with a supported declarative adapter are executable. The final-submission adapters cover three legacy authored regression projects: Biblioteka szkolna, Kalkulator warsztatów and Klub planszówkowy. These are no longer offered as new learner assignments. All current public practical assignments are original CKE INF.03 papers with catalogue-only support for final submission. Their cumulative learning guides can check individual supported steps as described below; that does not certify the completed exam paper.

Checks inspect expected files, rendered DOM and computed CSS, fixed JavaScript behaviour, PHP output, MariaDB query results and selected image metadata. PHP/SQL run in the exam database environment, never in the platform PostgreSQL database. Correctness is based on requirements and behaviour, not byte-for-byte similarity with a model answer.

Prepared fixtures contain multiple valid implementations and specific defects. Additional database probes help distinguish a live query from hardcoded output. Private checking specifications and fixtures are excluded from the public bootstrap. An open-source self-study platform cannot prove that a learner did not inspect its code or use outside assistance.

Structural checks have a limited meaning. In the workshop project, separate criteria confirm table content, three data rows, header cells and a caption. They do not establish that every price belongs to the correct course or that headings and labels make sense. Library and club checks use the trusted task database; they do not prove that the learner imported their own submitted SQL file correctly. These requirements, HTML escaping and other unchecked implementation details are listed in each project's manual review criterion. For the club project, that review also includes the aggregate column alias and body text colour.

## Result semantics

Each criterion is `passed`, `failed`, `manual`, `unchecked`, or `error`. The report includes evidence and a next step, plus confirmed points, checked points and total possible points. An overall percentage is emitted only when every criterion has a conclusive automatic result. The initial projects include manual review criteria, so a partial report deliberately has no overall percentage.

An infrastructure failure is a failure to assess, not a failed learner criterion. Official criteria, additional educational checks and AI explanations are separate concepts. All current project criteria are original educational criteria, not official CKE scoring.

## Cumulative learning checks

Guide revision 3 works on the same local project files used by the editor and final submission. File presence and supported HTML requirements are checked locally. CSS checks use a script-disabled, isolated document to read selected computed properties. These checks confirm only their stated property; they do not establish visual equivalence with the original paper. PHP, SQL, graphics editing, source-archive contents and unsupported requirements retain an explicit manual checklist.

Dynamic JavaScript uses five fixed server adapters. The existing revision-3 adapters remain `kursy-calculator` for `calculator/calculator-check` and `smoki-tabs` for `tabs/tabs-check`. New revision-1 guides bind `runtime/runtime-check` to `firma-contact`, `salon-calculator` or `chat-messages`, each for its exact task and entry filename. They inspect observable behaviour without requiring particular function names or arbitrary element IDs.

Firma checks both consent branches, current values on repeated submissions, Polish uppercase names, a visible line break, red/Navy paragraphs below the rule and reset. Salon exercises all 16 subsets of prices 45/30/20/50 and repeated deselection. Chat checks preservation of earlier messages, both authors, original nine responses, participant presentation and scrolling the new message into view. Reaching the absolute scroll limit is not required when `scrollIntoView` already exposes the message. Uncontrolled random selection without complete observed coverage is reported as manual. Required source-code organisation, meaningful variable names, graphics and exact visual resemblance remain manual checks. These are educational results, not official CKE criteria or a full-paper score.

The dragons adapter extracts static HTML from `smoki.php` using the PHP parser, then serves a private HTML entry. Uploaded PHP is never executed in this JavaScript check. Generated PHP output is therefore outside its coverage; templates with more than one million characters require manual checking. No JavaScript adapter evaluates SQL. The adapters and commands are compiled into the platform: guide editors and students cannot supply executable checker code.

The API uses these endpoints:

- `POST /api/v1/attempts/:id/study` with `{token, guideVersion?}` retrieves an authorized guide revision. Omitting the version selects the latest revision for that task; a started local project pins an explicit version.
- `POST /api/v1/attempts/:id/study/checks` accepts `{token, guideVersion, activityId, projectRevision, files}` and returns `{id, token, status}`. `activityId` combines the step and activity IDs with `/`.
- `GET /api/v1/study/checks/:id` requires `X-Check-Token` and returns job status and, when ready, its report.
- `POST /api/v1/study/checks/:id/ack` with `{token}` deletes a completed or failed temporary result after local receipt.

Mutations retain the guest CSRF boundary. Every request verifies the attempt secret, expiry, task revision, guide revision and supported activity. An unfinished `Egzamin` attempt cannot retrieve teaching material or create an educational check. A check does not close the attempt or overwrite its files. Exact repeated submissions recover the existing job and secret, while an in-flight job prevents another runtime check for the same attempt.

`StudyCheckJob` is separate from final `CheckJob`, because one project can undergo many educational checks before submission. Both tables share the same queue limit of 20 waiting jobs, one running worker slot, master checking switch, execution-profile heartbeat and sandbox limits. When the runtime is unavailable, the API returns an explicit unavailable response and the interface offers manual review; it does not silently run JavaScript with weaker isolation.

Reports carry the guide/activity identity, submitted project revision and a SHA-256 hash of canonical project files. The browser must not apply a result to code edited after submission. Study results are `passed`, `failed`, `manual`, `unsupported` or `error`, with evidence and advice; they have no points or overall percentage. A worker timeout or infrastructure failure produces a failed job rather than an invented learner grade.

Source files are deleted after processing, including failure paths. Temporary jobs/reports expire after 24 hours or are deleted on acknowledgment; API maintenance also cleans expired queued/completed jobs while the worker is offline. Worker restart recovery removes stale execution environments. Long-term files, checkpoints and reports remain in the learner's IndexedDB. A fresh temporary ticket for an expired unfinished learning/training session does not change that local project or extend an exam deadline.

## Upload boundary

The API accepts project files or one ZIP. Limits are 10 MiB compressed upload, 50 MiB extracted content and 500 files. Paths must remain relative to the project. Traversal, absolute paths, duplicate/conflicting names, links, nested archives and unsupported file types are rejected. Uploaded environment definitions are never executed. Limits are enforced while reading, not only trusted from archive headers.

The current submission path supports ZIP, not arbitrary archive formats. Linked original 7z files are catalogue resources and are not executed by the importer. A learner using a downloaded source package can prepare the required project files and submit them as ZIP.

## Execution boundary

The trusted worker claims at most one job at a time using PostgreSQL locking. It loads the immutable task revision, constructs fixed sandbox arguments and does not accept uploaded Dockerfiles or installation commands.

The sandbox image contains PHP 8.4, MariaDB 11.4, Chromium and the trusted check controller. PHP, MariaDB and Chromium use distinct unprivileged users; the small controller has the container-local capabilities required to start those processes. The source mount and root filesystem are read-only. Writable scratch areas are bounded tmpfs. There is no platform secret or Docker socket inside the sandbox.

The sandbox has no external network; services needed by the check communicate inside its own environment. Initial limits are one CPU, 2 GiB memory including swap ceiling, 256 processes, a 120-second host deadline, a shorter in-container deadline and a 1 MiB host output limit. These are bounds, not a VPS sizing recommendation.

The 120-second deadline limits the command executing user code. Before it starts, each trusted Docker `info` and image-inspection probe has its own 30-second timeout, allowing Docker Desktop to respond under host load. Cleanup has a separate 10-second control-command timeout. The global worker lease is 240 seconds so preflight, execution and cleanup remain within the same occupied slot; this does not grant user code 240 seconds of runtime.

The worker removes the container and temporary source tree in cleanup paths. It also handles expired job leases after a restart. Source files are removed after processing; reports expire or are acknowledged separately.

## Local and public profiles

`local-development` uses ordinary Docker Linux containers on a loopback-only development system. Docker Desktop with WSL2 supports Windows development. This profile is for development and own examples; it is not evidence that arbitrary public uploads are safely isolated.

`public-sandbox` requires the `runsc` runtime, cgroup v2 and Docker-reported CPU/memory/process-limit support. It also requires an explicit environment verification flag. Missing runtime support fails closed; there is no silent fallback from gVisor to runc.

The public profile has **not been certified on the unknown target VPS or by the Windows development environment**. Before enabling it, test real limit enforcement, PHP/MariaDB/browser compatibility, host/network isolation, cross-job isolation, archive attacks, runaway processes, output exhaustion, restart cleanup and queue overload. Merely setting `PUBLIC_SANDBOX_VERIFIED=true` is not such a test.

## Adding a check

Extend the fixed checker whitelist and implementation together. Add a meaningful positive case, at least one alternative correct implementation where allowed, and a focused negative case. Keep sensitive evaluator state outside the student's permissions. Return `manual` or `unchecked` for requirements that cannot be reliably proven, and make the limitation visible in Polish.
