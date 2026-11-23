# Conditional implementation acceptance

Verdict: accepted only when an authorized human directly merges the containing exact pull-request head after required current-head validation, explicitly asks the active agent to execute that protected exact-head merge while it is currently eligible, or personally enables native auto-merge for the unchanged head and GitHub integrates it after validation succeeds.

The maintainer integration decision accepts these scenarios:
- Review launch and verdict label requests run only after the ordinary task state is saved and never modify task records.
- New reviews replace prior verdict labels with Under review; APPROVE and CHANGES NEEDED replace activity with their matching result label.
- Opt-out, unreadable variables and request failures print one warning without changing command outcomes; missing verdict definitions still allow activity removal.
- Malformed or missing reports and branches without implementation PRs cause no label changes, and crew never creates definitions or replaces unrelated labels.
- No retries, locks, signaling records, overlap tracking or pending-status output remain; stopped reviewers can leave activity assigned and the first overlapping verdict removes it.
- Shared merge or close cleanup removes only activity while verdict labels remain a record, and existing registry and read-only discovery behavior is preserved.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/crew",
  "change": "review-label",
  "sourcePr": 7,
  "archive": "openspec/changes/archive/2026-11-23-review-label/",
  "acceptanceManifest": "openspec/changes/archive/2026-11-23-review-label/acceptance.md",
  "finalizedDate": "2026-11-23",
  "specBaseSha": "f625c5d252d152326ece77e65eb552f8a9c174fa",
  "acceptanceScenarios": [
    "Review launch and verdict label requests run only after the ordinary task state is saved and never modify task records.",
    "New reviews replace prior verdict labels with Under review; APPROVE and CHANGES NEEDED replace activity with their matching result label.",
    "Opt-out, unreadable variables and request failures print one warning without changing command outcomes; missing verdict definitions still allow activity removal.",
    "Malformed or missing reports and branches without implementation PRs cause no label changes, and crew never creates definitions or replaces unrelated labels.",
    "No retries, locks, signaling records, overlap tracking or pending-status output remain; stopped reviewers can leave activity assigned and the first overlapping verdict removes it.",
    "Shared merge or close cleanup removes only activity while verdict labels remain a record, and existing registry and read-only discovery behavior is preserved."
  ],
  "archiveDigest": "da6138b76a9ff1230a2c4ecf6dc216245dfebaaacb5cbb7dea40697f05e2a984",
  "specDigest": "922a9b89236d9ed827c6834474ac388f4db207684d777671272bb159fbc6d7e9",
  "tasksDigest": "c65ecd11a3b103048c43f7647898be1c6809610b2ab3c2bf68d2fc37aaaa2e55",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
