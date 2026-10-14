// Release ritual (audit finding #1: nothing gated the releaser - three
// releases shipped on red CI because "suite green" was checked only on the
// dev machine). One command, all mechanical, refuses to pass on any gap:
//
//   1. local suite green            (node --test test/*.test.js)
//   2. adversarial audit 0 findings (scripts/audit.mjs)
//   3. doctor: no drift notes       (tracked hooks bake + ignore coverage
//                                     + machine-state tracking live here)
//   4. hooks baked for THIS CLI version (ghost-binary tripwire fresh)
//   5. routing blades all resolve in the skill store (prune/reconcile)
//   6. remote CI green on HEAD       (gh run list --branch main)
//   7. working tree clean + pushed  (what you ship is what CI tested)
//
// Usage: node scripts/release-check.mjs [--local]
//   --local skips steps 4-7 (no network/no gh) for quick pre-flights.
// Exit 0 = cleared to tag. Non-zero = the ritual refuses, with the reason.

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CLI = path.join(REPO, 'dist', 'cli.js');
const LOCAL = process.argv.includes('--local');

const failures = [];
function step(name, ok, detail = '') {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` - ${detail}` : ''}`);
  if (!ok) failures.push(`${name}: ${detail}`);
}

function sh(bin, args, opts = {}) {
  const r = spawnSync(bin, args, { cwd: REPO, encoding: 'utf8', ...opts });
  return { code: r.error ? -1 : (r.status ?? 1), out: (r.stdout ?? '') + (r.stderr ?? '') };
}

// 1. suite (mirrors `npm test` exactly: node --test over the file glob.
// NOTE: `node --test test/` (bare dir) does NOT work - node treats it as a
// module path and crashes (found when the ritual always reported FAIL).
// The glob form below is what package.json runs on every platform.)
{
  console.log('release-check: local suite (this takes a few minutes)...');
  const r = sh(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['test'], { timeout: 600_000 });
  // node --test summary tail looks like "ℹ tests 178 / ℹ pass 178 / ℹ fail 0"
  // (ANSI glyphs, no '#' prefix): take the LAST pass/fail pair in the output.
  const passes = [...r.out.matchAll(/pass (\d+)/g)].map((m) => m[1]);
  const fails = [...r.out.matchAll(/fail (\d+)/g)].map((m) => m[1]);
  const pass = passes.length ? passes[passes.length - 1] : '?';
  const fail = fails.length ? fails[fails.length - 1] : '?';
  step('1. local test suite green', r.code === 0, `exit=${r.code} pass=${pass} fail=${fail}`);
}
// 2. audit harness
{
  console.log('release-check: adversarial audit...');
  const r = sh(process.execPath, ['scripts/audit.mjs'], { timeout: 600_000 });
  const findings = (r.out.match(/audit: \d+ checks, (\d+) finding/) || [])[1] ?? '?';
  step('2. adversarial audit 0 findings', r.code === 0, `exit=${r.code} findings=${findings}`);
}
// 3. doctor drift
{
  const r = sh(process.execPath, [CLI, 'doctor']);
  const drift = (r.out.match(/note: drift: (.+)/g) ?? []).map((l) => l.slice('note: drift: '.length));
  step('3. doctor reports no drift', r.code === 0 && drift.length === 0, drift.join(' | ') || `exit=${r.code}`);
}
if (!LOCAL) {
  // 4. hooks baked for this CLI version
  {
    const ver = JSON.parse(fs.readFileSync(path.join(REPO, 'package.json'), 'utf8')).version;
    const hook = fs.readFileSync(path.join(REPO, '.git', 'hooks', 'pre-commit'), 'utf8');
    const baked = (hook.match(/!= "v?([\d.]+)"/) || [])[1];
    step('4. hooks baked for this version', baked === ver, `baked=${baked} cli=${ver} (repair: aegis hooks)`);
  }
  // 5. routing blades resolve
  {
    const routing = JSON.parse(fs.readFileSync(path.join(REPO, 'skills', 'routing.json'), 'utf8'));
    const stores = [path.join(os.homedir(), '.agents', 'skills'), path.join(os.homedir(), '.claude', 'skills')];
    const missing = (routing.blades ?? []).filter((b) => !stores.some((s) => fs.existsSync(path.join(s, b.name))))
      .map((b) => b.name);
    step('5. routing blades resolve in skill store', missing.length === 0,
      missing.length ? `missing: ${missing.join(', ')} (restore from ~\\.skills-archive\\.agents or deprecate in routing.json)` : `${(routing.blades ?? []).length} blades live`);
  }
  // 6. remote CI green on HEAD
  {
    const head = sh('git', ['rev-parse', 'HEAD']).out.trim();
    const gh = sh('gh', ['run', 'list', '--branch', 'main', '--limit', '10', '--json', 'headSha,status,conclusion,displayTitle,name']);
    let ok = false, detail = `gh exit=${gh.code}`;
    try {
      const runs = JSON.parse(gh.out);
      const mine = runs.filter((r) => r.headSha === head && r.name === 'ci');
      ok = mine.length > 0 && mine.every((r) => r.conclusion === 'success');
      detail = mine.length
        ? mine.map((r) => `${r.status}/${r.conclusion}`).join(' ') + (ok ? '' : ' - CI must be green before a release; if in progress, wait')
        : `no ci runs for ${head.slice(0, 8)} yet - push first, wait for green, then release`;
    } catch { detail = `unparseable gh output: ${gh.out.slice(0, 120)}`; }
    step('6. remote CI green on HEAD', ok, detail);
  }
  // 7. tree clean + pushed
  {
    const dirty = sh('git', ['status', '--porcelain']).out.trim();
    const unpushed = sh('git', ['rev-list', '--count', 'origin/main..HEAD']).out.trim();
    step('7. tree clean and pushed', dirty === '' && unpushed === '0',
      dirty ? `dirty: ${dirty.split('\n').length} path(s)` : unpushed !== '0' ? `${unpushed} unpushed commit(s)` : 'clean');
  }
}

console.log(failures.length
  ? `\nrelease-check: REFUSED - ${failures.length} gap(s). Fix, then re-run.`
  : `\nrelease-check: CLEARED to tag. Ritual: tag vNEXT, push tag, verify Pages + claims once.`);
process.exit(failures.length ? 1 : 0);
