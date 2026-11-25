# Tasks

## 1. Verified closed-PR scratch cleanup preserves protected work

- [x] 1.1 Add isolated regressions reproducing merged/closed ignored KEEP, picture, unreadable-socket and nested-probe leftovers; show the current implementation cannot complete non-forced cleanup for the protected examples before changing it.
- [x] 1.2 Establish exact repository/branch/head closure and publication proof, including deleted remote branches; cover open, wrong-repository, wrong-branch, stale-head, absent and unreadable PRs and failed Git/publication reads with conservative regression assertions.
- [x] 1.3 Add the narrow ignored-only inspection/disposal path for initial finish, post-stop comparison and deferred/closed-task retry; assert ignored sockets are never recursively inspected and nested ignored repositories can be removed without following outside symlinks.
- [x] 1.4 Cover refusal for unpushed commits, staged and unstaged tracked changes, non-ignored untracked files, and open/unmerged PR scratch with KEEP; assert refusal occurs before any stop/removal, and retain explicit-force behavior outside the exception.
- [x] 1.5 Retain post-stop and deferred protections for late real work, history, operations/locks, foreign holders and Core uncertainty; add targeted assertions for each and for ignored-only changes no longer blocking an eligible task.
- [x] 1.6 Update README's finish/snapshot contract and run the targeted cleanup regressions, checking merged branches can be dropped only under existing merge proof and closed-unmerged branches remain.

## 2. Finish closes every recorded crew-started terminal safely

- [x] 2.1 Record additive terminal launch history at spawn, explicit relaunch, automatic hand-over and review launch/replacement; extend fixture assertions to check every acknowledged address survives publication and existing done/relaunch races.
- [x] 2.2 Finish and remove the deduplicated owned-terminal set with each launch's stop protocol; cover earlier/later surviving terminals and graceful A1 exits, plus a busy owned terminal refusing non-forced cleanup.
- [x] 2.3 Persist and retry per-terminal pending cleanup without returning a held copy; cover failed stop/removal, silent Core, already-closed retry, and existing current-terminal-only records.
- [x] 2.4 Assert foreign terminals stay live even with force or matching cwd/labels, and finishing a ship does not adopt its separate review task's terminal; update README ownership wording and run targeted ownership and race regressions.

## 3. Worker briefs move disposable work outside the copy

- [x] 3.1 Add the task-folder scratch/proof destination and disposable-instance shutdown rule to shared brief generation; assert the destination is outside the working copy and explicitly allowed by the brief.
- [x] 3.2 Cover ordinary, workflow, gate, scout and reviewer brief output and replacement reuse, update README guidance, and run the focused brief checks.

## 4. Finish and merged land explain discarded contents once

- [ ] 4.1 Reuse guarded cleanup from land for a verified merged PR, including repeated/already-landed tasks; cover open-PR behavior remaining unchanged and merged tasks with blocked cleanup preserving work and busy/foreign terminals.
- [ ] 4.2 Produce one accurate bounded cleanup summary for ignored roots, owned terminals and copy disposition; assert successful, empty, postponed, failed and repeated cleanup never falsely claim disposal or duplicate the task's summary in a sweep.
- [ ] 4.3 Update README's merged-land/output contract and run focused land/summary regressions for workflow, gate and plain delivery paths.
- [ ] 4.4 Run `node crew.test.mjs` once on the completed implementation in disposable fixture homes and record the result and any remaining gaps; run strict OpenSpec validation and final PR-body validation before the final outcome is ticked.
