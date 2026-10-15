# Test evidence: what the CLI proves

Run these commands from the main checkout. The branch must be checked out
in its slice worktree; the runner executes there. No second init is needed.

1. Commit the regression test while the behavior is broken.
2. Capture the failure:
   `aegis tdd red feature --test-file test/check.cjs --expect-exit 1 -- node test/check.cjs`
3. Implement the smallest fix without changing that test. Commit it.
4. Run `aegis tdd green feature`. This reruns the exact recorded argv.
5. Run `aegis clean feature --require-proof` before merging.

Repeated `--test-file` flags pin multiple files. The default capture timeout
is 60 seconds; an explicit `--timeout-ms` accepts 1 through 600000 for large
audited suites. The receipt pins the selected deadline and merged verification
uses it too; no loop automatically raises it. Use executable argv,
not shell syntax; for an npm script invoke Node with npm's CLI script path.
Credential-free output is stored under `.aegis/tdd/` and checkpoint-hashed.

## Pass/fail contract

- RED must match the declared nonzero exit. Timeouts, signals, startup errors
  and mismatched exits are refused, not counted as regression evidence.
- GREEN needs a new descendant commit and the same committed test content.
- Tests/source must be committed and the working tree clean before and after
  capture. Git's line-ending filters apply; hashes pin repository bytes.
- Every new commit makes the previous GREEN stale. Changed test content needs
  a new reviewed RED capture, not a silently weakened assertion.
- The oracle validates the receipt and reruns its command on the merged tree.
- An existing receipt is always enforced. `--require-proof` also refuses
  absent receipts. Legacy branches without this flag report TDD UNMEASURED.

These receipts prove observed ordering and recorded process outcomes. They
do **not** prove why a test failed, test adequacy, real-user acceptance, or
tamper resistance against an actor with unrestricted local shell access.
Review RED output and the assertion, not just a green status line.
