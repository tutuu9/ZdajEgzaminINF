# Verification and deployment readiness

The first implementation has been exercised locally on Windows with Docker Desktop's Linux engine. The target VPS, its available resources and its Linux/gVisor runtime remain unverified. The Linux override is prepared configuration, not a deployment or a claim that the public execution profile is ready.

The current public curriculum follows the later CKE-only requirement: three original INF.03 papers and 25 static examples from the official informator. The original papers have no verified automatic adapters yet; their manual completion stores no invented score. The informator includes its answer key, so theory Egzamin mode is disabled. Earlier authored projects/questions remain legacy test fixtures and historical attempts, not new public assignments. Runtime evidence below validates that legacy checker infrastructure, not grading of the original CKE papers.

## Cumulative learning redesign — 2 November 2026

Version 3 provides 175 actions across 30 stages, with two private code variants per paper and intentional mistakes. All three courses start with the HTML document. Earlier guide versions and notebooks remain archived. The frontend now edits only the attempt's project files, serializes revision-checked writes, preserves failed-save edits, restores per-file editor state and rejects stale educational reports.

The final `npm run check` passed formatting, TypeScript, ESLint and all 150 unit/content/storage tests. The production build passed inside `docker compose build api`; `docker compose up -d --no-build` applied initialization and left the updated API, browser application, PostgreSQL and worker running on loopback.

The API/PostgreSQL suite passed 27 tests. A later targeted queue test passed after extending the single-worker lease to 240 seconds. Trusted Docker preflight probes allow 30 seconds each; learner execution retains its 120-second cap. All 17 educational runtime scenarios passed across the full run and the targeted rerun of cases affected by Windows Docker preflight timeouts. These cover independent valid implementations, deliberate behaviour errors, an infinite loop, PHP non-execution and cleanup. The final cleanup found no remaining sandbox containers or scratch directories. Measurements: `artifacts/study-checker-report.json`.

The existing checker and isolation suites subsequently passed all 24 tests unchanged, including PHP/SQL, memory/output limits, network/file isolation and recovery. Six valid-solution samples took 9.46–28.95 seconds with sampled peaks of 261.4–467.2 MiB on this Docker Desktop host. These are local observations, not VPS sizing or gVisor certification.

Direct checks of the running Compose site confirmed: an existing project's empty file list stayed empty until explicit scaffold creation; the scaffold passed without rewriting; a missing stylesheet link failed with an explanation while `./style.css` passed; title, body structure and CSS survived step changes, file switches and reload. Undo/Redo remained independent after switching HTML/CSS files. PDF page 4, the current learning step, the mobile Kod panel and active CSS file restored after reload. Legacy notebook text remained intact. A downloaded backup was version 2 and retained six project files, guide v3, four checkpoints and PDF position; reimport kept four attempts without duplicates. Closed exam attempts could browse the final guide step read-only. Explicit JavaScript preview ran event handlers while access to the parent remained blocked. The four-section catalogue, admin login, keyboard focus, mobile theory landing page (390 × 844), medium preview tabs (1200 × 900) and wide workspace (1600 × 1000) were inspected. No browser console errors were recorded in the checked workspace. Screenshots: `artifacts/cumulative-glass-home.png` and `artifacts/cumulative-glass-workspace.png`.

The updated browser regression scenarios are maintained in `tests/e2e/web.spec.ts`. Their CLI suite was not executed by this desktop browser session; direct browser observations are recorded separately below. Public Linux/gVisor readiness and VPS suitability remain outside this redesign.

## Earlier evidence recorded on 2 November 2026

The gradual-learning revision adds 69 small activities across the same 18 requirement-linked stages. Each begins with an explanation before its editor opens, then offers a small example and an explicitly manual checkpoint. The `!` + Tab shortcut inserts an HTML5 skeleton in HTML regions and places the cursor inside `body`. `npm run check` passed 92 unit tests, including 23 abbreviation cases and 30 sequence/backup cases; the API suite passed all 22 tests. The new tests cover PHP/comment/script exclusions, read-only and selection handling, one-step undo, exact phase/draft restoration, sequential access, malformed records and matching save/read size limits. The existing browser regression was updated for this flow and remains separate from manual browser verification.

The updated Compose build completed successfully. Manual checks on its real interface confirmed that the first explanation precedes the editor, future stages are disabled, `!` + Tab expands correctly and one Undo returns to `!`, comparison is separate, and a confirmed checkpoint opens the next explanation. Reload restored the second activity's writing phase and HTML draft. The previous version's notebook remained readable, and the submitted project still contained no files. Switching workspace tabs also restored the activity. Screenshot: `artifacts/cke-small-steps.jpg`. These checks did not execute the prepared Playwright suite or assert automatic correctness of learner code.

The later coding-teaching update adds 18 requirement-linked steps for the three official papers, with separate local scratchpads, explanations and six externally hosted solution variants. `npm run check` passed all 38 unit tests; these include actual execution of our JavaScript examples against calculator inputs and repeated section switches. The expanded API suite passed 22 tests, including study-guide secret/CSRF checks, task-version matching, no solution URLs in public DTOs, denial before exam completion and stable assistance counts for closed attempts. The built Compose interface was checked manually: the teaching entry opens the correct paper, a typed scratchpad survives reload without creating project files, and a step opens page 5 of the original PDF. This is separate from the prepared, locally unexecuted Playwright regression suite.

Reviewed input archives and external variants are documented in [solution sources](solution-sources.md). Their availability and static inspection do not establish that every external implementation satisfies every official criterion.

A separate runtime review passed for our own teaching fragments using PHP 8.4 and MariaDB 11.4 in network-disabled temporary containers with the inspected original SQL inputs. It checked fish joins and PHP rows, footwear filters/joins and exact account grants, and dragon grouping/averages, schema changes, country options, POST filtering, empty results and an injection-shaped input. The review assembled PHP fragments according to their placement instructions; it did not run external solution code or assess complete submissions, graphics, CSS or screenshots. Evidence: `artifacts/study-runtime-review.json`.

The earlier CKE-only update passed formatting, TypeScript, ESLint and 36 unit tests. Subsequent study-mode changes brought that count to 38. The latest `docker compose up -d --build` completed successfully with the updated frontend and API.

| Boundary                                              | Evidence                              | Result                                                                                                                                                               |
| ----------------------------------------------------- | ------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| HTTP API, PostgreSQL, sessions, CSRF and admin rights | `tests/api.integration.test.ts`       | 22 tests passed against a temporary isolated database                                                                                                                |
| Exam answers and deadlines                            | API tests                             | Answer keys withheld until submission; expired exams remain reviewable but are not marked passed; repeat submission preserves the first result                       |
| Immutable content and job secrets                     | API tests                             | Existing attempts retain their question versions; submitted files cannot be replaced through retry; incorrect report secrets are rejected                            |
| AI money and concurrency                              | API tests with a mocked provider      | Reservations precede calls; one unresolved call; insufficient budget and disable switch prevent calls; uncertain and late responses cannot debit a reservation twice |
| Legacy checker fixtures                               | `tests/checker.integration.test.ts`   | 19 tests passed; two correct implementations per legacy project accepted and targeted invalid fixtures identify the relevant criteria                                |
| Local container boundaries and recovery               | `tests/isolation.integration.test.ts` | Five tests passed: network/host/neighbor isolation, runaway PHP, memory exhaustion, diagnostic output, forced timeout and successful subsequent jobs                 |
| Public profile separation                             | API tests and checker preflight test  | An unverified profile or missing matching heartbeat disables submissions; a local worker cannot claim a public job; unverified public runtime startup fails closed   |

The API suite also serves a synthetic HTML directory without requiring a frontend build. Normal, encoded, case-varied and nested HTML paths receive a fresh CSP nonce matching the document metadata, with no unreplaced placeholder. Static JavaScript and API routes retain their proper responses.

The CKE-only tests verify that new authored attempts are rejected, bootstrap returns three source-backed tasks and 25 official examples without authored exercises, and manual completion requires the correct secret and CSRF protection, is idempotent, and creates neither a checking job nor a score. Theory retains fixed A–D correspondence with the source and excludes answer keys from question DTOs; attempts to start Egzamin are rejected on the server.

Original PDF proxy tests verify exact source bytes, approved destinations, rejected redirects, MIME/magic checks, size/time/concurrency limits and recovery. The 7,976,263-byte official informator is SHA-256 pinned to prevent changed source pages from silently invalidating question crops and keys. All four live source PDFs were fetched successfully through the local API. All 25 question fragments were independently rendered and visually inspected; diagrams and options remain intact and printed keys are outside the crop. The extracted-text audit is in `artifacts/official-question-crops.json`. Question 10 retains the CKE key while explaining the selector-spacing ambiguity after submission.

No paid DeepSeek requests were made by these tests. Provider response shape, timeouts and accounting are exercised with synthetic responses; actual provider availability and account balance are separate operational checks.

Before the curriculum change, manual browser verification covered a full legacy workshop upload, isolated JavaScript preview (form submission, deferred scripts, inline event handlers and denied parent-document access), submission/report, another attempt, reload recovery, and an exported backup imported successfully. A five-question legacy theory attempt was completed at a 390 × 844 viewport, including reload recovery and post-submission explanations. The Playwright regression suite is prepared for CI but was not executed locally to completion; manual browser evidence is distinct from that suite.

The complete Compose application also accepted a correct PHP/PDO library solution through HTTP, its PostgreSQL queue and the trusted worker. Its report arrived after 10.37 seconds; acknowledging the report removed it, and subsequent retrieval returned 404. This smoke run is recorded in `artifacts/compose-smoke-report.json`.

The original training PDFs were rendered with Poppler and all ten pages visually inspected: three pages each for Biblioteka and Klub, four for Warsztaty. Embedded Polish glyphs, margins, numbered requirements and page footers were readable. Browser checks confirmed page navigation, zoom and the hidden reading guide before an exam submission. Original examination documents use a separate source-labelled viewer.

After the CKE-only switch, a five-example official theory attempt was completed with four correct answers and one deliberate error; reload restored the selected answers and order, and the report showed the matching key and separate explanations. The original Wędkowanie PDF and page-guide navigation rendered in the browser. In the built Compose application, an original 2025 practical paper loaded under the production CSP; an uploaded synthetic file ran its isolated preview, the 150-minute timer survived reload, and manual completion retained local files without points. Mobile theory at a 390 × 844 viewport rendered its original question crop without page-level horizontal overflow; extracted question text offers a readable alternative and excludes the printed key.

The final mobile build opens the readable question text by default. Its closed navigation is excluded from keyboard focus and the accessibility tree; Enter opens the menu and Escape from a navigation link closes it. These behaviors were checked in the running Compose application, and the temporary viewport override was then reset.

The source-colour audit is recorded in `artifacts/contrast-audit.json`; it covers text, control boundaries and focus colours rather than claiming full accessibility certification. Editor comments and line numbers were also adjusted to readable colours on the dark background.

Generated evidence is written to `artifacts/checker-benchmark.json`, `artifacts/isolation-report.json` and `artifacts/api-load-report.json`. Re-running a suite replaces its corresponding artifact. The measurements below describe the recorded local run; they are not service-level promises.

## Checker resource measurements

The six valid fixtures ran sequentially. Memory was sampled from Docker every two seconds and can miss a short peak. It covers each checking container, not the API, PostgreSQL, Docker Desktop VM or host operating system.

| Project               | Valid implementations | Duration range      | Highest sampled container memory |
| --------------------- | --------------------- | ------------------- | -------------------------------- |
| Biblioteka szkolna    | 2                     | 9.08–10.07 seconds  | 448.3 MiB                        |
| Kalkulator warsztatów | 2                     | 14.01–14.20 seconds | 242.2 MiB                        |
| Klub planszówkowy     | 2                     | 9.23–11.19 seconds  | 454.9 MiB                        |

Synthetic failure probes returned control in 9.92 seconds for an infinite PHP loop, 4.05 seconds for allocation beyond a deliberately reduced 512 MiB container limit, 3.84 seconds for diagnostic output exhaustion and 4.98 seconds for a forced 4-second runner timeout including cleanup. The memory probe disabled PHP's own `memory_limit`, so it exercised the container boundary. Memory and diagnostic infrastructure failures produced `error` with no overall percentage; the loop was a failed learner criterion. Each owned container and scratch directory was removed, and the next ordinary job succeeded.

The successful isolation probe inspected the real container configuration: network `none`, read-only root filesystem, no privileged mode, no-new-privileges, 2 GiB memory/swap ceiling, one CPU and 256 processes. PHP could not read platform credential environment variables, the host Docker socket, host/process credential files or synthetic neighboring attempt files. This is a finite regression suite, not a proof against every possible escape.

## Modest HTTP burst and queue behavior

The load case used real loopback HTTP, NestJS and PostgreSQL with small synthetic PHP files and direct legacy test tickets. It submitted 24 different attempts concurrently: 20 entered the queue, four received HTTP 429, and the rejected attempts remained open. A recorded burst completed in 252 ms; submission latency was 223 ms at the median and 246 ms at the 95th percentile. Thirty concurrent content reads all succeeded in 179 ms. The artifact is updated by later runs.

Two concurrent calls to the worker's actual transactional claim function produced exactly one active lease. A further claim was blocked until that lease was closed, after which the next queued job could be claimed. This test checks queue locking and overload behavior without executing the queued files. It does not measure sustained traffic, multiple worker containers, large upload throughput, internet latency or PHP execution throughput. The separate runtime tests supply execution evidence.

## Comparing a future VPS

The default steady-state Compose limits are 384 MiB for PostgreSQL, 512 MiB for the API, 256 MiB for the trusted worker and up to 2048 MiB for its one active sandbox: 3200 MiB of configured application ceilings in total. That sum excludes the operating system, Docker, a future TLS proxy, filesystem cache, image building, backups and the temporary initialization process. It is neither a measured resident total nor a minimum RAM recommendation. The observed 242–455 MiB sandbox samples must not replace the 2 GiB maximum when assessing worst-case uploads.

Before choosing capacity, record the VPS operating system, architecture, usable RAM, vCPU quota, free disk, other resident services and swap policy. Measure the complete stack under expected traffic on that host, including cold image startup and database disk use. Leave explicit headroom and retain one active check with a 20-job queue until new measurements justify a change. Public gVisor overhead and PHP/MariaDB/Chromium compatibility have not been measured here.

## Prepared Linux public profile

Merge `infra/compose.public.yaml` after the base file. Compose resolves its relative paths against the first file; inspect the merged configuration before use. The override uses absolute Linux bind paths and the Linux Docker socket, with no Docker Desktop host-path mapping. Both the API and worker require `public-sandbox`; the worker explicitly launches learner containers with `runsc`. The API and database keep their loopback-only bindings. Docker documents the override/merge behavior in [Merge Compose files](https://docs.docker.com/compose/how-tos/multiple-compose-files/merge/).

Prepare private Linux configuration with `PUBLIC_DATA_DIR_HOST` set to the intended absolute data directory, `PUBLIC_WEB_ORIGIN` set to the intended HTTPS origin, production session/IP secrets and a trusted reverse-proxy policy. Leave `PUBLIC_SANDBOX_VERIFIED=false` while validating the host. Do not reuse a Windows data path. `NODE_ENV=production` enables secure session cookies; `PUBLIC_TRUST_PROXY` accepts explicit proxy addresses/CIDRs or `false`, not a blanket `true`.

From the repository root, this command only validates configuration; it does not start or publish services:

```sh
docker compose -f compose.yaml -f infra/compose.public.yaml config --quiet
```

Configuration validation was run locally with a placeholder HTTPS origin and Linux path. It confirmed both service profiles, a false verification flag, loopback ports and no Docker socket in the API. No public-profile containers were launched.

On the eventual Linux host, install and configure the `runsc` runtime using the [gVisor Docker guide](https://gvisor.dev/docs/user_guide/quick_start/docker/). Check cgroup v2 and effective memory, CPU and process limits, then repeat project compatibility, malicious input, network/host/neighbor isolation, resource exhaustion, restart cleanup and queue tests using `public-sandbox`. The current runtime suites explicitly target `local-development`; simply running them unchanged or setting the verification flag does not verify gVisor. Record the environment and results before enabling public checking.

The worker exits before advertising readiness when verification, `runsc`, cgroup v2 or required limits are absent; it has no runc fallback. The API additionally requires a fresh `worker.public-sandbox.lastSeen` heartbeat and the verification flag. Jobs retain their execution profile in PostgreSQL, so a leftover local worker cannot claim a public job. Stop local workers when changing deployment profiles, and review existing queued jobs before resuming service.

TLS termination, domain routing, backups and restore checks, monitoring, patching, sustained load, real target-host isolation and deployment approval remain separate readiness work. No remote repository, push, public endpoint or VPS deployment is created by this configuration.
