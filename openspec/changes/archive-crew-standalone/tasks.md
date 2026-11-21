# Tasks

## 1. The historical crew-standalone change is archived with its tool-maintenance delta synchronized

- [ ] 1.1 Recheck the current baseline against the original delta before running `delivery openspec archive crew-standalone --yes`; retain default synchronization and validation, and report any duplicate or conflict without forcing it.
- [ ] 1.2 Inspect the generated diff for the dated archive move and the original tool-maintenance requirement/scenario updates; ensure no code, workflow rules, or unrelated specifications changed.
- [ ] 1.3 Check the resulting OpenSpec state with `delivery openspec validate --all --strict --no-interactive` and `delivery openspec validate --archived --strict --no-interactive`; both must pass before completing this outcome.
