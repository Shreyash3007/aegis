import fs from 'node:fs';
import path from 'node:path';
import { AEGIS_DIR, REPO, sha } from './util.js';

/** Hashes all brain files + generated AST artifacts. All hashed content must be
 *  byte-deterministic (A1.2) - no timestamps, no random ordering. */
export function brainHashes(): Record<string, string> {
  const files: string[] = [];
  const walk = (d: string): void => {
    if (!fs.existsSync(d)) return;
    for (const f of fs.readdirSync(d).sort()) {
      const p = path.join(d, f);
      if (fs.statSync(p).isDirectory()) walk(p); else files.push(p);
    }
  };
  walk(path.join(REPO, 'brain'));
  walk(path.join(AEGIS_DIR, 'ast'));
  const h: Record<string, string> = {};
  for (const f of files.sort()) h[path.relative(REPO, f)] = sha(fs.readFileSync(f));
  return h;
}
