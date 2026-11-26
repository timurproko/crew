# Design

## Context

This is the same PR and change ID, reduced by explicit maintainer approval after implementation. The original gate/wait check reader and full-local-suite duties are removed, not repaired further. Preserve the already-implemented approval, delta, publication, label and worker-space safety work.

## Goals / Non-Goals

**Goals:** Start review at the worker report, alongside CI; combine findings and CI failures into one fix push; preserve coverage and safe publication; keep coordinator and worker instructions aligned.

**Non-Goals:** No reviewReadiness, check/outcome gate, check polling in wait, automatic failed-check follow-up, check-failure escalation, full local suite duty, bot dispatch after approval, new promotion logic, chip/terminal labels, background reconciliation or new PR scope.

## Decisions

### 1. Keep approval coverage and review evidence separate

Retain approvedHead independently of later verdicts. approvalCovers requires ancestry and verifies task-lineage commits against GitHub author and committer login for CREW_DELIVERY_APP_SLUG. Finalize/refinalize commits need one parent, the exact change subject and only the change's active/archive and affected capability paths. Clean base merges need two parents, second-parent base reachability and an exact successful merge-tree result. Unavailable evidence grants no exemption; exact-head approvals still work without App configuration. Imported base history is not reclassified as worker work. Rewritten approved history requires full review.

### 2. Review only the next fix

Use the last reviewed head as the delta base, falling back to retained approval when needed. This includes a preceding CHANGES NEEDED, so a second review inspects only its fix while rechecking the prior blocker report. A prior approval still guards against rewritten history. Exclude only individually proven permitted delivery commits, never blanket spec paths. Save full/delta mode, base, fixed head and explicit commit/exclusion lists on the reviewer task. Preserve worker-space inheritance through every review launch.

Review requires the worker report, not CI or outcome evidence. Keep pullRequestReviewHead's fetch/fast-forward and ahead/diverged refusal; never reset or force the ship copy. No new force option or check-reading helper survives. The exact PR evidence helper retained for plain land proves publication identity only.

### 3. Return wait to report settlement

Remove the reported-ship check branch entirely. A reported task settles without GitHub requests, copy synchronization, failed-check messages or label changes. Existing provider-error, quota/login, idle and terminal recovery for working tasks remain unchanged. Legacy checkRepair fields can remain inert without migration. Keep the manual tell's live-terminal, ownership, transaction and fast-report safeguards, without any automatic check-repair path.

### 4. Use targeted-test and finding duties in briefs

Workers run only useful targeted tests, push through the project's publication path and report at once without waiting for CI or the bot. Reviewers check out the fixed head, read the diff and run targeted tests where useful, not a full suite. Their exact first-line verdict remains the existing parser contract; prompts require What I checked even on APPROVE and EVERY finding classified BLOCKING or FOLLOW-UP. BLOCKING means the change fails its claimed behavior, can lose data or can get stuck; FOLLOW-UP means wording, edge cases or polish. CHANGES NEEDED requires a blocker. Historical verdict-only reports remain parse-compatible; do not add a Markdown-policy parser.

### 5. Keep the parallel loop in the installed coordinator template

The One task / Code changes / Rules sections instruct coordinators to start review at the report, gather CI failures and blockers before one combined tell, queue follow-ups with crew backlog add and escalate after two failing rounds. Ready to merge means current-head or covered delivery-only approval plus successful required checks, not the advisory label alone. New scope starts a new task. crew update installs the tool; crew start rewrites differing coordinator instructions in existing homes. Do not edit repository root AGENTS.md.

### 6. Preserve plain publication and the role table

Plain land freshly verifies the existing open PR's repository/branch and publication, rejects dirty/conflicting work and uses an ordinary push to the same branch without a second PR. Preserve no-op idempotency and guarded merged cleanup. Workflow/gate land still records their publication.

Keep one semantic Build/Review/Approved table resolved through stable manifest keys, current names and aliases. Approved is immediate for a covered APPROVE even while CI runs; actual merge readiness remains the coordinator's approval-plus-required-check decision. Keep opt-out, bounded manifest reads, warning fallback, unrelated assignments, removal-before-add, no definitions/retries, closed/merged no-writes and abandonment restoration. No label/check mutations occur from reported wait or status.

## Risks / Trade-offs

- GitHub/head movement can race a read: preserve fixed-head evidence and safe synchronization; never turn uncertainty into coverage.
- Delta-only inspection must still resolve prior blockers: include the previous reviewer report and instruct explicit rechecking against the fix.
- Labels are advisory and swaps are best effort: preserve existing overlap/abandonment limits, not a new merge gate.
- CI/review coordination is instruction-driven: the template states the one-round policy; Crew does not secretly poll checks or dispatch a workflow.

## Validation and handoff

Use only targeted fixtures for affected behavior. Regression coverage includes no CI gate at reported review, report-time wait without GitHub/message/task writes, retained approval coverage, fix-only delta after either verdict, existing-PR repairs, worker-space inheritance and installed-template refresh. Push and report immediately, naming the pushed head and targeted results; do not wait for CI or a bot commit. CI and review findings return together for any further fix round.
