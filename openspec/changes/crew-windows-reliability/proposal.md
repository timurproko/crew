# Proposal

## Why

Crew's Windows command path is slow or lossy at several lifecycle boundaries: project listing delays the Projects panel, stale default-branch metadata can select the wrong delivery kind, multiline tasks can be truncated, passing self-repairs can time out, and finish can block unrelated work. The person requested these five existing problems be planned together in one pull request, with small, separately tested fixes.

## What Changes

- Resolve JSON project kinds concurrently, with invocation-local tool discovery and unchanged project-kinds v1 output; keep live published-default resolution for every spawn.
- Include the supplied default-branch repair, commits `be7c5ad85bad865a87e133e57c2939e253857e2c` and `7d5cdcb9e97459f76ecba6a5547eb0c785f85e29`, reading branch and commit from one remote HEAD advertisement rather than cached origin/HEAD.
- Preserve multiline task input through the supported Windows command path, or refuse unsupported forwarding before launching a shortened task; provide a lossless task-file input path.
- Give self-repair's unchanged complete-suite gate a realistic finite Windows timeout and distinguish timeout from an actual failing test.
- Keep reported-worker settling and optional post-close work from monopolizing placement serialization, with bounded foreground contention handling and all copy/terminal safety checks intact.
- Add one focused regression group per issue and record real-machine project-list before/after measurements after implementation.

## Capabilities

### New Capabilities

None; these are reliability corrections to existing commands.

### Modified Capabilities

- `task-orchestration`: Responsive project inspection, fresh published-default selection, lossless task descriptions, and bounded finish-related contention without weakening ownership or cleanup fencing.
- `tool-maintenance`: A passing self-repair suite can complete within a realistic configurable deadline, while failing or timed-out suites still prevent publication.

## Impact

- Main implementation: `crew.mjs`; focused coverage: `crew.test.mjs`; Windows launcher changes may affect `bin/crew.cmd` and a companion PowerShell launcher if needed.
- Documentation: `README.md`, `docs/project-kinds.md`, and `docs/worker-spaces.md` as applicable.
- No Herdr plugin changes, registry migration, JSON capability/version changes, background refresh service, or weakening of live spawn admission or complete-suite publication checks.
- Baseline on this Windows machine at main `45f543f3`: eight-project JSON listing succeeded in 24.30 seconds, including seven sequential ls-remote calls totaling 12.45 seconds. Git traces and measurement scratch are in the external task folder, not the repository.
- This is a plan only. No implementation begins before approval.
