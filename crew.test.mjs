// Runs with plain `node crew.test.mjs`. Core is replaced by a small fake `hc`, so no
// terminal, agent or machine is touched; the live checks are recorded in README.md.
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { validId, projectNameError, shq, bashPath, briefText, agentCommand, cleanProfile, quotaVerdict, githubOwner, AGENTS, TOOLS, autoModeGuard, main, snapshotCopy, repairFile, canonicalPrUrl, discoverTaskPrs, prObservation, rememberTaskPr, fleetTaskVisible, verifiedPrRead, coordinatorIdentity } from './crew.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = fs.mkdtempSync(path.join(os.tmpdir(), 'crew-test-'));
const slash = p => p.replace(/\\/g, '/');
const WINDOWS = process.platform === 'win32';
const githubFixture = name => JSON.parse(fs.readFileSync(path.join(here, 'docs', 'fixtures', 'github', name), 'utf8'));
// Keep the ENTIRE recorded wire shape. Only identity/time values are adapted for
// isolated repositories; notably REST url (API) and html_url (web) both remain.
function recordedRestPr(number = 12, branch = 'feature/draft', source = 'pull-list-open.json') {
  const captured = githubFixture(source), original = Array.isArray(captured) ? captured[0] : captured;
  const text = JSON.stringify(original).replaceAll('timurproko/crew', 'acme/demo')
    .replace(new RegExp(`/(pulls?)/${original.number}(?![0-9])`, 'g'), `/$1/${number}`);
  const pr = JSON.parse(text); pr.number = number; pr.head.ref = branch;
  return pr;
}

// Pure helpers.
assert.ok(validId('readme-lines') && validId('a1') && !validId('Bad') && !validId('-x') && !validId('a'.repeat(41)) && !validId('../x'));
assert.equal(shq("it's"), `'it'\\''s'`);
assert.equal(bashPath('D:\\Git\\x y'), '/d/Git/x y'); assert.equal(bashPath('/home/u/x'), '/home/u/x');
assert.deepEqual(Object.keys(AGENTS), ['a1', 'pi', 'claude']);
const brief = briefText({ id: 't1', kind: 'scout', task: 'Count lines.', worktree: 'W', project: 'p', report: 'R' });
assert.match(brief, /read-only investigation/); assert.match(brief, /crew done t1/); assert.match(brief, /`R`/);
assert.match(briefText({ id: 't1', kind: 'ship', task: 'x', worktree: 'W', project: 'p', report: 'R' }), /commit them/);
// Delivery instructions stay distinct; all briefs share external scratch and instance hygiene.
// A scout's brief does not change for a workflow project; the gate wins over it.
{
  const ship = { id: 't1', kind: 'ship', task: 'x', worktree: 'W', project: 'p', report: 'R' };
  const ends = '- When you are finished, write your result to `R` in Markdown, with the answer in the first lines.\n- Then run `crew done t1` and stop. Do not start any other work.\n- If you cannot finish, write what blocked you to the same file and still run the command.\n';
  const start = '# Task t1 (ship)\n\nx\n\n## Rules\n- Work only inside `W`. It is your own copy of the project `p`; nobody else uses it.\n- Output exception: keep proof pictures and scratch outside the working copy, in your crew task folder `.`. This folder is allowed for reports and disposable output, not project edits.\n- Stop every disposable app instance or server you started before writing your report and running `crew done`.\n';
  assert.equal(briefText(ship), `${start}- Make your changes on the branch already checked out here and commit them. Do not push or open a pull request unless the task says so.\n${ends}`);
  const gated = `${start}- Make your changes on the branch already checked out here and commit them.\n- This project is delivered through the no-mistakes gate, which reviews, tests, pushes and opens the pull request itself. After committing, run \`no-mistakes axi run --yes --intent-file I --skip ci\` here and do what it prints (\`no-mistakes axi --help\`) until it reports an outcome. A wait that runs out is not a failure: run the same command again to go on. Do not push or open a pull request any other way.\n- The gate ends when the pull request is open. Its checks are not watched here: the person reads them on the pull request.\n- Put the pull request link the gate gives you in the first lines of your report. If the gate stops on something only a person can decide, say exactly what in the report.\n${ends}`;
  assert.equal(briefText({ ...ship, gate: 'I', gateSkip: ['ci'] }), gated);
  assert.equal(briefText({ ...ship, gate: 'I', gateSkip: ['ci'], workflow: true, branch: 'fix/t1' }), gated);
  assert.equal(briefText({ ...ship, kind: 'scout', workflow: true }), briefText({ ...ship, kind: 'scout' }));
  const flow = briefText({ ...ship, workflow: true, branch: 'fix/t1' });
  for (const line of ['load the `change-delivery` skill', 'Run `delivery update`', '`delivery start fix/t1` returns this same folder', 'then STOP', '`Plan: <pull request link>`', '`Implementation: <pull request link>`', 'Never mark the pull request ready and never merge it.', 'crew done t1']) assert.ok(flow.includes(line), line);
  assert.ok(!flow.includes('Do not push or open a pull request'), flow);
}

for (const options of [{ kind: 'scout' }, { kind: 'ship' }, { kind: 'ship', workflow: true }, { kind: 'ship', gate: 'intent' }]) {
  const text = briefText({ id: 'hygiene', task: 'Work or review.', worktree: '/copies/work', project: 'demo', report: '/crew/tasks/hygiene/report.md', ...options });
  assert.match(text, /Output exception:.*proof pictures and scratch outside the working copy.*`\/crew\/tasks\/hygiene`/);
  assert.match(text, /Stop every disposable app instance or server you started before writing your report/);
}

// Claude account choice: only for Claude, only through the launcher, never an unchecked value.
{
  const launcher = path.join(root, 'claude-as.sh'); fs.writeFileSync(launcher, '#!/bin/sh');
  const env = { CREW_CLAUDE_ACCOUNT: 'me@example.com', CREW_CLAUDE_LAUNCHER: launcher };
  assert.equal(agentCommand('a1', AGENTS.a1, 'do it', env), "'a1' 'do it'", 'The account applies to Claude Code only');
  assert.equal(agentCommand('claude', AGENTS.claude, 'do it', {}), "'claude' 'do it' '--permission-mode' 'auto' '--allowedTools' 'Bash,PowerShell,Read,Edit,Write,Glob,Grep'", 'Claude workers run in auto mode');
  assert.equal(agentCommand('claude', AGENTS.claude, 'do it', {}, { permissionMode: 'acceptEdits' }), "'claude' 'do it' '--permission-mode' 'acceptEdits' '--allowedTools' 'Bash,PowerShell,Read,Edit,Write,Glob,Grep'", 'The fallback changes only the mode');
  assert.equal(agentCommand('a1', AGENTS.a1, 'do it', {}, { permissionMode: 'acceptEdits' }), "'a1' 'do it'", 'A1 and Pi have no permission mode');
  const line = agentCommand('claude', AGENTS.claude, "it's", env);
  assert.ok(line.startsWith("bash --noprofile --norc '") && line.includes("claude-as.sh' --as 'me@example.com' --command \"$(type -P claude || type -P claude.exe)\" -- 'it'\\''s' '--permission-mode' 'auto'"), line);
  assert.throws(() => agentCommand('claude', AGENTS.claude, 'x', { ...env, CREW_CLAUDE_ACCOUNT: "a'; rm -rf ~" }), /Not an account name/);
  assert.equal(agentCommand('claude', AGENTS.claude, 'x', { CREW_CLAUDE_ACCOUNT: 'me@example.com', CREW_CLAUDE_LAUNCHER: path.join(root, 'missing.sh') }).startsWith("'claude' 'x'"), true, 'No launcher: the default account, with a warning');
}

// Auto mode refused at start: the worker's shell runs it once more in acceptEdits, and only then.
{
  const bash = WINDOWS ? [process.env.CREW_BASH, 'C:/Program Files/Git/bin/bash.exe'].find(p => p && fs.existsSync(p)) : 'bash';
  if (bash) {
    const guard = (auto, grace) => spawnSync(bash, ['--noprofile', '--norc', '-c', autoModeGuard(auto, 'echo fallback ran', grace)], { encoding: 'utf8' }).stdout;
    let out = guard('echo auto refused; false');
    assert.ok(out.includes('auto refused\ncrew: Claude Code ended at once in auto mode (exit 1); starting it again in acceptEdits\nfallback ran'), out);
    for (const [auto, grace, why] of [['echo worked', undefined, 'a normal end'], ['(exit 130)', undefined, 'an interrupt'], ['false', 0, 'an error after the grace time']]) {
      out = guard(auto, grace); assert.ok(!out.includes('fallback ran') && !out.includes('crew: Claude Code ended'), `${why} is not restarted: ${out}`);
    }
  }
}

// A fake Core: terminals live in a JSON file; `run` creates one, `get` reads, `kill`/`rm` remove.
const fake = path.join(root, 'fake-hc.mjs'), world = path.join(root, 'world.json');
fs.writeFileSync(world, JSON.stringify({ seq: 0, terminals: {}, log: [] }));
fs.writeFileSync(fake, `
import fs from 'node:fs';
const file = ${JSON.stringify(world)}, w = JSON.parse(fs.readFileSync(file, 'utf8')), a = process.argv.slice(2);
// Polling tests read concurrently: publish complete fake-Core worlds atomically.
w.log.push(a); const save = () => { const temp = file + '.' + process.pid; fs.writeFileSync(temp, JSON.stringify(w)); fs.renameSync(temp, file); };
if (a[0] === 'run') { const address = 't' + (++w.seq); const labels = {}; a.forEach((v, i) => { if (v === '--label') { const [k, ...r] = a[i + 1].split('='); labels[k] = r.join('='); } });
  w.terminals[address] = { address, state: 'live', labels, status: null, cwd: a[a.indexOf('--cwd') + 1] }; save(); console.log(JSON.stringify({ address })); }
else if (a[0] === 'get' && w.silent) { save(); console.error('Core transport unavailable'); process.exit(1); }
else if (a[0] === 'kill' && w.unkillable) { save(); }
else if (a[0] === 'get') { const t = w.terminals[a.at(-1)]; if (t?.steps?.length) Object.assign(t, t.steps.shift()); save(); if (!t) { console.error(JSON.stringify({ error: { kind: 'not_found' } })); process.exit(3); } console.log(JSON.stringify(t)); }
else if (a[0] === 'kill') { const t = w.terminals[a.at(-1)]; if (t) t.state = 'finished'; if (w.writeOnKill) fs.writeFileSync(w.writeOnKill, 'written while stopping'); if (w.silentAfterKill) w.silent = true; save(); }
else if (a[0] === 'rm') { if (!w.failRm) delete w.terminals[a.at(-1)]; if (w.silentLsAfterRm) w.silentLs = true; if (w.silentAfterRm) w.silent = true; save(); }
else if (a[0] === 'ls' && w.silentLs) { save(); console.error('Core transport unavailable'); process.exit(1); }
else if (a[0] === 'ls') { save(); console.log(JSON.stringify({ terminals: Object.values(w.terminals).map(t => ({ address: t.address, agent: t.agent ?? null, cwd: t.cwd, state: t.state })) })); }
else if (a[0] === 'read') { save(); process.stdout.write(w.terminals[a[1]]?.screen ?? ''); }
else if (a[0] === 'send') {
  const t = w.terminals[a[1]];
  if (t?.sendError) { save(); console.error('send transport unavailable'); process.exit(1); }
  if (t?.onSends?.length) Object.assign(t, t.onSends.shift());
  if (t?.reportOnSend) {
    const task = JSON.parse(fs.readFileSync(t.reportOnSend, 'utf8'));
    fs.writeFileSync(task.report, 'Complete');
    fs.writeFileSync(t.reportOnSend, JSON.stringify({ ...task, state: 'reported', reported: new Date().toISOString(), tells: 9 }));
  }
  save();
}
else save();
`);
const readWorld = () => {
  // The fake child publishes via truncate/write. A barrier reader can land between those
  // operations; wait for a complete fixture snapshot, but still fail persistent corruption.
  const deadline = Date.now() + 1000;
  for (;;) {
    try { return JSON.parse(fs.readFileSync(world, 'utf8')); }
    catch (error) {
      if (!(error instanceof SyntaxError) || Date.now() >= deadline) throw error;
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 5);
    }
  }
};
const setTerminal = (address, patch) => { const w = readWorld(); Object.assign(w.terminals[address], patch); fs.writeFileSync(world, JSON.stringify(w)); };

const homeDir = path.join(root, 'home'), project = path.join(root, 'project'), fakeUser = path.join(root, 'user');
fs.mkdirSync(fakeUser);
const claudeConfig = path.join(root, 'claude.json');
fs.writeFileSync(claudeConfig, JSON.stringify({ theme: 'dark', projects: { 'C:/mine': { hasTrustDialogAccepted: true, history: [1] } } }));
function crew(args, { terminal, cwd = homeDir, env: extra = {}, script = path.join(here, 'crew.mjs') } = {}) {
  const env = { ...process.env, CREW_CLAUDE_CONFIG: claudeConfig, HOME: fakeUser, USERPROFILE: fakeUser, CREW_HC: fake, CREW_SETTLE_SECONDS: '2', CREW_WORKTREES: path.join(root, 'copies'), CREW_HOME: '', HC_TERMINAL_ID: '', CREW_TERMINAL: terminal ?? '', CLAUDE_CONFIG_DIR: '', CREW_CLAUDE_ACCOUNT: '', CREW_CLAUDE_ACCOUNTS: '',
    // No tool of the machine the suite runs on is seen, unless a test names a fake one.
    CREW_TOOL_PATH: path.join(root, 'no-tools'), ...Object.fromEntries(TOOLS.map(t => [`CREW_TOOL_${t.id.toUpperCase().replace(/-/g, '_')}`, ''])), ...extra };
  delete env.CREW_HOME;
  const r = spawnSync(process.execPath, [script, ...args], { encoding: 'utf8', cwd: fs.existsSync(cwd) ? cwd : root, env, shell: false });
  return { code: r.status, out: r.stdout + r.stderr };
}
const git = (...args) => { const r = spawnSync('git', args, { encoding: 'utf8' }); assert.equal(r.status, 0, r.stderr); return r.stdout; };
const who = ['-c', 'user.name=t', '-c', 'user.email=t@example.invalid'];
const commit = (folder, files, message) => {
  for (const [name, text] of Object.entries(files)) { fs.mkdirSync(path.dirname(path.join(folder, name)), { recursive: true }); fs.writeFileSync(path.join(folder, name), text); }
  git('-C', folder, 'add', '-A'); git('-C', folder, ...who, 'commit', '-q', '-m', message);
  return git('-C', folder, 'rev-parse', 'HEAD').trim();
};

// Exercise crash handling with an explicit unexpected fault, not malformed input.
function unexpectedListScript(folder) {
  const script = path.join(folder, 'unexpected-list.mjs');
  fs.writeFileSync(script, `import { main } from ${JSON.stringify(pathToFileURL(path.join(here, 'crew.mjs')).href)};
console.log = () => { throw new TypeError('injected project list failure'); }; main(process.argv.slice(2));`);
  return script;
}

// Run a focused regression with --gaps=ignored (or all new regressions with --gaps).
const gapTests = {};
// New dispatch fixtures own their fake Core history as well as their home. In particular,
// their polling logs must not enlarge the shared world used by later concurrency tests.
const isolatedCore = test => () => {
  const before = fs.readFileSync(world, 'utf8'), trustBefore = fs.readFileSync(claudeConfig, 'utf8');
  try {
    test();
    assert.equal(fs.readFileSync(claudeConfig, 'utf8'), trustBefore, 'Dispatch fixture must not alter another fixture\'s Claude trust');
  } finally { fs.writeFileSync(world, before); }
};
function identityFixture(name) {
  const dir = path.join(root, `identity-${name}`), home = path.join(dir, 'home'), session = path.join(dir, 'session'), inspector = path.join(dir, 'inspector'), owner = `identity-${name}`;
  fs.mkdirSync(session, { recursive: true }); fs.mkdirSync(inspector);
  const write = (file, value, folder = session) => fs.writeFileSync(path.join(folder, file), JSON.stringify(value));
  const status = (email, patch = {}, folder = session) => write('account-switcher-status.json', { email: 'stale@example.test', isolated: true, state: 'ok', apiEmail: email, at: Date.now(), expiresAt: Date.now() + 3600000, ...patch }, folder);
  const labels = (email, patch = {}) => ({ 'custom.claude.email': email, 'custom.claude.state': 'ok', 'custom.claude.at': String(Date.now()), 'custom.claude.session': 'fake-process-instance', ...patch });
  const w = readWorld(); w.terminals[owner] = { address: owner, state: 'live', status: { app: 'claude-code', state: 'working' }, labels: {} }; fs.writeFileSync(world, JSON.stringify(w));
  const env = { CLAUDE_CONFIG_DIR: session, CREW_CLAUDE_ACCOUNT: 'launch@example.test', CREW_WORKTREES: path.join(dir, 'copies') };
  const call = (args, extra = {}, terminal = owner) => crew(args, { cwd: home, terminal, env: { ...env, ...extra } });
  let r = call(['init', home]); assert.equal(r.code, 0, r.out);
  const ownerFile = path.join(home, 'owner.json');
  return { dir, home, session, inspector, owner, ownerFile, env, call, write, status, labels, record: () => JSON.parse(fs.readFileSync(ownerFile, 'utf8')) };
}
gapTests['coordinator-identity'] = isolatedCore(() => {
  const f = identityFixture('authority');
  f.status('ONE@EXAMPLE.TEST');
  f.write('account-switcher-session.json', { email: 'one@example.test', at: Date.now() - 1000 });
  // These are deliberately unusable. Detection must not parse or change credentials/config.
  fs.writeFileSync(path.join(f.session, '.credentials.json'), 'not credentials');
  fs.writeFileSync(path.join(f.session, '.claude.json'), '{"oauthAccount":{"emailAddress":"stale@example.test"}}');
  let r = f.call(['start']); assert.equal(r.code, 0, r.out);
  let saved = f.record(); assert.equal(saved.terminal, f.owner); assert.ok(saved.since);
  assert.equal(saved.coordinator.account, 'one@example.test'); assert.equal(saved.coordinator.source, 'session-status');
  assert.equal(saved.coordinator.configDir, f.session);
  f.status('two@example.test', { state: 'mismatch' });
  r = f.call(['agents', '--json']); assert.equal(r.code, 0, r.out); JSON.parse(r.out);
  assert.equal(f.record().coordinator.account, 'two@example.test', 'A new selection rereads session metadata');
  assert.equal(f.record().since, saved.since);
  assert.equal(fs.readFileSync(path.join(f.session, '.credentials.json'), 'utf8'), 'not credentials');
  assert.equal(JSON.parse(fs.readFileSync(path.join(f.session, '.claude.json'), 'utf8')).oauthAccount.emailAddress, 'stale@example.test');
  f.status('inspector@example.test', {}, f.inspector);
  const before = fs.readFileSync(f.ownerFile, 'utf8');
  r = f.call(['agents', '--json'], { CLAUDE_CONFIG_DIR: f.inspector }, 'other'); assert.equal(r.code, 0, r.out);
  assert.equal(fs.readFileSync(f.ownerFile, 'utf8'), before, 'Inspection cannot rewrite the owner');
  const time = Date.now(), owner = f.record(), core = { state: 'live', t: { status: { app: 'claude-code' }, labels: {} } };
  const detect = (patch = {}, env = {}) => coordinatorIdentity(owner, { time, env, core: patch });
  assert.equal(coordinatorIdentity(owner, { time, env: { CREW_TERMINAL: 'other', CLAUDE_CONFIG_DIR: f.inspector }, core }).account, 'two@example.test');
  assert.equal(coordinatorIdentity(null, { time, env: f.env, core }).status, 'unknown');
  for (const app of ['a1', 'pi', 'codex']) assert.equal(detect({ ...core, t: { status: { app }, labels: f.labels('one@example.test') } }).status, 'non-claude');
  for (const state of ['absent', 'finished']) assert.equal(detect({ state }).status, 'unknown');
  for (const patch of [{ at: time - 60001 }, { at: time + 5001 }, { state: 'unknown' }, { state: 'unavailable' }, { isolated: false }, { apiEmail: 'not an email' }, { expiresAt: time - 1 }]) {
    f.status('one@example.test', { at: time, ...patch });
    assert.equal(coordinatorIdentity(owner, { time, env: {}, core }).status, 'unknown', JSON.stringify(patch));
  }
  fs.writeFileSync(path.join(f.session, 'account-switcher-status.json'), '{broken');
  assert.equal(coordinatorIdentity(owner, { time, env: {}, core }).status, 'unknown');
  f.status('one@example.test', { at: time });
  const withLabels = labels => ({ ...core, t: { ...core.t, labels } });
  assert.equal(detect(withLabels(f.labels('other@example.test', { 'custom.claude.at': String(time) }))).status, 'unknown', 'Conflicting fresh verification is not guessed through');
  assert.equal(detect(withLabels(f.labels('one@example.test', { 'custom.claude.state': 'switching', 'custom.claude.at': String(time) }))).status, 'unknown');
  f.write('account-switcher-session.json', { email: 'two@example.test', at: time + 1 });
  assert.equal(coordinatorIdentity(owner, { time, env: {}, core }).status, 'unknown', 'New intent invalidates old confirmation');
  f.write('account-switcher-session.json', { email: 'two@example.test', at: time - 1 });
  const oldOwner = { terminal: f.owner, since: saved.since };
  const verified = coordinatorIdentity(oldOwner, { time, env: {}, core: withLabels(f.labels('API@EXAMPLE.TEST', { 'custom.claude.at': String(time), 'custom.claude.state': 'mismatch' })) });
  assert.equal(verified.account, 'api@example.test'); assert.equal(verified.source, 'owner-terminal');
  assert.equal(coordinatorIdentity(oldOwner, { time, env: { CREW_CLAUDE_ACCOUNT: 'hint@example.test' }, core }).status, 'unknown', 'Hints alone are not identity');
  const log = readWorld().log;
  assert.ok(!log.some(a => ['send', 'kill'].includes(a[0]) && a.includes(f.owner)), 'No coordinator input or process mutation');
});
gapTests['coordinator-dispatch'] = isolatedCore(() => {
  const f = identityFixture('dispatch'), dispatch = path.join(f.home, 'config', 'crew-dispatch.json');
  fs.mkdirSync(path.dirname(dispatch), { recursive: true });
  const example = JSON.parse(/### Coordinator-specific worker lists[\s\S]*?```json\r?\n([\s\S]*?)```/.exec(fs.readFileSync(path.join(here, 'README.md'), 'utf8'))[1]);
  const business = 'tymur.prokopiev@ameria.com', personal = 'masha.shmakova@gmail.com';
  assert.deepEqual(Object.keys(example.coordinators), [business, personal]);
  assert.deepEqual(example.coordinators[business].default, [{ harness: 'claude', model: 'claude-opus-5-5', account: 'aicoder-de13@ameria.com' }]);
  assert.deepEqual(example.coordinators[personal].default, [{ harness: 'a1', model: 'openai-codex/gpt-6.1-sol' }]);
  const config = value => fs.writeFileSync(dispatch, JSON.stringify(value));
  const show = (args = [], extra = {}, terminal) => { const r = f.call(['agents', '--json', ...args], extra, terminal); assert.equal(r.code, 0, r.out); return JSON.parse(r.out); };
  const profiles = shown => shown.candidates.map(({ harness, model, effort, account }) => Object.fromEntries(Object.entries({ harness, model, effort, account }).filter(([, v]) => v !== undefined)));
  const env = { CREW_CLAUDE_ACCOUNTS: 'one@example.test,two@example.test', CREW_CLAUDE_ACCOUNT: 'two@example.test' };
  config(example); f.status(business.toUpperCase()); assert.equal(f.call(['start']).code, 0);
  for (const [email, expected] of [[business, example.coordinators[business].default], [personal, example.coordinators[personal].default]]) {
    f.status(email);
    for (const role of ['scout', 'ship', 'review', 'fix']) {
      const shown = show(['--role', role], env); assert.deepEqual(profiles(shown), expected);
      assert.equal(shown.coordinator.account, email); assert.equal(shown.coordinator.section, `coordinators.${email}`); assert.equal(shown.source, `coordinators.${email}.default`);
      assert.equal(shown.candidates.length, 1, 'The README singleton has nobody behind it');
    }
  }
  f.status(business);
  const scoped = { default: [{ harness: 'a1', model: 'base/model' }], roles: { review: [{ harness: 'pi' }] },
    projects: { demo: { default: [{ harness: 'claude', account: 'project@example.test' }], roles: { ship: [{ harness: 'pi', model: 'project/ship' }] } }, 'crew:self': [{ harness: 'a1', model: 'self/fix' }] },
    rules: [{ when: 'Selected rule', why: 'local', use: [{ harness: 'a1', model: 'rule/local' }] }], shared_quota: true };
  const rootConfig = { default: [{ harness: 'claude' }], roles: { fix: [{ harness: 'pi', model: 'wrong/fix' }], review: [{ harness: 'a1', model: 'wrong/review' }] },
    projects: { absent: [{ harness: 'pi', model: 'wrong/project' }] }, rules: [{ when: 'Global rule', use: { harness: 'pi' } }], coordinators: { [business.toUpperCase()]: scoped } };
  config(rootConfig);
  assert.deepEqual(profiles(show(['--project', 'demo', '--role', 'ship'])), [{ harness: 'pi', model: 'project/ship' }]);
  assert.deepEqual(profiles(show(['--project', 'demo', '--role', 'review'])), [{ harness: 'claude', account: 'project@example.test' }], 'Project default precedes section role');
  assert.deepEqual(profiles(show(['--project', 'absent', '--role', 'fix'])), scoped.default, 'Global project and fix role cannot leak');
  assert.deepEqual(profiles(show(['--project', 'crew:self', '--role', 'fix'])), [{ harness: 'a1', model: 'self/fix' }]);
  assert.equal(show().sharedQuota, true); assert.equal(show(['--rule', '1']).rules[0].when, 'Selected rule');
  assert.deepEqual(profiles(show(['--rule', '1'])), [{ harness: 'a1', model: 'rule/local' }]);
  let r = f.call(['agents', '--rule', '2']); assert.equal(r.code, 2); assert.match(r.out, /No rule 2/);
  assert.deepEqual(profiles(show(['--model', 'override/model'])), [{ harness: 'a1', model: 'override/model' }, ...scoped.default]);
  assert.deepEqual(profiles(show(['--effort', 'high'])), [{ harness: 'a1', model: 'base/model', effort: 'high' }], 'Deduplication keeps the adjusted choice');
  assert.deepEqual(profiles(show(['--agent', 'pi', '--model', 'override/model'])), [{ harness: 'pi', model: 'override/model' }, ...scoped.default]);
  assert.deepEqual(profiles(show(['--agent', 'claude'], env)), [{ harness: 'claude', account: 'two@example.test' }, { harness: 'claude', account: 'one@example.test' }, ...scoped.default], 'Explicit overrides retain old expansion');
  assert.deepEqual(profiles(show(['--agent', 'claude', '--account', 'named@example.test', '--no-fallback'], env)), [{ harness: 'claude', account: 'named@example.test' }]);
  assert.deepEqual(profiles(show(['--model', 'override/model', '--no-fallback'])), [{ harness: 'a1', model: 'override/model' }]);
  config({ ...rootConfig, coordinators: { [business]: { default: [{ harness: 'claude', model: 'opus' }] } } });
  assert.deepEqual(profiles(show([], env)), [{ harness: 'claude', model: 'opus' }], 'Account-less scoped profiles never expand');
  assert.deepEqual(profiles(show(['--account', 'named@example.test'], env)), [{ harness: 'claude', model: 'opus', account: 'named@example.test' }, { harness: 'claude', model: 'opus' }]);
  r = f.call(['agents'], env); assert.equal((r.out.match(/^coordinator /gm) ?? []).length, 1); assert.ok(r.out.includes(business)); assert.ok(r.out.includes(`coordinators.${business}.default`));
  config(example); f.status('aicoder-de13@ameria.com');
  let shown = show([], env); assert.equal(shown.coordinator.section, 'global'); assert.match(shown.coordinator.reason, /no coordinator section/);
  assert.deepEqual(profiles(shown).slice(0, 2), example.default.slice(0, 2)); assert.equal(shown.candidates.length, 4, 'Unlisted account keeps legacy Claude expansion');
  r = f.call(['agents'], env); assert.match(r.out, /coordinator aicoder-de13@ameria.com .*using global dispatch/); assert.equal((r.out.match(/^coordinator /gm) ?? []).length, 1);
  f.status(business); f.status(personal, {}, f.inspector);
  const ownerBefore = fs.readFileSync(f.ownerFile, 'utf8');
  assert.equal(show([], { CLAUDE_CONFIG_DIR: f.inspector }, 'inspector').coordinator.account, business);
  assert.equal(fs.readFileSync(f.ownerFile, 'utf8'), ownerBefore);
  for (const app of ['a1', 'pi', 'codex']) {
    setTerminal(f.owner, { status: { app } }); shown = show([], env); assert.equal(shown.coordinator.section, 'global'); assert.equal(shown.coordinator.status, 'non-claude');
    r = f.call(['agents'], env); assert.match(r.out, /not a Claude coordinator.*using global dispatch/);
  }
  setTerminal(f.owner, { status: null, labels: {} });
  fs.rmSync(path.join(f.session, 'account-switcher-status.json'));
  shown = show([], env); assert.equal(shown.coordinator.account, null); assert.equal(shown.coordinator.section, 'global');
  assert.match(f.call(['agents'], env).out, /coordinator account unknown .*using global dispatch/);
  fs.rmSync(f.ownerFile); assert.equal(show().coordinator.reason, 'no home owner');
  config({ default: [{ harness: 'claude' }] });
  assert.deepEqual(profiles(show([], env)), [{ harness: 'claude', account: 'two@example.test' }, { harness: 'claude', account: 'one@example.test' }], 'No-map compatibility');
  for (const [value, field] of [
    [null, 'coordinators'], [[], 'coordinators'], ['bad', 'coordinators'], [{ bad: { default: ['a1'] } }, 'coordinators.bad'],
    [{ [business]: { default: ['a1'] }, [business.toUpperCase()]: { default: ['pi'] } }, business.toUpperCase()],
    ...[null, [], 'bad', {}, { default: [] }, { default: null }, { default: [{ harness: 'no-such-agent' }] }, { default: ['a1'], nested: {} },
      { default: ['a1'], coordinators: {} }, { default: ['a1'], roles: null }, { default: ['a1'], roles: { unknown: ['a1'] } },
      { default: ['a1'], projects: [] }, { default: ['a1'], projects: { demo: { roles: [] } } },
      { default: ['a1'], projects: { demo: { default: ['a1'], oops: [] } } }, { default: ['a1'], rules: {} },
      { default: ['a1'], rules: [{ use: [] }] }, { default: ['a1'], rules: [{ use: ['pi'], oops: true }] },
      { default: ['a1'], rules: [{ use: ['pi'], when: 5 }] }, { default: ['a1'], shared_quota: 'yes' },
      { default: [{ harness: 'a1', account: 'bad@example.test' }] }, { default: [{ harness: 'a1', provider: [] }] },
      { default: [{ harness: 'a1', floor: 101 }] }].map(section => [{ [business]: section }, `coordinators.${business}`])
  ]) {
    config({ default: ['a1'], coordinators: value }); r = f.call(['agents', '--json']);
    assert.equal(r.code, 2, JSON.stringify(value) + r.out); assert.ok(r.out.includes('crew-dispatch.json'), r.out); assert.ok(r.out.includes(field), r.out);
  }
});
gapTests['coordinator-harness'] = isolatedCore(() => {
  const f = identityFixture('harness'), malformed = 'bad@example.test', other = 'other@example.test';
  const dispatch = path.join(f.home, 'config', 'crew-dispatch.json');
  fs.mkdirSync(path.dirname(dispatch), { recursive: true });
  f.status(malformed); assert.equal(f.call(['start']).code, 0);
  const profiles = [
    { harness: 'constructor' }, { harness: '__proto__' }, { harness: 'toString' }, { harness: ['a1'] },
    { agent: 'constructor' }, { agent: ['a1'] }, 'constructor', { harness: null },
  ];
  for (const selected of [true, false]) {
    f.status(selected ? malformed : other);
    for (const profile of profiles) {
      fs.writeFileSync(dispatch, JSON.stringify({ default: ['a1'], coordinators: {
        [malformed]: { default: [profile] }, [other]: { default: ['pi'] },
      } }));
      const r = f.call(['agents', '--json']);
      assert.equal(r.code, 2, `${selected ? 'Selected' : 'Unselected'} malformed harness: ${JSON.stringify(profile)}\n${r.out}`);
      assert.ok(r.out.includes('crew-dispatch.json'), r.out);
      assert.ok(r.out.includes(`coordinators.${malformed}.default[0]`), r.out);
      assert.match(r.out, /Unknown agent|harness must be a string/);
    }
  }
  for (const harness of ['constructor', '__proto__', 'toString', ['a1'], {}, 1, true]) {
    assert.throws(() => cleanProfile({ harness }), /Unknown agent|harness must be a string/);
  }
  for (const harness of Object.keys(AGENTS)) assert.equal(cleanProfile({ harness }).harness, harness);
});
gapTests['coordinator-probe-failures'] = isolatedCore(() => {
  const f = identityFixture('probe-failures'), email = 'probe@example.test', dispatch = path.join(f.home, 'config', 'crew-dispatch.json');
  fs.mkdirSync(path.dirname(dispatch), { recursive: true }); f.status(email); assert.equal(f.call(['start']).code, 0);
  const broken = path.join(f.dir, 'broken-hc.mjs'), slow = path.join(f.dir, 'slow-hc.mjs');
  fs.writeFileSync(broken, "process.stdout.write('{not JSON');\n");
  fs.writeFileSync(slow, "Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 5000); console.log('{\"state\":\"live\"}');\n");
  for (const scoped of [false, true]) {
    fs.writeFileSync(dispatch, JSON.stringify({ default: ['a1'], shared_quota: true,
      ...(scoped ? { coordinators: { [email]: { default: ['pi'] } } } : {}) }));
    for (const hc of [path.join(f.dir, 'missing-hc'), broken, slow]) {
      const r = f.call(['agents', '--json'], { CREW_HC: hc }); assert.equal(r.code, 0, r.out);
      const shown = JSON.parse(r.out); assert.equal(shown.coordinator.status, 'unknown'); assert.equal(shown.coordinator.account, null);
      assert.equal(shown.coordinator.section, 'global'); assert.ok(shown.coordinator.reason); assert.deepEqual(shown.candidates.map(c => c.harness), ['a1']);
    }
    const text = f.call(['agents'], { CREW_HC: path.join(f.dir, 'missing-hc') }); assert.equal(text.code, 0, text.out);
    assert.match(text.out, /coordinator account unknown .*using global dispatch/); assert.equal((text.out.match(/^coordinator /gm) ?? []).length, 1);
  }
  const owner = f.record(), core = { state: 'live', t: { status: { app: 'claude-code' }, labels: {} } };
  for (const options of [
    { env: { CREW_TERMINAL: f.owner, CLAUDE_CONFIG_DIR: { toString: 0 } }, core },
    { env: {}, core: { state: 'live', t: { status: { app: { toString: 0 } } } } },
    { get core() { throw new Error('injected identity failure'); } },
    { env: { CREW_TERMINAL: f.owner }, core, home: { get owner() { throw new Error('injected identity cache failure'); } } },
  ]) {
    const identity = coordinatorIdentity(owner, options); assert.equal(identity.status, 'unknown'); assert.equal(identity.account, null);
    assert.match(identity.reason, /unavailable/);
  }
  // No private switcher record is also uncertainty, not the saved account/hint.
  fs.writeFileSync(dispatch, JSON.stringify({ default: ['a1'], coordinators: { [email]: { default: ['pi'] } } }));
  const missingSwitcher = f.call(['agents', '--json'], { CLAUDE_CONFIG_DIR: path.join(f.dir, 'missing-switcher') });
  assert.equal(missingSwitcher.code, 0, missingSwitcher.out); assert.equal(JSON.parse(missingSwitcher.out).coordinator.status, 'unknown');
});
gapTests['coordinator-profile-types'] = isolatedCore(() => {
  const f = identityFixture('profile-types'), email = 'typed@example.test', other = 'other@example.test', dispatch = path.join(f.home, 'config', 'crew-dispatch.json');
  fs.mkdirSync(path.dirname(dispatch), { recursive: true }); f.status(email); assert.equal(f.call(['start']).code, 0);
  const cases = [];
  for (const field of ['model', 'effort', 'account']) for (const value of [{ toString: 0 }, [], 5, false, null, '']) cases.push([field, value]);
  for (const value of [{ toString: 0 }, [], '50', false, null, -1, 101]) cases.push(['floor', value]);
  for (const field of ['provider', 'family']) for (const value of [{ toString: 0 }, [], null, '']) cases.push([field, value]);
  cases.push(['extra', true]);
  for (const selected of [true, false]) {
    f.status(selected ? email : other);
    for (const [field, value] of cases) {
      fs.writeFileSync(dispatch, JSON.stringify({ default: ['a1'], coordinators: {
        [email]: { default: [{ harness: 'claude', [field]: value }] }, [other]: { default: ['a1'] },
      } }));
      const r = f.call(['agents', '--json']); assert.equal(r.code, 2, `${field}: ${JSON.stringify(value)}\n${r.out}`);
      assert.ok(r.out.includes('crew-dispatch.json'), r.out); assert.ok(r.out.includes(`coordinators.${email}.default[0].${field}`), r.out);
    }
    fs.writeFileSync(dispatch, JSON.stringify({ default: ['a1'], coordinators: { [email]: { default: [{ harness: 'a1', floor: 'overflow-floor' }] } } }).replace('"overflow-floor"', '1e400'));
    const overflow = f.call(['agents', '--json']); assert.equal(overflow.code, 2, overflow.out); assert.ok(overflow.out.includes(`coordinators.${email}.default[0].floor`), overflow.out);
  }
  // Even an unexpected validator exception must become a path-qualified refusal.
  const script = path.join(f.dir, 'throwing-profile.mjs');
  fs.writeFileSync(script, `import { main } from ${JSON.stringify(pathToFileURL(path.join(here, 'crew.mjs')).href)};
const parse = JSON.parse; JSON.parse = (...args) => {
  const value = parse(...args), section = value?.coordinators?.[${JSON.stringify(email)}], profile = section?.default?.[0];
  if (profile?.model === 'throw-section') Object.defineProperty(section, 'projects', { get() { throw new TypeError('injected section validator failure'); } });
  if (profile?.model === 'throw-validation') Object.defineProperty(profile, 'model', { get() { throw new TypeError('injected profile validator failure'); } });
  return value;
}; main(process.argv.slice(2));`);
  for (const model of ['throw-validation', 'throw-section']) for (const selected of [true, false]) {
    fs.writeFileSync(dispatch, JSON.stringify({ default: ['a1'], coordinators: { [email]: { default: [{ harness: 'claude', model }] } } }));
    f.status(selected ? email : other);
    const r = crew(['agents', '--json'], { script, cwd: f.home, terminal: f.owner, env: f.env });
    assert.equal(r.code, 2, r.out); assert.ok(r.out.includes(`coordinators.${email}${model === 'throw-validation' ? '.default[0]' : ''}`), r.out); assert.ok(r.out.includes('crew-dispatch.json'), r.out);
  }
  // Legitimate primitive fields still normalize normally; strictness stays scoped.
  fs.writeFileSync(dispatch, JSON.stringify({ default: [{ harness: 'a1', model: 123, floor: '50' }], coordinators: {
    [email]: { default: [{ harness: 'claude', model: 'opus', effort: 'high', account: 'worker@example.test', floor: 50, provider: 'claude' }] },
  } }));
  f.status(email); let shown = JSON.parse(f.call(['agents', '--json']).out); assert.equal(shown.candidates[0].floor, 50); assert.equal(shown.candidates[0].account, 'worker@example.test');
  f.status(other); shown = JSON.parse(f.call(['agents', '--json']).out); assert.equal(shown.candidates[0].model, '123'); assert.equal(shown.candidates[0].floor, 50);
});
gapTests['repair-scope'] = () => {
  for (const file of ['crew.mjs', 'crew.test.mjs', 'README.md', 'bin/crew', 'bin/crew.cmd', 'docs/guide.md']) assert.ok(repairFile(file), file);
  for (const file of ['.github/workflows/ci.yml', 'AGENTS.md', 'CLAUDE.md', 'package.json', 'scripts/build.mjs', 'LICENSE', '.gitignore', '.gitattributes', 'openspec/specs/tool-maintenance/spec.md', 'crew/crew.mjs', 'other.mjs', 'bin-other/file']) assert.ok(!repairFile(file), file);
};
function repairFixture(name, sharedOrigin) {
  const dir = path.join(root, `repair-${name}`), seed = path.join(dir, 'seed'), repo = path.join(dir, 'core'), origin = sharedOrigin || path.join(dir, 'github.com', 'acme', 'crew.git'), home = path.join(dir, 'home');
  const owner = `repair-owner-${name}`;
  fs.mkdirSync(seed, { recursive: true }); git('-C', seed, 'init', '-q', '-b', 'main');
  // Copy only the tool, never checkout metadata, infrastructure or nested scratch clones.
  for (const name of ['crew.mjs', 'crew.test.mjs', 'README.md', 'bin', 'docs']) fs.cpSync(path.join(here, name), path.join(seed, name), { recursive: true });
  commit(seed, { 'package.json': '{"private":true}\n', 'docs/selftest.mjs': "import fs from 'node:fs'; process.exit(fs.existsSync(new URL('./broken', import.meta.url)) ? 1 : 0);\n" }, 'baseline');
  if (!sharedOrigin) git('clone', '-q', '--bare', seed, origin);
  git('clone', '-q', slash(origin), repo);
  git('-C', repo, 'config', 'user.name', 't'); git('-C', repo, 'config', 'user.email', 't@example.invalid');
  const fakeGh = path.join(dir, 'gh.mjs'), log = path.join(dir, 'gh.json'), merged = path.join(dir, 'merged'), down = path.join(dir, 'gh-down'), deliveryLog = path.join(dir, 'delivery.json'), delivery = path.join(dir, 'delivery.mjs');
  fs.writeFileSync(log, '[]'); fs.writeFileSync(deliveryLog, '[]');
  fs.writeFileSync(fakeGh, `import fs from 'node:fs';
const a = process.argv.slice(2), file = ${JSON.stringify(log)}, log = JSON.parse(fs.readFileSync(file, 'utf8'));
log.push({ a, token: process.env.GH_TOKEN === 'fake-token', body: a.includes('--body-file') ? fs.readFileSync(a[a.indexOf('--body-file') + 1], 'utf8') : null }); fs.writeFileSync(file, JSON.stringify(log));
if (a[0] === 'auth') { console.log('fake-token'); process.exit(0); }
if (a.includes('graphql')) {
 const head = fs.existsSync(${JSON.stringify(merged)}) ? fs.readFileSync(${JSON.stringify(merged)}, 'utf8').trim() : '';
 const number = a.find(x => x.startsWith('number=')).slice(7);
 console.log(JSON.stringify({data:{repository:{nameWithOwner:'acme/crew',pullRequests:{totalCount:10},pullRequest:{url:'https://github.com/acme/crew/pull/'+number,state:head?'MERGED':'OPEN',headRefOid:head,mergedAt:head?'2026-01-01T00:00:00Z':null,closedAt:head?'2026-01-01T00:00:00Z':null}}}})); process.exit(0);
}
if (a[1] === 'list') { const head = fs.existsSync(${JSON.stringify(merged)}) ? fs.readFileSync(${JSON.stringify(merged)}, 'utf8').trim() : ''; console.log(JSON.stringify(head ? [{ headRefOid: head, state: 'MERGED', url: 'https://github.com/acme/crew/pull/' + log.filter(x => x.a[1] === 'create').length, mergedAt: '2026-01-01T00:00:00Z', closedAt: '2026-01-01T00:00:00Z' }] : [])); process.exit(0); }
if (a[1] === 'create' && fs.existsSync(${JSON.stringify(down)})) { console.error('GitHub temporarily unavailable'); process.exit(1); }
console.log('https://github.com/acme/crew/pull/' + log.filter(x => x.a[1] === 'create').length);
`);
  fs.writeFileSync(delivery, `import fs from 'node:fs'; const a = process.argv.slice(2), f = ${JSON.stringify(deliveryLog)}; fs.writeFileSync(f, JSON.stringify([...JSON.parse(fs.readFileSync(f, 'utf8')), a])); if (a[0] !== 'check-body' || !a.includes('--final')) process.exit(1);`);
  const script = path.join(repo, 'crew.mjs');
  const w = readWorld(); w.terminals[owner] = { address: owner, state: 'live', labels: {} }; fs.writeFileSync(world, JSON.stringify(w));
  const env = { CREW_CLAUDE_ACCOUNTS: '', CREW_GH: fakeGh, CREW_SELFTEST: 'node docs/selftest.mjs', CREW_WORKTREES: path.join(dir, 'copies') };
  const call = (args, extra = {}) => crew(args, { script, cwd: home, terminal: owner, env: { ...env, ...extra } });
  assert.equal(call(['init', home]).code, 0); assert.equal(call(['start']).code, 0);
  const task = id => JSON.parse(fs.readFileSync(path.join(home, 'tasks', id, 'task.json'), 'utf8'));
  const reported = t => { fs.writeFileSync(t.report, 'Repaired.'); const r = crew(['done', t.id], { script, cwd: home, terminal: t.terminal, env }); assert.equal(r.code, 0, r.out); };
  return { dir, repo, origin, home, call, task, reported, log, merged, down, delivery, deliveryLog, fakeGh, owner, env };
}
gapTests['root-layout'] = () => {
  const f = repairFixture('layout'), first = git('-C', f.repo, 'rev-parse', 'HEAD').trim();
  let r = f.call(['fix', '--agent', 'pi', 'Check root-layout repair.']); assert.equal(r.code, 0, r.out);
  const t = f.task('fix-1');
  assert.equal(t.projectPath, slash(f.repo), 'Default root is the script folder, not its parent');
  const brief = fs.readFileSync(t.brief, 'utf8');
  for (const text of ['`crew.mjs`', '`crew.test.mjs`', '`README.md`', '`node crew.test.mjs`', '`bin/`', '`docs/`']) assert.ok(brief.includes(text), text);
  assert.ok(!brief.includes('crew/crew.mjs'));
  // The same script works in a developer worktree whose .git is a file.
  assert.ok(fs.statSync(path.join(t.worktree, '.git')).isFile());
  r = crew(['fix', '--agent', 'pi', 'Already open.'], { script: path.join(t.worktree, 'crew.mjs'), cwd: f.home, terminal: f.owner, env: f.env });
  assert.match(r.out, /already open/); assert.equal(r.code, 2);
  f.reported(t);
  for (const file of ['.github/workflows/ci.yml', 'AGENTS.md', 'CLAUDE.md', 'package.json', 'scripts/build.mjs', 'LICENSE', '.gitignore', '.gitattributes', 'openspec/config.yaml', 'crew/crew.mjs']) {
    commit(t.worktree, { [file]: 'outside repair scope\n' }, 'out-of-scope repair');
    r = f.call(['selfrepair', t.id]); assert.equal(r.code, 6, r.out); assert.match(r.out, /outside crew's own files/);
    git('-C', t.worktree, 'reset', '-q', '--hard', first);
  }
  commit(t.worktree, { 'crew.test.mjs': "console.log('root default suite');\n", 'README.md': 'Root README repair.\n' }, 'fix(crew): check default root suite');
  r = f.call(['selfrepair', t.id], { CREW_SELFTEST: '' }); assert.equal(r.code, 0, r.out);
  const repaired = git('-C', t.worktree, 'rev-parse', 'HEAD').trim();
  git('-C', f.origin, 'update-ref', 'refs/heads/main', repaired);
  r = f.call(['start']); assert.equal(r.code, 0, r.out);
  assert.equal(git('-C', f.repo, 'rev-parse', 'HEAD').trim(), first, 'Developer clone never updates itself');
  r = f.call(['update']); assert.equal(r.code, 0, r.out); assert.match(r.out, /crew updated/);
  assert.equal(git('-C', f.repo, 'rev-parse', 'HEAD').trim(), repaired);
  assert.equal(f.call(['rollback'], { CREW_TOOL_ROOT: path.join(f.repo, 'docs') }).code, 2, 'A non-clone override must not inherit its parent repository revision');
  assert.equal(git('-C', f.repo, 'rev-parse', 'HEAD').trim(), repaired, 'Rejected override cannot roll back the parent clone');
  r = f.call(['rollback']); assert.equal(r.code, 0, r.out);
  assert.equal(git('-C', f.repo, 'rev-parse', 'HEAD').trim(), first);
  // Crash revision and root use the explicit override, with an isolated state directory.
  const user = path.join(f.dir, 'user'), installed = path.join(user, '.crew', 'core'), broken = path.join(f.dir, 'broken-home'); fs.mkdirSync(broken);
  git('clone', '-q', f.origin, installed); git('-C', installed, 'reset', '-q', '--hard', first);
  r = crew(['start'], { script: path.join(installed, 'crew.mjs'), cwd: f.home, terminal: f.owner, env: { ...f.env, HOME: user, USERPROFILE: user, CREW_AUTO_UPDATE: '', CREW_NO_UPDATE: '', CREW_TOOL_ROOT: '' } });
  assert.equal(r.code, 0, r.out); assert.match(r.out, /crew updated itself/);
  assert.equal(git('-C', installed, 'rev-parse', 'HEAD').trim(), repaired, 'Installed root clone updates without an override');
  const differentCase = path.join(user, '.crew', 'CORE');
  if (!WINDOWS) git('clone', '-q', f.origin, differentCase);
  git('-C', differentCase, 'reset', '-q', '--hard', first);
  r = crew(['start'], { script: path.join(differentCase, 'crew.mjs'), cwd: f.home, terminal: f.owner, env: { ...f.env, HOME: user, USERPROFILE: user, CREW_AUTO_UPDATE: '', CREW_NO_UPDATE: '', CREW_TOOL_ROOT: '' } });
  assert.equal(r.code, 0, r.out);
  assert.equal(git('-C', differentCase, 'rev-parse', 'HEAD').trim(), WINDOWS ? repaired : first, 'Only Windows treats CORE as the installed core folder');
  const crashes = path.join(user, '.crew', 'state', 'crashes');
  fs.writeFileSync(path.join(broken, 'crew.json'), JSON.stringify({ version: 1, tag: 'broken' }));
  r = crew(['project', 'list'], { cwd: broken, env: { HOME: user, USERPROFILE: user, CREW_TOOL_ROOT: t.worktree } });
  assert.equal(r.code, 2, r.out); assert.match(r.out, /invalid.*registry/);
  assert.ok(!fs.existsSync(crashes), 'A malformed registry is a refusal, not an internal crash');
  fs.writeFileSync(path.join(broken, 'crew.json'), JSON.stringify({ version: 1, tag: 'broken', projects: { demo: { path: f.repo } } }));
  r = crew(['project', 'list'], { script: unexpectedListScript(broken), cwd: broken, env: { HOME: user, USERPROFILE: user, CREW_TOOL_ROOT: t.worktree } });
  assert.equal(r.code, 70, r.out);
  const crash = fs.readFileSync(path.join(crashes, fs.readdirSync(crashes)[0]), 'utf8');
  assert.ok(crash.includes(`at ${repaired.slice(0, 8)} (${slash(t.worktree)})`), crash);
};
gapTests.selfrepair = () => {
  const f = repairFixture('root'), first = git('-C', f.origin, 'rev-parse', 'main').trim();
  let r = f.call(['fix', '--agent', 'pi', 'Repair the reported defect.']); assert.equal(r.code, 0, r.out);
  const t = f.task('fix-1'); f.reported(t);
  commit(t.worktree, { 'unrelated.txt': 'Not a tool file.\n' }, 'outside the allowlist');
  r = f.call(['selfrepair', t.id]); assert.equal(r.code, 6, r.out); assert.match(r.out, /outside crew's own files/);
  assert.equal(JSON.parse(fs.readFileSync(f.log, 'utf8')).length, 0);
  git('-C', t.worktree, 'reset', '-q', '--hard', 'HEAD~1');
  commit(t.worktree, { 'docs/repair.md': 'The repair.\n', 'README.md': 'The repaired root README.\n' }, 'fix(crew): repair the reported defect');
  const rejectedBody = path.join(f.dir, 'rejected-body.mjs'); fs.writeFileSync(rejectedBody, "console.error('invalid repair body'); process.exit(1);\n");
  r = f.call(['selfrepair', t.id], { CREW_TOOL_DELIVERY: rejectedBody }); assert.equal(r.code, 6, r.out); assert.match(r.out, /body was rejected/);
  assert.equal(spawnSync('git', ['-C', f.origin, 'rev-parse', '--verify', `refs/heads/${t.branch}`]).status, 128, 'Body rejection must precede publication');
  r = f.call(['selfrepair', t.id], { CREW_TOOL_DELIVERY: f.delivery }); assert.equal(r.code, 0, r.out);
  assert.match(r.out, /https:\/\/github.com\/acme\/crew\/pull\/1/); assert.match(r.out, /not updated/);
  assert.equal(f.task(t.id).pr, 'https://github.com/acme/crew/pull/1');
  assert.equal(git('-C', f.origin, 'rev-parse', 'main').trim(), first);
  assert.equal(git('-C', f.repo, 'rev-parse', 'HEAD').trim(), first);
  const tip = git('-C', t.worktree, 'rev-parse', 'HEAD').trim();
  assert.equal(git('-C', f.origin, 'rev-parse', t.branch).trim(), tip);
  const calls = JSON.parse(fs.readFileSync(f.log, 'utf8')), made = calls.find(x => x.a[1] === 'create');
  assert.deepEqual(calls.find(x => x.a[0] === 'auth').a, ['auth', 'token', '--user', 'acme']); assert.ok(made.token);
  assert.ok(made.a.includes('--draft')); assert.equal(made.a[made.a.indexOf('--base') + 1], 'main');
  assert.match(made.body, /^## Proposal[\s\S]*## Implementation\n\n- \[x\] [^\n]+[\s\S]*## Acceptance/); assert.ok(!made.body.includes('## Automation'));
  assert.equal((made.body.match(/^- \[x\]/gm) || []).length, 1, 'One delivered outcome describes this repair');
  assert.ok(made.body.includes('fix(crew): repair the reported defect')); assert.ok(!made.body.includes('- [ ]'));
  assert.deepEqual(JSON.parse(fs.readFileSync(f.deliveryLog, 'utf8'))[0].filter(a => a.startsWith('--')), ['--body-file', '--final']);
  r = f.call(['selfmerge', t.id]); assert.equal(r.code, 0, r.out); assert.match(r.out, /already has a pull request/);
  assert.equal(JSON.parse(fs.readFileSync(f.log, 'utf8')).filter(x => x.a[1] === 'create').length, 1);
  r = f.call(['finish', t.id]); assert.equal(r.code, 0, r.out);
  assert.ok(git('-C', f.repo, 'branch', '--list', t.branch).trim(), 'An unmerged repair keeps its commits');
  assert.equal(f.call(['fix', '--agent', 'pi', 'Repair another defect.']).code, 0);
  const t2 = f.task('fix-2'); f.reported(t2);
  const tip2 = commit(t2.worktree, { 'docs/second.md': 'Second repair.\n' }, 'fix(crew): repair another defect');
  assert.equal(f.call(['selfrepair', t2.id]).code, 0);
  fs.writeFileSync(f.merged, tip2);
  r = f.call(['finish', t2.id]); assert.equal(r.code, 0, r.out); assert.ok(r.out.includes(`merged branch ${t2.branch} deleted`), r.out);
};
gapTests['repair-two-homes'] = () => {
  const a = repairFixture('machine-one'), b = repairFixture('machine-two', a.origin);
  const first = git('-C', a.origin, 'rev-parse', 'main').trim();
  const tasks = [a, b].map((f, i) => {
    const r = f.call(['fix', '--agent', 'pi', `Repair machine ${i + 1}'s defect.`]); assert.equal(r.code, 0, r.out);
    const t = f.task('fix-1');
    commit(t.worktree, { [`docs/machine-${i + 1}.md`]: 'Repaired.\n' }, `fix(crew): repair machine ${i + 1}`); f.reported(t);
    return t;
  });
  for (const [i, f] of [a, b].entries()) {
    const r = f.call(['selfrepair', tasks[i].id], { CREW_GH: a.fakeGh }); assert.equal(r.code, 0, r.out);
  }
  for (const [i, f] of [a, b].entries()) {
    const tag = JSON.parse(fs.readFileSync(path.join(f.home, 'crew.json'), 'utf8')).tag;
    assert.equal(f.task(tasks[i].id).branch, `fix/${tag}-fix-1`);
    assert.equal(f.task(tasks[i].id).pr, `https://github.com/acme/crew/pull/${i + 1}`);
    assert.equal(git('-C', a.origin, 'rev-parse', tasks[i].branch).trim(), git('-C', tasks[i].worktree, 'rev-parse', 'HEAD').trim());
  }
  assert.notEqual(tasks[0].branch, tasks[1].branch); assert.equal(git('-C', a.origin, 'rev-parse', 'main').trim(), first);
  const made = JSON.parse(fs.readFileSync(a.log, 'utf8')).filter(x => x.a[1] === 'create');
  for (const [i, f] of [a, b].entries()) {
    const t = tasks[i]; assert.equal(made[i].a[made[i].a.indexOf('--head') + 1], t.branch);
    if (i) fs.writeFileSync(f.merged, git('-C', t.worktree, 'rev-parse', 'HEAD').trim());
    const r = f.call(['finish', t.id]); assert.equal(r.code, 0, r.out);
    assert.equal(Boolean(git('-C', f.repo, 'branch', '--list', t.branch).trim()), !i, 'Finish keeps the unmerged home branch and deletes the exact merged home branch');
  }
};
gapTests['repair-legacy-branch'] = () => {
  const f = repairFixture('legacy-branch'); assert.equal(f.call(['fix', '--agent', 'pi', 'A previously started repair.']).code, 0);
  const t = f.task('fix-1');
  // An existing task keeps its recorded local branch; do not infer a new name during delivery.
  git('-C', t.worktree, 'branch', '-m', 'fix/fix-1'); t.branch = 'fix/fix-1';
  fs.writeFileSync(path.join(f.home, 'tasks', t.id, 'task.json'), JSON.stringify(t));
  const tip = commit(t.worktree, { 'docs/legacy.md': 'Legacy repair.\n' }, 'fix(crew): deliver an existing repair'); f.reported(t);
  let r = f.call(['selfrepair', t.id]); assert.equal(r.code, 0, r.out); assert.equal(f.task(t.id).branch, t.branch);
  assert.equal(git('-C', f.origin, 'rev-parse', t.branch).trim(), tip);
  const made = JSON.parse(fs.readFileSync(f.log, 'utf8')).find(x => x.a[1] === 'create'); assert.equal(made.a[made.a.indexOf('--head') + 1], t.branch);
  fs.writeFileSync(f.merged, tip); r = f.call(['finish', t.id]); assert.equal(r.code, 0, r.out); assert.ok(r.out.includes(`merged branch ${t.branch} deleted`), r.out);
};
gapTests['repair-published-retry'] = () => {
  const f = repairFixture('published-retry'), first = git('-C', f.repo, 'rev-parse', 'HEAD').trim();
  assert.equal(f.call(['fix', '--agent', 'pi', 'A repair whose pull request must be retried.']).code, 0);
  const t = f.task('fix-1');
  const published = commit(t.worktree, { 'docs/retry.md': 'Repair.\n' }, 'fix(crew): recover after a GitHub outage'); f.reported(t);
  fs.writeFileSync(f.down, ''); let r = f.call(['selfrepair', t.id]); assert.equal(r.code, 4, r.out); assert.match(r.out, /branch .* is pushed, but the pull request was not opened/);
  assert.equal(f.task(t.id).pr, undefined); assert.equal(git('-C', f.origin, 'rev-parse', t.branch).trim(), published);
  const peer = path.join(f.dir, 'peer'); git('clone', '-q', f.origin, peer);
  const advanced = commit(peer, { 'upstream-only.txt': 'Another machine advanced main.\n' }, 'advance main'); git('-C', peer, 'push', '-q', 'origin', 'HEAD:main');
  fs.rmSync(f.down); r = f.call(['selfrepair', t.id]); assert.equal(r.code, 0, r.out);
  const delivered = git('-C', f.origin, 'rev-parse', t.branch).trim();
  assert.equal(spawnSync('git', ['-C', t.worktree, 'merge-base', '--is-ancestor', published, delivered]).status, 0, 'The original published repair remains in history');
  assert.equal(spawnSync('git', ['-C', t.worktree, 'merge-base', '--is-ancestor', advanced, delivered]).status, 0, 'The retried repair also includes the current main');
  assert.equal(git('-C', f.origin, 'rev-parse', 'main').trim(), advanced); assert.equal(git('-C', f.repo, 'rev-parse', 'HEAD').trim(), first);
  const made = JSON.parse(fs.readFileSync(f.log, 'utf8')).filter(x => x.a[1] === 'create');
  assert.equal(made.length, 2); assert.equal(made[1].a[made[1].a.indexOf('--head') + 1], t.branch);
  assert.ok(f.task(t.id).pr); r = f.call(['selfrepair', t.id]); assert.equal(r.code, 0, r.out); assert.match(r.out, /already has a pull request/);
  assert.equal(JSON.parse(fs.readFileSync(f.log, 'utf8')).filter(x => x.a[1] === 'create').length, 2);
};
function gapFixture(name, extra = {}) {
  const dir = path.join(root, `gap-${name}`), home = path.join(dir, 'home'), repo = path.join(dir, 'repo');
  fs.mkdirSync(repo, { recursive: true }); git('-C', repo, 'init', '-q');
  commit(repo, { 'README.md': 'baseline\n', '.gitignore': 'scratch/\nloose.log\n' }, 'baseline');
  const owner = `owner-${name}`, w = readWorld(); w.terminals[owner] = { address: owner, state: 'live', labels: {} }; fs.writeFileSync(world, JSON.stringify(w));
  const call = (args, env = {}) => crew(args, { cwd: home, terminal: owner, env: { CREW_CLAUDE_ACCOUNTS: '', ...extra, ...env } });
  assert.equal(call(['init', home]).code, 0);
  assert.equal(call(['project', 'add', 'demo', repo]).code, 0);
  assert.equal(call(['start']).code, 0);
  const taskFile = id => path.join(home, 'tasks', id, 'task.json');
  const task = id => JSON.parse(fs.readFileSync(taskFile(id), 'utf8'));
  const save = t => fs.writeFileSync(taskFile(t.id), JSON.stringify(t));
  const spawn = (id, flags = []) => { const r = call(['spawn', id, '--project', 'demo', ...flags, 'Count lines.']); assert.equal(r.code, 0, r.out); return task(id); };
  const guest = t => { const w = readWorld(); w.terminals[`guest-${name}`] = { address: `guest-${name}`, state: 'live', labels: {}, cwd: t.worktree }; fs.writeFileSync(world, JSON.stringify(w)); };
  const leave = () => { const w = readWorld(); delete w.terminals[`guest-${name}`]; fs.writeFileSync(world, JSON.stringify(w)); };
  return { dir, home, repo, call, task, save, spawn, guest, leave };
}
// Concurrent CLIs with test-only filesystem barriers: no timing guesses or production hooks.
function projectProcess(f, args, { script = path.join(here, 'crew.mjs'), terminal = '', env = {} } = {}) {
  const child = spawn(process.execPath, [script, ...args], { cwd: f.home, env: {
    ...process.env, HOME: path.join(f.dir, 'user'), USERPROFILE: path.join(f.dir, 'user'),
    CREW_CLAUDE_CONFIG: path.join(f.dir, 'claude.json'),
    CREW_HOME: f.home, CREW_HC: fake, CREW_TERMINAL: terminal, HC_TERMINAL_ID: '', CLAUDE_CONFIG_DIR: '', CREW_CLAUDE_ACCOUNT: '', CREW_CLAUDE_ACCOUNTS: '',
    CREW_TOOL_PATH: path.join(root, 'no-tools'), CREW_WORKTREES: path.join(f.dir, 'copies'),
    ...Object.fromEntries(TOOLS.map(t => [`CREW_TOOL_${t.id.toUpperCase().replace(/-/g, '_')}`, ''])), ...env,
  }, stdio: ['ignore', 'pipe', 'pipe'] });
  let out = '';
  child.stdout.on('data', data => { out += data; }); child.stderr.on('data', data => { out += data; });
  const result = new Promise((resolve, reject) => { child.on('error', reject); child.on('close', code => resolve({ code, out })); });
  return { child, result };
}
const until = async predicate => {
  const deadline = Date.now() + 15000;
  while (!predicate()) { assert.ok(Date.now() < deadline, 'Timed out waiting for CLI barrier'); await new Promise(r => setTimeout(r, 10)); }
};
function projectBarrier(f, phase, label = phase) {
  const ready = path.join(f.dir, `ready-${label}`), release = path.join(f.dir, `release-${label}`), script = path.join(f.dir, `barrier-${label}.mjs`);
  fs.writeFileSync(script, `import fs from 'node:fs'; import { main } from ${JSON.stringify(pathToFileURL(path.join(here, 'crew.mjs')).href)};
const ready = ${JSON.stringify(ready)}, release = ${JSON.stringify(release)};
const method = ${JSON.stringify(phase === 'before' ? 'openSync' : 'unlinkSync')}, original = fs[method]; let paused = false;
fs[method] = function(file, ...args) {
  if (paused || !String(file).endsWith('projects.lock')) return original.call(fs, file, ...args);
  paused = true;
  const result = method === 'unlinkSync' ? original.call(fs, file, ...args) : undefined;
  fs.writeFileSync(ready, 'ready'); const deadline = Date.now() + 15000;
  while (!fs.existsSync(release)) { if (Date.now() > deadline) throw Error('Barrier timeout'); Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 10); }
  return method === 'openSync' ? original.call(fs, file, ...args) : result;
}; main(process.argv.slice(2));`);
  return { ready, release, script };
}
gapTests['registry-sharing'] = async () => {
  const f = gapFixture('registry-sharing'), registry = path.join(f.home, 'crew.json'), lock = path.join(f.home, 'projects.lock');
  const cases = [
    ['transient', ['EPERM', 'EACCES', 'EBUSY'], false],
    ...['EPERM', 'EACCES', 'EBUSY'].map(code => [`persistent-${code}`, [code], true]),
    ['permanent', ['ENOSPC'], false],
  ];
  for (const [label, errors, persistent] of cases) {
    const before = fs.readFileSync(registry, 'utf8'), log = path.join(f.dir, `${label}.json`), script = path.join(f.dir, `${label}.mjs`);
    fs.writeFileSync(script, `import fs from 'node:fs'; import { main } from ${JSON.stringify(pathToFileURL(path.join(here, 'crew.mjs')).href)};
const registry = ${JSON.stringify(registry)}, lock = ${JSON.stringify(lock)}, log = ${JSON.stringify(log)};
const errors = ${JSON.stringify(errors)}, persistent = ${persistent}, calls = [], original = fs.renameSync, clock = Date.now;
fs.renameSync = (from, to) => {
  if (to !== registry) return original(from, to);
  calls.push({ from, to, destination: fs.readFileSync(to, 'utf8'), temporary: fs.readFileSync(from, 'utf8'), lock: fs.readFileSync(lock, 'utf8') });
  fs.writeFileSync(log, JSON.stringify(calls));
  if (persistent || calls.length <= errors.length) {
    // Advance the clock only after a retry, so persistent-error tests prove both
    // retry and timeout without adding seconds to each run of the main suite.
    if (persistent && calls.length === 2) Date.now = () => clock() + 10000;
    throw Object.assign(new Error('injected sharing error'), { code: errors[(calls.length - 1) % errors.length] });
  }
  return original(from, to);
}; main(process.argv.slice(2));`);
    const result = await projectProcess(f, ['project', 'add', 'sharing', f.repo], { script }).result;
    const success = WINDOWS && label === 'transient'; assert.equal(result.code, success ? 0 : 70, result.out);
    const calls = JSON.parse(fs.readFileSync(log, 'utf8'));
    assert.equal(calls.length, WINDOWS ? (success ? 4 : persistent ? 2 : 1) : 1, label);
    for (const attempt of calls) {
      assert.equal(attempt.destination, before, 'Destination stays intact until atomic replacement');
      assert.equal(attempt.from, calls[0].from, 'Retries retain the same temporary file');
      assert.equal(attempt.temporary, calls[0].temporary, 'Temporary snapshot is retained intact');
      assert.equal(attempt.lock, calls[0].lock, 'Registry lock stays held throughout replacement retries');
      assert.ok(JSON.parse(attempt.lock).token); assert.ok(JSON.parse(attempt.temporary).projects.sharing);
    }
    if (success) assert.ok(JSON.parse(fs.readFileSync(registry, 'utf8')).projects.sharing);
    else assert.equal(fs.readFileSync(registry, 'utf8'), before, 'Exhausted/nonretryable errors leave the registry untouched');
    assert.ok(!fs.existsSync(lock)); assert.ok(!fs.readdirSync(f.home).some(name => name.endsWith('.tmp')));
  }
};
gapTests['project-registry'] = async () => {
  const f = gapFixture('project-registry'), file = path.join(f.home, 'crew.json'), lock = path.join(f.home, 'projects.lock');
  const settings = args => crew(args, { cwd: f.home }), read = () => JSON.parse(fs.readFileSync(file, 'utf8'));
  const owner = fs.readFileSync(path.join(f.home, 'owner.json'), 'utf8');
  const initial = { ...read(), future: { keep: ['metadata'] } }; fs.writeFileSync(file, JSON.stringify(initial));
  for (const terminal of ['', 'another-terminal', 'owner-project-registry']) {
    const call = args => crew(args, { cwd: f.home, terminal });
    assert.equal(call(['project', 'add', 'extra', f.repo, '--workflow', 'plain']).code, 0);
    assert.equal(call(['project', 'add', 'extra', f.repo]).code, 0);
    assert.equal(read().projects.extra.workflow, undefined, 'Re-adding drops omitted options');
    assert.equal(call(['project', 'remove', 'extra']).code, 0);
  }
  for (const verb of ['spawn', 'stop', 'finish']) {
    const r = settings([verb, 'nothing']); assert.equal(r.code, 3, r.out);
    assert.ok(r.out.includes(`Crew home ${slash(f.home)}`), r.out);
    assert.match(r.out, new RegExp(`terminal owner-project-registry.*Only that coordinator may ${verb} work`));
    assert.match(r.out, /does not mean a project folder is in use/);
  }
  const release = settings(['end']); assert.equal(release.code, 3); assert.match(release.out, /terminal owner-project-registry.*release this home/);
  const w = readWorld(); w.silent = true; fs.writeFileSync(world, JSON.stringify(w));
  assert.equal(settings(['project', 'add', 'silent', f.repo]).code, 0, 'Registration needs no Core query');
  let r = crew(['start'], { cwd: f.home, terminal: 'other' }); assert.equal(r.code, 4, r.out); assert.ok(r.out.includes(slash(f.home)));
  delete w.silent; fs.writeFileSync(world, JSON.stringify(w));
  assert.equal(settings(['project', 'remove', 'silent']).code, 0);
  assert.equal(settings(['project', 'add', 'new', f.repo]).code, 0);
  r = f.call(['spawn', 'new-task', '--project', 'new', 'Count lines.']); assert.equal(r.code, 0, r.out);
  r = settings(['project', 'remove', 'new']); assert.equal(r.code, 2); assert.match(r.out, /unfinished tasks: new-task/);
  const t = f.task('new-task'); f.save({ ...t, state: 'closed', copyToReturn: { since: 'now' } });
  r = settings(['project', 'remove', 'new']); assert.equal(r.code, 2); assert.match(r.out, /copies of finished tasks.*new-task/);
  const other = path.join(f.dir, 'other'); fs.mkdirSync(other); git('-C', other, 'init', '-q');
  r = settings(['project', 'add', 'new', other]); assert.match(r.out, /Pass --replace/);
  r = settings(['project', 'add', 'new', other, '--replace']); assert.match(r.out, /copies of finished tasks.*new-task/);
  f.save({ ...t, state: 'failed' });
  r = settings(['project', 'add', 'new', other, '--replace']); assert.match(r.out, /unfinished tasks: new-task/);
  f.save({ ...t, state: 'closed' });
  assert.equal(settings(['project', 'add', 'new', other, '--replace']).code, 0);
  assert.equal(settings(['project', 'remove', 'new']).code, 0);
  fs.writeFileSync(path.join(f.home, 'tasks', t.id, 'task.json'), '{broken');
  r = settings(['project', 'remove', 'demo']); assert.equal(r.code, 2); assert.match(r.out, /cannot check task references/);
  f.save({ ...t, state: 'closed' });
  r = settings(['project', 'remove', 'unknown']); assert.equal(r.code, 2); assert.ok(!fs.existsSync(lock), 'Refusal releases lock');
  fs.writeFileSync(lock, JSON.stringify({ pid: 99999999, token: 'abandoned' }));
  const before = fs.readFileSync(file, 'utf8');
  r = settings(['project', 'add', 'locked', f.repo]); assert.equal(r.code, 3); assert.match(r.out, /projects.lock.*PID 99999999.*confirming no process/);
  assert.equal(fs.readFileSync(file, 'utf8'), before); assert.ok(fs.existsSync(lock)); fs.unlinkSync(lock);
  fs.writeFileSync(file, JSON.stringify({ version: 1, projects: [] }));
  r = settings(['project', 'add', 'broken', f.repo]); assert.equal(r.code, 2); assert.match(r.out, /invalid.*registry/);
  fs.writeFileSync(file, before);
  const writers = Array.from({ length: 6 }, (_, i) => projectProcess(f, ['project', 'add', `p${i}`, f.repo], { terminal: i ? '' : 'owner-project-registry' }));
  let done = false; const all = Promise.all(writers.map(p => p.result)).then(results => { done = true; return results; });
  while (!done) { assert.equal(read().version, 1); await new Promise(r => setTimeout(r, 5)); }
  for (const result of await all) assert.equal(result.code, 0, result.out);
  for (let i = 0; i < 6; i++) assert.ok(read().projects[`p${i}`]);
  const edits = [projectProcess(f, ['project', 'remove', 'p0']), projectProcess(f, ['project', 'add', 'p6', f.repo])];
  for (const result of await Promise.all(edits.map(p => p.result))) assert.equal(result.code, 0, result.out);
  assert.equal(read().projects.p0, undefined); assert.ok(read().projects.p6); assert.deepEqual(read().future, initial.future); assert.equal(read().tag, initial.tag);
  assert.equal(fs.readFileSync(path.join(f.home, 'owner.json'), 'utf8'), owner);
  // Force an owner to hold a stale initial snapshot while Settings commits a new entry.
  const stale = projectBarrier(f, 'before', 'stale');
  const owning = projectProcess(f, ['project', 'add', 'owner-edit', f.repo], { script: stale.script, terminal: 'owner-project-registry' });
  try {
    await until(() => fs.existsSync(stale.ready));
    assert.equal(settings(['project', 'add', 'settings-edit', f.repo]).code, 0);
    fs.writeFileSync(stale.release, 'go'); assert.equal((await owning.result).code, 0);
    assert.ok(read().projects['owner-edit']); assert.ok(read().projects['settings-edit']);
  } finally { fs.writeFileSync(stale.release, 'go'); await owning.result; }
  // Corruption after the command's initial read is still caught inside the transaction.
  const gate = projectBarrier(f, 'before');
  const pending = projectProcess(f, ['project', 'remove', 'demo'], { script: gate.script });
  try {
    await until(() => fs.existsSync(gate.ready)); fs.writeFileSync(file, '{broken'); fs.writeFileSync(gate.release, 'go');
    const result = await pending.result; assert.equal(result.code, 2, result.out); assert.match(result.out, /invalid.*registry/);
    assert.equal(fs.readFileSync(file, 'utf8'), '{broken'); assert.ok(!fs.existsSync(lock));
  } finally { fs.writeFileSync(gate.release, 'go'); await pending.result; fs.writeFileSync(file, before); }
  const failing = path.join(f.dir, 'failed-write.mjs');
  fs.writeFileSync(failing, `import fs from 'node:fs'; import { main } from ${JSON.stringify(pathToFileURL(path.join(here, 'crew.mjs')).href)};
const original = fs.renameSync; fs.renameSync = (from, to) => { if (String(to).endsWith('crew.json')) throw Error('injected write failure'); return original(from, to); }; main(process.argv.slice(2));`);
  const failure = await projectProcess(f, ['project', 'add', 'unwritten', f.repo], { script: failing }).result;
  assert.equal(failure.code, 70); assert.equal(fs.readFileSync(file, 'utf8'), before); assert.ok(!fs.existsSync(lock));
  assert.ok(!fs.readdirSync(f.home).some(name => name.endsWith('.tmp')), 'Failed writes clean their temporary files');
};
gapTests['project-admission'] = async () => {
  for (const phase of ['before', 'after']) for (const edit of ['remove', 'replace']) {
    const f = gapFixture(`admit-${phase}-${edit}`), gate = projectBarrier(f, phase);
    const other = path.join(f.dir, 'other'); fs.mkdirSync(other); git('-C', other, 'init', '-q'); commit(other, { 'README.md': 'replacement\n' }, 'init');
    const p = projectProcess(f, ['spawn', 'race', '--project', 'demo', 'Count lines.'], { script: gate.script, terminal: `owner-admit-${phase}-${edit}` });
    try {
      await until(() => fs.existsSync(gate.ready));
      const r = crew(edit === 'remove' ? ['project', 'remove', 'demo'] : ['project', 'add', 'demo', other, '--replace'], { cwd: f.home });
      assert.equal(r.code, phase === 'before' ? 0 : 2, r.out);
      if (phase === 'after') assert.match(r.out, /unfinished tasks: race\[preparing\]/);
      fs.writeFileSync(gate.release, 'go'); const result = await p.result;
      assert.equal(result.code, phase === 'before' && edit === 'remove' ? 2 : 0, result.out);
      if (phase === 'before' && edit === 'remove') { assert.match(result.out, /Unknown project/); assert.ok(!fs.existsSync(path.join(f.home, 'tasks', 'race'))); }
      else assert.equal(fs.readFileSync(path.join(f.task('race').worktree, 'README.md'), 'utf8').trim(), phase === 'before' ? 'replacement' : 'baseline');
    } finally { if (!fs.existsSync(gate.release)) fs.writeFileSync(gate.release, 'go'); await p.result; }
  }
};

gapTests['project-names'] = () => {
  const f = gapFixture('project-names'), name = 'agentnumberone.dev', repo = path.join(f.dir, name);
  git('clone', '-q', f.repo, repo);
  const settings = args => crew(args, { cwd: f.home });
  for (const good of ['a', '0', 'a-', 'a.b', 'constructor', 'a'.repeat(38) + '.x', '.bad', '.a', '.0', '.xrbuild', '.' + 'a'.repeat(39), name]) assert.equal(projectNameError(good), null, good);
  const invalid = [['', /required/], ['a'.repeat(41), /at most 40/], ['Bad', /start with/], ['-bad', /start with/], ['.', /start with/], ['..a', /start with/], ['.-a', /start with/], ['.A', /start with/], ['.' + 'a'.repeat(40), /at most 40/], ['a/b', /only lowercase/], ['a_b', /only lowercase/], ['a b', /only lowercase/], ['aé', /ASCII/], ['a..b', /consecutive dots/], ['a.', /trailing dot/]];
  for (const [bad, reason] of invalid) {
    assert.match(projectNameError(bad), reason);
    for (const args of [['project', 'add', bad, repo], ['project', 'remove', bad], ['spawn', 'invalid-name', '--project', bad, 'Task'], ['agents', '--project', bad, '--json']]) {
      const r = f.call(args); assert.equal(r.code, 2, `${JSON.stringify(args)}: ${r.out}`);
      assert.match(r.out, /Invalid project name/); assert.match(r.out, reason); assert.ok(!r.out.includes('Usage:'), r.out);
    }
  }
  let r = f.call(['spawn', 'unknown', '--project', 'constructor', 'Task']); assert.equal(r.code, 2); assert.match(r.out, /Unknown project: constructor/);
  assert.equal(settings(['project', 'add', 'constructor', repo]).code, 0, 'An inherited property is not an existing registration');
  r = f.call(['agents', '--project', 'constructor', '--json']); assert.equal(r.code, 0, r.out);
  assert.equal(settings(['project', 'remove', 'constructor']).code, 0);
  assert.equal(settings(['project', 'add', name, repo, '--workflow', 'plain']).code, 0);
  assert.equal(settings(['project', 'add', 'agentnumberone-dev', f.repo]).code, 0, 'Dots and dashes remain distinct');
  assert.ok(settings(['project', 'list']).out.includes(`${name}\t${slash(repo)}\tworkflow plain`));
  const config = path.join(f.home, 'config'); fs.mkdirSync(config);
  fs.writeFileSync(path.join(config, 'crew-dispatch.json'), JSON.stringify({ default: [{ harness: 'a1' }], projects: { [name]: [{ harness: 'pi', model: 'openai/example' }] } }));
  r = f.call(['agents', '--project', name, '--json']); assert.equal(r.code, 0, r.out); assert.equal(JSON.parse(r.out).source, `projects.${name}`);
  const tasks = [];
  for (const [id, kind] of [['dot-scout', 'scout'], ['dot-ship', 'ship']]) {
    r = f.call(['spawn', id, '--project', name, '--kind', kind, 'Task']); assert.equal(r.code, 0, r.out);
    const t = f.task(id); tasks.push(t); assert.equal(t.project, name); assert.equal(t.agent, 'pi'); assert.equal(t.launch.source, `projects.${name}`);
    assert.equal(path.basename(t.worktree), id); assert.ok(fs.readFileSync(t.brief, 'utf8').includes(`project \`${name}\``));
    if (kind === 'ship') { assert.equal(t.branch, `feature/${id}`); assert.equal(git('-C', t.worktree, 'branch', '--show-current').trim(), t.branch); }
    else assert.equal(git('-C', t.worktree, 'rev-parse', '--abbrev-ref', 'HEAD').trim(), 'HEAD');
  }
  r = f.call(['spawn', 'dot.task', '--project', name, 'Task']); assert.equal(r.code, 2); assert.ok(!fs.existsSync(path.join(f.home, 'tasks', 'dot.task')));
  assert.ok(!validId(name), 'Dotted project names do not relax task IDs');
  assert.ok(f.call(['status']).out.includes(`\t${name}\t`));
  for (const t of JSON.parse(f.call(['status', '--json']).out).tasks) assert.equal(t.project, name);
  const backlog = path.join(f.dir, 'backlog.mjs'), log = path.join(f.dir, 'backlog-args.json');
  fs.writeFileSync(backlog, `import fs from 'node:fs'; fs.writeFileSync(${JSON.stringify(log)}, JSON.stringify(process.argv.slice(2))); console.log('ok');`);
  r = f.call(['backlog', 'add', 'queued', 'Task', '--project', name], { CREW_TOOL_TASKS_AXI: backlog }); assert.equal(r.code, 0, r.out);
  assert.deepEqual(JSON.parse(fs.readFileSync(log, 'utf8')), ['add', 'queued', 'Task', '--project', name, '--file', path.join(f.home, 'backlog.md')]);
  r = settings(['project', 'remove', name]); assert.equal(r.code, 2); assert.match(r.out, /unfinished tasks/);
  for (const t of tasks) { setTerminal(t.terminal, { status: { app: 'pi', state: 'idle' } }); r = f.call(['finish', t.id]); assert.equal(r.code, 0, r.out); }
  assert.equal(settings(['project', 'add', name, f.repo, '--replace']).code, 0);
  assert.equal(settings(['project', 'remove', name]).code, 0); assert.ok(fs.existsSync(repo));
  assert.ok(settings(['project', 'list']).out.includes('agentnumberone-dev\t'));
};
gapTests['project-leading-dot'] = () => {
  const f = gapFixture('project-leading-dot'), name = '.xrbuild', repo = path.join(f.dir, 'xrbuild', name);
  git('clone', '-q', f.repo, repo);
  const settings = args => crew(args, { cwd: f.home });
  assert.equal(projectNameError('.x'), null); assert.match(projectNameError('.-x'), /one dot followed by one/);
  assert.equal(settings(['project', 'add', 'xrbuild', f.repo, '--workflow', 'plain']).code, 0);
  let r = settings(['project', 'add', name, repo, '--workflow', 'plain']); assert.equal(r.code, 0, r.out);
  const list = settings(['project', 'list']).out;
  assert.ok(list.includes(`${name}	${slash(repo)}	workflow plain`), list); assert.ok(list.includes(`xrbuild	${slash(f.repo)}	`), 'Dotted and plain names stay distinct');
  r = f.call(['spawn', 'dot-lead', '--project', name, '--kind', 'ship', 'Task']); assert.equal(r.code, 0, r.out);
  const t = f.task('dot-lead'); assert.equal(t.project, name); assert.equal(t.branch, 'feature/dot-lead');
  assert.equal(git('-C', t.worktree, 'branch', '--show-current').trim(), t.branch);
  assert.equal(path.basename(t.worktree), 'dot-lead');
  for (const value of [t.branch, slash(t.worktree)]) assert.ok(!value.includes(name), `${value} must not contain the project name`);
  for (const s of JSON.parse(f.call(['status', '--json']).out).tasks) assert.equal(s.project, name);
  r = settings(['project', 'remove', name]); assert.equal(r.code, 2); assert.match(r.out, /unfinished tasks/);
  setTerminal(t.terminal, { status: { app: 'pi', state: 'idle' } }); r = f.call(['finish', t.id]); assert.equal(r.code, 0, r.out);
  r = settings(['project', 'remove', name]); assert.equal(r.code, 0, r.out); assert.ok(fs.existsSync(repo));
  const after = settings(['project', 'list']).out; assert.ok(!after.includes(`${name}	`), after); assert.ok(after.includes('xrbuild	'), after);
};
gapTests['project-pool'] = () => {
  const f = gapFixture('project-pool'), name = 'agentnumberone.dev', repo = path.join(f.dir, name);
  git('clone', '-q', f.repo, repo);
  const delivery = path.join(f.dir, 'delivery.mjs'), log = path.join(f.dir, 'delivery-log.json'), pool = path.join(f.dir, 'pool.folder');
  fs.writeFileSync(log, '[]');
  fs.writeFileSync(delivery, `import fs from 'node:fs'; import path from 'node:path'; import { spawnSync } from 'node:child_process';
const a = process.argv.slice(2), log = ${JSON.stringify(log)};
fs.writeFileSync(log, JSON.stringify([...JSON.parse(fs.readFileSync(log, 'utf8')), { args: a, cwd: process.cwd() }]));
if (a[0] === 'start') {
  const branch = a[1] === '--detach' ? null : a[1], id = branch ? branch.split('/').at(-1) : a[2];
  const slot = path.join(${JSON.stringify(pool)}, id, 'agentnumberone.dev'); fs.mkdirSync(path.dirname(slot), { recursive: true });
  const r = spawnSync('git', ['worktree', 'add', ...(branch ? ['-b', branch] : ['--detach']), slot, 'HEAD'], { encoding: 'utf8' });
  if (r.status !== 0) { console.error(r.stderr); process.exit(1); }
  console.log(JSON.stringify({ path: slot, created: true, pooled: true }));
} else if (a[0] === '--version') console.log('1.0.0'); else process.exit(1);`);
  const call = args => f.call(args, { CREW_TOOL_DELIVERY: delivery });
  assert.equal(call(['project', 'add', name, repo, '--workflow', 'plain']).code, 0);
  for (const [id, kind] of [['pool-scout', 'scout'], ['pool-ship', 'ship']]) {
    const r = call(['spawn', id, '--project', name, '--kind', kind, 'Task']); assert.equal(r.code, 0, r.out);
    const t = f.task(id); assert.equal(t.project, name); assert.equal(t.via, 'delivery'); assert.equal(t.pooled, true);
    assert.equal(t.worktree, slash(path.join(pool, id, name))); assert.ok(fs.existsSync(path.join(t.worktree, 'README.md')));
    if (kind === 'ship') assert.equal(t.branch, 'feature/pool-ship');
  }
  const starts = JSON.parse(fs.readFileSync(log, 'utf8')).filter(c => c.args[0] === 'start');
  assert.deepEqual(starts.map(c => c.args), [['start', '--detach', 'pool-scout', '--json'], ['start', 'feature/pool-ship', '--json']]);
  for (const c of starts) assert.equal(slash(c.cwd), slash(repo));
  for (const t of JSON.parse(call(['status', '--json']).out).tasks) assert.equal(t.project, name);
};

gapTests['platform-paths'] = () => {
  const f = gapFixture('platform-paths');
  for (const [id, variant] of [
    ['case', p => p.replace(/case$/, 'CASE')],
    ['slashes', p => p.replace(/\/(?=[^/]+$)/, '\\')],
    ['child', p => `${p}/child`],
    ['sibling', p => `${p}-other`],
  ]) {
    const t = f.spawn(id), holds = id === 'child' || (WINDOWS && id !== 'sibling');
    f.guest(t);
    const w = readWorld(), guest = w.terminals['guest-platform-paths'];
    guest.cwd = variant(t.worktree);
    // A label differing only in case has moved on POSIX, but not on Windows.
    guest.labels['custom.cwd'] = t.worktree.replace(/[^/]+$/, name => name.toUpperCase());
    fs.writeFileSync(world, JSON.stringify(w));
    const r = f.call(['finish', id]); assert.equal(r.code, 0, r.out);
    assert.equal(Boolean(f.task(id).copyToReturn), holds, `${id}: ${r.out}`);
    assert.equal(fs.existsSync(t.worktree), holds, `${id}: ${r.out}`);
    if (holds) assert.equal(r.out.includes('opened in the copy, now in'), !WINDOWS, r.out);
    f.leave();
    assert.equal(f.call(['finish', id]).code, 0);
    assert.ok(!fs.existsSync(t.worktree));
  }
};
// Real Git, isolated origin, verified fake GitHub: never contacts the person's accounts.
function leftoversFixture(name) {
  const f = gapFixture(`leftovers-${name}`), origin = path.join(f.dir, 'origin.git');
  git('init', '-q', '--bare', origin);
  git('-C', f.repo, 'remote', 'add', 'origin', 'https://github.com/acme/demo.git');
  git('-C', f.repo, 'config', `url.${slash(origin)}.insteadOf`, 'https://github.com/acme/demo.git');
  git('-C', f.repo, 'config', 'user.name', 't'); git('-C', f.repo, 'config', 'user.email', 't@example.invalid');
  commit(f.repo, { '.gitignore': 'scratch/\n.artifacts/\n' }, 'ignore scratch');
  const control = path.join(f.dir, 'pr.json'), gh = path.join(f.dir, 'gh.mjs');
  fs.writeFileSync(gh, `import fs from 'node:fs'; const pr = JSON.parse(fs.readFileSync(${JSON.stringify(control)}));
if (pr.down) process.exit(1);
if (process.argv.includes('graphql')) console.log(JSON.stringify({data:{repository:{nameWithOwner:'acme/demo',pullRequests:{totalCount:1},pullRequest:pr}}}));
else console.log(JSON.stringify(pr.state === 'MERGED' ? [pr] : []));`);
  const call = (args, env = {}) => f.call(args, { CREW_GH: gh, ...env });
  const spawn = (id, { recordPr = true } = {}) => {
    const t = f.spawn(id, ['--kind', 'ship', '--agent', 'pi']);
    const head = commit(t.worktree, { 'change.txt': id }, 'work');
    git('-C', t.worktree, 'push', '-q', 'origin', `HEAD:${t.branch}`);
    const pr = { url: 'https://github.com/acme/demo/pull/12', state: 'MERGED', headRefOid: head, headRefName: t.branch,
      headRepository: { nameWithOwner: 'acme/demo' }, mergedAt: '2026-01-01T00:00:00Z', closedAt: '2026-01-01T00:00:00Z' };
    fs.writeFileSync(control, JSON.stringify(pr));
    fs.writeFileSync(t.report, `Implementation: ${pr.url}\n`);
    f.save({ ...t, state: 'reported', ...(recordPr ? { pr: pr.url } : {}) });
    fs.mkdirSync(path.join(t.worktree, '.artifacts')); fs.writeFileSync(path.join(t.worktree, '.artifacts', 'KEEP'), '');
    fs.writeFileSync(path.join(t.worktree, '.artifacts', 'proof.png'), 'picture');
    return t;
  };
  const pr = patch => fs.writeFileSync(control, JSON.stringify({ ...JSON.parse(fs.readFileSync(control)), ...patch }));
  return { ...f, origin, control, call, spawn, pr };
}
gapTests['closed-scratch'] = async () => {
  const f = leftoversFixture('scratch');
  for (const state of ['MERGED', 'CLOSED']) {
    const t = f.spawn(state.toLowerCase()); f.pr({ state, ...(state === 'CLOSED' ? { mergedAt: null } : {}) });
    const probe = path.join(t.worktree, '.artifacts', 'gh-probe'); git('init', '-q', probe); commit(probe, { note: 'throwaway' }, 'probe');
    const outside = path.join(f.dir, `outside-${state}`); fs.mkdirSync(outside); fs.writeFileSync(path.join(outside, 'keep'), 'mine');
    fs.symlinkSync(outside, path.join(t.worktree, '.artifacts', 'link'), WINDOWS ? 'junction' : 'dir');
    const socket = path.join(t.worktree, '.artifacts', 'herdr-app.sock');
    const server = WINDOWS ? null : net.createServer();
    if (server) await new Promise((resolve, reject) => { server.once('error', reject); server.listen(socket, resolve); });
    else fs.writeFileSync(socket, 'unreadable socket placeholder');
    const preload = path.join(f.dir, 'unreadable.cjs');
    fs.writeFileSync(preload, `const fs=require('node:fs'),orig=fs.lstatSync; fs.lstatSync=(p,...a)=>{if(String(p).endsWith('herdr-app.sock')) throw Error('socket cannot be statted');return orig(p,...a)};`);
    let r;
    try { r = f.call(['finish', t.id], { NODE_OPTIONS: `--require ${JSON.stringify(preload)}` }); }
    finally { if (server) await new Promise(resolve => server.close(resolve)); }
    assert.equal(r.code, 0, r.out); assert.ok(!fs.existsSync(path.join(t.worktree, '.git')), r.out);
    assert.equal(fs.readFileSync(path.join(outside, 'keep'), 'utf8'), 'mine');
    assert.equal(Boolean(git('-C', f.repo, 'branch', '--list', t.branch).trim()), state === 'CLOSED', 'Closed is not merged');
  }
};
gapTests['closed-refusals'] = () => {
  const f = leftoversFixture('refusals');
  const unchanged = (t, pattern) => {
    const before = readWorld().log.length, r = f.call(['finish', t.id]);
    assert.equal(r.code, 6, r.out); assert.match(r.out, pattern);
    assert.ok(!readWorld().log.slice(before).some(a => ['kill', 'rm'].includes(a[0])), 'Refusal must precede stopping');
    assert.equal(readWorld().terminals[t.terminal].state, 'live');
  };
  for (const mode of ['tracked', 'staged', 'untracked', 'unpushed']) {
    const t = f.spawn(mode);
    if (mode === 'unpushed') commit(t.worktree, { 'private.txt': 'not published' }, 'private');
    else { fs.writeFileSync(path.join(t.worktree, mode === 'untracked' ? 'mine.txt' : 'change.txt'), 'mine'); if (mode === 'staged') git('-C', t.worktree, 'add', 'change.txt'); }
    unchanged(t, /uncommitted|unpushed|unpublished|head/i);
  }
  for (const [mode, patch] of Object.entries({ open: { state: 'OPEN' }, stale: { headRefOid: 'a'.repeat(40) }, branch: { headRefName: 'feature/other' }, foreign: { headRepository: { nameWithOwner: 'other/repo' } }, down: { down: true }, absent: { state: 'NOT_FOUND' } })) {
    const t = f.spawn(mode); f.pr(patch); unchanged(t, /keep|head|unpublished/i);
  }
  const openPrivate = f.spawn('open-private'); f.pr({ state: 'OPEN' });
  fs.rmSync(path.join(openPrivate.worktree, '.artifacts'), { recursive: true });
  commit(openPrivate.worktree, { 'private.txt': 'not pushed' }, 'private open PR work');
  unchanged(openPrivate, /unpushed/);
  const wrong = f.spawn('wrong-url'); f.save({ ...f.task(wrong.id), pr: 'https://github.com/other/repo/pull/12' }); unchanged(wrong, /keep/);
  const forced = f.spawn('forced'); f.pr({ state: 'OPEN' }); assert.equal(f.call(['finish', forced.id, '--force']).code, 0);
};

gapTests['closed-safety'] = () => {
  const f = leftoversFixture('safety'), patch = p => { const w = readWorld(); Object.assign(w, p); fs.writeFileSync(world, JSON.stringify(w)); };
  const deleted = f.spawn('deleted'); git('-C', deleted.worktree, 'push', '-q', 'origin', '--delete', deleted.branch);
  let r = f.call(['finish', deleted.id]); assert.equal(r.code, 0, r.out); assert.ok(!fs.existsSync(deleted.worktree), r.out);
  const held = f.spawn('held'); f.guest(held);
  r = f.call(['finish', held.id]); assert.equal(r.code, 0, r.out); assert.ok(f.task(held.id).copyToReturn);
  assert.equal(readWorld().terminals['guest-leftovers-safety'].state, 'live');
  fs.writeFileSync(path.join(held.worktree, '.artifacts', 'later.png'), 'more scratch');
  const saved = f.task(held.id); saved.copyToReturn.left.incomplete = 'could not read .artifacts/old.sock'; f.save(saved);
  f.leave(); r = f.call(['finish', held.id]); assert.equal(r.code, 0, r.out); assert.ok(!fs.existsSync(held.worktree), r.out);
  for (const name of ['tracked', 'nonignored']) {
    const t = f.spawn(`late-${name}`), file = path.join(t.worktree, name === 'tracked' ? 'change.txt' : 'late.txt');
    patch({ writeOnKill: file }); r = f.call(['finish', t.id]); patch({ writeOnKill: null });
    assert.equal(r.code, 0, r.out); assert.ok(fs.existsSync(file)); assert.ok(f.task(t.id).copyToReturn);
    r = f.call(['finish', t.id]); assert.ok(fs.existsSync(file), r.out);
    assert.equal(f.call(['finish', t.id, '--force']).code, 0);
  }
  for (const op of ['MERGE_HEAD', 'locked']) {
    const t = f.spawn(`op-${op.toLowerCase().replace('_', '-')}`);
    const dir = git('-C', t.worktree, 'rev-parse', '--absolute-git-dir').trim(), marker = path.join(dir, op);
    fs.writeFileSync(marker, op === 'locked' ? 'keep' : git('-C', t.worktree, 'rev-parse', 'HEAD'));
    r = f.call(['finish', t.id]); assert.equal(r.code, 6, r.out); assert.equal(readWorld().terminals[t.terminal].state, 'live'); fs.rmSync(marker);
  }
  const silent = f.spawn('silent'); patch({ silentLs: true }); r = f.call(['finish', silent.id]); patch({ silentLs: false });
  assert.equal(r.code, 4, r.out); assert.equal(readWorld().terminals[silent.terminal].state, 'live');
  for (const command of ['ls-remote', 'fetch', 'rev-list']) {
    const t = f.spawn(`failed-${command}`), preload = path.join(f.dir, `${command}.cjs`);
    fs.writeFileSync(preload, `const cp=require('node:child_process'),orig=cp.spawnSync;cp.spawnSync=(p,a,o)=>p==='git'&&a.includes(${JSON.stringify(command)})?{status:1,stdout:'',stderr:'injected git failure'}:orig(p,a,o);require('node:module').syncBuiltinESMExports();`);
    r = f.call(['finish', t.id], { NODE_OPTIONS: `--require ${JSON.stringify(preload)}` });
    assert.equal(r.code, 6, r.out); assert.equal(readWorld().terminals[t.terminal].state, 'live'); assert.ok(fs.existsSync(t.worktree));
  }
};

gapTests['owned-terminals'] = () => {
  const f = gapFixture('owned-terminals'), bin = path.join(f.dir, 'bin'); fs.mkdirSync(bin); fs.writeFileSync(path.join(bin, 'pi'), '');
  const t = f.spawn('history', ['--kind', 'ship', '--agent', 'pi']), old = structuredClone(readWorld().terminals[t.terminal]);
  assert.deepEqual(f.task(t.id).terminals.map(t => t.address), [t.terminal]);
  let r = f.call(['relaunch', t.id, '--agent', 'pi', '--model', 'replacement'], { CREW_AGENT_PATH: bin }); assert.equal(r.code, 0, r.out);
  const current = f.task(t.id); assert.deepEqual(current.terminals.map(t => t.address), [t.terminal, current.terminal]);
  // Reproduce a stranded predecessor without inventing ownership from Core labels.
  let w = readWorld(); w.terminals[t.terminal] = old; fs.writeFileSync(world, JSON.stringify(w));
  setTerminal(t.terminal, { status: { app: 'pi', state: 'working' } });
  const before = readWorld().log.length; r = f.call(['finish', t.id]); assert.equal(r.code, 6, r.out);
  assert.ok(!readWorld().log.slice(before).some(a => ['kill', 'rm'].includes(a[0])));
  setTerminal(t.terminal, { status: { app: 'pi', state: 'idle' } });
  w = readWorld(); w.terminals.person = { ...old, address: 'person' }; fs.writeFileSync(world, JSON.stringify(w));
  r = f.call(['finish', t.id]); assert.equal(r.code, 0, r.out);
  assert.ok(!readWorld().terminals[t.terminal] && !readWorld().terminals[current.terminal]);
  assert.equal(readWorld().terminals.person.state, 'live', 'Copied labels never confer ownership');
  assert.ok(f.task(t.id).copyToReturn && fs.existsSync(t.worktree));
  r = f.call(['finish', t.id, '--force']); assert.equal(r.code, 6, r.out); assert.equal(readWorld().terminals.person.state, 'live');
  w = readWorld(); delete w.terminals.person; fs.writeFileSync(world, JSON.stringify(w));
  assert.equal(f.call(['finish', t.id]).code, 0); assert.ok(!fs.existsSync(t.worktree));

  const pending = f.spawn('pending', ['--agent', 'pi']);
  const second = 'owned-second'; w = readWorld(); w.terminals[second] = { ...structuredClone(w.terminals[pending.terminal]), address: second }; w.failRm = true; fs.writeFileSync(world, JSON.stringify(w));
  f.save({ ...pending, terminals: [...pending.terminals, { address: second, agent: 'pi' }] });
  r = f.call(['finish', pending.id]); assert.equal(r.code, 0, r.out); assert.ok(f.task(pending.id).copyToReturn);
  w = readWorld(); w.failRm = false; fs.writeFileSync(world, JSON.stringify(w));
  r = f.call(['finish', pending.id]); assert.equal(r.code, 0, r.out); assert.ok(!readWorld().terminals[second] && !readWorld().terminals[pending.terminal]);

  const resumed = f.spawn('resumed', ['--agent', 'pi']);
  w = readWorld(); delete w.terminals[resumed.terminal]; w.terminals['late-resumed'] = { address: 'late-resumed', state: 'live', cwd: resumed.worktree, status: { app: 'pi', state: 'idle' } }; fs.writeFileSync(world, JSON.stringify(w));
  f.save({ ...resumed, state: 'closed', terminals: [...resumed.terminals, { address: 'late-resumed', agent: 'pi' }],
    copyToReturn: { left: snapshotCopy(resumed.worktree), cleanupTerminal: false, stopPending: false, stoppedTerminals: [resumed.terminal] } });
  r = f.call(['finish', resumed.id]); assert.equal(r.code, 0, r.out);
  assert.ok(!readWorld().terminals['late-resumed'], 'A newly stopped historical terminal must also be removed on retry');

  const legacy = f.spawn('legacy', ['--agent', 'pi']); const { terminals, ...record } = legacy; f.save(record);
  assert.equal(f.call(['finish', legacy.id]).code, 0); assert.ok(!readWorld().terminals[legacy.terminal]);
};

gapTests['owned-review'] = () => {
  const f = leftoversFixture('review'), t = f.spawn('author'), bin = path.join(f.dir, 'bin'); fs.mkdirSync(bin); fs.writeFileSync(path.join(bin, 'pi'), '');
  let r = f.call(['review', t.id, '--agent', 'pi']); assert.equal(r.code, 0, r.out);
  const review = f.task('author-review'), old = structuredClone(readWorld().terminals[review.terminal]);
  assert.deepEqual(review.terminals.map(t => t.address), [review.terminal]);
  r = f.call(['relaunch', review.id, '--agent', 'pi', '--model', 'next-reviewer'], { CREW_AGENT_PATH: bin }); assert.equal(r.code, 0, r.out);
  const next = f.task(review.id); assert.equal(next.terminals.length, 2);
  const reviewerBrief = fs.readFileSync(next.brief, 'utf8');
  assert.ok(reviewerBrief.includes(slash(path.dirname(next.report))));
  assert.match(reviewerBrief, /Stop every disposable app instance/);
  assert.ok(readWorld().log.filter(a => a[0] === 'run').at(-1).at(-1).includes(`Read the brief at ${next.brief}`), 'Replacement rereads the hygiene rules');
  let w = readWorld(); w.terminals[review.terminal] = old; w.terminals[next.terminal].cwd = t.worktree; fs.writeFileSync(world, JSON.stringify(w));
  r = f.call(['finish', t.id]); assert.equal(r.code, 0, r.out); assert.ok(f.task(t.id).copyToReturn);
  assert.equal(readWorld().terminals[next.terminal].state, 'live', 'Parent finish never adopts a separate review task');
  r = f.call(['finish', review.id]); assert.equal(r.code, 0, r.out);
  assert.ok(!readWorld().terminals[review.terminal] && !readWorld().terminals[next.terminal]);
  assert.ok(!fs.existsSync(t.worktree), 'Successful finish sweeps the now-free parent copy');
};
gapTests['owned-a1-stop'] = () => {
  const f = gapFixture('owned-a1-stop'), t = f.spawn('api', ['--agent', 'a1']), second = 'owned-pi';
  const w = readWorld(); w.terminals[second] = { ...structuredClone(w.terminals[t.terminal]), address: second };
  Object.assign(w.terminals[t.terminal], { status: { app: 'a1', state: 'idle' }, labels: { 'a1.session': 'fake-session', 'a1.runtime': 'fake-runtime' } });
  fs.writeFileSync(world, JSON.stringify(w)); f.save({ ...t, terminals: [...t.terminals, { address: second, agent: 'pi' }] });
  const preload = path.join(f.dir, 'api.cjs'), log = path.join(f.dir, 'api.log');
  fs.writeFileSync(preload, `const fs=require('node:fs'),cp=require('node:child_process'),orig=cp.spawnSync;
cp.spawnSync=(p,a,o)=>{if(a?.[0]==='-c'&&a[1].startsWith('a1 api ')){fs.appendFileSync(${JSON.stringify(log)},a[1]+'\\n');return {status:0,stdout:JSON.stringify(a[1].includes('session.lifecycle')?{error:{code:'session-unavailable'}}:{success:true}),stderr:''}}return orig(p,a,o)};require('node:module').syncBuiltinESMExports();`);
  const r = f.call(['finish', t.id], { NODE_OPTIONS: `--require ${JSON.stringify(preload)}` }); assert.equal(r.code, 0, r.out);
  const calls = fs.readFileSync(log, 'utf8'); assert.match(calls, /session.exit/); assert.match(calls, /session.lifecycle/); assert.match(calls, /fake-session/);
  assert.ok(!readWorld().terminals[t.terminal] && !readWorld().terminals[second]);
};

gapTests['merged-land-summary'] = () => {
  const f = leftoversFixture('land-summary');
  for (const kind of ['plain', 'workflow', 'gate']) {
    const t = f.spawn(kind); f.save({ ...f.task(t.id), ...(kind === 'workflow' ? { workflow: 'delivery', stage: 'implementation' } : { landed: '2026-01-01' }), ...(kind === 'gate' ? { gate: 'no-mistakes' } : {}) });
    let r = f.call(['land', t.id]); assert.equal(r.code, 0, r.out);
    assert.equal(f.task(t.id).state, 'closed'); assert.ok(!readWorld().terminals[t.terminal]);
    assert.match(r.out, /discarded ignored scratch \(\.artifacts\/\)/);
    assert.equal(r.out.trim().split('\n').filter(l => l.includes('discarded')).length, 1, r.out);
    r = f.call(['finish', t.id]); assert.equal(r.code, 0, r.out); assert.match(r.out, /already closed; discarded none/);
    r = f.call(['land', t.id]); assert.equal(r.code, 0, r.out); assert.match(r.out, /already closed; discarded none/);
  }
  const dirty = f.spawn('dirty'); fs.writeFileSync(path.join(dirty.worktree, 'change.txt'), 'mine');
  let r = f.call(['land', dirty.id]); assert.equal(r.code, 6, r.out); assert.equal(readWorld().terminals[dirty.terminal].state, 'live');
  const busy = f.spawn('busy'); setTerminal(busy.terminal, { status: { app: 'pi', state: 'working' } });
  r = f.call(['land', busy.id]); assert.equal(r.code, 6, r.out); assert.equal(readWorld().terminals[busy.terminal].state, 'live');
  const held = f.spawn('held'); f.guest(held); r = f.call(['land', held.id]); assert.equal(r.code, 0, r.out);
  assert.match(r.out, /kept for now.*discarded none/); assert.ok(fs.existsSync(path.join(held.worktree, '.artifacts', 'KEEP')));
  f.leave(); r = f.call(['land', held.id]); assert.equal(r.code, 0, r.out); assert.match(r.out, /discarded ignored scratch/);
  const open = f.spawn('open'); f.pr({ state: 'OPEN' });
  r = f.call(['land', open.id]); assert.equal(r.code, 0, r.out); assert.match(r.out, /already has a pull request/);
  assert.equal(readWorld().terminals[open.terminal].state, 'live'); assert.ok(fs.existsSync(path.join(open.worktree, '.artifacts', 'KEEP')));
  const empty = f.spawn('empty'); fs.rmSync(path.join(empty.worktree, '.artifacts'), { recursive: true });
  r = f.call(['finish', empty.id]); assert.equal(r.code, 0, r.out); assert.match(r.out, /discarded none/);
};
gapTests['merged-land-bookkeeping'] = () => {
  const f = leftoversFixture('land-bookkeeping'), backlog = path.join(f.home, 'backlog.md'), tasks = path.join(f.dir, 'tasks.mjs'), moves = path.join(f.dir, 'moves.json');
  fs.writeFileSync(moves, '[]');
  fs.writeFileSync(tasks, `import fs from 'node:fs'; const a=process.argv.slice(2), id=a[1], file=a[a.indexOf('--file')+1], url=a[a.indexOf('--pr')+1];
const t=JSON.parse(fs.readFileSync(${JSON.stringify(path.join(f.home, 'tasks'))}+'/'+id+'/task.json'));
const world=JSON.parse(fs.readFileSync(${JSON.stringify(world)}));
fs.writeFileSync(${JSON.stringify(moves)},JSON.stringify([...JSON.parse(fs.readFileSync(${JSON.stringify(moves)})),{id,pr:t.pr,landed:t.landed,live:world.terminals[t.terminal]?.state==='live',copy:fs.existsSync(t.worktree+'/.git')}]));
fs.writeFileSync(file,fs.readFileSync(file,'utf8').replace('- [ ] '+id+' - work (in flight)','- [x] '+id+' - work (done '+url+')'));
console.log('ok: done '+id+' -> Done');`);
  for (const kind of ['workflow', 'gate']) for (const mode of kind === 'workflow' ? ['MERGED', 'OPEN', 'MERGED-DELETED', 'MERGED-ANCESTOR', 'MERGED-CONTAINED', 'MERGED-RETAINED'] : ['MERGED', 'OPEN']) {
    const state = mode.startsWith('MERGED') ? 'MERGED' : mode;
    const id = `${kind}-${mode.toLowerCase()}`, t = f.spawn(id, { recordPr: kind !== 'gate' }), url = 'https://github.com/acme/demo/pull/12';
    f.pr({ state }); fs.writeFileSync(t.report, `Implementation: ${url}\n`);
    if (mode === 'MERGED-ANCESTOR' || mode === 'MERGED-CONTAINED' || mode === 'MERGED-RETAINED') {
      const head = git('-C', t.worktree, 'rev-parse', 'HEAD').trim();
      const published = commit(t.worktree, { 'published-later.txt': 'merged on GitHub' }, 'published later');
      git('-C', t.worktree, 'push', '-q', 'origin', `HEAD:${t.branch}`);
      git('-C', t.worktree, 'reset', '--hard', '-q', head);
      f.pr(mode === 'MERGED-CONTAINED' ? { headRefOid: 'a'.repeat(40), mergeCommit: { oid: published } } : { headRefOid: published });
      if (mode === 'MERGED-RETAINED') assert.equal(git('-C', t.worktree, 'rev-list', '--count', `refs/remotes/origin/${t.branch}..HEAD`).trim(), '0');
    }
    if (mode !== 'MERGED' && mode !== 'MERGED-RETAINED' && state === 'MERGED') git('-C', t.worktree, 'push', '-q', 'origin', '--delete', t.branch);
    f.save({ ...f.task(id), ...(kind === 'workflow' ? { workflow: 'delivery', stage: 'implementation' } : { gate: 'no-mistakes' }) });
    assert.equal(f.task(id).landed, undefined);
    if (kind === 'gate') assert.equal(f.task(id).pr, undefined, 'Normal gate reporting keeps its URL only in the report');
    fs.writeFileSync(backlog, `- [ ] ${id} - work (in flight)\n`);
    const before = JSON.parse(fs.readFileSync(moves)).length;
    let r = f.call(['land', id], { CREW_TOOL_TASKS_AXI: tasks }); assert.equal(r.code, 0, r.out);
    const saved = f.task(id); assert.ok(saved.landed, 'First land is recorded before merged cleanup'); assert.equal(saved.pr, url);
    assert.equal(fs.readFileSync(backlog, 'utf8'), `- [x] ${id} - work (done ${url})\n`);
    const moved = JSON.parse(fs.readFileSync(moves)); assert.equal(moved.length, before + 1);
    assert.deepEqual(moved.at(-1), { id, pr: url, landed: saved.landed, live: true, copy: true }, 'Bookkeeping must precede terminal/copy cleanup');
    if (state === 'MERGED') {
      assert.equal(saved.state, 'closed'); assert.ok(!readWorld().terminals[t.terminal]); assert.ok(!fs.existsSync(t.worktree));
      assert.match(r.out, /discarded ignored scratch/); assert.ok(r.out.indexOf('backlog: done') < r.out.indexOf('finished '), r.out);
    } else {
      assert.equal(saved.state, 'reported'); assert.equal(readWorld().terminals[t.terminal].state, 'live'); assert.ok(fs.existsSync(path.join(t.worktree, '.artifacts', 'KEEP')));
    }
    r = f.call(['land', id], { CREW_TOOL_TASKS_AXI: tasks }); assert.equal(r.code, 0, r.out);
    assert.equal(JSON.parse(fs.readFileSync(moves)).length, before + 1, 'Repeated land does not repeat backlog completion');
  }
};
gapTests['missing-branch-refusals'] = () => {
  const f = leftoversFixture('missing-branch-refusals');
  for (const mode of ['OPEN', 'CLOSED', 'UNPUSHED', 'UNAVAILABLE', 'WRONG-HEAD']) {
    const t = f.spawn(mode.toLowerCase());
    f.save({ ...f.task(t.id), workflow: 'delivery', stage: 'implementation' });
    if (mode === 'OPEN' || mode === 'CLOSED') f.pr({ state: mode, mergedAt: null });
    if (mode === 'UNPUSHED') commit(t.worktree, { 'private.txt': 'not published' }, 'private work');
    if (mode === 'UNAVAILABLE') f.pr({ down: true });
    if (mode === 'WRONG-HEAD') f.pr({ headRefOid: 'f'.repeat(40) });
    git('-C', t.worktree, 'push', '-q', 'origin', '--delete', t.branch);
    const before = readWorld().log.length, r = f.call(['land', t.id]);
    assert.equal(r.code, 6, r.out); assert.match(r.out, /is not pushed/); assert.equal(f.task(t.id).landed, undefined);
    assert.ok(!readWorld().log.slice(before).some(a => ['kill', 'rm'].includes(a[0])));
    assert.equal(readWorld().terminals[t.terminal].state, 'live'); assert.ok(fs.existsSync(path.join(t.worktree, '.artifacts', 'KEEP')));
  }
};
gapTests['closed-delivery'] = () => {
  const f = leftoversFixture('delivery'), tool = path.join(f.dir, 'delivery.mjs'), control = path.join(f.dir, 'delivery-down');
  fs.writeFileSync(tool, `import fs from 'node:fs'; import {spawnSync} from 'node:child_process'; const copy=process.argv[3];
if(fs.existsSync(copy+'/.artifacts')){console.error('nested repositories or KEEP still present');process.exit(1)}
if(fs.existsSync(${JSON.stringify(control)})){console.error('injected return failure');process.exit(1)}
const r=spawnSync('git',['worktree','remove','--force',copy],{encoding:'utf8'});if(r.status!==0){console.error(r.stderr);process.exit(1)}console.log('slot returned');`);
  for (const fail of [false, true]) {
    const t = f.spawn(fail ? 'failure' : 'success'); f.save({ ...f.task(t.id), via: 'delivery', pooled: true });
    git('init', '-q', path.join(t.worktree, '.artifacts', 'probe'));
    if (fail) fs.writeFileSync(control, 'down');
    const r = f.call(['finish', t.id], { CREW_TOOL_DELIVERY: tool }); assert.equal(r.code, 0, r.out);
    assert.match(r.out, /discarded ignored scratch/); assert.ok(!fs.existsSync(path.join(t.worktree, '.artifacts')));
    assert.equal(Boolean(f.task(t.id).copyToReturn), fail, r.out);
    if (fail) { assert.match(r.out, /kept for now/); fs.rmSync(control); assert.equal(f.call(['finish', t.id], { CREW_TOOL_DELIVERY: tool }).code, 0); }
    else assert.match(r.out, /returned to the pool/);
  }
};

gapTests['closed-clean-race'] = () => {
  const f = leftoversFixture('clean-race'), t = f.spawn('late'), preload = path.join(f.dir, 'clean.cjs'), late = path.join(t.worktree, 'mine.txt');
  fs.writeFileSync(preload, `const fs=require('node:fs'),cp=require('node:child_process'),orig=cp.spawnSync;cp.spawnSync=(p,a,o)=>{const r=orig(p,a,o);if(p==='git'&&a.includes('clean'))fs.writeFileSync(${JSON.stringify(late)},'mine');return r};require('node:module').syncBuiltinESMExports();`);
  const r = f.call(['finish', t.id], { NODE_OPTIONS: `--require ${JSON.stringify(preload)}` });
  assert.equal(r.code, 0, r.out); assert.match(r.out, /kept for now.*protected work changed.*discarded ignored scratch/);
  assert.equal(fs.readFileSync(late, 'utf8'), 'mine'); assert.ok(f.task(t.id).copyToReturn);
};

gapTests['closed-clean-reflog'] = () => {
  for (const phase of ['post-clean', 'pre-clean-inventory', 'retry-inventory']) {
  const f = leftoversFixture(`clean-reflog-${phase}`), t = f.spawn('late'), preload = path.join(f.dir, 'clean.cjs'), orphan = path.join(f.dir, 'orphan.txt');
  if (phase === 'retry-inventory') {
    f.guest(t); const held = f.call(['finish', t.id]); assert.equal(held.code, 0, held.out);
    assert.ok(f.task(t.id).copyToReturn); f.leave();
  }
  const original = f.task(t.id).copyToReturn?.left;
  const inventoryAt = phase === 'pre-clean-inventory' ? 3 : 2;
  fs.writeFileSync(preload, `const fs=require('node:fs'),cp=require('node:child_process'),orig=cp.spawnSync;let injected=false,ignored=0;
cp.spawnSync=(p,a,o)=>{const r=orig(p,a,o);const status=p==='git'&&a.includes('status')&&a.includes('--ignored');if(status)ignored++;
const at=${JSON.stringify(phase)}==='post-clean'?p==='git'&&a.includes('clean'):status&&ignored===${inventoryAt};
if(!injected&&at&&r.status===0){injected=true;fs.writeFileSync(${JSON.stringify(`${orphan}.at`)},String(ignored));
const git=(...args)=>{const out=orig('git',['-C',${JSON.stringify(t.worktree)},...args],{encoding:'utf8'});if(out.status!==0)throw Error(out.stderr);return out.stdout.trim()};
git('checkout','-q','--detach');git('-c','user.name=t','-c','user.email=t@example.invalid','commit','--allow-empty','-q','-m','orphan during ignored cleanup');
fs.writeFileSync(${JSON.stringify(orphan)},git('rev-parse','HEAD'));git('checkout','-q',${JSON.stringify(t.branch)});}return r};require('node:module').syncBuiltinESMExports();`);
  const head = git('-C', t.worktree, 'rev-parse', 'HEAD').trim();
  let r = f.call(['finish', t.id], { NODE_OPTIONS: `--require ${JSON.stringify(preload)}` });
  assert.equal(r.code, 0, r.out); assert.ok(fs.existsSync(path.join(t.worktree, '.git')), 'A reset to the original HEAD must not hide a new orphan commit');
  const sha = fs.readFileSync(orphan, 'utf8'); assert.ok(sha && sha !== head);
  if (phase !== 'post-clean') assert.equal(Number(fs.readFileSync(`${orphan}.at`, 'utf8')), inventoryAt, 'Inject at returnCopy inventory, before its new pre-clean observation');
  if (original) assert.deepEqual(f.task(t.id).copyToReturn.left, original, 'Retry must retain the original accepted snapshot');
  assert.equal(git('-C', t.worktree, 'rev-parse', 'HEAD').trim(), head);
  assert.equal(git('-C', t.worktree, 'for-each-ref', '--contains', sha, '--format=%(refname)', 'refs/heads', 'refs/tags').trim(), '');
  assert.ok(git('-C', t.worktree, 'reflog', 'show', '--format=%H', 'HEAD').includes(sha));
  assert.ok(f.task(t.id).copyToReturn);
  assert.match(r.out, phase === 'retry-inventory' ? /still waits.*protected work changed/ : /kept for now.*protected work changed/);
  r = f.call(['finish', t.id]); assert.equal(r.code, 0, r.out); assert.ok(fs.existsSync(t.worktree)); assert.match(r.out, /commits made since finish/);
  }
};

gapTests['owned-late-publication'] = () => {
  const f = gapFixture('owned-late'), t = f.spawn('late', ['--agent', 'pi']), bin = path.join(f.dir, 'bin'); fs.mkdirSync(bin); fs.writeFileSync(path.join(bin, 'pi'), '');
  const preload = path.join(f.dir, 'late.cjs'), launch = path.join(f.dir, 'launch.log');
  fs.writeFileSync(preload, `const fs=require('node:fs'),cp=require('node:child_process'),orig=cp.spawnSync;let launched=false;
cp.spawnSync=(p,a,o)=>{const r=orig(p,a,o);if(!launched&&a?.includes(${JSON.stringify(fake)})&&a.includes('kill')){launched=true;
const next=orig(process.execPath,[${JSON.stringify(path.join(here, 'crew.mjs'))},'relaunch',${JSON.stringify(t.id)},'--agent','pi','--model','late-worker'],{cwd:${JSON.stringify(f.home)},encoding:'utf8',env:{...process.env,NODE_OPTIONS:'',CREW_AGENT_PATH:${JSON.stringify(bin)}}});fs.writeFileSync(${JSON.stringify(launch)},next.stdout+next.stderr);if(next.status!==0)throw Error('replacement failed '+next.stderr)}return r};require('node:module').syncBuiltinESMExports();`);
  const r = f.call(['finish', t.id], { NODE_OPTIONS: `--require ${JSON.stringify(preload)}` });
  assert.equal(r.code, 0, r.out); assert.match(fs.readFileSync(launch, 'utf8'), /relaunched/);
  const closed = f.task(t.id); assert.equal(closed.terminals.length, 2);
  for (const worker of closed.terminals) assert.ok(!readWorld().terminals[worker.address], `Late owned terminal ${worker.address} must be removed`);
  assert.ok(!closed.copyToReturn && !fs.existsSync(t.worktree), r.out);
};

gapTests.ignored = () => {
  const f = gapFixture('ignored'), count = Math.max(12001, Number(process.env.CREW_TEST_IGNORED_FILES) || 12001);
  const fill = t => { fs.mkdirSync(path.join(t.worktree, 'scratch')); for (let i = 0; i < count; i++) fs.writeFileSync(path.join(t.worktree, 'scratch', `${i}.txt`), 'old'); fs.utimesSync(path.join(t.worktree, 'scratch'), 1700000000, 1700000000); };
  const changed = f.spawn('changed'); fill(changed); f.guest(changed);
  let r = f.call(['finish', changed.id]); assert.equal(r.code, 0, r.out);
  const before = fs.statSync(path.join(changed.worktree, 'scratch'));
  fs.writeFileSync(path.join(changed.worktree, 'scratch', '0.txt'), 'new');
  fs.utimesSync(path.join(changed.worktree, 'scratch'), before.atime, before.mtime);
  f.leave(); r = f.call(['start']); assert.equal(r.code, 0, r.out);
  assert.ok(fs.existsSync(changed.worktree), 'An existing ignored file changed after finish must keep the copy');
  assert.match(r.out, /work written since finish.*scratch/);
  r = f.call(['finish', changed.id]); assert.equal(r.code, 0, r.out); assert.ok(fs.existsSync(changed.worktree));
  r = f.call(['finish', changed.id, '--force']); assert.equal(r.code, 0, r.out); assert.ok(!fs.existsSync(changed.worktree));

  const untouched = f.spawn('untouched'); fill(untouched); f.guest(untouched);
  const start = performance.now(), snapshot = snapshotCopy(untouched.worktree), elapsed = performance.now() - start;
  console.log(`ignored walk: ${count} files, ${elapsed.toFixed(1)} ms, ${JSON.stringify(snapshot).length} stored bytes`);
  assert.equal(snapshot.ignored['scratch/'].files, count); assert.equal(snapshot.incomplete, null);
  assert.ok(JSON.stringify(snapshot).length < 2000, 'The stored fingerprint is bounded independently of file count');
  r = f.call(['finish', untouched.id]); assert.equal(r.code, 0, r.out);
  f.leave(); r = f.call(['start']); assert.equal(r.code, 0, r.out); assert.ok(!fs.existsSync(untouched.worktree), r.out);

  const uncertain = f.spawn('uncertain'); fill(uncertain); f.guest(uncertain);
  const tree = path.join(uncertain.worktree, 'scratch'), first = snapshotCopy(uncertain.worktree).ignored['scratch/'];
  fs.rmSync(path.join(tree, '0.txt'));
  assert.equal(snapshotCopy(uncertain.worktree).ignored['scratch/'].files, count - 1, 'Removal changes the fingerprint');
  fs.writeFileSync(path.join(tree, 'added.txt'), 'old');
  assert.notEqual(snapshotCopy(uncertain.worktree).ignored['scratch/'].metadata, first.metadata, 'Same-count, same-size replacement changes the metadata digest');
  const outside = path.join(f.dir, 'outside'); fs.mkdirSync(outside); fs.writeFileSync(path.join(outside, 'external.txt'), 'one');
  fs.symlinkSync(outside, path.join(tree, 'link'), process.platform === 'win32' ? 'junction' : 'dir');
  const linked = snapshotCopy(uncertain.worktree).ignored['scratch/'];
  fs.writeFileSync(path.join(outside, 'external.txt'), 'changed outside');
  assert.deepEqual(snapshotCopy(uncertain.worktree).ignored['scratch/'], linked, 'Directory symlink targets are not inspected');
  assert.match(snapshotCopy(uncertain.worktree, { budgetMs: 0 }).incomplete, /time budget/);
  const lstat = fs.lstatSync;
  try {
    fs.lstatSync = (file, ...args) => { if (String(file).endsWith(`${path.sep}added.txt`)) throw Object.assign(new Error('denied'), { code: 'EACCES' }); return lstat(file, ...args); };
    assert.match(snapshotCopy(uncertain.worktree).incomplete, /could not read.*added\.txt/);
  } finally { fs.lstatSync = lstat; }
  r = f.call(['finish', uncertain.id]); assert.equal(r.code, 0, r.out); f.leave();
  const saved = f.task(uncertain.id); saved.copyToReturn.left.incomplete = 'ignored walk exceeded its time budget'; f.save(saved);
  r = f.call(['start']); assert.ok(fs.existsSync(uncertain.worktree)); assert.match(r.out, /time budget/);
  delete saved.copyToReturn.left.ignoredVersion; delete saved.copyToReturn.left.incomplete; f.save(saved);
  r = f.call(['start']); assert.ok(fs.existsSync(uncertain.worktree)); assert.match(r.out, /older snapshot/);
  assert.equal(f.call(['finish', uncertain.id, '--force']).code, 0);
};

gapTests.finish = () => {
  const f = gapFixture('finish'), patch = p => { const w = readWorld(); Object.assign(w, p); fs.writeFileSync(world, JSON.stringify(w)); };
  const dirty = f.spawn('dirty', ['--kind', 'ship']);
  const untouched = (task, message) => {
    const before = readWorld().log.length, original = fs.readFileSync(path.join(f.home, 'tasks', task.id, 'task.json'), 'utf8');
    const r = f.call(['finish', task.id]); assert.equal(r.code, 6, r.out); assert.match(r.out, message);
    assert.equal(readWorld().terminals[task.terminal].state, 'live', 'Refusing finish must leave the worker alive');
    assert.ok(!readWorld().log.slice(before).some(a => ['kill', 'rm'].includes(a[0])), 'A refusal sends no stop/removal command');
    assert.equal(fs.readFileSync(path.join(f.home, 'tasks', task.id, 'task.json'), 'utf8'), original);
    assert.ok(fs.existsSync(task.worktree));
  };
  fs.writeFileSync(path.join(dirty.worktree, 'half.txt'), 'unsaved'); untouched(dirty, /has uncommitted work/); fs.rmSync(path.join(dirty.worktree, 'half.txt'));
  const keep = f.spawn('keep'); fs.mkdirSync(path.join(keep.worktree, '.artifacts')); fs.writeFileSync(path.join(keep.worktree, '.artifacts', 'KEEP'), '');
  untouched(keep, /marked to keep/); fs.rmSync(path.join(keep.worktree, '.artifacts'), { recursive: true });
  const gitFile = path.join(dirty.worktree, '.git'); fs.renameSync(gitFile, `${gitFile}-saved`); fs.writeFileSync(gitFile, 'gitdir: missing\n');
  untouched(dirty, /Could not check.*uncommitted work/); fs.rmSync(gitFile); fs.renameSync(`${gitFile}-saved`, gitFile);
  assert.equal(f.call(['finish', keep.id]).code, 0);

  patch({ writeOnKill: path.join(dirty.worktree, 'late.txt') });
  let r = f.call(['finish', dirty.id]); assert.equal(r.code, 0, r.out); patch({ writeOnKill: null });
  assert.equal(f.task(dirty.id).state, 'closed'); assert.ok(fs.existsSync(path.join(dirty.worktree, 'late.txt'))); assert.match(r.out, /kept for now.*work written|kept for now.*uncommitted/);
  r = f.call(['start']); assert.ok(fs.existsSync(dirty.worktree)); assert.match(r.out, /work written since finish/);
  assert.equal(f.call(['finish', dirty.id, '--force']).code, 0);

  const stopping = f.spawn('stopping'); patch({ silentAfterKill: true });
  r = f.call(['finish', stopping.id]); assert.equal(r.code, 0, r.out);
  assert.ok(f.task(stopping.id).copyToReturn?.stopPending && fs.existsSync(stopping.worktree), 'An unconfirmed stop postpones return instead of refusing after changing the worker');
  patch({ silentAfterKill: false, silent: false }); r = f.call(['start']); assert.equal(r.code, 0, r.out); assert.ok(!fs.existsSync(stopping.worktree));

  const second = f.spawn('second'); patch({ silentLsAfterRm: true });
  r = f.call(['finish', second.id]); assert.equal(r.code, 0, r.out);
  assert.equal(f.task(second.id).state, 'closed'); assert.ok(f.task(second.id).copyToReturn && fs.existsSync(second.worktree));
  assert.match(r.out, /Core did not say.*crew (?:start|finish)|Core did not say.*next.*(?:start|finish)/);
  patch({ silentLsAfterRm: false, silentLs: false }); r = f.call(['start']); assert.equal(r.code, 0, r.out); assert.ok(!fs.existsSync(second.worktree));

  const removal = f.spawn('removal'); patch({ silentAfterRm: true });
  r = f.call(['finish', removal.id]); assert.equal(r.code, 0, r.out); assert.ok(f.task(removal.id).copyToReturn && fs.existsSync(removal.worktree));
  patch({ silentAfterRm: false, silent: false }); r = f.call(['finish', removal.id]); assert.equal(r.code, 0, r.out); assert.ok(!fs.existsSync(removal.worktree));

  // A proved API exit can leave the wrapper shell live. A persisted cleanup retries that
  // shell too; it must never become an indefinitely held copy after the worker has left.
  const shell = f.spawn('shell');
  f.save({ ...shell, state: 'closed', closed: new Date().toISOString(), copyToReturn: { since: new Date().toISOString(), left: snapshotCopy(shell.worktree), cleanupTerminal: true } });
  r = f.call(['finish', shell.id]); assert.equal(r.code, 0, r.out); assert.ok(!fs.existsSync(shell.worktree), r.out);
  assert.ok(!readWorld().terminals[shell.terminal]);
};

gapTests.chain = () => {
  const dir = path.join(root, 'gap-quota'); fs.mkdirSync(dir); const bin = path.join(dir, 'bin'); fs.mkdirSync(bin);
  for (const name of ['a1', 'pi', 'claude']) fs.writeFileSync(path.join(bin, name), '');
  const quota = path.join(dir, 'quota.json'), log = path.join(dir, 'reads.log'), tool = path.join(dir, 'quota.mjs');
  fs.writeFileSync(tool, `import fs from 'node:fs';
const q = JSON.parse(fs.readFileSync(${JSON.stringify(quota)}, 'utf8')), a = process.argv.slice(2), families = a[a.indexOf('--provider') + 1].split(',');
fs.appendFileSync(${JSON.stringify(log)}, families.join(',') + '\\n');
console.log(JSON.stringify({providers: families.map(provider => q[provider] === 'login' ? {provider, state: {error: 'unauthorized'}, quotaSemantics: {status: 'unknown'}} : {provider, quotaSemantics: {status: 'known', effectiveAvailability: [{scope: 'all_models', effectivePercentRemaining: q[provider]}]}})}));`);
  const setQuota = q => fs.writeFileSync(quota, JSON.stringify(q)); setQuota({ codex: 0, claude: 'login', copilot: 70 });
  const f = gapFixture('chain', { CREW_TOOL_QUOTA_AXI: tool, CREW_AGENT_PATH: bin }); fs.mkdirSync(path.join(f.home, 'config'));
  fs.writeFileSync(path.join(f.home, 'config', 'crew-dispatch.json'), JSON.stringify({ default: [
    { harness: 'a1', model: 'custom/gpt-x', provider: 'codex' }, { harness: 'claude', model: 'opus' }, { harness: 'pi', model: 'github-copilot/gpt-x' }] }));
  const task = f.spawn('recover'); assert.equal(task.agent, 'pi');
  assert.deepEqual(task.chain.map(c => c.harness), ['a1', 'claude'], 'Passed-over candidates remain in the original chain');
  let shown = JSON.parse(f.call(['status', '--json']).out).tasks.find(t => t.id === task.id);
  assert.deepEqual(shown.standbyStatus.map(c => [c.status, c.passedOver]), [['exhausted', true], ['signed-out', true]]);
  assert.ok(shown.standbyStatus.every(c => c.checkedAt && c.note));
  setQuota({ codex: 60, claude: 'login', copilot: 0 }); fs.writeFileSync(log, '');
  setTerminal(task.terminal, { status: { state: 'error', app: 'pi' }, screen: 'usage limit reached' });
  let r = f.call(['wait', task.id, '--timeout', '6']); assert.equal(r.code, 124, r.out);
  assert.equal(f.task(task.id).agent, 'a1', 'Automatic hand-over reconsiders recovered candidates');
  assert.equal(f.task(task.id).launch.family, 'codex', 'The quota-family override survives saving and hand-over');
  assert.ok(!fs.readFileSync(log, 'utf8').includes('copilot'), 'The current/tried worker is not read again');
  setQuota({ codex: 0, claude: 70, copilot: 80 }); fs.writeFileSync(log, '');
  r = f.call(['relaunch', task.id]); assert.equal(r.code, 0, r.out); assert.equal(f.task(task.id).agent, 'claude', 'Unnamed relaunch reconsiders a recovered login');
  assert.equal(fs.readFileSync(log, 'utf8').trim(), 'claude', 'Only the untried candidate is read');
  assert.deepEqual(f.task(task.id).candidates.map(c => c.harness), ['a1', 'claude', 'pi']);
  assert.equal(f.call(['relaunch', task.id]).code, 8, 'Unnamed relaunch never repeats an already tried candidate');
  setQuota({ codex: 70, claude: 70, copilot: 80 });
  assert.equal(f.call(['relaunch', task.id, '--agent', 'a1', '--model', 'openai-codex/gpt-x']).code, 0, 'A named relaunch may retry an earlier choice');
  assert.ok(f.task(task.id).terminals.length >= 3, 'Automatic hand-over and explicit relaunch retain launch history');
  assert.equal(f.call(['finish', task.id, '--force']).code, 0);
};

gapTests['coordinator-recovery'] = isolatedCore(() => {
  const f = gapFixture('coordinator-recovery'), owner = 'owner-coordinator-recovery';
  const bin = path.join(f.dir, 'agents'), launcher = path.join(f.dir, 'claude-as.sh'), quota = path.join(f.dir, 'quota.mjs'), quotaLog = path.join(f.dir, 'quota.log');
  fs.mkdirSync(bin); for (const name of ['a1', 'pi', 'claude']) fs.writeFileSync(path.join(bin, name), '');
  fs.writeFileSync(launcher, '#!/bin/sh\n'); fs.writeFileSync(quotaLog, '');
  fs.writeFileSync(quota, `import fs from 'node:fs'; fs.appendFileSync(${JSON.stringify(quotaLog)}, 'read\\n'); console.log('{"providers":[]}');`);
  const env = { CREW_AGENT_PATH: bin, CREW_CLAUDE_LAUNCHER: launcher, CREW_CLAUDE_ACCOUNTS: 'saved-one@example.test,saved-two@example.test', CREW_TOOL_QUOTA_AXI: quota,
    CREW_WORKTREES: path.join(f.dir, 'copies'), CREW_CLAUDE_CONFIG: path.join(f.dir, 'claude.json'), CREW_RECOVERY_SECONDS: '0', CREW_DEAD_SECONDS: '0', DELIVERY_LABELS_ENABLED: 'false' };
  const call = args => f.call(args, env);
  const business = 'tymur.prokopiev@ameria.com', personal = 'masha.shmakova@gmail.com';
  const login = email => setTerminal(owner, { status: { app: 'claude-code', state: 'working' }, labels: { 'custom.claude.email': email, 'custom.claude.state': 'ok', 'custom.claude.at': String(Date.now()), 'custom.claude.session': 'coordinator-process' } });
  const config = { default: [{ harness: 'pi', model: 'wrong/global' }], roles: { review: [{ harness: 'pi', model: 'wrong/review' }], fix: [{ harness: 'pi', model: 'wrong/fix' }] },
    coordinators: { [business]: { shared_quota: true, default: [{ harness: 'claude', model: 'claude-opus-5-5', account: 'aicoder-de13@ameria.com' }] },
      [personal]: { default: [{ harness: 'a1', model: 'openai-codex/gpt-6.1-sol' }] } } };
  const writeConfig = () => { fs.mkdirSync(path.join(f.home, 'config'), { recursive: true }); fs.writeFileSync(path.join(f.home, 'config', 'crew-dispatch.json'), JSON.stringify(config)); };
  const spawnTask = (id, flags = []) => { const r = call(['spawn', id, '--project', 'demo', ...flags, 'Count lines.']); assert.equal(r.code, 0, r.out); assert.equal((r.out.match(/^coordinator /gm) ?? []).length, 1); return f.task(id); };
  const launches = () => readWorld().log.filter(a => a[0] === 'run').length;
  login(business); writeConfig(); let task = spawnTask('solo-quota');
  assert.equal(task.candidates.length, 1); assert.deepEqual(task.chain, []); assert.equal(task.dispatch.coordinator.account, business); assert.equal(task.dispatch.sharedQuota, true);
  const count = launches();
  setTerminal(task.terminal, { status: { state: 'error', app: 'claude-code' }, screen: 'usage limit reached' });
  let r = call(['wait', task.id, '--timeout', '3']); assert.equal(r.code, 7, r.out);
  assert.match(r.out, /usage limit reached/); assert.match(r.out, /no other candidate/); assert.match(r.out, /Nobody can take this work now/); assert.equal(launches(), count);
  r = call(['relaunch', task.id]); assert.equal(r.code, 8, r.out); assert.match(r.out, /Nobody can take this work now/); assert.ok(fs.existsSync(task.worktree)); assert.equal(f.task(task.id).terminal, task.terminal);
  login(personal); task = spawnTask('solo-crash'); const count2 = launches();
  setTerminal(task.terminal, { status: null, screen: 'worker crashed' });
  r = call(['wait', task.id, '--timeout', '3']); assert.equal(r.code, 7, r.out);
  assert.match(r.out, /agent ended without a report/); assert.match(r.out, /Nobody can take this work now/); assert.equal(launches(), count2);
  // A multi-profile section's saved chain and measurement flag survive a new login/config.
  const chain = [{ harness: 'a1', model: 'openai-codex/first' }, { harness: 'pi', model: 'openai-codex/second' }];
  config.coordinators[business].default = chain; writeConfig(); login(business); task = spawnTask('saved-policy');
  assert.equal(fs.readFileSync(quotaLog, 'utf8'), '', 'Section shared_quota suppresses all measurement');
  config.coordinators[business].default = [{ harness: 'pi', model: 'wrong/new-config' }]; config.coordinators[business].shared_quota = false; writeConfig(); login(personal);
  r = call(['relaunch', task.id]); assert.equal(r.code, 0, r.out); assert.ok(r.out.includes(`saved task policy: coordinator ${business}`), 'Saved provenance must not impersonate the current coordinator');
  let moved = f.task(task.id); assert.equal(moved.agent, 'pi'); assert.equal(moved.launch.model, 'openai-codex/second'); assert.deepEqual(moved.candidates, chain);
  assert.equal(moved.dispatch.coordinator.account, business); assert.equal(moved.dispatch.sharedQuota, true); assert.equal(fs.readFileSync(quotaLog, 'utf8'), '');
  assert.equal(call(['relaunch', task.id]).code, 8, 'The saved policy cannot widen after all candidates were tried');
  r = call(['relaunch', task.id, '--model', 'openai-codex/explicit']); assert.equal(r.code, 0, r.out);
  moved = f.task(task.id); assert.equal(moved.launch.model, 'openai-codex/explicit'); assert.equal(moved.dispatch.coordinator.account, personal); assert.equal(moved.dispatch.sharedQuota, false);
  assert.deepEqual(moved.candidates.map(c => c.model), ['openai-codex/explicit', 'openai-codex/gpt-6.1-sol']); assert.ok(fs.readFileSync(quotaLog, 'utf8').includes('read'));
  // Automatic handover follows the same saved policy after a coordinator switch.
  config.coordinators[business].default = chain; config.coordinators[business].shared_quota = true; writeConfig(); login(business);
  const automatic = spawnTask('saved-auto'); login(personal);
  setTerminal(automatic.terminal, { status: { state: 'error', app: 'a1' }, screen: 'Please run /login' });
  fs.writeFileSync(quotaLog, '');
  r = call(['wait', automatic.id, '--timeout', '2']); assert.equal(r.code, 124, r.out);
  assert.equal(f.task(automatic.id).launch.model, 'openai-codex/second'); assert.deepEqual(f.task(automatic.id).candidates, chain);
  assert.equal(f.task(automatic.id).dispatch.coordinator.account, business); assert.equal(fs.readFileSync(quotaLog, 'utf8'), '');
  // Older saved tasks are still saved tasks: provenance absence never authorizes rebuilding.
  const legacy = spawnTask('legacy-policy'); const { dispatch, ...old } = legacy;
  f.save({ ...old, candidates: [old.launch, { harness: 'pi', model: 'legacy/saved' }], chain: [{ harness: 'pi', model: 'legacy/saved' }] });
  r = call(['relaunch', legacy.id]); assert.equal(r.code, 0, r.out); assert.equal(f.task(legacy.id).launch.model, 'legacy/saved');
  // The real review/fix entry points, not just agents --role, stay in section defaults.
  const ship = spawnTask('section-ship', ['--kind', 'ship']); fs.writeFileSync(ship.report, 'Implementation complete.'); f.save({ ...ship, state: 'reported' });
  r = call(['review', ship.id]); assert.equal(r.code, 0, r.out); assert.equal(f.task('section-ship-review').launch.model, 'openai-codex/gpt-6.1-sol');
  r = f.call(['fix', 'Check coordinator policy.'], { ...env, CREW_TOOL_ROOT: f.repo }); assert.equal(r.code, 0, r.out); assert.equal(f.task('fix-1').launch.model, 'openai-codex/gpt-6.1-sol');
  // Non-Claude/unlisted owners emit their reason once on a command that launches work.
  login('aicoder-de13@ameria.com'); r = call(['spawn', 'global-policy', '--project', 'demo', 'Count.']); assert.equal(r.code, 0, r.out);
  assert.equal((r.out.match(/^coordinator /gm) ?? []).length, 1); assert.match(r.out, /no coordinator section.*using global dispatch/); assert.equal(f.task('global-policy').launch.model, 'wrong/global');
});

gapTests['wait-relaunch'] = async () => {
  const f = gapFixture('wait-relaunch'), task = f.spawn('racing', ['--agent', 'pi']);
  const bin = path.join(f.dir, 'bin'); fs.mkdirSync(bin); fs.writeFileSync(path.join(bin, 'pi'), '');
  setTerminal(task.terminal, { status: { state: 'working', app: 'pi' } });
  const ready = path.join(f.dir, 'ready'), release = path.join(f.dir, 'release'), script = path.join(f.dir, 'wait.mjs');
  // Stop after wait has loaded the OLD task, before Core answers its terminal probe.
  fs.writeFileSync(script, `import fs from 'node:fs'; import cp from 'node:child_process'; import { syncBuiltinESMExports } from 'node:module';
const original = cp.spawnSync; let paused = false;
cp.spawnSync = function(command, args, options) {
 if (!paused && args[0] === ${JSON.stringify(fake)} && args[1] === 'get' && args.at(-1) === ${JSON.stringify(task.terminal)}) {
  paused = true; fs.writeFileSync(${JSON.stringify(ready)}, 'ready');
  while (!fs.existsSync(${JSON.stringify(release)})) Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 10);
 }
 return original(command, args, options);
}; syncBuiltinESMExports();
const { main } = await import(${JSON.stringify(pathToFileURL(path.join(here, 'crew.mjs')).href)}); main(process.argv.slice(2));`);
  const waiter = projectProcess(f, ['wait', task.id, '--timeout', '15'], { script, terminal: `owner-wait-relaunch`, env: { CREW_RECOVERY_SECONDS: '0.02' } });
  try {
    await until(() => fs.existsSync(ready));
    const r = f.call(['relaunch', task.id, '--agent', 'pi', '--model', 'replacement'], { CREW_AGENT_PATH: bin }); assert.equal(r.code, 0, r.out);
    const moved = f.task(task.id); assert.notEqual(moved.terminal, task.terminal);
    fs.writeFileSync(release, 'go');
    await until(() => f.task(task.id).state === 'failed' || readWorld().log.some(a => a[0] === 'get' && a.at(-1) === moved.terminal));
    assert.equal(f.task(task.id).state, 'working', 'An old terminal probe must not overwrite the relaunched task');
    assert.ok(f.task(task.id).terminals.some(t => t.address === task.terminal), 'Relaunch race retains predecessor ownership');
    for (const args of [['status', '--json'], ['status', '--json', '--view', 'fleet']]) {
      const shown = JSON.parse(f.call(args).out).tasks.find(t => t.id === task.id);
      assert.equal(shown.state, 'working'); assert.equal(shown.terminal, moved.terminal);
    }
    fs.writeFileSync(task.report, 'Completed by the replacement.');
    const done = crew(['done', task.id], { cwd: f.home, terminal: moved.terminal }); assert.equal(done.code, 0, done.out);
    const result = await waiter.result; assert.equal(result.code, 0, result.out);
    assert.match(result.out, /== racing: reported/); assert.match(result.out, /Completed by the replacement/);
    assert.equal(f.task(task.id).terminal, moved.terminal); assert.equal(f.task(task.id).fallbacks.length, 1);
  } finally { fs.writeFileSync(release, 'go'); waiter.child.kill(); await waiter.result; }
};

gapTests['stale-handover'] = async () => {
  const f = gapFixture('stale-handover'), task = f.spawn('racing', ['--agent', 'pi']);
  const bin = path.join(f.dir, 'bin'); fs.mkdirSync(bin); fs.writeFileSync(path.join(bin, 'pi'), '');
  setTerminal(task.terminal, { status: { state: 'error', app: 'pi' }, screen: 'usage limit reached' });
  const ready = path.join(f.dir, 'ready'), release = path.join(f.dir, 'release'), script = path.join(f.dir, 'wait.mjs');
  fs.writeFileSync(script, `import fs from 'node:fs'; import cp from 'node:child_process'; import { syncBuiltinESMExports } from 'node:module';
const original = cp.spawnSync; let paused = false;
cp.spawnSync = function(command, args, options) {
 const result = original(command, args, options);
 if (!paused && args[0] === ${JSON.stringify(fake)} && args[1] === 'read' && args[2] === ${JSON.stringify(task.terminal)}) {
  paused = true; fs.writeFileSync(${JSON.stringify(ready)}, 'ready');
  while (!fs.existsSync(${JSON.stringify(release)})) Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 10);
 }
 return result;
}; syncBuiltinESMExports();
const { main } = await import(${JSON.stringify(pathToFileURL(path.join(here, 'crew.mjs')).href)}); main(process.argv.slice(2));`);
  const waiter = projectProcess(f, ['wait', task.id, '--timeout', '15'], { script, terminal: 'owner-stale-handover', env: { CREW_RECOVERY_SECONDS: '0.02', CREW_AGENT_PATH: bin } });
  try {
    await until(() => fs.existsSync(ready));
    const r = f.call(['relaunch', task.id, '--agent', 'pi', '--model', 'replacement'], { CREW_AGENT_PATH: bin }); assert.equal(r.code, 0, r.out);
    const moved = f.task(task.id); setTerminal(moved.terminal, { status: { state: 'working', app: 'pi' } });
    fs.writeFileSync(release, 'go');
    // A stale quota observation must not hand the replacement over or settle as blocked.
    await until(() => readWorld().log.some(a => a[0] === 'get' && a.at(-1) === moved.terminal));
    fs.writeFileSync(task.report, 'Replacement kept working.');
    const done = crew(['done', task.id], { cwd: f.home, terminal: moved.terminal }); assert.equal(done.code, 0, done.out);
    const result = await waiter.result; assert.equal(result.code, 0, result.out); assert.match(result.out, /== racing: reported/);
    assert.equal(f.task(task.id).fallbacks.length, 1); assert.equal(f.task(task.id).terminal, moved.terminal);
  } finally { fs.writeFileSync(release, 'go'); waiter.child.kill(); await waiter.result; }
};

gapTests['relaunch-in-flight'] = async () => {
  const f = gapFixture('relaunch-in-flight'), task = f.spawn('racing', ['--agent', 'pi']);
  const bin = path.join(f.dir, 'bin'); fs.mkdirSync(bin); fs.writeFileSync(path.join(bin, 'pi'), '');
  const ready = path.join(f.dir, 'started'), release = path.join(f.dir, 'release'), script = path.join(f.dir, 'relaunch.mjs');
  // The replacement is alive, but hc run has not yet returned its address to crew.
  fs.writeFileSync(script, `import fs from 'node:fs'; import cp from 'node:child_process'; import { syncBuiltinESMExports } from 'node:module';
const original = cp.spawnSync;
cp.spawnSync = function(command, args, options) {
 const result = original(command, args, options);
 if (args[0] === ${JSON.stringify(fake)} && args[1] === 'run') {
  fs.writeFileSync(${JSON.stringify(ready)}, JSON.parse(result.stdout).address);
  while (!fs.existsSync(${JSON.stringify(release)})) Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 10);
 }
 return result;
}; syncBuiltinESMExports();
const { main } = await import(${JSON.stringify(pathToFileURL(path.join(here, 'crew.mjs')).href)}); main(process.argv.slice(2));`);
  const owner = 'owner-relaunch-in-flight';
  const launch = projectProcess(f, ['relaunch', task.id, '--agent', 'pi', '--model', 'replacement'], { script, terminal: owner, env: { CREW_AGENT_PATH: bin } });
  let waiter, done;
  try {
    await until(() => fs.existsSync(ready));
    const address = fs.readFileSync(ready, 'utf8'), before = readWorld().log.length;
    waiter = projectProcess(f, ['wait', task.id, '--timeout', '15'], { terminal: owner, env: { CREW_RECOVERY_SECONDS: '0.02' } });
    let ended = false; waiter.result.then(() => { ended = true; });
    await until(() => ended || readWorld().log.slice(before).filter(a => a[0] === 'get' && a.at(-1) === task.terminal).length >= 2);
    assert.equal(f.task(task.id).state, 'working', 'Wait must not fail the old terminal while replacement is in flight');
    fs.writeFileSync(task.report, 'Fast replacement report.');
    const doneReady = path.join(f.dir, 'done-ready'), doneScript = path.join(f.dir, 'done.mjs');
    fs.writeFileSync(doneScript, `import fs from 'node:fs'; import { main } from ${JSON.stringify(pathToFileURL(path.join(here, 'crew.mjs')).href)};
const open = fs.openSync; fs.openSync = (file, ...args) => {
 if (String(file).endsWith('task.json.lifecycle.lock')) fs.writeFileSync(${JSON.stringify(doneReady)}, 'ready');
 return open(file, ...args);
}; main(process.argv.slice(2));`);
    done = projectProcess(f, ['done', task.id], { script: doneScript, terminal: address });
    await until(() => fs.existsSync(doneReady));
    fs.writeFileSync(release, 'go');
    const launched = await launch.result; assert.equal(launched.code, 0, launched.out);
    const reported = await done.result; assert.equal(reported.code, 0, reported.out);
    const result = await waiter.result; assert.equal(result.code, 0, result.out); assert.match(result.out, /Fast replacement report/);
    assert.equal(f.task(task.id).state, 'reported'); assert.equal(f.task(task.id).terminal, address);
    const stale = crew(['done', task.id], { cwd: f.home, terminal: task.terminal }); assert.equal(stale.code, 3, stale.out);
  } finally {
    fs.writeFileSync(release, 'go'); await launch.result;
    if (done) { done.child.kill(); await done.result; }
    if (waiter) { waiter.child.kill(); await waiter.result; }
  }
};

gapTests['relaunch-load-repair'] = () => {
  const f = gapFixture('relaunch-load-repair'), old = f.spawn('racing', ['--agent', 'pi']);
  const bin = path.join(f.dir, 'bin'); fs.mkdirSync(bin); fs.writeFileSync(path.join(bin, 'pi'), '');
  const r = f.call(['relaunch', old.id, '--agent', 'pi', '--model', 'replacement'], { CREW_AGENT_PATH: bin }); assert.equal(r.code, 0, r.out);
  const moved = f.task(old.id), error = 'The worker terminal ended without a report.';
  const broken = { ...old, state: 'failed', error };
  const check = (state, terminal = old.terminal) => {
    for (const args of [['status', '--json'], ['status', '--json', '--view', 'fleet']]) {
      const result = f.call(args), shown = JSON.parse(result.out).tasks.find(t => t.id === old.id);
      assert.equal(shown.state, state, result.out); assert.equal(shown.terminal, terminal);
    }
  };
  f.save(broken);
  const patch = values => { const w = readWorld(); Object.assign(w, values); fs.writeFileSync(world, JSON.stringify(w)); };
  patch({ silent: true }); check('failed'); patch({ silent: false });
  setTerminal(moved.terminal, { labels: { 'crew.task': old.id, 'crew.home': 'another-home' } }); check('failed');
  const labels = readWorld().terminals[moved.terminal].labels;
  setTerminal(moved.terminal, { labels: { ...labels, 'crew.home': String(JSON.parse(fs.readFileSync(path.join(f.home, 'crew.json'), 'utf8')).tag) } });
  const w = readWorld(); w.terminals.duplicate = { ...w.terminals[moved.terminal], address: 'duplicate' }; fs.writeFileSync(world, JSON.stringify(w));
  check('failed'); const clean = readWorld(); delete clean.terminals.duplicate; fs.writeFileSync(world, JSON.stringify(clean));
  check('working', moved.terminal);
  assert.match(f.call(['status']).out, new RegExp(`racing\\tworking.*\\t${moved.terminal}`));
  assert.equal(f.task(old.id).state, 'failed', 'Status recovery is read-only');
  f.save({ ...broken, error: 'Another failure' }); check('failed'); f.save(broken);
  fs.writeFileSync(old.report, 'Recovered replacement report.');
  const done = crew(['done', old.id], { cwd: f.home, terminal: moved.terminal }); assert.equal(done.code, 0, done.out);
  assert.equal(f.task(old.id).state, 'reported'); assert.equal(f.task(old.id).terminal, moved.terminal); assert.equal(f.task(old.id).error, undefined);
};

gapTests['review-stop-race'] = () => {
  const f = gapFixture('review-race'), patch = p => { const w = readWorld(); Object.assign(w, p); fs.writeFileSync(world, JSON.stringify(w)); };
  const lost = [];
  for (const [id, flags, file, closed] of [
    ['ship-ignored', ['--kind', 'ship'], 'scratch/late.txt', false],
    ['scout-scratch', [], 'late.txt', false],
    ['forced-ship', ['--kind', 'ship', '--force'], 'late.txt', false],
    ['forced-scout', ['--force'], 'scratch/late.txt', false],
    ['closed-force', ['--force'], 'late.txt', true],
    ['closed-normal', [], 'late.txt', true],
  ]) {
    const force = flags.includes('--force'), t = f.spawn(id, flags.filter(flag => flag !== '--force'));
    if (file.startsWith('scratch/')) { fs.mkdirSync(path.join(t.worktree, 'scratch')); fs.writeFileSync(path.join(t.worktree, 'scratch', 'before.txt'), 'accepted'); }
    if (force && !closed) setTerminal(t.terminal, { status: { state: 'working', app: t.agent } });
    if (closed) f.save({ ...t, state: 'closed', closed: new Date().toISOString(), copyToReturn: { since: new Date().toISOString(), left: snapshotCopy(t.worktree), cleanupTerminal: true } });
    const late = path.join(t.worktree, file); patch({ writeOnKill: late });
    let r = f.call(['finish', id, ...(force ? ['--force'] : [])]); patch({ writeOnKill: null });
    assert.equal(r.code, 0, r.out);
    if (!fs.existsSync(late)) { lost.push(`${id}: work written while stopping was deleted`); continue; }
    assert.equal(f.task(id).state, 'closed'); assert.ok(f.task(id).copyToReturn, r.out);
    assert.match(r.out, /work written since finish/);
    r = f.call(['start']); assert.equal(r.code, 0, r.out); assert.ok(fs.existsSync(late), 'Automatic sweeps do not inherit the original force');
    r = f.call(['finish', id]); assert.equal(r.code, 0, r.out); assert.ok(fs.existsSync(late), 'A normal retry still protects late work');
    assert.equal(f.call(['finish', id, '--force']).code, 0); assert.ok(!fs.existsSync(t.worktree), 'Only a new explicit forced finish accepts the late work');
  }
  assert.deepEqual(lost, [], 'Every initial and resumed finish compares the post-stop copy, even with force');
};

gapTests['review-force-retry'] = () => {
  const f = gapFixture('review-force'), patch = p => { const w = readWorld(); Object.assign(w, p); fs.writeFileSync(world, JSON.stringify(w)); };
  const t = f.spawn('pending'); setTerminal(t.terminal, { status: { state: 'working', app: t.agent } }); patch({ unkillable: true });
  let r = f.call(['finish', t.id, '--force']); assert.equal(r.code, 0, r.out); assert.ok(f.task(t.id).copyToReturn.stopPending);
  patch({ unkillable: false }); const before = readWorld().log.length;
  r = f.call(['start']); assert.equal(r.code, 0, r.out); assert.equal(readWorld().terminals[t.terminal].state, 'live');
  assert.ok(!readWorld().log.slice(before).some(a => a[0] === 'kill'), 'Automatic retries do not force a busy worker');
  r = f.call(['finish', t.id, '--force']); assert.equal(r.code, 0, r.out);
  assert.ok(!readWorld().terminals[t.terminal] && !fs.existsSync(t.worktree), 'An explicitly forced retry cancels and returns the pending copy');
  const writing = f.spawn('pending-write'); setTerminal(writing.terminal, { status: { state: 'working', app: writing.agent } }); patch({ unkillable: true });
  assert.equal(f.call(['finish', writing.id, '--force']).code, 0);
  const late = path.join(writing.worktree, 'late.txt'); patch({ unkillable: false, writeOnKill: late });
  r = f.call(['finish', writing.id, '--force']); patch({ writeOnKill: null }); assert.equal(r.code, 0, r.out);
  assert.ok(fs.existsSync(late) && f.task(writing.id).copyToReturn, 'A forced stop retry also protects work written during its own cancellation');
  assert.equal(f.call(['finish', writing.id, '--force']).code, 0); assert.ok(!fs.existsSync(writing.worktree));
};

gapTests['review-pending-status'] = () => {
  const f = gapFixture('review-status'), patch = p => { const w = readWorld(); Object.assign(w, p); fs.writeFileSync(world, JSON.stringify(w)); };
  const t = f.spawn('pending'); setTerminal(t.terminal, { status: { state: 'working', app: t.agent } }); patch({ unkillable: true });
  let r = f.call(['finish', t.id, '--force']); assert.equal(r.code, 0, r.out); patch({ unkillable: false });
  const assertPending = (task, why, text) => {
    const before = readWorld().log.length;
    const shown = JSON.parse(f.call(['status', '--all', '--json']).out).tasks.find(s => s.id === task.id).copyToReturn;
    assert.equal(shown.free, false, 'A pending lifecycle confirmation must not be presented as a free copy');
    assert.equal(shown.why, why); assert.match(shown.pending, text);
    const line = f.call(['status', '--all']).out.split(/\r?\n/).find(line => line.startsWith(`${task.id}\t`));
    assert.match(line, text); assert.ok(!line.includes('free now') && !line.includes('--force discards it'), line);
    assert.ok(!readWorld().log.slice(before).some(a => ['kill', 'rm'].includes(a[0])), 'Status is observational only');
  };
  assertPending(t, 'stop pending', /worker stop is not confirmed/);
  const removal = f.spawn('removal'); patch({ failRm: true }); r = f.call(['finish', removal.id]); assert.equal(r.code, 0, r.out);
  assertPending(removal, 'terminal removal pending', /worker terminal removal is not confirmed/);
  patch({ failRm: false }); assert.equal(f.call(['finish', t.id, '--force']).code, 0); assert.equal(f.call(['finish', removal.id]).code, 0);
};

gapTests['review2-baseline-race'] = () => {
  const f = gapFixture('review2-baseline'), t = f.spawn('racing', ['--kind', 'ship']);
  const late = path.join(t.worktree, 'late.txt'), preload = slash(path.join(f.dir, 'race.cjs'));
  // Return a genuinely clean first status result, then let the worker write before the
  // coordinator receives it. NODE_OPTIONS applies the hook only to this fake-Core command.
  fs.writeFileSync(preload, `const cp = require('node:child_process'), fs = require('node:fs'), original = cp.spawnSync;
let written = false;
cp.spawnSync = function(command, args, options) {
  const result = original(command, args, options);
  if (!written && command === 'git' && args[1] === ${JSON.stringify(t.worktree)} && args.includes('status') && args.includes('--porcelain') && result.status === 0) {
    written = true; fs.writeFileSync(${JSON.stringify(late)}, 'written after the clean result');
  }
  return result;
};
require('node:module').syncBuiltinESMExports();`);
  const r = f.call(['finish', t.id], { NODE_OPTIONS: `${process.env.NODE_OPTIONS ?? ''} --require ${JSON.stringify(preload)}` });
  assert.ok([0, 6].includes(r.code), r.out);
  assert.ok(fs.existsSync(late), 'Work between the clean result and baseline must not be silently accepted and deleted');
  if (r.code === 6) assert.equal(readWorld().terminals[t.terminal].state, 'live', 'A refusal leaves the worker intact');
  else assert.ok(f.task(t.id).copyToReturn, 'Work outside the accepted baseline postpones return');
  assert.equal(f.call(['finish', t.id, '--force']).code, 0); assert.ok(!fs.existsSync(t.worktree));
};

gapTests['review2-unseen-force'] = () => {
  const f = gapFixture('review2-unseen'), patch = p => { const w = readWorld(); Object.assign(w, p); fs.writeFileSync(world, JSON.stringify(w)); };
  const corrupt = t => { const file = path.join(t.worktree, '.git'); fs.renameSync(file, `${file}-saved`); fs.writeFileSync(file, 'gitdir: missing\n'); };
  const t = f.spawn('unseen', ['--kind', 'ship']); fs.writeFileSync(path.join(t.worktree, 'unsaved.txt'), 'discard only by explicit request'); corrupt(t);
  let r = f.call(['finish', t.id]); assert.equal(r.code, 6, r.out); assert.match(r.out, /Pass --force to discard it unseen/); assert.equal(readWorld().terminals[t.terminal].state, 'live');
  r = f.call(['finish', t.id, '--force']); assert.equal(r.code, 0, r.out);
  assert.ok(!fs.existsSync(t.worktree), 'Explicit force must discard an uninspectable copy on the first attempt');
  assert.match(r.out, /discarded unseen/); assert.ok(!f.task(t.id).copyToReturn);

  const closed = f.spawn('closed', ['--kind', 'ship']);
  f.save({ ...closed, state: 'closed', closed: new Date().toISOString(), copyToReturn: { since: new Date().toISOString(), left: snapshotCopy(closed.worktree), cleanupTerminal: true } });
  corrupt(closed);
  r = f.call(['finish', closed.id]); assert.equal(r.code, 0, r.out); assert.ok(fs.existsSync(closed.worktree)); assert.match(r.out, /--force.*discards/);
  f.guest(closed);
  r = f.call(['finish', closed.id, '--force']); assert.equal(r.code, 6, r.out); assert.ok(fs.existsSync(closed.worktree), 'Unseen discard still cannot override another terminal');
  f.leave(); patch({ silentLs: true }); r = f.call(['finish', closed.id, '--force']); assert.equal(r.code, 4, r.out); assert.ok(fs.existsSync(closed.worktree));
  patch({ silentLs: false }); r = f.call(['finish', closed.id, '--force']); assert.equal(r.code, 0, r.out); assert.ok(!fs.existsSync(closed.worktree), r.out); assert.match(r.out, /discarded unseen/);
};

gapTests['review2-missing-git'] = () => {
  const f = gapFixture('review2-missing'), t = f.spawn('missing', ['--kind', 'ship']);
  fs.renameSync(path.join(t.worktree, '.git'), path.join(t.worktree, '.git-saved'));
  fs.writeFileSync(path.join(t.worktree, 'unsaved.txt'), 'not inspectable without the Git marker');
  let r = f.call(['finish', t.id]); assert.equal(r.code, 6, 'A missing Git marker is an inspection failure, not proof of a clean ship');
  assert.equal(readWorld().terminals[t.terminal].state, 'live'); assert.ok(fs.existsSync(path.join(t.worktree, 'unsaved.txt')));
  r = f.call(['finish', t.id, '--force']); assert.equal(r.code, 0, r.out); assert.ok(!fs.existsSync(t.worktree)); assert.match(r.out, /discarded unseen/);
};

gapTests['review3-prototype-names'] = () => {
  const f = gapFixture('review3-names'), names = ['__proto__', 'constructor', 'toString'];
  const writeNames = t => { for (const name of names) fs.writeFileSync(path.join(t.worktree, name), 'accepted before finish'); };
  const assertOwnNames = record => { for (const name of names) assert.ok(Object.hasOwn(record, name), `${name} must be an own filename key`); };
  for (const [i, name] of names.entries()) {
    const t = f.spawn(`untracked-${i}`, ['--kind', 'ship']); fs.writeFileSync(path.join(t.worktree, name), 'uncommitted');
    const snapshot = snapshotCopy(t.worktree), r = f.call(['finish', t.id]);
    assert.equal(r.code, 6, `Uncommitted ${name} must refuse finish: ${r.out}`);
    assert.ok(fs.existsSync(path.join(t.worktree, name))); assert.equal(readWorld().terminals[t.terminal].state, 'live');
    assert.ok(Object.hasOwn(snapshot.files, name)); assert.equal(Object.getPrototypeOf(snapshot.files), null);
    assert.equal(f.call(['finish', t.id, '--force']).code, 0);
  }

  // Saved JSON (including older records) has ordinary-object dictionaries. Unchanged
  // accepted filenames must round-trip without either losing names or inventing changes.
  const oldFiles = f.spawn('old-files', ['--kind', 'ship']); writeNames(oldFiles); f.guest(oldFiles);
  assert.equal(f.call(['finish', oldFiles.id, '--force']).code, 0);
  const savedFiles = f.task(oldFiles.id); assert.equal(Object.getPrototypeOf(savedFiles.copyToReturn.left.files), Object.prototype); assertOwnNames(savedFiles.copyToReturn.left.files);
  f.save(JSON.parse(JSON.stringify(savedFiles))); f.leave();
  let r = f.call(['finish', oldFiles.id]); assert.equal(r.code, 0, r.out); assert.ok(!fs.existsSync(oldFiles.worktree), r.out);

  const oldLost = f.spawn('old-lost', ['--kind', 'ship']); fs.writeFileSync(path.join(oldLost.worktree, '__proto__'), 'older writer omitted this key'); f.guest(oldLost);
  assert.equal(f.call(['finish', oldLost.id, '--force']).code, 0);
  const lost = f.task(oldLost.id); delete lost.copyToReturn.left.files.__proto__; f.save(lost); f.leave();
  r = f.call(['finish', oldLost.id]); assert.equal(r.code, 0, r.out); assert.ok(fs.existsSync(path.join(oldLost.worktree, '__proto__')), 'A name omitted by an older snapshot cannot be inferred safe to discard');
  assert.equal(f.call(['finish', oldLost.id, '--force']).code, 0);

  fs.appendFileSync(path.join(f.repo, '.git', 'info', 'exclude'), `\n${names.map(name => `/${name}`).join('\n')}\n`);
  const oldIgnored = f.spawn('old-ignored', ['--kind', 'ship']); writeNames(oldIgnored); f.guest(oldIgnored);
  const snapshot = snapshotCopy(oldIgnored.worktree); assert.equal(Object.getPrototypeOf(snapshot.ignored), null); assertOwnNames(snapshot.ignored);
  assert.equal(f.call(['finish', oldIgnored.id]).code, 0);
  const savedIgnored = f.task(oldIgnored.id); assert.equal(Object.getPrototypeOf(savedIgnored.copyToReturn.left.ignored), Object.prototype); assertOwnNames(savedIgnored.copyToReturn.left.ignored);
  f.save(JSON.parse(JSON.stringify(savedIgnored))); f.leave();
  r = f.call(['finish', oldIgnored.id]); assert.equal(r.code, 0, r.out); assert.ok(!fs.existsSync(oldIgnored.worktree), r.out);

  for (const [i, name] of names.entries()) {
    const t = f.spawn(`ignored-${i}`, ['--kind', 'ship']); fs.writeFileSync(path.join(t.worktree, name), 'accepted'); f.guest(t);
    assert.equal(f.call(['finish', t.id]).code, 0);
    const older = f.task(t.id);
    if (name === '__proto__') { delete older.copyToReturn.left.ignored.__proto__; f.save(older); }
    fs.writeFileSync(path.join(t.worktree, name), 'work written after finish');
    f.leave(); r = f.call(['start']); assert.equal(r.code, 0, r.out);
    assert.ok(fs.existsSync(path.join(t.worktree, name)), `Ignored ${name} must be protected after finish`); assert.match(r.out, /work written since finish/);
    assert.equal(f.call(['finish', t.id, '--force']).code, 0);
  }
};

// PR discovery fixtures never contact GitHub or use the machine's real Core/auth.
function prDiscoveryFixture(name) {
  const dir = path.join(root, `pr-discovery-${name}`), repo = path.join(dir, 'project'), copy = path.join(dir, 'copy'), home = path.join(dir, 'home');
  fs.mkdirSync(repo, { recursive: true }); git('-C', repo, 'init', '-q', '-b', 'main');
  commit(repo, { 'README.md': 'discovery fixture\n' }, 'baseline');
  git('-C', repo, 'remote', 'add', 'origin', 'https://github.com/acme/demo.git');
  git('-C', repo, 'worktree', 'add', '-q', '-b', 'feature/draft', copy);
  fs.mkdirSync(path.join(home, 'tasks', 'draft'), { recursive: true });
  fs.writeFileSync(path.join(home, 'crew.json'), JSON.stringify({ version: 1, tag: 'discovery', projects: { demo: { path: repo } } }));
  const task = { id: 'draft', kind: 'ship', state: 'working', agent: 'pi', project: 'demo', branch: 'feature/draft', worktree: copy,
    terminal: null, created: '2026-01-01T00:00:00Z', report: path.join(home, 'tasks', 'draft', 'report.md') };
  const save = t => { const folder = path.join(home, 'tasks', t.id); fs.mkdirSync(folder, { recursive: true }); fs.writeFileSync(path.join(folder, 'task.json'), JSON.stringify(t)); };
  save(task);
  const log = path.join(dir, 'gh-log.json'), control = path.join(dir, 'gh-control.json'), fakeGh = path.join(dir, 'gh.mjs');
  fs.writeFileSync(log, '[]'); fs.writeFileSync(control, '{}');
  fs.writeFileSync(fakeGh, `import fs from 'node:fs';
const a = process.argv.slice(2), log = ${JSON.stringify(log)}, control = JSON.parse(fs.readFileSync(${JSON.stringify(control)}, 'utf8'));
fs.writeFileSync(log, JSON.stringify([...JSON.parse(fs.readFileSync(log, 'utf8')), a]));
if (control.fail) { console.log(${JSON.stringify(JSON.stringify(githubFixture('rest-permission.json')))}); console.error(${JSON.stringify(githubFixture('rest-permission.json.meta').stderr)}); process.exit(1); }
if (control.malformed) { console.log('not json'); process.exit(0); }
if (control.oversized) { process.stdout.write('x'.repeat(1100000)); process.exit(0); }
if (control.sleep) { setInterval(()=>{},1000); }
else if (a[0] === 'repo') console.log(JSON.stringify(control.repository ?? {nameWithOwner:'acme/demo',url:'https://github.com/acme/demo'}));
else if (a[0] === 'api' && a.includes('graphql')) {
 const owner = a.find(x=>x.startsWith('owner='))?.slice(6), name = a.find(x=>x.startsWith('name='))?.slice(5), number = a.find(x=>x.startsWith('number='))?.slice(7);
 const proof = ${JSON.stringify(githubFixture('graphql-open.json'))};
 proof.data.repository.nameWithOwner = owner+'/'+name; proof.data.repository.pullRequest.url = 'https://github.com/'+owner+'/'+name+'/pull/'+number;
 console.log(JSON.stringify(control.verification ?? proof));
 process.exit(control.verificationCode ?? 0);
} else if (a[0] === 'api') {
 const branch = a.find(x=>x.startsWith('head='))?.slice('head=acme:'.length);
 const recorded = ${JSON.stringify(recordedRestPr())};
 console.log(JSON.stringify(control.response ?? [{...recorded,head:{...recorded.head,ref:branch}}]));
} else process.exit(1);
`);
  const call = (args, terminal) => crew(args, { cwd: home, terminal, env: { CREW_GH: fakeGh } });
  return { dir, repo, copy, home, task, save, call, log, control, fakeGh,
    projects: { demo: { path: repo } }, set: value => fs.writeFileSync(control, JSON.stringify(value)) };
}
const discoveryPr = (branch = 'feature/draft', number = 12) => recordedRestPr(number, branch);

// Unit runner: real fixture paths, no processes; records every limit, repo and branch.
function discoveryRunner(f, { origin = 'https://github.com/acme/demo.git', prs = [discoveryPr()], repo = {nameWithOwner:'acme/demo',url:'https://github.com/acme/demo'}, before = () => {} } = {}) {
  const calls = [];
  const execute = (command, args, options) => {
    calls.push({ command, args, options }); before(command, args, options);
    assert.ok(options.timeout > 0 && options.timeout <= 2000); assert.equal(options.maxBuffer, 1048576);
    assert.equal(options.killSignal, 'SIGKILL'); assert.equal(options.env.GIT_OPTIONAL_LOCKS, '0'); assert.equal(options.env.GH_PROMPT_DISABLED, '1');
    let stdout = '';
    if (command === 'git') {
      if (args.includes('rev-parse')) stdout = `${args[1]}\n${path.join(f.repo, '.git')}`;
      else if (args.includes('symbolic-ref')) stdout = 'refs/heads/feature/draft';
      else if (args.includes('get-url')) stdout = origin;
      else assert.ok(args.includes('check-ref-format'));
    } else if (command === 'ssh') { assert.deepEqual(args, ['-G', 'github-alias']); stdout = 'host github-alias\nhostname github.com\n'; }
    else if (args.includes('repo')) stdout = JSON.stringify(repo);
    else { assert.ok(args.includes('api')); stdout = JSON.stringify(prs); }
    return { code: 0, stdout, stderr: '', error: null };
  };
  return { calls, execute };
}

gapTests['pr-facts'] = () => {
  const f = prDiscoveryFixture('facts'), h = { tasks: path.join(f.home, 'tasks') };
  const file = path.join(h.tasks, 'draft', 'task.json'), read = () => JSON.parse(fs.readFileSync(file, 'utf8'));
  const url = 'https://github.com/acme/demo/pull/12', stamp = '2026-01-02T00:00:00Z';
  const merged = prObservation({ state: 'closed', merged_at: '2026-01-01T00:00:00Z', closed_at: '2026-01-01T00:00:00Z' }, url, stamp);
  assert.equal(merged.state, 'MERGED');
  assert.equal(prObservation({}, 'invalid'), null);
  assert.equal(prObservation({ state: 'MERGED', mergedAt: 'invalid' }, url).mergedAt, null);
  assert.equal(prObservation({ state: 'MERGED', mergedAt: '2026-02-30T00:00:00Z' }, url).mergedAt, null);
  assert.equal(prObservation({ state: 'invented', mergedAt: stamp }, url).state, null);
  assert.equal(prObservation({ state: 'NOT_FOUND' }, url).state, null, 'raw state text is not authoritative absence proof');
  assert.equal(prObservation({ state: 'OPEN', mergedAt: stamp, closedAt: stamp }, url).closedAt, null);
  f.save({ ...f.task, state: 'closed', stage: 'implementation', updated: stamp, tells: 7 });
  rememberTaskPr(h, f.task, merged);
  assert.deepEqual(read().prFacts, merged);
  const { prFacts, ...authority } = read();
  assert.deepEqual(authority, { ...f.task, state: 'closed', stage: 'implementation', updated: stamp, tells: 7 });
  rememberTaskPr(h, f.task, { ...merged, observedAt: '2026-01-03T00:00:00Z' });
  assert.equal(read().updated, stamp, 'repeated facts never change lifecycle timestamps');
  assert.equal(read().prFacts.observedAt, '2026-01-03T00:00:00Z', 'freshness watermark still advances');
  const bytes = fs.readFileSync(file, 'utf8');
  rememberTaskPr(h, f.task, prObservation({}, url, '2026-01-04T00:00:00Z'));
  assert.equal(fs.readFileSync(file, 'utf8'), bytes, 'unknown reads cannot erase learned closure');
  rememberTaskPr(h, f.task, prObservation({ state: 'OPEN' }, url, '2026-01-01T00:00:00Z'));
  assert.equal(read().prFacts.state, 'MERGED', 'older observations cannot regress facts');
  rememberTaskPr(h, f.task, prObservation({ state: 'OPEN' }, url, '2026-01-05T00:00:00Z'));
  assert.equal(read().prFacts.state, 'OPEN'); assert.equal(read().prFacts.mergedAt, null, 'reopened clears closure');
  f.save({ ...read(), pr: 'https://github.com/acme/demo/pull/13' });
  const replaced = fs.readFileSync(file, 'utf8');
  rememberTaskPr(h, f.task, merged);
  assert.equal(fs.readFileSync(file, 'utf8'), replaced, 'cannot attach facts to a different recorded identity');
  rememberTaskPr(h, { ...f.task, branch: 'different' }, prObservation({ state: 'OPEN' }, read().pr));
  assert.equal(fs.readFileSync(file, 'utf8'), replaced, 'reused task identity fails closed');
  const wait = Atomics.wait; let waits = 0;
  try {
    Atomics.wait = (...args) => { waits++; return wait(...args); };
    for (const lock of [`${file}.lock`, `${file}.lifecycle.lock`]) {
      fs.writeFileSync(lock, 'held');
      rememberTaskPr(h, f.task, prObservation({ state: 'OPEN' }, read().pr));
      assert.equal(fs.readFileSync(file, 'utf8'), replaced); fs.rmSync(lock);
    }
  } finally { Atomics.wait = wait; }
  assert.equal(waits, 0, 'observations skip both active writers and pending lifecycle intent without waiting');
  const rename = fs.renameSync; let attempts = 0;
  try {
    fs.renameSync = () => { attempts++; throw Object.assign(Error('injected sharing error'), { code: 'EACCES' }); };
    rememberTaskPr(h, f.task, prObservation({ state: 'OPEN' }, read().pr));
  } finally { fs.renameSync = rename; }
  assert.equal(attempts, 1, 'observations yield on sharing errors instead of holding the lock for retries');
  assert.equal(fs.readFileSync(file, 'utf8'), replaced);
  assert.ok(!fs.existsSync(`${file}.lock`));

  // The existing exact query supplies lifecycle facts with no additional calls.
  const runner = discoveryRunner(f, { prs: [{ ...discoveryPr(), state: 'closed', merged_at: merged.mergedAt, closed_at: merged.closedAt }] });
  const observations = [];
  const result = discoverTaskPrs([f.task], f.projects, { ...runner, observe: (task, facts) => observations.push([task, facts]) });
  assert.equal(result[0].status, 'known'); assert.equal(observations.length, 1);
  assert.equal(observations[0][1].state, 'MERGED'); assert.equal(runner.calls.filter(c => c.args.includes('api')).length, 1);
  const bad = discoveryRunner(f, { prs: [{ ...discoveryPr('not-our-branch'), state: 'closed' }] });
  discoverTaskPrs([f.task], f.projects, { ...bad, observe: () => assert.fail('unverified facts cannot be saved') });
};

gapTests['pr-facts-contention'] = async () => {
  const f = gapFixture('pr-facts-contention');
  const owner = JSON.parse(fs.readFileSync(path.join(f.home, 'owner.json'))).terminal;
  const module = JSON.stringify(pathToFileURL(path.join(here, 'crew.mjs')).href);
  for (const [verb, delay] of [['done', 500], ['finish', 500], ['done', 1100]]) {
    const label = `${verb}-${delay}`, task = f.spawn(`overlap-${label}`, ['--agent', 'pi']);
    fs.writeFileSync(task.report, 'Complete.');
    const file = path.join(f.home, 'tasks', task.id, 'task.json'), lock = `${file}.lock`;
    const ready = path.join(f.dir, `${label}-observation-ready`), release = path.join(f.dir, `${label}-observation-release`);
    const waiting = path.join(f.dir, `${label}-lifecycle-waiting`);
    const observer = path.join(f.dir, `${label}-observer.mjs`), lifecycle = path.join(f.dir, `${label}-lifecycle.mjs`);
    fs.writeFileSync(observer, `import fs from 'node:fs'; import {rememberTaskPr,prObservation} from ${module};
const file = ${JSON.stringify(file)}, rename = fs.renameSync;
fs.renameSync = (from,to) => {
 if (to === file) {
  fs.writeFileSync(${JSON.stringify(ready)},'ready'); const deadline = Date.now()+15000;
  while (!fs.existsSync(${JSON.stringify(release)})) { if (Date.now()>deadline) throw Error('observation barrier timeout'); Atomics.wait(new Int32Array(new SharedArrayBuffer(4)),0,0,10); }
  // Delay atomic rename only after lifecycle actually attempted its lock.
  // Also cover the full one-second supported retry interval plus margin.
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)),0,0,${delay});
 }
 return rename(from,to);
};
const task = JSON.parse(fs.readFileSync(file));
rememberTaskPr({tasks:${JSON.stringify(path.join(f.home, 'tasks'))}},task,prObservation({state:'OPEN'},'https://github.com/acme/demo/pull/12'));`);
    fs.writeFileSync(lifecycle, `import fs from 'node:fs'; import {main} from ${module};
const open = fs.openSync; let marked = false;
fs.openSync = (file,...args) => {
 if (!marked && file === ${JSON.stringify(lock)} && args[0] === 'wx') { marked = true; fs.writeFileSync(${JSON.stringify(waiting)},'waiting'); }
 return open(file,...args);
}; main(process.argv.slice(2));`);
    const observation = projectProcess(f, [], { script: observer });
    await until(() => fs.existsSync(ready));
    const writer = projectProcess(f, [verb, task.id, ...(verb === 'finish' ? ['--force'] : [])],
      { script: lifecycle, terminal: verb === 'done' ? task.terminal : owner });
    await until(() => fs.existsSync(waiting));
    fs.writeFileSync(release, 'release');
    const [observed, written] = await Promise.all([observation.result, writer.result]);
    assert.equal(observed.code, 0, observed.out);
    assert.equal(written.code, 0, `${verb} must survive the observation's ${delay} ms rename: ${written.out}`);
    assert.equal(f.task(task.id).state, verb === 'done' ? 'reported' : 'closed');
    assert.equal(f.task(task.id).prFacts.state, 'OPEN', 'lifecycle writes preserve completed observations');
    assert.equal(f.task(task.id).pr, undefined, 'observations do not grant delivery authority');
    assert.ok(!fs.existsSync(lock)); assert.ok(!fs.existsSync(`${file}.lifecycle.lock`));
  }
  // Exhausted/stale contention is an actionable refusal, not an internal crash.
  // Advance only the contending child's clock after it really retries the lock.
  const task = f.spawn('busy-refusal', ['--agent', 'pi']); fs.writeFileSync(task.report, 'Complete.');
  const file = path.join(f.home, 'tasks', task.id, 'task.json'), script = path.join(f.dir, 'busy.mjs');
  fs.writeFileSync(script, `import fs from 'node:fs'; import {main} from ${module};
const open = fs.openSync, clock = Date.now; let attempts = 0;
fs.openSync = (file,...args) => {
 if (file === ${JSON.stringify(`${file}.lock`)} && ++attempts === 2) Date.now = () => clock()+10000;
 return open(file,...args);
}; main(process.argv.slice(2));`);
  fs.writeFileSync(`${file}.lock`, 'held');
  let r = await projectProcess(f, ['done', task.id], { script, terminal: task.terminal }).result;
  assert.equal(r.code, 6, r.out); assert.match(r.out, /task-busy: busy-refusal; retry/);
  assert.ok(!r.out.includes('internal error')); assert.equal(f.task(task.id).state, 'working');
  assert.ok(!fs.existsSync(`${file}.lifecycle.lock`), 'failed acquisition releases lifecycle intent');
  fs.rmSync(`${file}.lock`);
  r = await projectProcess(f, ['done', task.id], { terminal: task.terminal }).result;
  assert.equal(r.code, 0, r.out); assert.equal(f.task(task.id).state, 'reported');
};

gapTests['pr-facts-commands'] = () => {
  const f = gapFixture('pr-facts-commands'), origin = path.join(f.dir, 'origin.git');
  git('init', '-q', '--bare', origin); git('-C', f.repo, 'remote', 'add', 'origin', origin);
  const t = f.spawn('ship', ['--kind', 'ship', '--agent', 'pi']);
  const tip = commit(t.worktree, { 'change': 'ship\n' }, 'change');
  git('-C', t.worktree, 'push', '-q', 'origin', `HEAD:${t.branch}`);
  const url = 'https://github.com/acme/demo/pull/12', stamp = '2026-01-01T00:00:00Z';
  fs.writeFileSync(t.report, `Implementation: ${url}\n`);
  f.save({ ...t, state: 'reported', workflow: 'delivery', stage: 'implementation', pr: url });
  const gh = path.join(f.dir, 'gh.mjs'), log = path.join(f.dir, 'gh-log.json'), missing = path.join(f.dir, 'missing-pr'); fs.writeFileSync(log, '[]');
  fs.writeFileSync(gh, `import fs from 'node:fs'; const a = process.argv.slice(2), log = ${JSON.stringify(log)};
fs.writeFileSync(log, JSON.stringify([...JSON.parse(fs.readFileSync(log)), a]));
const pr = {url:${JSON.stringify(url)},state:'MERGED',mergedAt:${JSON.stringify(stamp)},closedAt:${JSON.stringify(stamp)},headRefOid:${JSON.stringify(tip)},isDraft:true,body:''};
if (a.includes('graphql') && fs.existsSync(${JSON.stringify(missing)})) { console.log(JSON.stringify({data:{repository:{nameWithOwner:'acme/demo',pullRequests:{totalCount:1},pullRequest:null}},errors:[{type:'NOT_FOUND',path:['repository','pullRequest']}]})); process.exit(1); }
if (a.includes('graphql')) console.log(JSON.stringify({data:{repository:{nameWithOwner:'acme/demo',pullRequests:{totalCount:1},pullRequest:pr}}})); else if (a[1] === 'list') console.log(JSON.stringify([pr])); else process.exit(1);`);
  let r = f.call(['land', t.id], { CREW_GH: gh }); assert.equal(r.code, 0, r.out);
  assert.equal(f.task(t.id).prFacts.state, 'MERGED'); assert.equal(f.task(t.id).prFacts.mergedAt, stamp);
  // Force the finish path to learn its own facts, not merely preserve land's cache.
  const { prFacts, ...uncached } = f.task(t.id); f.save(uncached);
  // Finish performs no Git network reads; expose a supported origin for its
  // exact-URL proof after land/push used the isolated local bare remote.
  git('-C', f.repo, 'remote', 'set-url', 'origin', 'https://github.com/acme/demo.git');
  r = f.call(['finish', t.id, '--force'], { CREW_GH: gh }); assert.equal(r.code, 0, r.out);
  assert.match(r.out, /merged branch .* deleted/); assert.equal(f.task(t.id).prFacts.mergedAt, stamp);
  assert.equal(f.task(t.id).state, 'closed'); assert.equal(f.task(t.id).pr, url);
  const calls = JSON.parse(fs.readFileSync(log)); assert.equal(calls.length, 2);
  assert.ok(calls.every(a => a[0] === 'api' && a.includes('graphql')), 'land/finish replace their existing reads, not add requests');
  git('-C', f.repo, 'remote', 'set-url', 'origin', origin);
  const t2 = f.spawn('missing', ['--kind', 'ship', '--agent', 'pi']);
  commit(t2.worktree, { 'unmerged': 'keep\n' }, 'unmerged work');
  git('-C', t2.worktree, 'push', '-q', 'origin', `HEAD:${t2.branch}`);
  fs.writeFileSync(t2.report, `Implementation: ${url}\n`);
  f.save({ ...t2, state: 'reported', workflow: 'delivery', stage: 'implementation', pr: url });
  fs.writeFileSync(missing, 'missing');
  r = f.call(['land', t2.id], { CREW_GH: gh }); assert.equal(r.code, 0, r.out);
  assert.equal(f.task(t2.id).prFacts.state, 'NOT_FOUND'); assert.equal(f.task(t2.id).pr, url);
  assert.ok(JSON.parse(f.call(['status', '--json', '--view', 'fleet']).out).tasks.some(t => t.id === t2.id), 'live tasks remain visible even with not-found facts');
  git('-C', f.repo, 'remote', 'set-url', 'origin', 'https://github.com/acme/demo.git');
  r = f.call(['finish', t2.id, '--force'], { CREW_GH: gh }); assert.equal(r.code, 0, r.out);
  assert.equal(f.task(t2.id).state, 'closed'); assert.equal(f.task(t2.id).prFacts.state, 'NOT_FOUND');
  assert.ok(git('-C', f.repo, 'branch', '--list', t2.branch).trim(), 'absence does not prove a branch was merged');
  assert.ok(!JSON.parse(f.call(['status', '--json', '--view', 'fleet']).out).tasks.some(t => t.id === t2.id));
  assert.equal(JSON.parse(fs.readFileSync(log)).length, 4, 'not-found proofs replace the two existing lifecycle reads');
};

gapTests['pr-facts-foreign-merge'] = () => {
  const f = gapFixture('foreign-pr-merge'), task = f.spawn('ship', ['--kind', 'ship', '--agent', 'pi']);
  const tip = commit(task.worktree, { 'keep': 'unmerged in this project\n' }, 'work');
  git('-C', f.repo, 'remote', 'add', 'origin', 'https://github.com/acme/demo.git');
  f.save({ ...task, pr: 'https://github.com/other/foreign/pull/9' });
  const fakeGh = path.join(f.dir, 'gh.mjs'), log = path.join(f.dir, 'calls.json'); fs.writeFileSync(log, '[]');
  fs.writeFileSync(fakeGh, `import fs from 'node:fs'; const a = process.argv.slice(2), file = ${JSON.stringify(log)};
fs.writeFileSync(file, JSON.stringify([...JSON.parse(fs.readFileSync(file)),a]));
if (a.includes('graphql')) console.log(JSON.stringify({data:{repository:{nameWithOwner:'other/foreign',pullRequests:{totalCount:1},pullRequest:{url:'https://github.com/other/foreign/pull/9',state:'MERGED',headRefOid:${JSON.stringify(tip)},mergedAt:'2026-01-01T00:00:00Z',closedAt:'2026-01-01T00:00:00Z'}}}}));
else if (a[0]==='pr' && a[1]==='list') console.log('[]'); else process.exit(1);`);
  const r = f.call(['finish', task.id, '--force'], { CREW_GH: fakeGh }); assert.equal(r.code, 0, r.out);
  assert.ok(git('-C', f.repo, 'branch', '--list', task.branch).trim(), 'a foreign merged PR with the same commit cannot authorize deleting this project branch');
  const calls = JSON.parse(fs.readFileSync(log)); assert.equal(calls.length, 1);
  assert.deepEqual(calls[0].slice(0,2), ['pr','list'], 'foreign/unsupported identities retain the existing project-context proof');
};

gapTests['recorded-rest-discovery'] = () => {
  const f = prDiscoveryFixture('recorded-rest'), wire = discoveryPr();
  const captured = githubFixture('pull-list-open.json')[0];
  assert.deepEqual(Object.keys(wire).sort(), Object.keys(captured).sort(), 'all recorded list fields are retained');
  assert.deepEqual(Object.keys(wire.head.repo).sort(), Object.keys(captured.head.repo).sort());
  assert.ok(wire._links && wire.head.repo.owner);
  assert.equal(wire.url, 'https://api.github.com/repos/acme/demo/pulls/12');
  assert.equal(wire.html_url, 'https://github.com/acme/demo/pull/12');
  assert.equal(prObservation(wire).url, wire.html_url, 'REST API url must not shadow the web URL');
  const observations = [];
  const runner = discoveryRunner(f, { prs: [wire] });
  const found = discoverTaskPrs([f.task], f.projects, { ...runner, observe: (task, facts) => observations.push(facts) });
  assert.deepEqual(found, [{ status: 'known', url: wire.html_url, source: 'github', reason: null }]);
  assert.equal(observations[0]?.url, wire.html_url); assert.equal(observations[0]?.state, 'OPEN');
  f.set({ response: [wire] });
  const record = () => JSON.parse(fs.readFileSync(path.join(f.home, 'tasks', 'draft', 'task.json')));
  for (const state of ['working', 'closed']) {
    f.save({ ...f.task, state });
    let r = f.call(['status', '--json', '--view', 'fleet', '--discover-prs']); assert.equal(r.code, 0, r.out);
    const task = JSON.parse(r.out).tasks.find(t => t.id === 'draft');
    assert.equal(task?.prDiscovery.status, 'known', `real REST shape must discover the ${state} unrecorded PR`);
    assert.equal(task.prDiscovery.url, wire.html_url); assert.equal(record().prFacts.state, 'OPEN');
    assert.equal(record().pr, undefined, 'discovery does not land the task');
  }
  f.save(f.task);
  let r = f.call(['status', '--json', '--discover-prs']); assert.equal(r.code, 0, r.out);
  assert.equal(record().prFacts.url, wire.html_url, 'legacy discovery also saves real REST observations');
  const merged = recordedRestPr(12, 'feature/draft', 'pull-get-merged.json');
  merged.merged_at = merged.closed_at = new Date(Date.now() - 25 * 3600000).toISOString();
  f.save({ ...f.task, state: 'closed' }); f.set({ response: [merged] });
  r = f.call(['status', '--json', '--view', 'fleet', '--discover-prs']); assert.equal(r.code, 0, r.out);
  assert.equal(JSON.parse(r.out).tasks.length, 0); assert.equal(record().prFacts.state, 'MERGED');
  assert.equal(record().prFacts.mergedAt, merged.merged_at);
  // Search envelopes and actual REST failures are not PR-list responses and may
  // never turn into a fake success, terminal fact or confirmed absence.
  const search = discoveryRunner(f, { prs: githubFixture('pull-search.json') });
  assert.equal(discoverTaskPrs([f.task], f.projects, search)[0].reason, 'invalid-response');
  for (const name of ['rest-not-found.json', 'rest-permission.json', 'rest-authentication.json']) {
    const base = discoveryRunner(f), seen = [];
    const result = discoverTaskPrs([f.task], f.projects, { execute: (command, args, options) => args.includes('api')
      ? { code: 1, stdout: JSON.stringify(githubFixture(name)), stderr: githubFixture(`${name}.meta`).stderr }
      : base.execute(command, args, options), observe: (task, facts) => seen.push(facts) });
    assert.equal(result[0].status, 'unavailable'); assert.equal(seen.length, 0);
  }
};

gapTests['pr-discovery'] = () => {
  const f = prDiscoveryFixture('contract'), discover = (tasks, options) => discoverTaskPrs(tasks, f.projects, options);
  const known = { status: 'known', url: 'https://github.com/acme/demo/pull/12', source: 'github', reason: null };
  const none = { status: 'none', url: null, source: null, reason: null };
  assert.equal(canonicalPrUrl('http://GITHUB.COM/acme/demo/pull/12/?q=x#fragment'), known.url);
  for (const value of ['https://evil.invalid/acme/demo/pull/12', 'https://github.com/acme/demo/pull/0', 'https://github.com/acme/demo/pull/12/else', 'https://github.com/acme/demo/pull/12\n', 'https://user@github.com/acme/demo/pull/12', 'https://github.com/acme/../pull/12', null]) assert.equal(canonicalPrUrl(value), null, value);
  const never = { execute: () => assert.fail('recorded/non-ship cases must not run subprocesses') };
  assert.deepEqual(discover([{ ...f.task, pr: 'http://github.com/acme/demo/pull/12/#x' }], never), [{ ...known, source: 'recorded' }]);
  assert.equal(discover([{ ...f.task, pr: 'invalid' }], never)[0].reason, 'invalid-recorded-pr');
  assert.deepEqual(discover([{ ...f.task, kind: 'scout' }], never), [none]);
  assert.equal(discover([{ ...f.task, branch: null }], never)[0].reason, 'missing-identity');
  assert.equal(discover([{ ...f.task, worktree: path.join(f.dir, 'missing') }], never)[0].reason, 'worktree-unavailable');

  for (const fields of [{}, { workflow: 'delivery' }, { gate: 'no-mistakes', workflow: 'delivery' }]) {
    const runner = discoveryRunner(f);
    assert.deepEqual(discover([{ ...f.task, ...fields }], runner), [known]);
    const api = runner.calls.find(c => c.args.includes('api')).args;
    assert.ok(api.includes('repos/acme/demo/pulls')); assert.ok(api.includes('head=acme:feature/draft')); assert.ok(api.includes('state=all')); assert.ok(api.includes('per_page=2'));
    assert.deepEqual(runner.calls.find(c => c.args.includes('repo')).args, ['repo', 'view', 'https://github.com/acme/demo', '--json', 'nameWithOwner,url']);
    assert.ok(runner.calls.every(c => !['fetch', 'ls-remote', 'push', 'auth'].some(a => c.args.includes(a))));
  }
  assert.deepEqual(discover([f.task], discoveryRunner(f, { origin: 'git@github-alias:acme/demo.git' })), [known]);
  assert.deepEqual(discover([f.task], discoveryRunner(f, { origin: 'ssh://git@github.com/acme/demo.git' })), [known]);
  for (const origin of ['https://gitlab.com/acme/demo.git', path.join(f.dir, 'github.com', 'repo.git'), 'file:///github.com/acme/demo', 'git@-proxy:acme/demo']) {
    const runner = discoveryRunner(f, { origin });
    assert.equal(discover([f.task], runner)[0].reason, 'unsupported-remote');
    assert.ok(runner.calls.every(c => c.command === 'git'));
  }
  const changedOrigin = discoveryRunner(f);
  assert.equal(discover([f.task], { execute: (command, args, options) => {
    const result = changedOrigin.execute(command, args, options);
    if (args.includes('get-url') && args[1] === f.repo) result.stdout = 'https://github.com/acme/other.git';
    return result;
  } })[0].reason, 'repository-mismatch');
  assert.ok(changedOrigin.calls.every(c => c.command === 'git'));
  const unknownAlias = discoveryRunner(f, { origin: 'git@github-alias:acme/demo.git' });
  assert.equal(discover([f.task], { execute: (command, args, options) => {
    const result = unknownAlias.execute(command, args, options);
    if (command === 'ssh') result.stdout = 'hostname gitlab.com';
    return result;
  } })[0].reason, 'unsupported-remote');
  assert.deepEqual(discover([f.task], discoveryRunner(f, { prs: [] })), [none]);
  assert.equal(discover([f.task], discoveryRunner(f, { prs: [discoveryPr(), discoveryPr(undefined, 13)] }))[0].reason, 'ambiguous-pr');
  for (const prs of [{}, [null], [discoveryPr('feature/some-other-task')], [{ ...discoveryPr(), head: { ref: 'feature/draft', repo: { full_name: 'fork/demo' } } }],
    [{ ...discoveryPr(), base: { repo: { full_name: 'acme/other' } } }], [{ ...discoveryPr(), html_url: 'https://github.com/acme/other/pull/12' }],
    [{ ...discoveryPr(), number: '12' }]]) assert.equal(discover([f.task], discoveryRunner(f, { prs }))[0].reason, 'invalid-response');
  assert.equal(discover([f.task], discoveryRunner(f, { repo: { nameWithOwner: 'acme/demo', url: 'https://evil.invalid/acme/demo' } }))[0].reason, 'invalid-response');
  const cached = discoveryRunner(f);
  assert.deepEqual(discover([f.task, f.task], cached), [known, known]);
  assert.equal(cached.calls.filter(c => c.args.includes('repo')).length, 1, 'canonical repo is resolved once per invocation');
  assert.equal(cached.calls.filter(c => c.args.includes('api')).length, 2, 'each task is queried by its own head');

  // Exercise real local Git and a fake GitHub CLI via the public status command.
  let result = f.call(['status', '--json', '--discover-prs']); assert.equal(result.code, 0, result.out);
  let status = JSON.parse(result.out); assert.deepEqual(status.prDiscovery, { version: 1 });
  assert.deepEqual(status.tasks[0].prDiscovery, known); assert.equal(status.tasks[0].pr, null);
  assert.equal(f.call(['status', '--discover-prs']).code, 2);
  const absentGh = crew(['status', '--json', '--discover-prs'], { cwd: f.home, env: { CREW_GH: path.join(f.dir, 'missing-gh.mjs') } });
  assert.equal(absentGh.code, 0, absentGh.out); assert.equal(JSON.parse(absentGh.out).tasks[0].prDiscovery.reason, 'github-unavailable');
  for (const [control, reason] of [[{ fail: true }, 'github-unavailable'], [{ malformed: true }, 'invalid-response'], [{ oversized: true }, 'invalid-response'], [{ response: [discoveryPr(), discoveryPr(undefined, 13)] }, 'ambiguous-pr']]) {
    f.set(control); result = f.call(['status', '--json', '--discover-prs']); assert.equal(result.code, 0, result.out);
    assert.equal(JSON.parse(result.out).tasks[0].prDiscovery.reason, reason);
  }
  f.set({ response: [] }); assert.deepEqual(JSON.parse(f.call(['status', '--json', '--discover-prs']).out).tasks[0].prDiscovery, none); f.set({});
  git('-C', f.copy, 'checkout', '-q', '--detach');
  assert.equal(JSON.parse(f.call(['status', '--json', '--discover-prs']).out).tasks[0].prDiscovery.reason, 'branch-mismatch');
  git('-C', f.copy, 'checkout', '-q', '-b', 'feature/another-task');
  assert.equal(JSON.parse(f.call(['status', '--json', '--discover-prs']).out).tasks[0].prDiscovery.reason, 'branch-mismatch');
  git('-C', f.copy, 'checkout', '-q', 'feature/draft');
  f.save({ ...f.task, worktree: f.repo });
  assert.equal(JSON.parse(f.call(['status', '--json', '--discover-prs']).out).tasks[0].prDiscovery.reason, 'branch-mismatch');
  f.save({ ...f.task, worktree: path.join(f.copy, 'sub') }); fs.mkdirSync(path.join(f.copy, 'sub'));
  assert.equal(JSON.parse(f.call(['status', '--json', '--discover-prs']).out).tasks[0].prDiscovery.reason, 'repository-mismatch'); f.save(f.task);
  const foreign = path.join(f.dir, 'foreign'); fs.mkdirSync(foreign); git('-C', foreign, 'init', '-q', '-b', 'feature/draft'); commit(foreign, { 'file': 'foreign' }, 'foreign');
  f.save({ ...f.task, worktree: foreign });
  assert.equal(JSON.parse(f.call(['status', '--json', '--discover-prs']).out).tasks[0].prDiscovery.reason, 'repository-mismatch'); f.save(f.task);
  git('-C', f.repo, 'remote', 'remove', 'origin');
  assert.equal(JSON.parse(f.call(['status', '--json', '--discover-prs']).out).tasks[0].prDiscovery.reason, 'unsupported-remote');
};

gapTests['pr-discovery-compatibility'] = () => {
  const f = prDiscoveryFixture('compatibility');
  const owner = 'discovery-owner', reader = 'discovery-reader';
  const w = readWorld(); w.terminals[owner] = { address: owner, state: 'live', labels: {} }; fs.writeFileSync(world, JSON.stringify(w));
  fs.writeFileSync(path.join(f.home, 'owner.json'), JSON.stringify({ terminal: owner }));
  // No elapsed clock noise in exact legacy text/shape assertions.
  f.save({ ...f.task, created: 'invalid' });
  f.save({ ...f.task, id: 'closed', state: 'closed', created: 'invalid', pr: 'https://github.com/acme/demo/pull/13', worktree: path.join(f.dir, 'gone') });
  f.save({ ...f.task, id: 'scout', kind: 'scout', created: 'invalid', worktree: path.join(f.dir, 'gone') });
  const guard = path.join(f.dir, 'guarded-status.mjs');
  fs.writeFileSync(guard, `import cp from 'node:child_process'; import {syncBuiltinESMExports} from 'node:module';
const spawn = cp.spawnSync;
cp.spawnSync = (command,args,options) => {
 if (command !== process.execPath || args[0] !== ${JSON.stringify(fake)}) throw Error('legacy status attempted a non-Core subprocess');
 return spawn(command,args,options);
}; syncBuiltinESMExports();
const {main} = await import(${JSON.stringify(new URL('./crew.mjs', import.meta.url).href)}); main(process.argv.slice(2));`);
  const legacy = args => crew(args, { cwd: f.home, terminal: reader, script: guard, env: { CREW_GH: f.fakeGh } });
  let r = legacy(['status']); assert.equal(r.code, 0, r.out);
  assert.equal(r.out.trim(), `home ${slash(f.home)} - owner ${owner} (live, you are read-only)\ndraft\tworking\tship/pi\tdemo\t-\t-\nscout\tworking\tscout/pi\tdemo\t-\t-`);
  r = legacy(['status', '--json']); assert.equal(r.code, 0, r.out);
  const original = JSON.parse(r.out);
  assert.deepEqual(Object.keys(original), ['home', 'owner', 'tasks', 'copiesToReturn']);
  assert.deepEqual(original.owner, { terminal: owner, live: true, mine: false });
  assert.deepEqual(original.tasks.map(t => t.id), ['draft', 'scout']);
  assert.deepEqual(Object.keys(original.tasks[0]), ['id', 'state', 'kind', 'agent', 'launch', 'standby', 'standbyStatus', 'fallbacks', 'project', 'terminal',
    'core', 'nudges', 'continuations', 'recovery', 'report', 'pr', 'error', 'elapsedSeconds', 'deliveryKind']);
  assert.equal(original.tasks[0].pr, null);
  r = legacy(['status', '--all', '--json']); assert.equal(r.code, 0, r.out);
  assert.deepEqual(JSON.parse(r.out).tasks.map(t => t.id), ['closed', 'draft', 'scout']);
  assert.deepEqual(JSON.parse(fs.readFileSync(f.log, 'utf8')), [], 'all ordinary status forms make zero Git/GitHub reads here');
  const variants = [['status'], ['status', '--all'], ['status', '--json'], ['status', '--all', '--json']];
  const beforeFacts = variants.map(a => legacy(a).out);
  r = f.call(['status', '--all', '--json', '--discover-prs'], reader); assert.equal(r.code, 0, r.out);
  const enhancedBytes = r.out;
  const enhanced = JSON.parse(r.out); assert.deepEqual(enhanced.owner, original.owner);
  assert.deepEqual(enhanced.tasks.map(t => t.id), ['closed', 'draft', 'scout']);
  assert.equal(enhanced.tasks[0].prDiscovery.source, 'recorded', 'recorded closed task needs no surviving copy');
  assert.equal(enhanced.tasks[1].prDiscovery.source, 'github'); assert.equal(enhanced.tasks[2].prDiscovery.status, 'none');
  assert.equal(JSON.parse(fs.readFileSync(f.log, 'utf8')).length, 2, 'only the unrecorded ship has repo/head requests');
  assert.deepEqual(variants.map(a => legacy(a).out), beforeFacts, 'all legacy forms remain byte-identical after observation caching');
  assert.equal(f.call(['status', '--all', '--json', '--discover-prs'], reader).out, enhancedBytes, 'discovery output remains byte-identical too');
};

// Snapshot all authority/prose/Git bytes. Only the separate PR observation is
// allowed to change, and JSON formatting is not authority.
function discoveryState(f) {
  const tree = folder => fs.readdirSync(folder).sort().flatMap(name => {
    const file = path.join(folder, name);
    if (fs.statSync(file).isDirectory()) return tree(file);
    if (name === 'task.json') { const { prFacts, ...authority } = JSON.parse(fs.readFileSync(file, 'utf8')); return [[file, JSON.stringify(authority)]]; }
    return [[file, fs.readFileSync(file).toString('base64')]];
  });
  return [tree(f.home), tree(path.join(f.repo, '.git')), tree(f.copy)];
}
gapTests['pr-discovery-lifecycle'] = () => {
  const f = prDiscoveryFixture('lifecycle'), owner = 'pr-owner', worker = 'pr-worker', reader = 'pr-reader';
  const w = readWorld();
  for (const address of [owner, worker]) w.terminals[address] = { address, state: 'live', labels: {}, status: { app: 'pi', state: 'working' } };
  fs.writeFileSync(world, JSON.stringify(w));
  fs.writeFileSync(path.join(f.home, 'owner.json'), JSON.stringify({ terminal: owner }));
  f.save({ ...f.task, terminal: worker });
  const before = discoveryState(f);
  for (const control of [{}, { fail: true }, { response: [] }, { malformed: true }]) {
    f.set(control); const r = f.call(['status', '--json', '--discover-prs'], reader); assert.equal(r.code, 0, r.out);
    const status = JSON.parse(r.out); assert.equal(status.owner.mine, false); assert.equal(status.owner.live, true);
    assert.equal(status.tasks[0].pr, null); assert.deepEqual(discoveryState(f), before, 'status cannot alter home, reports, ownership or Git state');
  }
  f.set({});
  let r = f.call(['land', 'draft'], owner); assert.equal(r.code, 2, r.out); assert.match(r.out, /only after its worker reported/);
  r = f.call(['done', 'draft'], worker); assert.equal(r.code, 2, r.out); assert.match(r.out, /Write your result/);
  fs.writeFileSync(f.task.report, 'Complete. A conversation mention is not this task PR: https://github.com/acme/other/pull/99\n');
  const mentioned = f.call(['status', '--json', '--discover-prs'], reader);
  assert.equal(JSON.parse(mentioned.out).tasks[0].prDiscovery.url, 'https://github.com/acme/demo/pull/12', 'reports cannot retarget discovery');
  r = f.call(['done', 'draft'], worker); assert.equal(r.code, 0, r.out);
  let task = JSON.parse(fs.readFileSync(path.join(f.home, 'tasks', 'draft', 'task.json'), 'utf8'));
  assert.equal(task.state, 'reported'); assert.equal(task.pr, undefined, 'discovery never feeds plain done a PR');
  fs.writeFileSync(path.join(f.copy, 'untracked'), 'keep');
  r = f.call(['land', 'draft'], owner); assert.equal(r.code, 6, r.out); assert.match(r.out, /uncommitted files/);
  fs.rmSync(path.join(f.copy, 'untracked'));
  f.save({ ...task, workflow: 'delivery' });
  fs.writeFileSync(f.task.report, 'Plan: https://github.com/acme/demo/pull/12\n');
  r = f.call(['done', 'draft'], worker); assert.equal(r.code, 0, r.out);
  task = JSON.parse(fs.readFileSync(path.join(f.home, 'tasks', 'draft', 'task.json'), 'utf8'));
  assert.equal(task.stage, 'plan'); assert.equal(task.pr, 'https://github.com/acme/demo/pull/12');
  const reads = fs.readFileSync(f.log, 'utf8');
  r = f.call(['status', '--json', '--discover-prs'], reader); assert.equal(r.code, 0, r.out);
  assert.equal(JSON.parse(r.out).tasks[0].prDiscovery.source, 'recorded');
  assert.equal(fs.readFileSync(f.log, 'utf8'), reads, 'recorded plans have no GitHub lookup');
  r = f.call(['land', 'draft'], owner); assert.equal(r.code, 6, r.out); assert.match(r.out, /plan awaiting approval/);
  fs.writeFileSync(f.task.report, 'Implementation: https://github.com/acme/demo/pull/12\n');
  r = f.call(['done', 'draft'], worker); assert.equal(r.code, 0, r.out);
  fs.writeFileSync(path.join(f.copy, 'untracked'), 'keep');
  r = f.call(['land', 'draft'], owner); assert.equal(r.code, 6, r.out); assert.match(r.out, /uncommitted files/);
  assert.equal(fs.readFileSync(f.log, 'utf8'), reads, 'delivery refusals do not open or discover a PR');
};

gapTests['pr-discovery-bounds'] = () => {
  const f = prDiscoveryFixture('bounds');
  let time = 0;
  const runner = discoveryRunner(f, { before: () => { time += 2100; } });
  const tasks = [f.task, f.task, { ...f.task, pr: 'https://github.com/acme/demo/pull/12' }, { ...f.task, kind: 'scout' }];
  const results = discoverTaskPrs(tasks, f.projects, { ...runner, clock: () => time });
  assert.equal(results[0].reason, 'budget-exhausted'); assert.equal(results[1].reason, 'budget-exhausted');
  assert.equal(results[2].source, 'recorded'); assert.equal(results[3].status, 'none');
  assert.equal(runner.calls.length, 5, 'deadline prevents all subsequent subprocesses');
  assert.equal(runner.calls.at(-1).options.timeout, 1600, 'last timeout is clamped to remaining budget');
  for (const [error, reason] of [[{ code: 'ETIMEDOUT' }, 'timeout'], [{ code: 'ENOBUFS' }, 'invalid-response'], [{ code: 'ENOENT' }, 'worktree-unavailable']]) {
    let calls = 0;
    const got = discoverTaskPrs([f.task], f.projects, { execute: () => { calls++; return { code: null, stdout: '', stderr: '', error }; } });
    assert.equal(got[0].reason, reason); assert.equal(calls, 1, 'failure is never retried');
  }
  const oversized = discoverTaskPrs([f.task], f.projects, { execute: () => ({ code: 0, stdout: 'x'.repeat(1048577), stderr: '' }) });
  assert.equal(oversized[0].reason, 'invalid-response');
  f.set({ sleep: true }); const started = performance.now();
  const r = f.call(['status', '--json', '--discover-prs']); assert.equal(r.code, 0, r.out);
  assert.equal(JSON.parse(r.out).tasks[0].prDiscovery.reason, 'timeout');
  assert.ok(performance.now() - started < 8000, 'a hanging fake CLI is killed, not retried');
  assert.equal(JSON.parse(fs.readFileSync(f.log, 'utf8')).length, 1);
};

gapTests['fleet-not-found'] = () => {
  const f = prDiscoveryFixture('not-found'), args = ['status', '--json', '--view', 'fleet', '--discover-prs'];
  fs.rmSync(path.join(f.home, 'tasks', 'draft'), { recursive: true });
  const repository = { nameWithOwner: 'timurproko/crew', pullRequests: { totalCount: 11 }, pullRequest: null };
  const missing = githubFixture('graphql-not-found.json');
  const ids = ['crew-gaps-and-docs', 'wait-recovers-errors', 'layout-and-selfrepair'];
  ids.forEach((id, i) => f.save({ ...f.task, id, state: 'closed', pr: `https://github.com/timurproko/crew/pull/${36 + i}`, worktree: 'returned' }));
  f.save({ ...f.task, id: 'live', pr: 'https://github.com/timurproko/crew/pull/999' });
  f.set({ verification: missing, verificationCode: 1 });
  let r = f.call(args); assert.equal(r.code, 0, r.out);
  assert.deepEqual(JSON.parse(r.out).tasks.map(t => t.id), ['live']);
  for (const [i, id] of ids.entries()) {
    const record = JSON.parse(fs.readFileSync(path.join(f.home, 'tasks', id, 'task.json')));
    assert.equal(record.prFacts.state, 'NOT_FOUND'); assert.equal(record.pr, `https://github.com/timurproko/crew/pull/${36 + i}`);
    assert.equal(record.prFacts.mergedAt, null); assert.equal(record.prFacts.closedAt, null);
  }
  const calls = () => JSON.parse(fs.readFileSync(f.log));
  assert.equal(calls().length, 3, 'one proof request per missing closed PR; never verify the live task');
  for (const a of [args, args.filter(a => a !== '--discover-prs')]) {
    r = f.call(a); assert.equal(r.code, 0, r.out); assert.deepEqual(JSON.parse(r.out).tasks.map(t => t.id), ['live']);
  }
  r = f.call(['status', '--all', '--json', '--discover-prs']); assert.equal(r.code, 0, r.out);
  assert.equal(JSON.parse(r.out).tasks.length, 4, 'legacy all still exposes original recorded URLs');
  assert.equal(calls().length, 3, 'terminal facts and legacy/offline status add no requests');
  const url = 'https://github.com/timurproko/crew/pull/36';
  f.save({ ...f.task, id: 'uncertain', state: 'closed', pr: url });
  for (const payload of [githubFixture('rest-not-found.json'), githubFixture('rest-permission.json'), githubFixture('rest-authentication.json'), githubFixture('graphql-unreadable.json'),
    { data: { repository: { ...repository, pullRequests: null } } },
    { data: { repository }, errors: [{ type: 'FORBIDDEN', path: ['repository', 'pullRequest'] }] },
    { data: { repository }, errors: [{ type: 'RATE_LIMITED', path: ['repository'] }] },
    { data: { repository: { ...repository, nameWithOwner: 'other/repo' } } }]) {
    assert.equal(verifiedPrRead(payload, url), null, 'ambiguous absence cannot supply a terminal fact');
    f.set({ verification: payload, verificationCode: 1 });
    r = f.call(args); assert.equal(r.code, 0, r.out);
    assert.ok(JSON.parse(r.out).tasks.some(t => t.id === 'uncertain'));
    assert.equal(JSON.parse(fs.readFileSync(path.join(f.home, 'tasks', 'uncertain', 'task.json'))).prFacts, undefined);
  }
  for (const control of [{ fail: true }, { malformed: true }]) {
    f.set(control); r = f.call(args); assert.equal(r.code, 0, r.out);
    assert.ok(JSON.parse(r.out).tasks.some(t => t.id === 'uncertain'));
  }
  const opened = githubFixture('graphql-open.json'); opened.data.repository.pullRequest.url = url;
  f.set({ verification: opened });
  const script = path.join(f.dir, 'clock.mjs'), clock = Date.now();
  fs.writeFileSync(script, `import cp from 'node:child_process'; import {syncBuiltinESMExports} from 'node:module';
let time = Number(process.env.TEST_STATUS_TIME); Date.now = () => time;
const execute = cp.spawnSync; cp.spawnSync = (command,args,options) => { const result = execute(command,args,options); if (args.includes('graphql')) time += Number(process.env.TEST_REQUEST_ADVANCE ?? 0); return result; }; syncBuiltinESMExports();
const {main} = await import(${JSON.stringify(pathToFileURL(path.join(here, 'crew.mjs')).href)}); main(process.argv.slice(2));`);
  const at = time => crew(args, { cwd: f.home, script, env: { CREW_GH: f.fakeGh, TEST_STATUS_TIME: String(time) } });
  const held = path.join(f.home, 'tasks', 'uncertain', 'task.json.lifecycle.lock'); fs.writeFileSync(held, 'lifecycle owns priority');
  let before = calls().length; assert.equal(at(clock).code, 0); assert.equal(calls().length, before + 1);
  assert.equal(JSON.parse(fs.readFileSync(path.join(f.home, 'tasks', 'uncertain', 'task.json'))).prFacts, undefined, 'verification yields its fact save to lifecycle work');
  fs.rmSync(held);
  assert.equal(at(clock + 599999).code, 0); assert.equal(calls().length, before + 1, 'open facts suppress checks for ten minutes');
  assert.equal(at(clock + 600000).code, 0); assert.equal(calls().length, before + 2);
  assert.equal(JSON.parse(fs.readFileSync(path.join(f.home, 'tasks', 'uncertain', 'task.json'))).prFacts.state, 'OPEN');
  f.set({ fail: true });
  assert.equal(at(clock + 1200000).code, 0); assert.equal(calls().length, before + 3);
  assert.equal(at(clock + 1200001).code, 0); assert.equal(calls().length, before + 3, 'failed open refreshes also obey the ten-minute attempt interval');
  f.save({ ...f.task, id: 'uncertain', state: 'closed', pr: url });
  fs.rmSync(path.join(f.home, 'state', 'status-fleet-pr-cursor.json')); f.set({ verification: opened });
  const base = clock + 2000000; before = calls().length;
  r = crew(args, { cwd: f.home, script, env: { CREW_GH: f.fakeGh, TEST_STATUS_TIME: String(base), TEST_REQUEST_ADVANCE: '5000' } });
  assert.equal(r.code, 0, r.out);
  assert.equal(Date.parse(JSON.parse(fs.readFileSync(path.join(f.home, 'tasks', 'uncertain', 'task.json'))).prFacts.observedAt), base + 5000, 'cooldown starts at the completed proof, not the earlier poll snapshot');
  assert.equal(at(base + 600000).code, 0); assert.equal(calls().length, before + 1, 'request duration cannot shorten the minimum refresh interval');
  assert.equal(at(base + 605000).code, 0); assert.equal(calls().length, before + 2);
};

gapTests['fleet-verification-bounds'] = () => {
  const f = prDiscoveryFixture('verification-bounds');
  fs.rmSync(path.join(f.home, 'tasks', 'draft'), { recursive: true });
  for (let n = 1; n <= 7; n++) f.save({ ...f.task, id: `old-${n}`, state: 'closed', pr: `https://github.com/acme/demo/pull/${n}` });
  f.set({ verification: { data: { repository: null } }, verificationCode: 1 });
  const args = ['status', '--json', '--view', 'fleet', '--discover-prs'];
  let r = f.call(args); assert.equal(r.code, 0, r.out); assert.equal(JSON.parse(r.out).tasks.length, 7);
  let calls = JSON.parse(fs.readFileSync(f.log)); assert.equal(calls.length, 5);
  r = f.call(args); assert.equal(r.code, 0, r.out); calls = JSON.parse(fs.readFileSync(f.log)); assert.equal(calls.length, 10);
  assert.equal(new Set(calls.map(a => a.find(v => v.startsWith('number=')))).size, 7, 'failed verifications rotate rather than starving later rows');
  assert.ok(calls.every(a => a.includes('graphql') && a.some(v => v.startsWith('query=') && v.includes('pullRequests(first:1){totalCount}'))), 'repository/PR-read proof shares the same request');
  const recorded = Array.from({ length: 12 }, (_, i) => ({ ...f.task, state: 'closed', pr: `https://github.com/acme/demo/pull/${i + 1}` }));
  let time = 0;
  const runner = discoveryRunner(f, { before: () => { time += 2100; } });
  discoverTaskPrs([f.task, ...recorded], f.projects, { ...runner, clock: () => time, verifyRecorded: () => true });
  assert.equal(runner.calls.length, 5, 'existing discovery exhausts the one shared deadline; verification cannot extend it');
  assert.equal(runner.calls.filter(c => c.args.includes('api')).length, 0);
  const fast = discoveryRunner(f); discoverTaskPrs(recorded, f.projects, { ...fast, verifyRecorded: () => true });
  assert.equal(fast.calls.length, 5, 'independent hard cap applies even when all requests return immediately');
  discoverTaskPrs([{ ...recorded[0], state: 'working' }], f.projects, { verifyRecorded: () => true, execute: () => assert.fail('live recorded PRs never add verification requests') });
};

gapTests['fleet-view'] = () => {
  const f = prDiscoveryFixture('fleet-view'), args = ['status', '--json', '--view', 'fleet'];
  const help = f.call(['--help']); assert.equal(help.code, 0, help.out);
  assert.ok(help.out.includes('--view fleet'), 'Herdr capability probe requires this literal help text');
  const clock = Date.parse('2026-06-01T12:00:00Z'), url = 'https://github.com/acme/demo/pull/12';
  const ago = hours => new Date(clock - hours * 3600000).toISOString();
  const task = (id, state, prState, hours, extra = {}) => ({ ...f.task, id, state, pr: url, created: '2020-01-01T00:00:00Z',
    prFacts: prObservation({ state: prState, mergedAt: ago(hours), closedAt: ago(hours) }, url), ...extra });
  const samples = [task('old-open', 'closed', 'OPEN', 9000), task('merged-25', 'closed', 'MERGED', 25),
    task('merged-23', 'closed', 'MERGED', 23), task('merged-24', 'closed', 'MERGED', 24),
    task('closed-25', 'closed', 'CLOSED', 25), task('closed-23', 'closed', 'CLOSED', 23), task('closed-24', 'closed', 'CLOSED', 24),
    task('unknown', 'closed', null, 9000), task('invalid-time', 'closed', 'MERGED', 25, { prFacts: { version: 1, url, state: 'MERGED', mergedAt: 'bad' } }),
    task('missing-time', 'closed', 'CLOSED', 25, { prFacts: { version: 1, url, state: 'CLOSED' } }),
    task('future', 'closed', 'MERGED', -25), task('different-pr', 'closed', 'MERGED', 25, { pr: 'https://github.com/acme/demo/pull/13' }),
    task('saved-only', 'closed', 'OPEN', 9000, { pr: null, worktree: path.join(f.dir, 'returned') }),
    task('no-pr', 'closed', null, 25, { pr: null, prFacts: null, kind: 'scout' }),
    task('review-no-pr', 'closed', null, 25, { pr: null, prFacts: null, kind: 'scout', reviews: 'draft' }),
    ...['preparing', 'working', 'reported', 'stopped', 'failed'].map(state => task(`live-${state}`, state, 'MERGED', 9000))];
  const omitted = ['merged-25', 'closed-25', 'no-pr', 'review-no-pr'];
  for (const sample of samples) {
    assert.equal(fleetTaskVisible(sample, clock), !omitted.includes(sample.id), sample.id); f.save(sample);
  }
  const script = path.join(f.dir, 'fleet-clock.mjs');
  fs.writeFileSync(script, `Date.now = () => ${clock}; const {main} = await import(${JSON.stringify(pathToFileURL(path.join(here, 'crew.mjs')).href)}); main(process.argv.slice(2));`);
  const call = a => crew(a, { cwd: f.home, script, env: { CREW_GH: f.fakeGh } });
  let r = call(args); assert.equal(r.code, 0, r.out); const fleet = JSON.parse(r.out);
  assert.deepEqual(Object.keys(fleet), ['home', 'owner', 'tasks', 'prDiscovery', 'view']);
  assert.deepEqual(fleet.view, { name: 'fleet', version: 1 }); assert.deepEqual(fleet.prDiscovery, { version: 1 }); assert.equal(fleet.owner, null);
  for (const t of fleet.tasks) {
    assert.deepEqual(Object.keys(t), ['id', 'state', 'terminal', 'pr', 'prDiscovery']);
    assert.deepEqual(Object.keys(t.prDiscovery), ['status', 'url', 'source', 'reason']);
    assert.ok(!omitted.includes(t.id));
  }
  assert.equal(fleet.tasks.length, samples.length - omitted.length + 1);
  assert.equal(fleet.tasks.find(t => t.id === 'draft').prDiscovery.reason, 'not-requested');
  assert.equal(fleet.tasks.find(t => t.id === 'saved-only').pr, null);
  assert.equal(fleet.tasks.find(t => t.id === 'saved-only').prDiscovery.url, url);
  assert.equal(call([...args, '--all']).out, r.out, '--all cannot undo fleet bounds');
  assert.deepEqual(JSON.parse(fs.readFileSync(f.log)), [], 'offline fleet performs no GitHub reads');
  r = call([...args, '--discover-prs']); assert.equal(r.code, 0, r.out);
  const discovered = JSON.parse(r.out); assert.deepEqual(discovered.view, fleet.view);
  assert.deepEqual(discovered.tasks.find(t => t.id === 'draft').prDiscovery,
    { status: 'known', url, source: 'github', reason: null }, 'Herdr consumes the unchanged complete discovery v1 shape');
  assert.equal(discovered.tasks.find(t => t.id === 'saved-only').prDiscovery.url, url, 'copy return cannot hide a saved PR');
  const file = path.join(f.home, 'tasks', 'draft', 'task.json');
  assert.equal(JSON.parse(fs.readFileSync(file)).prFacts.url, url, 'discovery saves facts without setting authoritative pr');
  f.save({ ...f.task, state: 'closed' });
  f.set({ response: [{ ...discoveryPr(), state: 'closed', merged_at: ago(25), closed_at: ago(25) }] });
  r = call([...args, '--discover-prs']); assert.equal(r.code, 0, r.out);
  assert.ok(!JSON.parse(r.out).tasks.some(t => t.id === 'draft'), 'newly discovered old merge is filtered on the same call');
  assert.equal(JSON.parse(fs.readFileSync(file)).prFacts.state, 'MERGED');
  assert.ok(!JSON.parse(call(args).out).tasks.some(t => t.id === 'draft'), 'learned expiry works offline');
  assert.ok(!JSON.parse(call([...args, '--discover-prs']).out).tasks.some(t => t.id === 'draft'));
  for (const a of [['status', '--json', '--view', 'unknown'], ['status', '--view=newer', '--discover-prs']]) {
    r = call(a); assert.equal(r.code, 2); assert.match(r.out, /unsupported-status-view: (unknown|newer)/);
  }
  for (const a of [['status', '--view'], ['status', '--view', '--json'], ['status', '--view=fleet'], ['status', '--json', '--view=']]) {
    r = call(a); assert.equal(r.code, 2); assert.match(r.out, /Usage:/);
  }
  r = call(['status', '--all', '--json']); assert.equal(r.code, 0, r.out);
  assert.equal(JSON.parse(r.out).tasks.length, samples.length + 1, 'legacy --all still includes every historical task');
};

gapTests['fleet-scale'] = () => {
  const f = prDiscoveryFixture('fleet-scale'), owner = 'fleet-owner', reader = 'fleet-reader';
  const w = readWorld(); w.terminals[owner] = { address: owner, state: 'live' }; fs.writeFileSync(world, JSON.stringify(w));
  fs.writeFileSync(path.join(f.home, 'owner.json'), JSON.stringify({ terminal: owner }));
  // Historical states deliberately carry large unused launch/recovery data. Prose
  // and copy paths are forbidden even for stats; only state files may be inspected.
  const heavy = { launch: { label: 'x'.repeat(500) }, nudges: Array(10).fill({ text: 'n'.repeat(100) }) };
  const fill = (start, end) => { for (let i = start; i < end; i++) f.save({ ...f.task, ...heavy, id: `closed-${String(i).padStart(5, '0')}`, state: 'closed', kind: 'scout' }); };
  fill(0, 1000);
  const guard = path.join(f.dir, 'guard.mjs'), metrics = path.join(f.dir, 'metrics.json');
  fs.writeFileSync(guard, `import fs from 'node:fs'; import cp from 'node:child_process'; import {syncBuiltinESMExports} from 'node:module';
const reads = new Set(), copy = ${JSON.stringify(slash(f.copy))};
for (const method of ['readFileSync','statSync','existsSync','readdirSync']) {
 const original = fs[method]; fs[method] = function(file,...args) {
  const name = String(file).replace(/\\\\/g,'/');
  if (name.endsWith('/report.md') || name.endsWith('/brief.md') || name === copy || name.startsWith(copy+'/')) throw Error('fleet inspected prose/copy: '+name);
  if (method === 'readFileSync' && name.endsWith('/task.json')) { if (reads.has(name)) throw Error('state read twice'); reads.add(name); }
  return original.call(fs,file,...args);
 };
}
const spawn = cp.spawnSync; cp.spawnSync = (cmd,args,options) => {
 if (cmd !== process.execPath || args[0] !== ${JSON.stringify(fake)} || args[1] !== 'get' || args.at(-1) !== ${JSON.stringify(owner)}) throw Error('unexpected fleet subprocess');
 return spawn(cmd,args,options);
}; syncBuiltinESMExports();
const {main} = await import(${JSON.stringify(pathToFileURL(path.join(here, 'crew.mjs')).href)}); main(process.argv.slice(2));
fs.writeFileSync(${JSON.stringify(metrics)}, JSON.stringify({stateReads:reads.size}));`);
  const call = () => crew(['status', '--json', '--view', 'fleet'], { cwd: f.home, script: guard, terminal: reader });
  let r = call(); assert.equal(r.code, 0, r.out); let output = JSON.parse(r.out);
  assert.deepEqual(output.owner, { terminal: owner, live: true });
  assert.equal(output.tasks.length, 1); assert.ok(Buffer.byteLength(r.out) < 16384);
  assert.equal(JSON.parse(fs.readFileSync(metrics)).stateReads, 1001);
  const size = Buffer.byteLength(r.out); fill(1000, 5000);
  const times = [];
  for (let i = 0; i < 3; i++) { const start = performance.now(); r = call(); times.push(Math.round(performance.now() - start)); assert.equal(r.code, 0, r.out); }
  assert.equal(Buffer.byteLength(r.out), size); assert.equal(JSON.parse(fs.readFileSync(metrics)).stateReads, 0, 'unchanged states use metadata-validated summaries');
  const index = path.join(f.home, 'state', 'status-fleet-index.json');
  const changed = { ...f.task, id: 'closed-00000', kind: 'scout', state: 'working' }; f.save(changed);
  r = call(); assert.equal(r.code, 0, r.out); assert.equal(JSON.parse(r.out).tasks.length, 2);
  assert.equal(JSON.parse(fs.readFileSync(metrics)).stateReads, 1, 'changed source invalidates only its summary');
  fs.rmSync(path.join(f.home, 'tasks', changed.id, 'task.json'));
  r = call(); assert.equal(r.code, 0, r.out); assert.equal(JSON.parse(r.out).tasks.length, 1, 'deleted source cannot survive in cache');
  fs.writeFileSync(index, 'corrupt'); r = call(); assert.equal(r.code, 0, r.out);
  assert.equal(JSON.parse(fs.readFileSync(metrics)).stateReads, 5000, 'corrupt index safely rebuilds from state');
  assert.equal(Buffer.byteLength(r.out), size);
  // Avoid a timing assertion on shared CI runners; the reproducible measured command
  // and guarded operation count are the regression contract. Record target-machine timings.
  console.log(`fleet-scale: 1000/5000 finished tasks, ${size} bytes, 5000-task process timings ${times.join('/')} ms`);
};

gapTests.status = () => {
  const f = gapFixture('delivery'), ship = f.spawn('ship', ['--kind', 'ship']), scout = f.spawn('scout');
  for (const [fields, expected] of [[{}, 'plain'], [{ workflow: 'delivery' }, 'workflow'], [{ gate: 'no-mistakes', workflow: 'delivery' }, 'gate']]) {
    f.save({ ...ship, ...fields });
    const tasks = JSON.parse(f.call(['status', '--json']).out).tasks;
    assert.equal(tasks.find(t => t.id === ship.id).deliveryKind, expected);
    assert.equal(tasks.find(t => t.id === scout.id).deliveryKind, null);
  }
  assert.equal(f.call(['finish', ship.id]).code, 0); assert.equal(f.call(['finish', scout.id]).code, 0);
};

// Advisory label integration: fake GitHub records the
// already-saved task state at every request, including label mutations.
function reviewLabelsFixture(name, overrides = {}) {
  const dir = path.join(root, `labels-${name}`); fs.mkdirSync(dir);
  const fakeGh = path.join(dir, 'gh.mjs'), state = path.join(dir, 'github.json'), log = path.join(dir, 'calls.json');
  const under = '\u{1F916} Review', approved = '\u{1F916} Approved', changes = '\u{1F916} Rework';
  const oldUnder = '\u{1F916} Under review', oldChanges = '\u{1F916} Changes needed';
  const manifest = { version: 1, labels: {
    'under-review': { name: under, previousNames: [oldUnder] },
    'review-approved': { name: approved, previousNames: [] },
    'review-changes-needed': { name: changes, previousNames: [oldChanges] },
  } };
  fs.writeFileSync(state, JSON.stringify({ labels: ['unrelated'], defined: [under, approved, changes], manifest })); fs.writeFileSync(log, '[]');
  // Core is the fake launcher. Installation probes and quota reads must be fake too,
  // especially relaunch, which checks even a single explicitly named replacement.
  const bin = path.join(dir, 'agents'), quota = path.join(dir, 'quota.mjs'), quotaLog = path.join(dir, 'quota.jsonl');
  fs.mkdirSync(bin);
  for (const agent of ['a1', 'pi', 'claude']) fs.writeFileSync(path.join(bin, agent), '');
  const launcher = path.join(bin, 'claude-as.sh'); fs.writeFileSync(launcher, '#!/bin/sh\nexit 1\n');
  fs.writeFileSync(quotaLog, '');
  fs.writeFileSync(quota, `import fs from 'node:fs';
const args=process.argv.slice(2), providers=args[args.indexOf('--provider')+1].split(',');
fs.appendFileSync(${JSON.stringify(quotaLog)},JSON.stringify(args)+'\\n');
console.log(JSON.stringify({providers:providers.map(provider=>({provider,quotaSemantics:{status:'known',effectiveAvailability:[{scope:'all_models',effectivePercentRemaining:80}]}}))}));`);
  const env = { CREW_GH: fakeGh, CREW_REVIEW_LABELS_REPO: 'timurproko/MyWorkflows', CREW_AGENT_PATH: bin,
    CREW_TOOL_QUOTA_AXI: quota, CREW_NO_QUOTA: '0', CREW_CLAUDE_LAUNCHER: launcher, CREW_CLAUDE_ACCOUNT: '', CREW_CLAUDE_ACCOUNTS: '', ...overrides };
  const f = gapFixture(`labels-${name}`, env);
  fs.mkdirSync(path.join(f.home, 'config'));
  fs.writeFileSync(path.join(f.home, 'config', 'crew-dispatch.json'), JSON.stringify({ default: [{ harness: 'pi' }] }));
  const quotaReads = () => fs.readFileSync(quotaLog, 'utf8').trim().split(/\r?\n/).filter(Boolean).map(line => JSON.parse(line));
  const finishResult = id => path.join(dir, `${id}.finish.json`), finishScript = path.join(dir, 'finish.mjs');
  fs.writeFileSync(finishScript, `import fs from 'node:fs'; import path from 'node:path'; import {main} from ${JSON.stringify(pathToFileURL(path.join(here, 'crew.mjs')).href)};
main(['finish',process.argv[2]]); const file=path.join(${JSON.stringify(dir)},process.argv[2]+'.finish.json');fs.writeFileSync(file+'.tmp',JSON.stringify({code:process.exitCode??0}));fs.renameSync(file+'.tmp',file);`);
  fs.writeFileSync(fakeGh, `import fs from 'node:fs'; import {spawn,spawnSync} from 'node:child_process';
const a=process.argv.slice(2), file=${JSON.stringify(state)}, s=JSON.parse(fs.readFileSync(file,'utf8')), log=${JSON.stringify(log)};
let task; try { task=JSON.parse(fs.readFileSync(${JSON.stringify(path.join(f.home, 'tasks'))}+'/'+s.watch+'/task.json','utf8')); } catch {}
const method=a[a.indexOf('--method')+1], endpoint=a.find(x=>x.startsWith('repos/')), input=a.includes('--input') ? JSON.parse(fs.readFileSync(0,'utf8')) : null;
fs.writeFileSync(log,JSON.stringify([...JSON.parse(fs.readFileSync(log,'utf8')),{a,method,endpoint,input,saved:task?.state}]));
const fail = msg => { console.error(msg+'\\nsecond diagnostic line'); process.exit(1); };
if(s.network) fail('network unavailable');
if(a[0]==='pr') { if(s.noPr) fail('no pull requests found for branch'); console.log('https://github.com/acme/demo/pull/42'); process.exit(0); }
// Hold a start lookup until real done has saved its verdict and finished its requests.
const duringEndpoint={variables:'/actions/variables',manifest:'/contents/labels/base.json',labels:'/issues/42/labels',definition:'/labels/'+encodeURIComponent(${JSON.stringify(under)})}[s.duringAt];
if((s.duringVerdict || s.duringFinish) && task?.state==='working' && endpoint.endsWith(duringEndpoint)) {
  const verdict=s.duringVerdict, finish=s.duringFinish; s.duringVerdict=null; s.duringFinish=false; fs.writeFileSync(file,JSON.stringify(s));
  if(verdict) fs.writeFileSync(task.report,verdict);
  if(finish) {
    // Wait only for the real lifecycle publication, not full copy/label cleanup
    // inside this API's two-second budget. The test awaits completion separately.
    const child=spawn(process.execPath,[${JSON.stringify(finishScript)},task.id],{cwd:${JSON.stringify(f.home)},env:process.env,stdio:'ignore',detached:true});child.unref();
    const record=${JSON.stringify(path.join(f.home, 'tasks'))}+'/'+task.id+'/task.json', deadline=Date.now()+1500;
    while(true){let closed=false;try{closed=JSON.parse(fs.readFileSync(record)).state==='closed'}catch{}
      if(closed)break;if(Date.now()>deadline)fail('finish did not publish closure');Atomics.wait(new Int32Array(new SharedArrayBuffer(4)),0,0,5);}
  } else {
    const done=spawnSync(process.execPath,[${JSON.stringify(path.join(here, 'crew.mjs'))},'done',task.id],{cwd:${JSON.stringify(f.home)},env:{...process.env,CREW_TERMINAL:task.terminal},encoding:'utf8'});
    if(done.status!==0) fail(done.stdout+done.stderr);
  }
}
if(endpoint.endsWith('/actions/variables')) { if(s.variablesDenied) fail('variables unreadable'); console.log(JSON.stringify([{variables:s.enabled===undefined ? [] : [{name:'DELIVERY_LABELS_ENABLED',value:s.enabled}]}])); }
else if(endpoint.endsWith('/contents/labels/base.json')) {
  if(s.manifestDenied) fail('manifest unavailable');
  if(s.manifestDelay) Atomics.wait(new Int32Array(new SharedArrayBuffer(4)),0,0,s.manifestDelay);
  console.log(s.manifestRaw ?? JSON.stringify(s.manifest));
}
else if(method==='GET' && endpoint.includes('/pulls/')) {
  if(s.prDenied) fail('PR state unavailable');
  if(s.prDelay) Atomics.wait(new Int32Array(new SharedArrayBuffer(4)),0,0,s.prDelay);
  const recorded = ${JSON.stringify(recordedRestPr(42, 'feature/ship', 'pull-get-open.json'))};
  console.log(JSON.stringify(s.prResponse ?? {...recorded,state:s.prState ?? 'open',merged_at:s.mergedAt ?? null,head:{...recorded.head,sha:s.head}}));
}
else if(method==='GET' && endpoint.includes('/issues/')) console.log(JSON.stringify([s.labels.map(name=>({name}))]));
else if(method==='GET') { const name=decodeURIComponent(endpoint.split('/').at(-1)); if(!s.defined.includes(name)) fail('shared label not defined'); console.log(JSON.stringify({name})); }
else if(method==='DELETE') { if(s.removeDenied) fail('removal denied'); const name=decodeURIComponent(endpoint.split('/').at(-1)); s.labels=s.labels.filter(n=>n!==name); fs.writeFileSync(file,JSON.stringify(s)); console.log('{}'); }
else if(method==='POST') { if(s.addDenied) fail('addition denied'); if(input.labels.some(n=>!s.defined.includes(n))) fail('must never create a label'); s.labels=[...new Set([...s.labels,...input.labels])]; fs.writeFileSync(file,JSON.stringify(s)); console.log('[]'); }
else fail('unexpected fake request');`);
  const control = patch => { const s = JSON.parse(fs.readFileSync(state, 'utf8')); if (patch) fs.writeFileSync(state, JSON.stringify({ ...s, ...patch })); return patch ? control() : s; };
  // Review start reads the PR head before the reviewer exists; label hooks come after it.
  const allCalls = () => JSON.parse(fs.readFileSync(log, 'utf8')), starts = [];
  const headRead = (c, i) => c.saved === undefined && starts.some(([from, to]) => i >= from && i < to);
  const calls = () => allCalls().filter((c, i) => !headRead(c, i)), headReads = () => allCalls().filter(headRead);
  const parent = (id = 'ship', fields = {}, report = 'Implementation: https://github.com/acme/demo/pull/42') => { const t = f.spawn(id, ['--kind', 'ship', '--agent', 'pi']); control({ head: git('-C', t.worktree, 'rev-parse', 'HEAD').trim() }); fs.writeFileSync(t.report, report); f.save({ ...t, ...fields, state: 'reported' }); return f.task(id); };
  const start = (id = 'ship', suffix = '') => { const review = `${id}-review${suffix}`; control({ watch: review }); const from = allCalls().length, r = f.call(['review', id, '--agent', 'pi']); starts.push([from, allCalls().length]); assert.equal(r.code, 0, r.out); return { task: f.task(review), result: r }; };
  const done = (task, report) => { control({ watch: task.id }); if (report !== undefined) fs.writeFileSync(task.report, report); return crew(['done', task.id], { cwd: f.home, terminal: task.terminal, env }); };
  const writes = () => calls().filter(c => ['POST', 'DELETE'].includes(c.method));
  const warnings = r => r.out.split(/\r?\n/).filter(line => line.startsWith('crew: review labels:'));
  return { ...f, under, approved, changes, oldUnder, oldChanges, manifest, control, calls, headReads, parent, start, done, writes, warnings, quotaReads, finishResult };
}
gapTests['review-label-abandon'] = () => {
  const f = reviewLabelsFixture('abandon');
  for (const [id, prior, expected] of [['rework', f.changes, f.changes], ['approved', f.approved, f.approved], ['none', null, null], ['legacy', f.oldChanges, f.changes]]) {
    f.parent(id); f.control({ labels: ['unrelated', ...(prior ? [prior] : [])] });
    const { task } = f.start(id);
    // Include a cancellation while the launch still has its preparing record.
    if (id === 'rework') f.save({ ...task, state: 'preparing' });
    const r = f.call(['finish', task.id]); assert.equal(r.code, 0, r.out);
    assert.deepEqual(f.control().labels, ['unrelated', ...(expected ? [expected] : [])], 'Unfinished review restores its recorded prior verdict, or none');
  }
  f.parent('overlap'); f.control({ labels: ['unrelated', f.changes] });
  const a = f.start('overlap').task, b = f.start('overlap', '-2').task;
  assert.equal(f.call(['finish', a.id]).code, 0); assert.deepEqual(f.control().labels, ['unrelated', f.under], 'Activity stays while another local reviewer runs');
  assert.equal(f.call(['finish', b.id]).code, 0); assert.deepEqual(f.control().labels, ['unrelated', f.changes], 'The last abandoned reviewer restores the inherited prior state');
  f.parent('legacy-record'); const legacy = f.start('legacy-record').task; delete legacy.reviewLabelBefore; f.save(legacy);
  assert.equal(f.call(['finish', legacy.id]).code, 0); assert.deepEqual(f.control().labels, ['unrelated'], 'An older reviewer without a snapshot leaves no managed label');
  f.parent('failed'); f.control({ labels: ['unrelated', f.changes] }); const failed = f.start('failed').task;
  setTerminal(failed.terminal, { state: 'finished' });
  let r = f.call(['wait', failed.id, '--timeout', '2'], { CREW_RECOVERY_SECONDS: '0' }); assert.equal(r.code, 0, r.out);
  assert.deepEqual(f.control().labels, ['unrelated', f.changes], 'Observed reviewer death clears activity');
  f.parent('exhausted'); f.control({ labels: ['unrelated'] }); const exhausted = f.start('exhausted').task;
  setTerminal(exhausted.terminal, { status: { state: 'error', app: 'pi' }, screen: 'usage limit reached' });
  r = f.call(['wait', exhausted.id, '--timeout', '2'], { CREW_RECOVERY_SECONDS: '0' }); assert.equal(r.code, 7, r.out);
  assert.deepEqual(f.control().labels, ['unrelated'], 'Exhausted reviewer handover clears activity');
  f.parent('verdict'); f.control({ labels: ['unrelated', f.changes] }); const verdict = f.start('verdict').task;
  assert.equal(f.done(verdict, 'APPROVE').code, 0); const before = f.writes().length;
  assert.equal(f.call(['finish', verdict.id]).code, 0); assert.equal(f.writes().length, before, 'A completed verdict is never restored to its previous state');
};

gapTests['review-label-cancel-start'] = async () => {
  const f = reviewLabelsFixture('cancel-start');
  for (const duringAt of ['variables', 'manifest', 'labels', 'definition']) {
    f.parent(duringAt); f.control({ labels: ['unrelated', f.changes], duringFinish: true, duringAt });
    const { task, result } = f.start(duringAt);
    await until(() => fs.existsSync(f.finishResult(task.id)));
    assert.equal(JSON.parse(fs.readFileSync(f.finishResult(task.id))).code, 0, 'Real finish must complete successfully');
    assert.equal(f.warnings(result).length, 0, result.out);
    assert.equal(task.state, 'closed');
    assert.deepEqual(f.control().labels, ['unrelated', f.changes], 'Cancelling during a start lookup cannot leave or re-add activity');
  }
};

gapTests['review-label-exclusive-actions'] = () => {
  const f = reviewLabelsFixture('exclusive-actions');
  f.parent(); f.control({ labels: ['unrelated', f.approved, f.changes] }); const { task } = f.start();
  let r = f.call(['tell', 'ship', 'Fix the implementation while review runs.']); assert.equal(r.code, 0, r.out);
  assert.deepEqual(f.control().labels, ['unrelated', f.changes], 'Tell invalidates activity, not just approval');
  assert.equal(f.call(['finish', task.id]).code, 0);
  assert.deepEqual(f.control().labels, ['unrelated', f.changes], 'Late reviewer cleanup must not undo a follow-up');
  f.parent('handover'); const active = f.start('handover').task;
  f.save({ ...f.task('handover'), state: 'working' });
  r = f.call(['relaunch', 'handover', '--agent', 'a1', '--model', 'openai-codex/test']); assert.equal(r.code, 0, r.out);
  assert.deepEqual(f.control().labels, ['unrelated', f.changes], 'Relaunch invalidates an active review');
  assert.equal(f.call(['finish', active.id]).code, 0);
  for (const stale of [false, true]) {
    const id = stale ? 'stale-land' : 'fresh-land', ship = f.parent(id, { pr: 'https://github.com/acme/demo/pull/42' });
    const head = f.control().head;
    f.save({ ...ship, reviewVerdict: { verdict: 'APPROVE', head, currentHead: head, stale: false, needsReview: false } });
    f.control({ head: stale ? 'b'.repeat(40) : head, labels: ['unrelated', f.under, f.oldUnder, f.approved, f.changes] });
    r = f.call(['land', id]); assert.equal(r.code, 0, r.out);
    assert.deepEqual(f.control().labels, ['unrelated', stale ? f.changes : f.approved], 'Land normalizes conflicting assignments, even manually added labels');
  }
};

gapTests['review-label-closed-no-writes'] = () => {
  const f = reviewLabelsFixture('closed-no-writes');
  for (const mergedAt of [null, '2026-11-24T14:11:45Z']) {
    const id = mergedAt ? 'merged' : 'closed'; f.parent(id); f.control({ prState: 'open', mergedAt: null, labels: ['unrelated', f.changes] });
    const { task } = f.start(id); f.control({ prState: 'closed', mergedAt }); const labels = f.control().labels, before = f.writes().length;
    assert.equal(f.done(task, 'APPROVE').code, 0); assert.equal(f.call(['finish', task.id]).code, 0);
    assert.equal(f.call(['tell', id, 'Continue.']).code, 0);
    assert.equal(f.writes().length, before); assert.deepEqual(f.control().labels, labels, 'Closed and merged PRs are never changed');
  }
};

gapTests['review-label-manifest'] = () => {
  const f = reviewLabelsFixture('manifest', { CREW_REVIEW_LABELS_REPO: 'another/palette' });
  const manifest = { version: 1, labels: {
    'under-review': { name: 'Inspect / now', reference: { id: 1 } },
    'review-approved': { name: 'All good' },
    'review-changes-needed': { name: 'Try again' },
    extra: { name: 'ignored' },
  } };
  f.control({ manifest, defined: ['Inspect / now', 'All good', 'Try again'] }); f.parent();
  const { task, result } = f.start(); assert.equal(f.warnings(result).length, 0, result.out);
  assert.deepEqual(f.control().labels, ['unrelated', 'Inspect / now']);
  assert.equal(f.done(task, 'CHANGES NEEDED').code, 0);
  assert.deepEqual(f.control().labels, ['unrelated', 'Try again']);
  const reads = f.calls().filter(c => c.endpoint?.includes('/contents/'));
  assert.equal(reads.length, 2, 'Exactly one manifest request per eligible hook, without branch lookup');
  assert.ok(reads.every(c => c.endpoint === 'repos/another/palette/contents/labels/base.json' && c.method === 'GET'));
  assert.ok(reads.every(c => c.a.includes('Accept: application/vnd.github.raw+json') && c.a[c.a.indexOf('--hostname') + 1] === 'github.com'));
  assert.ok(reads.every(c => c.saved === (c === reads[0] ? 'working' : 'reported')));
};
gapTests['review-label-fallback'] = () => {
  const f = reviewLabelsFixture('fallback');
  const cases = [
    ['unavailable', { manifestDenied: true }],
    ['invalid-json', { manifestRaw: '{' }],
    ['null', { manifestRaw: 'null' }],
    ['version', { manifest: { ...f.manifest, version: 2 } }],
    ['missing-key', { manifest: { version: 1, labels: {} } }],
    ['empty-name', { manifest: { version: 1, labels: { ...f.manifest.labels, 'under-review': { name: '' } } } }],
    ['bad-aliases', { manifest: { version: 1, labels: { ...f.manifest.labels, 'under-review': { name: f.under, previousNames: [null] } } } }],
    ['timeout', { manifestDelay: 5000 }],
  ];
  for (const [id, patch] of cases) {
    f.control({ manifestDenied: false, manifestRaw: null, manifestDelay: 0, manifest: f.manifest, labels: ['unrelated', f.oldUnder, f.oldChanges], ...patch }); f.parent(id);
    const at = f.calls().length, { result, task } = f.start(id);
    assert.equal(task.state, 'working'); assert.deepEqual(f.control().labels, ['unrelated', f.under]);
    assert.equal(f.warnings(result).length, 1, result.out); assert.match(f.warnings(result)[0], /using built-in defaults/);
    assert.equal(f.calls().slice(at).filter(c => c.endpoint?.includes('/contents/')).length, 1, 'No manifest retry');
  }
  f.control({ manifestDelay: 0, manifestDenied: true, addDenied: true }); f.parent('combined');
  const { result, task } = f.start('combined'); assert.equal(f.warnings(result).length, 1); assert.match(result.out, /using built-in defaults.*addition denied/);
  f.control({ addDenied: false, labels: ['unrelated', f.under, f.oldUnder, f.oldChanges] });
  const completed = f.done(task, 'APPROVE'); assert.equal(completed.code, 0); assert.equal(f.warnings(completed).length, 1);
  assert.deepEqual(f.control().labels, ['unrelated', f.approved], 'Verdict fallback also clears legacy assignments');
  const invalid = reviewLabelsFixture('invalid-source', { CREW_REVIEW_LABELS_REPO: '../not/a/repository?ref=other' });
  invalid.parent(); const started = invalid.start(); assert.equal(invalid.warnings(started.result).length, 1);
  assert.ok(!invalid.calls().some(c => c.endpoint?.includes('/contents/')), 'Invalid override is never an API endpoint');
  assert.deepEqual(invalid.control().labels, ['unrelated', invalid.under]);
};
gapTests['review-label-renames'] = () => {
  const f = reviewLabelsFixture('renames');
  const manifest = structuredClone(f.manifest);
  manifest.labels['under-review'].previousNames.push('Earlier activity', f.oldUnder);
  manifest.labels['review-approved'].previousNames.push('Earlier approval');
  manifest.labels['review-changes-needed'].previousNames.push('Earlier rework', f.oldChanges);
  const names = [...new Set(Object.values(manifest.labels).flatMap(l => [l.name, ...l.previousNames]))];
  for (const verdict of ['APPROVE', 'CHANGES NEEDED']) {
    const id = verdict === 'APPROVE' ? 'approve' : 'rework';
    f.parent(id); f.control({ manifest, labels: ['unrelated', ...names] }); let at = f.writes().length;
    const { task, result } = f.start(id); assert.equal(f.warnings(result).length, 0, result.out);
    assert.deepEqual(new Set(f.control().labels), new Set(['unrelated', f.under]));
    assert.equal(f.writes().slice(at).filter(c => c.method === 'DELETE').length, names.length - 1, 'Duplicate aliases are removed once');
    f.control({ labels: ['unrelated', ...names] }); at = f.writes().length;
    const r = f.done(task, verdict); assert.equal(r.code, 0); assert.equal(f.warnings(r).length, 0, r.out);
    const desired = verdict === 'APPROVE' ? f.approved : f.changes;
    assert.deepEqual(new Set(f.control().labels), new Set(['unrelated', desired]));
    assert.equal(f.writes().slice(at).filter(c => c.method === 'DELETE').length, names.length - 1);
    assert.deepEqual(f.writes().slice(at).filter(c => c.method === 'POST').map(c => c.input.labels), [[desired]]);
  }
  f.parent('missing-current'); f.control({ labels: ['unrelated', f.oldUnder, f.oldChanges, 'Earlier approval'], defined: [f.oldUnder, f.oldChanges, 'Earlier approval'] });
  let at = f.writes().length;
  const missing = f.start('missing-current'); assert.equal(f.warnings(missing.result).length, 1);
  assert.deepEqual(f.control().labels, ['unrelated']); assert.ok(!f.writes().slice(at).some(c => c.method === 'POST'), 'No old-name fallback when the current definition is missing');
  at = f.writes().length; f.control({ labels: ['unrelated', f.oldUnder, f.oldChanges, 'Earlier approval'] });
  const r = f.done(missing.task, 'CHANGES NEEDED'); assert.equal(f.warnings(r).length, 1);
  assert.deepEqual(f.control().labels, ['unrelated']); assert.ok(!f.writes().slice(at).some(c => c.method === 'POST'));
  // The source can change between operations: no memory or disk snapshot survives a hook.
  f.control({ manifest: f.manifest, defined: [f.under, f.approved, f.changes] }); f.parent('future'); const task = f.start('future').task;
  const future = { version: 1, labels: {
    'under-review': { name: 'Next activity', previousNames: [f.under, f.oldUnder] },
    'review-approved': { name: 'Next approval', previousNames: [f.approved] },
    'review-changes-needed': { name: 'Next rework', previousNames: [f.changes, f.oldChanges] },
  } };
  f.control({ manifest: future, defined: ['Next activity', 'Next approval', 'Next rework'], labels: ['unrelated', f.under, f.oldUnder, f.oldChanges] }); at = f.calls().length;
  assert.equal(f.done(task, 'APPROVE').code, 0); assert.deepEqual(f.control().labels, ['unrelated', 'Next approval']);
  assert.equal(f.calls().slice(at).filter(c => c.endpoint?.includes('/contents/')).length, 1);
};
gapTests['review-label-swaps'] = () => {
  const f = reviewLabelsFixture('swaps');
  for (const [id, fields, report] of [['workflow', { workflow: 'delivery', stage: 'implementation' }, 'Implementation: https://github.com/acme/demo/pull/42'], ['gate', { gate: 'no-mistakes' }, 'https://github.com/acme/demo/pull/42'], ['plain', {}, 'Done.']]) {
    f.parent(id, fields, report); f.control({ labels: ['unrelated', f.approved, f.changes] }); const before = f.calls().length;
    const { task, result } = f.start(id); assert.equal(f.warnings(result).length, 0);
    assert.deepEqual(f.control().labels, ['unrelated', f.under]); assert.ok(f.calls().slice(before).every(c => c.saved === 'working'), 'All start requests follow the saved launch state');
    assert.ok(!('reviewAttempt' in task) && !('reviewSessionAttempt' in task));
    const verdict = id === 'gate' ? 'CHANGES NEEDED' : 'APPROVE', at = f.calls().length;
    const r = f.done(task, verdict+'\nDetails.'); assert.equal(r.code, 0, r.out); assert.equal(f.task(task.id).state, 'reported');
    assert.deepEqual(f.control().labels, ['unrelated', verdict === 'APPROVE' ? f.approved : f.changes]);
    assert.ok(f.calls().slice(at).every(c => c.saved === 'reported'), 'All verdict requests follow saved completion');
    assert.ok(f.writes().every(c => c.method !== 'POST' || c.input.labels.length === 1));
  }
  f.parent('malformed'); let t = f.start('malformed').task, n = f.calls().length;
  assert.equal(f.done(t, 'APPROVE extra').code, 0); assert.equal(f.calls().length, n); assert.ok(f.control().labels.includes(f.under));
  f.parent('missing'); t = f.start('missing').task; n = f.calls().length; assert.equal(f.done(t).code, 2); assert.equal(f.calls().length, n); assert.equal(f.task(t.id).state, 'working');
  f.parent('no-pr', {}, 'Done.'); f.control({ noPr: true }); n = f.writes().length; const skipped = f.start('no-pr').task; assert.equal(f.done(skipped, 'APPROVE').code, 0); assert.equal(f.writes().length, n); f.control({ noPr: false });
  f.parent('plan', { workflow: 'delivery', stage: 'plan' }, 'Plan: https://github.com/acme/demo/pull/42'); n = f.calls().length; f.start('plan'); assert.equal(f.calls().length, n);
  // Accepted overlap limitation: the first verdict clears activity while the other runs.
  f.parent('overlap'); const a = f.start('overlap').task, b = f.start('overlap', '-2').task;
  assert.equal(f.done(a, 'APPROVE').code, 0); assert.ok(!f.control().labels.includes(f.under)); assert.equal(f.task(b.id).state, 'working');
  n = f.writes().length; assert.equal(f.call(['start']).code, 0); assert.equal(f.call(['stop', b.id]).code, 0); assert.equal(f.call(['finish', b.id]).code, 0); assert.equal(f.writes().length, n, 'Abandoning the other reviewer preserves a completed verdict');
  assert.ok(!fs.existsSync(path.join(f.home, 'state', 'review-labels')));
  assert.ok(JSON.parse(f.call(['status', '--json']).out).tasks.every(t => !('reviewLabel' in t)));
};
gapTests['review-label-pr-state'] = () => {
  const f = reviewLabelsFixture('pr-state');
  const stateReads = at => f.calls().slice(at).filter(c => c.endpoint === 'repos/acme/demo/pulls/42');
  for (const [status, mergedAt, verdict] of [['merged', '2026-11-24T14:11:45Z', 'APPROVE'], ['closed', null, 'CHANGES NEEDED']]) {
    f.parent(`before-${status}`); f.control({ prState: 'closed', mergedAt, labels: ['unrelated'] });
    const beforeWrites = f.writes().length;
    let at = f.calls().length;
    const before = f.start(`before-${status}`);
    assert.deepEqual(f.control().labels, ['unrelated'], 'A closed PR must not acquire a Review label');
    assert.match(before.result.out, new RegExp(`already ${status}`));
    assert.equal(before.task.state, 'working'); assert.equal(f.warnings(before.result).length, 0);
    assert.equal(stateReads(at).length, 1, 'Review start reads PR state once');
    at = f.calls().length;
    assert.equal(f.done(before.task, verdict).code, 0);
    assert.equal(stateReads(at).length, 1, 'Verdict reads PR state once');
    assert.deepEqual(f.control().labels, ['unrelated'], 'A closed PR must not acquire a verdict label');
    assert.ok(!f.writes().slice(beforeWrites).some(c => c.method === 'POST'));

    f.parent(`during-${status}`); f.control({ prState: 'open', mergedAt: null });
    const during = f.start(`during-${status}`);
    assert.deepEqual(f.control().labels, ['unrelated', f.under]);
    f.control({ prState: 'closed', mergedAt, labels: ['unrelated', f.under, f.oldUnder, f.approved, f.changes, f.oldChanges] });
    at = f.calls().length;
    const done = f.done(during.task, verdict);
    assert.equal(done.code, 0, done.out); assert.equal(f.warnings(done).length, 0);
    assert.equal(f.task(during.task.id).state, 'reported');
    assert.deepEqual(f.control().labels, ['unrelated', f.under, f.oldUnder, f.approved, f.changes, f.oldChanges], 'Late verdict leaves closed PR labels untouched');
    assert.equal(stateReads(at).length, 1);
    assert.ok(!f.calls().slice(at).some(c => c.method === 'POST'));
  }
  for (const verdict of ['APPROVE', 'CHANGES NEEDED']) {
    f.parent(verdict === 'APPROVE' ? 'open-approve' : 'open-rework');
    f.control({ prState: 'open', mergedAt: null }); const at = f.calls().length;
    const { task, result } = f.start(verdict === 'APPROVE' ? 'open-approve' : 'open-rework');
    assert.doesNotMatch(result.out, /already (merged|closed)/);
    assert.deepEqual(f.control().labels, ['unrelated', f.under]);
    assert.equal(f.done(task, verdict).code, 0);
    assert.deepEqual(f.control().labels, ['unrelated', verdict === 'APPROVE' ? f.approved : f.changes]);
    assert.equal(stateReads(at).length, 2, 'Open PRs also get one state read per hook');
  }
};
gapTests['review-label-current-head'] = () => {
  const f = reviewLabelsFixture('current-head');
  f.parent(); const { task } = f.start(), head = f.control().head;
  let r = f.done(task, 'APPROVE'); assert.equal(r.code, 0, r.out);
  assert.equal(f.task('ship').reviewVerdict.head, head, 'Verdict records the head actually reviewed');
  assert.equal(f.task(task.id).reviewVerdict.head, head);
  assert.deepEqual(f.control().labels, ['unrelated', f.approved]);
  assert.doesNotMatch(r.out, /approval is for an older head/);
  assert.equal(f.task('ship').reviewVerdict.needsReview, false);
  let at = f.calls().length;
  r = f.call(['tell', 'ship', 'Correct the implementation.']); assert.equal(r.code, 0, r.out);
  assert.deepEqual(f.control().labels, ['unrelated', f.changes], 'Resuming a ship invalidates its approval');
  assert.equal(f.task('ship').reviewVerdict.needsReview, true);
  assert.equal(f.calls().slice(at).filter(c => c.endpoint === 'repos/acme/demo/pulls/42').length, 1);

  f.parent('moved'); const moved = f.start('moved').task, reviewed = f.control().head;
  f.control({ head: 'b'.repeat(40) }); at = f.calls().length;
  r = f.done(moved, 'APPROVE'); assert.equal(r.code, 0, r.out);
  assert.deepEqual(f.control().labels, ['unrelated', f.changes]);
  assert.match(r.out, /approval is for an older head.*needs another review/i);
  assert.deepEqual(Object.fromEntries(['head', 'currentHead', 'stale', 'needsReview'].map(key => [key, f.task('moved').reviewVerdict[key]])), { head: reviewed, currentHead: 'b'.repeat(40), stale: true, needsReview: true });
  assert.equal(f.calls().slice(at).filter(c => c.endpoint === 'repos/acme/demo/pulls/42').length, 1);
  const shown = JSON.parse(f.call(['status', '--json']).out).tasks.find(t => t.id === 'moved');
  assert.equal(shown.reviewVerdict.stale, true, 'Status exposes recorded review freshness without network reads');
  f.save({ ...f.task('moved'), pr: 'https://github.com/acme/demo/pull/42' }); at = f.calls().length;
  r = f.call(['land', 'moved']); assert.equal(r.code, 0, r.out);
  assert.match(r.out, /approval is for an older head.*needs another review/i);
  assert.equal(f.calls().slice(at).filter(c => c.endpoint === 'repos/acme/demo/pulls/42').length, 1);

  git('-C', f.repo, 'remote', 'add', 'origin', 'https://github.com/acme/demo.git');
  f.parent('discovered', {}, 'Done.'); f.control({ labels: ['unrelated', f.approved] });
  r = f.call(['tell', 'discovered', 'Continue.']); assert.equal(r.code, 0, r.out);
  assert.deepEqual(f.control().labels, ['unrelated', f.changes], 'A plain PR can be discovered before land records its URL');
  for (const [id, patch] of [['no-label', { labels: ['unrelated'] }], ['no-pr', { noPr: true }], ['closed', { prState: 'closed', labels: ['unrelated', f.approved] }]]) {
    f.parent(id, id === 'no-pr' ? {} : { pr: 'https://github.com/acme/demo/pull/42' }, 'Done.');
    f.control({ noPr: false, prState: 'open', labels: ['unrelated'], ...patch }); at = f.writes().length;
    r = f.call(['tell', id, 'Continue.']); assert.equal(r.code, 0, r.out);
    assert.equal(f.writes().length, at, 'No PR, no Approved label, or a closed PR means no writes');
  }
  f.parent('relaunch'); f.control({ noPr: false, prState: 'open', labels: ['unrelated', f.approved] });
  f.save({ ...f.task('relaunch'), state: 'working' });
  const quotaAt = f.quotaReads().length;
  r = f.call(['relaunch', 'relaunch', '--agent', 'a1', '--model', 'openai-codex/review-label-test']); assert.equal(r.code, 0, r.out);
  assert.equal(f.task('relaunch').agent, 'a1');
  assert.equal(f.task('relaunch').launch.model, 'openai-codex/review-label-test');
  assert.deepEqual(f.quotaReads().slice(quotaAt), [['--provider', 'codex', '--max-age', '2m', '--json']], 'Relaunch reads only the fake candidate quota');
  assert.deepEqual(f.control().labels, ['unrelated', f.changes]);
  f.parent('failed-send'); f.control({ labels: ['unrelated', f.approved] });
  setTerminal(f.task('failed-send').terminal, { sendError: true }); at = f.calls().length;
  r = f.call(['tell', 'failed-send', 'Continue.']); assert.equal(r.code, 4, r.out);
  assert.equal(f.calls().length, at, 'A refused follow-up never changes labels');
  assert.equal(f.task('failed-send').state, 'reported');
  for (const [id, patch] of [['rework-network', { network: true }], ['rework-opt-out', { enabled: 'false' }], ['rework-write', { addDenied: true }]]) {
    f.parent(id); f.control({ labels: ['unrelated', f.approved], network: false, enabled: '', addDenied: false, ...patch }); at = f.calls().length;
    r = f.call(['tell', id, 'Continue.']); assert.equal(r.code, 0, r.out);
    assert.equal(f.task(id).state, 'working'); assert.equal(f.warnings(r).length, 1, r.out);
    assert.equal(f.calls().slice(at).filter(c => c.endpoint === 'repos/acme/demo/pulls/42').length, 1);
  }
  f.control({ network: false, enabled: '', addDenied: false });
  f.parent('renamed-approval');
  const renamed = structuredClone(f.manifest);
  renamed.labels['review-approved'] = { name: 'Approval v2', previousNames: [f.approved] };
  renamed.labels['review-changes-needed'] = { name: 'Rework v2', previousNames: [f.changes] };
  f.control({ manifest: renamed, defined: [f.under, 'Approval v2', 'Rework v2'], labels: ['unrelated', f.approved] });
  r = f.call(['tell', 'renamed-approval', 'Continue.']); assert.equal(r.code, 0, r.out);
  assert.deepEqual(f.control().labels, ['unrelated', 'Rework v2'], 'Follow-ups use stable manifest roles and approval aliases');
  f.control({ manifest: f.manifest, defined: [f.under, f.approved, f.changes], labels: ['unrelated'] });
  f.parent('missing-head'); const missing = f.start('missing-head').task;
  f.control({ prResponse: { state: 'open' } }); r = f.done(missing, 'APPROVE');
  assert.equal(r.code, 0, r.out); assert.match(r.out, /head could not be verified.*needs another review/);
  assert.deepEqual(f.control().labels, ['unrelated', f.changes]);
};
gapTests['review-label-plain-land-head'] = () => {
  const f = reviewLabelsFixture('plain-land-head'), remote = path.join(f.dir, 'origin.git');
  git('init', '--bare', '-q', remote); git('-C', f.repo, 'remote', 'add', 'origin', remote); git('-C', f.repo, 'push', '-q', 'origin', 'HEAD');
  const ship = f.parent('ship', {}, 'Done.');
  const head = commit(ship.worktree, { 'change.txt': 'reviewed\n' }, 'reviewed change'); f.control({ head, noPr: true });
  const { task } = f.start(); let r = f.done(task, 'APPROVE'); assert.equal(r.code, 0, r.out);
  assert.equal(f.task('ship').reviewVerdict.head, head, 'A plain pre-PR review still records its fixed local head');
  assert.equal(f.task('ship').reviewVerdict.stale, false);
  assert.equal(f.writes().length, 0);
  const moved = commit(ship.worktree, { 'change.txt': 'changed after approval\n' }, 'later change');
  f.control({ head: moved, noPr: false }); const at = f.calls().length;
  r = f.call(['land', 'ship']); assert.equal(r.code, 0, r.out);
  assert.match(r.out, /approval is for an older head.*needs another review/);
  assert.equal(f.task('ship').reviewVerdict.stale, true);
  assert.equal(f.task('ship').reviewVerdict.currentHead, moved);
  assert.equal(f.task('ship').pr, 'https://github.com/acme/demo/pull/42');
  assert.equal(f.task('ship').prFacts.state, 'OPEN', 'first plain land also persists its existing approval-freshness read');
  assert.equal(f.task('ship').prFacts.url, 'https://github.com/acme/demo/pull/42');
  assert.equal(f.calls().slice(at).filter(c => c.endpoint === 'repos/acme/demo/pulls/42').length, 1);
  assert.deepEqual(f.control().labels, ['unrelated', f.changes], 'Land marks a stale approval as Rework');
};
gapTests['review-pull-request-head'] = () => {
  // A delivery bot pushes a finalization commit after the worker, so the pull request
  // head is one commit ahead of the ship copy's branch when the review starts.
  const f = reviewLabelsFixture('pull-request-head'), remote = path.join(f.dir, 'origin.git'), bot = path.join(f.dir, 'bot');
  git('init', '--bare', '-q', remote); git('-C', f.repo, 'remote', 'add', 'origin', remote); git('-C', f.repo, 'push', '-q', 'origin', 'HEAD');
  const botPush = (ship, files) => {
    const branch = git('-C', ship.worktree, 'rev-parse', '--abbrev-ref', 'HEAD').trim();
    git('-C', ship.worktree, 'push', '-q', 'origin', `HEAD:refs/heads/${branch}`);
    fs.rmSync(bot, { recursive: true, force: true }); git('clone', '-q', '--branch', branch, remote, bot);
    const head = commit(bot, files, 'chore(openspec): finalize');
    git('-C', bot, 'push', '-q', 'origin', `HEAD:refs/heads/${branch}`, '+HEAD:refs/pull/42/head');
    return head;
  };
  const ship = f.parent('ship'); commit(ship.worktree, { 'change.txt': 'worker\n' }, 'worker change');
  const pushed = botPush(ship, { 'openspec.txt': 'finalized\n' }); f.control({ head: pushed });
  const reads = f.headReads().length, { task, result } = f.start();
  assert.equal(f.headReads().length, reads + 1, 'Review start reads the pull request head once');
  assert.equal(task.reviewHead, pushed, 'The review is fixed at the pull request head, not the local branch');
  assert.equal(git('-C', ship.worktree, 'rev-parse', 'HEAD').trim(), pushed, 'The ship copy is fast-forwarded to it');
  assert.match(result.out, /fast-forwarded/);
  assert.ok(fs.readFileSync(task.brief, 'utf8').includes(`git diff HEAD...${pushed}`));
  const r = f.done(task, 'APPROVE'); assert.equal(r.code, 0, r.out);
  assert.doesNotMatch(r.out, /approval is for an older head/);
  assert.equal(f.task('ship').reviewVerdict.stale, false);
  assert.deepEqual(f.control().labels, ['unrelated', f.approved], 'An approval of the pushed head is Approved');

  const diverged = f.parent('diverged'); commit(diverged.worktree, { 'change.txt': 'worker\n' }, 'worker change');
  f.control({ head: botPush(diverged, { 'openspec.txt': 'finalized\n' }) });
  const local = commit(diverged.worktree, { 'change.txt': 'unpushed\n' }, 'local change');
  let refused = f.call(['review', 'diverged', '--agent', 'pi']);
  assert.equal(refused.code, 2, refused.out); assert.match(refused.out, /diverged from the pull request/);
  assert.ok(!fs.existsSync(path.join(f.home, 'tasks', 'diverged-review')), 'A refused review launches nothing');
  assert.equal(git('-C', diverged.worktree, 'rev-parse', 'HEAD').trim(), local, 'A diverged copy is left alone');

  const ahead = f.parent('ahead'); commit(ahead.worktree, { 'change.txt': 'worker\n' }, 'worker change');
  const before = botPush(ahead, { 'openspec.txt': 'finalized\n' }); git('-C', ahead.worktree, 'fetch', '-q', 'origin', 'refs/pull/42/head'); git('-C', ahead.worktree, 'merge', '--ff-only', '-q', before);
  commit(ahead.worktree, { 'change.txt': 'unpushed\n' }, 'local change'); f.control({ head: before });
  refused = f.call(['review', 'ahead', '--agent', 'pi']);
  assert.equal(refused.code, 2, refused.out); assert.match(refused.out, /ahead of the pull request: push it first/);
};
gapTests['plain-land-lifecycle-facts'] = () => {
  const f = reviewLabelsFixture('plain-land-facts');
  const url = 'https://github.com/acme/demo/pull/42';
  const ship = f.parent('ship', { pr: url, landed: '2020-01-01T00:00:00Z' }, 'Done.');
  const head = git('-C', ship.worktree, 'rev-parse', 'HEAD').trim();
  const open = recordedRestPr(42, 'feature/ship', 'pull-get-open.json');
  f.save({ ...ship, state: 'closed', prFacts: prObservation(open),
    reviewVerdict: { verdict: 'APPROVE', head, currentHead: head, stale: false, needsReview: false } });
  assert.ok(JSON.parse(f.call(['status', '--json', '--view', 'fleet']).out).tasks.some(t => t.id === ship.id));
  const merged = recordedRestPr(42, 'feature/ship', 'pull-get-merged.json');
  merged.head.sha = head; merged.merged_at = merged.closed_at = new Date(Date.now() - 25 * 3600000).toISOString();
  f.control({ head, prResponse: merged }); const before = f.calls().length;
  const r = f.call(['land', ship.id]); assert.equal(r.code, 0, r.out);
  assert.equal(f.task(ship.id).prFacts.state, 'MERGED', 'repeated plain land must persist the state learned by approval freshness');
  assert.equal(f.task(ship.id).prFacts.mergedAt, merged.merged_at);
  assert.equal(f.task(ship.id).prFacts.closedAt, merged.closed_at); assert.equal(f.task(ship.id).pr, url);
  assert.equal(f.task(ship.id).state, 'closed');
  assert.equal(f.calls().slice(before).filter(c => c.endpoint === 'repos/acme/demo/pulls/42').length, 1, 'reuse the existing read without another request');
  assert.equal(f.writes().length, 0, 'plain land never writes labels on a merged PR');
  assert.ok(!JSON.parse(f.call(['status', '--json', '--view', 'fleet']).out).tasks.some(t => t.id === ship.id), 'offline fleet must omit the now-known old merge');
};

gapTests['review-label-pr-state-failures'] = () => {
  const f = reviewLabelsFixture('pr-state-failures');
  for (const [id, patch] of [['denied', { prDenied: true }], ['invalid', { prResponse: { state: 'unknown' } }], ['timeout', { prDelay: 5000 }]]) {
    f.parent(id); f.control({ prDenied: false, prResponse: null, prDelay: 0, ...patch });
    let at = f.calls().length, started = performance.now();
    const { task, result } = f.start(id);
    assert.equal(task.state, 'working'); assert.equal(f.warnings(result).length, 1, result.out);
    assert.equal(f.calls().slice(at).filter(c => c.endpoint === 'repos/acme/demo/pulls/42').length, 1, 'Failed state reads are never retried');
    assert.ok(performance.now() - started < 8000, 'State reads have a bounded timeout');
    at = f.calls().length; started = performance.now();
    const done = f.done(task, 'APPROVE');
    assert.equal(done.code, 0, done.out); assert.equal(f.task(task.id).state, 'reported'); assert.equal(f.warnings(done).length, 1, done.out);
    assert.equal(f.calls().slice(at).filter(c => c.endpoint === 'repos/acme/demo/pulls/42').length, 1);
    assert.ok(performance.now() - started < 8000);
    assert.deepEqual(f.control().labels, ['unrelated']);
  }
  assert.equal(f.writes().length, 0, 'Unknown PR state never permits label mutations');
  assert.ok(!f.calls().some(c => c.endpoint?.includes('/contents/')), 'Unknown PR state skips manifest lookup');
};
gapTests['review-label-start-done'] = () => {
  const f = reviewLabelsFixture('start-done');
  for (const duringAt of ['variables', 'manifest', 'labels', 'definition']) for (const verdict of ['APPROVE', 'CHANGES NEEDED']) {
    const id = `${duringAt}-${verdict === 'APPROVE' ? 'approve' : 'rework'}`, label = verdict === 'APPROVE' ? f.approved : f.changes;
    f.parent(id); f.control({ labels: ['unrelated', f.oldUnder, f.oldChanges], duringVerdict: verdict, duringAt }); const before = f.calls().length;
    const { task, result } = f.start(id); assert.equal(f.warnings(result).length, 0, result.out);
    assert.equal(task.state, 'reported'); assert.equal(f.control().duringVerdict, null);
    assert.deepEqual(f.control().labels, ['unrelated', label], 'The delayed start must preserve its completed verdict');
    const calls = f.calls().slice(before), writes = calls.filter(c => ['POST', 'DELETE'].includes(c.method));
    const completedAt = calls.findIndex(c => c.saved === 'reported');
    assert.ok(completedAt > 0 && calls.slice(0, completedAt).every(c => c.saved === 'working'), 'Start lookup begins before completion');
    assert.ok(calls.slice(completedAt).every(c => c.saved === 'reported'));
    assert.deepEqual(writes.filter(c => c.method === 'POST').map(c => c.input.labels), [[label]], 'No stale activity POST follows done');
    assert.ok(writes.filter(c => c.method === 'DELETE').every(c => [f.oldUnder, f.oldChanges].includes(decodeURIComponent(c.endpoint.split('/').at(-1)))), 'No stale verdict DELETE follows done');
    assert.equal(writes.filter(c => c.method === 'DELETE').length, 2, 'Each historical assignment is removed once');
  }
};
gapTests['review-label-failures'] = () => {
  const f = reviewLabelsFixture('failures');
  for (const [id, patch] of [['permission', { addDenied: true }], ['network', { addDenied: false, network: true }], ['opt-out', { network: false, enabled: 'FaLsE' }], ['variables', { enabled: 'true', variablesDenied: true }], ['definition', { variablesDenied: false, defined: [] }]]) {
    f.parent(id); f.control({ labels: ['unrelated'], ...patch }); const n = f.calls().length, { task, result } = f.start(id);
    assert.equal(task.state, 'working'); assert.equal(f.warnings(result).length, 1, result.out);
    assert.ok(f.calls().slice(n).every(c => c.saved === 'working'));
    const r = f.done(task, 'APPROVE'); assert.equal(r.code, 0, r.out); assert.equal(f.task(task.id).state, 'reported'); assert.equal(f.warnings(r).length, 1, r.out);
    if (id === 'opt-out' || id === 'variables') assert.ok(!f.calls().slice(n).some(c => ['POST', 'DELETE'].includes(c.method) || c.endpoint?.includes('/contents/')), 'Opt-out or unreadable variables skip manifest reads and writes');
    if (id === 'definition') assert.ok(!f.calls().slice(n).some(c => c.method === 'POST'), 'Missing definitions are never created');
  }
  f.control({ enabled: '', variablesDenied: false, defined: [f.under, f.approved, f.changes] }); f.parent('late-opt-out'); const opted = f.start('late-opt-out').task;
  f.control({ enabled: 'false' }); const at = f.writes().length; const optedResult = f.done(opted, 'APPROVE'); assert.equal(optedResult.code, 0); assert.equal(f.warnings(optedResult).length, 1); assert.equal(f.writes().length, at); assert.ok(f.control().labels.includes(f.under));
  f.control({ enabled: '' }); f.parent('partial'); const t = f.start('partial').task;
  f.control({ defined: [f.under] }); let n = f.calls().length, r = f.done(t, 'CHANGES NEEDED'); assert.equal(r.code, 0, r.out); assert.equal(f.warnings(r).length, 1);
  assert.deepEqual(f.control().labels, ['unrelated'], 'Review is removed even if the verdict definition is missing');
  assert.deepEqual(f.calls().slice(n).filter(c => c.method === 'POST'), []);
  f.control({ defined: [f.under, f.approved, f.changes] }); f.parent('remove'); const review = f.start('remove').task;
  f.control({ removeDenied: true, addDenied: true }); n = f.calls().length; r = f.done(review, 'APPROVE'); assert.equal(r.code, 0, r.out); assert.equal(f.warnings(r).length, 1, 'Multiple errors produce one warning line');
  assert.equal(f.task(review.id).state, 'reported'); assert.ok(f.control().labels.includes(f.under));
  assert.equal(f.calls().slice(n).filter(c => c.method === 'DELETE').length, 1); assert.equal(f.calls().slice(n).filter(c => c.method === 'POST').length, 0, 'Failed removal must not add a conflicting verdict');
  f.control({ addDenied: false, enabled: 'true', labels: ['unrelated', f.approved, f.changes] }); f.parent('old-verdict'); const failedSwap = f.start('old-verdict'); assert.equal(f.warnings(failedSwap.result).length, 1); assert.equal(failedSwap.task.state, 'working');
  f.control({ removeDenied: false }); n = f.calls().length; assert.equal(f.call(['start']).code, 0); assert.equal(f.calls().length, n, 'No retry after failure');
};

try {
  const onlyGaps = process.argv.find(a => a === '--gaps' || a.startsWith('--gaps='));
  for (const [name, test] of Object.entries(gapTests)) if (!onlyGaps || onlyGaps === '--gaps' || onlyGaps === `--gaps=${name}`) { await test(); console.log(`PASS: gap ${name}`); }
  if (!onlyGaps) {
  // The focused fixtures have their own homes and copies, but share the fake Core transport.
  fs.writeFileSync(world, JSON.stringify({ seq: 0, terminals: {}, log: [] }));
  // Status uses spawn time (creation while preparing), freezes settled tasks, and formats
  // elapsed time without contacting Core or depending on the wall clock.
  {
    const statusHome = path.join(root, 'durations'), clock = Date.parse('2026-06-01T12:00:00Z');
    const ago = seconds => new Date(clock - seconds * 1000).toISOString();
    fs.mkdirSync(path.join(statusHome, 'tasks'), { recursive: true });
    fs.writeFileSync(path.join(statusHome, 'crew.json'), JSON.stringify({ version: 1, tag: 'durations', projects: {} }));
    const cases = [
      { id: 'preparing', state: 'preparing', created: ago(45), seconds: 45, text: '45s' },
      { id: 'working', state: 'working', spawned: ago(93784), seconds: 93784, text: '1d 2h' },
      { id: 'minutes', state: 'working', spawned: ago(125), seconds: 125, text: '2m 5s' },
      { id: 'reported', state: 'reported', spawned: ago(200), reported: ago(75), seconds: 125, text: '2m 5s' },
      { id: 'stopped', state: 'stopped', spawned: ago(200), stopped: ago(141), seconds: 59, text: '59s' },
      { id: 'failed', state: 'failed', spawned: ago(7200), updated: ago(3600), seconds: 3600, text: '1h', pr: 'https://example.invalid/acme/demo/pull/8', error: 'delivery failed' },
      { id: 'future', state: 'working', spawned: ago(-60), seconds: 0, text: '0s' },
      { id: 'unknown', state: 'preparing', created: 'invalid', seconds: null, text: '-' },
      { id: 'closed', state: 'closed', spawned: ago(7200), closed: ago(3600), seconds: 3600, text: '1h' },
    ];
    for (const { seconds, text, ...task } of cases) {
      const dir = path.join(statusHome, 'tasks', task.id);
      fs.mkdirSync(dir);
      fs.writeFileSync(path.join(dir, 'task.json'), JSON.stringify({ created: ago(200000), kind: 'ship', agent: 'pi',
        project: 'demo', terminal: null, report: path.join(dir, 'report.md'), ...task }));
    }
    const oldHome = process.env.CREW_HOME, oldNow = Date.now, oldLog = console.log;
    const output = [];
    try {
      process.env.CREW_HOME = statusHome;
      Date.now = () => clock;
      console.log = line => output.push(line);
      main(['status']);
      for (const task of cases.filter(t => t.state !== 'closed')) {
        assert.ok(output.includes(`${task.id}\t${task.state}\tship/pi\tdemo\t-\t${task.text}${task.pr ? `\t${task.pr}` : ''}${task.error ? `\t${task.error}` : ''}`), task.id);
      }
      assert.ok(!output.some(line => line.startsWith('closed\t')), 'Closed tasks stay hidden by default');
      output.length = 0;
      main(['status', '--all', '--json']);
      const tasks = JSON.parse(output[0]).tasks;
      for (const task of cases) {
        assert.equal(tasks.find(t => t.id === task.id).elapsedSeconds, task.seconds, task.id);
        assert.equal(tasks.find(t => t.id === task.id).pr, task.pr ?? null, task.id);
      }
      output.length = 0;
      main(['status', '--all']);
      assert.ok(output.includes('closed\tclosed\tship/pi\tdemo\t-\t1h'), 'Closed duration stays fixed');
    } finally {
      if (oldHome === undefined) delete process.env.CREW_HOME; else process.env.CREW_HOME = oldHome;
      Date.now = oldNow;
      console.log = oldLog;
    }
  }

  fs.mkdirSync(project); git('-C', project, 'init', '-q'); fs.writeFileSync(path.join(project, 'README.md'), 'one\ntwo\n');
  git('-C', project, 'add', '-A'); git('-C', project, '-c', 'user.name=t', '-c', 'user.email=t@example.invalid', 'commit', '-q', '-m', 'init');

  // A home, with coordinator rules any agent reads, and a registered project.
  assert.match(crew(['status'], { cwd: root }).out, /No crew home yet/);
  // With no folder, the home is the per-user one, and crew then works from anywhere.
  assert.match(crew(['init'], { cwd: root }).out, /crew home created: \S*\/user\/\.crew\r?\n/, 'The default home is ~/.crew itself');
  assert.ok(crew(['status'], { cwd: root }).out.includes('/user/.crew - no owner'), 'crew finds the default home from any folder');
  {
    const now = path.join(fakeUser, '.crew'), rules = path.join(now, 'coordinator');
    assert.equal(slash(crew(['home'], { cwd: root }).out.trim()), slash(rules), 'crew home prints the folder the coordinator starts in');
    assert.ok(fs.readFileSync(path.join(rules, 'AGENTS.md'), 'utf8').includes('crew spawn') && !fs.existsSync(path.join(now, 'AGENTS.md')), 'The rules are in their own folder, not above the workers');
    // A home from before 0.7 (~/.crew/crew, earlier ~/.crew/home) keeps working and is unpacked
    // into ~/.crew once, when nobody uses it.
    for (const name of ['crew', 'home']) {
      const old = path.join(now, name);
      fs.rmSync(now, { recursive: true, force: true }); fs.mkdirSync(path.join(old, 'tasks', 'k1'), { recursive: true });
      fs.writeFileSync(path.join(old, 'crew.json'), JSON.stringify({ version: 1, tag: 'old', projects: {} }));
      fs.writeFileSync(path.join(old, 'AGENTS.md'), 'old rules'); fs.writeFileSync(path.join(old, 'CLAUDE.md'), '@AGENTS.md\n'); fs.writeFileSync(path.join(old, 'backlog.md'), 'b\n');
      fs.writeFileSync(path.join(old, 'tasks', 'k1', 'task.json'), JSON.stringify({ id: 'k1', state: 'closed', report: `${slash(old)}/tasks/k1/report.md`, brief: `${slash(old)}/tasks/k1/brief.md`, worktree: 'C:/elsewhere/k1' }));
      assert.ok(crew(['status'], { cwd: root }).out.includes(`.crew/${name} - no owner`), 'The old place still works');
      assert.equal(slash(crew(['home'], { cwd: root }).out.trim()), slash(old), 'An old home is where its coordinator starts');
      assert.equal(crew(['init'], { cwd: root }).code, 2, 'No second default home beside the old one');
      let w0 = readWorld(); w0.terminals.old1 = { address: 'old1', state: 'live', labels: {} }; fs.writeFileSync(world, JSON.stringify(w0));
      fs.writeFileSync(path.join(old, 'owner.json'), JSON.stringify({ terminal: 'old1' }));
      let m = crew(['home', '--ensure'], { cwd: root });
      assert.ok(m.out.includes('for now: a session still holds it') && fs.existsSync(path.join(old, 'crew.json')) && !fs.existsSync(path.join(now, 'crew.json')), m.out);
      w0 = readWorld(); delete w0.terminals.old1; fs.writeFileSync(world, JSON.stringify(w0));
      m = crew(['home', '--ensure'], { cwd: root });
      assert.ok(m.out.includes('the home moved from') && !fs.existsSync(old) && fs.existsSync(path.join(now, 'crew.json')), m.out);
      assert.ok(m.out.split(/\r?\n/).map(slash).includes(slash(rules)), m.out);
      assert.deepEqual([fs.readFileSync(path.join(rules, 'AGENTS.md'), 'utf8'), fs.readFileSync(path.join(now, 'backlog.md'), 'utf8')], ['old rules', 'b\n'], 'Rules go to coordinator/, the rest to ~/.crew');
      const k1 = JSON.parse(fs.readFileSync(path.join(now, 'tasks', 'k1', 'task.json'), 'utf8'));
      assert.deepEqual([k1.report, k1.brief, k1.worktree], [`${slash(now)}/tasks/k1/report.md`, `${slash(now)}/tasks/k1/brief.md`, 'C:/elsewhere/k1'], 'Task records follow the home');
    }
    // Something already in the way: nothing is moved, and the old home stays whole.
    fs.rmSync(now, { recursive: true, force: true }); fs.mkdirSync(path.join(now, 'crew'), { recursive: true }); fs.mkdirSync(path.join(now, 'tasks'));
    fs.writeFileSync(path.join(now, 'crew', 'crew.json'), JSON.stringify({ version: 1, tag: 'old', projects: {} })); fs.mkdirSync(path.join(now, 'crew', 'tasks'));
    let m = crew(['home', '--ensure'], { cwd: root });
    assert.ok(/for now: \S*\/\.crew\/tasks already exists/.test(m.out) && fs.existsSync(path.join(now, 'crew', 'crew.json')) && !fs.existsSync(path.join(now, 'coordinator')), m.out);
    fs.rmSync(now, { recursive: true, force: true });
    m = crew(['home', '--ensure'], { cwd: root });
    assert.ok(m.code === 0 && fs.existsSync(path.join(now, 'crew.json')), 'With no home at all, --ensure creates the default one');
    // Update and crash records from before 0.7 move into state/ when a command uses them, and
    // not before: a command that has nothing to do with them leaves them where they are.
    fs.writeFileSync(path.join(now, 'tool-previous'), 'abc\n'); crew(['home'], { cwd: root });
    assert.ok(fs.existsSync(path.join(now, 'tool-previous')) && !fs.existsSync(path.join(now, 'state')), 'Nothing moves until it is used');
    assert.equal(crew(['rollback'], { cwd: root, env: { CREW_TOOL_ROOT: root } }).code, 2, 'A folder that is no clone has no revision to go back from');
    assert.ok(!fs.existsSync(path.join(now, 'tool-previous')) && fs.readFileSync(path.join(now, 'state', 'previous'), 'utf8') === 'abc\n');
  }
  fs.rmSync(path.join(fakeUser, '.crew'), { recursive: true, force: true });
  assert.equal(crew(['init', homeDir]).code, 0);
  assert.ok(fs.readFileSync(path.join(homeDir, 'coordinator', 'AGENTS.md'), 'utf8').includes('crew spawn'));
  {
    // A workflow task's draft pull request is open from its plan on: the rules finish a task
    // only after land recorded it, never merely because a pull request is open.
    const rules = fs.readFileSync(path.join(homeDir, 'coordinator', 'AGENTS.md'), 'utf8');
    assert.ok(rules.includes('task only once `crew land` has recorded the pull request') && !rules.includes('once the pull request is open'), rules);
    assert.ok(rules.includes('provider or network error') && rules.includes('pass it on to the person afterwards'), rules);
  }
  assert.equal(fs.readFileSync(path.join(homeDir, 'coordinator', 'CLAUDE.md'), 'utf8'), '@AGENTS.md\n');
  assert.equal(crew(['init', homeDir]).code, 2, 'A home is never re-initialised');
  assert.equal(crew(['project', 'add', 'demo', project]).code, 0);
  assert.equal(crew(['project', 'add', 'bad', root]).code, 2, 'Only git repositories are projects');

  // One owner controls work; another session may inspect or safely register projects.
  assert.equal(crew(['spawn', 't1', '--project', 'demo', 'Count the lines.'], { terminal: 'c1' }).code, 3);
  assert.equal(crew(['start']).code, 3, 'start needs a Herdr terminal');
  let w = readWorld(); w.terminals.c1 = { address: 'c1', state: 'live', labels: {} }; w.terminals.c2 = { address: 'c2', state: 'live', labels: {} }; fs.writeFileSync(world, JSON.stringify(w));
  assert.match(crew(['start'], { terminal: 'c1' }).out, /you hold .* \(terminal c1\)/);
  let r = crew(['start'], { terminal: 'c2' }); assert.equal(r.code, 3);
  assert.ok(r.out.includes(`Crew home ${slash(homeDir)} is controlled by terminal c1.`), r.out);
  assert.match(r.out, /Only that coordinator may take ownership of this home; this does not mean a project folder is in use/);
  r = crew(['spawn', 't1', '--project', 'demo', 'x'], { terminal: 'c2' }); assert.equal(r.code, 3); assert.match(r.out, /Crew home .*controlled by terminal c1/);

  // Missing task ids give command-specific usage, including when only --force is passed.
  for (const [args, usage] of [
    [['wait'], 'Usage: crew wait <id> [<id>...] [--timeout seconds]'],
    [['finish'], 'Usage: crew finish <id> [--force]'],
    [['finish', '--force'], 'Usage: crew finish <id> [--force]'],
    [['stop'], 'Usage: crew stop <id> [--force]'],
    [['stop', '--force'], 'Usage: crew stop <id> [--force]'],
    [['done'], 'Usage: crew done [<id>]'],
  ]) {
    const result = crew(args, { terminal: 'c1', env: { CREW_TASK: '' } });
    assert.equal(result.code, 2, args.join(' '));
    assert.ok(result.out.includes(usage), result.out);
  }

  // Spawn: its own working copy, a brief, a labelled terminal started with one instruction.
  for (const bad of [['spawn', 'Bad Id', '--project', 'demo', 'x'], ['spawn', 't1', '--project', 'nope', 'x'], ['spawn', 't1', '--project', 'demo', '--agent', 'vim', 'x'], ['spawn', 't1', '--project', 'demo']]) {
    assert.equal(crew(bad, { terminal: 'c1' }).code, 2, bad.join(' '));
  }
  r = crew(['spawn', 't1', '--project', 'demo', '--agent', 'pi', 'Count the lines of README.md.'], { terminal: 'c1' });
  assert.equal(r.code, 0, r.out); assert.match(r.out, /spawned t1: pi scout in terminal t1/);
  const copies = path.join(root, 'copies', JSON.parse(fs.readFileSync(path.join(homeDir, 'crew.json'), 'utf8')).tag);
  const wt = path.join(copies, 't1');
  assert.ok(!slash(wt).startsWith(slash(homeDir) + '/'), 'A working copy is never inside the home, where the coordinator rules live');
  assert.equal(fs.readFileSync(path.join(wt, 'README.md'), 'utf8').replace(/\r/g, ''), 'one\ntwo\n');
  const call = readWorld().log.find(a => a[0] === 'run');
  for (const want of ['--bg', '--keep', '--no-parent', '--no-notify', 'crew.task=t1', 'crew.kind=scout', 'herdr.right-click=menu']) assert.ok(call.includes(want), want);
  assert.ok(call.some(v => /^herdr\.space=fm-crew-[0-9a-f]+$/.test(v)), 'Workers share one automatic space');
  assert.equal(call[call.indexOf('--cwd') + 1], slash(wt));
  const line = call.at(-1);
  assert.ok(line.includes(`PATH=${shq(bashPath(path.join(here, 'bin')))}`), 'Workers use this root-layout tool bin');
  assert.match(line, /^export CREW_HOME='[^']+' CREW_TASK='t1' PATH='[^']+\/bin':"\$PATH"; 'pi' 'Read the brief at [^']+brief\.md and carry it out exactly\.'; exec bash --login -i$/);
  assert.equal(crew(['spawn', 't1', '--project', 'demo', 'again'], { terminal: 'c1' }).code, 2, 'An id is used once');

  // Done: only the task's own terminal, and only with a report.
  assert.equal(crew(['done', 't1'], { terminal: 't1' }).code, 2, 'No report yet');
  fs.writeFileSync(path.join(homeDir, 'tasks', 't1', 'report.md'), '# Result\n2 lines\n');
  assert.equal(crew(['done', 't1'], { terminal: 'c2' }).code, 3, 'Another terminal cannot report for it');
  assert.equal(crew(['done', 't1'], { terminal: 't1' }).code, 0);
  assert.equal(crew(['done'], { terminal: 't1', env: { CREW_TASK: 't1' } }).code, 0, 'done still accepts CREW_TASK instead of an explicit id');
  r = crew(['wait', 't1'], { terminal: 'c1' }); assert.equal(r.code, 0); assert.match(r.out, /== t1: reported\n# Result\n2 lines/);
  assert.match(crew(['status'], { terminal: 'c2' }).out, /owner c1 \(live, you are read-only\)[\s\S]*t1\treported\tscout\/pi\tdemo\tt1/);

  // A worker whose terminal is gone without a report has failed; a working one is not closed.
  assert.equal(crew(['spawn', 't2', '--project', 'demo', 'x'], { terminal: 'c1' }).code, 0);
  setTerminal('t2', { status: { app: 'pi', state: 'working' } });
  r = crew(['finish', 't2'], { terminal: 'c1' }); assert.equal(r.code, 6); assert.match(r.out, /still working/);
  assert.ok(fs.existsSync(path.join(copies, 't2')), 'A refused finish removes nothing');
  r = crew(['wait', 't2', '--timeout', '1'], { terminal: 'c1' }); assert.equal(r.code, 124); assert.match(r.out, /still working after 1s/);
  // A worker waiting for a person is handed back at once, not waited on.
  setTerminal('t2', { status: { app: 'claude-code', state: 'blocked', kind: 'permission', msg: 'trust this folder' } });
  r = crew(['wait', 't2', '--timeout', '30'], { terminal: 'c1' }); assert.equal(r.code, 7); assert.ok(r.out.includes('== t2: needs a person - trust this folder (terminal t2); it is still running'), r.out);
  assert.ok(crew(['status'], { terminal: 'c1' }).out.includes('t2\tworking'), 'Its task is unchanged');
  setTerminal('t2', { status: { app: 'pi', state: 'working' } });
  setTerminal('t2', { state: 'finished' });
  r = crew(['wait', 't2', '--timeout', '20'], { terminal: 'c1' }); assert.equal(r.code, 0); assert.match(r.out, /== t2: failed - The worker terminal ended without a report/);

  // A reported worker still inside its last turn gets a short grace, then counts as busy.
  setTerminal('t1', { status: { app: 'pi', state: 'working' } });
  r = crew(['finish', 't1'], { terminal: 'c1' }); assert.equal(r.code, 6); assert.match(r.out, /still working/);
  setTerminal('t1', { status: { app: 'pi', state: 'done' } });
  // Finish: terminal and working copy go, the report stays; then the home can be released.
  assert.equal(crew(['finish', 't1'], { terminal: 'c2' }).code, 3);
  r = crew(['finish', 't1'], { terminal: 'c1' }); assert.equal(r.code, 0, r.out);
  assert.ok(!readWorld().terminals.t1 && !fs.existsSync(wt) && fs.existsSync(path.join(homeDir, 'tasks', 't1', 'report.md')));
  assert.equal(crew(['finish', 't2', '--force'], { terminal: 'c1' }).code, 0);
  assert.match(crew(['status'], { terminal: 'c1' }).out, /no unfinished tasks/);
  assert.match(crew(['status', '--all', '--json'], { terminal: 'c1' }).out, /"id":"t1","state":"closed"/);
  assert.equal(crew(['end'], { terminal: 'c2' }).code, 3);
  assert.equal(crew(['end'], { terminal: 'c1' }).code, 0);
  // A dead owner is replaced, and the newcomer is told what was left behind.
  assert.equal(crew(['start'], { terminal: 'c1' }).code, 0); assert.equal(crew(['spawn', 't3', '--project', 'demo', 'x'], { terminal: 'c1' }).code, 0);
  setTerminal('c1', { state: 'finished' });
  r = crew(['start'], { terminal: 'c2' }); assert.equal(r.code, 0); assert.match(r.out, /unfinished tasks: t3\[working\]/);
  assert.equal(crew(['finish', 't3'], { terminal: 'c2' }).code, 0);
  // Claude Code: the instruction comes before its options, and it keeps its permission system.
  assert.equal(crew(['spawn', 'tc', '--project', 'demo', '--agent', 'claude', 'x'], { terminal: 'c2' }).code, 0);
  const claudeLine = readWorld().log.filter(a => a[0] === 'run').at(-1).at(-1);
  assert.ok(claudeLine.includes("'claude' 'Read the brief at ") && claudeLine.includes(" and carry it out exactly.' '--permission-mode' 'auto' '--allowedTools' 'Bash,PowerShell,Read,Edit,Write,Glob,Grep'; crew_exit=$?"), claudeLine);
  assert.ok(claudeLine.includes(" and carry it out exactly.' '--permission-mode' 'acceptEdits' '--allowedTools' 'Bash,PowerShell,Read,Edit,Write,Glob,Grep'; fi; exec bash"), 'An early refusal of auto mode starts it again in acceptEdits');
  assert.ok(!claudeLine.includes('skip-permissions'), 'A worker is never started with its permission checks switched off');
  // Its copy is recorded as trusted in Claude's config, beside what was there; a1/pi copies are not.
  const copyKey = slash(path.join(copies, 'tc'));
  let cc = JSON.parse(fs.readFileSync(claudeConfig, 'utf8'));
  assert.deepEqual(cc.projects[copyKey], { hasTrustDialogAccepted: true, crewWorkerCopy: true });
  assert.deepEqual([cc.theme, cc.projects['C:/mine']], ['dark', { hasTrustDialogAccepted: true, history: [1] }], 'Nothing else in the config is touched');
  assert.deepEqual(Object.keys(cc.projects).length, 2, 'Only the Claude worker got an entry');
  assert.equal(crew(['finish', 'tc', '--force'], { terminal: 'c2' }).code, 0);
  cc = JSON.parse(fs.readFileSync(claudeConfig, 'utf8'));
  assert.deepEqual(Object.keys(cc.projects), ['C:/mine'], 'Finish removes the entry crew made and no other');
  // An installed Claude Code that does not know auto mode: the worker starts in acceptEdits, and the start line says why.
  {
    const oldClaude = path.join(root, 'fake-claude-old.mjs');
    fs.writeFileSync(oldClaude, `const a = process.argv.slice(2);
if (a.includes('--version') && a[a.indexOf('--permission-mode') + 1] === 'auto') { console.error("error: option '--permission-mode <mode>' argument 'auto' is invalid. Allowed choices are acceptEdits, bypassPermissions, default, plan."); process.exit(1); }
console.log('1.0.0 (Claude Code)');`);
    const r = crew(['spawn', 'tv', '--project', 'demo', '--agent', 'claude', 'x'], { terminal: 'c2', env: { CREW_TOOL_CLAUDE: oldClaude } });
    assert.equal(r.code, 0, r.out);
    assert.match(r.out, /spawned tv: claude scout in terminal \S+, .*; auto mode not available \(error: option '--permission-mode <mode>' argument 'auto' is invalid\. .*\), started in acceptEdits/);
    const oldLine = readWorld().log.filter(a => a[0] === 'run').at(-1).at(-1);
    assert.ok(oldLine.includes("'--permission-mode' 'acceptEdits' '--allowedTools' 'Bash,PowerShell,Read,Edit,Write,Glob,Grep'; exec bash") && !oldLine.includes("'auto'") && !oldLine.includes('crew_exit'), oldLine);
    assert.equal(crew(['finish', 'tv', '--force'], { terminal: 'c2' }).code, 0);
  }
  // A config crew cannot parse is never overwritten; the worker still starts.
  fs.writeFileSync(claudeConfig, '{ not json');
  const r2 = crew(['spawn', 'td', '--project', 'demo', '--agent', 'claude', 'x'], { terminal: 'c2' });
  assert.equal(r2.code, 0); assert.match(r2.out, /could not record the working copy as trusted/);
  assert.equal(fs.readFileSync(claudeConfig, 'utf8'), '{ not json');
  // Remove: refused while an unfinished task uses the project; afterwards the entry goes, the folder stays.
  r = crew(['project', 'remove', 'demo'], { terminal: 'c2' }); assert.equal(r.code, 2); assert.match(r.out, /used by unfinished tasks: td\[working\]/);
  assert.match(crew(['project', 'list']).out, /^demo\t/m, 'A refused remove keeps the project');
  assert.equal(crew(['project', 'remove', 'nope'], { terminal: 'c2' }).code, 2, 'Only a registered project can be removed');
  assert.equal(crew(['finish', 'td', '--force'], { terminal: 'c2' }).code, 0);
  r = crew(['project', 'remove', 'demo'], { terminal: 'c2' }); assert.equal(r.code, 0, r.out); assert.match(r.out, /project demo removed/);
  assert.equal(crew(['project', 'list']).out.trim(), '');
  assert.ok(fs.existsSync(path.join(project, 'README.md')), 'The project folder is untouched');
  assert.equal(crew(['spawn', 'te', '--project', 'demo', 'x'], { terminal: 'c2' }).code, 2, 'A removed project cannot be used');

  // --- the five reviewed defects -------------------------------------------------------
  const setWorld = patch => { const w = readWorld(); Object.assign(w, patch); fs.writeFileSync(world, JSON.stringify(w)); };
  const other = path.join(root, 'other'); fs.mkdirSync(other); git('-C', other, 'init', '-q');
  assert.equal(crew(['project', 'add', 'demo', project], { terminal: 'c2' }).code, 0);
  // (4) Registration is shared, but a path replacement still requires explicit consent.
  r = crew(['project', 'add', 'demo', other], { terminal: 'c1' }); assert.equal(r.code, 2); assert.match(r.out, /Pass --replace/);
  r = crew(['project', 'remove', 'not-registered'], { terminal: 'c1' }); assert.equal(r.code, 2); assert.match(r.out, /Unknown project/);
  r = crew(['project', 'add', 'demo', other], { terminal: 'c2' }); assert.equal(r.code, 2); assert.match(r.out, /Pass --replace/);
  assert.equal(crew(['project', 'add', 'demo', project], { terminal: 'c2' }).code, 0, 'Adding the same folder again is not a replacement');
  assert.equal(crew(['spawn', 'f1', '--project', 'demo', '--kind', 'ship', '--agent', 'pi', 'x'], { terminal: 'c2' }).code, 0);
  r = crew(['project', 'add', 'demo', other, '--replace'], { terminal: 'c2' }); assert.equal(r.code, 2); assert.match(r.out, /used by unfinished tasks: f1/);
  const f1 = JSON.parse(fs.readFileSync(path.join(homeDir, 'tasks', 'f1', 'task.json'), 'utf8')), f1copy = path.join(copies, 'f1');

  // (1) A Core that does not answer is not a terminal that is gone: nothing is taken over,
  // failed, stopped or deleted on a failed query.
  setTerminal(f1.terminal, { status: { app: 'pi', state: 'working' } });
  setWorld({ silent: true });
  r = crew(['finish', 'f1'], { terminal: 'c2' }); assert.equal(r.code, 4); assert.match(r.out, /Core did not answer about terminal/);
  assert.ok(fs.existsSync(path.join(f1copy, 'README.md')), 'The busy worker kept its files');
  r = crew(['stop', 'f1', '--force'], { terminal: 'c2' }); assert.equal(r.code, 4);
  r = crew(['wait', 'f1', '--timeout', '7'], { terminal: 'c2' }); assert.equal(r.code, 124, 'An unanswered query does not fail a healthy worker');
  r = crew(['start'], { terminal: 'c1' }); assert.equal(r.code, 4); assert.match(r.out, /was not taken over/);
  assert.equal(JSON.parse(fs.readFileSync(path.join(homeDir, 'owner.json'), 'utf8')).terminal, 'c2');
  setWorld({ silent: false });
  assert.equal(JSON.parse(fs.readFileSync(path.join(homeDir, 'tasks', 'f1', 'task.json'), 'utf8')).state, 'working');

  // (3) stop really stops, and says so only when Core shows the terminal ended.
  setWorld({ unkillable: true });
  r = crew(['stop', 'f1', '--force'], { terminal: 'c2' }); assert.equal(r.code, 6); assert.match(r.out, /not stopped f1: Core still shows the terminal as live/);
  assert.equal(JSON.parse(fs.readFileSync(path.join(homeDir, 'tasks', 'f1', 'task.json'), 'utf8')).state, 'working', 'A stop that did not happen is not recorded');
  setWorld({ unkillable: false });
  r = crew(['stop', 'f1', '--force'], { terminal: 'c2' }); assert.equal(r.code, 0); assert.match(r.out, /stopped f1: cancelled; terminal ended/);
  assert.equal(readWorld().terminals[f1.terminal].state, 'finished');
  assert.equal(JSON.parse(fs.readFileSync(path.join(homeDir, 'tasks', 'f1', 'task.json'), 'utf8')).state, 'stopped');

  // (2) A ship task's uncommitted work is not thrown away by an ordinary finish.
  commit(f1copy, { 'saved.txt': 'kept\n' }, 'Saved work');
  fs.writeFileSync(path.join(f1copy, 'half-done.txt'), 'unsaved');
  r = crew(['finish', 'f1'], { terminal: 'c2' }); assert.equal(r.code, 6); assert.match(r.out, /has uncommitted work .*half-done\.txt/);
  assert.equal(fs.readFileSync(path.join(f1copy, 'half-done.txt'), 'utf8'), 'unsaved');
  assert.equal(crew(['finish', 'f1', '--force'], { terminal: 'c2' }).code, 0);
  assert.ok(!fs.existsSync(f1copy), 'Discarding was asked for');
  assert.ok(git('-C', project, 'branch', '--list', 'feature/f1').includes('feature/f1'), 'The branch stays');
  // A branch whose commits are merged holds nothing more and goes with the working copy.
  assert.equal(crew(['spawn', 'f4', '--project', 'demo', '--kind', 'ship', '--agent', 'pi', 'x'], { terminal: 'c2' }).code, 0);
  commit(path.join(copies, 'f4'), { 'merged.txt': 'in\n' }, 'Merged work'); git('-C', project, 'merge', '-q', '--ff-only', 'feature/f4');
  r = crew(['finish', 'f4', '--force'], { terminal: 'c2' }); assert.equal(r.code, 0, r.out); assert.match(r.out, /; merged branch feature\/f4 deleted/);
  assert.equal(git('-C', project, 'branch', '--list', 'feature/f4').trim(), '', 'A merged branch is deleted');
  // --type names the branch the way the shared delivery workflow does; only a ship task has one.
  r = crew(['spawn', 'f5', '--project', 'demo', '--kind', 'ship', '--type', 'bugfix', '--agent', 'pi', 'x'], { terminal: 'c2' }); assert.equal(r.code, 2); assert.match(r.out, /Unknown type: bugfix/);
  r = crew(['spawn', 'f5', '--project', 'demo', '--type', 'fix', '--agent', 'pi', 'x'], { terminal: 'c2' }); assert.equal(r.code, 2); assert.match(r.out, /Only a ship task has a branch/);
  assert.equal(crew(['spawn', 'f5', '--project', 'demo', '--kind', 'ship', '--type', 'fix', '--agent', 'pi', 'x'], { terminal: 'c2' }).code, 0);
  const f5copy = path.join(copies, 'f5');
  assert.equal(git('-C', f5copy, 'rev-parse', '--abbrev-ref', 'HEAD').trim(), 'fix/f5');
  // A copy marked to keep is not removed unasked. The marker's folder is ignored, as in a delivery repository.
  fs.mkdirSync(path.join(f5copy, '.artifacts')); fs.writeFileSync(path.join(f5copy, '.artifacts', '.gitignore'), '*\n'); fs.writeFileSync(path.join(f5copy, '.artifacts', 'KEEP'), '');
  r = crew(['finish', 'f5'], { terminal: 'c2' }); assert.equal(r.code, 6); assert.match(r.out, /marked to keep by \.artifacts\/KEEP/);
  assert.ok(fs.existsSync(f5copy), 'A kept copy stays');
  r = crew(['finish', 'f5', '--force'], { terminal: 'c2' }); assert.equal(r.code, 0, r.out); assert.match(r.out, /; merged branch fix\/f5 deleted/);
  // A scout's leftovers are scratch.
  assert.equal(crew(['spawn', 'f2', '--project', 'demo', '--agent', 'pi', 'x'], { terminal: 'c2' }).code, 0);
  fs.writeFileSync(path.join(copies, 'f2', 'notes.tmp'), 'x');
  assert.equal(crew(['finish', 'f2'], { terminal: 'c2' }).code, 0);

  // (5) A report accepted while spawn was still waiting for Core is not overwritten.
  fs.writeFileSync(fake, fs.readFileSync(fake, 'utf8').replace("if (a[0] === 'run') {", `if (a[0] === 'run' && w.reportDuringRun) {
  const dir = ${JSON.stringify(path.join(homeDir, 'tasks'))} + '/' + w.reportDuringRun, file = dir + '/task.json';
  const task = JSON.parse(fs.readFileSync(file, 'utf8')); fs.writeFileSync(dir + '/report.md', 'early');
  fs.writeFileSync(file, JSON.stringify({ ...task, state: 'reported', reported: 'early' }));
}
if (a[0] === 'run') {`));
  setWorld({ reportDuringRun: 'f3' });
  assert.equal(crew(['spawn', 'f3', '--project', 'demo', '--agent', 'pi', 'x'], { terminal: 'c2' }).code, 0);
  setWorld({ reportDuringRun: null });
  const f3 = JSON.parse(fs.readFileSync(path.join(homeDir, 'tasks', 'f3', 'task.json'), 'utf8'));
  assert.deepEqual([f3.state, f3.reported, Boolean(f3.terminal)], ['reported', 'early', true]);
  assert.equal(crew(['finish', 'f3'], { terminal: 'c2' }).code, 0);

  // --- crew maintains itself -----------------------------------------------------------
  // A published source (bare), this machine's installed tool (a clone of it) and another
  // machine (a second clone). The small suite fails on an allowlisted broken marker.
  const origin = path.join(root, 'origin.git'), tool = path.join(root, 'tool'), peer = path.join(root, 'peer'), seed = path.join(root, 'seed');
  fs.mkdirSync(seed); git('-C', seed, 'init', '-q', '-b', 'main');
  commit(seed, { 'docs/check.mjs': "import fs from 'node:fs'; process.exit(fs.existsSync('docs/broken') ? 1 : 0);\n", 'docs/tool.txt': 'one\n', 'README.md': 'tool README\n' }, 'seed');
  git('clone', '-q', '--bare', seed, origin); git('clone', '-q', origin, tool); git('clone', '-q', origin, peer);
  for (const folder of [tool, peer]) { git('-C', folder, 'config', 'user.name', 't'); git('-C', folder, 'config', 'user.email', 't@example.invalid'); }
  const selfGh = path.join(root, 'self-gh.mjs'), selfLog = path.join(root, 'self-gh.json');
  fs.writeFileSync(selfLog, '[]');
  fs.writeFileSync(selfGh, `import fs from 'node:fs'; const a = process.argv.slice(2), f = ${JSON.stringify(selfLog)}; fs.writeFileSync(f, JSON.stringify([...JSON.parse(fs.readFileSync(f, 'utf8')), { a, body: a.includes('--body-file') ? fs.readFileSync(a[a.indexOf('--body-file') + 1], 'utf8') : null }])); if (a[1] !== 'list') console.log('https://github.com/acme/crew/pull/1');`);
  const self = { CREW_TOOL_ROOT: tool, CREW_SELFTEST: 'node docs/check.mjs', CREW_GH: selfGh };
  const sm = (args, terminal = 'c2', env = {}) => crew(args, { terminal, env: { ...self, ...env } });
  const head = folder => git('-C', folder, 'rev-parse', 'HEAD').trim();
  const taskOf = id => JSON.parse(fs.readFileSync(path.join(homeDir, 'tasks', id, 'task.json'), 'utf8'));
  const first = head(tool);

  // Malformed registries are refused without a crash. An explicit unexpected fault
  // is written down and points at the repair command (and is attached to the fixer).
  const crashHome = path.join(root, 'crash-home'); fs.mkdirSync(crashHome);
  const crashes = path.join(fakeUser, '.crew', 'state', 'crashes');
  fs.writeFileSync(path.join(crashHome, 'crew.json'), JSON.stringify({ version: 1, tag: 'crash' }));
  r = crew(['project', 'list'], { cwd: crashHome }); assert.equal(r.code, 2, r.out); assert.match(r.out, /invalid.*registry/);
  assert.ok(!fs.existsSync(crashes), 'Malformed input must not produce a crash record');
  fs.writeFileSync(path.join(crashHome, 'crew.json'), JSON.stringify({ version: 1, tag: 'crash', projects: { demo: { path: project } } }));
  r = crew(['project', 'list'], { script: unexpectedListScript(crashHome), cwd: crashHome }); assert.equal(r.code, 70, r.out);
  assert.match(r.out, /internal error[\s\S]*defect in crew itself[\s\S]*crew fix "/);
  const crashFiles = fs.readdirSync(path.join(fakeUser, '.crew', 'state', 'crashes'));
  assert.equal(crashFiles.length, 1);
  assert.match(fs.readFileSync(path.join(fakeUser, '.crew', 'state', 'crashes', crashFiles[0]), 'utf8'), /command: crew project list[\s\S]*TypeError: injected project list failure/);

  // fix: only the owner, one at a time, a ship task on crew's own source with the crash attached.
  assert.equal(sm(['fix', 'x'], 'c1').code, 3);
  assert.equal(sm(['fix']).code, 2);
  r = sm(['fix', '--agent', 'pi', 'crew project list crashed', 'instead of printing nothing']); assert.equal(r.code, 0, r.out);
  assert.match(r.out, /spawned fix-1: pi ship in terminal (t\d+)[\s\S]*next: crew wait fix-1, then crew selfrepair fix-1/);
  const fix1 = taskOf('fix-1'), fixCopy = path.join(copies, 'fix-1');
  assert.ok(readWorld().log.filter(a => a[0] === 'run').at(-1).includes('crew.kind=fix'), 'A fixer is labelled as one');
  assert.deepEqual([fix1.selfFix, fix1.project, fix1.projectPath, fix1.base], [true, 'crew:self', slash(tool), first]);
  const fixBrief = fs.readFileSync(fix1.brief, 'utf8');
  assert.ok(fixBrief.includes('crew project list crashed instead of printing nothing') && fixBrief.includes(crashFiles[0]) && fixBrief.includes('`crew.mjs`') && fixBrief.includes('`node crew.test.mjs`') && fixBrief.includes('Repository infrastructure is out of scope'), fixBrief);
  const homeTag = JSON.parse(fs.readFileSync(path.join(homeDir, 'crew.json'), 'utf8')).tag;
  assert.equal(fix1.branch, `fix/${homeTag}-fix-1`);
  assert.equal(git('-C', fixCopy, 'rev-parse', '--abbrev-ref', 'HEAD').trim(), fix1.branch);
  r = sm(['fix', 'another']); assert.equal(r.code, 2); assert.match(r.out, /already open: fix-1/);

  // selfmerge: every gate refuses and publishes nothing.
  assert.equal(sm(['selfmerge', 'fix-1'], 'c1').code, 3);
  r = sm(['selfmerge', 'fix-1']); assert.equal(r.code, 2); assert.match(r.out, /only after its worker reported/);
  fs.writeFileSync(fix1.report, 'fixed'); assert.equal(crew(['done', 'fix-1'], { terminal: fix1.terminal }).code, 0);
  r = sm(['selfmerge', 'fix-1']); assert.equal(r.code, 6); assert.match(r.out, /changes nothing/);
  fs.writeFileSync(path.join(fixCopy, 'half.txt'), 'x');
  r = sm(['selfmerge', 'fix-1']); assert.equal(r.code, 6); assert.match(r.out, /uncommitted files \(half\.txt\)/);
  fs.rmSync(path.join(fixCopy, 'half.txt'));
  commit(fixCopy, { 'package.json': '{"private":true}\n', 'docs/tool.txt': 'two\n' }, 'too wide');
  r = sm(['selfmerge', 'fix-1']); assert.equal(r.code, 6); assert.match(r.out, /outside crew's own files \(package\.json\)/);
  git('-C', fixCopy, 'reset', '-q', '--hard', 'HEAD~1');
  commit(fixCopy, { 'docs/tool.txt': 'two\n', 'docs/broken': '' }, 'breaks the suite');
  r = sm(['selfmerge', 'fix-1']); assert.equal(r.code, 6); assert.match(r.out, /the test suite fails \(node docs\/check\.mjs, exit 1\)/);
  assert.deepEqual([head(origin), head(tool)], [first, first], 'A refused repair reaches nobody');
  assert.equal(spawnSync('git', ['-C', origin, 'rev-parse', '--verify', `refs/heads/${fix1.branch}`]).status, 128, 'Neither an out-of-scope repair nor a failing suite publishes a branch');
  assert.equal(JSON.parse(fs.readFileSync(selfLog, 'utf8')).length, 0, 'Refusals do not ask GitHub to open a pull request');
  git('-C', fixCopy, 'reset', '-q', '--hard', 'HEAD~1');
  commit(fixCopy, { 'docs/tool.txt': 'two\n', 'README.md': 'repaired root README\n' }, 'the repair');
  // Meanwhile another machine published something else: the repair goes on top of it.
  const theirs = commit(peer, { 'peer.txt': 'theirs\n' }, 'from another machine'); git('-C', peer, 'push', '-q', 'origin', 'HEAD:main');
  r = sm(['selfmerge', 'fix-1']); assert.equal(r.code, 0, r.out);
  assert.match(r.out, /delivered repair fix-1: https:\/\/github.com\/acme\/crew\/pull\/1; tests passed[\s\S]*This machine was not updated/);
  assert.equal(head(origin), theirs, 'Delivery does not move the published main');
  assert.equal(head(tool), first, 'Delivery does not update the installed source');
  const second = head(fixCopy);
  assert.equal(git('-C', origin, 'rev-parse', fix1.branch).trim(), second);
  assert.equal(git('-C', fixCopy, 'rev-parse', 'HEAD~1').trim(), theirs, 'The repair rebases on the other machine\'s published change');
  assert.equal(taskOf('fix-1').pr, 'https://github.com/acme/crew/pull/1');
  assert.equal(taskOf('fix-1').merged, undefined);
  assert.match(sm(['selfrepair', 'fix-1']).out, /already has a pull request/);
  assert.equal(JSON.parse(fs.readFileSync(selfLog, 'utf8')).filter(x => x.a[1] === 'create').length, 1);
  // Simulate the person's merge, then the explicit update that installs the repair.
  git('-C', peer, 'fetch', '-q', 'origin', fix1.branch); git('-C', peer, 'merge', '-q', '--ff-only', 'FETCH_HEAD'); git('-C', peer, 'push', '-q', 'origin', 'HEAD:main');
  assert.equal(sm(['update']).code, 0); assert.equal(head(tool), second);
  assert.equal(fs.readFileSync(path.join(tool, 'docs', 'tool.txt'), 'utf8').replace(/\r/g, ''), 'two\n');
  assert.equal(sm(['finish', 'fix-1']).code, 0);
  assert.equal(git('-C', tool, 'branch', '--list', fix1.branch).trim(), '', 'A published repair leaves no branch behind');
  assert.equal(crew(['spawn', 'no', '--project', 'crew:self', 'x'], { terminal: 'c2' }).code, 2, "crew's own source is not a project for ordinary tasks");

  // rollback: this machine goes back one step and stays there while that revision is the latest.
  r = sm(['rollback']); assert.equal(r.code, 0, r.out); assert.equal(head(tool), first);
  assert.equal(sm(['rollback']).code, 2, 'One step only');
  r = sm(['start'], 'c2', { CREW_AUTO_UPDATE: '1' }); assert.equal(r.code, 0, r.out);
  assert.match(r.out, /crew stays at [0-9a-f]{8} after a rollback/); assert.equal(head(tool), first);
  // A developer's checkout (not the installed copy) never updates itself.
  git('-C', peer, 'pull', '-q', 'origin', 'main'); const third = commit(peer, { 'peer.txt': 'newer\n' }, 'newer'); git('-C', peer, 'push', '-q', 'origin', 'HEAD:main');
  r = sm(['start']); assert.equal(r.code, 0); assert.equal(head(tool), first);
  // Something newer than the bad revision releases the hold; start updates and runs again.
  r = sm(['start'], 'c2', { CREW_AUTO_UPDATE: '1' }); assert.equal(r.code, 0, r.out);
  assert.match(r.out, /crew updated itself [0-9a-f]{8} -> [0-9a-f]{8}[\s\S]*you hold /); assert.equal(head(tool), third);
  assert.match(sm(['update']).out, /crew is up to date/);
  // An unreachable source never blocks a session.
  git('-C', tool, 'remote', 'set-url', 'origin', path.join(root, 'nowhere.git'));
  r = sm(['start'], 'c2', { CREW_AUTO_UPDATE: '1' }); assert.equal(r.code, 0, r.out); assert.match(r.out, /did not check for updates[\s\S]*you hold /);
  assert.equal(sm(['update']).code, 4);
  // A newer crew brings its coordinator rules into an existing home.
  fs.writeFileSync(path.join(homeDir, 'coordinator', 'AGENTS.md'), 'old rules');
  assert.match(crew(['start'], { terminal: 'c2' }).out, /coordinator rules changed/);
  const repairRules = fs.readFileSync(path.join(homeDir, 'coordinator', 'AGENTS.md'), 'utf8').split('## When crew itself is wrong')[1];
  for (const text of ['crew selfrepair', 'wait for their merge', 'crew update', 'After two refused repairs', 'crew rollback']) assert.ok(repairRules.includes(text), text);
  assert.ok(!repairRules.includes('without asking the person')); assert.equal((repairRules.match(/crew selfmerge/g) || []).length, 1);

  // --- follow-ups, review and delivery ---------------------------------------------------
  assert.deepEqual(['https://github.com/acme/tool.git', 'git@github.com:acme/tool', 'https://github.com/acme/tool/', path.join(root, 'x.git')].map(githubOwner), ['acme', 'acme', 'acme', null]);
  const fakeGh = path.join(root, 'fake-gh.mjs'), ghLog = path.join(root, 'gh-log.json'), ghDown = path.join(root, 'gh-down'), ghMerged = path.join(root, 'gh-merged');
  fs.writeFileSync(ghLog, '[]');
  fs.writeFileSync(fakeGh, `import fs from 'node:fs';
const a = process.argv.slice(2), file = ${JSON.stringify(ghLog)}, log = JSON.parse(fs.readFileSync(file, 'utf8'));
log.push({ a, body: a.includes('--body-file') ? fs.readFileSync(a[a.indexOf('--body-file') + 1], 'utf8') : null }); fs.writeFileSync(file, JSON.stringify(log));
if (a[0] === 'auth') process.exit(1);
if (fs.existsSync(${JSON.stringify(ghDown)})) { console.error('gh: not signed in'); process.exit(1); }
if (a[0] === 'pr' && a[1] === 'list') { console.log(fs.existsSync(${JSON.stringify(ghMerged)}) ? fs.readFileSync(${JSON.stringify(ghMerged)}, 'utf8') : ''); process.exit(0); }
if (a[0] === 'api' && a.includes('graphql')) { const number = a.find(x => x.startsWith('number=')).slice(7); console.log(JSON.stringify({ data: { repository: { nameWithOwner: 'acme/demo', pullRequests: {totalCount:11}, pullRequest: { url: 'https://github.com/acme/demo/pull/'+number, state: 'OPEN', mergedAt: null, closedAt: null, isDraft: true, body: '## Proposal\\n\\nWhy.\\n\\n## Implementation\\n\\n- [x] The first outcome is delivered.\\n- [ ] The second outcome is delivered.\\n\\n## Acceptance\\n\\n- [ ] not an outcome\\n' } } } })); process.exit(0); }
console.log('https://example.invalid/acme/demo/pull/7');
`);
  const own = (args, terminal = 'c2') => crew(args, { terminal, env: { CREW_GH: fakeGh } });
  assert.equal(own(['spawn', 's1', '--project', 'demo', '--kind', 'ship', '--agent', 'pi', 'Change the readme.']).code, 0);
  assert.equal(own(['spawn', 's2', '--project', 'demo', '--agent', 'pi', 'Look.']).code, 0);
  const s1 = taskOf('s1'), s1copy = path.join(copies, 's1');
  // tell: only the owner, only a worker that is there and not waiting for a person.
  assert.equal(own(['tell', 's1']).code, 2); assert.equal(own(['tell', 's1', 'x'], 'c1').code, 3);
  assert.equal(own(['tell', 't1', 'x']).code, 2, 'A closed task has no worker');
  setTerminal(s1.terminal, { status: { app: 'pi', state: 'blocked', msg: 'allow?' } });
  assert.equal(own(['tell', 's1', 'x']).code, 7);
  setTerminal(s1.terminal, { status: { app: 'pi', state: 'working' } });
  r = own(['tell', 's1', 'Keep the first line.']); assert.equal(r.code, 0, r.out); assert.match(r.out, /told s1; next: crew wait s1/);
  let sent = readWorld().log.filter(a => a[0] === 'send').at(-1);
  assert.equal(sent[1], s1.terminal); assert.ok(sent[2].includes('Keep the first line.') && sent[2].includes('crew done s1'), sent[2]);
  // Nothing is reviewed or delivered before the worker reported, and a scout has no branch.
  for (const verb of ['review', 'land']) { assert.equal(own([verb]).code, 2); assert.equal(own([verb, 's1']).code, 2, verb); assert.equal(own([verb, 's2']).code, 2, verb); assert.equal(own([verb, 's1'], 'c1').code, 3); }
  commit(s1copy, { 'README.md': 'one\ntwo\nthree\n' }, 'Add a third line');
  fs.writeFileSync(s1.report, '# Done\nAdded a line.\n'); assert.equal(crew(['done', 's1'], { terminal: s1.terminal }).code, 0);
  // A follow-up reopens a reported task; the same worker reports again.
  assert.equal(own(['tell', 's1', 'Also say why.']).code, 0);
  assert.deepEqual([taskOf('s1').state, taskOf('s1').tells], ['working', 2]);
  assert.equal(own(['land', 's1']).code, 2, 'Reopened work is not delivered');
  assert.equal(crew(['done', 's1'], { terminal: s1.terminal }).code, 0);
  // review: a read-only task for another worker, pointed at the branch.
  r = own(['review', 's1', '--agent', 'vim']); assert.equal(r.code, 2);
  r = own(['review', 's1']); assert.equal(r.code, 0, r.out); assert.match(r.out, /spawned s1-review: pi scout[\s\S]*next: crew wait s1-review/);
  const review = taskOf('s1-review');
  assert.ok(readWorld().log.filter(a => a[0] === 'run').at(-1).includes('crew.kind=review'), 'A reviewer is labelled as one');
  assert.deepEqual([review.kind, review.reviews, review.project], ['scout', 's1', 'demo']);
  assert.ok(fs.readFileSync(review.brief, 'utf8').includes(`git diff HEAD...${review.reviewHead}`) && fs.readFileSync(review.brief, 'utf8').includes('`APPROVE` or `CHANGES NEEDED`'));
  assert.match(own(['review', 's1', '--agent', 'claude']).out, /spawned s1-review-2: claude scout/);
  // land: refused with unsaved work, without a place to push to, and honest when GitHub says no.
  fs.writeFileSync(path.join(s1copy, 'loose.txt'), 'x');
  r = own(['land', 's1']); assert.equal(r.code, 6); assert.match(r.out, /uncommitted files \(loose\.txt\)/);
  fs.rmSync(path.join(s1copy, 'loose.txt'));
  r = own(['land', 's1']); assert.equal(r.code, 6); assert.match(r.out, /no `origin` to push to/);
  const projectOrigin = path.join(root, 'project-origin.git'); git('clone', '-q', '--bare', project, projectOrigin); git('-C', project, 'remote', 'add', 'origin', projectOrigin);
  const baseBranch = git('-C', project, 'rev-parse', '--abbrev-ref', 'HEAD').trim();
  fs.writeFileSync(ghDown, '');
  r = own(['land', 's1']); assert.equal(r.code, 4); assert.match(r.out, /branch feature\/s1 is pushed, but the pull request was not opened \(gh: not signed in\)/);
  assert.equal(git('-C', projectOrigin, 'rev-parse', 'feature/s1').trim(), head(s1copy), 'The branch is published');
  assert.equal(taskOf('s1').pr, undefined);
  fs.rmSync(ghDown);
  r = own(['land', 's1']); assert.equal(r.code, 0, r.out);
  assert.ok(r.out.includes(`delivered s1: https://example.invalid/acme/demo/pull/7 (against ${baseBranch}, 1 commit)`), r.out);
  const made = JSON.parse(fs.readFileSync(ghLog, 'utf8')).at(-1);
  assert.deepEqual(made.a.slice(0, 8), ['pr', 'create', '--base', baseBranch, '--head', 'feature/s1', '--title', 'Add a third line']);
  assert.match(made.body, /# Done\nAdded a line\.[\s\S]*crew task `s1` \(pi\), 1 commit/);
  assert.equal(taskOf('s1').pr, 'https://example.invalid/acme/demo/pull/7');
  r = own(['status', '--json']); assert.equal(r.code, 0, r.out);
  assert.equal(JSON.parse(r.out).tasks.find(t => t.id === 's1').pr, 'https://example.invalid/acme/demo/pull/7');
  r = own(['status']); assert.equal(r.code, 0, r.out);
  assert.match(r.out, /^s1\t[^\r\n]*\thttps:\/\/example\.invalid\/acme\/demo\/pull\/7\r?$/m);
  assert.match(own(['land', 's1', '--title', 'x']).out, /already has a pull request/);
  for (const id of ['s1-review', 's1-review-2', 's2', 's1']) assert.equal(own(['finish', id, '--force']).code, 0, id);
  assert.ok(git('-C', project, 'branch', '--list', 'feature/s1').includes('feature/s1'), 'A branch whose pull request is not merged stays');
  // A squash merge leaves no ancestry: GitHub's merged pull request with this exact head counts.
  assert.equal(own(['spawn', 'm1', '--project', 'demo', '--kind', 'ship', '--agent', 'pi', 'x']).code, 0);
  const m1head = commit(path.join(copies, 'm1'), { 'squashed.txt': 'x\n' }, 'Squashed work');
  fs.writeFileSync(ghMerged, JSON.stringify([{ headRefOid: 'another-commit', state: 'MERGED' }]));
  assert.equal(own(['spawn', 'm2', '--project', 'demo', '--kind', 'ship', '--agent', 'pi', 'x']).code, 0);
  commit(path.join(copies, 'm2'), { 'later.txt': 'x\n' }, 'Work after the merged head');
  r = own(['finish', 'm2', '--force']); assert.equal(r.code, 0, r.out); assert.ok(!r.out.includes('deleted'), r.out);
  assert.ok(git('-C', project, 'branch', '--list', 'feature/m2').includes('feature/m2'), 'Commits the merged pull request did not have keep the branch');
  fs.writeFileSync(ghMerged, JSON.stringify([{ headRefOid: m1head, url: 'https://github.com/acme/demo/pull/21', state: 'MERGED', mergedAt: '2026-01-01T12:00:00Z', closedAt: '2026-01-01T12:00:00Z' }]));
  r = own(['finish', 'm1', '--force']); assert.equal(r.code, 0, r.out); assert.match(r.out, /; merged branch feature\/m1 deleted/);
  assert.equal(git('-C', project, 'branch', '--list', 'feature/m1').trim(), '');
  assert.equal(taskOf('m1').prFacts.mergedAt, '2026-01-01T12:00:00Z');
  assert.equal(taskOf('m2').prFacts, undefined, 'wrong head cannot supply merge proof or lifecycle facts');
  fs.rmSync(ghMerged);

  // --- optional companion tools ---------------------------------------------------------
  assert.deepEqual(TOOLS.map(t => t.id), ['gh', 'gh-axi', 'chrome-devtools-axi', 'lavish-axi', 'tasks-axi', 'quota-axi', 'delivery', 'treehouse', 'no-mistakes', 'jq']);
  const fakeTasks = path.join(root, 'fake-tasks-axi.mjs'), fakeTree = path.join(root, 'fake-treehouse.mjs'), fakeVersion = path.join(root, 'fake-version.mjs');
  const treeLog = path.join(root, 'treehouse-log.json'), poolDir = path.join(root, 'pool');
  fs.writeFileSync(fakeVersion, "console.log('tool version v1.106.1');\n");
  // A backlog like tasks-axi keeps it: one "- [ ] <id> - <title> (<state>)" line per item.
  fs.writeFileSync(fakeTasks, `import fs from 'node:fs';
const a = process.argv.slice(2);
if (a[0] === '--version') { console.log('0.2.6'); process.exit(0); }
if (a[0] === '--help') { console.log('usage: tasks-axi [command] [args] [flags]'); process.exit(0); }
const file = a[a.indexOf('--file') + 1], lines = fs.existsSync(file) ? fs.readFileSync(file, 'utf8').split('\\n').filter(Boolean) : [];
const at = lines.findIndex(l => l.startsWith('- [ ] ' + a[1] + ' ') || l.startsWith('- [x] ' + a[1] + ' '));
const save = () => fs.writeFileSync(file, lines.join('\\n') + '\\n');
if (a[0] === 'add') { lines.push('- [ ] ' + a[1] + ' - ' + a[2] + ' (queued)'); save(); console.log('ok: added ' + a[1] + ' -> Queued'); }
else if (a[0] === 'list') console.log(lines.join('\\n'));
else if (at < 0) { console.error('error: "Task not found in this backlog"'); process.exit(1); }
else if (a[0] === 'start') { lines[at] = lines[at].replace('(queued)', '(in flight)'); save(); console.log('ok: start ' + a[1] + ' -> In flight'); }
else if (a[0] === 'done') { lines[at] = lines[at].replace('- [ ]', '- [x]').replace('(in flight)', '(done' + (a.includes('--pr') ? ' ' + a[a.indexOf('--pr') + 1] : '') + ')'); save(); console.log('ok: done ' + a[1] + ' -> Done'); }
`);
  // A pool like treehouse's: \`get --lease --json\` hands out a slot outside the repository.
  fs.writeFileSync(treeLog, '[]');
  fs.writeFileSync(fakeTree, `import fs from 'node:fs'; import path from 'node:path'; import { spawnSync } from 'node:child_process';
const a = process.argv.slice(2), file = ${JSON.stringify(treeLog)}, log = JSON.parse(fs.readFileSync(file, 'utf8'));
log.push({ a, cwd: process.cwd() }); fs.writeFileSync(file, JSON.stringify(log));
if (a[0] === '--version') console.log('v3.1.8');
else if (a[0] === 'get') {
  const slot = path.join(${JSON.stringify(poolDir)}, String(log.length), 'demo'), b = a.indexOf('-b');
  const r = spawnSync('git', ['worktree', 'add', ...(b < 0 ? ['--detach'] : ['-b', a[b + 1]]), slot, 'HEAD'], { encoding: 'utf8' });
  if (r.status !== 0) { console.error(r.stderr); process.exit(1); }
  console.error('Leased worktree'); console.log(JSON.stringify({ path: slot, lease_id: 'x' }));
} else if (a[0] === 'return' && fs.existsSync(${JSON.stringify(path.join(root, 'pool-stuck'))})) { console.error('foreign process remains'); process.exit(1); }
else if (a[0] === 'return') spawnSync('git', ['-C', a.at(-1), 'checkout', '-q', '--detach']);
`);
  const T = { CREW_GH: fakeGh, CREW_TOOL_TASKS_AXI: fakeTasks, CREW_TOOL_TREEHOUSE: fakeTree, CREW_TOOL_NO_MISTAKES: fakeVersion };
  const tl = (args, terminal = 'c2', env = T) => crew(args, { terminal, env });
  // tools: what is here and what crew does with it; nothing is required.
  r = crew(['tools'], { terminal: 'c2' }); assert.equal(r.code, 0);
  assert.equal(r.out.split('\n').filter(l => l.includes('not installed')).length, TOOLS.length, r.out); assert.match(r.out, /Missing tools are optional/);
  const seen = JSON.parse(tl(['tools', '--json']).out).tools;
  assert.deepEqual(seen.filter(t => t.installed).map(t => [t.id, t.version]), [['tasks-axi', '0.2.6'], ['treehouse', '3.1.8'], ['no-mistakes', '1.106.1']]);

  // backlog: kept in the home by tasks-axi; reading is free, changing it is the owner's.
  assert.equal(crew(['backlog'], { terminal: 'c2' }).code, 4, 'No tasks-axi, no backlog');
  assert.equal(tl(['backlog', 'add', 'b1', 'Count the lines'], 'c1').code, 3);
  r = tl(['backlog', 'add', 'b1', 'Count the lines']); assert.equal(r.code, 0, r.out); assert.match(r.out, /ok: added b1 -> Queued/);
  tl(['backlog', 'add', 'g1', 'Ship through the gate']);
  assert.match(tl(['backlog'], 'c1').out, /- \[ \] b1 - Count the lines \(queued\)/);
  assert.equal(tl(['backlog', 'start', 'nope']).code, 1, "tasks-axi's own refusal is passed on");
  // Help is a question: it reaches nothing. (Seen live: `crew done --help` was read as a task id.)
  for (const cmd of ['done', 'finish', 'spawn', 'fix', 'land']) { r = tl([cmd, '--help'], 'c1'); assert.equal(r.code, 0, cmd); assert.match(r.out, /crew spawn <id> --project/); }
  r = tl(['backlog', '--help'], 'c1'); assert.equal(r.code, 0, r.out); assert.ok(!r.out.includes('backlog.md'), 'Its help is asked without the file flag');
  // A task named like a backlog item moves it; any other task leaves the backlog alone.
  r = tl(['spawn', 'b1', '--project', 'demo', '--agent', 'pi', 'Count.'], 'c2', { ...T, CREW_TOOL_GH_AXI: fakeVersion, CREW_TOOL_JQ: fakeVersion });
  assert.equal(r.code, 0, r.out); assert.match(r.out, /backlog: start b1 -> In flight/);
  const b1 = taskOf('b1'), b1brief = fs.readFileSync(b1.brief, 'utf8');
  assert.ok(b1brief.includes('## Tools on this machine') && b1brief.includes('`gh-axi --help`') && b1brief.includes('`jq`') && !b1brief.includes('chrome-devtools-axi'), b1brief);
  r = tl(['spawn', 'b2', '--project', 'demo', '--agent', 'pi', 'Count.']); assert.equal(r.code, 0); assert.ok(!r.out.includes('backlog:'));
  assert.ok(!fs.readFileSync(taskOf('b2').brief, 'utf8').includes('Tools on this machine'), 'No tool, no hint');
  fs.writeFileSync(b1.report, 'two'); assert.equal(crew(['done', 'b1'], { terminal: b1.terminal }).code, 0);
  r = tl(['finish', 'b1']); assert.equal(r.code, 0, r.out); assert.match(r.out, /backlog: done b1 -> Done/);
  assert.match(fs.readFileSync(path.join(homeDir, 'backlog.md'), 'utf8'), /- \[x\] b1 - Count the lines \(done\)/);
  assert.equal(tl(['finish', 'b2', '--force']).code, 0);

  // delivery: where the shared delivery workflow is installed it makes and takes back the copies,
  // and crew does not know whether one is a pool slot or a new folder.
  const TEMPLATE = '# Agent instructions\n\nThis file is `templates/AGENTS.md` of `owner/workflows`, identical in every repository that uses it.\n';
  const fakeDelivery = path.join(root, 'fake-delivery.mjs'), deliveryLog = path.join(root, 'delivery-log.json'), stuck = path.join(root, 'pool-stuck');
  fs.writeFileSync(deliveryLog, '[]');
  fs.writeFileSync(fakeDelivery, `import fs from 'node:fs'; import path from 'node:path'; import { spawnSync } from 'node:child_process';
const a = process.argv.slice(2), file = ${JSON.stringify(deliveryLog)}, log = JSON.parse(fs.readFileSync(file, 'utf8'));
log.push({ a, cwd: process.cwd() }); fs.writeFileSync(file, JSON.stringify(log));
const git = (...args) => spawnSync('git', args, { encoding: 'utf8' });
if (a[0] === 'start') {
  const detach = a.indexOf('--detach'), branch = detach < 0 ? a[1] : null;
  const listed = git('worktree', 'list', '--porcelain').stdout.split(/\\r?\\n\\r?\\n/).map(b => ({ path: /^worktree (.*)$/m.exec(b)?.[1], branch: /^branch refs\\/heads\\/(.*)$/m.exec(b)?.[1] }));
  const existing = branch ? listed.find(w => w.branch === branch) : null;
  if (existing) { console.log(JSON.stringify({ path: existing.path, branch, created: false, pooled: true })); process.exit(0); }
  const slot = path.join(${JSON.stringify(poolDir)}, String(log.length), 'demo');
  const r = git('worktree', 'add', ...(branch ? ['-b', branch] : ['--detach']), slot, 'HEAD');
  if (r.status !== 0) { console.error(r.stderr); process.exit(2); }
  console.error('started in a pool slot'); console.log(JSON.stringify({ path: slot, branch, created: true, pooled: true }));
} else if (a[0] === 'finish') {
  if (fs.existsSync(${JSON.stringify(stuck)})) { console.log('kept ' + a[1] + ': the worktree is locked. Nothing was removed.'); process.exit(1); }
  git('-C', a[1], 'reset', '-q', '--hard'); git('-C', a[1], 'clean', '-qfd'); git('-C', a[1], 'checkout', '-q', '--detach');
  console.log('finished ' + a[1] + ': slot returned to the pool');
} else if (a[0] === 'instructions') {
  // Like the real one: a match only for the template exactly, a list of differences otherwise.
  const text = fs.existsSync('AGENTS.md') ? fs.readFileSync('AGENTS.md', 'utf8') : null;
  if (text === ${JSON.stringify(TEMPLATE)}) console.log('Agent instructions match the shared template.');
  else { console.log(text === null ? 'AGENTS.md is missing' : 'AGENTS.md differs from the shared template'); process.exit(1); }
}
`);
  const D = { ...T, CREW_TOOL_DELIVERY: fakeDelivery }, dl = args => tl(args, 'c2', D);
  const calls = () => JSON.parse(fs.readFileSync(deliveryLog, 'utf8'));
  // Pooled copies are no longer a choice per project: the old flag is accepted and ignored.
  r = tl(['project', 'add', 'pooled', project, '--treehouse']); assert.equal(r.code, 0, r.out); assert.match(r.out, /--treehouse is no longer a project choice/);
  assert.match(tl(['project', 'list']).out, /^pooled\t[^\t\r\n]*\r?$/m);
  r = dl(['spawn', 'p1', '--project', 'pooled', '--kind', 'ship', '--type', 'fix', '--agent', 'pi', 'Change it.']); assert.equal(r.code, 0, r.out); assert.match(r.out, /\(pool slot\)/);
  const p1 = taskOf('p1');
  assert.deepEqual([p1.via, p1.pooled, p1.branch], ['delivery', true, 'fix/p1']); assert.ok(p1.worktree.startsWith(slash(poolDir)) && p1.worktree.endsWith('/demo'), p1.worktree);
  assert.equal(git('-C', p1.worktree, 'rev-parse', '--abbrev-ref', 'HEAD').trim(), 'fix/p1');
  assert.equal(readWorld().log.filter(a => a[0] === 'run').at(-1)[readWorld().log.filter(a => a[0] === 'run').at(-1).indexOf('--cwd') + 1], p1.worktree);
  const asked = calls().find(e => e.a[0] === 'start');
  assert.deepEqual(asked.a, ['start', 'fix/p1', '--json']); assert.equal(slash(asked.cwd).toLowerCase(), slash(fs.realpathSync(project)).toLowerCase());
  // A copy that was already there belongs to other work: the task fails and the copy is left alone.
  git('-C', project, 'worktree', 'add', '-q', '-b', 'feature/taken', path.join(root, 'taken'), 'HEAD');
  r = dl(['spawn', 'taken', '--project', 'pooled', '--kind', 'ship', '--agent', 'pi', 'x']); assert.equal(r.code, 5); assert.match(r.out, /feature\/taken already has a working copy at .*; it was left alone/);
  assert.equal(taskOf('taken').state, 'failed'); assert.ok(fs.existsSync(path.join(root, 'taken')) && !calls().some(e => e.a[0] === 'finish'));
  // A failure after stopping closes the task with a durable postponed return, not a dead worker on an open task.
  fs.writeFileSync(stuck, '');
  r = dl(['finish', 'p1']); assert.equal(r.code, 0); assert.match(r.out, /delivery did not take the working copy back \(kept .*the worktree is locked/);
  assert.equal(taskOf('p1').state, 'closed'); assert.ok(taskOf('p1').copyToReturn, 'A failed return remains retryable');
  fs.rmSync(stuck);
  r = dl(['finish', 'p1']); assert.equal(r.code, 0, r.out); assert.match(r.out, /working copy returned to the pool/);
  assert.deepEqual(calls().at(-1).a, ['finish', p1.worktree, '--force']);
  assert.equal(taskOf('p1').state, 'closed');
  assert.match(r.out, /; merged branch fix\/p1 deleted/); assert.equal(git('-C', project, 'branch', '--list', 'fix/p1').trim(), '', 'A returned slot leaves no merged branch behind');
  // A scout gets a copy without a branch, and its leftovers go with it.
  assert.equal(dl(['spawn', 'p2', '--project', 'pooled', '--agent', 'pi', 'Look.']).code, 0);
  assert.deepEqual(calls().filter(e => e.a[0] === 'start').at(-1).a, ['start', '--detach', 'p2', '--json']);
  fs.writeFileSync(path.join(taskOf('p2').worktree, 'notes.tmp'), 'x');
  assert.equal(dl(['finish', 'p2']).code, 0); assert.ok(!fs.existsSync(path.join(taskOf('p2').worktree, 'notes.tmp')));
  // A ship task's unsaved work is still crew's own refusal, before delivery is asked.
  assert.equal(dl(['spawn', 'p3', '--project', 'pooled', '--kind', 'ship', '--agent', 'pi', 'x']).code, 0);
  fs.writeFileSync(path.join(taskOf('p3').worktree, 'half.txt'), 'x'); const askedSoFar = calls().length;
  r = dl(['finish', 'p3']); assert.equal(r.code, 6); assert.match(r.out, /has uncommitted work .*half\.txt/); assert.equal(calls().length, askedSoFar);
  assert.equal(dl(['finish', 'p3', '--force']).code, 0);
  // A task from before 0.8 whose project took its copies from treehouse is still given back to it.
  assert.equal(tl(['spawn', 'p4', '--project', 'pooled', '--agent', 'pi', 'Look.']).code, 0);
  { const file = path.join(homeDir, 'tasks', 'p4', 'task.json'); fs.writeFileSync(file, JSON.stringify({ ...JSON.parse(fs.readFileSync(file, 'utf8')), pool: 'treehouse' })); }
  r = tl(['finish', 'p4']); assert.equal(r.code, 0, r.out); assert.match(r.out, /working copy returned to treehouse/);
  assert.deepEqual(JSON.parse(fs.readFileSync(treeLog, 'utf8')).at(-1).a, ['return', '--force', taskOf('p4').worktree]);
  // Such a task's reported scout moves its backlog item even after a review, as it always did.
  tl(['backlog', 'add', 'p5', 'Look at the legacy pool']);
  assert.equal(tl(['spawn', 'p5', '--project', 'pooled', '--agent', 'pi', 'Look.']).code, 0);
  { const file = path.join(homeDir, 'tasks', 'p5', 'task.json'); fs.writeFileSync(file, JSON.stringify({ ...JSON.parse(fs.readFileSync(file, 'utf8')), pool: 'treehouse', reviews: 1 })); }
  fs.writeFileSync(taskOf('p5').report, 'seen'); assert.equal(crew(['done', 'p5'], { terminal: taskOf('p5').terminal }).code, 0);
  r = tl(['finish', 'p5']); assert.equal(r.code, 0, r.out); assert.match(r.out, /working copy returned to treehouse[\s\S]*backlog: done p5 -> Done/);

  // The shared delivery workflow: a repository that carries its instructions is delivered its
  // own way. The worker plans in a draft pull request; crew never pushes or opens one for it.
  assert.equal(p1.workflow, undefined, 'A copy without the shared instructions is a plain one');
  assert.ok(fs.readFileSync(p1.brief, 'utf8').includes('Do not push or open a pull request unless'));
  commit(project, { 'AGENTS.md': TEMPLATE }, 'Use the shared workflow');
  r = dl(['spawn', 'w1', '--project', 'pooled', '--kind', 'ship', '--agent', 'pi', 'Add a feature.']); assert.equal(r.code, 0, r.out);
  assert.match(r.out, /follows the repository's delivery workflow/);
  const w1 = taskOf('w1'), w1brief = fs.readFileSync(w1.brief, 'utf8');
  assert.equal(w1.workflow, 'delivery');
  assert.deepEqual(calls().filter(e => e.a[0] === 'instructions').map(e => slash(e.cwd).toLowerCase()).at(-1), slash(w1.worktree).toLowerCase(), 'Decided in the copy the worker gets');
  assert.ok(w1brief.includes('`change-delivery` skill') && w1brief.includes('`delivery start feature/w1`') && w1brief.includes('`Plan: <pull request link>`') && !w1brief.includes('Do not push or open a pull request'), w1brief);
  const ghCalls = () => JSON.parse(fs.readFileSync(ghLog, 'utf8')).map(e => e.a);
  // Its first report is a plan: status says so, and land refuses it until the plan is approved.
  fs.writeFileSync(w1.report, 'Plan: https://github.com/acme/demo/pull/11\n\nTwo outcomes.\n');
  assert.equal(crew(['done', 'w1'], { terminal: w1.terminal }).code, 0);
  assert.deepEqual([taskOf('w1').stage, taskOf('w1').pr], ['plan', 'https://github.com/acme/demo/pull/11']);
  assert.match(dl(['status']).out, /^w1\treported \(plan awaiting approval\)\t[^\r\n]*\thttps:\/\/github\.com\/acme\/demo\/pull\/11\r?$/m);
  assert.equal(JSON.parse(dl(['status', '--json']).out).tasks.find(t => t.id === 'w1').stage, 'plan');
  r = dl(['land', 'w1']); assert.equal(r.code, 6); assert.match(r.out, /plan awaiting approval[\s\S]*crew tell w1 "approved, implement"/);
  assert.equal(taskOf('w1').landed, undefined);
  r = dl(['tell', 'w1', 'approved, implement']); assert.equal(r.code, 0, r.out);
  assert.match(dl(['status']).out, /^w1\tworking \(plan\)\t/m);
  // The implementation report: land records the pull request and reads its state, and nothing else.
  commit(w1.worktree, { 'feature.txt': 'x\n' }, 'feat: add a feature');
  fs.writeFileSync(w1.report, 'Implementation: https://github.com/acme/demo/pull/11\n\nDone.\n');
  assert.equal(crew(['done', 'w1'], { terminal: w1.terminal }).code, 0);
  assert.match(dl(['status']).out, /^w1\treported \(implementation\)\t/m);
  // Delivered means pushed: a branch the worker never pushed, or a commit it did not push, is refused.
  const workerPush = (copy, branch) => git('-C', copy, 'push', '-q', 'origin', `HEAD:refs/heads/${branch}`);
  r = dl(['land', 'w1']); assert.equal(r.code, 6); assert.match(r.out, /branch feature\/w1 is not pushed\. Tell the worker: crew tell w1 "push your branch/);
  workerPush(w1.worktree, 'feature/w1'); const pushedW1 = head(w1.worktree);
  commit(w1.worktree, { 'late.txt': 'x\n' }, 'fix: a late fix');
  r = dl(['land', 'w1']); assert.equal(r.code, 6); assert.match(r.out, /its copy has 1 commit that the pushed branch feature\/w1 lacks\. Tell the worker: crew tell w1 "push your last commits/);
  assert.equal(taskOf('w1').landed, undefined);
  assert.equal(git('-C', projectOrigin, 'rev-parse', 'feature/w1').trim(), pushedW1, 'crew pushed nothing itself');
  workerPush(w1.worktree, 'feature/w1');
  const ghBefore = ghCalls().length;
  r = dl(['land', 'w1']); assert.equal(r.code, 0, r.out);
  assert.match(r.out, /delivered w1: https:\/\/github\.com\/acme\/demo\/pull\/11 \(draft, 1 of 2 outcomes ticked\)\. It follows the repository's delivery workflow/);
  assert.equal(ghCalls().slice(ghBefore).length, 1, 'One read, never an extra request');
  assert.ok(ghCalls().at(-1).includes('graphql')); assert.ok(ghCalls().at(-1).includes('number=11'));
  assert.ok(taskOf('w1').landed); assert.equal(taskOf('w1').prFacts.state, 'OPEN');
  assert.match(dl(['land', 'w1']).out, /already has a pull request: https:\/\/github\.com\/acme\/demo\/pull\/11/);
  // No link on the first line: the pull request GitHub has for the branch, never another one
  // the report mentions further down.
  assert.equal(dl(['spawn', 'w2', '--project', 'pooled', '--kind', 'ship', '--agent', 'pi', 'x']).code, 0);
  workerPush(taskOf('w2').worktree, 'feature/w2');
  fs.writeFileSync(taskOf('w2').report, 'Implemented it.\n\nConflicts with https://github.com/acme/demo/pull/5\n'); assert.equal(crew(['done', 'w2'], { terminal: taskOf('w2').terminal }).code, 0);
  r = dl(['land', 'w2']); assert.equal(r.code, 0, r.out); assert.match(r.out, /delivered w2: https:\/\/example\.invalid\/acme\/demo\/pull\/7/);
  assert.ok(ghCalls().some(a => a.join(' ') === 'pr view feature/w2 --json url --jq .url'));
  assert.ok(!ghCalls().some(a => a[1] === 'create' && a.includes('feature/w2')));
  assert.equal(taskOf('w2').pr, 'https://example.invalid/acme/demo/pull/7');
  // No pull request anywhere: land says what to tell the worker and records nothing.
  assert.equal(dl(['spawn', 'w3', '--project', 'pooled', '--kind', 'ship', '--agent', 'pi', 'x']).code, 0);
  workerPush(taskOf('w3').worktree, 'feature/w3');
  fs.writeFileSync(taskOf('w3').report, 'Implementation: not opened yet\n'); assert.equal(crew(['done', 'w3'], { terminal: taskOf('w3').terminal }).code, 0);
  fs.writeFileSync(ghDown, '');
  r = dl(['land', 'w3']); assert.equal(r.code, 6); assert.match(r.out, /has not opened its pull request yet\. Tell it: crew tell w3 "open the draft pull request/);
  assert.deepEqual([taskOf('w3').pr, taskOf('w3').landed], [undefined, undefined]);
  fs.rmSync(ghDown);
  // A repository on an older template still counts: the template's header line is enough.
  commit(project, { 'AGENTS.md': `${TEMPLATE}\nAn older line.\n` }, 'Older template');
  assert.equal(dl(['spawn', 'w4', '--project', 'pooled', '--kind', 'ship', '--agent', 'pi', 'x']).code, 0);
  assert.equal(taskOf('w4').workflow, 'delivery');
  // The project's own choice wins over detection, either way, and is shown in the list.
  assert.equal(dl(['project', 'add', 'pooled', project, '--workflow', 'maybe']).code, 2);
  r = dl(['project', 'add', 'pooled', project, '--workflow', 'plain']); assert.equal(r.code, 0, r.out); assert.match(r.out, /\(workflow: plain\)/);
  assert.match(dl(['project', 'list']).out, /^pooled\t[^\t\r\n]*\tworkflow plain\r?$/m);
  assert.equal(dl(['spawn', 'w5', '--project', 'pooled', '--kind', 'ship', '--agent', 'pi', 'x']).code, 0);
  assert.equal(taskOf('w5').workflow, undefined); assert.ok(fs.readFileSync(taskOf('w5').brief, 'utf8').includes('Do not push or open a pull request unless'));
  git('-C', project, 'rm', '-q', 'AGENTS.md'); git('-C', project, ...who, 'commit', '-q', '-m', 'Back to plain');
  dl(['project', 'add', 'pooled', project, '--workflow', 'delivery']);
  assert.equal(dl(['spawn', 'w6', '--project', 'pooled', '--kind', 'ship', '--agent', 'pi', 'x']).code, 0);
  assert.equal(taskOf('w6').workflow, 'delivery', 'Delivered by pull request without the shared instructions');
  // Like --gate-skip, the choice is part of the registration: adding again without it drops it.
  dl(['project', 'add', 'pooled', project]); assert.match(dl(['project', 'list']).out, /^pooled\t[^\t\r\n]*\r?$/m);
  assert.equal(dl(['spawn', 'w7', '--project', 'pooled', '--kind', 'ship', '--agent', 'pi', 'x']).code, 0);
  assert.equal(taskOf('w7').workflow, undefined);
  for (const id of ['w1', 'w2', 'w3', 'w4', 'w5', 'w6', 'w7']) assert.equal(dl(['finish', id, '--force']).code, 0, id);

  // no-mistakes: a project with the gate is delivered by it; crew only records the result.
  git('-C', project, 'remote', 'add', 'no-mistakes', projectOrigin);
  r = crew(['spawn', 'g0', '--project', 'demo', '--kind', 'ship', '--agent', 'pi', 'x'], { terminal: 'c2' }); assert.equal(r.code, 0);
  assert.equal(taskOf('g0').gate, undefined, 'Without no-mistakes on the machine the task is an ordinary one');
  r = tl(['spawn', 'g1', '--project', 'demo', '--kind', 'ship', '--agent', 'pi', 'Add a fourth line.']); assert.equal(r.code, 0, r.out);
  assert.match(r.out, /delivered through no-mistakes[\s\S]*backlog: start g1/);
  const g1 = taskOf('g1'), g1brief = fs.readFileSync(g1.brief, 'utf8'), intentFile = slash(path.join(homeDir, 'tasks', 'g1', 'intent.md'));
  assert.equal(g1.gate, 'no-mistakes');
  assert.ok(g1brief.includes(`no-mistakes axi run --yes --intent-file ${intentFile}`) && !g1brief.includes('Do not push or open a pull request unless'), g1brief);
  assert.equal(fs.readFileSync(intentFile, 'utf8'), 'Add a fourth line.\n');
  r = tl(['spawn', 'g2', '--project', 'demo', '--agent', 'pi', 'Look.']); assert.ok(!fs.readFileSync(taskOf('g2').brief, 'utf8').includes('no-mistakes'), 'A scout is not gated');
  commit(path.join(copies, 'g1'), { 'README.md': 'one\ntwo\nthree\nfour\n' }, 'Add a fourth line');
  fs.writeFileSync(g1.report, 'The gate stopped.'); assert.equal(crew(['done', 'g1'], { terminal: g1.terminal }).code, 0);
  fs.writeFileSync(ghDown, '');
  r = tl(['land', 'g1']); assert.equal(r.code, 6); assert.match(r.out, /gate has not opened a pull request for it yet/);
  fs.writeFileSync(g1.report, 'Done: https://github.com/acme/demo/pull/9 is open.');
  r = tl(['land', 'g1']); assert.equal(r.code, 0, r.out);
  assert.match(r.out, /delivered g1 through no-mistakes: https:\/\/github\.com\/acme\/demo\/pull\/9\.[\s\S]*backlog: done g1 -> Done/);
  assert.notEqual(spawnSync('git', ['-C', projectOrigin, 'rev-parse', '--verify', '-q', 'feature/g1']).status, 0, 'crew pushed nothing itself');
  assert.match(fs.readFileSync(path.join(homeDir, 'backlog.md'), 'utf8'), /- \[x\] g1 .*\(done https:\/\/github\.com\/acme\/demo\/pull\/9\)/);
  fs.rmSync(ghDown);
  assert.ok(g1brief.includes(intentFile + ' --skip ci`') && g1brief.includes('The gate ends when the pull request is open'), 'By default the gate stops at the open pull request');
  for (const id of ['g0', 'g1', 'g2']) assert.equal(tl(['finish', id, '--force']).code, 0, id);
  // A project says which gate steps it leaves out; push and pull request never are.
  for (const bad of ['push', 'ci,pr', 'nonsense', '']) assert.equal(tl(['project', 'add', 'demo', project, '--gate-skip', bad]).code, 2, bad);
  r = tl(['project', 'add', 'demo', project, '--gate-skip', 'ci,lint']); assert.equal(r.code, 0, r.out); assert.ok(r.out.includes('(gate skips: ci, lint)'));
  assert.equal(tl(['spawn', 'g3', '--project', 'demo', '--kind', 'ship', '--agent', 'pi', 'x']).code, 0);
  assert.ok(fs.readFileSync(taskOf('g3').brief, 'utf8').includes(' --skip ci,lint`'));
  assert.equal(tl(['finish', 'g3', '--force']).code, 0);
  r = tl(['project', 'add', 'demo', project, '--gate-skip', 'none']); assert.ok(r.out.includes('(gate skips: nothing)'));
  assert.equal(tl(['spawn', 'g4', '--project', 'demo', '--kind', 'ship', '--agent', 'pi', 'x']).code, 0);
  const g4brief = fs.readFileSync(taskOf('g4').brief, 'utf8');
  assert.ok(!g4brief.includes('--skip') && g4brief.includes('no-mistakes axi handoff') && g4brief.includes('ten minutes'), 'A watched gate is told how its watch ends');
  assert.equal(tl(['finish', 'g4', '--force']).code, 0);
  // The gate wins over the shared delivery workflow: a gated project keeps the gate's flow.
  r = tl(['project', 'add', 'demo', project, '--gate-skip', 'none', '--workflow', 'delivery']); assert.equal(r.code, 0, r.out);
  assert.equal(tl(['spawn', 'g5', '--project', 'demo', '--kind', 'ship', '--agent', 'pi', 'x']).code, 0);
  assert.deepEqual([taskOf('g5').gate, taskOf('g5').workflow], ['no-mistakes', undefined]);
  assert.ok(fs.readFileSync(taskOf('g5').brief, 'utf8').includes('no-mistakes axi run') && !fs.readFileSync(taskOf('g5').brief, 'utf8').includes('change-delivery'));
  assert.equal(tl(['finish', 'g5', '--force']).code, 0);
  tl(['project', 'add', 'demo', project, '--gate-skip', 'none']);

  // show: the page is opened by lavish-axi, and its address goes on the terminal as the labels
  // Herdr's status bar reads, so the person can open it from wherever they sit.
  const fakeLavish = path.join(root, 'fake-lavish.mjs'), page = path.join(root, 'report.html');
  fs.writeFileSync(page, '<h1>Report</h1>');
  const lavishArgs = path.join(root, 'lavish-args.txt');
  fs.writeFileSync(fakeLavish, `import fs from 'node:fs';
const a = process.argv.slice(2);
fs.writeFileSync(${JSON.stringify(lavishArgs)}, a.join(' '));
if (a[0] === '--version') console.log('0.1.96');
else if (a[0].endsWith('broken.html')) { console.error('error: the user ended this session'); process.exit(1); }
else console.log('session: opened\\nurl: "http://127.0.0.1:4387/session/d849b898fa86dff9"\\nfile: ' + a[0]);
`);
  const L = { CREW_TOOL_LAVISH_AXI: fakeLavish };
  assert.equal(crew(['show'], { terminal: 'c2', env: L }).code, 2);
  assert.equal(crew(['show', path.join(root, 'none.html')], { terminal: 'c2', env: L }).code, 2);
  assert.equal(crew(['show', page], { terminal: 'c2' }).code, 4, 'No lavish-axi, no page');
  r = crew(['show', page], { terminal: 'c2', env: L }); assert.equal(r.code, 0, r.out);
  assert.match(r.out, /shown: http:\/\/127\.0\.0\.1:4387\/session\/d849b898fa86dff9\n.*Lavish link in the status bar/);
  // In a Herdr terminal no browser is opened on this machine; a timed request label asks
  // Herdr to open the page where the person is.
  assert.ok(fs.readFileSync(lavishArgs, 'utf8').endsWith('--no-open'));
  assert.match(readWorld().log.filter(a => a[0] === 'label').at(-1)[2], /^custom\.preview\.open=\d{13}$/);
  assert.deepEqual(readWorld().log.filter(a => a[0] === 'label').slice(-3, -1), [['label', 'c2', 'custom.preview.url=http://127.0.0.1:4387/session/d849b898fa86dff9'], ['label', 'c2', 'custom.preview.label=Lavish']]);
  const before = readWorld().log.length;
  r = crew(['show', page], { env: L }); assert.equal(r.code, 0); assert.match(r.out, /not a Herdr terminal/);
  assert.ok(!fs.readFileSync(lavishArgs, 'utf8').includes('--no-open'), 'Outside Herdr lavish-axi opens the page itself');
  assert.equal(readWorld().log.length, before, 'Outside a terminal nothing is labelled');
  fs.writeFileSync(path.join(root, 'broken.html'), 'x');
  r = crew(['show', path.join(root, 'broken.html')], { terminal: 'c2', env: L }); assert.equal(r.code, 4); assert.match(r.out, /did not open the page: error: the user ended this session/);

  // --- who does the work: profiles, accounts, quota and fallback ---------------------------
  // Pure parts first.
  assert.deepEqual(cleanProfile({ harness: 'a1', model: 'github-copilot/gpt-x', effort: 'high' }), { harness: 'a1', model: 'github-copilot/gpt-x', effort: 'high' });
  assert.throws(() => cleanProfile({ harness: 'a1', account: 'me@example.com' }), /Only Claude Code has saved accounts/);
  assert.throws(() => cleanProfile({ harness: 'a1', model: "x'; rm -rf ~" }), /Not a usable model/);
  assert.throws(() => cleanProfile({ harness: 'gpt' }), /Unknown agent: gpt/);
  assert.equal(agentCommand('a1', AGENTS.a1, 'do it', {}, { harness: 'a1', model: 'github-copilot/gpt-x', effort: 'high' }), "'a1' '--provider' 'github-copilot' '--model' 'gpt-x' '--thinking' 'high' 'do it'", 'A1 takes provider and model before the instruction');
  assert.equal(agentCommand('pi', AGENTS.pi, 'do it', {}, { harness: 'pi', model: 'plain' }), "'pi' '--model' 'plain' 'do it'");
  assert.ok(agentCommand('claude', AGENTS.claude, 'do it', {}, { harness: 'claude', model: 'opus', effort: 'low' }).startsWith("'claude' 'do it' '--model' 'opus' '--effort' 'low' '--permission-mode'"), 'Claude takes its options after the instruction');
  assert.throws(() => agentCommand('claude', AGENTS.claude, 'x', { CREW_CLAUDE_LAUNCHER: path.join(root, 'missing.sh') }, { harness: 'claude', account: 'me@example.com' }), /cannot be started as me@example.com/, 'A chosen account never silently becomes the default one');
  {
    const row = (left, runway) => ({ provider: 'codex', windows: [{ id: 'weekly', kind: 'weekly', resetsAt: '2030-01-01T00:00:00Z' }], state: { status: 'fresh' },
      quotaSemantics: { status: 'known', effectiveAvailability: [{ scope: 'all_models', effectivePercentRemaining: left, limitingWindowIds: ['weekly'], runway: { status: runway } }, { scope: 'model:other', effectivePercentRemaining: 0, runway: { status: 'exhausted_now' } }] } });
    assert.equal(quotaVerdict(row(40, 'projected_exhaustion'), 'openai-codex/gpt-x').status, 'ok', 'Another model\'s empty scope does not count');
    assert.match(quotaVerdict(row(0, 'exhausted_now'), 'gpt-x').note, /quota used up, back 2030/);
    assert.equal(quotaVerdict(row(40, 'ok'), 'openai-codex/other').status, 'exhausted', 'The model\'s own scope counts');
    assert.equal(quotaVerdict({ provider: 'copilot', state: { status: 'unavailable', error: 'keychain_prompt_required' }, quotaSemantics: { status: 'unknown' } }).status, 'unknown', 'An unreadable quota is uncertainty, not an empty account');
    assert.equal(quotaVerdict({ provider: 'claude', state: { status: 'unavailable', error: 'unauthorized' }, quotaSemantics: { status: 'unknown' } }).status, 'signed-out');
    assert.equal(quotaVerdict(undefined).status, 'unknown');
  }
  {
    // A home of its own, a fake quota-axi and a fake account-switcher with three saved logins.
    const home2 = path.join(root, 'home2'), bin = path.join(root, 'agents-bin'), switcher = path.join(root, 'switcher'), quotaFile = path.join(root, 'quota.json'), quotaLog = path.join(root, 'quota.log');
    fs.mkdirSync(bin); fs.mkdirSync(switcher);
    for (const name of ['a1', 'claude']) fs.writeFileSync(path.join(bin, name), '');
    fs.writeFileSync(path.join(switcher, 'claude-as.sh'), '#!/bin/sh');
    fs.writeFileSync(path.join(switcher, 'session-dir.js'), `
const fs = require('fs'), path = require('path'), [cmd, ...rest] = process.argv.slice(2);
if (cmd === 'list') console.log('1. one@example.com  (Org, max)\\n2. two@example.com\\n3. gone@example.com\\n4. empty@example.com  (no saved login)');
else if (cmd === 'refresh') {
  if (rest[0] === 'gone@example.com') { console.log(JSON.stringify({ state: 'failed', email: rest[0], error: 'invalid_grant' })); process.exit(2); }
  fs.writeFileSync(path.join(rest[rest.indexOf('--into') + 1], '.credentials.json'), JSON.stringify({ who: rest[0] }));
  console.log(JSON.stringify({ state: 'fresh', email: rest[0] }));
}`);
    const fakeQuota = path.join(root, 'fake-quota.mjs');
    fs.writeFileSync(fakeQuota, `
import fs from 'node:fs'; import path from 'node:path';
const a = process.argv.slice(2), q = JSON.parse(fs.readFileSync(${JSON.stringify(quotaFile)}, 'utf8')), dir = process.env.CLAUDE_CONFIG_DIR;
const who = a.includes('--profile-only') ? JSON.parse(fs.readFileSync(path.join(dir, '.credentials.json'), 'utf8')).who : null;
fs.appendFileSync(${JSON.stringify(quotaLog)}, (who ?? a[a.indexOf('--provider') + 1]) + '\\n');
const row = (provider, left) => left === undefined ? { provider, notSetUp: true } : left === null ? { provider, state: { status: 'unavailable', error: 'keychain_prompt_required' }, quotaSemantics: { status: 'unknown' } }
  : { provider, windows: [], state: { status: 'fresh' }, quotaSemantics: { status: 'known', effectiveAvailability: [{ scope: 'all_models', effectivePercentRemaining: left, runway: { status: left > 0 ? 'ok' : 'exhausted_now' } }] } };
console.log(JSON.stringify({ schemaVersion: 5, providers: who ? [row('claude', q[who])] : a[a.indexOf('--provider') + 1].split(',').map(p => row(p, q[p])) }));
if (a[0] === '--version') process.exit(0);`);
    const setQuota = q => fs.writeFileSync(quotaFile, JSON.stringify(q));
    const E = { CREW_AGENT_PATH: bin, CREW_CLAUDE_LAUNCHER: path.join(switcher, 'claude-as.sh'), CREW_TOOL_QUOTA_AXI: fakeQuota, CREW_HOME: home2 };
    const crew2 = (args, terminal = 'k1', more = {}) => { const r = spawnSync(process.execPath, [path.join(here, 'crew.mjs'), ...args], { encoding: 'utf8', cwd: root, env: { ...process.env, CREW_CLAUDE_CONFIG: claudeConfig, HOME: fakeUser, USERPROFILE: fakeUser, CREW_HC: fake, CREW_WORKTREES: path.join(root, 'copies2'), HC_TERMINAL_ID: '', CREW_TERMINAL: terminal, CLAUDE_CONFIG_DIR: '', CREW_CLAUDE_ACCOUNT: '', CREW_CLAUDE_ACCOUNTS: undefined, CREW_TOOL_PATH: path.join(root, 'no-tools'), ...Object.fromEntries(TOOLS.map(t => [`CREW_TOOL_${t.id.toUpperCase().replace(/-/g, '_')}`, ''])), ...E, ...more } }); return { code: r.status, out: r.stdout + r.stderr }; };
    const task2 = id => JSON.parse(fs.readFileSync(path.join(home2, 'tasks', id, 'task.json'), 'utf8'));
    const lastRun = () => readWorld().log.filter(a => a[0] === 'run').at(-1).at(-1);
    assert.equal(crew2(['init', home2]).code, 0); assert.equal(crew2(['project', 'add', 'demo', project]).code, 0); assert.equal(crew2(['start']).code, 0);

    // Without a configuration nothing changes: a1 as before, no quota reading for a single candidate.
    setQuota({});
    let q = crew2(['spawn', 'plain', '--project', 'demo', 'Count lines.']); assert.equal(q.code, 0, q.out);
    assert.match(q.out, /spawned plain: a1 scout in terminal \S+, working copy \S+\r?\n/); assert.ok(lastRun().includes("'a1' 'Read the brief"), lastRun());
    assert.deepEqual(task2('plain').launch, { harness: 'a1', source: 'built-in' }); assert.ok(!fs.existsSync(quotaLog), 'One candidate: quota is not read');
    q = crew2(['spawn', 'bogus', '--project', 'demo', '--modle', 'x', 'Count.']); assert.equal(q.code, 2); assert.match(q.out, /Unknown option: --modle/); assert.ok(!fs.existsSync(path.join(home2, 'tasks', 'bogus')), 'A mistyped option makes no task');
    q = crew2(['spawn', 'bogus', '--project', 'demo', '--agent', 'a1', '--account', 'one@example.com', 'Count.']); assert.equal(q.code, 2); assert.match(q.out, /Only Claude Code has saved accounts/);
    // --agent claude alone stands for every saved login, the unusable ones passed over.
    setQuota({ 'one@example.com': 0, 'two@example.com': 55 });
    q = crew2(['spawn', 'acc', '--project', 'demo', '--agent', 'claude', '--model', 'opus', 'Count.']); assert.equal(q.code, 0, q.out);
    assert.match(q.out, /passed over claude opus as one@example\.com: quota used up/); assert.match(q.out, /; claude opus as two@example\.com\r?\n/);
    assert.ok(lastRun().includes("claude-as.sh' --as 'two@example.com' --command") && lastRun().includes("'--model' 'opus' '--permission-mode'"), lastRun());
    assert.deepEqual(task2('acc').chain.map(c => c.account), ['one@example.com', 'gone@example.com'], 'An exhausted or rejected login remains available for reconsideration');
    assert.deepEqual(fs.readFileSync(quotaLog, 'utf8').trim().split('\n'), ['one@example.com', 'two@example.com'], 'Each saved account is read by itself; the one whose login is gone is not');

    // The person's dispatch list, with roles and an account-less Claude profile.
    fs.mkdirSync(path.join(home2, 'config'));
    const dispatch = path.join(home2, 'config', 'crew-dispatch.json');
    fs.writeFileSync(dispatch, '{ broken');
    q = crew2(['spawn', 'cfg', '--project', 'demo', 'Count.']); assert.equal(q.code, 2); assert.match(q.out, /crew-dispatch\.json is not valid JSON/);
    fs.writeFileSync(dispatch, JSON.stringify({
      default: [{ harness: 'a1', model: 'openai-codex/gpt-x', effort: 'high' }, { harness: 'a1', model: 'github-copilot/gpt-x' }, { harness: 'pi', model: 'openai-codex/gpt-x' }, { harness: 'claude', model: 'opus' }],
      roles: { review: [{ harness: 'claude', model: 'sonnet', account: 'two@example.com' }] },
      rules: [{ when: 'A small mechanical edit', use: { harness: 'claude', model: 'haiku', effort: 'low' }, why: 'cheap' }] }));
    setQuota({ codex: 0, copilot: null, 'one@example.com': 70, 'two@example.com': 55 });
    q = crew2(['agents', '--json']); assert.equal(q.code, 0, q.out);
    const shown = JSON.parse(q.out);
    assert.deepEqual(shown.candidates.map(c => [c.label, c.status, c.next]), [
      ['a1 openai-codex/gpt-x (high)', 'exhausted', false], ['a1 github-copilot/gpt-x', 'unknown', true], ['pi openai-codex/gpt-x', 'missing', false],
      ['claude opus as one@example.com', 'ok', false], ['claude opus as two@example.com', 'ok', false], ['claude opus as gone@example.com', 'signed-out', false]]);
    assert.equal(shown.rules[0].use[0], 'claude haiku (low)');
    assert.match(crew2(['agents', '--role', 'review']).out, /-> claude sonnet as two@example\.com\s+ok\s+55% left/);
    assert.match(crew2(['agents']).out, /rule 1: A small mechanical edit\r?\n\s+use claude haiku \(low\)/);

    // Spawn: the exhausted first choice is passed over, the rest stands behind the worker.
    q = crew2(['spawn', 'cfg', '--project', 'demo', 'Count.']); assert.equal(q.code, 0, q.out);
    assert.match(q.out, /passed over a1 openai-codex\/gpt-x \(high\): quota used up/); assert.match(q.out, /; a1 github-copilot\/gpt-x, 2 more can take over/);
    assert.ok(lastRun().includes("'a1' '--provider' 'github-copilot' '--model' 'gpt-x' 'Read the brief"), lastRun());
    assert.deepEqual(task2('cfg').chain.map(c => c.account), [undefined, undefined, 'one@example.com', 'two@example.com', 'gone@example.com']);
    assert.match(crew2(['status']).out, /cfg\tworking\tscout\/a1 github-copilot\/gpt-x\t/);
    assert.equal(JSON.parse(crew2(['status', '--json']).out).tasks.find(t => t.id === 'cfg').standby.length, 5);

    // The worker stops on a limit: `crew wait` hands the task to the next candidate and goes on waiting.
    const first = task2('cfg').terminal;
    setTerminal(first, { status: { state: 'error', app: 'a1' }, screen: 'read crew.mjs\n Error: Codex error: The usage limit has been reached\n' });
    q = crew2(['wait', 'cfg', '--timeout', '8']); assert.equal(q.code, 124, q.out);
    assert.match(q.out, /== cfg: a1 github-copilot\/gpt-x stopped \(Error: Codex error: The usage limit has been reached\); claude opus as one@example\.com continues it in terminal/);
    const moved = task2('cfg');
    assert.equal(moved.agent, 'claude'); assert.equal(moved.state, 'working'); assert.notEqual(moved.terminal, first); assert.equal(readWorld().terminals[first], undefined, 'The stopped worker\'s terminal is gone');
    assert.deepEqual(moved.chain.map(c => c.account), [undefined, undefined, 'two@example.com', 'gone@example.com']); assert.equal(moved.fallbacks.length, 1);
    assert.ok(lastRun().includes("--as 'one@example.com'") && lastRun().includes('Another worker (a1 github-copilot/gpt-x) began this task and had to stop') && lastRun().includes('continue from there'), lastRun());
    assert.ok(lastRun().includes("'--permission-mode' 'auto'"), 'A Claude worker that takes over also runs in auto mode');
    assert.equal(readWorld().terminals[moved.terminal].cwd, moved.worktree, 'Same working copy');
    assert.match(crew2(['status']).out, /scout\/claude opus as one@example\.com \(after a1 github-copilot\/gpt-x\)/);
    // A worker that is merely idle, or working with old text on screen, is left alone.
    setTerminal(moved.terminal, { status: { state: 'working', app: 'claude' }, screen: 'usage limit reached' });
    q = crew2(['wait', 'cfg', '--timeout', '6']); assert.equal(q.code, 124); assert.equal(task2('cfg').terminal, moved.terminal, 'A working agent is never replaced');
    // --no-fallback keeps the worker; a session that does not hold the home never hands over.
    setTerminal(moved.terminal, { status: { state: 'idle', app: 'claude' }, screen: "You've hit your limit · resets 3pm" });
    q = crew2(['wait', 'cfg', '--timeout', '6', '--no-fallback']); assert.equal(q.code, 124); assert.equal(task2('cfg').terminal, moved.terminal);
    q = crew2(['wait', 'cfg', '--timeout', '6'], 'k9'); assert.equal(q.code, 124); assert.equal(task2('cfg').terminal, moved.terminal, 'Only the owner hands work over');
    // Two more limits: the last candidate, then nobody. That is said, not looped on.
    q = crew2(['wait', 'cfg', '--timeout', '6']); assert.match(q.out, /claude opus as two@example\.com continues it/);
    setTerminal(task2('cfg').terminal, { status: { state: 'idle', app: 'claude' }, screen: 'Please run /login' });
    q = crew2(['wait', 'cfg', '--timeout', '8']); assert.equal(q.code, 7, q.out);
    assert.match(q.out, /== cfg: needs a person - claude opus as two@example\.com stopped \(Please run \/login\) and nobody else can take it:/);
    // By hand: the coordinator (or the person) names who takes it. The quota has come back for codex.
    setQuota({ codex: 30, copilot: null, 'one@example.com': 70, 'two@example.com': 55 });
    q = crew2(['relaunch', 'cfg', '--agent', 'a1', '--model', 'openai-codex/gpt-x', 'quota is back']); assert.equal(q.code, 0, q.out);
    assert.match(q.out, /relaunched cfg: a1 openai-codex\/gpt-x in terminal/); assert.equal(task2('cfg').agent, 'a1'); assert.ok(lastRun().includes('had to stop: quota is back'), lastRun());

    // Recovery uses Core send, not tell: its limits and history survive another wait.
    const recovering = (id, terminalPatch = {}, taskPatch = {}) => {
      const dir = path.join(home2, 'tasks', id), address = `recover-${id}`;
      fs.mkdirSync(dir);
      const task = { ...task2('plain'), id, terminal: address, state: 'working', tells: 2, candidates: taskPatch.chain ?? [], chain: [],
        worktree: path.join(dir, 'copy'), brief: path.join(dir, 'brief.md'), report: path.join(dir, 'report.md'), ...taskPatch };
      fs.mkdirSync(task.worktree);
      fs.writeFileSync(path.join(dir, 'task.json'), JSON.stringify(task));
      const w = readWorld();
      w.terminals[address] = { address, state: 'live', labels: {}, status: { state: 'error', app: 'a1' },
        screen: 'Error: no healthy upstream\n', ...terminalPatch };
      fs.writeFileSync(world, JSON.stringify(w));
      return task;
    };
    const sendsTo = address => readWorld().log.filter(a => a[0] === 'send' && a[1] === address);
    const quickWait = (id, more = {}, args = [], terminal = 'k1', timeout = '4') => crew2(['wait', id, '--timeout', timeout, ...args], terminal, { CREW_RECOVERY_SECONDS: '0', ...more });
    const errorState = { status: { state: 'error', app: 'a1' } }, workingState = { status: { state: 'working', app: 'a1' } };
    {
      const task = recovering('error-once', { steps: [errorState, workingState] });
      // The assertion depends on two Core subprocess observations, not on speed.
      // Shared Windows runners can spend most of 0.6 seconds just starting them.
      q = quickWait(task.id); assert.equal(q.code, 124, q.out);
      assert.equal(sendsTo(task.terminal).length, 0, 'One error observation is not a stop');
      const observed = readWorld().log.filter(a => a[0] === 'get' && a.at(-1) === task.terminal);
      assert.ok(observed.length >= 2, 'Both the error and working state were observed');
    }
    {
      const task = recovering('error-cap');
      q = quickWait(task.id, { CREW_RECOVERY_SECONDS: '0.06' }); assert.equal(q.code, 7, q.out);
      const nudges = task2(task.id).nudges;
      assert.deepEqual(nudges.map(n => [n.kind, n.attempt]), [['error', 1], ['error', 2], ['error', 3]]);
      assert.ok(Date.parse(nudges[0].at) - Date.parse(task2(task.id).recovery.since) >= 60, 'First message waits one unit');
      assert.ok(Date.parse(nudges[1].at) - Date.parse(nudges[0].at) >= 240, 'Second message waits four units');
      assert.ok(Date.parse(nudges[2].at) - Date.parse(nudges[1].at) >= 600, 'Third message waits ten units');
      assert.equal(task2(task.id).tells, 2); assert.equal(task2(task.id).state, 'working');
      assert.match(q.out, /stopped on an error \(Error: no healthy upstream\); told to continue \(1 of 3\)/);
      assert.match(q.out, /needs a person.*told to continue 3 times without recovery.*no other candidate/);
      const log = readWorld().log, sent = log.findIndex(a => a[0] === 'send' && a[1] === task.terminal);
      assert.ok(log.slice(0, sent).filter(a => a[0] === 'get' && a.at(-1) === task.terminal).length >= 2);
      q = quickWait(task.id); assert.equal(q.code, 7, q.out);
      assert.equal(sendsTo(task.terminal).length, 3, 'Another wait cannot bypass the cap');
    }
    {
      const lastError = 'Error: upstream connect error or disconnect/reset before headers: remote connection failure';
      const task = recovering('error-handover', { onSends: [{}, {}, { screen: `${lastError}\n` }] }, {
        chain: [{ harness: 'a1', model: 'openai-codex/gpt-x' }],
        candidates: [{ harness: 'a1' }, { harness: 'a1', model: 'github-copilot/gpt-x' }, { harness: 'a1', model: 'openai-codex/gpt-x' }],
      });
      q = quickWait(task.id, {}, [], 'k1', '2'); assert.equal(q.code, 124, q.out);
      const moved = task2(task.id);
      assert.notEqual(moved.terminal, task.terminal, q.out); assert.equal(sendsTo(task.terminal).length, 3);
      assert.equal(moved.fallbacks.at(-1).why, lastError);
      assert.equal(moved.launch.model, 'github-copilot/gpt-x', 'Error hand-over rechecks the full saved candidates, not just the old usable chain');
      assert.deepEqual(moved.candidates, task.candidates); assert.deepEqual(moved.chain, task.chain);
      assert.equal(readWorld().terminals[moved.terminal].cwd, task.worktree);
      assert.ok(lastRun().includes(lastError), lastRun());
    }
    {
      const task = recovering('error-reset', { onSends: [
        { steps: [workingState, workingState, workingState, workingState, errorState, errorState] },
        { status: { state: 'blocked', msg: 'permission needed' } },
      ] });
      q = quickWait(task.id, { CREW_RECOVERY_SECONDS: '0.05' }); assert.equal(q.code, 7, q.out);
      assert.deepEqual(task2(task.id).nudges.map(n => n.attempt), [1, 1], 'Sustained work starts a fresh stop');
    }
    {
      const task = recovering('error-flicker', { onSends: [{ steps: [workingState, errorState, errorState] }] });
      q = quickWait(task.id, { CREW_RECOVERY_SECONDS: '0.1' }); assert.equal(q.code, 7, q.out);
      assert.deepEqual(task2(task.id).nudges.map(n => n.attempt), [1, 2, 3], 'A working flicker does not reset retries');
    }
    {
      const task = recovering('error-quota', { screen: 'Error: usage limit reached\n' });
      q = quickWait(task.id); assert.equal(q.code, 7, q.out);
      assert.equal(sendsTo(task.terminal).length, 0, 'Quota is handled before transient errors');
      assert.match(q.out, /stopped \(Error: usage limit reached\)/);
    }
    for (const [id, env, args, owner] of [
      ['error-no-flag', {}, ['--no-fallback'], 'k1'],
      ['error-no-env', { CREW_NO_FALLBACK: '1' }, [], 'k1'],
      ['error-not-owner', {}, [], 'k9'],
    ]) {
      const task = recovering(id), before = task2(id);
      q = quickWait(id, env, args, owner, '0.4'); assert.equal(q.code, 124, q.out);
      assert.deepEqual(task2(id), before, 'Disabled recovery does not change the task');
      assert.equal(sendsTo(task.terminal).length, 0);
    }
    {
      const task = recovering('error-send-fails', { sendError: true });
      q = quickWait(task.id); assert.equal(q.code, 7, q.out);
      assert.match(q.out, /needs a person.*did not deliver.*send transport unavailable/);
      assert.equal(task2(task.id).nudges, undefined); assert.equal(task2(task.id).recovery.errors, 0);
    }
    {
      const task = recovering('error-fast-report');
      setTerminal(task.terminal, { reportOnSend: path.join(home2, 'tasks', task.id, 'task.json') });
      q = quickWait(task.id); assert.equal(q.code, 0, q.out);
      assert.equal(task2(task.id).state, 'reported', 'A report during send is not overwritten');
      assert.equal(task2(task.id).tells, 9, 'Newest task fields survive send');
      assert.equal(task2(task.id).nudges.length, 1);
      q = quickWait(task.id); assert.equal(q.code, 0); assert.equal(sendsTo(task.terminal).length, 1);
    }

    // Idle/done workers get one delayed reminder, never a substitute answer to a question.
    for (const state of ['idle', 'done']) {
      const task = recovering(`idle-${state}`, { status: { state, app: 'a1' } });
      q = quickWait(task.id, { CREW_RECOVERY_SECONDS: '0.2' }, [], 'k1', '0.5'); assert.equal(q.code, 124, q.out);
      assert.equal(sendsTo(task.terminal).length, 0, 'The idle delay has not elapsed');
      const since = task2(task.id).recovery.since;
      q = quickWait(task.id, { CREW_RECOVERY_SECONDS: '0.2' }); assert.equal(q.code, 7, q.out);
      assert.equal(sendsTo(task.terminal).length, 1);
      assert.ok(Date.parse(task2(task.id).nudges[0].at) - Date.parse(since) >= 800);
      assert.equal(task2(task.id).nudges[0].kind, 'idle'); assert.equal(task2(task.id).tells, 2);
      assert.match(sendsTo(task.terminal)[0][2], new RegExp(`crew done ${task.id}`));
      assert.match(q.out, /needs a person.*idle without a report after its reminder/);
      q = quickWait(task.id); assert.equal(q.code, 7, q.out);
      assert.equal(sendsTo(task.terminal).length, 1, 'The reminder is not repeated in another wait');
    }
    {
      const task = recovering('idle-resumes', { status: { state: 'idle', app: 'a1' }, onSends: [workingState] });
      q = quickWait(task.id, {}, [], 'k1', '0.5'); assert.equal(q.code, 124, q.out);
      assert.equal(sendsTo(task.terminal).length, 1); assert.equal(task2(task.id).state, 'working');
    }
    {
      const task = recovering('idle-blocked', { status: { state: 'blocked', msg: 'Allow this command?' }, screen: 'Error: usage limit reached\n' });
      q = quickWait(task.id); assert.equal(q.code, 7, q.out);
      assert.match(q.out, /needs a person - Allow this command\?/);
      assert.equal(sendsTo(task.terminal).length, 0);
    }
    for (const [id, state] of [['idle-reported', 'reported'], ['idle-report-file', 'working']]) {
      const task = recovering(id, { status: { state: 'idle', app: 'a1' } }, { state });
      fs.writeFileSync(task.report, 'Already finished.');
      const before = task2(id);
      q = quickWait(id, {}, [], 'k1', '0.4'); assert.equal(q.code, state === 'reported' ? 0 : 124, q.out);
      assert.equal(sendsTo(task.terminal).length, 0); assert.deepEqual(task2(id), before);
    }
    {
      const task = recovering('idle-fast-report', { status: { state: 'idle', app: 'a1' } });
      setTerminal(task.terminal, { reportOnSend: path.join(home2, 'tasks', task.id, 'task.json') });
      q = quickWait(task.id); assert.equal(q.code, 0, q.out);
      assert.equal(task2(task.id).state, 'reported'); assert.equal(task2(task.id).nudges.length, 1);
    }

    // Status combines live Core state with recorded sends and never performs recovery.
    {
      const task = task2('error-cap'), before = task2(task.id), sent = sendsTo(task.terminal).length;
      q = crew2(['status']); assert.equal(q.code, 0, q.out);
      assert.match(q.out, /error-cap\tworking\t[^\r\n]*\(error; told to continue 3 times\)/);
      q = crew2(['status', '--json']); assert.equal(q.code, 0, q.out);
      const shown = JSON.parse(q.out).tasks.find(t => t.id === task.id);
      assert.equal(shown.core.status, 'error'); assert.equal(shown.continuations, 3);
      assert.deepEqual(shown.nudges, task.nudges); assert.equal(shown.recovery.errors, 3);
      assert.deepEqual(task2(task.id), before); assert.equal(sendsTo(task.terminal).length, sent);
      setTerminal(task.terminal, workingState);
      const changed = JSON.parse(crew2(['status', '--json']).out).tasks.find(t => t.id === task.id);
      assert.equal(changed.core.status, 'working'); assert.equal(changed.continuations, 3);
      assert.deepEqual(task2(task.id), before, 'Status does not reset recovery or send messages');
      const fresh = recovering('status-error', {}, { nudges: [{ kind: 'error', terminal: 'old-worker', attempt: 1 }] });
      q = crew2(['status']); assert.match(q.out, /status-error\tworking\t[^\r\n]*\(error; told to continue 0 times\)/);
      const zero = JSON.parse(crew2(['status', '--json']).out).tasks.find(t => t.id === fresh.id);
      assert.equal(zero.continuations, 0); assert.equal(zero.nudges.length, 1);
      assert.equal(sendsTo(fresh.terminal).length, 0);
    }

    // finish never takes somebody else's terminal down with the working copy: returning a pool slot
    // ends every process that sits in it, and a person's own session may have been opened there.
    // Finish then does everything else and only postpones returning the copy; a later start or
    // finish returns it once nothing holds it.
    {
      const mine = task2('plain'), w = readWorld(), setWorld = f => { const v = readWorld(); f(v); fs.writeFileSync(world, JSON.stringify(v)); };
      // Opened from the worker's tab, then moved on: Core's cwd is still the copy, the label says where it is now.
      const elsewhere = WINDOWS ? 'C:/elsewhere' : '/elsewhere';
      const movedGuest = `guest claude-code (opened in the copy, now in ${elsewhere})`;
      w.terminals.guest = { address: 'guest', agent: 'claude-code', state: 'live', labels: { 'custom.cwd': elsewhere }, status: null, cwd: WINDOWS ? mine.worktree.replace(/\//g, '\\').toUpperCase() : mine.worktree };
      w.terminals['pc2/t1'] = { address: 'pc2/t1', state: 'live', labels: {}, status: null, cwd: mine.worktree };
      w.terminals.sibling = { address: 'sibling', state: 'live', labels: {}, status: null, cwd: `${mine.worktree}-other` };
      fs.writeFileSync(world, JSON.stringify(w));
      // A Core that cannot list its terminals still stops everything.
      setWorld(v => { v.silentLs = true; });
      q = crew2(['finish', 'plain']); assert.equal(q.code, 4, q.out); assert.match(q.out, /Core did not answer about the terminals in/);
      assert.ok(fs.existsSync(mine.worktree) && readWorld().terminals[mine.terminal]?.state === 'live' && task2('plain').state !== 'closed', 'Nothing was stopped or removed');
      setWorld(v => { delete v.silentLs; });
      // The refusals that protect work still come first.
      fs.mkdirSync(path.join(mine.worktree, '.artifacts')); fs.writeFileSync(path.join(mine.worktree, '.artifacts', 'KEEP'), '');
      q = crew2(['finish', 'plain']); assert.equal(q.code, 6, q.out); assert.match(q.out, /marked to keep by \.artifacts\/KEEP/); assert.notEqual(task2('plain').state, 'closed');
      fs.rmSync(path.join(mine.worktree, '.artifacts'), { recursive: true });
      q = crew2(['spawn', 'dirty', '--project', 'demo', '--kind', 'ship', 'x']); assert.equal(q.code, 0, q.out);
      const dirty = task2('dirty'); fs.writeFileSync(path.join(dirty.worktree, 'half.txt'), 'x');
      setWorld(v => { v.terminals.guest2 = { address: 'guest2', state: 'live', labels: {}, status: null, cwd: dirty.worktree }; });
      q = crew2(['finish', 'dirty']); assert.equal(q.code, 6, q.out); assert.match(q.out, /has uncommitted work .*half\.txt/); assert.notEqual(task2('dirty').state, 'closed');
      fs.rmSync(path.join(dirty.worktree, 'half.txt'));
      // Now finish goes through: the task is closed, its own terminal removed, the copy and the guest kept.
      q = crew2(['finish', 'plain']); assert.equal(q.code, 0, q.out);
      assert.ok(!q.out.includes('still held by another terminal'), 'One line: the sweep does not repeat the task just finished');
      assert.match(q.out, /finished plain \([^)]*\); its working copy is kept for now/);
      assert.ok(q.out.includes(`(terminal ${movedGuest} holds it) and crew returns it by itself once nothing holds it`), q.out);
      assert.ok(!q.out.includes('pc2/t1') && !q.out.includes('sibling'), 'A terminal of another machine or of a sibling folder does not hold the copy');
      assert.equal(task2('plain').state, 'closed'); assert.ok(task2('plain').copyToReturn);
      assert.equal(readWorld().terminals[mine.terminal], undefined, 'Its own terminal is gone');
      assert.ok(fs.existsSync(mine.worktree) && readWorld().terminals.guest.state === 'live', 'The copy and the guest are kept');
      // Nothing is hidden: status says it, --all shows who holds it.
      assert.match(crew2(['status']).out, /1 working copy of finished tasks still to be returned \(crew status --all\)/);
      assert.ok(crew2(['status', '--all']).out.includes(`working copy still to be returned, held by ${movedGuest}`));
      assert.match(JSON.parse(crew2(['status', '--all', '--json']).out).tasks.find(t => t.id === 'plain').copyToReturn.heldBy, /^guest claude-code/);
      // While it is held, start and other finishes leave it.
      q = crew2(['start']); assert.equal(q.code, 0, q.out); assert.match(q.out, /1 working copy of finished tasks still held by another terminal/);
      assert.ok(fs.existsSync(mine.worktree));
    }
    {
      const plain = task2('plain'), dirty = task2('dirty'), setWorld = f => { const v = readWorld(); f(v); fs.writeFileSync(world, JSON.stringify(v)); };
      q = crew2(['finish', 'dirty']); assert.equal(q.code, 0, q.out); assert.match(q.out, /finished dirty .*kept for now \(terminal guest2 holds it\)/);
      assert.match(q.out, /1 working copy of finished tasks still held by another terminal/, 'The other waiting copy (plain) is still summed up');
      assert.ok(fs.existsSync(plain.worktree) && fs.existsSync(dirty.worktree));
      // The guest of plain closes, but somebody marked the copy to keep meanwhile: it waits, and says why.
      setWorld(v => { delete v.terminals.guest; });
      fs.mkdirSync(path.join(plain.worktree, '.artifacts')); fs.writeFileSync(path.join(plain.worktree, '.artifacts', 'KEEP'), '');
      q = crew2(['spawn', 'other', '--project', 'demo', 'x']); assert.equal(q.code, 0, q.out);
      q = crew2(['finish', 'other']); assert.equal(q.code, 0, q.out);
      assert.match(q.out, /the working copy of finished task plain waits: it was marked to keep by \.artifacts\/KEEP since finish\. `crew finish plain --force` discards it/);
      assert.ok(fs.existsSync(path.join(plain.worktree, '.artifacts', 'KEEP')) && task2('plain').copyToReturn);
      assert.equal(JSON.parse(crew2(['status', '--all', '--json']).out).tasks.find(t => t.id === 'plain').copyToReturn.why, 'marked to keep');
      // Once the marker is gone the next finish of another task returns plain's copy.
      fs.rmSync(path.join(plain.worktree, '.artifacts'), { recursive: true });
      // A commit made in the (detached) scout copy after finish leaves status clean, but no
      // branch holds it: the copy waits rather than lose it.
      git('-C', plain.worktree, ...who, 'commit', '--allow-empty', '-qm', 'mine');
      const mineCommit = git('-C', plain.worktree, 'rev-parse', 'HEAD').trim();
      q = crew2(['spawn', 'other2', '--project', 'demo', 'x']); assert.equal(q.code, 0, q.out);
      q = crew2(['finish', 'other2']); assert.equal(q.code, 0, q.out);
      assert.match(q.out, new RegExp(`the working copy of finished task plain waits: it has commits made since finish that no branch holds \\(${mineCommit.slice(0, 8)}\\)`));
      assert.ok(fs.existsSync(plain.worktree)); assert.equal(JSON.parse(crew2(['status', '--all', '--json']).out).tasks.find(t => t.id === 'plain').copyToReturn.why, 'commits');
      // Moving back to where it was does not hide it: the copy's own reflog still names it.
      git('-C', plain.worktree, 'checkout', '-q', '--detach', 'HEAD~1');
      assert.match(crew2(['start']).out, /plain waits: it has commits made since finish that no branch holds/);
      // Once a branch holds the commit, nothing is lost with the copy and it goes back. A branch
      // created and checked out there, and a stash made there, live in the repository and stay.
      git('-C', plain.worktree, 'switch', '-q', '-c', 'keep-mine', mineCommit);
      fs.writeFileSync(path.join(plain.worktree, 'stashed.txt'), 'put aside');
      git('-C', plain.worktree, ...who, 'stash', 'push', '-q', '-u', '-m', 'put aside in the copy');
      q = crew2(['finish', 'other2']); assert.equal(q.code, 0, q.out);
      assert.match(q.out, /returned the working copy of finished task plain/); assert.match(q.out, /1 working copy of finished tasks still held by another terminal/);
      assert.equal(git('-C', project, 'rev-parse', 'keep-mine').trim(), mineCommit, 'The branch made in the copy outlives it');
      assert.match(git('-C', project, 'stash', 'list'), /put aside in the copy/, 'So does a stash made there');
      git('-C', project, 'stash', 'drop', '-q'); git('-C', project, 'branch', '-D', 'keep-mine');
      assert.ok(!fs.existsSync(plain.worktree) && !task2('plain').copyToReturn && task2('plain').copyReturned, 'Returned and no longer marked');
      assert.ok(fs.existsSync(dirty.worktree), 'A copy still held is left');
      // The guest of dirty closes after writing into the copy: start keeps the copy and its work.
      setWorld(v => { delete v.terminals.guest2; });
      fs.writeFileSync(path.join(dirty.worktree, 'later.txt'), 'new work');
      q = crew2(['start']); assert.equal(q.code, 0, q.out); assert.match(q.out, /the working copy of finished task dirty waits: it has work written since finish \(later\.txt\)/);
      assert.ok(fs.existsSync(path.join(dirty.worktree, 'later.txt')) && task2('dirty').copyToReturn, 'Work written after finish is never discarded unasked');
      assert.match(crew2(['status', '--all']).out, /dirty\tclosed\t.*waits: it has work written since finish \(later\.txt\) \(crew finish dirty --force discards it\)/);
      assert.equal(JSON.parse(crew2(['status', '--all', '--json']).out).tasks.find(t => t.id === 'dirty').copyToReturn.why, 'uncommitted work');
      // `finish --force` on the closed task is the person's word to discard it, but never while a terminal holds it.
      setWorld(v => { v.terminals.guest3 = { address: 'guest3', state: 'live', labels: {}, status: null, cwd: dirty.worktree }; });
      q = crew2(['finish', 'dirty', '--force']); assert.equal(q.code, 6, q.out); assert.match(q.out, /still held by guest3; nothing was removed/);
      assert.ok(fs.existsSync(path.join(dirty.worktree, 'later.txt')));
      setWorld(v => { delete v.terminals.guest3; });
      q = crew2(['finish', 'dirty']); assert.equal(q.code, 0, q.out); assert.match(q.out, /dirty is already closed; its working copy still waits/); assert.ok(fs.existsSync(dirty.worktree));
      q = crew2(['finish', 'dirty', '--force']); assert.equal(q.code, 0, q.out); assert.match(q.out, /returned the working copy of finished task dirty; merged branch \S+ deleted/);
      assert.ok(!fs.existsSync(dirty.worktree) && !task2('dirty').copyToReturn);
      assert.ok(!crew2(['status']).out.includes('still to be returned'));
      // A waiting copy removed by hand: start forgets it in git and drops its merged branch.
      q = crew2(['spawn', 'byhand', '--project', 'demo', '--kind', 'ship', 'x']); assert.equal(q.code, 0, q.out);
      const byhand = task2('byhand');
      setWorld(v => { v.terminals.guest4 = { address: 'guest4', state: 'live', labels: {}, status: null, cwd: byhand.worktree }; });
      q = crew2(['finish', 'byhand']); assert.equal(q.code, 0, q.out); assert.match(q.out, /kept for now/);
      setWorld(v => { delete v.terminals.guest4; });
      fs.rmSync(byhand.worktree, { recursive: true, force: true });
      q = crew2(['start']); assert.equal(q.code, 0, q.out); assert.match(q.out, /the working copy of finished task byhand was already gone; merged branch feature\/byhand deleted/);
      assert.ok(!git('-C', project, 'worktree', 'list').includes(slash(byhand.worktree)) && !task2('byhand').copyToReturn, 'Its stale entry is pruned');
      assert.equal(git('-C', project, 'branch', '--list', 'feature/byhand').trim(), '');
      // A --force given at finish covers only what was in the copy then: work written later
      // stays, and the files it did cover go with the copy once that is free.
      q = crew2(['spawn', 'forced', '--project', 'demo', '--kind', 'ship', 'x']); assert.equal(q.code, 0, q.out);
      const forced = task2('forced');
      setTerminal(forced.terminal, { status: { state: 'working', app: 'a1' } });
      setWorld(v => { v.terminals.guest6 = { address: 'guest6', state: 'live', labels: {}, status: null, cwd: forced.worktree }; });
      fs.writeFileSync(path.join(forced.worktree, 'half.txt'), 'covered by --force');
      // git quotes a name like this in its text output; the snapshot must still see the file.
      const notes = 'заметки ü.md';
      fs.writeFileSync(path.join(forced.worktree, notes), 'covered by --force');
      q = crew2(['finish', 'forced', '--force']); assert.equal(q.code, 0, q.out); assert.match(q.out, /finished forced \(cancelled; terminal ended\); its working copy is kept for now/);
      fs.writeFileSync(path.join(forced.worktree, 'later.txt'), 'written after finish');
      setWorld(v => { delete v.terminals.guest6; });
      q = crew2(['start']); assert.equal(q.code, 0, q.out); assert.match(q.out, /the working copy of finished task forced waits: it has work written since finish \(later\.txt\)/);
      assert.ok(fs.existsSync(path.join(forced.worktree, 'later.txt')), 'A --force given at finish never discards later work');
      fs.writeFileSync(path.join(forced.worktree, 'half.txt'), 'changed after finish');
      q = crew2(['start']); assert.match(q.out, /forced waits: it has work written since finish \(half\.txt, later\.txt\)/, 'A covered file changed later counts as new work');
      fs.rmSync(path.join(forced.worktree, 'later.txt')); fs.rmSync(path.join(forced.worktree, 'half.txt'));
      assert.ok(Object.entries(task2('forced').copyToReturn.left.files).some(([file, time]) => file === notes && typeof time === 'number'), 'The quoted name is recorded with its time');
      fs.writeFileSync(path.join(forced.worktree, notes), 'changed after finish');
      q = crew2(['start']); assert.match(q.out, /forced waits: it has work written since finish \(заметки ü\.md\)/, 'A covered file with a quoted name changed later counts as new work');
      assert.equal(fs.readFileSync(path.join(forced.worktree, notes), 'utf8'), 'changed after finish');
      fs.rmSync(path.join(forced.worktree, notes));
      // An ignored file goes with the copy too, so one written since finish keeps it as well.
      const exclude = path.join(project, '.git', 'info', 'exclude'); fs.mkdirSync(path.dirname(exclude), { recursive: true }); fs.appendFileSync(exclude, '\nscratch/\n');
      fs.mkdirSync(path.join(forced.worktree, 'scratch')); fs.writeFileSync(path.join(forced.worktree, 'scratch', 'notes.md'), 'mine');
      q = crew2(['start']); assert.match(q.out, /forced waits: it has work written since finish \(scratch\/\)/); assert.ok(fs.existsSync(path.join(forced.worktree, 'scratch', 'notes.md')));
      fs.rmSync(path.join(forced.worktree, 'scratch'), { recursive: true });
      // A merge (or rebase, cherry-pick...) begun in the copy after finish keeps it as well.
      const forcedGitDir = git('-C', forced.worktree, 'rev-parse', '--absolute-git-dir').trim();
      fs.writeFileSync(path.join(forcedGitDir, 'MERGE_HEAD'), `${git('-C', forced.worktree, 'rev-parse', 'HEAD').trim()}\n`);
      q = crew2(['start']); assert.match(q.out, /forced waits: it has a merge in progress since finish/); assert.ok(fs.existsSync(forced.worktree));
      fs.rmSync(path.join(forcedGitDir, 'MERGE_HEAD'));
      // `git worktree lock` is somebody's word to keep it.
      git('-C', project, 'worktree', 'lock', forced.worktree);
      q = crew2(['start']); assert.match(q.out, /forced waits: it has a lock \(git worktree lock\) since finish/); assert.ok(fs.existsSync(forced.worktree));
      git('-C', project, 'worktree', 'unlock', forced.worktree);
      q = crew2(['start']); assert.match(q.out, /returned the working copy of finished task forced/); assert.ok(!fs.existsSync(forced.worktree));
      // A waiting copy keeps its project, which is needed to hand it back.
      assert.equal(crew2(['project', 'add', 'side', project]).code, 0);
      q = crew2(['spawn', 'retry', '--project', 'side', '--kind', 'ship', 'x']); assert.equal(q.code, 0, q.out);
      const retry = task2('retry');
      setWorld(v => { v.terminals.guest5 = { address: 'guest5', state: 'live', labels: {}, status: null, cwd: retry.worktree }; });
      q = crew2(['finish', 'retry']); assert.equal(q.code, 0, q.out); assert.match(q.out, /kept for now/);
      q = crew2(['project', 'remove', 'side']); assert.equal(q.code, 2, q.out); assert.match(q.out, /Project side still has working copies of finished tasks to return: retry/);
      // A silent Core during the sweep keeps everything and still says which copies wait.
      setWorld(v => { v.silentLs = true; });
      q = crew2(['start']); assert.equal(q.code, 0, q.out); assert.match(q.out, /Core did not answer about the terminals in the working copies of finished tasks; 1 copy waits to be returned and was kept \(retry\)/);
      setWorld(v => { delete v.silentLs; });
      assert.ok(fs.existsSync(retry.worktree));
      // Asking again for a closed task whose copy is now free returns it, without --force.
      q = crew2(['finish', 'retry']); assert.equal(q.code, 0, q.out); assert.match(q.out, /retry is already closed; its working copy still waits to be returned: the working copy of retry is still held by guest5/);
      setWorld(v => { delete v.terminals.guest5; });
      q = crew2(['finish', 'retry']); assert.equal(q.code, 0, q.out); assert.match(q.out, /retry is already closed; returned the working copy of finished task retry/);
      assert.ok(!fs.existsSync(retry.worktree) && !task2('retry').copyToReturn);
      assert.equal(crew2(['project', 'remove', 'side']).code, 0);
    }
    // A rule, a role, and nobody left.
    q = crew2(['spawn', 'ruled', '--project', 'demo', '--rule', '1', 'Rename x.']); assert.equal(q.code, 0, q.out);
    assert.deepEqual([task2('ruled').launch.model, task2('ruled').launch.effort, task2('ruled').launch.source], ['haiku', 'low', 'rule 1']);
    assert.equal(crew2(['spawn', 'ruled2', '--project', 'demo', '--rule', '4', 'x']).code, 2);
    setQuota({ codex: 0, copilot: 0, 'one@example.com': 0, 'two@example.com': 0 });
    q = crew2(['spawn', 'nobody', '--project', 'demo', 'Count.']); assert.equal(q.code, 8, q.out);
    assert.match(q.out, /Nobody can take this work now:\r?\n\s+a1 openai-codex\/gpt-x \(high\) - quota used up/); assert.match(q.out, /pi openai-codex\/gpt-x - pi is not installed/); assert.match(q.out, /gone@example\.com - its saved login is no longer accepted \(invalid_grant\)/);
    assert.ok(!fs.existsSync(path.join(home2, 'tasks', 'nobody')), 'No task, copy or terminal is made when nobody can work');
    // shared_quota: one shared pool; nothing is read and the order decides.
    fs.writeFileSync(dispatch, JSON.stringify({ shared_quota: true, default: [{ harness: 'a1', model: 'openai-codex/gpt-x' }, { harness: 'claude', account: 'one@example.com' }] }));
    // A floor: an account under it yields to the next, and is still used when nobody else can work.
    fs.writeFileSync(dispatch, JSON.stringify({ default: [{ harness: 'a1', model: 'openai-codex/gpt-x' }, { harness: 'claude', model: 'opus', account: 'one@example.com', floor: 50 }, { harness: 'claude', model: 'opus', account: 'two@example.com', floor: 50 }, { harness: 'claude', model: 'opus', account: 'gone@example.com' }] }));
    setQuota({ codex: 0, 'one@example.com': 49, 'two@example.com': 80 });
    q = crew2(['spawn', 'floor1', '--project', 'demo', 'Count.']); assert.equal(q.code, 0, q.out);
    assert.match(q.out, /passed over claude opus as one@example\.com: 49% left, under its floor of 50%/); assert.equal(task2('floor1').launch.account, 'two@example.com');
    assert.deepEqual(task2('floor1').chain.map(c => [c.account, c.floor]), [[undefined, undefined], ['one@example.com', 50], ['gone@example.com', undefined]], 'The complete original order and floors survive for later reconsideration');
    setQuota({ codex: 0, 'one@example.com': 49, 'two@example.com': 20 });
    q = crew2(['spawn', 'floor2', '--project', 'demo', 'Count.']); assert.equal(q.code, 0, q.out);
    assert.match(q.out, /claude opus as one@example\.com is under its floor \(49% left, under its floor of 50%\), but nobody above their floor can take the work/); assert.equal(task2('floor2').launch.account, 'one@example.com');
    assert.match(crew2(['agents']).out, /claude opus as two@example\.com\s+low\s+20% left, under its floor of 50%/);
    assert.throws(() => cleanProfile({ harness: 'claude', floor: 140 }), /Not a usable floor/);
    fs.writeFileSync(dispatch, JSON.stringify({ shared_quota: true, default: [{ harness: 'a1', model: 'openai-codex/gpt-x' }, { harness: 'claude', account: 'one@example.com' }] }));
    fs.rmSync(quotaLog); q = crew2(['spawn', 'pool', '--project', 'demo', 'Count.']); assert.equal(q.code, 0, q.out); assert.equal(task2('pool').launch.model, 'openai-codex/gpt-x'); assert.ok(!fs.existsSync(quotaLog));

    // A worker whose agent is gone (crashed at start, or left) with no report: the next candidate takes over.
    const deadTerminal = task2('pool').terminal;
    setTerminal(deadTerminal, { status: null, screen: 'A1 stopped after an unexpected error. Diagnostic: C:/x/fatal-1.json\ncrew on HEAD\n> ' });
    q = crew2(['wait', 'pool', '--timeout', '8']); assert.equal(q.code, 124, q.out); assert.equal(task2('pool').terminal, deadTerminal, 'A worker that only just started is given time');
    q = crew2(['wait', 'pool', '--timeout', '7'], 'k1', { CREW_DEAD_SECONDS: '0' }); assert.equal(q.code, 124); assert.equal(task2('pool').terminal, deadTerminal, 'One look is not enough');
    q = crew2(['wait', 'pool', '--timeout', '13', '--no-fallback'], 'k1', { CREW_DEAD_SECONDS: '0' }); assert.equal(task2('pool').terminal, deadTerminal);
    q = crew2(['wait', 'pool', '--timeout', '13'], 'k1', { CREW_DEAD_SECONDS: '0' }); assert.equal(q.code, 124, q.out);
    assert.match(q.out, /== pool: a1 openai-codex\/gpt-x is gone: its agent ended without a report \(A1 stopped after an unexpected error\. Diagnostic: C:\/x\/fatal-1\.json\); claude as one@example\.com continues it in terminal/);
    assert.equal(task2('pool').agent, 'claude'); assert.ok(lastRun().includes('had to stop: its agent ended without a report'), lastRun());
    q = crew2(['wait', 'pool', '--timeout', '8'], 'k1', { CREW_DEAD_SECONDS: '0' }); assert.equal(q.code, 124, q.out); assert.equal(task2('pool').fallbacks.length, 1, 'The worker that took over gets its own time to start');
    setTerminal(task2('pool').terminal, { status: null, screen: '' });
    q = crew2(['wait', 'pool', '--timeout', '13'], 'k1', { CREW_DEAD_SECONDS: '0' }); assert.equal(q.code, 7, q.out);
    assert.match(q.out, /== pool: needs a person - claude as one@example\.com is gone: its agent ended without a report, and there is no other candidate in its chain/);

    // A project with a list of its own: for one where an agent of the general list cannot work.
    fs.writeFileSync(dispatch, JSON.stringify({ shared_quota: true, default: [{ harness: 'a1', model: 'openai-codex/gpt-x' }], roles: { review: [{ harness: 'a1' }] },
      projects: { demo: [{ harness: 'claude', model: 'opus', account: 'two@example.com' }], other: { default: [{ harness: 'pi' }], roles: { ship: [{ harness: 'claude', account: 'one@example.com' }] } } } }));
    assert.equal(JSON.parse(crew2(['agents', '--json']).out).candidates[0].label, 'a1 openai-codex/gpt-x');
    let listed = JSON.parse(crew2(['agents', '--json', '--project', 'demo', '--role', 'review']).out); assert.deepEqual([listed.source, listed.candidates[0].label], ['projects.demo', 'claude opus as two@example.com'], 'A project list comes before the general role list');
    listed = JSON.parse(crew2(['agents', '--json', '--project', 'other', '--role', 'ship']).out); assert.deepEqual([listed.source, listed.candidates[0].label], ['projects.other.roles.ship', 'claude as one@example.com']);
    q = crew2(['spawn', 'proj', '--project', 'demo', 'Count.']); assert.equal(q.code, 0, q.out); assert.deepEqual([task2('proj').launch.account, task2('proj').launch.source], ['two@example.com', 'projects.demo']);
    q = crew2(['spawn', 'proj2', '--project', 'demo', '--agent', 'a1', 'Count.']); assert.equal(q.code, 0, q.out); assert.deepEqual([task2('proj2').agent, task2('proj2').chain.map(c => c.account)], ['a1', ['two@example.com']], 'A named choice goes first and the project list stands behind it');
    fs.writeFileSync(dispatch, JSON.stringify({ projects: { demo: { roles: { build: [{ harness: 'a1' }] } } } }));
    q = crew2(['agents']); assert.equal(q.code, 2); assert.match(q.out, /projects\.demo\.roles\.build is not a role/);
    fs.writeFileSync(dispatch, JSON.stringify({ shared_quota: true, default: [{ harness: 'a1', model: 'openai-codex/gpt-x' }, { harness: 'claude', account: 'one@example.com' }] }));
  }

  console.log('PASS: who does the work (profiles, per-account quota, passing over, hand-over on a limit, relaunch), companion tools (list, backlog, copies from the delivery workflow, no-mistakes delivery, a repository\'s own delivery workflow), follow-ups, review, delivery as a pull request, self-repair (crash record, fix, guarded pull request, update after merge, rollback) and crew helpers, status durations, home and project setup, single ownership, spawn request, worker report, wait outcomes, guarded finish, owner takeover, project removal, the Claude worker command, its folder trust and account choice, and the five reviewed defects');
  }
} finally {
  fs.rmSync(root, { recursive: true, force: true });
}
