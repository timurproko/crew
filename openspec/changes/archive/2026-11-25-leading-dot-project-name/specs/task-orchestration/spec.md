# Task orchestration delta

## MODIFIED Requirements

### Requirement: Dotted project names preserve their identity

Crew SHALL accept project names of 1 to 40 lowercase ASCII letters, digits, dashes and dots, starting with a letter, a digit or one dot followed by one, excluding consecutive dots and a trailing dot. Project names SHALL remain distinct from task IDs. Registry operations, project selection, dispatch, backlog forwarding and status SHALL preserve the exact project name; working-copy allocation and task-based branch names SHALL remain valid for dotted projects.

#### Scenario: A dotted project completes the normal workflow

- **WHEN** a project named `agentnumberone.dev` is registered and selected by an owner for scout or ship work
- **THEN** registry listing, dispatch and status retain that exact name, backlog commands forward it unchanged, and plain or delivery-managed copies and ship branches are created without project-name normalization or Git errors

#### Scenario: A leading-dot project keeps its name

- **WHEN** a project named `.xrbuild` is registered next to a project named `xrbuild` and an owner spawns ship work with `--project .xrbuild`
- **THEN** registry listing, the task record and removal use the exact name `.xrbuild`, the two projects stay distinct, and the task's branch and working-copy names are built from the task ID without the project name

#### Scenario: A dotted repository uses a pool slot

- **WHEN** the owner spawns work in a dotted project folder and delivery allocates a pooled working copy
- **THEN** crew invokes delivery in the correct repository and records the returned pool path without rewriting the project name or guessing a pool folder

#### Scenario: An invalid project name is supplied

- **WHEN** an explicit project name is empty, too long (a leading dot counts toward the 40 characters), starts incorrectly (including a dot followed by anything other than a lowercase letter or digit), contains unsupported characters, has consecutive dots or ends in a dot
- **THEN** crew refuses with the supplied name and a specific explanation of the violated naming rule rather than bare usage text

#### Scenario: Dotted project selection does not relax task IDs

- **WHEN** a caller supplies a dotted project name with a valid task ID
- **THEN** crew accepts project selection without changing the existing task-ID constraints or task-based branch naming

## ADDED Requirements

### Requirement: Project names stay out of git refs and working-copy paths

Crew SHALL NOT use a project name as any part of a git ref or a working-copy path. Branch and working-copy names SHALL be built from the task ID or the repository folder, so a leading-dot project name never reaches a git ref.

#### Scenario: Ship work in a leading-dot project

- **WHEN** an owner spawns ship work in a project named `.xrbuild`
- **THEN** the task's branch and working-copy folder are named from the task ID and contain no part of the project name
