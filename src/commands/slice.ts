import fs from 'node:fs';
import path from 'node:path';
import { REPO, die, git, ok } from '../lib/util.js';
import { acquireState, commitState, loadState, stateP } from '../lib/state.js';
import { withFileLock, lifecyclePath } from '../lib/lock.js';
import { ownedPath } from '../lib/owned-path.js';

/** aegis slice <create|list|remove> <name> - worktree-per-slice (N2).
 *  Worktrees live OUTSIDE the repo (A1.5). Registered in state.json (A1.6). */
const wtRoot = () => path.resolve(REPO, '..', `${path.basename(REPO)}-worktrees`);

export function slice(args: string[]): void {
  const [op, name] = args;
  if (!['create', 'list', 'remove'].includes(op)) die(2, 'usage: aegis slice <create|list|remove> <name>');
  if (op !== 'list' && (!name || !/^[a-zA-Z0-9][a-zA-Z0-9_-]*$/.test(name)))
    die(2, 'slice name must contain letters/digits/dash/underscore, starting with a letter or digit');
  withFileLock(lifecyclePath, () => operate(op, name));
}

function registeredDir(name: string, meta: any): string {
  if (!/^[a-zA-Z0-9][a-zA-Z0-9_-]*$/.test(name)) die(4, `invalid registered slice name: ${name}`);
  const dir = ownedPath(wtRoot(), path.join(wtRoot(), name));
  if (typeof meta?.dir !== 'string' || path.resolve(meta.dir) !== dir || meta.branch !== `aegis/slice-${name}`)
    die(4, `slice ${name} has an unowned registered path/branch - preserve it and investigate`);
  return dir;
}

function absent(dir: string): boolean {
  try { fs.lstatSync(dir); return false; }
  catch (e: any) { if (e?.code === 'ENOENT') return true; throw e; }
}

function verifiedAbsentWorktree(dir: string): boolean {
  if (!absent(dir)) return false;
  const paths = git(['worktree', 'list', '--porcelain', '-z']).split('\0')
    .filter(field => field.startsWith('worktree ')).map(field => field.slice('worktree '.length));
  if (!paths.length || paths.some(p => !path.isAbsolute(p)))
    die(4, 'cannot verify Git worktree registry - slice and lane retained');
  if (paths.some(p => path.relative(dir, path.resolve(p)) === ''))
    die(4, 'absent worktree is still registered in Git - slice and lane retained');
  if (!absent(dir)) die(4, 'worktree path reappeared during verification - slice and lane retained');
  return true;
}

function operate(op: string, name: string): void {
  const pre = loadState() as any;
  pre.slices ??= {};

  if (op === 'create') {
    if (!name) die(2, 'usage: aegis slice create <name>');
    if (pre.slices[name]) die(4, `slice already registered: ${name} (remove it first: aegis slice remove ${name})`);
    if (pre.lanes.active.length >= pre.lanes.max)
      die(4, `LANE CAP: ${pre.lanes.active.length}/${pre.lanes.max} - refuses to spawn (N5)`);
    const dir = ownedPath(wtRoot(), path.join(wtRoot(), name));
    const branch = `aegis/slice-${name}`;
    // Hold the lifecycle and state locks through Git and registration: no
    // concurrent creator/uninstaller can invalidate the preflight snapshot.
    const s = acquireState(stateP) as any;
    s.slices ??= {};
    fs.mkdirSync(wtRoot(), { recursive: true });
    try { git(['worktree', 'add', dir, '-b', branch]); }
    catch (e: any) { die(4, `worktree create failed: ${String(e.message).split('\n')[0]}`); }
    s.slices[name] = { dir, branch, created: new Date().toISOString() };
    s.lanes.active.push(name);
    commitState(stateP, s);
    ok(`slice ${name}: worktree ${dir} on ${branch} (lane ${s.lanes.active.length}/${s.lanes.max})`);
  } else if (op === 'list') {
    const entries = Object.entries(pre.slices) as [string, any][];
    if (!entries.length) { console.log('no slices registered'); return; }
    for (const [n, meta] of entries) {
      const dir = registeredDir(n, meta);
      const alive = fs.existsSync(path.join(dir, '.git'));
      console.log(`${alive ? 'live ' : 'STALE'} ${n} -> ${meta.branch} @ ${meta.dir}`);
    }
  } else if (op === 'remove') {
    const meta = pre.slices?.[name];
    if (!meta) die(2, `unknown slice: ${name}`);
    const dir = registeredDir(name, meta);
    const s = acquireState(stateP) as any;
    s.slices = s.slices ?? {};
    try {
      if (!verifiedAbsentWorktree(dir)) {
        if (git(['symbolic-ref', '--short', 'HEAD'], dir) !== meta.branch)
          die(4, `slice ${name} is on a different branch - preserve its worktree`);
        if (git(['status', '--porcelain', '--untracked-files=all', '--ignored'], dir))
          die(4, `slice ${name} has tracked, untracked or ignored local work - worktree and lane retained`);
        git(['worktree', 'remove', dir]);
      }
    } catch (e: any) { die(4, `worktree remove refused; slice and lane retained: ${String(e.message).split('\n')[0]}`); }
    delete s.slices[name];
    s.lanes.active = (s.lanes.active ?? []).filter((x: string) => x !== name);
    commitState(stateP, s);
    ok(`slice ${name} removed, lane closed`);
  } else die(2, 'usage: aegis slice <create|list|remove> <name>');
}
