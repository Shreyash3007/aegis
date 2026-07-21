# SKILL-00d: BROWNFIELD REVERSE-DISCOVERY

## Expert Persona
Legacy Systems Archaeologist (ex-ThoughtWorks). "The code is the only honest
documentation. Every doc I write from it is a hypothesis until a human confirms."

## Purpose
Generate the Living Brain FROM an existing codebase - the real FinTree use case.

## Trigger
Setup interview Q2 = brownfield (00b routes here).

## Entry Criteria
- `aegis init` complete; existing code present; config `project_type=brownfield`.

## Environment Requirements
L1+ for full extraction (needs `aegis ast build`). At L0: human runs commands,
agent infers from pasted output.

## Input Schema
- Existing repo (any state of documentation)
- `aegis ast build` output (module graph)
- Lint/tsc/dependency-audit output where available

## Execution Steps
0. IMPORT BRIDGE FIRST - never re-author what the repo already knows. Harvest
   existing truth BEFORE inferring from code: `CLAUDE.md`, `AGENTS.md`,
   `DECISIONS.md`, `README.md`, `docs/`, ADRs, OpenAPI/GraphQL specs,
   `package.json` scripts. For each brain doc you draft, mine these first and
   cite the source (`source: DECISIONS.md#auth-choice`). Code remains the
   final arbiter on conflict (record BOTH, ask human) - but an existing
   decision record beats a fresh inference every time. Skipping this step
   duplicates months of accumulated context into a second, weaker format.
1. `aegis ast build` - deterministic module graph of the existing code.
2. Infer module boundaries FROM THE GRAPH (clusters of edges), not from folder
   names alone. State the evidence for each boundary.
3. Draft `brain/architecture/system.md` - components + data flow as inferred.
4. Draft `brain/architecture/db-schema.md` - from ORM models/migrations if present;
   otherwise label "no persistence layer detected" (never invent one).
5. Draft `brain/architecture/api-contracts.md` - from route definitions.
6. Baseline `brain/quality/known-issues.md` from REAL tool output: tsc errors,
   lint warnings, dependency audit. Every issue cites its tool + command.
7. Interview the human to confirm/correct each inference, ONE topic at a time.
8. Label every drafted doc `INFERRED - CONFIRMED? yes/no` until confirmed.
9. `aegis import check` - verify the bridge: every required brain doc exists
   and carries source citations or INFERRED labels. Exit 4 until they do.

## Self-Critique Protocol (Deep)
"Which of my claims has NO code evidence? Did folder names seduce me into a
boundary the import graph contradicts? Am I trusting stale comments over code?
Did I invent a database that isn't there?"

## Error Escalation Protocol
- Repo too large for one pass -> partition by top-level feature dir; process
  incrementally; checkpoint between partitions.
- Conflicting evidence (comment says X, code does Y) -> record BOTH, ask human.

## Output Schema
- `brain/architecture/{system,db-schema,api-contracts}.md` (labeled INFERRED)
- `brain/quality/known-issues.md` (baseline, tool-cited)
- `brain/context/manifest.md` updated with detected stack (evidence-linked)

## Measurement Citations
Every structural claim cites file paths from the module graph. Every issue
cites tool + command. Unverifiable claims are labeled INFERRED, never asserted.

## CLI Contract
- Runtime: `aegis ast build`, `aegis ast diff`, `aegis checkpoint`, `aegis transition`, `aegis import check`
- Manual: human runs; agent works from pasted module-map.md.

## Brain Files
Read: module graph, repo files | Write: architecture/*, quality/known-issues.md, manifest

## Next Skill
01a (new features on top of the existing system) or 07a (hardening first)

## Human Touchpoints
Confirmation of every INFERRED document (APPROVAL tier). Stack conflicts.
