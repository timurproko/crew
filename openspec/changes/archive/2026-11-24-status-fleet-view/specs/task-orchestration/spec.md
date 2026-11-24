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

Fleet status SHALL include every non-closed task. Closed tasks SHALL require a recorded or verified discovered PR and SHALL expire only when it is authoritatively NOT_FOUND, or known merged/closed more than 24 hours after GitHub's mergedAt/closedAt. Open PRs and unknown states or event times SHALL remain visible regardless of task age. Adding --all SHALL NOT bypass retention.

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

Crew SHALL save verified PR URL, state, mergedAt and closedAt learned by discovery or existing land/finish PR reads in task state separately from authoritative pr and stage. Facts SHALL apply only to their verified PR identity. Missing or failed reads SHALL NOT manufacture closure or discard usable facts. Only bounded fleet closed-PR verification SHALL add status requests beyond existing discovery. GitHub access SHALL remain read-only.

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

### Requirement: Fleet recorded-PR verification is bounded

Only fleet status with --discover-prs SHALL verify closed-task recorded PRs whose facts are unknown, or known-open facts at least ten minutes old. It SHALL add at most five single GitHub requests per poll, within the existing serial two-second subprocess and ten-second shared budget. Existing discovery SHALL run first. Live tasks, offline fleet and legacy status SHALL add no verification requests. Successful facts SHALL persist.

#### Scenario: A poll cannot expand the budget

- **WHEN** eligible recorded links exceed the cap or existing discovery exhausts the shared deadline
- **THEN** at most five added requests start within the remaining budget and unverified tasks wait for a later poll

#### Scenario: Open facts refresh slowly

- **WHEN** a closed task has successful open facts less than ten minutes old
- **THEN** fleet discovery makes no verification request for it until the interval elapses

#### Scenario: Failed reads do not starve later rows

- **WHEN** several closed PRs cannot be verified across consecutive polls
- **THEN** best-effort rotation gives later eligible tasks a chance without turning failures into terminal facts

### Requirement: Missing PR facts require authoritative proof

Crew SHALL persist NOT_FOUND only when one response from the same credentials proves repository identity and PR-read access while the exact PR number is absent. Generic 404, permission, authentication, network and rate-limit failures SHALL remain unknown. Proven absence learned by discovery or an existing land/finish read SHALL immediately exclude closed tasks, including offline reads, without rewriting recorded URLs. Absence SHALL NOT prove a branch merged.

#### Scenario: A recorded legacy URL does not exist

- **WHEN** the repository and its PR connection are readable but the exact recorded PR is authoritatively absent
- **THEN** Crew saves NOT_FOUND and excludes the closed task immediately, without a 24-hour window or changing its URL

#### Scenario: Absence is ambiguous

- **WHEN** repository or PR-read access is unproven, or the read fails with permission, authentication, transport or rate-limit errors
- **THEN** the closed task remains included and no terminal fact is manufactured

#### Scenario: A lifecycle read learns absence

- **WHEN** an existing land or finish exact-PR read supplies the same authoritative absence proof
- **THEN** Crew saves NOT_FOUND without an extra request, preserves its recorded URL and retains any branch not proved merged

## MODIFIED Requirements

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

- **WHEN** a task has a valid recorded GitHub PR URL outside eligible fleet closed-PR verification
- **THEN** discovery returns its canonical URL as known with source recorded and makes no remote request for that task

### Requirement: Discovery is bounded and read-only for every caller

Crew SHALL allow non-owner discovery without changing ownership, reports, delivery authority or Git state; only separate verified PR facts may be saved. Reads SHALL be serial, bounded in size, limited to two seconds each and ten seconds total, without retries. Failures SHALL return per-task unavailable reasons without failing valid status requests. Non-ships without recorded PRs SHALL return none without remote reads.

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
