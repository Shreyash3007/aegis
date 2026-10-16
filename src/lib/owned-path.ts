import fs from 'node:fs';
import path from 'node:path';
import { die } from './util.js';

function expandWindowsSpelling(file: string, code: number): string {
  const absolute = path.resolve(file);
  if (process.platform !== 'win32') return absolute;
  const volume = path.parse(absolute).root;
  const parts = absolute.slice(volume.length).split(path.sep).filter(Boolean);
  let current = volume;
  for (let i = 0; i < parts.length; i++) {
    current = path.join(current, parts[i]);
    let stat: fs.Stats;
    try { stat = fs.lstatSync(current); }
    catch (e: any) {
      if (e?.code === 'ENOENT') return path.join(current, ...parts.slice(i + 1));
      throw e;
    }
    // Check BEFORE native expansion: otherwise an in-root link could become
    // an ordinary owned path and escape the link refusal below.
    if (stat.isSymbolicLink()) die(code, `linked path is not owned: ${current}`);
    current = fs.realpathSync.native(current);
  }
  return current;
}

/** Check existing components, including the root and dangling links, before I/O. */
export function ownedPath(root: string, candidate: string, code = 4): string {
  const base = expandWindowsSpelling(root, code), target = expandWindowsSpelling(candidate, code);
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
