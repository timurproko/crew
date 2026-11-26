# Design

## Context

See proposal.md for motivation. `startTerminal` already passes crew.task/home/kind to `hc run`. `cmdReview` computes a fixed review head but does not pass the PR URL into reviewer launch metadata. `rememberTaskPr` persists verified discovery facts separately from authoritative task.pr. Ordinary JSON and minimal fleet use separate projections.

`recordReviewVerdict` is currently called twice during a successful verdict hook: once before GitHub access, then with the observed PR head. Round accounting must not double-count those calls. Review metadata must also survive GitHub opt-out or API failures.

Existing specs describe status as read-only, including terminal mutations, and legacy output as byte-stable. This change explicitly narrows those guarantees: explicit discovery can publish a verified URL to Core, and ordinary JSON gains two fields. Fleet v1 and GitHub read-only guarantees remain unchanged.

## Goals / Non-Goals

**Goals:** Use existing knowledge and lifecycle hooks; save durable context before optional external metadata publication; preserve command success and valid JSON on Core failures.

**Non-Goals:** No Herdr implementation, GitHub role-policy changes, extra PR queries, label reconciliation service, terminal ownership expansion or new full-suite requirement.

## Decisions

1. **One bounded best-effort terminal publisher.** Pass known metadata into launch where available, and update recorded current terminals with the existing `hc label` mechanism after facts are saved. Keep optional writes outside task locks and separate from mandatory `hc run`, so an optional label failure never rejects a successful launch. Do not label historical or inferred terminals. A missing recorded address is a no-op; a failed write warns once per hook on stderr. Reject a broad saveTask side effect: unrelated saves and ordinary status must not trigger writes.
2. **Reuse PR-resolution results.** Thread the implementation PR known during review preparation into reviewer metadata rather than discover it from the reviewer's base checkout. Wire report/land persistence and verified `rememberTaskPr` observations to publication without promoting prFacts into task.pr. Preserve ordinary status as observation-only; only explicit discovery may publish Core metadata. No additional GitHub lookup is introduced for labeling.
3. **Persist idempotent verdict context.** Maintain reviewRound and lastFinding on the parent ship, transactionally applying CHANGES NEEDED once per reviewer verdict and clearing the finding on APPROVE. Use durable reviewer evidence to avoid double counting reprocessing, not an in-memory flag. Keep this independent of GitHub advisory labels. Replacement launches inherit saved context; they never reset it.
4. **Small, safe finding preview.** Read the first line containing an explicitly classified BLOCKING finding from the accepted reviewer report. Do not select FOLLOW-UP findings, generic headings or the verdict itself. Strip control characters, collapse remaining whitespace, trim, and retain at most 200 Unicode code points. Missing classified text yields null. Empty/remove crew.finding on approval; never publish literal null or undefined.
5. **Additive ordinary status only.** Append reviewRound and lastFinding to full JSON rows. Default ships/fixers to 1/null and non-ship reviewer/scout rows to null/null. Read state only, not reports. Preserve the exact minimal fleet v1 fields instead of silently changing its versioned shape.

## Risks / Trade-offs

- Terminal can end between persistence and publication -> saved context remains available through JSON; one warning, no retries or cleanup side effects.
- GitHub labels can fail or be disabled -> terminal metadata stays independent and records the accepted local verdict.
- Repeated verdict bookkeeping could increment twice -> use persisted reviewer identity and regression tests for duplicate processing and successive reviewers.
- Overlapping reviewer verdicts -> apply existing accepted-verdict ordering without inventing approval coverage or a new coordination protocol.
- Existing task history lacks reviewRound -> default to 1/null rather than scan historical reports or bulk migrate records.
- Discovery gains a Core side effect -> document the narrow exception, keep GitHub access read-only and no-discovery polling mutation-free.

## Migration Plan

No migration or dependency is needed. New commands persist optional fields as relevant hooks run; old records use documented defaults. Existing terminals receive metadata when a normal knowledge-producing hook runs, not a background sweep. Rolling back leaves extra task fields harmlessly ignored. Targeted fake-Core tests cover known/late PRs, reviewer launch, fix/replacement launches, changes/approval, sanitization, ordinary JSON, unchanged fleet shape, and ended/unavailable terminals.
