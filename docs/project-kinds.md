# Project kinds API, version 1

Project kind selects delivery for **future ship tasks**. It is independent of worker-space
grouping and historical task `deliveryKind`. Existing tasks, copies, briefs, reports and
owner records are not changed by this interface. All machine-readable forms emit exactly
one JSON object; refusal uses a nonzero exit. No home is initialized implicitly.

## Discover

Both forms work without a home, terminal identity, Core query or repository inspection:

```text
crew project --capabilities --json
crew --capabilities --json
```

```json
{"capability":"project-kinds","version":1,"listJson":true,"setKind":true,"setKindLocal":true,"kindSource":true,"checkoutStale":true,"explicitHome":true,"expectedPath":true,"kinds":["workflow","plain","gate"]}
```

Require the marker/version, existing safety flags, `setKindLocal:true` and all three kinds
before offering non-owner edits. Older v1 binaries lack this permission flag.
Text/help or ignored flags are not proof of support. Unknown/repeated options refuse.

## List

```text
crew project list --json
crew project list --home C:/Users/me/.crew --json
```

Without `--home`, use normal Crew home discovery; the optional explicit form never falls
back to ambient discovery. The validated canonical home must already be initialized.

```json
{"capability":"project-kinds","version":1,"ok":true,"home":"C:/Users/me/.crew","projects":[{"name":"myworkflows","path":"D:/Git/MyWorkflows","kind":"workflow","kindSource":"detected","available":true,"checkoutStale":true}]}
```

The complete array can be empty. Names and stored absolute paths retain exact registration
spelling; `home` is canonical and slash-normalized. Reads are open to non-owners and do not
query Core or mutate registration/tasks. Human `project list` output remains compatible.

An explicitly stored `kind` is authoritative. Otherwise Crew resolves legacy gate/tool
availability, legacy workflow overrides and repository detection itself. Never interpret a
missing workflow override as Plain in a client. Listing an explicit kind reports the saved
selection even if its tool later becomes unavailable; a new spawn then refuses that selection,
not silently switches kind. Restore the tool/remote or explicitly choose another kind.

Additive v1 fields, advertised by `kindSource:true` and `checkoutStale:true` capabilities:

- `kindSource`: `explicit` for a stored `kind`, `legacy` for the effective legacy workflow
  override, or `detected` for automatic repository/gate selection. Legacy gate precedence is
  retained, so an automatically selected gate has source `detected` even with a workflow override.
- `available`: whether the selected kind's required tool/remote is available. An unavailable
  explicit selection is still shown as selected; spawn refuses rather than substituting Plain.
- `checkoutStale`: true when registered HEAD is a proven strict ancestor of the inspected
  published default; false when inspected and not behind; null when not inspected or ancestry
  cannot be established. It is advisory, never a delivery-kind override. Explicit and legacy
  selections do not need remote snapshot inspection and normally return null.

### The same kind as the next spawn

Automatic listing and ship admission use one resolver. With `delivery` and an `origin`, it
reads the published default branch advertised by remote HEAD, not the registered checkout's
possibly old instructions or its cached `origin/HEAD`, which can outlive a default-branch rename.
One `git ls-remote --symref origin HEAD` advertisement supplies both branch and commit.
Instruction headers, the named skill and delivery callers are read from that commit's blobs.
Thus a stale registered Plain checkout whose fresh copy contains delivery signals is listed
as Workflow with `checkoutStale:true`, and the next spawn uses Workflow. The reverse mismatch
is handled identically. Without origin, committed local HEAD is the allocation source. Without
delivery, automatic delivery is Plain unless a gate is available.

JSON listing inspects independent repositories concurrently, with at most eight workers and
one invocation-local tool-discovery snapshot. Shared Git object stores are serialized and
equivalent selections for the same folder are inspected once. Results and refusals retain
registry order, and all workers exit before the command completes. There is no persistent kind
cache: every spawn still reads the live published default and current tool availability.

Each snapshot resolution has a ten-second Git-operation budget, with subprocesses at most
five seconds; signal reads are bounded to two seconds and 128 KiB each, with at most 100 caller
files. A remote head lookup may fetch missing objects with no tags or FETCH_HEAD writes; it
never updates checkout files, HEAD, index or tracking refs. These are Git reads/object retrieval,
not Core queries, ownership operations or worker allocation. If a published automatic selection
cannot be resolved, listing and spawn refuse `kind-unavailable` rather than inventing Plain.
Explicit choices remain listable offline. No home, task or registration is written by listing.

The effective kind predicts the next admission under unchanged registration, repository and
tool inputs, not across intervening changes. At reservation, spawn rereads the registration
under `projects.lock` and freezes the resolved delivery fields on the preparing task. Settings
changes during later copy allocation cannot alter that task; review, land, relaunch and hand-over
retain its original delivery, including old records with only workflow/gate fields. No bulk task
migration, terminal restart or notification is required.

## Change only kind

```text
crew project set-kind myworkflows --kind workflow --home C:/Users/me/.crew --expected-path D:/Git/MyWorkflows --json
```

```json
{"capability":"project-kinds","version":1,"ok":true,"home":"C:/Users/me/.crew","project":{"name":"myworkflows","path":"D:/Git/MyWorkflows","kind":"workflow"},"changed":true}
```

All four flags are required exactly once. The existing name must match a valid project ID.
The expected folder must be absolute and resolve to an existing canonical directory matching
the registered path; lexical equality alone is not proof. Missing folders and files refuse,
including disappearance before the locked recheck and otherwise no-op requests. A removed or
repointed name refuses. Canonical-equivalent path aliases can match, but the stored path is
never rewritten. The setter rereads/rechecks the initialized home, project and path
under `projects.lock`, merges into the fresh registration and atomically publishes **only**
its `kind` field. Legacy `workflow`, gate skips, unknown fields and other projects survive.
There is no re-registration or unfinished-task restriction because existing tasks retain their
recorded delivery. Repeating the already-stored kind returns `changed:false` without rewriting.
An effective detected kind without a stored selection becomes explicit on the first setter.

- `plain`: bypass workflow and gate delivery for future ships, even if legacy overrides or
  remotes say otherwise. Repository delivery signals produce a concise advisory, not a rewrite.
- `workflow`: use the shared plan-first draft/outcomes flow; requires installed `delivery`.
  It overrides legacy gate precedence. No repository signal is required for an explicit choice.
- `gate`: use no-mistakes; requires its installed tool and the repository's `no-mistakes` remote.
  Existing gate-skip settings remain in force. Missing prerequisites refuse selection/spawn.

The guarded kind-only setter is allowed under local filesystem authority even while another
coordinator owns the home, with no terminal identity, owner-file inspection, Core query or
takeover. Stale or malformed owner metadata is not repaired or consulted. Existing tasks keep
their delivery; the owner's next admission reads the new registration without restarting.
Home validation retains the registry-link, tasks-directory, absolute-local-path and identity
guards used by the local worker-space setter.

This permission grants no work control: spawn, stop, finish, tell, relaunch, land, backlog
mutations and end remain owner-only because they act on work or delivery authority. Project
add/remove already allow independent local registration under their own unfinished-task and
path-replacement safeguards; their behavior is unchanged, not broadened by this setter.

## Refusals and limits

```json
{"capability":"project-kinds","version":1,"ok":false,"home":"C:/Users/me/.crew","error":{"code":"project-missing","message":"The project is not registered."}}
```

Before validation, `home` is null. Known safe failures name their reason, unexpected failures
use a fixed public message and never write crash data to an ambient/default home.

| Code | Exit | Meaning |
| --- | --- | --- |
| `invalid-arguments` | 2 | Missing/unknown/repeated option, invalid name, unsafe home or path syntax. |
| `home-missing` | 2 | Explicit/default home is absent or not initialized. |
| `project-missing` | 2 | Name is not registered. |
| `project-changed` | 2 | Expected path differs, disappeared or changed before publication. |
| `kind-unavailable` | 2 | Unknown kind, missing required tool/remote, or unresolved automatic allocation source. |
| `registry-busy` | 3 | Bounded registry lock contention; retry without removing the lock. |
| `invalid-registry` | 2 | Malformed registry or invalid stored project identity/kind. |
| `internal-error` | 4/70 | IO/locking or unexpected failure; success is not confirmed. |

Spawn uses its normal human refusal with `kind-unavailable` and exit 4, before task/copy
creation, if a selected kind cannot be honored. Settings failures or lost acknowledgements do
not imply rollback: refresh authoritative JSON rather than retrying blindly.

The Herdr PR 100 contract is supported as written. Additions: the root capability alias,
optional explicit-home list, `invalid-registry` for corrupt stored data, and the additive
`setKindLocal` permission flag. Native Settings rendering and real-machine
transport remain Herdr responsibilities; tests use only fake homes, local repositories and Core.

Focused tests: `node crew.test.mjs --gaps=project-list-speed`,
`node crew.test.mjs --gaps=workflow-detection`,
`node crew.test.mjs --gaps=project-kinds`, `node crew.test.mjs --gaps=project-kinds-concurrency`,
`node crew.test.mjs --gaps=project-kind-paths`, `node crew.test.mjs --gaps=project-kind-snapshots`,
`node crew.test.mjs --gaps=project-kind-stale-origin-head`,
`node crew.test.mjs --gaps=project-kind-ordering` and `node crew.test.mjs --gaps=project-kind-lifecycle`.
