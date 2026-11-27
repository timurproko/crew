# Conditional implementation acceptance

Verdict: accepted only when an authorized human directly merges the containing exact pull-request head after required current-head validation, explicitly asks the active agent to execute that protected exact-head merge while it is currently eligible, or personally enables native auto-merge for the unchanged head and GitHub integrates it after validation succeeds.

The maintainer integration decision accepts these scenarios:
- Kind-only local edits preserve ownership, running tasks, expected-path guards and unrelated registration metadata without Core calls.
- Explicit selections override detection; JSON distinguishes explicit, legacy and detected kinds and reports required-tool availability.
- Automatic listing and spawn inspect the published allocation snapshot, exposing stale registered checkouts separately without moving checkout files or refs.
- Delivery selection is saved at reservation and survives later settings, allocation, review, land, relaunch and automatic hand-over.
- Unresolvable automatic snapshots refuse clearly rather than advertising or launching a guessed Plain task.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/crew",
  "change": "project-kind-apply",
  "sourcePr": 27,
  "archive": "openspec/changes/archive/2026-11-27-project-kind-apply/",
  "acceptanceManifest": "openspec/changes/archive/2026-11-27-project-kind-apply/acceptance.md",
  "finalizedDate": "2026-11-27",
  "specBaseSha": "d31530de0e950211eef7848a7668641fd5ea673e",
  "acceptanceScenarios": [
    "Kind-only local edits preserve ownership, running tasks, expected-path guards and unrelated registration metadata without Core calls.",
    "Explicit selections override detection; JSON distinguishes explicit, legacy and detected kinds and reports required-tool availability.",
    "Automatic listing and spawn inspect the published allocation snapshot, exposing stale registered checkouts separately without moving checkout files or refs.",
    "Delivery selection is saved at reservation and survives later settings, allocation, review, land, relaunch and automatic hand-over.",
    "Unresolvable automatic snapshots refuse clearly rather than advertising or launching a guessed Plain task."
  ],
  "archiveDigest": "294f7e3e09c872ac985384edf370641ba2d9b0a9d6f195f11dfe7d9490b191b0",
  "specDigest": "71f17a6e86e1866cbd98ae84a7c1ad0a98017cdffd894b32e2e15b9cda9d9314",
  "tasksDigest": "ca33a3fc26f5671895e25770ee8b15dd9ede93f08de3c773b95ee153f41c0d1a",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
