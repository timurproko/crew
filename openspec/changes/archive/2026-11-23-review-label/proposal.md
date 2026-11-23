# Proposal

## Why

GitHub does not show when crew is actively reviewing a pull request. Crew should own the shared advisory review label from review launch through every observed end of that review, without making labeling a delivery gate.

## What Changes

- Resolve an implementation pull request for every project kind at review time, excluding a workflow `Plan:` report, and add the exact shared `🤖 Under review` label before launching its reviewer.
- Remove only that assignment when review activity ends, including either verdict, malformed reports, stop, finish, launch failure, handover gaps, observed death or abandonment, and parent finish/land reconciliation.
- Retain the label until the last local reviewer ends; serialize local decisions and reject stale reviewer-attempt cleanup so a newer review is not cleared.
- Surface nonblocking GitHub failures and persist pending signaling work for retry through acting review, wait, done, stop, finish, land, relaunch and start commands. Missing definitions are reported, never created by crew.
- Document signed-in credential permissions, shared-definition rollout prerequisites, plain projects without a PR until land, advisory semantics and the absence of cross-runner coordination or expiry guarantees.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `task-orchestration`: Add runner-owned advisory pull-request review-label lifecycle, local overlap protection and durable nonblocking retries.
- `worker-dispatch`: Preserve strictly read-only status while exposing pending advisory-label cleanup without triggering retries.

## Impact

Implementation is scoped to review-related helpers and lifecycle hooks in `crew.mjs`, fake GitHub/Core coverage in `crew.test.mjs`, README guidance and the corresponding OpenSpec deltas. Reuse the existing `gh`/`CREW_GH` adapter and signed-in credential; introduce no dependency, App key, workflow change, timer, heartbeat, dispatch protocol or required check. The shared definition is owned by MyWorkflows PR 25 and is not edited here. Avoid project registry/name code from PR 5 and PR-discovery code from the parallel task; rebase and integrate only passive status display additions. The plan is approved for implementation with status explicitly free of side effects.
