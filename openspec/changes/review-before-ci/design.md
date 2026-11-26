# Design

## Context

See proposal.md for motivation and specs/task-orchestration/spec.md for the behavior contract. Inspection at baseline `9cb7825` found:

- `cmdReview` checks only ship identity and reported state before `pullRequestReviewHead`; the latter already fetches a PR head and fast-forwards safely but falls back to local head when GitHub is unreadable.
- `recordReviewVerdict` and the `check` branch of `reviewLabels` compare SHAs for equality. `needsRework` then maps stale APPROVE directly to the changes-needed role. The current last-verdict-only record can lose a usable prior approval after CHANGES NEEDED.
- `cmdWait` immediately settles reported tasks. Existing worker recovery has owner-only mutation, no-fallback controls, durable recovery records and race-aware task transactions worth retaining.
- The reviewer brief says tests are optional if cheap and explicitly asks for no text on approval. `briefText` has no local full-suite handoff duty.
- `cmdLand` returns immediately for an existing plain PR, before checking for follow-up commits.
- Label names and keys are local arrays inside `reviewLabels`, with an existing fresh manifest read, fallback warning, opt-out, one-shot writes and abandonment restoration.
- `reviewLabelsFixture` in `crew.test.mjs` has a programmable fake GitHub API, local task repositories, request logs and concurrent lifecycle fixtures. Extend this rather than contacting real GitHub in tests.
- The current task-orchestration spec's minimal-label lifecycle predates implementation: it forbids hooks now present in tell/relaunch/land and omits abandonment restoration. The delta reconciles these exact affected contracts while preserving read-only status and existing safety limits.

## Goals / Non-Goals

**Goals:** Share head/check evidence across readiness, wait, verdict freshness and labels; never mistake failed evidence for approval; retain reviewed history for delta reviews; keep commands bounded except explicit wait.

**Non-Goals:** No bot dispatch, terminal/chip labels, status-shape expansion, shared label rename, workflow/CI-trigger changes, automatic promotion/merge, conversion back to draft, gate-tool redesign or repository opt-in. Shared workflow promotion-after-approval is the default in the later MyWorkflows task, not implemented here. There is no approved-but-CI-running state.

## Decisions

### 1. Separate coverage from the latest verdict

Add retained approval evidence on ship tasks, populated by valid APPROVE and lazily recovered from legacy `reviewVerdict.verdict === 'APPROVE'`. A subsequent negative verdict or tell marks further review necessary without deleting that evidence. Keep the latest verdict for findings and existing consumers. Internal additive evidence is not a new fleet or terminal-label contract.

Introduce `approvalCovers(task, approvedHead, head)` returning coverage plus a reason and full/delta classification for callers. Equal valid heads are covered. Otherwise require ancestry and inspect the task's first-parent lineage; clean base merges are validated boundaries, not a reason to classify every imported base commit as worker work. Verify both GitHub `author.login` and `committer.login` against a trusted configured delivery App login, not local author strings, subject alone or any login ending in `[bot]`. Provide `CREW_DELIVERY_APP_SLUG` as the explicit trust configuration; when unset or unverifiable, later commits get no bot exemption. Exact-head approvals still work without App configuration. Document this conservative default and cover it with fixtures rather than guessing a privileged identity from commits.

A permitted finalize/refinalize has one parent and the exact change-specific subject. Derive the active change, exact archive and affected capability paths from the implementation's OpenSpec association; allow only those paths, not every archive or spec folder. A permitted merge has two parents, second-parent reachability from the freshly observed base and a tree equal to successful `git merge-tree --write-tree` output. A conflict, mismatch, third parent, restore commit, unrelated file or missing evidence is non-covered. Fetch only necessary PR/base objects with subprocess deadlines, never reset, force-update the task branch or trust a stale ref as proof.

Alternative rejected: ignoring all bot-authored commits or all `openspec/` changes. Either could hide unreviewed behavior. SHA equality alone is safe but incorrectly rejects normal finalization.

### 2. Make readiness an evidence-returning helper

`reviewReadiness` returns ready/pending/failed/unavailable plus head, reason and applicable check/link evidence. Resolve the exact task PR and verify repository/branch identity. Preserve `pullRequestReviewHead`'s fetch and clean fast-forward before comparing the checked-out branch and PR head, then require a clean copy and zero unpublished commits. Workflow PR reads must no longer silently turn unavailable GitHub into a local-only review. Plain reported branches without PRs retain local review and do not need a fabricated Implementation section.

Parse Implementation outcomes separately from display formatting in `pullRequestState`: require at least one real outcome and all ticked for a workflow implementation. Accept both draft and ready open PRs; never require full CI before review, including a delta fixing a real CI failure.

Read exact-head check runs/statuses with complete bounded pagination. Normalize by check name and head, ignore cancelled duplicate attempts, choose the newest remaining attempt by timestamps/id, and retain name/link/status. Require a nonempty completed successful light-check set; missing or unreadable evidence is not success. Recognize the shared draft jobs Readiness, OpenSpec and Name guard when supplied by the project, excluding full suites, the ready-only aggregator and advisory label checks. Test absent light-check evidence explicitly. Ready PR delta reviews use the same light subset, not the failing heavy suite they are fixing.

`cmdReview` adds `--force`; unmet readiness conditions use exit 6 and an actionable reason, not a wait loop. Force bypasses this gate with a warning, but never ownership, task type, missing review target or unsafe/destructive Git synchronization. Existing bot-driven ready PRs remain compatible during rollout.

Alternative rejected: blocking inside review or waiting for full CI; both defeat review-before-CI and short command semantics.

### 3. Extend wait without turning status into a watcher

Before settling a reported workflow implementation, call the same readiness/check reducer on a bounded cadence. Pending or unavailable evidence stays waiting with a useful timeout reason. Green light checks settle as `ready for review`. For an approved or already-landed PR, observe applicable full checks instead and print their result, keeping approval/CI independent. A plain task without a PR or CI remains an ordinary local report; Plan, scout, reviewer and gate reports keep their present completion semantics.

Persist one task-scoped automatic check-repair allowance, failed head/check-run identity and the report/worker snapshot used to send it. A failed check sends one automatic follow-up naming its URL through a shared tell implementation with the current owner/live-terminal/blocked/send-failure safeguards. Publish the working state before sending so fast `done` cannot be overwritten. Preserve prior approval evidence and let the existing follow-up hook select Build. Keep the automatic message separately identifiable from human tells and provider-error nudges.

Repeated polls or restarted waits seeing the same failure do not consume another attempt. Once a new repair handoff/new applicable attempt fails, settle `needs a person` with exit 7. A non-owner, no-fallback mode, missing terminal or undeliverable message cannot silently send or claim a repair. Preserve existing quota/provider/idle recovery and same-worker race checks; do not hold task locks across network reads. The allowance survives wait invocations and worker replacement so relaunch does not create an unlimited check-fix loop.

Alternative rejected: automatic repeated tells for every failed check or every process invocation; both can duplicate work indefinitely.

### 4. Delta scope is per commit, testing is full-head

When retained approvedHead is an ancestor, save review mode/base/head and an explicit list of non-covered commits on the reviewer task and put them in its brief. Supply the approved-to-head log and per-commit changes, excluding only commits actually proven permitted by coverage. Do not globally exclude spec paths: human spec changes must remain visible. Imported base changes from a verified clean merge need no separate task review. If ancestry is missing or replaced, use the existing full-review basis.

Reviewer instructions require checking out the fixed head in the isolated copy, building and running the project's full local suite once as README/docs describe, then listing exact commands, results and limitations under a short `What I checked` section. Preserve exact first-line `APPROVE`/`CHANGES NEEDED` parsing and defect locations/reproduction details. This task changes the brief, not historical report acceptance into a new rigid Markdown parser. A delta approval advances retained approvedHead to the new fixed head. The ship brief requests the same final-head local command/results evidence; scouts remain read-only.

Alternative rejected: a net diff with a blanket path exclusion or testing only changed files; those can hide real edits or integration failures.

### 5. Existing plain PR publication uses the normal safety path

Move the plain-existing-PR path past report, copy, clean-tree and repository/branch validation. Freshly confirm the exact PR is open before an ordinary push to its recorded head branch. Remote divergence or publication failures refuse without force, branch recreation or a second PR. A no-op land keeps the same URL. Re-run approval coverage against the published PR head; preserve the existing merged cleanup path and do not publish to a closed/merged PR. Workflow/gate land still only records their workflow's publication.

Alternative rejected: telling users to bypass land with manual push or opening a second PR; both break the existing task/PR lifecycle.

### 6. Centralize roles, not display names

Move stable keys/default names/aliases into one semantic role table shared by all hooks. Semantics are Build, Review, Approved; the current changes-needed key still resolves to today's Rework display name until the shared rename. A negative verdict is not fabricated for stale approval. Proven non-covered commits select Build and request delta/full review while keeping prior APPROVE; covered bot-only movement selects Approved immediately. Unavailable head evidence does not authorize Approved or masquerade as CHANGES NEEDED; warn and retain historical evidence conservatively.

Preserve opt-out before manifest reads, two-second fresh reads, fallback diagnostics, current/historical cleanup, unrelated assignments, removal-before-add, no definitions, no retries and closed/merged no-write behavior. Keep tell/relaunch invalidation and cancellation/last-reviewer restoration. Only relevant command hooks observe changes; no status writes or background sweep. CI state never delays Approved; a failed-check repair tell selects Build because work is reopening, not because a fourth approval state exists.

## Risks / Trade-offs

- [GitHub and the local branch can advance between reads] -> Snapshot the exact PR head and worker/report identity, recheck before publishing review evidence or sending a follow-up, and fail conservatively on drift.
- [Bot identity or change association cannot be verified] -> Do not grant exemptions; retain approval history and request review of unproven changes. Never infer trust from commit text.
- [Older Git lacks merge-tree write-tree or reports conflicts] -> Treat that merge as unverified rather than falling back to a subject-based exemption.
- [Check names vary by project] -> Limit gating to shared light draft jobs actually applicable to the PR, require nonempty light evidence for workflow PRs, and report missing/unknown evidence clearly with the explicit force escape hatch.
- [Label swaps are not atomic and overlapping reviews race] -> Retain the current bounded best-effort model and its existing concurrency regressions; do not claim labels are GitHub approval or merge gates.
- [The current bot still promotes on completed outcomes] -> Support ready PR review now; default approval-gated promotion and dispatch are separate later tasks, not silently introduced here.

## Migration Plan

Only normal task operations add approval, review-scope and check-follow-up evidence. Legacy approvals are read conservatively; no bulk task rewrite occurs. Existing first-line reports and stable label keys remain compatible. Rollback restores conservative SHA-equality and report settlement while preserving reports and committed work.

Each implementation outcome includes fake-GitHub/local-Git regressions in `crew.test.mjs` and a corresponding README update where applicable. Targeted fixture runs precede pushes. For implementation handoff, run `node --test scripts/ci-required.test.mjs` and `node crew.test.mjs` once on the handed-off head, record exact results, push, then report implementation only after the delivery bot's commit has landed and all checks on that final head pass. The initial plan handoff remains a draft with all outcomes unchecked and no bot finalization expected.
