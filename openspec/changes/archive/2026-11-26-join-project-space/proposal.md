# Proposal

## Why

Switching to per-project mode currently creates a second space even when the home's combined space already contains only that project's live workers. Reuse an occupied, project-exclusive Crew space before requesting a new project space, without moving running workers.

## What Changes

- At independent per-project admission, inspect this home's machine-local task records and live worker terminal labels; join an occupied space whose qualifying workers all belong to the requested project.
- Include the legacy combined identity as a candidate, exclude mixed-project and empty spaces, and ignore finished tasks as occupancy evidence.
- Preserve placement-v1 validation: a join into combined saves combined placement and labels, not a per-project mode with a combined ID.
- Serialize placement selection with task reservation; preserve review/relaunch/hand-over inheritance and combined-mode behavior.
- Document the classification, ambiguity/refusal boundaries and isolated regression cases. Do not consolidate existing duplicates or touch the running coordinator.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `task-orchestration`: Occupancy-aware independent per-project admission replaces unconditional project-ID selection, while saved placement and terminal ownership remain unchanged.

## Impact

`crew.mjs` admission and read-only Core inspection, focused fake-Core tests in `crew.test.mjs`, `README.md` and `docs/worker-spaces.md`. No new CLI, setting, registry version, placement version, native-space mutation or Herdr change is required. Existing specs explicitly require a split after combined-to-per-project switching; this change replaces that rule rather than claiming the current code is defective under its old contract.
