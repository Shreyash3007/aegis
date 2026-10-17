# Gates: v0.10 implementation audit and release

OWNS: src/**, test/**, scripts/**, docs/**, skills/**, brain/**, GATES.md, README.md, SETUP.md, CHANGELOG.md, package.json, package-lock.json, AGENTS.md, CLAUDE.md, .github/workflows/**

Scope: Audit the implemented CLI, its claims and forward roadmap; repair reproducible defects; verify and release v0.10. Aegis remains the only pipeline authority. This ledger is an acceptance checklist, not another orchestrator.

These are source-versioned gate definitions. Final evaluated observations are
published in the release evidence sidecar; a source commit cannot contain its
own future CI/publication result. Pending boxes do not invent that result.

v0.10.0 was published 2026-10-16 from `43ab0bd`; evaluated outcomes live in the
release-evidence sidecar attached to that tag. The 2026-10-17 post-release
audit repairs (test/audit-postrelease.test.js) fold into the next release.

- [ ] G1: Regression checks cover repaired refusal, integrity, filesystem and verification defects.
  CHECK: node scripts/check-audit.mjs
  EXPECT: AUDIT REGRESSIONS PASSED
  EVIDENCE: pending

- [ ] G2: The full test suite passes without skipped or weakened tests.
  CHECK: npm test
  EXPECT: fail 0
  EVIDENCE: pending

- [ ] G3: The complete installed skill corpus passes its deterministic lint.
  CHECK: node dist/cli.js lint-skills --all
  EXPECT: skill files pass Margin Format
  EVIDENCE: pending

- [ ] G4: The adversarial audit has zero findings, including new negative controls.
  CHECK: node scripts/audit.mjs
  EXPECT: audit: \d+ checks, 0 finding
  EVIDENCE: pending

- [ ] G5: The committed dependency graph has no known audit vulnerabilities.
  CHECK: npm audit
  EXPECT: found 0 vulnerabilities
  EVIDENCE: pending

- [ ] G6: A real disposable feature passes the test-first acceptance/review/merge/recovery exercise.
  CHECK: node scripts/self-cycle.mjs
  EXPECT: PASSED
  EVIDENCE: pending

- [ ] G7: Exact-final-commit CI and all seven release ritual checks pass on the versioned release candidate.
  CHECK: node scripts/release-check.mjs
  EXPECT: release-check: CLEARED to tag
  EVIDENCE: pending

- [ ] G8: The implementation inventory, severity ledger and revised v0.11 plan distinguish implemented, advisory, deferred and unmeasured outcomes without changing the release bar silently.
  EVIDENCE: pending

- [ ] G9: The v0.10-specific human ship gate is recorded, the immutable version tag is published, and release/site claims match its evidence.
  EVIDENCE: pending

- [ ] G10: The actual built asset installs offline without scripts and has the expected runtime versions, CLI behavior and digest.
  CHECK: node scripts/package-check.mjs
  EXPECT: PACKAGE VERIFIED
  EVIDENCE: pending
