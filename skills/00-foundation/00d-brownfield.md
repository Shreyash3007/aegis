---
name: 00d-brownfield
version: 0.6.0
triggers: [brownfield import, reverse discovery, existing codebase ingest]
not-triggers: [greenfield start, re-authoring existing docs]
inputs: [existing repo, module graph, lint and audit output]
outputs: [INFERRED architecture docs, tool-cited known-issues, updated manifest]
chains-to: 01a-prd, 07a-tech-debt
autonomy: L1
tokens-budget: 1500
---
# SKILL-00d: BROWNFIELD REVERSE-DISCOVERY

## Overview
Generate the Living Brain FROM an existing codebase.
The code is the only honest documentation; every doc drafted from it is a hypothesis until a human confirms.

## When
- Setup interview Q2 = brownfield, with init complete and existing code present.
- L1+ for full extraction; at L0 the human runs commands and the agent infers from pasted output.

## When-NOT
- Never re-author what the repo already knows — harvest existing truth first.
- Never invent a persistence layer, boundary, or decision without code evidence.

## Process
- IMPORT BRIDGE FIRST: harvest `CLAUDE.md`, `AGENTS.md`, `DECISIONS.md`, `README.md`, `docs/`, ADRs, API specs, `package.json` scripts; cite each source: `aegis import check`
- Build the deterministic module graph of existing code: `aegis ast build`
- Infer module boundaries FROM THE GRAPH (edge clusters), stating evidence per boundary: `aegis ast build`
- Draft `brain/architecture/system.md` (components + data flow, INFERRED): `aegis checkpoint`
- Draft `brain/architecture/db-schema.md` from ORM models/migrations, else label "no persistence layer detected": `aegis checkpoint`
- Draft `brain/architecture/api-contracts.md` from route definitions: `aegis checkpoint`
- Baseline `brain/quality/known-issues.md` from REAL tool output, every issue tool-cited: `aegis validate`
- Confirm/correct each inference with the human, ONE topic at a time; label docs `INFERRED - CONFIRMED? yes/no`: `aegis import check`
- Verify the bridge (docs exist, cited or INFERRED-labeled; exit 4 until they do): `aegis import check`

## Verification
- Every structural claim cites file paths from the module graph; every issue cites tool + command.
- Unverifiable claims labeled INFERRED, never asserted.
- Self-check: claims without code evidence? folder names overruling the import graph? stale comments over code? invented database?

## Red Flags
- Repo too large for one pass -> partition by top-level feature dir, checkpoint between partitions.
- Conflicting evidence (comment says X, code does Y) -> record BOTH, ask human.
- Existing decision records beat fresh inferences; code is final arbiter on conflict.

## Interactions
- CLI: `aegis ast build`, `aegis ast diff`, `aegis checkpoint`, `aegis transition`, `aegis import check`
- Brain: read module graph + repo files; write `architecture/*`, `quality/known-issues.md`, manifest.
- Next: `01a-prd` (new features) or `07a-tech-debt` (hardening). Touchpoints: INFERRED confirmation, stack conflicts.
