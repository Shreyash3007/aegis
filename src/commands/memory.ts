import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { AEGIS_DIR, REPO, die, ok, noStateMsg } from '../lib/util.js';

/** Record memory beside brain/ (SPEC §8): typed decision/contract/finding/
 *  assumption records with status, confidence, citations, expiry and
 *  supersedes-links.
 *  Truth lives COMMITTED at brain/memory/records.jsonl (+ lanes/): reviewable
 *  diffs, survives disk loss, and automatically covered by checkpoint
 *  integrity (brainHashes walks brain/). .aegis/memory/ holds only the
 *  rebuilt SQLite FTS5 index + rendered cache - both regenerable via
 *  `memory sync`. Lane scratch is sealed: `list` hides it unless asked, and
 *  only `promote` (the merge-gate promotion) moves lane records into the
 *  main store. Contradictions open reconcile tasks - never silent overwrites.
 *  IDs derive from scanning the JSONL tail (no separate counter file, so no
 *  two-op race); writers stay conductor-serialized (single-writer). */

const MEM = () => path.join(AEGIS_DIR, 'memory');
const STORE = () => path.join(REPO, 'brain', 'memory');
const MAIN = () => path.join(STORE(), 'records.jsonl');
const LANE = (l: string) => path.join(STORE(), 'lanes', `${l}.jsonl`);
const IDX = () => path.join(MEM(), 'index.db');
// Pre-0.9 source of truth (gitignored, unhashed). ensureStore() migrates it
// forward once, then removes it - never the reverse.
const LEGACY_MAIN = () => path.join(MEM(), 'records.jsonl');
const LEGACY_LANES = () => path.join(MEM(), 'lanes');

export const TYPES = ['decision', 'contract', 'finding', 'assumption', 'reconcile'] as const;
const OPEN_STATUS = ['active', 'pending', 'superseded'];
const TASK_STATUS = ['open', 'resolved'];
const STALE_CONF = 0.5;

export interface MemRecord {
  id: string; type: string; title: string; body: string;
  status: string; confidence: number; cites: string[];
  expiry: string | null; supersedes: string | null;
  parties: string[] | null; winner: string | null; resolution: string | null;
  lane: string | null; at: string; verified_at: string | null;
  history: { at: string; event: string }[];
}

function needInit(): void {
  if (!fs.existsSync(AEGIS_DIR)) die(2, noStateMsg('missing .aegis'));
  fs.mkdirSync(path.join(STORE(), 'lanes'), { recursive: true });
  ensureStore();
}

/** One-way forward migration: pre-0.9 gitignored truth (.aegis/memory) moves
 *  into the committed store (brain/memory). Runs on every memory command;
 *  no-ops once migrated. Prints to stderr so machine-readable stdout
 *  (list/get) stays parseable. */
function ensureStore(): void {
  if (!fs.existsSync(LEGACY_MAIN()) && !fs.existsSync(LEGACY_LANES())) return;
  const moved: string[] = [];
  if (fs.existsSync(LEGACY_MAIN()) && !fs.existsSync(MAIN())) {
    fs.copyFileSync(LEGACY_MAIN(), MAIN());
    moved.push('records.jsonl');
  }
  if (fs.existsSync(LEGACY_LANES())) {
    for (const f of fs.readdirSync(LEGACY_LANES())) {
      if (!f.endsWith('.jsonl')) continue;
      const dst = path.join(STORE(), 'lanes', f);
      if (!fs.existsSync(dst)) {
        fs.copyFileSync(path.join(LEGACY_LANES(), f), dst);
        moved.push(`lanes/${f}`);
      }
    }
  }
  if (moved.length) {
    try { fs.rmSync(LEGACY_MAIN(), { force: true }); } catch { /* keep going */ }
    try { fs.rmSync(LEGACY_LANES(), { recursive: true, force: true }); } catch { /* keep going */ }
    try { fs.rmSync(path.join(MEM(), 'seq'), { force: true }); } catch { /* pre-0.9 counter, superseded by tail scan */ }
    console.error(`note: memory store migrated to brain/memory/ (${moved.join(', ')}) - the old gitignored copy is removed`);
  }
}

function readAll(file: string): MemRecord[] {
  if (!fs.existsSync(file)) return [];
  return fs.readFileSync(file, 'utf8').split('\n')
    .filter((l) => l.trim()).map((l) => JSON.parse(l));
}

function allMain(): MemRecord[] { return readAll(MAIN()); }
function allLane(l: string): MemRecord[] { return readAll(LANE(l)); }
export function allRecords(): MemRecord[] {
  needInit();
  const out = allMain();
  const lanesDir = path.join(STORE(), 'lanes');
  if (fs.existsSync(lanesDir))
    for (const f of fs.readdirSync(lanesDir))
      if (f.endsWith('.jsonl')) out.push(...readAll(path.join(lanesDir, f)));
  return out;
}

export function isStale(r: MemRecord, now = Date.now()): boolean {
  if (r.status === 'superseded' || r.status === 'resolved') return false;
  if (r.expiry && Date.parse(r.expiry) < now) return true;
  return r.confidence < STALE_CONF;
}

function nextId(): string {
  // Crash-safe: derive from the JSONL tail, no separate counter file whose
  // write could race or be lost between the two fs ops. Single-writer
  // (conductor-serialized) keeps appends ordered.
  let n = 0;
  for (const r of [...readAll(MAIN()), ...laneFiles().flatMap(readAll)]) {
    const m = /^mem-(\d+)$/.exec(r.id);
    if (m) n = Math.max(n, parseInt(m[1], 10));
  }
  return `mem-${String(n + 1).padStart(4, '0')}`;
}

function find(id: string): { rec: MemRecord; file: string } | null {
  for (const f of [MAIN(), ...laneFiles()])
    for (const r of readAll(f)) if (r.id === id) return { rec: r, file: f };
  return null;
}

function laneFiles(): string[] {
  const d = path.join(STORE(), 'lanes');
  if (!fs.existsSync(d)) return [];
  return fs.readdirSync(d).filter((f) => f.endsWith('.jsonl')).map((f) => path.join(d, f));
}

function rewrite(file: string, recs: MemRecord[]): void {
  fs.writeFileSync(file, recs.map((r) => JSON.stringify(r)).join('\n') + (recs.length ? '\n' : ''));
}

function flags(args: string[]): { pos: string[]; opt: Record<string, string> } {
  const pos: string[] = [];
  const opt: Record<string, string> = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith('--')) {
      const k = args[i].slice(2);
      const v = args[i + 1] && !args[i + 1].startsWith('--') ? args[++i] : '';
      opt[k] = v;
    } else pos.push(args[i]);
  }
  return { pos, opt };
}

function parseConfidence(v: string | undefined, dflt: number): number {
  if (v === undefined || v === '') return dflt;
  const n = parseFloat(v);
  if (!Number.isFinite(n) || n < 0 || n > 1) die(2, `confidence must be 0..1, got '${v}'`);
  return n;
}

function parseExpiry(v: string | undefined): string | null {
  if (!v) return null;
  const m = /^(-?\d+)d$/.exec(v);
  const t = m ? Date.now() + parseInt(m[1], 10) * 86400_000 : Date.parse(v);
  if (!Number.isFinite(t)) die(2, `expiry must be ISO date or Nd (days), got '${v}'`);
  return new Date(t).toISOString();
}

// ---- SQLite FTS5 index (rebuilt artifact) + token-scan fallback ----

function sqlite(): any {
  try { return createRequire(import.meta.url)('node:sqlite'); } catch { return null; }
}

function rebuildIndex(recs: MemRecord[]): void {
  const mod = sqlite();
  try { fs.rmSync(IDX(), { force: true }); } catch { /* fresh */ }
  if (!mod) return; // token-scan fallback covers search
  try {
    const db = new mod.DatabaseSync(IDX());
    db.exec('CREATE VIRTUAL TABLE docs USING fts5(id, title, body)');
    const ins = db.prepare('INSERT INTO docs (id, title, body) VALUES (?, ?, ?)');
    for (const r of recs) ins.run(r.id, r.title, r.body);
    db.close();
  } catch { /* FTS unavailable - search falls back */ }
}

function searchIds(q: string, recs: MemRecord[]): string[] {
  const mod = sqlite();
  if (mod && fs.existsSync(IDX())) {
    try {
      const toks = q.toLowerCase().split(/\s+/).filter(Boolean)
        .map((t) => `"${t.replace(/"/g, '""')}"`).join(' AND ');
      const db = new mod.DatabaseSync(IDX(), { readOnly: true });
      const rows = db.prepare('SELECT id FROM docs WHERE docs MATCH ?').all(toks) as { id: string }[];
      db.close();
      if (rows.length) return rows.map((r) => r.id);
    } catch { /* malformed query - fall through to token scan */ }
  }
  const toks = q.toLowerCase().split(/\s+/).filter(Boolean);
  return recs.filter((r) => {
    const hay = `${r.title}\n${r.body}\n${r.type}`.toLowerCase();
    return toks.every((t) => hay.includes(t));
  }).map((r) => r.id);
}

// ---- rendered view (pure, deterministic: sorted by id, no minted fields) ----

function render(recs: MemRecord[]): string {
  const now = Date.now();
  const stale = recs.filter((r) => isStale(r, now));
  const open = recs.filter((r) => r.type === 'reconcile' && r.status === 'open');
  const L: string[] = [
    '<!-- GENERATED BY aegis memory sync - regenerated per run. Do not edit. -->',
    '', '# Memory (record store)', '',
    `- total: ${recs.length} | stale (re-verify): ${stale.length} | open reconciles: ${open.length}`, '',
  ];
  const groups: [string, MemRecord[]][] = [
    ['Active', recs.filter((r) => r.status === 'active')],
    ['Pending', recs.filter((r) => r.status === 'pending')],
    ['Open reconciles', open],
    ['Superseded / resolved', recs.filter((r) => r.status === 'superseded' || r.status === 'resolved')],
  ];
  for (const [name, rs] of groups) {
    L.push(`## ${name}`, '');
    const sorted = [...rs].sort((a, b) => a.id.localeCompare(b.id));
    if (!sorted.length) L.push('- (none)', '');
    for (const r of sorted) {
      const ev = r.cites.length ? `cites:${r.cites.length}` : 'UNEVIDENCED';
      const st = isStale(r, now) ? ' STALE' : '';
      L.push(`- \`${r.id}\` [${r.type}/${r.confidence}] ${r.title} (${ev})${st}`);
      if (r.type === 'reconcile' && r.parties) L.push(`  parties: ${r.parties.join(' vs ')}${r.winner ? ` | winner: ${r.winner}` : ''}`);
      if (r.resolution) L.push(`  resolution: ${r.resolution}`);
      if (r.supersedes) L.push(`  supersedes: ${r.supersedes}`);
      if (r.expiry) L.push(`  expiry: ${r.expiry}`);
    }
    L.push('');
  }
  return L.join('\n');
}

/** Rebuild the FTS index and re-render brain/memory.md. Idempotent. */
export function syncStore(): void {
  needInit();
  const recs = allRecords();
  rebuildIndex(recs);
  const brainDir = path.join(REPO, 'brain');
  fs.mkdirSync(brainDir, { recursive: true });
  fs.writeFileSync(path.join(brainDir, 'memory.md'), render(recs));
}

/** One-line resume-pack summary, or null when the store is unused. */
export function memorySummary(): string | null {
  try {
    if (!fs.existsSync(MAIN()) && !laneFiles().length) return null;
    const recs = allRecords();
    if (!recs.length) return null;
    const now = Date.now();
    const active = recs.filter((r) => r.status === 'active' || r.status === 'pending').length;
    const stale = recs.filter((r) => isStale(r, now)).length;
    const open = recs.filter((r) => r.type === 'reconcile' && r.status === 'open').length;
    return `memory: ${active} active, ${stale} stale (re-verify), ${open} open reconciles`;
  } catch { return null; }
}

function line(r: MemRecord): string {
  const ev = r.cites.length ? `cites:${r.cites.length}` : 'UNEVIDENCED';
  const st = isStale(r) ? ` STALE(${r.expiry && Date.parse(r.expiry) < Date.now() ? 'expired' : 'lowconf'})` : '';
  const lane = r.lane ? ` @lane:${r.lane}` : '';
  return `${r.id} [${r.type}/${r.status}/${r.confidence}] ${r.title} (${ev})${st}${lane}`;
}

// ---- commands ----

function cmdAdd(opt: Record<string, string>): void {
  const { type, title, body } = opt;
  if (!type || !title || !body) die(2, 'usage: aegis memory add --type <decision|contract|finding|assumption> --title <t> --body <text> [--confidence 0..1] [--status active|pending] [--cites a,b] [--expiry <date|Nd>] [--supersedes <id>] [--contradicts <id>] [--lane <name>]');
  if (!(TYPES as readonly string[]).includes(type) || type === 'reconcile')
    die(2, `type must be decision|contract|finding|assumption (reconcile tasks open via --contradicts), got '${type}'`);
  const status = opt.status || 'active';
  if (!['active', 'pending'].includes(status)) die(2, `new-record status must be active|pending, got '${status}'`);
  const confidence = parseConfidence(opt.confidence, 0.5);
  const expiry = parseExpiry(opt.expiry);
  const cites = (opt.cites ?? '').split(',').map((s) => s.trim()).filter(Boolean);
  // Cite-or-stamp, enforced: local-path cites must resolve to repo files
  // (`file` or `file:line`), record refs must name live records, URLs are
  // exempt. A cite that points nowhere is a fabricated citation.
  for (const c of cites) {
    if (/^[a-z]+:\/\//i.test(c)) continue;
    if (/^mem-\d+$/.test(c)) {
      if (!find(c)) die(2, `cite target not found: ${c} (dangling record ref)`);
      continue;
    }
    if (!fs.existsSync(path.resolve(REPO, c.replace(/:\d+.*$/, ''))))
      die(2, `cite target not found: ${c} (cites must resolve to repo files; URLs exempt)`);
  }
  const lane = opt.lane || null;
  if (lane && !/^[a-z0-9-]+$/.test(lane)) die(2, `lane must match [a-z0-9-], got '${lane}'`);
  const at = new Date().toISOString();
  const file = lane ? LANE(lane) : MAIN();
  fs.mkdirSync(path.dirname(file), { recursive: true });

  const rec: MemRecord = {
    id: nextId(), type, title, body, status, confidence, cites, expiry,
    supersedes: null, parties: null, winner: null, resolution: null,
    lane, at, verified_at: null, history: [{ at, event: 'created' }],
  };
  const extra: string[] = [];

  if (opt.supersedes) {
    const hit = find(opt.supersedes);
    if (!hit) die(2, `supersedes target not found: ${opt.supersedes}`);
    if (hit.rec.type === 'reconcile') die(4, 'cannot supersede a reconcile task - resolve it: aegis memory reconcile');
    rec.supersedes = opt.supersedes;
    hit.rec.status = 'superseded';
    hit.rec.history.push({ at, event: `superseded by ${rec.id}` });
    const all = readAll(hit.file).map((r) => r.id === hit.rec.id ? hit.rec : r);
    rewrite(hit.file, all);
    extra.push(`supersedes ${opt.supersedes}`);
  }
  fs.appendFileSync(file, JSON.stringify(rec) + '\n');

  if (opt.contradicts) {
    const hit = find(opt.contradicts);
    if (!hit) die(2, `contradicts target not found: ${opt.contradicts}`);
    const tat = new Date().toISOString();
    const task: MemRecord = {
      id: nextId(), type: 'reconcile', title: `Reconcile ${rec.id} vs ${hit.rec.id}`,
      body: `Contradiction between ${rec.id} ("${rec.title}") and ${hit.rec.id} ("${hit.rec.title}"). Resolve with evidence; never silently overwrite.`,
      status: 'open', confidence: 0.5, cites: [], expiry: null, supersedes: null,
      parties: [rec.id, hit.rec.id], winner: null, resolution: null,
      lane, at: tat, verified_at: null, history: [{ at: tat, event: `opened by contradiction (${rec.id} vs ${hit.rec.id})` }],
    };
    fs.appendFileSync(file, JSON.stringify(task) + '\n');
    extra.push(`reconcile ${task.id} opened vs ${opt.contradicts}`);
  }
  syncStore();
  ok(`memory added: ${rec.id} [${type}/${status}/${confidence}]${extra.length ? ` (${extra.join('; ')})` : ''}`);
}

function cmdList(opt: Record<string, string>): void {
  needInit();
  let recs = opt.lane ? allLane(opt.lane) : ('all' in opt) ? allRecords() : allMain();
  if (opt.type) {
    if (!(TYPES as readonly string[]).includes(opt.type)) die(2, `unknown type: ${opt.type}`);
    recs = recs.filter((r) => r.type === opt.type);
  }
  if (opt.status) recs = recs.filter((r) => r.status === opt.status);
  if ('stale' in opt) recs = recs.filter((r) => isStale(r));
  if (opt.search) {
    const ids = new Set(searchIds(opt.search, recs));
    recs = recs.filter((r) => ids.has(r.id));
  }
  const sorted = [...recs].sort((a, b) => a.id.localeCompare(b.id));
  if (!sorted.length) { console.log('no memory records match'); return; }
  for (const r of sorted) console.log(line(r));
}

function cmdVerify(id: string, opt: Record<string, string>): void {
  const hit = find(id);
  if (!hit) die(2, `unknown memory record: ${id}`);
  const at = new Date().toISOString();
  if (opt.confidence !== undefined && opt.confidence !== '') hit.rec.confidence = parseConfidence(opt.confidence, hit.rec.confidence);
  if (opt.status) {
    const allowed = hit.rec.type === 'reconcile' ? TASK_STATUS : OPEN_STATUS;
    if (!allowed.includes(opt.status)) die(2, `status must be ${allowed.join('|')} for ${hit.rec.type}, got '${opt.status}'`);
    hit.rec.status = opt.status;
  }
  hit.rec.verified_at = at;
  hit.rec.history.push({ at, event: `verified (confidence ${hit.rec.confidence}, status ${hit.rec.status})` });
  rewrite(hit.file, readAll(hit.file).map((r) => r.id === id ? hit.rec : r));
  syncStore();
  ok(`memory verified: ${id} (confidence ${hit.rec.confidence}, status ${hit.rec.status})`);
}

function cmdRetire(id: string, opt: Record<string, string>): void {
  if (!opt.reason) die(4, 'memory retire requires --reason <text> (audited)');
  const hit = find(id);
  if (!hit) die(2, `unknown memory record: ${id}`);
  if (hit.rec.type === 'reconcile') die(4, 'cannot retire a reconcile task - resolve it: aegis memory reconcile');
  const at = new Date().toISOString();
  hit.rec.status = 'superseded';
  if (opt.by) {
    const target = find(opt.by);
    if (!target) die(2, `retire --by target not found: ${opt.by}`);
    hit.rec.supersedes = opt.by;
  }
  hit.rec.history.push({ at, event: `retired: ${opt.reason}` });
  rewrite(hit.file, readAll(hit.file).map((r) => r.id === id ? hit.rec : r));
  syncStore();
  ok(`memory retired: ${id} (superseded: ${opt.reason})`);
}

function cmdReconcile(id: string, opt: Record<string, string>): void {
  const hit = find(id);
  if (!hit) die(2, `unknown memory record: ${id}`);
  if (hit.rec.type !== 'reconcile' || hit.rec.status !== 'open')
    die(4, `${id} is not an open reconcile task`);
  if (!opt.winner || !opt.resolution) die(2, 'usage: aegis memory reconcile <task-id> --winner <id> --resolution <text>');
  if (!hit.rec.parties!.includes(opt.winner))
    die(2, `winner must be one of ${hit.rec.parties!.join(', ')}, got '${opt.winner}'`);
  const loser = hit.rec.parties!.find((p) => p !== opt.winner)!;
  const at = new Date().toISOString();
  hit.rec.status = 'resolved';
  hit.rec.winner = opt.winner;
  hit.rec.resolution = opt.resolution;
  hit.rec.verified_at = at;
  hit.rec.history.push({ at, event: `resolved: ${opt.winner} wins over ${loser}` });
  const loseHit = find(loser);
  if (loseHit) {
    loseHit.rec.status = 'superseded';
    loseHit.rec.supersedes = opt.winner;
    loseHit.rec.history.push({ at, event: `superseded by reconcile ${id} (winner: ${opt.winner})` });
    rewrite(loseHit.file, readAll(loseHit.file).map((r) => r.id === loser ? loseHit.rec : r));
  }
  rewrite(hit.file, readAll(hit.file).map((r) => r.id === id ? hit.rec : r));
  syncStore();
  ok(`memory reconciled: ${id} (winner: ${opt.winner}, ${loser} superseded)`);
}

function cmdPromote(opt: Record<string, string>): void {
  if (!opt.lane) die(2, 'usage: aegis memory promote --lane <name>');
  const file = LANE(opt.lane);
  if (!fs.existsSync(file)) die(2, `no lane scratch for '${opt.lane}'`);
  const recs = readAll(file);
  const at = new Date().toISOString();
  for (const r of recs) {
    r.lane = null;
    r.history.push({ at, event: `promoted from lane ${opt.lane} (merge-gate)` });
    fs.appendFileSync(MAIN(), JSON.stringify(r) + '\n');
  }
  fs.rmSync(file, { force: true });
  syncStore();
  ok(`memory promoted: ${recs.length} record(s) from lane ${opt.lane} to the main store`);
}

export function memory(args: string[]): void {
  needInit();
  const op = args[0];
  const { pos, opt } = flags(args.slice(1));
  if (op === 'add') return cmdAdd(opt);
  if (op === 'list') return cmdList(opt);
  if (op === 'get') {
    if (!pos[0]) die(2, 'usage: aegis memory get <id>');
    const hit = find(pos[0]);
    if (!hit) die(2, `unknown memory record: ${pos[0]}`);
    console.log(JSON.stringify(hit.rec, null, 2));
    return;
  }
  if (op === 'verify') {
    if (!pos[0]) die(2, 'usage: aegis memory verify <id> [--confidence f] [--status s]');
    return cmdVerify(pos[0], opt);
  }
  if (op === 'retire') {
    if (!pos[0]) die(2, 'usage: aegis memory retire <id> --reason <text> [--by <id>]');
    return cmdRetire(pos[0], opt);
  }
  if (op === 'reconcile') {
    if (!pos[0]) die(2, 'usage: aegis memory reconcile <task-id> --winner <id> --resolution <text>');
    return cmdReconcile(pos[0], opt);
  }
  if (op === 'promote') return cmdPromote(opt);
  if (op === 'sync') { syncStore(); ok('memory synced (FTS index rebuilt, brain/memory.md rendered)'); return; }
  die(2, 'usage: aegis memory <add|list|get|verify|retire|reconcile|promote|sync>');
}
