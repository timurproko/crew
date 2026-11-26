# Conditional implementation acceptance

Verdict: accepted only when an authorized human directly merges the containing exact pull-request head after required current-head validation, explicitly asks the active agent to execute that protected exact-head merge while it is currently eligible, or personally enables native auto-merge for the unchanged head and GitHub integrates it after validation succeeds.

The maintainer integration decision accepts these scenarios:
- Reviewer and ship/fix terminals publish known PR URLs through best-effort Core metadata hooks.
- Ship review rounds and sanitized blocking findings survive terminal loss, and approval clears the finding without resetting the round.
- Ordinary JSON status exposes review context while fleet v1 keeps its existing minimal shape.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/crew",
  "change": "crew-terminal-pr-labels",
  "sourcePr": 24,
  "archive": "openspec/changes/archive/2026-11-26-crew-terminal-pr-labels/",
  "acceptanceManifest": "openspec/changes/archive/2026-11-26-crew-terminal-pr-labels/acceptance.md",
  "finalizedDate": "2026-11-26",
  "specBaseSha": "aafdad1c7eaba51454d9e30456febc180435fae0",
  "acceptanceScenarios": [
    "Reviewer and ship/fix terminals publish known PR URLs through best-effort Core metadata hooks.",
    "Ship review rounds and sanitized blocking findings survive terminal loss, and approval clears the finding without resetting the round.",
    "Ordinary JSON status exposes review context while fleet v1 keeps its existing minimal shape."
  ],
  "archiveDigest": "287112c0753d0c8784bc53be8f9835d8eb9260ef16c33293d31995d88fdf5cc8",
  "specDigest": "e362e2a6c93716b4b1719c8305b69e326c13bb52a4299399859de1eba59199f6",
  "tasksDigest": "2a53064c25042c3ebcab2fdf6e19d48048281f7f756a7b20110a329d0369a63d",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
