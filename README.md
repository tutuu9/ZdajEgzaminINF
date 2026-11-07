# Zdaj Egzamin INF

[Polski](README.pl.md) · English

A Polish learning workshop for the vocational qualification **INF.03**, with a path toward INF.04. Read an original examination sheet, work locally, and practise with published CKE theory examples.

New assignments use **8 original CKE practical papers and 25 published CKE theory examples**, supported by 12 explanatory lessons. Seven practical PDFs are explicitly labelled third-party copies. This is not the complete CKE question bank or an official examination service. Earlier authored assignments and questions remain only for compatibility and checker fixtures; they are not offered for new learner attempts.

## What is included

- Three learning levels and **Nauka**, **Trening** and practical **Egzamin** modes.
- A project editor, isolated HTML/CSS/JavaScript preview, project ZIP import/export and local completion records. The current CKE papers have no automatic grading adapter; completion does not award a score.
- An original PDF viewer with page navigation and separate reading guidance. Guidance stays hidden until completion in Egzamin mode. See [original PDFs and reading guidance](docs/reading-exam-pdfs.md).
- Cumulative learning for all eight papers: one explanation and one small change in the actual project files. Switching steps never replaces code. HTML/CSS checks explain their findings; selected JavaScript behaviours use the trusted worker, while PHP, SQL and graphics have explicit manual checks. A versioned course, active file, cursor and project are saved locally. `!` followed by Tab inserts a basic HTML document. Legacy notebooks remain readable; examples and [external solutions](docs/solution-sources.md) stay separate from the project and unavailable during an unfinished Egzamin attempt.
- In **Nauka**, all eight courses can take you from a step check to the relevant HTML or CSS in your project. Choose **Pokaż w kodzie** to select the fragment or **Otwórz plik** for file-level guidance. After editing, choose **Sprawdź ponownie**.
- Explore your own static page in an unfinished **Nauka** project with **Zbadaj stronę**. Select an element in the preview or the keyboard-accessible element list to open its HTML in the editor. A compact explanation shows matching CSS rules, actual preview values and a labelled box model; CSS links open your own declarations. **Pokaż odstępy** highlights supported spacing geometry. On a phone, selection opens **Kod**, with **Wróć do podglądu** to return. Escape ends inspection. The inspector runs locally, preserves your code and Undo history, and does not award a score.
- **Zmień i zrozum** connects a small HTML/CSS edit to its result in all eight **Nauka** courses. Read the short explanation, optionally predict the result, then write your own change. **Porównaj przed i po** switches between the page at the saved step checkpoint and the current page; **Co zmieniłem?** shows changed source lines. Switching views never replaces your code. Explicit restoration first preserves the newer work as a separate project in **Moje prace**. Checkpoints and predictions stay in the browser and travel with progress backups. See [comparison and safe restoration](docs/change-understand.md).
- The HTML editor suggests Emmet abbreviations, including in the HTML portions of PHP files. Type `div` or `ul>li*3` and press Tab to expand it. Use Undo to restore the abbreviation.
- A Liquid Glass interface with five sections: **Nauka**, **Arkusze**, **Teoria**, **Moje prace**, **Pytania i odpowiedzi** (FAQ). The workspace places the lesson, editor and preview together, with labelled tabs on smaller screens.
- Light, dark and system colour themes, with a saved browser preference and a picker in the navigation and project workspace. Original examination PDFs and learner previews keep their own colours.
- [35 reviewed FAQ answers](docs/faq.md) in seven categories, with search, direct links, source references and dated examination rules. Administrators edit ordinary fields and publish new immutable revisions; no AI call is needed.
- Theory learning and practice using reviewed excerpts from an official informator. Its published answer key remains accessible in the source, so a hidden-key theory exam and a fabricated 40-question set are not offered.
- Browser-local progress, draft recovery and a portable backup. Student registration and cross-device synchronisation are not included.
- An administrator panel at `/admin` for versioned content, source metadata, checking controls and aggregate operational statistics. Public pages link to the [owner](https://t.me/tutuu9); there is no administrator shortcut in the footer.
- Optional DeepSeek explanations, disabled without a key and an administrator setting. The initial application budget is **$2 total**, not a renewing subscription.

The interface and learning material are Polish. Technical documentation is English. Projects stay in the browser; explicit runtime checks temporarily upload code to the trusted worker. The administrator does not receive a permanent student history. See [architecture](docs/architecture.md) and [checking](docs/checking.md).

For keyboard selection, choose **Element strony**, then activate **Pokaż element**. Page inspection disables learner JavaScript; **Uruchom JS** exits inspection and starts the ordinary isolated preview. Literal HTML outside PHP blocks can be inspected, but PHP output is not executed. The inspector distinguishes matching source rules from resolved browser values, and identifies unsupported CSS or geometry instead of inventing a source location or a winning declaration. Selection is cleared when files, the lesson step or the preview page change. Existing projects and backups need no migration.

## Local development

Use Node.js **24.13 or later in the 24.x line**, npm, and Docker Desktop with Linux containers/WSL2 on Windows. Run commands from the repository root.

```powershell
npm ci
npm run setup:local
npm run db:generate
docker compose up -d postgres
npm run db:migrate
npm run db:seed
npm run sandbox:build
npm run dev
```

To exercise the retained checking infrastructure, start its trusted worker in another terminal:

```powershell
npm run worker
```

Open [the local website](http://127.0.0.1:5173). The API listens on port 3001; the project PostgreSQL port is 54329. `setup:local` creates a private `.env` with random local secrets and never overwrites an existing one. It does not create an administrator or configure a paid API key.

Create your administrator in an interactive terminal:

```powershell
npm run admin:create
```

For the containerised application, run `npm ci` and `npm run setup:local` to prepare `.env`, then run `docker compose up --build`. Compose builds the application and the fixed sandbox image, applies migrations and seeds the content. A separate `npm run sandbox:build` is needed only for the development or standalone checker workflow above. Open [the containerised website](http://localhost:8080). Only the worker receives the Docker socket; the API does not. Details and troubleshooting are in [local development](docs/local-development.md).

## Checks

```powershell
npm run check
npm run build
npm run test:integration
npm run test:e2e
```

Integration tests need the project PostgreSQL service and generated Prisma client. API tests create a separate test database; checking tests need the sandbox image. Browser test prerequisites are described in [local development](docs/local-development.md). These commands describe the verification process, not a claim that every environment has been certified.

## Material sources and limitations

Every newly offered assignment and theory question refers to a verified published CKE document. An official publisher and an archive copy are distinguished; uncertain rights, missing attachments and unsupported automatic checks are explicitly recorded. The viewer retrieves reviewed source PDFs without rewriting them or retaining permanent server copies. No third-party exam archives are bundled. See the [source register](docs/sources.md).

The 25 theory examples are a small published sample, not full syllabus coverage. The video-based example is excluded. One CSS example contains a typographic ambiguity, explained after submission while preserving CKE's original text and key. Cumulative guides map to the original requirements; neither their examples nor downloaded third-party solutions are certified submissions. PHP/SQL and final project completeness require the learner's local environment and manual review. Supported educational checks do not produce an official CKE score.

The Windows development profile is **not a certification for public anonymous code execution**. Public checking requires the Linux/gVisor profile and separate isolation and resource verification. The separate [site-only deployment](docs/site-deployment.md) serves courses, PDF, theory, the editor and browser HTML/CSS checks without a worker or AI. Its standalone Compose profile uses a prebuilt image; deployment remains a manual, authorized operation.

## Repository guide

- `apps/web`, `apps/api`, `apps/worker`: browser application, NestJS API and trusted worker.
- `packages/shared`, `packages/content`, `packages/database`, `packages/checker`: contracts, source-backed content metadata, persistence and checking.
- `fixtures/content`: alternative correct solutions and intentional mistakes, excluded from public content.
- `docs`: [content format](docs/content-format.md), [architecture](docs/architecture.md), [checking](docs/checking.md) and [roadmap](docs/roadmap.md).

Contributions follow [CONTRIBUTING.md](CONTRIBUTING.md). Project code, explanatory commentary and original fixtures are provided under [MIT](LICENSE); CKE papers and other third-party material retain their own status. Font notices are preserved in [third-party notices](docs/third-party-notices.md).
