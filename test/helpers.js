// Shared scaffolding for Aegis CLI integration tests.
// Every test spawns the BUILT CLI (dist/cli.js) in a throwaway git repo
// created with fs.mkdtempSync under os.tmpdir(). No external network access
// anywhere in this suite (the merge-oracle test vendors its toolchain - see
// merge.test.js; the judge test stubs its endpoint on loopback - see
// eval-judge.test.js).
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const CLI = path.join(REPO_ROOT, 'dist', 'cli.js');

// Identity is set per-command so the suite never depends on global git config.
const GIT_IDENTITY = ['-c', 'user.email=aegis-test@example.com', '-c', 'user.name=aegis-test'];

export function gitIn(dir, args) {
  const r = spawnSync('git', [...GIT_IDENTITY, ...args], { cwd: dir, encoding: 'utf8' });
  if (r.status !== 0)
    throw new Error(`git ${args.join(' ')} failed (${r.status}): ${r.stderr}`);
  return r.stdout.trim();
}

/** Run the built CLI in `dir`. stdin is a pipe (never a TTY) - exactly the
 *  agent/CI posture the proof-of-human gate is built against, so gate tests
 *  exercise the non-TTY path by default. AEGIS_HUMAN_TOKEN and the judge
 *  env vars are scrubbed from the inherited environment; tests opt in per
 *  case via opts.env. */
export function aegis(dir, args, { env = {} } = {}) {
  const fullEnv = { ...process.env };
  delete fullEnv.AEGIS_HUMAN_TOKEN;
  delete fullEnv.AEGIS_JUDGE_API_KEY;
  delete fullEnv.AEGIS_JUDGE_URL;
  delete fullEnv.AEGIS_JUDGE_MODEL;
  Object.assign(fullEnv, env);
  const r = spawnSync(process.execPath, [CLI, ...args], {
    cwd: dir, encoding: 'utf8', env: fullEnv, timeout: 60000,
  });
  return { status: r.status ?? 1, stdout: r.stdout ?? '', stderr: r.stderr ?? '' };
}

/** mkdtemp'd git repo with an initial commit and (unless init:false)
 *  `aegis init --yes` applied. t.after removes the temp dir AND the sibling
 *  worktree root (`<dir>-worktrees`) that `slice create` may have made. */
export function scratch(t, { init = true } = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'aegis-test-'));
  t.after(() => {
    fs.rmSync(dir, { recursive: true, force: true });
    fs.rmSync(`${dir}-worktrees`, { recursive: true, force: true });
  });
  gitIn(dir, ['init', '-b', 'main', '-q']);
  gitIn(dir, ['commit', '--allow-empty', '-q', '-m', 'init']);
  if (init) {
    const r = aegis(dir, ['init', '--yes']);
    if (r.status !== 0) throw new Error(`aegis init failed (${r.status}): ${r.stderr}`);
  }
  return dir;
}

const statePath = (dir) => path.join(dir, '.aegis', 'state.json');
export const readState = (dir) => JSON.parse(fs.readFileSync(statePath(dir), 'utf8'));
export const writeState = (dir, s) => fs.writeFileSync(statePath(dir), JSON.stringify(s, null, 2) + '\n');
