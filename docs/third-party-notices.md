# Third-party notices

The repository MIT licence covers the project's original code, explanatory commentary and synthetic fixtures. It does not replace licences of installed dependencies or grant rights to CKE examination materials.

## Fonts

The web application bundles fonts locally through Fontsource; it does not need to fetch them from a remote font service while a learner uses the site.

- Source Sans 3: installed package `@fontsource/source-sans-3`. The supplied font notice and SIL Open Font License 1.1 are preserved verbatim in [source-sans-3.OFL.txt](licenses/source-sans-3.OFL.txt).
- IBM Plex Mono: installed package `@fontsource/ibm-plex-mono`. The supplied IBM copyright notice and SIL Open Font License 1.1 are preserved verbatim in [ibm-plex-mono.OFL.txt](licenses/ibm-plex-mono.OFL.txt).

Preserve these notices when redistributing built font files. The authoritative installed versions are recorded in the npm lockfile; review their licence files when updating them.

## Libraries and system runtimes

React, NestJS, Prisma, CodeMirror, Vite, the icon library, supporting npm packages, and the PHP/MariaDB/Chromium container components retain their respective licences. The dependency lockfiles and Dockerfile identify what is used. Do not replace their notices with the project's licence.

## Examination links

The repository records source URLs, metadata and page references, without bundling examination PDFs or archives. The application retrieves reviewed original PDF bytes for its viewer and theory excerpts; it does not rewrite them or retain permanent server copies. CKE-hosted sources and archive copies are identified separately. Their rights are not inherited from this repository or from a separately licensed solution. See [sources](sources.md) for the verification gaps, the pinned theory-source hash and the known source ambiguity.
