import { test } from 'node:test';
import assert from 'node:assert/strict';
import { scratch, aegis, readState } from './helpers.js';

test('audit: configured lane cap changes the actual global throttle and rejects malformed limits', (t) => {
  const dir = scratch(t);
  assert.equal(aegis(dir, ['config', 'set', 'human_lane_cap', '1']).status, 0);
  assert.equal(readState(dir).lanes.max, 1);
  assert.equal(aegis(dir, ['slice', 'create', 'one']).status, 0);
  assert.equal(aegis(dir, ['slice', 'create', 'two']).status, 4);
  assert.equal(aegis(dir, ['config', 'set', 'human_lane_cap', 'nonsense']).status, 2);
  assert.equal(aegis(dir, ['config', 'set', 'human_lane_cap', '0']).status, 2);
});

test('audit: contract paths reject Windows absolute paths on every platform', (t) => {
  const dir = scratch(t);
  assert.equal(aegis(dir, ['config', 'set', 'contracts_path', 'C:\\foreign\\contracts']).status, 2);
  assert.equal(aegis(dir, ['config', 'set', 'apps', 'web']).status, 0);
  assert.equal(aegis(dir, ['config', 'set', 'contracts_path.web', '\\\\server\\share\\contracts']).status, 2);
});
