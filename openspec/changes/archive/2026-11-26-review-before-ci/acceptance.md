# Conditional implementation acceptance

Verdict: accepted only when an authorized human directly merges the containing exact pull-request head after required current-head validation, explicitly asks the active agent to execute that protected exact-head merge while it is currently eligible, or personally enables native auto-merge for the unchanged head and GitHub integrates it after validation succeeds.

The maintainer integration decision accepts these scenarios:
- Covered delivery finalization and clean base merges preserve approval; new work gets delta review and rewritten approved history gets full review.
- Review starts after the worker reports without checking CI or outcome ticks; reported-task wait returns without check polling or failed-check messages.
- Worker and reviewer briefs request targeted tests only, immediate worker reporting and classified findings with What I checked even on approval.
- Installed coordinator instructions combine CI failures and blockers, queue follow-ups, escalate after two failing rounds and start new tasks for new scope.
- Plain land publishes repairs to the existing open pull request with an ordinary push and no duplicate creation.
- Covered approval sets the advisory Approved label immediately; merge readiness additionally requires successful required checks.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/crew",
  "change": "review-before-ci",
  "sourcePr": 21,
  "archive": "openspec/changes/archive/2026-11-26-review-before-ci/",
  "acceptanceManifest": "openspec/changes/archive/2026-11-26-review-before-ci/acceptance.md",
  "finalizedDate": "2026-11-26",
  "specBaseSha": "73ee0136ca1d76c15efaf31ffa1520c7528efbf0",
  "acceptanceScenarios": [
    "Covered delivery finalization and clean base merges preserve approval; new work gets delta review and rewritten approved history gets full review.",
    "Review starts after the worker reports without checking CI or outcome ticks; reported-task wait returns without check polling or failed-check messages.",
    "Worker and reviewer briefs request targeted tests only, immediate worker reporting and classified findings with What I checked even on approval.",
    "Installed coordinator instructions combine CI failures and blockers, queue follow-ups, escalate after two failing rounds and start new tasks for new scope.",
    "Plain land publishes repairs to the existing open pull request with an ordinary push and no duplicate creation.",
    "Covered approval sets the advisory Approved label immediately; merge readiness additionally requires successful required checks."
  ],
  "archiveDigest": "abfc4a31f86b6c5772e576fc3dfaa4809b7939e3e260636a33fbb9b32efb2410",
  "specDigest": "e4f865a8c8b76315f6027d93bb1f75b66a7faa16a79f77ea76015f249c7c47d1",
  "tasksDigest": "3def4c4339089c52e293d6279c440fb65c63724f374a816f4a3e4e835780c486",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
