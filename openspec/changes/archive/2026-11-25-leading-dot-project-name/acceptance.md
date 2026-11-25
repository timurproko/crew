# Conditional implementation acceptance

Verdict: accepted only when an authorized human directly merges the containing exact pull-request head after required current-head validation, explicitly asks the active agent to execute that protected exact-head merge while it is currently eligible, or personally enables native auto-merge for the unchanged head and GitHub integrates it after validation succeeds.

The maintainer integration decision accepts these scenarios:
- Crew accepts project names such as `.xrbuild`, `.a` and `.bad` that start with one dot followed by a lowercase letter or digit.
- Crew still refuses `.`, `..a`, `.-a`, `.A` and names over 40 characters counting the dot, with a specific reason.
- A project `.xrbuild` registers, lists, spawns and removes next to a project `xrbuild` under its exact name.
- Branch and working-copy names of a leading-dot project's tasks come from the task id, never the project name.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/crew",
  "change": "leading-dot-project-name",
  "sourcePr": 18,
  "archive": "openspec/changes/archive/2026-11-25-leading-dot-project-name/",
  "acceptanceManifest": "openspec/changes/archive/2026-11-25-leading-dot-project-name/acceptance.md",
  "finalizedDate": "2026-11-25",
  "specBaseSha": "f2a76e9f650fc8c9dc51ffcffab2725b1cd374fb",
  "acceptanceScenarios": [
    "Crew accepts project names such as `.xrbuild`, `.a` and `.bad` that start with one dot followed by a lowercase letter or digit.",
    "Crew still refuses `.`, `..a`, `.-a`, `.A` and names over 40 characters counting the dot, with a specific reason.",
    "A project `.xrbuild` registers, lists, spawns and removes next to a project `xrbuild` under its exact name.",
    "Branch and working-copy names of a leading-dot project's tasks come from the task id, never the project name."
  ],
  "archiveDigest": "2a254501f39181920dba1f304a02088d97b07e113ffc902da464a163bce578eb",
  "specDigest": "b36e37dda65f11df5a351aa48131b010dc0fcb51a4352519f412029fcd5dc431",
  "tasksDigest": "f3854d91f2e4a011ed2179bb2ddb8784aacc634d40082242c95f6de8552f152f",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
