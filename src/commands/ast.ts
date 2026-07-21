import fs from 'node:fs';
import path from 'node:path';
import { AEGIS_DIR, REPO, die, ok, readJ, writeJ } from '../lib/util.js';
import { buildGraph, dependentsOf, findCycles, renderModuleMap, ModuleGraph } from '../lib/astgraph.js';

const graphP = () => path.join(AEGIS_DIR, 'ast', 'module-graph.json');
const mapP = () => path.join(REPO, 'brain', 'architecture', 'module-map.md');

export function ast(args: string[]): void {
  const sub = args[0];
  if (sub === 'build') {
    const g = buildGraph();
    if (g.modules.length === 0) {
      console.log('no-AST mode: no tsconfig.json or no TS sources (O4) - AST features unavailable');
      return;
    }
    writeJ(graphP(), g);
    fs.mkdirSync(path.dirname(mapP()), { recursive: true });
    fs.writeFileSync(mapP(), renderModuleMap(g));
    const cycles = findCycles(g);
    ok(`module graph built: ${g.modules.length} modules (ts-morph, deterministic)`);
    if (cycles.length) {
      console.log(`CIRCULAR DEPENDENCIES (DAG violation, 02a):`);
      for (const c of cycles) console.log(`  ${c.join(' -> ')}`);
      process.exit(8);
    }
  } else if (sub === 'diff') {
    if (!fs.existsSync(graphP())) die(2, 'no stored graph - run aegis ast build first');
    const old = readJ<ModuleGraph>(graphP());
    const cur = buildGraph();
    const oldByFile = new Map(old.modules.map((m) => [m.file, m]));
    const curFiles = new Set(cur.modules.map((m) => m.file));
    const changes: string[] = [];
    for (const m of cur.modules) {
      const prev = oldByFile.get(m.file);
      if (!prev) changes.push(`ADDED: ${m.file}`);
      else if (prev.hash !== m.hash) {
        const deps = dependentsOf(old, m.file);
        changes.push(`CHANGED: ${m.file}${deps.length ? ` -> affects: ${deps.join(', ')}` : ''}`);
      } else if (prev.exports.join() !== m.exports.join()) {
        changes.push(`EXPORT-ONLY CHANGE: ${m.file}`);
      }
    }
    for (const f of oldByFile.keys()) if (!curFiles.has(f)) changes.push(`REMOVED: ${f}`);
    console.log('AST IMPACT DIFF');
    console.log(changes.length ? changes.map((c) => `  ${c}`).join('\n') : '  no changes');
  } else {
    die(2, 'usage: aegis ast <build|diff>');
  }
}
