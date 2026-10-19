# Host adapters (v0.11)

Aegis can register a **read-only** session hook in a supported AI host, so the
host prints the current pipeline position at the start of a session. Nothing
else: an adapter never gates tool calls, blocks commands, or writes pipeline
state from a host hook.

This page is the runbook for the shipped surface. Every command below was
executed against the shipped CLI; the quoted output is real.

## 1. What is shipped

```
$ aegis host list
claude-code	verified	Claude Code (1 event(s))
opencode	verified	OpenCode (1 event(s))
cursor	fixture-only	Cursor (1 event(s))
```

| Host | Status | Target | Event |
|---|---|---|---|
| Claude Code | `verified` — real 2.1.269 SessionStart smoke | `.claude/settings.json` (managed block) | `SessionStart` |
| OpenCode | `verified` — real v2.0.29 smoke | `.opencode/plugins/aegis.ts` (dedicated plugin file) | session context build |
| Cursor | `fixture-only` — no local Cursor, so no smoke was recorded | `.cursor/hooks.json` (managed entry) | `sessionStart` |

**`verified` means a real versioned host ran the hook and its output was
observed.** `fixture-only` means the adapter is tested against the documented
schema but no live host smoke exists. A capability is never advertised beyond
what was observed — see `docs/releases/v0.11/cursor-adapter-quality.json`.

## 2. Inspect before installing

```
aegis host inspect <id>
```

It prints the declaration as JSON: documented source URL and retrieval date,
the event binding, the exact command, supported and unsupported events, the
install strategy, a verification command, and the known limitations. Read the
`limitations` array — it is part of the contract, not decoration.

Unknown ids refuse with exit 2 and change nothing.

## 3. Install, verify, uninstall

```
aegis host install   <id>     # write the managed block
aegis host verify    <id>     # exit 0 present, 9 mismatch/absent
aegis host uninstall <id>     # remove only the managed block
```

What every adapter guarantees:

- **Only its own surface is written.** Claude Code and Cursor write a managed
  block/entry inside an existing config file; OpenCode writes one dedicated
  plugin file (`.opencode/plugins/aegis.ts`) and touches nothing else. Foreign
  hooks, comments, key order and formatting are preserved. Indentation is
  detected from the existing file rather than imposed.
- **A named backup is made before the first change** on files the adapter
  edits (`<config>.aegis-backup`), never overwritten afterwards.
- **Links are refused before any write.** A symlinked/junctioned config file
  exits 4 with nothing touched — Aegis never writes through links.
- **Ambiguity is refused, never guessed.** A stray or duplicated aegis-shaped
  entry, an existing backup without a managed entry, or a malformed config
  refuses with the reason and the manual next step.
- **Repeat install is a no-op.** No byte churn, no second backup, including
  CRLF and minified files.
- **Uninstall is minimal-diff.** Only the adapter's own surface is removed
  (managed entry, or the dedicated plugin file); emptied containers are pruned
  and foreign content is kept.

## 4. Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| `… is a link - Aegis never writes through links` (exit 4) | config file is a symlink/junction | replace it with a real file, then re-run |
| `a stray or duplicated aegis entry refuses` (exit 4) | hand-edited or double-installed block | remove the extra entry manually (or restore the backup), re-run |
| `a missing aegis on PATH is a warning, never a failure` | CLI not on `PATH` for the host process | add it to `PATH`, or install the shell form the adapter selected |
| `verify` exits 9 | managed block absent or changed | re-run `install`, then `verify` |
| unknown host (exit 2) | id not shipped in this build | `aegis host list` |

On Windows, a `.cmd`/`.ps1` shim cannot be exec-spawned by the host, so the
adapter selects the documented **shell form** (`aegis status`) instead of the
exec form. That is intentional, and the warning says so.

## 5. What this is not

- Not a scheduler, daemon, or background service.
- Not a hook that can approve gates or advance the pipeline.
- Not a claim of support for events the declaration lists as unsupported
  (`PreToolUse`, `PostToolUse`, `Stop`, `SessionEnd` for Claude Code). An
  unsupported event stays unsupported; a missing shell selects manual
  guidance rather than a fallback model.

## 6. Evidence

- `docs/releases/v0.11/claude-code-adapter-quality.json`
- `docs/releases/v0.11/opencode-adapter-quality.json`
- `docs/releases/v0.11/cursor-adapter-quality.json`
- `docs/releases/v0.11/host-capabilities-quality.json`
