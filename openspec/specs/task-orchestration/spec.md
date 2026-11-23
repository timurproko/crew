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

### Requirement: Reviews signal activity on existing implementation pull requests

Crew SHALL attempt to add only `🤖 Under review` to an existing implementation pull request before launching its reviewer, using the signed-in GitHub credential. This SHALL apply to every project kind with a PR at review time, including draft and pending-CI PRs. Crew SHALL NOT create or redefine the repository label; its shared definition is color `840479` and empty description.

#### Scenario: Workflow implementation already has a draft pull request

- **WHEN** crew starts a reviewer for a reported implementation whose first line identifies its draft PR
- **THEN** crew attempts to add the exact label to that PR before the reviewer terminal starts, preserving unrelated labels

#### Scenario: Current branch has a pull request for another delivery kind

- **WHEN** a gate or plain project's task has an existing implementation PR at review time
- **THEN** crew resolves that PR from its implementation report or current branch and attempts the same label addition

#### Scenario: Workflow report is a plan

- **WHEN** a task's current report starts with `Plan:`
- **THEN** crew refuses an implementation review of that plan and does not label it or launch an implementation reviewer

#### Scenario: Plain project does not have a pull request yet

- **WHEN** a reported plain project's branch has no PR until land
- **THEN** crew starts its ordinary branch reviewer without a label and explains that no PR exists to label

#### Scenario: Repository label has not been synchronized

- **WHEN** the repository does not have the shared label definition
- **THEN** crew reports the missing definition and launches the review without creating a repository label

### Requirement: Review activity ends release the advisory assignment

Crew SHALL release a review's label ownership on either verdict, malformed or failed completion, confirmed stop or finish, failed launch, a handover gap without a live reviewer, or observed death or abandonment. Existing acting review, wait, done, stop, finish, land, relaunch and start observations SHALL reconcile leftover reviews. An unknown Core response SHALL NOT alone prove death.

#### Scenario: Either review verdict arrives

- **WHEN** a reviewer reports `APPROVE` or `CHANGES NEEDED` using `crew done`
- **THEN** crew ends its label ownership regardless of the verdict

#### Scenario: Reviewer reports malformed output

- **WHEN** a reviewer completes with a report lacking either expected verdict
- **THEN** crew still ends its activity ownership rather than leaving the label indefinitely

#### Scenario: Reviewer is stopped or closed

- **WHEN** crew confirms a reviewer's stop or finishes that reviewer
- **THEN** crew ends its label ownership without affecting unrelated PR labels

#### Scenario: Reviewer cannot launch

- **WHEN** a label addition was attempted but working-copy creation or terminal launch fails
- **THEN** crew ends the failed attempt's label ownership and attempts any required cleanup

#### Scenario: Reviewer is replaced

- **WHEN** the old reviewer is confirmed ended during a relaunch or handover
- **THEN** crew reconciles old ownership before signaling the replacement and retains no active ownership for a failed replacement launch

#### Scenario: Lifecycle command observes death or abandonment

- **WHEN** wait, start, or parent finish or land confirms a reviewer is dead or abandoned under crew's liveness rules
- **THEN** crew releases its ownership and retries any required label removal

#### Scenario: Core does not answer

- **WHEN** a recovery command cannot determine whether a reviewer is alive
- **THEN** crew retains its activity ownership rather than treating uncertainty as death

### Requirement: Local overlapping reviewers retain a single activity assignment

Crew SHALL retain the assignment while any local reviewer for the same PR remains active. Ending an old attempt SHALL NOT clear a newer attempt's assignment, including after relaunch or overlapping completion and launch commands. Crew SHALL NOT promise coordination between independent homes or external review runners.

#### Scenario: One of two reviewers finishes

- **WHEN** one of two local reviewers on the same PR finishes
- **THEN** crew keeps the label until the last active reviewer ends

#### Scenario: An old cleanup retries after a replacement starts

- **WHEN** stale cleanup for an ended attempt runs while a newer reviewer on that PR is active
- **THEN** crew does not remove the newer review's activity label

#### Scenario: Launch overlaps another reviewer's completion

- **WHEN** a local review launch overlaps label cleanup by another local reviewer
- **THEN** the commands preserve an assignment for the remaining active review rather than applying a stale deletion

### Requirement: Label signaling is advisory and recoverable

Crew SHALL surface add or remove failures without failing or gating review, reporting, stop, finish, handover or land. It SHALL retain pending signaling work for retry through existing lifecycle commands. Removal of a confirmed absent assignment SHALL succeed; inaccessible PRs and permission failures SHALL NOT be treated as absence. Label presence or absence SHALL NOT signify GitHub approval or merge eligibility.

#### Scenario: Addition fails temporarily

- **WHEN** GitHub rejects or cannot receive an add request
- **THEN** crew launches the reviewer, prints a signaling warning, and retries addition on a later recovery observation if that review is still active

#### Scenario: Removal fails temporarily

- **WHEN** GitHub rejects a required removal
- **THEN** crew preserves the task's normal completion result, surfaces a warning, and retains the pending removal for a later lifecycle retry

#### Scenario: Assignment is already absent

- **WHEN** removal encounters an absent assignment and crew confirms access to the PR and absence of that label
- **THEN** crew treats cleanup as successful and preserves all other labels

#### Scenario: A not-found response hides an inaccessible PR

- **WHEN** GitHub returns not-found and crew cannot establish PR accessibility and assignment absence
- **THEN** crew reports cleanup failure and retains retry intent instead of claiming successful removal

#### Scenario: Parent is already landed or reviewer already closed

- **WHEN** an existing lifecycle command revisits a landed parent or closed reviewer with failed label cleanup
- **THEN** crew retries the required signaling without changing the ordinary delivery or closure result
