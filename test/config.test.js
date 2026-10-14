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
