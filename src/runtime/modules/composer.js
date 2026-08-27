import { DECK_THEMES, PAGE_ROLES, composerThemeOf, composerRoleLabel, composerRoleOf } from './composer/base.js';
import { normalizeDeckSpec, validateDeckSpec, normalizeSlideContent, contentFacts, contentFromNode, inferSlideRole, SlideRoles } from './composer/schema.js';
import { parseComposerOutline } from './composer/outline.js';
import { ComposerTemplateManifests, TemplateRegistry, ThemeRegistry, Capacity, validateComposerTemplate, createComposerTemplateRegistry } from './composer/templates.js';
import { ProfessionalTemplateManifests, ProfessionalTemplateFamilies, ProfessionalTemplateStats } from './composer/professional-templates.js';
import { CapacityTuning } from './composer/professional-capacity.js';
import { Parametrics, normalizeTemplateParams, validateTemplateParams } from './composer/params.js';
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
function buildSlideElements(node,options={}){const content=composerNormalizeSlideContent(options.content||node?.composer?.content||contentFromNode(node||{})),role=composerRoleOf(options.role||node?.deckRole||inferSlideRole(content)),candidates=recommendTemplates({role,content,currentTemplateId:options.currentTemplateId,density:options.density||node?.deckDensity,limit:12}),candidate=options.templateId?candidates.find(item=>item.templateId===options.templateId):candidates[0],template=options.templateId?options.templateId:candidate;if(!template){const err=new Error(`No template candidate for role ${role}`);err.code='NO_TEMPLATE_CANDIDATE';throw err}return composerCompileSlide({content,template,params:options.params,theme:options.theme||node?.deckTheme,density:options.density||node?.deckDensity,uid:options.uid,zStart:options.zStart,strictParams:options.strictParams===true,role}).elements}
function composerApplyTemplate(request={}){return applyTemplateWithStructured(applyTemplateToNode,request)}
function composerRelayoutNode(node,options={}){return relayoutNodeWithStructured(relayoutComposerNode,node,options)}
function composerRethemeProject(project,theme,options={}){return rethemeProjectWithStructured(rethemeComposerProject,project,theme,options)}
export { DECK_THEMES, PAGE_ROLES };
export const Composer=Object.freeze({
  themes:DECK_THEMES,roles:PAGE_ROLES,SlideRoles,templates:AllTemplateManifests,TemplateRegistry,ThemeRegistry,Capacity:ComposerCapacity,Parametrics,Provenance,
  Quality:ComposerQuality,Diversity,Library:ComposerTemplateLibrary,theme:composerThemeOf,roleLabel:composerRoleLabel,
  normalizeDeckSpec:composerNormalizeDeckSpec,validateDeckSpec:composerValidateDeckSpec,normalizeSlideContent:composerNormalizeSlideContent,contentFacts,parseOutline,inferRole,
  buildSlideElements,validateTemplate:validateComposerTemplate,createTemplateRegistry:createComposerTemplateRegistry,normalizeTemplateParams,validateTemplateParams,
  matchTemplates,recommendTemplates,recommendNodeTemplates,createAllocationState,allocateTemplates,bindTemplateSlots,compileSlide:composerCompileSlide,compileDeck:composerCompileDeck,
  compose:composeOutline,applyTemplate:composerApplyTemplate,relayoutNode:composerRelayoutNode,rethemeProject:composerRethemeProject,describe(project){return describeComposerProject(project)}
});
