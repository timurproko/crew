# Conditional implementation acceptance

Verdict: accepted only when an authorized human directly merges the containing exact pull-request head after required current-head validation, explicitly asks the active agent to execute that protected exact-head merge while it is currently eligible, or personally enables native auto-merge for the unchanged head and GitHub integrates it after validation succeeds.

The maintainer integration decision accepts these scenarios:
- The completed crew-standalone change resides in the dated OpenSpec archive with all five original files unchanged.
- The tool-maintenance baseline includes the original root-layout requirement and updated repair-scope requirement with their scenarios.
- Changes are confined to OpenSpec artifacts; runtime code, workflow rules, and unrelated specifications are unchanged.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/crew",
  "change": "archive-crew-standalone",
  "sourcePr": 3,
  "archive": "openspec/changes/archive/2026-11-21-archive-crew-standalone/",
  "acceptanceManifest": "openspec/changes/archive/2026-11-21-archive-crew-standalone/acceptance.md",
  "finalizedDate": "2026-11-21",
  "specBaseSha": "5fe8a499e36c23d22ec3df089a04f461d3f3ee3d",
  "acceptanceScenarios": [
    "The completed crew-standalone change resides in the dated OpenSpec archive with all five original files unchanged.",
    "The tool-maintenance baseline includes the original root-layout requirement and updated repair-scope requirement with their scenarios.",
    "Changes are confined to OpenSpec artifacts; runtime code, workflow rules, and unrelated specifications are unchanged."
  ],
  "archiveDigest": "c02ccc35d134070ec313aaa2e72e93d03bd715a7f84ab3cf878da63ce51e7177",
  "specDigest": "16fd158d967fb0c94bef64f1484882361389bed40515d153b449c72f88f094fd",
  "tasksDigest": "99d04afbf705f248817de9e5deb8760adc6827a5864c7dd242854b1d29973450",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
