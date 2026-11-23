# Worker dispatch

## Purpose

Record crew's existing agent selection and recovery contracts without prescribing a particular installed agent or optional tool.

## Requirements

### Requirement: Profiles select agent model and account

Crew SHALL select workers from configured project, role and default profile chains in that precedence, honoring explicit command-line choices. Quota floors SHALL move below-floor candidates behind normal and unknown candidates while preserving order within each group; unknown quota SHALL NOT count as exhausted quota.

#### Scenario: Project has its own role chain

- **WHEN** a worker is requested for a project with a configured chain for that role
- **THEN** crew uses that chain instead of the general role or default chain

#### Scenario: Quota cannot be read

- **WHEN** a candidate's quota is unknown
- **THEN** crew retains the candidate as uncertain rather than discarding it as exhausted

### Requirement: Recovery belongs to the coordinator

Crew SHALL allow the owning coordinator to recover stopped workers using the remaining saved candidates in the same copy. Permission or trust questions SHALL require a person rather than an automatic answer. Recovery messages and attempts SHALL be recorded without becoming coordinator follow-ups.

#### Scenario: Worker stops on a quota limit

- **WHEN** the owner waits for an unfinished worker stopped by a quota limit and a usable candidate remains
- **THEN** crew hands the existing work to that candidate in the same copy

#### Scenario: Worker asks permission

- **WHEN** a worker is blocked on a question or permission
- **THEN** crew reports that a person is needed without answering the prompt

### Requirement: Status is read-only

Crew SHALL expose task state, elapsed time, delivery stage and recorded recovery information without sending messages, handing over workers or returning copies during status inspection. Status SHALL only display persisted pending review-label state: it SHALL NOT retry labels, write task metadata or send GitHub requests, including for the owning coordinator.

#### Scenario: Pending recovery is inspected

- **WHEN** a coordinator reads `crew status --json` for an idle unfinished task
- **THEN** crew returns the recorded state without nudging or replacing the worker

#### Scenario: Pending label cleanup is inspected

- **WHEN** any session inspects status after review-label signaling failed
- **THEN** crew displays persisted pending signaling without retrying GitHub requests or writing metadata, and JSON remains parseable
