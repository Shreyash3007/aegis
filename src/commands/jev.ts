import fs from 'node:fs';
import { die, ok } from '../lib/util.js';
import { judge, type JevQuestion, type JevResult } from '../lib/jev.js';

/** aegis jev <judge|triage|score|classify|cite> --file <json> [--threshold f]
 *
 *  The judgment ring as CLI authority (SPEC §7, CONSTRAINTS §4): batched
 *  Noul/Choice/Score over direct TypeSafe HTTPS. Agents never call blades
 *  directly - they build one of these file-shaped requests and read typed
 *  verdicts back. Jev never replaces fresh-context doubt or human L0 gates;
 *  every op exits 0 with verdicts (judgment is input, not a gate verdict).
 *  No key = degraded mode, announced verbatim on the first output line. */

const GATE_THRESHOLD = 0.7; // CONSTRAINTS §4: triage + citation gates

function readJson(file: string): any {
  if (!file) die(2, 'usage: aegis jev <judge|triage|score|classify|cite> --file <request.json> [--threshold f]');
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); }
  catch { die(4, `unparseable JSON: ${file}`); }
}

function checkState(v: unknown): string {
  if (typeof v !== 'string' || !v.trim()) die(4, 'request needs a non-empty string "state" (the facts Jev may consider - never secrets)');
  return v;
}

function checkQuestion(q: any, i: number): JevQuestion {
  if (!q || typeof q !== 'object') die(4, `questions[${i}]: must be an object`);
  if (!['noul', 'choice', 'score'].includes(q.type)) die(4, `questions[${i}]: type must be noul|choice|score`);
  if (typeof q.question !== 'string' || !q.question.trim()) die(4, `questions[${i}]: needs a non-empty "question"`);
  if (q.type === 'choice') {
    const n = Array.isArray(q.options) ? q.options.length : Object.keys(q.options ?? {}).length;
    if (n < 2) die(4, `questions[${i}]: choice needs >= 2 options`);
  }
  if (q.type === 'score' && (!Array.isArray(q.levels) || q.levels.length < 2))
    die(4, `questions[${i}]: score needs >= 2 levels`);
  return q as JevQuestion;
}

function header(r: JevResult): string[] {
  const L: string[] = [];
  if (r.backend === 'degraded')
    L.push('DEGRADED: no TYPESAFE_API_KEY - judgments unavailable (unreachable); set TYPESAFE_API_KEY, or JEV_BACKEND=mock for keyless dry runs');
  L.push(`backend: ${r.backend} | model: ${r.model} | latency: ${r.latencyMs}ms | escalated: ${r.escalated}`);
  return L;
}

function verdictLine(v: JevResult['verdicts'][number]): string {
  const base = `[${v.id}] ${v.type} answer=${JSON.stringify(v.answer)} conf=${v.confidence}(${v.confidenceFrom})`;
  return v.escalate ? `${base} ESCALATE(${v.reason}): ${v.hint}` : `${base} OK`;
}

async function cmdJudge(file: string, threshold?: number): Promise<void> {
  const req = readJson(file);
  const state = checkState(req.state);
  if (!Array.isArray(req.questions) || !req.questions.length) die(4, 'request needs a non-empty "questions" array');
  const questions = req.questions.map(checkQuestion);
  const r = await judge(state, questions, threshold !== undefined ? { threshold } : {});
  console.log([...header(r), ...r.verdicts.map(verdictLine)].join('\n'));
  ok(`judged ${r.verdicts.length} question(s), ${r.verdicts.filter((v) => v.escalate).length} escalated`);
}

async function cmdTriage(file: string, threshold: number): Promise<void> {
  const req = readJson(file);
  const state = checkState(req.state);
  if (!Array.isArray(req.findings) || !req.findings.length) die(4, 'triage needs a non-empty "findings" array [{id, text}]');
  for (const [i, f] of req.findings.entries()) {
    if (!f || typeof f.id !== 'string' || typeof f.text !== 'string' || !f.text.trim())
      die(4, `findings[${i}]: needs string "id" and non-empty string "text"`);
  }
  const questions: JevQuestion[] = req.findings.map((f: any) => ({
    id: f.id, type: 'noul', question: `Should this finding block the lane? ${f.text}`,
    criteria: { true: 'blocks the lane - fix before merging', false: 'safe to defer to the backlog' },
  }));
  const r = await judge(state, questions, { threshold });
  const L = header(r);
  let act = 0, drop = 0, reverify = 0;
  for (const v of r.verdicts) {
    let verdict: string;
    if (v.escalate) { verdict = 'REVERIFY'; reverify++; }
    else if ((v.answer as number) >= 0.5) { verdict = 'ACT'; act++; }
    else { verdict = 'DROP'; drop++; }
    L.push(`${verdict} ${v.id} (p=${v.answer} conf=${v.confidence}): ${verdict === 'REVERIFY' ? v.hint : verdict === 'ACT' ? 'fix before merging' : 'defer to backlog'}`);
  }
  L.push(`triage: ${act} act, ${drop} drop, ${reverify} reverify (threshold ${threshold})`);
  console.log(L.join('\n'));
  ok(`triaged ${r.verdicts.length} finding(s)`);
}

const ACTION_LEVELS = ['noise', 'actionable', 'critical'];

async function cmdScore(file: string, threshold?: number): Promise<void> {
  const req = readJson(file);
  const state = checkState(req.state);
  if (!Array.isArray(req.items) || !req.items.length) die(4, 'score needs a non-empty "items" array [{id, text}]');
  for (const [i, it] of req.items.entries()) {
    if (!it || typeof it.id !== 'string' || typeof it.text !== 'string' || !it.text.trim())
      die(4, `items[${i}]: needs string "id" and non-empty string "text"`);
  }
  const questions: JevQuestion[] = req.items.map((it: any) => ({
    id: it.id, type: 'score', question: `How actionable is this review item? ${it.text}`, levels: ACTION_LEVELS,
  }));
  const r = await judge(state, questions, threshold !== undefined ? { threshold } : {});
  const L = header(r);
  const levels = r.verdicts.map((v) => Math.max(0, Math.min(2, Math.round(v.answer as number))));
  r.verdicts.forEach((v, i) => L.push(`${v.escalate ? 'REVERIFY' : ACTION_LEVELS[levels[i]].toUpperCase()} ${v.id} (pos=${v.answer} conf=${v.confidence})`));
  const theater = levels.every((l) => l === 0);
  L.push(theater
    ? `cycle: THEATER (all ${levels.length} item(s) noise - doubt theater, escalate to a human)`
    : `cycle: ACTIONABLE (${levels.filter((l) => l > 0).length}/${levels.length} item(s) above noise)`);
  console.log(L.join('\n'));
  ok(`scored ${r.verdicts.length} item(s)`);
}

const L0_PATTERNS = /prod|auth|payment|credential|secret|token|password|key|ship|deploy|release|publish|migration|external-send|legal|pii|rm -rf|drop table|delete from/i;
const L2_PATTERNS = /^(fix|chore|docs?|typo|rename|format|comment|lint)[\s:]/i;

function patternClassify(action: string): { level: string; why: string } {
  if (L0_PATTERNS.test(action)) return { level: 'L0', why: 'matches a human-only pattern (CONSTRAINTS §1)' };
  if (L2_PATTERNS.test(action)) return { level: 'L2', why: 'fix/chore-class change (fast lane)' };
  return { level: 'L1', why: 'default-deny: unclassifiable work floors at supervised' };
}

async function cmdClassify(file: string, threshold?: number): Promise<void> {
  const req = readJson(file);
  if (typeof req.action !== 'string' || !req.action.trim()) die(4, 'classify needs a non-empty string "action"');
  const state = checkState(req.state ?? `Proposed agent action: ${req.action}`);
  const pattern = patternClassify(req.action);
  const r = await judge(state, [{
    id: 'autonomy', type: 'choice', question: `Which autonomy level fits this action? ${req.action}`,
    options: {
      L0: 'human-only: prod, auth, payments, credentials, ship, migrations, external sends',
      L1: 'supervised: crosses a module boundary, unverifiable, or irreversible - human approves the gate',
      L2: 'autonomous: mechanical, reversible, in-budget fix/chore-class work',
    },
  }], threshold !== undefined ? { threshold } : {});
  const v = r.verdicts[0];
  const L = header(r);
  L.push(`pattern: ${pattern.level} (authority - ${pattern.why})`);
  if (v.escalate) L.push(`jev: unavailable for this call (${v.reason}) - pattern stands alone`);
  else L.push(`jev: ${v.answer} (conf=${v.confidence}) ${v.answer === pattern.level ? 'AGREE' : 'DISAGREE - pattern rules; Jev is second opinion only'}`);
  console.log(L.join('\n'));
  ok(`classified "${req.action.slice(0, 60)}"`);
}

async function cmdCite(file: string, threshold: number): Promise<void> {
  const req = readJson(file);
  const evidence = checkState(req.evidence);
  if (!Array.isArray(req.claims) || !req.claims.length) die(4, 'cite needs a non-empty "claims" array [{id, text}]');
  for (const [i, c] of req.claims.entries()) {
    if (!c || typeof c.id !== 'string' || typeof c.text !== 'string' || !c.text.trim())
      die(4, `claims[${i}]: needs string "id" and non-empty string "text"`);
  }
  const questions: JevQuestion[] = req.claims.map((c: any) => ({
    id: c.id, type: 'noul', question: `Is this claim supported by the evidence in state? Claim: ${c.text}`,
    criteria: { true: 'evidence directly supports the claim', false: 'evidence is missing, partial, or contradicts it' },
  }));
  // The evidence lives in state once, not repeated per question.
  const r = await judge(`Evidence under review:\n${evidence}`, questions, { threshold });
  const L = header(r);
  let sup = 0, ref = 0, rev = 0;
  for (const v of r.verdicts) {
    let verdict: string;
    if (v.escalate) { verdict = 'REVERIFY'; rev++; }
    else if ((v.answer as number) >= 0.5) { verdict = 'SUPPORTED'; sup++; }
    else { verdict = 'REFUTED'; ref++; }
    L.push(`${verdict} ${v.id} (p=${v.answer} conf=${v.confidence})`);
  }
  L.push(`cite: ${sup} supported, ${ref} refuted, ${rev} reverify (threshold ${threshold})`);
  console.log(L.join('\n'));
  ok(`checked ${r.verdicts.length} claim(s) against evidence`);
}

export async function jev(args: string[]): Promise<void> {
  const op = args[0];
  const fi = args.indexOf('--file');
  const file = fi >= 0 ? args[fi + 1] : undefined;
  const ti = args.indexOf('--threshold');
  const threshold = ti >= 0 ? Number(args[ti + 1]) : undefined;
  if (threshold !== undefined && (!Number.isFinite(threshold) || threshold < 0 || threshold > 1))
    die(4, '--threshold must be 0..1');
  if (op === 'judge') return cmdJudge(file as string, threshold);
  if (op === 'triage') return cmdTriage(file as string, threshold ?? GATE_THRESHOLD);
  if (op === 'score') return cmdScore(file as string, threshold);
  if (op === 'classify') return cmdClassify(file as string, threshold);
  if (op === 'cite') return cmdCite(file as string, threshold ?? GATE_THRESHOLD);
  die(2, 'usage: aegis jev <judge|triage|score|classify|cite> --file <request.json> [--threshold 0..1]');
}
