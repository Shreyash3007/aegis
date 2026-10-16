import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';

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
    if (fs.existsSync(path.join(dir, '.git'))) {
      if (fs.lstatSync(dir).isSymbolicLink()) die(4, 'linked repository root is not owned');
      // Git expands Windows 8.3 aliases (e.g. RUNNER~1), while cwd preserves
      // them. Anchor all derived paths to the physical spelling so ownership
      // and worktree-registry comparisons refer to the same directory.
      return process.platform === 'win32' ? fs.realpathSync.native(dir) : dir;
    }
    const parent = path.dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
}

const repoRoot = findRepoRoot(process.cwd());
if (!repoRoot) die(1, `not a git repo (no .git found at or above ${process.cwd()})`);
export const REPO = repoRoot;
export const AEGIS_DIR = path.join(REPO, '.aegis');

/** Main checkout of this repo, or null on any failure. In a linked slice
 *  worktree, .git is a file pointing at the real gitdir, so state-guidance
 *  errors can point the operator back instead of suggesting a forked init. */
export function worktreeMain(): string | null {
  try {
    const out = execFileSync('git', ['rev-parse', '--path-format=absolute', '--git-common-dir'],
      { cwd: REPO, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
    // Windows: git returns forward-slashes (D:/x/.git), REPO uses backslashes
    // (D:\x). Resolve both before compare or every main checkout looks like
    // a slice worktree.
    const main = path.resolve(path.dirname(out));
    const repo = path.resolve(REPO);
    return main === repo ? null : main;
  } catch { return null; }
}

/** Missing-state guidance, single source of truth: in a slice worktree point
 *  back at the main checkout (suggesting init there would fork pipeline
 *  truth); elsewhere suggest init. `lead` names what's missing, `tail`
 *  preserves each call site's exact historical suffix. */
export function noStateMsg(lead: string, tail = ''): string {
  const main = worktreeMain();
  if (main) return `${lead} - this is a slice worktree; aegis state lives in the main checkout (${main}) - run the command there, never init here (a second .aegis would fork pipeline truth)`;
  return `${lead} - run aegis init${tail}`;
}

export const ok = (msg: string): void => console.log(`OK ${msg}`);

export const sha = (s: string | Buffer): string =>
  crypto.createHash('sha256').update(s).digest('hex').slice(0, 16);

export const readJ = <T>(p: string): T => JSON.parse(fs.readFileSync(p, 'utf8')) as T;
/** Atomic write: tmp file + rename. Concurrent writers (fork-agent waves on a
 *  shared tree, hooks firing mid-command) must never observe a torn
 *  state.json - rename is atomic on POSIX, so readers see old or new, never
 *  half-written. */
export const writeTextAtomic = (p: string, text: string): void => {
  const tmp = `${p}.tmp-${crypto.randomUUID()}`;
  fs.writeFileSync(tmp, text, { flag: 'wx' });
  // Windows denies rename-over-open (a concurrent lock-free read holds the
  // target): retry transient lock errors, then let the last one surface.
  for (let i = 0; ; i++) {
    try { fs.renameSync(tmp, p); return; }
    catch (e: any) {
      const transient = ['EPERM', 'EBUSY', 'EACCES'].includes(e?.code);
      if (!transient || i >= 5) { try { fs.rmSync(tmp, { force: true }); } catch { /* already moved */ } throw e; }
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 25 * (i + 1));
    }
  }
};
export const writeJ = (p: string, o: unknown): void => writeTextAtomic(p, JSON.stringify(o, null, 2) + '\n');

export const MACHINE_IGNORES = ['.aegis/', '.aegis-lifecycle.lock', '.aegis-lifecycle.lock.reclaim'];
export function ensureMachineIgnores(): void {
  const file = path.join(REPO, '.gitignore');
  if (fs.existsSync(file) && fs.lstatSync(file).isSymbolicLink()) die(4, 'refusing to update a linked .gitignore');
  const previous = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
  const lines = new Set(previous.split(/\r?\n/));
  const missing = MACHINE_IGNORES.filter((line) => !lines.has(line));
  if (missing.length) writeTextAtomic(file, `${previous}${previous && !previous.endsWith('\n') ? '\n' : ''}${missing.join('\n')}\n`);
}

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
  try {
    execFileSync(process.platform === 'win32' ? 'where.exe' : 'sh',
      process.platform === 'win32' ? [bin] : ['-c', 'command -v "$1"', '--', bin], { stdio: 'pipe', timeout: 5000 });
    return true;
  }
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
