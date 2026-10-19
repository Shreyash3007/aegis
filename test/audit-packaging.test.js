import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { scratch, aegis, gitIn, REPO_ROOT } from './helpers.js';

test('audit: initial and repeated init preserve existing owner brain content', (t) => {
  const dir = scratch(t, { init: false });
  const files = ['brain/context-window.md', 'brain/architecture/module-map.md', 'brain/_templates/note.md'];
  for (const file of files) { fs.mkdirSync(path.dirname(path.join(dir, file)), { recursive: true }); fs.writeFileSync(path.join(dir, file), `owner content: ${file}`); }
  assert.equal(aegis(dir, ['init', '--yes']).status, 0);
  for (const file of files) assert.equal(fs.readFileSync(path.join(dir, file), 'utf8'), `owner content: ${file}`);
  assert.equal(aegis(dir, ['init', '--yes', '--overwrite']).status, 0);
  for (const file of files) assert.equal(fs.readFileSync(path.join(dir, file), 'utf8'), `owner content: ${file}`);
});

test('audit: invalid init app names are refused before deleting existing machine state', (t) => {
  const dir = scratch(t);
  const before = fs.readFileSync(path.join(dir, '.aegis', 'state.json'), 'utf8');
  const r = aegis(dir, ['init', '--yes', '--overwrite', '--apps', '../invalid']);
  assert.equal(r.status, 2, r.stderr + r.stdout);
  assert.equal(fs.readFileSync(path.join(dir, '.aegis', 'state.json'), 'utf8'), before);
});

test('audit: reinitialization cannot orphan active slices or erase legacy memory truth', (t) => {
  const dir = scratch(t);
  assert.equal(aegis(dir, ['slice', 'create', 'keep']).status, 0);
  const before = fs.readFileSync(path.join(dir, '.aegis', 'state.json'), 'utf8');
  assert.equal(aegis(dir, ['init', '--yes', '--overwrite']).status, 4);
  assert.equal(fs.readFileSync(path.join(dir, '.aegis', 'state.json'), 'utf8'), before);
  const legacy = scratch(t);
  const file = path.join(legacy, '.aegis', 'memory', 'records.jsonl');
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, '{"owner":"unmigrated truth"}\n');
  assert.equal(aegis(legacy, ['init', '--yes', '--overwrite']).status, 4);
  assert.equal(fs.readFileSync(file, 'utf8'), '{"owner":"unmigrated truth"}\n');
});

test('audit: declaring a tool dependency does not invent an available executable', (t) => {
  const dir = scratch(t);
  const report = () => {
    const r = aegis(dir, ['doctor']);
    assert.equal(r.status, 0, r.stderr);
    return JSON.parse(r.stdout); // stdout is the report and only the report
  };
  const before = report().tools;
  fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify({ devDependencies: { playwright: 'nonexistent-fixture-version', eslint: 'nonexistent-fixture-version' } }));
  assert.deepEqual(report().tools, before, 'a declaration alone changes no installed capabilities');
});

test('audit: hook install and drift checks use the effective repo-local Git hook path', (t) => {
  const dir = scratch(t);
  gitIn(dir, ['config', 'core.hooksPath', '.project-hooks']);
  const hooks = path.join(dir, '.project-hooks');
  fs.mkdirSync(hooks);
  const file = path.join(hooks, 'pre-commit');
  const original = '#!/bin/sh\n# owner hook\nexit 0\n';
  fs.writeFileSync(file, original, { mode: 0o755 });
  assert.equal(aegis(dir, ['hooks']).status, 0);
  assert.match(fs.readFileSync(file, 'utf8'), /# AEGIS/);
  assert.equal(fs.readFileSync(`${file}.aegis-orig`, 'utf8'), original);
  const body = fs.readFileSync(file, 'utf8').replace(/!= "v?[\d.]+"/, '!= "0.0.0"');
  fs.writeFileSync(file, body);
  assert.match(aegis(dir, ['doctor']).stderr, /hooks were baked for v0\.0\.0/);
});

test('audit: TypeScript re-exports and mixed import/export cycles fire the DAG gate', (t) => {
  const dir = scratch(t);
  fs.writeFileSync(path.join(dir, 'tsconfig.json'), JSON.stringify({ compilerOptions: { target: 'ES2022', module: 'NodeNext', moduleResolution: 'NodeNext' }, include: ['src/**/*.ts'] }));
  fs.mkdirSync(path.join(dir, 'src'));
  fs.writeFileSync(path.join(dir, 'src', 'a.ts'), "export { b } from './b.js'; export const a=1;\n");
  fs.writeFileSync(path.join(dir, 'src', 'b.ts'), "export * from './a.js'; export const b=2;\n");
  const r = aegis(dir, ['ast', 'build']);
  assert.equal(r.status, 8, r.stderr + r.stdout);
});

test('audit: source directories merely containing the text node_modules are not excluded from the graph', (t) => {
  const dir = scratch(t);
  fs.writeFileSync(path.join(dir, 'tsconfig.json'), JSON.stringify({ compilerOptions: { target: 'ES2022', module: 'NodeNext', moduleResolution: 'NodeNext' }, include: ['src/**/*.ts'] }));
  const source = path.join(dir, 'src', 'not_node_modules_code');
  fs.mkdirSync(source, { recursive: true });
  fs.writeFileSync(path.join(source, 'a.ts'), "import { b } from './b.js'; export const a=()=>b();\n");
  fs.writeFileSync(path.join(source, 'b.ts'), "import { a } from './a.js'; export const b=()=>a();\n");
  const r = aegis(dir, ['ast', 'build']);
  assert.equal(r.status, 8, r.stderr + r.stdout);
});

function releaseFixture(t, { buildFailure = false, linked = false } = {}) {
  const dir = scratch(t, { init: false });
  fs.mkdirSync(path.join(dir, 'scripts'));
  fs.copyFileSync(path.join(REPO_ROOT, 'scripts', 'release-check.mjs'), path.join(dir, 'scripts', 'release-check.mjs'));
  fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify({ version: '0.10.0' }));
  const hook = path.join(dir, 'effective-hooks', 'pre-commit');
  fs.mkdirSync(path.dirname(hook));
  fs.writeFileSync(hook, 'if [ "$VCUR" != "0.10.0" ]; then true; fi\n');
  if (!linked) { fs.mkdirSync(path.join(dir, '.git', 'hooks'), { recursive: true }); fs.copyFileSync(hook, path.join(dir, '.git', 'hooks', 'pre-commit')); }
  else { fs.renameSync(path.join(dir, '.git'), path.join(dir, 'gitdir')); fs.writeFileSync(path.join(dir, '.git'), 'gitdir: gitdir\n'); }
  fs.mkdirSync(path.join(dir, 'skills'));
  fs.writeFileSync(path.join(dir, 'skills', 'routing.json'), JSON.stringify({ blades: [{ name: 'native', source: 'superpowers.lock.json#native' }] }));
  fs.writeFileSync(path.join(dir, 'skills', 'superpowers.lock.json'), JSON.stringify({ skills: [{ name: 'native', fallback: 'native.md' }] }));
  fs.writeFileSync(path.join(dir, 'skills', 'native.md'), 'fixture fallback');
  const preload = path.join(dir, 'mock.cjs');
  fs.writeFileSync(preload, `const fs=require('node:fs'),cp=require('node:child_process');const head='a'.repeat(40);cp.spawnSync=function(bin,args){const text=args.join(' ');fs.appendFileSync(${JSON.stringify(path.join(dir, 'calls.log'))},JSON.stringify([bin,args])+'\\n');let stdout='';let status=0;
if(text.includes('run build')){status=${buildFailure ? 1 : 0};stdout='fixture build result';}
else if(text.includes('scripts/audit.mjs'))stdout='audit: 1 checks, 0 finding(s)';
else if(text.includes('test'))stdout='pass 1\\nfail 0';
else if(text.includes('--git-path'))stdout=${JSON.stringify(hook)};
else if(bin==='gh')stdout=JSON.stringify([{headSha:head,status:'completed',conclusion:'success',name:'ci'}]);
else if(text.includes('rev-parse'))stdout=head;
else if(text.includes('rev-list'))stdout='0';
return {status,stdout,stderr:''};};require('node:module').syncBuiltinESMExports();`);
  return { dir, run: (args) => spawnSync(process.execPath, [path.join(dir, 'scripts', 'release-check.mjs'), ...args], { cwd: dir, env: { ...process.env, NODE_OPTIONS: `--require ${JSON.stringify(preload)}` }, encoding: 'utf8' }) };
}

test('audit: local preflight cannot announce clearance to tag', (t) => {
  const { run } = releaseFixture(t);
  const r = run(['--local']);
  assert.equal(r.status, 0, r.stderr + r.stdout);
  assert.match(r.stdout, /LOCAL PREFLIGHT/);
  assert.doesNotMatch(r.stdout, /release-check: CLEARED to tag/);
});

test('audit: release ritual builds fresh source and refuses a failing build before compiled tests', (t) => {
  const { dir, run } = releaseFixture(t, { buildFailure: true });
  const r = run([]);
  assert.equal(r.status, 1, r.stderr + r.stdout);
  const calls = fs.readFileSync(path.join(dir, 'calls.log'), 'utf8').trim().split('\n').map(JSON.parse);
  assert.ok(calls.some(([, args]) => args.join(' ').includes('run build')));
  assert.ok(!calls.some(([, args]) => args.at(-1) === 'test'), 'a failed build cannot be followed by tests against stale dist');
});

test('audit: release hook lookup supports a linked worktree and effective hook path', (t) => {
  const { run } = releaseFixture(t, { linked: true });
  const r = run([]);
  assert.equal(r.status, 0, r.stderr + r.stdout);
  assert.match(r.stdout, /7\. tree clean and pushed/);
});

test('audit: distribution carries a consumer-honored dependency closure and does not excuse failed compilation', () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, 'package.json'), 'utf8'));
  assert.equal(pkg.scripts.prepare, 'npm run build');
  assert.ok(pkg.files.includes('npm-shrinkwrap.json'), 'the consumer lock must be in the distributed file allowlist');
  assert.deepEqual(pkg.bundleDependencies, ['ts-morph'], 'the published asset must contain its complete installed runtime closure');
  const file = path.join(REPO_ROOT, 'npm-shrinkwrap.json');
  assert.ok(fs.existsSync(file), 'consumer installation must receive the runtime lock');
  const lock = JSON.parse(fs.readFileSync(file, 'utf8'));
  assert.equal(lock.packages[''].version, pkg.version);
  assert.ok(lock.packages['node_modules/ts-morph'].integrity);
  assert.ok(!fs.existsSync(path.join(REPO_ROOT, 'package-lock.json')), 'one authoritative npm lock, not competing files');
});
