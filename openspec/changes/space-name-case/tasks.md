# Tasks

## 1. New project spaces preserve repository folder spelling without changing project identity

- [x] 1.1 Separate canonical placement identity from directory-derived display-name construction and saved-name validation; add fake-Core assertions for `myworkflows` mapped to `MyWorkflows`, registry aliases, dot-prefixed folders and hash-parent pool copies with unchanged command/project/space IDs.
- [x] 1.2 Preserve legacy saved-name acceptance while validating ID/project/mode and safe title strings; cover malformed metadata and exact terminal-label checks in the focused `node crew.test.mjs --gaps=space-name-case` group.
- [x] 1.3 Update README and the label/identity table in `docs/worker-spaces.md` to distinguish project IDs from display names; ensure the examples and focused fixture expectations agree with the new contract.

## 2. Existing project spaces retain their saved names through joins and inherited launches

- [ ] 2.1 Retain validated occupied placement names during admission and reuse the selected placement rather than reconstructing its title; prove an occupied old lower-case canonical space is joined without duplication or relabeling and still outranks eligible combined placement.
- [ ] 2.2 Keep conservative refusal on conflicting same-space names and preserve combined joins, pending reservations and gate ordering; run `node crew.test.mjs --gaps=join-project-space` with fake Core and isolated homes.
- [ ] 2.3 Cover legacy and directory-cased review, manual relaunch and automatic hand-over inheritance across mode switches; run the focused name-case group and `node crew.test.mjs --gaps=worker-spaces`, including updated existing fixture expectations.
- [ ] 2.4 Document non-renaming, legacy-title lifetime and companion rendering/validation limits in `docs/worker-spaces.md`; ensure fake adoption logs show no space-rename/layout mutations and no real home or coordinator is used.

## Workflow follow-up

- Implementation begins only after this draft plan is approved. Tick each corresponding PR outcome after its code, tests and documentation land.
- The coordinator approved implementation and explicitly requested one whole `crew.test.mjs` run locally before pushing; run that once alongside useful targeted fake-Core groups.
- Publish the final implementation head and confirm CI was triggered without waiting for checks or the delivery bot; never mark ready or merge.
