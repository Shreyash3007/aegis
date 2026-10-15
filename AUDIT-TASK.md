# v0.10 state/filesystem repair contract

Aegis conductor owns this task. This is one isolated slice, not a second
orchestrator. Do not change root pipeline state or approve gates.

## Artifact and authority

- Read-only findings: `C:/Users/sakha/AppData/Local/Temp/opencode/aegis-v010-state-fs-review.md`.
- Preserve user work; no forced worktree removal, unsafe path traversal,
  silent legacy-record deletion, or claims beyond reproduced evidence.
- Reproduce before fixing. Associated tests must remain intact. Append new
  regressions in `test/audit-state-fs.test.js` and a portable focused runner.

## Exclusive ownership

Only `src/lib/state.ts`, `src/lib/hashes.ts`, `src/lib/lock.ts`,
`src/lib/owned-path.ts`, `src/commands/state.ts`, `src/commands/slice.ts`,
`src/commands/persist.ts`, `src/commands/memory.ts`, `src/commands/remove.ts`,
`test/audit-state-fs.test.js`, `scripts/check-state-audit.mjs`, and this file.
Do not edit CLI/contracts, other tests, docs, versions, hooks or dependencies.
All work happens in this registered worktree, never the main tree.

## Required observable outcomes

1. Dirty/untracked and Git-locked worktrees cannot be discarded or forgotten.
   Validate slice identifiers and registered owned paths before filesystem actions.
2. Migration preserves conflicting sources and only removes files proven copied.
   Uninstall refuses unresolved/unmigrated legacy truth and races with slice
   lifecycle changes safely; fail closed on unreadable active state.
3. Memory lane operations cannot escape owned paths, including through links.
   Store writes serialize ID allocation and full transactions, validate all
   referenced records before writing, and publish rewrites atomically.
4. Dead-lock recovery serializes reclaimers, never steals a live lock by age,
   and releases only owned locks, including on ordinary refusals/process exit.
   `next` must be read-only while retaining multi-app selection requirements.
5. Integrity includes added files and runtime configuration, rejects link
   traversal, and never reconstructs a pipeline position from a different
   state version than the one hashed. Checkpoint IDs cannot collide under
   concurrent writers.

If adding a lock helper, expose `lockFile(path): () => void` and
`withFileLock<T>(path, action: () => T): T` so other slices can use it. Preserve
existing public state helper signatures. Do not install a new dependency.

## Verification and handback

Run build, focused new tests and existing state/transition/checkpoint/memory/
lane/remove/concurrency tests. Keep failing and passing outputs outside the
repo in approved Temp paths. Commit explicit owned paths (regression then
fix). No merge, push, release or root-state mutation: return commit hashes,
checks/results, remaining caveats and exact report paths to the conductor.

## Slice handback

- Implemented the reviewed preservation, path-containment, serialized memory
  transaction, owned-lock recovery and checkpoint-integrity repairs within
  the exclusive file list. Public state helper signatures are unchanged.
- Regression-first baseline: `node scripts/check-state-audit.mjs --new-only`
  reproduced failures before source edits. Evidence:
  `C:/Users/sakha/AppData/Local/Temp/opencode/aegis-state-audit-TDVe13/tests.log`.
- Final verification: `node scripts/check-state-audit.mjs` built successfully
  and passed 103 tests, with no failures or skips. Build/test logs:
  `C:/Users/sakha/AppData/Local/Temp/opencode/aegis-state-audit-IHYH5N/build.log`
  and `C:/Users/sakha/AppData/Local/Temp/opencode/aegis-state-audit-IHYH5N/tests.log`.
- Additional reproduced edge cases cover ignored local slice files, dangling
  reconcile parties, cross-store legacy ID conflicts, pending transactions,
  journal replay/conflicts and raw-lock reclamation independent of lifecycle.
- Lock API: `lockFile(resource)` acquires `<resource>.lock` and returns an
  idempotent release callback; `withFileLock(resource, action)` is synchronous.
  Both are process-reentrant and restricted to repo-owned resources. Shared
  lifecycle resource: exported `lifecyclePath`, outside `.aegis/`.
- Deliberate fail-closed behavior: malformed locks and crashed reclaimer
  guards require ownership investigation; live locks are never age-stolen.
  Uninstall/integrity verification refuse pending memory journals. Existing
  checkpoints without configuration hashes require a fresh checkpoint.
- Lifecycle coordination covers participants changed in this slice and
  callers of `acquireState`. Unowned standalone writers must opt into the
  same lifecycle mutex if they can run concurrently with uninstall.
- No worktree `.aegis` initialization, main-state mutation, merge or push.
  Commits use a per-command empty hooks path to avoid shared hooks writing
  main-state checkpoints. Conductor retains merge-oracle responsibility.
