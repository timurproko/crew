# Spec Delta

## MODIFIED Requirements

### Requirement: Status is read-only

Crew SHALL expose task state, elapsed time, delivery stage and recorded recovery information without sending messages, handing over workers or returning copies during status inspection. Status SHALL only display persisted pending review-label state: it SHALL NOT retry labels, write task metadata or send GitHub requests, including for the owning coordinator.

#### Scenario: Pending recovery is inspected

- **WHEN** a coordinator reads `crew status --json` for an idle unfinished task
- **THEN** crew returns the recorded state without nudging or replacing the worker

#### Scenario: Pending label cleanup is inspected

- **WHEN** any session inspects status after review-label signaling failed
- **THEN** crew displays persisted pending signaling without retrying GitHub requests or writing metadata, and JSON remains parseable
