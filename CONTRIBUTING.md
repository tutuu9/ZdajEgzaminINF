# Contributing

Keep changes small and tied to an observable learning or reliability improvement. Work on a short-lived branch from `main`, use meaningful commits, and describe the resulting behaviour and relevant validation in the pull request.

## GitHub checkpoints and releases

Use `codex/` for new working branches. During the authorized release and course expansion, commit and push every verified milestone: the existing redesign, navigation, FAQ, each complete course, and final verification. Open a pull request so the full CI workflow runs; feature-branch pushes alone do not trigger it. Fix failures in separate commits. Merge with commit history retained only after every required job passes, including the complete Playwright suite.

Keep the v1.0.0 baseline separate from subsequent features. Align workspace versions and the lockfile before a release, publish English and Polish notes, and create an immutable annotated tag on the verified commit. Never move a published tag or force-push shared history. Do not attach secrets, local databases, learner work or downloaded third-party examination archives to releases.

For rollback, inspect the release tag or create a reviewed revert on a new branch. Back up PostgreSQL and browser-local work first and confirm compatibility with the installed migrations and IndexedDB format. Reverting code does not automatically reverse migrations, restore older data formats or remove learner progress. Never remove Docker volumes as part of a code rollback.

## Development

Follow [local development](docs/local-development.md). Use the lockfile and Node 24.x. Run `npm run check` and `npm run build`; run the integration or browser tests when the affected behaviour requires them. Include verification limits rather than describing an unrun check as passed.

Use TypeScript strict mode, keep shared contracts in `packages/shared`, and put reusable checking rules in `packages/checker`. Update the English and Polish README together when setup or supported capabilities change.

## Learning content

Write learner-facing text in Polish. New practical assignments and theory questions must come from verified, published CKE INF.03 materials. Record the exact source, qualification, page and identifier; keep reading guidance and explanations separate from the original document. Do not substitute an authored task or relabel a third-party copy as a file hosted by CKE. Legacy authored fixtures remain internal regression material.

Each theory answer must match the published key. Review any page crop against the original to preserve diagrams and answer options while excluding the printed key. A source document containing its answers is suitable for learning and practice, not a claimed hidden-key examination. Each automatic practical adapter needs clear criteria and representative correct and incorrect solutions; until verified, expose manual completion without a score.

Published revisions are immutable: create the next version instead of silently changing the meaning of an old attempt. New checking behaviour must accept more than one valid implementation where the task permits it, and reject a focused incorrect example. Never treat an unavailable check as a failed learner criterion.

## Data and attribution

Do not commit `.env`, API keys, personal identifiers, real student solutions, imported archives or runtime databases. Use synthetic examples and original fixtures. Record the source and rights status of third-party material; a reachable PDF is not evidence of redistribution permission. Preserve dependency and font notices.

## Runtime boundaries

Student code belongs only in the isolated checker. Do not run user commands in the API, pass platform secrets to the sandbox, expose its Docker socket to the API, or weaken the public runtime's fail-closed behaviour. An ordinary local Docker run is not evidence that the public Linux/gVisor profile is ready.

Reporting a defect should include the expected behaviour, a minimal synthetic reproduction and the affected version. Never include secrets or another learner's private work.
