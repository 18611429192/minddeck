import { normalizeSourceDocument } from './source-document.js';
import { normalizeDeckSpec, validateDeckSpec, normalizeSlideContent, inferSlideRole, SlideRoles } from './composer/schema.js';
const clean=value=>String(value??'').trim();
const clamp=(value,min,max)=>Math.max(min,Math.min(max,Number(value)||min));
const sentenceSplit=text=>clean(text).split(/(?<=[。！？.!?])\s*|\n+/).map(clean).filter(Boolean);
const numericText=text=>/(?:[-+]?\d+(?:\.\d+)?\s*%|\b\d{2,}\b|[$¥]\s*[-+]?\d+(?:\.\d+)?)/.test(text);
const tabularText=text=>/\|.+\|/.test(text)||/(?:^|\n)\s*[-*]\s+[^\n]+:\s*[^\n]+/.test(text);
const processText=text=>/(步骤|流程|阶段|首先|其次|然后|最后|step|phase|process|workflow)/i.test(text);
const CHART_TYPES=new Set(['bar','line','area','donut','radar','funnel','waterfall']);
const DIAGRAM_TYPES=new Set(['matrix','pyramid','cycle','funnel','roadmap','swot','pest','porter']);
function planProblem(path,code,message){return {path,code,message}}
export function validateDeckPlan(input){
  const errors=[];
  if(!input||typeof input!=='object'||Array.isArray(input))errors.push(planProblem('$','PLAN_TYPE','DeckPlan must be an object'));
  else{
    if(input.schemaVersion!==1)errors.push(planProblem('schemaVersion','PLAN_VERSION','DeckPlan schemaVersion must be 1'));
    if(!clean(input.purpose))errors.push(planProblem('purpose','PLAN_PURPOSE','purpose is required'));
    if(!Number.isInteger(input.targetSlides)||input.targetSlides<1||input.targetSlides>60)errors.push(planProblem('targetSlides','PLAN_SLIDES','targetSlides must be 1..60'));
    if(!Array.isArray(input.slideIntents)||!input.slideIntents.length)errors.push(planProblem('slideIntents','PLAN_INTENTS','slideIntents are required'));
    if(input.actualSlides!==undefined&&input.actualSlides!==input.slideIntents?.length)errors.push(planProblem('actualSlides','PLAN_ACTUAL_SLIDES','actualSlides must equal slideIntents.length'));
    if(input.warnings!==undefined&&!Array.isArray(input.warnings))errors.push(planProblem('warnings','PLAN_WARNINGS','warnings must be an array'));
    for(const [i,slide] of (input.slideIntents||[]).entries())if(slide.roleHint&&!SlideRoles.includes(slide.roleHint))errors.push(planProblem(`slideIntents[${i}].roleHint`,'PLAN_ROLE',`invalid role ${slide.roleHint}`));
  }
  return {ok:errors.length===0,errors};
}
function summarizeBlock(section,index){
  const text=clean(section.content),sentences=sentenceSplit(text),facts=sentences.slice(0,8),title=clean(section.title)||clean(sentences[0])||`Topic ${index+1}`,signal=`${title}\n${text}`;
  const content=normalizeSlideContent({title,summary:sentences.slice(0,2).join(' '),items:facts.slice(1,5).map(value=>({label:value})),takeaway:sentences.at(-1)||''});
  let role=inferSlideRole(content,null,{depth:1,index});if(numericText(signal))role='metrics';else if(tabularText(text))role='table';else if(processText(signal)&&!numericText(signal))role='process';
  return {goal:`Explain ${title}`,roleHint:role,title,topic:title,facts,takeaway:sentences.at(-1)||'',chartIntent:numericText(signal)?{recommended:true,type:/趋势|growth|trend/i.test(signal)?'line':'bar'}:null,tableIntent:tabularText(text)?{recommended:true}:null,diagramIntent:processText(signal)?{recommended:true,type:'process'}:null,imageIntent:null,emphasis:numericText(signal)?'data':'balanced'};
}
function mergeIntents(out,target){
  while(out.length>target){let best=0,score=Infinity;for(let i=0;i<out.length-1;i++){const s=(out[i].facts?.length||0)+(out[i+1].facts?.length||0);if(s<score){score=s;best=i}}const a=out[best],b=out[best+1];out.splice(best,2,{...a,title:`${a.title} / ${b.title}`,topic:`${a.topic}; ${b.topic}`,facts:[...(a.facts||[]),...(b.facts||[])].slice(0,12),takeaway:b.takeaway||a.takeaway,roleHint:(!(a.facts||[]).length||a.roleHint==='section')?b.roleHint:a.roleHint,chartIntent:a.chartIntent||b.chartIntent,tableIntent:a.tableIntent||b.tableIntent,diagramIntent:a.diagramIntent||b.diagramIntent,imageIntent:a.imageIntent||b.imageIntent})}
  return out;
}
function splitIntent(item){
  const facts=(item.facts||[]).filter(Boolean);if(facts.length<2)return null;
  const half=Math.ceil(facts.length/2),left=facts.slice(0,half),right=facts.slice(half);if(!right.length)return null;
  return [{...item,facts:left,takeaway:left.at(-1)||item.takeaway},{...item,title:`${item.title} — continued`,topic:item.topic||item.title,facts:right,takeaway:item.takeaway||right.at(-1)||'',roleHint:item.roleHint==='cover'?'statement':item.roleHint}];
}
function fitIntents(intents,target){
  let out=mergeIntents(intents.slice(),target);
  while(out.length<target&&out.length){let picked=-1,best=1;for(let i=0;i<out.length;i++){const size=(out[i].facts||[]).length;if(size>best){best=size;picked=i}}if(picked<0)break;const split=splitIntent(out[picked]);if(!split)break;out.splice(picked,1,...split)}
  return out.slice(0,target);
}
function numberFromFact(value){const match=clean(value).replaceAll(',','').match(/[-+]?\d+(?:\.\d+)?/);return match?Number(match[0]):null}
function factLabel(value,index){const text=clean(value).replace(/[-+]?\d[\d,.]*\s*%?/g,'').replace(/[$¥]/g,'').replace(/^[\s:：,，;；-]+|[\s:：,，;；-]+$/g,'');return text.slice(0,42)||`Item ${index+1}`}
function normalizeChartIntent(intent){
  if(!intent?.chartIntent&&!['metrics','trend'].includes(intent?.roleHint))return null;
  const raw=intent?.chartIntent?.chart||intent?.chartIntent?.data||intent?.chartIntent;
  if(raw&&typeof raw==='object'&&!Array.isArray(raw)&&(Array.isArray(raw.values)||Array.isArray(raw.series))){const chartType=CHART_TYPES.has(raw.chartType)?raw.chartType:CHART_TYPES.has(raw.type)?raw.type:'bar';return {...raw,chartType}}
  const pairs=(intent?.facts||[]).map((fact,index)=>({label:factLabel(fact,index),value:numberFromFact(fact)})).filter(item=>Number.isFinite(item.value));
  if(!pairs.length)return null;
  const desired=clean(raw?.type||raw?.chartType),chartType=CHART_TYPES.has(desired)?desired:(intent?.roleHint==='trend'?'line':'bar');
  return {chartType,categories:pairs.map(item=>item.label),values:pairs.map(item=>item.value),series:[{name:clean(intent?.topic)||clean(intent?.title)||'Series 1',values:pairs.map(item=>item.value)}],options:{showLegend:false,showLabels:true,showValues:true}};
}
function pipeTable(facts=[]){
  const rows=facts.map(value=>clean(value)).filter(value=>/^\|.*\|$/.test(value)).map(value=>value.split('|').slice(1,-1).map(clean));
  const useful=rows.filter(row=>row.some(Boolean)&&!row.every(cell=>/^:?-{3,}:?$/.test(cell)));if(useful.length<2)return null;
  const header=useful[0],body=useful.slice(1);return {columns:header.map((label,index)=>({label:label||`Column ${index+1}`})),header:{visible:true,cells:header},rows:body};
}
function normalizeTableIntent(intent){
  if(!intent?.tableIntent&&intent?.roleHint!=='table')return null;
  const raw=intent?.tableIntent?.table||intent?.tableIntent?.data||intent?.tableIntent;
  if(raw&&typeof raw==='object'&&!Array.isArray(raw)&&(Array.isArray(raw.rows)||Array.isArray(raw.columns)))return raw;
  const parsed=pipeTable(intent?.facts||[]);if(parsed)return parsed;
  const pairs=(intent?.facts||[]).map(value=>clean(value).match(/^([^:：]{1,48})[:：]\s*(.+)$/)).filter(Boolean);
  if(pairs.length>=2)return {columns:[{label:'Item'},{label:'Value'}],header:{visible:true,cells:['Item','Value']},rows:pairs.map(match=>[match[1],match[2]])};
  return null;
}
function normalizeDiagramIntent(intent){
  if(!intent?.diagramIntent&&!['process','architecture','roadmap','matrix'].includes(intent?.roleHint))return null;
  const raw=intent?.diagramIntent?.diagram||intent?.diagramIntent?.data||intent?.diagramIntent;
  if(raw&&typeof raw==='object'&&!Array.isArray(raw)&&(Array.isArray(raw.items)||Array.isArray(raw.data?.items))){const requested=clean(raw.subtype||raw.type);return {...raw,subtype:DIAGRAM_TYPES.has(requested)?requested:(requested==='process'?'roadmap':'matrix')}}
  const facts=(intent?.facts||[]).map(clean).filter(Boolean).slice(0,10);if(facts.length<2)return null;
  const requested=clean(raw?.type||raw?.subtype),subtype=DIAGRAM_TYPES.has(requested)?requested:(requested==='process'||intent?.roleHint==='process'?'roadmap':'matrix');
  return {subtype,data:{items:facts.map((label,index)=>({id:`item-${index+1}`,label}))},layout:{direction:subtype==='roadmap'?'horizontal':'vertical',columns:Math.min(4,Math.max(1,Math.ceil(Math.sqrt(facts.length))))}};
}
function normalizeImageIntent(intent){
  const raw=intent?.imageIntent;if(!raw||typeof raw!=='object'||Array.isArray(raw))return [];
  const src=clean(raw.src||raw.url||raw.image);if(!src)return [];
  return [{type:'image',src,alt:clean(raw.alt)||clean(intent?.title)||clean(intent?.topic)}];
}
function intentContent(intent){
  const base={title:intent.title||intent.topic,summary:(intent.facts||[]).slice(0,2).join(' '),takeaway:intent.takeaway,items:(intent.facts||[]).slice(2,8).map(label=>({label})),media:normalizeImageIntent(intent)};
  const chart=normalizeChartIntent(intent),table=normalizeTableIntent(intent),diagram=normalizeDiagramIntent(intent),role=intent.roleHint;
  if((role==='metrics'||role==='trend')&&chart)base.chart=chart;
  else if(role==='table'&&table)base.table=table;
  else if(['process','architecture','roadmap','matrix'].includes(role)&&diagram)base.diagram=diagram;
  else if(table)base.table=table;
  else if(diagram)base.diagram=diagram;
  else if(chart)base.chart=chart;
  return base;
}
function preserveRichContent(spec,rawSlides){
  spec.slides.forEach((slide,index)=>{const source=rawSlides[index]?.content||{};for(const kind of ['chart','table','diagram'])if(source[kind])slide.content[kind]=source[kind]});return spec;
}
export function deterministicPlan(source,options={}){
  const doc=normalizeSourceDocument(source,options),requested=options.targetSlides??doc.metadata?.targetSlides??Math.max(4,Math.min(12,doc.sections.length+2)),targetSlides=clamp(Math.round(requested),1,60),bodyTarget=Math.max(0,targetSlides-1);
  let intents=doc.sections.map(summarizeBlock);if(!intents.length)intents=[summarizeBlock({title:doc.title,content:doc.rawContent},0)];intents=fitIntents(intents,bodyTarget||1);
  const cover={goal:'Introduce the presentation',roleHint:'cover',title:doc.title,topic:doc.title,facts:[],takeaway:'',chartIntent:null,tableIntent:null,diagramIntent:null,imageIntent:null,emphasis:'title'};
  const slideIntents=targetSlides===1?[cover]:[cover,...intents].slice(0,targetSlides),actualSlides=slideIntents.length,warnings=[];
  if(actualSlides!==targetSlides)warnings.push({code:'TARGET_SLIDES_UNSATISFIABLE',requested:targetSlides,actual:actualSlides});
  const plan={schemaVersion:1,purpose:clean(options.purpose)||'Communicate the source material clearly',audience:clean(options.audience)||clean(doc.metadata?.audience)||'General audience',tone:clean(options.tone)||'clear',targetSlides,actualSlides,warnings,storyArc:['context','evidence','insight','action'],sections:doc.sections.map(s=>({id:s.id,title:s.title||s.id})),slideIntents,source:{title:doc.title,sourceType:doc.sourceType}};
  const check=validateDeckPlan(plan);if(!check.ok){const err=new Error(check.errors.map(e=>`${e.path}: ${e.message}`).join('; '));err.code='DECK_PLAN_INVALID';err.report=check;throw err}return plan;
}
export function deckPlanToDeckSpec(plan,options={}){
  const check=validateDeckPlan(plan);if(!check.ok){const err=new Error(check.errors.map(e=>`${e.path}: ${e.message}`).join('; '));err.code='DECK_PLAN_INVALID';err.report=check;throw err}
  const body=plan.slideIntents.filter((_,i)=>i>0||plan.slideIntents.length===1).map((intent,index)=>({id:`plan-${index+1}`,role:intent.roleHint==='cover'&&index>0?'statement':intent.roleHint,content:intentContent(intent)}));
  const raw={schemaVersion:1,title:plan.slideIntents[0]?.title||plan.source?.title||'Untitled presentation',goal:plan.purpose,audience:plan.audience,theme:options.theme||'aurora',randomSeed:options.seed||`${plan.source?.title||'minddeck'}:${plan.targetSlides}`,slides:body.length?body:[{id:'plan-1',role:'statement',content:{title:plan.source?.title||'Overview',summary:plan.purpose}}]};
  const spec=preserveRichContent(normalizeDeckSpec(raw),raw.slides),validation=validateDeckSpec(spec);if(!validation.ok){const err=new Error(validation.errors.map(e=>`${e.path}: ${e.message}`).join('; '));err.code='DECK_SPEC_INVALID';err.report=validation;throw err}return spec;
}
export const Planner=Object.freeze({validateDeckPlan,deterministicPlan,toDeckSpec:deckPlanToDeckSpec});
