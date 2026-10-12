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
const TIMEOUT_MS = 10_000;
const MAX_RETRIES = 2;

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

function toNativeQuestion(q: JevQuestion & { id: string }): Record<string, unknown> {
  if (q.type === 'noul')
    return { type: 'noul', instructions: q.question, ...(q.criteria ? { criteria: q.criteria } : {}) };
  if (q.type === 'choice') {
    const entries = Array.isArray(q.options)
      ? q.options.map((l) => [l, l] as [string, string])
      : Object.entries(q.options ?? {});
    return { type: 'choice', instructions: q.question, criteria: Object.fromEntries(entries.map(([l, m]) => [l, m || l])) };
  }
  return { type: 'score', instructions: q.question, criteria: q.levels ?? [] };
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

async function postJson(url: string, headers: Record<string, string>, body: unknown): Promise<unknown> {
  let last: BackendError = new BackendError('unreachable');
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    if (attempt > 0) await new Promise((r) => setTimeout(r, 500 * attempt));
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), TIMEOUT_MS);
    try {
      const res = await fetch(url, {
        method: 'POST', headers: { 'content-type': 'application/json', accept: 'application/json', ...headers },
        body: JSON.stringify(body), signal: ctl.signal,
      });
      if (res.ok) return await res.json() as unknown;
      const retryable = res.status === 408 || res.status === 429 || res.status >= 500;
      last = new BackendError(`HTTP ${res.status}`, res.status);
      if (!retryable || attempt === MAX_RETRIES) throw last;
    } catch (e) {
      if (e instanceof BackendError) {
        const retryable = e.status === undefined || e.status === 408 || e.status === 429 || e.status >= 500;
        if (attempt === MAX_RETRIES || !retryable) throw e;
        last = e; continue;
      }
      last = new BackendError((e as Error)?.name === 'AbortError' ? `request timed out after ${TIMEOUT_MS}ms` : 'unreachable');
      if (attempt === MAX_RETRIES) throw last;
    } finally { clearTimeout(timer); }
  }
  throw last;
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
      model: backend.model ?? JEV_DEFAULT_MODEL, state,
      questions: Object.fromEntries(qs.map((q) => [q.id, toNativeQuestion(q)])),
    };
    const res = await postJson(`${backend.baseUrl}/v1/systemone`,
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
