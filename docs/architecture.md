# Architecture

## Applications and trust boundaries

The browser uses React, Vite and CodeMirror. NestJS is the only application API. PostgreSQL stores platform content and short-lived operational records through Prisma. A separate worker claims checking jobs from PostgreSQL and launches fixed Docker workloads. Redis and a separate authentication service are not required.

```text
Browser / IndexedDB
    │ same-origin HTTP + CSRF
    ▼
NestJS API ── PostgreSQL (content, sessions, jobs, settings, aggregates)
    │                 ▲
    │ transient files │ claim one job
    ▼                 │
Project data directory ── Trusted worker ── Docker sandbox
                                           PHP / MariaDB / browser

NestJS API ── optional, explicit request ── DeepSeek
```

The API does not execute uploaded code or receive the Docker socket. The worker controls fixed images, runtime flags and mounts. Student files are data to the platform and become executable only inside the sandbox. Preview content runs in a restricted iframe and must not share the application's storage access.

## Data ownership

| Data                                                                    | Storage                      | Lifetime / purpose                                           |
| ----------------------------------------------------------------------- | ---------------------------- | ------------------------------------------------------------ |
| Original lessons, questions, task versions and source metadata          | PostgreSQL `ContentRevision` | Published versions remain available for older attempts       |
| Draft student project, selected answers, hints, results and preferences | Browser IndexedDB            | Until the learner removes them or browser storage is cleared |
| Guest/admin sessions and attempt tickets                                | PostgreSQL                   | Short-lived access and server-side mode/deadline enforcement |
| Submitted project                                                       | Ignored runtime directory    | Removed after checking, including failed jobs                |
| Check report and access-secret hash                                     | PostgreSQL                   | Until acknowledgement or the job's 24-hour expiry            |
| AI request token counts and accounting status                           | PostgreSQL                   | Budget accounting; no prompt or code content                 |
| Operational events                                                      | PostgreSQL                   | Seven days; counters remain aggregated                       |

No permanent student account or `StudentAttempt` history exists on the server. A local backup contains sensitive attempt tokens and the learner's own files; treat it as private. There is no automatic cross-device sync.

`AttemptSnapshot.files` is the sole editable project. `ProjectStore` serializes functional changes using an IndexedDB transaction that compares the persisted revision before writing. A second tab cannot silently overwrite a newer revision. Failed writes keep the current in-memory files available for download and block completing a step until saving succeeds. Explicit reload is separate from retrying a save.

The local project ID is independent of its server ticket. An unfinished Nauka/Trening project can replace an expired ticket when a protected operation requires it, preserving files, pinned guide, progress and accumulated hint usage. Egzamin and completed attempts never renew automatically. Server retention remains 24 hours. Backup v2 includes the guide, editor positions, learning checkpoints, recovery copies and legacy notebooks; v1 is still accepted. Conflicting imports keep both works.

## Content revisions

Content has stable keys and increasing revision numbers. Published rows are not edited in place. An administrator creates and previews a draft, then publishes it. Task tickets reference the exact task revision; theory tickets reference question revisions. The seed is idempotent and does not overwrite existing published content.

Public task DTOs omit grading probes and prepared hint arrays. Public question DTOs omit correct-answer IDs and all answer explanations. New attempts accept only source-backed CKE INF.03 content. Legacy authored tasks and questions remain available for historical attempt compatibility and regression tests, not new learning sessions; short authored exercises are removed from the public bootstrap and reveal route.

Original PDF requests use a code-reviewed exact-URL allowlist, bounded downloads and no persistent server copy. Catalogue metadata distinguishes an official CKE host from an archive copy. Theory examples show reviewed page fragments from the CKE informator, which itself includes answers; the application therefore offers learning/practice but disables a purported hidden-key theory examination. The repository is open source: these controls govern the platform experience, not proof that the learner used no outside help.

## Submission flow

Current public original papers do not have full final-grading adapters. Their manual-completion endpoint validates the attempt secret and closes the ticket without accepting source files, creating a final checking job or generating a score. Separate `StudyCheckJob` records support repeatable educational JavaScript checks without closing a project. They share queue capacity and the single worker slot with final checks. The following automated flow applies to supported adapters, including legacy regression coverage.

1. The browser starts a ticket for a particular task version, level and mode.
2. Edits remain local until an explicit check request uploads files.
3. The API validates paths and sizes, reserves queue capacity and creates a short-lived job. The response contains an unpredictable result secret; only its hash is stored.
4. The worker claims one job, loads the published checking specification and runs the sandbox.
5. Results are mapped back to the published criteria. Weights do not come from the submitted code.
6. The browser saves the report locally and acknowledges receipt. Temporary source files and reports are cleaned independently of successful browser navigation.

Do not turn infrastructure errors into failed educational criteria. Missing and manual checks keep the overall percentage unset.

## Authentication and transport

Students use guest sessions, not named accounts. Mutations require a guest CSRF token and an allowed origin. Administrator operations additionally require a server-validated admin cookie session. Administrator passwords are hashed, and the CLI creates an account without a shared default password.

The development API and database bind to loopback. HTTPS termination, production cookies, trusted proxy configuration and the public sandbox verification are deployment work, not accomplished by publishing the GitHub repository.

## AI budget

An application-wide budget is stored in integer micro-USD. A PostgreSQL transaction reserves a conservative maximum before contacting the provider. Only one unresolved call is admitted. Successful usage reconciles the reservation using configured rates; uncertain upstream failures retain it until conservative administrative settlement. No hidden paid retry is performed.

The ledger is a conservative application estimate, not the provider's invoice. Provider balance is displayed separately and may reflect other applications using the same account. Turning AI off blocks new calls but cannot recall one already transmitted.
