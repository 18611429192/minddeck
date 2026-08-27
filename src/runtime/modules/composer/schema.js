import { PAGE_ROLES, ComposerRoleSet, ComposerThemeMap, composerClean, composerHashString, composerNumericPart } from './base.js';

const composerSchemaObject=value=>!!value&&typeof value==='object'&&!Array.isArray(value);
const composerSchemaString=value=>typeof value==='string';
function composerSchemaPushType(errors,path,code,message){errors.push({path,code,message})}
function composerValidateSlideContent(content,path,errors){
  if(!composerSchemaObject(content)){composerSchemaPushType(errors,path,'CONTENT_TYPE','content must be an object');return}
  for(const key of ['title','subtitle','summary','takeaway']){
    if(content[key]!==undefined&&!composerSchemaString(content[key]))composerSchemaPushType(errors,`${path}.${key}`,'CONTENT_FIELD_TYPE',`${key} must be a string`);
  }
  if(content.items!==undefined&&!Array.isArray(content.items))composerSchemaPushType(errors,`${path}.items`,'ITEMS_TYPE','items must be an array');
  for(const [index,item] of (Array.isArray(content.items)?content.items:[]).entries()){
    const itemPath=`${path}.items[${index}]`;
    if(!composerSchemaObject(item)){composerSchemaPushType(errors,itemPath,'ITEM_TYPE','item must be an object');continue}
    for(const key of ['id','label','detail','unit','image']){
      if(item[key]!==undefined&&!composerSchemaString(item[key]))composerSchemaPushType(errors,`${itemPath}.${key}`,'ITEM_FIELD_TYPE',`${key} must be a string`);
    }
    if(item.value!==undefined&&!composerSchemaString(item.value)&&typeof item.value!=='number')composerSchemaPushType(errors,`${itemPath}.value`,'ITEM_FIELD_TYPE','value must be a string or number');
  }
  if(content.media!==undefined&&!Array.isArray(content.media))composerSchemaPushType(errors,`${path}.media`,'MEDIA_TYPE','media must be an array');
  for(const [index,media] of (Array.isArray(content.media)?content.media:[]).entries()){
    const mediaPath=`${path}.media[${index}]`;
    if(!composerSchemaObject(media)){composerSchemaPushType(errors,mediaPath,'MEDIA_ITEM_TYPE','media item must be an object');continue}
    if(media.id!==undefined&&!composerSchemaString(media.id))composerSchemaPushType(errors,`${mediaPath}.id`,'MEDIA_FIELD_TYPE','id must be a string');
    if(media.type!==undefined&&!['image','video'].includes(media.type))composerSchemaPushType(errors,`${mediaPath}.type`,'MEDIA_KIND','media.type must be image or video');
    if(media.src!==undefined&&!composerSchemaString(media.src))composerSchemaPushType(errors,`${mediaPath}.src`,'MEDIA_FIELD_TYPE','media.src must be a string');
    if(media.alt!==undefined&&!composerSchemaString(media.alt))composerSchemaPushType(errors,`${mediaPath}.alt`,'MEDIA_FIELD_TYPE','media.alt must be a string');
  }
}
export function normalizeSlideContent(input={}){
  const source=composerSchemaObject(input)?input:{};
  const items=Array.isArray(source.items)?source.items:[];
  const media=Array.isArray(source.media)?source.media:[];
  return {
    title:composerClean(source.title),subtitle:composerClean(source.subtitle),summary:composerClean(source.summary??source.text),takeaway:composerClean(source.takeaway),
    items:items.map((item,index)=>{const src=composerSchemaObject(item)?item:{label:item};const label=composerClean(src.label??src.title??src.text),value=src.value===undefined||src.value===null?'':composerClean(src.value),detail=composerClean(src.detail),unit=composerClean(src.unit),image=composerClean(src.image);return {id:composerClean(src.id)||`item-${index+1}-${composerHashString(label||value||index)}`,label,value,detail,unit,image}}).filter(item=>item.label||item.value||item.detail||item.image),
    media:media.map((item,index)=>{const src=composerSchemaObject(item)?item:{},type=src.type==='video'?'video':'image';return {id:composerClean(src.id)||`media-${index+1}`,type,src:composerClean(src.src),alt:composerClean(src.alt)}}).filter(item=>item.src)
  };
}
export function contentFacts(content){const value=normalizeSlideContent(content),allItemText=value.items.map(item=>[item.value,item.label,item.detail].filter(Boolean).join(' '));return {titleChars:value.title.length,subtitleChars:value.subtitle.length,summaryChars:value.summary.length,takeawayChars:value.takeaway.length,itemCount:value.items.length,numericItemCount:allItemText.filter(text=>composerNumericPart(text)).length,mediaCount:value.media.length,totalTextChars:value.title.length+value.subtitle.length+value.summary.length+value.takeaway.length+allItemText.reduce((sum,text)=>sum+text.length,0)}}
export function contentFromNode(node={}){const points=Array.isArray(node.points)?node.points:[],children=Array.isArray(node.children)?node.children:[];return normalizeSlideContent({title:node.title,subtitle:node.subtitle,summary:node.text,takeaway:node.takeaway,items:[...points.map(point=>({label:point})),...children.map(child=>({label:child.title,detail:child.text}))],media:Array.isArray(node.media)?node.media:[]})}
export function inferSlideRole(content,hint=null,context={}){if(hint&&ComposerRoleSet.has(hint))return hint;if(context.root)return 'cover';const value=normalizeSlideContent(content),title=value.title.toLowerCase(),facts=contentFacts(value);if(/总结|结论|建议|下一步|行动|收尾|summary|conclusion|next step/.test(title))return 'conclusion';if(/对比|比较|区别|差异|versus|\bvs\b/.test(title))return 'compare';if(/流程|步骤|过程|路径|方法|机制|怎么做|process|workflow|steps/.test(title))return 'process';if(/时间|阶段|里程碑|规划|路线图|历程|timeline|roadmap|milestone/.test(title))return 'timeline';if(/趋势|增长|变化|走势|演进|trend|growth/.test(title))return 'trend';if(/指标|数据|成绩|结果|规模|数字|metrics|kpi|data/.test(title)||facts.numericItemCount>=Math.min(2,Math.max(1,facts.itemCount)))return 'metrics';if(/引用|原话|一句话|quote/.test(title)||/^“|^"/.test(value.summary))return 'quote';if(/图片|图示|案例|现场|产品|截图|image|visual|case/.test(title)||facts.mediaCount>0)return 'image';if(context.depth===1&&facts.itemCount>0&&!value.summary&&facts.itemCount<=4)return 'section';if(facts.itemCount>=3)return 'cards';return 'statement'}
export function validateDeckSpec(input){
  const errors=[],warnings=[],push=(path,code,message)=>errors.push({path,code,message});
  if(!composerSchemaObject(input)){push('$','SPEC_TYPE','DeckSpec must be an object');return {ok:false,errors,warnings}}
  if(input.schemaVersion!==1)push('schemaVersion','SCHEMA_VERSION','schemaVersion must be 1');
  if(!composerSchemaString(input.title))push('title','TITLE_TYPE','title must be a string');else if(!input.title.trim())push('title','TITLE_REQUIRED','title is required');
  if(!composerSchemaString(input.goal))push('goal','GOAL_TYPE','goal must be a string');else if(!input.goal.trim())push('goal','GOAL_REQUIRED','goal is required');
  if(input.audience!==undefined&&!composerSchemaString(input.audience))push('audience','AUDIENCE_TYPE','audience must be a string');
  if(input.theme!==undefined){if(!composerSchemaString(input.theme))push('theme','THEME_TYPE','theme must be a string');else if(!ComposerThemeMap[input.theme])push('theme','INVALID_THEME',`unknown theme: ${input.theme}`)}
  if(input.randomSeed!==undefined&&!composerSchemaString(input.randomSeed))push('randomSeed','RANDOM_SEED_TYPE','randomSeed must be a string');
  if(!Array.isArray(input.slides)){push('slides','SLIDES_TYPE','slides must be an array');return {ok:false,errors,warnings}}
  if(!input.slides.length)push('slides','SLIDES_REQUIRED','slides must contain at least one slide');
  const ids=new Set();
  for(const [index,slide] of input.slides.entries()){
    const path=`slides[${index}]`;
    if(!composerSchemaObject(slide)){push(path,'SLIDE_TYPE','slide must be an object');continue}
    if(!composerSchemaString(slide.id))push(`${path}.id`,'SLIDE_ID_TYPE','slide id must be a string');
    else if(!slide.id.trim())push(`${path}.id`,'SLIDE_ID_REQUIRED','slide id is required');
    else {const id=slide.id.trim();if(ids.has(id))push(`${path}.id`,'DUPLICATE_SLIDE_ID',`duplicate slide id: ${id}`);ids.add(id)}
    if(!composerSchemaString(slide.role)||!ComposerRoleSet.has(slide.role))push(`${path}.role`,'INVALID_ROLE',`unknown role: ${String(slide.role)}`);
    composerValidateSlideContent(slide.content,`${path}.content`,errors);
  }
  return {ok:errors.length===0,errors,warnings};
}
export function normalizeDeckSpec(input={},options={}){
  const source=composerSchemaObject(input)?input:{},slides=Array.isArray(source.slides)?source.slides:[];
  return {schemaVersion:1,title:composerClean(source.title)||composerClean(options.title)||'未命名演示',goal:composerClean(source.goal)||composerClean(options.goal)||'清晰表达核心内容',audience:composerClean(source.audience),theme:composerClean(source.theme)||composerClean(options.theme)||'aurora',randomSeed:composerClean(source.randomSeed)||composerClean(options.seed)||composerHashString(source.title||'minddeck'),slides:slides.map((slide,index)=>{const src=composerSchemaObject(slide)?slide:{},contentSource=composerSchemaObject(src.content)?src.content:{},content=normalizeSlideContent({...contentSource,title:contentSource.title||src.title}),id=composerClean(src.id)||`slide-${index+1}-${composerHashString(content.title||index)}`;return {id,title:content.title,role:ComposerRoleSet.has(src.role)?src.role:inferSlideRole(content,null,{depth:1,index}),content}})};
}
export const SlideRoles=Object.freeze(PAGE_ROLES.map(role=>role.id));
