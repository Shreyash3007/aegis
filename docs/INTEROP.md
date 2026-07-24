# Aegis + ECC: Interop Recipes

Aegis and [ECC](https://github.com/affaan-m/ECC) solve different problems and
compose cleanly:

- **ECC** equips the agent: skills, subagents, language rules, memory,
  learning, security scanning. Its rules are advice the agent follows by
  prompt.
- **Aegis** governs the work: state machine, human gates, merge oracle,
  hash-verified audit trail. Its rules are walls the agent cannot bypass.

They don't collide: ECC's hooks live in the harness (Claude Code / OpenCode
tool events); Aegis's hooks live in git (pre-commit / post-commit /
pre-push). Use both in the same repo.

## Recipe 1: AgentShield as a first-class Aegis gate

```bash
aegis config set validate_suite.security "npx ecc-agentshield scan"
aegis validate security        # exit code = verdict, command recorded as citation
```

Now the security scan is part of your recorded validation history — and can
gate the pipeline the same way builtin suites do.

## Recipe 2: ECC content + Aegis enforcement

- Install ECC skills/rules for your agent (their plugin or manual copy) —
  they make the agent more capable.
- Run `aegis init` in the same repo — it makes the work verifiable.
- The agent reads ECC skills for *how* to work and Aegis's `.aegis/skills/`
  for *where in the pipeline* it is; the Aegis CLI enforces gates,
  transitions, and merge quality mechanically.

## Recipe 3: ECC learning feeds Aegis's brain

ECC's instinct/learning exports and Aegis's `brain/quality/known-issues.md`
both track recurring patterns. Keep Aegis's quality log as the canonical,
cited record (every issue cites tool + command); use ECC's learning as a
source the 00d/import flow can mine — with `source:` citations, per Aegis's
honesty rules.

## Deliberate differences (don't try to merge these)

- Aegis will not ship a dashboard, a marketplace, or 278 skills — narrow,
  eval-tested surface is the point (66 skills, all passing `aegis eval`).
- ECC will not enforce pipeline state — if you need "did this really
  happen, in order, verified?", that's the Aegis layer.
