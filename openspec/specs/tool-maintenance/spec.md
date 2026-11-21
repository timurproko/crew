# Tool maintenance

## Purpose

Record crew's guarded self-repair, installed-copy updates and per-machine rollback contracts.

## Requirements

### Requirement: Repairs are confined to tool files

Crew SHALL publish a self-repair only after its worker reports, the copy is clean, the repair incorporates published main, the changed files are within the tool's own allowlist and the complete suite passes. The allowlist SHALL contain only the tool's `crew.mjs`, `crew.test.mjs`, `README.md`, `bin/` and `docs/`, excluding repository infrastructure.

#### Scenario: Repair touches infrastructure

- **WHEN** a reported repair changes repository infrastructure
- **THEN** crew refuses publication before pushing the repair branch or opening a pull request

#### Scenario: Repair passes its checks

- **WHEN** a clean reported repair stays within scope, incorporates published main and passes its suite
- **THEN** crew publishes its branch and records a draft pull request without merging or updating the installed copy

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
