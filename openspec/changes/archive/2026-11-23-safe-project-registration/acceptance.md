# Conditional implementation acceptance

Verdict: accepted only when an authorized human directly merges the containing exact pull-request head after required current-head validation, explicitly asks the active agent to execute that protected exact-head merge while it is currently eligible, or personally enables native auto-merge for the unchanged head and GitHub integrates it after validation succeeds.

The maintainer integration decision accepts these scenarios:
- Settings and other local sessions can register projects without taking ownership, and the owner sees changes on its next command.
- Fresh atomic registry edits share a lock with task admission, preserving unrelated entries and preventing removal or replacement races.
- Unfinished tasks, pending copies, unsafe replacements and unreadable task references still prevent destructive registration changes.
- Work control remains owner-only, and refusals identify the crew home and controlling terminal rather than imply a busy project folder.
- Dotted project names survive dispatch, backlog forwarding, status and plain or pooled copies while task-based branch naming remains unchanged.
- Invalid names explain their violated rule, and the README identifies the separate Herdr name-derivation and list-parser follow-up.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/crew",
  "change": "safe-project-registration",
  "sourcePr": 5,
  "archive": "openspec/changes/archive/2026-11-23-safe-project-registration/",
  "acceptanceManifest": "openspec/changes/archive/2026-11-23-safe-project-registration/acceptance.md",
  "finalizedDate": "2026-11-23",
  "specBaseSha": "372f8b608853a24398b042b87fd4332dd7652ae7",
  "acceptanceScenarios": [
    "Settings and other local sessions can register projects without taking ownership, and the owner sees changes on its next command.",
    "Fresh atomic registry edits share a lock with task admission, preserving unrelated entries and preventing removal or replacement races.",
    "Unfinished tasks, pending copies, unsafe replacements and unreadable task references still prevent destructive registration changes.",
    "Work control remains owner-only, and refusals identify the crew home and controlling terminal rather than imply a busy project folder.",
    "Dotted project names survive dispatch, backlog forwarding, status and plain or pooled copies while task-based branch naming remains unchanged.",
    "Invalid names explain their violated rule, and the README identifies the separate Herdr name-derivation and list-parser follow-up."
  ],
  "archiveDigest": "0c2cf77fdeca41c8e55c7bfa5e78b4a12c6ca426f2e56f5768e21494842a1131",
  "specDigest": "f404a179891ab2be1daa6129833abe78fe274af290e0a8b09b6bd0acad08668d",
  "tasksDigest": "54e135d2e3d0deccdd1f2669e866cfe9f833174ac7c59bcc2911b8df164ef539",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
