# Tasks

## 1. Project names may start with one dot followed by a lowercase letter or digit

- [ ] 1.1 Relax the start check in `projectNameError` to `/^\.?[a-z0-9]/` with the message "start with a lowercase ASCII letter or digit, or one dot followed by one"; keep the length, character-set, consecutive-dot and trailing-dot checks.
- [ ] 1.2 In `crew.test.mjs`, accept `.bad`, `.a` and `.xrbuild`; refuse `.`, `..a`, `.-a` and `.A` with the specific reason on every command that takes a project name.
- [ ] 1.3 Add an end-to-end test: `project add .xrbuild`, `project list`, `spawn --project .xrbuild` and `project remove .xrbuild`, showing branch and working-copy names do not contain the project name.

## 2. README states the leading-dot project name rule with an example

- [ ] 2.1 Update the README name rule and add the example `crew project add .xrbuild D:/Git/xrbuild/.xrbuild`.
