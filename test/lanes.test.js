// Lane cap (N5): default cap is 2; the third slice is refused.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { scratch, aegis } from './helpers.js';

test('lane cap: two slices open, third refused (exit 4)', (t) => {
  const dir = scratch(t);
  for (const name of ['alpha', 'beta']) {
    const r = aegis(dir, ['slice', 'create', name]);
    assert.equal(r.status, 0, r.stderr);
  }
  const third = aegis(dir, ['slice', 'create', 'gamma']);
  assert.equal(third.status, 4);
  assert.match(third.stderr, /LANE CAP: 2\/2/);
});
