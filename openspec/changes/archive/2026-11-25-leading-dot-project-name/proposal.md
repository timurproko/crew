# Proposal

## Why

A repository can hold a dot folder such as `D:/Git/xrbuild/.xrbuild` next to the project `xrbuild`. Crew refuses `.xrbuild` as a project name because a name must start with a letter or digit, so the folder cannot be registered under its own name and clashes with `xrbuild`.

## What Changes

- A project name may start with one dot followed by a lowercase ASCII letter or digit, such as `.xrbuild`.
- The 40-character limit still counts the dot; the character set, the ban on consecutive dots and the ban on a trailing dot are unchanged, so `.`, `..a`, `.-a` and `.A` stay invalid.
- The refusal for a bad start reads "start with a lowercase ASCII letter or digit, or one dot followed by one".
- README states the rule with the example `.xrbuild`.
- No migration: every name valid today stays valid.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `task-orchestration`: the requirement "Dotted project names preserve their identity" allows one leading dot; a new requirement records that a project name never forms part of a git ref or working-copy path.

## Impact

`crew.mjs` (`projectNameError`), `crew.test.mjs`, README. Branch and working-copy names are built from task ids and repository folders, never from the project name, so a leading dot cannot reach a git ref.
