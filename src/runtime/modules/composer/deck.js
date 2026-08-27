import { Ids, Project, Layout, Tree } from '../model.js';
import { composerClean, composerDensityOf, composerThemeOf, composerRoleOf, composerTruncate, composerUidFactory } from './base.js';
import { normalizeDeckSpec, normalizeSlideContent, contentFromNode, inferSlideRole } from './schema.js';
import { parseComposerOutline } from './outline.js';
import { TemplateRegistry, ThemeRegistry } from './templates.js';
import { recommendTemplates } from './matcher.js';
import { allocateTemplates } from './allocator.js';
import { compileSlide } from './compiler.js';
import { Provenance } from './provenance.js';
import { Quality } from './quality.js';

function composerMaster(theme,title){
  const master=Project.createDefaultMaster({bgColor:theme.colors.background,footerText:composerTruncate(title,70),footerId:Ids.create('m_',8)});
  const footer=master.elements[0];if(footer){footer.x=112;footer.y=846;footer.w=1050;footer.h=30;footer.fontSize=theme.typography.caption.fontSize;footer.fontWeight=theme.typography.body.fontWeight;footer.color=theme.colors.muted}
  master.elements.push({id:Ids.create('m_',8),type:'text',x:1310,y:846,w:180,h:30,z:2,text:'MindDeck V9.9',fontSize:theme.typography.caption.fontSize,fontWeight:theme.typography.caption.fontWeight,color:theme.colors.muted,textAlign:'right',animation:{type:'none',delay:0,duration:.5}});
  return master;
}
function composerNodeFromOutline(spec,depth,index){const node=Project.createNode({title:spec.title||`页面 ${index+1}`,text:spec.text||''});node.points=(spec.points||[]).map(composerClean).filter(Boolean);node.sectionIndex=depth===1?index+1:undefined;node.children=(spec.children||[]).map((child,childIndex)=>composerNodeFromOutline(child,depth+1,childIndex));return node}
function composerFlatten(root){const nodes=[];Tree.walkAll(root,(node,parent,depth)=>nodes.push({node,parent,depth}));return nodes}
function composerPrepareNode(node,{theme,density,root=false,depth=0,role=null,content=null}={}){const value=normalizeSlideContent(content||contentFromNode(node)),selectedRole=composerRoleOf(role||inferSlideRole(value,null,{root,depth}));node.deckTheme=theme;node.deckDensity=density;node.deckRole=selectedRole;node.composer={schemaVersion:1,role:selectedRole,content:value,selectedTemplateId:null,alternativeTemplateIds:[],generatedElementIds:[],generatedHash:null,generatedAtVersion:'9.9.0',generatedBy:'Core.Composer'};return node}
function composerCandidates(node,currentTemplateId=null){return recommendTemplates({role:node.composer.role,content:node.composer.content,registry:TemplateRegistry,currentTemplateId,limit:12})}
function composerCompilePrepared(root,{seed='minddeck'}={}){
  const entries=composerFlatten(root),slides=entries.map(({node})=>({id:node.id,role:node.composer.role,content:node.composer.content})),candidateMatrix=entries.map(({node})=>composerCandidates(node)),missing=candidateMatrix.findIndex(items=>!items.length);
  if(missing>=0){const err=new Error(`No template candidate for ${slides[missing].id}`);err.code='NO_TEMPLATE_CANDIDATE';err.slideId=slides[missing].id;throw err}
  const assignments=allocateTemplates(slides,candidateMatrix,{seed});
  assignments.forEach((assignment,index)=>{const node=entries[index].node,compiled=compileSlide({content:node.composer.content,template:assignment.templateId,theme:node.deckTheme,density:node.deckDensity,uid:composerUidFactory(`${node.id}:${assignment.templateId}`)});node.slideElements=compiled.elements;node.composer.selectedTemplateId=assignment.templateId;node.composer.structuralSignature=compiled.structuralSignature;node.composer.alternativeTemplateIds=[...new Set([...(assignment.alternatives||[]),...candidateMatrix[index].map(candidate=>candidate.templateId).filter(id=>id!==assignment.templateId)])].slice(0,6);Provenance.attach(node,node.composer,node.slideElements)});
  root.presentationOrder=entries.map(({node})=>node.id);
  Project.normalize(root,{schemaVersion:1});
  entries.forEach(({node})=>Provenance.refresh(node));
  return {assignments,candidateMatrix};
}
function composerFinalize(root,{mapLayout='balanced'}={}){root.mapLayout=['balanced','right','left','down','radial'].includes(mapLayout)?mapLayout:'balanced';Layout.apply(root,root.mapLayout);Project.normalize(root,{schemaVersion:1});return root}
function throwSpecValidation(validation){const err=new Error(validation.errors.map(item=>`${item.path}: ${item.message}`).join('; '));err.code='SPEC_VALIDATION_ERROR';err.report=validation;throw err}

export function compileDeck(spec,options={}){
  const rawValidation=Quality.validateSpec(spec);if(!rawValidation.ok)throwSpecValidation(rawValidation);
  const normalized=normalizeDeckSpec(spec,options),theme=ThemeRegistry.resolve(options.theme||normalized.theme),density=composerDensityOf(options.density),root=Project.createNode({id:options.rootId||Ids.create('root_',6),title:normalized.title,text:normalized.goal});
  root.schemaVersion=1;root.presentationOrder=[];root.uiTheme=options.uiTheme||'light';root.deckTheme=theme.id;root.deckDensity=density;root.deckComposerVersion='9.9';root.deckSource='deck-spec';root.master=composerMaster(theme,root.title);root.points=[];
  root.children=normalized.slides.map((slide,index)=>{const node=Project.createNode({id:slide.id,title:slide.content.title||slide.title||`页面 ${index+1}`,text:slide.content.summary});node.points=slide.content.items.map(item=>composerClean([item.value,item.unit,item.label,item.detail].filter(Boolean).join(' '))).filter(Boolean);node.media=slide.content.media.map(item=>({...item}));composerPrepareNode(node,{theme:theme.id,density,root:false,depth:1,role:slide.role,content:slide.content});return node});
  composerPrepareNode(root,{theme:theme.id,density,root:true,depth:0,role:'cover',content:{title:normalized.title,subtitle:normalized.audience,summary:normalized.goal,items:normalized.slides.slice(0,6).map(slide=>({label:slide.content.title}))}});
  const compiled=composerCompilePrepared(root,{seed:options.seed||normalized.randomSeed});composerFinalize(root,{mapLayout:options.mapLayout||'balanced'});
  const assignmentQuality=Quality.validateAssignment({slides:[{id:root.id,role:'cover',content:root.composer.content},...normalized.slides]},compiled.assignments);
  const quality=Quality.validateProject(root);quality.errors.push(...assignmentQuality.errors);quality.warnings.push(...assignmentQuality.warnings);quality.ok=quality.errors.length===0;
  return {project:root,assignments:compiled.assignments,warnings:[...(rawValidation.warnings||[]),...assignmentQuality.warnings],quality};
}
export function composeOutline(source,options={}){
  const parsed=parseComposerOutline(source),theme=composerThemeOf(options.theme),density=composerDensityOf(options.density),root=Project.createNode({id:options.rootId||Ids.create('root_',6),title:parsed.title,text:parsed.subtitle||options.subtitle||''});
  root.schemaVersion=1;root.presentationOrder=[];root.uiTheme=options.uiTheme||'light';root.deckTheme=theme.id;root.deckDensity=density;root.deckComposerVersion='9.9';root.deckSource='outline';root.master=composerMaster(theme,root.title);root.points=[];root.children=parsed.specs.map((spec,index)=>composerNodeFromOutline(spec,1,index));
  if(!root.children.length){const fallback=Project.createNode({title:'核心内容',text:parsed.subtitle||'请继续补充大纲内容'});fallback.points=[];root.children=[fallback]}
  for(const {node,depth} of composerFlatten(root).slice(1))composerPrepareNode(node,{theme:theme.id,density,root:false,depth});
  composerPrepareNode(root,{theme:theme.id,density,root:true,depth:0,role:'cover'});
  composerCompilePrepared(root,{seed:options.seed||composerClean(parsed.title)||'minddeck'});composerFinalize(root,{mapLayout:options.mapLayout||'balanced'});return root;
}
export function recommendNodeTemplates(node,options={}){if(!node)return [];const content=normalizeSlideContent(options.content||node.composer?.content||contentFromNode(node)),role=composerRoleOf(options.role||node.composer?.role||node.deckRole||inferSlideRole(content,null,{root:options.root}));return recommendTemplates({role,content,registry:TemplateRegistry,currentTemplateId:options.currentTemplateId??node.composer?.selectedTemplateId,limit:options.limit??3})}
export function applyTemplateToNode({node,templateId,theme,density,role,force=false}={}){
  if(!node)throw new Error('node required');if(Provenance.isDirty(node)&&!force){const err=new Error('Current slide contains manual edits');err.code='COMPOSER_DIRTY';throw err}
  const content=normalizeSlideContent(node.composer?.content||contentFromNode(node)),selectedRole=composerRoleOf(role||node.composer?.role||node.deckRole||inferSlideRole(content)),template=TemplateRegistry.get(templateId);
  if(!template||!template.roles.includes(selectedRole)){const err=new Error(`Template ${templateId} does not support ${selectedRole}`);err.code='TEMPLATE_ROLE_MISMATCH';throw err}
  const themeId=composerThemeOf(theme||node.deckTheme).id,densityId=composerDensityOf(density||node.deckDensity),candidates=recommendTemplates({role:selectedRole,content,registry:TemplateRegistry,currentTemplateId:templateId,limit:12});
  if(!candidates.some(candidate=>candidate.templateId===templateId)){const err=new Error(`Template ${templateId} exceeds content capacity or required slots are missing`);err.code='TEMPLATE_CAPACITY_MISMATCH';throw err}
  const compiled=compileSlide({content,template,theme:themeId,density:densityId,uid:composerUidFactory(`${node.id}:${templateId}`)});node.deckRole=selectedRole;node.deckTheme=themeId;node.deckDensity=densityId;node.slideElements=compiled.elements;Provenance.attach(node,{role:selectedRole,content,selectedTemplateId:templateId,structuralSignature:compiled.structuralSignature,alternativeTemplateIds:candidates.filter(item=>item.templateId!==templateId).slice(0,6).map(item=>item.templateId)},node.slideElements);return {node,elements:node.slideElements,metadata:node.composer,warnings:compiled.warnings}
}
export function relayoutComposerNode(node,options={}){if(!node)return null;const candidates=recommendNodeTemplates(node,{role:options.role,content:options.content,limit:12,currentTemplateId:node.composer?.selectedTemplateId});if(!candidates.length){const err=new Error('No template candidate');err.code='NO_TEMPLATE_CANDIDATE';throw err}const requested=options.templateId&&candidates.some(item=>item.templateId===options.templateId)?options.templateId:candidates[0].templateId;return applyTemplateToNode({node,templateId:requested,theme:options.theme,density:options.density,role:options.role,force:options.force===true}).node}
export function rethemeComposerProject(project,themeId,options={}){if(!project)return project;const theme=composerThemeOf(themeId),warnings=[];project.deckTheme=theme.id;project.master ||= composerMaster(theme,project.title||'MindDeck');project.master.bgColor=theme.colors.background;for(const element of project.master.elements||[])if(element.type==='text')element.color=theme.colors.muted;Tree.walkAll(project,node=>{if(!node.composer)return;if(Provenance.isDirty(node)&&options.protectDirty!==false){warnings.push({code:'COMPOSER_DIRTY',nodeId:node.id});return}try{applyTemplateToNode({node,templateId:node.composer.selectedTemplateId,theme:theme.id,density:node.deckDensity,role:node.composer.role,force:true})}catch(err){warnings.push({code:err.code||'RETHEME_FAILED',nodeId:node.id,message:err.message})}});Project.normalize(project,{schemaVersion:1});project.composerWarnings=warnings;return project}
export function describeComposerProject(project){const roles={},templates={},families={},dirty=[];let pages=0,smartPages=0;Tree.walkAll(project,node=>{pages++;if(node.composer){smartPages++;roles[node.composer.role]=(roles[node.composer.role]||0)+1;templates[node.composer.selectedTemplateId]=(templates[node.composer.selectedTemplateId]||0)+1;const family=TemplateRegistry.get(node.composer.selectedTemplateId)?.family;if(family)families[family]=(families[family]||0)+1;if(Provenance.isDirty(node))dirty.push(node.id)}});return {pages,smartPages,theme:project?.deckTheme||null,density:project?.deckDensity||null,roles,templates,families,dirtyPages:dirty.length,dirtyNodeIds:dirty}}
