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

test('requested target normalization is one explicit Planner contract',()=>{
  assert.equal(Planner.normalizeRequestedTargetSlides(10),10);
  assert.equal(Planner.normalizeRequestedTargetSlides('10.4'),10);
  assert.equal(Planner.normalizeRequestedTargetSlides(0),1);
  assert.equal(Planner.normalizeRequestedTargetSlides(99),60);
  assert.equal(Planner.normalizeRequestedTargetSlides('not-a-number',7),7);
});

test('deterministic planner honors targetSlides and compiles only through DeckSpec -> Composer',()=>{
  const source='# Strategy\n\n## Background\nMarket growth is 12%.\n\n## Problem\nConversion is below target.\n\n## Plan\nFirst improve onboarding. Then automate follow-up.\n\n## Result\nTarget 25% conversion improvement.';
  const a=Planner.deterministicPlan(source,{targetSlides:5,audience:'Leadership'}),b=Planner.deterministicPlan(source,{targetSlides:5,audience:'Leadership'});
  assert.deepEqual(a,b);assert.equal(a.targetSlides,5);assert.equal(a.requestedTargetSlides,5);assert.equal(Planner.validateDeckPlan(a).ok,true);
  const spec=Planner.toDeckSpec(a,{theme:'aurora'});assert.equal(Composer.validateDeckSpec(spec).ok,true);assert.deepEqual(spec.planning,{requestedTargetSlides:5,actualSlides:a.actualSlides,warnings:a.warnings});
  const compiled=Composer.compileDeck(spec,{seed:'planner-golden'});assert.ok(compiled.project);assert.ok(Array.isArray(compiled.project.children));assert.deepEqual(compiled.project.deckPlanning,spec.planning);
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

test('target=1 remains one page through DeckSpec -> Composer',()=>{
  const plan=assertTargetContract(shortInput,1),spec=Planner.toDeckSpec(plan,{theme:'aurora'});
  assert.equal(spec.coverOnly,true);
  assert.equal(spec.slides.length,0);
  assert.equal(Composer.validateDeckSpec(spec).ok,true);
  const compiled=Composer.compileDeck(spec,{seed:'planner-one-page'});
  assert.equal(1+(compiled.project.children||[]).length,1);
  assert.deepEqual(compiled.project.deckPlanning,{requestedTargetSlides:1,actualSlides:1,warnings:[]});
});

test('unsatisfiable target keeps requested target visible through final Project metadata',()=>{
  const plan=assertTargetContract(shortInput,10);
  assert.ok(plan.actualSlides<plan.requestedTargetSlides);
  const spec=Planner.toDeckSpec(plan,{theme:'aurora'}),compiled=Composer.compileDeck(spec,{seed:'planner-unsat'});
  assert.equal(1+(compiled.project.children||[]).length,plan.actualSlides);
  assert.equal(plan.requestedTargetSlides,10);
  assert.ok(plan.warnings.some(item=>item.code==='TARGET_SLIDES_UNSATISFIABLE'));
  assert.deepEqual(spec.planning,{requestedTargetSlides:10,actualSlides:plan.actualSlides,warnings:plan.warnings});
  assert.deepEqual(compiled.project.deckPlanning,spec.planning);
});

test('DeckSpec planning boundary rejects lost warnings and incorrect actual page counts',()=>{
  const plan=assertTargetContract(shortInput,10),spec=Planner.toDeckSpec(plan,{theme:'aurora'});
  const silent={...spec,planning:{...spec.planning,warnings:[]}},silentCheck=Composer.validateDeckSpec(silent);
  assert.equal(silentCheck.ok,false);
  assert.ok(silentCheck.errors.some(item=>item.code==='PLANNING_TARGET_SILENT_MISMATCH'));
  const wrongActual={...spec,planning:{...spec.planning,actualSlides:spec.planning.actualSlides+1,warnings:[{code:'TARGET_SLIDES_UNSATISFIABLE',requested:10,actual:spec.planning.actualSlides+1}]}},actualCheck=Composer.validateDeckSpec(wrongActual);
  assert.equal(actualCheck.ok,false);
  assert.ok(actualCheck.errors.some(item=>item.code==='PLANNING_PAGE_COUNT'));
});

test('planner validation rejects a silent target shrink',()=>{
  const plan=assertTargetContract(shortInput,10),invalid={...plan,warnings:[]};
  const check=Planner.validateDeckPlan(invalid);
  assert.equal(check.ok,false);
  assert.ok(check.errors.some(item=>item.code==='PLAN_TARGET_SILENT_MISMATCH'));
});
