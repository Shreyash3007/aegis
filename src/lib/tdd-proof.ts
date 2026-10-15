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
  timeout_ms?: number;
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
  return gitTry(['show-ref', '--verify', '--hash', `refs/heads/${branch}`]) || null;
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
      !Array.isArray(p.command) || !p.command.length || p.command.some((s) => typeof s !== 'string' || !s) || !p.red ||
      p.tests.some((t) => !t || typeof t.file !== 'string' || path.isAbsolute(t.file) || t.file.replace(/\\/g, '/').split('/').includes('..') || !/^[a-f0-9]{64}$/.test(t.sha256)) ||
      new Set(p.tests.map((t) => t.file)).size !== p.tests.length || !/^[a-f0-9]{40}$/.test(p.red.commit) ||
      (p.green && !/^[a-f0-9]{40}$/.test(p.green.commit)) ||
      (p.timeout_ms !== undefined && (!Number.isInteger(p.timeout_ms) || p.timeout_ms < 1 || p.timeout_ms > 120_000)))
    throw new Error('malformed TDD receipt');
  return p;
}

/** Validate a receipt against the immutable commit being merged, not the
 * mutable working tree. CLI-generated evidence is auditable, not signed;
 * arbitrary shell access can still forge local files. */
export function proofProblem(branch: string, tip: string, snapshot?: TddProof | null): string | null {
  try {
    const p = snapshot === undefined ? readProof(branch) : snapshot;
    if (!p) return 'TDD proof missing - record RED then GREEN: aegis tdd red <branch> --test-file <test> --expect-exit 1 -- <runner> <args>';
    if (!p.green) return 'TDD GREEN missing - run: aegis tdd green <branch>';
    if (p.green.commit !== tip) return 'TDD proof STALE - branch tip changed; re-run GREEN';
    if (!Number.isInteger(p.red.exit) || p.red.exit <= 0 || p.red.exit > 125 || p.green.exit !== 0 || p.red.commit === tip)
      return 'TDD outcomes invalid';
    if (gitTry(['merge-base', p.red.commit, tip]) !== p.red.commit)
      return 'TDD RED is not an ancestor of the verified tip';
    for (const t of p.tests) {
      // Read bytes without stdout trimming or text encoding normalization.
      const content = gitFile(tip, t.file);
      if (digest(content) !== t.sha256 || digest(gitFile(p.red.commit, t.file)) !== t.sha256)
        return `TDD test changed since RED: ${t.file}`;
    }
    for (const r of [p.red, p.green]) {
      if (typeof r.output !== 'string' || !/^[a-f0-9-]+\.log$/.test(r.output) || !/^[a-f0-9]{64}$/.test(r.output_sha256))
        return 'TDD output reference malformed';
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
