# Proposal

## Why

Crew can start reviews before the worker's draft checks pass and currently treats any head movement as a stale approval deserving Rework, including delivery-only finalization. Preserve useful approvals, refuse premature reviews, and make the review-before-CI handoff reliable without conflating approval with CI success.

## What Changes

- Classify approval coverage using ancestry, verified delivery-App identity, narrowly scoped finalization commits and clean base merges; retain earlier approval for delta reviews and require a full review after a force-push away.
- Add a review-readiness gate with exit 6 and an explicit `--force` override, retaining the existing PR-head fetch and safe fast-forward.
- Extend `crew wait` for reported implementation ships to wait for current-head checks, announce readiness, send one automatic failed-check follow-up, and return needs-a-person on another failure.
- Require worker and reviewer briefs to request the project's build and full local test suite once on the handed-off head, with commands, results and a short reviewer what-I-checked section.
- Automatically scope subsequent reviews to unapproved commits, excluding only individually verified delivery-only commits.
- Allow plain-project land to publish follow-up commits to its existing open PR without opening another PR or rewriting history.
- Centralize the three label roles: Review at review start, Approved immediately for a covered APPROVE, and Build for changes needed, follow-ups and non-covered changes. Keep today's manifest names until the shared rename lands; do not add a fourth state.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `task-orchestration`: Review readiness, approval coverage and delta evidence, ship wait check recovery, local test evidence, existing-PR publication and three-role label transitions.

## Impact

Implementation is confined to `crew.mjs`, fake-GitHub/local-Git fixtures in `crew.test.mjs`, and the command/label descriptions in `README.md`, plus this OpenSpec change. No new npm dependency is needed. Review refusals use exit 6; needs-a-person remains exit 7 and timeout remains 124. Status remains read-only and the minimal fleet shape is unchanged.

This is step 2 only. The already-merged CI trigger fix is not repeated. Shared bot promotion/finalization changes (approval required by default), delivery workflow dispatch after APPROVE, shared label renaming and Herdr terminal/chip integration belong to later tasks. CI failure repair stays on the ready PR and uses a delta review. Approved never waits for CI, and no approved-CI-running stage is introduced.
