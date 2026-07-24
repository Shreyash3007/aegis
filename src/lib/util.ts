import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync, execSync } from 'node:child_process';

export function die(code: number, msg: string): never {
  console.error(`FAIL ${msg}`);
  process.exit(code);
}

/** Repo root: walk up from cwd to the nearest dir containing .git (dir OR
 *  file - linked worktrees have a .git file). Slice worktrees live OUTSIDE the
 *  repo in a sibling dir, so running from one resolves to that worktree root. */
function findRepoRoot(start: string): string | null {
  let dir = path.resolve(start);
  for (;;) {
    if (fs.existsSync(path.join(dir, '.git'))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
}

const repoRoot = findRepoRoot(process.cwd());
if (!repoRoot) die(1, `not a git repo (no .git found at or above ${process.cwd()})`);
export const REPO = repoRoot;
export const AEGIS_DIR = path.join(REPO, '.aegis');

export const ok = (msg: string): void => console.log(`OK ${msg}`);

export const sha = (s: string | Buffer): string =>
  crypto.createHash('sha256').update(s).digest('hex').slice(0, 16);

export const readJ = <T>(p: string): T => JSON.parse(fs.readFileSync(p, 'utf8')) as T;
/** Atomic write: tmp file + rename. Concurrent writers (fork-agent waves on a
 *  shared tree, hooks firing mid-command) must never observe a torn
 *  state.json - rename is atomic on POSIX, so readers see old or new, never
 *  half-written. */
export const writeJ = (p: string, o: unknown): void => {
  const tmp = `${p}.tmp-${process.pid}`;
  fs.writeFileSync(tmp, JSON.stringify(o, null, 2) + '\n');
  fs.renameSync(tmp, p);
};

/** git helper - argv array, NO shell: branch/slice names are user input and
 *  must never be interpolated into a shell string. Trims output.
 *  Never use for content comparison (A1.1). */
export const git = (args: string[], cwd: string = REPO): string =>
  execFileSync('git', args, { cwd, encoding: 'utf8' }).trim();

/** git helper - raw output, for diffs and content-level checks only. */
export const gitRaw = (args: string[], cwd: string = REPO): string =>
  execFileSync('git', args, { cwd, encoding: 'utf8' });

/** git helper for probes (ref existence etc.): '' on failure, stderr suppressed
 *  so expected misses don't leak `fatal:` noise into command output. */
export const gitTry = (args: string[], cwd: string = REPO): string => {
  try { return execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] }).trim(); }
  catch { return ''; }
};

export const has = (bin: string): boolean => {
  try { execSync(`command -v ${bin}`, { stdio: 'pipe' }); return true; }
  catch { return false; }
};

/** Detect the package manager for a repo. The packageManager field in
 *  package.json wins (e.g. "pnpm@9.0.0" -> "pnpm"); otherwise the first
 *  lockfile present in priority order; otherwise "npm" as the safe default.
 *  A missing or unparseable package.json falls through to the lockfile probe
 *  rather than throwing - the caller decides how to handle "no package.json". */
export function detectPackageManager(cwd: string = REPO): 'npm' | 'yarn' | 'pnpm' | 'bun' {
  try {
    const pkg = JSON.parse(fs.readFileSync(path.join(cwd, 'package.json'), 'utf8'));
    const pm = typeof pkg.packageManager === 'string' ? pkg.packageManager.split('@')[0] : '';
    if (pm === 'pnpm' || pm === 'yarn' || pm === 'bun' || pm === 'npm') return pm;
  } catch { /* no/invalid package.json - fall through to lockfile probe */ }
  const lockfiles: Array<[string, 'npm' | 'yarn' | 'pnpm' | 'bun']> = [
    ['pnpm-lock.yaml', 'pnpm'],
    ['yarn.lock', 'yarn'],
    ['bun.lockb', 'bun'],
    ['bun.lock', 'bun'],
    ['package-lock.json', 'npm'],
  ];
  for (const [file, pm] of lockfiles) if (fs.existsSync(path.join(cwd, file))) return pm;
  return 'npm';
}
