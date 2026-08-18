import assert from 'node:assert/strict';
import { normalizeProject } from '../src/core/project.js';
import { inspectProject } from '../src/core/diagnostics.js';

function projectFixture() {
  return normalizeProject({
    id: 'root', title: 'Root', mapLayout: 'balanced', presentationOrder: [], collapsed: false,
    pos: { x: 0, y: 0 }, slideElements: [],
    master: { tocVisibility: 'auto', tocSide: 'left', elements: [] },
    children: [
      { id: 'a', title: 'A', collapsed: false, pos: { x: 0, y: 0 }, slideElements: [
        { id: 'e1', type: 'text', x: 20, y: 30, w: 300, h: 100, z: 1000 },
      ], children: [] },
    ],
  });
}

{
  const report = inspectProject(projectFixture());
  assert.equal(report.fail, 0);
  assert.equal(report.nodeCount, 2);
  assert.equal(report.visibleCount, 2);
  assert.ok(report.score >= 95);
}

{
  const p = projectFixture();
  p.children.push({ ...structuredClone(p.children[0]), title: 'Duplicate A' });
  const report = inspectProject(p);
  assert.ok(report.fail >= 1);
  assert.ok(report.results.some(item => item.name === '节点唯一性' && item.level === 'fail'));
}

{
  const p = projectFixture();
  p.presentationOrder = ['root', 'missing'];
  const report = inspectProject(p);
  assert.ok(report.warn >= 1);
  assert.ok(report.results.some(item => item.name === '演示顺序' && item.level === 'warn'));
}

{
  const p = projectFixture();
  p.children[0].slideElements[0].w = 0;
  const report = inspectProject(p);
  assert.ok(report.results.some(item => item.name === '页面几何' && item.level === 'fail'));
}

console.log('MindDeck diagnostics tests: OK');
