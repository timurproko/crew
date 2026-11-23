# Proposal

## Why

The shared review palette is changing to Review, Approved and Rework, and future renames must not require another crew release. Resolve label names from the shared manifest while preserving clean transitions and the existing advisory hook contract.

## What Changes

- Resolve `under-review`, `review-approved` and `review-changes-needed` from `labels/base.json` on a configurable source repository's default branch (default `timurproko/MyWorkflows`) once per eligible hook through signed-in GitHub API access with a short timeout.
- Add only a key's current `name`; remove assigned current and `previousNames` names for keys being cleared, including legacy activity and rework assignments during verdicts.
- Fall back to built-in Review, Approved and Rework names, with legacy aliases, when manifest reading or validation fails; combine diagnostics into the hook's existing single warning line.
- Preserve saved-state ordering, opt-out, stale-start write guards, existing-definition checks and all other PR #7 limitations.
- Update README and fake-GitHub tests for dynamic names, migration, fallback and unchanged reviewer report words.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `task-orchestration`: Advisory review labels resolve by stable manifest keys and clear current and historical assignments without creating definitions or persistent state.

## Impact

Changes stay in `crew.mjs`, `crew.test.mjs`, README and this OpenSpec change. No dependency, workflow, live label or MyWorkflows repository edits are needed. The manifest contract is confirmed against MyWorkflows PR #33 (`docs/plans/label-rename.md`); implementation will recheck it before coding. Crew follows the coordinator's explicit single-read, warned-fallback contract rather than the shared plan's two-read example and prohibition on silent fallback.
