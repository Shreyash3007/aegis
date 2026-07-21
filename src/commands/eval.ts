import fs from 'node:fs';
import path from 'node:path';
import { AEGIS_DIR, die, ok } from '../lib/util.js';

/** aegis eval <file|--all> - prompt eval harness (O3).
 *  Deterministic checks always run. Model judge honestly SKIPPED without key. */

const REQUIRED_SECTIONS = [
  '## Expert Persona', '## Purpose', '## Trigger', '## Entry Criteria',
  '## Environment Requirements', '## Input Schema', '## Execution Steps',
  '## Self-Critique Protocol', '## Error Escalation Protocol', '## Output Schema',
  '## Measurement Citations', '## CLI Contract', '## Brain Files',
  '## Next Skill', '## Human Touchpoints',
];
const MASTER_SECTIONS = ['## Purpose', '## Sub-Skills', '## Routing'];
const VAGUE = ['TBD', 'to be determined', "we'll see", 'somehow'];
const KNOWN_COMMANDS = ['init','doctor','status','next','gate','transition','contracts',
  'lane','checkpoint','resume','ast','sync','gc','config','merge','slice','validate',
  'monitor','eval','migrate','start','ship','skills'];

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
  const unknown = [...new Set(cmdRefs.filter((c) => !KNOWN_COMMANDS.includes(c)))];
  checks.push({ name: 'cli-refs-exist', pass: unknown.length === 0, detail: unknown.join(', ') || undefined });
  return { file, checks, pass: checks.every((c) => c.pass) };
}

export function evalCmd(args: string[]): void {
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

  const judgeKey = process.env.ANTHROPIC_API_KEY || process.env.OPENAI_API_KEY;
  const results = files.map(evalFile);
  const failed = results.filter((r) => !r.pass);
  for (const r of failed) {
    console.log(`FAIL ${path.basename(r.file)}:`);
    for (const c of r.checks.filter((c) => !c.pass)) console.log(`  - ${c.name}: ${c.detail}`);
  }
  const judge = judgeKey ? 'available (deterministic-only in v1)' : 'SKIPPED (no API key - honest)';
  console.log(`eval: ${results.length - failed.length}/${results.length} passed | model judge: ${judge}`);
  if (failed.length) die(11, `${failed.length} skill file(s) failed eval`);
  ok(`all ${results.length} skill files pass deterministic eval`);
}
