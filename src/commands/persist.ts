import fs from 'node:fs';
import path from 'node:path';
import { AEGIS_DIR, REPO, die, git, ok, readJ, writeJ } from '../lib/util.js';
import { loadState, loadStateFrom, declaredApps, appStatePath } from '../lib/state.js';
import { brainHashes } from '../lib/hashes.js';
import { memorySummary } from './memory.js';
import { withFileLock, lifecyclePath } from '../lib/lock.js';
import { ownedPath } from '../lib/owned-path.js';

interface Checkpoint {
  id: string; at: string; skill: string;
  gitSha: string; hashes: Record<string, string>;
  apps?: Record<string, string>; // v0.4: app -> current_skill (multi-app repos)
}

const cpDir = () => ownedPath(REPO, path.join(AEGIS_DIR, 'checkpoints'), 6);
const checkpointFiles = (): string[] => fs.existsSync(cpDir())
  ? fs.readdirSync(cpDir()).filter(f => /^cp-\d+\.json$/.test(f)).sort() : [];

export function checkpoint(args: string[]): void {
  withFileLock(lifecyclePath, () => capture(args));
}

function capture(args: string[]): void {
  const s = loadState();
  const quiet = args.includes('--quiet');
  let gitSha = 'unknown';
  try { gitSha = git(['rev-parse', 'HEAD']); } catch { /* pre-first-commit */ }
  const apps: Record<string, string> = {};
  for (const a of declaredApps()) {
    try { apps[a] = loadStateFrom(appStatePath(a)).current_skill; } catch { apps[a] = 'unknown'; }
  }
  const cp: Checkpoint = {
    // Lifecycle serialization makes this allocation monotonic even when
    // writers share a millisecond or the system clock moves backward.
    id: `cp-${Math.max(Date.now(), ...checkpointFiles().map(f => Number(f.slice(3, -5)) + 1))}`,
    at: new Date().toISOString(),
    skill: s.current_skill,
    gitSha,
    hashes: brainHashes(),
    ...(Object.keys(apps).length ? { apps } : {}),
  };
  writeJ(path.join(cpDir(), `${cp.id}.json`), cp);
  if (!quiet) ok(`checkpoint ${cp.id} written (git ${gitSha.slice(0, 8)}, ${Object.keys(cp.hashes).length} files hashed)`);
}

export function resume(): void {
  withFileLock(lifecyclePath, reconstruct);
}

function reconstruct(): void {
  const dir = cpDir();
  const cps = checkpointFiles();
  if (!cps.length) die(2, 'no checkpoints - restart from 00a (aegis init)');
  const cp = readJ<Checkpoint>(ownedPath(REPO, path.join(dir, cps[cps.length - 1]), 6));
  const now = brainHashes();
  const drift: string[] = [];
  for (const [f, h] of Object.entries(cp.hashes)) {
    if (!now[f]) drift.push(`DELETED: ${f}`);
    else if (now[f] !== h) drift.push(`MODIFIED: ${f}`);
  }
  for (const f of Object.keys(now)) if (!(f in cp.hashes)) drift.push(`ADDED: ${f}`);
  if (drift.length)
    die(6, `INTEGRITY MISMATCH since ${cp.id}:\n  ${drift.join('\n  ')}\n  generated views? run aegis sync / aegis ast build, then resume again\n  otherwise: HUMAN ESCALATION`);
  let gitDrift = '';
  try {
    const d = git(['status', '--porcelain']);
    if (d) gitDrift = `\n  uncommitted changes: ${d.split('\n').length} files`;
  } catch { /* ignore */ }
  const mem = memorySummary();
  console.log([
    'RECONSTRUCTION PACK',
    `  checkpoint: ${cp.id}`,
    `  resume at skill: ${cp.skill}`,
    ...(cp.apps ? Object.entries(cp.apps).map(([a, sk]) => `  app ${a}: ${sk}`) : []),
    ...(mem ? [`  ${mem}`] : []),
    `  git HEAD at checkpoint: ${cp.gitSha.slice(0, 8)}`,
    `  integrity: VERIFIED (${Object.keys(cp.hashes).length} files match)${gitDrift}`,
  ].join('\n'));
}
