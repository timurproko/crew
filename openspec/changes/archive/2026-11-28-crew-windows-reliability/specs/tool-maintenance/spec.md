# Tool maintenance delta

## ADDED Requirements

### Requirement: Self-repair has a realistic finite test deadline

Crew SHALL allow a passing complete self-repair suite to run beyond the former fifteen-minute limit, with a documented finite default and validated timeout override. Publication SHALL still require successful completion of the entire configured suite. Expiration, subprocess launch errors and test failures SHALL remain refusals with distinct actionable diagnostics.

#### Scenario: A passing suite needs a longer Windows allowance

- **WHEN** a clean in-scope reported repair's complete suite exceeds fifteen minutes but succeeds within the configured deadline
- **THEN** selfrepair can publish its branch and draft pull request after the suite succeeds, subject to all existing scope, history and publication guards

#### Scenario: The suite fails or hangs

- **WHEN** the suite exits nonzero, cannot start or exceeds its configured finite deadline
- **THEN** selfrepair does not push or open a pull request and identifies the actual failure class, including the configured deadline for a timeout

#### Scenario: The timeout override is invalid

- **WHEN** a caller supplies an empty, nonnumeric, nonpositive or excessive explicit timeout value
- **THEN** selfrepair refuses with a clear configuration error rather than running indefinitely or silently accepting a passing repair without its full suite

#### Scenario: Deadline regressions use a focused fixture

- **WHEN** targeted tests simulate a slow passing suite, a failing suite and an expired deadline
- **THEN** they exercise publication guards with short isolated fixture commands without requiring a full local suite run or a fifteen-minute test delay
