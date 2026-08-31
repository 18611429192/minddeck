import { deterministicPlan, validateDeckPlan } from './planner.js';
import { normalizeSourceDocument } from './source-document.js';

const aiClean=value=>String(value??'').trim();
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const clampSlides=value=>{const number=Number(value),rounded=Number.isFinite(number)?Math.round(number):8;return Math.max(1,Math.min(60,rounded))};
const DEEPSEEK_BASE_URL='https://api.deepseek.com';
const DEEPSEEK_MODELS=Object.freeze({fast:'deepseek-v4-flash',quality:'deepseek-v4-pro'});

function extractJson(text){
  const raw=aiClean(text).replace(/^```(?:json)?\s*/i,'').replace(/\s*```$/,'');
  try{return JSON.parse(raw)}catch{}
  const start=raw.indexOf('{'),end=raw.lastIndexOf('}');
  if(start>=0&&end>start)return JSON.parse(raw.slice(start,end+1));
  throw Object.assign(new Error('AI response is not valid JSON'),{code:'AI_JSON_PARSE'});
}
function requestedSlides(doc,options={}){return clampSlides(options.targetSlides??doc.metadata?.targetSlides??8)}
function sanitizePlan(value,source,options={}){
  const doc=normalizeSourceDocument(source,options),candidate=value&&typeof value==='object'&&!Array.isArray(value)?value:{},target=requestedSlides(doc,options);
  const plan={
    schemaVersion:1,
    purpose:aiClean(candidate.purpose)||'Communicate the source material clearly',
    audience:aiClean(candidate.audience)||aiClean(options.audience)||'General audience',
    tone:aiClean(candidate.tone)||'clear',
    targetSlides:target,
    actualSlides:Array.isArray(candidate.slideIntents)?candidate.slideIntents.length:0,
    warnings:[],
    storyArc:Array.isArray(candidate.storyArc)?candidate.storyArc.map(aiClean).filter(Boolean).slice(0,12):['context','evidence','insight','action'],
    sections:Array.isArray(candidate.sections)?candidate.sections.map((s,i)=>({id:aiClean(s?.id)||`section-${i+1}`,title:aiClean(s?.title)})):doc.sections.map(s=>({id:s.id,title:s.title})),
    slideIntents:Array.isArray(candidate.slideIntents)?candidate.slideIntents.map((s,i)=>({
      goal:aiClean(s?.goal)||'Explain this topic',
      roleHint:aiClean(s?.roleHint||s?.role)||undefined,
      title:aiClean(s?.title)||aiClean(s?.topic)||`Slide ${i+1}`,
      topic:aiClean(s?.topic)||aiClean(s?.title),
      facts:Array.isArray(s?.facts)?s.facts.map(aiClean).filter(Boolean).slice(0,12):[],
      takeaway:aiClean(s?.takeaway),
      chartIntent:s?.chartIntent&&typeof s.chartIntent==='object'?s.chartIntent:null,
      tableIntent:s?.tableIntent&&typeof s.tableIntent==='object'?s.tableIntent:null,
      diagramIntent:s?.diagramIntent&&typeof s.diagramIntent==='object'?s.diagramIntent:null,
      imageIntent:s?.imageIntent&&typeof s.imageIntent==='object'?s.imageIntent:null,
      emphasis:aiClean(s?.emphasis)||'balanced'
    })):[],
    source:{title:doc.title,sourceType:doc.sourceType}
  };
  plan.actualSlides=plan.slideIntents.length;
  return plan;
}

function normalizedThinking(value){return value==='enabled'?'enabled':value==='disabled'?'disabled':null}
function normalizedReasoningEffort(value){return ['low','high','max'].includes(value)?value:null}

export class OpenAICompatibleProvider{
  constructor(config={}){
    this.config={
      baseUrl:aiClean(config.baseUrl||'https://api.openai.com/v1').replace(/\/$/,''),
      apiKey:aiClean(config.apiKey),
      model:aiClean(config.model),
      timeout:Math.max(1000,Number(config.timeout)||30000),
      temperature:Number.isFinite(config.temperature)?config.temperature:0.2,
      maxTokens:Number(config.maxTokens)||4000,
      thinking:normalizedThinking(config.thinking),
      reasoningEffort:normalizedReasoningEffort(config.reasoningEffort),
      fetch:config.fetch||globalThis.fetch
    };
    if(!this.config.model)throw new Error('model is required');
  }
  describe(){
    return {
      type:'openai-compatible',
      baseUrl:this.config.baseUrl,
      model:this.config.model,
      timeout:this.config.timeout,
      temperature:this.config.temperature,
      maxTokens:this.config.maxTokens,
      thinking:this.config.thinking||'provider-default',
      reasoningEffort:this.config.reasoningEffort||'provider-default',
      apiKey:this.config.apiKey?'[configured]':'[missing]'
    };
  }
  requestBody({system,user}){
    const body={
      model:this.config.model,
      max_tokens:this.config.maxTokens,
      response_format:{type:'json_object'},
      messages:[{role:'system',content:system},{role:'user',content:user}]
    };
    if(this.config.thinking){
      body.thinking={type:this.config.thinking};
      if(this.config.thinking==='enabled'&&this.config.reasoningEffort)body.reasoning_effort=this.config.reasoningEffort;
      if(this.config.thinking==='disabled')body.temperature=this.config.temperature;
    }else body.temperature=this.config.temperature;
    return body;
  }
  async generateStructured({system,user,schemaName='deck_plan'}={}){
    if(typeof this.config.fetch!=='function')throw Object.assign(new Error('fetch unavailable'),{code:'AI_FETCH_UNAVAILABLE'});
    const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),this.config.timeout);
    try{
      const headers={'content-type':'application/json'};
      if(this.config.apiKey)headers.authorization=`Bearer ${this.config.apiKey}`;
      const response=await this.config.fetch(`${this.config.baseUrl}/chat/completions`,{
        method:'POST',headers,signal:controller.signal,body:JSON.stringify(this.requestBody({system,user}))
      });
      if(!response.ok)throw Object.assign(new Error(`AI provider HTTP ${response.status}`),{code:'AI_PROVIDER_HTTP',status:response.status});
      const payload=await response.json(),text=payload?.choices?.[0]?.message?.content;
      if(!text)throw Object.assign(new Error('AI provider returned no content'),{code:'AI_PROVIDER_EMPTY'});
      return {schemaName,text,raw:payload};
    }catch(err){
      if(err?.name==='AbortError')throw Object.assign(new Error('AI provider timeout'),{code:'AI_TIMEOUT'});
      throw err;
    }finally{clearTimeout(timer)}
  }
  async testConnection(){
    const result=await this.generateStructured({
      schemaName:'connection_test',
      system:'Return JSON only. Output exactly one JSON object with an ok boolean field.',
      user:'Return JSON now: {"ok":true}'
    });
    const parsed=extractJson(result.text);
    if(parsed?.ok!==true)throw Object.assign(new Error('AI provider connection test returned unexpected content'),{code:'AI_CONNECTION_INVALID'});
    return {ok:true,provider:this.describe()};
  }
}

export function createDeepSeekProvider(config={}){
  const preset=config.preset==='quality'?'quality':'fast';
  return new OpenAICompatibleProvider({
    baseUrl:DEEPSEEK_BASE_URL,
    model:config.model||DEEPSEEK_MODELS[preset],
    apiKey:config.apiKey,
    timeout:config.timeout??60000,
    maxTokens:config.maxTokens??(preset==='quality'?12000:8000),
    thinking:config.thinking??(preset==='quality'?'enabled':'disabled'),
    reasoningEffort:config.reasoningEffort??(preset==='quality'?'high':null),
    temperature:config.temperature??0.2,
    fetch:config.fetch
  });
}

export const DeepSeek=Object.freeze({
  baseUrl:DEEPSEEK_BASE_URL,
  models:DEEPSEEK_MODELS,
  createProvider:createDeepSeekProvider
});

const SYSTEM_PROMPT=`You are the MindDeck story planner. Return JSON only. Produce DeckPlan schemaVersion 1 with purpose, audience, tone, targetSlides, storyArc, sections, slideIntents. The slideIntents array MUST contain exactly the requested number of slides, including the cover. Each slideIntent may contain goal, roleHint, title, topic, facts, takeaway, chartIntent, tableIntent, diagramIntent, imageIntent, emphasis. Valid role hints: cover, section, agenda, statement, cards, metrics, trend, compare, process, timeline, quote, image, problem, solution, architecture, roadmap, matrix, case, table, conclusion. Never output DOM, HTML, CSS, x/y/width/height, slideElements, Project objects, or template IDs. Organize a narrative; do not map one paragraph to one slide.`;
function userPrompt(doc,options,repair=null){
  const payload={
    task:repair?'Repair the presentation story plan':'Create a presentation story plan',
    targetSlides:requestedSlides(doc,options),
    purpose:options.purpose||'',audience:options.audience||'',tone:options.tone||'',
    source:{title:doc.title,sourceType:doc.sourceType,sections:doc.sections,rawContent:doc.rawContent.slice(0,30000)}
  };
  if(repair)payload.repair={reason:repair.reason,requested:repair.requested,actual:repair.actual,instruction:`Return exactly ${repair.requested} slideIntents. Do not change the requested target.`,previousPlan:repair.previousPlan};
  return JSON.stringify(payload);
}
function fallbackResult(doc,options,attempts,warnings,reason){return {plan:deterministicPlan(doc,options),mode:'fallback',fallbackMode:'deterministic',fallbackReason:reason||warnings.at(-1)?.code||'AI_PROVIDER_FAILURE',attempts,warnings}}
export async function planWithAI(source,options={}){
  const doc=normalizeSourceDocument(source,options),provider=options.provider,targetSlides=requestedSlides(doc,options);
  if(!provider||typeof provider.generateStructured!=='function')return fallbackResult(doc,options,0,[{code:'AI_PROVIDER_UNAVAILABLE'}],'AI_PROVIDER_UNAVAILABLE');
  const attempts=Math.max(1,Math.min(3,Number(options.attempts)||2)),warnings=[];let repair=null;
  for(let attempt=1;attempt<=attempts;attempt++){
    try{
      const result=await provider.generateStructured({system:SYSTEM_PROMPT,user:userPrompt(doc,{...options,targetSlides},repair),schemaName:'deck_plan'}),parsed=extractJson(result.text),plan=sanitizePlan(parsed,doc,{...options,targetSlides}),actual=plan.slideIntents.length;
      if(actual!==targetSlides){warnings.push({code:'AI_PAGE_COUNT_MISMATCH',attempt,requested:targetSlides,actual});repair={reason:'AI_PAGE_COUNT_MISMATCH',requested:targetSlides,actual,previousPlan:plan};}
      else{
        const check=validateDeckPlan(plan);
        if(!check.ok){warnings.push({code:'AI_SCHEMA_REJECT',attempt,errors:check.errors});repair={reason:'AI_SCHEMA_REJECT',requested:targetSlides,actual,previousPlan:plan};}
        else return {plan,mode:'ai',attempts:attempt,warnings};
      }
    }catch(err){warnings.push({code:err.code||'AI_PROVIDER_FAILURE',attempt,message:err.message});repair=null}
    if(attempt<attempts)await sleep(Number(options.retryDelay)||0);
  }
  return fallbackResult(doc,{...options,targetSlides},attempts,warnings,warnings.at(-1)?.code);
}

export const AIStoryPlanner=Object.freeze({OpenAICompatibleProvider,plan:planWithAI,extractJson,sanitizePlan,DeepSeek,createDeepSeekProvider});

const aiCommandClean=value=>String(value??'').trim();
const aiCommandPlain=value=>!!value&&typeof value==='object'&&!Array.isArray(value);
const AI_COMMAND_SCOPES=Object.freeze(['deck','slide','selection']);
const AI_COMMAND_ELEMENT_TYPES=Object.freeze(['text','chart','table','diagram']);
const AI_COMMAND_ROLE_HINTS=new Set(['cover','section','agenda','statement','cards','metrics','trend','compare','process','timeline','quote','image','problem','solution','architecture','roadmap','matrix','case','table','conclusion']);

function commandJson(text){
  const raw=aiCommandClean(text).replace(/^```(?:json)?\s*/i,'').replace(/\s*```$/,'');
  try{return JSON.parse(raw)}catch{}
  const start=raw.indexOf('{'),end=raw.lastIndexOf('}');
  if(start>=0&&end>start)return JSON.parse(raw.slice(start,end+1));
  throw Object.assign(new Error('AI command response is not valid JSON'),{code:'AI_COMMAND_JSON_PARSE'});
}
function finiteJson(value,seen=new Set()){
  if(value===null||['string','boolean'].includes(typeof value))return true;
  if(typeof value==='number')return Number.isFinite(value);
  if(['undefined','function','symbol','bigint'].includes(typeof value))return false;
  if(typeof value!=='object'||seen.has(value))return false;
  seen.add(value);const children=Array.isArray(value)?value:Object.values(value),ok=children.every(item=>finiteJson(item,seen));seen.delete(value);return ok;
}
function cloneSafe(value){return finiteJson(value)?JSON.parse(JSON.stringify(value)):null}
function targetMaps(context={}){
  const nodes=new Set(),elements=new Map();
  for(const node of Array.isArray(context.nodes)?context.nodes:[]){
    const nodeId=aiCommandClean(node?.id);if(!nodeId)continue;nodes.add(nodeId);
    for(const element of Array.isArray(node?.elements)?node.elements:[]){const id=aiCommandClean(element?.id),type=aiCommandClean(element?.type);if(id&&AI_COMMAND_ELEMENT_TYPES.includes(type))elements.set(id,{nodeId,type})}
  }
  return {nodes,elements};
}
function sanitizeElementPatch(value,maps){
  if(!aiCommandPlain(value))return null;
  const elementId=aiCommandClean(value.elementId||value.id),target=maps.elements.get(elementId);if(!target)return null;
  const patch={elementId,type:target.type};
  if(target.type==='text'&&value.text!==undefined)patch.text=String(value.text??'').slice(0,12000);
  if(target.type==='chart'&&aiCommandPlain(value.chart)){const safe=cloneSafe(value.chart);if(safe)patch.chart=safe}
  if(target.type==='table'&&aiCommandPlain(value.table)){const safe=cloneSafe(value.table);if(safe)patch.table=safe}
  if(target.type==='diagram'&&aiCommandPlain(value.diagram)){const safe=cloneSafe(value.diagram);if(safe)patch.diagram=safe}
  return Object.keys(patch).length>2?patch:null;
}
function sanitizeSlideContent(value){
  if(!aiCommandPlain(value))return null;
  const out={};
  for(const field of ['title','subtitle','summary','takeaway'])if(value[field]!==undefined)out[field]=String(value[field]??'').slice(0,8000);
  if(Array.isArray(value.items))out.items=value.items.slice(0,12).map(item=>aiCommandPlain(item)?{label:aiCommandClean(item.label).slice(0,1000),detail:aiCommandClean(item.detail).slice(0,3000),value:aiCommandClean(item.value).slice(0,300),unit:aiCommandClean(item.unit).slice(0,100)}:{label:aiCommandClean(item).slice(0,1000)}).filter(item=>item.label||item.detail||item.value);
  for(const field of ['chart','table','diagram'])if(aiCommandPlain(value[field])){const safe=cloneSafe(value[field]);if(safe)out[field]=safe}
  return Object.keys(out).length?out:null;
}
export function sanitizeAICommandPatch(value,context={},options={}){
  const candidate=aiCommandPlain(value)?value:{},scope=AI_COMMAND_SCOPES.includes(options.scope)?options.scope:AI_COMMAND_SCOPES.includes(candidate.scope)?candidate.scope:'slide',maps=targetMaps(context),slidePatches=[];
  for(const raw of Array.isArray(candidate.slidePatches)?candidate.slidePatches:[]){
    if(!aiCommandPlain(raw))continue;
    const nodeId=aiCommandClean(raw.nodeId||raw.id);if(!maps.nodes.has(nodeId))continue;
    const patch={nodeId,elementPatches:(Array.isArray(raw.elementPatches)?raw.elementPatches:[]).map(item=>sanitizeElementPatch(item,maps)).filter(item=>item&&maps.elements.get(item.elementId)?.nodeId===nodeId)};
    if(raw.title!==undefined)patch.title=String(raw.title??'').slice(0,1000);
    if(raw.text!==undefined)patch.text=String(raw.text??'').slice(0,10000);
    const content=sanitizeSlideContent(raw.content);if(content)patch.content=content;
    if(options.allowRedesign===true&&aiCommandPlain(raw.redesign)&&raw.redesign.enabled===true){
      patch.redesign={enabled:true};
      const roleHint=aiCommandClean(raw.redesign.roleHint);if(AI_COMMAND_ROLE_HINTS.has(roleHint))patch.redesign.roleHint=roleHint;
      if(aiCommandPlain(raw.redesign.designIntent)){const safe=cloneSafe(raw.redesign.designIntent);if(safe)patch.redesign.designIntent=safe}
    }
    if(patch.title!==undefined||patch.text!==undefined||patch.content||patch.redesign||patch.elementPatches.length)slidePatches.push(patch);
  }
  return {schemaVersion:1,scope,summary:aiCommandClean(candidate.summary).slice(0,2000)||'AI edit',slidePatches,warnings:[]};
}
export function validateAICommandPatch(patch,context={},options={}){
  const errors=[],maps=targetMaps(context);
  if(!patch||patch.schemaVersion!==1)errors.push({code:'AI_COMMAND_VERSION',message:'schemaVersion must be 1'});
  if(!AI_COMMAND_SCOPES.includes(patch?.scope))errors.push({code:'AI_COMMAND_SCOPE',message:'scope is invalid'});
  if(!Array.isArray(patch?.slidePatches))errors.push({code:'AI_COMMAND_PATCHES',message:'slidePatches must be an array'});
  for(const [index,slide] of (patch?.slidePatches||[]).entries()){
    if(!maps.nodes.has(slide.nodeId))errors.push({code:'AI_COMMAND_NODE',path:`slidePatches[${index}].nodeId`,message:'node is not in supplied context'});
    if(slide.redesign&&!options.allowRedesign)errors.push({code:'AI_COMMAND_REDESIGN_FORBIDDEN',path:`slidePatches[${index}].redesign`,message:'redesign was not allowed'});
    for(const element of slide.elementPatches||[]){const target=maps.elements.get(element.elementId);if(!target||target.nodeId!==slide.nodeId)errors.push({code:'AI_COMMAND_ELEMENT',message:`element ${element.elementId} is not in target slide`})}
  }
  return {ok:errors.length===0,errors};
}

const COMMAND_SYSTEM=`You are the MindDeck AI editor. Return JSON only. You receive an exact snapshot of editable presentation nodes and elements. Never invent nodeId or elementId. Never output or modify geometry, x, y, w, h, z, rotation, CSS, HTML, DOM, template IDs, API keys, or renderer instructions. Preserve layout and styles unless allowRedesign is true. For text elements return only new text. For native chart elements return chart data only. For tables return table data only. For diagrams return diagram data only. When redesign is explicitly allowed, you may additionally return slide content plus redesign.enabled=true and an optional valid roleHint/designIntent. JSON example: {"schemaVersion":1,"scope":"selection","summary":"short description","slidePatches":[{"nodeId":"node-1","elementPatches":[{"elementId":"e-1","type":"text","text":"new text"}]}]}.`;
function commandUserPayload(input,repair=null){
  const payload={task:'Edit the existing MindDeck presentation',instruction:aiCommandClean(input.instruction),scope:input.scope,allowRedesign:input.allowRedesign===true,context:input.context};
  if(repair)payload.repair={reason:repair.reason,errors:repair.errors,previousPatch:repair.previousPatch,instruction:'Return one corrected JSON object using only IDs present in context.'};
  return JSON.stringify(payload);
}
export async function planAICommand(input={},options={}){
  const provider=options.provider||input.provider,scope=AI_COMMAND_SCOPES.includes(input.scope)?input.scope:'slide',context=cloneSafe(input.context)||{nodes:[]},instruction=aiCommandClean(input.instruction);
  if(!instruction)throw Object.assign(new Error('AI edit instruction is required'),{code:'AI_COMMAND_INSTRUCTION_REQUIRED'});
  if(!provider||typeof provider.generateStructured!=='function')throw Object.assign(new Error('AI provider unavailable'),{code:'AI_PROVIDER_UNAVAILABLE'});
  const attempts=Math.max(1,Math.min(3,Number(options.attempts??input.attempts)||2)),warnings=[];let repair=null;
  for(let attempt=1;attempt<=attempts;attempt++){
    try{
      const response=await provider.generateStructured({schemaName:'minddeck_edit_patch',system:COMMAND_SYSTEM,user:commandUserPayload({instruction,scope,context,allowRedesign:input.allowRedesign===true},repair)}),raw=commandJson(response.text),patch=sanitizeAICommandPatch(raw,context,{scope,allowRedesign:input.allowRedesign===true}),check=validateAICommandPatch(patch,context,{allowRedesign:input.allowRedesign===true});
      if(check.ok&&patch.slidePatches.length)return {patch,mode:'ai',attempts:attempt,warnings};
      const errors=check.ok?[{code:'AI_COMMAND_EMPTY',message:'No applicable patches were returned'}]:check.errors;warnings.push({code:'AI_COMMAND_REJECT',attempt,errors});repair={reason:'AI_COMMAND_REJECT',errors,previousPatch:patch};
    }catch(err){warnings.push({code:err.code||'AI_COMMAND_FAILURE',attempt,message:err.message});repair=null}
  }
  const error=Object.assign(new Error(warnings.at(-1)?.message||'AI edit failed'),{code:warnings.at(-1)?.code||'AI_COMMAND_FAILURE',warnings});throw error;
}

export const AICommand=Object.freeze({scopes:AI_COMMAND_SCOPES,elementTypes:AI_COMMAND_ELEMENT_TYPES,sanitize:sanitizeAICommandPatch,validate:validateAICommandPatch,plan:planAICommand,extractJson:commandJson});
