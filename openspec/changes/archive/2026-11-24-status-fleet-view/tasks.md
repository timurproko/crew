# Tasks

## 1. Saved PR observations preserve lifecycle facts without granting delivery authority

- [x] 1.1 Add identity-scoped saved observations for canonical URL, state, mergedAt and closedAt, with atomic narrow updates that preserve concurrent lifecycle changes; cover identity replacement, reopened PRs, malformed times, repeated facts and cache-write failures using deterministic tests.
- [x] 1.2 Capture verified lifecycle fields from existing exact discovery responses without extra requests or changing the four-field overlay; prove request counts, deadlines, no GitHub writes and unchanged task.pr/stage/ownership/report/Git state in fake discovery tests.
- [x] 1.3 Extend existing land/finish PR-read field selections and save learned facts while preserving existing safety checks and merged-head proof; cover these paths with fake GitHub tests and offline rereads.
- [x] 1.4 Update docs/status-pr-discovery.md to distinguish saved observations from authoritative links and explain unknown/stale facts and recorded-link short-circuiting; ensure examples match persistence fixtures.

## 2. Minimal fleet status bounds history by PR lifetime while preserving legacy output

- [x] 2.1 Add explicit view parsing and an early fleet-only projection with exact versioned root/owner/task fields; cover missing/unknown views, JSON requirement, optional discovery and --all retention in CLI tests.
- [x] 2.2 Add state-only retention and local observation classification using one clock instant; cover every non-closed state, old open PRs, merged/closed at 25/23/exactly-24 hours, unknown or invalid timestamps, no-PR finished tasks and saved discovery after copy return.
- [x] 2.3 Keep fleet reads out of report/brief/transcript, per-task Core and copy-return paths; add guarded-read tests, a 1,000-closed-task fixture under 16,384 bytes, and final-head measurements with 5,000 finished tasks. Add a rebuildable summary index only if state-only traversal cannot meet the sub-second local target.
- [x] 2.4 Preserve legacy text and JSON bytes and field order for status, --json, --all and discovery combinations; assert exact deterministic fixtures and no extra network calls, with observation fields absent from legacy output.
- [x] 2.5 Document the fleet command, exact field/version contract, 24-hour event-time rule, unsupported-view fallback and performance/cache limits in README.md and docs/status-pr-discovery.md; cross-check all command examples against CLI fixtures.
- [x] 2.6 Incorporate the latest published default branch, including PR #10 only if merged, and run node crew.test.mjs once on the final implementation; record suite results, measured bytes/timings and final-head required-check status in the implementation handoff.
