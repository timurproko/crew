# Task orchestration

## Purpose

Record crew's existing home ownership, isolated worker lifecycle and safe copy return contracts.

## Requirements

### Requirement: One coordinator owns a home

Crew SHALL permit only one live coordinator to mutate a home. An unavailable Core answer SHALL NOT authorize takeover of an existing owner.

#### Scenario: Another coordinator is live

- **WHEN** another session starts a home whose owner terminal is live
- **THEN** crew refuses ownership and permits read-only inspection

#### Scenario: Owner cannot be checked

- **WHEN** Core cannot establish whether the recorded owner is alive
- **THEN** crew retains the recorded owner rather than treating uncertainty as death

### Requirement: Workers have isolated tasks and written reports

Crew SHALL launch each worker in its own working copy and Core terminal with a task brief and report path. A worker SHALL report completion with `crew done` from its own terminal.

#### Scenario: Worker completes a scout

- **WHEN** a scout writes its report and runs `crew done` for its task
- **THEN** crew records the report and makes it available to the coordinator without changing the project checkout

### Requirement: Copy return preserves unsafe or unproven work

Crew SHALL refuse unsafe non-forced ship closure and SHALL postpone copy return when another terminal holds the copy, inspection is incomplete, or work changes after its recorded snapshot. Crew SHALL retain ship branches not proved merged.

#### Scenario: Another terminal holds a finished copy

- **WHEN** a task finishes but another terminal is still in its copy
- **THEN** crew closes the task while recording that its copy remains to be returned

#### Scenario: Ship branch has not been proved merged

- **WHEN** a ship task finishes without proof that its branch was merged
- **THEN** crew preserves that branch and its commits
