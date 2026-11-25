# Spec Delta

## ADDED Requirements

### Requirement: Urgent follow-ups interrupt before delivery

Crew SHALL offer `crew tell <id> --interrupt "<message>"` to the owning coordinator. For a recognized working agent, Crew SHALL request cancellation of the current turn and confirm a live, ready worker before sending the follow-up. An already idle or done worker SHALL receive the message without an interrupt. Ordinary tells SHALL retain their non-interrupting behavior.

#### Scenario: Coordinator corrects an A1 worker running a long tool

- **WHEN** the owner sends an urgent tell to an A1 worker running a long shell tool
- **THEN** Crew interrupts its current turn before sending the correction, without waiting for the tool's original timeout and without ending or replacing the worker session

#### Scenario: Ordinary tell remains queued steering

- **WHEN** the owner sends an ordinary tell to a working worker
- **THEN** Crew sends the existing follow-up without an interrupt operation

#### Scenario: Worker is ready already

- **WHEN** the owner sends an urgent tell to a recognized idle or done worker on a working or reported task
- **THEN** Crew sends the follow-up directly without pressing the stop key

### Requirement: Urgent delivery fails closed without destructive escalation

Crew SHALL refuse urgent delivery when ownership, task eligibility, agent identity or readiness cannot be established, or the worker is blocked. An unsuccessful or unconfirmed interrupt SHALL NOT fall back to queued delivery, repeated keys, terminal killing or relaunch. Diagnostics SHALL distinguish interruption failure from an interrupted worker whose message delivery failed.

#### Scenario: Interrupt does not establish readiness

- **WHEN** Core reports still working, unknown, an exited worker, malformed output, a transport error or a timeout
- **THEN** Crew refuses the urgent tell with a specific diagnostic and sends no follow-up or destructive fallback

#### Scenario: Worker becomes blocked after interruption

- **WHEN** the post-interrupt observation shows a permission prompt or question
- **THEN** Crew refuses delivery and leaves the decision to a person rather than sending forced input

#### Scenario: Target is not a recognized worker

- **WHEN** an urgent target lacks a matching agent identity and recognized status, or its task has changed workers
- **THEN** Crew refuses without sending input to an unidentified or replacement program

#### Scenario: Follow-up fails after cancellation

- **WHEN** interruption succeeds but message delivery fails
- **THEN** Crew reports that the turn was interrupted but the follow-up was not confirmed, without claiming success or automatically retrying a possibly delivered message

### Requirement: Urgent follow-ups preserve reporting and task authority

Successful urgent tells SHALL reopen the task before delivery, count one coordinator follow-up and retain the existing complete-report instruction and review invalidation behavior. Pre-delivery refusals SHALL NOT alter task or review state. A fast new report or concurrent lifecycle change SHALL NOT be overwritten by follow-up completion or failure handling.

#### Scenario: Worker reports immediately

- **WHEN** the worker rewrites its report and runs crew done before urgent delivery returns
- **THEN** Crew preserves the new reported state and current task fields rather than reopening it again

#### Scenario: Cancellation is refused

- **WHEN** urgent delivery is refused before any follow-up is sent
- **THEN** task state, report stage, follow-up count and review assignments remain unchanged

#### Scenario: Failure races a newer task update

- **WHEN** follow-up delivery fails while a newer report, closure or worker replacement is recorded
- **THEN** Crew preserves the newer lifecycle state rather than restoring its earlier task snapshot

### Requirement: Urgency is documented as cancellation rather than guaranteed execution

Crew's help, README and generated coordinator guidance SHALL distinguish ordinary queued follow-ups from explicit interrupting tells. They SHALL explain that interruption cancels a turn, can leave partial tool side effects, does not roll back work and does not prove the model has already processed the message.

#### Scenario: Coordinator chooses urgent delivery

- **WHEN** a coordinator reads the tell guidance
- **THEN** it can find the interrupt option, understands when to use it, and knows that failed confirmation requires inspection rather than a blind retry
