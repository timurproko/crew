# Spec Delta

## ADDED Requirements

### Requirement: Fleet status has a minimal versioned shape

Crew SHALL offer `status --json --view fleet` with exactly home, owner, tasks, prDiscovery and view at the root. The view SHALL be `{name: "fleet", version: 1}` and root prDiscovery SHALL be `{version: 1}`. Non-null owner SHALL contain only terminal and live. Every task SHALL contain only id, state, terminal, pr and prDiscovery; pr SHALL remain the recorded value or null. Discovery results SHALL retain the four-field version-1 shape.

#### Scenario: Fleet output contains only consumer fields

- **WHEN** a caller requests fleet status with or without --discover-prs
- **THEN** the response has the exact specified fields and markers, without launch, standby, fallback, core, recovery, errors, elapsed, copy-return or owner.mine details

#### Scenario: Fleet without discovery uses saved facts

- **WHEN** fleet status is requested without --discover-prs
- **THEN** no GitHub or remote Git reads occur, recorded or saved discovered links produce known results, non-ships without links produce none, and unobserved ships produce unavailable with reason not-requested

### Requirement: Fleet history follows PR lifetime rather than task age

Fleet status SHALL include every task not in state closed. A closed task SHALL be included only with a recorded or safely discovered PR, and SHALL be excluded only if that PR is known merged or closed more than 24 hours ago using GitHub's corresponding mergedAt or closedAt. Open PRs and unknown states or event times SHALL remain visible regardless of task age. Adding --all SHALL NOT bypass fleet retention.

#### Scenario: Old open pull request stays visible

- **WHEN** a task closed months ago has a PR known open
- **THEN** fleet status includes the task

#### Scenario: Merged history expires at the GitHub event

- **WHEN** two closed tasks have PRs merged 25 and 23 hours before the current time
- **THEN** fleet status excludes the former and includes the latter regardless of their task closure dates

#### Scenario: Closed pull request expires by close time

- **WHEN** closed tasks have unmerged PRs closed 25 hours ago, 23 hours ago and exactly 24 hours ago
- **THEN** fleet status excludes only the first task

#### Scenario: Unknown lifecycle facts are conservative

- **WHEN** a closed task has a PR with unknown state or a merged or closed state without a valid corresponding event time
- **THEN** fleet status retains it rather than using task age or observation time as the event time

#### Scenario: Finished work without a PR is omitted

- **WHEN** closed scouts, reviews or ships have no recorded or safely discovered PR
- **THEN** fleet status omits them while retaining every non-closed task

#### Scenario: Saved discovery survives copy return

- **WHEN** a closed task has saved verified PR facts but no recorded PR or surviving copy
- **THEN** fleet status uses the saved URL and lifecycle facts without reading its report or guessing another branch

### Requirement: PR lifecycle facts are durable and identity scoped

Crew SHALL save verified PR URL, state, mergedAt and closedAt learned by discovery or existing land/finish PR reads in task state separately from authoritative pr and stage. Facts SHALL apply only to their verified PR identity. Missing or failed reads SHALL NOT manufacture closure or discard usable facts. Status SHALL add no network requests beyond the existing opt-in discovery reads and SHALL remain read-only toward GitHub.

#### Scenario: Discovery records lifecycle without landing

- **WHEN** existing exact discovery returns a verified PR and lifecycle facts
- **THEN** the next fleet read without discovery can use those facts while task.pr, report stage, task state and landing remain unchanged

#### Scenario: Land or finish learns closure

- **WHEN** an existing land or finish GitHub read returns a verified PR state and merge or close timestamp
- **THEN** Crew persists these observations for later offline fleet filtering without changing the command's existing safety checks

#### Scenario: Recorded PR changes identity

- **WHEN** a task's recorded PR differs from a previously cached PR
- **THEN** lifecycle facts for the previous URL cannot expire the new PR

#### Scenario: Persistence does not overwrite concurrent lifecycle changes

- **WHEN** a discovery observation is saved while task lifecycle state changes
- **THEN** saving the observation preserves the newer task state, recorded PR, report stage and unrelated fields

### Requirement: Fleet status scales without reading historical prose

Fleet status SHALL select and project tasks using saved state without reading task briefs, reports or transcripts, inspecting copy-return safety, or querying worker terminals individually. A synthetic history of 1,000 closed tasks without visible PRs plus a fixed small visible fleet SHALL produce fewer than 16,384 UTF-8 bytes. The local no-discovery path SHALL remain well under one second for several thousand finished tasks on the target machine.

#### Scenario: Historical prose is large or inaccessible

- **WHEN** thousands of closed tasks have large or unreadable briefs and reports
- **THEN** fleet status does not read that prose or inspect their copies and returns only the minimal retained rows

#### Scenario: Payload remains bounded by relevant rows

- **WHEN** 1,000 closed tasks without PRs are added to a small visible fleet
- **THEN** the output stays below 16,384 bytes and no irrelevant historical row appears

### Requirement: Unsupported status views have detectable errors

Crew SHALL reject unknown --view values with a nonzero usage exit and a stable `unsupported-status-view` diagnostic naming the value. Fleet SHALL require --json. Status without --view, including --all with or without discovery, SHALL retain its existing serialized field order and output bytes for unchanged input facts.

#### Scenario: New client probes unsupported view

- **WHEN** a caller supplies --view with an unknown name
- **THEN** Crew reports unsupported-status-view before discovery or status projection rather than silently returning full status

#### Scenario: View argument is missing or JSON is absent

- **WHEN** a caller supplies --view without a value or --view fleet without --json
- **THEN** Crew returns a clear usage error without starting discovery

#### Scenario: Legacy consumer still requests all history

- **WHEN** a caller requests status --all --json without --view
- **THEN** all historical rows and legacy fields remain present and cached lifecycle facts introduce no new output fields

## MODIFIED Requirements

### Requirement: Discovery is bounded and read-only for every caller

Crew SHALL permit discovery from non-owner sessions without changing home ownership, reports, delivery authority or Git state, except that verified PR observations SHALL be saved as separate local task facts. Added reads SHALL run serially, each with a timeout of at most two seconds, within a ten-second shared discovery budget, with bounded output and no retries. Discovery failures SHALL produce per-task unavailable results with reasons, not fail otherwise valid status requests. Non-ship tasks without recorded PRs SHALL return none without remote reads.

#### Scenario: Non-owner inspects an active home

- **WHEN** a non-owner session requests discovery while the coordinator is live
- **THEN** it receives results without claiming ownership, setting authoritative task.pr, changing stages, or landing tasks; only verified observation facts can be saved

#### Scenario: GitHub is unavailable or unsupported

- **WHEN** a task's origin is not GitHub, credentials or tools are missing, a response is malformed, or a subprocess times out
- **THEN** its result is unavailable with a nonempty reason and status continues for the other tasks within the shared budget

#### Scenario: Budget expires with tasks remaining

- **WHEN** the shared discovery budget is exhausted
- **THEN** unqueried eligible tasks return unavailable with reason budget-exhausted and no further subprocess starts

#### Scenario: Local state remains authoritative

- **WHEN** discovery returns a PR before a worker reports
- **THEN** only separate observation facts may be saved and subsequent done and land commands retain their existing report, stage and delivery checks
