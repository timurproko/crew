# Design

## Context

See proposal.md for motivation and the task-orchestration and worker-dispatch deltas for behavior. The source has one `crew.mjs` and a dependency-free fake-Core test suite. `cmdReview` launches ordinary scout tasks with `reviews: <parent id>`; numbered IDs already permit multiple opinions. `launchWorker` persists a preparing record before creating the copy, and can fail both before and after terminal creation. `cmdDone` accepts arbitrary nonempty reports. `relaunch` reuses a task ID and can race a fast completion; an attempt cannot therefore be identified by task ID alone.

`pullRequestOf` already reads reports and falls back to `gh pr view` of a branch; workflow `reportedStage` distinguishes Plan and Implementation. The `gh` adapter supports `CREW_GH` fakes, and `githubEnvironment` uses an existing signed-in account rather than an App key. `cmdWait` observes absent terminals, consecutive missing-agent readings and stopped agents. `cmdStart` currently lists unfinished tasks and sweeps copies; it needs label-only reconciliation. `cmdStatus` reads Core and records no recovery today. It remains strictly read-only, including for the owner: only passive pending-label display is added.

The external authority is MyWorkflows PR 25, `docs/plans/base-labels.md`, section 3. The label name is U+1F916, U+0020 and `Under review`, with no variation selector. Color `840479` and empty description are owned by shared sync, not by crew.

## Goals / Non-Goals

**Goals:**

- Use existing short command processes and local task records to own activity signaling safely across all observed review endings.
- Make local concurrent completions, second opinions and attempt replacements safe without turning a label into a gate.
- Keep API failures visible, bounded per command and retryable after another crew process starts.

**Non-Goals:**

- No label-definition creation, palette sync, App credential, new GitHub workflow or live rollout operation.
- No distributed ownership, cross-home reference counting, heartbeat, lease, background process, expiration timer, review submission or merge/readiness check.
- No project-registry edits or broad status/PR-discovery refactor.

## Decisions

### 1. Resolve once at review launch and freeze the target per attempt

Reuse the existing gh adapter and report/branch resolution rather than introducing a GitHub client or depending on land. Reject a current workflow Plan stage before review launch. Prefer the current implementation report's first-line URL; use an existing recorded implementation PR or a verified current-branch PR where appropriate. Do not pick an arbitrary PR mentioned in prose. Apply to gate, workflow and plain tasks without selecting by delivery kind. Store a normalized repository/PR target on the reviewer attempt so cleanup still works after the parent report changes or its copy is returned.

Distinguish a confirmed no-PR branch (ordinary review plus an explicit no-PR message) from a failed lookup (ordinary review plus an actionable signaling warning and retryable target resolution). Do not create a PR at review time. A plain project whose PR opens only at land has nothing to label during that review; do not retrospectively label a completed review when land opens it.

### 2. Use direct, additive GitHub label operations

Use the signed-in credential through `gh` and the existing account-selection helper when appropriate; do not read delivery App keys. Check that the repository definition exists before adding, since the issues-labels POST can otherwise create missing labels. A missing definition gets a warning and pending add, not a guessed create. Document shared enablement/sync as a rollout prerequisite rather than adding a new crew activation protocol.

Add with `POST /repos/{owner}/{repo}/issues/{pr}/labels` and a body containing only `labels: ["🤖 Under review"]`. Remove with DELETE of that one percent-encoded label assignment. Never PUT the whole label list or delete the definition. Repeated add succeeds. A DELETE 404 is not blanket success: read accessible PR/issue labels and confirm absence; an inaccessible PR, forbidden response or unreadable result remains a visible retryable failure.

### 3. Track attempts locally and reconcile desired state, not stale API actions

Persist an optional attempt identity on reviewer task records; keep immutable target, pending signaling and last failure in per-attempt files under the home's state/review-labels directory. An independent ended marker prevents stale task saves from resurrecting ownership. Existing task records without an attempt remain readable. Reuse existing Core task timing and terminal evidence; this metadata is not a remote lease or a new review protocol.

Serialize local label state decisions and API writes across coordinator and worker `done` processes with one short-lived filesystem critical section in the crew home, grouping desired state by PR. Re-read persisted attempt ownership under that critical section before applying an operation. Use bounded acquisition and recover an abandoned local critical section only with adequate process-death evidence; uncertainty yields a visible pending operation, never blocks review. Persist intent before the API request so interruption leaves something to reconcile. Do not hold this section across copy creation, agent launch or long worker shutdown.

The desired assignment is present if any current local attempt for that normalized PR owns activity. End only the matching attempt, then compute that desired state afresh. Cleanup from an earlier attempt must not replay an unconditional DELETE. This handles second opinions on the same parent and separate local parents targeting the same PR, as well as stale completion during relaunch. Compare fresh records before saving metadata so label recovery does not overwrite task reports, worker state or newer attempts. Reject old terminal completions using the existing terminal check and attempt identity.

On replacement, reconcile the old ownership after its terminal is confirmed ended, then register/add the new attempt before launching. A failed old removal is still nonblocking: the new attempt supersedes stale cleanup and keeps desired state present. This reconciles the contract's cleanup ordering with its advisory failure policy. Unknown Core state retains ownership; refused stop or finish with a still-live worker must not clear its label.

### 4. Hook every existing lifecycle boundary and retry path

- Initial review: select a usable worker first; persist attempt/target and attempt add before terminal launch. Working-copy or launch failure releases ownership even if the API's add result was uncertain. Preparing records abandoned by a crashed command are reconciled on subsequent owner recovery.
- Done: end review activity for either verdict and also for malformed completion; keep existing completion/refusal semantics otherwise. A missing or unusable report must not become an excuse to retain a label for an attempt crew has established ended.
- Stop and finish: release after the worker end is confirmed, including forced completion and revisits of closed tasks; retain ownership on protective refusal or unconfirmed stop.
- Relaunch and automatic handover: end old attempts after confirmed death/stop, including no-candidate dead or abandoned cases; register the replacement before launch and release it if launch fails. Reopening a reviewer through `tell` likewise starts a new activity attempt before dispatch and restores the old state if sending fails.
- Wait: reconcile settled tasks and observed dead/abandoned reviewers as well as pending adds/removes; do not let an early terminal-state return skip cleanup. Preserve current multi-observation missing-agent safeguards.
- Start: after obtaining home ownership, reconcile leftover review attempts and pending API work, including failed or closed tasks that would be excluded from the unfinished list.
- Status: display persisted pending label state only. Never reconcile, retry, write metadata or send GitHub requests, including for the owner. Keep JSON parseable and avoid PR-discovery changes. Review, wait, done, stop, finish, land, relaunch and start own recovery.
- Parent finish and land: reconcile related reviewers and pending operations, including already-closed/already-landed fast paths. Preserve the label for a reviewer still live; observing or landing the parent alone is not proof its reviewer ended.

Use one small reconciliation helper and narrow call sites rather than independent add/delete logic in each command. API failure never changes the ordinary command exit result, verdict, permission checks or merge eligibility. Print attempted signaling versus confirmed signaling accurately and retain failures for later command-driven retry.

### 5. Use fake transports and document the exact failure boundary

Extend `crew.test.mjs` fixtures using `CREW_GH` plus fake Core. Log GitHub requests and reviewer-launch events together to assert add-before-launch and replacement ordering. Cover both verdicts, malformed/missing reports, copy and terminal launch failure, stop/finish refusals and success, wait death and abandonment, strictly read-only owner/nonowner status, start leftover preparation, parent fast paths, tell/relaunch, two reviewers, stale cleanup and overlapping processes. Exercise missing definitions, already-absent assignments, inaccessible 404s, denied permission, network/ambiguous responses and recovery retries without any live GitHub request.

README will state that the label means activity only, requires the shared definition and sufficient signed-in repository access (Pull requests write or another sufficient existing label grant), and covers any PR available when review starts. No machine-wide daemon means no cleanup guarantee while the whole runner is offline; independent shared closed-event cleanup is an external fallback, not implemented here. Independent runners must avoid overlapping ownership on one PR. Run targeted fake checks per outcome and the entire `node crew.test.mjs` suite before the implementation report.

## Risks / Trade-offs

- [Plain labels cannot encode ownership across homes] → Scope overlap guarantees to local attempts; explicitly document independent-runner limitations.
- [A process dies after GitHub writes but before recording success] → Persist intent first, retry idempotently and derive desired state from current attempts.
- [Concurrent done, launch and recovery commands] → Serialize per-PR decisions and writes locally; re-read attempt records and test interleavings with fake transports.
- [Unknown Core state or a stale local critical section] → Keep conservative ownership and pending signaling, report uncertainty, retry later rather than deleting or failing review.
- [Shared sync has not deployed the definition] → Report the missing label, never create it, and retry on an existing lifecycle command.
- [Definition disappears between preflight and POST] → GitHub offers no atomic add-only-if-defined operation; do not intentionally create or repair definitions, document reliance on shared sync keeping its managed definition stable.
- [Parallel status work requires read-only semantics] → Status only displays stored pending label metadata; recovery stays in acting commands.
- [Parallel branches touch the same source/tests] → Keep registry and discovery regions untouched, rebase before final handoff and rerun the main suite after integration.

## Migration Plan

The plan is approved with status explicitly free of side effects. Implement the three ordered outcomes in tasks.md and the PR body. Optional task metadata requires no registry migration and old tasks remain valid; only crew-owned review attempts are cleanup candidates. Runtime installation still follows the existing crew distribution mechanism. Rollout presumes the person enabled shared labels and synchronized the definition for that repository; this task performs no live configuration writes. Rolling back code stops further signaling but may leave an assignment until resumed recovery, manual removal or shared close-event cleanup; no new background cleanup is promised.
