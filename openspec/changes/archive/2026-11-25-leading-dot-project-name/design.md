# Design

## Context

`projectNameError` in `crew.mjs` is the one name rule used by `project add`, `project remove`, `spawn --project`, `agents --project` and the project keys of `agents.json`. It requires the first character to be a lowercase letter or digit, so a dot folder such as `D:/Git/xrbuild/.xrbuild` cannot keep its name. Herdr then strips the dot, which clashes with the registered project `xrbuild`.

## Decisions

- **Relax only the start check.** It becomes `/^\.?[a-z0-9]/` with the message "start with a lowercase ASCII letter or digit, or one dot followed by one". The other checks stay as they are and in the same order: at most 40 characters counting the dot, only lowercase letters, digits, dashes and dots, no `..`, no trailing dot. So `.`, `..a`, `.-a` and `.A` stay invalid; `.` and `..a` fail the start check because it runs first.
- **No change where the name is used.** The registry, task records, status, backlog forwarding and coordinator profiles store and compare the name as an exact string. Branches are named after the task ID and working copies after the task ID or the repository folder, so the name never reaches a git ref, where a part starting with a dot is invalid. A separate requirement records this so that later work keeps it.
- **No migration.** Every name valid today stays valid.

## Risks / Trade-offs

- An older crew still refuses `.xrbuild` with "Invalid project name"; callers such as Herdr already turn that into an update hint.
- Anything that later sorts project names would put dotted names first, which is harmless.
