# Conditional implementation acceptance

Verdict: accepted only when an authorized human directly merges the containing exact pull-request head after required current-head validation, explicitly asks the active agent to execute that protected exact-head merge while it is currently eligible, or personally enables native auto-merge for the unchanged head and GitHub integrates it after validation succeeds.

The maintainer integration decision accepts these scenarios:
- Crew resolves its tool root from the running script folder unless CREW_TOOL_ROOT supplies an explicit override.
- Repairs accept only root crew source, tests and README plus bin and docs, and default to the root-level node crew.test.mjs suite.
- The follow-up links only the completed crew-standalone change and leaves runtime code, shared workflows and repository settings unchanged.
- Canonical specifications remain unchanged by the author; the original tool-maintenance delta is reserved for normal bot synchronization.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/crew",
  "change": "crew-standalone",
  "sourcePr": 4,
  "archive": "openspec/changes/archive/2026-11-21-crew-standalone/",
  "acceptanceManifest": "openspec/changes/archive/2026-11-21-crew-standalone/acceptance.md",
  "finalizedDate": "2026-11-21",
  "specBaseSha": "5fe8a499e36c23d22ec3df089a04f461d3f3ee3d",
  "acceptanceScenarios": [
    "Crew resolves its tool root from the running script folder unless CREW_TOOL_ROOT supplies an explicit override.",
    "Repairs accept only root crew source, tests and README plus bin and docs, and default to the root-level node crew.test.mjs suite.",
    "The follow-up links only the completed crew-standalone change and leaves runtime code, shared workflows and repository settings unchanged.",
    "Canonical specifications remain unchanged by the author; the original tool-maintenance delta is reserved for normal bot synchronization."
  ],
  "archiveDigest": "64760ae2c7e3711855cd98631cc53168ec2f799cf5b1a908a93425463a7f692a",
  "specDigest": "16fd158d967fb0c94bef64f1484882361389bed40515d153b449c72f88f094fd",
  "tasksDigest": "669d28b482d6fca64667144576d4a6c386420575b047754fd719dc2f0a7d90e8",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
