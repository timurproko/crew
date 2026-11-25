# Worker dispatch delta

## ADDED Requirements

### Requirement: Claude worker permission mode is configurable

Crew SHALL start Claude workers with `--permission-mode acceptEdits` unless the dispatch config names another mode. A home-level or coordinator-section `permission_mode` SHALL set the mode for Claude candidates, and a Claude profile's `permissionMode` SHALL override it for that profile. Accepted values SHALL be `acceptEdits`, `auto`, `plan`, `default` and `manual`; any other value, including `bypassPermissions`, SHALL be refused with the field path. A1 and Pi profiles SHALL ignore the field. The resolved mode SHALL be saved with the task's candidates and used for every role and for hand-over and relaunch. `crew agents` SHALL show the mode when it is not `acceptEdits`.

#### Scenario: No mode configured

- **WHEN** the dispatch config names no permission mode
- **THEN** Claude workers start with `--permission-mode acceptEdits` and the same `--allowedTools` list as before

#### Scenario: Home sets auto mode

- **WHEN** `permission_mode` is `auto` at the top of the dispatch config
- **THEN** every Claude worker for scout, ship, review and fix starts with `--permission-mode auto`, and `crew agents` shows the mode

#### Scenario: Profile overrides the home mode

- **WHEN** the home mode is `auto` and one Claude profile sets `permissionMode` to `acceptEdits`
- **THEN** that profile's worker starts with `acceptEdits` and the others with `auto`

#### Scenario: Unsafe or unknown value

- **WHEN** a permission mode is `bypassPermissions` or a value Claude Code does not name
- **THEN** crew refuses the config and names the field and the accepted values

#### Scenario: Hand-over keeps each candidate's mode

- **WHEN** a Claude worker stops on a limit and the task is handed to the next saved Claude candidate
- **THEN** the new worker starts with the mode saved for that candidate
