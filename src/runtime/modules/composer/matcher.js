import { composerRoleOf, composerTruncate } from './base.js';
import { normalizeSlideContent, contentFacts } from './schema.js';
import { TemplateRegistry, capacityFits, requiredSlotsAvailable } from './templates.js';
import { normalizeTemplateParams } from './params.js';
import { normalizeDesignIntent, intentParamsForTemplate, scoreDesignIntent } from './design-intent.js';
import { capacityFitness } from './professional-capacity.js';

const ExpandedRoles=new Set(['agenda','problem','solution','table','matrix','case','roadmap','architecture']);
function traitScore(template,role,facts,reasons){
  const traits=new Set(template.traits||[]);let score=0;
  if(traits.has(role)){score+=12;reasons.push(`语义适配 ${role}`)}
  if(facts.numericItemCount&&traits.has('numeric')){score+=10;reasons.push('数字证据匹配')}
  if(facts.mediaCount&&traits.has('media')){score+=10;reasons.push('媒体证据匹配')}
  if(facts.itemCount>=4&&traits.has('dense'))score+=6;
  if(facts.itemCount<=2&&traits.has('sparse'))score+=6;
  if(facts.itemCount>=3&&traits.has('sequence')&&['process','timeline','roadmap','architecture','solution'].includes(role))score+=7;
  if(['compare','matrix','solution','table'].includes(role)&&traits.has('comparison'))score+=7;
  if(role==='roadmap'&&traits.has('milestone'))score+=7;
  if(role==='case'&&traits.has('proof')&&facts.numericItemCount)score+=8;
  return score;
}
function coverFallbackContent(content){
  const value=normalizeSlideContent(content);
  return normalizeSlideContent({...value,title:composerTruncate(value.title,72),summary:composerTruncate(value.summary,150),items:value.items.slice(0,5),media:value.media.slice(0,1)});
}
export function matchTemplates({role,content,registry=TemplateRegistry,limit=12,currentTemplateId=null,density='standard',intent=null,allowCoverFallback=true}={}){
  const selectedRole=composerRoleOf(role),value=normalizeSlideContent(content),facts=contentFacts(value),designIntent=normalizeDesignIntent(intent||{},{content:value,role:selectedRole}),hasIntent=Object.keys(designIntent).length>0,candidates=[];
  for(const template of registry.list({role:selectedRole})){
    const capacity=capacityFits(value,template.capacity),required=requiredSlotsAvailable(value,template);
    if(!capacity.ok||!required.ok)continue;
    let score=100+(Number(template.priority)||0),reasons=[`支持 ${selectedRole}`],warnings=[];
    const titleMax=template.capacity?.titleChars?.max||Math.max(1,facts.titleChars),summaryMax=template.capacity?.summaryChars?.max||Math.max(1,facts.summaryChars),itemMax=template.capacity?.items?.max||Math.max(1,facts.itemCount);
    score+=Math.max(0,16-Math.round(16*facts.titleChars/Math.max(1,titleMax)));
    score+=Math.max(0,12-Math.round(12*facts.summaryChars/Math.max(1,summaryMax)));
    score+=Math.max(0,10-Math.round(10*facts.itemCount/Math.max(1,itemMax)));
    if(facts.numericItemCount&&/metrics|trend/.test(template.family)){score+=16;reasons.push('适合数字信息')}
    if(facts.mediaCount&&/image/.test(template.family)){score+=18;reasons.push('适合媒体内容')}
    const professional=Array.isArray(template.traits)&&template.traits.length>0;
    let fitness=null;
    if(professional){
      fitness=capacityFitness(facts,template.capacity);score+=Math.round(fitness.score*24);reasons.push(`容量适配 ${Math.round(fitness.score*100)}%`);
      if(template.roles?.[0]===selectedRole){score+=10;reasons.push('主角色模板')}else score+=3;
      score+=traitScore(template,selectedRole,facts,reasons);
      if(!ExpandedRoles.has(selectedRole)&&!hasIntent){score-=64;warnings.push('专业子类型等待 Design Intent 精细匹配')}
    }
    let designScore=0;if(hasIntent){const intentScore=scoreDesignIntent(template,designIntent,{role:selectedRole,content:value,density:designIntent.density||density});designScore=intentScore.score;score+=designScore;reasons.push(...intentScore.reasons);warnings.push(...intentScore.warnings)}
    if(currentTemplateId&&template.id!==currentTemplateId)score+=4;
    if(currentTemplateId===template.id){score-=8;warnings.push('当前已使用')}
    reasons.push(`容量余量 ${Math.max(0,(itemMax||0)-facts.itemCount)}`);
    const parametric=hasIntent?intentParamsForTemplate(template,designIntent,{content:value,density:designIntent.density||density}):normalizeTemplateParams(template,{}, {content:value,density});
    if(template.parametricFamily)reasons.push(`参数化 ${template.parametricFamily}`);
    candidates.push({templateId:template.id,label:template.label,family:template.family,parametricFamily:template.parametricFamily||null,params:parametric.params,score,reasons,warnings:[...warnings,...parametric.warnings],capacityFacts:facts,capacityFitness:fitness?.score??null,traits:[...(template.traits||[])],...(hasIntent?{intentScore:designScore}:{})})
  }
  const sorted=candidates.sort((a,b)=>b.score-a.score||a.templateId.localeCompare(b.templateId)).slice(0,Math.max(0,limit));
  if(sorted.length||selectedRole!=='cover'||allowCoverFallback===false)return sorted;
  const fallback=coverFallbackContent(value);
  return matchTemplates({role:selectedRole,content:fallback,registry,limit,currentTemplateId,density,intent,allowCoverFallback:false}).map(candidate=>({...candidate,reasons:[...candidate.reasons,'封面超量内容安全适配'],warnings:[...candidate.warnings,'封面内容超出模板容量，渲染时将按封面安全上限截断']}));
}
export function recommendTemplates(request={}){return matchTemplates({...request,limit:request.limit??12})}
