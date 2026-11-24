# Proposal

## Why

Herdr currently decodes 393,602 bytes for 234 Crew tasks while consuming only fleet identity and PR fields; growing history can exceed its native watchdog and detach linked rows for up to 45 seconds. A minimal, history-filtered status response should avoid that cost without hiding an old task's still-open pull request.

## What Changes

- Add `crew status --json --view fleet`, optionally with `--discover-prs`, with a version-1 view marker and only home, owner terminal/live, task id/state/terminal/pr/prDiscovery, and discovery version.
- Include all non-closed tasks. Include closed tasks only with a recorded or safely discovered PR, retaining open/unknown PRs regardless of task age and expiring known merged/closed PRs only more than 24 hours after GitHub's corresponding event.
- Persist verified PR URL, state, mergedAt and closedAt as separate saved facts when existing discovery or land/finish reads learn them. Do not promote discovered links into authoritative task.pr or change delivery stages.
- Preserve legacy status output bytes and network behavior, reject unsupported view names with a stable diagnostic, and keep the fleet projection separate from full status and copy-return inspection.
- Cover exact fields, history boundaries, persistence, payload size, fast state-only traversal and compatibility; document the contract and cache limitations.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `task-orchestration`: Add minimal bounded fleet status and saved PR lifecycle facts; relax discovery's current no-local-state-write rule only for these facts while preserving its GitHub read-only and delivery-authority boundaries.

## Impact

- `crew.mjs`: status option parsing and projection, state-only history filtering, bounded discovery fact capture, and existing land/finish GitHub read sites.
- `crew.test.mjs`: deterministic clocks, fake GitHub/Core, field/byte compatibility, 1,000-task payload and multi-thousand-task read/performance coverage.
- `README.md` and `docs/status-pr-discovery.md`: fleet JSON/version/fallback contract and distinction between cached observations and landing.
- No Herdr changes, GitHub mutations, new dependencies, background process or extra status network requests. Unknown lifecycle facts remain conservative rather than claiming full history elimination.
- PR #10 overlaps crew.mjs; its branch remains untouched, and its changes will be incorporated from main if merged before final implementation delivery.
