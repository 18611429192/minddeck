import test from 'node:test';
import assert from 'node:assert/strict';
import { SourceDocument } from '../src/runtime/modules/source-document.js';
import { Planner } from '../src/runtime/modules/planner.js';
import { Composer } from '../src/runtime/modules/composer.js';

const shortInput='One concise point.';
const normalInput='# Strategy\n\n## Context\nMarket growth is 12%. Customer demand is rising.\n\n## Problem\nConversion is below target. Handoffs are slow.\n\n## Evidence\nPipeline increased 20%. Retention improved 8%.\n\n## Action\nFirst improve onboarding. Then automate follow-up.';
const repetitiveInput=Array.from({length:12},(_,i)=>`## Repeat ${i+1}\nThe same point repeats.`).join('\n\n');
const longInput=Array.from({length:12},(_,i)=>`## Topic ${i+1}\nMetric ${100+i}% improved. Evidence ${i+1} supports this. Next action ${i+1}.`).join('\n\n');

function assertTargetContract(source,target){
  const plan=Planner.deterministicPlan(source,{targetSlides:target});
  assert.equal(plan.targetSlides,target,'targetSlides must preserve the caller request');
  assert.equal(plan.requestedTargetSlides,target,'requestedTargetSlides must preserve the caller request');
  assert.equal(plan.actualSlides,plan.slideIntents.length,'actualSlides must track the produced intents');
  const warning=plan.warnings.find(item=>item.code==='TARGET_SLIDES_UNSATISFIABLE');
  if(plan.actualSlides!==target)assert.deepEqual(warning,{code:'TARGET_SLIDES_UNSATISFIABLE',requested:target,actual:plan.actualSlides});
  else assert.equal(warning,undefined,'exact plans must not emit TARGET_SLIDES_UNSATISFIABLE');
  assert.equal(Planner.validateDeckPlan(plan).ok,true);
  return plan;
}

test('SourceDocument normalizes text, markdown and json deterministically',()=>{
  const text=SourceDocument.normalize('Quarterly Review\n\nRevenue grew 18%.\n\nNext we expand enterprise sales.');
  const md=SourceDocument.normalize('# Quarterly Review\n\n## Results\nRevenue grew 18%.');
  const json=SourceDocument.normalize({sourceType:'json',title:'Quarterly Review',content:{revenue:'+18%',action:'expand sales'}});
  assert.equal(text.sourceType,'text');assert.equal(md.sourceType,'markdown');assert.equal(json.sourceType,'json');
  assert.deepEqual(SourceDocument.normalize(md),SourceDocument.normalize(md));
  assert.equal(SourceDocument.validate(text).ok,true);
});

test('deterministic planner honors targetSlides and compiles only through DeckSpec -> Composer',()=>{
  const source='# Strategy\n\n## Background\nMarket growth is 12%.\n\n## Problem\nConversion is below target.\n\n## Plan\nFirst improve onboarding. Then automate follow-up.\n\n## Result\nTarget 25% conversion improvement.';
  const a=Planner.deterministicPlan(source,{targetSlides:5,audience:'Leadership'}),b=Planner.deterministicPlan(source,{targetSlides:5,audience:'Leadership'});
  assert.deepEqual(a,b);assert.equal(a.targetSlides,5);assert.equal(a.requestedTargetSlides,5);assert.equal(Planner.validateDeckPlan(a).ok,true);
  const spec=Planner.toDeckSpec(a,{theme:'aurora'});assert.equal(Composer.validateDeckSpec(spec).ok,true);
  const compiled=Composer.compileDeck(spec,{seed:'planner-golden'});assert.ok(compiled.project);assert.ok(Array.isArray(compiled.project.children));
});

test('planner handles long documents without one-paragraph-one-slide behavior',()=>{
  const source=Array.from({length:40},(_,i)=>`## Topic ${i+1}\nMetric ${100+i}% and explanation for topic ${i+1}.`).join('\n\n');
  const plan=Planner.deterministicPlan(source,{targetSlides:10});assert.equal(plan.requestedTargetSlides,10);assert.equal(plan.slideIntents.length,10);assert.ok(plan.sections.length>plan.slideIntents.length);
});

for(const [label,source,target] of [
  ['target=1 short input',shortInput,1],
  ['target=1 normal input',normalInput,1],
  ['target=5 short input',shortInput,5],
  ['target=5 normal input',normalInput,5],
  ['target=5 repetitive input',repetitiveInput,5],
  ['target=10 very short input',shortInput,10],
  ['target=10 long input',longInput,10],
  ['target=10 repetitive input',repetitiveInput,10]
])test(`planner target contract: ${label}`,()=>assertTargetContract(source,target));

test('planner validation rejects a silent target shrink',()=>{
  const plan=assertTargetContract(shortInput,10),invalid={...plan,warnings:[]};
  const check=Planner.validateDeckPlan(invalid);
  assert.equal(check.ok,false);
  assert.ok(check.errors.some(item=>item.code==='PLAN_TARGET_SILENT_MISMATCH'));
});
