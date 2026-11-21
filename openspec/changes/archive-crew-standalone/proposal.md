# Proposal

## Why

The completed `crew-standalone` change remained active after PR 1 merged before delivery automation existed. Its tool-maintenance delta has not been applied to the baseline specification.

## What Changes

- Archive `crew-standalone` with the shared pinned OpenSpec CLI, allowing its normal spec synchronization and dated archive move.
- Check the resulting specifications and archived task completion with OpenSpec validation.
- Stop and report any duplicate delta or conflict instead of bypassing validation or forcing spec edits.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

None newly defined here. The existing `crew-standalone` delta owns the pending `tool-maintenance` requirements; this housekeeping plan introduces no additional behavior and declares `skip_specs: true`.

## Impact

Only OpenSpec planning artifacts, `openspec/specs/tool-maintenance/spec.md`, and the move of `openspec/changes/crew-standalone/` under `openspec/changes/archive/`. No code, dependencies, workflow rules, or repository settings change.
