# Design

## Context

See proposal.md for motivation. `crew.mjs` currently projects stored `pr` in `cmdStatus`; `cmdDone` records workflow report first-line stage/PR, and `cmdLand` performs delivery checks before recording or opening PRs. Reusing `pullRequestOf` would be unsafe: it searches reports, has a 60-second lookup, and cannot distinguish absence from failure.

Read the merged Herdr PR 14 snapshot c3d9e4d60744df32130efa2819ea25d3b591219e, especially archived connect-fleet-space design decision 6, `src/plugins/crew/fleet.js` and `src/plugins/crew/plugin.js`. `recordedSource` sanitizes only home, owner and task id/terminal/state/pr; `readFleetStatus` executes status through a 15-second transport. Consumers bind exact live task terminals and use sanitized task PR links. The D:/Git/herdr-app checkout predates the merge, so the merged Git objects/API were the reference; no app files were changed.

PR 5 touches project registration, locks, names and their tests. This implementation is confined to status/help, isolated discovery helpers, a separate regression block and status documentation. Reconcile main before implementation handoff without changing registration semantics.

## Goals / Non-Goals

**Goals:** an optional machine-readable read with trustworthy identity, bounded latency and an explicit absence-versus-unavailability distinction. Preserve all existing local and recorded-link consumers.

**Non-Goals:** recording discovered links, state/schema migration, reporting or landing, PR creation, auth switching, transcript/footer searches, branch inference, repository PR inventory, background polling, and Herdr app edits or deployment.

## Decisions

### 1. Add a versioned overlay, not a new meaning for stored pr

Only enhanced JSON includes top-level `prDiscovery: {version: 1}`. Each task gains:

```json
{"prDiscovery":{"status":"known","url":"https://github.com/owner/repo/pull/12","source":"github","reason":null}}
```

`status` is `known`, `none` or `unavailable`. `known` requires a canonical `https://github.com/<owner>/<repo>/pull/<positive-number>` URL and source `recorded` or `github`; reason is null. `none` has null url/source/reason. `unavailable` has null url/source and a nonempty machine-readable reason. Preserve GitHub's canonical repository spelling for returned lookups; recorded URL normalization removes query/fragment/trailing slash and uses the canonical HTTPS host/path form without a network read. Reject unsupported or invalid recorded links as unavailable rather than replacing a recorded link with a guessed one.

Keep `tasks[].pr` exactly as recorded, even in enhanced output. This prevents discovery from silently looking like done/land authority. No persistence: recording an early plan PR could make the plain `land` early-return path skip its report/cleanliness checks, and a discovered PR alone says nothing about stage or pushed implementation completeness. Do not modify done/land to compensate.

Reject `--discover-prs` without `--json` before performing discovery. Old status invocations execute no discovery logic and emit no extra fields. Source version detection does not depend on Crew's release number; unknown/missing discovery versions are unsupported, not empty results.

### 2. Resolve the exact recorded task identity and origin

A valid recorded link wins without Git/GitHub subprocesses. Otherwise non-ship tasks return none without lookup. For unrecorded ships, require explicit task.branch and task.worktree; do not use the legacy branchOf fallback. Current spawns record the exact `<type>/<id>` branch; self-repair ships retain their explicit recorded branch too.

Use local, bounded Git reads to establish that the copy exists, is a repository root belonging to the registered project's Git common directory, and has symbolic HEAD exactly equal to task.branch. Validate the branch as a literal ref and pass arguments without shell interpolation. A detached/reused/wrong-project/missing copy is unavailable. Use that task's origin, verify it agrees with the project's origin, and resolve that explicit remote only. No fetch, ls-remote, push, config writes or fallback to another task/project branch.

Resolve the explicit origin through a bounded GitHub repository read to get canonical repository identity, including SSH aliases where the CLI can resolve them. Non-GitHub origins are unavailable without attempting PR discovery; unresolved aliases fail closed. Do not let CLI cwd heuristics select upstream or another remote. Cache verified repository resolutions only within this invocation, keyed by exact project/origin identity.

Query by explicit canonical repository and exact head owner/branch, including drafts and all PR states. Bound the response to two candidate PRs and verify returned head branch, head repository and base repository against the target, not just a matching branch string. A single exact match is known, an empty successful response is none, and malformed, mismatched, or multiple candidates are unavailable. Do not choose a historical PR arbitrarily when a branch was reused. Read no reports or terminal history for discovery.

### 3. Use a fixed shared deadline with no fan-out or retries

Run added discovery reads serially with a ten-second monotonic shared deadline and at most two seconds per subprocess, clamped to remaining time. Bound each subprocess output to 1 MiB and reject oversized/malformed output. Use existing CREW_GH fake-tool support and a dedicated bounded read path rather than the existing unbounded/default-timeout helpers. No retry, auth login, global account switch, or persistent cache.

After the deadline, classify remaining unrecorded ships as unavailable/budget-exhausted without starting another process. Recorded links and non-ship classification still require no subprocess. This bounds *added discovery work*, not the pre-existing Core/status projection; the app's existing 15-second transport can still expire and should keep its unavailable behavior. Large task sets can therefore be partial by design rather than holding status open indefinitely.

Document stable v1 reason codes: missing-identity, worktree-unavailable, branch-mismatch, repository-mismatch, unsupported-remote, github-unavailable, invalid-response, ambiguous-pr, invalid-recorded-pr, timeout and budget-exhausted. Reasons expose no raw stderr, credentials or transcripts. Discovery does not call requireOwner or any saving, recovery, backlog or lifecycle helper.

### 4. Keep tests isolated and prove compatibility

Add a dedicated discovery fixture block away from project-registration/name tests, using temporary local repositories, fake Core and fake GitHub commands. Assert command arguments, exact branch/repository validation, canonical URLs, recorded-link short circuits, all delivery kinds, non-owner access, non-ships, unsupported/missing origins, malformed/auth failures, mismatches and ambiguity. Snapshot task/home/Git state before and after. Assert plain status triggers zero GitHub/remote reads and no new fields. Use fake clocks/runners for deadline/output/concurrency checks plus a bounded fake-process timeout regression; no live GitHub calls.

Run focused regressions during implementation and the complete `node crew.test.mjs` once before the implementation report, as explicitly required by this task. The plan report records a baseline full-suite run separately, not as implementation evidence.

### 5. Herdr adoption is a separate task

In Herdr's Crew plugin only:

1. Change `readFleetStatus` in `src/plugins/crew/plugin.js` to request `status --json --discover-prs` through its existing bounded, read-only machine transport.
2. Add a discovery source adapter in `src/plugins/crew/fleet.js` that validates top-level version 1 and bounded per-task result shapes, then maps known `prDiscovery.url` into the existing sanitized task `pr`. Preserve home, owner and exact task-terminal/state identity checks; ignore owner.mine as authority.
3. Preserve per-task none/unavailable information through bindFleet and the generic PR context. Replace the blanket working-task incomplete rule: unavailable means possibly incomplete; successful none means no PR was found on this read, not an API failure. Retain a recorded-only fallback with its existing incomplete wording for older unsupported Crew installations; never treat unsupported discovery as confirmed none or silently retry a timed-out request.
4. Add adapter/transport fixtures for v1, unsupported versions, known/none/unavailable, partial budgets and unchanged bindings. Git and Spaces continue consuming generic links/discovery, not constructing Crew commands or parsing Crew JSON. Their presentation may consume the richer completeness signal but needs no new PR discovery mechanism.

Do not add calls to init/start/home --ensure/update, change polling cadence, enable webhooks or expand CI-fix authority. These consumer changes and any rollout are not part of this Crew PR.

## Risks / Trade-offs

- Wrong or reused task copy → exact branch, Git-common-directory and origin verification; fail closed instead of substituting a branch.
- Historical branch reuse produces multiple PRs → unavailable/ambiguous-pr, not newest-PR guessing.
- Shared deadline can leave later tasks unresolved → explicit per-task budget-exhausted; callers retain incomplete semantics and refresh deliberately.
- CLI auth, aliases or non-GitHub remotes cannot resolve → unavailable; do not change login or remote configuration.
- Existing app transport is only 15 seconds → added work capped at ten seconds; preserve transport failure handling and avoid automatic retries.
- Concurrent PR 5 → isolated hunks/spec additions, reconcile the default branch before implementation handoff.

## Migration Plan

No persisted state changes. After plan approval, implement the outcomes in order, document the v1 output and consumer instructions, and deliver without marking ready or merging. Old callers remain unchanged. Roll back by removing the opt-in flag in consumers or reverting the feature; no task records require repair.
