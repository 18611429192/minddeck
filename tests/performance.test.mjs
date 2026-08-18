import assert from 'node:assert/strict';
import { performance } from 'node:perf_hooks';
import { normalizeProject } from '../src/core/project.js';
import { applyLayout, LAYOUTS } from '../src/core/layout.js';
import { presentationOrder } from '../src/core/presentation.js';
import { inspectProject } from '../src/core/diagnostics.js';

function makeProject(count) {
  let id = 0;
  const root = { id: 'root', title: 'Root', mapLayout: 'balanced', uiTheme: 'light', presentationOrder: [], collapsed: false, pos: {x:0,y:0}, slideElements: [], master: {tocVisibility:'auto',tocSide:'left',elements:[]}, children: [] };
  const queue = [root];
  while (id < count - 1) {
    const parent = queue.shift() || root;
    const childCount = Math.min(3, count - 1 - id);
    for (let i = 0; i < childCount; i++) {
      id += 1;
      const child = { id: `n${id}`, title: `Node ${id}`, collapsed: false, pos: {x:0,y:0}, slideElements: [], children: [] };
      parent.children.push(child); queue.push(child);
    }
  }
  return normalizeProject(root);
}

for (const size of [10, 50, 120, 250]) {
  const project = makeProject(size);
  const start = performance.now();
  for (const layout of LAYOUTS) applyLayout(project, layout);
  const order = presentationOrder(project);
  const report = inspectProject(project);
  const elapsed = performance.now() - start;
  assert.equal(order.length, size);
  assert.equal(report.fail, 0);
  assert.ok(elapsed < 5000, `${size} node regression took too long: ${elapsed.toFixed(1)}ms`);
  console.log(`Performance ${size} nodes: ${elapsed.toFixed(1)}ms`);
}
console.log('MindDeck performance regression: OK');
