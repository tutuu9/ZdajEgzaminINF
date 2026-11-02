# Poziomy rzek cumulative course

This course adapts **INF.03-03-24.06-SG**, June 2024, Formuła 2019, 150 minutes. Guide `poziomy-rzek-study`, task `inf03-03-24-06-sg`, task version 1, guide version 1. The explanations are independent teaching material; the original paper remains the specification and no official grading is implied.

The initial files are a minimal HTML scaffold in **`poziomRzek.php`** (capital R), plus empty `styl.css`, `kwerendy.txt` and `przeglądarka.txt`. Every action edits the same project. Examples indicate their insertion location, never reinitialize files and never insert themselves. All activity-to-PDF references are recorded by `project.coverage`.

## Requirement map

| PDF page | Sections                               | Requirements covered                                                                                                                                                                    |
| -------- | -------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 3        | `html`                                 | HTML5, Polish language/encoding, exact filename, title, external CSS, two banner blocks, menu, left/right content, footer, map and banner heading                                       |
| 3        | `form`, `table`                        | Same-page POST, one group of three radio options, labels/common class, submit, historical date, five table headings and a place for dynamic rows                                        |
| 4        | `information`                          | Three fixed historical messages, heading for averages, communication link, original river image, signature                                                                              |
| 4        | `layout`, `details`                    | All colors, fonts, dimensions, split widths, padding/margins, radio hover, required table tag selector, border/automatic margins, row hover and image width                             |
| 3        | `graphics`                             | Original input extraction, transparent map exterior, blue Lower Silesia region, preserved other map regions and river image                                                             |
| 2        | `database`, `queries`                  | Database/collation, import and PNG evidence, all four cumulative SQL queries and separate full-screen JPEG screenshots                                                                  |
| 4–5      | `php-form`, `php-rows`, `php-averages` | Connection, allowlisted form choice, the three filters, dynamic five-column results, date-grouped averages, meaningful identifiers, final connection close and manual behavioral checks |
| 5        | `delivery`                             | Actual browser name, all eleven deliverables, own screenshots, readable local/exported copy, original media handover requirements                                                       |

The form description explains that POST does not itself encrypt traffic. Code examples select fixed SQL conditions from allowed choices; raw POST values are not appended as SQL. Radio names, values, classes and IDs are implementation choices, not arbitrarily imposed requirements. Equivalent query-2-plus-PHP filtering is explicitly accepted by the paper and represented in the second fixture.

The input schema is `wodowskazy(id, nazwa, rzeka, stanOstrzegawczy, stanAlarmowy)` and `pomiary(id, wodowskazy_id, dataPomiaru, stanWody)`. There are 17 gauges and 34 measurements on two dates. The relation is `wodowskazy.id = pomiary.wodowskazy_id`. Query 2 restricts **2022-05-05**; query 3 adds strict `stanWody > stanOstrzegawczy`. Original data yield 17 total, 5 warning and 1 alarm record. Warning: Jarnołtów, Łazany, Jelenia Góra, Nowogrodziec, Bardo; alarm: Łazany. Equality does not mean “above”. Grouped averages are approximately 167.6471 for 2022-05-05 and 179.5882 for 2022-05-06. Both dates remain visible regardless of the table filter.

## Source verification

Verified **2026-11-02** against the actual downloaded paper, criteria and archive contents. Cover and criteria codes were visually checked. Files are third-party archive copies with unknown republication rights. No authoritative CKE byte hashes were found; byte identity with an official-hosted original is not claimed. The downloaded paper has no detected visible third-party watermark; the criteria copy may carry archive markings.

- [Source catalogue](https://www.kursinf.pl/arkusze/inf03/arkusz/17)
- [Task paper copy](https://nuwaflrhlwnsdvnciltx.supabase.co/storage/v1/object/public/kursinf_main/exam_sheets/inf03/1753525727422_sheet.pdf)
- [Original input archive copy](https://nuwaflrhlwnsdvnciltx.supabase.co/storage/v1/object/public/kursinf_main/exam_sheets/inf03/1753525728237_files.zip), `pliki3.zip`, public exam password `St@ny%RzeK`.
- [Criteria copy](https://technikinformatyk.pl/practical_exam_attachments/1758023229_inf_03_2024_06_03_SG_zo.pdf)

| Artifact               | SHA-256                                                            |
| ---------------------- | ------------------------------------------------------------------ |
| Paper                  | `66d22d97430a9d33d5af2a34684a92aa5f41890fcd5a26bb08cc838e9a89375f` |
| Archive (85,662 bytes) | `ee7b625cccb2e88683d29326c1354fbb39f7ad65ef38e1437d591d386e6f16a8` |
| Criteria               | `004833b11a11af23bb2ea63c6bdd3af8cd5e4e7d8fbde844042bb8604221d35e` |

Archive inspection found three regular files, 93,746 expanded bytes, no traversal/link/nested archive or duplicate/case-colliding paths. Originals and research renders stay in ignored temporary storage. Original image dimensions are 100×100 (`obraz1.png`, RGB) and 450×253 (`obraz2.jpg`). No input SQL or code was executed as part of source inspection.

## Validation boundary

PHP, SQL, map editing, screenshot authenticity and layout interpretation are manual checks. The HTML and selected CSS checks apply before PHP is added; the client then intentionally requires local inspection rather than executing templates. A manual confirmation is not an automatic pass or CKE score.

The private fixtures provide independent MySQLi/SQL-filter/float and PDO/PHP-filter/grid implementations. Both dynamically derive results and averages. Original images and screenshots are explicitly absent manual assets. Content tests parse PHP syntax without execution, accept both static HTML structures, check cumulative coverage/minimal starter files, and reject targeted wrong-language, wrong-filename, wrong-method, missing-radio, wrong-heading, wrong-date, missing-alt and wrong-link mistakes. They do not prove live PHP/database behavior or perform raster edits. Run `npx vitest run tests/new-php-study-content.test.ts` for these checks.
