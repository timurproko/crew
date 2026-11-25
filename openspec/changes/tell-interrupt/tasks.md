# Tasks

## 1. Explicit urgent tells interrupt before delivery while ordinary tells remain queued

- [ ] 1.1 Add standalone `--interrupt` parsing and a literal `--` separator to tell; focused cases cover missing arguments, literal message text and unchanged ordinary delivery.
- [ ] 1.2 Add the bounded Core interrupt-before-send path for matching working agents and idle/done bypass; fake-Core cases assert one Esc interrupt, readiness recheck and delivery to the same terminal in that order.
- [ ] 1.3 Add a focused tell-test entry point in `crew.test.mjs` or an equivalent isolated fixture; its targeted invocation covers A1 plus recognized Pi/Claude status handling without executing the full suite.
- [ ] 1.4 Update help, README and generated coordinator guidance with the urgent command and normal queued behavior; focused assertions check the advertised syntax and example.

## 2. Urgent delivery failures preserve task authority and explain cancellation limits

- [ ] 2.1 Refuse unsupported, blocked, unavailable and unconfirmed targets without escalation; focused tests cover malformed results, still-working, unknown, exited, missing interrupt support and transport/subprocess timeouts with no send, forced keys, kill or relaunch.
- [ ] 2.2 Recheck worker identity and eligibility after interrupt and guard short task updates and conditional failure restoration; focused races cover a fast report, closure, worker replacement and failed send without overwriting newer state.
- [ ] 2.3 Preserve successful reopening, one follow-up count, complete-report instructions and review invalidation; targeted cases check unchanged pre-send refusal state and successful reported-task reopening.
- [ ] 2.4 Document partial tool side effects, existing queued input, no rollback or model-processing guarantee, and inspection before retrying ambiguous failures; targeted output assertions distinguish interruption failure from delivery failure after cancellation.
- [ ] 2.5 Exercise a disposable A1 worker with a harmless long-running tool and urgent correction, if available; record observed cancellation before the original timeout, preserved session identity and rewritten report, or explicitly record the live-evidence gap. Use only focused local checks; leave full integration coverage to CI.
