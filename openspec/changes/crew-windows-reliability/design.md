# Design

## Context

See proposal.md for motivation and the requested five-issue scope. Current main is `45f543f3`.

Observed code paths:

- `cmdProjectKinds` synchronously maps projects through `projectDelivery`; `allocationSnapshot` executes synchronous Git commands. A cached origin/HEAD is trusted when present, then ls-remote reads that branch's commit. Every automatic project waits for the previous one.
- Baseline: `node crew.mjs project list --json` returned eight projects in **24.30 s**. Git Trace2 recorded seven sequential ls-remote calls totaling **12.45 s**, plus 55 other Git invocations. Remaining wall time includes local Git operations and subprocess startup, not just network delay. Evidence is outside the copy in the task folder.
- An isolated second run instrumented filesystem probes: delivery/no-mistakes discovery made **2,690 existence checks**, taking approximately **64 ms** total inside the checks. Tool discovery is repetitive but is not the dominant measured delay; it starts no subprocesses.
- The supplied local branch was fetched from `C:/Users/tprokopiev/.treehouse/core-17d230/1/core`. Its reviewed commits are `be7c5ad85bad865a87e133e57c2939e253857e2c` and `7d5cdcb9e97459f76ecba6a5547eb0c785f85e29`; together they read the advertised branch and HEAD commit with one ls-remote call and add renamed-default regression coverage. They have not been applied.
- `bin/crew.cmd` forwards `%*` through cmd.exe. `cmdSpawn` joins the argv text and cannot reconstruct lines already lost before Node starts. The POSIX launcher forwards quoted argv directly.
- `cmdSelfmerge` enforces an unconditional 15-minute suite timeout and reports a null exit as timeout without separating subprocess launch errors. Existing isolated selfrepair fixtures can simulate a suite without running the entire repository suite.
- `cmdFinish` holds the placement gate across all of `finishTask`, including `workerToStop`'s up-to-45-second reported-worker settle wait, optional label/backlog work, copy return, branch lookup and sweeps. Foreground task transactions otherwise default to a two-second gate wait. These are observed sources of contention; no live worker has been stopped to measure them.

## Goals / Non-Goals

**Goals:** Make each correction independently testable, share kind-resolution semantics between listing and admission, and preserve existing refusal and safety contracts.

**Non-Goals:** Persistent kind caching, stale-while-revalidate authority, plugin changes, a new background process, broad test-suite refactoring, weaker selfrepair validation, or allowing arbitrary concurrent terminal transitions.

## Decisions

### 1. Land the supplied published-default correction first

Integrate the two reviewed commits' source, tests and documentation in this worktree after approval. Preserve their single `ls-remote --symref origin HEAD` result for both the branch and commit. Keep missing-object retrieval bounded and without ref, index, checkout or FETCH_HEAD writes. Keep spawn on this live path for every automatic admission.

Alternative rejected: selecting cached origin/HEAD for speed. It is incorrect after a default-branch rename, even when the old branch still exists.

Focused regression: the supplied `project-kind-stale-origin-head`, plus a one-ls-remote-per-snapshot count assertion, including listing and spawn.

### 2. Parallelize listing, not admission authority

Use a bounded listing-only worker pool (up to eight workers) around the existing synchronous kind resolver, rather than duplicate its logic in an asynchronous implementation. Read and validate the registry first, discover the two relevant tools once per listing invocation, and give workers that invocation's tool snapshot. Do not cache tool availability across invocations or pass listing results into spawn. Group canonical-equivalent project folders so duplicate registrations do not race missing-object fetches in the same repository.

Collect results in registry order and emit exactly one complete v1 object. Preserve deterministic first-project refusal ordering, bounded Git reads and empty-registry behavior. Handle worker errors/exits and await all started workers before the command settles; no orphan worker or unhandled rejection may escape. Propagate the listing promise through project dispatch and the main error boundary without changing synchronous commands or their imported-main fixtures.

Alternative rejected: a disk kind cache. It adds invalidation and stale-contract complexity not needed to overlap the measured network bottleneck. A separate async resolver was also rejected because listing and spawn must not drift.

Focused regression: eight independent delayed remote reads must overlap, preserve exact output/order, make one remote advertisement per automatic repository, and retain structured errors. Prefer barrier/call-count proof over a tight flaky timing threshold. Repeat the actual eight-project baseline command after implementation; target a few seconds and report the measured result, not an estimate.

### 3. Keep multiline task input out of cmd.exe forwarding

Add a PowerShell-native `bin/crew.ps1` launcher forwarding its argument array directly to Node, with explicit exit-code propagation, and a `spawn --task-file ABSOLUTE_OR_RELATIVE_FILE` UTF-8 input option for callers that cannot guarantee argv fidelity. Resolve a relative file against the caller's cwd, reject empty/unreadable files and mixed positional/file descriptions before task/copy creation, and retain internal newlines, blank lines and Unicode in records and briefs. Existing surrounding-whitespace normalization need not become a new byte-exact contract.

Keep `crew.cmd` single-line compatibility, and document the PowerShell-native launcher or task-file route for multiline input. If the tested PowerShell command-resolution path still routes a here-string through the legacy batch shim, make that path refuse clearly or select the native launcher rather than claiming Node can detect already-missing text. Exercise the actual supported launcher, not just the parser.

Alternative rejected: reconstructing newlines with `words.join`. Missing input is unknowable after a lossy shell boundary. Merely documenting truncation without providing a safe route is insufficient.

Focused regression: a PowerShell here-string containing CRLF/LF, blank lines, Unicode, quotes and metacharacters reaches an isolated task/brief intact; task-file errors and conflicting inputs refuse without admission. Use fake Core only, not real worker launches.

### 4. Make the complete-suite deadline realistic and explicit

Keep the default command `node crew.test.mjs` and all publication gates. Increase the finite default allowance from 15 to **60 minutes**. Add `CREW_SELFTEST_TIMEOUT_SECONDS` with integer values from **1 to 7200**, rejecting invalid explicit values before invoking the suite. Read it in the parent before constructing the existing sanitized suite environment; do not leak session variables into tests.

Separate a real nonzero exit, deadline expiration and launch/output errors, with the command, deadline and useful trailing output in refusal diagnostics. None authorizes publication. Do not parallelize or omit portions of the suite to satisfy the limit.

Alternative rejected: bypassing the suite or raising every subprocess timeout globally. Only the selfrepair suite deadline changes.

Focused regression: isolated short fake suites and timeout-option inspection prove a slow pass can publish, failure/timeout cannot, and the default timeout exceeds 15 minutes. No full local suite run is needed to test the deadline policy.

### 5. Remove avoidable finish gate occupancy without a lifecycle redesign

Perform the read-only reported-worker settle wait before acquiring the home-wide placement gate. After acquiring it, reload and compare task/terminal generation and state; if follow-up or replacement changed the task, restart validation or refuse without stopping the newer worker. Under the gate, use an immediate busy check rather than repeating the whole settling interval. Do not drop the gate during actual terminal stop/removal or the existing copy-return safety boundary.

Move optional post-close advisory label/backlog work and the sweep driver outside the outer finish gate, using their existing short task transactions and a separate guarded return attempt per waiting copy. Bound opportunistic branch-proof network reads; unknown evidence retains the branch. Give foreground tell/spawn placement acquisition a bounded **10-second** brief-contention allowance, without changing observation writers' immediate yield or already-admitted launches' longer publication allowance. Settling itself may still take up to the existing allowance, but must not block unrelated work.

Alternative rejected: globally allowing minute-long lock waits, stealing live locks, or releasing the gate halfway through a terminal transition. A background cleanup service or a new persistent cleanup protocol would be disproportionate. Delivery-managed copy return can still be slow and remains serialized for safety; this plan removes the known 45-second settle monopolization and optional post-close work, not that safety boundary.

Focused regression: deterministic fake-Core barriers hold a reported worker in its settle interval while unrelated tell/spawn succeeds; same-task tell/relaunch forces fresh finish validation. Keep coverage for actual terminal-transition exclusion, foreign terminals, protected writes, late launch fencing and interrupted return. Bound-contention tests cover release within the allowance and safe timeout beyond it.

## Risks / Trade-offs

- [Worker startup and Windows Git overhead reduce ideal speedup] -> Cap concurrency, retain call-count proof, and measure actual eight-project latency after implementation. No speedup is claimed at planning time.
- [Several registered worktrees share an object database] -> Coalesce equivalent folders and serialize missing-object retrieval per Git common directory when needed, without serializing independent repositories' remote reads.
- [PowerShell execution policy or command precedence differs by host] -> Test the actual launcher and document explicit native/task-file invocation; unsupported invocation must not be advertised as lossless.
- [Finish preflight observes stale state] -> Treat it as advisory only; reload under the existing gate and compare generation, state and report/follow-up markers before mutation.
- [Optional finish effects race a later follow-up] -> Reuse current-state-checked label and task transactions; never save an old whole task over newer state.
- [A longer self-test allowance delays a genuine hang] -> Keep a finite documented default, a bounded override and distinct timeout diagnostics. A timeout never becomes a pass.

## Migration Plan

No registry or task migration. Publish the implementation through the existing update path after approval and review. Existing command/JSON consumers remain compatible; the native launcher and task-file route are additive. Rollback is the ordinary prior Crew revision; already-saved task descriptions, kinds and placement remain valid. External measurement scratch is disposable and no app/server instance is required for this plan.
