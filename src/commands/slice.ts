import fs from 'node:fs';
import path from 'node:path';
import { REPO, die, git, ok } from '../lib/util.js';
import { acquireState, commitState, loadState, stateP } from '../lib/state.js';

/** aegis slice <create|list|remove> <name> - worktree-per-slice (N2).
 *  Worktrees live OUTSIDE the repo (A1.5). Registered in state.json (A1.6). */
const wtRoot = () => path.resolve(REPO, '..', `${path.basename(REPO)}-worktrees`);

export function slice(args: string[]): void {
  const [op, name] = args;
  const pre = loadState() as any;
  pre.slices = pre.slices ?? {};

  if (op === 'create') {
    if (!name) die(2, 'usage: aegis slice create <name>');
    if (pre.slices[name]) die(4, `slice already registered: ${name} (remove it first: aegis slice remove ${name})`);
    if (pre.lanes.active.length >= pre.lanes.max)
      die(4, `LANE CAP: ${pre.lanes.active.length}/${pre.lanes.max} - refuses to spawn (N5)`);
    const dir = path.join(wtRoot(), name);
    const branch = `aegis/slice-${name}`;
    fs.mkdirSync(wtRoot(), { recursive: true });
    try { git(['worktree', 'add', dir, '-b', branch]); }
    catch (e: any) { die(4, `worktree create failed: ${String(e.message).split('\n')[0]}`); }
    // Re-check under the state lock: a concurrent creator may have filled
    // the cap or taken the name while git ran. On conflict, roll back the
    // just-created worktree so no orphaned tree survives the refusal.
    const s = acquireState(stateP) as any;
    s.slices = s.slices ?? {};
    const conflict = s.slices[name] ? `slice already registered: ${name}`
      : s.lanes.active.length >= s.lanes.max ? `LANE CAP: ${s.lanes.active.length}/${s.lanes.max} - refuses to spawn (N5)` : null;
    if (conflict) {
      try { git(['worktree', 'remove', dir, '--force']); } catch { /* orphan cleanup best effort */ }
      try { git(['branch', '-D', branch]); } catch { /* branch may not exist */ }
      commitState(stateP, s);
      die(4, conflict);
    }
    s.slices[name] = { dir, branch, created: new Date().toISOString() };
    s.lanes.active.push(name);
    commitState(stateP, s);
    ok(`slice ${name}: worktree ${dir} on ${branch} (lane ${s.lanes.active.length}/${s.lanes.max})`);
  } else if (op === 'list') {
    const entries = Object.entries(pre.slices) as [string, any][];
    if (!entries.length) { console.log('no slices registered'); return; }
    for (const [n, meta] of entries) {
      const alive = fs.existsSync(path.join(meta.dir, '.git'));
      console.log(`${alive ? 'live ' : 'STALE'} ${n} -> ${meta.branch} @ ${meta.dir}`);
    }
  } else if (op === 'remove') {
    const meta = pre.slices?.[name];
    if (!meta) die(2, `unknown slice: ${name}`);
    try { git(['worktree', 'remove', meta.dir, '--force']); } catch { /* may be gone */ }
    const s = acquireState(stateP) as any;
    s.slices = s.slices ?? {};
    delete s.slices[name];
    s.lanes.active = (s.lanes.active ?? []).filter((x: string) => x !== name);
    commitState(stateP, s);
    ok(`slice ${name} removed, lane closed`);
  } else die(2, 'usage: aegis slice <create|list|remove> <name>');
}
