import { DECK_THEMES, PAGE_ROLES, composerThemeOf, composerRoleLabel, composerRoleOf } from './composer/base.js';
import { normalizeDeckSpec, validateDeckSpec, normalizeSlideContent, contentFacts, contentFromNode, inferSlideRole, SlideRoles } from './composer/schema.js';
import { parseComposerOutline } from './composer/outline.js';
import { ComposerTemplateManifests, TemplateRegistry, ThemeRegistry, Capacity, validateComposerTemplate, createComposerTemplateRegistry } from './composer/templates.js';
import { ProfessionalTemplateManifests, ProfessionalTemplateFamilies, ProfessionalTemplateStats } from './composer/professional-templates.js';
import { CapacityTuning } from './composer/professional-capacity.js';
import { Parametrics, normalizeTemplateParams, validateTemplateParams } from './composer/params.js';
import { DesignIntent, normalizeDesignIntent, validateDesignIntent, serializeDesignIntent, designIntentCapabilities, readDesignIntentFromNode } from './composer/design-intent.js';
import { matchTemplates, recommendTemplates } from './composer/matcher.js';
import { createAllocationState, allocateTemplates } from './composer/allocator.js';
import { bindTemplateSlots, compileSlide } from './composer/compiler.js';
import { Provenance } from './composer/provenance.js';
import { Quality } from './composer/quality.js';
import { Diversity, analyzeTemplateDiversity, libraryRoleCoverage } from './composer/diversity.js';
import { compileDeck, composeOutline, recommendNodeTemplates, applyTemplateToNode, relayoutComposerNode, rethemeComposerProject, describeComposerProject } from './composer/deck.js';
import { normalizeSlideContentWithStructured, normalizeDeckSpecWithStructured, validateDeckSpecWithStructured, compileSlideWithStructured, compileDeckWithStructured, applyTemplateWithStructured, relayoutNodeWithStructured, rethemeProjectWithStructured, StructuredQuality } from './composer/structured.js';

for(const template of ProfessionalTemplateManifests)if(!TemplateRegistry.has(template.id))TemplateRegistry.register(template);
const AllTemplateManifests=Object.freeze([...ComposerTemplateManifests,...ProfessionalTemplateManifests]);
const parametricCount=AllTemplateManifests.filter(template=>template.parametricFamily).length;
const ComposerTemplateLibrary=Object.freeze({
  roles:PAGE_ROLES.length,templates:AllTemplateManifests.length,families:new Set(AllTemplateManifests.map(template=>template.family)).size,
  parametricTemplates:parametricCount,parametricRatio:parametricCount/Math.max(1,AllTemplateManifests.length),
  professionalTemplates:ProfessionalTemplateStats.templates,professionalFamilies:ProfessionalTemplateStats.families,
  professionalParametricTemplates:ProfessionalTemplateStats.parametric,addedFamilies:ProfessionalTemplateFamilies
});
const ComposerCapacity=Object.freeze({...Capacity,...CapacityTuning});
const ComposerQuality=Object.freeze({...StructuredQuality,analyzeDiversity:analyzeTemplateDiversity,libraryCoverage:libraryRoleCoverage});

function parseOutline(source){const parsed=parseComposerOutline(source),count=item=>1+(item.children||[]).reduce((sum,child)=>sum+count(child),0);return {...parsed,pageCount:1+(parsed.specs||[]).reduce((sum,item)=>sum+count(item),0)}}
function inferRole(node,context={}){return inferSlideRole(node?.composer?.content||contentFromNode(node||{}),node?.deckRole&&context.preserveExplicit!==false?node.deckRole:null,context)}
function composerCompileSlide(request={}){return compileSlideWithStructured(compileSlide,request)}
function composerNormalizeSlideContent(input={}){return normalizeSlideContentWithStructured(input)}
function composerNormalizeDeckSpec(input={},options={}){return normalizeDeckSpecWithStructured(input,options)}
function composerValidateDeckSpec(input){return validateDeckSpecWithStructured(input)}
function composerCompileDeck(spec,options={}){
  const result=compileDeckWithStructured(compileDeck,spec,options),normalized=composerNormalizeDeckSpec(spec,options),
    diversity=analyzeTemplateDiversity(normalized,result.assignments,TemplateRegistry);
  result.diversity=diversity;
  return result;
}
function buildSlideElements(node,options={}){const content=composerNormalizeSlideContent(options.content||node?.composer?.content||contentFromNode(node||{})),role=composerRoleOf(options.role||node?.deckRole||inferSlideRole(content)),candidates=recommendTemplates({role,content,currentTemplateId:options.currentTemplateId,density:options.density||node?.deckDensity,intent:options.intent,limit:12}),candidate=options.templateId?candidates.find(item=>item.templateId===options.templateId):candidates[0],template=options.templateId?options.templateId:candidate;if(!template){const err=new Error(`No template candidate for role ${role}`);err.code='NO_TEMPLATE_CANDIDATE';throw err}return composerCompileSlide({content,template,params:options.params??candidate?.params,theme:options.theme||node?.deckTheme,density:options.intent?.density||options.density||node?.deckDensity,uid:options.uid,zStart:options.zStart,strictParams:options.strictParams===true,role}).elements}
function composerApplyTemplate(request={}){return applyTemplateWithStructured(applyTemplateToNode,request)}
function composerRelayoutNode(node,options={}){return relayoutNodeWithStructured(relayoutComposerNode,node,options)}
function composerRethemeProject(project,theme,options={}){return rethemeProjectWithStructured(rethemeComposerProject,project,theme,options)}
function composerResolveDesignIntent(request={}){
  const node=request.node,content=composerNormalizeSlideContent(request.content||node?.composer?.content||contentFromNode(node||{})),role=composerRoleOf(request.role||node?.composer?.role||node?.deckRole||inferSlideRole(content)),check=validateDesignIntent(request.intent||{},{content,role});
  if(!check.ok){const err=new Error(check.errors.map(item=>`${item.field}: ${item.message}`).join('; '));err.code='INVALID_DESIGN_INTENT';err.report=check;throw err}
  const intent=check.intent,density=intent.density||request.density||node?.deckDensity,candidates=recommendTemplates({role,content,registry:TemplateRegistry,currentTemplateId:request.currentTemplateId??node?.composer?.selectedTemplateId,density,intent,limit:request.limit??12});
  if(!candidates.length){const err=new Error(`No template candidate for role ${role}`);err.code='NO_TEMPLATE_CANDIDATE';err.role=role;err.intent=intent;throw err}
  const selected=candidates[0];return {intent,role,content,density,candidates,templateId:selected.templateId,params:{...(selected.params||{})},matcher:'Core.Composer.matchTemplates',warnings:[...(check.warnings||[]),...(selected.warnings||[])]};
}
function composerApplyDesignIntent(request={}){
  const node=request.node;if(!node)throw new Error('node required');
  if(Provenance.isDirty(node)&&!request.force){const err=new Error('Current slide contains manual edits');err.code='COMPOSER_DIRTY';throw err}
  const resolution=composerResolveDesignIntent(request),result=composerApplyTemplate({node,templateId:resolution.templateId,params:resolution.params,theme:request.theme,density:resolution.density,role:resolution.role,force:request.force===true,strictParams:true});
  node.composer.designIntent={...resolution.intent};
  node.composer.intentResolution={matcher:resolution.matcher,templateId:resolution.templateId,params:{...resolution.params},candidateCount:resolution.candidates.length};
  return {...result,intent:{...resolution.intent},resolution:{...resolution,candidates:resolution.candidates.map(candidate=>({...candidate}))}};
}
function composerDesignIntentCapabilities(node,options={}){
  if(!node&&!options.content)return [];
  const content=composerNormalizeSlideContent(options.content||node?.composer?.content||contentFromNode(node||{})),role=composerRoleOf(options.role||node?.composer?.role||node?.deckRole||inferSlideRole(content)),candidates=recommendTemplates({role,content,registry:TemplateRegistry,currentTemplateId:node?.composer?.selectedTemplateId,density:options.density||node?.deckDensity,limit:72}),templates=candidates.map(candidate=>TemplateRegistry.get(candidate.templateId)).filter(Boolean);
  return designIntentCapabilities({role,content,templates});
}
function composerReadDesignIntent(node,options={}){return readDesignIntentFromNode(node,options)}
export { DECK_THEMES, PAGE_ROLES };
export const Composer=Object.freeze({
  themes:DECK_THEMES,roles:PAGE_ROLES,SlideRoles,templates:AllTemplateManifests,TemplateRegistry,ThemeRegistry,Capacity:ComposerCapacity,Parametrics,Provenance,DesignIntent,
  Quality:ComposerQuality,Diversity,Library:ComposerTemplateLibrary,theme:composerThemeOf,roleLabel:composerRoleLabel,
  normalizeDeckSpec:composerNormalizeDeckSpec,validateDeckSpec:composerValidateDeckSpec,normalizeSlideContent:composerNormalizeSlideContent,contentFacts,parseOutline,inferRole,
  buildSlideElements,validateTemplate:validateComposerTemplate,createTemplateRegistry:createComposerTemplateRegistry,normalizeTemplateParams,validateTemplateParams,
  normalizeDesignIntent,validateDesignIntent,serializeDesignIntent,resolveDesignIntent:composerResolveDesignIntent,applyDesignIntent:composerApplyDesignIntent,designIntentCapabilities:composerDesignIntentCapabilities,readDesignIntent:composerReadDesignIntent,
  matchTemplates,recommendTemplates,recommendNodeTemplates,createAllocationState,allocateTemplates,bindTemplateSlots,compileSlide:composerCompileSlide,compileDeck:composerCompileDeck,
  compose:composeOutline,applyTemplate:composerApplyTemplate,relayoutNode:composerRelayoutNode,rethemeProject:composerRethemeProject,describe(project){return describeComposerProject(project)}
});
