# Contributing

Keep changes small and tied to an observable learning or reliability improvement. Work on a short-lived branch from `main`, use meaningful commits, and describe the resulting behaviour and relevant validation in the pull request.

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
