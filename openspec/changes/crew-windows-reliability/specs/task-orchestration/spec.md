# Task orchestration delta

## ADDED Requirements

### Requirement: Project listing avoids serial network latency

Crew SHALL resolve independent projects concurrently with bounded fan-out, preserving registry order and the project-kinds v1 response and refusal contracts. Under normal remote latency, an eight-project listing SHALL complete in a few seconds rather than accumulating every project's network delay. Listing SHALL NOT weaken live published-default admission checks or introduce persistent stale kind authority.

#### Scenario: Several automatic projects need remote inspection

- **WHEN** an initialized home lists eight projects whose remote HEAD reads each take approximately 1.7 seconds
- **THEN** independent reads overlap rather than running serially, the response preserves registration order and all v1 fields, and real-machine before/after elapsed times are recorded

#### Scenario: A project cannot be resolved

- **WHEN** a concurrent automatic project inspection fails or exceeds its existing operation budget
- **THEN** listing returns one structured nonzero kind-unavailable response rather than partial success, a guessed Plain kind or unhandled asynchronous output

#### Scenario: Tools or published instructions change before spawn

- **WHEN** a listing succeeds and the project's published delivery signals or available tools change before ship admission
- **THEN** admission inspects current inputs and does not reuse a listing's prior selection as authority

### Requirement: Published default selection ignores stale local aliases

Crew SHALL derive the published default branch and commit from the live remote HEAD advertisement for automatic listing and ship admission. A stale local origin/HEAD SHALL NOT select an old branch. An unresolvable published default SHALL retain the existing refusal and Git-state preservation contracts.

#### Scenario: The old default is deleted or retained

- **WHEN** local origin/HEAD names a previous default with different delivery signals and the remote advertises a new default, whether or not the old branch still exists
- **THEN** listing and the next ship use the advertised default's delivery kind and listing leaves the checkout, tracking refs, index and FETCH_HEAD unchanged

#### Scenario: One successful advertisement provides both values

- **WHEN** the remote HEAD advertisement contains a symbolic branch and commit
- **THEN** resolving that snapshot makes one ls-remote request, not separate network requests for the branch name and its commit

### Requirement: Task descriptions are not silently shortened by launchers

Crew SHALL preserve all task-description lines, blank lines and Unicode received through a supported invocation. It SHALL offer UTF-8 task-file input for shell-safe multiline admission. A known unsupported forwarding path SHALL refuse with a clear lossless-input alternative before creating a task, copy or terminal, rather than accept a shortened description.

#### Scenario: PowerShell supplies a multiline task

- **WHEN** the owner invokes spawn from PowerShell with a multiline here-string through the supported Windows launcher
- **THEN** every line reaches the task record and brief, or the invocation refuses before admission with a clear instruction for lossless input

#### Scenario: File input preserves task text

- **WHEN** the owner supplies a valid UTF-8 task file containing blank lines, quotes, Unicode and shell metacharacters
- **THEN** the complete description reaches the task record and brief without shell interpretation

#### Scenario: Task input is ambiguous or unreadable

- **WHEN** task-file input is missing, unreadable, empty or combined with positional task text
- **THEN** Crew refuses before creating a task, copy or terminal and leaves existing positional single-line invocations compatible

### Requirement: Finish settling does not monopolize placement

Crew SHALL allow unrelated foreground tell and spawn commands to progress while a reported worker is merely settling before finish. Terminal transitions and copy disposal SHALL retain placement ordering, generation fencing and existing safety checks. Brief contention SHALL receive bounded retry; a longer or unverifiable transition SHALL refuse safely without stealing the lock or reporting false success.

#### Scenario: A reported worker is still finishing its last turn

- **WHEN** finish waits for that worker to become idle and an unrelated tell or spawn runs concurrently
- **THEN** the settling wait does not hold the home-wide placement gate and the unrelated command can proceed without waiting for the full settling interval

#### Scenario: The worker changes during the settling wait

- **WHEN** a tell, relaunch, report or cancellation changes the finishing task before finish reacquires placement authority
- **THEN** finish revalidates current state and terminal generation before any stop, close or copy-return action and never overwrites the newer work

#### Scenario: Cleanup and admission overlap

- **WHEN** a terminal transition or copy-return safety check runs while another admission waits
- **THEN** admission cannot observe a false empty space, start a cancelled generation or authorize reuse before safe closure, and unknown evidence retains the copy
