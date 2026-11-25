# Proposal

## Why

Claude workers always start with `--permission-mode acceptEdits` and a fixed `--allowedTools` list. Any tool outside that list, such as a read-only MCP tool of a GitHub connector, stops the worker for a person, so `crew wait` reports "needs a person" again and again. The person wants every Claude worker to run in Claude Code's auto permission mode.

## What Changes

- Every Claude worker crew starts (scout, ship, review, fix, including hand-over and relaunch) runs with `--permission-mode auto` instead of `acceptEdits`, with the same `--allowedTools` list. There is no setting for it.
- When the installed Claude Code or the account cannot use auto mode, the worker falls back to `acceptEdits` instead of staying dead, and the worker's start line says so.
- A1 and Pi launches are unchanged.
- README and the coordinator AGENTS template say that Claude workers run in auto mode.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `worker-dispatch`: Claude workers run in auto permission mode, with an acceptEdits fallback.

## Impact

`crew.mjs` (`AGENTS.claude.args`, `agentCommand`, the launch path and its start line, coordinator AGENTS template), `crew.test.mjs`, README. No change to the person's crew home config, to `config/crew-dispatch.json` or to A1 and Pi launches.
