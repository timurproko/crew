# Proposal

## Why

The general Settings dialog cannot register projects while a coordinator owns the crew home, even though registration should not confer control over workers. Dotted folder names also expose a task-ID validator mistakenly reused for project names, yielding bare usage instead of a useful error.

## What Changes

- Allow any local session, including a settings process without a terminal, to add and remove registrations without acquiring or transferring home ownership.
- Serialize project read-modify-write transactions and task admission against one per-home lock; keep atomic registry replacement and reread current state within the transaction.
- Preserve explicit replacement consent and refusals for unfinished tasks and closed tasks whose copies still need returning; keep worker lifecycle and backlog mutations owner-only.
- Accept dotted project names with dedicated validation and explain every invalid project name rather than printing bare usage.
- Preserve project identity across selection, dispatch, backlog forwarding, status and working-copy allocation; retain task-based branch and copy naming.
- Identify the crew home path, terminal and protected operation in remaining ownership refusals, explicitly distinguishing them from a busy project folder.
- Document the separate Herdr name-derivation and list-parser changes needed for dotted names without editing that repository.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `task-orchestration`: Narrow home ownership to orchestration, add safe cross-session registration and dotted project identity requirements.

## Impact

Implementation will affect `crew.mjs`, regression coverage in `crew.test.mjs`, and `README.md`. No runtime dependencies or registry format migration are planned. The existing task-orchestration spec currently makes every home mutation owner-only and must explicitly exempt safe registration. Herdr's separately maintained plugin invokes the installed CLI correctly, but its project-name sanitizer and list parser need a follow-up in that repository; they are outside this PR.
