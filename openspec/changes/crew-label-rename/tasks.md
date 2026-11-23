# Tasks

## 1. Manifest-driven advisory labels with clean rename transitions

- [x] 1.1 Confirm the published MyWorkflows label-rename contract, then add the configurable, two-second, single-request manifest resolver and built-in fallback; fake-GitHub assertions cover the stable keys, custom source, future names, optional aliases, invalid manifests, timeout and a single combined warning.
- [x] 1.2 Update review start and verdict swaps to remove assigned current/historical names and add only the current desired name; fake-GitHub assertions cover both verdicts, multiple aliases, deduplicated writes, missing new definitions, manifests changing between hooks and no historical additions.
- [x] 1.3 Preserve and extend existing saved-state, stale-start, opt-out, malformed report, failure and overlap checks; focused review-label tests demonstrate no retries, metadata, caching, lifecycle requests or report-word changes.
- [x] 1.4 Update README's advisory-label section with source configuration, fallback, aliases and unchanged limitations; check it against the delta spec and passing fake-GitHub behavior.

## Workflow follow-up

- After approval and implementation, run the complete main suite once before reporting, as requested, and report the current PR CI status without watching it.
- Keep the PR draft from the agent side and never merge; the shared delivery bot owns readiness and OpenSpec finalization.
