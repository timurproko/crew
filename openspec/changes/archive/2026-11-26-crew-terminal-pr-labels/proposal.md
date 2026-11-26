# Proposal

## Why

Herdr cannot navigate a pull request's Review stage to its reviewer because Crew never publishes `crew.pr` on that terminal. Ship terminals also need durable review-round and blocking-finding metadata so the app can explain ongoing repairs even after a terminal ends.

## What Changes

- Publish the full task PR URL as `crew.pr` on reviewer launches and ship/fix terminals when known at launch or learned through report, land or verified status discovery.
- Persist reviewRound and lastFinding; publish ship `crew.round` and sanitized `crew.finding`, incrementing the round once per changes-requesting review and clearing the finding on approval.
- Add reviewRound and lastFinding to ordinary JSON task status, retaining the minimal fleet v1 shape and discovery's non-authoritative PR facts.
- Treat terminal-label failures as one-line warnings, never command failures, with fake-Core coverage of each lifecycle hook.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `task-orchestration`: Terminal PR navigation and review context, with additive ordinary JSON fields and a narrow terminal-metadata exception for explicit discovery; GitHub advisory-label and delivery authority remain unchanged.

## Impact

Changes are limited to orchestration hooks in `crew.mjs`, targeted fake `hc` tests in `crew.test.mjs`, relevant README/discovery documentation and this OpenSpec change. No Herdr app changes, background reconciliation, extra GitHub lookups, new dependencies or changes to merge/review policy are planned.
