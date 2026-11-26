# Conditional implementation acceptance

Verdict: accepted only when an authorized human directly merges the containing exact pull-request head after required current-head validation, explicitly asks the active agent to execute that protected exact-head merge while it is currently eligible, or personally enables native auto-merge for the unchanged head and GitHub integrates it after validation succeeds.

The maintainer integration decision accepts these scenarios:
- Combined remains the default and the owner can change new-task grouping without restarting the coordinator.
- Existing workers never move; reviews, relaunches and hand-overs inherit task placement across either mode switch.
- Task reservation orders concurrent switches, while legacy tasks and earlier-session work remain usable and finishable.
- Crew never deletes a space or closes foreign terminals; Herdr owns automatic zero-tab space removal.
- Connected project nesting and exact headings require the compatible Herdr companion update to be installed.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/crew",
  "change": "space-per-project",
  "sourcePr": 22,
  "archive": "openspec/changes/archive/2026-11-26-space-per-project/",
  "acceptanceManifest": "openspec/changes/archive/2026-11-26-space-per-project/acceptance.md",
  "finalizedDate": "2026-11-26",
  "specBaseSha": "9cb78251288978fb0a300884aea1894b013071d4",
  "acceptanceScenarios": [
    "Combined remains the default and the owner can change new-task grouping without restarting the coordinator.",
    "Existing workers never move; reviews, relaunches and hand-overs inherit task placement across either mode switch.",
    "Task reservation orders concurrent switches, while legacy tasks and earlier-session work remain usable and finishable.",
    "Crew never deletes a space or closes foreign terminals; Herdr owns automatic zero-tab space removal.",
    "Connected project nesting and exact headings require the compatible Herdr companion update to be installed."
  ],
  "archiveDigest": "321575a584cb1008d7c41222436cce4bbe9ef5dc70c6221ff286413246ee689b",
  "specDigest": "8ebc0877a4cc7c6a0e2bff442e6fdde7fbd24392a760d9b5b17d33e097fa36fd",
  "tasksDigest": "bc2d5b8114e28c3e49cbfd0d87d2b61a7e3231b954ec0273311fd2b65c36759b",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
