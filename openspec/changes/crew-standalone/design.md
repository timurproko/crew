# Design

## Context

See proposal.md for motivation. The copy has root-level `crew.mjs`, `crew.test.mjs`, README, launchers and docs, but `TOOL_ROOT` resolves the script's parent, self-repair filters for `crew/`, and repair fixtures copy the project into a nested source folder. The launchers already point at `../crew.mjs` and need no layout compatibility layer.

The reference is xrbuild's local and live `.github/workflows/ci.yml`, OpenSpec config and live `protect-main` ruleset. OpenSpec was initialized for this plan with `delivery openspec init --tools none`; the shared CLI currently reports 2.1.0. Three concise baseline specs cover existing behavior; the delta changes only tool maintenance.

## Goals / Non-Goals

**Goals:** one root layout, unchanged repair safety boundaries, dependency-free development, proportionate specifications, and the same shared automation integration points as xrbuild.

**Non-Goals:** former source-layout compatibility, changes to crew's supported home migrations or existing task branch names, orchestration redesign, runtime dependencies, editing reference checkouts or MyWorkflows, or changing GitHub settings. Keep repository-specific delivery instructions out of documentation; shared instructions come only from the managed template.

## Decisions

### 1. Resolve the source folder directly

Default `TOOL_ROOT` to `HERE`, preserving the explicit override. Audit `installedCopy`, clone detection including worktree `.git` files, update/rollback and crash-root output. Change fixer prose, self-repair default suite and changed-file checks to root-relative paths using `repairFile` directly. Keep `.github/`, agent instructions, package metadata, scripts, license, ignore/attribute files and OpenSpec infrastructure outside the repair allowlist; the root README is now explicitly allowed.

Replace nested fixtures and PATH expectations with actual root-layout repositories. Add regressions for default root detection, the override, root README acceptance, infrastructure and old nested-path rejection, installed updates and developer worktrees. Do not indiscriminately replace `crew/`: home paths, remote URLs and historical task branch names are not source-layout assumptions.

A dual-layout detector was rejected because the requested move is one-time and root-only.

### 2. Keep project metadata minimal

README opens with crew as its own project, gives clone/install and development commands, Node 20+, Git and no npm dependencies. Include one explicit origin sentence naming the MIT Firstmate upstream and compatibility with its tools; remove repeated fork framing while keeping genuine historical facts as history. Preserve `docs/plan.md` with corrected references and historical framing, and delete `gaps-and-docs-plan.md` and `layout-and-selfrepair-plan.md`.

Add the full MIT license with copyright 2026 Timur Proko; private ESM package metadata with Node >=20 and only the requested test/prepare scripts; ignore `.worktrees/`, `.artifacts/` and `node_modules/`. Preserve all three existing attribute rules. No installation or lockfile is needed.

### 3. Reuse the shared integration and xrbuild's readiness shape

Generate instructions only with `delivery instructions --apply`. Copy the caller and bootstrap templates byte-for-byte. Use `.github/workflows/tests.yml` with xrbuild-style pull-request events, main pushes, read-only permissions and PR concurrency cancellation. A lightweight readiness job excludes drafts from suites; shared OpenSpec validation may run on drafts as in xrbuild. The Windows/Ubuntu matrix runs the full suite on ready heads and main pushes, without path filtering that could skip crew validation.

Use a single aggregate job named exactly `CI required`, depending on readiness, OpenSpec and the test matrix. It runs with `always()` only for non-drafts/main and requires every expected dependency to succeed, so cancellation, failure or an unexpected skip cannot count as success. The name replaces `Crew tests` from the original brief. No unrelated xrbuild native lanes, package installs or dependencies are copied.

Use Node 20 for crew's matrix to exercise the advertised minimum and Node 24 for the OpenSpec job as in xrbuild; the shared action resolves its CLI version from MyWorkflows rather than a crew dependency. Configure deterministic Git identity and `init.defaultBranch=main` on the runner. Inspection found ordinary fixture commits supply `-c user.name`/`user.email` and repair clones configure identity themselves; the global job identity is defensive for implicit Git operations, not a credential requirement. CLI local clones need no special file-protocol opt-in; no network GitHub credentials, real Core or optional developer tools are required. Recheck this through a clean-config local run during implementation.

### 4. Keep specifications small and separate baseline from delta

Use `schema: spec-driven` without local skill copies or an OpenSpec dependency. Baseline capabilities are task orchestration, worker dispatch, and tool maintenance, each with three requirements derived from existing README sections. This change's delta adds root execution and modifies the existing guarded-repair requirement. CI uses `timurproko/MyWorkflows/actions/openspec@main`, not a local version pin. Shared instructions remain unchanged and the PR Automation block links `crew-standalone`.

### 5. Validate installed layout without touching the real home

After implementation, run the broad suite once with timing and retain its log in ignored `.artifacts/`. Clone the committed branch into `<scratch>/core` within `.artifacts/`, and set both HOME and USERPROFILE to a scratch user plus a temporary CREW_HOME before running version, `home --ensure` and update. Keep `<scratch>` as that fake user's `.crew` so the clone is recognized as an installed copy without a root override.

Because the real origin's main will not yet contain this branch, first record the safe refusal of update against older real main if applicable. Then point only the throwaway clone at an isolated local bare remote with main set to the implemented revision, exercise an up-to-date update and a fast-forward to a harmless newer fixture commit, and inspect the previous revision/crash root as appropriate. Never advance the project's published main to make the smoke test pass. Record observed outputs and elapsed suite time, not inferred success.

## Risks / Trade-offs

- Root-only operation breaks the former nested install by design → update all current fixtures and prose, without adding fallback discovery.
- Copying the entire working directory into repair fixtures could include Git metadata or nested artifacts after project adoption → explicitly copy tool-owned root files and directories, not the complete checkout.
- Draft CI must not masquerade as a merge gate → no aggregate on drafts, strict aggregate dependency results on ready/main runs.
- The first caller is not yet on main and the bot is not configured → local validation cannot establish live promotion or finalization; report these as unverified.
- Windows test success does not prove Ubuntu portability → use both hosted runners and avoid claiming a local Linux run.
- User-home overrides alone can be insufficient on Windows → override HOME and USERPROFILE as well as CREW_HOME; keep all runtime state in scratch.

## Migration Plan

No home/task data migration is introduced. Only repository source layout changes. Existing developer checkouts require no dependency installation. Installed-copy update/rollback safeguards remain in force; the new standalone repository does not preserve the former fork's history, and changing existing installation remotes is outside this change.

GitHub prerequisites are a separate owner action: give the delivery App access, set `DELIVERY_BOT_APP_ID` and `DELIVERY_BOT_PRIVATE_KEY`, declare crew's protection entry in MyWorkflows with `CI required` and shared delivery checks plus caller workflow events, and apply it with `delivery protect`. Match xrbuild's squash-only/linear main rules and branch deletion setting as confirmed read-only; do not change them here. The plan and implementation stay draft until the owner-controlled setup permits the intended automation.
