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

const sampleFiles=readdirSync(sampleDir).filter(name=>name.endsWith('.deck.json')).sort();
assert.ok(sampleFiles.length>=8&&sampleFiles.length<=12,`expected 8-12 golden samples, got ${sampleFiles.length}`);
const coveredRoles=new Set();
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
  assert.deepEqual(canonicalFirst,snapshot.expected,`${file} changed from V10 Step 0 golden baseline`);
  const normalized=normalizeDeckSpec(sample);
  const assignmentQuality=Quality.validateAssignment(normalized,first.assignments);
  assert.equal(assignmentQuality.ok,true,`${file} assignment quality failed: ${assignmentQuality.errors.map(item=>item.code).join(',')}`);
  assert.equal(first.quality.ok,true,`${file} project quality failed: ${first.quality.errors.map(item=>item.code).join(',')}`);
  assert.equal(first.project.children.length,normalized.slides.length,`${file} slide count mismatch`);
  assert.ok(first.quality.metrics.familyCount>=Math.min(2,first.quality.metrics.composerPages),`${file} must retain family diversity`);
  const firstNodes=flattenProject(first.project),secondNodes=flattenProject(second.project);
  assert.deepEqual(firstNodes.map(node=>node.composer?.generatedHash),secondNodes.map(node=>node.composer?.generatedHash),`${file} provenance hashes must be deterministic`);
  for(const node of firstNodes){
    coveredRoles.add(node.composer?.role);
    assert.equal(node.composer?.generatedBy,'Core.Composer');
    assert.equal(node.composer?.generatedAtVersion,'9.9.0');
    assert.equal(Provenance.isDirty(node),false,`${file}/${node.id} must be clean immediately after compilation`);
  }
}
assert.deepEqual([...coveredRoles].sort(),[...requiredRoles].sort(),'golden samples must cover all V9.9 page roles');
console.log(`MindDeck V10 Step 0 golden regression: OK (${sampleFiles.length} samples, ${coveredRoles.size} roles)`);
