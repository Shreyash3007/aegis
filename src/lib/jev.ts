/** Judgment ring (SPEC §7): typed Noul/Choice/Score over direct TypeSafe
 *  HTTPS, mirroring the jev-use wire contract (verified against
 *  shitianfang/jev-use src/backends/{typesafe,native,http,mock}.ts).
 *  Zero new runtime dependencies: global fetch + a hash-synthesized mock.
 *
 *  Wire: POST {origin}/v1/systemone, Bearer TYPESAFE_API_KEY,
 *  body {model, state, questions: {id: {type, instructions, criteria}}}.
 *  Response answers map parsed strictly - a malformed answer fails the
 *  whole call into unreachable escalations, never a silent low score.
 *
 *  Confidence provenance mirrors upstream: provider-returned numbers are
 *  `reported` (threshold 0.5); estimates from the answer distribution are
 *  `estimated` (threshold 0.4). An explicit threshold always wins -
 *  CONSTRAINTS §4 fixes 0.7 for triage/citation gates.
 *  Degraded (no key, no mock flag) never judges: every verdict escalates
 *  with reason `unreachable`, and the caller must announce it verbatim. */

import { postJson } from './http.js';
import { reserveJudgments } from './judgment-budget.js';

export interface JevQuestion {
  id?: string; type: 'noul' | 'choice' | 'score'; question: string;
  options?: Record<string, string> | string[];
  levels?: string[];
  criteria?: { true: string; false: string };
}

export interface JevVerdict {
  id: string; type: string; answer: number | string;
  confidence: number; confidenceFrom: 'reported' | 'estimated';
  escalate: boolean; reason?: string; hint?: string;
  distribution?: Record<string, number>; legend?: Record<string, string>;
}

export interface JevResult {
  verdicts: JevVerdict[]; escalated: boolean;
  backend: 'typesafe' | 'mock' | 'degraded'; model: string; latencyMs: number;
}

export const TYPESAFE_BASE = 'https://api.typesafe.ai';
export const JEV_DEFAULT_MODEL = 'jev-latest';
const REPORTED_THRESHOLD = 0.5;
const ESTIMATED_THRESHOLD = 0.4;
const MAX_STATE_CHARS = 120_000; // ~30k tokens, the published state ceiling

export interface JevBackend {
  name: 'typesafe' | 'mock' | 'degraded';
  key?: string; baseUrl?: string; model?: string;
}

/** Backend resolution: explicit mock flag wins, then the server-side key,
 *  else degraded (which judges nothing). Empty key counts as absent. */
export function resolveBackend(): JevBackend {
  if (process.env.JEV_BACKEND === 'mock') return { name: 'mock', model: 'jev-mock' };
  const key = process.env.TYPESAFE_API_KEY;
  if (key) return {
    name: 'typesafe', key,
    baseUrl: process.env.AEGIS_JEV_URL || TYPESAFE_BASE,
    model: process.env.JEV_MODEL || JEV_DEFAULT_MODEL,
  };
  return { name: 'degraded', model: 'none' };
}

class BackendError extends Error {
  status?: number;
  constructor(message: string, status?: number) { super(message); this.status = status; }
}

/** Egress redaction (audit #22): judgment text POSTs to api.typesafe.ai,
 *  so credentials inside them must die before send. Applied on the typesafe
 *  path only (mock/degraded never leave the machine). Patterns mirror
 *  upstream jev-use redact.ts: URL passwords, auth/cookie headers,
 *  -u user:pass, KEY=/TOKEN=/SECRET= assignments, known key shapes.
 *  What the removal costs a verdict is unknowable locally - states carrying
 *  secrets should be rephrased, not just redacted; the shapes below are the
 *  backstop, not the plan. Identifiers that match are refused rather than
 *  rewritten, since changing choice keys would change answer semantics. */
export function redactState(state: string): string {
  return state
    .replace(/https?:\/\/[^/\s:@]+:[^/\s@]+@/g, 'https://[redacted]@')
    .replace(/(authorization:\s*(?:bearer|basic|token)\s+)\S+/gi, '$1[redacted]')
    .replace(/(^|\n)\s*cookie:[^\n]*/gi, '$1cookie: [redacted]')
    .replace(/(^|\s)(-u|--user)\s+\S+:\S+/g, '$1$2 [redacted]')
    .replace(/\b([A-Za-z_0-9]*(?:TOKEN|SECRET|PASSWORD|API_KEY)\s*=\s*)([^\s'";]+)/g, '$1[redacted]')
    .replace(/\b(sk-[A-Za-z0-9\-_]{8,}|gh[pousr]_[A-Za-z0-9_]+|xox[baprs]-[A-Za-z0-9-]+)\b/g, '[redacted]');
}

function toNativeQuestion(q: JevQuestion & { id: string }): Record<string, unknown> {
  if (q.type === 'noul')
    return { type: 'noul', instructions: redactState(q.question), ...(q.criteria ? {
      criteria: { true: redactState(q.criteria.true), false: redactState(q.criteria.false) },
    } : {}) };
  if (q.type === 'choice') {
    const entries = Array.isArray(q.options)
      ? q.options.map((l) => [l, l] as [string, string])
      : Object.entries(q.options ?? {});
    return { type: 'choice', instructions: redactState(q.question), criteria: Object.fromEntries(entries.map(([l, m]) => [l, redactState(m || l)])) };
  }
  return { type: 'score', instructions: redactState(q.question), criteria: (q.levels ?? []).map(redactState) };
}

interface RawAnswer { answer: number | string; confidence?: number; distribution?: Record<string, number>; legend?: Record<string, string> }

function num(v: unknown, id: string): number {
  if (typeof v !== 'number' || !Number.isFinite(v)) throw new BackendError(`answer "${id}" has no numeric value`);
  return v;
}

function str(v: unknown, id: string): string {
  if (typeof v !== 'string' || !v) throw new BackendError(`answer "${id}" has no choice value`);
  return v;
}

/** Strict answer parse (upstream native.ts): missing/mistyped = whole-call failure. */
function parseAnswers(body: any, questions: (JevQuestion & { id: string })[]): RawAnswer[] {
  const byId = body?.answers;
  if (!byId || typeof byId !== 'object') throw new BackendError('response has no answers object');
  return questions.map((q) => {
    const a = byId[q.id];
    if (!a || typeof a !== 'object') throw new BackendError(`response missing answer for question "${q.id}"`);
    const conf = typeof a.confidence === 'number' && Number.isFinite(a.confidence) ? a.confidence : undefined;
    const dist = a.probabilities && typeof a.probabilities === 'object' ? a.probabilities : undefined;
    if (q.type === 'noul') return { answer: num(a.noul, q.id), confidence: conf };
    if (q.type === 'choice') return { answer: str(a.choice, q.id), confidence: conf, distribution: dist };
    return { answer: num(a.score, q.id), confidence: conf, distribution: dist, legend: a.legend };
  });
}

async function postBackend(url: string, headers: Record<string, string>, body: unknown): Promise<unknown> {
  try {
    return await postJson(url, headers, body);
  } catch (e) {
    const err = e as { message?: string; status?: number };
    throw new BackendError(err?.message ?? 'unreachable', err?.status);
  }
}

/** FNV-1a (mirrors upstream mock.ts): stable across runs and platforms. */
function fnv1a(text: string): number {
  let v = 2166136261;
  for (let i = 0; i < text.length; i++) { v ^= text.charCodeAt(i); v = Math.imul(v, 16777619); }
  return v >>> 0;
}

const round3 = (n: number): number => Math.round(n * 1000) / 1000;

/** Deterministic mock answers (mirrors upstream mock.ts provenance: choice/
 *  score carry confidence -> reported; noul carries none -> estimated). */
function mockAnswer(state: string, q: JevQuestion & { id: string }, index: number): RawAnswer {
  const seed = fnv1a(`${state}|${q.question}|${index}`);
  if (q.type === 'noul') return { answer: round3(((seed % 1000) / 1000) * 0.98 + 0.01) };
  if (q.type === 'choice') {
    const labels = (Array.isArray(q.options) ? q.options : Object.keys(q.options ?? {})).filter(Boolean);
    const winner = labels[seed % labels.length] ?? 'none';
    const rest = labels.length > 1 ? 0.15 / (labels.length - 1) : 0;
    const distribution: Record<string, number> = {};
    labels.forEach((l, i) => { distribution[l] = round3(i === seed % labels.length ? 0.85 : rest); });
    return { answer: winner, distribution, confidence: 0.85 };
  }
  const levels = q.levels ?? [];
  const w = levels.length ? seed % levels.length : 0;
  const rest = levels.length > 1 ? 0.15 / (levels.length - 1) : 0;
  const distribution: Record<string, number> = {};
  levels.forEach((_, i) => { distribution[String(i)] = round3(i === w ? 0.85 : rest); });
  return {
    answer: w, distribution, confidence: 0.8,
    legend: Object.fromEntries(levels.map((l, i) => [String(i), l])),
  };
}

/** Estimated confidence from the answer's own distribution (upstream:
 *  top-minus-runner-up for choice/score, 2|p-0.5| for noul). No usable
 *  signal -> 0 with an unsure escalation (never a fabricated number). */
function estimate(q: JevQuestion & { id: string }, raw: RawAnswer): { confidence: number; nosignal: boolean } {
  if (typeof raw.confidence === 'number') return { confidence: raw.confidence, nosignal: false };
  if (q.type === 'noul') return { confidence: round3(2 * Math.abs((raw.answer as number) - 0.5)), nosignal: false };
  const vals = Object.values(raw.distribution ?? {}).filter((n) => typeof n === 'number').sort((a, b) => b - a);
  if (vals.length >= 2) return { confidence: round3(vals[0] - vals[1]), nosignal: false };
  return { confidence: 0, nosignal: true };
}

function withThreshold(raw: RawAnswer, q: JevQuestion & { id: string }, threshold?: number): JevVerdict {
  const reported = typeof raw.confidence === 'number';
  const { confidence, nosignal } = estimate(q, raw);
  const bar = threshold ?? (reported ? REPORTED_THRESHOLD : ESTIMATED_THRESHOLD);
  const low = confidence < bar;
  const verdict: JevVerdict = {
    id: q.id, type: q.type, answer: raw.answer, confidence,
    confidenceFrom: reported ? 'reported' : 'estimated',
    escalate: low || nosignal,
  };
  if (raw.distribution) verdict.distribution = raw.distribution;
  if (raw.legend) verdict.legend = raw.legend;
  if (nosignal) {
    verdict.reason = 'unsure';
    verdict.hint = 'No confidence signal arrived with this answer - treat it as a prior, not a decision.';
  } else if (low) {
    verdict.reason = 'unsure';
    verdict.hint = `Answered at ${reported ? 'reported' : 'estimated'} confidence ${confidence} < ${bar}. Treat the answer as a prior, not a decision - reason it out yourself.`;
  }
  return verdict;
}

function preCall(reason: 'oversized' | 'unreachable', hint: string, questions: (JevQuestion & { id: string })[]): JevVerdict[] {
  return questions.map((q) => ({
    id: q.id, type: q.type,
    answer: q.type === 'noul' ? 0.5 : q.type === 'score' ? 0 : '',
    confidence: 0, confidenceFrom: 'estimated' as const,
    escalate: true, reason, hint,
  }));
}

/** Batched judgment: one state, N questions, one request. Transport/shape
 *  failures degrade every verdict to unreachable (proceed as if Jev did
 *  not exist) - never a pass, never a silent low score. */
export async function judge(
  state: string, questions: JevQuestion[], opts: { threshold?: number } = {},
): Promise<JevResult> {
  const qs = questions.map((q, i) => ({ ...q, id: q.id || `q${i}` }));
  const backend = resolveBackend();
  if (state.length > MAX_STATE_CHARS) {
    const verdicts = preCall('oversized',
      `State is ${state.length} chars (> ~30k tokens) - shrink it to the evidence the questions need, or split into smaller judged states.`, qs);
    return { verdicts, escalated: true, backend: backend.name, model: backend.model ?? 'none', latencyMs: 0 };
  }
  if (backend.name === 'typesafe' && qs.some((q) => {
    const labels = q.type === 'choice'
      ? Array.isArray(q.options) ? q.options : Object.keys(q.options ?? {}) : [];
    return [q.id, ...labels].some((label) => redactState(label) !== label);
  })) {
    const verdicts = preCall('unreachable',
      'Secret-like question IDs or choice labels cannot be sent safely. Replace identifiers locally before retrying; no request was sent.', qs);
    return { verdicts, escalated: true, backend: backend.name, model: backend.model ?? 'none', latencyMs: 0 };
  }
  if (backend.name !== 'degraded') reserveJudgments(qs.length);
  const t0 = Date.now();
  if (backend.name === 'mock') {
    const verdicts = qs.map((q, i) => withThreshold(mockAnswer(state, q, i), q, opts.threshold));
    return { verdicts, escalated: verdicts.some((v) => v.escalate), backend: 'mock', model: 'jev-mock', latencyMs: Date.now() - t0 };
  }
  if (backend.name === 'degraded') {
    const verdicts = preCall('unreachable',
      'No judgment backend configured - proceed as if Jev did not exist: re-verify directly, or set TYPESAFE_API_KEY (JEV_BACKEND=mock for keyless dry runs).', qs);
    return { verdicts, escalated: true, backend: 'degraded', model: 'none', latencyMs: 0 };
  }
  try {
    const body = {
      model: backend.model ?? JEV_DEFAULT_MODEL, state: redactState(state),
      questions: Object.fromEntries(qs.map((q) => [q.id, toNativeQuestion(q)])),
    };
    const res = await postBackend(`${backend.baseUrl}/v1/systemone`,
      { authorization: `Bearer ${backend.key}` }, body) as any;
    const verdicts = parseAnswers(res, qs).map((raw, i) => withThreshold(raw, qs[i], opts.threshold));
    return {
      verdicts, escalated: verdicts.some((v) => v.escalate),
      backend: 'typesafe', model: res.model ?? backend.model ?? JEV_DEFAULT_MODEL, latencyMs: Date.now() - t0,
    };
  } catch (e) {
    const hint = e instanceof BackendError
      ? `${e.message} - proceed as if Jev did not exist: re-verify directly.`
      : 'unreachable - proceed as if Jev did not exist: re-verify directly.';
    const verdicts = preCall('unreachable', hint, qs);
    return { verdicts, escalated: true, backend: backend.name, model: backend.model ?? 'none', latencyMs: Date.now() - t0 };
  }
}
