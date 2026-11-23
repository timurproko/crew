# Spec Delta

## ADDED Requirements

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
