import fs from 'node:fs';
import path from 'node:path';
import { AEGIS_DIR, die, git, ok, readJ, writeJ } from '../lib/util.js';
import { loadState } from '../lib/state.js';
import { brainHashes } from '../lib/hashes.js';

interface Checkpoint {
  id: string; at: string; skill: string;
  gitSha: string; hashes: Record<string, string>;
}

const cpDir = () => path.join(AEGIS_DIR, 'checkpoints');

export function checkpoint(args: string[]): void {
  const s = loadState();
  const quiet = args.includes('--quiet');
  let gitSha = 'unknown';
  try { gitSha = git('rev-parse HEAD'); } catch { /* pre-first-commit */ }
  const cp: Checkpoint = {
    id: `cp-${Date.now()}`,
    at: new Date().toISOString(),
    skill: s.current_skill,
    gitSha,
    hashes: brainHashes(),
  };
  writeJ(path.join(cpDir(), `${cp.id}.json`), cp);
  if (!quiet) ok(`checkpoint ${cp.id} written (git ${gitSha.slice(0, 8)}, ${Object.keys(cp.hashes).length} files hashed)`);
}

export function resume(): void {
  const dir = cpDir();
  const cps = fs.existsSync(dir) ? fs.readdirSync(dir).sort() : [];
  if (!cps.length) die(2, 'no checkpoints - restart from 00a (aegis init)');
  const cp = readJ<Checkpoint>(path.join(dir, cps[cps.length - 1]));
  const now = brainHashes();
  const drift: string[] = [];
  for (const [f, h] of Object.entries(cp.hashes)) {
    if (!now[f]) drift.push(`DELETED: ${f}`);
    else if (now[f] !== h) drift.push(`MODIFIED: ${f}`);
  }
  if (drift.length)
    die(6, `INTEGRITY MISMATCH since ${cp.id}:\n  ${drift.join('\n  ')}\n  generated views? run aegis sync / aegis ast build, then resume again\n  otherwise: HUMAN ESCALATION`);
  let gitDrift = '';
  try {
    const d = git('status --porcelain');
    if (d) gitDrift = `\n  uncommitted changes: ${d.split('\n').length} files`;
  } catch { /* ignore */ }
  console.log([
    'RECONSTRUCTION PACK',
    `  checkpoint: ${cp.id}`,
    `  resume at skill: ${cp.skill}`,
    `  git HEAD at checkpoint: ${cp.gitSha.slice(0, 8)}`,
    `  integrity: VERIFIED (${Object.keys(cp.hashes).length} files match)${gitDrift}`,
  ].join('\n'));
}
