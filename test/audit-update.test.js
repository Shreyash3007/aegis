import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { scratch, aegis } from './helpers.js';

test('audit: self-update selects the verified built asset and disables installation scripts', (t) => {
  const dir = scratch(t, { init: false });
  const log = path.join(dir, 'calls.jsonl');
  const hook = path.join(dir, 'mock.cjs');
  // Intercept every subprocess API used by either implementation. This test
  // must never contact GitHub or perform an actual global installation.
  fs.writeFileSync(hook, `const cp=require('node:child_process'),fs=require('node:fs');const record=(kind,args)=>fs.appendFileSync(${JSON.stringify(log)},JSON.stringify({kind,args})+'\\n');
cp.execFileSync=function(bin,args){record('argv',[bin,...args]);return args.includes('ls-remote')?'a'.repeat(40)+'\\trefs/tags/v99.0.0\\n':'';};
cp.execSync=function(command){record('shell',[command]);return '';};
cp.spawnSync=function(bin,args){record('spawn',[bin,...args]);return {status:0,stdout:'',stderr:''};};require('node:module').syncBuiltinESMExports();`);
  const r = aegis(dir, ['update'], { env: { NODE_OPTIONS: `--require ${JSON.stringify(hook)}` } });
  assert.equal(r.status, 0, r.stderr + r.stdout);
  const calls = fs.readFileSync(log, 'utf8');
  assert.match(calls, /releases\/download\/v99\.0\.0\/aegis-99\.0\.0\.tgz/);
  assert.match(calls, /--ignore-scripts/);
  assert.doesNotMatch(calls, /archive\/refs/);
});
