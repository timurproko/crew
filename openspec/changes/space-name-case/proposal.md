# Proposal

## Why

Per-project spaces currently display Crew's lower-case project ID, while Herdr's Agents sidebar displays the repository/working-copy folder basename with its original capitalization. A project such as `myworkflows` therefore appears as `myworkflows` in Spaces and `MyWorkflows` in Agents.

## What Changes

- Use the repository/working-copy directory basename for newly requested per-project display names, preserving capitalization and leading dots without taking a hashed pool-parent name.
- Keep command project IDs, placement project keys and automatic space IDs unchanged.
- Recognize existing same-project spaces with legacy lower-case names and join them without duplicating or renaming occupied spaces; retain saved names through reviews and replacements.
- Update the worker-space contract and fake-Core regression coverage for directory-derived names and legacy joins.
- Per the coordinator's explicit scope extension, recognize delivery's own source from repository signals and recheck already registered plain projects at spawn without silently rewriting registration.
- Add the coordinator-approved project-kinds v1 discovery, authoritative JSON list and expected-path-guarded kind-only setter described by Herdr PR 100. Preserve all other registration fields and existing task delivery records.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `task-orchestration`: Separate per-project display names from identity; add repository-signal workflow detection and machine-readable, guarded project-kind selection while preserving task history.

## Impact

The coordinator expanded this PR to include Crew's project workflow detection and project-kind CLI/API alongside placement/name construction, saved-placement validation, occupancy selection, fake-Core tests and documentation. Herdr source is inspected read-only; no companion files, real Crew homes, live spaces or coordinator processes are changed. Native rendering remains a companion responsibility. This changes the current spec's registered-name display contract, so implementation waits for plan approval.
