# Conditional implementation acceptance

Verdict: accepted only when an authorized human directly merges the containing exact pull-request head after required current-head validation, explicitly asks the active agent to execute that protected exact-head merge while it is currently eligible, or personally enables native auto-merge for the unchanged head and GitHub integrates it after validation succeeds.

The maintainer integration decision accepts these scenarios:
- Owner-session identity is recorded at start and refreshed from verified metadata; non-Claude, unlisted and unverifiable coordinators use global dispatch with an explanation.
- Matching sections resolve project, role and rule choices internally, reject malformed sections, and keep each configured profile one candidate without implicit saved-login or global fallbacks.
- Quota loss, worker crashes and unflagged relaunch stay within saved candidates; singleton exhaustion explains why nobody can take the work and preserves the copy.
- Agents text and JSON identify the coordinator and selected policy, and the README includes the exact requested two-section example and override behavior.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/crew",
  "change": "dispatch-by-coordinator",
  "sourcePr": 15,
  "archive": "openspec/changes/archive/2026-11-25-dispatch-by-coordinator/",
  "acceptanceManifest": "openspec/changes/archive/2026-11-25-dispatch-by-coordinator/acceptance.md",
  "finalizedDate": "2026-11-25",
  "specBaseSha": "2175750ea2fbfb054943d6f851e53326256af8af",
  "acceptanceScenarios": [
    "Owner-session identity is recorded at start and refreshed from verified metadata; non-Claude, unlisted and unverifiable coordinators use global dispatch with an explanation.",
    "Matching sections resolve project, role and rule choices internally, reject malformed sections, and keep each configured profile one candidate without implicit saved-login or global fallbacks.",
    "Quota loss, worker crashes and unflagged relaunch stay within saved candidates; singleton exhaustion explains why nobody can take the work and preserves the copy.",
    "Agents text and JSON identify the coordinator and selected policy, and the README includes the exact requested two-section example and override behavior."
  ],
  "archiveDigest": "6fb3665d72e8fa859b8e3ce97ec9e38ed3c322ce254bec3b1eb626a7d8391f4f",
  "specDigest": "1d239db1431c83676bcd5a63efcab4b236c944d9a0c12d382e9f407a5ad34cab",
  "tasksDigest": "4d6105763d7eddf4dd1e5e5dcc5348d671187e783eefdf32c14d58445ceaf50f",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
