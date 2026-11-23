# Proposal

## Why

GitHub should show that an agent review started and retain its reported result without making advisory signaling part of crew's lifecycle machinery. The maintainer explicitly replaced the earlier retry/ownership design with two best-effort hooks and three shared labels.

## What Changes

- After `crew review` saves its launched reviewer, swap previous verdict labels for `🤖 Under review` on an existing implementation PR.
- After `crew done` saves a report beginning with `APPROVE` or `CHANGES NEEDED`, remove Under review and add the corresponding `🤖 Approved` or `🤖 Changes needed` label.
- Keep every label operation advisory, attempted once, with at most one warning line per hook. Never create definitions; respect repository opt-out and unreadable variables. A missing verdict definition does not prevent removal of Under review.
- Remove the earlier retries, reconciliation, liveness cleanup, attempt records, label lock, signaling session identity, overlap ownership and pending-label status output.
- Document intentional limitations: stopped/crashed reviewers and failed removals can leave Under review until shared close/merge cleanup or manual removal; the first overlapping verdict removes activity while another reviewer may still run. Verdict labels survive close/merge.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `task-orchestration`: Minimal post-save advisory review-start and verdict-label swaps, with explicit failure and lifecycle limitations.

## Impact

Only two hook sites and a small helper in `crew.mjs`, focused fake-GitHub tests and README guidance change against main. Project registration from PR 5 and read-only PR discovery from PR 6 remain untouched. The shared workflow owns all three definitions and external Under review cleanup; this change does not modify that repository or perform live label operations. This approved reduced scope supersedes every earlier lifecycle/ownership requirement in this change.
