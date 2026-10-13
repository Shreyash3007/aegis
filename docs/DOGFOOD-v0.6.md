# DOGFOOD v0.6.0 — Aegis drives itself through the god-skill machinery

Date: 2026-10-13T11:39:27.038Z. Operator: OpenCode agent (runtime). Version: aegis 0.6.0.
Runs were recorded against three throwaway git repos under os.tmpdir();
logs below are real process exit codes, not assertions. Backends were
deterministic (JEV_BACKEND=mock); the judgment ring was still live-verified
against TypeSafe in the spike (commit 4defe53). Set AEGIS_HUMAN_TOKEN=1 for gate
approvals (the documented non-TTY escape hatch, recorded in state as
`human-token`).

**Verdict: 71 recorded steps, 0 unexpected exit code(s). All clean.**

| Gate | Evidence |
|---|---|
| Margin Format | `aegis lint-skills --all` -> 68/68 (Scenario A) |
| Trigger precision (mock) | plumbing recorded in Scenario A - mock judges nothing (exit 11 there is correct); live self-test measured 43/43 in the item-7 spike |
| Demo gate | refusal before approval, unlock after (Scenarios A + C) |
| Loop-until-clean | cycle 1 -> theater -> cycle 3 -> escalation (Scenario B) |
| Quarantine | oracle + clean refuse frozen lane; sibling passes (Scenario B) |
| Record memory | contradiction -> reconcile -> resolve; sealed lane -> promote (A + C) |
| Resume pack | memory summary line present (Scenario A) |
| Sync invariant | old transitions adopt DEMO gate (Scenario C) |

## Scenario A: greenfield pipeline, full machinery

Contracts, DEMO gate refusal/unlock, record memory with contradiction resolution, slice lane, judgment classify/triage, lint-skills + trigger eval, checkpoint/resume with memory line, walk to validate.

**Result: 43 expected-outcome steps, 1 informational, 0 unexpected.**

Context: each step ran exactly as shown; exit column is the real process exit code.

| Result | Step | Command | Evidence (first lines) |
|---|---|---|---|
| ✅ 0 | bootstrap .aegis + brain | `aegis init --yes` | OK Aegis initialized (env L1, platform opencode, RAM 2727/15897 MB free)<br>OK git hooks installed: pre-commit, post-commit, pre-push<br>OK skills installed: 69 files -> .aegis/skills/ \| brain templates: 5 |
| ✅ 0 | verify contracts committed against base | `aegis contracts` | OK contracts verified against local main; no remote - UNVERIFIED for PR merge |
| ✅ 0 | walk -> 00b | `aegis transition 00b` | OK transition 00a -> 00b recorded (edge 1/3, state-visits 1/3) |
| ✅ 0 | walk -> 01a | `aegis transition 01a` | OK transition 00b -> 01a recorded (edge 1/3, state-visits 1/3) |
| ✅ 4 | 01b refused: gate PRD open | `aegis transition 01b` | FAIL ILLEGAL: gate PRD (prd-freeze) OPEN - CLI refuses |
| ✅ 0 | human approves PRD | `aegis gate PRD --approve` | OK gate PRD approved and recorded |
| ✅ 0 | walk -> 01b | `aegis transition 01b` | OK transition 01a -> 01b recorded (edge 1/3, state-visits 1/3) |
| ✅ 0 | walk -> 01c | `aegis transition 01c` | OK transition 01b -> 01c recorded (edge 1/3, state-visits 1/3) |
| ✅ 0 | walk -> 02a | `aegis transition 02a` | OK transition 01c -> 02a recorded (edge 1/3, state-visits 1/3) |
| ✅ 4 | 02b refused: gate G1 open | `aegis transition 02b` | FAIL ILLEGAL: gate G1 (arch-freeze) OPEN - CLI refuses |
| ✅ 0 | human approves G1 | `aegis gate G1 --approve` | OK gate G1 approved and recorded |
| ✅ 0 | walk -> 02b | `aegis transition 02b` | OK transition 02a -> 02b recorded (edge 1/3, state-visits 1/3) |
| ✅ 0 | walk -> 02c | `aegis transition 02c` | OK transition 02b -> 02c recorded (edge 1/3, state-visits 1/3) |
| ✅ 4 | 03a refused: gate G2 open | `aegis transition 03a` | FAIL ILLEGAL: gate G2 (security-signoff) OPEN - CLI refuses |
| ✅ 0 | human approves G2 | `aegis gate G2 --approve` | OK gate G2 approved and recorded |
| ✅ 0 | walk -> 03a | `aegis transition 03a` | OK transition 02c -> 03a recorded (edge 1/3, state-visits 1/3) |
| ✅ 0 | walk -> 03b | `aegis transition 03b` | OK transition 03a -> 03b recorded (edge 1/3, state-visits 1/3) |
| ✅ 4 | 04a refused: gate DEMO open | `aegis transition 04a` | FAIL ILLEGAL: gate DEMO (demo-approval) OPEN - CLI refuses |
| ✅ 0 | record the non-UI demo artifact | `aegis demo record --kind contract --file docs/demo-contracts.md` | OK demo recorded: contract [docs/demo-contracts.md] - human approves: aegis gate DEMO --approve |
| ✅ 0 | gate shows OPEN until human allows | `aegis demo status` | demo: contract [docs/demo-contracts.md] (recorded 2026-10-13T11:38:29.768Z)<br>gate DEMO: OPEN - production lanes stay shut |
| ✅ 0 | human approves the demo gate | `aegis gate DEMO --approve` | OK gate DEMO approved and recorded |
| ✅ 0 | production lanes open | `aegis transition 04a` | OK transition 03b -> 04a recorded (edge 1/3, state-visits 1/3) |
| ✅ 0 | record a contract finding with citation | `aegis memory add --type finding --title cap 1000 enforced in store --body notes store throws beyond cap --cites src/contracts/notes.ts` | OK memory added: mem-0001 [finding/active/0.5] |
| ✅ 0 | record a conflicting assumption | `aegis memory add --type assumption --title no cap needed --body assumed unlimited --contradicts mem-0001` | OK memory added: mem-0002 [assumption/active/0.5] (reconcile mem-0003 opened vs mem-0001) |
| ✅ 0 | list shows the open reconcile task | `aegis memory list` | mem-0001 [finding/active/0.5] cap 1000 enforced in store (cites:1)<br>mem-0002 [assumption/active/0.5] no cap needed (UNEVIDENCED)<br>mem-0003 [reconcile/open/0.5] Reconcile mem-0002 vs mem-0001 (UNEVIDENCE |
| ✅ 0 | human resolves the contradiction (mem-0003) | `aegis memory reconcile mem-0003 --winner mem-0001 --resolution contract pins the cap` | OK memory reconciled: mem-0003 (winner: mem-0001, mem-0002 superseded) |
| ✅ 0 | spawn slice lane (N2 worktree) | `aegis slice create core-store` | OK slice core-store: worktree C:\Users\sakha\AppData\Local\Temp\aegis-dogfood-dE8Lf5-worktrees\core-store on aegis/slice-core-store (lane 1/2)<br>Preparing worktree (new branch 'aegis/slice-core-store') |
| ✅ 0 | lanes report the live slice | `aegis slice list` | live  core-store -> aegis/slice-core-store @ C:\Users\sakha\AppData\Local\Temp\aegis-dogfood-dE8Lf5-worktrees\core-store |
| ✅ 0 | slice lane closed | `aegis slice remove core-store` | OK slice core-store removed, lane closed |
| ✅ 0 | classify a chore (pattern = authority) | `aegis jev classify --file jev-classify.json` | backend: mock \| model: jev-mock \| latency: 0ms \| escalated: false<br>pattern: L2 (authority - fix/chore-class change (fast lane))<br>jev: L2 (conf=0.85) AGREE<br>OK classified "chore: rename a helper" |
| ✅ 0 | triage two findings at the 0.7 gate | `aegis jev triage --file jev-triage.json` | backend: mock \| model: jev-mock \| latency: 0ms \| escalated: true<br>REVERIFY f1 (p=0.287 conf=0.426): Answered at estimated confidence 0.426 < 0.7. Treat the answer as a prior, not a decision - reason it |
| ✅ 0 | 68 stock skills pass Margin Format | `aegis lint-skills --all` | lint-skills: 68/68 passed<br>OK all 68 skill files pass Margin Format |
| • 11 | trigger precision self-test (mock backend) | `aegis eval trigger` | trigger eval: 43 case(s), 43 skills in scope, backend mock, threshold 0.8<br>MISS(got 01c-design-system) 00-foundation: expected 00-foundation, got "01c-design-system" (conf=0.85)<br>MISS(got 05c-bug-huntin |
| ✅ 0 | walk -> 04b | `aegis transition 04b` | OK transition 04a -> 04b recorded (edge 1/3, state-visits 1/3) |
| ✅ 0 | walk -> 04c | `aegis transition 04c` | OK transition 04b -> 04c recorded (edge 1/3, state-visits 1/3) |
| ✅ 0 | G3 integration approved | `aegis gate G3 --approve` | OK gate G3 approved and recorded |
| ✅ 0 | walk -> 05a | `aegis transition 05a` | OK transition 04c -> 05a recorded (edge 1/3, state-visits 1/3) |
| ✅ 0 | walk -> 05b | `aegis transition 05b` | OK transition 05a -> 05b recorded (edge 1/3, state-visits 1/3) |
| ✅ 0 | walk -> 05c | `aegis transition 05c` | OK transition 05b -> 05c recorded (edge 1/3, state-visits 1/3) |
| ✅ 0 | walk -> 05d | `aegis transition 05d` | OK transition 05c -> 05d recorded (edge 1/3, state-visits 1/3) |
| ✅ 0 | walk -> 05e | `aegis transition 05e` | OK transition 05d -> 05e recorded (edge 1/3, state-visits 1/3) |
| ✅ 0 | checkpoint mid-validate | `aegis checkpoint` | OK checkpoint cp-1791891519764 written (git 59c79a3d, 10 files hashed) |
| ✅ 0 | resume pack: integrity + memory summary | `aegis resume` | RECONSTRUCTION PACK<br>  checkpoint: cp-1791891519764<br>  resume at skill: 05e<br>  memory: 1 active, 0 stale (re-verify), 0 open reconciles<br>  git HEAD at checkpoint: 59c79a3d<br>  integrity: VERIFIED (10 files |
| ✅ 0 | resume pack contains memory line | `resume output has memory: line` | memory: 1 active, 0 stale (re-verify), 0 open reconciles |

## Scenario B: loop-until-clean + quarantine (adversarial)

A poisoned slice (contract drift) cycles the clean gate; a frozen lane is refused while a sibling merges; a fixed slice re-verifies.

**Result: 12 expected-outcome steps, 0 informational, 0 unexpected.**

Context: each step ran exactly as shown; exit column is the real process exit code.

| Result | Step | Command | Evidence (first lines) |
|---|---|---|---|
| ✅ 0 | bootstrap .aegis + brain | `aegis init --yes` | OK Aegis initialized (env L1, platform opencode, RAM 2368/15897 MB free)<br>OK git hooks installed: pre-commit, post-commit, pre-push<br>OK skills installed: 69 files -> .aegis/skills/ \| brain templates: 5 |
| ✅ 0 | contracts merged (base unchanged here) | `aegis contracts` | OK contracts verified against local main; no remote - UNVERIFIED for PR merge |
| ✅ 9 | first verify: drift classified, cycle 1/3 | `aegis clean aegis/slice-poison` | FAIL clean FAIL aegis/slice-poison: CONTRACT-DRIFT @ 2dc99f8a (cycle 1/3)<br>warn: no recognized stack in target repo - typecheck oracle UNVERIFIED (advisory)<br>Preparing worktree (detached HEAD 49c61a2)<br>A |
| ✅ 5 | same SHA again: doubt-theater escalation | `aegis clean aegis/slice-poison` | FAIL clean ESCALATION aegis/slice-poison: doubt theater - re-verified 2dc99f8a with no new changes (same failure: CONTRACT-DRIFT)<br>evidence:<br>warn: no recognized stack in target repo - typecheck oracle |
| ✅ 9 | cycle 2/3 recorded under new SHA | `aegis clean aegis/slice-poison` | FAIL clean FAIL aegis/slice-poison: CONTRACT-DRIFT @ 0fb5b8ba (cycle 2/3)<br>warn: no recognized stack in target repo - typecheck oracle UNVERIFIED (advisory)<br>Preparing worktree (detached HEAD 49c61a2)<br>A |
| ✅ 5 | cycle 3/3 -> escalation (exit 5) | `aegis clean aegis/slice-poison` | FAIL clean ESCALATION aegis/slice-poison: 3/3 cycles exhausted (CONTRACT-DRIFT @ 2f8e9301)<br>evidence:<br>warn: no recognized stack in target repo - typecheck oracle UNVERIFIED (advisory)<br>Preparing worktre |
| ✅ 4 | freeze needs a human reason | `aegis quarantine freeze slice-poison` | FAIL quarantine freeze requires --reason <text> (audited, human-reviewed) |
| ✅ 0 | freeze the poisoned lane | `aegis quarantine freeze aegis/slice-poison --reason contract ownership dispute (needs human)` | OK quarantine frozen: aegis/slice-poison (-> aegis/slice-poison) - oracle refuses until: aegis quarantine clear aegis/slice-poison --reason "<why>" |
| ✅ 9 | oracle refuses quarantined paths | `aegis merge check aegis/slice-poison` | FAIL QUARANTINED aegis/slice-poison (frozen: contract ownership dispute (needs human)) - oracle refuses until a human clears: aegis quarantine clear aegis/slice-poison --reason "<why>" |
| ✅ 0 | sibling continues on last-good: clean PASS | `aegis clean aegis/slice-good` | OK clean PASSED aegis/slice-good (70923e4e, oracle exit 0, cycles reset) |
| ✅ 0 | clear with reason, cycles retained | `aegis quarantine clear aegis/slice-poison --reason human reviewed drift list` | OK quarantine cleared: aegis/slice-poison (3 clean cycle(s) retained) - oracle re-armed |
| ✅ 0 | fixed slice re-verifies through the gate | `aegis clean aegis/slice-poison` | OK clean PASSED aegis/slice-poison (c1de2ace, oracle exit 0, cycles reset) |

## Scenario C: brownfield + UI demo + sync invariant

UI demo needs html, iterate loop supersedes cleanly, memory lane sealing and promotion, sync merges the DEMO gate into an old transitions.json.

**Result: 14 expected-outcome steps, 1 informational, 0 unexpected.**

Context: each step ran exactly as shown; exit column is the real process exit code.

| Result | Step | Command | Evidence (first lines) |
|---|---|---|---|
| ✅ 0 | bootstrap .aegis + brain | `aegis init --yes` | OK Aegis initialized (env L1, platform opencode, RAM 2672/15897 MB free)<br>OK git hooks installed: pre-commit, post-commit, pre-push<br>OK skills installed: 69 files -> .aegis/skills/ \| brain templates: 5 |
| ✅ 0 | brownfield detected by init | `aegis status` | state: 00a \| lanes: 0/2 []<br>  -> 00b legal |
| ✅ 4 | UI demo needs an .html prototype | `aegis demo record --kind ui --file src/app.ts` | FAIL UI demo needs at least one .html prototype (palette, type, components, states, exact working style) |
| ✅ 0 | record the UI prototype | `aegis demo record --kind ui --file index.html` | OK demo recorded: ui [index.html] - human approves: aegis gate DEMO --approve |
| ✅ 0 | iterate the demo (unbounded loop, supersedes) | `aegis demo record --kind ui --file demo-v2.html` | OK demo recorded: ui [demo-v2.html] (supersedes prior demo record) - human approves: aegis gate DEMO --approve |
| ✅ 0 | approve the visual direction | `aegis gate DEMO --approve` | OK gate DEMO approved and recorded |
| • 4 | main record | `aegis memory add --type decision --title sqlite for memory index --body zero-dep FTS5 --cites src/lib/memory-index.ts` | FAIL cite target not found: src/lib/memory-index.ts (cites must resolve to repo files; URLs exempt) |
| ✅ 0 | lane-scoped record stays sealed | `aegis memory add --type finding --title lane note --body wip --lane ui-lane` | OK memory added: mem-0001 [finding/active/0.5] |
| ✅ 0 | default list hides lane scratch | `aegis memory list` | no memory records match |
| ✅ 0 | lane record sealed from default list | `memory list omits lane record` | no memory records match |
| ✅ 0 | merge-gate promotion moves lane record into main | `aegis memory promote --lane ui-lane` | OK memory promoted: 1 record(s) from lane ui-lane to the main store |
| ✅ 0 | promoted record visible | `aegis memory list` | mem-0001 [finding/active/0.5] lane note (UNEVIDENCED) |
| ✅ 0 | promoted record in default list | `memory list shows lane record` | mem-0001 [finding/active/0.5] lane note (UNEVIDENCED) |
| ✅ 0 | sync merges CLI invariant forward | `aegis sync` | OK AGENTS.md + CLAUDE.md synced (AEGIS block only - hand-written content preserved) \| transitions.json merged forward (DEMO gate on 04a entries) |
| ✅ 0 | DEMO gate restored by sync | `transitions.json has gate DEMO` | {"G1":"arch-freeze","G2":"security-signoff","G3":"integration","G4":"ship","PRD":"prd-freeze","DEMO":"demo-approval"} |
