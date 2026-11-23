# Tasks

## 1. Saved review starts and verdicts swap shared advisory labels

- [x] 1.1 Replace the earlier lifecycle machinery with two post-save hooks and one best-effort swap helper; confirm runtime changes against main contain no attempt records, lock, recovery or status changes.
- [x] 1.2 Add focused fake-GitHub coverage for activity and verdict swaps, both internal verdicts, malformed/missing reports, missing definitions, opt-out, request failures, one warning and post-save ordering; pass the focused groups without live calls.
- [x] 1.3 Replace README and specification promises with the approved small scope and explicit stopped/crashed-reviewer, failed-removal and overlapping-review limitations; retain project registration and PR-discovery behavior from main.
- [x] 1.4 Merge current origin/main, validate the reduced specs/body, and pass the complete node crew.test.mjs suite before reporting the pushed head and current CI status.
