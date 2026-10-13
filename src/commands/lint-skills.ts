import fs from 'node:fs';
import path from 'node:path';
import { AEGIS_DIR, die, ok, noStateMsg } from '../lib/util.js';
import { lintSkillFile, buildTriggerMap } from '../lib/skill-lint.js';

/** aegis lint-skills [--all|<file>] - Margin Format gate (CONSTRAINTS.md §2).
 *  Checks frontmatter order/validity, line budgets, body order, CLI refs,
 *  vague markers, link resolution, and trigger collisions against
 *  skills/routing.json blades. Exit 11 on any failure. */
export async function lintSkills(args: string[], knownCommands: string[]): Promise<void> {
  const skillsDir = path.join(AEGIS_DIR, 'skills');
  let files: string[] = [];
  if (!args[0] || args[0] === '--all') {
    const walk = (d: string): void => {
      if (!fs.existsSync(d)) return;
      for (const f of fs.readdirSync(d)) {
        const p = path.join(d, f);
        if (fs.statSync(p).isDirectory()) walk(p);
        else if (f.endsWith('.md')) files.push(p);
      }
    };
    walk(skillsDir);
    if (!files.length) die(2, noStateMsg('no skills found', ' first'));
  } else if (fs.existsSync(args[0])) {
    files = [args[0]];
  } else die(2, 'usage: aegis lint-skills [--all|<file.md>]');

  // Blade triggers from the routing registry (external claimants).
  const bladeTriggers: { trigger: string; owner: string }[] = [];
  try {
    const routing = JSON.parse(fs.readFileSync(path.join(skillsDir, 'routing.json'), 'utf8'));
    for (const b of routing.blades ?? []) {
      for (const t of b.triggers ?? []) bladeTriggers.push({ trigger: t, owner: `blade:${b.name}` });
    }
  } catch { /* registry absent: corpus-only map */ }
  const claims = buildTriggerMap(files, bladeTriggers);

  const results = files.map((f) => lintSkillFile(f, knownCommands, claims));
  const failed = results.filter((r) => !r.pass);
  for (const r of failed) {
    console.log(`FAIL ${path.relative(skillsDir, r.file)}:`);
    for (const c of r.checks.filter((c) => !c.pass)) console.log(`  - ${c.name}: ${c.detail}`);
  }
  console.log(`lint-skills: ${results.length - failed.length}/${results.length} passed`);
  if (failed.length) die(11, `${failed.length} skill file(s) violate Margin Format`);
  ok(`all ${results.length} skill files pass Margin Format`);
}
