# Proposal

## Why

Finished ship workers and copies remain in Herdr because ignored scratch is protected even after the PR closes, and only the current worker terminal is remembered. Coordinators need safe, automatic cleanup without treating unrelated terminals or unpublished work as disposable.

## What Changes

- Permit non-forced disposal of Git-ignored scratch only after proving the task's exact PR merged or closed, with no unpublished commits, tracked modifications or non-ignored untracked files. This exception includes ignored KEEP markers, unreadable sockets and nested ignored repositories.
- Preserve existing KEEP, inspection and force protections outside that exception, along with foreign-terminal, busy-worker, Git-operation and history safeguards.
- Record all terminals crew starts for a task, including replacements and reviewer launches, and finish all proven task-owned terminals rather than just the latest one.
- Tell workers to keep proof pictures and scratch in their crew task folder outside the working copy and stop disposable instances before reporting.
- Report discarded contents in one clear cleanup line from finish and from land when it encounters an already-merged task.
- Add isolated regressions for each permitted case and every refusal that must remain, and update the README's finish contract.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `task-orchestration`: Closed-PR scratch disposal, complete task-terminal ownership, worker scratch hygiene and explicit cleanup output.

## Impact

Implementation is confined to `crew.mjs`, `crew.test.mjs` and the relevant README sections, plus this OpenSpec change. Task state gains additive terminal ownership/history fields; no bulk migration or rewriting of existing task records is planned. Tests use disposable homes, fake Core and local repositories only. No new runtime dependency, live home cleanup, person's terminal closure, readiness change or merge is included.
