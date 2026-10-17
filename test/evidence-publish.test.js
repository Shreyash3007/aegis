// Evidence publisher v2 (v0.11 R4). The bare `aegis evidence export` keeps
// the v1 aggregate shape (pinned by the judgment-budget and audit
// regressions); `--battery` upgrades the same exporter into the release
// publisher: the document binds the exact candidate sha, the CI linkage,
// battery observations, verified artifact bytes and known limitations.
// Private paths, credentials, raw prompt blobs and any attempt to republish
// caller-reported cost as billed refuse; an existing observation is never
// replaced. Every negative case asserts nothing was written. The tripwires
// are conservative refusals, not proof of absence.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { scratch, aegis, gitIn } from './helpers.js';

const sha256 = (buf) => crypto.createHash('sha256').update(buf).digest('hex');

function artifactFixture(dir, name, content) {
  fs.writeFileSync(path.join(dir, name), content);
  return { name, sha256: sha256(content), bytes: Buffer.byteLength(content) };
}

function batteryFixture(dir, over = {}) {
  return {
    source_sha: gitIn(dir, ['rev-parse', 'HEAD']),
    ci: { run_url: 'https://github.com/Shreyash3007/aegis/actions/runs/12345', conclusion: 'success' },
    observations: [
      { name: 'typecheck', command: 'npm run typecheck', exit: 0, summary: 'tsc --noEmit clean' },
      { name: 'tests', command: 'npm test', exit: 0, summary: 'full suite green' },
    ],
    artifacts: [],
    limitations: ['fixture battery - not a release observation'],
    ...over,
  };
}

function writeBattery(dir, over = {}) {
  const file = path.join(dir, 'battery.json');
  fs.writeFileSync(file, JSON.stringify(batteryFixture(dir, over), null, 2));
  return file;
}

const outOf = (dir) => path.join(dir, '.aegis', 'release-evidence.json');
const publish = (dir, out, battery) => aegis(dir, ['evidence', 'export', '--file', out, '--battery', battery, '--artifacts-dir', dir]);

test('publish: v2 release evidence binds the candidate sha, ci linkage, observations and verified artifact bytes', (t) => {
  const dir = scratch(t);
  assert.equal(aegis(dir, ['evidence', 'usage', '--model', 'secret-model', '--tokens-in', '10', '--tokens-out', '3', '--cost-usd', '0.02']).status, 0);
  const art = artifactFixture(dir, 'aegis-0.11.0.tgz', 'tarball bytes');
  const battery = writeBattery(dir, { artifacts: [art] });
  const out = outOf(dir);
  const r = publish(dir, out, battery);
  assert.equal(r.status, 0, r.stderr);
  const doc = JSON.parse(fs.readFileSync(out, 'utf8'));
  assert.deepEqual(Object.keys(doc).sort(), ['artifacts', 'ci', 'judgments', 'limitations', 'observations', 'privacy', 'schema_version', 'source_sha', 'usage']);
  assert.equal(doc.schema_version, 2);
  assert.equal(doc.source_sha, gitIn(dir, ['rev-parse', 'HEAD']));
  assert.deepEqual(doc.ci, { run_url: 'https://github.com/Shreyash3007/aegis/actions/runs/12345', conclusion: 'success' });
  assert.deepEqual(doc.observations.map((o) => o.name), ['typecheck', 'tests']);
  assert.deepEqual(doc.artifacts, [art]);
  assert.deepEqual(doc.limitations, ['fixture battery - not a release observation']);
  assert.equal(doc.usage.provenance, 'executor-reported (not independently verified)');
  assert.equal(doc.usage.tokens_in, 10);
  assert.equal(doc.usage.cost_usd, 0.02);
  assert.equal(doc.usage.cost_status, 'REPORTED');
  assert.equal(doc.privacy, 'aggregate only; no raw state, prompts, model names or commands');
  assert.ok(!JSON.stringify(doc).includes('secret-model'), 'published facts exclude model identifiers');
});

test('publish: missing or stale observation bindings refuse without writing', (t) => {
  const dir = scratch(t);
  const out = outOf(dir);
  const malformed = path.join(dir, 'malformed.json');
  fs.writeFileSync(malformed, '{oops');
  const cases = [
    [writeBattery(dir, { source_sha: undefined }), /missing|source/i],
    [writeBattery(dir, { observations: [] }), /observation/i],
    [writeBattery(dir, { source_sha: '0'.repeat(40) }), /stale/i],
    [malformed, /malformed|battery|read/i],
    [path.join(dir, 'absent.json'), /battery|missing|read/i],
  ];
  for (const [battery, why] of cases) {
    const r = publish(dir, out, battery);
    assert.equal(r.status, 4, `${battery}: ${r.stderr}`);
    assert.match(r.stderr, why, battery);
    assert.ok(!fs.existsSync(out), `${battery}: refusal must not write`);
  }
  assert.equal(aegis(dir, ['evidence', 'export', '--file', out, '--battery']).status, 2, 'a dangling --battery is a malformed call');
  assert.equal(aegis(dir, ['evidence', 'export', '--file', out, '--battery', writeBattery(dir), '--wat']).status, 2, 'unknown export flags are malformed');
  assert.ok(!fs.existsSync(out));
});

test('publish: an existing observation is never replaced (create-only, successor names)', (t) => {
  const dir = scratch(t);
  const battery = writeBattery(dir);
  const out = outOf(dir);
  assert.equal(publish(dir, out, battery).status, 0);
  const before = fs.readFileSync(out, 'utf8');
  const r = publish(dir, out, battery);
  assert.equal(r.status, 4, r.stderr);
  assert.match(r.stderr, /exists|successor/i);
  assert.equal(fs.readFileSync(out, 'utf8'), before, 'published bytes are immutable');
});

test('publish: stale, missing or linked artifacts refuse (sha256 byte binding)', (t) => {
  const dir = scratch(t);
  const out = outOf(dir);
  const stale = artifactFixture(dir, 'stale.tgz', 'real bytes');
  fs.writeFileSync(path.join(dir, 'stale.tgz'), 'substituted bytes');
  artifactFixture(dir, 'target.tgz', 'linked bytes');
  fs.symlinkSync(path.join(dir, 'target.tgz'), path.join(dir, 'linked.tgz'), 'file');
  const cases = [
    [{ name: 'stale.tgz', sha256: stale.sha256, bytes: stale.bytes }, /stale/i],
    [{ name: 'absent.tgz', sha256: 'a'.repeat(64), bytes: 3 }, /missing/i],
    [{ name: 'linked.tgz', sha256: sha256('linked bytes'), bytes: Buffer.byteLength('linked bytes') }, /link/i],
  ];
  for (const [art, why] of cases) {
    const battery = writeBattery(dir, { artifacts: [art] });
    const r = publish(dir, out, battery);
    assert.equal(r.status, 4, `${art.name}: ${r.stderr}`);
    assert.match(r.stderr, why, art.name);
    assert.ok(!fs.existsSync(out), `${art.name}: refusal must not write`);
  }
});

test('publish: privacy tripwires refuse raw prompts, credentials and private paths', (t) => {
  const dir = scratch(t);
  const out = outOf(dir);
  const cases = [
    { label: 'absolute path', over: { observations: [{ name: 'build', command: 'write outputs', exit: 0, summary: 'wrote C:\\Users\\someone\\secret.txt' }] }, why: /path/i },
    { label: 'credential pair', over: { observations: [{ name: 'build', command: 'curl --header api_key=supersecretvalue', exit: 0, summary: 'ok' }] }, why: /credential|secret/i },
    { label: 'github token', over: { limitations: ['published with ghp_abcdefghijklmnopqrstuvwxyz0123'] }, why: /credential|secret/i },
    { label: 'raw prompt blob', over: { observations: [{ name: 'build', command: 'echo', exit: 0, summary: 'line one\nline two' }] }, why: /single line|line/i },
    { label: 'oversize summary', over: { observations: [{ name: 'build', command: 'echo', exit: 0, summary: 'x'.repeat(400) }] }, why: /characters|prompt/i },
    { label: 'artifact traversal', over: { artifacts: [{ name: '../escape.tgz', sha256: 'a'.repeat(64), bytes: 1 }] }, why: /name|path/i },
  ];
  for (const c of cases) {
    const battery = writeBattery(dir, c.over);
    const r = publish(dir, out, battery);
    assert.equal(r.status, 4, `${c.label}: ${r.stderr}`);
    assert.match(r.stderr, c.why, c.label);
    assert.ok(!fs.existsSync(out), `${c.label}: refusal must not write`);
  }
});

test('publish: schema strictness refuses unknown keys and reported-cost-as-billing', (t) => {
  const dir = scratch(t);
  const out = outOf(dir);
  const cases = [
    { label: 'billing smuggling', over: { usage: { provenance: 'measured by meter', cost_status: 'BILLED' } }, why: /reported|billed|usage|cost/i },
    { label: 'unknown key', over: { notes: 'extra' }, why: /unknown|key/i },
    { label: 'observation extra key', over: { observations: [{ name: 'build', command: 'echo', exit: 0, summary: 'ok', prompt: 'raw' }] }, why: /unknown|key/i },
    { label: 'wrong schema marker', over: { schema_version: 3 }, why: /schema/i },
    { label: 'duplicate step names', over: { observations: [{ name: 'build', command: 'a', exit: 0, summary: 's' }, { name: 'build', command: 'b', exit: 0, summary: 's' }] }, why: /duplicate|unique/i },
  ];
  for (const c of cases) {
    const battery = writeBattery(dir, c.over);
    const r = publish(dir, out, battery);
    assert.equal(r.status, 4, `${c.label}: ${r.stderr}`);
    assert.match(r.stderr, c.why, c.label);
    assert.ok(!fs.existsSync(out), `${c.label}: refusal must not write`);
  }
});

test('publish: the bare aggregate export keeps its v1 behaviour', (t) => {
  const dir = scratch(t);
  const out = outOf(dir);
  assert.equal(aegis(dir, ['evidence', 'usage', '--tokens-in', '5']).status, 0);
  const r = aegis(dir, ['evidence', 'export', '--file', out]);
  assert.equal(r.status, 0, r.stderr);
  const doc = JSON.parse(fs.readFileSync(out, 'utf8'));
  assert.equal(doc.schema_version, 1);
  assert.equal(doc.usage.tokens_in, 5);
  assert.equal(doc.privacy, 'aggregate only; no raw state, prompts, model names or commands');
});
