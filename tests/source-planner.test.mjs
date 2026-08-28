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

test('SourceDocument rejects invalid explicit sourceType instead of silently coercing to text',()=>{
  assert.throws(()=>SourceDocument.normalize({sourceType:'xml',title:'Bad',content:'<x/>'}),error=>error.code==='SOURCE_DOCUMENT_INVALID'&&error.report?.errors?.some(item=>item.code==='SOURCE_KIND'));
  assert.throws(()=>SourceDocument.normalize('plain text',{sourceType:'pdf'}),error=>error.code==='SOURCE_DOCUMENT_INVALID');
});

test('deterministic planner honors requested targetSlides and compiles only through DeckSpec -> Composer',()=>{
  const source='# Strategy\n\n## Background\nMarket growth is 12%.\n\n## Problem\nConversion is below target.\n\n## Plan\nFirst improve onboarding. Then automate follow-up.\n\n## Result\nTarget 25% conversion improvement.';
  const a=Planner.deterministicPlan(source,{targetSlides:5,audience:'Leadership'}),b=Planner.deterministicPlan(source,{targetSlides:5,audience:'Leadership'});
  assert.deepEqual(a,b);assert.equal(a.targetSlides,5);assert.equal(a.actualSlides,5);assert.equal(a.warnings.length,0);assert.equal(Planner.validateDeckPlan(a).ok,true);
  const spec=Planner.toDeckSpec(a,{theme:'aurora'});assert.equal(Composer.validateDeckSpec(spec).ok,true);
  const compiled=Composer.compileDeck(spec,{seed:'planner-golden'});assert.ok(compiled.project);assert.ok(Array.isArray(compiled.project.children));
});

test('planner target contract covers 1/5/10 with short, long and repetitive content without silent shrink',()=>{
  const short='Tiny brief. One useful fact.';
  const long=Array.from({length:24},(_,i)=>`## Topic ${i+1}\nMetric ${100+i}% improved. Action ${i+1} follows. Evidence ${i+1} is available.`).join('\n\n');
  const repetitive='Repeat point. Repeat point. Repeat point. Repeat point. Repeat point. Repeat point.';
  for(const target of [1,5,10])for(const [kind,source] of [['short',short],['long',long],['repetitive',repetitive]]){
    const plan=Planner.deterministicPlan(source,{targetSlides:target});assert.equal(plan.targetSlides,target,`${kind}/${target} must preserve requested target`);assert.equal(plan.actualSlides,plan.slideIntents.length);assert.equal(Planner.validateDeckPlan(plan).ok,true);
    if(plan.actualSlides!==target)assert.deepEqual(plan.warnings.find(item=>item.code==='TARGET_SLIDES_UNSATISFIABLE'),{code:'TARGET_SLIDES_UNSATISFIABLE',requested:target,actual:plan.actualSlides});
  }
});

test('planner handles long documents without one-paragraph-one-slide behavior',()=>{
  const source=Array.from({length:40},(_,i)=>`## Topic ${i+1}\nMetric ${100+i}% and explanation for topic ${i+1}.`).join('\n\n');
  const plan=Planner.deterministicPlan(source,{targetSlides:10});assert.equal(plan.targetSlides,10);assert.equal(plan.slideIntents.length,10);assert.ok(plan.sections.length>plan.slideIntents.length);
});

test('planner preserves chart/table/diagram/image rich intents into DeckSpec and native Project elements',()=>{
  const cases=[
    {kind:'chart',source:'# Report\n\n## Metrics\nRevenue 120. Margin 32%. Users 4500.',element:'chart'},
    {kind:'table',source:'# Matrix\n\n## Table\n| Capability | Current | Target |\n| --- | --- | --- |\n| Runtime | 1 | 2 |\n| Portable | yes | yes |',element:'table'},
    {kind:'diagram',source:'# Delivery\n\n## Process\nFirst discover needs. Then design. Next build. Finally launch.',element:'diagram'}
  ];
  for(const item of cases){const plan=Planner.deterministicPlan(item.source,{targetSlides:2}),spec=Planner.toDeckSpec(plan,{theme:'cobalt'});assert.ok(spec.slides[0].content[item.kind],`${item.kind} intent must survive DeckSpec conversion`);const compiled=Composer.compileDeck(spec,{seed:`rich-${item.kind}`});assert.equal(compiled.project.children[0].slideElements.some(element=>element.type===item.element),true,`${item.kind} must compile to native Project element`)}
  const imagePlan={schemaVersion:1,purpose:'Show product',audience:'General',tone:'clear',targetSlides:2,slideIntents:[{roleHint:'cover',title:'Product',facts:[]},{roleHint:'image',title:'Screenshot',facts:['Product screenshot'],imageIntent:{src:'data:image/png;base64,AA==',alt:'Product'}}]};
  const imageSpec=Planner.toDeckSpec(imagePlan);assert.equal(imageSpec.slides[0].content.media[0].src,'data:image/png;base64,AA==');
});
