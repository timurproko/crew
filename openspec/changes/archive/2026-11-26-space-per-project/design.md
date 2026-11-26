# Design

## Context

See `proposal.md` for motivation and scope, including the person's follow-up requiring an opt-in setting rather than a default behavior change.

### How it works today

| Observed source | Current behavior |
| --- | --- |
| `crew.mjs:1351-1367`, `crew.test.mjs:3126-3130` | Every `startTerminal` sends `herdr.space=fm-crew-<home tag>` and `herdr.tab=<tag>-<task id>`, with `crew.home`, `crew.task` and role labels. The home tag, not the project, is the entire grouping key. `hc run --bg --keep --no-parent --no-notify` launches a terminal in the worktree; Crew never calls a space-create or rename API. |
| `crew.mjs:1425`, `1499`, `2348-2379`, `2768-2796` | Initial workers, reviewers, self-fixers and replacements all use the same launcher. Reviews pass the parent's project but not its placement; relaunch and automatic hand-over recompute the same home-wide label today. |
| `crew.mjs:183-223`, `647-655`, `851` | `crew.json` is the version-1 home registry; dispatch settings additionally live at `config/crew-dispatch.json`. There is no general config show/set command today. Registry edits and first task admission share `projects.lock`, reread under lock and atomically replace files. |
| `crew.mjs:764-770`, `2155-2173`, `2230-2330` | Finish stops/removes only recorded task-owned terminals and returns copies with existing guards. It does not delete a space. End only releases `owner.json`; it does not close workers or spaces. |
| Companion `timurproko/herdr-app`, `src/plugins/crew/fleet.js:72-108` (read-only GitHub inspection) | `bindFleet` qualifies owner/task terminal addresses for one machine, checks exact terminal/pane/tab membership and labels, and requires the actual native space ID to equal `fm-crew-<crew.home>`. It rejects multiple fleet IDs. This plugin, not Core terminal parenting, supplies the visual coordinator/child relationship when its connection preference is enabled. |
| Companion `src/ui/directory.js`, `displaySpace` / `spaceDirectory` | Unnamed spaces display a directory-derived name from the selected/focused/remembered worker, with native folder/name fallbacks. Crew supplies no display name today. Thus a repository/worktree folder (often the first worker's) determines the heading, not `crew project list`; the visible name can also change with selected content. The native first-adoption title algorithm is not available in this Crew checkout and is not asserted as independently verified. |
| Companion `src/shared/space-lifecycle.js`, `isAutomaticSpace` / `reconcileSpaceStarts` | IDs matching `fm-[A-Za-z0-9._-]+` are automatic: no retention Start page is created, and Herdr removes zero-tab spaces. A remaining real tab prevents that empty-space removal. Crew's last finish indirectly removes the automatic space by removing its last worker terminal/tab. |
| `crew.mjs:1861-1868`, companion fleet membership checks | Crew launches locally on the machine running the command, with no `--on`. The app machine-qualifies remote spaces/terminals and binds only same-machine owner/children. Identical local IDs on another machine are not the same space. Foreign-machine terminal paths do not hold a local copy. |

`hc --help`, `hc run --help` and the installed read-only schema expose terminal labels, not a public create/name/delete-space CLI. Labels are opaque to Core. Native adoption, rendering and space destruction belong to Herdr. No live terminal inventory or state mutation was used in this investigation.

## Goals / Non-Goals

**Goals:** default compatibility, immediate opt-in/out for new tasks, stable placement across reviews/replacements, exact project display names through a published companion contract, machine isolation and terminal-owned cleanup.

**Non-Goals:** moving or relabeling running workers; forcing settings on; changing dispatch, reports, worktree allocation or return safety; writing Core layout documents; implementing a space manager/daemon; editing or deploying Herdr; cross-machine attachment; following manual tab moves outside Crew's placement contract.

## Decisions

### 1. Home setting, serialized with admission

Add `crew config worker-space` to print the effective mode and `crew config worker-space combined|per-project` to change it. Store the optional `workerSpaceMode` field in `<home>/crew.json`, keeping version 1. Absence means `combined`; reject invalid present types/values with a field-specific diagnostic rather than silently changing mode. Reading is available to inspectors; changing requires the owning coordinator, like orchestration commands. Do not create a second settings file or put runtime policy in generated coordinator instructions.

Use the existing registry transaction and atomic replacement, preserving projects and unknown metadata. The initial task reservation chooses and saves placement while holding the same short lock, so a concurrent config update has a definite order relative to that spawn. External tools/Core launch remain outside the lock. Each new command reads the home afresh; no session restart is needed. Print that changes apply to new tasks and do not move existing tasks. No Core writes occur when changing the setting.

Alternative rejected: a dispatch field or environment-only switch. Space grouping is home-wide lifecycle policy, not worker selection, and a durable show/set command avoids hand editing.

### 2. Save placement once; inherit it thereafter

Add internal `workerSpace: {version: 1, mode, id, project, name}` to task records before the first terminal launch. This is placement metadata, not terminal-ownership evidence. Preserve it through task transactions and replacement publication.

- **Combined:** retain exactly `fm-crew-<tag>`. Do not introduce a new combined display title; today's directory-derived presentation remains the default.
- **Per-project:** use `fm-crew-<tag>-project-<registered name>`. Names are already validated ASCII letters/digits/dashes/dots (including a leading dot), so this retains the automatic-space alphabet and is an injective suffix within a home. Do not normalize dots or use a working-copy basename. Spaces are created lazily when Herdr first adopts a terminal with that ID, never at registration, config change or coordinator start. Later new tasks for the same project/mode use the same ID and reuse the existing space.
- **Review:** copy the reviewed ship task's resolved binding, not the current mode. A review of an older combined task still joins combined after opt-in; a review of a per-project task still joins that project after opt-out.
- **Relaunch/hand-over:** resolve/persist placement before removing the old terminal; pass it to the common launcher. Changing profiles does not change placement. If the last tab disappeared during replacement, adoption may recreate the same logical space ID; no keeper terminal is introduced.
- **Legacy tasks:** missing metadata means the old combined ID, even if the current setting says per-project. When a still-present legacy terminal exposes a valid matching home-wide placement label, retain it; never guess another project's space or move a terminal. Do not bulk rewrite old records. Finish needs no new metadata to stop/remove the recorded terminal. Invalid present placement metadata fails a new inherited launch safely, rather than treating corruption as permission to regroup.

Switching can intentionally leave both combined and project spaces visible. In per-project mode a *new* task does not join a legacy combined task merely because their project matches; review/replacement inheritance is the exception. Switching back to combined reuses the original combined ID if it remains. Switching again to per-project reuses any surviving project space. Failed/preparing/reported/stopped tasks retain their saved binding; only new independent tasks consult the setting.

Alternative rejected: select placement inside `startTerminal` from the current setting. That would silently move reviews and recovery workers during a switch.

### 3. Fixers have explicit project identity

Combined fixes remain in the existing shared space. For a new per-project `crew fix`, reuse the registration named `crew` only when it points to the same Git repository as `TOOL_ROOT` (compare repository identity, not worktree folder spelling). Then its heading is the exact registered name `crew`. Otherwise use the internal ID `fm-crew-<tag>-self` with heading `crew`; never join an unrelated registration merely because it has that name. Its task/dispatch project remains `crew:self`, and replacement fixers inherit the saved placement as usual. If a fixer shares a registered project's binding, registration removal/path replacement must count that saved reference while the fixer is unfinished or has a copy waiting, just as for ordinary project tasks; otherwise repointing could put an unrelated repository in its occupied space. This avoids requiring registration to repair Crew and keeps the internal namespace separate from registered project IDs. The one-open-repair rule and selfrepair allowlist remain unchanged.

### 4. Publish the Herdr boundary instead of assuming new APIs

Keep `herdr.space`, `herdr.tab`, `crew.home`, `crew.task` and `crew.kind`. Add versioned placement labels to new workers: `crew.space.version=1`, `crew.space.mode=<mode>` and `crew.space.project=<binding project>`; per-project workers also carry `crew.space.name=<exact registered name or crew for internal self-repair>`. Combined bindings omit a requested display name. Persist the same values so reviews and replacements publish consistent labels. These are a **proposed Crew-owned metadata contract**, not a claim that Core or today's app interprets them.

The companion task must accept the unchanged legacy combined identity plus validated project/self identities, join each exact live task terminal to its actual same-machine native space, permit several verified children per coordinator, and render the supplied per-project name rather than a pool/worktree directory. It must support mixed legacy/combined/project populations during switches; `crew.home` stays the home tag, never a project-qualified replacement. Existing user rename precedence should remain with the app rather than Crew repeatedly forcing titles. No new `status` response/view version is needed: task project/current terminal and terminal labels already provide the seam.

**Dependency:** current `bindFleet` explicitly rejects the new IDs and several children; it also has single-child display/binding state. Multiple-child drawing alone in PR 88 is insufficient without identity/binding updates. Exact project-name presentation likewise has no verified existing label consumer. These companion changes must be coordinated with `herdr-ux-polish`; they are not implemented here. Until that support lands, opting in can separate native spaces but cannot promise connected nesting or exact headings. Default combined mode remains compatible. No native/Core rebuild or layout-document writer is proposed. If the companion cannot consume this contract, report that blocker instead of inventing an unsupported space API.

### 5. Empty-space cleanup stays with Herdr

Recommend removal after the project's last task is finished and nothing else occupies the automatic space. Implement Crew's side by retaining its existing guarded removal of every terminal it recorded starting for that task, including replacement history; never issue a whole-space close/delete or remove a terminal found only by matching cwd/labels. When the final owned worker tab goes, Herdr's existing zero-tab automatic-space rule removes that space. A foreign terminal/tab anywhere in it, even outside the task's worktree, keeps it nonempty and must remain untouched. A non-Crew/ordinary space is never a cleanup target.

A report is not finish: its live worker terminal keeps the space available for tell/review. Finishing one of several project workers leaves their space intact. Finish refusal or unconfirmed terminal removal leaves everything protected as before. A returned-copy delay can outlast an already-empty space; it is not a reason to keep a dummy tab. Conversely, Herdr may remove an empty space if the person manually removes its last tab before task closure; Crew does not override that native lifecycle. Repeated finish retries terminal/copy cleanup idempotently, not space destruction.

`crew end` continues to release only ownership, leaving tasks and occupied spaces alone. `status` (including minimal fleet), `wait`, `tell`, `review`, `relaunch` and `finish` keep their existing command/output/safety semantics. No space cleanup is added to read-only status or wait.

### 6. Explicit mixed-state boundaries

No setting change issues terminal moves, label edits, native space moves/reordering or cleanup. The command changes only policy for the next independent task admission; existing saved bindings remain authoritative. The following choices include limits that require companion/native behavior rather than guesses.

| Case | Chosen behavior and reason | Isolated regression |
| --- | --- | --- |
| (a) Combined to per-project; A already has shared workers | A new independent task for A requests A's new project ID, not the shared space. Honor the selected mode consistently instead of letting old occupancy silently override it. Old A workers remain exactly where they are. | Keep old A terminal/labels unchanged; spawn new A and B into distinct project IDs; assert no move/relabel/reorder operations. |
| (b) Per-project to combined; A has a project space, B does not | New independent tasks for both A and B use the combined ID. A's old workers stay in A's project space; no task joins that space just because it exists. | Spawn both projects after the switch; assert the same combined ID and unchanged old A placement. |
| (c) Reviewer, relaunch, quota hand-over after either switch | All inherit their source task's binding, overriding the current mode. They continue existing work, not a new independent task. Legacy missing bindings resolve to combined. | Parameterize both switch directions and all three inherited launch paths, with old task/current setting deliberately different. |
| (d) Shared and project spaces coexist | Each automatic space disappears independently only when it has zero tabs through Herdr lifecycle. A remaining worker or foreign terminal/tab keeps it; Crew removes only its recorded task terminals, never a whole space. | Finish tasks in interleaved spaces; retain occupied siblings and foreign content; remove only modeled zero-tab automatic spaces. |
| (e) Person made a space with the same display name | Match only the exact home-scoped adoption ID, never the visible name. The personal space is not reused, renamed, connected or deleted. Two equal headings can coexist. A deliberately forged/reused exact automatic ID cannot be distinguished from the intended namespace by Crew alone: no ownership claim or bulk deletion follows. | Seed a personal space named A with a different ID and a foreign terminal; spawn/finish A and assert the personal space and terminal are unchanged. |
| (f) Spaces exist on another machine | Launch on the command's local Core; use that machine's home and mode. Herdr qualifies identities and connects same-machine owner/children only. Never close another machine's space or use its matching ID/cwd as local evidence. | Model local and remote spaces with the same local suffix; assert distinct qualified membership and no remote kill/rm/move. |
| (g) End/start and earlier-session tasks | End only removes ownership. Start adopts the home, not task placement; the persisted mode remains unless explicitly changed. The new owner may change it before admitting more tasks. Older tasks and their inherited launches retain their saved/legacy bindings. Any visual attachment to the current owner is the companion's projection, not a Crew terminal/native-space move. | End a mixed home, start a different fake coordinator, set the opposite mode, and check unchanged existing terminals plus current-mode independent spawn and old-mode review/recovery/finish. |
| (h) Setting changes during spawn | The short registry-locked reservation is the linearization point. Before admission, spawn sees the new mode; after admission, its saved mode wins even if its actual terminal starts after the setting command returns. Do not hold a registry lock across slow copy allocation or Core calls. | Use barriers before reservation and after reservation/before Core run; change the setting and assert the selected binding in each ordering, with no lost registration or stale overwrite. |

**Named limits:** Crew cannot inspect actual native tab moves, private native first-adoption naming, name collisions outside its exact IDs, or all nonterminal mods from Core terminal labels alone. It cannot promise that a space with zero tabs survives until a task's state says closed. It cannot guarantee connected child presentation, exact project headings, no companion-driven display projection changes, or native empty-space destruction until compatible Herdr behavior is validated. Its guarantees are saved placement requests, no forced movement/relabeling/reordering, unchanged terminal ownership and no whole-space deletion. Pending admitted launches can start physically after a setting switch using their already-saved placement; this is an explicit ordering boundary, not a silent exception.

## Validation Plan

Use only isolated temporary homes/repositories and fake `CREW_HC`, with tool/account paths sandboxed. Add a focused `--gaps=worker-spaces` group rather than needing live Herdr or a broad suite for each outcome. Extend fake adoption/lifecycle narrowly: derive simulated space membership from launch labels and remove a modeled automatic space only after its final tab disappears. Assert Crew never sends a space-close/document write or kills/removes a foreign terminal. This models the published contract; it is not native rendering proof.

Cover:

1. Missing setting and explicit combined: two projects use the exact old ID; show/set, bad input, non-owner refusal, no Core writes on setting change, registry preservation and setting/admission ordering.
2. Per-project: two projects use two IDs, same project reuses its ID, dotted/leading-dot names survive in requested titles, lazy first creation and separation across homes/machines.
3. Review, relaunch and quota/login hand-over preserve saved placement; self-fix shares verified registered Crew or safely uses its internal fallback.
4. Combined to per-project while tasks run: old workers remain combined; new tasks split; old task reviews/replacements remain combined; all remain reportable/finishable.
5. Per-project to combined while tasks run: existing project workers and their reviews/replacements stay project-bound; new tasks combine; switch back reuses surviving spaces.
6. First finish retains a shared project space; last finish removes only its empty automatic space; another project's space remains; foreign terminals in the same space at another cwd survive even with force; ordinary/manually moved spaces are not closed; unconfirmed cleanup retains occupancy.
7. Legacy task records without placement metadata still support status, wait, tell, review, replacement and finish, including updates with per-project enabled; end changes no live terminals/spaces.

After approval, add code plus focused tests per outcome and leave broad integration testing to CI on the final head. No disposable apps/servers are needed. Actual expanded/remote sidebar naming, nesting and native zero-tab deletion remain companion/native validation, not a claimed Crew test result.

## Risks / Trade-offs

- **Companion release mismatch** → combined is the default; document the opt-in dependency and hand the exact contract to the separate task.
- **Switching can temporarily show mixed layouts or two spaces involving the same project** → preserve task bindings and explain inheritance, rather than force-move work.
- **Manually moved tabs are not discoverable from terminal labels alone** → never adopt/delete their destination; automatic regrouping after manual movement is out of scope.
- **Settings or launch races overwrite placement** → select it in admission's registry transaction and preserve it through existing task transactions.
- **Core/Herdr unavailable or foreign content remains** → no whole-space deletion; retain existing terminal/copy safety and conservative failures.
- **Downgrade while per-project tasks exist** → old binaries do not know placement inheritance and could launch replacements into combined; require this version for active per-project recovery, or finish those tasks before downgrading. A mode switch alone cannot retrofit old binaries.

## Migration Plan

1. Publish and approve this plan; communicate the companion contract/dependency without changing Herdr.
2. Implement the three outcomes in `tasks.md`, with targeted isolated regression checks and documentation.
3. Existing homes require no rewrite: missing setting remains combined; old task records stay valid.
4. Opt in only deliberately, preferably after compatible companion support is available. No restart or task migration occurs.
5. To stop creating project spaces, set combined. Existing project-bound tasks/reviews/replacements finish in place; their empty automatic spaces disappear through normal lifecycle. No forced migration or cleanup sweep is required.
