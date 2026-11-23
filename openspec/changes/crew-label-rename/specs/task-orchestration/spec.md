# Spec Delta

## ADDED Requirements

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

## MODIFIED Requirements

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
