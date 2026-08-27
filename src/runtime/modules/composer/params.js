import { composerDensityOf } from './base.js';
import { normalizeSlideContent } from './schema.js';

const ComposerParamTypes=new Set(['integer','number','enum','boolean']);
function composerParamError(code,param,message,value){return {code,param,message,value}}
function composerParamClone(value){return value&&typeof value==='object'?JSON.parse(JSON.stringify(value)):value}
function composerParamValueValid(rule,value){
  if(rule.type==='integer'&&!Number.isInteger(value))return false;
  if(rule.type==='number'&&(typeof value!=='number'||!Number.isFinite(value)))return false;
  if(rule.type==='boolean'&&typeof value!=='boolean')return false;
  if(rule.type==='enum'&&!rule.values?.includes(value))return false;
  if((rule.type==='integer'||rule.type==='number')&&rule.min!==undefined&&value<rule.min)return false;
  if((rule.type==='integer'||rule.type==='number')&&rule.max!==undefined&&value>rule.max)return false;
  return true;
}
export function validateTemplateParamSchema(schema={}){
  const errors=[];
  if(schema===null||typeof schema!=='object'||Array.isArray(schema))return {ok:false,errors:['paramSchema must be an object']};
  for(const [name,rule] of Object.entries(schema)){
    if(!rule||typeof rule!=='object'||Array.isArray(rule)){errors.push(`${name} rule must be an object`);continue}
    if(!ComposerParamTypes.has(rule.type)){errors.push(`${name} type invalid`);continue}
    if(rule.type==='enum'&&(!Array.isArray(rule.values)||!rule.values.length))errors.push(`${name} enum values required`);
    if((rule.type==='integer'||rule.type==='number')&&rule.min!==undefined&&rule.max!==undefined&&Number(rule.min)>Number(rule.max))errors.push(`${name} min exceeds max`);
    if(rule.default!==undefined&&!composerParamValueValid(rule,rule.default))errors.push(`${name} default invalid`);
    if(rule.readOnly&&rule.source!=='content.items')errors.push(`${name} readOnly source invalid`);
  }
  return {ok:errors.length===0,errors};
}
function composerDerivedDefaults(template,content,density){
  const schema=template?.paramSchema||{},value=normalizeSlideContent(content),count=value.items.length,defaults={};
  for(const [name,rule] of Object.entries(schema))defaults[name]=composerParamClone(rule.default);
  if(schema.itemCount)defaults.itemCount=count;
  const family=template?.parametricFamily||'';
  if(family==='cards'){
    if(schema.columns)defaults.columns=Math.max(1,Math.min(3,count||1));
    if(schema.density)defaults.density=composerDensityOf(density||defaults.density);
  }
  if(family==='metrics'){
    if(schema.columns)defaults.columns=Math.max(1,Math.min(4,count||1));
    if(schema.emphasisIndex&&defaults.emphasisIndex<0)defaults.emphasisIndex=count?0:-1;
  }
  if(family==='process'&&schema.emphasisIndex&&defaults.emphasisIndex<0)defaults.emphasisIndex=count?count-1:-1;
  if(family==='image'&&schema.direction)defaults.direction=template.layout?.variant==='right'?'right':'left';
  if(family==='timeline'&&schema.direction)defaults.direction=template.layout?.variant==='vertical'?'vertical':'horizontal';
  return defaults;
}
export function normalizeTemplateParams(template,input={},context={},options={}){
  const schema=template?.paramSchema||{},requested=input&&typeof input==='object'&&!Array.isArray(input)?input:{},defaults=composerDerivedDefaults(template,context.content,context.density),params={...defaults},warnings=[],errors=[];
  for(const name of Object.keys(requested))if(!Object.prototype.hasOwnProperty.call(schema,name)){const issue=composerParamError('UNSUPPORTED_TEMPLATE_PARAM',name,`Unsupported template param: ${name}`,requested[name]);errors.push(issue);warnings.push(issue)}
  for(const [name,rule] of Object.entries(schema)){
    if(rule.readOnly){
      if(Object.prototype.hasOwnProperty.call(requested,name)&&requested[name]!==defaults[name]){const issue=composerParamError('READ_ONLY_TEMPLATE_PARAM',name,`${name} is derived from content`,requested[name]);errors.push(issue);warnings.push(issue)}
      params[name]=defaults[name];
      continue;
    }
    if(!Object.prototype.hasOwnProperty.call(requested,name))continue;
    const value=requested[name];
    if(!composerParamValueValid(rule,value)){
      const issue=composerParamError('INVALID_TEMPLATE_PARAM',name,`Invalid value for ${name}`,value);errors.push(issue);warnings.push({...issue,fallback:defaults[name]});params[name]=defaults[name];continue;
    }
    params[name]=value;
  }
  if(schema.emphasisIndex&&params.emphasisIndex>=Math.max(0,params.itemCount??normalizeSlideContent(context.content).items.length)){
    const fallback=defaults.emphasisIndex;
    const issue=composerParamError('INVALID_TEMPLATE_PARAM','emphasisIndex','emphasisIndex exceeds item count',params.emphasisIndex);errors.push(issue);warnings.push({...issue,fallback});params.emphasisIndex=fallback;
  }
  if(options.strict&&errors.length){const err=new Error(errors.map(item=>`${item.param}: ${item.message}`).join('; '));err.code='INVALID_TEMPLATE_PARAM';err.errors=errors;throw err}
  return {params:Object.freeze({...params}),warnings,errors,ok:errors.length===0,parametricFamily:template?.parametricFamily||null};
}
export function validateTemplateParams(template,input={},context={}){const result=normalizeTemplateParams(template,input,context);return {ok:result.errors.length===0,errors:result.errors,warnings:result.warnings,params:result.params}}
export function resolveTemplateCandidate(candidate,registry,context={},options={}){
  const template=typeof candidate==='string'?registry?.get(candidate):candidate?.templateId?registry?.get(candidate.templateId):candidate;
  if(!template)return null;
  const input=candidate?.templateId?candidate.params:options.params;
  const normalized=normalizeTemplateParams(template,input,context,options);
  return {template,templateId:template.id,parametricFamily:template.parametricFamily||null,params:normalized.params,warnings:normalized.warnings,errors:normalized.errors};
}
export const Parametrics=Object.freeze({normalize:normalizeTemplateParams,validate:validateTemplateParams,validateSchema:validateTemplateParamSchema,resolveCandidate:resolveTemplateCandidate});
