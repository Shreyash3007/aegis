import { HOST_SCHEMA_VERSION, HostCapabilityDeclaration } from '../contracts/hosts.js';

/** Shipped host capability declarations (v0.11 R2). Each declaration is
 *  built from that host's official documentation on the retrieval date it
 *  carries - no invented formats. Every shipped binding is deliberately
 *  read-only: `aegis status` runs once at session start where the host
 *  documents a context channel. Statuses upgrade to 'verified' only with a
 *  recorded real versioned-host smoke (R3a recorded claude-code's; the R3b/
 *  R3c hosts stay 'fixture-only' until their smokes); the contract's manual-guidance
 *  rule (a host without the needed mechanism prints instructions - never a
 *  new scheduler, daemon or fallback model) is enforced by
 *  declarationProblems() for fixtures and installs alike. */
export const HOST_DECLARATIONS: HostCapabilityDeclaration[] = [
  {
    schema_version: HOST_SCHEMA_VERSION,
    id: 'claude-code',
    display_name: 'Claude Code',
    status: 'verified',
    docs: [{ url: 'https://code.claude.com/docs/en/hooks', retrieved: '2026-10-18' }],
    verified_with: [
      {
        host_version: '2.1.269',
        date: '2026-10-18',
        event: 'SessionStart',
        evidence: 'real claude 2.1.269 smoke on 2026-10-18 (Windows): the SessionStart:startup hook ran aegis status (0.10.0) and claude captured its stdout as plain text (--debug-file log); the model turn was blocked by the account gateway balance ($0), so delivery into a completed turn is not claimed - see docs/releases/v0.11/claude-code-adapter-quality.json F1',
      },
    ],
    config_scope: 'project',
    config_files: ['.claude/settings.json'],
    events: {
      SessionStart: { event: 'SessionStart', command: 'aegis status', payload: 'stdin-json' },
    },
    unsupported_events: ['PreToolUse', 'PostToolUse', 'Stop', 'SessionEnd'],
    install_strategy: 'marker-block',
    verification: {
      command: `node -e "const f=require('fs');const s=JSON.parse(f.readFileSync('.claude/settings.json','utf8'));const g=(s.hooks&&s.hooks.SessionStart)||[];let n=0;for(const e of g)for(const h of e.hooks||[])if(h.command.indexOf('aegis')===0)n++;console.log(n)"`,
      expects: 'prints 1 after a clean install (one aegis SessionStart handler), 0 when only foreign hooks exist; exits nonzero before .claude/settings.json exists',
    },
    limitations: [
      'Read-only: the binding runs `aegis status` and nothing else - Aegis never gates tool calls, blocks commands, or writes pipeline state from host hooks.',
      'SessionStart runs on every session start and its plain-text stdout is added to Claude context (documented), so the hook must stay fast; `aegis status` is.',
      'Install prefers the documented exec form (command+args, no shell) when `aegis` resolves to a real executable; a Windows .cmd shim cannot be exec-spawned and needs the documented shell form instead.',
      'Verified on claude 2.1.269 (Windows): SessionStart:startup ran the installed `aegis status` and Claude captured the stdout as plain text; the model turn itself was blocked by the account gateway balance, so delivery of the context into a completed model turn is not claimed.',
    ],
  },
  {
    schema_version: HOST_SCHEMA_VERSION,
    id: 'opencode',
    display_name: 'OpenCode',
    status: 'fixture-only',
    docs: [
      { url: 'https://opencode.ai/v2/docs/build/plugins/', retrieved: '2026-10-18' },
      { url: 'https://opencode.ai/v2/docs/plugins/', retrieved: '2026-10-18' },
    ],
    verified_with: [],
    config_scope: 'project',
    config_files: ['.opencode/plugins/aegis.ts'],
    events: {
      context: { event: 'context', command: 'aegis status', payload: 'none' },
    },
    unsupported_events: ['prompt', 'execute.before', 'execute.after', 'evaluate'],
    install_strategy: 'dedicated-file',
    verification: {
      command: `node -e "const f=require('fs');try{const t=f.readFileSync('.opencode/plugins/aegis.ts','utf8');console.log(t.includes('@opencode/plugin')?1:0)}catch{console.log(0)}"`,
      expects: 'prints 1 when the dedicated plugin file exists and imports @opencode/plugin, 0 otherwise',
    },
    limitations: [
      'Plugin-mediated: the host loads the dedicated TypeScript plugin and the plugin spawns the aegis CLI directly (no shell) on the first context build of a session.',
      'Read-only: the plugin pushes the `aegis status` text into the outgoing context only - Aegis never rewrites prompts, intercepts tools, or influences permissions.',
      'Requires `aegis` on PATH in the host runtime environment; a missing CLI selects manual guidance (a logged hint), never a fallback daemon or model.',
      'Fixture-only: no real versioned-host smoke is recorded yet - R3b records one or this status stays fixture-only.',
    ],
  },
  {
    schema_version: HOST_SCHEMA_VERSION,
    id: 'cursor',
    display_name: 'Cursor',
    status: 'fixture-only',
    docs: [{ url: 'https://cursor.com/docs/agent/hooks', retrieved: '2026-10-18' }],
    verified_with: [],
    config_scope: 'project',
    config_files: ['.cursor/hooks.json'],
    events: {
      sessionStart: { event: 'sessionStart', command: 'aegis status', payload: 'stdin-json' },
    },
    unsupported_events: ['preToolUse', 'postToolUse', 'beforeShellExecution', 'stop'],
    install_strategy: 'marker-block',
    verification: {
      command: `node -e "const f=require('fs');const s=JSON.parse(f.readFileSync('.cursor/hooks.json','utf8'));const g=(s.hooks&&s.hooks.sessionStart)||[];console.log(g.filter(e=>e.command.indexOf('aegis')===0).length)"`,
      expects: 'prints 1 after a clean install (one aegis sessionStart entry), 0 when only foreign hooks exist; exits nonzero before .cursor/hooks.json exists',
    },
    limitations: [
      'Read-only and fire-and-forget: sessionStart hooks never block the agent loop and the binding runs `aegis status` only.',
      'Cursor injects additional context only from valid JSON output; `aegis status` prints plain text, so the run shows in the Hooks output channel without altering the conversation.',
      'Cloud agents skip sessionStart in read-only early turns and do not load user-level hooks; the adapter installs project-level configuration only.',
      'Fixture-only: cursor is absent locally - R3c decides the advertised scope and upgrades this status only with a real versioned-host smoke.',
    ],
  },
];

const STATUSES = ['verified', 'fixture-only', 'manual-guidance'];
const STRATEGIES = ['marker-block', 'dedicated-file'];
// One aegis argv: a bare subcommand slug set, no quotes/pipes/redirects/`;` -
// nothing a shell could interpolate, exactly one CLI invocation per event.
const COMMAND = /^aegis(?: [a-z][a-z0-9-]*){1,3}$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Structural rules every declaration must satisfy (the contract invariants
 *  in src/contracts/hosts.ts). Returns human-readable problems, never
 *  throws; an empty array means the declaration is installable. Fixtures and
 *  the R3 installs call this before trusting or writing anything. */
export function declarationProblems(d: HostCapabilityDeclaration): string[] {
  const problems: string[] = [];
  if (d.schema_version !== HOST_SCHEMA_VERSION)
    problems.push(`schema_version ${d.schema_version} does not match HOST_SCHEMA_VERSION ${HOST_SCHEMA_VERSION}`);
  if (!d.id || !d.display_name) problems.push('id and display_name are required');
  if (!STATUSES.includes(d.status)) problems.push(`unknown status '${d.status}'`);
  if (!Array.isArray(d.docs) || d.docs.length === 0) problems.push('at least one official-doc citation is required');
  else
    for (const c of d.docs) {
      if (!/^https:\/\//.test(c.url)) problems.push(`citation must be an https page: ${c.url}`);
      if (!DATE.test(c.retrieved)) problems.push(`citation needs a YYYY-MM-DD retrieval date: ${c.url}`);
    }
  const hasEvidence = Array.isArray(d.verified_with) && d.verified_with.length > 0;
  if ((d.status === 'verified') !== hasEvidence)
    problems.push("'verified' and verified_with records must appear together - nothing upgrades by wishful thinking");
  if (hasEvidence)
    for (const r of d.verified_with)
      if (!r.host_version || !DATE.test(r.date) || !r.event || !r.evidence)
        problems.push(`incomplete verified_with record for ${r.event || '(no event)'}`);
  if (d.config_scope !== 'project' && d.config_scope !== 'user') problems.push(`unknown config_scope '${d.config_scope}'`);
  const events = Object.entries(d.events ?? {});
  const files = d.config_files ?? [];
  if (events.length === 0 && files.length > 0)
    problems.push('no supported events: nothing may be written (no scheduler, daemon or fallback)');
  if (events.length > 0 && files.length === 0)
    problems.push('supported events need at least one documented config file');
  for (const f of files)
    if (f.startsWith('/') || /^[A-Za-z]:/.test(f) || f.split('/').includes('..'))
      problems.push(`config file must be a relative path under the project: ${f}`);
  if (d.status === 'manual-guidance' && events.length > 0)
    problems.push('manual-guidance must not claim events - a host without the needed mechanism prints instructions (never a scheduler, daemon or fallback)');
  for (const [key, b] of events) {
    if (b.event !== key) problems.push(`binding ${key}: '${b.event}' must be the event name the official docs use`);
    if (!COMMAND.test(b.command)) problems.push(`binding ${key}: command must be one aegis argv (no shell interpolation, one invocation): '${b.command}'`);
    if (b.payload !== 'none' && b.payload !== 'stdin-json') problems.push(`binding ${key}: unknown payload '${b.payload}'`);
  }
  if (!Array.isArray(d.unsupported_events) || d.unsupported_events.length === 0)
    problems.push('state expected-but-unsupported events explicitly - silence is never support');
  else
    for (const e of d.unsupported_events)
      if (e in (d.events ?? {})) problems.push(`event '${e}' cannot be both supported and unsupported`);
  if (!STRATEGIES.includes(d.install_strategy)) problems.push(`unknown install_strategy '${d.install_strategy}'`);
  if (!d.verification?.command || !d.verification?.expects) problems.push('verification needs a runnable command and its expected result');
  if (!Array.isArray(d.limitations) || d.limitations.length === 0) problems.push('state honest limitations - no declaration ships without them');
  return problems;
}

export function findDeclaration(id: string): HostCapabilityDeclaration | undefined {
  return HOST_DECLARATIONS.find((d) => d.id === id);
}
