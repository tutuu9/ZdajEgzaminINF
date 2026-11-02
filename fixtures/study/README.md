# Private cumulative-project fixtures

`projects.ts` contains independently authored source code for the three published CKE paper routes. It is deliberately outside public package exports.

- Kursy: direct conditionals and an alternative reduction/DOM implementation.
- Smoki: one reusable navigation function and an alternative with three named navigation functions.
- Wędkowanie: MySQLi/float and PDO/Grid variants.

`validStudyProjects` means the automatable code portions are intended to satisfy the guide's contracts. `manualAssets` records excluded third-party images, original description text and personal screenshots. The Smoki description used here is plainly identified synthetic test text; it is not the original `opis.txt`. These fixtures must not be described as complete CKE-approved submissions.

`invalidStudyProjects` contains changed prices, ignored city selection, incorrect language, table border, visibility, active colors, alternative image text and cell padding. Each identifies the activity that should detect it. Runtime tests must use the isolated runner, not execute uploaded code in the API. Static PHP extraction checks the template only and does not execute PHP.

Do not copy original archives or third-party complete solutions into this directory. Their provenance and external links are documented in `docs/solution-sources.md`. SQL queries use actual source schema names, but local credentials are educational examination data only.
