# Proposal

## Why

Herdr Settings must apply one worker-space preference to known coordinator homes without borrowing a terminal identity or taking over running coordinators. Crew currently refuses non-owner setters even for unowned homes, so the desktop needs a deliberately narrow, discoverable local interface rather than an ownership workaround.

## What Changes

- Add `crew config worker-space --set-local combined|per-project --home <absolute-home> --json`, restricted to an explicit, existing, initialized local coordinator home.
- Advertise the interface through a home-independent `crew config worker-space --capabilities --json` probe and a literal help capability marker; publish versioned success/refusal JSON and exit codes.
- Permit only this setting change without terminal ownership, including live, unknown and absent owners, using the existing registry lock and admission ordering. Preserve every other registry field and all owner/task/session state.
- Keep the current getter and owner-only positional setter unchanged. Show the effective mode in plain `crew status` without changing either status JSON contract or sending terminal input.
- Document the exact desktop contract, home-validation boundary, same-user filesystem authority, concurrency semantics and compatibility in `docs/worker-spaces.md`; publish the implemented contract to herdr-app PR 88 after approval and implementation.

## Capabilities

### New Capabilities

None; this extends the existing orchestration setting and ownership contract.

### Modified Capabilities

- `task-orchestration`: Add the explicit local worker-space-only exception, capability discovery, machine-readable results, initialized-home confinement and plain-status observation while retaining owner-only orchestration and admitted-task placement.

## Impact

- `crew.mjs`: Config parser, explicit-home validation, versioned response handling, registry transaction/replacement integration, help and plain status.
- `crew.test.mjs`: Isolated-home CLI tests, fake Core and deterministic spawn/registry barriers; no production home or coordinator access.
- `docs/worker-spaces.md` and the README command/worker-space overview: Supported integration, refusal and compatibility contract.
- Herdr integration is separate: the app executes locally on each authoritative machine/home using its existing transport; Crew gains no global preference store, remote execution or fleet control API.
- No new dependency, registry version, schema migration, owner takeover or worker movement.

## Approved fleet follow-up and delivery reconciliation

The coordinator approved `fleet-task-project-identity` in this same unmerged PR: add exact recorded `tasks[].project` (or null) to fleet v1, preserve dotted names and `crew:self` task identity independently of its `crew` placement alias, retain other fields/budgets/authority, and publish the contract on herdr-app PR 92. Its complete approved planning record is preserved under `follow-ups/fleet-task-project-identity/`.

Delivery refused a second association with `draft-delivery-specs-diverged`, because the first bot-finalized canonical specs are not yet on the target branch. Both approved deltas are therefore consolidated in this original unmerged change's source artifacts and the PR restores its genuine archive/acceptance association. Canonical specs and acceptance data are left to the bot's existing re-finalization path; no finalization commit is reverted and no policy/check is bypassed.
