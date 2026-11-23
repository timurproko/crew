# Spec Delta

## ADDED Requirements

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
