# Calibration bank v1

`tasks.json` freezes development scenarios for later trials. Its content hash
is pinned by `test/eval-bank.test.js`. Change the version and append a successor
bank when changing tasks; do not silently tune this bank to a successful run.

These tasks were designed alongside the implementation. They are **not** an
independent held-out benchmark, and there are no raw/Superpowers/Aegis outcome
comparisons yet. A credible later case study needs separately selected tasks,
executor runs, independent grading, and reported failures and confidence limits.

Each check is binary: supporting run evidence earns PASS, contradicted evidence
earns FAIL, and absent evidence is UNMEASURED (does not earn PASS). Never derive
a quality score from task completion or gate traversal alone.

Public study prose belongs under `docs/` (the Pages site), not in runtime skills.
Keep private trajectories and grading data local; publish only consented,
redacted aggregates with task-bank and tool/model versions attached.
