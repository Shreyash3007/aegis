import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { scratch, aegis, gitIn, readState, writeState, REPO_ROOT } from './helpers.js';

const url = file => JSON.stringify(pathToFileURL(path.join(REPO_ROOT, 'dist', file)).href);
const record = (id, title = id) => ({ id, title, type: 'finding', body: 'evidence', status: 'active', confidence: 1,
  cites: [], expiry: null, supersedes: null, parties: null, winner: null, resolution: null,
  lane: null, app: null, at: 'fixture', verified_at: null, history: [] });
function jsonl(dir, file, records) {
  const p = path.join(dir, file); fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, records.map(r => JSON.stringify(r)).join('\n') + '\n'); return p;
}
const add = dir => aegis(dir, ['memory', 'add', '--type', 'finding', '--title', 'new', '--body', 'evidence']);
const pauseCode = `
import fs from 'node:fs'; import path from 'node:path';
const sleep = ms => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
function pause(marker) { fs.writeFileSync(marker, 'ready');
  const end = Date.now() + 15000;
  while (!fs.existsSync(marker + '.release')) { if (Date.now() > end) throw Error('barrier timeout'); sleep(10); }
}`;
function worker(t, dir, code) {
  const p = spawn(process.execPath, ['--input-type=module', '-e', code], { cwd: dir, env: process.env });
  let out = '', err = ''; p.stdout.on('data', d => out += d); p.stderr.on('data', d => err += d);
  const done = new Promise(resolve => p.on('close', status => resolve({ status, out, err })));
  t.after(() => { if (p.exitCode === null) p.kill(); });
  return done;
}
async function wait(file) {
  for (let i = 0; i < 1000; i++) { if (fs.existsSync(file)) return; await new Promise(r => setTimeout(r, 10)); }
  assert.fail(`barrier not reached: ${file}`);
}
const release = marker => fs.writeFileSync(marker + '.release', 'go');
const check = r => assert.equal(r.status, 0, r.stderr || r.err);

test('audit: dirty slice removal preserves edits, untracked files and registration', t => {
  const d = scratch(t);
  fs.writeFileSync(path.join(d, 'tracked.txt'), 'base'); gitIn(d, ['add', 'tracked.txt']); gitIn(d, ['commit', '-qm', 'tracked fixture']);
  check(aegis(d, ['slice', 'create', 'dirty']));
  const w = readState(d).slices.dirty.dir;
  fs.writeFileSync(path.join(w, 'tracked.txt'), 'user edit');
  fs.writeFileSync(path.join(w, 'user.txt'), 'irreplaceable');
  const r = aegis(d, ['slice', 'remove', 'dirty']);
  assert.equal(r.status, 4, r.stderr); assert.equal(fs.readFileSync(path.join(w, 'user.txt'), 'utf8'), 'irreplaceable');
  assert.equal(fs.readFileSync(path.join(w, 'tracked.txt'), 'utf8'), 'user edit');
  assert.ok(readState(d).slices.dirty); assert.ok(readState(d).lanes.active.includes('dirty'));
});

test('audit: Git-locked slice removal does not forget its registry', t => {
  const d = scratch(t); check(aegis(d, ['slice', 'create', 'locked']));
  gitIn(d, ['worktree', 'lock', readState(d).slices.locked.dir]);
  assert.equal(aegis(d, ['slice', 'remove', 'locked']).status, 4);
  assert.ok(readState(d).slices.locked); assert.ok(readState(d).lanes.active.includes('locked'));
});

test('audit: invalid slice names and forged registered paths cannot touch other worktrees', t => {
  const d = scratch(t);
  assert.equal(aegis(d, ['slice', 'create', 'nested/name']).status, 2);
  const other = path.join(d, 'foreign'); gitIn(d, ['worktree', 'add', '-b', 'foreign', other]);
  const s = readState(d); s.slices = { forged: { dir: other, branch: 'foreign' } }; s.lanes.active = ['forged']; writeState(d, s);
  assert.equal(aegis(d, ['slice', 'remove', 'forged']).status, 4);
  assert.ok(fs.existsSync(other)); assert.ok(readState(d).slices.forged);
});

test('audit: migration conflict preserves every conflicting legacy source', t => {
  const d = scratch(t);
  const main = jsonl(d, 'brain/memory/records.jsonl', [record('mem-0001', 'destination')]);
  const legacy = jsonl(d, '.aegis/memory/records.jsonl', [record('mem-0002', 'legacy-only')]);
  const lane = jsonl(d, '.aegis/memory/lanes/conflict.jsonl', [record('mem-0003')]);
  jsonl(d, 'brain/memory/lanes/conflict.jsonl', [record('mem-0004')]);
  jsonl(d, '.aegis/memory/lanes/new.jsonl', [record('mem-0005')]);
  const before = [main, legacy, lane].map(p => fs.readFileSync(p, 'utf8'));
  const r = aegis(d, ['memory', 'list']); assert.equal(r.status, 4, r.stderr);
  for (const [i, p] of [main, legacy, lane].entries()) assert.equal(fs.readFileSync(p, 'utf8'), before[i]);
});

test('audit: uninstall refuses unmigrated truth and unreadable state', t => {
  const d = scratch(t); const legacy = jsonl(d, '.aegis/memory/records.jsonl', [record('mem-0001')]);
  assert.equal(aegis(d, ['remove']).status, 4); assert.ok(fs.existsSync(legacy));
  fs.rmSync(legacy); fs.writeFileSync(path.join(d, '.aegis/state.json'), '{broken');
  assert.equal(aegis(d, ['remove']).status, 4); assert.ok(fs.existsSync(path.join(d, '.aegis')));
});

test('audit: every lane operation rejects traversal without deleting outside JSONL', t => {
  const d = scratch(t); const p = jsonl(d, 'outside.jsonl', [record('mem-9000')]);
  for (const op of ['list', 'promote']) {
    assert.equal(aegis(d, ['memory', op, '--lane', '../../../outside']).status, 2);
    assert.ok(fs.existsSync(p));
  }
});

test('audit: memory rejects linked lane directories', t => {
  const d = scratch(t); const target = path.join(d, 'outside'); fs.mkdirSync(target);
  fs.mkdirSync(path.join(d, 'brain/memory'), { recursive: true });
  fs.symlinkSync(target, path.join(d, 'brain/memory/lanes'), process.platform === 'win32' ? 'junction' : 'dir');
  assert.notEqual(aegis(d, ['memory', 'add', '--type', 'finding', '--title', 'x', '--body', 'y', '--lane', 'w1']).status, 0);
  assert.deepEqual(fs.readdirSync(target), []);
});

test('audit: failed memory add leaves all records byte-identical', t => {
  const d = scratch(t); check(add(d)); const p = path.join(d, 'brain/memory/records.jsonl'), before = fs.readFileSync(p, 'utf8');
  const r = aegis(d, ['memory', 'add', '--type', 'finding', '--title', 'replacement', '--body', 'body',
    '--supersedes', 'mem-0001', '--contradicts', 'mem-9999']);
  assert.equal(r.status, 2); assert.equal(fs.readFileSync(p, 'utf8'), before);
});

test('audit: memory mutations serialize a stale rewrite against a concurrent add', async t => {
  const d = scratch(t); check(add(d)); const marker = path.join(d, 'verify-paused');
  const a = worker(t, d, pauseCode + `
const original = fs.readFileSync; let reads = 0;
fs.readFileSync = function(p, ...args) { const bytes = original.call(this, p, ...args);
  if (String(p).endsWith(path.join('memory', 'records.jsonl')) && ++reads === 2) pause(${JSON.stringify(marker)});
  return bytes; };
(await import(${url('commands/memory.js')})).memory(['verify', 'mem-0001', '--confidence', '0.8']);`);
  await wait(marker);
  const b = worker(t, d, `(await import(${url('commands/memory.js')})).memory(['add','--type','finding','--title','concurrent','--body','body']);`);
  await new Promise(r => setTimeout(r, 150)); release(marker); check(await a); check(await b);
  const records = fs.readFileSync(path.join(d, 'brain/memory/records.jsonl'), 'utf8').trim().split('\n').map(JSON.parse);
  assert.equal(records.length, 2); assert.equal(records[0].confidence, 0.8); assert.equal(new Set(records.map(r => r.id)).size, 2);
});

test('audit: parallel additions allocate unique IDs without losing records', async t => {
  const d = scratch(t);
  const runs = await Promise.all(Array.from({ length: 8 }, () => worker(t, d,
    `(await import(${url('commands/memory.js')})).memory(['add','--type','finding','--title','parallel','--body','body']);`)));
  runs.forEach(check);
  const records = fs.readFileSync(path.join(d, 'brain/memory/records.jsonl'), 'utf8').trim().split('\n').map(JSON.parse);
  assert.equal(records.length, 8); assert.equal(new Set(records.map(r => r.id)).size, 8);
});

test('audit: refusals and successful next release locks immediately; next still requires app', t => {
  const d = scratch(t);
  assert.equal(aegis(d, ['transition', '99z']).status, 4);
  assert.ok(!fs.existsSync(path.join(d, '.aegis/state.json.lock')));
  check(aegis(d, ['next'])); assert.ok(!fs.existsSync(path.join(d, '.aegis/state.json.lock')));
  check(aegis(d, ['config', 'set', 'apps', 'web,api'])); assert.equal(aegis(d, ['next']).status, 2);
});

test('audit: malformed lock is refused rather than stolen', t => {
  const d = scratch(t); const lock = path.join(d, '.aegis/state.json.lock'); fs.writeFileSync(lock, '{unfinished');
  const r = aegis(d, ['transition', '00b']); assert.equal(r.status, 4); assert.equal(fs.readFileSync(lock, 'utf8'), '{unfinished');
});

test('audit: a live lock is never stolen based on its age', async t => {
  const d = scratch(t); const marker = path.join(d, 'holder');
  const a = worker(t, d, pauseCode + `const m = await import(${url('lib/state.js')}); const s = m.acquireState(m.stateP);
pause(${JSON.stringify(marker)}); s.history.push({skill:'00a',at:'fixture',event:'holder'}); m.commitState(m.stateP,s);`);
  await wait(marker);
  const b = worker(t, d, `const now=Date.now.bind(Date); Date.now=()=>now()+61000;
const m=await import(${url('lib/state.js')}); const s=m.acquireState(m.stateP); s.history.push({skill:'00a',at:'fixture',event:'contender'}); m.commitState(m.stateP,s);`);
  await new Promise(r => setTimeout(r, 200)); release(marker); check(await a); check(await b);
  assert.deepEqual(readState(d).history.map(r => r.event).sort(), ['contender', 'holder']);
});

test('audit: dead-lock reclaimers cannot unlink a replacement live owner', async t => {
  const d = scratch(t); fs.writeFileSync(path.join(d, '.aegis/state.json.lock'), JSON.stringify({ pid: 99999999, at: Date.now() }));
  const ma = path.join(d, 'reclaimer'), mb = path.join(d, 'new-owner');
  const a = worker(t, d, pauseCode + `const rm=fs.rmSync; let once=true;
fs.rmSync=function(p,...args){if(once&&String(p).endsWith('state.json.lock')){once=false;pause(${JSON.stringify(ma)});}return rm.call(this,p,...args);};
const m=await import(${url('lib/state.js')});const s=m.acquireState(m.stateP);s.history.push({skill:'00a',at:'fixture',event:'a'});m.commitState(m.stateP,s);`);
  await wait(ma);
  const b = worker(t, d, pauseCode + `const m=await import(${url('lib/state.js')});const s=m.acquireState(m.stateP);
pause(${JSON.stringify(mb)});s.history.push({skill:'00a',at:'fixture',event:'b'});m.commitState(m.stateP,s);`);
  await new Promise(r => setTimeout(r, 200)); const acquiredDuringReclaim = fs.existsSync(mb);
  release(ma); await wait(mb); release(mb); check(await a); check(await b);
  assert.equal(acquiredDuringReclaim, false); assert.equal(readState(d).history.length, 2);
});

test('audit: release never unlinks another owner token', async t => {
  const d = scratch(t);
  const r = await worker(t, d, `import fs from 'node:fs';const m=await import(${url('lib/lock.js')});
const p='resource';const unlock=m.lockFile(p);const file=p+'.lock';
fs.writeFileSync(file,JSON.stringify({pid:process.pid,at:Date.now(),token:'replacement'}));
unlock();if(!fs.existsSync(file))process.exit(9);`);
  check(r);
});

test('audit: resume detects added truth and modified runtime configuration', t => {
  const d = scratch(t); check(aegis(d, ['checkpoint']));
  jsonl(d, 'brain/memory/records.jsonl', [record('mem-9000')]);
  assert.equal(aegis(d, ['resume']).status, 6);
  check(aegis(d, ['checkpoint']));
  const config = path.join(d, '.aegis/config.json'); const c = JSON.parse(fs.readFileSync(config, 'utf8'));
  c.contracts_path = 'changed'; fs.writeFileSync(config, JSON.stringify(c));
  assert.equal(aegis(d, ['resume']).status, 6);
});

test('audit: checkpoint refuses an external junction instead of reading it', t => {
  const d = scratch(t); const target = path.join(d, 'unowned'); fs.mkdirSync(target); fs.writeFileSync(path.join(target, 'file'), 'private');
  fs.symlinkSync(target, path.join(d, 'brain', 'junction'), process.platform === 'win32' ? 'junction' : 'dir');
  assert.equal(aegis(d, ['checkpoint']).status, 6);
});

test('audit: concurrent checkpoint and transition cannot produce a verified stale position', async t => {
  const d = scratch(t); const marker = path.join(d, 'checkpoint-paused');
  const a = worker(t, d, pauseCode + `const read=fs.readFileSync;let once=true;
fs.readFileSync=function(p,...args){const result=read.call(this,p,...args);if(once&&String(p).endsWith(path.join('.aegis','state.json'))){once=false;pause(${JSON.stringify(marker)});}return result;};
(await import(${url('commands/persist.js')})).checkpoint([]);`);
  await wait(marker);
  const b = worker(t, d, `(await import(${url('commands/state.js')})).transition(['00b']);`);
  await new Promise(r => setTimeout(r, 150)); release(marker); check(await a); check(await b);
  const r = aegis(d, ['resume']);
  assert.ok(r.status === 6 || (r.status === 0 && r.stdout.includes(`resume at skill: ${readState(d).current_skill}`)), r.stdout + r.stderr);
});

test('audit: checkpoint IDs are unique even with an identical wall-clock timestamp', async t => {
  const d = scratch(t); const before = fs.readdirSync(path.join(d, '.aegis/checkpoints')).length;
  const code = `Date.now=()=>1900000000000;(await import(${url('commands/persist.js')})).checkpoint([]);`;
  (await Promise.all(Array.from({ length: 5 }, () => worker(t, d, code)))).forEach(check);
  assert.equal(fs.readdirSync(path.join(d, '.aegis/checkpoints')).length - before, 5);
});

test('audit: uninstall cannot delete a concurrently registered slice', async t => {
  const d = scratch(t); const marker = path.join(d, 'uninstall-paused');
  const a = worker(t, d, pauseCode + `const read=fs.readFileSync;let once=true;
fs.readFileSync=function(p,...args){const result=read.call(this,p,...args);if(once&&String(p).endsWith(path.join('.aegis','state.json'))){once=false;pause(${JSON.stringify(marker)});}return result;};
(await import(${url('commands/remove.js')})).remove([]);`);
  await wait(marker);
  const b = worker(t, d, `(await import(${url('commands/slice.js')})).slice(['create','new']);`);
  await new Promise(r => setTimeout(r, 150)); release(marker); const [ar, br] = await Promise.all([a, b]);
  assert.ok(ar.status !== 0 || br.status !== 0, JSON.stringify([ar, br]));
});

test('audit: pending memory transaction cannot be discarded by uninstall or checkpointed as complete', t => {
  const d = scratch(t); check(add(d));
  const p = path.join(d, '.aegis/memory/transaction.json'); fs.writeFileSync(p, '[]');
  assert.equal(aegis(d, ['remove']).status, 4); assert.ok(fs.existsSync(p));
  assert.equal(aegis(d, ['checkpoint']).status, 6); assert.ok(fs.existsSync(p));
});

test('audit: partial memory promotion replays once without losing or duplicating records', t => {
  const d = scratch(t); check(add(d)); check(aegis(d, ['memory', 'add', '--type', 'finding', '--title', 'lane', '--body', 'body', '--lane', 'w1']));
  const main = path.join(d, 'brain/memory/records.jsonl'), lane = path.join(d, 'brain/memory/lanes/w1.jsonl');
  const before = fs.readFileSync(main, 'utf8'), laneBefore = fs.readFileSync(lane, 'utf8');
  const promoted = JSON.parse(laneBefore); promoted.lane = null;
  const after = before + JSON.stringify(promoted) + '\n';
  fs.writeFileSync(main, after); // crash after destination publication, before source removal
  fs.writeFileSync(path.join(d, '.aegis/memory/transaction.json'), JSON.stringify([
    { file: 'records.jsonl', before, after }, { file: 'lanes/w1.jsonl', before: laneBefore, after: null },
  ]));
  check(aegis(d, ['memory', 'sync'])); check(aegis(d, ['memory', 'sync']));
  assert.equal(fs.readFileSync(main, 'utf8'), after); assert.ok(!fs.existsSync(lane));
});

test('audit: memory journal conflicts retain journal and every changed source', t => {
  const d = scratch(t); check(add(d));
  const main = path.join(d, 'brain/memory/records.jsonl'), before = fs.readFileSync(main, 'utf8');
  const journal = path.join(d, '.aegis/memory/transaction.json');
  fs.writeFileSync(journal, JSON.stringify([{ file: 'records.jsonl', before: 'different', after: 'replacement' }]));
  assert.equal(aegis(d, ['memory', 'sync']).status, 4);
  assert.ok(fs.existsSync(journal)); assert.equal(fs.readFileSync(main, 'utf8'), before);
});

test('audit: source validation finishes before any JSONL replacement is published', async t => {
  const d = scratch(t); check(add(d)); const main = path.join(d, 'brain/memory/records.jsonl');
  const before = fs.readFileSync(main, 'utf8');
  const r = await worker(t, d, `import fs from 'node:fs'; import path from 'node:path';
const write=fs.writeFileSync;
fs.writeFileSync=function(p,...args){if(typeof p==='string'&&p.endsWith(path.join('memory','records.jsonl')))throw Error('in-place JSONL write');return write.call(this,p,...args);};
(await import(${url('commands/memory.js')})).memory(['verify','mem-0001','--confidence','0.9']);`);
  check(r); assert.notEqual(fs.readFileSync(main, 'utf8'), before);
});

test('audit: raw file locks serialize two reclaimers independently of lifecycle locking', async t => {
  const d = scratch(t); const resource = path.join(d, 'resource');
  fs.writeFileSync(resource + '.lock', JSON.stringify({ pid: 99999999, at: Date.now() }));
  const ma = path.join(d, 'raw-reclaimer'), mb = path.join(d, 'raw-owner');
  const a = worker(t, d, pauseCode + `const rm=fs.rmSync;let once=true;
fs.rmSync=function(p,...args){if(once&&String(p)===${JSON.stringify(resource + '.lock')}){once=false;pause(${JSON.stringify(ma)});}return rm.call(this,p,...args);};
const m=await import(${url('lib/lock.js')});m.withFileLock(${JSON.stringify(resource)},()=>fs.appendFileSync('events','a'));`);
  await wait(ma);
  const b = worker(t, d, pauseCode + `const m=await import(${url('lib/lock.js')});m.withFileLock(${JSON.stringify(resource)},()=>{pause(${JSON.stringify(mb)});fs.appendFileSync('events','b');});`);
  await new Promise(r => setTimeout(r, 150)); const early = fs.existsSync(mb);
  release(ma); await wait(mb); release(mb); check(await a); check(await b);
  assert.equal(early, false); assert.equal(fs.readFileSync(path.join(d, 'events'), 'utf8').length, 2);
});

test('audit: file locks release after callback exceptions and ordinary process exit', async t => {
  const d = scratch(t);
  const r = await worker(t, d, `const m=await import(${url('lib/lock.js')});
try{m.withFileLock('exception',()=>{throw Error('expected');});}catch{}
m.lockFile('exit');process.exit(4);`);
  assert.equal(r.status, 4);
  assert.ok(!fs.existsSync(path.join(d, 'exception.lock'))); assert.ok(!fs.existsSync(path.join(d, 'exit.lock')));
});

test('audit: reconcile refuses dangling parties before mutating any record', t => {
  const d = scratch(t); check(add(d));
  const task = { ...record('mem-0002'), type: 'reconcile', status: 'open', parties: ['mem-0001', 'mem-9999'] };
  const p = jsonl(d, 'brain/memory/records.jsonl', [record('mem-0001'), task]);
  const before = fs.readFileSync(p, 'utf8');
  const r = aegis(d, ['memory', 'reconcile', 'mem-0002', '--winner', 'mem-0001', '--resolution', 'evidence']);
  assert.equal(r.status, 2); assert.equal(fs.readFileSync(p, 'utf8'), before);
});

test('audit: local citations cannot traverse outside their repo', t => {
  const d = scratch(t); const outside = path.join(path.dirname(d), path.basename(d) + '-citation.txt');
  fs.writeFileSync(outside, 'outside'); t.after(() => fs.rmSync(outside, { force: true }));
  const r = aegis(d, ['memory', 'add', '--type', 'finding', '--title', 'x', '--body', 'y', '--cites', outside]);
  assert.equal(r.status, 2); assert.ok(!fs.existsSync(path.join(d, 'brain/memory/records.jsonl')));
});

test('audit: ignored local work in a slice is preserved too', t => {
  const d = scratch(t); fs.appendFileSync(path.join(d, '.gitignore'), '\nkept-local.txt\n');
  gitIn(d, ['add', '.gitignore']); gitIn(d, ['commit', '-qm', 'ignore fixture']);
  check(aegis(d, ['slice', 'create', 'local'])); const w = readState(d).slices.local.dir;
  fs.writeFileSync(path.join(w, 'kept-local.txt'), 'local-only work');
  const r = aegis(d, ['slice', 'remove', 'local']); assert.equal(r.status, 4);
  assert.equal(fs.readFileSync(path.join(w, 'kept-local.txt'), 'utf8'), 'local-only work');
  assert.ok(readState(d).slices.local);
});

test('audit: migration detects conflicting record IDs across main and lane stores', t => {
  const d = scratch(t);
  const main = jsonl(d, 'brain/memory/records.jsonl', [record('mem-0001', 'new main')]);
  const legacy = jsonl(d, '.aegis/memory/lanes/w1.jsonl', [record('mem-0001', 'unmerged legacy lane')]);
  const before = fs.readFileSync(legacy, 'utf8');
  assert.equal(aegis(d, ['memory', 'sync']).status, 4);
  assert.equal(fs.readFileSync(legacy, 'utf8'), before);
  assert.equal(JSON.parse(fs.readFileSync(main, 'utf8')).title, 'new main');
});

for (const link of ['symlink', 'hardlink']) {
  test(`audit cycle 2: journal publication preserves a preplanted ${link} sentinel`, async t => {
    const d = scratch(t);
    const sentinel = path.join(path.dirname(d), `${path.basename(d)}-${link}-sentinel.txt`);
    const bytes = 'irreplaceable outside content\n'; fs.writeFileSync(sentinel, bytes);
    t.after(() => fs.rmSync(sentinel, { force: true }));
    const r = await worker(t, d, `import fs from 'node:fs';import path from 'node:path';
fs.mkdirSync('.aegis/memory',{recursive:true});
const temporary=path.resolve('.aegis/memory/transaction.json.tmp-'+process.pid);
fs.${link === 'symlink' ? 'symlinkSync' : 'linkSync'}(${JSON.stringify(sentinel)},temporary);
(await import(${url('commands/memory.js')})).memory(['add','--type','finding','--title','test','--body','evidence']);
if(!fs.lstatSync(temporary))process.exit(8);`);
    assert.equal(fs.readFileSync(sentinel, 'utf8'), bytes);
    check(r);
    assert.equal(JSON.parse(fs.readFileSync(path.join(d, 'brain/memory/records.jsonl'), 'utf8')).title, 'test');
    assert.ok(!fs.existsSync(path.join(d, '.aegis/memory/transaction.json')));
  });
}

test('audit cycle 2: verified-absent worktree and Git registry release only the stale Aegis lane', t => {
  const d = scratch(t); check(aegis(d, ['slice', 'create', 'stale']));
  const meta = readState(d).slices.stale;
  gitIn(d, ['worktree', 'remove', meta.dir]);
  assert.ok(!fs.existsSync(meta.dir));
  check(aegis(d, ['slice', 'remove', 'stale']));
  assert.ok(!readState(d).slices.stale); assert.ok(!readState(d).lanes.active.includes('stale'));
  assert.equal(gitIn(d, ['rev-parse', '--verify', meta.branch]).length, 40, 'retained branch is not discarded');
  assert.ok(!fs.existsSync(path.join(d, '.aegis/state.json.lock')));
});

for (const locked of [false, true]) {
  test(`audit cycle 2: absent ${locked ? 'locked' : 'registered'} worktree retains its Aegis registration while Git still knows it`, t => {
    const d = scratch(t); check(aegis(d, ['slice', 'create', 'uncertain']));
    const meta = readState(d).slices.uncertain;
    if (locked) gitIn(d, ['worktree', 'lock', meta.dir]);
    fs.renameSync(meta.dir, `${meta.dir}-moved`);
    const r = aegis(d, ['slice', 'remove', 'uncertain']);
    assert.equal(r.status, 4); assert.ok(readState(d).slices.uncertain);
    assert.ok(readState(d).lanes.active.includes('uncertain')); assert.ok(fs.existsSync(`${meta.dir}-moved`));
  });
}

test('audit cycle 2: an unavailable Git registry cannot clear an absent slice', async t => {
  const d = scratch(t); check(aegis(d, ['slice', 'create', 'unknown']));
  gitIn(d, ['worktree', 'remove', readState(d).slices.unknown.dir]);
  const before = fs.readFileSync(path.join(d, '.aegis/state.json'), 'utf8');
  const r = await worker(t, d, `import cp from 'node:child_process';import {syncBuiltinESMExports} from 'node:module';
const exec=cp.execFileSync;cp.execFileSync=function(bin,args,...rest){
if(bin==='git'&&args[0]==='worktree'&&args[1]==='list')throw Error('registry unavailable');
return exec.call(this,bin,args,...rest);};syncBuiltinESMExports();
(await import(${url('commands/slice.js')})).slice(['remove','unknown']);`);
  assert.equal(r.status, 4); assert.equal(fs.readFileSync(path.join(d, '.aegis/state.json'), 'utf8'), before);
  assert.ok(!fs.existsSync(path.join(d, '.aegis/state.json.lock')));
});
