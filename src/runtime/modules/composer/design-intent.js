import { composerClean, composerDensityOf, composerRoleOf } from './base.js';
import { normalizeSlideContent } from './schema.js';
import { normalizeTemplateParams } from './params.js';

const DesignIntentFieldOrder=Object.freeze(['columns','emphasisIndex','density','mediaRatio','alignment','direction','titleWeight','visualWeight','contentBalance','imageFocus']);
const DesignIntentRoleFields=Object.freeze({
  cover:['alignment','titleWeight','visualWeight','contentBalance'],agenda:['columns','emphasisIndex','density','alignment','titleWeight','visualWeight','contentBalance'],
  section:['alignment','titleWeight','visualWeight','contentBalance'],statement:['alignment','titleWeight','visualWeight','contentBalance'],
  cards:['columns','emphasisIndex','density','alignment','titleWeight','visualWeight','contentBalance'],compare:['direction','columns','emphasisIndex','alignment','titleWeight','visualWeight','contentBalance'],
  problem:['columns','emphasisIndex','density','alignment','titleWeight','visualWeight','contentBalance'],solution:['direction','columns','emphasisIndex','density','alignment','titleWeight','visualWeight','contentBalance'],
  process:['direction','emphasisIndex','density','alignment','titleWeight','visualWeight'],timeline:['direction','density','alignment','titleWeight','visualWeight'],
  metrics:['columns','emphasisIndex','density','alignment','titleWeight','visualWeight','contentBalance'],trend:['columns','emphasisIndex','density','alignment','titleWeight','visualWeight','contentBalance'],
  table:['columns','emphasisIndex','density','alignment','titleWeight','visualWeight','contentBalance'],matrix:['columns','emphasisIndex','density','alignment','titleWeight','visualWeight','contentBalance'],
  image:['mediaRatio','direction','density','alignment','titleWeight','visualWeight','contentBalance','imageFocus'],quote:['alignment','titleWeight','visualWeight'],
  case:['mediaRatio','columns','emphasisIndex','density','direction','alignment','titleWeight','visualWeight','contentBalance','imageFocus'],roadmap:['direction','emphasisIndex','density','alignment','titleWeight','visualWeight'],
  architecture:['columns','direction','emphasisIndex','density','alignment','titleWeight','visualWeight','contentBalance'],conclusion:['emphasisIndex','density','alignment','titleWeight','visualWeight','contentBalance']
});
const DesignIntentSchema=Object.freeze({
  columns:Object.freeze({type:'integer',min:1,max:4,label:'列数',description:'希望页面主要内容分成几列'}),
  emphasisIndex:Object.freeze({type:'integer',min:-1,max:11,label:'重点项',description:'-1 为自动，否则强调对应内容项'}),
  density:Object.freeze({type:'enum',values:Object.freeze(['compact','standard','rich']),label:'信息密度',description:'控制页面内容的紧凑程度'}),
  mediaRatio:Object.freeze({type:'number',min:.3,max:.7,label:'图片占比',description:'图文页面中媒体区域的占比'}),
  alignment:Object.freeze({type:'enum',values:Object.freeze(['left','center','right']),label:'对齐',description:'主要文字和内容的对齐方式'}),
  direction:Object.freeze({type:'enum',values:Object.freeze(['horizontal','vertical','left','right']),label:'方向',description:'流程、对比或图文页面的主要方向'}),
  titleWeight:Object.freeze({type:'enum',values:Object.freeze(['quiet','balanced','strong']),label:'标题强度',description:'标题在页面中的视觉存在感'}),
  visualWeight:Object.freeze({type:'number',min:.8,max:1.2,label:'视觉权重',description:'整体文字和结构的视觉强度'}),
  contentBalance:Object.freeze({type:'enum',values:Object.freeze(['text','balanced','visual']),label:'内容平衡',description:'更偏文字、平衡或更偏视觉'}),
  imageFocus:Object.freeze({type:'enum',values:Object.freeze(['context','balanced','hero']),label:'图片重点',description:'图片是辅助信息、平衡展示还是主视觉'})
});
const DesignIntentTitleMode=Object.freeze({quiet:'minimal',balanced:'compact',strong:'standard'});
const DesignIntentTitleWeight=Object.freeze({minimal:'quiet',compact:'balanced',standard:'strong'});
const DesignIntentStructuralFields=new Set(['columns','emphasisIndex','mediaRatio','direction','imageFocus']);

function designIntentClone(value){return value&&typeof value==='object'&&!Array.isArray(value)?JSON.parse(JSON.stringify(value)):value}
function designIntentHasOwn(value,key){return !!value&&Object.prototype.hasOwnProperty.call(value,key)}
function designIntentIssue(code,field,message,value){return {code,field,message,value}}
function designIntentValue(rule,value){
  if(rule.type==='integer'){if(typeof value==='string'&&value.trim()!=='')value=Number(value);return Number.isInteger(value)?value:value}
  if(rule.type==='number'){if(typeof value==='string'&&value.trim()!=='')value=Number(value);return typeof value==='number'&&Number.isFinite(value)?value:value}
  if(rule.type==='enum')return typeof value==='string'?composerClean(value).toLowerCase():value;
  return value;
}
function designIntentValueValid(rule,value){
  if(rule.type==='integer'&&!Number.isInteger(value))return false;
  if(rule.type==='number'&&(typeof value!=='number'||!Number.isFinite(value)))return false;
  if(rule.type==='enum'&&!rule.values.includes(value))return false;
  if((rule.type==='integer'||rule.type==='number')&&rule.min!==undefined&&value<rule.min)return false;
  if((rule.type==='integer'||rule.type==='number')&&rule.max!==undefined&&value>rule.max)return false;
  return true;
}
export function normalizeDesignIntent(input={},context={}){
  const raw=input&&typeof input==='object'&&!Array.isArray(input)?input:{},intent={};
  for(const field of DesignIntentFieldOrder){if(!designIntentHasOwn(raw,field)||raw[field]===undefined||raw[field]===null||raw[field]==='')continue;intent[field]=designIntentValue(DesignIntentSchema[field],raw[field])}
  if(designIntentHasOwn(intent,'density'))intent.density=composerDensityOf(intent.density);
  return intent;
}
export function validateDesignIntent(input={},context={}){
  const raw=input&&typeof input==='object'&&!Array.isArray(input)?input:{},intent=normalizeDesignIntent(raw,context),errors=[],warnings=[];
  for(const key of Object.keys(raw))if(!DesignIntentSchema[key])errors.push(designIntentIssue('UNSUPPORTED_DESIGN_INTENT',key,`Unsupported design intent field: ${key}`,raw[key]));
  for(const field of DesignIntentFieldOrder){if(!designIntentHasOwn(raw,field)||raw[field]===undefined||raw[field]===null||raw[field]==='')continue;const value=designIntentValue(DesignIntentSchema[field],raw[field]);if(!designIntentValueValid(DesignIntentSchema[field],value))errors.push(designIntentIssue('INVALID_DESIGN_INTENT',field,`Invalid value for ${field}`,raw[field]))}
  const content=normalizeSlideContent(context.content||{}),count=content.items.length;
  if(designIntentHasOwn(intent,'emphasisIndex')&&intent.emphasisIndex>=0&&count&&intent.emphasisIndex>=count)errors.push(designIntentIssue('INVALID_DESIGN_INTENT','emphasisIndex','emphasisIndex exceeds item count',intent.emphasisIndex));
  if(designIntentHasOwn(intent,'columns')&&count&&intent.columns>Math.max(1,count))warnings.push(designIntentIssue('DESIGN_INTENT_CAPACITY','columns','columns exceeds current item count; Composer may choose a compatible fallback structure',intent.columns));
  return {ok:errors.length===0,errors,warnings,intent};
}
export function serializeDesignIntent(input={},context={}){
  const check=validateDesignIntent(input,context);if(!check.ok){const err=new Error(check.errors.map(item=>`${item.field}: ${item.message}`).join('; '));err.code='INVALID_DESIGN_INTENT';err.errors=check.errors;throw err}
  const ordered={};for(const field of DesignIntentFieldOrder)if(designIntentHasOwn(check.intent,field))ordered[field]=check.intent[field];return JSON.stringify(ordered);
}
function designIntentRuleAccepts(rule,value){return !!rule&&designIntentValueValid(rule,value)}
function designIntentPreferredMediaRatio(intent){
  if(designIntentHasOwn(intent,'mediaRatio'))return intent.mediaRatio;
  if(intent.imageFocus==='hero')return .64;if(intent.imageFocus==='context')return .4;if(intent.imageFocus==='balanced')return .5;
  if(intent.contentBalance==='visual')return .62;if(intent.contentBalance==='text')return .38;if(intent.contentBalance==='balanced')return .5;
  return undefined;
}
export function intentParamsForTemplate(template,intentInput={},context={}){
  const intent=normalizeDesignIntent(intentInput,context),schema=template?.paramSchema||{},requested={};
  for(const field of ['columns','emphasisIndex','alignment','direction','visualWeight'])if(designIntentHasOwn(intent,field)&&designIntentRuleAccepts(schema[field],intent[field]))requested[field]=intent[field];
  if(designIntentHasOwn(intent,'density')&&designIntentRuleAccepts(schema.density,intent.density))requested.density=intent.density;
  if(designIntentHasOwn(intent,'titleWeight')){const mode=DesignIntentTitleMode[intent.titleWeight];if(designIntentRuleAccepts(schema.titleMode,mode))requested.titleMode=mode}
  const mediaRatio=designIntentPreferredMediaRatio(intent);if(mediaRatio!==undefined&&designIntentRuleAccepts(schema.mediaRatio,mediaRatio))requested.mediaRatio=mediaRatio;
  return normalizeTemplateParams(template,requested,{...context,density:intent.density||context.density});
}
function designIntentVariantScore(template,intent,reasons){
  const variant=String(template?.layout?.variant||''),family=String(template?.family||''),traits=new Set(template?.traits||[]);let score=0;
  if(designIntentHasOwn(intent,'columns')&&!template?.paramSchema?.columns){
    const columns=intent.columns;if(columns===2&&/split|pair|dual/.test(variant)){score+=16;reasons.push('结构接近两列')}
    else if(columns>=3&&/grid|cards|table/.test(variant)){score+=12;reasons.push('结构适合多列')}
    else if(DesignIntentStructuralFields.has('columns'))score-=8;
  }
  if(designIntentHasOwn(intent,'direction')&&!template?.paramSchema?.direction){
    const direction=intent.direction;if((direction==='vertical'&&/vertical|steps/.test(variant))||(direction==='horizontal'&&/line|horizontal|split/.test(variant))||(direction==='left'&&/left/.test(variant))||(direction==='right'&&/right/.test(variant))){score+=14;reasons.push(`结构方向 ${direction}`)}else score-=8;
  }
  if(intent.contentBalance==='visual'){if(traits.has('media')||traits.has('numeric')||/image|chart|metrics/.test(family)){score+=18;reasons.push('偏视觉表达')}else score-=4}
  if(intent.contentBalance==='text'){if(traits.has('sparse')||/statement|table|quote/.test(family)){score+=12;reasons.push('偏文字表达')}else if(traits.has('media'))score-=8}
  if(intent.contentBalance==='balanced')score+=2;
  if(designIntentHasOwn(intent,'imageFocus')){if(traits.has('media')||/image/.test(family)){score+=intent.imageFocus==='hero'?22:14;reasons.push(`图片重点 ${intent.imageFocus}`)}else score-=18}
  return score;
}
export function scoreDesignIntent(template,intentInput={},context={}){
  const intent=normalizeDesignIntent(intentInput,context),schema=template?.paramSchema||{},reasons=[],warnings=[];let score=0;
  const direct=[['columns',32],['emphasisIndex',24],['alignment',12],['direction',30],['visualWeight',10],['density',14]];
  for(const [field,points] of direct){if(!designIntentHasOwn(intent,field))continue;const rule=schema[field];if(rule&&designIntentRuleAccepts(rule,intent[field])){score+=points;reasons.push(`支持 ${field}`)}else if(rule){score-=Math.round(points*.75);warnings.push(`模板不接受 ${field}=${intent[field]}`)}else if(DesignIntentStructuralFields.has(field))score-=field==='direction'?6:10}
  if(designIntentHasOwn(intent,'titleWeight')){const mode=DesignIntentTitleMode[intent.titleWeight];if(designIntentRuleAccepts(schema.titleMode,mode)){score+=10;reasons.push('支持标题强度')}else score-=3}
  const mediaRatio=designIntentPreferredMediaRatio(intent);if(mediaRatio!==undefined){if(designIntentRuleAccepts(schema.mediaRatio,mediaRatio)){score+=32;reasons.push('支持媒体占比')}else if(designIntentHasOwn(intent,'mediaRatio')||designIntentHasOwn(intent,'imageFocus'))score-=20}
  score+=designIntentVariantScore(template,intent,reasons);
  return {score,reasons,warnings,intent};
}
function designIntentDirectionValues(role,templates){
  if(['image','case'].includes(role))return ['left','right'];
  const values=new Set();for(const template of templates||[])for(const value of template?.paramSchema?.direction?.values||[])values.add(value);
  return values.size?[...values]:['horizontal','vertical'];
}
export function designIntentCapabilities({role,content,templates=[]}={}){
  const selectedRole=composerRoleOf(role),value=normalizeSlideContent(content||{}),allowed=DesignIntentRoleFields[selectedRole]||[],paramNames=new Set();for(const template of templates||[])for(const key of Object.keys(template?.paramSchema||{}))paramNames.add(key);
  return allowed.filter(field=>{
    if(field==='emphasisIndex')return value.items.length>0;
    if(field==='mediaRatio'||field==='imageFocus')return value.media.length>0||['image','case'].includes(selectedRole);
    if(['contentBalance','density','titleWeight','visualWeight'].includes(field))return true;
    if(field==='columns'&&['compare','solution'].includes(selectedRole))return true;
    return paramNames.has(field)||field==='direction';
  }).map(field=>{
    const descriptor={field,...designIntentClone(DesignIntentSchema[field])};
    if(field==='direction')descriptor.values=designIntentDirectionValues(selectedRole,templates);
    if(field==='emphasisIndex')descriptor.max=Math.max(-1,value.items.length-1);
    return descriptor;
  });
}
export function readDesignIntentFromNode(node,{includeDerived=true}={}){
  const stored=normalizeDesignIntent(node?.composer?.designIntent||{},{content:node?.composer?.content||{}});if(!includeDerived)return stored;
  const params=node?.composer?.selectedTemplateParams||{},result={...stored};
  for(const field of ['columns','emphasisIndex','alignment','direction','mediaRatio','visualWeight'])if(!designIntentHasOwn(result,field)&&designIntentHasOwn(params,field))result[field]=params[field];
  if(!designIntentHasOwn(result,'density')&&node?.deckDensity)result.density=composerDensityOf(node.deckDensity);
  if(!designIntentHasOwn(result,'titleWeight')&&params.titleMode)result.titleWeight=DesignIntentTitleWeight[params.titleMode]||'strong';
  return result;
}
export const DesignIntent=Object.freeze({
  version:1,fields:DesignIntentFieldOrder,schema:DesignIntentSchema,roleFields:DesignIntentRoleFields,
  normalize:normalizeDesignIntent,validate:validateDesignIntent,serialize:serializeDesignIntent,
  paramsForTemplate:intentParamsForTemplate,score:scoreDesignIntent,capabilities:designIntentCapabilities,read:readDesignIntentFromNode
});
