# Task orchestration

## Purpose

Record crew's existing home ownership, isolated worker lifecycle and safe copy return contracts.

## Requirements

### Requirement: One coordinator owns a home

Crew SHALL permit only one live coordinator to control work in a home, including spawning, stopping, finishing and mutating its backlog. Safe project registration SHALL NOT require ownership. An unavailable Core answer SHALL NOT authorize takeover of an existing owner. Ownership refusals SHALL identify the crew home and controlling terminal rather than imply a project folder is busy.

#### Scenario: Another coordinator is live

- **WHEN** another session starts a home whose owner terminal is live
- **THEN** crew refuses ownership and permits read-only inspection and safe project registration

#### Scenario: Owner cannot be checked

- **WHEN** Core cannot establish whether the recorded owner is alive
- **THEN** crew retains the recorded owner rather than treating uncertainty as death

#### Scenario: Settings registration does not grant orchestration rights

- **WHEN** a process without the owner's terminal registers a project and tries to spawn, stop or finish work
- **THEN** registration is allowed but work control is refused with a message identifying the crew home and its owner

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

### Requirement: Project registration is atomic across sessions

Crew SHALL allow any local session to add or remove registrations without taking home ownership. Concurrent registration changes SHALL preserve unrelated entries and registry metadata and expose only complete registry snapshots. The owning coordinator SHALL see successful changes on its next command without restarting its agent.

#### Scenario: Settings registers while a coordinator owns the home

- **WHEN** a settings process with no terminal adds a valid project while another terminal owns the home
- **THEN** the entry is persisted without changing the owner and the existing coordinator can select it on its next spawn

#### Scenario: Concurrent edits keep both results

- **WHEN** the owner and another process register different projects concurrently
- **THEN** both entries and existing registry metadata remain after both commands succeed

#### Scenario: Concurrent removal and addition preserve unrelated entries

- **WHEN** one process removes an unused project while another adds a different project
- **THEN** both successful changes remain and no stale registry snapshot restores the removed entry

#### Scenario: A registration transaction cannot proceed safely

- **WHEN** the registry is invalid or its transaction lock cannot be acquired within a bounded wait
- **THEN** crew refuses with a specific diagnostic identifying the crew home, leaves the registry unchanged and does not steal ownership

### Requirement: Registration changes preserve task cleanup references

Crew SHALL refuse removal or path replacement while a project has unfinished tasks or closed tasks with working copies still to return. Changing a registered path SHALL require explicit replacement consent. Task admission and registration changes SHALL have an ordering that prevents work starting against a removed or replaced registration.

#### Scenario: Another session removes a project used by work

- **WHEN** a non-owner removes a project with an unfinished task or a closed task awaiting copy return
- **THEN** crew identifies the blocking tasks and keeps the registration unchanged

#### Scenario: Another session replaces a path

- **WHEN** a non-owner registers a different repository under an existing project name
- **THEN** crew requires explicit replacement consent and refuses even with consent while unfinished tasks or waiting copies reference that project

#### Scenario: Removal races a spawn

- **WHEN** removal or path replacement races the owner's admission of a task for that project
- **THEN** either task admission wins and blocks the registration change, or the registration change wins and admission uses the current registration or refuses before creating a copy or terminal

#### Scenario: Task references cannot be checked

- **WHEN** removal or path replacement cannot safely determine which tasks still need the registration
- **THEN** crew preserves the registration and explains why the safety check could not complete

### Requirement: Dotted project names preserve their identity

Crew SHALL accept project names of 1 to 40 lowercase ASCII letters, digits, dashes and dots, starting with a letter or digit, excluding consecutive dots and a trailing dot. Project names SHALL remain distinct from task IDs. Registry operations, project selection, dispatch, backlog forwarding and status SHALL preserve the exact project name; working-copy allocation and task-based branch names SHALL remain valid for dotted projects.

#### Scenario: A dotted project completes the normal workflow

- **WHEN** a project named `agentnumberone.dev` is registered and selected by an owner for scout or ship work
- **THEN** registry listing, dispatch and status retain that exact name, backlog commands forward it unchanged, and plain or delivery-managed copies and ship branches are created without project-name normalization or Git errors

#### Scenario: A dotted repository uses a pool slot

- **WHEN** the owner spawns work in a dotted project folder and delivery allocates a pooled working copy
- **THEN** crew invokes delivery in the correct repository and records the returned pool path without rewriting the project name or guessing a pool folder

#### Scenario: An invalid project name is supplied

- **WHEN** an explicit project name is empty, too long, starts incorrectly, contains unsupported characters, has consecutive dots or ends in a dot
- **THEN** crew refuses with the supplied name and a specific explanation of the violated naming rule rather than bare usage text

#### Scenario: Dotted project selection does not relax task IDs

- **WHEN** a caller supplies a dotted project name with a valid task ID
- **THEN** crew accepts project selection without changing the existing task-ID constraints or task-based branch naming

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

### Requirement: Saved review starts swap advisory activity labels

After saving a launched reviewer, crew SHALL best-effort add the current `under-review` name to its implementation PR and remove assigned current and historical names of both verdict keys and historical activity names. All delivery kinds SHALL use these hooks. Crew SHALL skip Plan reports and plain branches without a PR at review time. Label operations SHALL NOT write task records. Start writes SHALL stop once the reviewer is no longer working.

#### Scenario: A new review replaces an earlier verdict

- **WHEN** crew successfully launches and saves a reviewer whose parent has an implementation PR carrying either verdict label
- **THEN** crew attempts each relevant current or historical verdict removal once and adds the current activity name once, preserving unrelated labels

#### Scenario: A branch has no implementation PR

- **WHEN** a plain branch has no PR at review time or the parent report is a Plan
- **THEN** ordinary branch review proceeds without label changes

#### Scenario: Old activity and verdict names are still assigned

- **WHEN** the PR carries historical activity or verdict assignments during a new review start
- **THEN** crew attempts removal of those assignments and adds only the current activity name

#### Scenario: Completion overtakes a start lookup

- **WHEN** the reviewer is no longer working before a start mutation
- **THEN** the remaining start writes are skipped without overwriting the completed verdict

### Requirement: Saved review verdicts swap advisory result labels

After saving a reviewer's report, crew SHALL use an exact first-line `APPROVE` or `CHANGES NEEDED` to best-effort remove current and historical activity names and opposite verdict names, remove historical selected-verdict names, and add the current approved or rework name respectively. Malformed or missing reports SHALL cause no label changes. Crew SHALL keep these first-line words as its internal verdict contract.

#### Scenario: Reviewer approves

- **WHEN** a reviewer reports APPROVE through crew done
- **THEN** completion is saved before any label request, and crew attempts activity and previous verdict cleanup and addition of the current approved name

#### Scenario: Reviewer requests changes

- **WHEN** a reviewer reports CHANGES NEEDED through crew done
- **THEN** completion is saved before any label request, and crew attempts activity and previous verdict cleanup and addition of the current rework name

#### Scenario: Report is malformed or missing

- **WHEN** a report lacks either exact first-line verdict or ordinary done validation refuses a missing report
- **THEN** no label operation occurs and the ordinary command outcome is unchanged

#### Scenario: Legacy assignments remain when a verdict arrives

- **WHEN** a valid verdict arrives on a PR carrying `🤖 Under review` or `🤖 Changes needed` listed as historical names
- **THEN** crew attempts each legacy removal once and never adds a historical name

### Requirement: Review label swaps remain advisory and definition preserving

Crew SHALL use signed-in gh credentials and existing shared label definitions only. Each mutation SHALL be attempted at most once per hook. Any failure SHALL produce one warning line per hook without changing review/done state or exit code. Explicit case-insensitive DELIVERY_LABELS_ENABLED=false, without trimming, or unreadable variables SHALL prevent writes. Swaps SHALL NOT replace unrelated assignments or create definitions.

#### Scenario: Verdict definition is missing

- **WHEN** an activity label is assigned but the selected current verdict definition is absent
- **THEN** crew still attempts current and historical assignment cleanup, skips the verdict addition with one warning, and accepts completion normally without falling back to an old name

#### Scenario: Repository opts out or variable access fails

- **WHEN** the repository variable is false in any letter case or variables cannot be read
- **THEN** the hook warns once without label writes, manifest reads or changes to the ordinary review/done outcome

#### Scenario: Mutations fail

- **WHEN** one or more requests fail due to permission, network or definition errors
- **THEN** the command retains its saved task outcome, prints one warning line and does not retry

#### Scenario: Activity definition is not yet synchronized

- **WHEN** the manifest's current activity definition is missing in the consuming repository but its historical definition exists
- **THEN** crew clears relevant assigned legacy labels, skips activity addition with one warning, and never adds the historical activity name

### Requirement: Minimal review labels have explicit lifecycle limitations

Crew SHALL NOT retry or reconcile review labels through wait, stop, finish, land, relaunch, tell, start or status. It SHALL NOT add label ownership, per-attempt state, signaling session identity, locks or pending-label status fields. The first overlapping verdict SHALL remove activity labels even if another reviewer runs. Shared merge/close cleanup SHALL clear only current and historical activity labels; verdict labels SHALL remain a record.

#### Scenario: Reviewer stops without a valid verdict

- **WHEN** the reviewer crashes, is stopped or cannot remove its activity assignment
- **THEN** activity labels can remain until shared close/merge cleanup or manual removal, without crew lifecycle recovery

#### Scenario: Reviewers overlap

- **WHEN** the first of two reviewers on one PR reports a valid verdict
- **THEN** its current and historical activity removal is attempted even while the second reviewer is still running

#### Scenario: Status is inspected

- **WHEN** ordinary or explicit PR-discovery status is read
- **THEN** label signaling performs no requests or metadata writes and adds no pending-label display

### Requirement: Review label names resolve by stable manifest key

Each eligible hook SHALL read `labels/base.json` once through signed-in GitHub API access from the source repository's default branch, with a two-second timeout and no retries or disk cache. `CREW_REVIEW_LABELS_REPO` SHALL select the source, defaulting to `timurproko/MyWorkflows`. Crew SHALL resolve `name` and optional `previousNames` by keys `under-review`, `review-approved` and `review-changes-needed` in the version-1 `labels` object.

#### Scenario: Shared names change without a crew release

- **WHEN** a valid manifest supplies renamed labels and historical names for the three stable keys
- **THEN** that hook uses the supplied names and aliases rather than hard-coded display names, making one manifest request after opt-out checks

#### Scenario: Source repository is configured

- **WHEN** `CREW_REVIEW_LABELS_REPO` names another owner/repository
- **THEN** crew reads its default-branch manifest instead of assuming every project uses timurproko/MyWorkflows

#### Scenario: Manifest cannot be used

- **WHEN** the manifest request fails, times out, or returns invalid content or missing required keys
- **THEN** crew uses built-in `🤖 Review`, `🤖 Approved` and `🤖 Rework`, with `🤖 Under review` and `🤖 Changes needed` as historical aliases, and includes the fallback diagnostic in its single warning line

#### Scenario: Older manifest omits aliases

- **WHEN** an otherwise valid version-1 manifest lacks `previousNames` on a key
- **THEN** crew treats that key's historical list as empty

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
