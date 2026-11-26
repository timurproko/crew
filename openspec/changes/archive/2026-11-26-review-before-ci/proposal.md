# Proposal

## Why

Crew should preserve useful approvals across delivery-only changes and review only subsequent fixes, without serializing CI and review. The maintainer-approved reduced scope replaces the earlier check-gated handoff with immediate reporting and one combined CI/review fix round.

## What Changes

- Preserve approval through verified delivery-App finalization/refinalization and clean base merges; new work needs delta review and rewritten approved history needs full review.
- Keep fixed-head review and safe PR-head fast-forward, but remove reviewReadiness, outcome/check gates and the check-based force option. Review starts once the worker reports.
- Restore wait settlement at the report, removing check polling, automatic failed-check tells and check-failure escalation.
- Scope later reviews to only the fix since the last review, with prior blockers available to recheck; retain approved-head evidence independently.
- Request only useful targeted tests. Workers push and report immediately; reviewers classify every finding BLOCKING or FOLLOW-UP and always include What I checked. Only BLOCKING findings justify CHANGES NEEDED.
- Install the same short parallel CI/review loop in the coordinator template: gather failures/findings together, queue follow-ups, escalate after two failing rounds and start a new task rather than add PR scope.
- Publish plain-project repairs to the existing open PR with an ordinary push, and use one stable role table for Build, Review and immediate advisory Approved.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `task-orchestration`: Approval coverage, fix-only delta review, immediate report settlement, targeted-test/finding duties, coordinator baseline instructions, existing-PR publication and three-role advisory labels.

## Impact

`crew.mjs`, `crew.test.mjs`, `README.md` and this same PR's OpenSpec change/canonical spec are affected. No new npm dependency, check watcher, CI readiness gate or full local suite duty remains. Existing worker-space inheritance and status contracts are retained.

The three last review findings concerned the removed gate/wait check-reading code, so they no longer need fixes. Dispatching the delivery bot after approval is cancelled; this PR adds no dispatch, promotion gate, terminal/chip integration or live label-definition change. The managed Approved label remains immediate review evidence as explicitly retained; merge readiness additionally requires green required checks.
