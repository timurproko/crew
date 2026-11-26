## MODIFIED Requirements

### Requirement: One coordinator owns a home

Crew SHALL permit only one live coordinator to control work in a home, including spawning, stopping, finishing and mutating its backlog. Safe project registration and the explicit local worker-space setter SHALL NOT require ownership. An unavailable Core answer SHALL NOT authorize takeover of an existing owner. Ownership refusals SHALL identify the crew home and controlling terminal rather than imply a project folder is busy.

#### Scenario: Another coordinator is live

- **WHEN** another session starts a home whose owner terminal is live
- **THEN** crew refuses ownership and permits read-only inspection, safe project registration and the explicit local worker-space-only setter

#### Scenario: Owner cannot be checked

- **WHEN** Core cannot establish whether the recorded owner is alive
- **THEN** crew retains the recorded owner rather than treating uncertainty as death

#### Scenario: Settings registration does not grant orchestration rights

- **WHEN** a process without the owner's terminal registers a project and tries to spawn, stop or finish work
- **THEN** registration is allowed but work control is refused with a message identifying the crew home and its owner

#### Scenario: Local worker-space permission does not grant orchestration rights

- **WHEN** a non-terminal process successfully sets worker-space through the explicit local interface and then tries to spawn, stop, finish or release the home
- **THEN** those operations retain their existing ownership refusals and the owner remains unchanged

### Requirement: Worker-space mode is an immediate home setting

Crew SHALL provide `crew config worker-space` to show and `crew config worker-space combined|per-project` to change the persistent mode. Missing configuration SHALL mean combined. Reads SHALL be open; the positional setter SHALL require the owner, with only the explicit local setter exempt. Independent admission SHALL use the latest ordered setting without restart. Invalid values SHALL be refused without changing configuration or live work.

#### Scenario: Existing home has no setting

- **WHEN** a home without a worker-space setting launches tasks for two projects
- **THEN** both use the existing combined space identity and the show command reports combined

#### Scenario: Owner changes the mode

- **WHEN** the owning coordinator sets per-project and next admits a new independent task
- **THEN** that task uses per-project placement without a session restart and no existing terminal is moved

#### Scenario: Setting access is invalid or unauthorized

- **WHEN** a non-owner uses the positional setter or an invalid mode is supplied through either setter
- **THEN** Crew refuses and leaves settings, registry entries, terminals and spaces unchanged

#### Scenario: Registration and settings change concurrently

- **WHEN** a setting change races project registration or task admission
- **THEN** registry data is preserved and each admitted task uses one complete setting snapshot ordered before or after the setting change

#### Scenario: Mode changes while a spawn is in progress

- **WHEN** a mode change races a spawn's initial task reservation
- **THEN** reservation before the change retains its saved placement even if Core starts later, while reservation after the change uses the new mode, without moving or relabeling another worker

### Requirement: Legacy tasks and orchestration commands remain compatible

Tasks without placement metadata SHALL retain combined inheritance and remain reportable and finishable without bulk migration. Space contracts SHALL stay compatible across lifecycle commands; end SHALL release ownership without moving work. Status SHALL NOT reconcile spaces. Allowed additions are the plain-status mode line, ordinary JSON review context, minimal fleet task project, and verified PR terminal metadata during explicit discovery.

#### Scenario: Updated tool loads an old running task

- **WHEN** a pre-change combined task is loaded after per-project mode is enabled
- **THEN** status, wait, tell, review, replacement and finish still work and do not move the existing worker or infer project placement from the current setting

#### Scenario: Coordinator releases a mixed home

- **WHEN** the coordinator runs end while combined and project-bound workers exist
- **THEN** ownership is released and the existing workers, task bindings and occupied spaces remain untouched

#### Scenario: Another coordinator starts with earlier-session tasks

- **WHEN** a mixed home is released, another coordinator starts it and changes the mode
- **THEN** earlier-session terminals remain unchanged, new independent tasks use the newly saved mode, and earlier tasks' reviews, replacements and finish use their original placement and ownership evidence

#### Scenario: An inspector reads fleet status

- **WHEN** a non-owner requests ordinary JSON or minimal fleet status for a mixed layout
- **THEN** the specified output contracts are preserved and no space mutation occurs; only explicit discovery may publish a verified PR URL to a task's recorded terminal

### Requirement: Fleet status has a minimal versioned shape

Crew SHALL offer `status --json --view fleet` with exactly home, owner, tasks, prDiscovery and view at the root. The view SHALL be `{name: "fleet", version: 1}` and root prDiscovery SHALL be `{version: 1}`. Non-null owner SHALL contain only terminal and live. Every task SHALL contain only id, state, project, terminal, pr and prDiscovery; pr SHALL remain the recorded value or null. Discovery results SHALL retain the four-field version-1 shape.

#### Scenario: Fleet output contains only consumer fields

- **WHEN** a caller requests fleet status with or without --discover-prs
- **THEN** the response has the exact specified fields and markers, without launch, standby, fallback, core, recovery, errors, elapsed, copy-return or owner.mine details

#### Scenario: Fleet without discovery uses saved facts

- **WHEN** fleet status is requested without --discover-prs
- **THEN** no GitHub or remote Git reads occur, recorded or saved discovered links produce known results, non-ships without links produce none, and unobserved ships produce unavailable with reason not-requested

## ADDED Requirements

### Requirement: Local worker-space support is explicitly discoverable

Crew SHALL support the read-only, home-independent `crew config worker-space --capabilities --json` probe. Exit 0 SHALL return one JSON object with capability `worker-space-local-set`, version 1, modes combined and per-project, and explicitHome true. Help SHALL advertise `worker-space-local-set v1`. Clients SHALL require the successful versioned probe, not infer support from a release number.

#### Scenario: Desktop probes without a home or terminal

- **WHEN** a non-terminal caller probes in an uninitialized environment with Core unavailable
- **THEN** Crew returns the capability object without creating files, discovering a home or querying Core

#### Scenario: Older binary cannot prove support

- **WHEN** a probe fails, emits non-JSON or lacks the expected capability, version, modes or explicitHome marker
- **THEN** it does not authorize the app setter or any owner-identity, direct-file or start/end workaround

### Requirement: Explicit local setting authority changes only worker-space

Crew SHALL accept `crew config worker-space --set-local combined|per-project --home <absolute-home> --json` under ordinary local filesystem authority without terminal ownership. It SHALL change only workerSpaceMode using the registry transaction, preserving all other metadata and owner/task/session/project state. This authority SHALL NOT extend to another setting or command, elevate privileges, query Core or transfer ownership.

#### Scenario: Another owner is live

- **WHEN** a local process with no terminal identity sets a valid mode for an initialized home owned by another live coordinator
- **THEN** the mode changes successfully without altering the owner or any existing worker placement

#### Scenario: Owner liveness is unknown

- **WHEN** a local process sets the mode while the recorded owner's Core state is unknown
- **THEN** Crew applies the setting without asking Core or changing the owner

#### Scenario: Home is unowned

- **WHEN** a local process sets the mode in an initialized home with no owner or a stale owner
- **THEN** Crew applies only the setting without requiring start, creating an owner or taking over

#### Scenario: Mode or arguments are invalid

- **WHEN** the local setter receives an unsupported mode, missing required option, duplicate option, unknown flag, extra argument or a positional setter mixed with local options
- **THEN** Crew returns a JSON refusal without changing the home or granting authority to another operation

#### Scenario: Metadata remains intact

- **WHEN** the local setter changes an initialized registry containing projects and unknown metadata
- **THEN** every field except workerSpaceMode remains semantically identical, owner/task/rules files remain byte-identical and live terminals receive no mutations

### Requirement: Local setting targets only an existing initialized home

The local setter SHALL require an explicit absolute local home, independent of cwd, environment and default-home discovery. It SHALL validate the canonical existing directory, version-1 registry with nonempty tag and valid projects/mode, and real tasks directory. Missing, malformed or redirected registry/home structure SHALL refuse without initialization, migration or writes outside the validated home. Registry links SHALL NOT redirect writes.

#### Scenario: Target does not exist

- **WHEN** the explicit home path is missing
- **THEN** Crew returns home-not-found and does not create that path, a registry, lock or parent directory

#### Scenario: Target is not initialized

- **WHEN** the target is an empty folder, project directory or registry-shaped file without initialized home structure
- **THEN** Crew returns home-not-initialized or invalid-registry and does not repair or create anything

#### Scenario: Ambient discovery points elsewhere

- **WHEN** cwd or CREW_HOME identifies another valid home but the explicit target is absent or invalid
- **THEN** Crew refuses that explicit target without falling back or writing to the ambient home

#### Scenario: Target redirects a registry or task directory

- **WHEN** crew.json is a symlink, hard link or nonregular file, or tasks redirects outside the canonical home
- **THEN** Crew refuses with invalid-home and preserves all outside files

#### Scenario: Home alias resolves to initialized canonical directory

- **WHEN** an absolute directory alias resolves to a real initialized local home
- **THEN** Crew validates the real target and operates only beneath that canonical directory, returning its canonical slash-normalized path

#### Scenario: Target is not an absolute local directory

- **WHEN** the supplied target is relative, drive-relative, a file, or a Windows UNC/device path
- **THEN** Crew returns invalid-home without writing any target

#### Scenario: Target changes before its transaction

- **WHEN** the canonical directory or registry becomes absent, replaced or unsafe before the locked setting update
- **THEN** Crew refuses rather than recreating initialization or publishing to a redirected target

### Requirement: Local setter returns truthful versioned JSON

The local setter SHALL emit one stdout object with capability, version, ok, home, mode and changed. Success SHALL use exit 0 and report effective mode at its ordered transaction point; no-op SHALL report changed false without a registry rewrite. Refusal SHALL report ok false, mode null, changed false and error code/message. Exit 2 SHALL cover arguments/home/registry, 3 lock contention, 4 IO failure and 70 unexpected defects, without success claims.

#### Scenario: Requested mode changes

- **WHEN** atomic publication succeeds for a different mode
- **THEN** the result identifies capability worker-space-local-set version 1, ok true, canonical home, the requested mode and changed true

#### Scenario: Effective mode already matches

- **WHEN** combined is requested with no stored mode or the requested mode equals the stored mode
- **THEN** Crew returns successful effective mode and changed false without rewriting crew.json

#### Scenario: Registry lock is busy

- **WHEN** the existing bounded registry-lock wait expires
- **THEN** Crew returns exit 3 and registry-busy JSON without stealing the lock or changing registry content

#### Scenario: Filesystem or unexpected failure

- **WHEN** the local setting handler cannot safely read, lock or publish, or encounters an unexpected defect
- **THEN** it returns the appropriate JSON refusal without claiming an effective mode or writing crash state to a discovered/default home

### Requirement: Local changes retain admission ordering

Local worker-space changes SHALL share registry serialization with project edits and independent task reservation. Already admitted tasks SHALL retain saved placement even if launched after a change; later independent admissions SHALL use the current ordered mode. Reviews and replacements SHALL retain inherited placement. No setter SHALL move, relabel or interrupt existing work or mutate native spaces.

#### Scenario: Spawn pauses after reservation

- **WHEN** a combined spawn reserves its task and pauses before launch while a local setter changes to per-project
- **THEN** that spawn launches with combined metadata and labels, while a later independent admission uses per-project

#### Scenario: Local change precedes reservation

- **WHEN** the local setter commits per-project before an independent task reserves its record
- **THEN** the new task uses per-project placement without restarting its coordinator

#### Scenario: Project addition races local setting

- **WHEN** project registration and local setting run concurrently
- **THEN** both successful changes persist without losing unrelated metadata or writing stale snapshots

### Requirement: Plain status exposes the current future-placement mode

Plain crew status SHALL show the current effective worker-space mode after the home/owner line, explaining that it affects new admissions only and existing workers keep placement. The getter SHALL remain available without ownership. Observation SHALL NOT send terminal input, restart sessions, reconcile spaces or add fields to legacy full or minimal fleet JSON.

#### Scenario: Coordinator inspects after desktop change

- **WHEN** the owner next runs plain status after a local setting change
- **THEN** status displays the updated mode even with no tasks, and no restart or asynchronous terminal message is needed

#### Scenario: Existing JSON consumer inspects after change

- **WHEN** a caller requests legacy status JSON or fleet JSON
- **THEN** no worker-space field or notification metadata is added and the existing serialized contract remains unchanged

### Requirement: Fleet task project preserves authoritative task identity

Fleet tasks SHALL include project as the exact nonempty recorded string from full status, or null when absent or unusable. Crew SHALL NOT infer project from labels, cwd, titles or current registry membership. Adding project SHALL NOT change other fleet fields, version markers, retention, discovery or authority. Internal repairs SHALL retain crew:self even when verified placement shares the registered crew space.

#### Scenario: Registered project spelling is preserved

- **WHEN** combined or per-project tasks use a dotted registration such as .xrbuild or agentnumberone.dev
- **THEN** fleet task project equals the exact recorded full-status project with no normalization

#### Scenario: Internal repair uses a placement alias

- **WHEN** an internal repair with task project crew:self requests either internal crew:self placement or a verified registered crew placement
- **THEN** its fleet project remains crew:self, equal to full status, without rewriting task or placement identity

#### Scenario: Historical retained task lost its registration

- **WHEN** a closed task remains visible through its PR but its registration or working copy is gone
- **THEN** its fleet project remains the recorded project without new registry or repository verification

#### Scenario: Project evidence is missing

- **WHEN** a visible task has no nonempty string project
- **THEN** fleet emits project null rather than omitting the field or inventing evidence from labels

#### Scenario: Indexed reads preserve project updates

- **WHEN** fleet reads a cold, warm, changed or rebuilt summary index
- **THEN** every visible task project agrees with current authoritative task state without extra per-worker Core or network calls
