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

### Requirement: PR discovery is an explicit versioned status mode

Crew SHALL offer `status --json --discover-prs` with top-level `prDiscovery.version: 1` and per-task `prDiscovery` containing `status`, `url`, `source` and `reason`. Status SHALL be `known`, `none` or `unavailable`; known results SHALL contain a canonical GitHub PR URL. Existing `tasks[].pr` SHALL remain the stored value. Ordinary status forms SHALL retain their output contract and perform no GitHub or remote Git reads.

#### Scenario: Existing status consumer

- **WHEN** a caller uses plain `crew status` or `crew status --json`
- **THEN** no discovery fields or remote reads are added

#### Scenario: Supported discovery consumer

- **WHEN** a caller uses `crew status --json --discover-prs`
- **THEN** the response advertises version 1 and contains a discovery result for each returned task

#### Scenario: JSON flag is absent

- **WHEN** a caller supplies `--discover-prs` without `--json`
- **THEN** crew refuses usage without starting discovery

### Requirement: Discovery identifies only the task's exact PR

For an unrecorded ship PR, Crew SHALL verify the task's recorded worktree, branch and project repository before querying that project's GitHub origin for the exact head branch. It SHALL accept only an unambiguous matching PR from that head repository. It SHALL NOT infer identity from reports, transcripts, other tasks or a fallback branch. Workflow, gate and plain delivery SHALL use the same discovery rules.

#### Scenario: Draft exists before any report

- **WHEN** an unreported ship task has one draft PR for its verified branch on its project's origin
- **THEN** discovery returns known with that canonical URL and source github while its stored pr stays null

#### Scenario: Successful lookup finds no PR

- **WHEN** an exact repository and branch lookup succeeds with no matching PR
- **THEN** discovery returns none with null url and source

#### Scenario: Another branch or fork matches loosely

- **WHEN** a response refers to another branch or head repository, or more than one PR matches
- **THEN** discovery returns unavailable rather than choosing or guessing a PR

#### Scenario: Copy or branch cannot establish identity

- **WHEN** the copy is missing, detached, reused, belongs to another project, or differs from the recorded branch
- **THEN** discovery returns unavailable and does not substitute the project checkout or another task's branch

#### Scenario: Task already has a PR

- **WHEN** a task has a valid recorded GitHub PR URL
- **THEN** discovery returns its canonical URL as known with source recorded and makes no remote request for that task

### Requirement: Discovery is bounded and read-only for every caller

Crew SHALL permit discovery from non-owner sessions without changing task, home, owner, report or Git state. Added reads SHALL run serially, each with a timeout of at most two seconds, within a ten-second shared discovery budget, with bounded output and no retries. Discovery failures SHALL produce per-task unavailable results with reasons, not fail otherwise valid status requests. Non-ship tasks without recorded PRs SHALL return none without remote reads.

#### Scenario: Non-owner inspects an active home

- **WHEN** a non-owner session requests discovery while the coordinator is live
- **THEN** it receives results without claiming ownership, recording PRs, changing stages, or landing tasks

#### Scenario: GitHub is unavailable or unsupported

- **WHEN** a task's origin is not GitHub, credentials or tools are missing, a response is malformed, or a subprocess times out
- **THEN** its result is unavailable with a nonempty reason and status continues for the other tasks within the shared budget

#### Scenario: Budget expires with tasks remaining

- **WHEN** the shared discovery budget is exhausted
- **THEN** unqueried eligible tasks return unavailable with reason budget-exhausted and no further subprocess starts

#### Scenario: Local state remains authoritative

- **WHEN** discovery returns a PR before a worker reports
- **THEN** task files remain unchanged and subsequent done and land commands retain their existing report, stage and delivery checks
