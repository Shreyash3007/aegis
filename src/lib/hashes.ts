import fs from 'node:fs';
import path from 'node:path';
import { AEGIS_DIR, REPO, readJ, sha, die } from './util.js';
import { ownedPath } from './owned-path.js';

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
  if (fs.existsSync(ownedPath(REPO, path.join(AEGIS_DIR, 'memory', 'transaction.json'), 6)))
    die(6, 'pending memory transaction - recover with aegis memory sync before verifying integrity');
  const files: string[] = [];
  const walk = (d: string): void => {
    ownedPath(REPO, d, 6);
    if (!fs.existsSync(d)) return;
    for (const f of fs.readdirSync(d).sort()) {
      const p = path.join(d, f);
      ownedPath(REPO, p, 6);
      const stat = fs.lstatSync(p);
      if (stat.isDirectory()) walk(p);
      else if (stat.isFile()) files.push(p);
      else die(6, `unsupported integrity input: ${p}`);
    }
  };
  walk(path.join(REPO, 'brain'));
  walk(path.join(AEGIS_DIR, 'ast'));
  walk(path.join(AEGIS_DIR, 'tdd'));
  walk(path.join(AEGIS_DIR, 'quality'));
  const h: Record<string, string> = {};
  for (const f of files.sort()) h[path.relative(REPO, f)] = sha(fs.readFileSync(f));
  for (const name of ['state.json', 'transitions.json', 'config.json']) {
    const p = ownedPath(REPO, path.join(AEGIS_DIR, name), 6);
    if (fs.existsSync(p))
      h[path.relative(REPO, p)] = sha(JSON.stringify(stripVolatile(readJ<unknown>(p))));
  }
  // v0.4: per-app states are ground truth too - hash them canonicalized.
  const appsDir = ownedPath(REPO, path.join(AEGIS_DIR, 'apps'), 6);
  if (fs.existsSync(appsDir)) {
    for (const app of fs.readdirSync(appsDir).sort()) {
      const p = ownedPath(REPO, path.join(appsDir, app, 'state.json'), 6);
      if (fs.existsSync(p))
        h[path.relative(REPO, p)] = sha(JSON.stringify(stripVolatile(readJ<unknown>(p))));
    }
  }
  return h;
}
