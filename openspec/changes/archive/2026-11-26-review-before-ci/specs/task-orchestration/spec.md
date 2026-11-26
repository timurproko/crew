# Spec Delta

## ADDED Requirements

### Requirement: Approval coverage preserves reviewed work

Crew SHALL retain the last approved head independently of later findings. Approval SHALL cover that head and later verified delivery-App finalization or clean base-merge commits only. Non-covered descendant changes SHALL require a delta review; replacement history SHALL require a full review. Unknown evidence SHALL NOT authorize coverage.

#### Scenario: Delivery finalization follows approval

- **WHEN** both GitHub author and committer identify the trusted delivery App and each later task-lineage commit is a single-parent finalize or refinalize for this change touching only its active or archive folders and affected spec folders
- **THEN** the earlier approval covers the new head without another review

#### Scenario: Delivery merges the base without edits

- **WHEN** a later task-lineage commit belongs to the trusted delivery App, has two parents with its second parent on the base branch, and its tree equals the conflict-free merge of its parents
- **THEN** that base merge does not invalidate approval or cause imported base commits to be treated as worker changes

#### Scenario: An unapproved change follows approval

- **WHEN** the approved head is an ancestor but a later task commit is human-authored, has untrusted identity, changes unrelated paths, or is not a permitted finalization or clean merge
- **THEN** crew retains the approved head, records that a delta review is needed and does not describe the prior APPROVE as CHANGES NEEDED

#### Scenario: Force-push removes the approved head

- **WHEN** the approved head is not an ancestor of the current head
- **THEN** crew retains historical evidence but requires a full review rather than a delta

#### Scenario: Coverage cannot be established

- **WHEN** commit identity, ancestry, path scope or merge-tree evidence is unavailable or malformed
- **THEN** crew does not claim approval covers the current head

### Requirement: Review and wait follow report-time handoffs

Crew SHALL permit review once a ship worker reports without reading or waiting for CI checks or implementation outcomes. Review SHALL keep the existing safe fast-forward to the exact PR head and refuse ahead or diverged copies. Crew wait SHALL settle reported tasks immediately without querying CI, sending failed-check follow-ups or introducing a check-failure escalation.

#### Scenario: Review runs alongside CI

- **WHEN** a ship worker reports while its PR checks are pending, failed, cancelled, skipped, absent or unavailable
- **THEN** crew may start its review without a CI-readiness gate, retaining the safe fixed-head synchronization

#### Scenario: Worker is still working

- **WHEN** review is requested before the worker reports
- **THEN** crew refuses because the report is not ready, not because of checks

#### Scenario: Reported ship settles immediately

- **WHEN** wait observes a reported ship regardless of PR or CI state
- **THEN** it returns the report without GitHub check reads, checkout movement, automatic failed-check tells or check-based needs-a-person escalation

### Requirement: Review handoffs use targeted tests and classified findings

Worker briefs SHALL request only useful targeted tests, publication and immediate reporting without waiting for CI or a delivery bot. Reviewer briefs SHALL require the fixed head, targeted tests where useful, an exact first-line verdict and What I checked even on APPROVE. Every finding SHALL be BLOCKING or FOLLOW-UP; CHANGES NEEDED SHALL require at least one BLOCKING finding. Neither brief SHALL require a full local suite.

#### Scenario: Worker hands off work

- **WHEN** crew prepares a ship brief
- **THEN** it requests targeted commands/results and reporting as soon as the work is pushed, allowing CI and review to proceed in parallel

#### Scenario: Reviewer has only follow-ups

- **WHEN** findings concern wording, edge cases or polish rather than failure of the claimed behavior, data loss or getting stuck
- **THEN** the brief requires FOLLOW-UP findings under APPROVE and a short What I checked section, with follow-ups queued by the coordinator rather than holding the merge

#### Scenario: Reviewer finds a blocker

- **WHEN** the change does not do what it claims, can lose data or can get stuck
- **THEN** the brief requires a BLOCKING finding and CHANGES NEEDED, with file/line, impact and reproduction details

#### Scenario: Delta review excludes only proven delivery work

- **WHEN** the current head descends from the last reviewed head or retained approval and a fix needs review
- **THEN** the brief identifies only that fix range and unapproved commits, links prior blockers for rechecking, excludes only verified permitted delivery commits and requests targeted tests where useful

#### Scenario: First review requested changes

- **WHEN** the first review reports BLOCKING findings and the worker pushes a descendant fix without any earlier APPROVE
- **THEN** the second review covers only that fix while rechecking prior blockers rather than re-reviewing unchanged work

#### Scenario: Unapproved spec changes remain visible

- **WHEN** a human or unverified commit changes specs after an approval
- **THEN** that change remains in the delta review rather than being excluded by a blanket spec-path filter

### Requirement: Coordinator instructions use the parallel fix loop

Crew's installed coordinator instructions SHALL start review at the worker report alongside CI, combine CI failures and BLOCKING findings into one fix request, queue FOLLOW-UP findings with crew backlog add and escalate after two failing rounds. Merge readiness SHALL require covered review approval and green required checks. New scope SHALL start a new task. Existing homes SHALL pick up changed instructions at crew start after updating the tool.

#### Scenario: Implementation is reported

- **WHEN** a coordinator follows the installed template after a worker reports pushed implementation
- **THEN** it starts review without waiting for CI or the delivery bot and combines resulting failures and blockers in one fix round

#### Scenario: Only follow-ups remain

- **WHEN** a review approves with FOLLOW-UP findings and required checks are green
- **THEN** the coordinator queues follow-ups without holding the merge, and asks the person after two rounds that still fail

#### Scenario: Existing home starts the new tool

- **WHEN** an existing home starts Crew after crew update installs a changed coordinator template
- **THEN** crew start rewrites its coordinator instructions with the current loop without manual edits

### Requirement: Plain land publishes repairs to its existing PR

For a reported plain ship with an existing open exact PR, crew land SHALL publish new committed work to the same branch using an ordinary push and refresh review coverage. It SHALL NOT create a second PR or force-push. Dirty copies, wrong branch/PR identity, closed PRs and conflicting remote history SHALL NOT authorize publication. Existing verified-merged cleanup SHALL remain guarded.

#### Scenario: Plain worker fixes a landed PR

- **WHEN** a reported plain ship has clean follow-up commits and its existing PR is open on the recorded repository and branch
- **THEN** land pushes the new commits to that PR and updates review freshness without opening another PR

#### Scenario: Existing PR has no new local commits

- **WHEN** a reported plain ship's existing open PR already contains its head
- **THEN** repeated land is idempotent and reports the same link

#### Scenario: Publication would overwrite work

- **WHEN** local work is dirty, the remote branch diverged or advanced incompatibly, or PR identity/state is unproven
- **THEN** land refuses safely without a forced update or replacement PR

## MODIFIED Requirements

### Requirement: Saved review starts swap advisory activity labels

After saving a launched reviewer, crew SHALL best-effort add the current `under-review` name to its implementation PR and remove assigned current and historical names of both other managed roles and historical activity names. All delivery kinds SHALL use these hooks. Crew SHALL skip Plan reports and plain branches without a PR. Label writes SHALL NOT gate review. Start writes SHALL stop once the reviewer is no longer working.

#### Scenario: A new review replaces an earlier verdict

- **WHEN** crew successfully launches and saves a reviewer whose parent has an implementation PR carrying either other managed role
- **THEN** crew attempts each relevant current or historical removal once and adds the current activity name once, preserving unrelated labels

#### Scenario: A branch has no implementation PR

- **WHEN** a plain branch has no PR at review time or the parent report is a Plan
- **THEN** a permitted review proceeds without label changes

#### Scenario: Old activity and verdict names are still assigned

- **WHEN** the PR carries historical managed assignments during a new review start
- **THEN** crew attempts removal of those assignments and adds only the current activity name

#### Scenario: Completion overtakes a start lookup

- **WHEN** the reviewer is no longer working before a start mutation
- **THEN** the remaining start writes are skipped without overwriting the completed verdict

### Requirement: Saved review verdicts swap advisory result labels

After saving an exact first-line verdict, crew SHALL immediately select Approved for APPROVE covering the current head or Build for CHANGES NEEDED, using stable manifest roles. New non-covered commits SHALL select Build while preserving earlier approval evidence. Unverifiable approval SHALL NOT be presented as a negative verdict. CI SHALL NOT delay Approved. Missing or malformed verdicts SHALL cause no label change.

#### Scenario: Reviewer approves

- **WHEN** a reviewer reports APPROVE covering the current head through crew done while CI is pending
- **THEN** completion is saved first and crew immediately attempts activity/opposite-role cleanup and the current approved name

#### Scenario: Reviewer requests changes

- **WHEN** a reviewer reports CHANGES NEEDED through crew done
- **THEN** completion is saved first and crew attempts cleanup and the current Build-role name without discarding earlier approved-head evidence

#### Scenario: Report is malformed or missing

- **WHEN** a report lacks either exact first-line verdict or ordinary done validation refuses a missing report
- **THEN** no label operation occurs and the ordinary command outcome is unchanged

#### Scenario: Legacy assignments remain when a verdict arrives

- **WHEN** a valid verdict arrives on a PR carrying historical names from the manifest
- **THEN** crew attempts each relevant legacy removal once and never adds a historical name

#### Scenario: Bot-only head advancement is still approved

- **WHEN** an APPROVE is followed only by covered delivery commits
- **THEN** crew selects Approved without reporting that the task needs rework or waiting for CI

#### Scenario: Non-covered work needs delta review

- **WHEN** a relevant verdict or publication command observes non-covered commits after an approval
- **THEN** it selects the Build role, retains the prior APPROVE and says another review is needed rather than recording CHANGES NEEDED

### Requirement: Minimal review labels have explicit lifecycle limitations

Crew SHALL use only Build, Review and Approved roles, with names from the shared manifest, and no approval-waiting-for-CI state. Tell, relaunch, verdict processing and plain land SHALL update relevant open-PR roles best-effort; status and reported-task wait SHALL remain read-only. No background sweep, lease or pending-label protocol SHALL be added. Abandoned reviews SHALL retain existing last-local-reviewer restoration safeguards. Closed/merged PRs SHALL receive no new role assignments.

#### Scenario: Reviewer stops without a valid verdict

- **WHEN** the last active local reviewer stops without a verdict
- **THEN** crew removes activity and restores the saved unambiguous prior role, or none, unless a newer verdict or follow-up superseded it

#### Scenario: Reviewers overlap

- **WHEN** the first of two reviewers on one PR reports a valid verdict
- **THEN** its activity removal is attempted even while the second reviewer runs, while abandonment cleanup waits for the last active local reviewer

#### Scenario: Status is inspected

- **WHEN** ordinary or explicit PR-discovery status is read
- **THEN** label signaling performs no requests or metadata writes and adds no pending-label display

#### Scenario: Worker is sent follow-up work

- **WHEN** a successful tell or relaunch reopens a ship with an existing managed assignment on an open PR
- **THEN** crew selects Build using today's current name for the stable changes-needed role, without inventing a fourth managed label

#### Scenario: Current names change later

- **WHEN** the manifest renames the changes-needed role from today's Rework name to Build
- **THEN** all hooks use the same new name and historical aliases through one role table, without changing verdict parsing
