# Tasks

## 1. Existing implementation PRs show review activity before reviewer launch

- [x] 1.1 Resolve review targets from current implementation reports, recorded implementation PRs or the current branch for workflow, gate and plain tasks; fake cases reject Plan reports, ignore unrelated prose links and distinguish no PR from lookup failure.
- [x] 1.2 Add direct signed-in gh label operations with exact Unicode name, repository-definition preflight and optional persistent attempt metadata; fake request assertions prove only the selected assignment changes and missing definitions are never created.
- [x] 1.3 Persist add intent and attempt signaling before terminal launch, releasing failed preparations and launches; fake Core/GitHub logs prove ordering, nonblocking denied/network errors and cleanup even after ambiguous add results.
- [x] 1.4 Document existing-PR scope, plain-project no-PR behavior, shared sync prerequisites and advisory signed-in permissions in README; cross-check statements against the new fake launch cases.

## 2. Review endings preserve labels until the last local reviewer ends

- [x] 2.1 Serialize local per-PR label decisions with bounded acquisition and conservative dead-process recovery, recomputing desired state from fresh attempt records; fake concurrent completion/launch cases prove second opinions and stale cleanup cannot clear a newer review.
- [x] 2.2 Release activity on both verdicts, malformed or failed completion, confirmed stop/finish and launch failures without changing existing refusals; fake cases cover missing reports, unknown Core answers, unconfirmed stops and repeated closure.
- [x] 2.3 Integrate attempt boundaries with relaunch, automatic fallback and reviewer tell, including no-candidate dead reviewers and failed replacements; fake cases prove old cleanup precedes new signaling and old terminal completion cannot end a new attempt.
- [x] 2.4 Treat confirmed absent assignments as successful removal but retain inaccessible 404, denied permission and network failures as pending; fake cases assert unrelated labels survive and cleanup never changes normal command results.
- [x] 2.5 Document local overlap guarantees, verdict independence and the absence of cross-home coordination in README; compare examples with the second-opinion and replacement fixtures.

## 3. Existing lifecycle commands recover advisory signaling and explain its limits

- [x] 3.1 Reconcile pending signaling and observed ended/abandoned attempts during wait and start, including leftover preparing, failed and closed tasks; fake cases preserve existing death thresholds and avoid treating unknown Core responses as death.
- [x] 3.2 Display persisted pending label state in status without any side effects or PR-discovery changes; fake owner/nonowner and JSON cases prove no GitHub requests, no metadata writes and parseable stdout.
- [x] 3.3 Reconcile reviewer activity during parent finish/land and their already-closed or already-landed paths; fake cases retry stale cleanup while preserving a still-live reviewer's label and normal parent delivery behavior.
- [x] 3.4 Document recovery retry paths, runner-offline limits, external closed-PR fallback and rollback implications in README; fake retry cases demonstrate pending add recovery, pending removal recovery and idempotency without live GitHub calls.
- [x] 3.5 Integrate any intervening default-branch changes without editing registry/name or parallel PR-discovery behavior, validate the OpenSpec change and run the whole `node crew.test.mjs` main suite with fakes; record results and any remaining gaps before the implementation report.
