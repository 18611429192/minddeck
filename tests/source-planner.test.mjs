import test from 'node:test';
import assert from 'node:assert/strict';
import { SourceDocument } from '../src/runtime/modules/source-document.js';
import { Planner } from '../src/runtime/modules/planner.js';
import { Composer } from '../src/runtime/modules/composer.js';

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
  assert.deepEqual(a,b);assert.equal(a.targetSlides,5);assert.equal(Planner.validateDeckPlan(a).ok,true);
  const spec=Planner.toDeckSpec(a,{theme:'aurora'});assert.equal(Composer.validateDeckSpec(spec).ok,true);
  const compiled=Composer.compileDeck(spec,{seed:'planner-golden'});assert.ok(compiled.project);assert.ok(Array.isArray(compiled.project.children));
});

test('planner handles long documents without one-paragraph-one-slide behavior',()=>{
  const source=Array.from({length:40},(_,i)=>`## Topic ${i+1}\nMetric ${100+i}% and explanation for topic ${i+1}.`).join('\n\n');
  const plan=Planner.deterministicPlan(source,{targetSlides:10});assert.equal(plan.slideIntents.length,10);assert.ok(plan.sections.length>plan.slideIntents.length);
});
