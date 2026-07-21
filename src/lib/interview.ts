import readline from 'node:readline';
import { Config, SCHEMA_VERSION } from './state.js';
import { DoctorReport } from './detect.js';

interface Q { key: string; ask: string; def: string }

const QUESTIONS: Q[] = [
  { key: 'platform', ask: 'Platform (kimi-code / claude-code / cursor / opencode / api / chat)', def: 'chat' },
  { key: 'project_type', ask: 'Project type (greenfield / brownfield)', def: 'greenfield' },
  { key: 'stack', ask: 'Tech stack (auto-detect later; confirm or correct)', def: 'typescript' },
  { key: 'human_lane_cap', ask: 'Max parallel sessions you are comfortable running locally', def: '2' },
  { key: 'autonomy', ask: 'Autonomy mode (assisted / semi / full)', def: 'semi' },
  { key: 'model_strong', ask: 'Strongest model available (architecture/security/PRD)', def: 'default' },
  { key: 'ship_profile', ask: 'Ship target (prototype / production)', def: 'production' },
  { key: 'team', ask: 'Team context (solo / small-team)', def: 'solo' },
];

export async function runInterview(doc: DoctorReport, yes: boolean): Promise<Config> {
  const base: Config = {
    schema_version: SCHEMA_VERSION,
    platform: doc.platform_hint === 'unknown-cli' ? 'chat' : doc.platform_hint,
    mode: 'runtime',
    autonomy: 'semi',
    environment_level: doc.environment_level,
    project_type: 'greenfield',
    ram_mb: doc.ram_total_mb,
    human_lane_cap: 2,
    ship_profile: 'production',
    pii_logs: false,
    model_tiers: { strong: 'default', standard: 'default', light: 'default' },
    lane_costs_mb: { browser_e2e: 1500, dev_server: 500, codegen: 0 },
  };
  if (yes) return base;

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const ask = (q: Q): Promise<string> =>
    new Promise((res) => rl.question(`${q.ask} [${q.def}]: `, (a) => res(a.trim() || q.def)));

  console.log('\nAEGIS setup interview (one question at a time; Enter accepts recommended default)\n');
  for (const q of QUESTIONS) {
    const a = await ask(q);
    switch (q.key) {
      case 'platform': base.platform = a; break;
      case 'project_type': base.project_type = a === 'brownfield' ? 'brownfield' : 'greenfield'; break;
      case 'human_lane_cap': base.human_lane_cap = Math.max(1, parseInt(a, 10) || 2); break;
      case 'autonomy': base.autonomy = (['assisted','semi','full'].includes(a) ? a : 'semi') as Config['autonomy']; break;
      case 'model_strong': base.model_tiers.strong = a; break;
      case 'ship_profile': base.ship_profile = a === 'prototype' ? 'prototype' : 'production'; break;
      case 'team': base.team = a === 'small-team' ? 'small-team' : 'solo'; break;
      case 'stack': base.stack = a; break; // locked stack; manifest.md cites it (SKILL-00b)
    }
  }
  rl.close();
  return base;
}
