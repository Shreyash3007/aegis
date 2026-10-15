import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { scratch, aegis, readState } from './helpers.js';

test('exec: argv remains literal on every platform, including spaces and shell metacharacters', (t) => {
  const dir = scratch(t);
  const literal = "spaces & (parens) 'quotes' ; echo unwanted";
  const code = "require('node:fs').writeFileSync('literal.json', JSON.stringify(process.argv.slice(1)))";
  const r = aegis(dir, ['exec', '--', process.execPath, '-e', code, literal]);
  assert.equal(r.status, 0, r.stderr + r.stdout);
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(dir, 'literal.json'), 'utf8')), [literal]);
});

test('exec: malformed wrapper options are rejected before executing a command', (t) => {
  const dir = scratch(t);
  const r = aegis(dir, ['exec', '--unknown', '--', `${JSON.stringify(process.execPath)} -e "process.exit(0)"`]);
  assert.equal(r.status, 2, r.stderr + r.stdout);
});

test('exec: timeout terminates the owned descendant tree without waiting for its natural exit', (t) => {
  const dir = scratch(t);
  const childFile = path.join(dir, 'descendant.pid');
  const script = [
    "const {spawn}=require('node:child_process');",
    "const fs=require('node:fs');",
    "const c=spawn(process.execPath,['-e','setTimeout(()=>{},15000)'],{stdio:'inherit'});",
    "fs.writeFileSync('descendant.pid', String(c.pid)); setTimeout(()=>{},15000);",
  ].join('');
  t.after(() => {
    if (fs.existsSync(childFile)) { try { process.kill(Number(fs.readFileSync(childFile, 'utf8')), 'SIGKILL'); } catch { /* already stopped */ } }
  });
  const start = Date.now();
  const command = `${JSON.stringify(process.execPath)} -e ${JSON.stringify(script)}`;
  const r = aegis(dir, ['exec', '--timeout', '2', '--', command]);
  assert.equal(r.status, 1, r.stderr + r.stdout);
  assert.match(readState(dir).history.at(-1).event, /TIMEOUT/);
  assert.ok(Date.now() - start < 10000, 'deadline must not wait 15 seconds for the descendant');
});
