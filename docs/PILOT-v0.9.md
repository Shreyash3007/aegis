# Pilot v0.9.0 - pipeline walked with zero provider credentials

Date: 2026-10-14T18:06:48.980Z. Repo: throwaway git under os.tmpdir(). Executor: frontier-class agent (residual variable, stated).
Environment: TYPESAFE_API_KEY, AEGIS_JUDGE_*, OPENROUTER_API_KEY, AI_GATEWAY_API_KEY, OPENAI_API_KEY, ANTHROPIC_API_KEY all deleted; JEV_BACKEND=mock. No step in this walk can reach a frontier model - judgments ran the deterministic mock, gates ran human-token approvals, verification ran local tools.

**Result: 42/42 steps as expected - shipped 08b.**

| Result | Step | Command | Evidence |
|---|---|---|---|
| ✅ 0 | bootstrap | `aegis init --yes` | OK Aegis initialized (env L1, platform opencode, RAM 6880/15897 MB free) |
| ✅ 0 | contracts merged | `aegis contracts` | OK contracts verified against local main; no remote - UNVERIFIED for PR merge |
| ✅ 0 | walk -> 00b | `aegis transition 00b` | OK transition 00a -> 00b recorded (edge 1/3, state-visits 1/3) |
| ✅ 0 | walk -> 01a | `aegis transition 01a` | OK transition 00b -> 01a recorded (edge 1/3, state-visits 1/3) |
| ✅ 4 | refused on PRD | `aegis transition 01b` | FAIL ILLEGAL: gate PRD (prd-freeze) OPEN \| approve: aegis gate PRD --approve - CLI refuses |
| ✅ 0 | human approves PRD | `aegis gate PRD --approve` | OK gate PRD approved and recorded |
| ✅ 0 | walk -> 01b | `aegis transition 01b` | OK transition 01a -> 01b recorded (edge 1/3, state-visits 1/3) |
| ✅ 0 | walk -> 01c | `aegis transition 01c` | OK transition 01b -> 01c recorded (edge 1/3, state-visits 1/3) |
| ✅ 0 | walk -> 02a | `aegis transition 02a` | OK transition 01c -> 02a recorded (edge 1/3, state-visits 1/3) |
| ✅ 4 | refused on G1 | `aegis transition 02b` | FAIL ILLEGAL: gate G1 (arch-freeze) OPEN \| approve: aegis gate G1 --approve - CLI refuses |
| ✅ 0 | human approves G1 | `aegis gate G1 --approve` | OK gate G1 approved and recorded |
| ✅ 0 | walk -> 02b | `aegis transition 02b` | OK transition 02a -> 02b recorded (edge 1/3, state-visits 1/3) |
| ✅ 0 | walk -> 02c | `aegis transition 02c` | OK transition 02b -> 02c recorded (edge 1/3, state-visits 1/3) |
| ✅ 4 | refused on G2 | `aegis transition 03a` | FAIL ILLEGAL: gate G2 (security-signoff) OPEN \| approve: aegis gate G2 --approve - CLI refuses |
| ✅ 0 | human approves G2 | `aegis gate G2 --approve` | OK gate G2 approved and recorded |
| ✅ 0 | walk -> 03a | `aegis transition 03a` | OK transition 02c -> 03a recorded (edge 1/3, state-visits 1/3) |
| ✅ 0 | walk -> 03b | `aegis transition 03b` | OK transition 03a -> 03b recorded (edge 1/3, state-visits 1/3) |
| ✅ 4 | 04a refused pre-demo | `aegis transition 04a` | FAIL ILLEGAL: gate DEMO (demo-approval) OPEN \| approve: aegis gate DEMO --approve - CLI refuses |
| ✅ 0 | record demo | `aegis demo record --kind contract --file docs/demo.md` | OK demo recorded: contract [docs/demo.md] - human approves: aegis gate DEMO --approve |
| ✅ 0 | approve DEMO | `aegis gate DEMO --approve` | OK gate DEMO approved and recorded (artifact pinned) |
| ✅ 0 | lanes open | `aegis transition 04a` | OK transition 03b -> 04a recorded (edge 1/3, state-visits 1/3) |
| ✅ 0 | spawn lane | `aegis slice create greet` | OK slice greet: worktree C:\Users\sakha\AppData\Local\Temp\aegis-pilot-E4YBRu-worktrees\greet on aegis/slice-greet (lane |
| ✅ 0 | clean PASS | `aegis clean aegis/slice-greet` | OK clean PASSED aegis/slice-greet (04905a76, oracle exit 0, cycles reset) |
| ✅ 0 | 04b | `aegis transition 04b` | OK transition 04a -> 04b recorded (edge 1/3, state-visits 1/3) |
| ✅ 0 | 04c | `aegis transition 04c` | OK transition 04b -> 04c recorded (edge 1/3, state-visits 1/3) |
| ✅ 4 | refused on G3 | `aegis transition 05a` | FAIL ILLEGAL: gate G3 (integration) OPEN \| approve: aegis gate G3 --approve - CLI refuses |
| ✅ 0 | human approves G3 | `aegis gate G3 --approve` | OK gate G3 approved and recorded |
| ✅ 0 | walk -> 05a | `aegis transition 05a` | OK transition 04c -> 05a recorded (edge 1/3, state-visits 1/3) |
| ✅ 0 | walk -> 05b | `aegis transition 05b` | OK transition 05a -> 05b recorded (edge 1/3, state-visits 1/3) |
| ✅ 0 | walk -> 05c | `aegis transition 05c` | OK transition 05b -> 05c recorded (edge 1/3, state-visits 1/3) |
| ✅ 0 | walk -> 05d | `aegis transition 05d` | OK transition 05c -> 05d recorded (edge 1/3, state-visits 1/3) |
| ✅ 0 | walk -> 05e | `aegis transition 05e` | OK transition 05d -> 05e recorded (edge 1/3, state-visits 1/3) |
| ✅ 0 | walk -> 06b | `aegis transition 06b` | OK transition 05e -> 06b recorded (edge 1/3, state-visits 1/3) |
| ✅ 0 | walk -> 07a | `aegis transition 07a` | OK transition 06b -> 07a recorded (edge 1/3, state-visits 1/3) |
| ✅ 0 | walk -> 07b | `aegis transition 07b` | OK transition 07a -> 07b recorded (edge 1/3, state-visits 1/3) |
| ✅ 0 | walk -> 07c | `aegis transition 07c` | OK transition 07b -> 07c recorded (edge 1/3, state-visits 1/3) |
| ✅ 0 | walk -> 08a | `aegis transition 08a` | OK transition 07c -> 08a recorded (edge 1/3, state-visits 1/3) |
| ✅ 4 | refused on G4 | `aegis transition 08b` | FAIL ILLEGAL: gate G4 (ship) OPEN \| approve: aegis gate G4 --approve - CLI refuses |
| ✅ 0 | human approves G4 | `aegis gate G4 --approve` | OK gate G4 approved and recorded |
| ✅ 0 | shipped | `aegis transition 08b` | OK transition 08a -> 08b recorded (edge 1/3, state-visits 1/3) |
| ✅ 0 | checkpoint | `aegis checkpoint --quiet` |  |
| ✅ 0 | resume verifies | `aegis resume` | RECONSTRUCTION PACK |

## What this proves (and does not)

- Proves: the full 00a-08b pipeline, all six gates, N1 contracts, demo gate, slice lane, clean oracle PASS, checkpoint/resume - with no frontier in any gate, judge, or verify role and no network.
- Does NOT prove: executor-model variance. A small/free executor may fumble skill-following where a frontier model compensates. That trial needs a small model driving; it is explicitly unrun.