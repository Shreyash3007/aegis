import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { scratch, aegis, gitIn } from './helpers.js';

test('audit: GREEN cannot overwrite a different RED acquisition just because output hashes match', (t) => {
  const dir = scratch(t);
  gitIn(dir, ['add', '.gitignore', 'brain']); gitIn(dir, ['commit', '-m', 'base']);
  gitIn(dir, ['switch', '-c', 'feature']);
  fs.writeFileSync(path.join(dir, 'value.cjs'), 'module.exports=0;\n');
  fs.writeFileSync(path.join(dir, 'check.cjs'), "process.exit(require('./value.cjs')===1?0:1);\n");
  gitIn(dir, ['add', 'value.cjs', 'check.cjs']); gitIn(dir, ['commit', '-m', 'regression']);
  assert.equal(aegis(dir, ['tdd', 'red', 'feature', '--test-file', 'check.cjs', '--expect-exit', '1', '--', process.execPath, 'check.cjs']).status, 0);
  fs.writeFileSync(path.join(dir, 'value.cjs'), 'module.exports=1;\n');
  gitIn(dir, ['add', 'value.cjs']); gitIn(dir, ['commit', '-m', 'fix']);
  const commit = gitIn(dir, ['rev-parse', 'HEAD']);
  const key = crypto.createHash('sha256').update('feature').digest('hex');
  const file = path.join(dir, '.aegis', 'tdd', `${key}.json`);
  const hook = path.join(dir, '.aegis', 'replace-red.cjs');
  fs.writeFileSync(hook, `const fs=require('node:fs');const original=fs.readFileSync;const file=${JSON.stringify(file)};let reads=0;
fs.readFileSync=function(p,...args){if(String(p)===file&&++reads===2){const r=JSON.parse(original(file,'utf8'));const previous=r.red.output;r.red.commit=${JSON.stringify(commit)};r.red.output='aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa.log';fs.copyFileSync(require('node:path').join(require('node:path').dirname(file),previous),require('node:path').join(require('node:path').dirname(file),r.red.output));fs.writeFileSync(file,JSON.stringify(r));}return original.call(this,p,...args);};`);
  const r = aegis(dir, ['tdd', 'green', 'feature'], { env: { NODE_OPTIONS: `--require ${JSON.stringify(hook)}` } });
  assert.equal(r.status, 9, r.stderr + r.stdout);
  assert.match(r.stderr, /evidence changed concurrently/);
});

test('audit: a competing stored receipt cannot upgrade this invocation\'s observed acceptance failure', (t) => {
  const dir = scratch(t);
  fs.writeFileSync(path.join(dir, 'plan.json'), JSON.stringify({ criteria: [{ id: 'AC1', statement: 'environment-sensitive fixture',
    command: [process.execPath, '-e', "process.exit(process.env.OTHER_CAPTURE_PASSED==='yes'?0:1)"] }] }));
  gitIn(dir, ['add', '.gitignore', 'brain', 'plan.json']); gitIn(dir, ['commit', '-m', 'acceptance snapshot']);
  const key = crypto.createHash('sha256').update('main').digest('hex');
  const file = path.join(dir, '.aegis', 'quality', `${key}-acceptance.json`);
  const hook = path.join(dir, '.aegis', 'competing-receipt.cjs');
  fs.writeFileSync(hook, `const fs=require('node:fs');const original=fs.readFileSync;const file=${JSON.stringify(file)};let replaced=false;
fs.readFileSync=function(p,...args){if(String(p)===file&&!replaced){replaced=true;const r=JSON.parse(original(file,'utf8'));r.results=r.results.map(x=>({...x,status:'PASS',exit:0}));fs.writeFileSync(file,JSON.stringify(r));}return original.call(this,p,...args);};`);
  const r = aegis(dir, ['quality', 'acceptance', 'main', '--file', 'plan.json'], {
    env: { NODE_OPTIONS: `--require ${JSON.stringify(hook)}`, OTHER_CAPTURE_PASSED: '' },
  });
  assert.equal(r.status, 9, r.stderr + r.stdout);
});
