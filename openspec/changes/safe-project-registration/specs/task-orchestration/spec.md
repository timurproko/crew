# Spec Delta

## MODIFIED Requirements

### Requirement: One coordinator owns a home

Crew SHALL permit only one live coordinator to control work in a home, including spawning, stopping, finishing and mutating its backlog. Safe project registration SHALL NOT require ownership. An unavailable Core answer SHALL NOT authorize takeover of an existing owner. Ownership refusals SHALL identify the crew home and controlling terminal rather than imply a project folder is busy.

#### Scenario: Another coordinator is live

- **WHEN** another session starts a home whose owner terminal is live
- **THEN** crew refuses ownership and permits read-only inspection and safe project registration

#### Scenario: Owner cannot be checked

- **WHEN** Core cannot establish whether the recorded owner is alive
- **THEN** crew retains the recorded owner rather than treating uncertainty as death

#### Scenario: Settings registration does not grant orchestration rights

- **WHEN** a process without the owner's terminal registers a project and tries to spawn, stop or finish work
- **THEN** registration is allowed but work control is refused with a message identifying the crew home and its owner

## ADDED Requirements

### Requirement: Project registration is atomic across sessions

Crew SHALL allow any local session to add or remove registrations without taking home ownership. Concurrent registration changes SHALL preserve unrelated entries and registry metadata and expose only complete registry snapshots. The owning coordinator SHALL see successful changes on its next command without restarting its agent.

#### Scenario: Settings registers while a coordinator owns the home

- **WHEN** a settings process with no terminal adds a valid project while another terminal owns the home
- **THEN** the entry is persisted without changing the owner and the existing coordinator can select it on its next spawn

#### Scenario: Concurrent edits keep both results

- **WHEN** the owner and another process register different projects concurrently
- **THEN** both entries and existing registry metadata remain after both commands succeed

#### Scenario: Concurrent removal and addition preserve unrelated entries

- **WHEN** one process removes an unused project while another adds a different project
- **THEN** both successful changes remain and no stale registry snapshot restores the removed entry

#### Scenario: A registration transaction cannot proceed safely

- **WHEN** the registry is invalid or its transaction lock cannot be acquired within a bounded wait
- **THEN** crew refuses with a specific diagnostic identifying the crew home, leaves the registry unchanged and does not steal ownership

### Requirement: Registration changes preserve task cleanup references

Crew SHALL refuse removal or path replacement while a project has unfinished tasks or closed tasks with working copies still to return. Changing a registered path SHALL require explicit replacement consent. Task admission and registration changes SHALL have an ordering that prevents work starting against a removed or replaced registration.

#### Scenario: Another session removes a project used by work

- **WHEN** a non-owner removes a project with an unfinished task or a closed task awaiting copy return
- **THEN** crew identifies the blocking tasks and keeps the registration unchanged

#### Scenario: Another session replaces a path

- **WHEN** a non-owner registers a different repository under an existing project name
- **THEN** crew requires explicit replacement consent and refuses even with consent while unfinished tasks or waiting copies reference that project

#### Scenario: Removal races a spawn

- **WHEN** removal or path replacement races the owner's admission of a task for that project
- **THEN** either task admission wins and blocks the registration change, or the registration change wins and admission uses the current registration or refuses before creating a copy or terminal

#### Scenario: Task references cannot be checked

- **WHEN** removal or path replacement cannot safely determine which tasks still need the registration
- **THEN** crew preserves the registration and explains why the safety check could not complete

### Requirement: Dotted project names preserve their identity

Crew SHALL accept project names of 1 to 40 lowercase ASCII letters, digits, dashes and dots, starting with a letter or digit, excluding consecutive dots and a trailing dot. Project names SHALL remain distinct from task IDs. Registry operations, project selection, dispatch, backlog forwarding and status SHALL preserve the exact project name; working-copy allocation and task-based branch names SHALL remain valid for dotted projects.

#### Scenario: A dotted project completes the normal workflow

- **WHEN** a project named `agentnumberone.dev` is registered and selected by an owner for scout or ship work
- **THEN** registry listing, dispatch and status retain that exact name, backlog commands forward it unchanged, and plain or delivery-managed copies and ship branches are created without project-name normalization or Git errors

#### Scenario: A dotted repository uses a pool slot

- **WHEN** the owner spawns work in a dotted project folder and delivery allocates a pooled working copy
- **THEN** crew invokes delivery in the correct repository and records the returned pool path without rewriting the project name or guessing a pool folder

#### Scenario: An invalid project name is supplied

- **WHEN** an explicit project name is empty, too long, starts incorrectly, contains unsupported characters, has consecutive dots or ends in a dot
- **THEN** crew refuses with the supplied name and a specific explanation of the violated naming rule rather than bare usage text

#### Scenario: Dotted project selection does not relax task IDs

- **WHEN** a caller supplies a dotted project name with a valid task ID
- **THEN** crew accepts project selection without changing the existing task-ID constraints or task-based branch naming
