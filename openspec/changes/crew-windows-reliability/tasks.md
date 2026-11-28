# Tasks

Each numbered group maps to one draft-PR Implementation outcome, in this order. The coordinator approved implementation and explicitly added outcome 6.

## 1. Published-default selection survives branch renames with one remote read

- [x] 1.1 Integrate the supplied be7c5ad8 and 7d5cdcb9 changes in this worktree; confirm branch and commit come from one live ls-remote advertisement without cached origin/HEAD authority.
- [x] 1.2 Keep deleted-old-default and retained-old-default listing/spawn fixtures plus a remote-call-count assertion; run `node crew.test.mjs --gaps=project-kind-stale-origin-head` and `node crew.test.mjs --gaps=project-kind-snapshots`.
- [x] 1.3 Update `docs/project-kinds.md` to describe live remote HEAD and one advertisement; compare documented output fields with the unchanged v1 contract.

## 2. JSON project listing overlaps independent resolution without stale admission

- [x] 2.1 Add a listing-only pool of at most eight workers around the shared resolver, with invocation-local tool discovery, equivalent-folder deduplication and safe shared-object retrieval; cover overlap and bounded fan-out in a focused `project-list-speed` group.
- [x] 2.2 Propagate async listing completion and errors through dispatch, preserve registry ordering and structured refusal, and await worker shutdown; cover empty homes, mixed selections, unavailable tools and worker failure in the same focused group.
- [x] 2.3 Keep spawn resolution live after an earlier list; run `node crew.test.mjs --gaps=project-list-speed`, `node crew.test.mjs --gaps=project-kinds` and `node crew.test.mjs --gaps=project-kind-ordering`.
- [x] 2.4 Document concurrent reads and unchanged authority in `docs/project-kinds.md`; repeat the eight-project measurement from the external task folder and record actual before/after elapsed times and remote-call counts.

## 3. Windows task input preserves all description lines

- [x] 3.1 Add PowerShell-native forwarding and a UTF-8 `spawn --task-file` route, rejecting missing/unreadable/empty files and positional/file conflicts before admission; cover exact internal line and Unicode preservation in a focused `spawn-multiline` group.
- [x] 3.2 Exercise a real PowerShell here-string through the supported launcher against fake Core, including quotes and metacharacters, and keep legacy single-line compatibility; run `node crew.test.mjs --gaps=spawn-multiline`.
- [x] 3.3 Document explicit native launcher and shell-safe task-file examples in README/help, and ensure any known lossy invocation is refused clearly or routed to the lossless launcher in the focused tests.

## 4. Passing self-repairs have a realistic bounded suite allowance

- [x] 4.1 Set the selfrepair suite default to 60 minutes, accept validated `CREW_SELFTEST_TIMEOUT_SECONDS` values from 1 to 7200, and retain sanitized child environment; assert timeout options and invalid inputs in a focused `selfrepair-deadline` group.
- [x] 4.2 Distinguish suite failure, timeout and launch/output errors without weakening publication checks; exercise short fake passing/failing/hanging suites and run `node crew.test.mjs --gaps=selfrepair-deadline` and `node crew.test.mjs --gaps=selfrepair`.
- [x] 4.3 Document the finite default, override and refusal diagnostics in README; confirm the default command still runs the complete suite and no full local suite was needed for this change's targeted tests.

## 5. Finish settling allows unrelated foreground work to progress

- [x] 5.1 Move read-only reported-worker settling before gate acquisition and revalidate current task/terminal generation under the gate without repeating the wait; cover unrelated tell/spawn progress and same-task change protection in `finish-contention`.
- [x] 5.2 Move optional post-close label/backlog work and sweep driving out of the outer gate, retaining a guarded return attempt for each copy and safe current-state transactions; use deterministic barriers to cover newer task state and foreign-terminal preservation.
- [x] 5.3 Bound opportunistic branch-proof reads and allow ten seconds for brief foreground placement contention without altering observation yield, dead-owner proof or publication fences; cover successful brief release and safe bounded refusal in `finish-contention`.
- [x] 5.4 Run `node crew.test.mjs --gaps=finish-contention`, `node crew.test.mjs --gaps=join-project-space-gate` and `node crew.test.mjs --gaps=launch-authorization-gate`; document the new settle/gate boundary and retained slow-copy-return limitation in `docs/worker-spaces.md`.

## 6. Internal repair-space names preserve repository directory spelling

- [x] 6.1 Replace Crew's hardcoded internal repair title with the normal directory-name resolver while preserving internal IDs and saved names; cover core-named source and registered alias/fallback cases in `repair-space-name`.
- [x] 6.2 Run `node crew.test.mjs --gaps=repair-space-name` and document Crew-owned repair naming and inherited-name compatibility in `docs/worker-spaces.md`.
