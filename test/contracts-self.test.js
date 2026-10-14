// N1 self-hosting: the CLI's documented command surface (src/contracts/)
// must match the runtime (`aegis help`). A renamed command without a
// contract PR breaks every skill file that cites it - this test is the
// tripwire. Runs the BUILT CLI (dist) like every other integration test.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { scratch, aegis, REPO_ROOT } from './helpers.js';

function contractList() {
  const src = fs.readFileSync(path.join(REPO_ROOT, 'src', 'contracts', 'commands.ts'), 'utf8');
  const m = src.match(/CONTRACT_COMMANDS: string\[\] = \[([\s\S]*?)\];/);
  if (!m) throw new Error('contract file shape changed - update this test with it');
  return [...m[1].matchAll(/'([a-z-]+)'/g)].map((x) => x[1]);
}

function contractExits() {
  const src = fs.readFileSync(path.join(REPO_ROOT, 'src', 'contracts', 'commands.ts'), 'utf8');
  const m = src.match(/CONTRACT_EXITS: Record<number, string> = \{([\s\S]*?)\};/);
  if (!m) throw new Error('contract file shape changed - update this test with it');
  return [...m[1].matchAll(/^  (\d+): '([^']+)'/gm)].map((x) => [x[1], x[2]]);
}

test('contract command surface matches runtime help', (t) => {
  const dir = scratch(t);
  const help = aegis(dir, ['help']).stdout;
  for (const cmd of contractList())
    assert.match(help, new RegExp(`^  ${cmd.replace(/-/g, '\\-')} `, 'm'), `runtime help missing contracted command: ${cmd}`);
});

test('help <command>: per-command detail generated from help, unknown rejected', (t) => {
  const dir = scratch(t);
  const full = aegis(dir, ['help']).stdout;
  const r = aegis(dir, ['help', 'clean']);
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /loop-until-clean gate/);
  assert.match(r.stdout, /Exit codes:/);
  assert.ok(r.stdout.length < full.length, 'detail is a subset, not the whole help');
  assert.equal(aegis(dir, ['help', 'bogus-cmd']).status, 2);
});

test('completions: generated per shell from the live command set', (t) => {
  const dir = scratch(t);
  for (const [shell, marker] of [['bash', 'compgen'], ['zsh', '_describe'], ['pwsh', 'Register-ArgumentCompleter']]) {
    const r = aegis(dir, ['completions', shell]);
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stdout, new RegExp(marker.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')));
    for (const cmd of ['clean', 'quarantine', 'memory', 'jev', 'demo', 'remove', 'completions'])
      assert.ok(r.stdout.includes(cmd), `${shell} completions name ${cmd}`);
  }
  assert.equal(aegis(dir, ['completions', 'fish']).status, 2);
});

test('contract exit codes AND meanings appear in the runtime exit-code block', (t) => {
  const dir = scratch(t);
  const lines = aegis(dir, ['help']).stdout.split('\n');
  const start = lines.findIndex((l) => l.startsWith('Exit codes:'));
  assert.ok(start >= 0, 'help has an Exit codes line');
  // The block wraps: keep consuming lines that start with a digit.
  let block = lines[start];
  for (let i = start + 1; i < lines.length && /^\d/.test(lines[i].trim()); i++) block += ' ' + lines[i];
  for (const [code, meaning] of contractExits()) {
    assert.ok(new RegExp(`\\b${code}\\b`).test(block), `exit code ${code} missing from runtime help`);
    // Meaning drift fails too: the first two words must survive verbatim.
    const anchor = meaning.split(' ').slice(0, 2).join(' ');
    assert.ok(block.includes(anchor), `exit ${code} meaning drifted in help (want "${anchor}")`);
  }
});
