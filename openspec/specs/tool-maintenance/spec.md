# Tool maintenance

## Purpose

Record crew's guarded self-repair, installed-copy updates and per-machine rollback contracts.

## Requirements

### Requirement: Repairs are confined to tool files

Crew SHALL publish a self-repair only after its worker reports, the copy is clean, the repair incorporates published main and the complete suite passes. From the repository root, only `crew.mjs`, `crew.test.mjs`, `README.md`, `bin/` and `docs/` SHALL be eligible changes. The default suite SHALL be `node crew.test.mjs`; repository infrastructure SHALL remain excluded.

#### Scenario: Repair touches infrastructure

- **WHEN** a reported repair changes repository infrastructure
- **THEN** crew refuses publication before pushing the repair branch or opening a pull request

#### Scenario: Repair passes its checks

- **WHEN** a clean reported repair stays within scope, incorporates published main and passes its suite
- **THEN** crew publishes its branch and records a draft pull request without merging or updating the installed copy

#### Scenario: Fixer receives root-relative instructions

- **WHEN** a coordinator starts `crew fix`
- **THEN** its brief identifies root-level source, tests and README, names the root-relative allowlist and specifies `node crew.test.mjs`

#### Scenario: Root README is a tool file

- **WHEN** a reported repair changes only the root README and otherwise meets publication conditions
- **THEN** crew accepts that path as a tool file rather than treating it as excluded infrastructure

#### Scenario: Former nested tool files are not allowed

- **WHEN** a repair changes `crew/crew.mjs` instead of a root-relative allowed file
- **THEN** crew refuses publication as outside its own files

### Requirement: Installed copies update without rewriting private history

Crew SHALL fast-forward an installed copy to published main at start unless disabled or pinned, and SHALL support explicit update. A developer checkout SHALL NOT update automatically. An update SHALL NOT discard local commits or merge divergent history.

#### Scenario: Developer starts a home

- **WHEN** crew runs from a developer checkout outside the installed-copy locations without an explicit auto-update override
- **THEN** starting the home leaves that checkout's revision unchanged

#### Scenario: Installed copy diverged

- **WHEN** an update finds local commits that published main does not contain
- **THEN** crew reports the failure and leaves the copy unchanged

### Requirement: Rollback stays local until newer publication

Crew SHALL record the previous revision after an update and permit rollback only with a clean tracked tree. Rollback SHALL pin the revision it left against automatic reinstallation until something newer is published or the user explicitly updates.

#### Scenario: User rolls back a completed update

- **WHEN** a previous revision is recorded and the installed copy has no tracked changes
- **THEN** crew restores that revision and records the per-machine pin without changing the remote

### Requirement: Tool source uses only the repository root layout

Crew SHALL run with its source, tests, README, launchers and documentation at the repository root. Tool operations SHALL resolve that root from the running script's folder unless explicitly overridden by `CREW_TOOL_ROOT`. The former nested source layout SHALL NOT be supported.

#### Scenario: Installed root-layout clone

- **WHEN** crew runs from an installed clone with `crew.mjs` at its root and no tool-root override
- **THEN** version, home initialization and update operate without looking for a nested source folder

#### Scenario: Explicit tool repository

- **WHEN** `CREW_TOOL_ROOT` names another tool repository
- **THEN** repair, update, rollback and crash revision reporting use that repository rather than the script's parent directory

#### Scenario: Developer root-layout worktree

- **WHEN** crew runs in a developer worktree whose `.git` is a file
- **THEN** crew recognizes its own repository and does not automatically update it as an installed copy
