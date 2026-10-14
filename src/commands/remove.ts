import fs from 'node:fs';
import path from 'node:path';
import { AEGIS_DIR, REPO, die, ok, readJ } from '../lib/util.js';
import { MARKER } from '../lib/hooks.js';

/** aegis remove - uninstall Aegis from this repo, restoring what init took.
 *  Removes: .aegis/ tree, Aegis-managed git hooks (marker check - foreign
 *  hooks are never touched), the .gitignore `.aegis/` line (deleting the
 *  file only if init created it, i.e. the line was its whole content).
 *  Restores: `.aegis-orig` foreign-hook backups moved aside at install.
 *  Refuses (exit 4) with open slices/lanes - close them first so no
 *  worktree is stranded without its registry. Never deletes brain/ (user
 *  context by uninstall time); prints the two manual leftovers instead:
 *  delete brain/ by hand, `npm uninstall -g aegis` for the CLI itself. */

export function remove(args: string[]): void {
  if (args.length) die(2, 'usage: aegis remove (no arguments)');
  if (!fs.existsSync(AEGIS_DIR)) die(2, 'nothing to remove - no .aegis/ (never initialized?)');
  try {
    const s = readJ<{ slices?: Record<string, unknown>; lanes?: { active?: string[] } }>(path.join(AEGIS_DIR, 'state.json'));
    const open = Object.keys(s.slices ?? {});
    if (open.length || (s.lanes?.active ?? []).length)
      die(4, `open slices/lanes: ${[...open, ...(s.lanes?.active ?? [])].join(', ')} - close them first (aegis slice remove <name>) so no worktree strands`);
  } catch (e) {
    if (e instanceof Error && e.message.startsWith('open slices')) throw e;
    // Unparseable state: removing a corrupt install is still the way out.
  }

  // 1. hooks: drop files WE manage, restore moved-aside foreign hooks.
  const hooksDir = path.join(REPO, '.git', 'hooks');
  const restored: string[] = [];
  const dropped: string[] = [];
  const kept: string[] = [];
  if (fs.existsSync(hooksDir)) {
    for (const f of fs.readdirSync(hooksDir)) {
      if (f.endsWith('.aegis-orig') || f.endsWith('.sample')) continue;
      const p = path.join(hooksDir, f);
      if (!fs.statSync(p).isFile()) continue;
      const body = fs.readFileSync(p, 'utf8');
      const orig = `${p}.aegis-orig`;
      if (body.includes(MARKER)) {
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

  // 2. .gitignore: drop exactly our line; delete the file only if init wrote it.
  const gi = path.join(REPO, '.gitignore');
  if (fs.existsSync(gi)) {
    const kept2 = fs.readFileSync(gi, 'utf8').split('\n').filter((l) => l.trim() !== '.aegis/');
    if (!kept2.join('').trim()) fs.rmSync(gi);
    else fs.writeFileSync(gi, kept2.join('\n'));
  }

  // 3. the machine tree itself.
  fs.rmSync(AEGIS_DIR, { recursive: true, force: true });

  ok(`aegis removed: .aegis/ deleted${dropped.length ? `; hooks dropped [${dropped.join(', ')}]` : ''}${restored.length ? `; foreign hooks restored [${restored.join(', ')}]` : ''}${kept.length ? `; untouched: ${kept.join('; ')}` : ''}`);
  console.log('left for you: brain/ (your context - delete by hand if unwanted) and the CLI itself (`npm uninstall -g aegis`)');
}
