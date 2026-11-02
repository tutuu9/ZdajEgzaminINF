# Working in Zdaj Egzamin INF

## Project boundaries

- Learner-facing UI, lessons, hints, reports and errors are Polish. Technical documentation and code identifiers are English. Maintain both README languages.
- All newly offered practical assignments and theory questions must come from verified, published CKE INF.03 materials. Preserve the original PDF and its provenance. Explanatory notes are separate teaching material, never a replacement official paper. Legacy authored fixtures and existing saved attempts are retained for compatibility, but are excluded from new learner-facing attempts.
- The current theory examples come from an informator containing its answer key. Offer learning and practice only; do not enable a hidden-key examination from that source. Unsupported original practical papers allow local work and manual completion, with no invented automatic score.
- `apps/web` owns UI and IndexedDB; it must not import the private content package, database code, grading fixtures or answer keys.
- `apps/api` is the single NestJS API. It handles versions, guest/admin sessions, CSRF, transient submissions and AI reservations; it never executes learner code or receives the Docker socket.
- `apps/worker` is the trusted job executor. `packages/checker` owns archive validation, fixed checking specifications and Docker execution.
- `packages/shared` owns API/data contracts; `packages/content` owns original learning material and source metadata; `packages/database` owns Prisma and migrations.
- Published content is immutable. New versions must preserve the meaning of existing attempts.
- Browser-local attempts are not a permanent server-side student history. Keep raw solutions, answer selections and secrets out of operational logs and aggregate metrics.

## Commands

- Setup: `npm ci`, `npm run setup:local`, `npm run db:generate`, `docker compose up -d postgres`, `npm run db:migrate`, `npm run db:seed`.
- Development: `npm run dev`; checking worker in another terminal: `npm run worker`; prepare its image with `npm run sandbox:build`.
- Required ordinary checks: `npm run check` and `npm run build`.
- Relevant integration and browser checks: `npm run test:integration` and `npm run test:e2e`, with the prerequisites in `docs/local-development.md`.
- Formatting: `npm run format:check`; format only files relevant to the change while parallel work is active.

## Definition of done

Verify the behaviour changed, relevant failure cases and documented setup. For grading changes, test alternative correct solutions and targeted mistakes. For content, verify answers and source attribution. For changes to save/restore, exam timing, authentication, ZIP handling, isolation or AI accounting, exercise the corresponding boundary, not only a successful request. Report checks that could not run.

Do not replace missing evidence with a passing score or a claim of official CKE approval. Keep third-party examination links and metadata separate from original content, with unknown rights recorded as unknown.

## Execution and operations

Keep the default local environment bound to loopback. The public sandbox requires Linux, runsc/gVisor, cgroup checks and environment-specific isolation testing; never silently fall back to runc. Retain resource limits, restricted networking and guaranteed cleanup.

Use the checked-in lockfile. Avoid unrelated frameworks, services and broad refactors. Do not commit generated runtime data or secrets. Respect the user's current task scope for Git, publishing and deployment; this repository does not imply an automatic production release.
