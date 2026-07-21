import fs from 'node:fs';
import path from 'node:path';
import { AEGIS_DIR, REPO, readJ, sha } from './util.js';

/** Volatile timestamp fields, stripped before hashing (A1.2 honesty rule: no
 *  timestamps in hashed content). The runtime writes these itself on every
 *  transition/gate, so hashing them would make each checkpoint
 *  self-invalidating. Semantic fields (current_skill, gates, edges) remain. */
const VOLATILE_KEYS = new Set(['at', 'created', 'updated_at']);

/** Canonical form: sorted keys, volatile fields dropped - byte-deterministic. */
function stripVolatile(o: unknown): unknown {
  if (Array.isArray(o)) return o.map(stripVolatile);
  if (o && typeof o === 'object') {
    const out: Record<string, unknown> = {};
    for (const k of Object.keys(o).sort()) {
      if (VOLATILE_KEYS.has(k)) continue;
      out[k] = stripVolatile((o as Record<string, unknown>)[k]);
    }
    return out;
  }
  return o;
}

/** Hashes all brain files + generated AST artifacts + the state machine's
 *  ground truth (.aegis/state.json, .aegis/transitions.json, canonicalized).
 *  All hashed content must be byte-deterministic (A1.2). */
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
  for (const name of ['state.json', 'transitions.json']) {
    const p = path.join(AEGIS_DIR, name);
    if (fs.existsSync(p))
      h[path.relative(REPO, p)] = sha(JSON.stringify(stripVolatile(readJ<unknown>(p))));
  }
  return h;
}
