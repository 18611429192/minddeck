import assert from 'node:assert/strict';
import { Provenance } from '../src/runtime/modules/composer/provenance.js';

assert.equal(Provenance.deckVersion,Provenance.version.split('.').slice(0,2).join('.'),'deck/version metadata must share one Composer version source');

const element={id:'e1',type:'text',x:10,y:20,w:300,h:80,z:1000,text:'V10 metadata contract',fontSize:32,fontWeight:600,color:'#111',textAlign:'left',animation:{type:'none',delay:0,duration:.5}};
const legacy={id:'legacy',deckRole:'statement',slideElements:[element],composer:{generatedAtVersion:'9.9.0',generatedBy:'Core.Composer',selectedTemplateId:'statement-panel-01',selectedTemplateParams:{},alternativeTemplateIds:['statement-split-01'],content:{title:'Legacy'}}};
Provenance.attach(legacy,{role:'statement',content:legacy.composer.content,selectedTemplateId:'statement-panel-01'},legacy.slideElements);
assert.equal(legacy.composer.generatedAtVersion,Provenance.version,'regenerating a legacy node must stamp the current Composer version');
assert.deepEqual(legacy.composer.alternativeTemplateIds,['statement-split-01'],'regeneration must not discard unrelated provenance metadata');
assert.equal(Provenance.isDirty(legacy),false);
legacy.slideElements[0].x+=1;
assert.equal(Provenance.isDirty(legacy),true,'real layout edits must remain detectable independently of version metadata');

const explicit={id:'explicit',deckRole:'statement',slideElements:[{...element,id:'e2'}],composer:{}};
Provenance.attach(explicit,{generatedAtVersion:'10.0.0-test',role:'statement'},explicit.slideElements);
assert.equal(explicit.composer.generatedAtVersion,'10.0.0-test','explicit generation metadata remains supported for controlled callers');

console.log(`Composer provenance version contract: OK (${Provenance.deckVersion} / ${Provenance.version})`);
