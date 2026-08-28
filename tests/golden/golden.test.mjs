import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {dirname,join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {compileDeck,normalizeDeckSpec,TemplateRegistry,Quality,Provenance} from '../../src/core/composer.js';

const here=dirname(fileURLToPath(import.meta.url));
const root=resolve(here,'../..');
const sampleDir=join(root,'examples','v10-golden');
const snapshotDir=join(here,'snapshots');
const legalElementTypes=new Set(['text','image','video','shape']);
const requiredRoles=new Set(['cover','section','statement','cards','compare','process','metrics','trend','timeline','quote','image','conclusion']);
const volatileGoldenMetadata=Object.freeze(['project.deckComposerVersion','project.nodes[].provenance.generatedAtVersion']);

function readJson(path){return JSON.parse(readFileSync(path,'utf8'))}
function sortObject(input={}){return Object.fromEntries(Object.entries(input).sort(([a],[b])=>a.localeCompare(b)))}
function flattenProject(project){const out=[];const walk=node=>{out.push(node);for(const child of node.children||[])walk(child)};walk(project);return out}
function elementSummary(elements=[]){
  const types={};
  for(const element of elements)types[element.type]=(types[element.type]||0)+1;
  return {count:elements.length,types:sortObject(types)};
}
function canonicalNode(node){
  const template=TemplateRegistry.get(node.composer?.selectedTemplateId);
  return {
    id:node.id,
    title:node.title,
    role:node.composer?.role||null,
    templateId:node.composer?.selectedTemplateId||null,
    family:template?.family||null,
    elements:elementSummary(node.slideElements||[]),
    provenance:{
      schemaVersion:node.composer?.schemaVersion??null,
      generatedAtVersion:node.composer?.generatedAtVersion??null,
      generatedBy:node.composer?.generatedBy??null,
      generatedElementCount:node.composer?.generatedElementIds?.length??0
    }
  };
}
function canonicalQuality(quality){
  return {
    ok:quality.ok,
    errorCodes:(quality.errors||[]).map(item=>item.code).sort(),
    warningCodes:(quality.warnings||[]).map(item=>item.code).sort(),
    metrics:{...quality.metrics,roleCounts:sortObject(quality.metrics?.roleCounts||{})}
  };
}
function canonicalResult(result){
  const nodes=flattenProject(result.project);
  return {
    assignments:result.assignments.map(item=>({slideId:item.slideId,templateId:item.templateId,family:item.family,reason:item.reason})),
    project:{
      schemaVersion:result.project.schemaVersion,
      deckComposerVersion:result.project.deckComposerVersion,
      deckSource:result.project.deckSource,
      deckTheme:result.project.deckTheme,
      deckDensity:result.project.deckDensity,
      mapLayout:result.project.mapLayout,
      uiTheme:result.project.uiTheme,
      childCount:(result.project.children||[]).length,
      nodeCount:nodes.length,
      nodes:nodes.map(canonicalNode)
    },
    quality:canonicalQuality(result.quality)
  };
}
function normalizeGoldenMetadata(value){
  const out=structuredClone(value);
  if(out?.project)delete out.project.deckComposerVersion;
  for(const node of out?.project?.nodes||[])if(node?.provenance)delete node.provenance.generatedAtVersion;
  return out;
}
function stableElement(element={}){const out={};for(const key of Object.keys(element).sort()){if(key==='selected'||key==='hovered'||key==='__runtime')continue;out[key]=structuredClone(element[key])}return out}
function stableBusinessOutput(result){
  const nodes=flattenProject(result.project);
  return {
    assignments:result.assignments.map(item=>({slideId:item.slideId,templateId:item.templateId,family:item.family,reason:item.reason})),
    project:{
      schemaVersion:result.project.schemaVersion,
      deckSource:result.project.deckSource,
      deckTheme:result.project.deckTheme,
      deckDensity:result.project.deckDensity,
      mapLayout:result.project.mapLayout,
      uiTheme:result.project.uiTheme,
      nodes:nodes.map(node=>({
        id:node.id,title:node.title,text:node.text,points:structuredClone(node.points||[]),media:structuredClone(node.media||[]),
        role:node.composer?.role||null,templateId:node.composer?.selectedTemplateId||null,templateParams:structuredClone(node.composer?.selectedTemplateParams||{}),
        content:structuredClone(node.composer?.content||null),elements:(node.slideElements||[]).map(stableElement)
      }))
    },
    quality:canonicalQuality(result.quality)
  };
}
function assertGoldenBoundary(result){
  const canonical=canonicalResult(result),normalized=normalizeGoldenMetadata(canonical),versionOnly=structuredClone(canonical);
  versionOnly.project.deckComposerVersion='999.0';
  for(const node of versionOnly.project.nodes||[])node.provenance.generatedAtVersion='999.0.0';
  assert.deepEqual(normalizeGoldenMetadata(versionOnly),normalized,'version-only metadata changes must not fail frozen Golden');

  const business=stableBusinessOutput(result),contentMutation=structuredClone(business),contentNode=contentMutation.project.nodes.find(node=>node.content?.title)||contentMutation.project.nodes[0];
  contentNode.content ||= {};contentNode.content.title=`${contentNode.content.title||contentNode.title} [regression]`;
  assert.throws(()=>assert.deepEqual(contentMutation,business),{name:'AssertionError'},'real slide content changes must fail Golden business comparison');

  const layoutMutation=structuredClone(business),layoutNode=layoutMutation.project.nodes.find(node=>node.elements?.some(element=>Number.isFinite(element.x))),layoutElement=layoutNode?.elements?.find(element=>Number.isFinite(element.x));
  assert.ok(layoutElement,'Golden boundary sample must contain a positioned slide element');
  layoutElement.x+=1;
  assert.throws(()=>assert.deepEqual(layoutMutation,business),{name:'AssertionError'},'real element/layout changes must fail Golden business comparison');
}
function assertNativeProject(project){
  assert.equal(project.schemaVersion,1,'native Project schemaVersion must remain 1');
  assert.ok(Array.isArray(project.children),'native Project must use children');
  assert.equal(Object.prototype.hasOwnProperty.call(project,'slides'),false,'Golden tests must not introduce a slides-based Project model');
  assert.equal(Object.prototype.hasOwnProperty.call(project,'pages'),false,'Golden tests must not introduce a pages-based Project model');
  for(const node of flattenProject(project)){
    assert.ok(Array.isArray(node.children),`${node.id} must use native children`);
    assert.ok(Array.isArray(node.slideElements),`${node.id} must use native slideElements`);
    for(const element of node.slideElements){
      assert.ok(legalElementTypes.has(element.type),`${node.id} contains illegal element type ${element.type}`);
    }
    const elementQuality=Quality.validateElements(node.slideElements||[]);
    assert.equal(elementQuality.ok,true,`${node.id} element quality failed: ${elementQuality.errors.map(item=>item.code).join(',')}`);
  }
}

assert.deepEqual(volatileGoldenMetadata,['project.deckComposerVersion','project.nodes[].provenance.generatedAtVersion'],'volatile metadata allow-list must stay explicit');
const sampleFiles=readdirSync(sampleDir).filter(name=>name.endsWith('.deck.json')).sort();
assert.ok(sampleFiles.length>=8&&sampleFiles.length<=12,`expected 8-12 golden samples, got ${sampleFiles.length}`);
const coveredRoles=new Set();let boundaryChecked=false;
for(const file of sampleFiles){
  const sample=readJson(join(sampleDir,file));
  const snapshotFile=file.replace('.deck.json','.snapshot.json');
  const snapshot=readJson(join(snapshotDir,snapshotFile));
  assert.equal(snapshot.baseline,'V9.9.0-frozen-for-V10-step0');
  const first=compileDeck(sample,snapshot.compileOptions);
  const second=compileDeck(sample,snapshot.compileOptions);
  assertNativeProject(first.project);
  const canonicalFirst=canonicalResult(first),canonicalSecond=canonicalResult(second);
  assert.deepEqual(canonicalSecond,canonicalFirst,`${file} canonical output must be deterministic`);
  assert.deepEqual(stableBusinessOutput(second),stableBusinessOutput(first),`${file} full content/layout business output must be deterministic`);
  assert.deepEqual(normalizeGoldenMetadata(canonicalFirst),normalizeGoldenMetadata(snapshot.expected),`${file} changed from V10 Step 0 golden baseline outside the allowed version metadata boundary`);
  if(!boundaryChecked){assertGoldenBoundary(first);boundaryChecked=true}
  const normalized=normalizeDeckSpec(sample);
  const assignmentQuality=Quality.validateAssignment(normalized,first.assignments);
  assert.equal(assignmentQuality.ok,true,`${file} assignment quality failed: ${assignmentQuality.errors.map(item=>item.code).join(',')}`);
  assert.equal(first.quality.ok,true,`${file} project quality failed: ${first.quality.errors.map(item=>item.code).join(',')}`);
  assert.equal(first.project.children.length,normalized.slides.length,`${file} slide count mismatch`);
  assert.ok(first.quality.metrics.familyCount>=Math.min(2,first.quality.metrics.composerPages),`${file} must retain family diversity`);
  assert.match(first.project.deckComposerVersion,/^\d+\.\d+(?:\.\d+)?$/,'deckComposerVersion must remain valid version metadata');
  const firstNodes=flattenProject(first.project),secondNodes=flattenProject(second.project);
  assert.deepEqual(firstNodes.map(node=>node.composer?.generatedHash),secondNodes.map(node=>node.composer?.generatedHash),`${file} provenance hashes must be deterministic`);
  for(const node of firstNodes){
    coveredRoles.add(node.composer?.role);
    assert.equal(node.composer?.generatedBy,'Core.Composer');
    assert.match(node.composer?.generatedAtVersion,/^\d+\.\d+\.\d+(?:[-+].*)?$/,'generatedAtVersion must remain valid version metadata');
    assert.equal(Provenance.isDirty(node),false,`${file}/${node.id} must be clean immediately after compilation`);
  }
}
assert.equal(boundaryChecked,true,'Golden metadata/content/layout boundary tests must execute');
assert.deepEqual([...coveredRoles].sort(),[...requiredRoles].sort(),'golden samples must cover all V9.9 page roles');
console.log(`MindDeck V10 Golden regression: OK (${sampleFiles.length} samples, ${coveredRoles.size} roles; version metadata normalized)`);
