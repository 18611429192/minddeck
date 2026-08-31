import test from 'node:test';
import assert from 'node:assert/strict';
import { RichLayout } from '../src/runtime/modules/composer/rich-layout.js';

const header={id:'title',type:'text',x:112,y:120,w:1200,h:90,z:1000,text:'Title'};
const leftCard={id:'left',type:'shape',x:112,y:320,w:610,h:410,z:1001};
const leftText={id:'left-text',type:'text',x:150,y:370,w:520,h:260,z:1002,text:'Narrative'};
const rightCard={id:'right',type:'shape',x:782,y:320,w:610,h:410,z:1003};
const rightText={id:'right-text',type:'text',x:820,y:370,w:520,h:260,z:1004,text:'Visual placeholder'};
const reference=[header,leftCard,leftText,rightCard,rightText];

function rich(type='chart'){return {id:'rich',type,x:112,y:292,w:1280,h:470,z:1100}}

test('rich body uses a semantic split slot instead of fixed legacy geometry',()=>{
  const elements=RichLayout.reflowElements([header,rich('chart')],reference,{params:{visualWeight:1}});
  const chart=elements.find(item=>item.type==='chart');
  assert.ok(chart);
  assert.notDeepEqual([chart.x,chart.y,chart.w,chart.h],[112,292,1280,470]);
  assert.ok(chart.x>=782,'visual slot should choose the right split panel by default');
  assert.ok(elements.some(item=>item.id==='left-text'),'non-overlapping narrative content should survive');
});

test('visual-heavy intent expands rich body across the template body union',()=>{
  const elements=RichLayout.reflowElements([header,rich('table')],reference,{params:{visualWeight:1.2},intent:{contentBalance:'visual'}});
  const table=elements.find(item=>item.type==='table');
  assert.ok(table.w>1000);
  assert.ok(table.h>=400);
});

test('diagram uses the same shared semantic body contract',()=>{
  const node={slideElements:[header,rich('diagram')],composer:{selectedTemplateParams:{visualWeight:1},designIntent:{}}};
  RichLayout.reflowNode(node,reference);
  const diagram=node.slideElements.find(item=>item.type==='diagram');
  assert.ok(diagram.x>=782);
  assert.ok(node.slideElements.some(item=>item.id==='left-text'));
});
