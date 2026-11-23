# Conditional implementation acceptance

Verdict: accepted only when an authorized human directly merges the containing exact pull-request head after required current-head validation, explicitly asks the active agent to execute that protected exact-head merge while it is currently eligible, or personally enables native auto-merge for the unchanged head and GitHub integrates it after validation succeeds.

The maintainer integration decision accepts these scenarios:
- Each opted-in review hook reads the configurable default-branch manifest once with a two-second timeout and resolves names by stable key.
- Failed manifest reads use built-in Review, Approved and Rework names with legacy aliases and one combined advisory warning.
- Swaps remove assigned current and historical names, preserve unrelated labels, and add only an existing current definition.
- Saved-state ordering, stale-start guards, opt-out, unchanged report words and the absence of retries or persistent label state remain covered by fake GitHub.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/crew",
  "change": "crew-label-rename",
  "sourcePr": 8,
  "archive": "openspec/changes/archive/2026-11-23-crew-label-rename/",
  "acceptanceManifest": "openspec/changes/archive/2026-11-23-crew-label-rename/acceptance.md",
  "finalizedDate": "2026-11-23",
  "specBaseSha": "9434162d4d49623731b48ce3168c652b86400b11",
  "acceptanceScenarios": [
    "Each opted-in review hook reads the configurable default-branch manifest once with a two-second timeout and resolves names by stable key.",
    "Failed manifest reads use built-in Review, Approved and Rework names with legacy aliases and one combined advisory warning.",
    "Swaps remove assigned current and historical names, preserve unrelated labels, and add only an existing current definition.",
    "Saved-state ordering, stale-start guards, opt-out, unchanged report words and the absence of retries or persistent label state remain covered by fake GitHub."
  ],
  "archiveDigest": "c223d4ed522a2e8469a794ae75f869f9b36e048c8e53882ea1d30df0c55bf8a3",
  "specDigest": "8ab3247dd5a23bb4bfe455a371d5a796dcfaf607e6a69e180233bd9e4a7ccfff",
  "tasksDigest": "96cb2fe10d44df1cf5322e46820bc724fc2498c5af7d0ee764c667cbd54b8851",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
