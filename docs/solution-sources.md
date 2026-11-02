# Reviewed examination inputs and external solutions

Reviewed on **2026-11-02**. These are external resources for the three current practical assignments. Original input archives, worked-solution archives and scoring documents serve different purposes. The application links to full third-party solutions; it does not relicense or bundle their code as MIT. Its short teaching fragments and explanations are written separately from the original CKE requirements.

The listed input archives, six solution ZIPs and three criteria PDFs were downloaded to an ignored temporary review folder. Archive contents were listed, SQL definitions and solution documentation were read, and requirements were compared. **No code or installation script from a third-party worked solution was executed.** The separate runtime review imports the inspected original task SQL into isolated temporary databases and runs only the platform's own teaching snippets. This is not a claim that every supplied external solution passes every criterion.

## Wędkowanie — CKE example

The [original CKE PDF](https://cke.gov.pl/images/_EGZAMIN_ZAWODOWY/Formula_2019/Przykladowe_zadania/inf_03.pdf) remains the authoritative task. Its task-body text on pages 2–5 matches the [archived INF.03-01-22.06-SG paper](https://zawodowe.edu.pl/arkusz-praktyczny/inf03-2022-czerwiec-01/arkusz.pdf); the inspected textual differences were page footers and archive watermarks. This establishes content correspondence, not a new date or identifier for the unnumbered CKE example.

- [Input pliki1.zip](https://zawodowe.edu.pl/arkusz-praktyczny/inf03-2022-czerwiec-01/zalacznik/36/pliki1.zip): 136,154 bytes, containing `baza.sql` and `ryba1.jpg`. It uses the password printed in the CKE task. SHA-256: `5c807a8473dc93bbefd909c830e4b46d7c943a95fd30b02695aee667f140c7db`.
- [Basic walkthrough](https://zawodowe.edu.pl/arkusze-praktyczne/inf-03/inf03-2022-czerwiec-01/rozwiazanie/) and [solution ZIP](https://zawodowe.edu.pl/arkusze-praktyczne/inf-03/inf03-2022-czerwiec-01/rozwiazanie/pobierz.zip): 53,923 bytes; `wedkuj.php`, `styl_1.css`, `kwerendy.txt`, `przeglądarka.txt`, a processed image and README.
- [PDO/Grid comparison walkthrough](https://zawodowe.edu.pl/arkusze-praktyczne/inf-03/inf03-2022-czerwiec-01/rozwiazanie/nowoczesny/) and [variant ZIP](https://zawodowe.edu.pl/arkusze-praktyczne/inf-03/inf03-2022-czerwiec-01/rozwiazanie/nowoczesny/pobierz.zip): 54,532 bytes. Static inspection confirmed PDO and a CSS Grid layout.
- [Criteria PDF for INF.03-01-22.06-SG](https://zawodowe.edu.pl/arkusz-praktyczny/inf03-2022-czerwiec-01/klucz-odpowiedzi.pdf): 342,238 bytes; its header identifies that specific numbered paper. The copy contains an empty R.2.10 row, so do not infer a reliable percentage by counting rows.

The input SQL contains the required `ryby`, `lowisko` and `okres_ochronny` tables, plus unrelated tables. Do not describe this archive as containing exactly three tables. Real table names are lowercase; the relationship field is spelled `Ryby_id`. The 2022 criteria explicitly permit MySQLi or PDO. The example does not prescribe `float`, but its required tag selectors and other CSS properties still apply to a Grid implementation. No CKE/OKE-hosted copy of this input ZIP was confirmed in the reviewed sources.

## Kursy komputerowe — INF.03-01-25.01-SG

The [KURSINF source page](https://www.kursinf.pl/arkusze/inf03/arkusz/3) links the original task copy and its input archive.

- [Input pliki10.7z](https://nuwaflrhlwnsdvnciltx.supabase.co/storage/v1/object/public/kursinf_main/exam_sheets/inf03/1753367876851_files.7z): 164,122 bytes; `baza.sql` and `klawiatura.jpg`. SHA-256: `75ad4c759d3efe6af48e45400e8da344203057173740adfff3004dd095b48f1d`.
- [Basic walkthrough](https://zawodowe.edu.pl/arkusze-praktyczne/inf-03/inf03-2025-styczen-01/rozwiazanie/) and [solution ZIP](https://zawodowe.edu.pl/arkusze-praktyczne/inf-03/inf03-2025-styczen-01/rozwiazanie/pobierz.zip): 125,196 bytes; both HTML pages, CSS, queries, browser note, banner and README.
- [Grid/separate-JavaScript walkthrough](https://zawodowe.edu.pl/arkusze-praktyczne/inf-03/inf03-2025-styczen-01/rozwiazanie/nowoczesny/) and [variant ZIP](https://zawodowe.edu.pl/arkusze-praktyczne/inf-03/inf03-2025-styczen-01/rozwiazanie/nowoczesny/pobierz.zip): 125,859 bytes; additionally uses `raty.js`.
- [Criteria PDF](https://zawodowe.edu.pl/arkusz-praktyczny/inf03-2025-styczen-01/klucz-odpowiedzi.pdf): 661,793 bytes; its header matches the requested paper.
- [Independent code listing at EE-Informatyk](https://ee-informatyk.pl/inf03-ee09/praktyka/INF.03-01-25.01-SG-rozwiazanie) is an additional comparison source. No reusable code licence for that listing was established during this review.

The input schema contains `buty`, `kategorie` and `produkt`. Foreign keys connect `buty.id_kat` to `kategorie.id_kat` and `produkt.model` to `buty.model`. This footwear database is intentionally separate from the course-price calculator. The original page-4 illustration was visually checked: React.js is 220 hours/5000, JavaScript 150 hours/3000.

The criteria allow the click handler in HTML or JavaScript, so `addEventListener` is an acceptable method. CSS still requires tag selectors for specified elements. Neither a separate script nor a modern layout excuses missing required classes, files, values or behaviour. The basic ZIP README includes an inaccurate generic sentence about executing an `UPDATE`; this task grants UPDATE permission rather than requiring a data-update query. Do not repeat that sentence as a task requirement.

## Baza Smoków — INF.03-08-25.06-SG

The [KURSINF source page](https://www.kursinf.pl/arkusze/inf03/arkusz/95) links the original task copy and its input archive.

- [Input pliki7.7z](https://nuwaflrhlwnsdvnciltx.supabase.co/storage/v1/object/public/kursinf_main/exam_sheets/inf03/1761142765820_files.7z): 2,781,777 bytes. Contains `pliki7/bazasmoki.sql`, `opis.txt` and `smok1.JPG`, `smok2.JPG`, `smok3.JPG`. SHA-256: `6c6aa5a5031988903268d6e3645e880efe6a533ea55b326eea2cfbf07b6d78d3`.
- [Basic walkthrough](https://zawodowe.edu.pl/arkusze-praktyczne/inf-03/inf03-2025-czerwiec-08/rozwiazanie/) and [solution ZIP](https://zawodowe.edu.pl/arkusze-praktyczne/inf-03/inf03-2025-czerwiec-08/rozwiazanie/pobierz.zip): 138,467 bytes; PHP, CSS, `script.js`, queries, browser note, images and README.
- [PDO/Grid comparison walkthrough](https://zawodowe.edu.pl/arkusze-praktyczne/inf-03/inf03-2025-czerwiec-08/rozwiazanie/nowoczesny/) and [variant ZIP](https://zawodowe.edu.pl/arkusze-praktyczne/inf-03/inf03-2025-czerwiec-08/rozwiazanie/nowoczesny/pobierz.zip): 139,276 bytes; also includes `config.php`. Static inspection confirmed PDO, Grid and JavaScript changes to section styles.
- [Criteria PDF](https://zawodowe.edu.pl/arkusz-praktyczny/inf03-2025-czerwiec-08/klucz-odpowiedzi.pdf): 849,948 bytes; its header matches the requested paper.

`udzial.id_smok` references `smok.id`, and `udzial.id_parada` references `parada.id`: the join goes through the participation table. The source uses `parada.rok` as `CHAR(4)`. The inputs' `.JPG` extension casing matters on case-sensitive systems; a learner should match the filename referenced by HTML to the file actually saved. The criteria explicitly permit MySQLi/PDO and multiple layout methods including Grid. Preserve the remaining requirements, especially POST handling and the requested JavaScript style changes; this review is not a complete runtime acceptance test.

## Solution archive limits and licensing

All six worked-solution ZIPs omit the original database import file and the learner's required screenshots. They are therefore not self-contained replacements for the input archives or evidence of the learner's work. Each includes a README identifying the paper, author and source. The downloaded solution archive listings were checked; their code was not executed.

[The publisher's reuse policy](https://zawodowe.edu.pl/arkusze-praktyczne/rozwiazania/zasady/) identifies **Bartosz Bryniarski** and licenses the original solution code/commentary under **CC BY-NC 4.0**, requiring attribution and identification of modifications. It explicitly excludes CKE papers, marking criteria and original task attachments from that licence. Commercial reuse requires separate permission under the publisher's stated terms. External links and a separately authored explanation avoid importing this restricted material into the project's MIT code/content set. Preserve source attribution and do not describe a third-party answer as an official CKE solution.

No matching, clearly licensed GitHub solution repository for these exact three papers was confirmed in this review. A search result for a general MIT INF.03 collection covered different tasks, so it was not substituted. The verified walkthroughs and downloadable variants above satisfy the need for concrete published examples without inventing repository matches.
