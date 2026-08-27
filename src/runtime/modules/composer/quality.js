import { Tree } from '../model.js';
import { validateDeckSpec, contentFacts } from './schema.js';
import { TemplateRegistry, ThemeRegistry, capacityFits, requiredSlotsAvailable, validateComposerTemplate } from './templates.js';
import { bindTemplateSlots, structuralSignature } from './compiler.js';

function report(errors=[],warnings=[],metrics={}){return {ok:errors.length===0,errors,warnings,metrics}}
function problem(code,path,message){return {code,path,message}}

export const Quality=Object.freeze({
  validateSpec(spec){
    const validation=validateDeckSpec(spec),warnings=[...(validation.warnings||[])],normalized=spec&&typeof spec==='object'?spec:null;
    if(normalized?.slides?.length>30)warnings.push(problem('LARGE_DECK','slides',`整稿 ${normalized.slides.length} 页，建议分章节检查密度`));
    return report(validation.errors||[],warnings,{slides:normalized?.slides?.length||0});
  },
  validateAssignment(spec,assignments,registry=TemplateRegistry){
    const errors=[],warnings=[],slides=spec?.slides||[],bySlide=new Map((assignments||[]).map(item=>[item.slideId,item])),families=[];
    for(const slide of slides){
      const assignment=bySlide.get(slide.id);
      if(!assignment){errors.push(problem('ASSIGNMENT_MISSING',`slides.${slide.id}`,'页面没有模板分配'));continue}
      const template=registry.get(assignment.templateId);
      if(!template){errors.push(problem('TEMPLATE_UNKNOWN',`slides.${slide.id}`,`模板不存在：${assignment.templateId}`));continue}
      const manifestValidation=validateComposerTemplate(template);
      if(!manifestValidation.ok)errors.push(problem('TEMPLATE_MANIFEST_INVALID',`slides.${slide.id}`,manifestValidation.errors.join('; ')));
      if(!template.roles.includes(slide.role))errors.push(problem('ROLE_TEMPLATE_MISMATCH',`slides.${slide.id}`,`${slide.role} 与 ${template.id} 不匹配`));
      const capacity=capacityFits(slide.content,template.capacity);
      if(!capacity.ok)errors.push(problem('CAPACITY_EXCEEDED',`slides.${slide.id}`,capacity.reasons.join('; ')));
      const required=requiredSlotsAvailable(slide.content,template);
      if(!required.ok)errors.push(problem('REQUIRED_SLOT_EMPTY',`slides.${slide.id}`,required.missing.join(', ')));
      const binding=bindTemplateSlots({content:slide.content,template});
      const expected=new Set((template.slots||[]).map(slot=>slot.id)),actual=new Set(Object.keys(binding.bindings||{}));
      for(const slotId of expected)if(!actual.has(slotId))errors.push(problem('SLOT_BINDING_MISSING',`slides.${slide.id}`,`slot 未绑定：${slotId}`));
      families.push(template.family);
    }
    let adjacent=0;for(let i=1;i<families.length;i++)if(families[i]===families[i-1])adjacent++;
    if(adjacent)warnings.push(problem('ADJACENT_FAMILY_REUSE','assignments',`相邻模板家族重复 ${adjacent} 次`));
    if(slides.length>=6&&new Set(families).size<2)warnings.push(problem('FAMILY_DIVERSITY_LOW','assignments','整稿模板 family 多样性不足'));
    return report(errors,warnings,{assigned:(assignments||[]).length,adjacentFamilyReuse:adjacent,familyCount:new Set(families).size});
  },
  validateElements(elements,{width=1600,height=900}={}){
    const errors=[],warnings=[],ids=new Set(),types={};
    for(const [index,element] of (elements||[]).entries()){
      const path=`elements[${index}]`,type=element?.type;types[type]=(types[type]||0)+1;
      if(!element?.id)errors.push(problem('ELEMENT_ID_MISSING',path,'元素缺少 id'));else if(ids.has(element.id))errors.push(problem('ELEMENT_ID_DUPLICATE',path,`重复元素 id：${element.id}`));else ids.add(element.id);
      for(const key of ['x','y','w','h'])if(!Number.isFinite(Number(element?.[key])))errors.push(problem('GEOMETRY_INVALID',`${path}.${key}`,`${key} 不是有限数字`));
      if(Number(element?.w)<=0||Number(element?.h)<=0)errors.push(problem('GEOMETRY_NON_POSITIVE',path,'w/h 必须大于 0'));
      if(Number(element?.x)<0||Number(element?.y)<0||Number(element?.x)+Number(element?.w)>width||Number(element?.y)+Number(element?.h)>height)errors.push(problem('GEOMETRY_OUT_OF_BOUNDS',path,'元素超出 1600×900 画布'));
      if(!Number.isFinite(Number(element?.z)))errors.push(problem('Z_INVALID',`${path}.z`,'z 必须可排序'));
      if((type==='image'||type==='video')&&!element.src)errors.push(problem('MEDIA_SRC_MISSING',path,'媒体元素缺少 src'));
      if(type==='text'&&!String(element.text||'').trim())warnings.push(problem('TEXT_EMPTY',path,'文本元素为空'));
      if(type==='text'&&Number(element.fontSize)<12)warnings.push(problem('FONT_TOO_SMALL',path,'字号小于 12'));
      if(!['text','image','video','shape'].includes(type))errors.push(problem('ELEMENT_TYPE_UNSUPPORTED',path,`Composer 不允许输出 ${type}`));
    }
    return report(errors,warnings,{elements:(elements||[]).length,types});
  },
  validateProject(project){
    const errors=[],warnings=[],nodes=[],knownIds=new Set(),orderSeen=new Set(),globalElementIds=new Set(),families=[],templates=[],roleCounts={},signatureOwners=new Map();
    if(!project||typeof project!=='object')return report([problem('PROJECT_TYPE','$','project must be an object')],[],{});
    const theme=ThemeRegistry.get(project.deckTheme);
    if(!theme)errors.push(problem('THEME_UNKNOWN','deckTheme',`未知主题：${project.deckTheme}`));
    else{const themeValidation=ThemeRegistry.validate(theme);if(!themeValidation.ok)errors.push(problem('THEME_INVALID','deckTheme',themeValidation.errors.join('; ')))}
    Tree.walkAll(project,node=>{
      nodes.push(node);knownIds.add(node.id);
      const elementReport=Quality.validateElements(node.slideElements||[]);
      for(const item of elementReport.errors)errors.push({...item,path:`node.${node.id}.${item.path}`});
      for(const item of elementReport.warnings)warnings.push({...item,path:`node.${node.id}.${item.path}`});
      for(const element of node.slideElements||[]){
        if(globalElementIds.has(element.id))errors.push(problem('GENERATED_ELEMENT_ID_DUPLICATE',`node.${node.id}`,`跨页面重复元素 id：${element.id}`));
        globalElementIds.add(element.id);
      }
      if(node.composer){
        const template=TemplateRegistry.get(node.composer.selectedTemplateId);
        if(!template)errors.push(problem('TEMPLATE_UNKNOWN',`node.${node.id}.composer`,`模板不存在：${node.composer.selectedTemplateId}`));
        else{
          const manifestValidation=validateComposerTemplate(template);if(!manifestValidation.ok)errors.push(problem('TEMPLATE_MANIFEST_INVALID',`node.${node.id}.composer`,manifestValidation.errors.join('; ')));
          if(!template.roles.includes(node.composer.role))errors.push(problem('ROLE_TEMPLATE_MISMATCH',`node.${node.id}.composer`,`${node.composer.role} 与 ${template.id} 不匹配`));
          const capacity=capacityFits(node.composer.content,template.capacity);if(!capacity.ok)errors.push(problem('CAPACITY_EXCEEDED',`node.${node.id}.composer`,capacity.reasons.join('; ')));
          const required=requiredSlotsAvailable(node.composer.content,template);if(!required.ok)errors.push(problem('REQUIRED_SLOT_EMPTY',`node.${node.id}.composer`,required.missing.join(', ')));
          const binding=bindTemplateSlots({content:node.composer.content,template});if(binding.warnings.length)errors.push(problem('SLOT_BINDING_INCOMPLETE',`node.${node.id}.composer`,binding.warnings.map(item=>item.source).join(', ')));
          templates.push(template.id);families.push(template.family);
          const signature=structuralSignature(node.slideElements||[]),previous=signatureOwners.get(signature);
          if(previous&&previous.templateId!==template.id)errors.push(problem('STRUCTURAL_SIGNATURE_COLLISION',`node.${node.id}`,`${template.id} 与 ${previous.templateId} 生成相同结构签名 ${signature}`));
          else if(!previous)signatureOwners.set(signature,{nodeId:node.id,templateId:template.id});
          if(node.composer.structuralSignature&&node.composer.structuralSignature!==signature)warnings.push(problem('STRUCTURAL_SIGNATURE_STALE',`node.${node.id}.composer`,'缓存结构签名与当前元素不一致'));
        }
        roleCounts[node.composer.role]=(roleCounts[node.composer.role]||0)+1;
        const facts=contentFacts(node.composer.content||{});if(facts.totalTextChars>700)warnings.push(problem('SLIDE_DENSITY_HIGH',`node.${node.id}`,'单页文本信息较密'));
      }
    });
    const order=Array.isArray(project.presentationOrder)?project.presentationOrder:[];
    for(const [index,id] of order.entries()){
      if(orderSeen.has(id))errors.push(problem('PRESENTATION_ORDER_DUPLICATE',`presentationOrder[${index}]`,`重复节点：${id}`));else orderSeen.add(id);
      if(!knownIds.has(id))errors.push(problem('PRESENTATION_ORDER_ORPHAN',`presentationOrder[${index}]`,`引用不存在节点：${id}`));
    }
    if(!order.length||order[0]!==project.id)errors.push(problem('PRESENTATION_ORDER_ROOT','presentationOrder','root 必须位于 presentationOrder 第一项'));
    let adjacent=0;for(let i=1;i<families.length;i++)if(families[i]===families[i-1])adjacent++;
    if(adjacent>2)warnings.push(problem('DIVERSITY_LOW','project',`相邻家族重复 ${adjacent} 次`));
    if(nodes.length>=6&&new Set(families).size<2)warnings.push(problem('FAMILY_DIVERSITY_LOW','project','整稿模板 family 多样性不足'));
    const coverCount=roleCounts.cover||0,closingCount=roleCounts.conclusion||0;
    if(coverCount!==1)warnings.push(problem('COVER_COUNT','project',`封面数量为 ${coverCount}`));
    if(nodes.length>3&&closingCount===0)warnings.push(problem('CLOSING_MISSING','project','整稿没有结论页'));
    return report(errors,warnings,{pages:nodes.length,composerPages:templates.length,templateCount:new Set(templates).size,familyCount:new Set(families).size,structuralSignatureCount:signatureOwners.size,adjacentFamilyReuse:adjacent,roleCounts});
  }
});
