## MODIFIED Requirements

### Requirement: Fleet status has a minimal versioned shape

Crew SHALL offer `status --json --view fleet` with exactly home, owner, tasks, prDiscovery and view at the root. The view SHALL be `{name: "fleet", version: 1}` and root prDiscovery SHALL be `{version: 1}`. Non-null owner SHALL contain only terminal and live. Every task SHALL contain only id, state, project, terminal, pr and prDiscovery; pr SHALL remain the recorded value or null. Discovery results SHALL retain the four-field version-1 shape.

#### Scenario: Fleet output contains only consumer fields

- **WHEN** a caller requests fleet status with or without --discover-prs
- **THEN** the response has the exact specified fields and markers, without launch, standby, fallback, core, recovery, errors, elapsed, copy-return or owner.mine details

#### Scenario: Fleet without discovery uses saved facts

- **WHEN** fleet status is requested without --discover-prs
- **THEN** no GitHub or remote Git reads occur, recorded or saved discovered links produce known results, non-ships without links produce none, and unobserved ships produce unavailable with reason not-requested

## ADDED Requirements

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
