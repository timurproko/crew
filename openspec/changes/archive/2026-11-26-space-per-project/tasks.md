# Tasks

Implementation approved by the coordinator. Groups match the draft PR's Implementation outcomes in order. All checks use isolated homes, repositories, fake Core and sandboxed tool/account paths; no live coordinator, spaces or tasks.

## 1. Home setting selects combined or per-project placement for new tasks without a restart

- [x] 1.1 Add effective-mode validation and `crew config worker-space [combined|per-project]` using `workerSpaceMode` in the version-1 home registry; verify absent/default, explicit modes, invalid values, read access and owner-only writes with focused config regressions.
- [x] 1.2 Serialize config writes and initial placement admission with the existing registry transaction; verify metadata/project preservation, concurrent registration and barriers before/after reservation while a setting change races spawn, without Core writes on setting changes.
- [x] 1.3 Document show/set usage, default combined and immediate new-task-only semantics in README/help; verify help advertises the command and isolated CLI output explains that running tasks do not move.

## 2. Project spaces are reused and task placement survives reviews, recovery and mode switches

- [x] 2.1 Save validated version-1 workerSpace bindings at admission and pass them through the common terminal launcher with the published labels; verify exact old combined ID, two-project separation, same-project reuse, lazy creation, dotted names and home/machine isolation in focused worker-space regressions.
- [x] 2.2 Inherit parent placement for reviewers and retain task placement across manual relaunch and automatic hand-over; verify both switch directions with live fake workers, new same-project spawns, projects with/without an existing project space, all three inherited launch paths, switch-back reuse and no move/relabel/reorder operations.
- [x] 2.3 Resolve legacy records to combined placement without moving or bulk migrating them; verify inherited launches after opt-in and safe refusal for invalid present placement metadata before stopping a worker.
- [x] 2.4 Resolve per-project self-fix placement to a verified crew registration or the internal repair namespace, preserving crew:self dispatch; verify matching repository, unrelated registration, missing registration, replacement cases and registration removal/repoint refusal while a fixer references the shared project binding.
- [x] 2.5 Publish `docs/worker-spaces.md` with exact label/identity rules, native-versus-Crew ownership, companion multi-child/name-consumer dependencies and downgrade limits; verify it matches emitted fixture labels and README links without changing any Herdr file.

## 3. Finishing tasks preserves foreign terminals, legacy workflows and other occupied spaces

- [x] 3.1 Extend isolated fake adoption/empty-space lifecycle modeling and finish assertions; verify first versus last finish, another project's occupied space, reports retaining workers, foreign terminals at another cwd, force, same-named personal spaces, remote same-suffix spaces, ordinary moved-to spaces and unconfirmed removal without any whole-space/document mutation.
- [x] 3.2 Add mixed-generation compatibility regressions for status, wait, tell, review, relaunch, finish and end; verify legacy/minimal fleet output contracts, old records lacking placement, both layout modes, end/start under another coordinator followed by a mode change, earlier-session task inheritance and no terminal/space mutation on end or read-only status.
- [x] 3.3 Document safe cleanup and the difference between modeled contract tests and native companion evidence in README and worker-space docs; run the focused worker-space regressions and OpenSpec validation, recording native connected naming/nesting as a separate companion dependency rather than claiming it passed.
