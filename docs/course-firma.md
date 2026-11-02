# Firma IT — course evidence

Task `INF.03-01-24.01-SG`, guide `firma-it-study` version 1, task version 1. The guide is educational commentary alongside the original paper, not an official CKE solution or score. All steps edit the attempt's existing files; examples never replace a file automatically.

## Requirement mapping

| Paper page | Route                              | Covered requirements                                                                                                                                                                     |
| ---------- | ---------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 3          | structure                          | HTML5, Polish language, encoding, title, external CSS, favicon, section-based shared structure                                                                                           |
| 4          | common / home / services / contact | Three menu links, animated banner, semantic strong author; home paragraph; ordered service list; two-column six-row contact table, control types and reset; result below horizontal rule |
| 4          | appearance                         | Every specified colour, size, spacing and font; menu hover; button tag selector; two top blocks and shared stylesheet                                                                    |
| 5          | javascript / runtime               | Read controls, consent branches, uppercase names, line break, issue text, red/Navy feedback, repeated interactions, meaningful identifiers                                               |
| 2          | graphics                           | Original source, 100×100 transparent logo; proportional 200px photo; two transparent 1000×200 banners with serif italic blue text                                                        |
| 3          | animation                          | Two alternating frames, 3000ms delay, actual GIF export and uncropped delay screenshot with taskbar                                                                                      |
| 6          | delivery                           | Browser record, every required output, exported-copy check and paper-specific hand-in instructions                                                                                       |

The route chooses PNG for alpha-capable images and a separate `kontakt.js`; the paper allows other alpha-capable formats and extra files. These choices are explained, not presented as additional CKE requirements. No database work belongs to this task.

## Provenance verified 2026-11-02

The KURSINF source page is <https://www.kursinf.pl/arkusze/inf03/arkusz/27>. The downloaded paper has matching task code; no third-party watermark was detected in that copy. This does not prove byte identity with CKE. Redistribution rights are unknown; only verified links are published.

| Artifact      | SHA-256                                                            | Verification                                                                    |
| ------------- | ------------------------------------------------------------------ | ------------------------------------------------------------------------------- |
| Paper         | `875fd2ae7d10aafcaaa9679d86be3e9c684c875189eb4cf9d2d96156cb7de939` | Six task pages plus trailing hand-in pages; all requirements read               |
| materialy1.7z | `14f6ae4bf8f040b74d9f1fef4c1fd7b277016b9a49c09f0eb6f479a1186dbc8d` | Password `m@t3rialyX`; original `grafika.jpg` 655×411; no completed solution    |
| Criteria      | `f517b0bf6e221ed479733d72144a19484c7341ffa0f14acbdc9fcc604662325d` | Matching code, graphics/HTML/CSS/script requirements; third-party archived copy |

Exact download URLs are preserved in the guide's resources and the catalog provenance. Downloaded archives and visual evidence remain ignored temporary files.

## Validation boundary

Two private fixtures implement the complete text/code deliverables using flex + explicit DOM nodes and floats + named controls + text content. They deliberately vary IDs and implementation technique. Graphics and screenshots remain listed as `manualAssets`; no fabricated images or fake screenshots stand in for those results.

Structural tests accept both fixtures and reject wrong textarea dimensions, a non-semantic author emphasis and a wrong e-mail input type. The fixed `firma-contact` runtime scenario is selected only for `runtime/runtime-check`. It must exercise both consent states, alternative data, repeated clicks and reset without requiring particular function names. Runtime success is partial evidence; layout, source-level selector requirements, original graphics, timing and screenshots still require manual review.
