# Tasks

## 1. Versioned bounded discovery returns exact task PRs without recording state

- [x] 1.1 Add the opt-in JSON-only mode, version-1 envelope, per-task result shape and recorded-link canonicalization; verify focused fixtures for known, none, unavailable and invalid flag usage.
- [x] 1.2 Add exact worktree/common-directory, explicit branch and origin verification plus bounded GitHub repository/head lookups; verify fake-only cases for workflow, gate, plain, SSH alias resolution, missing identities, foreign branches/forks and ambiguous PRs.
- [x] 1.3 Enforce serial reads, two-second subprocess limits, one-MiB output limits and a ten-second shared deadline with no retries; verify fake runner/clock assertions and a real timeout of a fake subprocess, including unqueried budget-exhausted results.
- [x] 1.4 Document the flag, v1 JSON fields, reason codes and timing/partial-result limits in README.md and docs/status-pr-discovery.md; verify documented examples against fixture output.

## 2. Legacy status and lifecycle compatibility have fake-only integration coverage and a documented app adapter contract

- [x] 2.1 Add integration fixtures proving plain status and JSON retain existing shapes with zero discovery/network calls; verify --all task inclusion and recorded-only short circuits.
- [x] 2.2 Prove non-owner access and unchanged task/home/report/Git state around successful and failed discovery; verify existing done/land report-stage and cleanliness guards still run after discovery and non-ships never trigger lookup.
- [x] 2.3 Document the separate Herdr plugin.js command and fleet.js discovery adapter changes, version detection/fallback, known/none/unavailable propagation and unchanged exact-terminal binding in docs/status-pr-discovery.md; verify the checklist against merged app PR 14's source seam without editing that repository.
- [x] 2.4 Reconcile the latest default branch while preserving PR 5's project-registration/lock/name behavior, and run the complete node crew.test.mjs suite with fakes only; record the final result and any gaps in the implementation report.
