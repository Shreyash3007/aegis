// Loop-until-clean gate + lane quarantine (SPEC §6, §8): cycle accounting,
// doubt-theater escalation, quarantine refusal + clear, loops-reset recovery.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { scratch, aegis, gitIn, readState } from './helpers.js';

function writeCommit(dir, file, content, msg) {
  fs.writeFileSync(path.join(dir, file), content);
  gitIn(dir, ['add', file]);
  gitIn(dir, ['commit', '-q', '-m', msg]);
}

/** main and feature both touch f.txt -> merge oracle TEXT-CONFLICT. */
function conflictRepo(t) {
  const dir = scratch(t);
  writeCommit(dir, 'f.txt', 'base', 'base');
  gitIn(dir, ['checkout', '-qb', 'feature']);
  writeCommit(dir, 'f.txt', 'branch', 'branch change');
  gitIn(dir, ['checkout', '-q', 'main']);
  writeCommit(dir, 'f.txt', 'main', 'main change');
  return dir;
}

test('clean: conflicting branch FAILs exit 9 with class + cycle 1/3', (t) => {
  const dir = conflictRepo(t);
  const r = aegis(dir, ['clean', 'feature']);
  assert.equal(r.status, 9, r.stderr);
  assert.match(r.stderr, /clean FAIL feature: TEXT-CONFLICT/);
  assert.match(r.stderr, /cycle 1\/3/);
  assert.equal(readState(dir).clean.feature.cycles, 1);
});

test('clean: unchanged-SHA re-run escalates as doubt theater (exit 5)', (t) => {
  const dir = conflictRepo(t);
  assert.equal(aegis(dir, ['clean', 'feature']).status, 9);
  const r = aegis(dir, ['clean', 'feature']);
  assert.equal(r.status, 5, r.stderr);
  assert.match(r.stderr, /doubt theater/);
});

test('clean: three distinct failing SHAs exhaust cycles (exit 5)', (t) => {
  const dir = conflictRepo(t);
  assert.equal(aegis(dir, ['clean', 'feature']).status, 9);
  gitIn(dir, ['checkout', '-q', 'feature']);
  writeCommit(dir, 'f.txt', 'branch v2', 'fix attempt 1');
  gitIn(dir, ['checkout', '-q', 'main']);
  assert.equal(aegis(dir, ['clean', 'feature']).status, 9);
  gitIn(dir, ['checkout', '-q', 'feature']);
  writeCommit(dir, 'f.txt', 'branch v3', 'fix attempt 2');
  gitIn(dir, ['checkout', '-q', 'main']);
  const r = aegis(dir, ['clean', 'feature']);
  assert.equal(r.status, 5, r.stderr);
  assert.match(r.stderr, /3\/3 cycles exhausted/);
});

test('clean: PASS resets cycles; history records the loop', (t) => {
  const dir = conflictRepo(t);
  assert.equal(aegis(dir, ['clean', 'feature']).status, 9);
  gitIn(dir, ['checkout', '-q', 'feature']);
  gitIn(dir, ['checkout', '-q', 'main', '--', 'f.txt']);
  gitIn(dir, ['commit', '-q', '-m', 'take main version']);
  gitIn(dir, ['checkout', '-q', 'main']);
  const r = aegis(dir, ['clean', 'feature']);
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /clean PASSED feature/);
  assert.equal(readState(dir).clean?.feature, undefined);
  const events = readState(dir).history.map((h) => h.event ?? '');
  assert.ok(events.some((e) => e.startsWith('clean-fail')), 'fail recorded');
  assert.ok(events.some((e) => e.startsWith('clean-pass')), 'pass recorded');
});

test('quarantine: freeze refuses oracle + clean; clear re-arms with cycles retained', (t) => {
  const dir = conflictRepo(t);
  assert.equal(aegis(dir, ['clean', 'feature']).status, 9);
  const noReason = aegis(dir, ['quarantine', 'freeze', 'feature']);
  assert.equal(noReason.status, 4);
  assert.match(noReason.stderr, /requires --reason/);
  assert.equal(aegis(dir, ['quarantine', 'freeze', 'feature', '--reason', 'needs human']).status, 0);
  const m = aegis(dir, ['merge', 'check', 'feature']);
  assert.equal(m.status, 9, m.stderr);
  assert.match(m.stderr, /QUARANTINED feature/);
  const c = aegis(dir, ['clean', 'feature']);
  assert.equal(c.status, 9, c.stderr);
  assert.match(c.stderr, /QUARANTINED/);
  const clear = aegis(dir, ['quarantine', 'clear', 'feature', '--reason', 'human reviewed']);
  assert.equal(clear.status, 0, clear.stderr);
  assert.match(clear.stdout, /1 clean cycle\(s\) retained/);
  assert.match(aegis(dir, ['quarantine', 'list']).stdout, /no quarantined lanes/);
});

test('loops reset: clears clean cycles (human-reviewed recovery)', (t) => {
  const dir = conflictRepo(t);
  assert.equal(aegis(dir, ['clean', 'feature']).status, 9);
  assert.equal(aegis(dir, ['loops', 'reset', '--reason', 'human reviewed clean loop']).status, 0);
  assert.deepEqual(readState(dir).clean, {});
  const r = aegis(dir, ['clean', 'feature']);
  assert.equal(r.status, 9, r.stderr);
  assert.match(r.stderr, /cycle 1\/3/);
});
