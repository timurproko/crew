# Proposal

## Why

Crew was copied from a subfolder of another repository into its own root-layout repository, but its runtime, repair fixtures and documentation still assume that subfolder. It also lacks the project metadata, concise behavior specifications and shared automation needed for a self-contained project.

## What Changes

- **BREAKING**: use only the root layout for tool discovery, repair scope, commands and fixtures; do not support the former source subfolder.
- Correct the README, embedded usage/coordinator guidance and retained design history; remove the two completed change plans.
- Add MIT licensing, dependency-free Node 20+ package metadata and the specified ignores, preserving existing attribute rules.
- Adopt unchanged shared instruction, caller and bootstrap templates, plus Windows/Ubuntu CI following xrbuild's readiness and aggregate pattern with one `CI required` check and shared OpenSpec validation.
- Initialize OpenSpec through the shared pinned CLI, recording today's behavior in three small baseline capabilities and this change in its own planning artifacts.

## Capabilities

### New Capabilities

None. Initial `task-orchestration`, `worker-dispatch` and `tool-maintenance` specifications document existing behavior rather than introducing new features.

### Modified Capabilities

- `tool-maintenance`: resolve the source repository at the tool's own folder, run repairs from that root, and retain the strict tool-file allowlist and installed-update safeguards.

## Impact

Affects `crew.mjs`, `crew.test.mjs`, README and design history, normal repository files, shared-workflow callers and OpenSpec artifacts. There are no runtime dependencies and no changes to task-home migration, historical task branch names, external projects, MyWorkflows, GitHub settings or the real crew home. The test check name is `CI required`, superseding the original brief's `Crew tests` name.
