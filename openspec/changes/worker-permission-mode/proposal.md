# Proposal

## Why

Claude workers always start with `--permission-mode acceptEdits` and a fixed `--allowedTools` list. Any tool outside that list, such as a read-only MCP tool of a GitHub connector, stops the worker for a person, so `crew wait` reports "needs a person" again and again. The person wants to run Claude workers in Claude Code's `auto` permission mode instead, without changing anything for homes that do not ask for it.

## What Changes

- Add an optional home-level `permission_mode` to `config/crew-dispatch.json` and an optional `permissionMode` on a Claude profile that overrides it. Accepted values: `acceptEdits` (the default), `auto`, `plan`, `default`, `manual`. Unknown values, `bypassPermissions` and `dontAsk` are refused with the field path and the accepted list.
- Resolve the mode into every Claude candidate, save it with the task's launch and chain, and pass it as the `--permission-mode` value for scout, ship, review and fix, including hand-over and relaunch. A1 and Pi rows ignore it.
- `crew agents` (human and JSON) shows the mode in effect when it is not `acceptEdits`.
- README and the coordinator AGENTS template say in a line or two under "Who does the work" how to turn it on.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `worker-dispatch`: configurable permission mode for Claude workers.

## Impact

`crew.mjs` (profile validation, dispatch config, candidate chain, `agentCommand`, `crew agents`, coordinator AGENTS template), `crew.test.mjs`, README. No change to the person's crew home config, to A1 or Pi launches, or to the `--allowedTools` list.
