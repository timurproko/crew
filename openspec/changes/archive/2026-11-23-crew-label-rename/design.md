# Design

## Context

See proposal.md for motivation. `reviewLabels` in `crew.mjs` currently embeds three names, reads repository opt-out and assignments, removes selected assignments, checks the desired definition and posts one addition. Its existing error accumulator already emits one advisory warning. Fake-GitHub fixtures cover saved-state ordering, permissions, opt-out, malformed reports, overlapping reviewers and completion overtaking start.

## Goals / Non-Goals

**Goals:** Keep this logic localized, replace display-name coupling with stable-key resolution, and handle asynchronous label sync without adding old names when a manifest's current definition is missing.

**Non-Goals:** Label creation/renaming, shared workflow edits, additional lifecycle hooks, retries, locks, caching, task metadata, GitHub approval or report-word changes.

## Decisions

- Read `repos/<source>/contents/labels/base.json` with signed-in gh and the raw-content Accept header, omitting `ref` so GitHub selects the source's default branch. One request has a two-second subprocess timeout; no separate branch lookup or retry. Read only after the existing skip and opt-out checks. GitHub's omitted-ref behavior satisfies default-branch resolution within the coordinator's one-read limit; the shared plan's explicit branch-discovery example would need two reads.
- Use environment variable `CREW_REVIEW_LABELS_REPO=owner/repository`, default `timurproko/MyWorkflows`. Validate this form before constructing an API endpoint. This matches existing `CREW_*` runtime configuration without extending task or project schemas. An invalid override uses fallback plus the same warning mechanism, not an arbitrary endpoint.
- Contract: version 1, a `labels` object keyed by `under-review`, `review-approved`, `review-changes-needed`; each selected entry supplies a nonempty `name` and optional string-array `previousNames`. Ignore other keys, colors and descriptions. Reject malformed required entries as a whole rather than mix source and fallback identities. Absence of `previousNames` means an empty array for compatibility with the existing default-branch manifest. Confirmed against `docs/plans/label-rename.md` in MyWorkflows PR #33: https://github.com/timurproko/MyWorkflows/pull/33. Its optional `reference` metadata is not used by crew. The coordinator explicitly requires warning-and-fallback for crew, an exception to the shared runner guidance against silent hard-coded fallback; no silent fallback is proposed.
- Use one in-memory palette per hook. If reading/parsing/validation fails, append its error to the existing accumulator and use defaults `🤖 Review`, `🤖 Approved`, `🤖 Rework`, with legacy aliases `🤖 Under review` and `🤖 Changes needed`. Only fallback and fixtures embed display names. Do not add a second warning channel.
- Construct a deduplicated removal set from current and historical names of keys being cleared, plus historical names of the key being added, excluding its current desired name. Intersect with existing PR assignments; attempt each deletion once. At start this clears verdicts and old activity aliases; at verdict it clears activity, opposite verdicts and historical selected-verdict names. Preserve unrelated assignments. Keep a working-state check immediately before every start mutation, including the new legacy deletions.
- Check only the desired current definition before adding. Missing definitions still permit removals, warn once and never select an alias. Removal failures remain best effort and cannot guarantee clean assignments; no retry or reconciliation is introduced.
- Extend the existing fake-GitHub fixture rather than create a separate harness. Cover custom source, arbitrary future names, multiple aliases, changing manifests between hooks, malformed/missing manifest and timeouts, missing consuming definitions, one request per hook, deduplication and the existing race/opt-out guarantees.

## Risks / Trade-offs

- [The source plan may evolve before implementation] → Recheck MyWorkflows PR #33's confirmed stable-key contract before coding; no changes to MyWorkflows from this task.
- [Source outage leaves defaults behind a later rename] → Warn once and retain bounded best effort, with no persistent cache or retries as requested.
- [Repos sync at different times] → Missing current definitions skip additions, while legacy removals still run.
- [Extra API latency] → One two-second request only for eligible, opted-in hooks.
- [Permission failures or overlapping hooks leave stale assignments] → Preserve PR #7's advisory limitations and one-line diagnostic rather than add coordination.

## Migration Plan

The manifest becomes authoritative as soon as deployed, with defaults for failed reads. Shared sync alone renames definitions. No manual live label writes occur here. Rollback is the normal crew version rollback; no state migration or cleanup file is required.
