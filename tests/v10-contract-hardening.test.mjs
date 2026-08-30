import assert from 'node:assert/strict';
import { Planner } from '../src/runtime/modules/planner.js';
import { Project } from '../src/runtime/modules/model.js';
import { Provenance } from '../src/runtime/modules/composer/provenance.js';

{
  const plan={schemaVersion:1,purpose:'Contract check',audience:'General',tone:'clear',targetSlides:5,actualSlides:2,warnings:[],slideIntents:[{roleHint:'cover',title:'Cover',facts:[]},{roleHint:'statement',title:'Body',facts:['One fact']}]};
  const invalid=Planner.validateDeckPlan(plan);
  assert.equal(invalid.ok,false);
  assert.equal(invalid.errors.some(item=>item.code==='PLAN_TARGET_SILENT_MISMATCH'),true,'page-count mismatch must not pass without an explicit warning');
  plan.warnings=[{code:'TARGET_SLIDES_UNSATISFIABLE',requested:5,actual:2}];
  assert.equal(Planner.validateDeckPlan(plan).ok,true,'explicit bounded-fallback warning must satisfy the target contract');
}

{
  const elements=[{id:'e1',type:'text',x:0,y:0,w:100,h:40,text:'Hello'}];
  const node={deckRole:'statement',slideElements:elements,composer:{generatedAtVersion:'9.9.0',alternativeTemplateIds:['statement-a','statement-b'],content:{title:'Legacy'},selectedTemplateId:'statement-a'}};
  Provenance.attach(node,{role:'statement'},elements);
  assert.equal(node.composer.generatedAtVersion,'10.0.0','regeneration must stamp the current generator version rather than inherit legacy metadata');
  assert.deepEqual(node.composer.alternativeTemplateIds,['statement-a','statement-b'],'partial metadata refresh must not silently erase template alternatives');
  assert.equal(Provenance.version,'10.0.0');
  assert.equal(Provenance.deckVersion,'10.0');
}

{
  const node={id:'page',title:'Page',text:'',collapsed:false,pos:{x:0,y:0},children:[],deckRole:'statement',slideElements:[
    {id:'e1',type:'text',x:20,y:30,w:320,h:90,z:1010,text:'Generated'},
    {id:'e2',type:'video',x:400,y:200,w:640,h:360,z:1050,src:'https://example.com/demo.mp4'}
  ],composer:{role:'statement',content:{title:'Generated'},selectedTemplateId:'statement-a'}};
  Provenance.attach(node,node.composer,node.slideElements);
  const project={id:'root',title:'Root',text:'',collapsed:false,pos:{x:0,y:0},children:[node],slideElements:[],schemaVersion:1,mapLayout:'balanced',uiTheme:'light',presentationOrder:[],master:{bgColor:'#fff',bgImage:null,bgFit:'cover',tocSide:'left',tocVisibility:'auto',defaultAnimation:'soft',elements:[]}};
  Project.normalize(project,{schemaVersion:1});
  assert.equal(Provenance.isDirty(node),false,'Project normalization must not mark untouched generated elements dirty');
  node.slideElements[0].x+=1;
  assert.equal(Provenance.isDirty(node),true,'real manual geometry changes must still mark the page dirty');
}

console.log('MindDeck V10 contract hardening tests: OK');
