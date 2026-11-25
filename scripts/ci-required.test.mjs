import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { requiredProblems } from './ci-required.mjs';

const successful = () => ({ readiness: { result: 'success', outputs: { ready: 'true' } }, openspec: { result: 'success' }, tests: { result: 'success' } });

test('ready head or main succeeds only with every dependency successful', () => {
  assert.deepEqual(requiredProblems(successful()), []);
});

test('failure, cancellation, unexpected skip and missing dependency fail closed', () => {
  for (const name of ['readiness', 'openspec', 'tests']) {
    for (const result of ['failure', 'cancelled', 'skipped', undefined]) {
      const needs = successful();
      if (result) needs[name].result = result; else delete needs[name];
      assert.ok(requiredProblems(needs).length, `${name}: ${result}`);
    }
  }
});

test('draft or missing readiness output cannot pass', () => {
  for (const ready of ['false', '', undefined]) {
    const needs = successful(); needs.readiness.outputs.ready = ready;
    assert.ok(requiredProblems(needs).includes('candidate is not ready'));
  }
});

test('aggregate command returns nonzero on a skipped suite', () => {
  const needs = successful(); needs.tests.result = 'skipped';
  const r = spawnSync(process.execPath, [fileURLToPath(new URL('./ci-required.mjs', import.meta.url))], { env: { ...process.env, NEEDS: JSON.stringify(needs) }, encoding: 'utf8' });
  assert.equal(r.status, 1, r.stderr); assert.match(r.stderr, /tests: expected success, got skipped/);
});

test('workflow ignores label events and preserves code-change supersession', () => {
  const workflow = readFileSync(new URL('../.github/workflows/tests.yml', import.meta.url), 'utf8');
  const types = workflow.match(/pull_request:\s*\n\s*branches: \[main\]\s*\n\s*types: \[([^\]]+)\]/);
  assert.ok(types, 'pull request trigger types are declared');
  assert.deepEqual(types[1].split(',').map(type => type.trim()), [
    'opened', 'synchronize', 'reopened', 'ready_for_review', 'converted_to_draft', 'edited',
  ]);
  assert.match(workflow, /group: \$\{\{ github\.event_name == 'pull_request' && format\('ci-pr-\{0\}', github\.event\.pull_request\.number\) \|\| format\('ci-run-\{0\}', github\.run_id\) \}\}/);
  assert.match(workflow, /cancel-in-progress: true/);
});

test('review labels use a separate advisory-only caller and policy declaration', () => {
  const workflow = readFileSync(new URL('../.github/workflows/review-labels.yml', import.meta.url), 'utf8').replace(/\r\n/g, '\n');
  assert.match(workflow, /on:\s*\n  pull_request_target:\s*\n    types: \[labeled\]\s*\n\npermissions:/);
  assert.match(workflow, /uses: timurproko\/MyWorkflows\/\.github\/workflows\/review-labels\.yml@main/);
  assert.equal((workflow.match(/    uses:/g) || []).length, 1);
  assert.doesNotMatch(workflow, /delivery\.yml|tests\.yml|CI required|Delivery check/);
  const delivery = readFileSync(new URL('../.github/workflows/delivery.yml', import.meta.url), 'utf8');
  assert.doesNotMatch(delivery, /\b(?:labeled|unlabeled)\b/);
  const declarations = JSON.parse(readFileSync(new URL('../.github/protection.json', import.meta.url), 'utf8'));
  assert.deepEqual(declarations, [
    { kind: 'default-branch', checks: ['CI required'], mergeMethods: ['squash'], linearHistory: true },
    {
      kind: 'workflow-events',
      workflows: ['.github/workflows/delivery.yml', '.github/workflows/review-labels.yml'],
      events: ['pull_request_target', 'workflow_dispatch'],
    },
  ]);
});

test('workflow keeps draft suites and aggregate disabled and checks both platforms', () => {
  const workflow = readFileSync(new URL('../.github/workflows/tests.yml', import.meta.url), 'utf8');
  assert.match(workflow, /if: needs\.readiness\.outputs\.ready == 'true'/);
  assert.match(workflow, /if: always\(\) && \(github\.event_name != 'pull_request' \|\| !github\.event\.pull_request\.draft\)/);
  assert.match(workflow, /os: \[windows-latest, ubuntu-latest\]/);
  assert.match(workflow, /needs: \[readiness, openspec, tests\]/);
  assert.equal((workflow.match(/name: CI required/g) || []).length, 1);
  assert.match(workflow, /uses: timurproko\/MyWorkflows\/actions\/openspec@main/);
});
