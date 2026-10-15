import { test } from 'node:test';
import assert from 'node:assert/strict';
import { braceExpand } from 'minimatch';

test('glob parser: ordinary brace patterns preserve expected alternatives', () => {
  assert.deepEqual(braceExpand('src/{one,two}.ts'), ['src/one.ts', 'src/two.ts']);
});

test('glob parser: deeply nested brace input is bounded rather than overflowing the stack', () => {
  const input = '{'.repeat(6000) + 'a,b' + '}'.repeat(6000);
  assert.doesNotThrow(() => braceExpand(input));
});
