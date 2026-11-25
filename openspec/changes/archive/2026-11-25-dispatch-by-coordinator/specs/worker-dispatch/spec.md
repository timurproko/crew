# Worker dispatch delta

## ADDED Requirements

### Requirement: Coordinator identity is session scoped and refreshed

Crew SHALL record non-secret coordinator identity and its readable identity source at start, bind detection to the home's owner terminal, and re-read current identity before building a new chain. Fresh API-verified switcher identity SHALL outrank launch hints and cached config identity. Unavailable, stale, transitioning or ambiguous identity SHALL be unknown, not guessed from saved logins or the caller's unrelated session.

#### Scenario: Account picker changes the coordinator login

- **WHEN** the owner switches accounts and fresh session metadata confirms the new account
- **THEN** the next new selection uses that account without requiring another crew start

#### Scenario: Launch hint and config record are stale

- **WHEN** fresh API-verified owner metadata identifies a different account than the launch environment or session config
- **THEN** selection uses the verified account rather than either stale hint

#### Scenario: Inspection comes from another terminal

- **WHEN** another session runs crew agents for an owned home
- **THEN** identity comes from the owner's session, never the inspecting session's environment

#### Scenario: Identity cannot safely be established

- **WHEN** the owner has no usable identity report, is switching, or is known to be a non-Claude coordinator
- **THEN** crew uses the existing global policy and gives one concise explanation, including an unknown-account explanation when appropriate

### Requirement: Coordinator sections own their entire dispatch policy

Crew SHALL accept an optional `coordinators` map keyed by case-insensitive account email. A matching section SHALL supply its own required nonempty default chain and optional roles, projects and rules. Resolution SHALL choose project role, project default, section role, then section default, without borrowing a global list. Unmatched accounts and configs without this map SHALL retain existing global resolution.

#### Scenario: Requested business account policy

- **WHEN** the coordinator account is tymur.prokopiev@ameria.com and its section has only Claude Code claude-opus-5-5 as aicoder-de13@ameria.com
- **THEN** scout, ship, review and fix use exactly that profile unless the section or explicit flags select another list

#### Scenario: Requested personal account policy

- **WHEN** the coordinator account is masha.shmakova@gmail.com and its section has only a1 openai-codex/gpt-6.1-sol
- **THEN** that profile is the entire chain, regardless of saved Claude accounts or the global default

#### Scenario: Case-insensitive exact match

- **WHEN** a detected email differs only in letter case from a section key
- **THEN** crew selects that section without prefix matching or account guessing

#### Scenario: Missing section role does not escape to the global role

- **WHEN** a matching section omits review or fix while the global config defines those roles
- **THEN** those roles resolve to that section's default instead of the global role or default

#### Scenario: Project precedence stays inside the section

- **WHEN** a matching section contains a project default and a general role list
- **THEN** its project default wins, and a project role list wins over both if present

#### Scenario: Other account or old config

- **WHEN** the detected email has no matching section or the config has no coordinators key
- **THEN** existing global project, role, default, rule and account-expansion behavior remains unchanged

### Requirement: Coordinator-scoped chains have no implicit fallback profiles

Each configured profile in a selected coordinator section SHALL contribute one candidate, with no saved-Claude-account expansion or appended global candidates. Explicit selection flags SHALL retain their existing precedence and transformation semantics on top of that base chain. Saved task chains SHALL remain the recovery authority; a coordinator account change SHALL NOT silently widen or replace an existing task's candidates.

#### Scenario: Singleton Claude profile without an account

- **WHEN** a selected coordinator section contains one Claude profile without an account
- **THEN** it remains one launch-default candidate rather than expanding to every saved login

#### Scenario: Explicit choice is placed first

- **WHEN** a command names agent, model, effort or account over a coordinator section
- **THEN** the existing clean-profile or first-profile-adjustment semantics apply, followed only by the selected base chain and existing deduplication

#### Scenario: Explicit rule and no fallback

- **WHEN** a command selects a rule or no-fallback over a coordinator section
- **THEN** the rule comes from that section and no-fallback retains its existing first-profile behavior before any expansion of an explicitly named choice

#### Scenario: Singleton worker loses quota or crashes

- **WHEN** a task's only candidate stops on quota/login loss or meets the existing crashed-agent detection conditions
- **THEN** crew reports that nobody can take the work with the stop reason and lack of another candidate, without inventing another login or borrowing the global chain

#### Scenario: Relaunch has no untried candidate

- **WHEN** relaunch without selection flags is requested for a task whose singleton has already been tried
- **THEN** crew refuses replacement with the existing nobody-can-take-this-work diagnostic and reason, preserving the working copy

#### Scenario: Coordinator changes after task launch

- **WHEN** the coordinator switches accounts after a task saved its candidates
- **THEN** automatic handover and unflagged relaunch use that saved chain; relaunch with selection flags rebuilds from the currently selected section as before

### Requirement: Dispatch inspection explains coordinator selection

Crew agents SHALL display the detected owner account or unknown/non-Claude state, identity source or reason, selected section and final list source. Its JSON SHALL carry equivalent structured data without contaminating stdout with prose. Unknown identity SHALL produce a single concise diagnostic on human-facing selection commands and a structured reason in JSON.

#### Scenario: Matching account is inspected

- **WHEN** crew agents is called with a matching coordinator account, role and project
- **THEN** human output and JSON identify that account, the matching section and the role/project/default list actually used

#### Scenario: Unknown identity is inspected as JSON

- **WHEN** crew agents --json cannot determine the owner account
- **THEN** stdout remains valid JSON with null account, unknown status, a nonempty reason and the global policy source

### Requirement: Invalid coordinator sections are refused

Crew SHALL validate the entire new map before selection and refuse malformed sections with the config path and offending key. Invalid maps, email keys, case-colliding keys, section shapes, nested maps, profiles, roles, rules and quota flags SHALL NOT be ignored or interpreted as a global fallback. Legacy config validation outside the new map SHALL retain compatibility.

#### Scenario: Unselected section is malformed

- **WHEN** any coordinator section is malformed even though another account would be selected
- **THEN** selection refuses with a diagnostic naming that section instead of silently using a valid or global chain

#### Scenario: Empty or missing default

- **WHEN** a coordinator section has no usable nonempty default chain
- **THEN** crew refuses the section instead of substituting a built-in or global candidate

#### Scenario: Case-colliding keys

- **WHEN** two keys normalize to the same account email
- **THEN** crew refuses the ambiguous map with a clear message
