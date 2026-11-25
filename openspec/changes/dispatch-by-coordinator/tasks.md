# Tasks

## 1. Coordinator identity is recorded and refreshed from the owner's verified session metadata

- [ ] 1.1 Add the conservative owner-bound identity resolver and persist non-secret source metadata at crew start; fake-Core/disposable-home tests prove owner binding, preserved owner fields and no credential or session mutations.
- [ ] 1.2 Re-read verified status/labels before new selection, reject stale or transitioning evidence and positively identify non-Claude owners; targeted fixtures prove picker changes, API mismatch precedence, stale launch hints, missing/corrupt sources, older owner records and inspector isolation.
- [ ] 1.3 Document identity authority, the 60-second freshness policy and unknown/non-Claude fallback in README; examples agree with resolver fixtures and no live home is edited.

## 2. Coordinator policies resolve isolated worker lists and agents explains the selected account and source

- [ ] 2.1 Parse the optional coordinators map with case-insensitive exact keys and required section defaults; targeted tests reject invalid containers, colliding/invalid keys, malformed unselected sections, nested fields, profiles, roles, rules and quota flags with field-path diagnostics.
- [ ] 2.2 Select the coordinator policy before project/role resolution, including review, fix and crew:self, and keep each scoped base profile one candidate; fixtures prove both requested singleton examples, project precedence, section-default fallback and unchanged no-map/global expansion.
- [ ] 2.3 Apply existing agent/model/effort/account/rule/no-fallback transforms over the selected base, preserving explicit override expansion while leaving scoped profiles unexpanded; targeted cases assert exact ordered/deduplicated candidate arrays and section-local rule errors.
- [ ] 2.4 Add human and JSON agents identity/section/source diagnostics and one-line unknown-account fallback for current-chain selection; output tests prove valid JSON, non-owner read-only inspection and one diagnostic per human command.
- [ ] 2.5 Add the exact two-account JSON example, schema constraints, precedence and override-expansion distinction to README; disposable fixtures use that example and assert one candidate per configured singleton.

## 3. Recovery and relaunch preserve the selected task chain without implicit fallback workers

- [ ] 3.1 Save selection provenance and effective quota policy beside task candidates; targeted task-record tests prove existing task compatibility and selected-section measurement behavior without changing finish/land/brief functions.
- [ ] 3.2 Keep quota/login handover, crashed-worker recovery and unflagged relaunch confined to saved candidates; fake-Core tests prove singleton exhaustion reports the stop reason/no other candidate and never launches a saved-account or global fallback.
- [ ] 3.3 Keep an account change from widening old task chains while flagged relaunch uses the current selected policy; targeted fixtures prove exact launch attempts, tried filtering, preserved copies and legacy saved-chain behavior.
- [ ] 3.4 Document frozen recovery chains, singleton exhaustion and rollback-to-global behavior in README; compare documented behavior with the disposable recovery fixtures and check the diff avoids PR #14's functions.

## Workflow follow-up

- This publication is plan-only. Implementation tasks remain unchecked until the plan is approved and implementation is requested.
- Commit and push each implemented outcome with its tests and documentation before ticking the corresponding PR outcome.
- Do not mark the PR ready or merge it. Follow the shared delivery workflow for later acceptance and finalization.
