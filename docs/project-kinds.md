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
{"capability":"project-kinds","version":1,"listJson":true,"setKind":true,"explicitHome":true,"expectedPath":true,"kinds":["workflow","plain","gate"]}
```

Require the marker/version, all four safety flags and all three kinds before offering edits.
Text/help or ignored flags are not proof of support. Unknown/repeated options refuse.

## List

```text
crew project list --json
crew project list --home C:/Users/me/.crew --json
```

Without `--home`, use normal Crew home discovery; the optional explicit form never falls
back to ambient discovery. The validated canonical home must already be initialized.

```json
{"capability":"project-kinds","version":1,"ok":true,"home":"C:/Users/me/.crew","projects":[{"name":"myworkflows","path":"D:/Git/MyWorkflows","kind":"workflow"}]}
```

The complete array can be empty. Names and stored absolute paths retain exact registration
spelling; `home` is canonical and slash-normalized. Reads are open to non-owners and do not
query Core or mutate registration/tasks. Human `project list` output remains compatible.

An explicitly stored `kind` is authoritative. Otherwise Crew resolves legacy gate/tool
availability, legacy workflow overrides and repository detection itself. Never interpret a
missing workflow override as Plain in a client. Listing an explicit kind reports the saved
selection even if its tool later becomes unavailable; a new spawn then refuses that selection,
not silently switches kind. Restore the tool/remote or explicitly choose another kind.

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
never rewritten. The setter rereads/rechecks the initialized home, owner, project and path
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

This is **not** the worker-space local preference ownership exception. A desktop can edit an
unowned home; the recorded owner can edit its own home. A different, malformed or unverifiable
owner refuses with `home-owned`, even if it might be stale. The caller must arrange a normal
release/start, not impersonate an owner or bypass it. The setter makes no Core liveness query
or takeover. Same-user filesystem authority is not a security boundary against malicious
owner/registry edits outside this protocol; checks are conservative observations, not an atomic
transaction with Core ownership. Home validation uses the same registry-link, tasks-directory,
absolute-local-path and identity guards as the local worker-space setter.

## Refusals and limits

```json
{"capability":"project-kinds","version":1,"ok":false,"home":"C:/Users/me/.crew","error":{"code":"home-owned","message":"Another session owns this Crew home."}}
```

Before validation, `home` is null. Known safe failures name their reason, unexpected failures
use a fixed public message and never write crash data to an ambient/default home.

| Code | Exit | Meaning |
| --- | --- | --- |
| `invalid-arguments` | 2 | Missing/unknown/repeated option, invalid name, unsafe home or path syntax. |
| `home-missing` | 2 | Explicit/default home is absent or not initialized. |
| `project-missing` | 2 | Name is not registered. |
| `project-changed` | 2 | Expected path differs, disappeared or changed before publication. |
| `kind-unavailable` | 2 | Unknown kind or missing required tool/remote at selection. |
| `home-owned` | 3 | Another or unverifiable recorded owner; no implicit takeover. |
| `registry-busy` | 3 | Bounded registry lock contention; retry without removing the lock. |
| `invalid-registry` | 2 | Malformed registry or invalid stored project identity/kind. |
| `internal-error` | 4/70 | IO/locking or unexpected failure; success is not confirmed. |

Spawn uses its normal human refusal with `kind-unavailable` and exit 4, before task/copy
creation, if a selected kind cannot be honored. Settings failures or lost acknowledgements do
not imply rollback: refresh authoritative JSON rather than retrying blindly.

The Herdr PR 100 contract is supported as written. Additions: the root capability alias,
optional explicit-home list, and `invalid-registry` for corrupt stored data. The owner check is
intentionally conservative about stale owner records. Native Settings rendering and real-machine
transport remain Herdr responsibilities; tests use only fake homes, local repositories and Core.

Focused tests: `node crew.test.mjs --gaps=workflow-detection`,
`node crew.test.mjs --gaps=project-kinds`, `node crew.test.mjs --gaps=project-kinds-concurrency`
and `node crew.test.mjs --gaps=project-kind-paths` (missing/file targets and locked disappearance).
