# Roadmap and release criteria

## First release scope

The current release uses CKE INF.03 assignments and questions exclusively: three original practical papers, 25 static examples from the official informator and twelve explanatory lessons. The user's CKE-only requirement supersedes the earlier authored-project and 80-question target. Authored content survives only in historical compatibility and regression fixtures. A source-backed paper and a fully verified automatic checking adapter are separate levels of support.

| Stage                     | Deliverable                                                             | Evidence required                                                                                     |
| ------------------------- | ----------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Foundation                | Reproducible local environment, content contracts and one PHP/SQL check | Fresh setup, working migration/seed, measured execution and cleanup                                   |
| Complete learning journey | Levels, modes, editor, ZIP submission, reports and repeat attempts      | Reload recovery, correct version binding and private report access                                    |
| Initial content           | Three CKE papers, twelve explanatory lessons and 25 static CKE examples | Verified source documents, page crops, answer keys, provenance and unsupported-feature labels         |
| Administration and AI     | Versioned publishing, source preview/import, controls and budget        | Authentication/CSRF, immutable published versions, atomic reservations and uncertain-billing handling |
| Public readiness          | A measured and tested Linux/gVisor environment                          | Isolation, real resource limits, failure cleanup and load results on the selected host                |

This table defines acceptance criteria. It is not a claim that the public environment or every test has already passed. Consult actual check output and release notes for observed results.

## Next increments

1. Expand each topic using mistakes seen in aggregate checking outcomes and reviewed learner feedback.
2. Verify original examination packages and prepare task-specific adapters without mixing original and educational scoring.
3. Improve image/layout assessment while preserving explicit manual review where reliability is limited.
4. Add interactive PHP preview only with an execution lifecycle, isolation and resource policy suitable for long-lived sessions.
5. Plan INF.04 as selected language/runtime tracks. Editing a file is not equivalent to compiling it, running its desktop/mobile GUI or automatically assessing it.

## Unresolved environment questions

The target VPS operating system, CPU, available RAM, disk and existing workloads are unknown. Public gVisor compatibility and peak resource use must be measured there. No deployment should be described as completed from a successful Windows development run.

The first version does not include student accounts, cross-device sync, a full offline site, automatic source crawling, payments, social features, Kubernetes or a universal checker for arbitrary projects.
