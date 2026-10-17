import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { AEGIS_DIR, die, gitTry, ok } from '../lib/util.js';
import { acquireState, commitState, loadState, stateP } from '../lib/state.js';
import type { ReleaseEvidenceV2 } from '../contracts/evidence.js';

/** Public exports deliberately aggregate rather than copy raw state:
 * no prompts, commands, paths, finding text, names or credentials. */
export function evidence(args: string[]): void {
  const op = args[0];
  if (op === 'usage') {
    const flags = args.slice(1);
    const allowed = new Set(['--model', '--tokens-in', '--tokens-out', '--cost-usd']);
    for (let i = 0; i < flags.length; i += 2)
      if (!allowed.has(flags[i]) || flags[i + 1] === undefined) die(2, 'usage: aegis evidence usage [--model <chosen-model>] [--tokens-in N] [--tokens-out N] [--cost-usd N]');
    const val = (key: string): string | undefined => { const i = flags.indexOf(key); return i >= 0 ? flags[i + 1] : undefined; };
    const numeric = (key: string, integer: boolean): number | null => {
      const v = val(key);
      if (v === undefined) return null;
      const n = Number(v);
      if (!v.trim() || !Number.isFinite(n) || n < 0 || (integer && !Number.isSafeInteger(n))) die(2, `${key} needs a nonnegative ${integer ? 'integer' : 'number'}`);
      return n;
    };
    const report = { model: val('--model') ?? null, tokens_in: numeric('--tokens-in', true), tokens_out: numeric('--tokens-out', true), cost_usd: numeric('--cost-usd', false), at: new Date().toISOString() };
    if (report.tokens_in === null && report.tokens_out === null && report.cost_usd === null) die(2, 'provide at least one usage measurement; absent fields remain UNMEASURED');
    const s = acquireState(stateP);
    (s.usage_reports ??= []).push(report);
    s.history.push({ skill: s.current_skill, at: report.at, event: 'usage-report: executor-reported, not independently verified' });
    commitState(stateP, s);
    ok('usage recorded as executor-reported; no model selection performed');
    return;
  }
  if (op !== 'export') die(2, 'usage: aegis evidence <usage|export --file <json> [--battery <json>] [--artifacts-dir <dir>]>');
  const flags = args.slice(1);
  const known = new Set(['--file', '--battery', '--artifacts-dir']);
  for (let i = 0; i < flags.length; i += 2)
    if (!known.has(flags[i]) || flags[i + 1] === undefined) die(2, 'usage: aegis evidence export --file <json> [--battery <json>] [--artifacts-dir <dir>]');
  const val = (key: string): string | undefined => { const i = flags.indexOf(key); return i >= 0 ? flags[i + 1] : undefined; };
  if (val('--file') === undefined) die(2, 'export requires --file <json>');
  const file = path.resolve(val('--file')!);
  if (fs.existsSync(file)) die(4, 'evidence exports are immutable observations; use a successor filename');
  const batteryArg = val('--battery');
  const s = loadState();
  const usage = s.usage_reports ?? [];
  const sum = (field: 'tokens_in' | 'tokens_out' | 'cost_usd'): number | null =>
    usage.length && usage.every((r) => r[field] !== null) ? usage.reduce((n, r) => n + r[field]!, 0) : null;
  const usageBlock: ReleaseEvidenceV2['usage'] = {
    provenance: PROVENANCE, reports: usage.length,
    tokens_in: sum('tokens_in'), tokens_out: sum('tokens_out'), cost_usd: sum('cost_usd'),
    cost_status: sum('cost_usd') === null ? 'UNMEASURED' : 'REPORTED',
  };
  const judgments: Record<string, unknown> = (s.judgment_budget as Record<string, unknown> | undefined) ?? { status: 'UNMEASURED' };
  if (batteryArg === undefined) {
    // v1 aggregate export (unchanged surface; pinned by the judgment-budget
    // and audit regressions). The v2 release publisher is opt-in via --battery.
    publishCreateOnly(file, {
      schema_version: 1, commit: gitTry(['rev-parse', 'HEAD']),
      counts: { history_events: s.history.length, approved_gates: Object.keys(s.gates).length },
      usage: usageBlock, judgments,
      test_status: 'UNMEASURED - tests must supply a separate run artifact',
      privacy: PRIVACY,
    });
    ok(`aggregate evidence exported: ${file} (no raw state published)`);
    return;
  }
  publishRelease(file, path.resolve(batteryArg), val('--artifacts-dir') ? path.resolve(val('--artifacts-dir')!) : process.cwd(), usageBlock, judgments);
}

const PRIVACY: ReleaseEvidenceV2['privacy'] = 'aggregate only; no raw state, prompts, model names or commands';
const PROVENANCE: ReleaseEvidenceV2['usage']['provenance'] = 'executor-reported (not independently verified)';

/** Conservative refusals, not proof of absence: a private path candidate or
 *  a credential-looking value in any published string refuses publication. */
const PRIVATE_PATH = /(^|[\s(])[A-Za-z]:[\\/]|\\\\|(^|[\\/])(Users|home|AppData|\.ssh|\.aws|\.claude)([\\/]|$)/i;
const CREDENTIAL = /(api[_-]?key|secret|password|passwd|bearer|token|credential)\s*[:=]/i;
const KNOWN_TOKEN = /\b(ghp_|gho_|ghs_|github_pat_|sk-|xox[baprs]-)[A-Za-z0-9_-]{10,}\b|AKIA[0-9A-Z]{16}|-----BEGIN [A-Z ]+-----|\beyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{10,}\b/;
const BILLING_KEY = /^(usage|usage_reports|cost|cost_usd|billing|billed|billing_status)$/i;

function scanText(field: string, value: unknown, max: number): string {
  if (typeof value !== 'string' || !value.trim()) die(4, `${field} must be a non-empty string`);
  if (value.length > max) die(4, `${field} exceeds ${max} characters - raw prompt or document blobs are refused`);
  if (/[\u0000-\u001f\u007f]/.test(value)) die(4, `${field} must be a single line without control characters`);
  if (PRIVATE_PATH.test(value)) die(4, `${field} carries a private path candidate; publish names and summaries only`);
  if (CREDENTIAL.test(value) || KNOWN_TOKEN.test(value)) die(4, `${field} carries a credential-looking value; publication refuses secrets`);
  return value;
}

function asObject(value: unknown, field: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) die(4, `${field} must be an object`);
  return value as Record<string, unknown>;
}

function allowKeys(obj: Record<string, unknown>, allowed: string[], field: string): void {
  for (const k of Object.keys(obj))
    if (!allowed.includes(k)) die(4, `${field}: unknown key '${k}' - only contract fields publish`);
}

function publishCreateOnly(file: string, document: unknown): void {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  // Atomic create-only publication: rename/writeJ would replace a concurrent
  // successful export. A same-directory hard link exposes only complete bytes.
  const temporary = path.join(path.dirname(file), `.aegis-export-${crypto.randomUUID()}.tmp`);
  fs.writeFileSync(temporary, JSON.stringify(document, null, 2) + '\n', { flag: 'wx' });
  try { fs.linkSync(temporary, file); }
  catch (e) {
    fs.rmSync(temporary, { force: true });
    if ((e as NodeJS.ErrnoException).code === 'EEXIST') die(4, 'evidence observation already exists; use a successor filename');
    throw e;
  }
  fs.rmSync(temporary);
}

/** v2 release publication (v0.11 R4): the battery file is validated against
 *  the contract, the exact candidate commit, the CI linkage and the actual
 *  artifact bytes; anything missing, stale, private or billing-flavoured
 *  refuses before any write happens. */
function publishRelease(file: string, batteryFile: string, artifactsDir: string, usage: ReleaseEvidenceV2['usage'], judgments: Record<string, unknown>): void {
  if (!fs.existsSync(batteryFile)) die(4, 'battery observations missing: refused (publication never guesses)');
  let raw: unknown;
  try { raw = JSON.parse(fs.readFileSync(batteryFile, 'utf8')); }
  catch { die(4, 'battery file unreadable or malformed JSON: refused'); }
  const root = asObject(raw, 'battery');
  for (const k of Object.keys(root))
    if (BILLING_KEY.test(k)) die(4, `battery key '${k}': caller-reported usage is publication-owned - reported cost can never be published as billed`);
  allowKeys(root, ['schema_version', 'source_sha', 'ci', 'observations', 'artifacts', 'limitations'], 'battery');
  if (root.schema_version !== undefined && root.schema_version !== 2)
    die(4, `battery schema_version ${String(root.schema_version)} is not the supported v2`);
  if (typeof root.source_sha !== 'string' || !/^[a-f0-9]{40}$/.test(root.source_sha))
    die(4, 'source binding missing: source_sha must be the exact 40-hex candidate commit');
  const head = gitTry(['rev-parse', 'HEAD']);
  if (!head) die(4, 'no source commit: publication needs a git checkout to bind');
  if (root.source_sha !== head)
    die(4, `stale observations: battery binds ${root.source_sha.slice(0, 12)} but HEAD is ${head.slice(0, 12)} - recapture at the candidate commit`);
  const ci = asObject(root.ci, 'ci');
  allowKeys(ci, ['run_url', 'conclusion'], 'ci');
  if (!('run_url' in ci) || !('conclusion' in ci))
    die(4, 'ci linkage must state run_url and conclusion explicitly (null when none is recorded - never guessed)');
  const runUrl = ci.run_url === null ? null : scanText('ci.run_url', ci.run_url, 300);
  const conclusion = ci.conclusion === null ? null : scanText('ci.conclusion', ci.conclusion, 40);
  if (runUrl !== null && !/^https:\/\//.test(runUrl)) die(4, 'ci.run_url must be an https URL');
  if (!Array.isArray(root.observations) || root.observations.length === 0)
    die(4, 'observations missing: publication refuses empty or absent battery observations');
  if (root.observations.length > 64) die(4, 'too many observations (max 64)');
  const names = new Set<string>();
  const observations: ReleaseEvidenceV2['observations'] = root.observations.map((entry, i) => {
    const o = asObject(entry, `observations[${i}]`);
    allowKeys(o, ['name', 'command', 'exit', 'summary'], `observations[${i}]`);
    if (typeof o.name !== 'string' || !/^[a-z][a-z0-9-]{1,63}$/.test(o.name))
      die(4, `observations[${i}].name must be a fixed battery step name (lowercase, dashes, 2-64 chars)`);
    if (names.has(o.name)) die(4, `duplicate observation step '${o.name}' - one entry per battery step`);
    names.add(o.name);
    if (!Number.isSafeInteger(o.exit)) die(4, `observations[${i}].exit must be an integer`);
    return { name: o.name, command: scanText(`observations[${i}].command`, o.command, 240), exit: o.exit as number, summary: scanText(`observations[${i}].summary`, o.summary, 280) };
  });
  const rawArtifacts = root.artifacts ?? [];
  if (!Array.isArray(rawArtifacts)) die(4, 'artifacts must be an array');
  if (rawArtifacts.length > 20) die(4, 'too many artifacts (max 20)');
  const artifacts: ReleaseEvidenceV2['artifacts'] = rawArtifacts.map((entry, i) => {
    const a = asObject(entry, `artifacts[${i}]`);
    allowKeys(a, ['name', 'sha256', 'bytes'], `artifacts[${i}]`);
    if (typeof a.name !== 'string' || !a.name.trim() || a.name.length > 120 || /[\\/]/.test(a.name) || a.name === '.' || a.name === '..')
      die(4, `artifacts[${i}].name must be a plain file name inside the artifacts directory`);
    if (typeof a.sha256 !== 'string' || !/^[a-f0-9]{64}$/.test(a.sha256)) die(4, `artifacts[${i}].sha256 must be a lowercase hex sha256`);
    if (!Number.isSafeInteger(a.bytes) || (a.bytes as number) < 0) die(4, `artifacts[${i}].bytes must be a nonnegative integer`);
    const artifactPath = path.join(artifactsDir, a.name);
    if (!fs.existsSync(artifactPath)) die(4, `artifact missing: ${a.name} is not present - refused`);
    if (fs.lstatSync(artifactPath).isSymbolicLink()) die(4, `artifact link refused: ${a.name} is a link - substitution risk`);
    if (!fs.lstatSync(artifactPath).isFile()) die(4, `artifact not a regular file: ${a.name}`);
    const bytes = fs.readFileSync(artifactPath);
    if (crypto.createHash('sha256').update(bytes).digest('hex') !== a.sha256 || bytes.length !== a.bytes)
      die(4, `stale artifact: ${a.name} bytes do not match the recorded sha256/size - recapture`);
    return { name: a.name, sha256: a.sha256, bytes: a.bytes as number };
  });
  const rawLimitations = root.limitations ?? [];
  if (!Array.isArray(rawLimitations)) die(4, 'limitations must be an array');
  if (rawLimitations.length > 20) die(4, 'too many limitations (max 20)');
  const limitations = rawLimitations.map((l, i) => scanText(`limitations[${i}]`, l, 240));
  const document: ReleaseEvidenceV2 = {
    schema_version: 2, source_sha: root.source_sha, ci: { run_url: runUrl, conclusion },
    observations, artifacts, usage, judgments, limitations, privacy: PRIVACY,
  };
  publishCreateOnly(file, document);
  ok(`release evidence published: ${file} (schema v2; ${observations.length} observation(s), ${artifacts.length} artifact(s), no raw state)`);
}
