# Proposal

## Why

The worker chain currently depends on project and role but not the account running the coordinator. The person needs two coordinator-specific, single-candidate policies without accidentally borrowing workers from another policy or the global default.

## What Changes

- Add an optional case-insensitive email-keyed `coordinators` map; each section owns its default, role, project and optional rule lists, with no global-chain inheritance.
- Record non-secret coordinator identity and its session-local identity source at `crew start`; refresh readable switcher identity before new selection, and use the existing global policy with one diagnostic when identity is unknown.
- Show detected account, identity provenance and selected section/list in `crew agents`, including JSON; keep explicit selection flags and saved-task recovery semantics.
- Preserve exact coordinator-scoped chains without automatic saved-account expansion, including singleton exhaustion on quota loss, worker crash and relaunch.
- Document the requested two-account example and cover identity, validation, precedence, overrides and recovery using disposable homes and fake Core.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `worker-dispatch`: Coordinator identity, isolated policy selection, diagnostics, strict section validation and bounded saved candidate chains.

## Impact

Implementation will touch ownership-start and worker-dispatch/selection/replacement paths in `crew.mjs`, disposable fixtures in `crew.test.mjs`, and the README's Who does the work section. OpenSpec changes are confined to this change and `worker-dispatch` deltas. No dependency, account-switcher or Herdr app change is planned. No live crew config, credential store or running session will be changed; finish, land and brief functions being changed by PR #14 remain out of scope.
