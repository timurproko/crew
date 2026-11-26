# Worker-space placement

## Setting and switching

`crew config worker-space` shows the effective home setting. The owning coordinator uses
`crew config worker-space per-project` or `crew config worker-space combined` to set it.
The optional `workerSpaceMode` in `<crew home>/crew.json` is either value; missing means
combined. Invalid present values fail closed. Show is read-only and does not require
ownership. Set uses the registry transaction, preserving registrations and other metadata.

No restart is needed. The change affects **new independent tasks**, not existing work:

| Situation | Placement |
| --- | --- |
| Combined (default) | Every project's new workers use one home-wide automatic space. |
| Per-project | New workers use their registered project's reusable automatic space. |
| Combined to per-project, with A workers still combined | A new independent A task requests A's project space; old workers stay combined. |
| Per-project to combined, with A's project space still occupied | New A tasks and tasks for projects without a space all request combined. |
| Review, relaunch or automatic hand-over | Inherit their source task's space, regardless of the current setting. |
| Switch back to a previous mode | Reuse its matching space ID if still present; do not move workers from the other layout. |
| End then start, possibly with another coordinator | Mode persists; older tasks retain placement; changing mode affects only later independent admissions. |

The ordering point is the registry-locked **task reservation**, before worktree allocation
and Core launch. A setting change before reservation affects that task; a setting change
after reservation does not, even if its terminal starts physically after the setting
command returns. Slow external operations do not hold the registry lock. Switching never
moves, relabels or reorders already-spawned workers or creates/removes any space.

## Identity and companion contract, version 1

Crew launches terminals with opaque labels. Herdr adopts them into native spaces; Crew
has no space-create, rename, reorder or delete command and writes no layout documents.
A space is requested lazily on first launch, not at registration or mode change. Display
names are not lookup keys: a space the person made with the same name is not reused.

Existing labels remain:

- `crew.home=<home tag>` and `crew.task=<task ID>` identify home/task; the home tag never changes with mode.
- `crew.kind=scout|ship|review|fix` identifies the worker role.
- `herdr.space=<placement ID>` is the requested automatic space identity.
- `herdr.tab=<home tag>-<task ID>` and `herdr.right-click=menu` retain their old meanings.

New launches additionally carry:

| Label | Value |
| --- | --- |
| `crew.space.version` | `1` |
| `crew.space.mode` | `combined` or `per-project` |
| `crew.space.project` | Placement project key: exact registered name, or `crew:self` for internal repair fallback. |
| `crew.space.name` | Per-project only: exact registered name, or `crew` for internal repair fallback. Omitted in combined mode to preserve directory-derived headings. |

In combined mode `crew.space.project` remains the individual task's project, so different
values legitimately coexist under the same combined ID; it is not a home/space grouping
key in that mode. Bind by the validated mode/ID and unchanged `crew.home`, not by headings.

Space IDs are local to the machine running Crew:

- Combined: `fm-crew-<home tag>` (unchanged legacy identity).
- Registered project: `fm-crew-<home tag>-project-<exact registered name>`.
- Internal self-repair fallback: `fm-crew-<home tag>-self`.

Project names preserve dots, including `.xrbuild`; they are never inferred from task IDs,
pool slots or repository folder basenames. IDs stay in Herdr's automatic `fm-` alphabet.
Native IDs, tabs and terminals on remote machines must be qualified exactly once by the
app; matching local suffixes on different machines are not the same space. Crew launches
on its local Core, without `--on`, and does not connect spaces across machines.

Task records save internal `workerSpace: {version, mode, id, project, name}` metadata at
admission. Reviews copy it, replacements validate and retain it before ending their old
terminal, and concurrent task saves preserve it. Missing metadata means legacy combined
placement, irrespective of today's setting. No bulk migration or forced move occurs.
Invalid present metadata refuses inherited launches before stopping the current worker.
Placement labels/metadata do **not** prove Crew owns a terminal; only recorded launched
terminal identities do. Ordinary status and minimal fleet JSON contracts are unchanged.

For `crew fix`, combined behaves as before. Per-project fixes share the registration named
`crew` only if its Git common directory matches the tool's repository (linked worktrees
qualify, unrelated clones/registrations do not). Otherwise they use the internal fallback
named `crew`. Task/dispatch project stays `crew:self`; `crew.space.project` can therefore
be `crew` for a verified shared binding. That binding protects the registration from
removal/repointing while the fixer is unfinished or its copy still waits to return.
Repository identity is checked outside the registry lock; admission rechecks the registered
path. If that path changed meanwhile, the repair refuses before creating a task and asks
for a retry instead of using stale proof or holding a registry lock across Git probes.

## Required Herdr companion support

**Until the compatible Herdr companion update (herdr-app PR 88) is installed, per-project
spaces may not show as connected under the coordinator, and their headings may still
come from worktree directories.** Combined remains the default. This Crew update neither
installs that update nor enables Herdr's separate connection preference.

The app must accept legacy combined labels and version-1 project/internal IDs, validate
home/task identity against exact current terminal and native space membership, and bind
several same-machine child spaces to the current owner. Mixed shared/project layouts must
be supported. It must consume per-project name metadata for registered project headings
rather than pool folder names, preserving explicit user rename precedence. The old
single-child `fm-crew-<home tag>` matcher is insufficient. These are companion changes,
not a new Core API or changes to Herdr in this repository.

## Cleanup and compatibility

Crew **never deletes a space itself**, even with force. Finish stops/removes only terminals
recorded as started for that task, including replacement history. It does not infer terminal
ownership from a space ID, displayed name, cwd or matching labels. A foreign terminal at
another cwd in the same project space survives; a personal same-named space and a remote
space with the same local suffix survive as well. Existing busy-worker, stop confirmation,
copy protection and postponed-return rules remain unchanged.

Herdr's automatic `fm-` space lifecycle removes a space when its final tab disappears,
without a keeper shell or retention Start page. Finishing one task leaves other workers;
a report without finish leaves its worker available for tell. Each shared/project space
empties independently. Foreign terminals or mod tabs keep a space nonempty. A copy may
still wait to return after its former space has emptied; a person can also remove the
last tab before task closure. Crew does not override either case or issue whole-space
cleanup. Repeated finish remains idempotent and retries only its guarded task cleanup.

Status, wait, tell, review, relaunch, finish and end retain their existing interfaces in
mixed layouts and for pre-change tasks without placement metadata. Read-only status does
not reconcile spaces or add placement fields to legacy/minimal fleet responses. End releases
ownership only; start can adopt earlier tasks without changing their saved placement.

## Regression scope

`node crew.test.mjs --gaps=worker-spaces` uses isolated homes/repositories, fake Core and
sandboxed tool/account paths. It covers both modes, both switches while tasks run, all
inherited launch paths, stale configuration/admission barriers, legacy tasks, self-repair
registration identity, foreign terminals, same-named personal spaces, remote identities,
unconfirmed cleanup and end/start with a different coordinator and mode.

The opt-in fake adoption model groups exact launch labels into spaces and removes only
modeled zero-tab automatic spaces. These tests prove Crew's requests, ownership boundary
and lack of space/document mutations; they are **not** native rendering, connected-child
or actual native zero-tab deletion evidence. Those require compatible companion support
and separately authorized native validation; this task does not touch the running app,
coordinator or their spaces/tasks.

## Named limits

Crew cannot infer actual native tab moves or arbitrary mod tabs from Core terminal labels,
verify the private native first-adoption name algorithm, or distinguish a deliberately
forged/reused exact automatic ID from its intended namespace. It never treats those
uncertainties as permission to adopt foreign terminals or delete a whole space. Manual
tab moves are outside automatic placement inheritance; saved requests are not a native
layout inventory. Companion visual projection can change independently of Crew's commands.

Setting combined is a safe rollback for **new** tasks. Keep this Crew version for recovery
of already-project-bound tasks, or finish them before downgrading: older binaries do not
understand saved placement and can replace them into combined. No mode change can repair
that older implementation.
