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

### Requirement: Review starts require a ready handoff

Crew SHALL refuse a premature review with exit 6 and a specific reason unless explicitly forced. For a workflow implementation PR, readiness SHALL require a reported task, an open exact PR, a clean published local head equal to the PR head, all implementation outcomes ticked and passing light draft checks on that head. Crew SHALL keep its safe PR-head fast-forward and SHALL NOT wait inside review.

#### Scenario: Worker has not reported

- **WHEN** review is requested before the ship worker reports
- **THEN** crew refuses with exit 6 without launching a reviewer

#### Scenario: Draft is ready for review

- **WHEN** the worker reported implementation, all outcomes are ticked, local and PR heads match with no unpushed work, and the current head's light draft checks pass
- **THEN** crew launches review without requiring promotion or full CI success

#### Scenario: Ready PR needs another review

- **WHEN** a ready PR contains new non-covered commits and its current head has passed light checks while full CI is pending or failed
- **THEN** crew permits review of the new commits without converting the PR to draft

#### Scenario: Ship copy can be safely updated

- **WHEN** the local copy is clean and strictly behind the exact PR head
- **THEN** crew fetches and fast-forwards it before assessing readiness and fixes the reviewer target to that PR head

#### Scenario: Handoff is incomplete or unverifiable

- **WHEN** outcomes are missing or unticked, local work is dirty, commits are unpushed, heads diverge, required light checks are missing, pending or failed, or the PR/check read is unavailable
- **THEN** crew refuses with exit 6 and identifies what must be completed before review

#### Scenario: Duplicate cancelled checks exist

- **WHEN** multiple check runs have the same name on the target head
- **THEN** crew uses the latest non-cancelled run per check name and does not let cancelled duplicates supersede useful results

#### Scenario: Coordinator explicitly forces a review

- **WHEN** the owner requests review with --force despite an unmet readiness condition
- **THEN** crew identifies the bypass and permits review without bypassing ownership, ship-task identity or destructive Git protections

#### Scenario: Plain local branch has no PR

- **WHEN** a reported plain ship has no PR or no origin
- **THEN** crew permits a fixed local-head review without requiring workflow outcomes or nonexistent remote checks

### Requirement: Ship waits settle on checks with one repair follow-up

For a reported workflow implementation ship, crew wait SHALL await passing current-head light checks and settle as ready for review. It SHALL observe full checks for an already approved or landed PR without delaying Approved. On a failed check, only the owner SHALL send one automatic follow-up naming the check and URL. Another failed repair handoff SHALL settle as needs-a-person with exit 7. Timeout SHALL remain exit 124.

#### Scenario: Light checks finish after report

- **WHEN** a reported implementation ship has pending light checks which later pass on its current head
- **THEN** wait remains active until it prints ready for review without launching a reviewer

#### Scenario: First failed check reopens work

- **WHEN** wait sees a failed applicable check and no automatic check-repair follow-up has been sent
- **THEN** it sends one follow-up with the failing check name and link, reopens the ship and continues waiting for a new handoff

#### Scenario: Repeated polling is not another failure

- **WHEN** another wait invocation sees the same failed head and check-run identity after the automatic follow-up
- **THEN** it sends no duplicate message and does not count that unchanged observation as a failed repair

#### Scenario: Repair handoff fails again

- **WHEN** the worker hands off again and a newer applicable check attempt fails after the single automatic repair follow-up
- **THEN** wait settles as needs-a-person with exit 7 and identifies the failed check and attempted repair

#### Scenario: Failure follows approval on a ready PR

- **WHEN** full CI fails after approval
- **THEN** wait sends its allowed repair follow-up on that ready PR, preserves the approved-head evidence and requires delta review for the fix commits rather than converting the PR to draft

#### Scenario: Checks are inaccessible or no check applies

- **WHEN** GitHub evidence is unavailable for a workflow ship, or checks remain pending
- **THEN** wait does not claim readiness and times out conservatively unless a known blocker needs a person

#### Scenario: Reader or disabled automation cannot tell

- **WHEN** a non-owner waits or --no-fallback disables automatic recovery
- **THEN** wait never sends a follow-up and reports a failed-check blocker for a person

#### Scenario: Other report types retain their behavior

- **WHEN** a scout, reviewer, Plan report or gate task reports, or a plain branch has no PR or applicable CI
- **THEN** wait retains ordinary report settlement without inventing a remote-check gate

### Requirement: Review handoffs include local test evidence

For handoffs changing code or tests, ship and reviewer briefs SHALL require build and the full local suite once on the handed-off head, with commands/results. Documents-only or planning-only handoffs SHALL require no test run and SHALL state that exemption. Reviewer briefs SHALL require checkout of the fixed head, an exact first-line verdict, findings and What I checked even on APPROVE. Delta reviews SHALL inspect unapproved commits, retaining full-head testing when code or tests changed.

#### Scenario: Worker receives implementation instructions

- **WHEN** crew prepares a ship brief
- **THEN** the brief requests which build and full local test commands passed on the handed-off head and disclosure of unavailable commands or failures

#### Scenario: Documents or planning only

- **WHEN** a handoff changes only documents or planning artifacts, including a plan commit or spec text
- **THEN** both briefs explicitly require no test run and ask the report to state the exemption

#### Scenario: Reviewer approves without findings

- **WHEN** crew prepares the reviewer brief
- **THEN** it requires APPROVE or CHANGES NEEDED as the first line and a what-I-checked section listing head, build/test commands and results even when there are no defects

#### Scenario: Delta review excludes only proven delivery work

- **WHEN** the current head descends from a retained approved head and new unapproved work exists
- **THEN** the brief identifies the approved-to-current range and unapproved commits, excludes only verified permitted delivery commits and requires testing the entire current head

#### Scenario: Unapproved spec changes remain visible

- **WHEN** a human or unverified commit changes specs after an approval
- **THEN** that change remains in the delta review rather than being excluded by a blanket spec-path filter

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

- **WHEN** crew observes non-covered commits after an approval
- **THEN** it selects the Build role, retains the prior APPROVE and says another review is needed rather than recording CHANGES NEEDED

### Requirement: Minimal review labels have explicit lifecycle limitations

Crew SHALL use only Build, Review and Approved roles, with names from the shared manifest, and no approval-waiting-for-CI state. Tell, relaunch, check observation and plain land SHALL update relevant open-PR roles best-effort; status SHALL remain read-only. No background sweep, lease or pending-label protocol SHALL be added. Abandoned reviews SHALL retain existing last-local-reviewer restoration safeguards. Closed/merged PRs SHALL receive no new role assignments.

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
