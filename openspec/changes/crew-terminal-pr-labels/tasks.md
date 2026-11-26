# Tasks

## 1. Worker terminals and ordinary JSON status expose durable PR navigation and review context without making metadata failures fatal

- [ ] 1.1 Add one bounded best-effort terminal metadata publisher and wire reviewer/ship/fix launches plus report, land and verified discovery hooks; fake hc assertions cover crew.pr on launch and live updates, replacements, and ended/unavailable terminals with one-line warnings and normal command success.
- [ ] 1.2 Persist parent-ship reviewRound and sanitized lastFinding independently of GitHub label success; targeted fake hc tests cover crew.round=1, successive CHANGES NEEDED verdicts, duplicate bookkeeping, BLOCKING versus FOLLOW-UP selection, control characters, Unicode truncation and clearing crew.finding on APPROVE.
- [ ] 1.3 Append reviewRound and lastFinding to ordinary JSON task status using saved state; targeted tests cover absent terminals, legacy defaults and non-ship nulls, preserve exact fleet v1 fields and prove ordinary no-discovery status performs no terminal-label writes.
- [ ] 1.4 Update README.md and docs/status-pr-discovery.md for the terminal labels, context defaults/limit and narrow explicit-discovery side effect; review text against the spec scenarios and run only tests for touched behavior, never the full local suite.
