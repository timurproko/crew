# Design

## Context

See proposal.md for motivation. `cmdTell` currently checks ownership and task/terminal eligibility, saves a reopened task before `hc send`, then invalidates review evidence. It neither cancels tools nor distinguishes busy delivery from immediate processing. Its failure restoration uses an old state, so urgent delivery must not extend that pattern to a longer interrupt window.

Core's installed CLI documents `interrupt` as a single stop key followed by observation, never escalation. Its schema defines `{key, outcome}` with outcomes `stopped`, `exited`, `still_working` and `unknown`; it sends Esc to status-reporting programs and Ctrl+C otherwise. A1's capabilities expose exit/lifecycle but no cancellation operation. The existing fake Core logs calls and can simulate status transitions and reports during send. The test file currently runs as one monolithic script, so focused checks need a small isolated tell test entry point or equivalent targeted fixture, not repeated whole-suite execution.

## Goals / Non-Goals

**Goals:**
- Explicit cancellation intent, existing agent session/context and working copy retained.
- Bounded failure with honest diagnostics rather than silently queueing an urgent message.
- Existing task/report and review-label semantics preserved, including a report that arrives during delivery.

**Non-Goals:**
- No A1 API or extension changes, process-tree cancellation implementation, terminal killing, relaunch, rollback of tool side effects, queue clearing, automatic urgent recovery nudges, or delivery acknowledgments from the model.
- No change to ordinary tells' non-interrupting behavior, permission handling or report format.

## Decisions

### 1. Explicit option, not a change to all tells

Use `crew tell <id> --interrupt "<message>"`; support a `--` separator for literal option-like message text. Only a standalone option is control syntax; do not strip a word embedded in the message. Missing ID/message and invalid options fail before any input. Default tells continue to use the current send path. Automatically interrupting every working worker would turn routine follow-ups into unexpected tool cancellation.

### 2. Core owns cancellation

For urgent delivery require a live terminal reporting the recorded agent (`a1`, `pi` or `claude`) and a recognized status. Refuse blocked, error or unidentified states; only working, idle and done are eligible. This avoids Core's Ctrl+C fallback against a shell or unknown program. No A1 session labels are required because the existing public Core operation targets the task's terminal.

For working state call `hc interrupt --json <terminal> --timeout 10` once. Require a successful, well-formed `stopped` result with the expected Esc key, then re-probe the same terminal and require the matching agent in idle/done state. Idle/done skips cancellation. Failure, still-working, unknown, exited or a newly blocked state sends no follow-up. Use an explicit subprocess deadline slightly above the ten-second observation window so transport failure cannot create an unbounded cancellation wait. Do not use `session.exit`, `hc kill`, repeated keys or automatic relaunch.

Alternatives rejected: sending before interruption can leave queued input in uncertain state; a new A1 API would require another repository; raw Esc plus arbitrary sleep lacks Core's observed result.

### 3. Preserve authority around the external operation

Re-read task identity after interruption and immediately before reopening/delivery, using the existing task transaction machinery for short local updates, not locks held over Core calls. If the terminal, relaunch generation or task eligibility changed, refuse delivery. A newly reported state on the same worker is eligible for an ordinary follow-up reopening; a closure or replacement is not.

Keep reopening before send so a fast `crew done` wins. Record one follow-up for a delivered urgent tell, preserve the complete-report instruction, and run existing review invalidation only after successful delivery. On an explicit delivery failure restore only this attempt's reopening/count fields if they are still current; never overwrite a newer report, closure or replacement. An uncertain delivery result must say to inspect before retrying, since input might already have arrived. Pre-send cancellation failures do not mutate task/review fields. The interruption itself cannot be undone and must be reported separately from failed delivery. Do not add a new durable delivery subsystem or task schema.

### 4. Focused tests and guidance ship with behavior

Extend fake-Core coverage to assert interrupt-before-send ordering, idle bypass, ordinary tell compatibility, exact target identity, each failure outcome, no forced send/kill/relaunch, correct counts and a report racing the send. Add a targeted tell-test invocation without running unrelated integration blocks; reuse existing fixtures where practical. Update command help, README and the coordinator rules string in `crew.mjs`, never repository agent instruction files.

Before final implementation handoff, use a disposable A1 worker running a harmless long shell command to observe cancellation and correction before its original timeout, if the environment permits. A fake-Core test proves command ordering, not A1's real tool cancellation; report any unavailable live evidence explicitly. Do not interrupt existing unrelated workers or run crew's full suite locally; CI owns integration coverage.

## Risks / Trade-offs

- [Cancellation may leave files or detached subprocesses behind] → Document partial side effects and no rollback; rely on the harness's cancellation semantics, not process-killing guesses.
- [Core status is observational and the agent may resume between readiness and send] → Recheck identity/readiness immediately before sending; no claim of atomic delivery or model acknowledgment. Refuse observed working/blocked transitions instead of queueing knowingly.
- [A queued steering message may already exist] → Do not edit or discard it; document that urgent delivery does not erase earlier queued input.
- [Core is older or cannot confirm cancellation] → Refuse explicitly without falling back to a routine queued tell; no dependency update is performed automatically.
- [Permission or question appears during cancellation] → Re-probe and preserve the existing needs-a-person refusal; never force delivery through it.
- [Transport failure after input] → Explain ambiguity and require inspection instead of automatic retries.

## Migration Plan

No persisted-state migration or new dependency is needed. Publish the additive CLI option through the normal crew release/update path. Existing calls remain non-interrupting. Rolling back removes the option but preserves all task records, sessions and copies.
