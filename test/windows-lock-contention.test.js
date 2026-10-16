import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';
import { scratch, CLI } from './helpers.js';

for (const error of ['EPERM', 'EACCES', 'EBUSY']) {
  test(`lock creation retries a transient Windows ${error} without bypassing exclusive acquisition`, (t) => {
    const dir = scratch(t);
    const resource = path.join(dir, '.aegis', 'contended');
    const file = `${resource}.lock`;
    const module = pathToFileURL(path.join(path.dirname(CLI), 'lib', 'lock.js')).href;
    const code = `import fs from 'node:fs'; import path from 'node:path';
      const open=fs.openSync;let attempts=0;
      fs.openSync=function(p,flags,...rest){
        if(path.resolve(String(p))===${JSON.stringify(file)}){
          if(flags!=='wx')throw Error('exclusive acquisition weakened');
          if(++attempts===1)throw Object.assign(new Error('transient delete-pending fixture'),{code:process.platform==='win32'?${JSON.stringify(error)}:'EEXIST'});
        }
        return open.call(this,p,flags,...rest);
      };
      const {lockFile}=await import(${JSON.stringify(module)});
      const release=lockFile(${JSON.stringify(resource)});
      const owner=JSON.parse(fs.readFileSync(${JSON.stringify(file)},'utf8'));
      if(attempts!==2||owner.pid!==process.pid||!owner.token)throw Error('lock acquired without own exclusive file');
      release();if(fs.existsSync(${JSON.stringify(file)}))throw Error('lock leaked');
      console.log('EXCLUSIVE_RETRY_VERIFIED');`;
    const r = spawnSync(process.execPath, ['--input-type=module', '-e', code], { cwd: dir, encoding: 'utf8', timeout: 15000 });
    assert.equal(r.status, 0, r.stderr + r.stdout);
    assert.match(r.stdout, /EXCLUSIVE_RETRY_VERIFIED/);
  });
}
