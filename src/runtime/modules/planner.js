import { normalizeSourceDocument } from './source-document.js';
import { normalizeDeckSpec, validateDeckSpec, normalizeSlideContent, inferSlideRole, SlideRoles } from './composer/schema.js';
const clean=value=>String(value??'').trim();
const clamp=(value,min,max)=>Math.max(min,Math.min(max,Number(value)||min));
const sentenceSplit=text=>clean(text).split(/(?<=[。！？.!?])\s*|\n+/).map(clean).filter(Boolean);
const unique=values=>{const seen=new Set();return (values||[]).filter(value=>{const key=clean(value).toLowerCase();if(!key||seen.has(key))return false;seen.add(key);return true})};
const numericText=text=>/(?:\d+(?:\.\d+)?\s*%|\b\d{2,}\b|\$\s*\d|¥\s*\d)/.test(text);
const tabularText=text=>/\|.+\|/.test(text)||/(?:^|\n)\s*[-*]\s+[^\n]+:\s*[^\n]+/.test(text);
const processText=text=>/(步骤|流程|阶段|首先|其次|然后|最后|step|phase|process|workflow)/i.test(text);
function targetWarning(input,requested,actual){return (input.warnings||[]).some(item=>item?.code==='TARGET_SLIDES_UNSATISFIABLE'&&item.requested===requested&&item.actual===actual)}
export function validateDeckPlan(input){
  const errors=[];if(!input||typeof input!=='object'||Array.isArray(input))errors.push({path:'$',code:'PLAN_TYPE',message:'DeckPlan must be an object'});else{
    if(input.schemaVersion!==1)errors.push({path:'schemaVersion',code:'PLAN_VERSION',message:'DeckPlan schemaVersion must be 1'});if(!clean(input.purpose))errors.push({path:'purpose',code:'PLAN_PURPOSE',message:'purpose is required'});if(!Number.isInteger(input.targetSlides)||input.targetSlides<1||input.targetSlides>60)errors.push({path:'targetSlides',code:'PLAN_SLIDES',message:'targetSlides must be 1..60'});if(input.requestedTargetSlides!==undefined&&(!Number.isInteger(input.requestedTargetSlides)||input.requestedTargetSlides<1||input.requestedTargetSlides>60))errors.push({path:'requestedTargetSlides',code:'PLAN_REQUESTED_SLIDES',message:'requestedTargetSlides must be 1..60'});if(!Array.isArray(input.slideIntents)||!input.slideIntents.length)errors.push({path:'slideIntents',code:'PLAN_INTENTS',message:'slideIntents are required'});for(const [i,slide] of (input.slideIntents||[]).entries()){if(slide.roleHint&&!SlideRoles.includes(slide.roleHint))errors.push({path:`slideIntents[${i}].roleHint`,code:'PLAN_ROLE',message:`invalid role ${slide.roleHint}`})}
    const requested=input.requestedTargetSlides??input.targetSlides,actual=Array.isArray(input.slideIntents)?input.slideIntents.length:0;if(Number.isInteger(input.targetSlides)&&Number.isInteger(input.requestedTargetSlides)&&input.targetSlides!==input.requestedTargetSlides)errors.push({path:'targetSlides',code:'PLAN_TARGET_CONTRACT',message:'targetSlides must preserve requestedTargetSlides'});if(input.actualSlides!==undefined&&input.actualSlides!==actual)errors.push({path:'actualSlides',code:'PLAN_ACTUAL_SLIDES',message:'actualSlides must equal slideIntents.length'});if(Number.isInteger(requested)&&actual>0&&actual!==requested&&!targetWarning(input,requested,actual))errors.push({path:'warnings',code:'PLAN_TARGET_SILENT_MISMATCH',message:'target slide mismatch requires TARGET_SLIDES_UNSATISFIABLE warning'});
  }
  return {ok:errors.length===0,errors};
}
function summarizeBlock(section,index){
  const text=clean(section.content),sentences=unique(sentenceSplit(text)),facts=sentences.slice(0,5),title=clean(section.title)||clean(sentences[0])||`Topic ${index+1}`;
  const content=normalizeSlideContent({title,summary:sentences.slice(0,2).join(' '),items:facts.slice(1,5).map(value=>({label:value})),takeaway:sentences.at(-1)||''});
  let role=inferSlideRole(content,null,{depth:1,index});if(numericText(text))role='metrics';else if(tabularText(text))role='table';else if(processText(text)&&!numericText(text))role='process';
  return {goal:`Explain ${title}`,roleHint:role,title,topic:title,facts,takeaway:sentences.at(-1)||'',chartIntent:numericText(text)?{recommended:true,type:/趋势|growth|trend/i.test(text)?'line':'bar'}:null,tableIntent:tabularText(text)?{recommended:true}:null,diagramIntent:processText(text)?{recommended:true,type:'process'}:null,imageIntent:null,emphasis:numericText(text)?'data':'balanced'};
}
function intentMaterialKey(intent){const material=unique([...(intent.facts||[]),intent.takeaway]).join('␟').toLowerCase();return material||clean(intent.topic||intent.title).toLowerCase()}
function dedupeIntents(intents){const seen=new Set();return intents.filter(intent=>{const key=intentMaterialKey(intent);if(!key||seen.has(key))return false;seen.add(key);return true})}
function mergeIntentPair(a,b){return {...a,title:`${a.title} / ${b.title}`,topic:`${a.topic}; ${b.topic}`,facts:unique([...(a.facts||[]),...(b.facts||[])]).slice(0,8),takeaway:b.takeaway||a.takeaway,roleHint:a.roleHint==='section'?b.roleHint:a.roleHint}}
function splitIntent(item){const facts=unique(item.facts||[]);if(facts.length<2)return null;const half=Math.ceil(facts.length/2),leftFacts=facts.slice(0,half),rightFacts=facts.slice(half);if(!rightFacts.length)return null;return [{...item,facts:leftFacts,takeaway:''},{...item,title:`${item.title} — detail`,topic:`${item.topic||item.title} detail`,facts:rightFacts,roleHint:'statement'}]}
function fitIntents(intents,target){
  let out=dedupeIntents(intents).map(item=>({...item,facts:unique(item.facts||[])}));while(out.length>target){let best=0,score=Infinity;for(let i=0;i<out.length-1;i++){const s=(out[i].facts?.length||0)+(out[i+1].facts?.length||0);if(s<score){score=s;best=i}}out.splice(best,2,mergeIntentPair(out[best],out[best+1]));}
  let guard=0;while(out.length<target&&out.length&&guard++<60){let idx=-1,bestFacts=1;for(let i=0;i<out.length;i++){const count=unique(out[i].facts||[]).length;if(count>bestFacts){bestFacts=count;idx=i}}if(idx<0)break;const split=splitIntent(out[idx]);if(!split)break;out.splice(idx,1,...split);}
  return out.slice(0,target);
}
export function deterministicPlan(source,options={}){
  const doc=normalizeSourceDocument(source,options),requested=options.targetSlides??doc.metadata?.targetSlides??Math.max(4,Math.min(12,doc.sections.length+2)),requestedTargetSlides=clamp(Math.round(requested),1,60),bodyTarget=Math.max(0,requestedTargetSlides-1);
  let intents=doc.sections.map(summarizeBlock);if(!intents.length)intents=[summarizeBlock({title:doc.title,content:doc.rawContent},0)];intents=fitIntents(intents,bodyTarget||1);
  const cover={goal:'Introduce the presentation',roleHint:'cover',title:doc.title,topic:doc.title,facts:[],takeaway:'',chartIntent:null,tableIntent:null,diagramIntent:null,imageIntent:null,emphasis:'title'};
  const slideIntents=requestedTargetSlides===1?[cover]:[cover,...intents].slice(0,requestedTargetSlides),actualSlides=slideIntents.length,warnings=[];if(actualSlides!==requestedTargetSlides)warnings.push({code:'TARGET_SLIDES_UNSATISFIABLE',requested:requestedTargetSlides,actual:actualSlides});
  const plan={schemaVersion:1,purpose:clean(options.purpose)||'Communicate the source material clearly',audience:clean(options.audience)||clean(doc.metadata?.audience)||'General audience',tone:clean(options.tone)||'clear',targetSlides:requestedTargetSlides,requestedTargetSlides,actualSlides,warnings,storyArc:['context','evidence','insight','action'],sections:doc.sections.map(s=>({id:s.id,title:s.title||s.id})),slideIntents,source:{title:doc.title,sourceType:doc.sourceType}};
  const check=validateDeckPlan(plan);if(!check.ok){const err=new Error(check.errors.map(e=>`${e.path}: ${e.message}`).join('; '));err.code='DECK_PLAN_INVALID';err.report=check;throw err}return plan;
}
export function deckPlanToDeckSpec(plan,options={}){
  const check=validateDeckPlan(plan);if(!check.ok){const err=new Error(check.errors.map(e=>`${e.path}: ${e.message}`).join('; '));err.code='DECK_PLAN_INVALID';err.report=check;throw err}
  const coverOnly=plan.slideIntents.length===1,body=plan.slideIntents.filter((_,i)=>i>0).map((intent,index)=>({id:`plan-${index+1}`,role:intent.roleHint==='cover'?'statement':intent.roleHint,content:{title:intent.title||intent.topic,summary:(intent.facts||[]).slice(0,2).join(' '),takeaway:intent.takeaway,items:(intent.facts||[]).slice(2,8).map(label=>({label}))}}));
  const spec=normalizeDeckSpec({schemaVersion:1,title:plan.slideIntents[0]?.title||plan.source?.title||'Untitled presentation',goal:plan.purpose,audience:plan.audience,theme:options.theme||'aurora',randomSeed:options.seed||`${plan.source?.title||'minddeck'}:${plan.targetSlides}`,coverOnly,slides:body});
  const validation=validateDeckSpec(spec);if(!validation.ok){const err=new Error(validation.errors.map(e=>`${e.path}: ${e.message}`).join('; '));err.code='DECK_SPEC_INVALID';err.report=validation;throw err}return spec;
}
export const Planner=Object.freeze({validateDeckPlan,deterministicPlan,toDeckSpec:deckPlanToDeckSpec});
