# Proposal

## Why

All workers currently advertise one home-wide space, so work on unrelated projects is mixed under a directory-derived heading. Let the person opt into project-specific worker spaces without changing the default or disrupting running tasks.

## What Changes

- Add `crew config worker-space [combined|per-project]`, stored in the coordinator home's `crew.json`; missing means `combined`. Reads are open, changes require the owner, and the next new task uses the latest saved value without a restart.
- Keep today's combined space identity by default; in per-project mode lazily request one automatic space per registered project, named exactly as in `crew project list`.
- Save each task's space binding before launch. Reviews inherit the reviewed task's binding, and relaunch/automatic hand-over retain it even after either-direction mode changes.
- Keep legacy shared-space tasks running and finishable without migration, relabeling, moving terminals or adopting foreign terminals.
- Preserve automatic empty-space removal through Herdr's existing lifecycle, never by closing an entire space or terminals Crew did not start.
- Define self-repair grouping and machine-local identity, and cover both modes, mixed generations, safe cleanup and existing commands with isolated fake-Core tests.
- Publish the exact label contract and Herdr dependencies: the current app recognizes only one exact combined-space ID; several children and exact project-name presentation require the separate Herdr work. No Herdr source or live state changes belong here.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `task-orchestration`: configurable worker-space grouping, immutable per-task placement, legacy compatibility and terminal-owned cleanup.

## Impact

- `crew.mjs`: home registry validation/transaction, config command/help, launch admission, shared terminal launcher, review and replacement placement.
- `crew.test.mjs`: isolated homes, fake Core labels and simulated adoption/empty-space lifecycle; no real coordinator, tasks, spaces or apps.
- `README.md` and a Crew-owned contract document under `docs/`: setting, switching semantics, legacy behavior and companion requirements.
- Existing task/report/terminal ownership, dispatch, worktree return and status/fleet contracts remain unchanged apart from additive internal task placement metadata.
- Separate `timurproko/herdr-app` task `herdr-ux-polish` (draft PR 88) must accept both legacy and project-space identities, multiple connected children and the published display-name metadata. Current app support is not assumed complete, and Crew tests cannot prove native rendering.
