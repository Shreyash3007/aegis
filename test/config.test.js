// config tiers + shape discipline: model_standard/light exist like
// model_strong (00b promises all three tiers), bad values exit 2.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { scratch, aegis } from './helpers.js';

test('config set model tiers: all three settable, bad values refused', (t) => {
  const dir = scratch(t);
  for (const [k, v] of [['model_strong', 's'], ['model_standard', 'm'], ['model_light', 'l']]) {
    const r = aegis(dir, ['config', 'set', k, v]);
    assert.equal(r.status, 0, r.stderr);
  }
  const cfg = JSON.parse(aegis(dir, ['config']).stdout);
  assert.equal(cfg.model_tiers.strong, 's');
  assert.equal(cfg.model_tiers.standard, 'm');
  assert.equal(cfg.model_tiers.light, 'l');
  assert.equal(aegis(dir, ['config', 'set', 'autonomy', 'godmode']).status, 2);
  assert.equal(aegis(dir, ['config', 'set', 'bogus-key', 'v']).status, 2);
});

// 05b finding (confused persona): a valid key with no value, and no key at
// all, both used to report "unknown key" - the second case even listing the
// very key it called unknown. The message must name the real problem.
test('config set: missing value and missing key are named honestly', (t) => {
  const dir = scratch(t);
  const noValue = aegis(dir, ['config', 'set', 'quality_profile']);
  assert.equal(noValue.status, 2);
  assert.match(noValue.stderr, /quality_profile needs a value/);
  assert.doesNotMatch(noValue.stderr, /unknown key/);

  const noKey = aegis(dir, ['config', 'set']);
  assert.equal(noKey.status, 2);
  assert.match(noKey.stderr, /usage: aegis config set <key> <value>/);
  assert.doesNotMatch(noKey.stderr, /unknown key/);

  const unknown = aegis(dir, ['config', 'set', 'bogus-key', 'v']);
  assert.equal(unknown.status, 2);
  assert.match(unknown.stderr, /unknown key 'bogus-key'/);

  // the valid-value path still works after the message change
  assert.equal(aegis(dir, ['config', 'set', 'quality_profile', 'legacy']).status, 0);
  assert.equal(JSON.parse(aegis(dir, ['config']).stdout).quality_profile, 'legacy');
});
