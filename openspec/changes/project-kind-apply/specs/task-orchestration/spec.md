## MODIFIED Requirements

### Requirement: One coordinator owns a home

Crew SHALL permit only one live coordinator to control work in a home, including spawning, stopping, finishing and mutating its backlog. Safe project registration, the explicit local worker-space setter and the guarded project kind-only setter SHALL NOT require ownership. An unavailable Core answer SHALL NOT authorize takeover of an existing owner. Ownership refusals SHALL identify the crew home and controlling terminal rather than imply a project folder is busy.

#### Scenario: Another coordinator is live

- **WHEN** another session starts a home whose owner terminal is live
- **THEN** crew refuses ownership and permits read-only inspection, safe project registration, the explicit local worker-space-only setter and the guarded project kind-only setter

#### Scenario: Owner cannot be checked

- **WHEN** Core cannot establish whether the recorded owner is alive
- **THEN** crew retains the recorded owner rather than treating uncertainty as death

#### Scenario: Settings registration does not grant orchestration rights

- **WHEN** a process without the owner's terminal registers a project and tries to spawn, stop or finish work
- **THEN** registration is allowed but work control is refused with a message identifying the crew home and its owner

#### Scenario: Local worker-space permission does not grant orchestration rights

- **WHEN** a non-terminal process successfully sets worker-space through the explicit local interface and then tries to spawn, stop, finish or release the home
- **THEN** those operations retain their existing ownership refusals and the owner remains unchanged

#### Scenario: Kind-only permission does not grant orchestration rights

- **WHEN** a non-owner changes an existing project's kind and then tries to control work or release the home
- **THEN** those operations retain their ownership refusals because they affect live work, and project add/remove retain their separate existing safeguards

### Requirement: Workflow detection uses repository signals

Crew SHALL recognize shared delivery from repository instructions, its named change-delivery skill or shared delivery caller workflow, not a project name. Listing and ship admission SHALL inspect the same allocation-source snapshot and available tools. Explicit kind SHALL win, followed by legacy gate/workflow precedence. Without a choice, detection SHALL be refreshed for each admission. Detection SHALL NOT rewrite registrations or reinterpret admitted tasks from their allocated copies.

#### Scenario: Source repository is added without an override

- **WHEN** a folder containing the change-delivery skill is registered under any valid name without a workflow override and delivery is available
- **THEN** future ship workers receive the plan-first delivery brief even without a shared AGENTS template header

#### Scenario: Existing plain selection gains a delivery signal

- **WHEN** a previously registered project now carries a delivery signal and a ship task is spawned
- **THEN** automatic selection detects workflow, explicit Plain remains Plain with a concise advisory, and stored registration fields are unchanged

#### Scenario: Registered folder and allocated copy disagree

- **WHEN** the registered folder resolves to Plain but a newly allocated published-default copy contains delivery instructions, or the reverse
- **THEN** JSON listing and the admitted task both use the published-default snapshot when delivery allocates from origin, with registered-checkout staleness exposed separately rather than substituting the local kind

### Requirement: Project kinds are discoverable and authoritative

Crew SHALL expose home-free project-kinds version-one capability JSON from project-scoped and root probes, advertising JSON listing, kind setting, explicit home, expected path and workflow/plain/gate. Additive capability flags SHALL advertise non-owner kind setting and kind provenance. JSON listing SHALL return canonical home and exact name/path with effective kind, explicit/legacy/detected source and availability. Explicit selections SHALL govern future ships; unavailable selections SHALL refuse, not fall back.

#### Scenario: Desktop discovers and lists

- **WHEN** a desktop probes capabilities and requests project list JSON from an initialized home
- **THEN** it gets one versioned capability object and an authoritative complete projects array, including an empty array for an empty registry, without Core queries or task mutations

#### Scenario: Selected kind cannot be honored

- **WHEN** an explicit workflow or gate selection lacks its required tool or gate remote
- **THEN** selection or spawn refuses clearly rather than silently delivering as Plain or another mode, and listing retains that explicit kind with unavailable status

#### Scenario: Registered checkout is behind published default

- **WHEN** the registered HEAD is a strict ancestor of the published default and its delivery signals differ
- **THEN** listing reports the published snapshot's effective kind and checkoutStale true; spawn captures that same kind under unchanged inputs

#### Scenario: Published automatic selection cannot be established

- **WHEN** delivery uses origin but its default head or required objects cannot be read within bounded operations
- **THEN** automatic listing and admission refuse kind-unavailable rather than advertising or launching a guessed Plain task

#### Scenario: Choice and detection are distinguishable

- **WHEN** projects have a stored kind, only a legacy workflow override, or neither
- **THEN** listing identifies their selection source as explicit, legacy or detected respectively, while its effective kind predicts the next admission under unchanged registry, repository and tool inputs

### Requirement: Project kind updates preserve registration identity

Crew SHALL provide a local kind-only setter requiring an explicit initialized absolute home, an existing project and matching canonical expected path, without terminal ownership or Core queries. Under registry serialization it SHALL change only stored kind, preserving folder, legacy workflow, gate skips and unknown fields. Unknown projects/kinds and unsafe or changed homes/paths SHALL refuse without re-registration, takeover or task changes. Repeated stored selection SHALL be a no-op.

#### Scenario: Safe kind-only change

- **WHEN** any local caller selects an available kind for an existing matching name/path, whether the home is unowned or owned by another coordinator
- **THEN** Crew returns canonical home, exact project identity, requested kind and a truthful changed boolean, with only that registration's kind field altered

#### Scenario: Refusal is structured and harmless

- **WHEN** the project was removed or repointed, arguments or kind are invalid, or registry locking fails
- **THEN** Crew returns nonzero versioned JSON with a stable refusal code and does not initialize, re-register, transfer ownership or mutate tasks

#### Scenario: Owner metadata is irrelevant to a kind-only edit

- **WHEN** the initialized home has stale, malformed or unverifiable owner metadata but its home, project and path guards pass
- **THEN** the kind-only setter does not read or repair owner metadata, consult Core, stop terminals or refuse solely because of that metadata

## ADDED Requirements

### Requirement: Admitted tasks retain their delivery selection

Crew SHALL capture effective delivery kind at ship reservation ordered with kind updates. Later settings or repository detection SHALL NOT change existing task briefs, delivery kind or behavior during report, status, review, land, relaunch or hand-over. The next admission after a successful setter SHALL use the fresh registration without coordinator restart. Legacy tasks SHALL retain their saved workflow/gate fields without bulk migration.

#### Scenario: Setter commits before reservation

- **WHEN** a non-owner's kind change commits before the owner's next ship reservation
- **THEN** that task captures the new kind without restarting or messaging the coordinator

#### Scenario: Setter commits after reservation

- **WHEN** a spawn reserves its task then pauses during copy allocation while the project kind changes
- **THEN** that spawn launches with its reserved delivery selection while subsequent admissions use the new selection

#### Scenario: Existing running or reported work continues

- **WHEN** a project changes among Plain, Workflow and Gate while earlier tasks are running or reported
- **THEN** their saved delivery, briefs and ownership remain unchanged and later review, land, relaunch and hand-over do not substitute the current project kind
