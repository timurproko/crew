# Tasks

## 1. Project registrations can change across sessions atomically without racing task admission or weakening owner-only work control

- [ ] 1.1 Add a bounded, exclusive per-home registry transaction with fresh validation, atomic replacement and guaranteed ordinary-error release; cover contention, abandoned locks, malformed registry data, unrelated metadata preservation and complete JSON snapshots in isolated tests.
- [ ] 1.2 Remove the registration owner gate while retaining replacement consent and task/copy protections; cover owner, non-owner and no-terminal add/remove/re-add/replacement, including unreadable task records and closed tasks with pending copies.
- [ ] 1.3 Serialize current-project resolution and the first preparing task record with registry edits in the common launcher; cover deterministic spawn-versus-remove and spawn-versus-replace orderings, plus concurrent add/add and add/remove without lost updates or resurrection.
- [ ] 1.4 Preserve owner-only spawn, stop, finish and other work-control paths while naming the crew home, owner terminal and protected operation in refusals; cover owner unchanged by registration, unavailable Core and coordinator visibility on its next command without restarting its agent.
- [ ] 1.5 Update README ownership and registration guidance with the transaction boundary and lock-recovery limitation; check its examples and guarantees against the new targeted regression assertions.

## 2. Dotted project names retain their identity throughout crew, and invalid names receive actionable diagnostics

- [ ] 2.1 Separate project validation from unchanged task-ID validation and use safe own-property registry lookups; cover dotted names, the naming boundaries, inherited-property names and specific non-usage errors for invalid explicit project names at add/remove and project-selection entry points.
- [ ] 2.2 Preserve dotted project identity through registry replacement/removal, spawn selection, project-specific dispatch and text/JSON status; cover an owner spawning scout and ship tasks from a dotted repository with valid task-based branch and plain-copy names.
- [ ] 2.3 Cover dotted project names forwarded through backlog commands and delivery-managed copies, including a fake pooled allocation; assert exact project strings, delivery cwd/arguments, recorded returned paths and no unwanted task-ID grammar changes.
- [ ] 2.4 Document the accepted project grammar and the separate Herdr follow-up for dot-preserving folder derivation, list parsing and naming/error text; include a dotted folder example and explicitly state that no Herdr files change in this PR.
