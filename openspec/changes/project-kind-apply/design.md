# Design

## Context

See proposal.md for motivation. `cmdProjectKinds` already has initialized-home validation, canonical expected-path checks, a fresh locked registry read and kind-only atomic replacement. Its two `requireProjectKindOwner` calls are the unnecessary permission barrier.

`projectKind(project)` resolves against `project.path` for JSON listing. `launchWorker` snapshots the registration during reservation but later calls `followsWorkflow(project, worktree)` in the allocated copy. Delivery allocates from published default while the registered checkout can be stale or on another branch. This is an actual Crew mismatch, not proof of a stored Plain preference.

Read-only local evidence: the available home has path-only registrations for both Crew and MyConfigs, not explicit kind choices. The registered Crew checkout has Firstmate instructions and no delivery caller at the usual path; MyConfigs has the shared instructions and delivery caller. This worker's newly allocated Crew copy has delivery instructions, and its task records `workflow: delivery`. Only one real local home was found; the second machine's registry is unavailable within the no-SSH constraint. Do not infer or claim its stored values. Keep machine-specific paths and raw registry contents in the external report, not public fixtures.

Existing `workflow` and `gate` task fields already control done, status and land. Relaunch preserves the task and original brief. Review reads the registration for copy allocation but launches a scout and consults the original task brief; it does not recompute the ship's delivery kind. Strengthen these guarantees with regressions rather than rewriting historical tasks.

## Goals / Non-Goals

**Goals:** a narrow filesystem-authorized edit, explicit selection provenance, list/spawn agreement and a clear reservation ordering point.

**Non-Goals:** changing app rendering, accessing another machine, migrating real homes, normalizing repository checkouts, adding an automatic-choice reset command or changing add/remove, worker-space or orchestration permissions.

## Decisions

### Keep the existing setter, remove only its owner dependency

Remove both owner checks and the now-unused helper. Retain every argument, home identity, registry safety, available-kind and expected-path check, including the locked path recheck on no-op requests. Do not call start/end, inspect owner liveness or write owner metadata. Add `setKindLocal: true` to both existing capability probes, so apps can distinguish the old owner-gated API without guessing versions.

Project add/remove already allow non-owners under separate unfinished-task/path guards: leave that established behavior unchanged. Spawn, stop, finish, tell, relaunch, land, backlog mutations and home release retain their current work-control ownership checks. A kind-only preference must not authorize any of these operations.

### Use one effective-kind resolver with provenance

Reuse/refactor the current registered-folder resolver for list and admission. Return `kind`, `kindSource` (`explicit`, `legacy`, `detected`) and `available`; advertise `kindSource: true` in capability JSON. `kindSource` records whether a stored `kind`, a legacy `workflow` override, or automatic detection governs the selection. Keep legacy gate-first precedence for registrations without `kind`, and retain explicit-kind precedence over everything else. The first successful setter creates an explicit choice even if its effective kind already matched.

The registered repository folder is the detection source. Do not allocate a working copy, update a checkout or fetch a remote merely to list projects. This chooses deterministic local inspection over adding remote/default-head resolution to Settings. Under unchanged inputs the listing predicts admission; a changed registry, repository or tool installation can legitimately change a later automatic result. Report unavailable explicit selections instead of displaying a fallback.

### Freeze selection in the reservation transaction

Compute tool/repository resolution outside `projects.lock` using a fresh registration. Under the lock recheck all delivery-relevant registration fields (including path, kind and legacy workflow), retry if they changed, and save delivery fields on the preparing task together with its reservation. Keep slow tool/copy operations outside the registry lock.

Use the saved selection for gate intent, brief generation, launch output and downstream task behavior. Do not re-detect workflow in the allocated copy. Repository signals in that copy can remain advisory only; they cannot override an explicit selection or the already reserved automatic kind. Store existing workflow/gate-compatible fields so legacy consumers and tasks remain valid; any internal delivery snapshot field must agree with those fields.

### Keep verification isolated

Extend existing project-kinds, concurrency, path-proof and workflow-detection fake fixtures. Add a fake delivery allocator returning a copy with different signals from the registered checkout, in both directions. Add barriers around reservation/allocation and setter publication to prove before/after ordering. Exercise running and reported tasks plus review, land, relaunch and automatic hand-over using fake Core/GitHub/tools only. Assert registry metadata preservation and no owner/task/terminal effects from the setter.

## Risks / Trade-offs

- Automatic projects follow the registered checkout, not a newer published default copy → document this rule prominently; the explicit setter is the stable choice when those differ.
- A list result is not a promise against later filesystem/tool changes → describe it as the effective next-admission selection under unchanged inputs, never as a persisted automatic choice.
- Existing consumers may compare capability/list objects exactly → use additive version-one fields and update contract tests; require the new permission flag before non-owner Settings edits.
- Concurrent kind updates can occur during copy allocation → freeze at reservation, not just before terminal launch, and prove ordering with fake barriers.

## Migration Plan

No registry migration or task rewrite. Deploy the updated CLI; apps discover the additional flags. Rollback restores old owner-gated setting behavior and ignores additive metadata; existing stored explicit kinds and workflow/gate task fields remain compatible. Native app adoption is outside this PR.
