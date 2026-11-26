# Design

## Context

See proposal.md for motivation. At merged Crew head `73ee0136`, `cmdConfig` requires the owner for every write, including an unowned home. `withRegistry` already serializes config/project edits and initial task reservations through `projects.lock`, rereads the registry under lock, and keeps atomic replacement plus bounded Windows sharing retries. New task placement is frozen at reservation, before slow worktree/Core operations.

The Herdr worker's fake-only evidence in its `herdr-ux-polish/report.md` and `crew-owner-contract.json` confirms live-owner, unknown-owner and unowned app setters all fail. This plan introduces explicit authority; the app must never impersonate the owner or invoke start/end. The task-orchestration spec currently says all mode changes require ownership and status contracts remain unchanged; the delta explicitly carves out the local setter and plain status line, not JSON changes.

## Goals / Non-Goals

**Goals:** Give an ordinary local same-user process a single-setting interface with no inferred target, discoverable support, truthful results and unchanged admitted placement. Reuse the registry transaction and OS filesystem permissions instead of session identity.

**Non-Goals:** Authentication service, token issuance, remote execution, privileged helper, global machine/home discovery, project edits, task/session/owner control, automatic init/migration/update, native-space operations or asynchronous coordinator notifications. Herdr owns global intent, transport, retry and per-home application state.

## Decisions

### 1. Explicit opt-in within the existing setting command

Supported new command forms:

```text
crew config worker-space --capabilities --json
crew config worker-space --set-local <combined|per-project> --home <absolute-home> --json
```

The new setter requires all three options exactly once; order of these options is immaterial, values are separate arguments, and duplicates, unknown flags, positional modes mixed with flags, missing/empty values and extra arguments refuse. No `--home` override is added globally or to any other command. The setting key is fixed, not an arbitrary JSON key, filename or patch.

The current no-argument getter and positional owner setter keep their existing validation, ownership and human-readable output. Neither `--json` nor `--home` alone relaxes ownership. Do not change `requireOwner` or teach any orchestration command a bypass.

Rationale: An explicit `--set-local` is smaller and harder to mistake for generic permission than `--force` or a global `--app`; it leaves existing scripts intact. A separate top-level settings command would duplicate the one setting's namespace without providing extra confinement.

### 2. Capability probe and exact version-1 JSON

The probe requires no home, terminal or Core, does no filesystem write, and returns exit 0 with one stdout JSON object:

```json
{"capability":"worker-space-local-set","version":1,"modes":["combined","per-project"],"explicitHome":true}
```

Help advertises the literal `worker-space-local-set v1` and both new command forms. Herdr probes the installed Crew on each target machine and enables writes only after exit 0, valid JSON, the exact capability/version, both modes and `explicitHome: true`. A version string or a help match alone is not sufficient. Older Crew currently refuses these arguments; even if a binary ignores flags, its plain text/wrong shape is not support. Unsupported responses must not cause fallback to direct edits, borrowed environment identities or start/end. A transport failure/timeout remains unavailable, not confirmed unsupported.

Successful setter (exit 0):

```json
{"capability":"worker-space-local-set","version":1,"ok":true,"home":"C:/canonical/home","mode":"per-project","changed":true}
```

`home` is the validated canonical path, slash-normalized. `mode` is the effective value at the transaction's ordering point, not a promise that a later writer cannot change it. `changed` compares effective modes, so a missing setting already means combined: requesting combined returns `changed: false` and need not materialize the key. Repeating the current mode is a no-write success. A changed success patches only `workerSpaceMode` in the freshly locked registry. Never report success before replacement succeeds.

Refused setter:

```json
{"capability":"worker-space-local-set","version":1,"ok":false,"home":null,"mode":null,"changed":false,"error":{"code":"home-not-found","message":"The explicit coordinator home does not exist."}}
```

Every recognized new-mode invocation, including malformed arguments/missing JSON, returns exactly one stdout JSON object with the same envelope; stderr is reserved for optional diagnostics, not required parsing. Before validation `home` is null; after validation it is the canonical target. Refusals always use `mode: null`: no unverified effective-mode claim after a failed transaction. An unexpected failure after publication can be ambiguous and must remain a refusal; the caller can safely repeat this idempotent command. Errors are stable codes, messages are explanatory rather than a parsing contract:

| Exit | error.code | Meaning |
| --- | --- | --- |
| 0 | none | Capability reply or committed/no-op setting success. |
| 2 | `invalid-arguments`, `invalid-mode` | Invalid shape or unsupported mode; no mutation. |
| 2 | `home-not-found`, `home-not-initialized`, `invalid-home`, `invalid-registry` | Explicit target is absent, not initialized, unsafe/not a local absolute home, or malformed; never create/repair it. |
| 3 | `registry-busy` | Existing bounded two-second lock wait exhausted; never steal/remove another lock. |
| 4 | `io-error` | Permission, lock-open, read or atomic replacement failed; no false success. |
| 70 | `internal-error` | Unexpected defect; no success claim. |

The new-mode handler catches/serializes its own failures, without invoking the generic crash writer against a discovered/default real home. No error path initializes a home or writes crash state outside the explicit home. File-operation exceptions distinguish absent targets, invalid content and permission failure rather than collapsing everything into invalid JSON.

### 3. Existing-home confinement and the authorization boundary

The executable is a short process under the app user's ordinary OS identity, not a daemon accepting untrusted network requests. Authority is the same-user process's existing filesystem permissions, like safe project registration; the flag grants no OS privilege and never elevates. Crew's owner guard coordinates orchestration; it is not a security boundary against another program already able to edit that user's files. Do not claim a secret capability token or protection from a hostile process with the same filesystem rights.

The explicit target is required even if `CREW_HOME`, cwd, default home or legacy homes point somewhere else. Reject relative/drive-relative paths, file paths, Windows UNC/device paths and non-home folders. Resolve an existing directory to its canonical real path; a home alias can resolve only to a target that independently passes every home check. Use that canonical directory for all later operations, never a user-supplied relative suffix.

A recognized initialized home has an existing valid version-1 `crew.json` with a nonempty string tag, a valid projects object under current registry validation, a valid/absent worker-space mode, and an existing real `tasks` directory. Both current unpacked homes and initialized legacy-layout homes qualify without migration. An arbitrary folder, ancestor, project folder, file named crew.json, empty directory or registry-shaped file without home structure refuses. These are format/structure checks, not cryptographic proof of who originally ran init.

Refuse redirected registry entries: `crew.json` must be a regular non-symlink, non-hard-linked file directly in the canonical home; `tasks` must not be a symlink/junction to another directory. Recheck the target directory identity and registry safety after acquiring `projects.lock`, together with the fresh registry read, before mutation. A replaced directory, newly unsafe registry or vanished initialization refuses rather than recreating anything.

Only fixed paths beneath the validated canonical home are used: existing `crew.json`, transient `projects.lock` and an exclusive unpredictable temporary sibling for atomic replacement. Reuse the current registry lock/transaction and Windows replacement retry policy; add a narrowly scoped safe-temporary option/helper for this path if needed, leaving legacy writers unchanged. Temporary creation must not follow a precreated predictable symlink, truncate another file or unlink the destination before rename. Release only this command's lock/temp. Never create directories, tasks, owner files, coordinator rules or registry when absent.

Rationale: Checking only `existsSync(crew.json)` or using `home()` would permit fallback/discovery or malformed targets; terminal spoofing and direct app JSON writes would bypass ordering. Canonicalization plus structure/link validation bounds ordinary path redirection and misuse. This is not an OS sandbox against malicious same-user directory swapping between filesystem calls; portable Node APIs cannot make that stronger claim. Mounted filesystems follow existing one-machine-per-home assumptions; there is no remote transport in this command.

### 4. Only the future-placement preference changes

Do not query or modify ownership for this path. Another live owner, an unknown Core answer, an absent/stale owner and a non-terminal caller all have the same setting authority. No Core call is needed. All actual orchestration commands retain their owner checks, and no task/owner/project pointer is changed.

Inside the existing registry transaction, compare the current effective mode, patch only `workerSpaceMode` if different, and publish atomically. Preserve projects, tag, version and every unknown metadata field semantically; registry whitespace may change on a real write. Owner and task files stay byte-identical apart from a legitimately concurrent spawn writing its own reservation. Transient lock/temp files disappear on normal completion.

The owner's next independent admission rereads the current registry and selects its placement under the same lock. An already admitted task retains its recorded placement even if Core launches after the local setting returns. Reviews/relaunches/handovers continue to inherit the source task. Switching never moves, relabels, interrupts, creates or deletes live workers/spaces.

### 5. Coordinator observation without interruption

Add one plain-status line immediately after the home/owner line:

```text
worker-space: per-project (new task admissions only; existing workers keep their placement)
```

It is a read of the current effective setting, not a change event or audit log, and is shown even with no tasks. No terminal message, input, restart, watcher or forced session notification is sent. The owner sees the setting on the next plain status/getter; its next admission already observes it without needing status. Preserve legacy full JSON and minimal fleet JSON shape/bytes for unchanged inputs. This avoids breaking Herdr polling clients or adding state just to announce a harmless preference change.

### 6. Isolated regression strategy

Add a focused `--gaps=worker-space-local-setter` group in `crew.test.mjs`, reusing the fake Core, isolated user/home environment, `projectProcess` and deterministic filesystem barriers, with no production hooks.

- Probe in an uninitialized sandbox with contradictory `CREW_HOME` and unavailable Core: exact reply, no filesystem/Core mutation; wrong/missing version shapes cannot authorize an app write.
- Set while another fake terminal is live, with unknown owner liveness, with no owner, and with a stale owner; clear both terminal identity variables and prove the local path needs no Core.
- Both modes, absent combined default, repeated/no-op writes, invalid mode, malformed options and legacy owner setter/getter compatibility.
- Missing home, empty/uninitialized folder, invalid registry/mode/tag, relative/UNC/device/file target, misleading cwd/env, registry symlink/hardlink and redirected tasks; refused commands do not create anything or change outside sentinels. Platform-specific link creation is handled explicitly where unsupported.
- Deep compare every registry field except the one setting; byte-compare owner/task/rules before/after, including unknown metadata and project fields. Include non-owner attempts at spawn/stop/finish/end and unrelated config keys to prove no expanded authority.
- Held registry lock returns bounded JSON busy refusal; failed lock-open/replacement and injected unexpected defects return truthful JSON without loss of registry or stale temp/lock ownership. Retain Windows sharing retries.
- Deterministically pause a spawn after reservation and lock release, change via the local setter, then release launch: saved placement and launch labels retain the old mode. A later independent task uses the new mode. Also cover setter before reservation, stale pre-lock registry snapshots and concurrent project add preserving both changes.
- Plain status reflects changed mode, while both JSON contracts stay unchanged and do not write or notify anything.

## Risks / Trade-offs

- [Same-user callers can alter future placement during work] -> This is the intended narrow preference authority; never changes existing placement or permits control of work.
- [A later write supersedes success] -> Define success at the locked transaction point, return idempotent results and let Herdr track/retry each known home separately.
- [Filesystem permissions vary across OSes] -> Use the ordinary unprivileged user and fail closed on inaccessible/unsafe homes; do not introduce a privileged helper or pretend terminal ownership authenticates the desktop.
- [Abandoned locks or Windows sharing failures] -> Keep current bounded lock/replacement behavior; machine-readable refusal, no lock stealing and no delete-before-replace.
- [Old binaries ignore unfamiliar options] -> Require exact successful capability JSON and validate every setter response, not minimum-version guessing.
- [Herdr expects instant global success] -> Crew only confirms one explicit local home per invocation; unreachable/unsupported/failed homes stay distinct in Herdr. No real fleet edits are part of this task.

## Migration Plan

No schema migration: keep registry version 1 and combined default. Publish docs/help and the tested v1 contract together; after implementation comment that exact contract and Crew PR link on herdr-app PR 88. At plan handoff the interface is proposed, not shipped; do not tell the app to enable production writes yet.

Deploy by the person's normal Crew update on each machine after merge. Unsupported machines retain the read-only fallback. For preference rollback use combined through an authorized path; never move existing project-bound tasks. Binary downgrade has the already documented inherited-placement limits and is not a migration performed by this feature.
