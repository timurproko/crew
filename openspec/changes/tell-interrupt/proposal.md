# Proposal

## Why

An ordinary coordinator follow-up to a busy A1 worker becomes queued steering and cannot stop the tool call it is warning about. Coordinators need an explicit urgent follow-up that interrupts the current turn before delivering the correction, without destroying the worker's session or working copy.

## What Changes

- Add `crew tell <id> --interrupt "<message>"` as an opt-in urgent mode; ordinary `crew tell` remains non-interrupting.
- For a recognized busy worker, use Core's bounded interrupt operation, confirm the turn stopped, then send the existing follow-up/report instruction to the same worker.
- Deliver directly when the recognized worker is already idle or done. Refuse blocked, unidentified, unavailable or unconfirmed targets rather than silently queue an urgent message or escalate to killing the worker.
- Preserve task reopening, follow-up counts, fast reports and advisory review invalidation on successful delivery; distinguish interruption from message-delivery failures.
- Document urgency, cancellation side effects and limitations in help, README and generated coordinator guidance, with focused fake-Core regression coverage.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `task-orchestration`: Add explicit interrupt-before-delivery follow-ups while preserving ordinary tells, ownership, worker identity and reporting safety.

## Impact

Implementation is confined to `crew.mjs`, `crew.test.mjs` and `README.md`, plus this OpenSpec change. Core already exposes `hc interrupt <terminal> --timeout <seconds>` with `stopped`, `exited`, `still_working` and `unknown` outcomes; A1's installed public API has no interrupt operation. No new dependency, task-record migration, A1 modification, terminal replacement or working-copy cleanup is proposed. The Core transport works for recognized status-reporting A1, Pi and Claude workers; the motivating acceptance case is A1 running a long shell tool.
