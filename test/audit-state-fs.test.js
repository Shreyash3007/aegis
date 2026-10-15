import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
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
  const d = scratch(t); check(aegis(d, ['slice', 'create', 'dirty']));
  const w = readState(d).slices.dirty.dir;
  fs.writeFileSync(path.join(w, 'user.txt'), 'irreplaceable');
  const r = aegis(d, ['slice', 'remove', 'dirty']);
  assert.equal(r.status, 4, r.stderr); assert.equal(fs.readFileSync(path.join(w, 'user.txt'), 'utf8'), 'irreplaceable');
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

test('audit: memory rejects linked stores and linked lane files', t => {
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
