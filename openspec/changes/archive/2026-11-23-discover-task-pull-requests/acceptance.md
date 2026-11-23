# Conditional implementation acceptance

Verdict: accepted only when an authorized human directly merges the containing exact pull-request head after required current-head validation, explicitly asks the active agent to execute that protected exact-head merge while it is currently eligible, or personally enables native auto-merge for the unchanged head and GitHub integrates it after validation succeeds.

The maintainer integration decision accepts these scenarios:
- Opt-in status advertises discovery version 1 and returns known, none or unavailable for each task without changing stored PRs.
- Exact worktree, branch and origin checks protect PR identity across workflow, gate and plain ships, including non-owner reads.
- Added reads are serial, output-bounded and deadline-limited, with no retries or task, report, owner or Git state writes.
- Ordinary status remains local-only, lifecycle guards remain intact, and the separate Herdr adapter adoption steps are documented.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/crew",
  "change": "discover-task-pull-requests",
  "sourcePr": 6,
  "archive": "openspec/changes/archive/2026-11-23-discover-task-pull-requests/",
  "acceptanceManifest": "openspec/changes/archive/2026-11-23-discover-task-pull-requests/acceptance.md",
  "finalizedDate": "2026-11-23",
  "specBaseSha": "372f8b608853a24398b042b87fd4332dd7652ae7",
  "acceptanceScenarios": [
    "Opt-in status advertises discovery version 1 and returns known, none or unavailable for each task without changing stored PRs.",
    "Exact worktree, branch and origin checks protect PR identity across workflow, gate and plain ships, including non-owner reads.",
    "Added reads are serial, output-bounded and deadline-limited, with no retries or task, report, owner or Git state writes.",
    "Ordinary status remains local-only, lifecycle guards remain intact, and the separate Herdr adapter adoption steps are documented."
  ],
  "archiveDigest": "90f08dc702b726a33aac210194f1b8590f133b6c3e3f841c992647ccb92d0ec1",
  "specDigest": "796d4dbc14d82de6a0b39ebe1f4f2d091ed05a8e8acfcc21e8d240db7a12d501",
  "tasksDigest": "726e0606970d4ba758a65c1ee35a78f0ff47be194ad422abb75bb996f3df405d",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
