# Conditional implementation acceptance

Verdict: accepted only when an authorized human directly merges the containing exact pull-request head after required current-head validation, explicitly asks the active agent to execute that protected exact-head merge while it is currently eligible, or personally enables native auto-merge for the unchanged head and GitHub integrates it after validation succeeds.

The maintainer integration decision accepts these scenarios:
- Fleet v1 emits only home, owner terminal/live, task identity and PR discovery fields with both version markers.
- Every non-closed task remains visible; closed tasks retain open or unknown PRs, expire after 24 hours beyond a known merge or close, and exclude proven missing PRs immediately without rewriting URLs.
- Discovery and replacement land/finish reads save identity-scoped facts without granting delivery authority; ambiguous 404, permission, authentication, rate-limit or transport failures never prove absence.
- Only fleet discovery verifies closed recorded PRs, adding at most five requests inside the existing serial two-second subprocess and ten-second shared budget, with open refreshes at least ten minutes apart.
- Observation saves yield to lifecycle work; supported atomic-write contention no longer causes internal-error exit 70 and exhausted locks return retryable task-busy refusals.
- Legacy status output remains byte-compatible; unknown views exit with a stable diagnostic and help advertises the fleet capability.
- Metadata-validated summaries avoid historical prose and copy inspection; a 1000-task history produces 364 bytes and indexed 5000-task polling stays well under one second locally.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/crew",
  "change": "status-fleet-view",
  "sourcePr": 11,
  "archive": "openspec/changes/archive/2026-11-24-status-fleet-view/",
  "acceptanceManifest": "openspec/changes/archive/2026-11-24-status-fleet-view/acceptance.md",
  "finalizedDate": "2026-11-24",
  "specBaseSha": "cc327e9534b6646ddd2b47f0b581f3d588019622",
  "acceptanceScenarios": [
    "Fleet v1 emits only home, owner terminal/live, task identity and PR discovery fields with both version markers.",
    "Every non-closed task remains visible; closed tasks retain open or unknown PRs, expire after 24 hours beyond a known merge or close, and exclude proven missing PRs immediately without rewriting URLs.",
    "Discovery and replacement land/finish reads save identity-scoped facts without granting delivery authority; ambiguous 404, permission, authentication, rate-limit or transport failures never prove absence.",
    "Only fleet discovery verifies closed recorded PRs, adding at most five requests inside the existing serial two-second subprocess and ten-second shared budget, with open refreshes at least ten minutes apart.",
    "Observation saves yield to lifecycle work; supported atomic-write contention no longer causes internal-error exit 70 and exhausted locks return retryable task-busy refusals.",
    "Legacy status output remains byte-compatible; unknown views exit with a stable diagnostic and help advertises the fleet capability.",
    "Metadata-validated summaries avoid historical prose and copy inspection; a 1000-task history produces 364 bytes and indexed 5000-task polling stays well under one second locally."
  ],
  "archiveDigest": "ba4aa084f2c4b107a60adaf6624cf2665de6539431a89d2ef7df987163d76f5b",
  "specDigest": "672a4ac22c861bbb3eed49ce740e0b83096749507d143996f307c34578f9751a",
  "tasksDigest": "d1b63c5a5ee814237ddb276121bb08b6ed3e0677f046d34b55cd35f7637e50e3",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
