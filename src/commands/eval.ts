import fs from 'node:fs';
import path from 'node:path';
import { AEGIS_DIR, die, ok } from '../lib/util.js';
import { lintSkillFile, parseFrontmatter, splitList } from '../lib/skill-lint.js';
import { judge, resolveBackend } from '../lib/jev.js';
import { postJson } from '../lib/http.js';

/** aegis eval <file|--all> - prompt eval harness (O3).
 *  Deterministic checks always run. The model judge is opt-in: it activates
 *  only when AEGIS_JUDGE_API_KEY is set (any OpenAI-compatible endpoint via
 *  AEGIS_JUDGE_URL / AEGIS_JUDGE_MODEL). Judge failures are failure-strict
 *  (exit 11); judge errors degrade honestly and never affect the exit code.
 *  Without the key the behavior is byte-identical to lint-only mode.
 *
 *  Margin Format itself is enforced through the shared checker
 *  (lib/skill-lint.js), single source of truth with `lint-skills` - no
 *  per-doctype section lists live here anymore (retired in v0.6.0).
 *  The valid command set is INJECTED by the dispatcher (lib/commands.ts calls
 *  setKnownCommands once at module load). No import of commands.ts here -
 *  that import created the commands.ts <-> eval.ts cycle flagged by our own
 *  `aegis ast build` DAG rule (02a). */
let KNOWN: string[] = ['help'];
export function setKnownCommands(cmds: string[]): void { KNOWN = [...cmds, 'help']; }

interface CheckResult { file: string; checks: { name: string; pass: boolean; detail?: string }[]; pass: boolean }

function evalFile(file: string): CheckResult {
  // Deterministic half delegates to the shared Margin Format checker:
  // one rule set for `eval` and `lint-skills`, no drift between gates.
  const r = lintSkillFile(file, KNOWN);
  return { file, checks: r.checks.map((c) => ({ name: c.name, pass: c.pass, detail: c.detail })), pass: r.pass };
}

// ---- opt-in model judge ---------------------------------------------------

const JUDGE_URL = 'https://api.openai.com/v1/chat/completions';
const JUDGE_MODEL = 'gpt-4o-mini';
const JUDGE_TIMEOUT_MS = 30_000;
const JUDGE_MAX_CHARS = 12_000;

const JUDGE_SYSTEM = [
  'You are a strict judge of an AI-agent skill file (markdown). Judge whether it has:',
  '1. measurable or executable success criteria rather than aspirations,',
  '2. concrete steps an agent can execute verbatim,',
  '3. explicit error-escalation paths,',
  '4. no fabricated CLI command references.',
  'Respond with ONLY a JSON object: {"pass": true|false, "reason": "<=20 words"}.',
].join('\n');

interface JudgeVerdict { status: 'pass' | 'fail' | 'error'; reason?: string }

/** Extract a verdict from the judge's reply, tolerating markdown fences and
 *  any prose wrapped around the JSON object. */
function parseVerdict(text: string): JudgeVerdict | undefined {
  const m = text.match(/\{[^{}]*\}/s);
  if (!m) return undefined;
  try {
    const v = JSON.parse(m[0]) as { pass?: unknown; reason?: unknown };
    if (typeof v.pass !== 'boolean') return undefined;
    return { status: v.pass ? 'pass' : 'fail', reason: typeof v.reason === 'string' ? v.reason : undefined };
  } catch {
    return undefined;
  }
}

/** One chat-completion request per file. Any transport/HTTP/parse problem is
 *  an honest JUDGE-ERROR, never a pass or fail. */
async function judgeFile(file: string, key: string, url: string, model: string): Promise<JudgeVerdict> {
  try {
    const content = fs.readFileSync(file, 'utf8').slice(0, JUDGE_MAX_CHARS);
    // Single attempt (no retries): preserves the documented judge semantics;
    // the shared transport still guarantees clean socket teardown.
    const body = await postJson(url,
      { authorization: `Bearer ${key}` },
      { model, messages: [{ role: 'system', content: JUDGE_SYSTEM }, { role: 'user', content }], temperature: 0, max_tokens: 200 },
      { timeoutMs: JUDGE_TIMEOUT_MS, maxRetries: 0 }) as { choices?: { message?: { content?: unknown } }[] };
    const text = body.choices?.[0]?.message?.content;
    if (typeof text !== 'string') return { status: 'error', reason: 'empty judge response' };
    return parseVerdict(text) ?? { status: 'error', reason: 'unparseable judge verdict' };
  } catch (e) {
    const err = e as { message?: string; status?: number };
    if (err?.status !== undefined) return { status: 'error', reason: `http ${err.status}` };
    return { status: 'error', reason: (err?.message ?? '').includes('timed out') ? 'timeout (30s)' : 'request failed' };
  }
}

export async function evalCmd(args: string[]): Promise<void> {
  if (args[0] === 'trigger') return evalTrigger(args.slice(1));
  const skillsDir = path.join(AEGIS_DIR, 'skills');
  let files: string[] = [];
  if (args[0] === '--all') {
    const walk = (d: string): void => {
      if (!fs.existsSync(d)) return;
      for (const f of fs.readdirSync(d)) {
        const p = path.join(d, f);
        if (fs.statSync(p).isDirectory()) walk(p);
        else if (f.endsWith('.md')) files.push(p);
      }
    };
    walk(skillsDir);
    if (!files.length) die(2, 'no skills found - run aegis init first');
  } else if (args[0] && fs.existsSync(args[0])) {
    files = [args[0]];
  } else die(2, 'usage: aegis eval <file.md|--all>');

  const judgeKey = process.env.AEGIS_JUDGE_API_KEY;
  const results = files.map(evalFile);
  const failed = results.filter((r) => !r.pass);
  for (const r of failed) {
    console.log(`FAIL ${path.basename(r.file)}:`);
    for (const c of r.checks.filter((c) => !c.pass)) console.log(`  - ${c.name}: ${c.detail}`);
  }
  let judge = 'SKIPPED (no API key - honest)';
  let judgeFailed = 0;
  if (judgeKey) {
    const url = process.env.AEGIS_JUDGE_URL || JUDGE_URL;
    const model = process.env.AEGIS_JUDGE_MODEL || JUDGE_MODEL;
    let judgePassed = 0, judgeErrors = 0;
    for (const r of results) { // sequential on purpose: lint runs, not hot paths
      const v = await judgeFile(r.file, judgeKey, url, model);
      if (v.status === 'pass') judgePassed++;
      else if (v.status === 'fail') {
        judgeFailed++;
        console.log(`JUDGE-FAIL ${path.basename(r.file)}: ${v.reason ?? 'no reason given'}`);
      } else {
        judgeErrors++;
        console.log(`JUDGE-ERROR ${path.basename(r.file)}: ${v.reason ?? 'unknown'}`);
      }
    }
    judge = `${judgePassed}/${results.length} passed, ${judgeFailed} failed, ${judgeErrors} judge-error`;
  }
  console.log(`eval: ${results.length - failed.length}/${results.length} passed | model judge: ${judge}`);
  if (failed.length || judgeFailed)
    die(11, `${failed.length} lint + ${judgeFailed} judge failure(s)`);
  ok(`all ${results.length} skill files pass deterministic eval`);
}

// ---- trigger precision (SPEC §9, small-model half) --------------------------
// Contract compliance = `lint-skills` (Margin Format, Wave 1). This half asks
// the judgment ring to route prompts to their owning skill and scores
// precision = hits / cases (escalations count against precision - the ring
// must route confidently). Below threshold = exit 11 + the rewrite list.
// No backend (no key, no mock flag) = exit 2: precision is unmeasurable
// without a judge, and a gate that cannot measure must say so.

const TRIGGER_THRESHOLD = 0.8;

interface ScopeEntry { name: string; triggers: string[] }
interface TriggerCase { id: string; prompt: string; expect: string }

/** Candidate scope: every installed skill with triggers (reference material
 *  has no frontmatter and never fires). Label = frontmatter name. */
function triggerScope(): ScopeEntry[] {
  const skillsDir = path.join(AEGIS_DIR, 'skills');
  const out: ScopeEntry[] = [];
  const walk = (d: string): void => {
    if (!fs.existsSync(d)) return;
    for (const f of fs.readdirSync(d)) {
      const p = path.join(d, f);
      if (fs.statSync(p).isDirectory()) { walk(p); continue; }
      if (!f.endsWith('.md')) continue;
      const fm = parseFrontmatter(fs.readFileSync(p, 'utf8'));
      if (!fm || !fm.name || !fm.triggers) continue;
      const triggers = splitList(fm.triggers);
      if (triggers.length) out.push({ name: fm.name.trim(), triggers });
    }
  };
  walk(skillsDir);
  return out.sort((a, b) => a.name.localeCompare(b.name));
}

/** Built-in self-test: every skill's own first trigger must route back to
 *  it. No fixture to maintain; drift shows up as precision loss. */
function builtinCases(scope: ScopeEntry[]): TriggerCase[] {
  return scope.map((s) => ({ id: s.name, prompt: s.triggers[0], expect: s.name }));
}

function readCases(file: string, scope: ScopeEntry[]): TriggerCase[] {
  let raw: any;
  try { raw = JSON.parse(fs.readFileSync(file, 'utf8')); }
  catch { die(4, `unparseable cases JSON: ${file}`); }
  if (!Array.isArray(raw) || !raw.length) die(4, 'cases file must be a non-empty array [{id, prompt, expect}]');
  const names = new Set(scope.map((s) => s.name));
  const seen = new Set<string>();
  return raw.map((c: any, i: number) => {
    if (!c || typeof c.id !== 'string' || typeof c.prompt !== 'string' || !c.prompt.trim() || typeof c.expect !== 'string')
      die(4, `cases[${i}]: needs string "id", non-empty "prompt", string "expect"`);
    if (seen.has(c.id)) die(4, `cases[${i}]: duplicate id "${c.id}"`);
    seen.add(c.id);
    if (!names.has(c.expect)) die(4, `cases[${i}]: unknown skill "${c.expect}" (not in installed scope)`);
    return { id: c.id, prompt: c.prompt, expect: c.expect } as TriggerCase;
  });
}

async function evalTrigger(args: string[]): Promise<void> {
  const fi = args.indexOf('--file');
  const file = fi >= 0 ? args[fi + 1] : undefined;
  const ti = args.indexOf('--threshold');
  const threshold = ti >= 0 ? Number(args[ti + 1]) : TRIGGER_THRESHOLD;
  if (!Number.isFinite(threshold) || threshold < 0 || threshold > 1)
    die(4, '--threshold must be 0..1');
  const backend = resolveBackend();
  if (backend.name === 'degraded')
    die(2, 'trigger eval needs a judgment backend (precision is unmeasurable without a judge): set TYPESAFE_API_KEY or JEV_BACKEND=mock');
  const scope = triggerScope();
  if (!scope.length) die(2, 'no trigger-bearing skills found - run aegis init first');
  const cases = file ? readCases(file, scope) : builtinCases(scope);
  const options: Record<string, string> = Object.fromEntries(
    scope.map((s) => [s.name, s.triggers.join('; ')]));
  console.log(`trigger eval: ${cases.length} case(s), ${scope.length} skills in scope, backend ${backend.name}, threshold ${threshold}`);
  let hits = 0;
  const misses: string[] = [];
  for (const c of cases) { // sequential on purpose: eval runs, not hot paths
    const r = await judge(`Route this prompt to the owning skill: "${c.prompt}"`,
      [{ id: c.id, type: 'choice', question: 'Which skill owns this prompt?', options }]);
    const v = r.verdicts[0];
    if (!v.escalate && v.answer === c.expect) { hits++; console.log(`HIT ${c.id} -> ${v.answer} (conf=${v.confidence})`); }
    else {
      const why = v.escalate ? `REVERIFY(${v.reason})` : `MISS(got ${v.answer})`;
      misses.push(`${why} ${c.id}: expected ${c.expect}`);
      console.log(`${why} ${c.id}: expected ${c.expect}, got ${JSON.stringify(v.answer)} (conf=${v.confidence})`);
    }
  }
  const precision = hits / cases.length;
  console.log(`trigger-precision: ${hits}/${cases.length} = ${precision.toFixed(2)} (threshold ${threshold})`);
  if (precision < threshold) {
    for (const m of misses) console.log(`rewrite: ${m}`);
    die(11, `trigger precision ${precision.toFixed(2)} < ${threshold} - rewrite the missed skills' triggers`);
  }
  ok(`trigger precision ${precision.toFixed(2)} >= ${threshold}`);
}
