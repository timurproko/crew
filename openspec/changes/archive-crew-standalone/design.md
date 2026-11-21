# Design

## Context

See `proposal.md` for motivation. All 11 tasks in `crew-standalone` are checked. Its only delta targets `tool-maintenance`: the ADDED root-layout requirement is absent from the baseline, while the MODIFIED repair-scope requirement exists with the older wording and fewer scenarios. No duplicate or conflicting delta is apparent from this comparison. Initial `delivery openspec validate --all --strict --no-interactive` passed all four existing items.

## Goals / Non-Goals

**Goal:** Use OpenSpec's own synchronization and archive operation for the already-completed historical change.

**Non-goals:** No new runtime behavior, replacement delta, hand-edited baseline, code change, or permanent rule for late archives.

## Decisions

- After plan approval, run `delivery openspec archive crew-standalone --yes`. The standalone `openspec` executable is not on PATH; `delivery openspec` runs the workflow's pinned CLI. Keep spec updates and validation enabled: neither `--skip-specs` nor `--no-validate` is acceptable for this historical change.
- Let the CLI choose the dated archive directory and apply the original delta. Inspect the diff for exactly the old change's move and tool-maintenance synchronization, apart from this housekeeping plan's progress.
- This separate housekeeping change uses `skip_specs: true` because it introduces no requirements of its own; the original change remains the sole owner of the spec delta. This marker must not be confused with skipping synchronization when archiving `crew-standalone`.
- Run strict all-item validation and archived task validation after the archive. No runtime test suite is needed because runtime files do not change.

## Risks / Trade-offs

- A fresh default-branch update may introduce a duplicate requirement or conflict → recheck the baseline before archiving; if the CLI cannot apply cleanly, stop and report the exact blocker rather than forcing or bypassing it.
- The CLI operation has not been executed during planning → compatibility is based on the observed delta/baseline comparison and successful initial validation, not a claimed archive dry run.

## Migration Plan

After approval, archive the historical change, inspect its generated move and synchronized spec, then run `delivery openspec validate --all --strict --no-interactive` and `delivery openspec validate --archived --strict --no-interactive`. Before commit, a failed or unexpected operation is a blocker, not permission to modify unrelated specs. The eventual change is documentation-only and can be reverted through normal review if needed.
