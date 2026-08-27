import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Core} from '../src/core/runtime.js';

const C=Core.Composer;
const snapshot=JSON.parse(readFileSync(new URL('./golden/parametric.snapshot.json',import.meta.url),'utf8'));
const items=n=>Array.from({length:n},(_,i)=>({label:`Item ${i+1}`,value:String((i+1)*10)}));
const cards=n=>({title:'Cards',items:items(n)});
const metrics={title:'Metrics',items:[{value:'10%',label:'A'},{value:'20%',label:'B'},{value:'30%',label:'C'}]};
const media={title:'Visual',summary:'Evidence',items:[{label:'Note'}],media:[{type:'image',src:'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg"/>'}]};
const process={title:'Process',items:items(4)};
const compare={title:'Compare',items:items(4)};
const timeline={title:'Timeline',items:items(4)};
const statement={title:'Statement',summary:'One clear point',takeaway:'Do the important thing',items:[{label:'Proof'}]};
const conclusion={title:'Conclusion',summary:'Finish strongly',items:items(3)};
const contentByFamily={statement,cards:cards(4),compare,process,metrics,timeline,image:media,conclusion};
const legacyTemplateIds=[
  'cover-focus-01','cover-grid-01','section-index-01','section-band-01','statement-panel-01','statement-split-01','cards-grid-01','cards-list-01',
  'compare-split-01','compare-table-01','process-line-01','process-steps-01','metrics-cards-01','metrics-hero-01','trend-bars-01','trend-steps-01',
  'timeline-line-01','timeline-vertical-01','quote-center-01','quote-side-01','image-left-01','image-right-01','conclusion-actions-01','conclusion-summary-01'
];

assert.equal(C.templates.length,72,'Step 5 professional library must expose 72 templates');
for(const id of legacyTemplateIds)assert.ok(C.TemplateRegistry.has(id),`legacy template must remain: ${id}`);
const parameterized=C.templates.filter(template=>template.parametricFamily);
const legacyParameterized=legacyTemplateIds.map(id=>C.TemplateRegistry.get(id)).filter(template=>template.parametricFamily);
assert.equal(legacyParameterized.length,16,'Step 2 parameterized baseline must remain intact');
assert.equal(parameterized.length,58,'Step 5 should expose 58 parameterized templates');
assert.equal(C.Library.parametricTemplates,58);
assert.ok(Math.abs(C.Library.parametricRatio-58/72)<1e-12);
assert.deepEqual([...new Set(parameterized.map(template=>template.parametricFamily))].sort(),['cards','compare','conclusion','image','metrics','process','statement','timeline']);
for(const template of parameterized){assert.ok(template.paramSchema&&typeof template.paramSchema==='object',`${template.id} paramSchema required`);assert.equal(C.Parametrics.validateSchema(template.paramSchema).ok,true,`${template.id} param schema invalid`);assert.doesNotThrow(()=>JSON.stringify(template.paramSchema),`${template.id} param schema must be pure data`)}

const cardsTemplate=C.TemplateRegistry.get('cards-grid-01');
const normalized=C.normalizeTemplateParams(cardsTemplate,{}, {content:cards(3),density:'standard'});
assert.deepEqual(normalized.params,snapshot.cards3.params,'3-item cards should normalize to 3 columns');
const invalid=C.normalizeTemplateParams(cardsTemplate,{columns:99},{content:cards(3),density:'standard'});
assert.equal(invalid.ok,false);assert.equal(invalid.params.columns,3);assert.ok(invalid.warnings.some(item=>item.code==='INVALID_TEMPLATE_PARAM'));
assert.throws(()=>C.normalizeTemplateParams(cardsTemplate,{columns:99},{content:cards(3),density:'standard'},{strict:true}),err=>err.code==='INVALID_TEMPLATE_PARAM');
assert.throws(()=>C.normalizeTemplateParams(cardsTemplate,{invented:true},{content:cards(3)},{strict:true}),err=>err.code==='INVALID_TEMPLATE_PARAM');

const candidates=C.recommendTemplates({role:'cards',content:cards(3),limit:12});
const gridCandidate=candidates.find(item=>item.templateId==='cards-grid-01');
assert.ok(gridCandidate);assert.equal(gridCandidate.params.itemCount,3);assert.equal(gridCandidate.params.columns,3);assert.equal(gridCandidate.parametricFamily,'cards');

function cardGeometry(result){return result.elements.filter(element=>element.type==='shape'&&element.y>=300&&element.w>300).map(element=>[element.x,element.y,element.w,element.h])}
const cards2=C.compileSlide({content:cards(2),template:'cards-grid-01',theme:'aurora'});
const cards3=C.compileSlide({content:cards(3),template:'cards-grid-01',theme:'aurora'});
const cards4=C.compileSlide({content:cards(4),template:'cards-grid-01',params:{columns:2},theme:'aurora'});
assert.equal(cardGeometry(cards2).length,2);assert.deepEqual(cardGeometry(cards3),snapshot.cards3.cards);assert.deepEqual(cardGeometry(cards4),snapshot.cards4TwoColumns.cards);

const emphasized=C.compileSlide({content:metrics,template:'metrics-cards-01',params:{emphasisIndex:2},theme:'aurora'});
const metricShapes=emphasized.elements.filter(element=>element.type==='shape'&&element.y===340&&element.h===320);
const aurora=C.ThemeRegistry.resolve('aurora');
assert.equal(metricShapes.length,3);assert.deepEqual(metricShapes.map(shape=>shape.fill),[aurora.surface,aurora.surface,aurora.surface2]);

const six=cards(6),standard=C.compileSlide({content:six,template:'cards-grid-01',theme:'aurora',density:'standard'}),rich=C.compileSlide({content:six,template:'cards-grid-01',theme:'aurora',density:'rich'});
assert.equal(cardGeometry(standard).length,4);assert.equal(cardGeometry(rich).length,6,'rich density should expose six cards');

const image35=C.compileSlide({content:media,template:'image-left-01',params:{mediaRatio:.35},theme:'aurora'}),image65=C.compileSlide({content:media,template:'image-left-01',params:{mediaRatio:.65},theme:'aurora'});
const imageGeometry=result=>{const image=result.elements.find(element=>element.type==='image');return {x:image.x,y:image.y,w:image.w,h:image.h}};
assert.deepEqual(imageGeometry(image35),snapshot.image35);assert.deepEqual(imageGeometry(image65),snapshot.image65);assert.ok(imageGeometry(image65).w>imageGeometry(image35).w);

for(const template of parameterized){
  const content=contentByFamily[template.parametricFamily],direct=C.compileSlide({content,template:template.id,theme:'aurora',density:'standard'}),
    candidate=C.compileSlide({content,template:{templateId:template.id,params:C.normalizeTemplateParams(template,{}, {content,density:'standard'}).params},theme:'aurora',density:'standard'});
  assert.deepEqual(candidate.elements,direct.elements,`${template.id} Template + Params defaults must remain compatible`);
  assert.deepEqual(C.compileSlide({content,template:{templateId:template.id,params:candidate.params},theme:'aurora'}).elements,C.compileSlide({content,template:{templateId:template.id,params:candidate.params},theme:'aurora'}).elements,`${template.id} parametric compile must be deterministic`)
}

const slides=[{id:'a',role:'cards',content:cards(3)},{id:'b',role:'metrics',content:metrics},{id:'c',role:'process',content:process}],
  matrix=slides.map(slide=>C.recommendTemplates({role:slide.role,content:slide.content,limit:6})),
  allocationA=C.allocateTemplates(slides,matrix,{seed:'step5'}),allocationB=C.allocateTemplates(slides,matrix,{seed:'step5'});
assert.deepEqual(allocationA,allocationB);assert.ok(allocationA.every(item=>item.params&&typeof item.params==='object'),'Allocator must carry matcher params without owning layout decisions');
assert.equal(snapshot.baseline,'V10-step2-parametric');
console.log('MindDeck V10 Step 5 parametric regression: OK (58 / 72 templates parameterized)');
