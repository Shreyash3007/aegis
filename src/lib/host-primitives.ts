import { spawnSync } from 'node:child_process';

/** Shared host-adapter primitives (06b review, v0.11). Host adapters are
 *  vertical slices: none of them may import another adapter's internals, or
 *  one host's change silently breaks another. Anything more than one adapter
 *  needs lives here instead - a neutral module with no adapter dependency.
 *  (Adapters legitimately depend on `../contracts/hosts.js`,
 *  `../hosts/declarations.js` and `../lib/util.js`; those are not adapters.) */

/** How `aegis` resolves on PATH right now (argv scan, no shell on Windows).
 *  Used by adapters that must warn when the CLI is absent, and by the
 *  claude-code adapter's exec-vs-shell form choice. */
export function pathHits(): string[] {
  const r = process.platform === 'win32'
    ? spawnSync('where.exe', ['aegis'], { encoding: 'utf8', timeout: 5000 })
    : spawnSync('sh', ['-c', 'command -v aegis'], { encoding: 'utf8', timeout: 5000 });
  return (r.stdout ?? '').split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
}
