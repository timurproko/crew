# Design

## Context

See proposal.md for motivation. Read-only inspection of `crew.mjs` and `crew.test.mjs` established these causes:

1. `cmdFinish` (around lines 1917-1989) snapshots before stopping and unconditionally applies `workInCopy`'s KEEP refusal. It never establishes PR closure before these checks. Ignored pictures are not themselves dirty files, but an ignored KEEP marker blocks even a merged ship.
2. `snapshotCopy` (around 1743-1785) walks every ignored directory and calls `lstatSync` on every entry. Any unreadable socket produces `incomplete`. `checkWaitingCopy` treats that as uncertainty and requires current explicit force; it also protects later ignored scratch changes. Neither function knows whether the PR closed.
3. `returnCopy` delegates delivery copies to `delivery finish <copy> --force`. It does not clear ignored nested repositories first. The shared workflow refuses separate nested repositories even with force, so bypassing KEEP alone will not fix the ignored probe-clone case.
4. `launchWorker` publishes one `terminal`; `replaceWorker` overwrites it and its `fallbacks` record contains agent labels and reasons, not terminal addresses. Replacement normally removes its predecessor, but no durable ownership list survives for additional terminals. `stopWorker`, `removeStoppedTerminal` and `otherTerminalsIn` act on or exempt only the current address. An extra task terminal therefore looks foreign and holds the copy.
5. `briefText` specifies the worktree and report but has no external scratch destination or disposable-instance shutdown instruction. `cmdLand`'s already-landed early return prints only a PR link and does no cleanup.

Existing tests confirm today's protections: `gapTests.ignored` fingerprints 12,001 ignored files and protects changed or unreadable ignored trees; `gapTests.finish`, `review-stop-race`, `review2-unseen-force` and `review2-missing-git` cover KEEP, failed inspection, stop/removal uncertainty and post-stop writes. Main-suite f5 requires force for a KEEP marker even with merged-PR proof. Relaunch tests cover publication races but do not assert durable ownership of every launched terminal. The fake delivery test explicitly simulates refusal by the return tool; it does not exercise a real nested probe clone.

Baseline validation: `node crew.test.mjs` passed in this copy before any implementation changes. The suite uses its existing disposable homes and fake Core; no live task histories or person's terminals were inspected or modified.

## Goals / Non-Goals

**Goals:** Make the brief's four requested outcomes explicit, with a narrow scratch-only exception and reusable lifecycle checks for immediate and deferred return.

**Non-Goals:** No blanket force, background reaper, global process killing, task-history deletion, bulk state migration, label behavior changes, live cleanup of the listed historical tasks, automatic PR merge or PR readiness changes. Do not weaken ordinary status or fleet read-only behavior.

## Decisions

### 1. Establish exact closure and publication before classifying ignored roots as disposable

Use the existing PR identity/read helpers and Git inspection to establish the task's repository, recorded branch, local HEAD and exact PR head. A mere report URL, cached closed state for another identity, NOT_FOUND, merged ancestor or unrelated merged PR is not enough. Use a fresh bounded PR read for the explicit cleanup decision. Require the verified PR head to cover the local HEAD; start with exact head equality to avoid silently discarding later work.

Reuse and harden publication checks: distinguish a missing published branch, failed fetch/count, and actual unpushed commits. If GitHub deleted the branch, an exact verified merged/closed PR head equal to local HEAD supplies publication proof; do not treat branch absence alone as either unpublished work or permission to discard. If a remote branch survives, inspect it too so new unpublished commits cannot hide behind earlier PR facts. A closed but unmerged PR permits scratch cleanup, not branch deletion; retain `dropMergedBranch`'s separate merge proof.

Reject non-forced finish for actual unpublished commits, tracked staged/unstaged changes and non-ignored untracked files before stopping any worker. Open or unproven PRs get no scratch exemption: keep today's KEEP and force rules and conservative ignored snapshots. Clean open-PR closure continues to preserve its branch; closure is not being made into a merge requirement for ordinary clean finish.

Alternative rejected: skip all snapshots or implicitly force whenever a recorded PR link exists. That would lose real file work or commits and would trust stale/wrong PR state.

### 2. Separate disposable ignored scratch from protected work inspection

For an eligible closed-PR task, inventory protected work using Git without recursively reading ignored roots. Enumerate ignored roots for the discard summary, but do not stat/hash their children or KEEP; unreadable sockets inside them must not make protected-work inspection incomplete. Preserve Git marker validity, branch/HEAD identity, operations/locks and commit-history checks.

Carry that narrow inspection mode through post-stop comparison and retry. Re-establish eligibility before deferred destruction, including for already-closed task records with old incomplete snapshots. Do not interpret an older snapshot as general permission to erase files. Protect late tracked/non-ignored changes and unpublished commits, but do not indefinitely keep a closed task merely because ignored scratch changed.

After all owned terminal stops/removals are confirmed and Core reports no foreign holder, remove only Git-classified ignored untracked roots, without following symlinks or touching tracked content. Use Git's ignored-only cleaning semantics with nested-repository removal narrowly enabled for those roots, rather than recursive deletion of arbitrary folders. Pre-cleaning is necessary because delivery refuses a nested repository even under its own force option. Then hand the copy back through its existing delivery/treehouse/plain-Git route. Keep locks, failed cleanup and outside symlink targets safe.

Alternative rejected: making the ignored walker tolerant of errors for every task. That loses its protection for open tasks and for work left in held copies without closure proof.

### 3. Add durable terminal ownership without inferring it from location

Add an append-only list of terminal launch records to each task, containing address and the agent/launch context needed for its stop protocol. Keep the existing current `terminal` field for done, wait, status and compatibility. Record every acknowledged `startTerminal` result in initial publication and replacement publication, using existing task transactions to retain report/relaunch race behavior. Reviewer tasks already pass through `launchWorker`, so their own history uses the same mechanism; finishing a ship must not silently kill another task's reviewer.

Finish deduplicates current and historical owned addresses, applies existing idle/busy and graceful A1 protections to each, and persists per-address pending stop/removal work. Retry all unresolved addresses on an already-closed finish or normal deferred-return sweep. Only exclude owned terminals from foreign-holder detection while their closure is being explicitly tracked; do not return the copy until removal is confirmed.

Legacy records fall back to their recorded current terminal. No bulk rewriting or label-only adoption of missing historical addresses: a person's terminal in the same folder, even with copied labels, is not proof crew started it. Preserve the existing narrowly scoped relaunch-race recovery, without expanding it into a terminal discovery sweep.

Alternative rejected: close every terminal with matching cwd/task labels. It cannot guarantee the terminal belongs to crew and risks the person's running session.

### 4. Reuse cleanup and one summary from finish and merged land

Extract only enough of finish's cleanup path to let land invoke the same checks when its exact existing PR is proved merged, including the already-landed early path. Ordinary open-PR land remains unchanged; no new PR, push, readiness or merge operations are introduced by cleanup. Do not bypass busy protection because land has no force option.

Format one concise cleanup summary with discarded ignored roots (bounded list), owned-terminal disposition and copy returned/kept. Say none discarded when appropriate. Report only actual removal, including partial cleanup failures accurately; do not equate an attempted return with disposal. Preserve existing report retention and backlog semantics and avoid duplicate summary lines for the same task during the deferred sweep.

### 5. Give workers a task-owned scratch destination

Derive the external scratch folder from the report's task directory. Update shared brief generation so scouts, ships, reviewers and their replacement instructions consistently direct pictures/scratch there and require stopping disposable instances before reporting. Clarify that this task folder is an allowed output location outside the working-copy restriction. Update README finish and terminal-ownership descriptions alongside the relevant outcome.

## Risks / Trade-offs

- [GitHub or origin cannot establish exact closure/publication] -> Keep the copy and explain uncertainty rather than relaxing the scratch gate.
- [PR reopens or files change during cleanup] -> Use current identity-scoped evidence, recheck protected state immediately before deletion, and retain existing post-stop checks; GitHub and disk cannot be made one atomic transaction.
- [Nested repository or socket resists deletion] -> Report the actual cleanup failure and keep the copy pending; never expand deletion outside ignored roots or follow symlinks.
- [Old task has unrecorded extra terminals] -> Retain unknown terminals conservatively; future launches gain complete history without fabricating ownership for historical records.
- [Multiple owned terminals include a busy worker] -> Apply non-force busy protection across the set, and retain retry state after any partial stop.
- [Tests accidentally invoke live tools] -> Extend existing disposable fixture homes, local remotes and fake Core/GitHub/delivery. Inject unreadable socket failures deterministically on Windows as needed, with real socket coverage where supported.

## Migration Plan

Only additive fields are introduced by normal task lifecycle writes. There is no record deletion, bulk migration or live-home maintenance command. Deploy through the existing tool update path after approval and implementation. Older task records continue through the current-terminal fallback; old deferred snapshots can use the exception only after new closure/publication and protected-work checks. Rollback restores the previous conservative cleanup behavior; reports and branches remain retained under the existing rules.
