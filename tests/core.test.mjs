import assert from 'node:assert/strict';
import { visibleIds, setAllCollapsed } from '../src/core/tree.js';
import { applyLayout, edgePath } from '../src/core/layout.js';
import { presentationOrder, rebuildPresentation, createPresentationSession } from '../src/core/presentation.js';
import { normalizeProject } from '../src/core/project.js';
import { applyMapAction } from '../src/core/commands.js';

function fixture(){
  return normalizeProject({
    id:'root',title:'Root',mapLayout:'balanced',uiTheme:'light',presentationOrder:[],collapsed:false,pos:{x:0,y:0},slideElements:[],
    master:{bgColor:'#fff',bgImage:null,bgFit:'cover',tocVisibility:'auto',tocSide:'left',defaultAnimation:'soft',elements:[]},
    children:[
      {id:'a',title:'A',collapsed:false,pos:{x:0,y:0},slideElements:[],children:[
        {id:'a1',title:'A1',collapsed:false,pos:{x:0,y:0},slideElements:[],children:[]},
        {id:'a2',title:'A2',collapsed:false,pos:{x:0,y:0},slideElements:[],children:[]},
      ]},
      {id:'b',title:'B',collapsed:false,pos:{x:0,y:0},slideElements:[],children:[
        {id:'b1',title:'B1',collapsed:false,pos:{x:0,y:0},slideElements:[],children:[]},
      ]},
    ],
  });
}

{
  const p=fixture();
  assert.deepEqual(visibleIds(p),['root','a','a1','a2','b','b1']);
  p.children[0].collapsed=true;
  assert.deepEqual(visibleIds(p),['root','a','b','b1']);
  assert.deepEqual(presentationOrder(p),['root','a','b','b1']);
}
{
  const p=fixture();p.children[0].collapsed=true;applyLayout(p,'right');
  assert.equal(p.children[0].pos.x,330);assert.equal(p.children[1].pos.x,330);assert.equal(p.children[0].children[0].pos.x,0);
}
{
  const p=fixture();applyLayout(p,'down');assert.equal(p.children[0].pos.y,245);assert.equal(p.children[0].children[0].pos.y,490);assert.match(edgePath({x:0,y:0},{x:0,y:245},'down'),/^M /);
}
{
  const p=fixture();p.children[0].collapsed=true;const rebuilt=rebuildPresentation(p,'a2',2);assert.equal(rebuilt.order.length,4);assert.equal(rebuilt.order[rebuilt.index],'a');
}
{
  const p=fixture();setAllCollapsed(p,true);assert.equal(p.collapsed,false);assert.deepEqual(visibleIds(p),['root','a','b']);setAllCollapsed(p,false);assert.equal(visibleIds(p).length,6);
}
{
  const p=fixture();const session=createPresentationSession(p,'a2');assert.equal(session.currentId(),'a2');session.toggleCollapsed('a');assert.equal(session.currentId(),'a');session.next();assert.equal(session.currentId(),'b');
}
{
  const p=fixture();
  let result=applyMapAction(p,'a','first-child');assert.equal(result.selectedId,'a1');
  result=applyMapAction(p,'a1','next-sibling');assert.equal(result.selectedId,'a2');
  result=applyMapAction(p,'a2','parent');assert.equal(result.selectedId,'a');
  result=applyMapAction(p,'root','delete');assert.equal(result.blocked,'root-delete');
}
console.log('MindDeck core regression tests: OK');
