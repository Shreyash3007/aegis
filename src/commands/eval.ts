import fs from 'node:fs';
import path from 'node:path';
import { AEGIS_DIR, die, ok } from '../lib/util.js';

/** aegis eval <file|--all> - prompt eval harness (O3).
 *  Deterministic checks always run. The model judge is opt-in: it activates
 *  only when AEGIS_JUDGE_API_KEY is set (any OpenAI-compatible endpoint via
 *  AEGIS_JUDGE_URL / AEGIS_JUDGE_MODEL). Judge failures are failure-strict
 *  (exit 11); judge errors degrade honestly and never affect the exit code.
 *  Without the key the behavior is byte-identical to lint-only mode. */

const REQUIRED_SECTIONS = [
  '## Expert Persona', '## Purpose', '## Trigger', '## Entry Criteria',
  '## Environment Requirements', '## Input Schema', '## Execution Steps',
  '## Self-Critique Protocol', '## Error Escalation Protocol', '## Output Schema',
  '## Measurement Citations', '## CLI Contract', '## Brain Files',
  '## Next Skill', '## Human Touchpoints',
];
const MASTER_SECTIONS = ['## Purpose', '## Sub-Skills', '## Routing'];
const VAGUE = ['TBD', 'to be determined', "we'll see", 'somehow'];
// The valid command set is INJECTED by the dispatcher (lib/commands.ts calls
// setKnownCommands once at module load). No import of commands.ts here -
// that import created the commands.ts <-> eval.ts cycle flagged by our own
// `aegis ast build` DAG rule (02a).
let KNOWN: string[] = ['help'];
export function setKnownCommands(cmds: string[]): void { KNOWN = [...cmds, 'help']; }

interface CheckResult { file: string; checks: { name: string; pass: boolean; detail?: string }[]; pass: boolean }

const TEMPLATE_SECTIONS = ['## Expertise', '## Responsibilities', '## Self-Critique Checklist'];
const SPEC_SECTIONS = ['## Domain', '## Additional Constraints'];
const PROTOCOL_SECTIONS = ['## Purpose', '## Protocol'];

function docType(file: string): string {
  if (path.basename(file) === 'skill.md') return 'master';
  if (file.includes('base-roles')) return 'template';
  if (file.includes('specializations')) return 'spec';
  if (file.includes('interview-protocol')) return 'protocol';
  return 'subskill';
}

function evalFile(file: string): CheckResult {
  const content = fs.readFileSync(file, 'utf8');
  const type = docType(file);
  const checks: CheckResult['checks'] = [];
  const sections = type === 'master' ? MASTER_SECTIONS
    : type === 'template' ? TEMPLATE_SECTIONS
    : type === 'spec' ? SPEC_SECTIONS
    : type === 'protocol' ? PROTOCOL_SECTIONS
    : REQUIRED_SECTIONS;
  const missing = sections.filter((s) => !content.includes(s));
  checks.push({ name: 'required-sections', pass: missing.length === 0, detail: missing.join(', ') || undefined });
  // vague markers: strip quoted/backticked spans first (01a lists them AS detection targets)
  const unquoted = content.replace(/`[^`]*`|"[^"]*"|'[^']*'/g, '');
  const vagueHits = type === 'subskill' ? VAGUE.filter((v) => unquoted.toLowerCase().includes(v.toLowerCase())) : [];
  checks.push({ name: 'no-vague-markers', pass: vagueHits.length === 0, detail: vagueHits.join(', ') || undefined });
  const cmdRefs = [...content.matchAll(/(?<![\w.])aegis ([a-z-]+)/g)].map((m) => m[1]);
  const unknown = [...new Set(cmdRefs.filter((c) => !KNOWN.includes(c)))];
  checks.push({ name: 'cli-refs-exist', pass: unknown.length === 0, detail: unknown.join(', ') || undefined });
  return { file, checks, pass: checks.every((c) => c.pass) };
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
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: JUDGE_SYSTEM },
          { role: 'user', content },
        ],
        temperature: 0,
        max_tokens: 200,
      }),
      signal: AbortSignal.timeout(JUDGE_TIMEOUT_MS),
    });
    if (!res.ok) return { status: 'error', reason: `http ${res.status}` };
    const body = (await res.json()) as { choices?: { message?: { content?: unknown } }[] };
    const text = body.choices?.[0]?.message?.content;
    if (typeof text !== 'string') return { status: 'error', reason: 'empty judge response' };
    return parseVerdict(text) ?? { status: 'error', reason: 'unparseable judge verdict' };
  } catch (e) {
    const name = e instanceof Error ? e.name : '';
    return { status: 'error', reason: name === 'TimeoutError' || name === 'AbortError' ? 'timeout (30s)' : 'request failed' };
  }
}

export async function evalCmd(args: string[]): Promise<void> {
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
