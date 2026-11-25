# Tasks

## 1. Every Claude worker starts in auto permission mode with the same allowed tools

- [ ] 1.1 Change `AGENTS.claude.args` to `--permission-mode auto`, keeping the `--allowedTools` list; A1 and Pi arguments unchanged.
- [ ] 1.2 Update the launch-line tests in `crew.test.mjs` (plain, account launcher, spawn) and add a hand-over/relaunch test asserting the next Claude worker also starts in auto mode.

## 2. A Claude worker that cannot use auto mode falls back to acceptEdits and says so in its start line

- [ ] 2.1 Probe `--permission-mode auto` with `--version` before a Claude launch; on failure launch with acceptEdits and add the reason to crew's start line.
- [ ] 2.2 Wrap the worker command so an early non-zero exit in auto mode prints a notice and restarts once in acceptEdits.
- [ ] 2.3 Tests with a fake `claude`: version without auto falls back with the start-line note; early refusal restarts in acceptEdits; a normal run is not restarted.

## 3. README and the coordinator AGENTS template say Claude workers run in auto mode

- [ ] 3.1 Add a line under "Who does the work" in README and in the coordinator AGENTS template, including the acceptEdits fallback.
