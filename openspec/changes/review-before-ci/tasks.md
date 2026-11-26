# Tasks

## 1. Approval coverage retains reviewed history across permitted delivery commits

- [ ] 1.1 Retain approved-head evidence separately from the latest verdict, with legacy APPROVE fallback; verify later tells and CHANGES NEEDED do not erase the earlier approval.
- [ ] 1.2 Implement approvalCovers with ancestry, trusted App author/committer identity, exact change-path finalization and clean base-merge tree proof; cover equal heads, finalize/refinalize, clean merge, human commits, spoofed identity, wrong paths, hand-edited/conflicting merges and unavailable evidence in fake-GitHub/local-Git fixtures.
- [ ] 1.3 Apply coverage to verdict/check freshness without fabricating CHANGES NEEDED; fixtures must distinguish covered approval, descendant delta needed and force-pushed full review.
- [ ] 1.4 Document approval coverage, explicit App trust configuration and conservative unavailable-evidence behavior in README; compare documented results with the coverage fixtures.

## 2. Review readiness and ship waits enforce checked handoffs with one automatic repair

- [ ] 2.1 Add exact-PR/head/outcome/check evidence reduction and reviewReadiness while preserving clean PR-head fast-forward; fixtures must cover missing/unticked outcomes, dirty/unpushed/ahead/diverged copies, closed or unreadable PRs, and valid draft/ready heads.
- [ ] 2.2 Normalize latest non-cancelled current-head light checks and add review --force with exit-6 diagnostics; fixtures must cover pending/failed/missing checks, cancelled duplicates, older-head successes, malformed data, ready-PR heavy failures and forced bypass without destructive Git updates.
- [ ] 2.3 Extend wait for implementation reports and approved/landed PR checks using durable one-follow-up evidence; fixtures must prove ready-for-review settlement, first-failure tell with check/link, same-failure deduplication across waits and exit 7 on a failed repair handoff.
- [ ] 2.4 Preserve owner/no-fallback/send-failure/same-worker race protections and existing scout/Plan/reviewer/gate/plain-no-CI settlement; fixtures must assert no unauthorized messages and unchanged timeout/recovery behavior.
- [ ] 2.5 Update README help examples and readiness/wait exit-code descriptions; verify help and fixture output agree and status/fleet remain read-only.

## 3. Delta reviewer briefs require full-head local build and test evidence

- [ ] 3.1 Save automatic delta/full mode, approved base, fixed head and explicit unapproved commit list in reviewer evidence; fixtures must show human/spec changes remain visible while only individually verified permitted delivery commits are excluded.
- [ ] 3.2 Replace optional-test and verdict-only reviewer instructions with fixed-head checkout, project build/full-suite once, exact first-line verdict, findings and a short What I checked section; generated-brief fixtures must assert commands/results are requested even on APPROVE.
- [ ] 3.3 Add ship-brief build/full-suite command-and-result duty and document full versus delta review in README; fixtures must retain scratch/shutdown instructions and show delta APPROVE advances the approved head.

## 4. Plain land publishes follow-up commits to the existing open pull request

- [ ] 4.1 Route existing plain PRs through reported/clean-copy and exact open-PR identity checks, then ordinary push without creating another PR; local-remote/fake-GitHub fixtures must prove the remote head advances and the URL is unchanged.
- [ ] 4.2 Retain no-op idempotency and guarded merged cleanup while refusing dirty, wrong-identity, closed, divergent and failed-publication cases; fixtures must assert no force-push, duplicate PR or workflow/gate push.
- [ ] 4.3 Refresh coverage after publication and document repair land in README; fixtures must show new human commits require delta review and an unchanged covered head stays approved.

## 5. One role table drives immediate Approved and Build transitions without a CI-wait state

- [ ] 5.1 Centralize stable role keys, fallback names and aliases for Build/Review/Approved; manifest fixtures must prove today's names and a future Build rename work across every relevant hook without adding a fourth role.
- [ ] 5.2 Select Review on start, Approved immediately for covered APPROVE and Build on CHANGES NEEDED, successful follow-up/relaunch or proven non-covered commits; fixtures must assert CI-pending approval is Approved and stale evidence is never rewritten as a negative verdict.
- [ ] 5.3 Preserve opt-out, bounded manifest fallback, aliases, unrelated labels, removal-before-add, closed/merged no-writes and abandonment/concurrency safeguards; rerun existing label fixtures and add unavailable-head/covered-bot regression cases.
- [ ] 5.4 Update README label lifecycle descriptions to distinguish approval from checks and retain later-task boundaries; validate the OpenSpec change and final PR body, with no dispatch/chip/workflow changes in the diff.

## Workflow follow-up

- Run `node --test scripts/ci-required.test.mjs` and `node crew.test.mjs` once on the implementation handoff head and record commands/results; there is no separate build step for this dependency-free Node CLI.
- Push completed outcomes individually with their tasks and README changes, updating the matching PR checkbox after each push.
- At implementation handoff, preserve the delivery bot's finalization commit and report only after every check on the final head passes. Do not mark ready or merge.
- Bot dispatch after APPROVE, shared default promotion gating, shared label rename and Herdr terminal/chip integration are separate later tasks.
