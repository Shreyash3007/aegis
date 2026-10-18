// OpenCode host adapter (v0.11 R3b). The adapter installs exactly one
// dedicated, auto-discovered plugin file (.opencode/plugins/aegis.ts) whose
// only job is the declaration's read-only `context` binding: on the first
// context build of a session the plugin spawns `aegis status` directly (argv,
// no shell) and pushes the captured stdout into the outgoing system
// instructions. This suite pins the adapter contract: canonical plugin
// content (documented v2 plugin shape; no prompt rewriting, tool gating or
// fallback machinery), foreign files preserved byte-for-byte, a foreign
// aegis.ts refused instead of overwritten, link refusal before any mutation,
// ambiguity refused instead of guessed, uninstall touching only the plugin
// file and pruning only emptied containers, and platform-honest permission
// outcomes. Host runtime behavior (the plugin actually loading and firing in
// opencode) is covered by the recorded real-host smoke, not by this suite.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { REPO_ROOT, scratch, aegis } from './helpers.js';
import * as adapter from '../dist/adapters/opencode.js';
import { findDeclaration } from '../dist/hosts/declarations.js';

const DECL = () => findDeclaration('opencode');
const argv = () => DECL().events.context.command.split(' ');
const canonical = () => adapter.opencodePluginSource(argv());
const pluginPath = (dir) => path.join(dir, '.opencode', 'plugins', 'aegis.ts');
const backupPath = (dir) => pluginPath(dir) + '.aegis-backup';
const writeForeign = (dir, name, content) => {
  fs.mkdirSync(path.dirname(path.join(dir, '.opencode', 'plugins', name)), { recursive: true });
  fs.writeFileSync(path.join(dir, '.opencode', 'plugins', name), content);
};

test('plugin content: the canonical plugin is a documented v2 plugin - read-only context hook, direct argv spawn, no shell', () => {
  const src = canonical();
  assert.ok(src.includes('import { Plugin } from "@opencode/plugin"'), 'the documented plugin import satisfies the declaration verification');
  assert.ok(src.includes('export default Plugin.define('), 'the documented v2 plugin shape');
  assert.ok(src.includes('await ctx.session.hook("context"'), 'the declared context hook');
  assert.ok(src.includes('spawnSync("aegis", ["status"]'), 'the declaration argv is spawned directly');
  assert.ok(src.includes('timeout: 5000'), 'the spawn is bounded');
  assert.ok(src.includes('windowsHide: true'), 'no console flash on Windows');
  assert.ok(!/shell:\s*true/.test(src), 'no shell anywhere');
  assert.ok(!/execSync|exec\(/.test(src), 'no shell-executing APIs');
  assert.ok(!/session\.hook\("prompt"/.test(src) && !/session\.prompt\(/.test(src), 'never rewrites or injects prompts');
  assert.ok(!/permission\./.test(src), 'never touches permissions');
  assert.ok(!/\.transform\(/.test(src) && !/spawnSync\("node"/.test(src), 'no tool/provider transforms, no agent dispatch');
  assert.ok(src.includes('manual guidance') && src.includes('no fallback'), 'a missing CLI logs an honest hint - never a fallback');
  const custom = adapter.opencodePluginSource(['aegis', 'status', '--markdown']);
  assert.ok(custom.includes('["status","--markdown"]'), 'declaration argv passes through untouched');
  const hostile = adapter.opencodePluginSource(['aegis', 'st"atus']);
  assert.ok(hostile.includes(JSON.stringify('st"atus')), 'argv pieces are JSON-encoded - nothing a shell could interpret');
});

test('install: clean install creates only the plugin file and preserves foreign files byte-for-byte', (t) => {
  const dir = scratch(t);
  writeForeign(dir, 'other.ts', '// another plugin\n');
  fs.writeFileSync(path.join(dir, '.opencode', 'opencode.json'), '{\n  "plugins": ["other"]\n}\n');
  const foreignBefore = fs.readFileSync(path.join(dir, '.opencode', 'plugins', 'other.ts'), 'utf8');
  const configBefore = fs.readFileSync(path.join(dir, '.opencode', 'opencode.json'), 'utf8');
  const r = aegis(dir, ['host', 'install', 'opencode']);
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /installed/);
  assert.match(r.stdout, /aegis\.ts/);
  assert.match(r.stdout, /no shell/);
  assert.equal(fs.readFileSync(pluginPath(dir), 'utf8'), canonical(), 'the plugin file is the canonical source, byte for byte');
  assert.equal(fs.readFileSync(path.join(dir, '.opencode', 'plugins', 'other.ts'), 'utf8'), foreignBefore, 'foreign plugins are untouched');
  assert.equal(fs.readFileSync(path.join(dir, '.opencode', 'opencode.json'), 'utf8'), configBefore, 'host configuration is untouched');
  assert.ok(!fs.existsSync(backupPath(dir)), 'nothing to back up in a fresh project');
});

test('install: repeat install is a no-op with no byte churn, including CRLF-normalized content', (t) => {
  const dir = scratch(t);
  assert.equal(aegis(dir, ['host', 'install', 'opencode']).status, 0);
  const bytes = fs.readFileSync(pluginPath(dir), 'utf8');
  const second = aegis(dir, ['host', 'install', 'opencode']);
  assert.equal(second.status, 0, second.stderr);
  assert.match(second.stdout, /already installed/);
  assert.equal(fs.readFileSync(pluginPath(dir), 'utf8'), bytes, 'a canonical plugin is never rewritten');
  fs.writeFileSync(pluginPath(dir), bytes.replace(/\n/g, '\r\n'));
  const crlfBytes = fs.readFileSync(pluginPath(dir), 'utf8');
  const third = aegis(dir, ['host', 'install', 'opencode']);
  assert.equal(third.status, 0, third.stderr);
  assert.match(third.stdout, /already installed/, 'line endings are not content');
  assert.equal(fs.readFileSync(pluginPath(dir), 'utf8'), crlfBytes, 'no byte churn for a CRLF checkout');
});

test('refusals: a foreign aegis.ts refuses instead of overwriting (install and uninstall both)', (t) => {
  const dir = scratch(t);
  writeForeign(dir, 'aegis.ts', '// someone else\'s plugin\n');
  const before = fs.readFileSync(pluginPath(dir), 'utf8');
  const install = aegis(dir, ['host', 'install', 'opencode']);
  assert.equal(install.status, 4, install.stderr);
  assert.match(install.stderr, /foreign/);
  assert.equal(fs.readFileSync(pluginPath(dir), 'utf8'), before, 'the foreign file is untouched');
  assert.ok(!fs.existsSync(backupPath(dir)), 'no backup is made of foreign work');
  const uninstall = aegis(dir, ['host', 'uninstall', 'opencode']);
  assert.equal(uninstall.status, 4, uninstall.stderr);
  assert.match(uninstall.stderr, /foreign/);
  assert.equal(fs.readFileSync(pluginPath(dir), 'utf8'), before, 'uninstall never removes foreign work');
});

test('refusals: linked targets refuse before any write (directory junction and file symlink)', (t) => {
  const dir = scratch(t);
  const real = path.join(dir, 'elsewhere');
  fs.mkdirSync(real);
  fs.writeFileSync(path.join(real, 'aegis.ts'), '// elsewhere\n');
  fs.symlinkSync(real, path.join(dir, '.opencode'), 'junction');
  const r = aegis(dir, ['host', 'install', 'opencode']);
  assert.equal(r.status, 4, `a linked .opencode must refuse (got ${r.status}): ${r.stderr}`);
  assert.match(r.stderr, /link/);
  assert.equal(fs.readFileSync(path.join(real, 'aegis.ts'), 'utf8'), '// elsewhere\n', 'the link target is untouched');
  const dir2 = scratch(t);
  fs.mkdirSync(path.join(dir2, '.opencode', 'plugins'), { recursive: true });
  const outside = path.join(dir2, 'outside.ts');
  fs.writeFileSync(outside, '// outside\n');
  try {
    fs.symlinkSync(outside, pluginPath(dir2), 'file');
  } catch {
    t.diagnostic('file symlinks need Windows developer mode - the directory-junction case above covers the link refusal');
    return;
  }
  const r2 = aegis(dir2, ['host', 'install', 'opencode']);
  assert.equal(r2.status, 4, `a linked aegis.ts must refuse: ${r2.stderr}`);
  assert.match(r2.stderr, /link/);
  assert.equal(fs.readFileSync(outside, 'utf8'), '// outside\n', 'the link target is untouched');
});

test('refusals: ambiguity refuses instead of guessing (backup without plugin, foreign structure at the path)', (t) => {
  const cases = [
    {
      why: 'a pre-existing backup with no plugin file',
      setup: (dir) => { writeForeign(dir, 'aegis.ts', ''); fs.writeFileSync(backupPath(dir), 'legacy bytes\n'); fs.rmSync(pluginPath(dir)); },
      pattern: /backup/,
    },
    {
      why: 'a file named .opencode',
      setup: (dir) => fs.writeFileSync(path.join(dir, '.opencode'), 'not a directory\n'),
      pattern: /not a directory/,
    },
    {
      why: 'a directory named aegis.ts',
      setup: (dir) => fs.mkdirSync(pluginPath(dir), { recursive: true }),
      pattern: /not a regular file/,
    },
  ];
  for (const c of cases) {
    const dir = scratch(t);
    c.setup(dir);
    const r = aegis(dir, ['host', 'install', 'opencode']);
    assert.equal(r.status, 4, `${c.why}: ${r.stderr}`);
    assert.match(r.stderr, c.pattern, c.why);
  }
});

test('permissions: real OS semantics pinned honestly - read-only attributes do not block a writable-directory removal, OS delete denials refuse with the file unchanged', (t) => {
  const dir = scratch(t);
  assert.equal(aegis(dir, ['host', 'install', 'opencode']).status, 0);
  fs.chmodSync(pluginPath(dir), 0o444);
  const probe = spawnSync(process.execPath, ['-e',
    `try{require('fs').writeFileSync(${JSON.stringify(pluginPath(dir))},'x');console.log('writable')}catch(e){console.log('read-only')}`,
  ], { encoding: 'utf8' });
  assert.equal(probe.stdout.trim(), 'read-only', 'the fixture really is read-only (independent write probe)');
  const ro = aegis(dir, ['host', 'uninstall', 'opencode']);
  assert.equal(ro.status, 0, ro.stderr);
  assert.ok(!fs.existsSync(pluginPath(dir)), 'unlink needs a writable directory, not a writable file - removal succeeds on both platforms');
  const dir2 = scratch(t);
  assert.equal(aegis(dir2, ['host', 'install', 'opencode']).status, 0);
  if (process.platform === 'win32') {
    const user = process.env.USERNAME ?? '';
    const deny = spawnSync('icacls', [pluginPath(dir2), '/deny', `${user}:(D)`], { encoding: 'utf8' });
    if (deny.status !== 0 || !user) {
      t.diagnostic('icacls deny unavailable in this environment - the read-only case above still pins the removal semantics');
      return;
    }
    // An explicit deny ACE on Windows refuses at the read step ("nothing was
    // removed"); POSIX refuses at unlink ("the file is unchanged"). Both are
    // honest refusals with the file intact - the adapter never half-removes.
    const r = aegis(dir2, ['host', 'uninstall', 'opencode']);
    assert.notEqual(r.status, 0, 'an explicit OS delete denial refuses removal');
    assert.match(r.stderr, /nothing was removed|unchanged/, `an honest refusal, not a partial removal: ${r.stderr}`);
    assert.ok(fs.existsSync(pluginPath(dir2)), 'the plugin file remains - nothing was half-removed');
    spawnSync('icacls', [pluginPath(dir2), '/remove:d', user], { encoding: 'utf8' });
  } else {
    fs.chmodSync(path.join(dir2, '.opencode', 'plugins'), 0o555);
    const r = aegis(dir2, ['host', 'uninstall', 'opencode']);
    fs.chmodSync(path.join(dir2, '.opencode', 'plugins'), 0o755);
    assert.notEqual(r.status, 0, 'a read-only directory refuses removal of its entries');
    assert.match(r.stderr, /unchanged/);
    assert.ok(fs.existsSync(pluginPath(dir2)), 'the plugin file remains - nothing was half-removed');
  }
});

test('uninstall: removes only the plugin file, prunes emptied containers, keeps a backup when one exists', (t) => {
  const dir = scratch(t);
  assert.equal(aegis(dir, ['host', 'install', 'opencode']).status, 0);
  const r = aegis(dir, ['host', 'uninstall', 'opencode']);
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /removed/);
  assert.ok(!fs.existsSync(pluginPath(dir)), 'the plugin file is removed');
  assert.ok(!fs.existsSync(path.join(dir, '.opencode')), 'emptied containers are pruned');
  const again = aegis(dir, ['host', 'uninstall', 'opencode']);
  assert.equal(again.status, 0, again.stderr);
  assert.match(again.stdout, /nothing to remove/);
  const kept = scratch(t);
  assert.equal(aegis(kept, ['host', 'install', 'opencode']).status, 0);
  fs.writeFileSync(backupPath(kept), 'older generation bytes\n');
  const withBackup = aegis(kept, ['host', 'uninstall', 'opencode']);
  assert.equal(withBackup.status, 0, withBackup.stderr);
  assert.match(withBackup.stdout, /backup kept/);
  assert.ok(!fs.existsSync(pluginPath(kept)), 'the plugin file is removed');
  assert.ok(fs.existsSync(backupPath(kept)), 'the backup is kept for manual recovery');
  assert.ok(fs.existsSync(path.join(kept, '.opencode', 'plugins')), 'containers holding the backup are kept');
  const shared = scratch(t);
  writeForeign(shared, 'other.ts', '// keep me\n');
  assert.equal(aegis(shared, ['host', 'install', 'opencode']).status, 0);
  assert.equal(aegis(shared, ['host', 'uninstall', 'opencode']).status, 0);
  assert.equal(fs.readFileSync(path.join(shared, '.opencode', 'plugins', 'other.ts'), 'utf8'), '// keep me\n', 'foreign plugins survive uninstall');
  assert.ok(fs.existsSync(path.join(shared, '.opencode', 'plugins')), 'non-empty containers are kept');
});

test('verify: reports the binding honestly (present exit 0, absent exit 9, unknown ids exit 2)', (t) => {
  const dir = scratch(t);
  const absent = aegis(dir, ['host', 'verify', 'opencode']);
  assert.equal(absent.status, 9, `absent: ${absent.stdout}${absent.stderr}`);
  assert.match(absent.stderr, /not present/);
  assert.equal(aegis(dir, ['host', 'install', 'opencode']).status, 0);
  const present = aegis(dir, ['host', 'verify', 'opencode']);
  assert.equal(present.status, 0, present.stderr);
  // R3c wires the cursor adapter, so no shipped host is adapterless anymore;
  // the adapterless branch stays defensive for future declarations.
  assert.match(present.stdout, /present/);
  const unknown = aegis(dir, ['host', 'verify', 'not-a-host']);
  assert.equal(unknown.status, 2);
  assert.match(unknown.stderr, /unknown host/);
  const usage = aegis(dir, ['host', 'uninstall']);
  assert.equal(usage.status, 2);
  assert.match(usage.stderr, /usage/);
});

test('missing-events: a manual-guidance opencode declaration refuses install with an honest message and writes nothing', (t) => {
  const manual = JSON.parse(JSON.stringify(DECL()));
  manual.status = 'manual-guidance';
  manual.events = {};
  const dir = scratch(t);
  const child = spawnSync(process.execPath, ['-e',
    'import(process.env.AEGIS_ADAPTER).then((m) => m.installAdapter(JSON.parse(process.env.AEGIS_DECL), process.env.AEGIS_DIR));',
  ], {
    cwd: dir,
    encoding: 'utf8',
    env: {
      ...process.env,
      AEGIS_ADAPTER: pathToFileURL(path.join(REPO_ROOT, 'dist', 'adapters', 'opencode.js')).href,
      AEGIS_DECL: JSON.stringify(manual),
      AEGIS_DIR: dir,
    },
  });
  assert.equal(child.status, 4, `stderr: ${child.stderr}`);
  assert.match(child.stderr, /no supported events/);
  assert.ok(!fs.existsSync(path.join(dir, '.opencode')), 'nothing was written');
});
