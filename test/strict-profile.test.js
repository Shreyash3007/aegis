// v0.11 R1 - quality profile (strict | legacy).
//
// strict: every merge demands RED/GREEN proof plus acceptance/review
// receipts even when no flags are passed; refusals cite the profile.
// legacy: receipts stay opt-in and absent evidence is reported as
// UNMEASURED - a labelled exception that never prints a quality PASS.
// Greenfield init defaults strict; brownfield stays legacy until the owner
// opts in; re-init preserves the owner's explicit choice.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { scratch, aegis, gitIn } from './helpers.js';

const cfgOf = (dir) => JSON.parse(fs.readFileSync(path.join(dir, '.aegis', 'config.json'), 'utf8'));

// Greenfield scratch (strict by default) with a branch that carries a
// failing regression test and its committed acceptance/review plan.
function evidenceBranch(t) {
  const dir = scratch(t);
  gitIn(dir, ['add', '.gitignore', 'brain']);
  gitIn(dir, ['commit', '-m', 'scaffold']);
  gitIn(dir, ['switch', '-c', 'feature']);
  fs.writeFileSync(path.join(dir, 'check.cjs'),
    "require('node:assert/strict').equal(require('./behavior.cjs'), 1);\n");
  fs.writeFileSync(path.join(dir, 'plan.json'), JSON.stringify({
    criteria: [{ id: 'AC1', statement: 'behavior returns one', command: [process.execPath, 'check.cjs'] }],
    findings: [],
  }));
  gitIn(dir, ['add', 'check.cjs', 'plan.json']);
  gitIn(dir, ['commit', '-m', 'failing regression and quality plan']);
  return dir;
}

test('profile: greenfield defaults strict, brownfield stays legacy, re-init preserves the choice', (t) => {
  const green = scratch(t); // fresh repo, greenfield init
  assert.equal(cfgOf(green).quality_profile, 'strict', 'new projects start strict');
  assert.equal(aegis(green, ['config', 'set', 'quality_profile', 'legacy']).status, 0);
  assert.equal(cfgOf(green).quality_profile, 'legacy');
  // re-init converges and never overrides the owner's explicit profile
  assert.equal(aegis(green, ['init', '--yes', '--overwrite']).status, 0);
  assert.equal(cfgOf(green).quality_profile, 'legacy');
  assert.equal(aegis(green, ['init', '--yes', '--overwrite']).status, 0);
  assert.equal(cfgOf(green).quality_profile, 'legacy');
  // invalid values are refused; '-' removes the key (back to default semantics)
  assert.equal(aegis(green, ['config', 'set', 'quality_profile', 'bananas']).status, 2);
  assert.equal(aegis(green, ['config', 'set', 'quality_profile', '-']).status, 0);
  assert.ok(!('quality_profile' in cfgOf(green)));

  const brown = scratch(t, { init: false });
  for (let i = 0; i < 6; i++) { // >5 commits = established history -> brownfield
    fs.writeFileSync(path.join(brown, `f${i}.txt`), `${i}\n`);
    gitIn(brown, ['add', '-A']);
    gitIn(brown, ['commit', '-q', '-m', `c${i}`]);
  }
  assert.equal(aegis(brown, ['init', '--yes']).status, 0);
  assert.ok(!('quality_profile' in cfgOf(brown)), 'brownfield default is legacy (key absent)');
  assert.equal(aegis(brown, ['config', 'set', 'quality_profile', 'strict']).status, 0);
  assert.equal(cfgOf(brown).quality_profile, 'strict', 'owners can opt in explicitly');
});

test('strict merge: absent acceptance/review refuses without flags; full evidence passes', (t) => {
  const dir = evidenceBranch(t);
  gitIn(dir, ['switch', 'main']);
  const bare = aegis(dir, ['merge', 'check', 'feature']);
  assert.equal(bare.status, 9, bare.stdout + bare.stderr);
  assert.match(bare.stderr, /QUALITY acceptance evidence missing/);
  assert.match(bare.stderr, /quality_profile=strict/);

  gitIn(dir, ['switch', 'feature']);
  const red = aegis(dir, ['tdd', 'red', 'feature', '--test-file', 'check.cjs',
    '--expect-exit', '1', '--', process.execPath, 'check.cjs']);
  assert.equal(red.status, 0, red.stdout + red.stderr);
  fs.writeFileSync(path.join(dir, 'behavior.cjs'), 'module.exports = 1;\n');
  gitIn(dir, ['add', 'behavior.cjs']);
  gitIn(dir, ['commit', '-m', 'minimal fix (green)']);
  assert.equal(aegis(dir, ['tdd', 'green', 'feature']).status, 0);
  assert.equal(aegis(dir, ['quality', 'acceptance', 'feature', '--file', 'plan.json']).status, 0);
  assert.equal(aegis(dir, ['quality', 'review', 'feature', '--file', 'plan.json']).status, 0);
  gitIn(dir, ['switch', 'main']);
  const full = aegis(dir, ['merge', 'check', 'feature']);
  assert.equal(full.status, 0, full.stdout + full.stderr);
  assert.match(full.stdout, /QUALITY VERIFIED \(recorded acceptance \+ review\)/);
  assert.match(full.stdout, /TDD RED -> GREEN verified/);
});

test('strict merge: acceptance/review alone are not enough - RED/GREEN refusal cites the profile', (t) => {
  const dir = evidenceBranch(t);
  gitIn(dir, ['switch', 'feature']);
  fs.writeFileSync(path.join(dir, 'behavior.cjs'), 'module.exports = 1;\n');
  gitIn(dir, ['add', 'behavior.cjs']);
  gitIn(dir, ['commit', '-m', 'implementation without TDD receipts']);
  assert.equal(aegis(dir, ['quality', 'acceptance', 'feature', '--file', 'plan.json']).status, 0);
  assert.equal(aegis(dir, ['quality', 'review', 'feature', '--file', 'plan.json']).status, 0);
  gitIn(dir, ['switch', 'main']);
  const r = aegis(dir, ['merge', 'check', 'feature']);
  assert.equal(r.status, 9, r.stdout + r.stderr);
  assert.match(r.stderr, /TDD proof missing/);
  assert.match(r.stderr, /quality_profile=strict/);
});

test('legacy (absence = old installs): UNMEASURED labels, never a quality PASS; flags keep their meaning', (t) => {
  const dir = evidenceBranch(t);
  // Simulate a pre-v0.11 install: no quality_profile key anywhere.
  const cfgP = path.join(dir, '.aegis', 'config.json');
  const cfg = JSON.parse(fs.readFileSync(cfgP, 'utf8'));
  delete cfg.quality_profile;
  fs.writeFileSync(cfgP, JSON.stringify(cfg, null, 2) + '\n');
  gitIn(dir, ['switch', 'main']);
  const pass = aegis(dir, ['merge', 'check', 'feature']);
  assert.equal(pass.status, 0, pass.stdout + pass.stderr);
  assert.match(pass.stdout, /TDD UNMEASURED/);
  assert.match(pass.stdout, /QUALITY UNMEASURED - no acceptance\/review receipt/);
  assert.doesNotMatch(pass.stdout, /QUALITY (VERIFIED|PASS)/, 'the labelled exception never prints a quality PASS');

  // Owners opt in explicitly; the refusal then cites the profile.
  assert.equal(aegis(dir, ['config', 'set', 'quality_profile', 'strict']).status, 0);
  const strict = aegis(dir, ['merge', 'check', 'feature']);
  assert.equal(strict.status, 9, strict.stdout + strict.stderr);
  assert.match(strict.stderr, /QUALITY acceptance evidence missing/);
  assert.match(strict.stderr, /quality_profile=strict/);

  // Explicit flags keep their historical meaning under legacy and never
  // claim the profile as the reason.
  assert.equal(aegis(dir, ['config', 'set', 'quality_profile', 'legacy']).status, 0);
  const flagged = aegis(dir, ['merge', 'check', 'feature', '--require-quality']);
  assert.equal(flagged.status, 9, flagged.stdout + flagged.stderr);
  assert.match(flagged.stderr, /QUALITY acceptance evidence missing/);
  assert.doesNotMatch(flagged.stderr, /quality_profile=strict/);
});

test('stale and corrupt quality evidence refuse under both profiles', (t) => {
  const dir = evidenceBranch(t);
  gitIn(dir, ['switch', 'feature']);
  fs.writeFileSync(path.join(dir, 'behavior.cjs'), 'module.exports = 1;\n');
  gitIn(dir, ['add', 'behavior.cjs']);
  gitIn(dir, ['commit', '-m', 'implementation']);
  assert.equal(aegis(dir, ['quality', 'acceptance', 'feature', '--file', 'plan.json']).status, 0);
  assert.equal(aegis(dir, ['quality', 'review', 'feature', '--file', 'plan.json']).status, 0);
  const key = crypto.createHash('sha256').update('feature').digest('hex');
  const acceptance = path.join(dir, '.aegis', 'quality', `${key}-acceptance.json`);
  const valid = fs.readFileSync(acceptance, 'utf8');
  fs.writeFileSync(acceptance, '{ not json');
  gitIn(dir, ['switch', 'main']);
  const strictCorrupt = aegis(dir, ['merge', 'check', 'feature']);
  assert.equal(strictCorrupt.status, 9, strictCorrupt.stdout + strictCorrupt.stderr);
  assert.match(strictCorrupt.stderr, /unreadable or malformed/);
  assert.equal(aegis(dir, ['config', 'set', 'quality_profile', 'legacy']).status, 0);
  const legacyCorrupt = aegis(dir, ['merge', 'check', 'feature', '--require-quality']);
  assert.equal(legacyCorrupt.status, 9, legacyCorrupt.stdout + legacyCorrupt.stderr);
  assert.match(legacyCorrupt.stderr, /unreadable or malformed/);

  // Stale: receipts pinned to an older tip refuse under both profiles.
  fs.writeFileSync(acceptance, valid);
  gitIn(dir, ['switch', 'feature']);
  gitIn(dir, ['commit', '--allow-empty', '-m', 'unreviewed change']);
  gitIn(dir, ['switch', 'main']);
  const legacyStale = aegis(dir, ['merge', 'check', 'feature', '--require-quality']);
  assert.equal(legacyStale.status, 9, legacyStale.stdout + legacyStale.stderr);
  assert.match(legacyStale.stderr, /STALE/);
  assert.equal(aegis(dir, ['config', 'set', 'quality_profile', 'strict']).status, 0);
  const strictStale = aegis(dir, ['merge', 'check', 'feature']);
  assert.equal(strictStale.status, 9, strictStale.stdout + strictStale.stderr);
  assert.match(strictStale.stderr, /STALE/);
});
