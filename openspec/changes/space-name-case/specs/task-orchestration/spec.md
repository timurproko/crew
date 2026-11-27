# Spec Delta

## MODIFIED Requirements

### Requirement: New workers group by the selected mode

Crew SHALL request the home-wide combined identity in combined mode. In per-project mode it SHALL first reuse a same-home, machine-local Crew space with at least one live unfinished worker and no live unfinished worker of another placement project; otherwise it SHALL request the canonical project identity. Empty spaces and finished tasks SHALL NOT establish reuse. Exact registered names and dots SHALL be preserved in project identity; identities SHALL NOT cross machines.

#### Scenario: Two projects use per-project mode

- **WHEN** tasks for herdr-app and crew are spawned in per-project mode
- **THEN** they advertise distinct automatic space identities and new canonical project spaces request their repository folder display names rather than deriving titles from project IDs

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
- **THEN** its project remains exact, new canonical project placement preserves the repository folder's dots and capitalization in its display name, and joining combined does not add a project-name label

#### Scenario: No workers have been launched

- **WHEN** a project is registered or the mode is changed without spawning a task
- **THEN** Crew does not create a space or launch a keeper terminal

#### Scenario: A remote machine has matching local IDs

- **WHEN** another machine has similarly named spaces or terminal addresses
- **THEN** those identities remain machine-qualified and do not authorize cross-machine attachment or cleanup

#### Scenario: Personal space has the same displayed name

- **WHEN** a personal space shares a project's displayed name but not its exact home-scoped automatic identity
- **THEN** Crew neither reuses nor renames that personal space and does not delete it when finishing the project's workers

## ADDED Requirements

### Requirement: Project-space display names preserve directory spelling

Crew SHALL derive newly requested per-project space names from the repository folder basename, preserving original capitalization and leading dots, matching Herdr's directory-derived Agents headings for repository-named working copies. Display names SHALL NOT change command project IDs, placement project keys or automatic space IDs. Pool hash parents and slot numbers SHALL NOT become project display names. Combined placement SHALL continue to omit a requested name.

#### Scenario: Mixed-case repository folder

- **WHEN** project `myworkflows` is registered for `D:/Git/MyWorkflows` and has no eligible occupied space
- **THEN** its new per-project space requests `MyWorkflows` while the project key stays `myworkflows` and its automatic identity retains `-project-myworkflows`

#### Scenario: Dot-prefixed repository in a hashed pool

- **WHEN** project `.xrbuild` uses a working copy such as `C:/Users/me/.treehouse/.xrbuild-a1b2c3/2/.xrbuild`
- **THEN** its new per-project display name is `.xrbuild`, not the hashed parent or slot number, and its project identity remains distinct from `xrbuild`

#### Scenario: Registry alias differs from repository basename

- **WHEN** a registered project ID is an alias for a repository whose folder has a different name
- **THEN** a new canonical space uses the repository folder spelling for display and the exact alias for commands and placement identity

### Requirement: Saved project-space names remain compatible

Crew SHALL accept legacy project-ID names and saved directory-derived names without recalculating inherited placement from current registry spelling. An eligible occupied canonical space SHALL retain its validated saved name when joined, reviewed or replaced. Crew SHALL NOT rename occupied spaces or use display-name resemblance as occupancy or ownership proof. Invalid identities, contradictory labels and ambiguous occupancy SHALL retain conservative refusal behavior.

#### Scenario: Old lower-case space already has workers

- **WHEN** an occupied canonical space for `myworkflows` has saved name `myworkflows` and the repository folder is `MyWorkflows`
- **THEN** a new worker joins the same automatic identity with the existing saved name without duplication, relabeling existing workers or renaming the space

#### Scenario: New directory-cased placement is inherited

- **WHEN** a task saved with display name `MyWorkflows` gets a reviewer, manual relaunch or automatic hand-over after a mode switch
- **THEN** its replacement or reviewer retains that saved placement and name without altering command project identity

#### Scenario: Placement evidence is contradictory

- **WHEN** a recorded worker's name label differs from its saved placement, or its space ID or project key is invalid
- **THEN** the evidence does not authorize joining, moving or stopping any worker and admission refuses before allocating a copy or launching a terminal

### Requirement: Workflow detection uses repository signals

Crew SHALL recognize the shared delivery source from its named change-delivery skill or shared delivery caller workflow, not a project name. CLI and plugin-equivalent registration SHALL use the same detection. Spawn SHALL recheck repository signals for existing registrations, honor explicit Plain selection with a one-line advisory when delivery signals are present, and never rewrite registration merely to detect a workflow. Existing task delivery records SHALL remain unchanged.

#### Scenario: Source repository is added without an override

- **WHEN** a folder containing the change-delivery skill is registered under any valid name without a workflow override and delivery is available
- **THEN** future ship workers receive the plan-first delivery brief even without a shared AGENTS template header

#### Scenario: Existing plain selection gains a delivery signal

- **WHEN** a previously registered project now carries a delivery signal and a ship task is spawned
- **THEN** automatic selection detects workflow, explicit Plain remains Plain with a concise advisory, and stored registration fields are unchanged

### Requirement: Project kinds are discoverable and authoritative

Crew SHALL expose home-free project-kinds version-one capability JSON from project-scoped and root probes, advertising JSON listing, kind setting, explicit home, expected path and workflow/plain/gate. JSON listing SHALL return canonical home identity and every exact registered name/path with its stored explicit kind or effective legacy selection. Explicit selections SHALL govern future ship tasks; an unavailable selected kind SHALL refuse instead of falling back.

#### Scenario: Desktop discovers and lists

- **WHEN** a desktop probes capabilities and requests project list JSON from an initialized home
- **THEN** it gets one versioned capability object and an authoritative complete projects array, including an empty array for an empty registry, without Core queries or task mutations

#### Scenario: Selected kind cannot be honored

- **WHEN** an explicit workflow or gate selection lacks its required tool or gate remote
- **THEN** selection or spawn refuses clearly rather than silently delivering as Plain or another mode

### Requirement: Project kind updates preserve registration identity

Crew SHALL provide a structured kind-only setter requiring an explicit initialized absolute home, an existing project and matching canonical expected path. Under registry serialization it SHALL change only the stored kind, preserving the folder, legacy workflow, gate skips and unknown fields. It SHALL refuse other owners, unknown projects/kinds and unsafe or changed homes/paths without re-registration, takeover or task changes. Successful repeated stored selection SHALL be a no-op.

#### Scenario: Safe kind-only change

- **WHEN** the owner or an unowned-home desktop selects an available kind for an existing matching name/path
- **THEN** Crew returns canonical home, exact project identity, requested kind and a truthful changed boolean, with only that registration's kind field altered

#### Scenario: Refusal is structured and harmless

- **WHEN** the project was removed or repointed, a different owner controls the home, arguments or kind are invalid, or registry locking fails
- **THEN** Crew returns nonzero versioned JSON with a stable refusal code and does not initialize, re-register, transfer ownership or mutate tasks
