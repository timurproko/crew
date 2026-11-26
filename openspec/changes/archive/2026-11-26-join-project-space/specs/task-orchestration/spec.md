# Spec Delta

## MODIFIED Requirements

### Requirement: Worker-space mode is an immediate home setting

Crew SHALL provide `crew config worker-space` to show and `crew config worker-space combined|per-project` to change the persistent mode. Missing configuration SHALL mean combined. Reads SHALL be open; the positional setter SHALL require the owner, with only the explicit local setter exempt. Independent admission SHALL use the latest ordered setting without restart. Invalid values SHALL be refused without changing configuration or live work.

#### Scenario: Existing home has no setting

- **WHEN** a home without a worker-space setting launches tasks for two projects
- **THEN** both use the existing combined space identity and the show command reports combined

#### Scenario: Owner changes the mode

- **WHEN** the owning coordinator sets per-project and next admits a new independent task
- **THEN** that task uses occupancy-aware per-project selection without a session restart, possibly joining an exclusive combined space, and no existing terminal is moved

#### Scenario: Setting access is invalid or unauthorized

- **WHEN** a non-owner uses the positional setter or an invalid mode is supplied through either setter
- **THEN** Crew refuses and leaves settings, registry entries, terminals and spaces unchanged

#### Scenario: Registration and settings change concurrently

- **WHEN** a setting change races project registration or task admission
- **THEN** registry data is preserved and each admitted task uses one complete setting snapshot ordered before or after the setting change

#### Scenario: Mode changes while a spawn is in progress

- **WHEN** a mode change races a spawn's initial task reservation
- **THEN** reservation before the change retains its saved placement even if Core starts later, while reservation after the change uses the new selection policy, without moving or relabeling another worker

### Requirement: New workers group by the selected mode

Crew SHALL request the home-wide combined identity in combined mode. In per-project mode it SHALL first reuse a same-home, machine-local Crew space with at least one live unfinished worker and no live unfinished worker of another placement project; otherwise it SHALL request the canonical project identity. Empty spaces and finished tasks SHALL NOT establish reuse. Exact registered names and dots SHALL be preserved; identities SHALL NOT cross machines.

#### Scenario: Two projects use per-project mode

- **WHEN** tasks for herdr-app and crew are spawned in per-project mode
- **THEN** they advertise distinct automatic space identities and canonical project spaces request the display names herdr-app and crew

#### Scenario: Same project already has a space

- **WHEN** another independent task for that project is spawned in per-project mode
- **THEN** it joins an eligible occupied space instead of requesting a different identity, preferring the canonical project space if several eligible spaces already exist

#### Scenario: Legacy combined contains only this project

- **WHEN** the combined identity holds only live unfinished workers of project P and no occupied canonical P space is eligible
- **THEN** a new independent per-project P task joins that combined identity and saves version-one combined placement with project P and no requested name

#### Scenario: Combined contains more than one project

- **WHEN** live unfinished workers of P and Q occupy combined
- **THEN** it is not eligible for either project's independent per-project admissions, which use an eligible project space or their canonical identity

#### Scenario: Finished history or empty space

- **WHEN** a former space has no live unfinished workers, even if finished task records or finished-task terminals still reference it
- **THEN** it does not establish reuse and a new independent task uses another eligible occupied space or requests its canonical project identity

#### Scenario: A dotted project has a pooled copy

- **WHEN** a task for `.xrbuild` or `agentnumberone.dev` starts in a delivery pool slot
- **THEN** its project remains exact, canonical project placement requests that exact name, and joining combined does not add a project-name label

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

Crew SHALL retain a task's selected space independently of subsequent home settings. Reviewers SHALL inherit the reviewed task's placement; relaunch and automatic hand-over SHALL inherit the replaced task's placement. Mode changes SHALL NOT move, relabel or interrupt running workers. New independent tasks SHALL follow the current selection policy, without rewriting older tasks' saved placement.

#### Scenario: Combined changes to per-project during work

- **WHEN** combined tasks remain running while the owner selects per-project
- **THEN** a new independent task joins combined only if its qualifying live workers are exclusively that project; mixed combined is skipped, and existing tasks, their reviewers and replacements retain placement and remain finishable

#### Scenario: Per-project changes to combined during work

- **WHEN** project-bound tasks remain running while the owner selects combined
- **THEN** new independent tasks for projects both with and without an existing project space use the combined space, while existing tasks, their later reviewers and replacements retain their project placement and remain finishable

#### Scenario: Mode switches back

- **WHEN** the owner selects a mode previously used by still-occupied spaces
- **THEN** combined selects its fixed identity and per-project re-evaluates current exclusive occupancy, without moving the other tasks

#### Scenario: Provider stop starts a replacement

- **WHEN** quota/login recovery or manual relaunch starts a replacement after the mode changed
- **THEN** the replacement advertises the task's saved placement and preserves its copy and terminal-ownership history

#### Scenario: A previously reused combined space becomes mixed

- **WHEN** switching back to combined or an older task's inherited launch brings another project into that combined identity
- **THEN** existing workers remain untouched and subsequent independent per-project selection treats the mixed space as ineligible

### Requirement: Self-repair placement identifies Crew safely

Crew self-repairs SHALL use combined placement in combined mode. In per-project mode they SHALL use the crew placement project only when that registration identifies Crew's own repository; otherwise they SHALL use crew:self. Independent repair admission SHALL reuse an eligible exclusive occupied space for that placement project before requesting its canonical identity. An unrelated crew registration SHALL NOT receive the fixer. Repair task identity and inheritance SHALL remain unchanged.

#### Scenario: Crew source is registered accurately

- **WHEN** a new per-project self-repair starts and the crew registration identifies the tool's repository
- **THEN** it selects an eligible occupied space for that placement project or its canonical project identity while retaining its internal repair task identity

#### Scenario: Crew registration is missing or unrelated

- **WHEN** a new per-project self-repair starts without a matching crew registration
- **THEN** it selects an eligible occupied crew:self space or requests the internal repair space named crew rather than joining an unrelated project's space

#### Scenario: Shared repair placement protects registration identity

- **WHEN** an unfinished self-repair or one with a copy waiting shares a registered crew project's placement
- **THEN** removing or repointing that registration is refused until the reference is released, preventing an unrelated repository from joining the occupied repair space

### Requirement: Local changes retain admission ordering

Local worker-space changes SHALL share registry serialization with project edits and independent task reservation. Already admitted tasks SHALL retain saved placement even if launched after a change; later independent admissions SHALL use the current ordered selection policy. Reviews and replacements SHALL retain inherited placement. No setter SHALL move, relabel or interrupt existing work or mutate native spaces.

#### Scenario: Spawn pauses after reservation

- **WHEN** a combined spawn reserves its task and pauses before launch while a local setter changes to per-project
- **THEN** that spawn launches with combined metadata and labels, while a later independent admission uses occupancy-aware per-project selection

#### Scenario: Local change precedes reservation

- **WHEN** the local setter commits per-project before an independent task reserves its record
- **THEN** the new task selects placement by current exclusive occupancy without restarting its coordinator

#### Scenario: Project addition races local setting

- **WHEN** project registration and local setting run concurrently
- **THEN** both successful changes persist without losing unrelated metadata or writing stale snapshots

## ADDED Requirements

### Requirement: Occupancy proof is conservative and reservation ordered

Crew SHALL bind reuse evidence to authoritative unfinished task identity, recorded launched terminals, validated placement and live local Core labels. Ambiguous or unavailable evidence SHALL refuse admission before copy or terminal creation rather than invent exclusivity. Concurrent admissions SHALL serialize saved placement decisions; in-flight admissions SHALL NOT create a second identity for the same project or allow conflicting projects to claim combined as exclusive.

#### Scenario: Labels are not task authority

- **WHEN** a live terminal claims Crew placement but has no matching recorded task-owned launch, conflicts with task identity, or has invalid placement metadata
- **THEN** it cannot establish exclusive reuse and unresolved local Crew occupancy refuses admission without adopting or stopping the terminal

#### Scenario: Read-only probes are unavailable

- **WHEN** Core or required task records cannot establish local occupancy
- **THEN** independent per-project admission refuses with a retryable explanation before creating a task, copy or terminal, preserving settings and live work

#### Scenario: Same-project spawns race

- **WHEN** two independent P spawns race while an exclusive combined space qualifies or while neither has a worker yet
- **THEN** their reservations select the same identity, or one safely waits or refuses for retry; neither silently creates a second identity from a stale snapshot

#### Scenario: Different-project spawns race

- **WHEN** independent P and Q spawns race with a combined candidate or pending reservations
- **THEN** incompatible pending placements prevent that identity being claimed as exclusive by the other project, while inherited placement remains unchanged

#### Scenario: A reservation is still launching

- **WHEN** a relevant task is preparing and its terminal has not been published
- **THEN** its saved placement constrains concurrent selection without counting it as live occupancy; an unresolved launch can cause bounded retry or refusal, not adoption of an empty space
