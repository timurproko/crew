# Spec Delta

## ADDED Requirements

### Requirement: Task terminals advertise their pull request

Crew SHALL publish a known full PR URL as `crew.pr` on a reviewer terminal at launch and on ship/fix terminals at launch or when report, land or verified status discovery learns the URL. Later knowledge SHALL update the recorded current terminal, not require a replacement launch. Discovered URLs SHALL NOT become authoritative task.pr merely to label a terminal.

#### Scenario: Reviewer starts for a known PR

- **WHEN** crew launches a reviewer for a task with a known implementation PR
- **THEN** the reviewer terminal has crew.kind=review and crew.pr equal to that PR's full URL, independent of its checkout branch

#### Scenario: Ship or fixer starts with a known PR

- **WHEN** crew launches a ship/fix worker or its replacement with a known task PR
- **THEN** that terminal receives the full URL as crew.pr

#### Scenario: Report first identifies a PR

- **WHEN** a worker's accepted report supplies its task PR
- **THEN** crew updates crew.pr on that task's existing terminal without relaunching it

#### Scenario: Land first identifies a PR

- **WHEN** land records or opens the task's PR
- **THEN** crew updates crew.pr on the ship/fix terminal

#### Scenario: Discovery first identifies a PR

- **WHEN** explicit status discovery saves an exact verified PR observation for a task with a recorded terminal
- **THEN** crew best-effort publishes its URL there while leaving authoritative task.pr, stage and delivery state unchanged

### Requirement: Ship review context survives terminal loss

Crew SHALL persist reviewRound and lastFinding for ship work and publish them as crew.round and crew.finding on its current terminal. Round SHALL start at 1 and increase once per distinct review reporting CHANGES NEEDED. lastFinding SHALL contain the first line of the latest BLOCKING finding, sanitized to one line without control characters and at most 200 Unicode code points. APPROVE SHALL clear lastFinding and crew.finding without resetting the round.

#### Scenario: First ship round

- **WHEN** ship work starts before any changes-requesting review
- **THEN** its round is 1 and no blocking finding is advertised

#### Scenario: Changes are requested

- **WHEN** a reviewer reports CHANGES NEEDED with classified findings
- **THEN** the ship round increases by one and its finding becomes the first BLOCKING finding's first line, not a preceding FOLLOW-UP or heading

#### Scenario: Verdict bookkeeping repeats

- **WHEN** the same review verdict is processed twice, including local and PR-head bookkeeping in one command
- **THEN** the round increases only once for that reviewer

#### Scenario: Finding text is unsafe or long

- **WHEN** a BLOCKING finding contains control characters or exceeds the length limit
- **THEN** stored and published text contains no control characters and is truncated safely without splitting a Unicode code point

#### Scenario: Approval clears the finding

- **WHEN** the latest valid review verdict is APPROVE
- **THEN** lastFinding becomes null and the ship terminal's crew.finding is removed or emptied, while the current round remains unchanged

#### Scenario: No blocking line is available

- **WHEN** a legacy CHANGES NEEDED report has no identifiable BLOCKING finding
- **THEN** the round advances once and lastFinding is null rather than fabricated from unrelated prose

### Requirement: Ordinary JSON status exposes review context

Ordinary status --json SHALL add reviewRound and lastFinding per task using saved task metadata, even without a live terminal. Ship/fix tasks without saved review context SHALL default to 1 and null. Reviewer and other scout tasks SHALL return null for these fields. Status SHALL NOT read reports to derive them. The minimal fleet v1 shape SHALL remain unchanged.

#### Scenario: Worker terminal has ended

- **WHEN** ordinary JSON status includes a ship whose terminal ended after a changes-requesting review
- **THEN** reviewRound and lastFinding retain the saved context without depending on terminal labels

#### Scenario: Legacy task or unrelated scout

- **WHEN** ordinary JSON status includes tasks lacking saved review context
- **THEN** ships/fixers expose reviewRound=1 and lastFinding=null, and scouts/reviewers expose both fields as null

#### Scenario: Fleet consumer keeps its contract

- **WHEN** status --json --view fleet is requested
- **THEN** no reviewRound or lastFinding fields are added to fleet v1 rows

### Requirement: Terminal metadata is best effort

Crew SHALL bound terminal-metadata writes and never fail an otherwise successful command because labeling fails. Failures SHALL emit one single-line warning per affected hook on stderr, preserve saved task/report/verdict outcomes and leave JSON stdout valid. Metadata hooks SHALL NOT add GitHub requests, retries, background sweeps or mutations of unrelated terminals or labels.

#### Scenario: Terminal has ended or Core is unavailable

- **WHEN** a metadata hook cannot label its task's recorded terminal
- **THEN** the command continues with its normal exit result and saved facts, with one warning line and no retry

#### Scenario: GitHub advisory labels are disabled

- **WHEN** repository advisory-label writes are opted out or fail
- **THEN** local terminal metadata and persisted review context still update independently

## MODIFIED Requirements

### Requirement: Discovery is bounded and read-only for every caller

Crew SHALL allow non-owner discovery without changing ownership, reports, delivery authority or Git state; only separate verified PR facts may be saved, with best-effort publication of their URL to the task's recorded terminal. GitHub reads SHALL be serial, bounded in size, limited to two seconds each and ten seconds total, without retries. Failures SHALL return per-task unavailable reasons without failing valid status requests. Non-ships without recorded PRs SHALL return none without remote reads.

#### Scenario: Non-owner inspects an active home

- **WHEN** a non-owner session requests discovery while the coordinator is live
- **THEN** it receives results without claiming ownership, setting authoritative task.pr, changing stages, or landing tasks; only verified observation facts can be saved and their URL published as terminal metadata

#### Scenario: GitHub is unavailable or unsupported

- **WHEN** a task's origin is not GitHub, credentials or tools are missing, a response is malformed, or a subprocess times out
- **THEN** its result is unavailable with a nonempty reason and status continues for the other tasks within the shared budget

#### Scenario: Budget expires with tasks remaining

- **WHEN** the shared discovery budget is exhausted
- **THEN** unqueried eligible tasks return unavailable with reason budget-exhausted and no further GitHub subprocess starts

#### Scenario: Local state remains authoritative

- **WHEN** discovery returns a PR before a worker reports
- **THEN** only separate observation facts and terminal PR metadata may be updated and subsequent done and land commands retain their existing report, stage and delivery checks

### Requirement: Minimal review labels have explicit lifecycle limitations

Crew SHALL use only Build, Review and Approved roles, with names from the shared manifest, and no approval-waiting-for-CI state. Tell, relaunch, verdict processing and plain land SHALL update relevant open-PR roles best-effort; status and reported-task wait SHALL remain read-only toward GitHub labels. No background sweep, lease or pending-label protocol SHALL be added. Abandoned reviews SHALL retain existing last-local-reviewer restoration safeguards. Closed/merged PRs SHALL receive no new role assignments.

#### Scenario: Reviewer stops without a valid verdict

- **WHEN** the last active local reviewer stops without a verdict
- **THEN** crew removes activity and restores the saved unambiguous prior role, or none, unless a newer verdict or follow-up superseded it

#### Scenario: Reviewers overlap

- **WHEN** the first of two reviewers on one PR reports a valid verdict
- **THEN** its activity removal is attempted even while the second reviewer runs, while abandonment cleanup waits for the last active local reviewer

#### Scenario: Status is inspected

- **WHEN** ordinary or explicit PR-discovery status is read
- **THEN** GitHub label signaling performs no requests or metadata writes and adds no pending-label display; only explicit discovery may publish verified PR terminal metadata

#### Scenario: Worker is sent follow-up work

- **WHEN** a successful tell or relaunch reopens a ship with an existing managed assignment on an open PR
- **THEN** crew selects Build using today's current name for the stable changes-needed role, without inventing a fourth managed label

#### Scenario: Current names change later

- **WHEN** the manifest renames the changes-needed role from today's Rework name to Build
- **THEN** all hooks use the same new name and historical aliases through one role table, without changing verdict parsing

### Requirement: Unsupported status views have detectable errors

Crew SHALL reject unknown --view values with a nonzero usage exit and a stable unsupported-status-view diagnostic naming the value. Fleet SHALL require --json. Status without --view, including --all with or without discovery, SHALL retain existing serialized fields and order except for additive reviewRound and lastFinding per task. These additions SHALL NOT alter the minimal fleet v1 shape.

#### Scenario: New client probes unsupported view

- **WHEN** a caller supplies --view with an unknown name
- **THEN** Crew reports unsupported-status-view before discovery or status projection rather than silently returning full status

#### Scenario: View argument is missing or JSON is absent

- **WHEN** a caller supplies --view without a value or --view fleet without --json
- **THEN** Crew returns a clear usage error without starting discovery

#### Scenario: Legacy consumer still requests all history

- **WHEN** a caller requests status --all --json without --view
- **THEN** all historical rows and legacy fields remain present alongside reviewRound and lastFinding, and cached lifecycle facts introduce no other new output fields

### Requirement: Legacy tasks and orchestration commands remain compatible

Tasks without placement metadata SHALL retain their old combined placement for inherited launches and remain reportable and finishable without bulk migration. Status, wait, tell, review, relaunch and finish SHALL retain their existing space contracts in mixed layouts. End SHALL release ownership without moving or removing running work. Status SHALL NOT reconcile spaces; its only new outputs are ordinary JSON review context and verified PR terminal metadata during explicit discovery.

#### Scenario: Updated tool loads an old running task

- **WHEN** a pre-change combined task is loaded after per-project mode is enabled
- **THEN** status, wait, tell, review, replacement and finish still work and do not move the existing worker or infer project placement from the current setting

#### Scenario: Coordinator releases a mixed home

- **WHEN** the coordinator runs end while combined and project-bound workers exist
- **THEN** ownership is released and the existing workers, task bindings and occupied spaces remain untouched

#### Scenario: Another coordinator starts with earlier-session tasks

- **WHEN** a mixed home is released, another coordinator starts it and changes the mode
- **THEN** earlier-session terminals remain unchanged, new independent tasks use the newly saved mode, and earlier tasks' reviews, replacements and finish use their original placement and ownership evidence

#### Scenario: An inspector reads fleet status

- **WHEN** a non-owner requests minimal fleet status for a mixed layout
- **THEN** the existing output shape is preserved and no space mutation occurs; only explicit discovery may publish a verified PR URL to a task's recorded terminal
