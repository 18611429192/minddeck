import assert from 'node:assert/strict';
import { visibleIds, setAllCollapsed } from '../src/core/tree.js';
import { applyLayout, edgePath } from '../src/core/layout.js';
import { presentationOrder, rebuildPresentation } from '../src/core/presentation.js';
import { normalizeProject } from '../src/core/project.js';

function fixture() {
  return normalizeProject({
    id: 'root', title: 'Root', mapLayout: 'balanced', presentationOrder: [], collapsed: false, pos: {x:0,y:0},
    children: [
      { id: 'a', title: 'A', collapsed: false, pos: {x:0,y:0}, children: [
        { id: 'a1', title: 'A1', collapsed: false, pos: {x:0,y:0}, children: [] },
        { id: 'a2', title: 'A2', collapsed: false, pos: {x:0,y:0}, children: [] },
      ]},
      { id: 'b', title: 'B', collapsed: false, pos: {x:0,y:0}, children: [
        { id: 'b1', title: 'B1', collapsed: false, pos: {x:0,y:0}, children: [] },
      ]},
    ],
  });
}

{
  const p = fixture();
  assert.deepEqual(visibleIds(p), ['root','a','a1','a2','b','b1']);
  p.children[0].collapsed = true;
  assert.deepEqual(visibleIds(p), ['root','a','b','b1']);
  assert.deepEqual(presentationOrder(p), ['root','a','b','b1']);
}

{
  const p = fixture();
  p.children[0].collapsed = true;
  applyLayout(p, 'right');
  assert.equal(p.children[0].pos.x, 330);
  assert.equal(p.children[1].pos.x, 330);
  // Hidden grandchildren must not occupy visible layout slots.
  assert.equal(p.children[0].children[0].pos.x, 0);
}

{
  const p = fixture();
  applyLayout(p, 'down');
  assert.equal(p.children[0].pos.y, 245);
  assert.equal(p.children[0].children[0].pos.y, 490);
  assert.match(edgePath({x:0,y:0},{x:0,y:245},'down'), /^M /);
}

{
  const p = fixture();
  const before = presentationOrder(p);
  assert.equal(before.length, 6);
  p.children[0].collapsed = true;
  const rebuilt = rebuildPresentation(p, 'a2', 2);
  assert.equal(rebuilt.order.length, 4);
  assert.equal(rebuilt.order[rebuilt.index], 'a');
}

{
  const p = fixture();
  setAllCollapsed(p, true);
  assert.equal(p.collapsed, false);
  assert.equal(p.children[0].collapsed, true);
  assert.deepEqual(visibleIds(p), ['root','a','b']);
  setAllCollapsed(p, false);
  assert.equal(visibleIds(p).length, 6);
}

console.log('MindDeck core regression tests: OK');
