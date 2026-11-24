# Conditional implementation acceptance

Verdict: accepted only when an authorized human directly merges the containing exact pull-request head after required current-head validation, explicitly asks the active agent to execute that protected exact-head merge while it is currently eligible, or personally enables native auto-merge for the unchanged head and GitHub integrates it after validation succeeds.

The maintainer integration decision accepts these scenarios:
- Fleet v1 emits only home, owner terminal/live, task identity and PR discovery fields with both version markers.
- Every non-closed task remains visible; closed tasks retain open or unknown PRs and expire only beyond 24 hours after a known PR merge or close.
- Existing discovery and land/finish reads save identity-scoped lifecycle observations without extra status requests or changes to delivery authority.
- Legacy status output remains byte-compatible; unknown views exit with a stable diagnostic and help advertises the fleet capability.
- Metadata-validated summaries avoid historical prose and copy inspection; a 1000-task history produces 364 bytes and indexed 5000-task polling stays below 200 milliseconds locally.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/crew",
  "change": "status-fleet-view",
  "sourcePr": 11,
  "archive": "openspec/changes/archive/2026-11-24-status-fleet-view/",
  "acceptanceManifest": "openspec/changes/archive/2026-11-24-status-fleet-view/acceptance.md",
  "finalizedDate": "2026-11-24",
  "specBaseSha": "99e95c5a0533c6f1725fc66a001c950f26efe5c7",
  "acceptanceScenarios": [
    "Fleet v1 emits only home, owner terminal/live, task identity and PR discovery fields with both version markers.",
    "Every non-closed task remains visible; closed tasks retain open or unknown PRs and expire only beyond 24 hours after a known PR merge or close.",
    "Existing discovery and land/finish reads save identity-scoped lifecycle observations without extra status requests or changes to delivery authority.",
    "Legacy status output remains byte-compatible; unknown views exit with a stable diagnostic and help advertises the fleet capability.",
    "Metadata-validated summaries avoid historical prose and copy inspection; a 1000-task history produces 364 bytes and indexed 5000-task polling stays below 200 milliseconds locally."
  ],
  "archiveDigest": "9553ecd2b99885028d7dc60fb057273f24a299b76ee25684c1d98a2d3998ebb9",
  "specDigest": "1ff34506885a7a87b779ae47f0cd67da1a98e24bc6f01d0435b847be5d7512ed",
  "tasksDigest": "43193c113b683caf21d2dad61684797ea2963679217b3c2c14162408cf868ae7",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
