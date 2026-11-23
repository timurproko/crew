# Design

## Context

See `proposal.md` for motivation. Findings from the current implementation:

- `cmdProject` checks the live home owner before any mutation. The comment explains the real protection: registrations select repositories used for spawning and cleaning up task copies. Tests explicitly expect non-owner add/remove to fail.
- `home()` loads `crew.json` once per CLI invocation. Only initial creation and project add/remove normally write that registry. The coordinator is an agent invoking short-lived commands, not a resident registry service, so it already sees a fresh registry on its next invocation.
- `writeJson` writes a same-directory temporary file then renames it. This prevents partial JSON reads, not lost read-modify-write updates. Simply deleting the owner check would introduce both lost updates and a check-versus-spawn race.
- `launchWorker` currently resolves a project before recording its `preparing` task. Removal and `--replace` scan tasks, so concurrent edits could otherwise slip into that interval. Finish already atomically records `closed` together with `copyToReturn` before cleanup, preserving a continuous reference until return completes.
- `validId` allows only lowercase letters, digits and dashes, maximum 40 characters. `cmdProject` reuses it and conflates invalid names with usage errors. An isolated probe reproduced exit 2 plus bare usage for `agentnumberone.dev` and success for `agentnumberone` using the very same dotted repository folder.
- Ordinary branches are `<type>/<task-id>` and plain working copies are named after task IDs, not projects. Delivery receives the repository as its working directory and returns the actual copy or pool path. Backlog arguments are forwarded to tasks-axi; status prints the recorded project verbatim.
- Read-only inspection of `D:/Git/herdr-app/src/plugins/crew/plugin.js` found correct quoted CLI calls, but an independent dash-only name validator, a sanitizer that changes `agentnumberone.dev` to `agentnumberone-dev`, and a list parser that discards dotted registrations.

## Goals / Non-Goals

**Goals:** Make registry transactions linearizable with each other and with task admission, while keeping slow external work outside the critical section. Preserve the existing JSON format and the distinction between registration permission and permission to control work.

**Non-Goals:** Multiple owning coordinators, relaxing task IDs, renaming branches/copies to include project names, changing delivery or treehouse pool naming, supporting uncooperative direct file writers, editing Herdr, or introducing a registry daemon.

## Decisions

### 1. One short, per-home registry/admission transaction

Use a dependency-free exclusive filesystem lock in the home, created exclusively and released in `finally`. Record the local PID and a unique token for diagnostics. Bound acquisition waits below the Settings call's 30-second timeout; do not steal a lock merely because it is old. On contention or an abandoned/uncertain lock, fail closed with its exact path and recovery guidance requiring that no process still holds it. Never automatically remove another process's uncertain lock.

Every project mutation takes the lock, rereads and validates the current registry, applies only its requested change, then atomically replaces `crew.json` with the existing same-directory write/rename pattern. Unrelated entries and metadata survive. Validation and Git repository probing that do not depend on registry state happen before locking. No Core ownership query is needed for registration.

Task admission in the shared worker launcher takes the same lock, reloads the current registration, rechecks task-ID availability, resolves the current project and writes its first `preparing` task record before releasing the lock. Any launch preparation that would depend on a stale project is moved after this admission or explicitly revalidated. This covers spawn and review; self-repair's reserved internal project keeps its separate source path and cannot collide with a user registration. Slow quota, Git, delivery and terminal calls do not hold the lock. Once admitted, a task blocks removal/repointing even if launch later fails, until the owner finishes it.

If removal/replacement wins first, admission must use the new registration or refuse before allocating resources. If admission wins first, removal/replacement sees the task and refuses. Cleanup keeps the current atomic closed-plus-pending-copy record ordering; it never exposes an unreferenced live copy. A dedicated safety scan must refuse destructive registration changes when task records cannot be read or validated, rather than treating missing/corrupt records as proof that nothing needs cleanup.

Alternative rejected: only atomic rename, or locking project edits but not admission. Neither protects the check/use interval. Holding a global lock for an entire spawn or wait is also rejected because external tools can take minutes or wait indefinitely.

### 2. Keep owner-only work control and improve the refusal

Remove only the registration ownership gate. Retain owner checks for spawn, stop, finish, review, follow-ups, landing, backlog changes and automatic recovery. Keep `--replace`, unfinished-task and pending-copy protections equally for owners and settings processes. Same-folder registration retains existing option-replacement semantics.

Use consistent wording such as `Crew home <home-path> is controlled by terminal <id>. Only that coordinator may <operation>; this does not mean a project folder is in use.` The no-owner and unavailable-Core cases likewise name the crew home. Do not reinterpret an unavailable Core answer as permission to control work.

Alternative rejected: making Settings impersonate the coordinator or temporarily taking ownership. That would couple configuration to the coordinator terminal and undermine work-control protections.

### 3. Separate project names from task IDs

Introduce a dedicated project-name validator and diagnostic helper. Accept 1–40 lowercase ASCII letters, digits, dashes and dots, starting with a letter or digit; disallow trailing dots and consecutive dots for portable path/ref usage. Keep task IDs unchanged. Diagnose empty names, length, first character, unsupported characters and unsafe dot sequences individually; name-validation failures never fall through to usage-only errors. Use own-property lookups so valid names such as `constructor` cannot resolve inherited object properties.

Preserve registered dotted names rather than normalizing them. Audit explicit project-name entry points, including add/remove, spawn and agent inspection; the internal `crew:self` dispatch key remains reserved for self-repair. Exercise backlog forwarding without imposing the task-ID grammar on project arguments. Keep task-based branch and plain-copy names; dotted repository folders must work for both direct Git copies and delivery's returned pooled paths.

Alternative rejected: widening `validId`, which would silently change task, directory and branch contracts unrelated to project names. Replacing dots with dashes is also rejected because it changes identity and creates avoidable collisions.

### 4. Herdr follow-up is necessary but separate

The plugin calls `node <installed-tool>/crew.mjs project add <derived-name> <folder>` and `project remove <id>` through quoted PowerShell arguments. It does not pass a coordinator terminal or need to do so after the CLI fix. It reads tab-separated `project list` rows and surfaces crew's error text; the Settings UI may prefix an add failure with the selected folder, explaining why the original ownership message looked like a busy repository.

No caller/transport or ownership workaround is needed. A separate Herdr change must preserve safe dots in `projectName`, align `PROJECT_NAME` and its user-facing naming explanation with crew, and let `parseProjects` keep dotted entries. Update its plugin tests and outdated ownership-refusal expectations. Existing dash-normalized registrations are not automatically renamed by this crew PR. Crew cannot restore a dot already removed by the caller or force an old list parser to display a dotted name.

## Risks / Trade-offs

- [A process crashes while holding the transaction lock] → Critical sections contain no external calls; release on ordinary exceptions; bounded, actionable refusal on abandoned locks rather than unsafe automatic stealing.
- [A stale or malformed registry/task record is mistaken for an empty home] → Validate fresh state under the lock and fail closed before removal or replacement.
- [Concurrent commands from old copies bypass the new lock] → All cooperating CLI processes must use the updated installed tool; direct edits and simultaneous legacy binaries are not supported. The coordinator agent itself need not restart because its next CLI invocation uses current code.
- [External tools have their own naming policy] → Preserve raw project identity and test actual arguments/cwd and returned paths at each crew boundary; do not promise to alter third-party tools or Herdr in this PR.
- [Herdr still hides dotted entries until its follow-up] → State this integration gap prominently in the README and report; do not claim the dialog's dotted-name behavior is fully fixed by a crew-only change.

## Migration Plan

No registry version bump or task migration. Update the installed crew tool so new invocations share the transaction protocol, leaving the owning agent and `owner.json` intact. Existing registrations and task records remain valid. Ship regression coverage with each implementation outcome. Rollback leaves valid JSON; an older CLI will again refuse non-owner registration and dotted names, so dotted registrations should be managed with the updated CLI until removed or explicitly re-registered. No automatic rename or data deletion occurs.
