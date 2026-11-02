# Local development

## Prerequisites

- Node.js 24.x, at least 24.13, and npm.
- Docker with Linux containers. On Windows, use Docker Desktop with its WSL2 backend and access for your Windows user.
- Free local ports: 5173 (Vite), 3001 (API), 54329 (PostgreSQL); the full Compose website uses 8080 instead of Vite. Managed browser tests use 5174 and 3101.

The sandbox image includes PHP, MariaDB and Chromium, so you do not need to install these exam runtimes on the Windows host. Its first build downloads system packages and may take considerably longer than starting the application.

## First run

From the repository root:

```powershell
npm ci
npm run setup:local
npm run db:generate
docker compose up -d postgres
npm run db:migrate
npm run db:seed
npm run sandbox:build
```

`setup:local` creates a private `.env` and the ignored data directory. It generates local database/session secrets and uses an absolute forward-slash host data path. It never overwrites an existing `.env`. Do not publish this file or paste it into a support request.

Start the UI and API:

```powershell
npm run dev
```

In a separate terminal:

```powershell
npm run worker
```

Open [http://127.0.0.1:5173](http://127.0.0.1:5173). Vite proxies `/api` to NestJS. The worker must be healthy for server-side project checks; reading lessons and theory do not execute PHP.

## Full Compose application

After `npm ci` and `npm run setup:local` have prepared the private `.env`:

```powershell
docker compose up --build
```

Compose builds both the application image and the fixed sandbox image. Its `sandbox-image` service exits after image preparation; the checking worker waits for it and for database initialization. The initializer applies migrations and seeds original content. The API serves the built web application at [http://localhost:8080](http://localhost:8080). The worker receives a Docker socket and the host data path needed to create task-specific mounts. The API receives neither the socket nor a command execution capability. A separate `npm run sandbox:build` is only necessary for the non-Compose development or standalone checker workflow.

`docker compose down` stops the application while preserving its named PostgreSQL volume. Do not remove volumes when you intend to retain published revisions, administrator accounts and AI accounting.

## Administrator and AI

Run `npm run admin:create` in an interactive terminal. The CLI asks for a username and a password of at least 12 characters without displaying the password. There is no default admin password. It refuses to replace an existing account silently.

DeepSeek is optional. Set `DEEPSEEK_API_KEY` privately in `.env`, restart the API and enable AI in the administrator panel. The key is not stored in client code. Initial settings limit application use to $2 total, five daily requests per guest session, additional IP throttling and one unresolved provider call. The input bound is conservative, and output is limited to 1500 tokens.

The displayed application cost is calculated from configured rates. Review those rates against the provider's current pricing; provider balance is a separate value. Failed requests with uncertain billing keep a reservation. The administrator can conservatively settle that reservation rather than assuming the call was free. Disabling AI leaves lessons, prepared hints and checking available.

## Checks and their prerequisites

| Command                    | Purpose                                                 | Prerequisites                                                 |
| -------------------------- | ------------------------------------------------------- | ------------------------------------------------------------- |
| `npm run check`            | Format, TypeScript, lint and unit/content/archive tests | Dependencies and generated Prisma client                      |
| `npm run format:check`     | Formatting consistency                                  | Dependencies                                                  |
| `npm run build`            | Browser production build                                | Dependencies                                                  |
| `npm run test:integration` | API/PostgreSQL and runtime boundaries                   | Project PostgreSQL; sandbox image for runtime cases           |
| `npm run test:api`         | API security, content versions and AI accounting        | Project PostgreSQL with permission to create a test database  |
| `npm run test:checker`     | Alternative solutions and isolated runtime checks       | Docker and the sandbox image                                  |
| `npm run test:e2e`         | Browser journeys                                        | Migrated and seeded development database; Playwright Chromium |

API integration tests create a randomly named `zdaj_api_test_*` database and remove that specific database afterward. Use the project development PostgreSQL, not a production database. The local development user must be allowed to create a test database. Never point tests at an unrelated shared server.

`npm run test:e2e` starts its own API on port 3101 and Vite on port 5174. It reads the development `DATABASE_URL` from the environment or `.env`, creates temporary session secrets if needed, and disables paid AI calls. It does not reuse unrelated servers on those ports. Set `E2E_BASE_URL` only to test an already running instance that you manage. The current journeys cover theory, project editing, reload, export/import, exam restrictions and mobile navigation; they do not need a checking worker.

GitHub Actions installs Chromium with its operating system dependencies. For an optional local run by a developer, install its browser first:

```powershell
npm exec -- playwright install chromium
```

This is distinct from the Chromium installed inside the checking image. Browser test traces and screenshots are retained only for failed synthetic tests. CI uploads those reports and the runtime measurement artifact for seven days; it does not publish or deploy the site.

## Common problems

- **Docker permission denied:** verify that Docker Desktop is running in Linux mode and your terminal user can access its engine. Do not expose Docker over an unauthenticated TCP port.
- **Missing Prisma client:** run `npm run db:generate` after installing dependencies or changing the Prisma schema.
- **Missing sandbox image:** run `npm run sandbox:build`; the worker intentionally refuses a missing image.
- **Database password mismatch:** an existing volume retains its initial database password. Restore the matching private configuration instead of overwriting it or deleting data casually.
- **Checks unavailable:** inspect the worker's startup result and the admin switch. No report should claim an assessment when the worker is unavailable.
- **Saved progress appears missing:** IndexedDB is scoped to an origin. `localhost`, `127.0.0.1` and different ports are separate origins. Export before moving between them.
- **Expired attempt after a long break:** keep the saved files and start a new attempt. Exporting or importing local data does not extend an expired server access ticket.

## Deployment boundary

The supplied Compose bindings are local. This repository has not chosen a domain or configured a public VPS. Before a public deployment, establish host capacity, backups, TLS, cookie/proxy configuration and the independently verified public sandbox profile described in [checking](checking.md). GitHub Pages alone cannot run the NestJS API or PostgreSQL.
