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
