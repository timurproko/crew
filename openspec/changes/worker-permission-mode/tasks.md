# Tasks

## 1. Crew-dispatch config accepts a home permission_mode and a per-profile permissionMode for Claude rows

- [ ] 1.1 Validate top-level and coordinator-section `permission_mode` and profile `permissionMode` against acceptEdits, auto, plan, default, manual; refuse unknown values, bypassPermissions and dontAsk with the field path and the accepted list.
- [ ] 1.2 Ignore `permissionMode` on a1 and pi rows after validating it.
- [ ] 1.3 Tests: invalid value, bypassPermissions refused, a1/pi row ignores the field.

## 2. Every Claude worker launch uses the resolved mode, including hand-over and relaunch

- [ ] 2.1 Resolve the mode per Claude candidate in the work chain (profile over section over home over acceptEdits) and save it in the task's launch and chain.
- [ ] 2.2 Pass the candidate's mode to `--permission-mode` in `agentCommand` for scout, ship, review and fix, keeping `--allowedTools` unchanged.
- [ ] 2.3 Tests: default launch line unchanged, home setting, per-profile override, hand-over to the next candidate keeps its own mode.

## 3. crew agents, README and the coordinator AGENTS template show the permission mode

- [ ] 3.1 Show a non-default mode in `crew agents` human output (via the candidate label) and as `permissionMode` in its JSON.
- [ ] 3.2 Add a line or two under "Who does the work" in README and in the coordinator AGENTS template.
- [ ] 3.3 Test: `crew agents` shows `mode auto` only when the mode is not acceptEdits.
