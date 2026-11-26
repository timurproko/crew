# Conditional implementation acceptance

Verdict: accepted only when an authorized human directly merges the containing exact pull-request head after required current-head validation, explicitly asks the active agent to execute that protected exact-head merge while it is currently eligible, or personally enables native auto-merge for the unchanged head and GitHub integrates it after validation succeeds.

The maintainer integration decision accepts these scenarios:
- Covered delivery finalization and clean base merges preserve approval; new work gets delta review and replaced history gets full review.
- Premature review exits 6; ship wait reports readiness, sends one failed-check repair message and escalates another failure.
- Code and test handoffs require local build and full-suite results; documents-only and planning-only handoffs explicitly need no test run.
- Reviewer reports keep exact verdicts, findings and a short What I checked section even on approval.
- Plain land publishes repairs to the existing open pull request without force or duplicate creation.
- Approved is immediate and independent of CI; stable manifest roles preserve opt-out, aliases, unrelated labels and closed-PR safeguards.

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
    "Covered delivery finalization and clean base merges preserve approval; new work gets delta review and replaced history gets full review.",
    "Premature review exits 6; ship wait reports readiness, sends one failed-check repair message and escalates another failure.",
    "Code and test handoffs require local build and full-suite results; documents-only and planning-only handoffs explicitly need no test run.",
    "Reviewer reports keep exact verdicts, findings and a short What I checked section even on approval.",
    "Plain land publishes repairs to the existing open pull request without force or duplicate creation.",
    "Approved is immediate and independent of CI; stable manifest roles preserve opt-out, aliases, unrelated labels and closed-PR safeguards."
  ],
  "archiveDigest": "adb8961a47a20cdcd670e5d84861f464474ead1a616bfb0c055ee7c9165c73a7",
  "specDigest": "b6d476339efc7cab635518c0dd39c61da0567e4320167a405bae2442472ead67",
  "tasksDigest": "8e6acadb6fb38279ecc6fa05fa069049ece8dd14f6d26460cbc33d7d3aefcfe2",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
