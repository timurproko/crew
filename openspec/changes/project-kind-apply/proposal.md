# Proposal

## Why

Herdr Settings cannot change a project's delivery kind while another coordinator owns its Crew home. The JSON list and spawn can also disagree because they inspect different repository folders, making a displayed Plain project launch a delivery worker.

## What Changes

- Allow the existing guarded kind-only setter from a local non-owner without reading, taking over or changing ownership or running work; advertise this permission through an additive capability.
- Resolve effective delivery kind consistently for JSON listing and new task admission, with explicit kind choices winning over detection and list metadata distinguishing explicit choices, legacy overrides and automatic detection.
- Freeze the resolved kind at task reservation so concurrent settings changes, copy allocation, review, land and relaunch cannot reinterpret existing work.
- Document the source-folder detection rule, unchanged registration safeguards and owner-only work control; add fake-home regressions for selection, ordering and preservation.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `task-orchestration`: local kind-only authority, authoritative effective-kind listing with selection provenance, consistent detection and immutable task delivery snapshots.

## Impact

Changes target `crew.mjs`, `crew.test.mjs`, `docs/project-kinds.md` and relevant README text. The version-one JSON contract gains additive capability and provenance fields; registration storage remains version one. No app, real home, coordinator, remote machine or registration migration is changed. Existing project add/remove permissions and unfinished-task protections remain unchanged.
