# Task orchestration

## Purpose

Record crew's existing home ownership, isolated worker lifecycle and safe copy return contracts.

## Requirements

### Requirement: One coordinator owns a home

Crew SHALL permit only one live coordinator to control work in a home, including spawning, stopping, finishing and mutating its backlog. Safe project registration and the explicit local worker-space setter SHALL NOT require ownership. An unavailable Core answer SHALL NOT authorize takeover of an existing owner. Ownership refusals SHALL identify the crew home and controlling terminal rather than imply a project folder is busy.

#### Scenario: Another coordinator is live

- **WHEN** another session starts a home whose owner terminal is live
- **THEN** crew refuses ownership and permits read-only inspection, safe project registration and the explicit local worker-space-only setter

#### Scenario: Owner cannot be checked

- **WHEN** Core cannot establish whether the recorded owner is alive
- **THEN** crew retains the recorded owner rather than treating uncertainty as death

#### Scenario: Settings registration does not grant orchestration rights

- **WHEN** a process without the owner's terminal registers a project and tries to spawn, stop or finish work
- **THEN** registration is allowed but work control is refused with a message identifying the crew home and its owner

#### Scenario: Local worker-space permission does not grant orchestration rights

- **WHEN** a non-terminal process successfully sets worker-space through the explicit local interface and then tries to spawn, stop, finish or release the home
- **THEN** those operations retain their existing ownership refusals and the owner remains unchanged

### Requirement: Workers have isolated tasks and written reports

Crew SHALL launch each worker in its own working copy and Core terminal with a task brief and report path. A worker SHALL report completion with `crew done` from its own terminal.

#### Scenario: Worker completes a scout

- **WHEN** a scout writes its report and runs `crew done` for its task
- **THEN** crew records the report and makes it available to the coordinator without changing the project checkout

### Requirement: Copy return preserves unsafe or unproven work

Crew SHALL refuse unsafe non-forced ship closure and postpone return for foreign terminals, incomplete non-scratch inspection or protected work changed since its snapshot. Only a verified merged/closed task PR with no unpushed commits, tracked changes or non-ignored untracked files SHALL permit ignored scratch disposal without force. Crew SHALL retain branches not proved merged and preserve busy-worker, Git-operation and history protections.

#### Scenario: Another terminal holds a finished copy

- **WHEN** a task finishes but a terminal crew did not start is still in its copy
- **THEN** crew closes the task while recording that its copy remains to be returned, without closing that terminal even with force

#### Scenario: Ship branch has not been proved merged

- **WHEN** a ship task finishes without proof that its branch was merged
- **THEN** crew preserves that branch and its commits, including when a closed but unmerged PR permits ignored scratch disposal

#### Scenario: Verified merged PR has only ignored scratch

- **WHEN** the task's exact PR is proved merged, all local commits are published and the copy has only Git-ignored untracked leftovers
- **THEN** non-forced finish removes those leftovers and returns the copy, including ignored KEEP markers, pictures, unreadable sockets and nested ignored repositories

#### Scenario: Verified closed PR has only ignored scratch

- **WHEN** the task's exact PR is proved closed without merging, all local commits are published and the copy has only Git-ignored untracked leftovers
- **THEN** non-forced finish removes the scratch and returns the copy while retaining the unmerged branch

#### Scenario: Commit or file work remains protected

- **WHEN** a ship copy has unpushed commits, staged or unstaged tracked modifications, or non-ignored untracked files even though its PR merged or closed
- **THEN** non-forced finish refuses before stopping any worker and leaves that work intact

#### Scenario: PR closure cannot authorize the exception

- **WHEN** the PR is open, missing, unreadable, ambiguous, from another repository or branch, or does not cover the current local head
- **THEN** ignored scratch gains no automatic-discard exemption and existing KEEP, incomplete-inspection and explicit-force protections remain

#### Scenario: Protected work appears while workers leave or return waits

- **WHEN** tracked modifications, non-ignored files, unpublished commits, unsafe history or a protected Git operation appears before copy return
- **THEN** crew keeps the copy with an explanation, including after an earlier forced finish

#### Scenario: Only ignored scratch changes after eligible finish

- **WHEN** a verified closed-PR task waits to return and only its ignored scratch changes
- **THEN** those scratch changes alone do not require force, but crew rechecks protected work and terminal holders before disposal

#### Scenario: Core or a worker cannot confirm a safe stop

- **WHEN** Core cannot establish terminal ownership or removal, or a task-owned worker is busy without force
- **THEN** crew does not return the copy or treat the uncertainty as permission to close a foreign terminal

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

Crew SHALL accept project names of 1 to 40 lowercase ASCII letters, digits, dashes and dots, starting with a letter, a digit or one dot followed by one, excluding consecutive dots and a trailing dot. Project names SHALL remain distinct from task IDs. Registry operations, project selection, dispatch, backlog forwarding and status SHALL preserve the exact project name; working-copy allocation and task-based branch names SHALL remain valid for dotted projects.

#### Scenario: A dotted project completes the normal workflow

- **WHEN** a project named `agentnumberone.dev` is registered and selected by an owner for scout or ship work
- **THEN** registry listing, dispatch and status retain that exact name, backlog commands forward it unchanged, and plain or delivery-managed copies and ship branches are created without project-name normalization or Git errors

#### Scenario: A leading-dot project keeps its name

- **WHEN** a project named `.xrbuild` is registered next to a project named `xrbuild` and an owner spawns ship work with `--project .xrbuild`
- **THEN** registry listing, the task record and removal use the exact name `.xrbuild`, the two projects stay distinct, and the task's branch is built from the task ID without the project name

#### Scenario: A dotted repository uses a pool slot

- **WHEN** the owner spawns work in a dotted project folder and delivery allocates a pooled working copy
- **THEN** crew invokes delivery in the correct repository and records the returned pool path without rewriting the project name or guessing a pool folder

#### Scenario: An invalid project name is supplied

- **WHEN** an explicit project name is empty, too long (a leading dot counts toward the 40 characters), starts incorrectly (including a dot followed by anything other than a lowercase letter or digit), contains unsupported characters, has consecutive dots or ends in a dot
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

### Requirement: Finish owns every crew-started terminal of a task

Crew SHALL retain the identities of every terminal it starts for a task, including spawn, relaunch, automatic hand-over and reviewer workers. Finish SHALL stop and remove all proven task-owned terminals before returning the copy, retrying unconfirmed cleanup. Crew SHALL never adopt a terminal solely because it occupies the copy or shares labels. Legacy tasks without history SHALL retain their recorded terminal as ownership evidence.

#### Scenario: Relaunched task has surviving owned terminals

- **WHEN** a reported task has more than one recorded crew-started terminal, including an earlier or later replacement
- **THEN** finish stops and removes every owned terminal rather than treating older owned terminals as foreign holders

#### Scenario: Hand-over and reviewer launches retain ownership

- **WHEN** crew starts a replacement automatically or starts and replaces a reviewer worker
- **THEN** each launched address remains recorded on its own task and is eligible for that task's finish cleanup

#### Scenario: An unrelated terminal shares the copy or labels

- **WHEN** a terminal crew did not start occupies the copy or presents matching task labels
- **THEN** finish never closes it or infers ownership from those facts

#### Scenario: Multiple terminal cleanup is interrupted

- **WHEN** one owned terminal's stop or removal is unconfirmed
- **THEN** crew retains pending cleanup and the copy, and a later finish retries without forgetting the other owned terminals

#### Scenario: Existing task has no terminal history

- **WHEN** finish loads an old task record containing only its current terminal
- **THEN** that recorded terminal is handled compatibly without bulk record migration or guessing missing earlier terminals

### Requirement: Worker briefs keep disposable work outside the copy

Worker briefs SHALL direct proof pictures and scratch into the task's folder in the crew home, outside the working copy. Briefs SHALL require workers to stop disposable instances they started before reporting. This guidance SHALL apply to ordinary workers, reviewers and replacement workers through their task brief.

#### Scenario: Worker receives its brief

- **WHEN** crew prepares a task brief
- **THEN** it names that task's external scratch location and requires disposable instance shutdown before the report and done command

### Requirement: Cleanup reports discarded contents clearly

Finish SHALL print one clear cleanup summary identifying discarded contents or saying none were discarded. Land encountering a verified merged task SHALL use the same guarded cleanup and summary, including its already-landed path. Postponed or failed returns SHALL not claim scratch was discarded before it was removed.

#### Scenario: Finish discards closed-PR scratch

- **WHEN** finish successfully removes ignored scratch and returns the copy
- **THEN** one cleanup line identifies the ignored scratch discarded, the terminal cleanup and the copy disposition

#### Scenario: Land encounters a merged task

- **WHEN** land proves its task's existing PR merged, including on repeated land
- **THEN** it attempts the same safe cleanup and prints the discarded-contents summary rather than only returning the recorded link

#### Scenario: No disposal or postponed disposal

- **WHEN** a cleanup finds no scratch or the copy must remain held or protected
- **THEN** its summary distinguishes nothing discarded from successful disposal and identifies the remaining blocker

### Requirement: Project names stay out of git refs and working-copy paths

Crew SHALL NOT use a project name as any part of a git ref or of a working-copy name crew makes itself. A task branch SHALL be built from the task ID, and a plain working copy SHALL be named from the task ID. A delivery-managed copy is named by delivery from the repository folder, not by crew, so it MAY contain the folder's dot name. A leading-dot project name therefore never reaches a git ref.

#### Scenario: Ship work in a leading-dot project

- **WHEN** an owner spawns ship work in a plain-workflow project named `.xrbuild`
- **THEN** the task's branch and working-copy folder are named from the task ID and contain no part of the project name

### Requirement: Worker-space mode is an immediate home setting

Crew SHALL provide `crew config worker-space` to show and `crew config worker-space combined|per-project` to change the persistent mode. Missing configuration SHALL mean combined. Reads SHALL be open; the positional setter SHALL require the owner, with only the explicit local setter exempt. Independent admission SHALL use the latest ordered setting without restart. Invalid values SHALL be refused without changing configuration or live work.

#### Scenario: Existing home has no setting

- **WHEN** a home without a worker-space setting launches tasks for two projects
- **THEN** both use the existing combined space identity and the show command reports combined

#### Scenario: Owner changes the mode

- **WHEN** the owning coordinator sets per-project and next admits a new independent task
- **THEN** that task uses per-project placement without a session restart and no existing terminal is moved

#### Scenario: Setting access is invalid or unauthorized

- **WHEN** a non-owner uses the positional setter or an invalid mode is supplied through either setter
- **THEN** Crew refuses and leaves settings, registry entries, terminals and spaces unchanged

#### Scenario: Registration and settings change concurrently

- **WHEN** a setting change races project registration or task admission
- **THEN** registry data is preserved and each admitted task uses one complete setting snapshot ordered before or after the setting change

#### Scenario: Mode changes while a spawn is in progress

- **WHEN** a mode change races a spawn's initial task reservation
- **THEN** reservation before the change retains its saved placement even if Core starts later, while reservation after the change uses the new mode, without moving or relabeling another worker

### Requirement: New workers group by the selected mode

Crew SHALL request one shared automatic space per home in combined mode and one per registered project in per-project mode. A project space SHALL be requested lazily at first spawn and reused by later independent tasks for that project. Per-project placement metadata SHALL request the exact registered name for display, preserving dots. Machine-local identities SHALL NOT link workers to another machine's coordinator.

#### Scenario: Two projects use per-project mode

- **WHEN** tasks for herdr-app and crew are spawned in per-project mode
- **THEN** they advertise distinct automatic space identities and the requested display names herdr-app and crew

#### Scenario: Same project already has a space

- **WHEN** another independent task for that project is spawned in per-project mode
- **THEN** it requests the same project space identity rather than another space

#### Scenario: A dotted project has a pooled copy

- **WHEN** a task for `.xrbuild` or `agentnumberone.dev` starts in a delivery pool slot
- **THEN** its requested space name is the exact registered name rather than the pool directory basename

#### Scenario: No workers have been launched

- **WHEN** a project is registered or the mode is changed without spawning a task
- **THEN** Crew does not create a space or launch a keeper terminal

#### Scenario: A remote machine has matching local IDs

- **WHEN** another machine has similarly named spaces or terminal addresses
- **THEN** those identities remain machine-qualified and do not authorize cross-machine attachment or cleanup

#### Scenario: Personal space has the same displayed name

- **WHEN** a personal space shares a project's displayed name but not its exact home-scoped automatic identity
- **THEN** Crew neither reuses nor renames that personal space and does not delete it when finishing the project's workers

### Requirement: Task placement survives mode changes and replacement

Crew SHALL retain a task's selected space independently of subsequent home settings. Reviewers SHALL inherit the reviewed task's placement; relaunch and automatic hand-over SHALL inherit the replaced task's placement. Mode changes SHALL NOT move, relabel or interrupt running workers. New independent tasks SHALL follow the current mode, even when older tasks for their project occupy another mode's space.

#### Scenario: Combined changes to per-project during work

- **WHEN** combined tasks remain running while the owner selects per-project
- **THEN** a new independent task for the same project requests its project space rather than joining its older shared workers, while existing tasks, their later reviewers and replacements retain combined placement and remain finishable

#### Scenario: Per-project changes to combined during work

- **WHEN** project-bound tasks remain running while the owner selects combined
- **THEN** new independent tasks for projects both with and without an existing project space use the combined space, while existing tasks, their later reviewers and replacements retain their project placement and remain finishable

#### Scenario: Mode switches back

- **WHEN** the owner selects a mode previously used by still-occupied spaces
- **THEN** new independent tasks reuse that mode's matching space identities without moving the other tasks

#### Scenario: Provider stop starts a replacement

- **WHEN** quota/login recovery or manual relaunch starts a replacement after the mode changed
- **THEN** the replacement advertises the task's saved placement and preserves its copy and terminal-ownership history

### Requirement: Self-repair placement identifies Crew safely

Crew self-repairs SHALL use combined placement in combined mode. In per-project mode they SHALL reuse a registration named crew only when it identifies Crew's own repository; otherwise they SHALL request a separate internal repair space named crew. An unrelated registration named crew SHALL NOT receive the fixer. Repair task identity, dispatch and replacement inheritance SHALL remain unchanged.

#### Scenario: Crew source is registered accurately

- **WHEN** a new per-project self-repair starts and the crew registration identifies the tool's repository
- **THEN** it requests that project's space while retaining its internal repair task identity

#### Scenario: Crew registration is missing or unrelated

- **WHEN** a new per-project self-repair starts without a matching crew registration
- **THEN** it requests the internal repair space named crew rather than joining an unrelated project's space

#### Scenario: Shared repair placement protects registration identity

- **WHEN** an unfinished self-repair or one with a copy waiting shares a registered crew project's placement
- **THEN** removing or repointing that registration is refused until the reference is released, preventing an unrelated repository from joining the occupied repair space

### Requirement: Space cleanup never expands terminal ownership

Crew SHALL remove only terminals it recorded starting, never close an entire space, and leave automatic empty-space removal to Herdr. Finishing one task SHALL preserve spaces still occupied by other workers or foreign tabs. Even force SHALL NOT close a foreign terminal. Reports alone SHALL NOT remove a worker's space; unavailable or unconfirmed cleanup SHALL retain existing safety protections.

#### Scenario: Last task finishes in an empty automatic space

- **WHEN** finish removes the project's final owned worker terminal and no other tab remains
- **THEN** the automatic space is eligible for Herdr's zero-tab removal while other occupied project spaces remain unaffected

#### Scenario: Another project task remains

- **WHEN** one of several tasks in a project space finishes
- **THEN** Crew removes only that task's recorded terminals and the remaining workers keep their space

#### Scenario: Foreign terminal occupies the worker space

- **WHEN** the last Crew task finishes but a terminal Crew did not create remains in that space, including at another cwd
- **THEN** Crew leaves that terminal untouched even with force and the nonempty space remains

#### Scenario: Worker was moved into an ordinary space

- **WHEN** finish removes an owned worker terminal that the person moved into an ordinary space
- **THEN** Crew does not issue a close/delete operation on that space or any unrelated tab

#### Scenario: Worker reports or removal is uncertain

- **WHEN** a worker reports without finish or Core cannot confirm its terminal removal
- **THEN** Crew does not use the report or uncertainty to delete a space or bypass terminal/copy safeguards

### Requirement: Legacy tasks and orchestration commands remain compatible

Tasks without placement metadata SHALL retain old combined inheritance and remain reportable and finishable without bulk migration. Status, wait, tell, review, relaunch and finish SHALL retain existing contracts except the plain-status mode line. End SHALL release ownership without moving or removing work. Read-only status SHALL NOT reconcile spaces or change legacy or minimal fleet JSON output contracts.

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

- **WHEN** a non-owner requests legacy JSON or minimal fleet status for a mixed layout
- **THEN** the existing output contract is preserved and no space or terminal mutation occurs

### Requirement: Local worker-space support is explicitly discoverable

Crew SHALL support the read-only, home-independent `crew config worker-space --capabilities --json` probe. Exit 0 SHALL return one JSON object with capability `worker-space-local-set`, version 1, modes combined and per-project, and explicitHome true. Help SHALL advertise `worker-space-local-set v1`. Clients SHALL require the successful versioned probe, not infer support from a release number.

#### Scenario: Desktop probes without a home or terminal

- **WHEN** a non-terminal caller probes in an uninitialized environment with Core unavailable
- **THEN** Crew returns the capability object without creating files, discovering a home or querying Core

#### Scenario: Older binary cannot prove support

- **WHEN** a probe fails, emits non-JSON or lacks the expected capability, version, modes or explicitHome marker
- **THEN** it does not authorize the app setter or any owner-identity, direct-file or start/end workaround

### Requirement: Explicit local setting authority changes only worker-space

Crew SHALL accept `crew config worker-space --set-local combined|per-project --home <absolute-home> --json` under ordinary local filesystem authority without terminal ownership. It SHALL change only workerSpaceMode using the registry transaction, preserving all other metadata and owner/task/session/project state. This authority SHALL NOT extend to another setting or command, elevate privileges, query Core or transfer ownership.

#### Scenario: Another owner is live

- **WHEN** a local process with no terminal identity sets a valid mode for an initialized home owned by another live coordinator
- **THEN** the mode changes successfully without altering the owner or any existing worker placement

#### Scenario: Owner liveness is unknown

- **WHEN** a local process sets the mode while the recorded owner's Core state is unknown
- **THEN** Crew applies the setting without asking Core or changing the owner

#### Scenario: Home is unowned

- **WHEN** a local process sets the mode in an initialized home with no owner or a stale owner
- **THEN** Crew applies only the setting without requiring start, creating an owner or taking over

#### Scenario: Mode or arguments are invalid

- **WHEN** the local setter receives an unsupported mode, missing required option, duplicate option, unknown flag, extra argument or a positional setter mixed with local options
- **THEN** Crew returns a JSON refusal without changing the home or granting authority to another operation

#### Scenario: Metadata remains intact

- **WHEN** the local setter changes an initialized registry containing projects and unknown metadata
- **THEN** every field except workerSpaceMode remains semantically identical, owner/task/rules files remain byte-identical and live terminals receive no mutations

### Requirement: Local setting targets only an existing initialized home

The local setter SHALL require an explicit absolute local home, independent of cwd, environment and default-home discovery. It SHALL validate the canonical existing directory, version-1 registry with nonempty tag and valid projects/mode, and real tasks directory. Missing, malformed or redirected registry/home structure SHALL refuse without initialization, migration or writes outside the validated home. Registry links SHALL NOT redirect writes.

#### Scenario: Target does not exist

- **WHEN** the explicit home path is missing
- **THEN** Crew returns home-not-found and does not create that path, a registry, lock or parent directory

#### Scenario: Target is not initialized

- **WHEN** the target is an empty folder, project directory or registry-shaped file without initialized home structure
- **THEN** Crew returns home-not-initialized or invalid-registry and does not repair or create anything

#### Scenario: Ambient discovery points elsewhere

- **WHEN** cwd or CREW_HOME identifies another valid home but the explicit target is absent or invalid
- **THEN** Crew refuses that explicit target without falling back or writing to the ambient home

#### Scenario: Target redirects a registry or task directory

- **WHEN** crew.json is a symlink, hard link or nonregular file, or tasks redirects outside the canonical home
- **THEN** Crew refuses with invalid-home and preserves all outside files

#### Scenario: Home alias resolves to initialized canonical directory

- **WHEN** an absolute directory alias resolves to a real initialized local home
- **THEN** Crew validates the real target and operates only beneath that canonical directory, returning its canonical slash-normalized path

#### Scenario: Target is not an absolute local directory

- **WHEN** the supplied target is relative, drive-relative, a file, or a Windows UNC/device path
- **THEN** Crew returns invalid-home without writing any target

#### Scenario: Target changes before its transaction

- **WHEN** the canonical directory or registry becomes absent, replaced or unsafe before the locked setting update
- **THEN** Crew refuses rather than recreating initialization or publishing to a redirected target

### Requirement: Local setter returns truthful versioned JSON

The local setter SHALL emit one stdout object with capability, version, ok, home, mode and changed. Success SHALL use exit 0 and report effective mode at its ordered transaction point; no-op SHALL report changed false without a registry rewrite. Refusal SHALL report ok false, mode null, changed false and error code/message. Exit 2 SHALL cover arguments/home/registry, 3 lock contention, 4 IO failure and 70 unexpected defects, without success claims.

#### Scenario: Requested mode changes

- **WHEN** atomic publication succeeds for a different mode
- **THEN** the result identifies capability worker-space-local-set version 1, ok true, canonical home, the requested mode and changed true

#### Scenario: Effective mode already matches

- **WHEN** combined is requested with no stored mode or the requested mode equals the stored mode
- **THEN** Crew returns successful effective mode and changed false without rewriting crew.json

#### Scenario: Registry lock is busy

- **WHEN** the existing bounded registry-lock wait expires
- **THEN** Crew returns exit 3 and registry-busy JSON without stealing the lock or changing registry content

#### Scenario: Filesystem or unexpected failure

- **WHEN** the local setting handler cannot safely read, lock or publish, or encounters an unexpected defect
- **THEN** it returns the appropriate JSON refusal without claiming an effective mode or writing crash state to a discovered/default home

### Requirement: Local changes retain admission ordering

Local worker-space changes SHALL share registry serialization with project edits and independent task reservation. Already admitted tasks SHALL retain saved placement even if launched after a change; later independent admissions SHALL use the current ordered mode. Reviews and replacements SHALL retain inherited placement. No setter SHALL move, relabel or interrupt existing work or mutate native spaces.

#### Scenario: Spawn pauses after reservation

- **WHEN** a combined spawn reserves its task and pauses before launch while a local setter changes to per-project
- **THEN** that spawn launches with combined metadata and labels, while a later independent admission uses per-project

#### Scenario: Local change precedes reservation

- **WHEN** the local setter commits per-project before an independent task reserves its record
- **THEN** the new task uses per-project placement without restarting its coordinator

#### Scenario: Project addition races local setting

- **WHEN** project registration and local setting run concurrently
- **THEN** both successful changes persist without losing unrelated metadata or writing stale snapshots

### Requirement: Plain status exposes the current future-placement mode

Plain crew status SHALL show the current effective worker-space mode after the home/owner line, explaining that it affects new admissions only and existing workers keep placement. The getter SHALL remain available without ownership. Observation SHALL NOT send terminal input, restart sessions, reconcile spaces or add fields to legacy full or minimal fleet JSON.

#### Scenario: Coordinator inspects after desktop change

- **WHEN** the owner next runs plain status after a local setting change
- **THEN** status displays the updated mode even with no tasks, and no restart or asynchronous terminal message is needed

#### Scenario: Existing JSON consumer inspects after change

- **WHEN** a caller requests legacy status JSON or fleet JSON
- **THEN** no worker-space field or notification metadata is added and the existing serialized contract remains unchanged
