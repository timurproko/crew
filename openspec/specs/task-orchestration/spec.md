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

### Requirement: Saved review starts swap advisory activity labels

After saving a launched reviewer, crew SHALL best-effort add `🤖 Under review` to its implementation PR and remove existing `🤖 Approved` and `🤖 Changes needed` assignments. All delivery kinds SHALL use these hooks. Crew SHALL skip Plan reports and plain branches without a PR at review time. Label operations SHALL NOT write task records.

#### Scenario: A new review replaces an earlier verdict

- **WHEN** crew successfully launches and saves a reviewer whose parent has an implementation PR carrying either verdict label
- **THEN** crew attempts each relevant verdict removal once and adds Under review once, preserving unrelated labels

#### Scenario: A branch has no implementation PR

- **WHEN** a plain branch has no PR at review time or the parent report is a Plan
- **THEN** ordinary branch review proceeds without label changes

### Requirement: Saved review verdicts swap advisory result labels

After saving a reviewer's report, crew SHALL use an exact first-line `APPROVE` or `CHANGES NEEDED` to best-effort remove `🤖 Under review` and add `🤖 Approved` or `🤖 Changes needed` respectively. Malformed or missing reports SHALL cause no label changes. Crew SHALL keep these first-line words as its internal verdict contract.

#### Scenario: Reviewer approves

- **WHEN** a reviewer reports APPROVE through crew done
- **THEN** completion is saved before any label request, and crew attempts removal of Under review and addition of Approved

#### Scenario: Reviewer requests changes

- **WHEN** a reviewer reports CHANGES NEEDED through crew done
- **THEN** completion is saved before any label request, and crew attempts removal of Under review and addition of Changes needed

#### Scenario: Report is malformed or missing

- **WHEN** a report lacks either exact first-line verdict or ordinary done validation refuses a missing report
- **THEN** no label operation occurs and the ordinary command outcome is unchanged

### Requirement: Review label swaps remain advisory and definition preserving

Crew SHALL use signed-in gh credentials and existing shared label definitions only. Each mutation SHALL be attempted at most once per hook. Any failure SHALL produce one warning line per hook without changing review/done state or exit code. Explicit case-insensitive DELIVERY_LABELS_ENABLED=false, without trimming, or unreadable variables SHALL prevent writes. Swaps SHALL NOT replace unrelated assignments or create definitions.

#### Scenario: Verdict definition is missing

- **WHEN** Under review is assigned but the selected verdict definition is absent
- **THEN** crew still attempts activity removal, skips the verdict addition with one warning, and accepts completion normally

#### Scenario: Repository opts out or variable access fails

- **WHEN** the repository variable is false in any letter case or variables cannot be read
- **THEN** the hook warns once without label writes or changes to the ordinary review/done outcome

#### Scenario: Mutations fail

- **WHEN** one or more requests fail due to permission, network or definition errors
- **THEN** the command retains its saved task outcome, prints one warning line and does not retry

### Requirement: Minimal review labels have explicit lifecycle limitations

Crew SHALL NOT retry or reconcile review labels through wait, stop, finish, land, relaunch, tell, start or status. It SHALL NOT add label ownership, per-attempt state, signaling session identity, locks or pending-label status fields. The first overlapping verdict SHALL remove Under review even if another reviewer runs. Shared merge/close cleanup SHALL clear only Under review; verdict labels SHALL remain a record.

#### Scenario: Reviewer stops without a valid verdict

- **WHEN** the reviewer crashes, is stopped or cannot remove its activity assignment
- **THEN** Under review can remain until shared close/merge cleanup or manual removal, without crew lifecycle recovery

#### Scenario: Reviewers overlap

- **WHEN** the first of two reviewers on one PR reports a valid verdict
- **THEN** its activity removal is attempted even while the second reviewer is still running

#### Scenario: Status is inspected

- **WHEN** ordinary or explicit PR-discovery status is read
- **THEN** label signaling performs no requests or metadata writes and adds no pending-label display
