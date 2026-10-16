import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';
import { scratch, CLI } from './helpers.js';

test('ownership checks never resolve a volatile regular file to an NTFS deleted-object path', (t) => {
  const dir = scratch(t);
  const file = path.join(dir, '.aegis', 'contended.lock');
  fs.writeFileSync(file, 'existing regular file');
  const module = pathToFileURL(path.join(path.dirname(CLI), 'lib', 'owned-path.js')).href;
  const code = `import fs from 'node:fs'; import path from 'node:path';
    const native=fs.realpathSync.native; let fileResolutions=0;
    fs.realpathSync.native=function(p,...args){
      if(path.resolve(String(p))===${JSON.stringify(file)}){fileResolutions++;return path.join(path.parse(String(p)).root,'$Extend','$Deleted','fixture-object');}
      return native.call(this,p,...args);
    };
    const {ownedPath}=await import(${JSON.stringify(module)});
    const checked=ownedPath(${JSON.stringify(dir)},${JSON.stringify(file)});
    if(checked!==${JSON.stringify(file)}||fileResolutions!==0)throw Error('regular file identity was resolved');
    console.log('VOLATILE_LEAF_NOT_RESOLVED');`;
  const r = spawnSync(process.execPath, ['--input-type=module', '-e', code], { cwd: dir, encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr + r.stdout);
  assert.match(r.stdout, /VOLATILE_LEAF_NOT_RESOLVED/);
});

test('lock release remains safe when regular-file realpath results would be unstable', (t) => {
  const dir = scratch(t);
  const resource = path.join(dir, '.aegis', 'contended');
  const file = `${resource}.lock`;
  const module = pathToFileURL(path.join(path.dirname(CLI), 'lib', 'lock.js')).href;
  const code = `import fs from 'node:fs'; import path from 'node:path';
    const native=fs.realpathSync.native;
    fs.realpathSync.native=function(p,...args){
      if(path.resolve(String(p))===${JSON.stringify(file)})return path.join(path.parse(String(p)).root,'$Extend','$Deleted','fixture-object');
      return native.call(this,p,...args);
    };
    const {lockFile}=await import(${JSON.stringify(module)});
    const release=lockFile(${JSON.stringify(resource)});release();
    if(fs.existsSync(${JSON.stringify(file)}))throw Error('own lock was not released');
    console.log('OWNED_LOCK_RELEASED');`;
  const r = spawnSync(process.execPath, ['--input-type=module', '-e', code], { cwd: dir, encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr + r.stdout);
  assert.match(r.stdout, /OWNED_LOCK_RELEASED/);
});
