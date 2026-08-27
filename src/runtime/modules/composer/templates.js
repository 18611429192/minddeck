import { DECK_THEMES, PAGE_ROLES, ComposerRoleSet, composerClean, composerThemeOf } from './base.js';
import { normalizeThemeManifest } from './themes.js';
import { contentFacts, normalizeSlideContent } from './schema.js';
import { validateTemplateParamSchema } from './params.js';
const ComposerSlotSources=new Set(['title','subtitle','summary','takeaway','items','media']);
function composerCap(title=64,summary=180,items=[0,6],numeric=[0,6],media=[0,2]){return {titleChars:{max:title},summaryChars:{max:summary},items:{min:items[0],max:items[1]},numericItems:{min:numeric[0],max:numeric[1]},media:{min:media[0],max:media[1]}}}
function composerSlots(...sources){return sources.map((source,index)=>({id:`${source}-${index+1}`,kind:['items','media'].includes(source)?'collection':'text',source,required:source==='title'}))}
function composerTemplate(id,label,family,roles,capacity,variant,priority=50,slots=['title','summary','items','media'],parametric=null){return {id,label,family,roles,priority,capacity,slots:composerSlots(...slots),layout:{kind:family,variant,canvas:{width:1600,height:900}},...(parametric?{parametricFamily:parametric.family,paramSchema:parametric.schema}:{})}}
const pItemCount=(max=6)=>({type:'integer',default:0,min:0,max,readOnly:true,source:'content.items'});
const pColumns=(max=4,def=3)=>({type:'integer',default:def,min:1,max});
const pEmphasis=(def=-1,max=5)=>({type:'integer',default:def,min:-1,max});
const pAlignment=(def='left')=>({type:'enum',default:def,values:['left','center','right']});
const pDirection=(def='horizontal',values=['horizontal','vertical'])=>({type:'enum',default:def,values});
const pDensity=(def='standard')=>({type:'enum',default:def,values:['compact','standard','rich']});
const pMediaRatio=(def=0.484375)=>({type:'number',default:def,min:.3,max:.7});
const pTitleMode=(def='standard')=>({type:'enum',default:def,values:['standard','compact','minimal']});
const pVisualWeight=(def=1)=>({type:'number',default:def,min:.8,max:1.2});
const parametric=(family,schema)=>({family,schema});
const statementParams=()=>parametric('statement',{itemCount:pItemCount(4),alignment:pAlignment('left'),titleMode:pTitleMode(),visualWeight:pVisualWeight()});
const cardsGridParams=()=>parametric('cards',{itemCount:pItemCount(6),columns:pColumns(3,3),emphasisIndex:pEmphasis(-1,5),alignment:pAlignment('left'),density:pDensity(),titleMode:pTitleMode(),visualWeight:pVisualWeight()});
const cardsListParams=()=>parametric('cards',{itemCount:pItemCount(6),emphasisIndex:pEmphasis(-1,5),alignment:pAlignment('left'),density:pDensity(),titleMode:pTitleMode(),visualWeight:pVisualWeight()});
const compareSplitParams=()=>parametric('compare',{itemCount:pItemCount(4),emphasisIndex:pEmphasis(-1,3),alignment:pAlignment('left'),direction:pDirection('horizontal'),titleMode:pTitleMode(),visualWeight:pVisualWeight()});
const compareTableParams=()=>parametric('compare',{itemCount:pItemCount(6),emphasisIndex:pEmphasis(-1,5),alignment:pAlignment('left'),titleMode:pTitleMode(),visualWeight:pVisualWeight()});
const processParams=()=>parametric('process',{itemCount:pItemCount(6),emphasisIndex:pEmphasis(-1,5),alignment:pAlignment('center'),direction:pDirection('horizontal'),titleMode:pTitleMode(),visualWeight:pVisualWeight()});
const metricsCardsParams=()=>parametric('metrics',{itemCount:pItemCount(4),columns:pColumns(4,4),emphasisIndex:pEmphasis(0,3),alignment:pAlignment('center'),titleMode:pTitleMode(),visualWeight:pVisualWeight()});
const metricsHeroParams=()=>parametric('metrics',{itemCount:pItemCount(4),emphasisIndex:pEmphasis(0,3),alignment:pAlignment('center'),titleMode:pTitleMode(),visualWeight:pVisualWeight()});
const timelineParams=variant=>parametric('timeline',{itemCount:pItemCount(6),alignment:pAlignment(variant==='vertical'?'left':'center'),direction:pDirection(variant==='vertical'?'vertical':'horizontal'),titleMode:pTitleMode(),visualWeight:pVisualWeight()});
const imageParams=variant=>parametric('image',{itemCount:pItemCount(3),alignment:pAlignment('left'),direction:pDirection(variant==='right'?'right':'left',['left','right']),mediaRatio:pMediaRatio(),titleMode:pTitleMode(),visualWeight:pVisualWeight()});
const conclusionActionsParams=()=>parametric('conclusion',{itemCount:pItemCount(4),emphasisIndex:pEmphasis(0,3),alignment:pAlignment('center'),titleMode:pTitleMode(),visualWeight:pVisualWeight()});
const conclusionSummaryParams=()=>parametric('conclusion',{itemCount:pItemCount(4),alignment:pAlignment('center'),titleMode:pTitleMode(),visualWeight:pVisualWeight()});
export const ComposerTemplateManifests=Object.freeze([
composerTemplate('cover-focus-01','聚焦封面','cover-focus',['cover'],composerCap(72,150,[0,5],[0,5],[0,1]),'focus',90,['title','subtitle','summary','items']),
composerTemplate('cover-grid-01','章节封面','cover-grid',['cover'],composerCap(64,130,[1,6],[0,6],[0,1]),'grid',82,['title','subtitle','items']),
composerTemplate('section-index-01','章节序号','section-index',['section'],composerCap(52,140,[0,4]),'index',85),
composerTemplate('section-band-01','章节横幅','section-band',['section','cover'],composerCap(58,150,[0,6]),'band',76),
composerTemplate('statement-panel-01','重点面板','statement-panel',['statement','quote','conclusion'],composerCap(60,180,[0,2]),'panel',84,['title','summary','items','media'],statementParams()),
composerTemplate('statement-split-01','观点分栏','statement-split',['statement','section','image','conclusion'],composerCap(54,170,[0,4],[0,4],[0,1]),'split',78,['title','summary','items','media'],statementParams()),
composerTemplate('cards-grid-01','卡片矩阵','cards-grid',['cards'],composerCap(50,100,[2,6]),'grid',86,['title','summary','items','media'],cardsGridParams()),
composerTemplate('cards-list-01','纵向卡片','cards-list',['cards','compare'],composerCap(54,120,[2,6]),'list',78,['title','summary','items','media'],cardsListParams()),
composerTemplate('compare-split-01','左右对比','compare-split',['compare'],composerCap(50,100,[2,4]),'split',88,['title','summary','items','media'],compareSplitParams()),
composerTemplate('compare-table-01','条目对照','compare-table',['compare','cards'],composerCap(52,120,[2,6]),'table',76,['title','summary','items','media'],compareTableParams()),
composerTemplate('process-line-01','横向流程','process-line',['process','timeline'],composerCap(52,100,[3,5]),'line',88,['title','summary','items','media'],processParams()),
composerTemplate('process-steps-01','阶梯流程','process-steps',['process','cards'],composerCap(54,120,[3,6]),'steps',79,['title','summary','items','media'],processParams()),
composerTemplate('metrics-cards-01','指标卡组','metrics-cards',['metrics'],composerCap(50,90,[2,4],[2,4]),'cards',90,['title','summary','items','media'],metricsCardsParams()),
composerTemplate('metrics-hero-01','核心指标','metrics-hero',['metrics','statement'],composerCap(50,110,[1,4],[1,4]),'hero',84,['title','summary','items','media'],metricsHeroParams()),
composerTemplate('trend-bars-01','趋势柱列','trend-bars',['trend','metrics'],composerCap(52,90,[3,6],[2,6]),'bars',88),
composerTemplate('trend-steps-01','趋势阶梯','trend-steps',['trend','timeline'],composerCap(54,110,[3,6],[1,6]),'steps',79),
composerTemplate('timeline-line-01','水平时间轴','timeline-line',['timeline','process','trend'],composerCap(52,100,[3,5]),'line',87,['title','summary','items','media'],timelineParams('line')),
composerTemplate('timeline-vertical-01','垂直时间轴','timeline-vertical',['timeline'],composerCap(54,120,[3,6]),'vertical',80,['title','summary','items','media'],timelineParams('vertical')),
composerTemplate('quote-center-01','中心引用','quote-center',['quote'],composerCap(48,200,[0,1]),'center',88,['title','summary','takeaway']),
composerTemplate('quote-side-01','侧栏引用','quote-side',['quote','statement'],composerCap(52,190,[0,2]),'side',80,['title','summary','takeaway']),
composerTemplate('image-left-01','左图右文','image-left',['image'],composerCap(52,150,[0,3],[0,3],[0,2]),'left',88,['title','summary','items','media'],imageParams('left')),
composerTemplate('image-right-01','右图左文','image-right',['image','statement'],composerCap(52,150,[0,3],[0,3],[0,2]),'right',81,['title','summary','items','media'],imageParams('right')),
composerTemplate('conclusion-actions-01','行动结论','conclusion-actions',['conclusion'],composerCap(52,160,[1,4]),'actions',90,['title','summary','items','media'],conclusionActionsParams()),
composerTemplate('conclusion-summary-01','总结收束','conclusion-summary',['conclusion','statement'],composerCap(54,180,[0,4]),'summary',82,['title','summary','items','media'],conclusionSummaryParams())
].map(item=>Object.freeze(item)));
export function validateComposerTemplate(template){const errors=[];if(!template||typeof template!=='object')return {ok:false,errors:['template must be an object']};if(!composerClean(template.id))errors.push('template id required');if(!composerClean(template.family))errors.push('template family required');if(!Array.isArray(template.roles)||!template.roles.length||template.roles.some(role=>!ComposerRoleSet.has(role)))errors.push('template roles invalid');if(!template.capacity||typeof template.capacity!=='object')errors.push('template capacity required');for(const [key,range] of Object.entries(template.capacity||{}))if(range&&typeof range==='object'&&range.min!==undefined&&range.max!==undefined&&Number(range.min)>Number(range.max))errors.push(`capacity ${key} min exceeds max`);if(!Array.isArray(template.slots)||template.slots.some(slot=>!ComposerSlotSources.has(slot.source)))errors.push('template slot source invalid');if(template.parametricFamily&&!composerClean(template.parametricFamily))errors.push('parametric family invalid');if(template.paramSchema){const check=validateTemplateParamSchema(template.paramSchema);if(!check.ok)errors.push(...check.errors.map(item=>`paramSchema ${item}`))}return {ok:errors.length===0,errors}}
export function createComposerTemplateRegistry(initial=[]){const map=new Map(),api={register(template){const check=validateComposerTemplate(template);if(!check.ok)throw new Error(check.errors.join('; '));if(map.has(template.id))throw new Error(`duplicate template id: ${template.id}`);map.set(template.id,Object.freeze({...template}));return api},get(id){return map.get(id)||null},has(id){return map.has(id)},list(filter={}){return [...map.values()].filter(item=>(!filter.role||item.roles.includes(filter.role))&&(!filter.family||item.family===filter.family)&&(!filter.parametricFamily||item.parametricFamily===filter.parametricFamily))},validate:validateComposerTemplate};initial.forEach(item=>api.register(item));return api}
export const TemplateRegistry=createComposerTemplateRegistry(ComposerTemplateManifests);
export const ThemeRegistry=Object.freeze({get(id){return composerThemeOf(id)},has(id){return DECK_THEMES.some(theme=>theme.id===id)},list(){return DECK_THEMES.slice()},normalize(input,fallback='aurora'){return normalizeThemeManifest(input,fallback)},resolve(input,fallback='aurora'){return normalizeThemeManifest(input,fallback)}});
function composerRangeCheck(value,rule,label,reasons){if(!rule)return true;if(rule.min!==undefined&&value<rule.min){reasons.push(`${label} ${value} < ${rule.min}`);return false}if(rule.max!==undefined&&value>rule.max){reasons.push(`${label} ${value} > ${rule.max}`);return false}return true}
export function capacityFits(content,capacity={}){const facts=contentFacts(content),reasons=[];let ok=true;ok=composerRangeCheck(facts.titleChars,capacity.titleChars,'titleChars',reasons)&&ok;ok=composerRangeCheck(facts.summaryChars,capacity.summaryChars,'summaryChars',reasons)&&ok;ok=composerRangeCheck(facts.itemCount,capacity.items,'items',reasons)&&ok;ok=composerRangeCheck(facts.numericItemCount,capacity.numericItems,'numericItems',reasons)&&ok;ok=composerRangeCheck(facts.mediaCount,capacity.media,'media',reasons)&&ok;return {ok,reasons,facts}}
export const Capacity=Object.freeze({facts:contentFacts,fits:capacityFits});
export function requiredSlotsAvailable(content,template){const value=normalizeSlideContent(content),missing=[];for(const slot of template.slots||[]){if(!slot.required)continue;const source=value[slot.source];if(Array.isArray(source)?source.length===0:!source)missing.push(slot.source)}return {ok:missing.length===0,missing}}
export const ComposerRoleCatalog=Object.freeze(PAGE_ROLES.slice());
