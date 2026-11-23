# Conditional implementation acceptance

Verdict: accepted only when an authorized human directly merges the containing exact pull-request head after required current-head validation, explicitly asks the active agent to execute that protected exact-head merge while it is currently eligible, or personally enables native auto-merge for the unchanged head and GitHub integrates it after validation succeeds.

The maintainer integration decision accepts these scenarios:
- Existing implementation PRs receive the exact shared review label before reviewer launch, without creating definitions or replacing unrelated labels.
- Either verdict and every observed review ending release activity ownership while overlapping local reviewers and newer attempts keep the label.
- GitHub signaling failures remain visible and nonblocking, with idempotent retries in acting lifecycle commands and no App key or new background process.
- Status only displays persisted pending label state and performs no label recovery, GitHub requests or metadata writes for either owners or other sessions.
- Workflow, gate and plain projects share the integration; a plain project without a PR at review time continues its branch review without labeling.
- The complete fake-Core and fake-GitHub main suite passes with merged safe project registration changes preserved.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/crew",
  "change": "review-label",
  "sourcePr": 7,
  "archive": "openspec/changes/archive/2026-11-23-review-label/",
  "acceptanceManifest": "openspec/changes/archive/2026-11-23-review-label/acceptance.md",
  "finalizedDate": "2026-11-23",
  "specBaseSha": "56499c41ede991bd059ced65d026c4131c7202f2",
  "acceptanceScenarios": [
    "Existing implementation PRs receive the exact shared review label before reviewer launch, without creating definitions or replacing unrelated labels.",
    "Either verdict and every observed review ending release activity ownership while overlapping local reviewers and newer attempts keep the label.",
    "GitHub signaling failures remain visible and nonblocking, with idempotent retries in acting lifecycle commands and no App key or new background process.",
    "Status only displays persisted pending label state and performs no label recovery, GitHub requests or metadata writes for either owners or other sessions.",
    "Workflow, gate and plain projects share the integration; a plain project without a PR at review time continues its branch review without labeling.",
    "The complete fake-Core and fake-GitHub main suite passes with merged safe project registration changes preserved."
  ],
  "archiveDigest": "43ff65a81cb115299c9802dce1ea9f19c45f03dcdd2cbc26ba20c98a481de2a9",
  "specDigest": "0282a72f713cf1241429bf9e0ca2e60d0daf040a9e3b5580296034031eb62822",
  "tasksDigest": "9a219825df7f6ae53a53081453aca920b1ca7cef814da16287bc2c12583bd58b",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
