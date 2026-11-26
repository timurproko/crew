# Read-only PR discovery

`crew status --json --discover-prs` adds an opt-in discovery overlay. `--all` includes
closed tasks just as in ordinary status. Without `--json`, the discovery flag is a usage
error. Ordinary status performs no GitHub or remote Git reads and no terminal-label
writes. Full JSON task rows additionally expose saved `reviewRound` and `lastFinding`:
ships/fixers default to 1/null, scouts/reviewers to null/null. These fields survive
terminal loss and are not derived from reports during status. Fleet v1 is unchanged.

## Version 1 JSON contract

The existing status object gains `prDiscovery: {"version": 1}`. Every returned task gains
`prDiscovery` with all four fields shown below. Existing field values stay unchanged;
`tasks[].pr` is still the value recorded by done/land, not a discovered link.

```json
{
  "prDiscovery": { "version": 1 },
  "tasks": [
    {
      "id": "draft",
      "pr": null,
      "prDiscovery": {
        "status": "known",
        "url": "https://github.com/acme/demo/pull/12",
        "source": "github",
        "reason": null
      }
    }
  ]
}
```

This is an excerpt; ordinary home, owner, task and copy-return fields are retained.

| status | url | source | reason |
| --- | --- | --- | --- |
| `known` | Canonical HTTPS GitHub PR URL | `recorded` or `github` | null |
| `none` | null | null | null |
| `unavailable` | null | null | Nonempty reason code |

In legacy status, a valid recorded PR wins without any Git/GitHub lookup, even if the copy is gone. Fleet's closed-PR verification exception is described below. Its
URL is normalized to `https://github.com/<owner>/<repo>/pull/<positive-number>` with
query, fragment and trailing slash removed. An invalid recorded link is unavailable,
not replaced by a lookup. Known network results use the canonical repository identity
returned by GitHub. Non-ship tasks without recorded PRs return none without lookups.
For a ship, none means a successful exact lookup found no PR at that time; it does not
promise that a PR will not appear later.

Consumers must check the top-level discovery version. Missing or unknown versions mean
unsupported discovery, never confirmed none. Existing consumers can continue reading
stored `tasks[].pr` without changes.

## Exact identity and delivery behavior

The same rules apply to workflow, no-mistakes gate and plain ships. Discovery requires
an explicit recorded branch and worktree, verifies that the copy is a repository root
in the registered project's Git common directory, and checks that its symbolic HEAD is
exactly that branch. Missing, detached, foreign or reused copies fail closed. Legacy
records without an explicit branch are unavailable; no branch name is invented.

The copy and project must agree on `origin`. Supported origins are HTTPS GitHub URLs,
`git@github.com:owner/repo.git` and `ssh://git@github.com/owner/repo.git`. SSH Host
aliases are supported when local `ssh -G` resolves their hostname to github.com.
Unresolved aliases and other hosts/protocols/port forms are unavailable. There is no
GitHub Enterprise support in v1. Local repositories remain perfectly usable with Crew,
but cannot provide GitHub PR discovery.

Crew resolves that explicit origin's canonical GitHub repository, then queries only its
exact head owner/branch, including drafts and all PR states. Head branch, head repository,
base repository, URL and PR number must agree. Fork heads, malformed responses or more
than one candidate produce unavailable. A reused branch with several historical PRs is
not resolved by guessing the newest. No reports, transcripts, footer badges, other
tasks' branches, repository-wide inventories, fetches or pushes are used.

Discovery is read-only toward GitHub for owners and non-owners. It does not set the
authoritative task `pr`, stages, report completion or landing, claim ownership, trigger
recovery, or write Git state. It may save verified observations separately in `task.json`
as `prFacts`: version 1, canonical `url`, `state` (`OPEN`, `MERGED`, `CLOSED`, `NOT_FOUND` or null),
`mergedAt`, `closedAt`, and `observedAt`. The terminal `NOT_FOUND` state records only proven absence, not a generic 404. These facts are not delivery authority. As a narrow local side effect, saving a verified
observation for a non-closed task may publish `crew.pr` and saved ship review context to
its recorded current terminal. Each Core label call is bounded to two seconds, outside
the task-state transaction, without retries. An ended terminal or unavailable Core emits
one warning line on stderr but does not fail status or contaminate JSON stdout. No
terminal is inferred from a branch, working copy or matching labels, and GitHub labels
are never changed. In particular, discovering a draft does not let plain land bypass its reported-worker and
clean-copy checks or turn a workflow plan into implementation. `crew done` and `crew
land` retain their existing authority.

## Bounds and failures

Added subprocess reads are serial, with at most two seconds per process, a one-MiB
combined stdout/stderr acceptance limit, and a ten-second shared monotonic discovery
budget. Timeouts kill the child; Crew does not retry. Repository resolutions are cached
only within one invocation, not written to disk. Verified PR observations are durable:
the existing discovery response supplies lifecycle facts without another request. Existing
land/finish PR reads also save state and timestamps when available, including the
existing approval-freshness GET used by first and repeated plain land. REST observations
use the validated web `html_url`, never the API `url`; GraphQL/CLI `url` is already a web
URL. Complete recorded wire responses and endpoint provenance live in
[the GitHub fixtures](fixtures/github/README.md). Observation updates
preserve current task lifecycle fields and do not change `updated`; cache-write failures
never fail status. Observation saves never wait for a task lock, skip when lifecycle work
is pending, and abandon Windows sharing-error replacement retries so lifecycle commands
take priority. An already-started atomic replacement cannot be preempted: lifecycle
writers normally allow two seconds total to acquire their intent/task locks, covering the
supported one-second replacement retry window plus scheduling margin. `crew done` allows
30 seconds so a replacement worker can report while relaunch is still publishing its terminal. Exhausted contention returns
retryable exit 6 with `task-busy:` rather than an internal-error exit 70; locks are never
stolen. Retry after the writer finishes, and do not remove a lock while its writer may
still be running. Missing/failed reads do not invent closure or erase usable facts.
Legacy discovery still skips recorded PRs; fleet may verify eligible closed-task links
within the limits below. Unknown or unreachable state never manufactures a terminal fact. Facts apply only to their PR URL,
never to a different recorded PR; a newer verified open observation clears old closure.
GitHub event timestamps, not task age or observation time, determine fleet expiration. Remaining eligible tasks become
unavailable/budget-exhausted when the deadline expires; recorded-link and non-ship
classification needs no subprocess. This bounds added discovery, not the pre-existing
Core/status projection or the consumer's transport. A caller's own overall timeout can
still expire; do not treat that as an empty list or retry it indefinitely.

A lookup failure does not fail an otherwise valid status command. Reasons are codes,
not raw stderr, credentials, report text or paths:

| reason | Meaning |
| --- | --- |
| `missing-identity` | Recorded branch, worktree or registered project path is missing |
| `worktree-unavailable` | Copy/project/Git read is unavailable or the branch ref is invalid |
| `branch-mismatch` | Copy is detached or checked out on another branch |
| `repository-mismatch` | Copy root, project Git directory or origins disagree |
| `unsupported-remote` | No origin, unsupported origin, or unresolved non-GitHub SSH host |
| `github-unavailable` | GitHub CLI, authentication or request failed |
| `invalid-response` | Malformed, oversized or identity-mismatching response |
| `ambiguous-pr` | More than one exact PR candidate exists |
| `invalid-recorded-pr` | Recorded PR is not an accepted GitHub PR URL |
| `timeout` | An added subprocess exceeded its time limit |
| `budget-exhausted` | Shared discovery budget expired |

Large homes can be incomplete by design. Consumers should preserve unavailable status
and refresh deliberately through their existing bounded refresh lifecycle, not launch
unbounded parallel queries or retries to fill gaps.

## Fleet view version 1

`crew status --json --view fleet [--discover-prs]` uses the same version-1 discovery
objects but a separate exact projection. Root keys are `home`, `owner`, `tasks`,
`prDiscovery` (`{"version":1}`), and `view` (`{"name":"fleet","version":1}`). Owner is
null or exactly `terminal`/`live`; tasks contain exactly `id`, `state`, `terminal`, `pr`
and `prDiscovery`. Missing terminal and recorded PR values are null. No launch, standby,
fallback, core, recovery, error, elapsed, report or copy-return details are emitted.

Every state except `closed` is retained. A closed task needs a recorded or verified
saved/current discovered PR. Its age is irrelevant: open and unknown PR states stay;
MERGED expires strictly more than 24 hours after valid GitHub mergedAt, CLOSED after
closedAt. Exactly 24 hours, unknown/invalid/future event times, and failed reads do not
expire a PR. Proven NOT_FOUND expires a closed task immediately, with no time window;
recorded URLs are not modified. Facts for another recorded URL cannot expire it. Closed scouts/reviews
without PRs are omitted, and `--all` does not override this view's retention.

Without discovery, root/per-task discovery fields are still present and use saved facts
only. Valid recorded links are known/recorded; saved discovered links are known/github.
Unlinked non-ships are none and unobserved ships are unavailable with `not-requested`.
With discovery, eligible unrecorded ships use the same exact lookup; a saved link remains
known when refresh is unavailable or no longer finds its returned copy's branch. Newly
learned lifecycle facts affect filtering on the current call as well as later offline
calls. The only additional reads are eligible closed-task recorded-PR verifications:
at most five single GraphQL requests per poll, serial, each within two seconds and the
same ten-second shared deadline. Existing discovery has first use of that budget. Unknown
facts are eligible; known-open facts refresh no sooner than ten minutes after their last
successful observation. Other terminal facts are not re-verified. Live tasks, offline fleet
and legacy status add no verification requests. A best-effort per-home cursor rotates
attempts across failures; it also persists open-check cooldowns, including failed open
refresh attempts or a successful check whose task-fact save yielded to lifecycle work.
Unqueried tasks simply wait for later polls.

Each proof query uses the same credentials to read the repository's canonical identity,
its PR connection and the exact recorded PR number. A null PR is authoritative only if
repository identity and PR-read access are established, with no errors except NOT_FOUND
at that exact PR field. Generic HTTP 404, inaccessible repository or PR connection,
permission/authentication/rate-limit failures and malformed responses remain unknown.
Successful facts are stored as usual; NOT_FOUND is terminal and excludes closed tasks on
the same call and future offline polls. Live tasks remain included even if another
lifecycle read learned absence. Land and finish replace their existing exact-PR reads
with the same proof query where applicable; finish uses an exact URL for branch proof
only when the supported project origin matches that URL's repository, otherwise retaining
its existing project-context branch lookup. Missing or foreign PRs never authorize branch deletion.

Fleet never reads task prose or copy-return state. The home owner's liveness is still
checked. The sole worker-probe exception is a task with the exact older wait/relaunch
terminal-ended failure: Core may prove one live worker with the same task/home labels
and working-copy root, yielding a working view with its current terminal. Ambiguous or
unanswered checks retain the failure. This projection does not rewrite the task; the
replacement's `crew done` persists its correct terminal. Its derived version-1 index at
`<home>/state/status-fleet-index.json` stores only small state summaries. Every invocation
checks task IDs and file identity/size/mtime/ctime, reloading changed source files; deleted
or unreadable sources cannot be resurrected by an old summary. Missing/invalid indexes
rebuild from state files and cache-write failure falls back to state reads. Initial
rebuild can exceed indexed polling time; optional network discovery retains its existing
ten-second budget rather than claiming sub-second GitHub service time. Unbounded numbers
of still-open/unknown PRs are deliberately not truncated.

Unknown `--view` values fail with usage exit 2 and stable `unsupported-status-view:` text,
before status or discovery work. Fleet without JSON and missing view values fail usage.
Help (`crew --help` or `node crew.mjs --help`) advertises literal `--view fleet` for the
app's capability probe; this text and the complete shape are pinned by CLI tests.
Clients must validate the view marker too: older Crew may ignore unknown flags and return
legacy full status. Capability fallback may use `status --all --json --discover-prs`;
transport failures, timeouts or authentication errors are not unsupported capabilities.
Legacy status forms without --view retain their field ordering and serialized output.

## Separate Herdr adoption task

This Crew change does not edit or deploy Herdr. Its adapter seam was reviewed in merged
Herdr PR 14 (`c3d9e4d60744df32130efa2819ea25d3b591219e`), archived
`connect-fleet-space/design.md` decision 6 and the corresponding Crew plugin source.
The app must make these separate changes before early PRs appear in its coordinator
Git overview:

1. In `src/plugins/crew/plugin.js`, change `readFleetStatus` to request
   `status --json --discover-prs` through the existing bounded, read-only machine
   transport. Do not change its installed-tool routing or run setup/mutation commands.
2. In `src/plugins/crew/fleet.js`, replace/extend `recordedSource` with a bounded v1
   discovery adapter. Validate the top-level version and all four per-task fields;
   convert known `prDiscovery.url` into the existing sanitized task `pr`. Continue
   sanitizing home, owner and task id/terminal/state, and validating canonical PR URLs.
   `owner.mine` is not app authority. Never replace exact live task-terminal/home labels
   and membership checks with branch or transcript heuristics.
3. Preserve none/unavailable alongside sanitized links through `bindFleet` and
   `fleetPullContext` into the generic PR context. Replace the blanket
   `workers.some(t => t.state === 'working')` incomplete rule: any unavailable eligible
   task means possibly incomplete; a successful none means no PR was found on this read.
   Known/none are a current snapshot, not a promise of future completeness. Git/Spaces
   continue consuming generic links/discovery, not constructing Crew commands or
   parsing Crew JSON; adjust their completeness wording to reflect this richer signal.
4. Missing/unknown discovery versions must retain recorded-only compatibility and its
   existing possibly-incomplete wording. Older Crew versions that ignore the new flag
   return plain status; that same payload can go through the recorded adapter without
   another call. If a version explicitly rejects the flag, any recorded-only fallback
   must be a separate bounded capability fallback, not a retry of an authentication,
   transport or timeout failure. Never interpret unsupported discovery as none.
5. Add app adapter/transport fixtures for v1, unknown/missing versions, known/none/
   unavailable, partial budgets, canonical links, stale generations and unchanged
   owner/task-terminal binding. Retain the existing 15-second transport failure
   behavior, refresh coalescing, scope invalidation and payload limits. Do not change
   polling cadence, enroll webhooks, or expand CI-fix authority.

Until that separate task ships, Herdr continues reading stored `tasks[].pr` and can
still omit a worker's first draft PR. No app consumer change is implied by upgrading
Crew alone.
