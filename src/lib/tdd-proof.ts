import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { AEGIS_DIR, REPO, git, gitTry, readJ } from './util.js';

export interface TestRun {
  commit: string;
  exit: number;
  at: string;
  output: string;
  output_sha256: string;
}

export interface TddProof {
  version: 1;
  branch: string;
  command: string[];
  tests: { file: string; sha256: string }[];
  red: TestRun;
  green?: TestRun;
}

export const digest = (s: string | Buffer): string =>
  crypto.createHash('sha256').update(s).digest('hex');
export const proofPath = (branch: string): string =>
  path.join(AEGIS_DIR, 'tdd', `${digest(branch)}.json`);

export function localBranch(branch: string): string | null {
  if (!branch || branch.startsWith('-')) return null;
  return gitTry(['rev-parse', '--verify', `refs/heads/${branch}^{commit}`]) || null;
}

export function branchWorktree(branch: string): string | null {
  const blocks = git(['worktree', 'list', '--porcelain']).split(/\r?\n\r?\n/);
  for (const block of blocks) {
    const lines = block.split(/\r?\n/);
    if (lines.includes(`branch refs/heads/${branch}`))
      return lines.find((l) => l.startsWith('worktree '))?.slice(9) ?? null;
  }
  return null;
}

export function readProof(branch: string): TddProof | null {
  if (!fs.existsSync(proofPath(branch))) return null;
  const p = readJ<TddProof>(proofPath(branch));
  if (p.version !== 1 || p.branch !== branch || !Array.isArray(p.tests) || !p.tests.length ||
      !Array.isArray(p.command) || !p.command.length || !p.red)
    throw new Error('malformed TDD receipt');
  return p;
}

/** Validate a receipt against the immutable commit being merged, not the
 * mutable working tree. CLI-generated evidence is auditable, not signed;
 * arbitrary shell access can still forge local files. */
export function proofProblem(branch: string, tip: string): string | null {
  try {
    const p = readProof(branch);
    if (!p) return 'TDD proof missing - record RED then GREEN: aegis tdd red <branch> --test-file <test> --expect-exit 1 -- <runner> <args>';
    if (!p.green) return 'TDD GREEN missing - run: aegis tdd green <branch>';
    if (p.green.commit !== tip) return 'TDD proof STALE - branch tip changed; re-run GREEN';
    if (p.red.exit <= 0 || p.green.exit !== 0) return 'TDD outcomes invalid';
    if (gitTry(['merge-base', p.red.commit, tip]) !== p.red.commit)
      return 'TDD RED is not an ancestor of the verified tip';
    for (const t of p.tests) {
      // Read bytes without stdout trimming or text encoding normalization.
      const content = gitFile(tip, t.file);
      if (digest(content) !== t.sha256) return `TDD test changed since RED: ${t.file}`;
    }
    for (const r of [p.red, p.green]) {
      if (digest(fs.readFileSync(path.join(AEGIS_DIR, 'tdd', r.output))) !== r.output_sha256)
        return 'TDD output hash mismatch';
    }
    return null;
  } catch {
    return 'TDD proof unreadable or malformed - re-record evidence';
  }
}

export const gitFile = (commit: string, file: string): Buffer =>
  execFileSync('git', ['show', `${commit}:${file}`], { cwd: REPO, stdio: ['ignore', 'pipe', 'pipe'] });
