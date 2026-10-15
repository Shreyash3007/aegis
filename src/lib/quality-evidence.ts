import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { AEGIS_DIR, readJ } from './util.js';
import { digest, gitFile } from './tdd-proof.js';

export interface Criterion { id: string; statement: string; command: string[] }
export interface Finding { id: string; summary: string; severity: 'blocker' | 'major' | 'minor' | 'note'; status: 'open' | 'resolved'; evidence: string[] }
export interface Outcome { id: string; status: 'PASS' | 'FAIL'; exit: number | null; output_sha256: string; reason?: string }
export interface QualityReceipt {
  version: 1; kind: 'acceptance' | 'review'; branch: string; commit: string;
  source: string; source_sha256: string; at: string;
  criteria?: Criterion[]; results?: Outcome[]; findings?: Finding[];
}
export const qualityPath = (branch: string, kind: string): string =>
  path.join(AEGIS_DIR, 'quality', `${digest(branch)}-${kind}.json`);

export function validCriteria(value: unknown): value is Criterion[] {
  return Array.isArray(value) && value.length > 0 && value.length <= 20 &&
    value.every((c) => c && typeof c.id === 'string' && c.id.trim() && typeof c.statement === 'string' && c.statement.trim() &&
      Array.isArray(c.command) && c.command.length > 0 && c.command.every((s: unknown) => typeof s === 'string' && s.length > 0)) &&
    new Set(value.map((c) => c.id)).size === value.length;
}

export function validFindings(value: unknown): value is Finding[] {
  return Array.isArray(value) && value.every((f) => f && typeof f.id === 'string' && f.id.trim() &&
    typeof f.summary === 'string' && f.summary.trim() && ['blocker', 'major', 'minor', 'note'].includes(f.severity) &&
    ['open', 'resolved'].includes(f.status) && Array.isArray(f.evidence) && f.evidence.length > 0 &&
    f.evidence.every((s: unknown) => typeof s === 'string' && s.length > 0 && !path.isAbsolute(s) && !s.replace(/\\/g, '/').split('/').includes('..'))) &&
    new Set(value.map((f) => f.id)).size === value.length;
}

export type QualitySnapshot = Record<'acceptance' | 'review', QualityReceipt | null>;

export function readQuality(branch: string, kind: 'acceptance' | 'review'): QualityReceipt | null {
  const p = qualityPath(branch, kind);
  if (!fs.existsSync(p)) return null;
  const r = readJ<QualityReceipt>(p);
  if (!r || r.version !== 1 || r.kind !== kind || r.branch !== branch || !/^[a-f0-9]{40}$/.test(r.commit) ||
      typeof r.source !== 'string' || !r.source || path.isAbsolute(r.source) || r.source.replace(/\\/g, '/').split('/').includes('..') ||
      !/^[a-f0-9]{64}$/.test(r.source_sha256)) throw new Error('invalid quality receipt');
  if (kind === 'review' && !validFindings(r.findings)) throw new Error('invalid review findings');
  if (kind === 'acceptance') {
    if (!validCriteria(r.criteria) || !Array.isArray(r.results) || r.results.length !== r.criteria.length ||
        r.results.some((x) => !x || !['PASS', 'FAIL'].includes(x.status) ||
          !r.criteria!.some((c) => c.id === x.id) || !/^[a-f0-9]{64}$/.test(x.output_sha256) ||
          (x.status === 'PASS' ? x.exit !== 0 || x.reason !== undefined : x.exit !== null && !Number.isInteger(x.exit))) ||
        new Set(r.results.map((x) => x.id)).size !== r.results.length)
      throw new Error('invalid acceptance outcomes');
  }
  return r;
}

/** Owner-provided argv, no shell expansion. A bounded check timeout is not
 * a passing outcome. Hash output for provenance, without publishing it. */
export function runCriteria(criteria: Criterion[], cwd: string): Outcome[] {
  const deadline = Date.now() + 120_000;
  return criteria.map((c) => {
    if (Date.now() >= deadline) return { id: c.id, status: 'FAIL', exit: null, reason: 'total check budget exhausted', output_sha256: digest('not run') };
    const r = spawnSync(c.command[0], c.command.slice(1), {
      cwd, encoding: 'utf8', shell: false,
      timeout: Math.max(1, Math.min(60_000, deadline - Date.now())), maxBuffer: 4 * 1024 * 1024,
    });
    return {
      id: c.id, status: !r.error && !r.signal && r.status === 0 ? 'PASS' : 'FAIL',
      exit: r.status, output_sha256: digest(JSON.stringify({ stdout: r.stdout, stderr: r.stderr })),
      ...(r.error || r.signal ? { reason: 'runner error, signal or timeout' } : {}),
    };
  });
}

export function qualityProblem(branch: string, tip: string, strict = false, snapshot?: QualitySnapshot): string | null {
  try {
    for (const kind of ['acceptance', 'review'] as const) {
      const r = snapshot ? snapshot[kind] : readQuality(branch, kind);
      if (!r) { if (strict) return `QUALITY ${kind} evidence missing`; continue; }
      if (r.commit !== tip) return `QUALITY ${kind} STALE - recapture against the current branch tip`;
      const source = gitFile(tip, r.source);
      if (digest(source) !== r.source_sha256) return `QUALITY ${kind} source changed`;
      const plan = JSON.parse(source.toString('utf8'));
      const captured = kind === 'acceptance' ? r.criteria : r.findings;
      const declared = kind === 'acceptance' ? plan.criteria : plan.findings;
      if ((kind === 'acceptance' ? !validCriteria(declared) : !validFindings(declared)) || JSON.stringify(captured) !== JSON.stringify(declared))
        return `QUALITY ${kind} receipt does not match committed plan`;
      if (kind === 'acceptance' && (!r.results?.length || r.results.some((x) => x.status !== 'PASS')))
        return 'QUALITY acceptance failed - fix the observable outcome, not the threshold';
      if (kind === 'review') {
        if (!Array.isArray(r.findings)) return 'QUALITY review malformed';
        const blocking = r.findings.filter((f) => f.status === 'open' && ['blocker', 'major'].includes(f.severity));
        if (blocking.length) return `QUALITY review has open ${blocking.map((f) => f.severity + ':' + f.id).join(', ')} - blocker: revisit architecture; major: fix before merge`;
      }
    }
    return null;
  } catch { return 'QUALITY evidence unreadable or malformed'; }
}
