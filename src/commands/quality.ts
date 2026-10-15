import fs from 'node:fs';
import path from 'node:path';
import { AEGIS_DIR, die, git, ok, writeJ } from '../lib/util.js';
import { acquireState, commitState, loadState, stateP } from '../lib/state.js';
import { localBranch, branchWorktree, gitFile, digest } from '../lib/tdd-proof.js';
import { Criterion, Finding, QualityReceipt, qualityPath, qualityProblem, runCriteria } from '../lib/quality-evidence.js';

/** Acceptance executes observable checks; review records an attributed
 * reviewer input. Recording a clean review is not proof of independent or
 * adequate review, and execution cannot prove a criterion is the right one. */
export function quality(args: string[]): void {
  const [kind, branch] = args;
  if (!['acceptance', 'review', 'status'].includes(kind) || !branch)
    die(2, 'usage: aegis quality <acceptance|review|status> <branch> [--file <committed-plan.json>]');
  loadState();
  const tip = localBranch(branch);
  if (!tip) die(2, `unknown local branch: ${branch}`);
  if (kind === 'status') { console.log(qualityProblem(branch, tip, true) ?? 'QUALITY VERIFIED (recorded acceptance + review)'); return; }
  const fi = args.indexOf('--file');
  const file = fi >= 0 ? args[fi + 1]?.replace(/\\/g, '/') : undefined;
  if (!file || path.isAbsolute(file) || file.split('/').includes('..')) die(2, '--file must name a committed repo-relative JSON plan');
  const wt = branchWorktree(branch);
  if (!wt) die(4, 'capture quality evidence from a checked-out branch worktree');
  if (git(['rev-parse', 'HEAD'], wt) !== tip || git(['status', '--porcelain'], wt)) die(4, 'commit the quality plan and source snapshot first');
  let bytes: Buffer;
  let plan: { criteria?: Criterion[]; findings?: Finding[] };
  try { bytes = gitFile(tip, file); plan = JSON.parse(bytes.toString('utf8')); }
  catch { die(2, 'quality plan is missing, uncommitted or unparseable'); }
  if (!plan || typeof plan !== 'object') die(2, 'quality plan must be an object');
  const receipt: QualityReceipt = {
    version: 1, kind: kind as 'acceptance' | 'review', branch, commit: tip,
    source: file, source_sha256: digest(bytes), at: new Date().toISOString(),
  };
  if (kind === 'acceptance') {
    const cs = plan.criteria;
    if (!Array.isArray(cs) || cs.length < 1 || cs.length > 20) die(2, 'acceptance needs 1..20 executable criteria');
    const seen = new Set<string>();
    for (const c of cs) {
      if (!c || typeof c.id !== 'string' || !c.id.trim() || seen.has(c.id) || typeof c.statement !== 'string' || !c.statement.trim() ||
          !Array.isArray(c.command) || !c.command.length || c.command.some((x) => typeof x !== 'string' || !x))
        die(2, 'criteria need unique ids, statements and executable argv arrays');
      seen.add(c.id);
    }
    receipt.criteria = cs;
    receipt.results = runCriteria(cs, wt);
  } else {
    const findings = plan.findings;
    if (!Array.isArray(findings)) die(2, 'review needs findings array (empty only after actual review)');
    const seen = new Set<string>();
    for (const f of findings) {
      if (!f || typeof f.id !== 'string' || !f.id.trim() || seen.has(f.id) || typeof f.summary !== 'string' || !f.summary.trim() ||
          !['blocker', 'major', 'minor', 'note'].includes(f.severity) || !['open', 'resolved'].includes(f.status) ||
          !Array.isArray(f.evidence) || !f.evidence.length || f.evidence.some((s) => typeof s !== 'string' || !s))
        die(2, 'findings need unique ids, summary, severity, status and committed evidence paths');
      seen.add(f.id);
      for (const source of f.evidence) {
        if (path.isAbsolute(source) || source.replace(/\\/g, '/').split('/').includes('..')) die(2, 'review evidence must be repo-relative');
        try { gitFile(tip, source.replace(/\\/g, '/')); } catch { die(2, `review evidence missing at branch tip: ${source}`); }
      }
    }
    receipt.findings = findings;
  }
  if (localBranch(branch) !== tip || git(['rev-parse', 'HEAD'], wt) !== tip || git(['status', '--porcelain'], wt)) die(9, 'quality snapshot changed during capture');
  const s = acquireState(stateP);
  fs.mkdirSync(path.join(AEGIS_DIR, 'quality'), { recursive: true });
  writeJ(qualityPath(branch, kind), receipt);
  s.history.push({ skill: s.current_skill, at: receipt.at, event: `quality-${kind}: ${branch} ${tip} plan-sha256=${receipt.source_sha256}` });
  commitState(stateP, s);
  const problem = qualityProblem(branch, tip);
  if (problem) die(9, problem);
  if (kind === 'acceptance') ok(`${receipt.results!.filter((r) => r.status === 'PASS').length}/${receipt.results!.length} acceptance checks passed (criterion adequacy remains a review responsibility)`);
  else ok('review recorded: no open blocker/major; minor/note findings retained for backlog');
}
