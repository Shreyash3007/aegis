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
  return [...m[1].matchAll(/^  (\d+):/gm)].map((x) => x[1]);
}

test('contract command surface matches runtime help', (t) => {
  const dir = scratch(t);
  const help = aegis(dir, ['help']).stdout;
  for (const cmd of contractList())
    assert.match(help, new RegExp(`^  ${cmd.replace(/-/g, '\\-')} `, 'm'), `runtime help missing contracted command: ${cmd}`);
});

test('contract exit codes all appear in the runtime exit-code block', (t) => {
  const dir = scratch(t);
  const lines = aegis(dir, ['help']).stdout.split('\n');
  const start = lines.findIndex((l) => l.startsWith('Exit codes:'));
  assert.ok(start >= 0, 'help has an Exit codes line');
  // The block wraps: keep consuming lines that start with a digit.
  let block = lines[start];
  for (let i = start + 1; i < lines.length && /^\d/.test(lines[i].trim()); i++) block += ' ' + lines[i];
  for (const code of contractExits())
    assert.ok(new RegExp(`\\b${code}\\b`).test(block), `exit code ${code} missing from runtime help`);
});
