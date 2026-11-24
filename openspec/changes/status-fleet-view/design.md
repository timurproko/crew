# Design

## Context

See proposal.md for motivation. `allTasks` already reads only tasks/<id>/task.json; the expensive existing status projection additionally checks reports, calls Core per active terminal, builds launch/recovery histories and inspects waiting copies. `cmdStatus` traverses history twice in its default form.

`discoverTaskPrs` currently returns an output-only overlay. Valid recorded PR URLs short-circuit all network reads. Unrecorded ships use exact copy/branch/repository verification and an existing pulls API response that already includes state and merge/close timestamps. `pullRequestState` at workflow land currently reads isDraft/body; finish's merged-branch proof currently requests only headRefOid. Existing lifecycle tests assert every local byte remains unchanged by discovery: these assertions must narrow deliberately to permit saved facts while preserving authority.

The task-orchestration spec therefore needs a targeted modification to its discovery no-local-writes requirement, not a silent exception. Recorded-link precedence and zero-network behavior stay intact. PR #10 is still open during planning and touches the same source file.

## Goals / Non-Goals

**Goals:** Separate fleet selection/projection from full status, persist identity-scoped observations safely, and make cost depend on state-file traversal plus relevant rows rather than prose or copy inspection.

**Non-Goals:** Herdr adapter changes, task deletion, arbitrary row limits, GitHub writes, label changes, new network polling, periodic cleanup, task-age expiration, or weakening finish's merged-branch proof.

## Decisions

### 1. Dispatch the fleet view before the legacy projection

Parse --view explicitly, rejecting missing values and unknown values before home/Core/discovery work. Unknown names use usage exit 2 and `unsupported-status-view: <name>`. Require --json. Accept --all but do not let it override fleet retention. Preserve the legacy serializer and field order when --view is absent rather than trimming its results afterward.

Fleet always emits root home, owner, tasks, prDiscovery and view. Owner is null or terminal/live only. Task fields are id, state, terminal (null if missing), pr (recorded value or null) and the existing four-field prDiscovery object. Root discovery version stays 1 and view is name fleet/version 1. Neither cached lifecycle fields nor cache diagnostics enter the payload.

Without --discover-prs, classify recorded and saved verified URLs locally as known, unlinked non-ships as none, and unobserved ships as unavailable/not-requested. This avoids implying an offline read has checked GitHub. With --discover-prs, preserve existing exact-discovery behavior and its bounded unavailable reasons. A usable saved link may still identify a returned closed task even when its copy is gone or a refresh is unavailable.

Alternative rejected: reusing full status then deleting keys still pays for Core, report and copy-return operations and large intermediate objects.

### 2. Save observations separately from delivery authority

Use a small versioned observation record in saved task state with canonical URL, normalized OPEN/MERGED/CLOSED or unknown state, mergedAt, closedAt and observation time. Never infer merge/close event times from task dates or observation time. An invalid or absent state/time stays unknown. Match the observation URL against current authoritative task.pr when present; do not apply another PR's terminal facts. A later verified OPEN observation clears obsolete terminal timestamps for that identity.

Capture facts as a separate result/callback channel from the pure discovery helper; keep its public overlay shape unchanged. Persist only verified observations. Existing remote pulls responses supply lifecycle values without another request. Expand existing land/finish JSON selections to capture state and timestamps, retaining their original return strings and exact head-commit proof. If a command obtains no PR state, it saves none rather than making an extra status call.

Observation writes must use a narrow atomic update of current saved state, serialized with task writes as needed, not a stale task snapshot. Preserve newer lifecycle fields and unrelated keys; do not change updated merely for a repeated identical observation, since that timestamp is used by failed-task elapsed output. Cache write failures are best effort and must not make valid status fail or produce non-JSON stdout.

Alternatives rejected: storing the discovered URL in task.pr would grant premature delivery authority; writing GitHub on status violates the contract; separate refresh requests would expand the existing network budget.

### 3. Retention is conservative and based on PR events

Use one injected wall-clock instant per status invocation. Always retain state != closed, even if the PR is old/terminal. For closed tasks, a recorded or verified saved/current discovered link is required. Keep OPEN or unknown state indefinitely. For MERGED use mergedAt; for CLOSED use closedAt. Omit only if the relevant valid event is strictly more than 24 hours before now. Exactly 24 hours, missing/invalid/future event times, cache misses and discovery failures do not justify expiration.

Filter facts already known expired before any discovery work. Closed tasks lacking saved links may still get an existing exact discovery attempt when requested, within its unchanged budget; only actual known links justify including those rows. Saved observations allow offline selection after copy return. Keep creation-order output for deterministic compatibility where applicable.

Alternative rejected: limiting by task creation, completion or last observation would hide a months-old open PR, violating the person's visibility rule.

### 4. State-only traversal first; measure before adding an index

Read each task state once and project only the required fields. Do not stat/read briefs or reports, inspect Git/copy safety or query each task terminal. The owner liveness check remains necessary. No-discovery fleet status must spawn no Git/GitHub processes. Start with the existing state-file traversal, avoiding the consistency and migration burden of a second authoritative history index.

Measure local no-discovery runs with 5,000 synthetic finished tasks, recording warm and cold-ish process wall times. Target well below one second on this machine. Guard file access in tests to prove prose and copy inspections are absent. If the state-only implementation misses the target, add a rebuildable compact summary index inside this same outcome, with state files authoritative and safe rebuild on missing/corrupt index; do not claim success based solely on small payload bytes.

### 5. Compatibility and evidence

Use deterministic fake clocks and existing fake Core/GitHub fixtures. Assert exact root/owner/task key sets, version markers and four discovery fields with both discovery modes. Cover old open PRs, merged/closed at 25/23/exactly-24 hours, unknown state/time, no PR, live tasks with old merged PRs, identity changes, saved facts after copy return, and observation-write races/failures.

Require a 1,000-closed-task fixture with a fixed small visible fleet to stay under 16,384 bytes. Compare legacy text and JSON bytes against stable fixtures for default and --all, including --discover-prs; lifecycle facts must remain internal. Assert subprocess counts/budgets do not grow and no GitHub mutation occurs. Run the whole main suite once on the final implementation, not during this plan-only phase.

## Risks / Trade-offs

- [Cached facts can remain unknown or stale] → Keep unknown/open entries; no extra status refresh calls. Recorded links still short-circuit discovery, so historical PRs without learned closure may remain visible until an existing lifecycle read learns it. This is intentionally conservative, not a claim of a fixed absolute row bound.
- [Observation writes race done/finish] → Atomic narrow updates coordinated with task writers; test interleavings and preserve authoritative lifecycle data.
- [Windows filesystem cost exceeds budget] → Measure thousands of state files and introduce a derived summary index only if needed; never fall back to prose scans.
- [Network discovery can take up to its existing ten seconds] → The sub-second target covers local fleet projection, not GitHub latency; retain existing two-second subprocess and ten-second shared limits.
- [PR #10 lands during implementation] → Incorporate only published main into this branch and rerun integration; never edit that PR's branch.

## Migration Plan

The view is additive; old clients keep identical legacy output. Existing tasks need no migration: missing facts mean unknown, retained when a PR is known. New observations progressively make terminal history eligible for expiration without deleting task records. Rollback leaves the additional saved facts inert.

Document stable unsupported-view detection for Herdr's separate probe/fallback implementation, without changing the app here. After implementation, record the full suite result and current required-check status for the final head; the initial plan remains draft with all outcomes unchecked and no runnable feature.
