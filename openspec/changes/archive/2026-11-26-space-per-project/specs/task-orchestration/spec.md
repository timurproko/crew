# Task orchestration delta

## ADDED Requirements

### Requirement: Worker-space mode is an immediate home setting

Crew SHALL provide `crew config worker-space` to show and `crew config worker-space combined|per-project` to change the home's persistent mode. Missing configuration SHALL mean combined. Reads SHALL be open; changes SHALL require the owner. The next independent task admission SHALL use the latest ordered setting without restarting the session. Invalid values SHALL be refused without changing configuration or live work.

#### Scenario: Existing home has no setting

- **WHEN** a home without a worker-space setting launches tasks for two projects
- **THEN** both use the existing combined space identity and the show command reports combined

#### Scenario: Owner changes the mode

- **WHEN** the owning coordinator sets per-project and next admits a new independent task
- **THEN** that task uses per-project placement without a session restart and no existing terminal is moved

#### Scenario: Setting access is invalid or unauthorized

- **WHEN** a non-owner tries to change the mode or an invalid mode is supplied
- **THEN** Crew refuses and leaves settings, registry entries, terminals and spaces unchanged

#### Scenario: Registration and settings change concurrently

- **WHEN** a setting change races project registration or task admission
- **THEN** registry data is preserved and each admitted task uses one complete setting snapshot ordered before or after the setting change

#### Scenario: Mode changes while a spawn is in progress

- **WHEN** a mode change races a spawn's initial task reservation
- **THEN** reservation before the change retains its saved placement even if Core starts later, while reservation after the change uses the new mode, without moving or relabeling another worker

### Requirement: New workers group by the selected mode

Crew SHALL request one shared automatic space per home in combined mode and one per registered project in per-project mode. A project space SHALL be requested lazily at first spawn and reused by later independent tasks for that project. Per-project placement metadata SHALL request the exact registered name for display, preserving dots. Machine-local identities SHALL NOT link workers to another machine's coordinator.

#### Scenario: Two projects use per-project mode

- **WHEN** tasks for herdr-app and crew are spawned in per-project mode
- **THEN** they advertise distinct automatic space identities and the requested display names herdr-app and crew

#### Scenario: Same project already has a space

- **WHEN** another independent task for that project is spawned in per-project mode
- **THEN** it requests the same project space identity rather than another space

#### Scenario: A dotted project has a pooled copy

- **WHEN** a task for `.xrbuild` or `agentnumberone.dev` starts in a delivery pool slot
- **THEN** its requested space name is the exact registered name rather than the pool directory basename

#### Scenario: No workers have been launched

- **WHEN** a project is registered or the mode is changed without spawning a task
- **THEN** Crew does not create a space or launch a keeper terminal

#### Scenario: A remote machine has matching local IDs

- **WHEN** another machine has similarly named spaces or terminal addresses
- **THEN** those identities remain machine-qualified and do not authorize cross-machine attachment or cleanup

#### Scenario: Personal space has the same displayed name

- **WHEN** a personal space shares a project's displayed name but not its exact home-scoped automatic identity
- **THEN** Crew neither reuses nor renames that personal space and does not delete it when finishing the project's workers

### Requirement: Task placement survives mode changes and replacement

Crew SHALL retain a task's selected space independently of subsequent home settings. Reviewers SHALL inherit the reviewed task's placement; relaunch and automatic hand-over SHALL inherit the replaced task's placement. Mode changes SHALL NOT move, relabel or interrupt running workers. New independent tasks SHALL follow the current mode, even when older tasks for their project occupy another mode's space.

#### Scenario: Combined changes to per-project during work

- **WHEN** combined tasks remain running while the owner selects per-project
- **THEN** a new independent task for the same project requests its project space rather than joining its older shared workers, while existing tasks, their later reviewers and replacements retain combined placement and remain finishable

#### Scenario: Per-project changes to combined during work

- **WHEN** project-bound tasks remain running while the owner selects combined
- **THEN** new independent tasks for projects both with and without an existing project space use the combined space, while existing tasks, their later reviewers and replacements retain their project placement and remain finishable

#### Scenario: Mode switches back

- **WHEN** the owner selects a mode previously used by still-occupied spaces
- **THEN** new independent tasks reuse that mode's matching space identities without moving the other tasks

#### Scenario: Provider stop starts a replacement

- **WHEN** quota/login recovery or manual relaunch starts a replacement after the mode changed
- **THEN** the replacement advertises the task's saved placement and preserves its copy and terminal-ownership history

### Requirement: Self-repair placement identifies Crew safely

Crew self-repairs SHALL use combined placement in combined mode. In per-project mode they SHALL reuse a registration named crew only when it identifies Crew's own repository; otherwise they SHALL request a separate internal repair space named crew. An unrelated registration named crew SHALL NOT receive the fixer. Repair task identity, dispatch and replacement inheritance SHALL remain unchanged.

#### Scenario: Crew source is registered accurately

- **WHEN** a new per-project self-repair starts and the crew registration identifies the tool's repository
- **THEN** it requests that project's space while retaining its internal repair task identity

#### Scenario: Crew registration is missing or unrelated

- **WHEN** a new per-project self-repair starts without a matching crew registration
- **THEN** it requests the internal repair space named crew rather than joining an unrelated project's space

#### Scenario: Shared repair placement protects registration identity

- **WHEN** an unfinished self-repair or one with a copy waiting shares a registered crew project's placement
- **THEN** removing or repointing that registration is refused until the reference is released, preventing an unrelated repository from joining the occupied repair space

### Requirement: Space cleanup never expands terminal ownership

Crew SHALL remove only terminals it recorded starting, never close an entire space, and leave automatic empty-space removal to Herdr. Finishing one task SHALL preserve spaces still occupied by other workers or foreign tabs. Even force SHALL NOT close a foreign terminal. Reports alone SHALL NOT remove a worker's space; unavailable or unconfirmed cleanup SHALL retain existing safety protections.

#### Scenario: Last task finishes in an empty automatic space

- **WHEN** finish removes the project's final owned worker terminal and no other tab remains
- **THEN** the automatic space is eligible for Herdr's zero-tab removal while other occupied project spaces remain unaffected

#### Scenario: Another project task remains

- **WHEN** one of several tasks in a project space finishes
- **THEN** Crew removes only that task's recorded terminals and the remaining workers keep their space

#### Scenario: Foreign terminal occupies the worker space

- **WHEN** the last Crew task finishes but a terminal Crew did not create remains in that space, including at another cwd
- **THEN** Crew leaves that terminal untouched even with force and the nonempty space remains

#### Scenario: Worker was moved into an ordinary space

- **WHEN** finish removes an owned worker terminal that the person moved into an ordinary space
- **THEN** Crew does not issue a close/delete operation on that space or any unrelated tab

#### Scenario: Worker reports or removal is uncertain

- **WHEN** a worker reports without finish or Core cannot confirm its terminal removal
- **THEN** Crew does not use the report or uncertainty to delete a space or bypass terminal/copy safeguards

### Requirement: Legacy tasks and orchestration commands remain compatible

Tasks without placement metadata SHALL retain their old combined placement for inherited launches and remain reportable and finishable without bulk migration. Status, wait, tell, review, relaunch and finish SHALL retain their existing contracts in mixed layouts. End SHALL release ownership without moving or removing running work. Read-only status SHALL NOT reconcile spaces or change its legacy or minimal fleet output contracts.

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

- **WHEN** a non-owner requests legacy or minimal fleet status for a mixed layout
- **THEN** the existing output contract is preserved and no space or terminal mutation occurs
