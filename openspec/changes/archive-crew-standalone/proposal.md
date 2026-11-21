# Proposal

## Why

The completed `crew-standalone` change remained active after PR 1 merged before delivery automation existed. Its tool-maintenance delta has not been applied to the baseline specification.

## What Changes

- Preserve the historical archive produced by `delivery openspec archive crew-standalone --yes`, including its five unchanged original files.
- Carry the exact historical `tool-maintenance` delta in this housekeeping change and leave draft canonical specs identical to the target branch, so delivery automation performs the final synchronization.
- Check OpenSpec validity and reproduce the bot's finalization preparation before pushing; let the bot promote and finalize the pull request.
- Stop and report any duplicate delta or conflict instead of bypassing validation or forcing spec edits.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `tool-maintenance`: apply the exact existing `crew-standalone` root-layout and repair-scope delta during bot finalization. The delta is carried forward without introducing or changing any historical requirement.

## Impact

Only OpenSpec planning artifacts, `openspec/specs/tool-maintenance/spec.md`, and the move of `openspec/changes/crew-standalone/` under `openspec/changes/archive/`. No code, dependencies, workflow rules, or repository settings change.
