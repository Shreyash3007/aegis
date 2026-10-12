import fs from 'node:fs';
import path from 'node:path';

/** Shared Margin Format checker (CONSTRAINTS.md §2). Used by `lint-skills`
 *  and the deterministic half of `eval`. No imports from commands/ — the
 *  caller injects the known CLI command set to avoid a module cycle. */

export const FRONTMATTER_KEYS = [
  'name', 'version', 'triggers', 'not-triggers', 'inputs', 'outputs',
  'chains-to', 'autonomy', 'tokens-budget',
];
export const MASTER_BUDGET = 80;
export const SUBSKILL_BUDGET = 120;
export const REFERENCE_BUDGET = 200;
export const BODY_ORDER = [
  '## Overview', '## When', '## When-NOT', '## Process',
  '## Verification', '## Red Flags', '## Interactions',
];
const VAGUE = ['TBD', 'to be determined', "we'll see", 'somehow'];

export interface LintCheck { name: string; pass: boolean; detail?: string }
export interface LintResult { file: string; checks: LintCheck[]; pass: boolean }

export function isMaster(file: string): boolean {
  return path.basename(file) === 'skill.md';
}

export function isReference(file: string): boolean {
  const segs = file.split(path.sep);
  return segs.includes('references') || segs.includes('team-templates');
}

/** Parse a leading --- frontmatter block into key->raw value. Lists may be
 *  `[a, b]` inline or `- item` continuation lines. Returns null when absent. */
export function parseFrontmatter(content: string): Record<string, string> | null {
  if (!content.startsWith('---\n') && !content.startsWith('---\r\n')) return null;
  const end = content.indexOf('\n---', 3);
  if (end === -1) return null;
  const block = content.slice(4, end);
  const out: Record<string, string> = {};
  const order: string[] = [];
  let current = '';
  for (const raw of block.split('\n')) {
    const line = raw.trimEnd();
    const m = /^([a-z-]+):\s*(.*)$/.exec(line);
    if (m && !line.startsWith(' ') && !line.startsWith('\t')) {
      current = m[1];
      out[current] = m[2].trim();
      order.push(current);
    } else if (current && /^\s*-\s+/.test(line)) {
      out[current] += '\n' + line.trim();
    } else if (current && line.trim() !== '') {
      out[current] += ' ' + line.trim();
    }
  }
  (out as Record<string, string> & { __order?: string[] }).__order = order;
  return out;
}

export function frontmatterOrder(fm: Record<string, string>): string[] {
  return (fm as Record<string, string> & { __order?: string[] }).__order ?? [];
}

export function splitList(v: string): string[] {
  const t = (v ?? '').trim().replace(/^\[(.*)\]$/, '$1');
  return t.split(/[,;\n]/).map((s) => s.replace(/^-\s*/, '').trim()).filter(Boolean);
}

function sectionBody(content: string, heading: string): string {
  const lines = content.split('\n');
  const start = lines.findIndex((l) => l.trim() === heading);
  if (start === -1) return '';
  const rest = lines.slice(start + 1);
  const end = rest.findIndex((l) => l.startsWith('## '));
  return (end === -1 ? rest : rest.slice(0, end)).join('\n');
}

export function lintSkillFile(
  file: string,
  knownCommands: string[],
  claimedTriggers?: Map<string, string>,
): LintResult {
  const content = fs.readFileSync(file, 'utf8');
  const checks: LintCheck[] = [];
  const master = isMaster(file);
  const ref = isReference(file);

  // 1. frontmatter presence + fixed order + value validity (skills only;
  // reference material carries no frontmatter: budget + links only)
  const fm = ref ? null : parseFrontmatter(content);
  if (!ref && !fm) {
    checks.push({ name: 'frontmatter', pass: false, detail: 'missing leading --- block' });
  } else if (!ref && fm) {
    const order = frontmatterOrder(fm);
    const missing = FRONTMATTER_KEYS.filter((k) => !(k in fm));
    const extra = order.filter((k) => !FRONTMATTER_KEYS.includes(k));
    const orderOk = order.length === FRONTMATTER_KEYS.length &&
      FRONTMATTER_KEYS.every((k, i) => order[i] === k);
    const empty = FRONTMATTER_KEYS.filter((k) => !(fm[k] ?? '').trim());
    const details = [
      ...(missing.length ? [`missing: ${missing.join(', ')}`] : []),
      ...(extra.length ? [`extra: ${extra.join(', ')}`] : []),
      ...(!missing.length && !extra.length && !orderOk ? [`order must be: ${FRONTMATTER_KEYS.join(', ')}`] : []),
      ...(empty.length ? [`empty: ${empty.join(', ')}`] : []),
    ];
    checks.push({ name: 'frontmatter', pass: details.length === 0, detail: details.join('; ') || undefined });
    const autonomy = (fm.autonomy ?? '').trim();
    checks.push({
      name: 'autonomy-level', pass: ['L0', 'L1', 'L2'].includes(autonomy),
      detail: ['L0', 'L1', 'L2'].includes(autonomy) ? undefined : `must be L0|L1|L2, got '${autonomy}'`,
    });
    const budget = Number((fm['tokens-budget'] ?? '').trim());
    checks.push({
      name: 'tokens-budget', pass: Number.isInteger(budget) && budget > 0,
      detail: Number.isInteger(budget) && budget > 0 ? undefined : 'must be a positive integer',
    });
  }

  // 2. line budgets
  const lines = content.split('\n').length;
  const cap = master ? MASTER_BUDGET : ref ? REFERENCE_BUDGET : SUBSKILL_BUDGET;
  checks.push({
    name: 'line-budget', pass: lines <= cap,
    detail: lines <= cap ? undefined : `${lines} lines > ${cap}`,
  });

  // 3. body order (sub-skills only; masters keep the index shape)
  if (!master && !ref) {
    const idx = BODY_ORDER.map((h) => {
      const i = content.split('\n').findIndex((l) => l.trim() === h);
      return i;
    });
    const missingSections = BODY_ORDER.filter((_, i) => idx[i] === -1);
    const ordered = idx.every((v, i) => i === 0 || idx[i - 1] === -1 || v === -1 || v > idx[i - 1]);
    const details = [
      ...(missingSections.length ? [`missing: ${missingSections.join(', ')}`] : []),
      ...(!missingSections.length && !ordered ? ['sections out of order'] : []),
    ];
    checks.push({ name: 'body-order', pass: details.length === 0, detail: details.join('; ') || undefined });
    const overview = sectionBody(content, '## Overview').split('\n').filter((l) => l.trim());
    checks.push({
      name: 'overview-brevity', pass: overview.length <= 5 && overview.length > 0,
      detail: overview.length <= 5 && overview.length > 0 ? undefined : `Overview has ${overview.length} non-empty lines (max 5)`,
    });
    const process = sectionBody(content, '## Process');
    const ticks = (process.match(/`[^`]+`/g) ?? []).length;
    checks.push({
      name: 'process-verification', pass: ticks > 0,
      detail: ticks > 0 ? undefined : 'Process steps carry no `verification command`',
    });
  }

  // 4. CLI refs exist (master + sub-skill; references exempt)
  if (!ref) {
    const cmdRefs = [...content.matchAll(/(?<![\w.])aegis ([a-z-]+)/g)].map((m) => m[1]);
    const unknown = [...new Set(cmdRefs.filter((c) => !knownCommands.includes(c)))];
    checks.push({ name: 'cli-refs-exist', pass: unknown.length === 0, detail: unknown.join(', ') || undefined });
  }

  // 5. no vague markers (sub-skills only)
  if (!master && !ref) {
    const unquoted = content.replace(/`[^`]*`|"[^"]*"|'[^']*'/g, '');
    const hits = VAGUE.filter((v) => unquoted.toLowerCase().includes(v.toLowerCase()));
    checks.push({ name: 'no-vague-markers', pass: hits.length === 0, detail: hits.join(', ') || undefined });
  }

  // 6. relative md links resolve
  const dir = path.dirname(file);
  const badLinks: string[] = [];
  for (const m of content.matchAll(/\]\(([^)#\s][^)\s]*\.md)\)/g)) {
    if (!fs.existsSync(path.resolve(dir, m[1]))) badLinks.push(m[1]);
  }
  checks.push({ name: 'links-resolve', pass: badLinks.length === 0, detail: badLinks.join(', ') || undefined });

  // 7. trigger collisions (corpus mode only; reference material has no triggers)
  if (!ref && claimedTriggers && fm) {
    const mine = splitList(fm.triggers ?? '').map((s) => s.toLowerCase());
    const clashes = mine.filter((t) => claimedTriggers.has(t) && claimedTriggers.get(t) !== file);
    checks.push({
      name: 'trigger-collision', pass: clashes.length === 0,
      detail: clashes.length ? clashes.map((t) => `"${t}" also claimed by ${claimedTriggers.get(t)}`).join('; ') : undefined,
    });
  }

  return { file, checks, pass: checks.every((c) => c.pass) };
}

/** Build the trigger-claim map from routing.json blades + skill frontmatter. */
export function buildTriggerMap(
  skillFiles: string[],
  bladeTriggers: { trigger: string; owner: string }[],
): Map<string, string> {
  const map = new Map<string, string>();
  for (const b of bladeTriggers) map.set(b.trigger.toLowerCase(), b.owner);
  for (const f of skillFiles) {
    try {
      const fm = parseFrontmatter(fs.readFileSync(f, 'utf8'));
      if (!fm) continue;
      for (const t of splitList(fm.triggers ?? '')) {
        const k = t.toLowerCase();
        if (!map.has(k)) map.set(k, f);
        else map.set(k, `${map.get(k)} + ${f}`);
      }
    } catch { /* unreadable file fails its own lint; skip here */ }
  }
  return map;
}
