# Proposal

## Why

Per-project spaces currently display Crew's lower-case project ID, while Herdr's Agents sidebar displays the repository/working-copy folder basename with its original capitalization. A project such as `myworkflows` therefore appears as `myworkflows` in Spaces and `MyWorkflows` in Agents.

## What Changes

- Use the repository/working-copy directory basename for newly requested per-project display names, preserving capitalization and leading dots without taking a hashed pool-parent name.
- Keep command project IDs, placement project keys and automatic space IDs unchanged.
- Recognize existing same-project spaces with legacy lower-case names and join them without duplicating or renaming occupied spaces; retain saved names through reviews and replacements.
- Update the worker-space contract and fake-Core regression coverage for directory-derived names and legacy joins.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `task-orchestration`: Separate per-project space display names from project identity while retaining conservative occupancy-based joins and immutable inherited placement.

## Impact

The change is limited to Crew's placement/name construction, saved-placement validation, occupancy selection, fake-Core tests and worker-space documentation. Herdr source is inspected read-only; no companion files, real Crew homes, live spaces or coordinator processes are changed. Native rendering remains a companion responsibility. This changes the current spec's registered-name display contract, so implementation waits for plan approval.
