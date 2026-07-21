// v0.3.0 features from the two independent production trials:
// fast lane (fix/chore), pluggable validators, import bridge check,
// drift detection, self-update tag parsing.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { scratch, gitIn, aegis, readState, writeState } from './helpers.js';
import { latestTag } from '../dist/commands/update.js';

// ---------- fast lane ----------

test('fix start -> done closes with UNMEASURED when no test script exists', (t) => {
  const dir = scratch(t); // package.json {} -> no test script
  assert.equal(aegis(dir, ['fix', 'start', 'typo in footer']).status, 0);
  assert.match(aegis(dir, ['status']).stdout, /fix OPEN: "typo in footer"/);
  const d = aegis(dir, ['fix', 'done']);
  assert.equal(d.status, 0, `stdout: ${d.stdout}\nstderr: ${d.stderr}`);
  assert.match(d.stdout, /UNMEASURED/);
  const s = readState(dir);
  assert.equal(s.fix.active, null);
  assert.equal(s.fix.log.length, 1);
  assert.equal(s.fix.log[0].desc, 'typo in footer');
  assert.equal(s.current_skill, '00a', 'pipeline state untouched by fast lane');
});

test('fix done with a failing test suite -> exit 9, fix stays open', (t) => {
  const dir = scratch(t);
  fs.writeFileSync(path.join(dir, 'package.json'),
    JSON.stringify({ scripts: { test: 'exit 1' } }));
  aegis(dir, ['fix', 'start', 'risky patch']);
  const d = aegis(dir, ['fix', 'done']);
  assert.equal(d.status, 9);
  assert.match(d.stderr, /fix NOT closed/);
  assert.equal(readState(dir).fix.active.desc, 'risky patch', 'still open');
  // repair the suite, then done succeeds
  fs.writeFileSync(path.join(dir, 'package.json'),
    JSON.stringify({ scripts: { test: 'exit 0' } }));
  assert.equal(aegis(dir, ['fix', 'done']).status, 0);
  assert.match(readState(dir).fix.log[0].validation, /PASS/);
});

test('second fix start while one is open -> exit 4; abandon requires --reason', (t) => {
  const dir = scratch(t);
  aegis(dir, ['fix', 'start', 'first']);
  assert.equal(aegis(dir, ['fix', 'start', 'second']).status, 4);
  assert.equal(aegis(dir, ['fix', 'abandon']).status, 4);
  const a = aegis(dir, ['fix', 'abandon', '--reason', 'superseded by upstream patch']);
  assert.equal(a.status, 0, a.stderr);
  const s = readState(dir);
  assert.equal(s.fix.active, null);
  assert.equal(s.fix.log[0].abandoned_reason, 'superseded by upstream patch');
});

test('chore records a closed entry in one command', (t) => {
  const dir = scratch(t);
  const r = aegis(dir, ['chore', 'reword README quickstart']);
  assert.equal(r.status, 0, r.stderr);
  const s = readState(dir);
  assert.equal(s.fix.log.length, 1);
  assert.equal(s.fix.log[0].kind, 'chore');
  assert.ok(s.fix.log[0].closed_at);
});

// ---------- pluggable validators ----------

test('custom validate suite: pass/fail by exit code, cited verbatim', (t) => {
  const dir = scratch(t);
  assert.equal(aegis(dir, ['config', 'set', 'validate_suite.smoke', 'echo smoke-ok']).status, 0);
  const p = aegis(dir, ['validate', 'smoke']);
  assert.equal(p.status, 0, `stdout: ${p.stdout}\nstderr: ${p.stderr}`);
  assert.match(p.stdout, /smoke: PASS/);
  assert.match(p.stdout, /smoke-ok/);
  assert.equal(aegis(dir, ['config', 'set', 'validate_suite.broken', 'exit 3']).status, 0);
  const f = aegis(dir, ['validate', 'broken']);
  assert.equal(f.status, 9);
  assert.match(f.stderr, /broken: FAIL/);
  // unknown suite lists custom names in usage
  const u = aegis(dir, ['validate', 'nope']);
  assert.equal(u.status, 2);
  assert.match(u.stderr, /smoke/);
});

test('validate_suite name rules: builtin collision and bad names refused; "-" removes', (t) => {
  const dir = scratch(t);
  assert.equal(aegis(dir, ['config', 'set', 'validate_suite.tests', 'echo x']).status, 4);
  assert.equal(aegis(dir, ['config', 'set', 'validate_suite.Bad-Name', 'echo x']).status, 4);
  assert.equal(aegis(dir, ['config', 'set', 'validate_suite.tmp', 'echo x']).status, 0);
  assert.equal(aegis(dir, ['config', 'set', 'validate_suite.tmp', '-']).status, 0);
  assert.equal(aegis(dir, ['validate', 'tmp']).status, 2, 'removed suite is unknown again');
});

// ---------- import bridge ----------

test('import check: exit 4 until brain docs exist, substantive and cited', (t) => {
  const dir = scratch(t);
  assert.equal(aegis(dir, ['import', 'check']).status, 4);
  const docs = {
    'brain/architecture/system.md': '# System\n\nWeb app talks to API. source: README.md#architecture\n\nData flows via REST. INFERRED - CONFIRMED? no\n\nSessions held in cookies. source: src/auth.ts\n',
    'brain/architecture/db-schema.md': '# DB\n\nUsers table with id/email. source: src/db/schema.ts\n\nSessions table references users. source: src/db/schema.ts\n\nINFERRED from ORM models.\n',
    'brain/architecture/api-contracts.md': '# API\n\nPOST /login returns token. source: src/routes/auth.ts\n\nGET /me reads session. source: src/routes/auth.ts\n\nINFERRED from route definitions.\n',
    'brain/quality/known-issues.md': '# Known issues\n\n3 tsc errors in legacy/. cites: tsc --noEmit\n\n2 npm audit highs. cites: npm audit --json\n\nNo e2e coverage. cites: package.json scripts\n',
  };
  for (const [rel, body] of Object.entries(docs)) {
    fs.mkdirSync(path.join(dir, path.dirname(rel)), { recursive: true });
    fs.writeFileSync(path.join(dir, rel), body);
  }
  const r = aegis(dir, ['import', 'check']);
  assert.equal(r.status, 0, `stdout: ${r.stdout}\nstderr: ${r.stderr}`);
  assert.match(r.stdout, /4\/4 brain docs present/);
});

test('import check: uncited substantive doc is refused', (t) => {
  const dir = scratch(t);
  const weak = {
    'brain/architecture/system.md': '# System\n\nIt is a web app.\n\nIt has a database.\n\nIt serves users.\n',
    'brain/architecture/db-schema.md': '# DB\n\nTables exist.\n\nRows exist.\n\nIndexes exist.\n',
    'brain/architecture/api-contracts.md': '# API\n\nEndpoints exist.\n\nRequests exist.\n\nResponses exist.\n',
    'brain/quality/known-issues.md': '# Known\n\nSome bugs.\n\nSome debt.\n\nSome risk.\n',
  };
  for (const [rel, body] of Object.entries(weak)) {
    fs.mkdirSync(path.join(dir, path.dirname(rel)), { recursive: true });
    fs.writeFileSync(path.join(dir, rel), body);
  }
  const r = aegis(dir, ['import', 'check']);
  assert.equal(r.status, 4);
  assert.match(r.stdout, /UNCITED/);
});

// ---------- drift detection ----------

test('doctor reports a recorded lane with no matching worktree', (t) => {
  const dir = scratch(t);
  const s = readState(dir);
  s.lanes.active = ['ghost-slice'];
  writeState(dir, s);
  const d = aegis(dir, ['doctor']);
  assert.equal(d.status, 0, d.stderr); // advisory, never blocking
  assert.match(d.stdout, /drift: lane 'ghost-slice' recorded active but no worktree matches/);
});

test('doctor reports commits whose post-commit checkpoint never fired', (t) => {
  const dir = scratch(t);
  aegis(dir, ['checkpoint', '--quiet']);
  // hook gone (CLI moved, foreign tooling rewrote it): commit lands unrecorded
  fs.rmSync(path.join(dir, '.git', 'hooks', 'post-commit'));
  fs.writeFileSync(path.join(dir, 'x.txt'), 'x\n');
  gitIn(dir, ['add', '-A']);
  gitIn(dir, ['commit', '-q', '--no-verify', '-m', 'unrecorded work']);
  const d = aegis(dir, ['doctor']);
  assert.match(d.stdout, /drift: 1 commit\(s\) since last checkpoint/);
});

// ---------- self-update tag parsing (pure) ----------

test('latestTag: picks highest semver, ignores deref lines and junk tags', () => {
  const out = [
    'abc123\trefs/tags/v0.1.0',
    'def456\trefs/tags/v0.2.1',
    '789abc\trefs/tags/v0.2.1^{}',
    '000fff\trefs/tags/v0.10.0',
    '111eee\trefs/tags/not-a-version',
    '222ddd\trefs/tags/release',
  ].join('\n');
  assert.equal(latestTag(out), 'v0.10.0');
  assert.equal(latestTag(''), null);
  assert.equal(latestTag('abc\trefs/tags/v1.2.3'), 'v1.2.3');
});
