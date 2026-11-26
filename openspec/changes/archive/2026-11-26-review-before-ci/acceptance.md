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
  "archiveDigest": "6fd8c4d5ce32118f007b8bca29c3f7831feca4ff829b7d95abb06f5d6c83301c",
  "specDigest": "e4580ac884fd8c631d680ec5696976f2acdfd25b6e907c8a78634e8121f6711a",
  "tasksDigest": "daece1f7e98fdfb21f9338089e1830ea219986e0d22dc3fad9becfc8526e5c52",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
