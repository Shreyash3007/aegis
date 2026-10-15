import fs from 'node:fs';
import path from 'node:path';
import { die } from './util.js';

/** Check existing components, including the root and dangling links, before I/O. */
export function ownedPath(root: string, candidate: string, code = 4): string {
  const base = path.resolve(root), target = path.resolve(candidate);
  const relative = path.relative(base, target);
  if (relative === '..' || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative))
    die(code, `path outside owned root: ${target}`);
  let current = base;
  for (const part of ['', ...relative.split(path.sep).filter(Boolean)]) {
    if (part) current = path.join(current, part);
    let stat: fs.Stats;
    try { stat = fs.lstatSync(current); }
    catch (e: any) { if (e?.code === 'ENOENT') continue; throw e; }
    if (stat.isSymbolicLink()) die(code, `linked path is not owned: ${current}`);
  }
  return target;
}
