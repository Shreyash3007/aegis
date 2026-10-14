// Record memory beside brain/ (SPEC §8): typed records, supersede links,
// contradiction -> reconcile tasks, decay surfacing, lane sealing +
// promotion, FTS search, deterministic rendered view, resume-pack line.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { scratch, aegis } from './helpers.js';

const mem = (dir, args) => aegis(dir, ['memory', ...args]);
// Fixture cites a real file: cites must resolve (exit 4 otherwise).
const addFinding = (dir, extra = []) => {
  fs.writeFileSync(path.join(dir, 'oracle.ts'), 'export const oracle = true\n');
  return mem(dir, ['add', '--type', 'finding',
    '--title', 'oracle refuses quarantined paths', '--body', 'merge check exits 9 on frozen lanes',
    '--cites', 'oracle.ts:1', ...extra]);
};

test('memory add/list/get: typed record with citations', (t) => {
  const dir = scratch(t);
  const a = addFinding(dir);
  assert.equal(a.status, 0, a.stderr);
  assert.match(a.stdout, /mem-0001 \[finding\/active\/0\.5\]/);
  const l = mem(dir, ['list']);
  assert.match(l.stdout, /mem-0001 \[finding\/active\/0\.5\].*cites:1/);
  const g = mem(dir, ['get', 'mem-0001']);
  assert.equal(g.status, 0, g.stderr);
  assert.match(g.stdout, /"type": "finding"/);
});

test('memory add: rejects bad type, bad confidence, missing link targets', (t) => {
  const dir = scratch(t);
  assert.equal(mem(dir, ['add', '--type', 'hunch', '--title', 'x', '--body', 'y']).status, 2);
  assert.equal(addFinding(dir, ['--confidence', '2']).status, 2);
  assert.equal(addFinding(dir, ['--supersedes', 'mem-9999']).status, 2);
  assert.equal(addFinding(dir, ['--contradicts', 'mem-9999']).status, 2);
});

test('memory add: cites must resolve (phantom citations refused)', (t) => {
  const dir = scratch(t);
  const phantom = mem(dir, ['add', '--type', 'finding', '--title', 'x', '--body', 'y', '--cites', 'src/nope.ts:1']);
  assert.equal(phantom.status, 2, phantom.stderr);
  assert.match(phantom.stderr, /cite target not found/);
  const dangling = mem(dir, ['add', '--type', 'finding', '--title', 'x', '--body', 'y', '--cites', 'mem-0099']);
  assert.equal(dangling.status, 2, dangling.stderr);
  assert.match(dangling.stderr, /dangling record ref/);
  fs.writeFileSync(path.join(dir, 'real.ts'), 'export const r = 1\n');
  assert.equal(mem(dir, ['add', '--type', 'finding', '--title', 'x', '--body', 'y',
    '--cites', 'real.ts:1,https://example.com/spec']).status, 0);
});

test('memory supersede: old record marked, link recorded', (t) => {
  const dir = scratch(t);
  addFinding(dir);
  const b = addFinding(dir, ['--title', 'revised finding', '--supersedes', 'mem-0001']);
  assert.equal(b.status, 0, b.stderr);
  assert.match(b.stdout, /supersedes mem-0001/);
  assert.match(mem(dir, ['list', '--status', 'superseded']).stdout, /mem-0001/);
});

test('memory contradict -> reconcile task; resolve supersedes the loser', (t) => {
  const dir = scratch(t);
  addFinding(dir);
  const b = mem(dir, ['add', '--type', 'assumption', '--title', 'rival claim',
    '--body', 'oracle passes frozen lanes', '--contradicts', 'mem-0001']);
  assert.equal(b.status, 0, b.stderr);
  assert.match(b.stdout, /reconcile (mem-\d+) opened vs mem-0001/);
  const task = b.stdout.match(/reconcile (mem-\d+) opened/)[1];
  const r = mem(dir, ['reconcile', task, '--winner', 'mem-0001', '--resolution', 'oracle test proves refusal']);
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /winner: mem-0001/);
  assert.match(mem(dir, ['list', '--status', 'resolved']).stdout, new RegExp(task));
  assert.match(mem(dir, ['list', '--status', 'superseded']).stdout, /mem-0002/);
  const bad = mem(dir, ['reconcile', task, '--winner', 'mem-0001', '--resolution', 'again']);
  assert.equal(bad.status, 4, 'closed tasks refuse re-resolution');
});

test('memory stale: expired + low-confidence surface for re-verification', (t) => {
  const dir = scratch(t);
  addFinding(dir);
  addFinding(dir, ['--title', 'old claim', '--expiry', '2000-01-01']);
  addFinding(dir, ['--title', 'shaky claim', '--confidence', '0.2']);
  const s = mem(dir, ['list', '--stale']);
  assert.equal(s.status, 0, s.stderr);
  assert.doesNotMatch(s.stdout, /mem-0001/);
  assert.match(s.stdout, /mem-0002.*STALE\(expired\)/);
  assert.match(s.stdout, /mem-0003.*STALE\(lowconf\)/);
  const v = mem(dir, ['verify', 'mem-0003', '--confidence', '0.9']);
  assert.equal(v.status, 0, v.stderr);
  assert.doesNotMatch(mem(dir, ['list', '--stale']).stdout, /mem-0003/);
});

test('memory --app: per-record tags filter lists; unknown apps refused where declared', (t) => {
  const dir = scratch(t);
  fs.writeFileSync(path.join(dir, 'ev.ts'), 'export const e = 1\n');
  assert.equal(mem(dir, ['add', '--type', 'finding', '--title', 'web finding', '--body', 'b', '--cites', 'ev.ts:1', '--app', 'web']).status, 0);
  assert.equal(mem(dir, ['add', '--type', 'finding', '--title', 'untagged', '--body', 'b', '--cites', 'ev.ts:1']).status, 0);
  assert.match(mem(dir, ['list', '--app', 'web']).stdout, /web finding/);
  assert.doesNotMatch(mem(dir, ['list', '--app', 'web']).stdout, /untagged/);
  assert.match(mem(dir, ['list', '--app', 'api']).stdout, /no memory records match/);
  assert.match(mem(dir, ['list']).stdout, /untagged/, 'default list shows all scopes');
  assert.match(mem(dir, ['list']).stdout, /@app:web/, 'app tag visible');
  assert.equal(aegis(dir, ['config', 'set', 'apps', 'web,api']).status, 0);
  const bad = mem(dir, ['add', '--type', 'finding', '--title', 'x', '--body', 'b', '--app', 'nope']);
  assert.equal(bad.status, 2, bad.stderr);
  assert.match(bad.stderr, /unknown app 'nope'/);
});

test('memory lanes: sealed by default, promoted through the merge-gate path', (t) => {
  const dir = scratch(t);
  addFinding(dir);
  const a = addFinding(dir, ['--title', 'lane note', '--lane', 'w1']);
  assert.equal(a.status, 0, a.stderr);
  assert.doesNotMatch(mem(dir, ['list']).stdout, /lane note/, 'lane scratch sealed from default list');
  assert.match(mem(dir, ['list', '--lane', 'w1']).stdout, /lane note/);
  assert.match(mem(dir, ['list', '--all']).stdout, /lane note/);
  const p = mem(dir, ['promote', '--lane', 'w1']);
  assert.equal(p.status, 0, p.stderr);
  assert.match(p.stdout, /1 record\(s\) from lane w1/);
  assert.match(mem(dir, ['list']).stdout, /lane note/, 'promoted records join the main store');
});

test('memory retire: reason mandatory, loser link optional', (t) => {
  const dir = scratch(t);
  addFinding(dir);
  assert.equal(mem(dir, ['retire', 'mem-0001']).status, 4);
  const r = mem(dir, ['retire', 'mem-0001', '--reason', 'outdated by trial']);
  assert.equal(r.status, 0, r.stderr);
  assert.match(mem(dir, ['list', '--status', 'superseded']).stdout, /mem-0001/);
});

test('memory search: finds cited tokens across the store', (t) => {
  const dir = scratch(t);
  addFinding(dir);
  addFinding(dir, ['--title', 'unrelated', '--body', 'nothing in common here']);
  const s = mem(dir, ['list', '--search', 'quarantined lanes']);
  assert.match(s.stdout, /mem-0001/);
  assert.doesNotMatch(s.stdout, /mem-0002/);
});

test('memory sync: rendered view deterministic across runs', (t) => {
  const dir = scratch(t);
  addFinding(dir);
  addFinding(dir, ['--title', 'second', '--confidence', '0.2']);
  assert.equal(mem(dir, ['sync']).status, 0);
  const view = path.join(dir, 'brain', 'memory.md');
  const once = fs.readFileSync(view, 'utf8');
  assert.match(once, /total: 2 \| stale \(re-verify\): 1 \| open reconciles: 0/);
  assert.equal(mem(dir, ['sync']).status, 0);
  assert.equal(fs.readFileSync(view, 'utf8'), once, 'render is a pure function of the store');
});

test('resume pack carries the memory summary line', (t) => {
  const dir = scratch(t);
  assert.equal(aegis(dir, ['checkpoint']).status, 0);
  const bare = aegis(dir, ['resume']);
  assert.equal(bare.status, 0, bare.stderr);
  assert.doesNotMatch(bare.stdout, /memory:/, 'unused store adds no line');
  addFinding(dir);
  assert.equal(aegis(dir, ['checkpoint']).status, 0);
  const r = aegis(dir, ['resume']);
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /memory: 1 active, 0 stale \(re-verify\), 0 open reconciles/);
});

test('memory truth is committed: tampering records.jsonl trips integrity (exit 6)', (t) => {
  const dir = scratch(t);
  addFinding(dir);
  assert.equal(aegis(dir, ['checkpoint']).status, 0);
  const store = path.join(dir, 'brain', 'memory', 'records.jsonl');
  assert.ok(fs.existsSync(store), 'truth lives committed at brain/memory/records.jsonl');
  fs.appendFileSync(store, JSON.stringify({ id: 'mem-9999', type: 'finding', title: 'forged', body: 'x', status: 'active', confidence: 1, cites: [], expiry: null, supersedes: null, parties: null, winner: null, resolution: null, lane: null, at: 't', verified_at: null, history: [] }) + '\n');
  const bad = aegis(dir, ['resume']);
  assert.equal(bad.status, 6, bad.stderr);
  assert.match(bad.stderr, /MODIFIED: brain[\\/]memory[\\/]records\.jsonl/);
});

test('memory migrates the pre-0.9 gitignored store forward once', (t) => {
  const dir = scratch(t);
  addFinding(dir);
  // Simulate a pre-0.9 install: truth under .aegis, nothing committed.
  const legacy = path.join(dir, '.aegis', 'memory');
  fs.mkdirSync(legacy, { recursive: true });
  fs.copyFileSync(path.join(dir, 'brain', 'memory', 'records.jsonl'), path.join(legacy, 'records.jsonl'));
  fs.rmSync(path.join(dir, 'brain', 'memory', 'records.jsonl'));
  const r = mem(dir, ['list']);
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /mem-0001/);
  assert.ok(fs.existsSync(path.join(dir, 'brain', 'memory', 'records.jsonl')), 'migrated into the committed store');
  assert.ok(!fs.existsSync(path.join(legacy, 'records.jsonl')), 'legacy copy removed');
});
