# Checking solutions

## What is evaluated

Only tasks with a supported declarative adapter are executable. The existing adapters cover three legacy authored regression projects: Biblioteka szkolna, Kalkulator warsztatów and Klub planszówkowy. These are no longer offered as new learner assignments. All current public practical assignments are original CKE INF.03 papers with catalogue-only support; they allow local work and manual completion, but reject automatic checking until an adapter for that exact paper is prepared and verified.

Checks inspect expected files, rendered DOM and computed CSS, fixed JavaScript behaviour, PHP output, MariaDB query results and selected image metadata. PHP/SQL run in the exam database environment, never in the platform PostgreSQL database. Correctness is based on requirements and behaviour, not byte-for-byte similarity with a model answer.

Prepared fixtures contain multiple valid implementations and specific defects. Additional database probes help distinguish a live query from hardcoded output. Private checking specifications and fixtures are excluded from the public bootstrap. An open-source self-study platform cannot prove that a learner did not inspect its code or use outside assistance.

Structural checks have a limited meaning. In the workshop project, separate criteria confirm table content, three data rows, header cells and a caption. They do not establish that every price belongs to the correct course or that headings and labels make sense. Library and club checks use the trusted task database; they do not prove that the learner imported their own submitted SQL file correctly. These requirements, HTML escaping and other unchecked implementation details are listed in each project's manual review criterion. For the club project, that review also includes the aggregate column alias and body text colour.

## Result semantics

Each criterion is `passed`, `failed`, `manual`, `unchecked`, or `error`. The report includes evidence and a next step, plus confirmed points, checked points and total possible points. An overall percentage is emitted only when every criterion has a conclusive automatic result. The initial projects include manual review criteria, so a partial report deliberately has no overall percentage.

An infrastructure failure is a failure to assess, not a failed learner criterion. Official criteria, additional educational checks and AI explanations are separate concepts. All current project criteria are original educational criteria, not official CKE scoring.

## Upload boundary

The API accepts project files or one ZIP. Limits are 10 MiB compressed upload, 50 MiB extracted content and 500 files. Paths must remain relative to the project. Traversal, absolute paths, duplicate/conflicting names, links, nested archives and unsupported file types are rejected. Uploaded environment definitions are never executed. Limits are enforced while reading, not only trusted from archive headers.

The current submission path supports ZIP, not arbitrary archive formats. Linked original 7z files are catalogue resources and are not executed by the importer. A learner using a downloaded source package can prepare the required project files and submit them as ZIP.

## Execution boundary

The trusted worker claims at most one job at a time using PostgreSQL locking. It loads the immutable task revision, constructs fixed sandbox arguments and does not accept uploaded Dockerfiles or installation commands.

The sandbox image contains PHP 8.4, MariaDB 11.4, Chromium and the trusted check controller. PHP, MariaDB and Chromium use distinct unprivileged users; the small controller has the container-local capabilities required to start those processes. The source mount and root filesystem are read-only. Writable scratch areas are bounded tmpfs. There is no platform secret or Docker socket inside the sandbox.

The sandbox has no external network; services needed by the check communicate inside its own environment. Initial limits are one CPU, 2 GiB memory including swap ceiling, 256 processes, a 120-second host deadline, a shorter in-container deadline and a 1 MiB host output limit. These are bounds, not a VPS sizing recommendation.

The worker removes the container and temporary source tree in cleanup paths. It also handles expired job leases after a restart. Source files are removed after processing; reports expire or are acknowledged separately.

## Local and public profiles

`local-development` uses ordinary Docker Linux containers on a loopback-only development system. Docker Desktop with WSL2 supports Windows development. This profile is for development and own examples; it is not evidence that arbitrary public uploads are safely isolated.

`public-sandbox` requires the `runsc` runtime, cgroup v2 and Docker-reported CPU/memory/process-limit support. It also requires an explicit environment verification flag. Missing runtime support fails closed; there is no silent fallback from gVisor to runc.

The public profile has **not been certified on the unknown target VPS or by the Windows development environment**. Before enabling it, test real limit enforcement, PHP/MariaDB/browser compatibility, host/network isolation, cross-job isolation, archive attacks, runaway processes, output exhaustion, restart cleanup and queue overload. Merely setting `PUBLIC_SANDBOX_VERIFIED=true` is not such a test.

## Adding a check

Extend the fixed checker whitelist and implementation together. Add a meaningful positive case, at least one alternative correct implementation where allowed, and a focused negative case. Keep sensitive evaluator state outside the student's permissions. Return `manual` or `unchecked` for requirements that cannot be reliably proven, and make the limitation visible in Polish.
