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
| Per-project | Join an occupied same-home local Crew space whose live unfinished workers are exclusively this project; otherwise request the canonical project identity. |
| Combined to per-project, with A workers still combined | A new independent A task joins combined if its live unfinished workers are exclusively A; mixed combined is skipped and old workers never move. |
| Per-project to combined, with A's project space still occupied | New A tasks and tasks for projects without a space all request combined. |
| Review, relaunch or automatic hand-over | Inherit their source task's space, regardless of the current setting. |
| Switch back to a previous mode | Combined always selects its fixed ID; per-project re-evaluates live exclusive occupancy, without moving workers from the other layout. |
| End then start, possibly with another coordinator | Mode persists; older tasks retain placement; changing mode affects only later independent admissions. |

The ordering point is the registry-locked **task reservation**, before worktree allocation
and Core launch. A setting change before reservation affects that task; a setting change
after reservation does not, even if its terminal starts physically after the setting
command returns. Placement uses a home-wide `worker-spaces.lock` gate, not comparisons of task
records and lock-file existence. **Invariant:** admission owns the gate continuously while reading
tasks, observing Core, selecting placement and reserving the task; every participating task writer
and terminal start/stop/replacement owns that same gate. A replacement owns it from before removing
the old terminal until the replacement is published (or failure is saved). Admission therefore
cannot observe a temporary empty space, nor can a replacement finish between its task and Core
reads. Automatic observation-only hand-over, manual relaunch, finish/cleanup retries, review and
ordinary launches all participate. Task transactions acquire the gate before their per-task locks;
admission acquires it before the short registry transaction. Registry-only settings and project
edits do not need it and remain usable during slow Core calls.

Copy allocation stays outside both gate and registry lock. A saved preparing reservation with no
published terminal constrains later admission but is not positive occupancy; contenders release
the gate between retries so the launch can publish. Each reservation records a random preparation
token and the spawner's local host/platform, PID and OS process-start identity. Windows queries
.NET Process creation ticks directly, without PowerShell cmdlet/module autoload or JSON formatting,
with a bounded ten-second cold-start allowance and explicit failure diagnostics. Linux uses boot
ID plus /proc start ticks; other POSIX hosts use
locale/timezone-stable ps start time. PID existence with the same start identity means live,
regardless of how long preparation takes. Missing permissions, malformed identity and another
host are unknown, never dead. An absent PID or a different verified start identity proves the
recorded spawner ended, including PID reuse and machine restart.

Stop/finish protect a live or unverifiable allocating spawner, including with force. A recorded
terminal already proves publication completed and retains normal stop/finish behavior, even if
an older task record still says preparing. For a proven-dead spawner, finish cancels the token
under the placement gate, then applies ordinary copy/terminal protections; --force is required
when unfinished work could be discarded. Every preparation update and the final launch check
its token/state under that gate, so cancelled preparation cannot publish late. New per-project
admission encountering a dead reservation refuses in one line naming the exact home-qualified
`crew finish <id> --force` command, rather than endlessly claiming a worker is still launching.
It does not silently discard another task's partial work. Concurrent recovery commands serialize;
losers may retry and an already-finished recovery is idempotent.

Every Core launch, including replacements, first persists an immutable per-run intent containing
a fresh random nonce, publisher OS identity, task/home, cwd, placement and agent. Only then is
`hc run` called with `crew.launch=<nonce>`. This persisted capability is launch ownership authority,
not a generic placement label. If Core creates the terminal but its response/receipt is lost,
reconciliation by another process requires a dead publisher, a unique exact nonce match and the
entire recorded identity tuple. The publisher can reconcile its own settled failed response. Generic task/home/space labels or cwd alone never suffice. Conflicting or duplicate
nonce matches fail closed before any terminal is adopted or stopped. Reconciled addresses enter
the durable owned-terminal history under the placement gate. A normal acknowledgement records
ownership before final working-state publication, and stale task saves retain launch authority.
Acknowledgment rereads the task before storing its address, retaining an already accepted report.

Allocator and initial Core stdout are also kept as task-folder receipts. Recovery validates an
unpublished delivery copy against the project's Git common directory. Unverified copy receipts
cannot authorize deletion. An unacknowledged Core error keeps the copy and its intent, not an
assumption that no worker exists. Actual Core start and publication share one gate interval.

The worker shell performs a task-read-only `_launch-check` under the same placement gate before
executing the agent. Authorization therefore cannot slip between a cleanup's negative inventory
and its cancellation write. Cancelled,
superseded or closed generations cannot start agents later, including in a reused folder. If a
queued Core request creates a terminal after cancellation, admission reconciles its recorded nonce
and names the same exact finish command. A repeated finish cleans only that generation's owned
terminals when the old copy already returned; it never returns/deletes a reused folder a second
time. Superseded late nonces enter ownership history without rewinding the current terminal or
profile. Replacement reconciles its actual previous worker before stopping it, and an automatic
wait discards a stale observation when reconciliation changed that worker. A live or unverifiable
publisher cannot have its pending launch claimed by another process. Already-admitted launches allow up to
ten minutes to reacquire the gate for publication/failure recording, matching the copy allocator's
existing long wait instead of stranding preparation on brief contention. Failed reservations do
not establish occupancy. Core reads share a ten-second
admission budget with at most two seconds per probe. Gate contention and preparing launches cause
bounded wait/retry or worker-space-busy refusal, before the contender creates a task or copy;
background observation writers yield immediately, and done retains its existing longer report wait.
The placement gate and per-task writer/intent locks are atomically published populated directories
with unique owner-nonce files containing the same OS identity proof. This includes a publisher
dying inside the acknowledgement/publication task transaction, not only during allocation. A proven-dead owner is reclaimable. Exactly one
contender can unlink that nonce; removal of the now-empty directory is non-recursive, so a new
populated live gate cannot be deleted by a delayed reclaimer. A reclaimer interrupted after
unlinking its nonce leaves an empty, safely removable gate, not another permanent reservation.
Release retires the owned directory before deleting it privately. Transient Windows sharing
errors retry retirement for up to one second with the same populated claim intact; exhaustion
refuses with the claim retained for later proven-dead recovery, never shared-path deletion.
Live, unverifiable and old
file-format gates are never stolen by PID/age guesses. Actual terminal transitions and copy-return safety checks remain serialized within a home.
Finish waits for a reported worker's last turn **outside** the placement gate, then reloads
and compares its task/terminal generation before mutation. A follow-up or replacement during
that wait refuses the stale finish attempt without stopping newer work. Optional post-close
labels/backlog work and the sweep driver also run outside the outer finish gate; each waiting
copy is reloaded and returned under its own guarded attempt. Opportunistic merged-branch proof
uses a five-second shared budget with at most two seconds per subprocess; unknown proof keeps
the branch. Foreground tell/spawn acquisition allows ten seconds for brief gate contention;
observation writers still yield immediately and publication keeps its longer allowance.
Delivery-managed copy return and actual stop confirmation can still be slow and remain
serialized for safety, so a longer transition can still require another command to retry. Registry locks
remain regular files with complete OS identity and claim nonce. Under the placement gate, a dead
registry claim is removed only after death proof and a fresh matching-nonce read; registry-only
writers stay independent, but all reclaimers serialize through the gate. Legacy/unverifiable file
locks remain protected. Legacy binaries and direct-file writers cannot participate.

Slow external operations do not hold the registry lock. Switching never
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
| `crew.space.name` | Per-project only: saved repository folder display name, preserving case and dots, or `crew` for internal repair fallback. Legacy registered-ID names remain valid. Omitted in combined mode to preserve directory-derived headings. |

The display name is separate from project identity. For a fresh canonical placement,
`myworkflows` registered at `D:/Git/MyWorkflows` requests `MyWorkflows`, while
`crew.space.project` stays `myworkflows` and the automatic ID still ends in
`-project-myworkflows`. Registration aliases use the repository folder's basename too.
Directory spelling comes from the real repository path; a linked checkout resolves its
shared Git directory back to the repository rather than using a task name, hash-bearing
pool parent or slot number. `.xrbuild` keeps its leading dot and stays distinct from `xrbuild`.

This follows Herdr's `paneDirectory` / `directoryName` source for Agents headings: the
resolved directory's last segment, without lowercasing or removing punctuation. Repository-named
pool leaves therefore agree with the requested title. A plain task-named copy, agent navigation
to another directory, or an explicit user rename can produce a different Agents heading;
Crew does not override Herdr's directory resolver or explicit names. Native agreement still
requires a companion that accepts directory-cased names independently of project IDs.

### Occupancy-aware joins

Independent per-project admission reads task records and bounded local Core inventory/labels.
Only preparing/working tasks with recorded launched terminals and a live worker (Core agent or
agent status app) establish occupancy. Reported, closed, stopped and failed tasks, ended terminals
and agent-less kept shells do not count, even if tabs remain. An empty old combined space is not
reused. Mixed live placement projects disqualify it. An occupied canonical project space wins
when an already split home has both eligible identities; otherwise an exclusive combined space
wins before canonical project creation. Dotted projects compare exactly. Verified repair aliases
continue to use the registered crew placement project without rewriting task.project.

Crew validates exact task-owned launch identities and matching home/task/space labels, accepting
old combined labels or the complete v1 tuple. Unreadable records, unavailable Core or unrecorded/
contradictory same-home Crew terminals refuse admission before task/copy/terminal creation rather
than claiming exclusivity. Other homes, remote addresses and personal headings never establish
reuse. Foreign tabs do not establish worker occupancy or grant Crew terminal ownership; native
manual moves and mod-tab membership are not observable through Core's requested-space labels.

A joining worker gets its own crew.task and herdr.tab, not another worker's identity. Joining
`fm-crew-<home>` saves version 1, mode combined, project P, name null, and launches with
crew.space.version=1, crew.space.mode=combined, crew.space.project=P and **no crew.space.name**.
It keeps that space's directory-derived heading; it does not force P as a title. Joining
`fm-crew-<home>-project-P` saves/labels version 1, mode per-project, project P and the
occupied space's validated saved name (or repository folder name for fresh placement). Both retain
crew.home, crew.kind, herdr.right-click=menu and herdr.tab=<home>-<new-task>.

The companion must validate mode/project/ID independently of the saved display name, accepting
both legacy project-ID names and directory-derived names. Older companions that require name to
equal project need that compatibility update. Its binding checks still require the live terminal and exact
native same-machine membership, crew.task/home and herdr.space. Neither title nor project
resemblance grants child binding. A per-project label tuple inside combined is invalid. Combined
children normalize their project/name internally so legitimate per-task project labels can differ.

Review, relaunch and automatic hand-over never re-run occupancy selection: they inherit even
when a task was admitted under per-project policy but saved combined placement. Independent
per-project Q cannot join P-only combined. However, an old Q task's inherited worker or a launch
reserved before the switch can still return there, and combined rollback deliberately allows
new projects there. If that makes combined mixed, future independent per-project admissions
skip it; Crew never evicts or migrates workers to preserve exclusivity. Historical mixed
combined spaces are handled by the same current-occupancy rule.

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
Saved per-project names are safe nonempty basename strings, not recomputed from current
registration spelling. Exact identity and label matching remain required. Occupied canonical
joins retain the validated saved name, including old lower-case names; conflicting live saved
names for one identity refuse admission. Name continuity is separate from positive occupancy:
non-closed tasks retain their canonical name even while reported, stopped or failed, because
they can still launch an inherited review or replacement. Such references do not make combined
or canonical placement eligible for occupancy-based reuse; they only preserve the title if that
canonical identity is selected. Closed history does not pin a naturally removed space's name.
Crew does not rename occupied spaces: no atomic native
rename exists in this command interface, and task/terminal writes would not atomically change
native space state. A legacy heading can therefore remain lower-case until natural zero-tab
removal. Reviews and replacements retain either old or new spelling without registry/path probes.
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
be supported. It must consume per-project name metadata for repository folder headings
rather than registered IDs or pool parent names, accepting legacy ID names and directory-cased
names without coupling display text to identity, and preserving explicit user rename precedence. The old
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

`--gaps=join-project-space` covers exclusive legacy/v1 combined joins, occupied canonical
preference, mixed/finished/empty/shell occupancy, dotted projects, verified repair alias joins,
foreign/remote/other-home exclusions and conservative malformed/unavailable evidence. Its
fixture-only barriers cover same/different-project contenders, first launches, failed launches,
gate-held admission decisions, terminal publication and both sides of a mode-switch reservation.
An external-process guard asserts that no Core/Git/copy call runs under projects.lock.
`--gaps=join-project-space-handover` pauses automatic hand-over after old-terminal removal and
proves admission cannot enter; conversely, pauses after admission task reads and at reservation
prove hand-over cannot enter the reviewer's former lock-release window. A later retry joins the
inherited identity. `--gaps=join-project-space-gate` covers manual relaunch, stop, finish and reviewer
publication gaps, plus replacement releasing its gate while an admission waits to acquire it;
that admission cannot read task state until it owns the gate. Both groups also run inside the
broader join-project-space group, alongside two-spawn and gate-free copy-preparation contention.
`--gaps=preparation-recovery` kills and awaits actual spawner processes after reservation, before/
after plain copy creation, after delivery returns its copy, after brief creation and after Core
returns its address. It covers live-but-slow protection without age expiry, coordinator restart,
racing stale-gate/admission detection and finish recovery, token cancellation, unpublished copy/
terminal receipts, PID reuse, unknown identity and an interrupted empty-gate reclaimer. It uses
real local process identity with fake Core and isolated homes, never the live coordinator.
`--gaps=launch-nonce-recovery` tests the exact Core-created/before-response gap with an empty receipt,
a queued request arriving after finish, acknowledgement and working-state publication kills,
wrong/missing nonce foreign terminals, duplicate/conflicting evidence, and agent-start fencing.
The reused-folder sentinel must survive late terminal-only cleanup. `--gaps=launch-nonce-handover`
covers lost replacement responses and superseded queued nonces without rewinding a live worker.
`--gaps=launch-authorization-gate` queues Core creation between negative inventory and cancellation
publication and proves that authorization waits, then denies. `--gaps=launch-commandline` parses
Pi/Claude launch scripts and proves that denial fences the entire compound fallback command.
`--gaps=windows-process-proof`
checks the native query with module autoload disabled and ensures timeout/permission/invalid output
never becomes death proof. The minimal-home PR-facts and writer-contention tests retain their
persistence, nonblocking and lifecycle-preservation assertions under the same locking protocol.

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

`--gaps=space-name-lifecycle` walks a lone legacy-named ship through spawn, plan report,
approval, implementation report, reviewer launch/report/finish, reopen, relaunch, stop/relaunch
and final finish. Every transition checks name/launch-label agreement and the next admission,
without a leftover unfinished worker masking reported/stopped gaps. Natural removal releases
the old name for a fresh canonical space. It also runs within `--gaps=space-name-case`.

`--gaps=space-name-case` covers directory spelling, aliases, real linked fixture copies under
hash-bearing pool parents, dot-prefixed projects, safe-name and exact-label validation, old
lower-case and directory-cased canonical joins, canonical-over-combined preference, review/
relaunch/hand-over inheritance and conflicting saved-name refusal. All evidence is fake-Core only.

`--gaps=finish-contention` uses deterministic settle/transition barriers to prove unrelated
tell/spawn progress, same-task follow-up/replacement protection, foreign-holder preservation,
brief-contention retry and optional backlog work outside placement. Existing gate and
launch-authorization groups continue to cover exclusion during actual terminal transitions.

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
