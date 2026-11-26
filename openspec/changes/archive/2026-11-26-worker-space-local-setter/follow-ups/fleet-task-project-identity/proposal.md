# Proposal

## Why

Herdr validates placement-v1 worker labels against authoritative task projects, but Crew's minimal fleet view drops the project that full status already returns. This makes a valid combined/project worker fail the consumer's identity join and prevents connected fleet rendering.

## What Changes

- Add `tasks[].project` to fleet view version 1 as one additive field, preserving exact stored project spelling and using null when the record lacks usable project evidence.
- Preserve full status identity: internal repairs remain `crew:self`, even when their verified placement shares the registered `crew` space. Do not rewrite task identity to match a display/placement alias.
- Keep root fields, version markers, existing per-task values, retention, PR discovery budgets, read-only authority and index behavior unchanged.
- Extend exact-shape and identity regressions for dotted projects, mixed placement, cached reads, closed retained tasks and the repair alias; document the additive field and publish the follow-up contract to herdr-app PR 88 or 92.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `task-orchestration`: Extend the minimal fleet task shape with authoritative project evidence without changing task, placement or discovery authority.

## Impact

- `crew.mjs`: Minimal fleet projection only; its existing index already retains recorded project.
- `crew.test.mjs`: Fleet shape, identity, repair and cache/scale regressions; no real coordinator homes or terminals.
- `README.md`, `docs/status-pr-discovery.md`, `docs/worker-spaces.md`: Describe the additive fleet field and the `crew:self` task versus `crew` placement alias.
- Same PR 23, with the already implemented worker-space setter outcomes retained. This follow-up changes the prior exact fleet-shape guarantee and needs approval before implementation; the original archived change is not rewritten.
