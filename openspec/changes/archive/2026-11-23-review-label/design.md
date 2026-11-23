# Design

## Context

The maintainer approved replacing the prior implementation with two small, post-save hooks and then extended those hooks to swap three shared labels. Existing task records already link reviewers to their parent through `reviews`; existing gh support supplies the signed-in credential and fake transport. Neither a new runtime record nor a label lock is needed.

## Goals / Non-Goals

**Goals:** Show review activity at start and a result at either valid verdict, without changing review/done outcomes. Preserve unrelated labels and shared definitions. Keep the diff against main small.

**Non-Goals:** No retries, reconciliation, dead/abandoned-reviewer cleanup, restoration on tell/relaunch, label ownership, overlap coordination, attempt/session records, pending-status output, background services or merge gates.

## Decisions

1. Invoke one best-effort helper after launchWorker has saved the launched reviewer and after done has saved its accepted report. The helper never writes task records. Thus advisory network I/O cannot lie between a task read and its later save.
2. Use the existing reviewer-to-parent link. Resolve an implementation PR from the parent's Implementation report, recorded PR or current branch. Skip Plan reports and confirmed absence of a PR. All delivery kinds use the same path.
3. Read repository variables using gh; case-insensitive `false` for DELIVERY_LABELS_ENABLED opts out without trimming. Unreadable variables produce a warning and no writes. Unset/empty/other values remain enabled.
4. Read current assignments, delete only the relevant named labels if present, and POST only one desired label after confirming that its shared repository definition exists. Start removes old Approved/Changes needed labels and adds Under review. A verdict removes Under review and adds its result. Each mutation is attempted once; operations are not atomic and no whole-label replacement occurs.
5. Attempt removal independently of adding the desired label. In particular, an undefined verdict label is warned about and not created, while Under review is still removed. Collect errors into one single-line warning and return normally.
6. Malformed or missing verdicts perform no label operation. Keep crew's internal first-line words APPROVE and CHANGES NEEDED unchanged. Ordinary report validation and state-saving behavior remain main's behavior.
7. Restore all unrelated lifecycle and status code to main. Retain no signaling-specific metadata, lock, persisted retry intent or recovery code.

## Risks / Trade-offs

- [Reviewer crashes, is stopped or removal fails] → Under review can remain until the shared workflow clears it at close/merge, or a person removes it. Crew does nothing at close/merge.
- [Two reviewers overlap] → The first verdict removes Under review while the other can still run; no ownership guarantee is offered.
- [One operation in a swap fails] → Partial label state is possible; one warning is printed, and there is no retry.
- [Shared verdict definition is unavailable] → Do not create it; skip the addition and still attempt known activity removal.
- [PR identity changes during a review] → No frozen-target record or reconciliation is introduced; hooks use the existing parent task/report/branch information when invoked.

## Validation

Focused fake-GitHub tests cover activity/result swaps, both verdicts, malformed/missing reports, no-PR and Plan skips, opt-out, unreadable variables, missing definitions, denied add/removal, one warning despite multiple failures, no retry and post-save request ordering. Preserve main's registry and discovery tests and run the complete `node crew.test.mjs` suite. No live label mutations are part of testing.
