# Tasks

## 1. Exclusive live-project occupancy selects existing spaces

- [x] 1.1 Add bounded read-only local worker inspection and occupancy classification for independent per-project admissions; focused fake-Core cases cover exclusive legacy/v1 combined, ordinary project spaces, dotted projects, mixed projects, finished/ended/shell-only evidence and empty spaces.
- [x] 1.2 Preserve exact v1 tuples when joining combined or project identities, including verified repair aliases and deterministic preference for an occupied canonical space in an already split home; assert complete task records and launch labels in the focused cases.
- [x] 1.3 Refuse ambiguous/unavailable same-home evidence without task/copy/launch side effects, and exclude remote identities, other homes and personal headings; add isolated negative cases and document classification/naming limits in README.md and docs/worker-spaces.md.

## 2. Concurrent admissions preserve one ordered placement decision

- [x] 2.1 Revalidate the admission footprint under registry serialization and handle relevant unpublished preparing reservations through bounded retry/refusal outside the lock; deterministic same-project, different-project, first-launch and failed-launch cases assert no split from stale snapshots.
- [x] 2.2 Cover before/after-reservation setting switches and before-publication launch barriers without production test hooks, asserting that Core/copy calls never retain projects.lock; run the focused ordering cases and document concurrency/refusal behavior alongside them.

## 3. Inherited workers and mode rollback retain their task spaces

- [x] 3.1 Keep reviews, manual relaunches and automatic hand-overs bound to saved placement, including combined joins admitted under per-project policy; targeted inheritance cases assert original terminals stay untouched across both setting switches.
- [x] 3.2 Cover a later inherited other-project worker, historically mixed combined occupancy and unconditional combined rollback for new tasks; update switching examples and explicit inheritance exceptions in README.md and docs/worker-spaces.md.
- [x] 3.3 Run node crew.test.mjs --gaps=join-project-space, node crew.test.mjs --gaps=worker-spaces and node crew.test.mjs --gaps=worker-space-local-ordering in isolated homes, and openspec validate join-project-space --strict; record exact results without running the full local suite or touching the live coordinator.
