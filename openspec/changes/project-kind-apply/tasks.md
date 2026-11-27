# Tasks

## 1. Non-owner kind-only edits preserve home and running work

- [x] 1.1 Remove only project set-kind's owner checks and advertise setKindLocal in both probes; fake-home tests cover another owner, absent terminal identity and malformed/stale owner metadata without Core calls or owner/task/terminal changes.
- [x] 1.2 Preserve canonical expected-path, availability, home identity, atomic kind-only merge and no-op guards; project-kinds, project-kinds-concurrency and project-kind-paths cases cover unknown projects/kinds, path races, lock contention and unrelated concurrent edits.
- [x] 1.3 Update docs/project-kinds.md and README with the non-owner capability contract and unchanged owner-only work-control boundary; examples and tests agree that add/remove keep their existing independent safety rules.

## 2. Listed effective kinds match immutable new-task selections

- [ ] 2.1 Share allocation-source effective-kind resolution between JSON list and admission, adding kindSource, available and checkoutStale metadata plus capability flags; fake tests cover published-default signals, stale checkout, explicit choices, legacy overrides, gate precedence and unavailable selections.
- [ ] 2.2 Save delivery selection with the preparing reservation after a fresh locked registration recheck, and use it for brief/launch rather than allocated-copy re-detection; barriers prove setter-before and setter-after ordering without coordinator restart.
- [ ] 2.3 Add fake delivery allocation cases with contradictory registered-folder and copy signals in both directions; workflow-detection cases assert list kind, brief, task fields and status agree without registry rewrites.
- [ ] 2.4 Exercise running and reported Plain, Workflow and Gate tasks through kind changes, review, land, relaunch and automatic hand-over using fake Core/GitHub; original task delivery and briefs remain stable, including legacy task records.
- [ ] 2.5 Update docs/project-kinds.md and README with selection provenance, published-default detection and checkout staleness, explicit-choice precedence, immutable task behavior and the checkout/copy mismatch explanation; all documented fields match contract tests.

## Workflow follow-up

- The user specifically requested one full local crew.test.mjs execution before pushing; record the once-only baseline attempt at plan handoff, including any timeout or incomplete result, then use only targeted tests for the approved implementation.
- Dispatch tests.yml on the final published branch head if draft PR readiness would skip tests; report immediately without waiting for or polling CI.
- Keep the second machine's registry explicitly unverified; do not access SSH machines or change real homes, app instances or running coordinators.
