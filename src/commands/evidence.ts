import fs from 'node:fs';
import path from 'node:path';
import { AEGIS_DIR, die, gitTry, ok, writeJ } from '../lib/util.js';
import { acquireState, commitState, loadState, stateP } from '../lib/state.js';

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
  if (op !== 'export') die(2, 'usage: aegis evidence <usage|export --file <json>>');
  const fi = args.indexOf('--file');
  if (fi < 0 || !args[fi + 1]) die(2, 'export requires --file <json>');
  const file = path.resolve(args[fi + 1]);
  if (fs.existsSync(file)) die(4, 'evidence exports are immutable observations; use a successor filename');
  const s = loadState();
  const usage = s.usage_reports ?? [];
  const sum = (field: 'tokens_in' | 'tokens_out' | 'cost_usd'): number | null =>
    usage.length && usage.every((r) => r[field] !== null) ? usage.reduce((n, r) => n + r[field]!, 0) : null;
  const document = {
    schema_version: 1, commit: gitTry(['rev-parse', 'HEAD']),
    counts: { history_events: s.history.length, approved_gates: Object.keys(s.gates).length },
    usage: {
      provenance: 'executor-reported (not independently verified)', reports: usage.length,
      tokens_in: sum('tokens_in'), tokens_out: sum('tokens_out'), cost_usd: sum('cost_usd'),
      cost_status: sum('cost_usd') === null ? 'UNMEASURED' : 'REPORTED',
    },
    judgments: s.judgment_budget ?? { status: 'UNMEASURED' },
    test_status: 'UNMEASURED - tests must supply a separate run artifact',
    privacy: 'aggregate only; no raw state, prompts, model names or commands',
  };
  fs.mkdirSync(path.dirname(file), { recursive: true });
  writeJ(file, document);
  ok(`aggregate evidence exported: ${file} (no raw state published)`);
}
