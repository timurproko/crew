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

## Desktop/local setter contract, version 1

A desktop process running as the same local user may set **only** worker-space mode
without the coordinator's terminal identity. This works for a home owned by another live
session, with unknown owner liveness, or with no owner. It never queries Core, starts or
ends a session, takes over ownership, edits projects or controls tasks. The ordinary
positional setter above remains owner-only. Authority is the caller's existing OS file
permissions, not a secret token or elevated helper; it is not a security boundary against
another process already able to edit this user's files.

### Discover support before writing

Run on the machine whose Crew installation will perform the write:

```text
crew config worker-space --capabilities --json
```

Exit 0 returns one stdout JSON object, without finding a home or writing files:

```json
{"capability":"worker-space-local-set","version":1,"modes":["combined","per-project"],"explicitHome":true}
```

Require exit 0, valid JSON, this capability/version, both modes and `explicitHome: true`.
Help also advertises `worker-space-local-set v1`, but a help match or release number alone
is not sufficient. Older Crew refuses the probe; plain text, missing markers and unsupported
versions do not authorize a write. Transport failure or timeout is unavailable, not proof
of an unsupported binary. Never fall back to spoofed `CREW_TERMINAL`/`HC_TERMINAL_ID`, direct
registry edits, `start`, `end`, takeover, automatic init/update or lock manipulation.

### Set one explicit existing home

```text
crew config worker-space --set-local per-project --home "C:/Users/me/.crew" --json
crew config worker-space --set-local combined --home "/home/me/.crew" --json
```

Supply each option exactly once, with separate values; option order is immaterial.
Only `combined` and `per-project` are accepted, case-sensitively. Extra/unknown options,
duplicates, missing/empty values and mixing a positional mode with the local form refuse.
`--home` is confined to this interface, not a global option or permission for other commands.

The path must be an existing absolute local directory. Cwd, `CREW_HOME`, default and legacy
home discovery never substitute for it. Relative/drive-relative paths, files and Windows
UNC/device paths refuse. Directory aliases are canonicalized and the real target must be
an initialized home: valid version-1 `crew.json`, nonempty string tag, valid projects/mode
and a real `tasks` directory. Existing legacy layouts qualify without migration.
`crew.json` must be a regular, non-symlink, non-hard-linked file; `tasks` cannot be a
symlink/junction. Missing/uninitialized/invalid homes are never created or repaired.

The transaction rechecks canonical home identity, structure and registry under the existing
`projects.lock`. Only `workerSpaceMode` may change; projects and unknown metadata are
preserved semantically and owner/task/rules files are untouched. Publication uses an
exclusive random temporary sibling and atomic replacement with the normal Windows sharing
retries. No directory or unrelated file is created; normal completion removes only this
call's transient lock/temp. Locks are never stolen. These checks prevent accidental path
redirection, not malicious same-user filesystem swaps between individual OS calls.

### Results and refusals

Changed success (exit 0):

```json
{"capability":"worker-space-local-set","version":1,"ok":true,"home":"C:/Users/me/.crew","mode":"per-project","changed":true}
```

`home` is canonical and slash-normalized; `mode` is effective at the transaction's ordering
point, not a promise that another writer cannot change it later. A matching effective mode
returns `changed: false` without rewriting the registry. In particular, absent mode already
means combined; requesting combined need not materialize the key. Repeated calls are safe.

Refusal, for example a missing home (exit 2):

```json
{"capability":"worker-space-local-set","version":1,"ok":false,"home":null,"mode":null,"changed":false,"error":{"code":"home-not-found","message":"The explicit coordinator home does not exist."}}
```

Recognized local invocations return one stdout JSON object even for malformed arguments
or missing `--json`. Before complete home validation `home` is null, afterward it is the
canonical target. Refusals always use `mode: null` and never claim a verified effective mode.
Messages are explanatory; parse stable codes, not prose. Optional stderr is diagnostic only.

| Exit | Error code | Meaning |
| --- | --- | --- |
| 0 | none | Capability reply or successful changed/no-op setting. |
| 2 | `invalid-arguments`, `invalid-mode` | Wrong invocation or unsupported value. |
| 2 | `home-not-found`, `home-not-initialized`, `invalid-home`, `invalid-registry` | Absent, uninitialized, unsafe or malformed explicit target. |
| 3 | `registry-busy` | Two-second lock wait exhausted; retry without stealing/removing another writer's lock. |
| 4 | `io-error` | Permission, read, lock-open or publication failure. |
| 70 | `internal-error` | Unexpected defect, not success. |

Failures never write crash state to an ambient/default home. Publication/cleanup failures
can be ambiguous if replacement completed before the failure: retain the refusal and safely
repeat the idempotent command instead of inventing success. No failure authorizes ownership
or initialization. Registry version stays 1; no migration is required.

### Observation and multi-machine application

The owner sees the effective setting on its next getter or plain `crew status`, whose line
after the home/owner header reads, for example:

```text
worker-space: per-project (new task admissions only; existing workers keep their placement)
```

This appears even with no tasks. No terminal input, asynchronous notification, restart or
watcher is sent. Neither setter injects the mode into full or minimal fleet JSON; changing
the preference leaves those response shapes alone. The independent additive fleet project
field is described in the companion contract below. New admissions already
read the updated setting without requiring a status command.

The local setter uses the same ordering point as the owner setter: a reserved spawn keeps
its saved placement even if launch finishes later; an independent reservation ordered after
the change uses the new mode. Reviews, relaunches and automatic handovers inherit their task.
Concurrent project registration and setting changes preserve both successful updates.

Each call applies to **one home on one machine**, never an inferred selected/global home.
Herdr owns the global preference and invokes the probed interface through its existing
machine transport for every authoritative known home, including several on one machine.
Later/offline homes can receive the latest intent when reachable. A successful subset does
not mean success everywhere; track each refusal/unavailable machine separately. Unsupported
Crew keeps a read-only fallback. This Crew change neither installs app support nor performs
any real-machine synchronization or automatic update.

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
terminal identities do. Full status already exposes recorded task project; minimal fleet
version 1 now includes additive `tasks[].project` with the same task identity, or null when
missing/unusable. It is not derived from labels or the current registry. Dotted names keep
their spelling; closed retained tasks keep their historical project. Internal repairs still
report `crew:self` even when their verified placement label is `crew`, as described below.
Other fleet fields/markers and discovery/retention semantics are unchanged. Older Crew can
omit the field; identity-sensitive clients must check actual project evidence, not merely
the unchanged view version. No worker-space setting change rewrites task project.

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

The additional focused groups `--gaps=worker-space-local-setter` and
`--gaps=worker-space-local-ordering` cover the desktop command, exact capability/results,
live/unknown/unowned/stale owners, strict option/home checks, registry links and outside
sentinels, no-op writes, metadata preservation, unchanged orchestration guards, error codes,
exclusive temporary publication, Windows sharing retries, plain status/unchanged JSON,
concurrent registration and before/after-reservation spawn/review/relaunch placement.
They use isolated user/home paths and fake Core; deterministic filesystem barriers and
fault injection exist only in fixture processes, not production hooks. The ordering fixture
supplies its own agent-availability marker, so it runs without Pi installed; a missing-agent
relaunch must still refuse without stopping the current worker or changing its placement.
Windows file-symlink coverage is skipped only if OS privileges deny creation; hard-link and
junction coverage still runs. These are CLI/ordering proofs, not native Herdr rendering or fleet transport evidence.

`--gaps=fleet-project` pins the additive fleet project field against full-status identity,
including dotted names, retained history, absent/unusable evidence and cold/warm/changed/
rebuilt summaries without extra Core or GitHub calls. The existing worker-space tests also
compare actual repair launch aliases and inherited worker projects with the fleet field;
exact fleet key and scale guards remain in place. `--gaps=home-discovery-sandbox` checks
that subprocess fixtures cannot discover a host registry above their temporary root, even
when temporary output is placed under a real Crew task folder; fixture-local registry
checks and default-home tests still use the real command implementation.

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
