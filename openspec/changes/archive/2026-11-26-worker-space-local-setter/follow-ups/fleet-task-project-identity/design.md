# Design

## Context

See proposal.md. The Herdr worker's `fleet-connect-not-shown/report.md` identifies the rejection: the placement-v1 validator requires task project, but `cmdFleetStatus` drops it. Full status returns `t.project`. The metadata-validated fleet summary already retains project, so there is no missing data, transport requirement or cache-format change.

The original PR 23 change is archived. Its setting command does not change fleet data; this separate follow-up explicitly amends the exact fleet shape instead of rewriting that archive. The approved setter remains intact.

## Goals / Non-Goals

**Goals:** Supply authoritative task identity to fleet consumers through one additive field, retaining version 1 and all other behavior.

**Non-Goals:** Inferring project from terminal labels, cwd, branch or title; rewriting repair identity; exposing workerSpace/selfFix/launch metadata; changing settings authority, fleet retention, polling, discovery budgets or native links; editing the running coordinator or real home.

## Decisions

### Field and authority

Every projected fleet task receives `project` after `state`. For normal valid task records this is the same nonempty recorded project string returned by full status, without normalization or registry lookup. Missing/non-string/empty project evidence becomes null, never a guessed registration. The output task keys become id, state, project, terminal, pr and prDiscovery; root/view/discovery markers remain unchanged.

Dotted registrations, including `.xrbuild`, remain exact. Closed retained tasks keep recorded project even if the registration or copy has since gone. Reading it is not permission to control work. Old clients ignoring additional fields continue to work; consumers needing project must check its actual presence/value rather than infer support from version 1 alone.

### Repair alias

The authoritative task project for an internal repair is `crew:self`, as in full status. A verified shared placement can legitimately carry `crew.space.project=crew`; an internal fallback carries `crew:self`. Do not substitute saved placement into the task project or change full status/labels to force equality. Herdr already has a self-project alias rule and must apply it while validating the remaining task/home/machine/native-membership evidence.

This choice resolves the literal mismatch between asking for both full-status identity and label equality: those values are intentionally distinct for a repair sharing a verified `crew` registration. Approval of this plan confirms that distinction.

### Compatibility and tests

The implementation changes only the minimal projection. Keep the existing fleet index version because its summaries already contain project; exercise both cold rebuild and warm indexed reads, source updates and corrupt-index recovery. No extra filesystem or Core/network reads are needed to derive the field.

Update the exact fleet task-key assertion without removing it. Add comparisons to full status and task records for combined/per-project workers, dotted projects, retained closed records, reviews/replacements and both repair placement aliases. Missing evidence must be null and cannot be inferred from plausible labels. Preserve all existing per-task fields, root keys, retention and PR-discovery results.

Run focused fleet-view, fleet-scale, worker-space and compatibility regressions before pushing; hosted Windows/Ubuntu CI on the final bot-finalized head remains the integration gate. Do not skip or weaken any existing test.

### Documentation and app handoff

Update README's minimal JSON example and field list, docs/status-pr-discovery.md's fleet contract and docs/worker-spaces.md's companion identity discussion. Clarify that setter calls still do not alter JSON shape; this follow-up adds the project field independently. Publish the exact `tasks[].project` name, null behavior, version-1 additive compatibility and repair alias distinction as a comment on herdr-app PR 88 or 92 after implementation.

## Risks / Trade-offs

- [An exact-key client rejects additions] -> Retain v1's existing field semantics and document this explicit additive extension; consumers must permit additional properties.
- [Task and placement project differ for repairs] -> Preserve task authority, document the existing alias and test both repair placements instead of changing identity to match a label.
- [Old/malformed records lack project] -> Emit null and leave identity-sensitive consumers fail-closed; never synthesize authority.
- [Fleet payload grows] -> One small field per visible task; retain existing guarded scale/payload tests and no added IO.

## Migration Plan

No registry, task or index migration. Older records may yield null; older Crew may omit the field. The app must distinguish missing evidence from a real project. Publish the producer and consumer contracts together through the existing separate PRs; no deployment or live synchronization is performed by this task.
