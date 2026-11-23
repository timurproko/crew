# Spec Delta

## MODIFIED Requirements

### Requirement: Status is read-only

Crew SHALL expose task state, elapsed time, delivery stage and recorded recovery information without sending messages, handing over workers or returning copies during status inspection. Only the owning coordinator's status inspection SHALL reconcile advisory review-label state and retry pending signaling using existing liveness observations; other sessions SHALL remain read-only. Label warnings SHALL NOT corrupt JSON output.

#### Scenario: Pending recovery is inspected

- **WHEN** a coordinator reads `crew status --json` for an idle unfinished task
- **THEN** crew returns the recorded state without nudging or replacing the worker

#### Scenario: Owner observes a dead reviewer

- **WHEN** the owning coordinator inspects status and existing liveness evidence confirms a reviewer ended
- **THEN** crew reconciles that review's advisory label ownership without sending a worker message, launching a replacement or returning a copy

#### Scenario: Owner revisits failed signaling

- **WHEN** the owning coordinator inspects status after a review-label add or remove failed
- **THEN** crew retries signaling against current local reviewer ownership and surfaces any warning without making JSON unparsable

#### Scenario: Another session inspects status

- **WHEN** a session that does not own the home inspects status
- **THEN** crew does not mutate review-label state or send GitHub label writes
