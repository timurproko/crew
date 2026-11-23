# Proposal

## Why

A worker can open its draft PR at plan time while `crew status --json` still returns `tasks[].pr: null` until `done` or `land`. Herdr's coordinator Git overview therefore misses in-progress PRs; its merged connect-fleet-space design explicitly reserves a Crew-owned discovery adapter for this gap.

## What Changes

- Add opt-in `crew status --json --discover-prs` with a version-1 discovery envelope and per-task known, none or unavailable results containing canonical GitHub PR URLs.
- Discover only unrecorded ship PRs using the recorded task branch, verified exact worktree and project origin; support workflow, gate and plain delivery without owner privileges.
- Keep ordinary status output and its absence of network calls unchanged. Keep stored PRs, report stages, done and land semantics unchanged; discovery never records anything.
- Bound all added subprocess reads, execute discovery serially within a shared deadline, and treat unsupported remotes, missing tools, identity uncertainty and timeouts as unavailable rather than command failure.
- Document the JSON contract and separate Herdr adapter changes, with fake-only regressions and the complete main suite.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `task-orchestration`: Add optional read-only, bounded, versioned task PR discovery alongside unchanged local status inspection.

## Impact

Implementation will touch status/help and small isolated helpers in `crew.mjs`, a new focused fixture block in `crew.test.mjs`, and status documentation in `README.md` and `docs/`. No dependencies or task-state migrations. Keep clear of PR 5's project-registration, registry-lock and project-name code/tests, and reconcile main before implementation delivery. Herdr app files are read-only references and require a separate consumer task.
