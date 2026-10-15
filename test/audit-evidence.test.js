import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawn } from 'node:child_process';
import { scratch, aegis, gitIn, CLI } from './helpers.js';

function fixture(t, command = [process.execPath, '-e', 'process.exit(0)']) {
  const dir = scratch(t);
  fs.writeFileSync(path.join(dir, 'value.cjs'), 'module.exports=1;\n');
  gitIn(dir, ['add', '.gitignore', 'brain', 'value.cjs']);
  gitIn(dir, ['commit', '-m', 'base snapshot']);
  gitIn(dir, ['switch', '-c', 'feature']);
  fs.writeFileSync(path.join(dir, 'value.cjs'), 'module.exports=0;\n');
  fs.writeFileSync(path.join(dir, 'check.cjs'), "require('node:assert/strict').equal(require('./value.cjs'),1);\n");
  fs.writeFileSync(path.join(dir, 'plan.json'), JSON.stringify({ criteria: [{ id: 'AC1', statement: 'observable check', command }], findings: [] }));
  gitIn(dir, ['add', 'value.cjs', 'check.cjs', 'plan.json']);
  gitIn(dir, ['commit', '-m', 'feature snapshot']);
  return dir;
}

const receipt = (dir, kind) => path.join(dir, '.aegis', 'quality', `${crypto.createHash('sha256').update('feature').digest('hex')}-${kind}.json`);

test('audit: alternate local ref spelling cannot bypass enrolled TDD or quarantine', (t) => {
  const dir = fixture(t);
  assert.equal(aegis(dir, ['tdd', 'red', 'feature', '--test-file', 'check.cjs', '--expect-exit', '1', '--', process.execPath, 'check.cjs']).status, 0);
  gitIn(dir, ['switch', 'main']);
  assert.equal(aegis(dir, ['merge', 'check', 'refs/heads/feature']).status, 9);
  assert.equal(aegis(dir, ['merge', 'check', 'feature~0']).status, 2);
  assert.equal(aegis(dir, ['quarantine', 'freeze', 'feature', '--reason', 'test fixture']).status, 0);
  const r = aegis(dir, ['merge', 'check', 'refs/heads/feature']);
  assert.equal(r.status, 9, r.stderr);
  assert.match(r.stderr, /QUARANTINED/);
});

test('audit: malformed stored acceptance and review receipts never satisfy strict quality', (t) => {
  const dir = fixture(t);
  assert.equal(aegis(dir, ['quality', 'acceptance', 'feature', '--file', 'plan.json']).status, 0);
  assert.equal(aegis(dir, ['quality', 'review', 'feature', '--file', 'plan.json']).status, 0);
  const file = receipt(dir, 'acceptance');
  const valid = fs.readFileSync(file, 'utf8');
  const broken = JSON.parse(valid);
  delete broken.criteria;
  broken.results = [{ id: 'NOT_AC', status: 'PASS', exit: 1 }];
  fs.writeFileSync(file, JSON.stringify(broken));
  assert.doesNotMatch(aegis(dir, ['quality', 'status', 'feature']).stdout, /QUALITY VERIFIED/);
  gitIn(dir, ['switch', 'main']);
  assert.equal(aegis(dir, ['merge', 'check', 'feature', '--require-quality']).status, 9);
  fs.writeFileSync(file, valid);
  const review = JSON.parse(fs.readFileSync(receipt(dir, 'review'), 'utf8'));
  review.findings = [{ id: 'F1', summary: 'hidden blocker', severity: 'MAJOR', status: 'closed', evidence: ['value.cjs'] }];
  fs.writeFileSync(receipt(dir, 'review'), JSON.stringify(review));
  assert.equal(aegis(dir, ['merge', 'check', 'feature', '--require-quality']).status, 9);
});

test('audit: evidence capture refuses a runner that switches to a different checkout HEAD', (t) => {
  const switchAndCheck = "require('node:child_process').execFileSync('git',['switch','main']); require('node:assert/strict').equal(require('./value.cjs'),1)";
  const dir = fixture(t, [process.execPath, '-e', switchAndCheck]);
  const r = aegis(dir, ['quality', 'acceptance', 'feature', '--file', 'plan.json']);
  assert.equal(r.status, 9, r.stderr + r.stdout);
  assert.ok(!fs.existsSync(receipt(dir, 'acceptance')));
  gitIn(dir, ['switch', 'feature']);
  const red = aegis(dir, ['tdd', 'red', 'feature', '--test-file', 'check.cjs', '--expect-exit', '1', '--', process.execPath, '-e',
    "require('node:child_process').execFileSync('git',['switch','main']); process.exit(1)"]);
  assert.equal(red.status, 9, red.stderr + red.stdout);
});

test('audit: a merged ancestor is nothing-to-merge, never an oracle PASS', (t) => {
  const dir = fixture(t);
  gitIn(dir, ['switch', 'main']);
  gitIn(dir, ['merge', '--ff-only', 'feature']);
  gitIn(dir, ['commit', '--allow-empty', '-m', 'later base commit']);
  const r = aegis(dir, ['merge', 'check', 'feature']);
  assert.equal(r.status, 13, r.stderr + r.stdout);
});

test('audit: merge verification pins commits and refuses a concurrently advanced feature ref', (t) => {
  const dir = fixture(t);
  assert.equal(aegis(dir, ['quality', 'acceptance', 'feature', '--file', 'plan.json']).status, 0);
  assert.equal(aegis(dir, ['quality', 'review', 'feature', '--file', 'plan.json']).status, 0);
  const reviewed = gitIn(dir, ['rev-parse', 'HEAD']);
  gitIn(dir, ['commit', '--allow-empty', '-m', 'unreviewed change']);
  const future = gitIn(dir, ['rev-parse', 'HEAD']);
  gitIn(dir, ['branch', 'keep-future']);
  gitIn(dir, ['switch', 'main']);
  gitIn(dir, ['branch', '-f', 'feature', reviewed]);
  const hook = path.join(dir, '.aegis', 'advance.cjs');
  fs.writeFileSync(hook, `const cp=require('node:child_process'); const original=cp.execFileSync; let moved=false;
cp.execFileSync=function(bin,args,opts){if(!moved&&bin==='git'&&args.includes('merge')&&args.includes('--no-commit')){moved=true;original('git',['update-ref','refs/heads/feature',${JSON.stringify(future)}],opts);}return original.apply(this,arguments);};require('node:module').syncBuiltinESMExports();`);
  const r = aegis(dir, ['merge', 'check', 'feature', '--require-quality'], { env: { NODE_OPTIONS: `--require ${JSON.stringify(hook)}` } });
  assert.equal(r.status, 9, r.stderr + r.stdout);
  assert.match(r.stderr, /changed|moved|STALE/i);
});

test('audit: concurrent public exports publish exactly one immutable observation', async (t) => {
  const dir = scratch(t);
  const file = path.join(dir, '.aegis', 'export.json');
  const hook = path.join(dir, '.aegis', 'barrier.cjs');
  fs.writeFileSync(hook, `const fs=require('node:fs');const original=fs.existsSync;const target=${JSON.stringify(file)};
fs.existsSync=function(p){const found=original(p);if(String(p)===target&&!found){fs.writeFileSync(target+'.'+process.pid+'.ready','ready');const until=Date.now()+5000;while(Date.now()<until&&fs.readdirSync(require('node:path').dirname(target)).filter(f=>f.endsWith('.ready')).length<2)Atomics.wait(new Int32Array(new SharedArrayBuffer(4)),0,0,10);}return found;};`);
  const run = () => new Promise((resolve) => {
    const p = spawn(process.execPath, [CLI, 'evidence', 'export', '--file', file], {
      cwd: dir, env: { ...process.env, NODE_OPTIONS: `--require ${JSON.stringify(hook)}` }, stdio: 'ignore',
    });
    p.once('close', (code) => resolve(code));
  });
  const codes = (await Promise.all([run(), run()])).sort((a, b) => a - b);
  assert.deepEqual(codes, [0, 4]);
  assert.equal(JSON.parse(fs.readFileSync(file, 'utf8')).schema_version, 1);
});

test('audit: TDD preserves the recorded runner deadline for integrated verification', (t) => {
  const dir = fixture(t);
  const red = aegis(dir, ['tdd', 'red', 'feature', '--test-file', 'check.cjs', '--expect-exit', '1', '--timeout-ms', '90000', '--', process.execPath, 'check.cjs']);
  assert.equal(red.status, 0, red.stderr);
  const key = crypto.createHash('sha256').update('feature').digest('hex');
  const proof = JSON.parse(fs.readFileSync(path.join(dir, '.aegis', 'tdd', `${key}.json`), 'utf8'));
  assert.equal(proof.timeout_ms, 90000);
  assert.equal(aegis(dir, ['tdd', 'green', 'feature', '--timeout-ms', '600001']).status, 2, 'the explicit execution budget is still bounded');
});

test('audit: clean accounting uses canonical branch identities and strict-flag typos cannot pass', (t) => {
  const dir = fixture(t);
  assert.equal(aegis(dir, ['tdd', 'red', 'feature', '--test-file', 'check.cjs', '--expect-exit', '1', '--', process.execPath, 'check.cjs']).status, 0);
  gitIn(dir, ['switch', 'main']);
  const first = aegis(dir, ['clean', 'feature', '--require-proof', '--require-quality']);
  assert.equal(first.status, 9);
  assert.match(first.stderr, /fix, then: aegis clean refs\/heads\/feature --require-proof --require-quality/);
  const again = aegis(dir, ['clean', 'refs/heads/feature', '--require-proof', '--require-quality']);
  assert.equal(again.status, 5, again.stderr + again.stdout);
  assert.equal(aegis(dir, ['merge', 'check', 'feature', '--require-qaulity']).status, 2);
  assert.equal(aegis(dir, ['clean', 'feature', '--require-qaulity']).status, 2);
});

test('audit cycle 2: non-exact branch case cannot bypass a quarantine on case-insensitive filesystems', (t) => {
  const dir = fixture(t);
  gitIn(dir, ['branch', '-m', 'AuditLane']);
  gitIn(dir, ['switch', 'main']);
  assert.equal(aegis(dir, ['quarantine', 'freeze', 'AuditLane', '--reason', 'fixture']).status, 0);
  assert.equal(aegis(dir, ['merge', 'check', 'AuditLane']).status, 9, 'positive control: the real branch is frozen');
  assert.equal(aegis(dir, ['merge', 'check', 'auditlane']).status, 2);
  assert.equal(aegis(dir, ['clean', 'auditlane']).status, 2);
  const before = fs.readFileSync(path.join(dir, '.aegis', 'state.json'), 'utf8');
  assert.equal(aegis(dir, ['quarantine', 'freeze', 'refs/heads/AUDITLANE', '--reason', 'invalid explicit ref']).status, 2);
  assert.equal(fs.readFileSync(path.join(dir, '.aegis', 'state.json'), 'utf8'), before);
});

test('audit cycle 2: clean forwards a nested literal branch name unambiguously', (t) => {
  const dir = scratch(t);
  fs.mkdirSync(path.join(dir, 'src', 'contracts'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'src', 'contracts', 'api.txt'), 'immutable contract\n');
  gitIn(dir, ['add', '.gitignore', 'brain', 'src/contracts/api.txt']);
  gitIn(dir, ['commit', '-m', 'contract base']);
  gitIn(dir, ['switch', '-c', 'lane']);
  fs.writeFileSync(path.join(dir, 'good.txt'), 'good feature\n');
  gitIn(dir, ['add', 'good.txt']); gitIn(dir, ['commit', '-m', 'good feature']);
  gitIn(dir, ['switch', 'main']); gitIn(dir, ['switch', '-c', 'refs/heads/lane']);
  fs.writeFileSync(path.join(dir, 'src', 'contracts', 'api.txt'), 'bad contract change\n');
  gitIn(dir, ['add', 'src/contracts/api.txt']); gitIn(dir, ['commit', '-m', 'contract drift']);
  gitIn(dir, ['switch', 'main']);
  const r = aegis(dir, ['clean', 'refs/heads/refs/heads/lane']);
  assert.equal(r.status, 9, r.stderr + r.stdout);
  assert.match(r.stderr, /CONTRACT.DRIFT/);
  assert.match(r.stderr, /fix, then: aegis clean refs\/heads\/refs\/heads\/lane/);
  assert.equal(aegis(dir, ['clean', 'refs/heads/refs/heads/lane']).status, 5,
    'the suggested unchanged retry must remain on the failing nested branch, not PASS another one');
  assert.equal(aegis(dir, ['quarantine', 'freeze', 'refs/heads/refs/heads/lane', '--reason', 'nested fixture']).status, 0);
  assert.equal(aegis(dir, ['merge', 'check', 'lane']).status, 0, 'an unrelated literal branch is not the frozen nested branch');
  assert.match(aegis(dir, ['merge', 'check', 'refs/heads/refs/heads/lane']).stderr, /QUARANTINED/);
  assert.equal(aegis(dir, ['quarantine', 'freeze', 'refs/heads/lane', '--reason', 'ordinary fixture']).status, 0,
    'raw full-ref syntax must not be treated as a nested short name in duplicate lookup');
  assert.equal(aegis(dir, ['merge', 'check', 'lane']).status, 9);
});
