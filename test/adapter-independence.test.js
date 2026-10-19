// Adapter independence (06b review finding): each shipped host adapter is its
// own vertical slice. A sibling adapter may not import another adapter's
// internals - that couples R3a's file to R3c's and makes one host's change
// silently break another. Shared host primitives belong in a neutral module
// under src/lib or src/hosts.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const adaptersDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'src', 'adapters');
const adapters = fs.readdirSync(adaptersDir).filter((f) => f.endsWith('.ts'));

test('adapters: no adapter imports a sibling adapter', () => {
  assert.ok(adapters.length >= 3, `expected the shipped adapter set, found ${adapters.join(', ')}`);
  const violations = [];
  for (const file of adapters) {
    const src = fs.readFileSync(path.join(adaptersDir, file), 'utf8');
    const own = path.basename(file, '.ts');
    for (const m of src.matchAll(/from\s+'\.\/([^']+)\.js'/g)) {
      const target = m[1];
      if (target !== own && adapters.includes(`${target}.ts`)) violations.push(`${file} -> ${target}.ts`);
    }
  }
  assert.deepEqual(violations, [], `sibling adapter imports: ${violations.join(', ')}`);
});

test('adapters: shared host primitives live in a neutral module', () => {
  const shared = path.join(adaptersDir, '..', 'lib', 'host-primitives.ts');
  assert.ok(fs.existsSync(shared), 'src/lib/host-primitives.ts holds cross-host helpers');
  const src = fs.readFileSync(shared, 'utf8');
  // The module must not depend on any adapter (it is the shared floor).
  assert.doesNotMatch(src, /from\s+'\.\.\/adapters\//, 'host primitives never import an adapter');
  assert.match(src, /export function pathHits/, 'pathHits is a shared primitive');
});
