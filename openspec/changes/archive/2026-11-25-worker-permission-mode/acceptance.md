# Conditional implementation acceptance

Verdict: accepted only when an authorized human directly merges the containing exact pull-request head after required current-head validation, explicitly asks the active agent to execute that protected exact-head merge while it is currently eligible, or personally enables native auto-merge for the unchanged head and GitHub integrates it after validation succeeds.

The maintainer integration decision accepts these scenarios:
- Claude workers for scout, ship, review and fix start with --permission-mode auto and the unchanged --allowedTools list.
- A Claude worker taking over after a hand-over or relaunch also starts in auto mode.
- When the installed Claude Code refuses auto mode, the worker starts in acceptEdits and the spawn or relaunch line names the reason.
- When auto mode ends with an error within 20 seconds, the worker's shell prints a notice and starts it once more in acceptEdits.
- A normal end, an interrupt or a late error is never restarted, and bypassPermissions or dontAsk are never used.
- A1 and Pi launches and the person's crew-dispatch.json are unchanged.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/crew",
  "change": "worker-permission-mode",
  "sourcePr": 17,
  "archive": "openspec/changes/archive/2026-11-25-worker-permission-mode/",
  "acceptanceManifest": "openspec/changes/archive/2026-11-25-worker-permission-mode/acceptance.md",
  "finalizedDate": "2026-11-25",
  "specBaseSha": "2dd00f9422a8dbf29bd1004ce40a0109b57ac030",
  "acceptanceScenarios": [
    "Claude workers for scout, ship, review and fix start with --permission-mode auto and the unchanged --allowedTools list.",
    "A Claude worker taking over after a hand-over or relaunch also starts in auto mode.",
    "When the installed Claude Code refuses auto mode, the worker starts in acceptEdits and the spawn or relaunch line names the reason.",
    "When auto mode ends with an error within 20 seconds, the worker's shell prints a notice and starts it once more in acceptEdits.",
    "A normal end, an interrupt or a late error is never restarted, and bypassPermissions or dontAsk are never used.",
    "A1 and Pi launches and the person's crew-dispatch.json are unchanged."
  ],
  "archiveDigest": "5ebd1e2fd1c95eabf49027a0469653f5a98a2896beefc0a7c679963aa9c09570",
  "specDigest": "aec234ef562b6c542777f0edffd8aef8f1ef964f97cf0ece384ecf97a6512266",
  "tasksDigest": "0b20ca88bc6aff417394912c982ac346dc9387dc157810b4dd75cf93d609d4c9",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
