# Examination sources and rights register

All newly offered practical assignments and theory questions refer to published CKE materials. This repository stores metadata, reviewed page references and separate platform commentary. It does not bundle third-party examination PDF/ZIP/7z files or claim comprehensive coverage of every session. The original-PDF viewer fetches reviewed sources on demand without rewriting the document or retaining a permanent server copy.

## Primary entry points

- [CKE portal](https://egzaminy.gov.pl/cke)
- [CKE BIP: Formula 2019 informators](https://bip.cke.gov.pl/artykul/212/1660/egzamin-zawodowy-formula-2019)
- [ZPE: vocational examination overview](https://zpe.gov.pl/a/egzamin-zawodowy/DOg0XjgOj)
- [CKE written examples and publication policy](https://cke.gov.pl/egzamin-zawodowy/egzamin-zawodowy-formula-2019/przykladowe-zadania/pisemny/)

CKE's written-examination page states that examination papers, the question bank and the selection algorithm are not published. Published examples are not the entire live question bank. Earlier authored questions remain archived for compatibility; they are excluded from new learner attempts.

## Practical source records

| Record                                                                                                                         | Evidence checked on 2026-11-02                                                                                          | Remaining gap                                                                                                                                     |
| ------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| [Wędkowanie, official INF.03 example](https://cke.gov.pl/images/_EGZAMIN_ZAWODOWY/Formula_2019/Przykladowe_zadania/inf_03.pdf) | CKE PDF; task-body text matches INF.03-01-22.06-SG. Its external input ZIP entries, SQL and criteria PDF were checked.  | No CKE/OKE-hosted input ZIP confirmed. Example year/session remain unknown. The related criteria have an empty R.2.10 row. No automatic adapter.  |
| [INF.03-01-25.01-SG, Kursy komputerowe](https://www.kursinf.pl/arkusze/inf03/arkusz/3)                                         | Original paper copy; cover identifier/date, input archive entries, SQL structure and matching criteria PDF checked.     | No CKE/OKE-hosted copy confirmed. Source review does not verify a complete running solution. Redistribution rights unknown; no automatic adapter. |
| [INF.03-08-25.06-SG, Baza Smoków](https://www.kursinf.pl/arkusze/inf03/arkusz/95)                                              | Original paper copy; cover identifier/date, input archive entries, SQL relationships and matching criteria PDF checked. | No CKE/OKE-hosted copy confirmed. Source review does not verify a complete running solution. Redistribution rights unknown; no automatic adapter. |

The reviewed archive PDF targets are recorded in `packages/content/src/catalog.ts` and the API's fixed allowlist. They were opened and checked against the catalogue links; no answer-key PDF is substituted for the task sheet. Catalogue revision 3 adds verified input archives and criteria links with recorded hashes, while preserving previous publications. A record's availability of external scoring criteria does not imply a working automatic adapter. See [solution sources](solution-sources.md) for the exact review boundaries and separately identified worked examples; full solution links are kept out of the public catalogue payload.

KURSINF and zawodowe.edu.pl are additional archives, not CKE/OKE. A licence on a solved example must not be assumed to cover the original examination paper, scoring criteria or images. All eight practical records retain an unknown redistribution-rights status. Official hosting and permission to redistribute are separate facts.

The five 2024 additions—Firma IT, Salon kosmetyczny, Motocykle, Chat and Poziomy rzek—are documented in the [expanded source register](courses-2024.md), with separate machine-readable inventories and hashes. Matching papers, input archives and criteria were reviewed; no archive is considered verified solely from its filename. Some criteria copies contain third-party watermarks. Their hashes identify the reviewed copy and do not imply CKE byte identity or permission to republish.

## Published theory examples

The initial source is the [CKE informator for technik programista, updated 25 August 2022](https://bip.cke.gov.pl/attachments/download/8580), linked from the official BIP register. It contains both INF.03 and INF.04; this application uses only the INF.03 written examples on PDF pages 6–17. Do not mislabel it as the separate technik informatyk informator.

- Source identifier: `cke-inf03-informator-2022`.
- Original document: 42 PDF pages.
- Reviewed SHA-256: `4db0fbf07b802fa4d5121baa701f15045f6b6c2e74a17be5fc3c9f2831873cc5`.
- Published examples reviewed: 1–26. Included: 1–11 and 13–26, giving 25 questions.
- Example 12 is excluded because the task depends on an embedded Joomla video that this viewer does not support.
- All included question numbers, printed answer keys, diagrams and crop boundaries were checked. The UI renders the original excerpt rather than transcribing a replacement question. Explanations are separately labelled platform commentary.

The informator prints an answer key alongside its questions. Although the excerpt does not display that line, the original PDF remains available to the browser. This is a learning/practice source, not a hidden-key examination source. No full 40-question simulation is claimed from these 25 examples.

Known source ambiguity: example 10 on page 9 prints a space between `p` and the attribute selector while the official key indicates option C. In CSS, that space changes the selector to match descendants. The intended same-element selector has no space. Keep both the original document and official key unchanged; the feedback explicitly describes the ambiguity. This is an editorial explanation by the platform, not an official CKE erratum.

## Catalogue and review workflow

1. Start from an official source; use an additional archive to fill gaps with explicit attribution.
2. Read the identifier from the document. Do not derive a year from a changing catalogue heading.
3. Keep source availability, attachment completeness, criteria, rights and automatic support as separate statuses.
4. Compare identifiers, source URLs and known file hashes to avoid duplicates.
5. Preview imported metadata and resolve duplicates before confirmation. An administrator-entered URL does not automatically enter the PDF proxy allowlist.
6. Review page coordinates, answer keys and external-media requirements before publishing a theory revision. Pin the reviewed PDF hash when coordinates depend on its exact bytes.
7. Prepare and test a dedicated grading adapter before claiming automatic support for a practical paper.

Source verification is manual. Metadata validation does not establish legal permission or prove that a remote link is still available. Rechecking a link requires an actual visit and an updated timestamp. Existing attempts keep their immutable content revision.

## Licensing boundaries

Project code, original explanatory commentary and synthetic checker fixtures use the repository MIT licence. CKE documents and external attachments retain their own rights and provenance. Public download availability does not establish redistribution permission; unverified status remains unknown.

Legacy authored assignments remain private fixtures and compatibility content, not new learner assignments. Do not include real PESEL identifiers, learner submissions, leaked papers or unpublished questions. Font and dependency notices are listed separately in [third-party notices](third-party-notices.md).
