# Design

## Context

See proposal.md for motivation and the worker-dispatch delta for observable requirements.

Observed implementation:

- `dispatchConfig` parses default, roles, rules and projects; `workChain` resolves project-role, project-default, role, default, then applies flags and expands account-less Claude profiles into saved logins.
- `chooseWorker` saves the complete candidates, untried chain and checks. `replaceWorker` uses those saved candidates unless explicit selection flags or an old task without a chain require current configuration. Quota loss and crashed-agent recovery already use this replacement path.
- `cmdStart` currently records only terminal, start time and previous terminal in owner.json. `cmdAgents` exposes list source but no coordinator identity.

Read-only account-switcher investigation at `~/.claude/plugins-local/account-switcher`:

- `bin/claude-as.sh` exports a private `CLAUDE_CONFIG_DIR` after preparing and optionally seeding it with `--as`. The environment identifies a session directory, not its forever-current account.
- `bin/session-dir.js` writes `account-switcher-session.json` with `{email, at}`. `hooks/register.tsx` updates that marker on choice changes. It is selected intent, not proof the engine has switched.
- The plugin explicitly warns that the engine can rewrite `.claude.json` from stale memory. Its `oauthAccount.emailAddress` alone is therefore NOT authoritative.
- `hooks/register.tsx` derives live identity from login ownership and verifies the API's account. It writes non-secret `account-switcher-status.json` with `email`, `isolated`, `state`, `apiEmail`, `at` and expiry/error metadata. Verified `apiEmail` outranks file identity, including state `mismatch`.
- The same plugin reports the status-bar account through owner-terminal labels: `custom.claude.email`, `.state`, `.at`, `.session`, plus account/organization IDs. The state explicitly says `switching` during transition; unchanged labels heartbeat every 30 seconds. Switching clears previous verification; session status polls every five seconds.
- `CREW_CLAUDE_ACCOUNT` is used today as a worker launch/preference hint. It does not change when the live picker changes account, so it cannot be the identity authority.

No real account files, credentials or terminal state were read or changed in this investigation; only tracked plugin source and documentation were inspected.

## Goals / Non-Goals

**Goals:** Resolve policy from the actual owner, expose why it was selected, retain task-chain isolation and preserve old configs.

**Non-Goals:** Switch accounts, refresh tokens, query the Claude API, alter account-switcher/Herdr, change terminal ownership, migrate saved task chains, or modify finish/land/brief functions touched by PR #14. No reserved non-Claude selector in this smallest version: a1/pi use global dispatch.

## Decisions

### 1. Exact additive schema

`coordinators` is optional. Its keys are complete email account names, trimmed and normalized to lowercase for matching; invalid keys and normalization collisions are errors. No prefix matching, wildcard or unknown-account key.

Each value is an object with these supported fields only:

| Field | Shape and meaning |
| --- | --- |
| `default` | Required nonempty list of existing profiles (existing single-profile shorthand may be normalized to a list). |
| `roles` | Optional object keyed only by scout, ship, review, fix, with existing profile-list shapes. |
| `projects` | Optional project-name map, each value an existing profile list or `{default, roles}` object; `crew:self` continues to identify fix work. |
| `rules` | Optional array of existing `{when, why, use}` rules; each use must supply a nonempty profile list. Rule numbering is local to the selected section. |
| `shared_quota` | Optional boolean; when absent inherits the root flag, which affects measurement only, never candidate lists. |

Profiles retain harness/model/effort/account/floor/provider shapes and validation. Omitted or empty optional role/project lists mean no override, as today. New-section map containers must be objects, not null, arrays or strings; wrong types, unknown section/project/rule fields, invalid roles/profiles, empty rule use and nested coordinators are refused with a full config field path. Validate every section, even unselected ones. Do not tighten unrelated legacy root parsing as collateral work.

The README example will keep the person's existing global default list and add exactly:

```json
{
  "default": [
    { "harness": "a1", "model": "openai-codex/gpt-x", "effort": "high" },
    { "harness": "a1", "model": "github-copilot/gpt-x" },
    { "harness": "claude", "model": "opus" }
  ],
  "coordinators": {
    "tymur.prokopiev@ameria.com": {
      "default": [
        { "harness": "claude", "model": "claude-opus-5-5", "account": "aicoder-de13@ameria.com" }
      ]
    },
    "masha.shmakova@gmail.com": {
      "default": [
        { "harness": "a1", "model": "openai-codex/gpt-6.1-sol" }
      ]
    }
  }
}
```

Alternative rejected: copy global role/project lists into matched sections. That silently reintroduces the global fallbacks the person explicitly forbids.

### 2. Conservative owner-session identity, not a launch-account guess

Add a small identity resolver near ownership/dispatch. It returns `{terminal, harness, account, status, source, reason, configDir, observedAt}` with nullable fields and statuses known, unknown or non-claude. Persist this non-secret record under `owner.coordinator` at start while retaining existing owner fields. `configDir` comes only from the owning caller's inherited private directory, never a directory search or another terminal's environment. Do not store credentials or other login material.

At each new-chain construction and agents inspection:

1. Read the owner record. Query that terminal's current Core metadata; a positively identified a1/pi coordinator is non-Claude even if a launch environment or old Claude labels exist. Without a home owner, account is unknown; never infer ownership from the inspecting caller.
2. Only when the caller is the owner may its `CLAUDE_CONFIG_DIR` supply/update the session path. Other callers use the path previously recorded for that owner. Fresh owner-terminal plugin labels also support older owner records without a stored path.
3. Accept non-secret plugin reports no older than 60 seconds, with at most five seconds of future clock skew. Owner labels must carry a process session ID and verified state `ok` or `mismatch`; the private status file must be isolated and have verified state plus a valid `apiEmail`. This is deliberately stricter than accepting file-only status.
4. Explicit `switching` labels, or a session marker newer than a purported verified report, invalidate the earlier identity. If both usable sources agree, use the newer; if fresh verified reports disagree, return unknown rather than guessing through a transition. A verified mismatch against `.claude.json` is not itself ambiguity: API identity wins. Missing, invalid, stale, logged-out, file-only and unavailable reports cannot be rescued by a launch hint or cached owner email.
5. Re-read on every new selection; never reuse persisted account as proof. Only the owner may refresh its persisted identity record, preserving current owner terminal/since and guarding against ownership replacement; non-owner agents inspection stays read-only. Saved-chain handover does not need identity recomputation.

The strict freshness threshold tolerates one missed 30-second label heartbeat and several file polls. A just-started session without verification safely uses global dispatch until metadata confirms it. No token matching, account-store enumeration for identity, HTTP calls, session input or plugin-helper actions are needed.

Alternatives rejected: `CREW_CLAUDE_ACCOUNT` alone (stale after picker use); `.claude.json` alone (known stale engine writes); marker alone (intent before confirmation); machine default/saved account (another session's login). This plan deliberately reports unknown when only those hints are available.

### 3. Resolve a section before existing project/role precedence

Parse root policy and coordinator sections separately, then select one policy from normalized owner account. Within a match use project role, project default, section role, section default. Neither missing role/project entries nor missing rules consult global lists. Required nonempty section default prevents an accidental built-in escape. Root global resolution remains byte-for-byte equivalent in candidate meaning for unmatched/unknown/non-Claude owners and old configs.

Coordinator-scoped base profiles and rule-use profiles each become exactly one candidate, including an account-less Claude profile (one launch-default login, not every saved account). No global default or saved Claude accounts are appended. Retain existing deduplication and quota-floor ordering.

Explicit choices remain deliberate overrides, not hidden fallback: agent starts a clean profile; model/effort/account adjust the first profile; the selected base follows; rule replaces base with the selected section's rule; no-fallback slices before expansion. Preserve the current saved-account expansion behavior for an explicitly constructed account-less Claude override only, as well as legacy global profiles. The coordinator-scoped base remains unexpanded. Thus a section's written singleton alone is one candidate, while an explicit `--agent claude` can still request today's account-expanded override; `--account` names exactly one. Document that distinction rather than silently changing CLI semantics.

### 4. Inspection and diagnostics

Add an additive `coordinator` object to agents JSON: `{terminal, harness, account, status, source, reason, section}`, where section is `global` or `coordinators.<normalized-email>`. Keep existing fields; qualify final list `source` with the coordinator path only for matched sections. Rules shown are the selected section's rules. Human agents output adds one line naming account/state, evidence source, selected section and final source.

Selection commands that build a current chain give at most one identity/policy diagnostic per command when the new map is present, including `coordinator account unknown (<reason>); using global dispatch (<list source>)`. Agents always includes identity. JSON uses structured reasons, not prose on stdout. Avoid extra diagnostics on legacy mutation commands when no map exists. Explicit choices still show the underlying selected section as well as final named/rule source.

### 5. Freeze task policy for recovery

Save selection provenance on new tasks alongside existing candidates/chain. A quota stop, crash or unflagged relaunch continues using that complete saved chain and tried filtering, even if coordinator identity or config later changes. A singleton has no other candidate: reuse existing wait/relaunch nobody-can-take-work reason paths and preserve the copy. Never expand a saved profile or append a current/global list during replacement.

Flagged relaunch and pre-chain legacy tasks retain current rebuilding semantics, using the current owner-selected policy. Existing tasks without new provenance continue to use their existing saved candidates. Respect selected shared_quota settings for new policy measurement and the corresponding saved policy during replacement without changing legacy records' behavior.

### 6. Disposable tests and outcome boundaries

Extend the existing fake-Core and temporary-home fixtures, explicitly clearing inherited account/session variables. Identity fixtures contain only fake emails, status and marker JSON, never credentials. Cover stale env/config versus API identity, picker transition and confirmation, freshness, invalid JSON, owner versus inspector, older owner records, unknown/no owner and non-Claude. Assert account stores and live config cannot be touched.

Cover all four roles, project precedence and crew:self; two exact example singleton chains; case normalization; malformed unselected sections; command override/rule/no-fallback behavior; quota loss, crashed worker, unflagged and flagged relaunch; frozen chain after account change; and no-map legacy account expansion. Keep tests local and targeted before each outcome push; CI is the integration gate after eventual workflow handoff.

## Risks / Trade-offs

- Plugin metadata can lag a switch by a poll -> transitional/conflicting evidence returns unknown and uses global dispatch; next selection re-reads it. There is no atomic cross-process account/dispatch transaction.
- File-only or older plugin versions cannot prove account -> deliberately default with a reason; document the supported verified metadata instead of guessing or mutating the plugin.
- A one-profile section can leave work waiting for a person -> intentional, with the stop and exhaustion reason preserved.
- Explicit account-less overrides can expand saved logins -> preserve existing CLI semantics and clearly distinguish explicit override candidates from unexpanded configured profiles.
- Shared source/test files overlap other PRs -> limit edits to identity, dispatch, task-selection metadata and replacement plumbing; do not alter finish/land/brief or task-orchestration spec changes.

## Migration Plan

The first publication is plan-only; no implementation until approval. After approval add the feature without editing any live crew home or touching sessions. Existing configs need no migration. The person may add coordinators manually after installation; removing that key restores the legacy global policy for new work. Existing task chains remain unchanged in either direction. Roll back the binary with the normal crew mechanism if necessary; older versions ignore the added config key, so rollback documentation must warn that new work then uses global dispatch.
