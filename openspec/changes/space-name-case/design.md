# Design

## Context

See proposal.md for motivation. The existing `task-orchestration` spec and `docs/worker-spaces.md` currently couple canonical project display names to registered IDs; this change deliberately revises that display contract.

Read-only observations from `D:/Git/herdr-app`:

- `src/features/agents/main.js:245-260` resolves each agent's own pane directory. Explicitly user-named spaces take precedence; automatic spaces use `directory.name`.
- `src/ui/directory.js:9-14` implements `directoryName` as the normalized path's last segment without lowercasing or stripping leading punctuation. `paneDirectory` ranks the active agent project directory above shell/native fallbacks.
- Consequently `.../.treehouse/MyWorkflows-<hash>/1/MyWorkflows` displays `MyWorkflows`, not the parent with its hash. A leading dot is retained.

In Crew, `makeWorkerSpace` currently uses the project ID for `name`; `resolveWorkerSpace` recomputes and requires that exact value. `workerSpaceOccupancy` records only project sets, so `admittedWorkerSpace` reconstructs the canonical placement rather than retaining an occupied space's saved title. Simply changing `makeWorkerSpace` would reject old saved records and can break PR 25's joins.

## Goals / Non-Goals

**Goals:** Keep immutable grouping identity separate from human-readable names; preserve legacy and directory-cased saved placements, occupancy gates and launch-intent fencing.

**Non-Goals:** No Herdr edits, native space API, user-rename override, live migration, consolidation of duplicate spaces, project-ID changes, pool allocation changes or runtime installation updates. Agent navigation into unrelated subdirectories and user-selected titles are outside the initial project-name agreement.

## Decisions

### Derive the fresh name from repository directory spelling

Resolve the registered repository's actual folder spelling and take its basename, not the registered ID. Linked registration/copy paths must resolve repository provenance rather than choosing a hash-bearing pool parent or numeric slot. Use the same basename semantics observed in Herdr, retaining dots and capitalization. Do repository/path resolution outside the registry lock, recheck the registration at reservation, and freeze the name with placement metadata before launch. Internal repair keeps its existing `crew` fallback and verified alias identity rules.

This is preferable to title-casing an ID (which cannot recover `MyWorkflows`) or parsing/removing pool hashes (which can corrupt legitimate repository names). The source repository is available before allocation; delayed copy allocation must not expose an incomplete placement or move into the registry lock.

### Preserve saved names instead of recomputing inherited placement

Keep version-one placement IDs, project keys and Core label keys unchanged. Separate stable ID/project/mode validation from name validation. Legacy names remain valid. For saved per-project placement, validate a nonempty safe directory-title string and retain it; do not compare it to a newly calculated registry name. Combined still requires null name and omits the label. Live label validation remains exact against saved metadata; labels alone still grant no authority.

Recomputing titles at every launch was rejected because registry changes and old lower-case tasks would invalidate immutable placement and launch intents.

### Reuse the occupied placement, including its old title

Extend the existing bounded occupancy observation to retain validated placement/name evidence alongside project membership. Prefer an eligible canonical identity as before, but return its saved placement rather than rebuilding it with the fresh title. Preserve exclusive combined joins exactly. Conflicting name evidence for one occupied identity must refuse conservatively rather than guessing. Existing gate serialization and pending-reservation behavior remain intact.

Do not rename occupied spaces. Crew has no safe atomic native space-rename operation; rewriting task files and terminal labels would not atomically update native space state. Keeping a legacy lower-case title until the old space naturally disappears is an intentional compatibility trade-off, not an instruction to migrate live workers.

### Prove behavior with fake Core

Add a focused name-case group to `crew.test.mjs`, using isolated homes/repositories and fake Core's adoption model. Cover `MyWorkflows`, a registration alias, `.xrbuild`, hashed-parent pool paths, old lower-case occupied canonical joins, canonical-over-combined preference, conflicting names and review/relaunch/automatic inheritance. Update existing fixtures that register aliases to differently named folders so expectations test the actual new contract, not accidental ID/basename equality. Keep existing join and placement gate regressions.

## Risks / Trade-offs

- Legacy headings remain lower-case while occupied → join without renaming; new spaces request directory spelling after natural removal.
- Companion versions may assume name equals project ID → document the revised label contract and native-rendering dependency; fake Core does not prove companion adoption. No Herdr change is authorized here.
- Copy names can differ from primary folders in plain fallback allocations → use repository provenance for canonical project naming, and document that exact Agents visual agreement depends on repository-named working copies or compatible companion projection.
- Relaxing saved-name validation could hide corruption → preserve exact ID/project/mode checks, reject unsafe names and require label/saved-name equality; refuse conflicting same-space names before launch side effects.

## Migration Plan

After approval, implement the two outcomes in order and update README and worker-space documentation alongside tests. Run useful targeted fake-Core groups before publication. The coordinator's implementation approval explicitly requests one whole `crew.test.mjs` run locally before pushing, resolving the brief's earlier conflicting test instructions. Run that suite once in the isolated fake-Core fixture environment alongside useful targeted groups.

Publish only this branch through the shared workflow as a draft PR. Rollback for new admissions is the existing combined setting; do not deploy an older binary to directory-cased live tasks unless it can still read their saved placement. No existing homes or spaces are migrated by this task.
