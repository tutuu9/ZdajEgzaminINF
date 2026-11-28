# Zdaj Egzamin INF

[Polski](README.pl.md) · English

A Polish learning workshop for the vocational qualification **INF.03**, with a path toward INF.04. Read an original examination sheet, work locally, and practise with published CKE theory examples.

New assignments use **15 original CKE practical papers and 64 published CKE theory questions**, supported by 12 explanatory lessons. Practical PDFs from third-party archives are explicitly labelled as such. Earlier authored assignments and questions are retained for older attempts and checker fixtures.

## What is included

- **Powtórz błędy** in theory and **Moje prace** starts a training series of up to five current CKE questions from submitted attempts stored in the browser. A correct answer on a later submitted attempt takes that question out of the queue.
- **Przećwicz ten etap** in a completed practical report opens the relevant course stage with a copy of your files when you mark a result as partial or missing.
- The [handbook](docs/handbook.md) includes PHP chapters on XAMPP, POST forms, MariaDB, rendering query results and debugging.
- **Plan nauki** saves your exam date and minutes per day in this browser. After a simulated exam, marking SQL or PHP as partial or missing can suggest one practice step from another CKE paper. The plan can resume that step from your saved project.
- **Mam 15 minut** offers `JOIN` with **Chat** and **Baza Smoków**, `GROUP BY` with **Poziomy rzek** and **Moje zadania**, and PHP `POST` with **Poziomy rzek**. The SQL exercises give feedback on query structure and save drafts locally. The PHP exercise opens a single course step with a starter form and links to the original paper.
- **Baza i PHP** runs selected SQL or the whole draft against your own MariaDB dump. Open a PHP page, follow project links and submit text forms from its preview. Each run starts with a fresh database. In **Poziomy rzek**, **Nauka** can compare the output of query 3 with a reference on the imported data and show column or row differences. See [local setup](docs/local-development.md#php-and-sql-workbench) and the [limited public pilot](docs/checking.md#limited-public-runtime-pilot).
- Three learning levels and **Nauka**, **Trening** and practical **Egzamin** modes.
- **Egzamin** runs on a simulated workstation: 10 minutes of reading time with only the paper open, then the 150-minute clock. A practice candidate number names the results folder and the `<number>.zip` archive; real PESEL numbers are refused. A taskbar switches between the paper, the project, the database view and the folder, and shows the remaining time. Helpers, criteria and external links stay hidden until hand-in, which checks the folder against the paper's list before a simulated disc is burnt. Start it from **Próbny egzamin** in **Arkusze** or draw a paper on **Jak wygląda egzamin**.
- A project editor, isolated HTML/CSS/JavaScript preview, project ZIP import/export and local completion records. The current CKE papers have no automatic grading adapter; completion does not award a score.
- An original PDF viewer with page navigation and separate reading guidance. Guidance stays hidden until completion in Egzamin mode. See [original PDFs and reading guidance](docs/reading-exam-pdfs.md).
- Cumulative learning for all fifteen papers: one explanation and one small change in the actual project files. Switching steps never replaces code. HTML/CSS checks explain their findings; selected JavaScript behaviours use the trusted worker, while PHP, SQL and graphics have explicit manual checks. A versioned course, active file, cursor and project are saved locally. `!` followed by Tab inserts a basic HTML document. Legacy notebooks remain readable; examples and [external solutions](docs/solution-sources.md) stay separate from the project and unavailable during an unfinished Egzamin attempt.
- In **Nauka**, a step check can take you from a step check to the relevant HTML or CSS in your project. Choose **Pokaż w kodzie** to select the fragment or **Otwórz plik** for file-level guidance. After editing, choose **Sprawdź ponownie**.
- Explore your own static page in an unfinished **Nauka** project with **Zbadaj stronę**. Select an element in the preview or the keyboard-accessible element list to open its HTML in the editor. A compact explanation shows matching CSS rules, actual preview values and a labelled box model; CSS links open your own declarations. **Pokaż odstępy** highlights supported spacing geometry. On a phone, selection opens **Kod**, with **Wróć do podglądu** to return. Escape ends inspection. The inspector runs locally, preserves your code and Undo history, and does not award a score.
- **Zmień i zrozum** connects a small HTML/CSS edit to its result in supported **Nauka** steps. Read the short explanation, optionally predict the result, then write your own change. **Porównaj przed i po** switches between the page at the saved step checkpoint and the current page; **Co zmieniłem?** shows changed source lines. Switching views never replaces your code. Explicit restoration first preserves the newer work as a separate project in **Moje prace**. Checkpoints and predictions stay in the browser and travel with progress backups. See [comparison and safe restoration](docs/change-understand.md).
- The HTML editor suggests Emmet abbreviations, including in the HTML portions of PHP files. Type `div` or `ul>li*3` and press Tab to expand it. Use Undo to restore the abbreviation.
- **Pisz szybciej** teaches HTML abbreviations alongside the relevant steps in unfinished **Nauka** courses. Learn `link:css`, nesting, text, repetition and grouping through short Polish explanations and expandable HTML examples. **Skróty HTML** is an optional reference inside the lesson; **Kopiuj skrót** copies only to the clipboard. Match filenames to the paper yourself, and keep correct existing code. No separate trainer, CSS property shortcuts or new completion requirements are added. See [Emmet learning](docs/emmet-learning.md).
- A Liquid Glass interface with five sections: **Nauka**, **Arkusze**, **Teoria**, **Moje prace**, **Pytania i odpowiedzi** (FAQ). The workspace places the lesson, editor and preview together, with labelled tabs on smaller screens.
- A focused **Nauka** workspace for laptops, Full HD and QHD monitors. **Krok** keeps the current instruction and checking together, **Pomoc** holds examples and Emmet, and **Eksperyment** opens **Zmień i zrozum** where available. Files use a horizontal strip; on laptops **Kod / Podgląd** share the right pane, while wider screens show both. Switching tools preserves project files and editor Undo.
- Light, dark and system colour themes, with a saved browser preference and a picker in the navigation and project workspace. Original examination PDFs and learner previews keep their own colours.
- [51 reviewed FAQ answers](docs/faq.md) in eight categories, with search, direct links, source references and dated examination rules. The XAMPP and MariaDB category includes Windows screenshots, Apache, PHP and database troubleshooting, and a local rehearsal with a downloadable SQL sample. Administrators publish new immutable revisions through ordinary fields.
- Theory learning and practice uses 25 examples from the 2022 informator and 39 tasks from CKE's 2024 sample paper. Learners can choose a topic, take a short set or work through all 64 questions. The 2024 paper uses the platform's independently checked answers. [Theory sources](docs/sources.md#published-theory-examples)
- **Test jak na egzaminie** draws 40 public CKE questions for a 60-minute training series in the layout described in the CKE informator. Learners can answer in any order, see which answers are missing and submit after answering every question.
- **Co nowego** lists the published releases in Polish. The public server also provides `robots.txt` and `sitemap.xml`.
- Browser-local progress, draft recovery and a portable backup. Student registration and cross-device synchronisation are not included.
- An administrator panel at `/admin` for versioned content, source metadata, checking controls and aggregate operational statistics. Public pages link to the [owner](https://t.me/tutuu9); there is no administrator shortcut in the footer.
- Optional DeepSeek assistant, disabled without a key and an administrator setting. It reads the original paper, the learner's files and the findings of local checks, points at the mistake and explains it; it does not run code or award a score. The initial application budget is **$2 total**, not a renewing subscription.

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
npm run test:site-config
```

Integration tests need the project PostgreSQL service and generated Prisma client. API tests create a separate test database; checking tests need the sandbox image. Browser test prerequisites are described in [local development](docs/local-development.md). These commands describe the verification process, not a claim that every environment has been certified.

## Material sources and limitations

Every newly offered assignment and theory question refers to a verified published CKE document. An official publisher and an archive copy are distinguished; uncertain rights, missing attachments and unsupported automatic checks are explicitly recorded. The viewer retrieves reviewed source PDFs without rewriting them or retaining permanent server copies. No third-party exam archives are bundled. See the [source register](docs/sources.md).

The theory pool uses published samples with partial syllabus coverage. It omits the informator's video-based example and the sample paper's question with conflicting image extensions. The informator's CSS ambiguity is explained using the published text and key. Cumulative guides map to the original requirements; neither their examples nor downloaded third-party solutions are certified submissions. Use your own PHP/SQL environment when the workbench is unavailable. Review the finished project against the original paper. Supported educational checks do not produce an official CKE score.

The Windows development profile is **not a certification for public anonymous code execution**. Public checking requires the Linux/gVisor profile and separate isolation and resource verification. The separate [public site deployment](docs/site-deployment.md) serves courses, PDF, theory, the editor and browser HTML/CSS checks without a worker. DeepSeek can be enabled separately for the API with a private key, learner consent and the existing budget controls; initialization leaves it disabled. Its standalone Compose profile uses a prebuilt image; deployment remains a manual, authorized operation: the owner starts the `Deploy public site` GitHub Actions workflow by hand for a `main` commit that passed Checks. `test:site-config` checks both configurations with synthetic credentials and needs the Docker Compose CLI.

## Repository guide

- `apps/web`, `apps/api`, `apps/worker`: browser application, NestJS API and trusted worker.
- `packages/shared`, `packages/content`, `packages/database`, `packages/checker`: contracts, source-backed content metadata, persistence and checking.
- `fixtures/content`: alternative correct solutions and intentional mistakes, excluded from public content.
- `docs`: [content format](docs/content-format.md), [architecture](docs/architecture.md), [checking](docs/checking.md) and [roadmap](docs/roadmap.md).

Contributions follow [CONTRIBUTING.md](CONTRIBUTING.md). Project code, explanatory commentary and original fixtures are provided under [MIT](LICENSE); CKE papers and other third-party material retain their own status. Font notices are preserved in [third-party notices](docs/third-party-notices.md).
