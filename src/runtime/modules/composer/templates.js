import { DECK_THEMES, PAGE_ROLES, ComposerRoleSet, composerClean, composerThemeOf } from './base.js';
import { contentFacts, normalizeSlideContent } from './schema.js';

const ComposerSlotSources=new Set(['title','subtitle','summary','takeaway','items','media']);
const ComposerSlotKinds=new Set(['text','collection','media']);
const ComposerCapacityKeys=new Set(['titleChars','summaryChars','items','numericItems','media']);
const ForbiddenManifestKeys=new Set(['renderer','render','dom','element','component','mount']);
const isObject=value=>!!value&&typeof value==='object'&&!Array.isArray(value);
function composerCap(title=64,summary=180,items=[0,6],numeric=[0,6],media=[0,2]){return {titleChars:{max:title},summaryChars:{max:summary},items:{min:items[0],max:items[1]},numericItems:{min:numeric[0],max:numeric[1]},media:{min:media[0],max:media[1]}}}
function composerSlots(sources,requiredSources=['title']){return sources.map((source,index)=>({id:`${source}-${index+1}`,kind:source==='media'?'media':source==='items'?'collection':'text',source,required:requiredSources.includes(source)}))}
function composerTemplate(id,label,family,roles,capacity,variant,priority=50,slots=['title','summary','items','media'],requiredSources=['title']){return {id,label,family,roles,priority,capacity,slots:composerSlots(slots,requiredSources),layout:{kind:family,variant,canvas:{width:1600,height:900}}}}
export const ComposerTemplateManifests=Object.freeze([
composerTemplate('cover-focus-01','聚焦封面','cover-focus',['cover'],composerCap(72,150,[0,5],[0,5],[0,1]),'focus',90,['title','subtitle','summary','items']),
composerTemplate('cover-grid-01','章节封面','cover-grid',['cover'],composerCap(64,130,[1,6],[0,6],[0,1]),'grid',82,['title','subtitle','items']),
composerTemplate('section-index-01','章节序号','section-index',['section'],composerCap(52,140,[0,4]),'index',85),
composerTemplate('section-band-01','章节横幅','section-band',['section','cover'],composerCap(58,150,[0,6]),'band',76),
composerTemplate('statement-panel-01','重点面板','statement-panel',['statement','conclusion'],composerCap(60,180,[0,2]),'panel',84),
composerTemplate('statement-split-01','观点分栏','statement-split',['statement','section','conclusion'],composerCap(54,170,[0,4],[0,4],[0,1]),'split',78),
composerTemplate('cards-grid-01','卡片矩阵','cards-grid',['cards'],composerCap(50,100,[2,6]),'grid',86),
composerTemplate('cards-list-01','纵向卡片','cards-list',['cards','compare'],composerCap(54,120,[2,6]),'list',78),
composerTemplate('compare-split-01','左右对比','compare-split',['compare'],composerCap(50,100,[2,4]),'split',88),
composerTemplate('compare-table-01','条目对照','compare-table',['compare','cards'],composerCap(52,120,[2,6]),'table',76),
composerTemplate('process-line-01','横向流程','process-line',['process','timeline'],composerCap(52,100,[3,5]),'line',88),
composerTemplate('process-steps-01','阶梯流程','process-steps',['process','cards'],composerCap(54,120,[3,6]),'steps',79),
composerTemplate('metrics-cards-01','指标卡组','metrics-cards',['metrics'],composerCap(50,90,[2,4],[2,4]),'cards',90),
composerTemplate('metrics-hero-01','核心指标','metrics-hero',['metrics','statement'],composerCap(50,110,[1,4],[1,4]),'hero',84),
composerTemplate('trend-bars-01','趋势柱列','trend-bars',['trend','metrics'],composerCap(52,90,[3,6],[2,6]),'bars',88),
composerTemplate('trend-steps-01','趋势阶梯','trend-steps',['trend','timeline'],composerCap(54,110,[3,6],[1,6]),'steps',79),
composerTemplate('timeline-line-01','水平时间轴','timeline-line',['timeline','process','trend'],composerCap(52,100,[3,5]),'line',87),
composerTemplate('timeline-vertical-01','垂直时间轴','timeline-vertical',['timeline'],composerCap(54,120,[3,6]),'vertical',80),
composerTemplate('quote-center-01','中心引用','quote-center',['quote'],composerCap(48,200,[0,1]),'center',88,['title','summary','takeaway']),
composerTemplate('quote-side-01','侧栏引用','quote-side',['quote','statement'],composerCap(52,190,[0,2]),'side',80,['title','summary','takeaway']),
composerTemplate('image-left-01','左图右文','image-left',['image'],composerCap(52,150,[0,3],[0,3],[1,2]),'left',88,['title','summary','items','media'],['title','media']),
composerTemplate('image-right-01','右图左文','image-right',['image'],composerCap(52,150,[0,3],[0,3],[0,2]),'right',81),
composerTemplate('conclusion-actions-01','行动结论','conclusion-actions',['conclusion'],composerCap(52,160,[1,4]),'actions',90),
composerTemplate('conclusion-summary-01','总结收束','conclusion-summary',['conclusion','statement'],composerCap(54,180,[0,4]),'summary',82)
].map(item=>Object.freeze(item)));

function isFiniteNumber(value){return typeof value==='number'&&Number.isFinite(value)}
function validateRange(range,path,errors){
  if(!isObject(range)){errors.push(`${path} must be an object`);return}
  for(const key of ['min','max'])if(range[key]!==undefined&&!isFiniteNumber(range[key]))errors.push(`${path}.${key} must be a finite number`);
  if(range.min!==undefined&&range.min<0)errors.push(`${path}.min must be >= 0`);
  if(range.max!==undefined&&range.max<0)errors.push(`${path}.max must be >= 0`);
  if(isFiniteNumber(range.min)&&isFiniteNumber(range.max)&&range.min>range.max)errors.push(`${path} min exceeds max`);
}
function validatePureData(value,path,errors,seen=new Set()){
  if(typeof value==='function'){errors.push(`${path} must not contain functions`);return}
  if(value===null||typeof value!=='object')return;
  if(typeof Node!=='undefined'&&value instanceof Node){errors.push(`${path} must not contain DOM nodes`);return}
  if(seen.has(value)){errors.push(`${path} must be acyclic pure data`);return}
  seen.add(value);
  for(const [key,child] of Object.entries(value)){
    if(ForbiddenManifestKeys.has(String(key).toLowerCase()))errors.push(`${path}.${key} is not allowed in template manifest`);
    validatePureData(child,`${path}.${key}`,errors,seen);
  }
  seen.delete(value);
}
export function validateComposerTemplate(template){
  const errors=[];
  if(!isObject(template))return {ok:false,errors:['template must be an object']};
  if(!composerClean(template.id)||typeof template.id!=='string')errors.push('template id required');
  if(!composerClean(template.family)||typeof template.family!=='string')errors.push('template family required');
  if(!Array.isArray(template.roles)||!template.roles.length||template.roles.some(role=>typeof role!=='string'||!ComposerRoleSet.has(role)))errors.push('template roles invalid');
  if(!isFiniteNumber(template.priority))errors.push('template priority must be a finite number');
  if(!isObject(template.capacity))errors.push('template capacity required');
  else for(const [key,range] of Object.entries(template.capacity)){if(!ComposerCapacityKeys.has(key))errors.push(`capacity key not allowed: ${key}`);else validateRange(range,`capacity.${key}`,errors)}
  if(!Array.isArray(template.slots))errors.push('template slots must be an array');
  else{
    const ids=new Set();
    for(const [index,slot] of template.slots.entries()){
      const path=`slots[${index}]`;
      if(!isObject(slot)){errors.push(`${path} must be an object`);continue}
      if(typeof slot.id!=='string'||!composerClean(slot.id))errors.push(`${path}.id must be a non-empty string`);
      else if(ids.has(slot.id))errors.push(`duplicate slot id: ${slot.id}`);else ids.add(slot.id);
      if(!ComposerSlotKinds.has(slot.kind))errors.push(`${path}.kind invalid`);
      if(!ComposerSlotSources.has(slot.source))errors.push(`${path}.source invalid`);
      if(typeof slot.required!=='boolean')errors.push(`${path}.required must be boolean`);
      if(slot.kind==='collection'){
        for(const key of ['min','max'])if(slot[key]!==undefined&&!isFiniteNumber(slot[key]))errors.push(`${path}.${key} must be a finite number`);
        if(isFiniteNumber(slot.min)&&slot.min<0)errors.push(`${path}.min must be >= 0`);
        if(isFiniteNumber(slot.max)&&slot.max<0)errors.push(`${path}.max must be >= 0`);
        if(isFiniteNumber(slot.min)&&isFiniteNumber(slot.max)&&slot.min>slot.max)errors.push(`${path}.min exceeds max`);
      }
    }
  }
  if(!isObject(template.layout))errors.push('template layout must be pure data object');
  else{
    validatePureData(template.layout,'layout',errors);
    if(!isObject(template.layout.canvas)||template.layout.canvas.width!==1600||template.layout.canvas.height!==900)errors.push('layout canvas must be 1600x900');
  }
  validatePureData(template,'template',errors);
  return {ok:errors.length===0,errors};
}
export function createComposerTemplateRegistry(initial=[]){const map=new Map(),api={register(template){const check=validateComposerTemplate(template);if(!check.ok)throw new Error(check.errors.join('; '));if(map.has(template.id))throw new Error(`duplicate template id: ${template.id}`);map.set(template.id,Object.freeze({...template}));return api},get(id){return map.get(id)||null},has(id){return map.has(id)},list(filter={}){return [...map.values()].filter(item=>(!filter.role||item.roles.includes(filter.role))&&(!filter.family||item.family===filter.family))},validate:validateComposerTemplate};initial.forEach(item=>api.register(item));return api}
export const TemplateRegistry=createComposerTemplateRegistry(ComposerTemplateManifests);

function validateTypographyScale(scale,key,errors){if(!isObject(scale))errors.push(`typography.${key} must be an object`);else{if(!isFiniteNumber(scale.fontSize)||scale.fontSize<=0)errors.push(`typography.${key}.fontSize invalid`);if(!isFiniteNumber(scale.fontWeight)||scale.fontWeight<=0)errors.push(`typography.${key}.fontWeight invalid`)}}
export function validateComposerTheme(theme){
  const errors=[];
  if(!isObject(theme))return {ok:false,errors:['theme must be an object']};
  if(typeof theme.id!=='string'||!composerClean(theme.id))errors.push('theme id required');
  const colorKeys=['background','surface','surface2','primary','secondary','text','muted','border','positive','negative'];
  if(!isObject(theme.colors))errors.push('theme colors required');else for(const key of colorKeys)if(typeof theme.colors[key]!=='string'||!theme.colors[key])errors.push(`colors.${key} required`);
  const typographyKeys=['display','title','heading','body','caption','metric'];
  if(!isObject(theme.typography))errors.push('theme typography required');else typographyKeys.forEach(key=>validateTypographyScale(theme.typography[key],key,errors));
  if(!isObject(theme.shape))errors.push('theme shape required');else for(const key of ['radiusSm','radiusMd','radiusLg','borderWidth'])if(!isFiniteNumber(theme.shape[key])||theme.shape[key]<0)errors.push(`shape.${key} invalid`);
  if(!isObject(theme.spacing))errors.push('theme spacing required');else for(const key of ['xs','sm','md','lg','xl'])if(!isFiniteNumber(theme.spacing[key])||theme.spacing[key]<0)errors.push(`spacing.${key} invalid`);
  return {ok:errors.length===0,errors};
}
export const ThemeRegistry=Object.freeze({
  get(id){return DECK_THEMES.find(theme=>theme.id===id)||null},
  has(id){return DECK_THEMES.some(theme=>theme.id===id)},
  list(){return DECK_THEMES.slice()},
  validate:validateComposerTheme,
  resolve(id,fallback='aurora'){if(typeof id==='object'&&id){const base=composerThemeOf(fallback),colors={...base.colors,...(id.colors||{})},typography={...base.typography,...(id.typography||{})},shape={...base.shape,...(id.shape||{})},spacing={...base.spacing,...(id.spacing||{})};return {...base,...id,colors,typography,shape,spacing,bg:colors.background,surface:colors.surface,surface2:colors.surface2,text:colors.text,muted:colors.muted,accent:colors.primary,accent2:colors.secondary,line:colors.border,danger:colors.negative,success:colors.positive}}return ThemeRegistry.get(id)||ThemeRegistry.get(fallback)||composerThemeOf('aurora')}
});
function composerRangeCheck(value,rule,label,reasons){if(!rule)return true;if(rule.min!==undefined&&value<rule.min){reasons.push(`${label} ${value} < ${rule.min}`);return false}if(rule.max!==undefined&&value>rule.max){reasons.push(`${label} ${value} > ${rule.max}`);return false}return true}
export function capacityFits(content,capacity={}){const facts=contentFacts(content),reasons=[];let ok=true;ok=composerRangeCheck(facts.titleChars,capacity.titleChars,'titleChars',reasons)&&ok;ok=composerRangeCheck(facts.summaryChars,capacity.summaryChars,'summaryChars',reasons)&&ok;ok=composerRangeCheck(facts.itemCount,capacity.items,'items',reasons)&&ok;ok=composerRangeCheck(facts.numericItemCount,capacity.numericItems,'numericItems',reasons)&&ok;ok=composerRangeCheck(facts.mediaCount,capacity.media,'media',reasons)&&ok;return {ok,reasons,facts}}
export const Capacity=Object.freeze({facts:contentFacts,fits:capacityFits});
export function requiredSlotsAvailable(content,template){const value=normalizeSlideContent(content),missing=[];for(const slot of template.slots||[]){if(!slot.required)continue;const source=value[slot.source];if(Array.isArray(source)?source.length===0:!source)missing.push(slot.source)}return {ok:missing.length===0,missing}}
export const ComposerRoleCatalog=Object.freeze(PAGE_ROLES.slice());
