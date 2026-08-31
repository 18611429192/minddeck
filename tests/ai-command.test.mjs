import test from 'node:test';
import assert from 'node:assert/strict';
import { AICommand } from '../src/runtime/modules/ai-provider.js';

const context={projectTitle:'Demo',nodes:[{id:'n1',title:'Slide',text:'Body',elements:[
  {id:'t1',type:'text',text:'Old'},
  {id:'c1',type:'chart',chart:{chartType:'bar',categories:['A','B'],series:[{name:'Revenue',values:[1,2]}]}},
  {id:'tb1',type:'table',table:{columns:[{label:'Item'},{label:'Value'}],rows:[['A','1']]}},
  {id:'d1',type:'diagram',diagram:{subtype:'roadmap',data:{items:[{label:'A'},{label:'B'}]}}}
]}]};
class MockProvider{constructor(values){this.values=[...values];this.calls=0}async generateStructured(){this.calls++;const value=this.values.shift();if(value instanceof Error)throw value;return {text:typeof value==='string'?value:JSON.stringify(value)}}}

test('AI command applies only known ids and strips geometry/style instructions',async()=>{
  const provider=new MockProvider([{schemaVersion:1,scope:'selection',summary:'edit',slidePatches:[{nodeId:'n1',x:10,elementPatches:[{elementId:'t1',type:'text',text:'New',x:999,style:{color:'red'}},{elementId:'missing',type:'text',text:'bad'}]}]}]);
  const result=await AICommand.plan({instruction:'rewrite',scope:'selection',context},{provider});
  assert.equal(result.patch.slidePatches.length,1);
  assert.deepEqual(result.patch.slidePatches[0].elementPatches,[{elementId:'t1',type:'text',text:'New'}]);
  assert.equal('x' in result.patch.slidePatches[0],false);
});

test('AI command carries native chart/table/diagram data without geometry',async()=>{
  const provider=new MockProvider([{schemaVersion:1,scope:'slide',summary:'structured edits',slidePatches:[{nodeId:'n1',elementPatches:[
    {elementId:'c1',chart:{chartType:'line',categories:['A','B'],series:[{name:'Revenue',values:[2,4]}],x:500}},
    {elementId:'tb1',table:{columns:[{label:'Item'}],rows:[['B']]}},
    {elementId:'d1',diagram:{subtype:'cycle',data:{items:[{label:'A'},{label:'B'},{label:'C'}]}}}
  ]}]}]);
  const result=await AICommand.plan({instruction:'update structured content',scope:'slide',context},{provider});
  const patches=result.patch.slidePatches[0].elementPatches;
  assert.equal(patches[0].type,'chart');
  assert.equal(patches[0].chart.chartType,'line');
  assert.equal(patches[1].type,'table');
  assert.equal(patches[2].type,'diagram');
});

test('redesign is ignored unless the caller explicitly allows it',()=>{
  const raw={schemaVersion:1,scope:'slide',summary:'redesign',slidePatches:[{nodeId:'n1',content:{title:'New'},redesign:{enabled:true,roleHint:'compare',designIntent:{density:'compact'}}}]};
  const safe=AICommand.sanitize(raw,context,{scope:'slide',allowRedesign:false});
  assert.equal(safe.slidePatches[0].redesign,undefined);
  const allowed=AICommand.sanitize(raw,context,{scope:'slide',allowRedesign:true});
  assert.equal(allowed.slidePatches[0].redesign.enabled,true);
  assert.equal(allowed.slidePatches[0].redesign.roleHint,'compare');
});

test('invalid or empty AI patches are bounded and rejected',async()=>{
  const provider=new MockProvider([{schemaVersion:1,scope:'slide',summary:'none',slidePatches:[{nodeId:'invented',elementPatches:[]}]},{schemaVersion:1,scope:'slide',summary:'none',slidePatches:[]}]);
  await assert.rejects(()=>AICommand.plan({instruction:'change it',scope:'slide',context},{provider,attempts:2}),err=>Array.isArray(err.warnings)&&provider.calls===2);
});
