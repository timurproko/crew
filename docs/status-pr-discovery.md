# Read-only PR discovery

`crew status --json --discover-prs` adds an opt-in discovery overlay. `--all` includes
closed tasks just as in ordinary status. Without `--json`, the discovery flag is a usage
error. Ordinary `crew status` and `crew status --json` keep their existing output and
perform no GitHub or remote Git reads.

## Version 1 JSON contract

The existing status object gains `prDiscovery: {"version": 1}`. Every returned task gains
`prDiscovery` with all four fields shown below. No other existing fields change;
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

A valid recorded PR wins without any Git/GitHub lookup, even if the copy is gone. Its
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

Discovery is read-only for owners and non-owners. It does not record PRs, stages, report
completion or landing, claim ownership, trigger recovery, or write Git state. In
particular, discovering a draft does not let plain land bypass its reported-worker and
clean-copy checks or turn a workflow plan into implementation. `crew done` and `crew
land` retain their existing authority.

## Bounds and failures

Added subprocess reads are serial, with at most two seconds per process, a one-MiB
combined stdout/stderr acceptance limit, and a ten-second shared monotonic discovery
budget. Timeouts kill the child; Crew does not retry. Repository resolutions are cached
only within one invocation, not written to disk. Remaining eligible tasks become
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
