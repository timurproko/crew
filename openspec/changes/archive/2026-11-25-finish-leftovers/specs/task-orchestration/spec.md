# Spec Delta

## MODIFIED Requirements

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

## ADDED Requirements

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
