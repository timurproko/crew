# Design

## What the installed Claude Code accepts

Checked on this machine with Claude Code 2.1.332:

- `claude --help` lists `--permission-mode` choices `acceptEdits`, `auto`, `bypassPermissions`, `manual`, `dontAsk`, `plan`. Auto mode is named `auto`; `claude auto-mode` inspects its rules.
- `claude --permission-mode auto --allowedTools Bash,Read --version` parses, so `auto` combines with `--allowedTools`: the listed tools stay pre-approved and auto mode decides the rest.
- An unknown mode is refused by the parser before anything starts (`error: option '--permission-mode <mode>' argument 'bogus' is invalid. Allowed choices are ...`), with a non-zero exit. An older Claude Code without `auto` fails the same way.

## Default

`AGENTS.claude.args` becomes `--permission-mode auto --allowedTools Bash,PowerShell,Read,Edit,Write,Glob,Grep`. Every role and every relaunch path builds its command through `agentCommand`, so one change covers scout, ship, review, fix, hand-over and relaunch. No config field and no `crew agents` change.

## Fallback to acceptEdits

Two cases, handled in two places:

1. **The installed version does not know `auto`.** Before a Claude launch, crew runs `claude --permission-mode auto --allowedTools <list> --version` once per process (short timeout). If it fails, the worker starts with `acceptEdits`, and crew's start line ends with `(auto mode not available: <first line of the error>; started in acceptEdits)`.
2. **The account or session refuses auto mode at start.** This cannot be probed without starting a session, so the worker's terminal command is wrapped: if the auto-mode `claude` exits non-zero within a few seconds of starting, the wrapper prints `crew: Claude Code did not start in auto mode; starting again in acceptEdits` and runs the same command with `acceptEdits`. A worker that ran normally and then ended is not restarted. Crew's existing "agent ended without a report" recovery stays the last resort.

The fallback never uses `bypassPermissions` or `dontAsk`.

## Known gap

How Claude Code behaves on an account where auto mode is switched off (refuses to start, or starts in another mode with a notice) could not be observed on this machine, whose account has auto mode. The wrapper covers the refuse-to-start case; if Claude Code instead downgrades by itself, the worker keeps running in whatever mode Claude Code chose.
