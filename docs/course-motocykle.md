# Motocykle cumulative course

The course adapts **INF.03-01-24.06-SG**, June 2024, Formuła 2019, 150 minutes. Guide `motocykle-study`, task `inf03-01-24-06-sg`, task version 1, guide version 1. Teaching notes are independently authored explanations of the paper, not official answers or an official grade.

The initial project contains only a minimal `motor.php` HTML document and empty `styl.css`, `kwerendy.txt`, and `przeglądarka.txt`. Navigation never replaces files. Examples are incremental insertions with placement instructions. Each activity is mapped to the relevant PDF page by `project.coverage`.

## Requirement map

| PDF page | Guide sections          | Coverage                                                                                                                                                                                                     |
| -------- | ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 3        | `html`, `content`       | HTML5, Polish language/encoding, title, external style, semantic banner/left/two right/footer blocks, body-level motor image, headings, definition and ordered lists, three statistics paragraphs, signature |
| 4        | `layout`, `appearance`  | All widths/heights/margins/padding, overflow, Verdana, percentage font sizes, RGBA colors, image positioning/layer, shadows, required h1/h2 tag selectors, link/dt/dd styles and hover                       |
| 3        | `graphics`              | Original input extraction, resize droga1 from 1000×750 to 640×480, preserve the other images, local file verification                                                                                        |
| 2        | `database`, `queries`   | Database name/collation, import, four queries, full-screen PNG import evidence and separate JPEG query evidence                                                                                              |
| 4        | `php-list`, `php-count` | Local connection/charset, relational query, dynamic dt/dd and photo links, COUNT output, meaningful names, final connection close, real-browser inspection                                                   |
| 5        | `delivery`              | Actual browser name, all 15 required files, own evidence, readable exported/local copy and original handover instructions                                                                                    |

PHP, SQL, raster editing, screenshots and layout details requiring visual interpretation are explicitly manual. HTML structure and selected stable CSS properties are checked before adding PHP. The current client intentionally switches HTML/CSS checks to manual when PHP occurs; it does not execute templates in the browser. This is an explicit boundary, not a failed learner result. No server adapter or numerical score is claimed.

The supplied schema has `wycieczki(id, zdjecia_id, nazwa, opis, poczatek, koniec)` and `zdjecia(id, zrodlo, alt)`. `zrodlo` contains `droga1`–`droga5` **without the extension**. Query 1 returns Dolina Popradu and Alter-Zakopianka; query 2 returns ten joined records; query 3 returns 10; query 4 adds integer `ocena`. Instructions preserve queries cumulatively and warn against re-running a destructive import or re-adding the column.

## Sources and verification

Verified on **2026-11-02** by reading the actual paper, assessment criteria and original input archive. The paper cover and criteria code both identify INF.03-01-24.06-SG. These are third-party archive copies; republication rights remain unknown. No authoritative CKE byte hash was available, so byte identity with a CKE-hosted file is not asserted. No visible third-party watermark was detected on the downloaded task paper; that observation is not a provenance guarantee.

- [Source catalogue](https://www.kursinf.pl/arkusze/inf03/arkusz/15)
- [Task paper copy](https://nuwaflrhlwnsdvnciltx.supabase.co/storage/v1/object/public/kursinf_main/exam_sheets/inf03/1753444633550_sheet.pdf)
- [Input archive copy](https://nuwaflrhlwnsdvnciltx.supabase.co/storage/v1/object/public/kursinf_main/exam_sheets/inf03/1753444634214_files.zip), original filename `pliki1.zip`, public exam password `^moTocyKle^`.
- [Assessment criteria copy](https://arkusze.pl/zawodowy/inf03-2024-czerwiec-egzamin-zawodowy-praktyczny-zasady-oceniania.pdf)

| Artifact                        | SHA-256                                                            |
| ------------------------------- | ------------------------------------------------------------------ |
| Paper                           | `87a33c12040b7a958ae97dbbd71a99472bdb83019dcc34731e0fe7d467a32b67` |
| Input archive (1,182,465 bytes) | `073f3bc10c17ba9dc5ccc524dd1256451b09a8fa2d00a3091d5154f684c9f47a` |
| Criteria                        | `5dcd9cdb448f72ff1c68d3ff00d629c35b13e97c73cb5d642cc667ac1479d546` |

Safe archive inspection found seven regular input files, no traversal/link/nested archive or duplicate/case-colliding paths, with 1,197,879 expanded bytes. Downloaded originals, extraction and screenshots remain ignored temporary research evidence, not repository assets. No input SQL or code was executed during this inspection.

## Validation and limits

`fixtures/study/motocykle.ts` contains two independently composed code-only examples: procedural MySQLi and PDO with different semantic blocks and selectors. Both use dynamic database results. Images and evidence are explicitly missing manual assets, never fabricated passing fixtures. The test suite parses PHP templates without execution, checks both static HTML structures against the learning checks, checks requirement coverage/minimal initialization, and rejects targeted wrong language/title/style/image/list structures. These tests do not claim live database, image processing or full visual validation. Run `npx vitest run tests/new-php-study-content.test.ts` for the content checks.
