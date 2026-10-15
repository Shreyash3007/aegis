import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { AEGIS_DIR, die, ok } from '../lib/util.js';
import { readSourceLock, verifiedSource } from '../lib/blade-source.js';

/** Resolve optional craft guidance, never execute it or install globals.
 * --root points at a user-installed, pinned upstream checkout. Local stores
 * are also considered, but only exact blob matches earn VERIFIED. */
export function blade(args: string[]): void {
  const [op, name] = args;
  if (op !== 'list' && op !== 'resolve') die(2, 'usage: aegis blade <list|resolve <name>> [--root <pinned-checkout>]');
  // The running CLI's packaged lock, not a possibly stale installed copy.
  // Existing repos can upgrade this integration without destructive re-init.
  const file = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'skills', 'superpowers.lock.json');
  if (!fs.existsSync(file)) die(2, 'source lock missing - update installed Aegis skills before resolving blades');
  let lock;
  try { lock = readSourceLock(file); } catch { die(2, 'source lock malformed - restore it from the installed package'); }
  if (op === 'list') {
    for (const pin of lock.skills) console.log(`${pin.name} -> ${pin.phase} (${lock.tag}, commit ${lock.commit})`);
    return;
  }
  const pin = lock.skills.find((p) => p.name === name);
  if (!pin) die(2, `unknown pinned blade: ${name}`);
  const ri = args.indexOf('--root');
  if (ri >= 0 && !args[ri + 1]) die(2, '--root needs a pinned upstream checkout directory');
  const candidates = ri >= 0 ? [path.resolve(args[ri + 1], pin.path)]
    : ['.agents', '.claude'].map((s) => path.join(os.homedir(), s, 'skills', pin.name, 'SKILL.md'));
  const source = candidates.find((p) => verifiedSource(p, pin.git_blob));
  if (source) ok(`blade VERIFIED: ${pin.name} ${lock.tag} ${pin.git_blob}\nsource: ${source}`);
  else console.log(`blade UNMEASURED: ${pin.name} (missing or mismatched pinned content)\nuse native fallback: ${path.join(AEGIS_DIR, 'skills', pin.fallback)}`);
  console.log('Aegis pipeline/gates remain authoritative. Collision rules:');
  for (const rule of pin.collisions) console.log(`- ${rule}`);
}
