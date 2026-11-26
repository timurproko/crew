# Tasks

## 1. Approval coverage retains reviewed history across permitted delivery commits

- [x] 1.1 Retain approvedHead independently of later findings; coverage fixtures verify tells and negative verdicts do not erase it.
- [x] 1.2 Verify ancestry, App identity, exact change-path finalization and clean base merge trees; approval-coverage fixtures cover valid, spoofed, conflicting, human, unavailable and replaced-history cases.
- [x] 1.3 Preserve freshness without manufacturing CHANGES NEEDED; document conservative trust configuration and delta/full behavior in README.

## 2. Report-time delta reviews use targeted tests and classified findings

- [x] 2.1 Remove reviewReadiness and check/outcome gates; reported-review-no-ci-gate verifies review starts during pending/failed/cancelled/skipped/absent CI while existing head synchronization tests retain safe fast-forward and ahead/diverged refusal.
- [x] 2.2 Remove reported-ship CI holding, automatic failed-check tells and escalation; reported-wait-no-ci verifies immediate settlement without GitHub, terminal or task mutations, including inert legacy repair records.
- [x] 2.3 Keep explicit delta base/head/commit evidence and make subsequent reviews cover only the fix after either verdict; delta/fix fixtures retain worker-space inheritance and approved-history rewrite protection.
- [x] 2.4 Replace full-suite duties with targeted tests and immediate worker reporting; brief fixtures require What I checked and BLOCKING/FOLLOW-UP classification with CHANGES NEEDED only for blockers.
- [x] 2.5 Update the installed coordinator template and README to parallel CI/review, combined fixes, queued follow-ups, two-round escalation, approval-plus-green merge readiness and no new PR scope; template fixtures verify existing-home refresh at start.

## 3. Plain land publishes follow-up commits to the existing open pull request

- [x] 3.1 Verify reported/clean-copy, exact open PR and remote history before ordinary push; local-remote fixtures prove head advancement without duplicate PR creation or force.
- [x] 3.2 Preserve no-op publication, guarded merged cleanup and coverage refresh; fixtures retain dirty/closed/diverged/refused-push protections and README describes repairs.

## 4. One role table drives immediate Approved and Build transitions

- [x] 4.1 Centralize stable role keys, fallback names and aliases; manifest/rename fixtures cover today's names and future Build names without a fourth role.
- [x] 4.2 Preserve Review on launch, immediate Approved on covered approval and Build for actual changes/follow-ups; coverage and label fixtures retain prior approval evidence without a fabricated negative verdict.
- [x] 4.3 Preserve opt-out, warnings, aliases, unrelated labels, removal-before-add, closed/merged no-writes and abandonment/concurrency safeguards.

## Workflow follow-up

- Only targeted local checks precede the push. CI and review run together after immediate reporting; the coordinator combines failures/blockers into one subsequent fix push.
- Delivery-bot dispatch after approval is cancelled. No full local suite, check watcher or new promotion gate is part of this change.
