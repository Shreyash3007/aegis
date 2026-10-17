import fs from 'node:fs';
import path from 'node:path';
import { AEGIS_DIR, REPO, die, ok, readJ, git, MACHINE_IGNORES } from '../lib/util.js';
import { isManagedHookBody, hooksDir as effectiveHooksDir } from '../lib/hooks.js';
import { withFileLock, lifecyclePath } from '../lib/lock.js';
import { ownedPath } from '../lib/owned-path.js';

/** aegis remove - uninstall Aegis from this repo, restoring what init took.
 *  Removes: .aegis/ tree, Aegis-managed git hooks (managed-banner check -
 *  foreign hooks are never touched), the .gitignore machine lines (deleting
 *  the file only if init created it, i.e. the lines were its whole content).
 *  Restores: `.aegis-orig` foreign-hook backups moved aside at install.
 *  Refuses (exit 4) with open slices/lanes - close them first so no
 *  worktree is stranded without its registry. Never deletes brain/ (user
 *  context by uninstall time); prints the two manual leftovers instead:
 *  delete brain/ by hand, `npm uninstall -g aegis` for the CLI itself.
 *  Ordering (post-release audit): .aegis/ is removed FIRST - if the machine
 *  tree cannot go (open handle, AV pin), nothing else has changed yet, so a
 *  failed run never leaves a half-uninstalled repo. */

export function remove(args: string[]): void {
  if (args.length) die(2, 'usage: aegis remove (no arguments)');
  withFileLock(lifecyclePath, uninstall);
}

function uninstall(): void {
  ownedPath(REPO, AEGIS_DIR);
  if (!fs.existsSync(AEGIS_DIR)) die(2, 'nothing to remove - no .aegis/ (never initialized?)');
  try {
    const s = readJ<{ slices?: Record<string, unknown>; lanes?: { active?: string[] } }>(ownedPath(REPO, path.join(AEGIS_DIR, 'state.json')));
    if (!s || !s.lanes || !Array.isArray(s.lanes.active) || (s.slices !== undefined &&
      (!s.slices || typeof s.slices !== 'object' || Array.isArray(s.slices))))
      die(4, 'unreadable active state - preserve the install and recover its lane registry first');
    const open = Object.keys(s.slices ?? {});
    if (open.length || (s.lanes?.active ?? []).length)
      die(4, `open slices/lanes: ${[...open, ...(s.lanes?.active ?? [])].join(', ')} - close them first (aegis slice remove <name>) so no worktree strands`);
  } catch { die(4, 'unreadable active state - preserve the install and recover its lane registry first'); }
  const legacy = ownedPath(REPO, path.join(AEGIS_DIR, 'memory', 'records.jsonl'));
  const lanes = ownedPath(REPO, path.join(AEGIS_DIR, 'memory', 'lanes'));
  if (fs.existsSync(legacy) || (fs.existsSync(lanes) && fs.readdirSync(lanes).length))
    die(4, 'unmigrated/conflicting legacy memory - preserve .aegis; resolve with aegis memory sync before uninstall');
  if (fs.existsSync(ownedPath(REPO, path.join(AEGIS_DIR, 'memory', 'transaction.json'))))
    die(4, 'pending memory transaction - preserve .aegis and recover with aegis memory sync before uninstall');

  // 1. the machine tree itself, FIRST: if it cannot go, nothing else changes.
  try { fs.rmSync(AEGIS_DIR, { recursive: true, force: true }); }
  catch (e: any) {
    die(4, `cannot remove ${AEGIS_DIR} (${e?.code ?? e?.message}) - an external process may hold a file open; close it and re-run. Hooks and .gitignore are untouched.`);
  }

  // 2. hooks: drop files WE manage, restore moved-aside foreign hooks. An
  // external core.hooksPath never received our hooks (install refuses it),
  // so skip it with a note instead of dying on the ownership check - but
  // still clean the default hooks directory where init actually installed.
  const effective = path.resolve(effectiveHooksDir());
  const common = path.resolve(git(['rev-parse', '--path-format=absolute', '--git-common-dir']));
  const inside = (root: string): boolean => { const r = path.relative(root, effective); return r !== '..' && !r.startsWith(`..${path.sep}`) && !path.isAbsolute(r); };
  const hooksDir = inside(REPO) ? ownedPath(REPO, effective)
    : inside(common) ? ownedPath(common, effective)
    : (console.log(`note: effective hooks directory is outside this repo (core.hooksPath) - no Aegis hooks were installed there; cleaning the default hooks directory instead`), ownedPath(common, path.join(common, 'hooks')));
  const restored: string[] = [];
  const dropped: string[] = [];
  const kept: string[] = [];
  const skipped: string[] = [];
  if (fs.existsSync(hooksDir)) {
    for (const f of fs.readdirSync(hooksDir)) {
      if (f.endsWith('.aegis-orig') || f.endsWith('.sample')) continue;
      const raw = path.join(hooksDir, f);
      // Never act through a link: deleting a symlinked hook would remove the
      // operator's central-store target (skipped-with-note policy, the mirror
      // of install's refusal to write through links). lstat BEFORE the
      // ownership walk - ownedPath itself refuses linked paths.
      if (fs.lstatSync(raw).isSymbolicLink()) { skipped.push(`${f} (link - remove it manually)`); continue; }
      const p = ownedPath(hooksDir, raw);
      if (!fs.statSync(p).isFile()) continue;
      const body = fs.readFileSync(p, 'utf8');
      const orig = `${p}.aegis-orig`;
      if (isManagedHookBody(body)) {
        fs.rmSync(p);
        dropped.push(f);
        if (fs.existsSync(orig)) {
          fs.renameSync(orig, p);
          restored.push(f);
        }
      } else if (fs.existsSync(orig)) {
        kept.push(`${f} (operator replaced ours; backup left at ${f}.aegis-orig)`);
      }
    }
  }

  // 3. .gitignore: drop exactly our lines; delete the file only if init wrote it.
  const gi = ownedPath(REPO, path.join(REPO, '.gitignore'));
  if (fs.existsSync(gi)) {
    const kept2 = fs.readFileSync(gi, 'utf8').split('\n').filter((l) => !MACHINE_IGNORES.includes(l.trim()));
    if (!kept2.join('').trim()) fs.rmSync(gi);
    else fs.writeFileSync(gi, kept2.join('\n'));
  }

  ok(`aegis removed: .aegis/ deleted${dropped.length ? `; hooks dropped [${dropped.join(', ')}]` : ''}${restored.length ? `; foreign hooks restored [${restored.join(', ')}]` : ''}${kept.length ? `; untouched: ${kept.join('; ')}` : ''}${skipped.length ? `; skipped: ${skipped.join('; ')}` : ''}`);
  console.log('left for you: brain/ (your context - delete by hand if unwanted) and the CLI itself (`npm uninstall -g aegis`)');
}
