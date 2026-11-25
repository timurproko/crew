# Design

## What the installed Claude Code accepts

Checked on this machine with Claude Code 2.1.332:

- `claude --help` lists `--permission-mode` choices `acceptEdits`, `auto`, `bypassPermissions`, `manual`, `dontAsk`, `plan`. Auto mode is named `auto`.
- `claude --permission-mode default --allowedTools Bash,Read --version` parses (a hidden alias of `manual`); `bogus` is refused by the parser with the list of choices.
- `claude --permission-mode auto --allowedTools Bash,Read --version` parses, so `auto` combines with `--allowedTools`; the allowed tools stay pre-approved and auto mode decides the rest.

## Accepted values

`acceptEdits`, `auto`, `plan`, `default`, `manual`. `bypassPermissions` is refused from config on purpose (it skips every check). `dontAsk` is also refused: it denies anything not pre-allowed, which would turn every MCP prompt into a silent failure rather than the stop the person is trying to avoid; it can be added later if asked for.

## Where it is set

- Top level of `config/crew-dispatch.json`: `"permission_mode": "auto"` (snake case, like `shared_quota`). A coordinator section may also set its own `permission_mode`, which replaces the top-level one for that section, consistent with how a section owns `shared_quota`.
- On a Claude profile row: `"permissionMode": "auto"`. It overrides the home or section setting for that row only. On an `a1` or `pi` row it is ignored (accepted and dropped, so one list can be shared); an invalid value is still refused so a typo is not silent.

## How it flows

`workChain` resolves each Claude candidate's mode once (`profile.permissionMode ?? section/home permission_mode ?? acceptEdits`) and stores it on the candidate only when it differs from `acceptEdits`, so existing task records and candidate keys stay unchanged. The task's saved `launch` and `chain` carry it, so hand-over on quota or login loss, crashed-worker recovery and `crew relaunch` reuse the mode chosen at dispatch. Command-line picks (`--agent claude --account …`) get the home/section mode.

`agentCommand` replaces the value after `--permission-mode` in the Claude arguments with the candidate's mode; `AGENTS.claude.args` keeps `acceptEdits` as the default. `pickLabel` appends `mode auto` (etc.) for a non-default mode, which `crew agents`, hand-over messages and status use; JSON candidates gain a `permissionMode` field.
