# Design

## Context

See proposal.md for motivation. `admittedWorkerSpace` currently calls `makeWorkerSpace` from the configured mode without inspecting occupancy. `launchWorker` freezes that result inside `withRegistry` before allocating the copy. `resolveWorkerSpace` already validates the exact version-one mode/ID/project/name tuple, and review and replacement paths already inherit it.

Read-only observation of the authorized coordinator home confirms the expected old-contract split, not two project IDs: two live xrbuild workers request `fm-crew-<home>` with version 1, mode combined, project xrbuild, no name; three others request `fm-crew-<home>-project-xrbuild`, mode per-project, name xrbuild. Their tasks agree in `crew status --all --json`. Exact terminal identities and local snapshots stay in the external task report, not committed home data. PRs 22 and 23 are merged and establish the current placement/fleet identity contract.

## Goals / Non-Goals

**Goals:** Choose placement from actual live task evidence, keep the existing app-verifiable label contract, and make concurrent selection agree with reservation ordering.

**Non-Goals:** Consolidating the already split spaces, moving/relabeling running workers, reading or writing native Herdr layout, adopting foreign terminals, cross-machine grouping, space deletion, changing task ownership, or changing the desktop setter/fleet response shape.

## Decisions

### 1. Classify live task workers, not history, titles or folders

For independent admissions only when the ordered home setting is per-project:

- Read initialized home registry/task records and machine-local Core terminal inventory. Core `ls` does not include labels, so obtain bounded read-only `get` observations for relevant live terminals, outside the registry lock. Exclude remote addresses and other homes.
- A positive occupant is a task in preparing/working state with a live **recorded launched worker** terminal whose `crew.home`, `crew.task` and requested `herdr.space` agree with validated saved placement. Missing task placement means the existing legacy combined fallback. Older launches without version-one labels remain valid when their old home/task/space labels match. Present v1 labels must match the entire tuple.
- Project identity comes from the task and current registration, never the heading, cwd or label alone. Continue the existing verified self-repair alias rule: only a proven binding to registered crew shares its placement project; an unbound internal repair remains crew:self. Keep task.project unchanged. Dotted names compare exactly.
- Reported, closed, stopped and failed tasks, ended terminals and shells without a live worker do not establish occupancy. They cannot make an empty space eligible; old references from another project do not make current live P workers mixed. Review tasks count under their source project's saved placement while actively working.
- An eligible identity has at least one positive occupant and all such occupants have P's placement project. Mixed active projects disqualify combined even if its title happens to be P. Unrecognized or contradictory same-home Crew terminals, unreadable records and unavailable Core observations are not proof of exclusivity: refuse before reservation/copy creation with a retry explanation. Personal/foreign tabs never establish eligibility or terminal ownership; arbitrary native tab membership is not observable through these APIs.

This retains the task registry as authority rather than trusting forgeable labels or scanning historical prose. It deliberately adds read-only Core work only to independent per-project admission, not to status, setters or inherited launches.

### 2. Reuse existing identities without changing the v1 contract

Prefer an eligible occupied canonical P project identity, then an eligible occupied legacy combined identity. Those are the only ordinary valid identities; the existing internal repair fallback remains distinct. This deterministic tie-break handles already split homes without creating a third space or moving either group. If none qualifies, request the canonical project identity; requesting an absent/empty canonical identity is normal lazy creation, not evidence-based reuse of an empty legacy space.

A P worker joining legacy combined saves exactly `{version: 1, mode: 'combined', id: 'fm-crew-<home>', project: P, name: null}`. Its launch labels therefore include version 1, mode combined and project P, but **omit** crew.space.name. Home policy and selected placement mode are different concepts. A per-project-mode label with the combined ID would fail current Crew/Herdr validation, so do not introduce it or a new placement version.

Herdr keeps its existing directory-derived combined heading (observed as xrbuild here); it does not receive a forced project title. Canonical project joins keep mode per-project and exact project/name. Crew cannot guarantee the combined app heading after directory/user rename changes, and will not rename it.

Exact joining-worker labels (H is the unchanged home tag, P the exact placement project, T the **new worker's own task ID**):

| Label | Join legacy combined | Join registered project space |
| --- | --- | --- |
| crew.home | H | H |
| crew.task | T | T |
| crew.kind | Worker's own role | Worker's own role |
| herdr.space | fm-crew-H | fm-crew-H-project-P |
| herdr.tab | H-T | H-T |
| herdr.right-click | menu | menu |
| crew.space.version | 1 | 1 |
| crew.space.mode | combined | per-project |
| crew.space.project | P | P |
| crew.space.name | Omitted, not null/empty text | P |

This matches **herdr-app `src/plugins/crew/fleet.js` on main**, inspected read-only: `placement` accepts unlabeled legacy combined workers or version-one combined with no name and a matching task project; per-project requires version 1, matching task project and exact name to construct the canonical project ID (with the existing crew:self/crew alias allowance). `bindFleet` additionally requires the exact current live task terminal, matching crew.task and home tag, one native pane/tab membership on the same machine, and equality between both herdr.space and the native space's local ID suffix and the identity returned by `placement`. A title or similar project heading grants no binding. Combined children normalize project/name to null internally, so different task projects can coexist without conflicting child records. New joins use v1 combined labels rather than omitting them; they never copy another worker's task/tab labels or advertise a project-space identity inside combined. Internal repair fallback retains the existing fm-crew-H-self contract.

### 3. Order selection with reservation, not an unprotected preflight

Keep slow Core/Git/copy calls outside `projects.lock`. Collect an admission-relevant registry/task fingerprint before the Core snapshot; in `withRegistry`, reread current config, registration and relevant task placements/terminal references. If these changed, release and refresh with a bounded retry; never publish a stale selection. Save selected workerSpace in the same reservation as today.

A preparing reservation without a published live terminal is a constraint, not positive occupancy. If one could affect the result (especially a P launch into combined or any incompatible project reserved there), release the lock and retry until it publishes or terminates; after a bounded wait refuse safely and ask for retry. Do not create a second identity just because the first launch is slow. Same-P first-ever spawns consequently converge on the canonical identity after the first publishes; contenders for exclusive combined either converge on the winner's eligible placement or refuse safely. Failed launch reservations no longer establish occupancy.

Serialize/recheck the relevant reservation footprint so two spawns from the same initial snapshot cannot publish conflicting decisions. Tests will use deterministic fixture barriers before reservation and before terminal publication, not production-only hooks or sleeps. A mode switch still orders at reservation: a reserved task keeps its choice, a later task re-evaluates the current policy. No new home-wide lease, permanent project-to-space map or lock stealing is needed.

Core liveness can change after observation, and native moves cannot be verified. This provides an ordered request based on a validated observation, not an atomic native-layout transaction. Never use uncertain observations as permission to create a duplicate or move a terminal.

### 4. Keep inheritance and switching semantics explicit

Reviews, relaunches and hand-overs keep `resolveWorkerSpace`, including new P tasks whose saved placement is combined despite the home preference. No occupancy re-selection during replacement or review, and no rewrite of older tasks.

Under per-project independent admission, another Q cannot join a reused P-only combined space: live P occupancy prevents it qualifying for Q, which gets Q's project identity instead. A historically mixed combined space remains mixed until its qualifying workers leave. There are intentional exceptions to any claim of permanent exclusivity: an old Q task's inherited reviewer/relaunch, a previously admitted Q launch, or switching back to combined can add Q later. Preserve that inheritance rather than silently moving it; later independent per-project admissions observe mixed occupancy and skip it. Pending incompatible reservations already visible during selection block reuse.

Switching back to combined always sends **new independent** tasks to `fm-crew-<home>`, regardless of project-space occupancy. Switching to per-project again recomputes live exclusivity. No transition creates, renames or deletes a space by itself.

## Risks / Trade-offs

- [Extra Core reads and launch latency] → Bound probes/retries, filter to relevant local workers, and keep all slow operations outside the registry lock; unknown evidence refuses before side effects.
- [Reported worker terminal still visible] → It is finished for occupancy purposes, per the requested rule; this is not a promise about all visible tabs or headings.
- [Inherited work later makes combined mixed] → Preserve immutability, disqualify it for subsequent independent per-project joins, and state this limit rather than promise permanent exclusivity.
- [Existing duplicated layout stays duplicated] → Prefer an occupied canonical project space deterministically; no unrequested migration or consolidation.
- [Concurrent legacy binaries/direct home edits] → They cannot honor the ordering protocol; retain the documented all-participating-commands-updated constraint.

## Targeted validation after approval

Use isolated homes/repos, fake Core and fake agent/tool paths. Add a focused `--gaps=join-project-space` group and adjust only related old expectations:

1. Legacy labels and v1 combined P-only spaces are reused with exact combined tuple/labels and unchanged old workers; normal occupied project spaces are reused, including dotted P and verified repair aliases.
2. Mixed P/Q combined is skipped; finished other-project records and ended terminals do not pollute P exclusivity; reported/closed/stopped/failed tasks and shells alone do not make empty combined reusable.
3. No eligible space creates canonical P placement; already split eligible spaces choose canonical P; personal headings, other homes and remote IDs do not authorize reuse; ambiguous labels, forged/unrecorded workers, unreadable task state and unavailable Core refuse without launch/copy side effects.
4. Review, manual relaunch and automatic hand-over inherit a reused combined placement after either setting switch; old mixed combined and a later inherited Q worker are handled without moving anyone; combined rollback is unconditional for new tasks.
5. Deterministic same-P/different-P spawn races, first-ever launches, preparing/publication barriers, launch failure and setting switches before/after reservation show convergence or bounded safe refusal, without holding the registry lock during probes/copy launch.

Planned commands: `node crew.test.mjs --gaps=join-project-space`, `node crew.test.mjs --gaps=worker-spaces`, `node crew.test.mjs --gaps=worker-space-local-ordering`, and `openspec validate join-project-space --strict`. No full local suite or native app sessions. CI and fixed-head review run in parallel after publication, without polling.

## Migration Plan

After plan approval, implement in the existing branch and draft PR, update README/worker-space docs alongside tests, and publish through the ordinary project path. Existing records need no migration and remain untouched. Setting combined restores the fixed combined request for future tasks; retain the placement-aware binary for existing project-bound replacements. Do not update or restart the person's live Crew installation as part of this task.
