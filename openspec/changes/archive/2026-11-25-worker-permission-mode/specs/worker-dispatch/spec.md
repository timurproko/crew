# Worker dispatch delta

## ADDED Requirements

### Requirement: Claude workers run in auto permission mode

Crew SHALL start every Claude worker, for scout, ship, review and fix and on hand-over and relaunch, with `--permission-mode auto` and the same `--allowedTools` list as before. When the installed Claude Code or the account cannot start in auto mode, crew SHALL start the worker in `acceptEdits` instead and SHALL say so in the worker's start line. Crew SHALL never fall back to `bypassPermissions` or `dontAsk`. A1 and Pi launches SHALL be unchanged.

#### Scenario: Claude worker starts

- **WHEN** crew starts a Claude worker for any role
- **THEN** its command carries `--permission-mode auto` followed by the unchanged `--allowedTools` list

#### Scenario: Hand-over to another Claude candidate

- **WHEN** a Claude worker stops on a limit and the task is handed to the next Claude candidate, or is relaunched
- **THEN** the new worker also starts in auto mode

#### Scenario: Installed Claude Code has no auto mode

- **WHEN** Claude Code refuses `--permission-mode auto`
- **THEN** the worker starts in `acceptEdits` and the start line names the fallback and its reason

#### Scenario: Account refuses auto mode at start

- **WHEN** the worker's Claude Code exits with an error right after starting in auto mode
- **THEN** it is started once more in `acceptEdits` with a notice, rather than left dead
