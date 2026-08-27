import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Core } from '../src/core/runtime.js';
import { compileSlide, compileDeck, normalizeSlideContent, validateDeckSpec, Quality, ThemeRegistry } from '../src/core/composer.js';

function fakeDocument(){
  let doc;
  class Node{
    constructor(name){this.nodeName=name;this.children=[];this.attributes={};this.style={setProperty(){}};this.classList={add(){}};this.ownerDocument=doc;}
    setAttribute(key,value){this.attributes[key]=String(value)}
    appendChild(node){this.children.push(node);return node}
  }
  doc={createElement:name=>new Node(name),createElementNS:(_ns,name)=>new Node(name)};
  return doc;
}
function dataFor(type){
  const common={chartType:type,categories:['A','B','C','D'],labels:['A','B','C','D'],values:[12,24,18,31],options:{showLabels:true,showValues:true,emphasisIndex:2}};
  if(['bar','line','area','radar'].includes(type))common.series=[{name:'S1',values:[12,24,18,31]},{name:'S2',values:[8,16,22,27]}];
  return common;
}
function chartElement(type){return {id:`chart-${type}`,type:'chart',x:100,y:180,w:900,h:500,z:1000,...dataFor(type),style:{text:'#111',gridColor:'#ddd',seriesPalette:['#123456','#654321'],axis:'#777',background:'transparent',emphasis:'#ff0000'},animation:{type:'inherit',delay:0,duration:.5}}}

await import('../src/runtime/shared-core.js?native-chart-step3');
const GeneratedCore=globalThis.MindDeckCore;
for(const runtime of [Core,GeneratedCore]){
  assert.ok(runtime.NativeChart,'NativeChart must be exported by the shared runtime');
  assert.deepEqual(runtime.NativeChart.types,['bar','line','area','donut','radar','funnel','waterfall']);
  for(const type of runtime.NativeChart.types){
    const source=dataFor(type),check=runtime.NativeChart.validate(source);assert.equal(check.ok,true,`${type} schema must validate`);
    const first=runtime.NativeChart.normalize(source),second=runtime.NativeChart.normalize(source);assert.deepEqual(second,first,`${type} normalize must be deterministic`);
    assert.deepEqual(JSON.parse(JSON.stringify(first)),first,`${type} must remain JSON serializable`);
    const svg=runtime.NativeChart.render(chartElement(type),{document:fakeDocument()});assert.equal(svg.nodeName,'svg');assert.ok(svg.children.length>0,`${type} must render real SVG primitives`);
    const host=runtime.Element.create(chartElement(type),{document:fakeDocument(),animate:false});assert.ok(host.children.some(child=>child.nodeName==='svg'),`${type} must render through Element.create`);
  }
}

const theme=ThemeRegistry.resolve('cobalt'),chartStyle=Core.NativeChart.themeStyle(theme);
assert.equal(chartStyle.text,theme.text);assert.equal(chartStyle.gridColor,theme.line);assert.equal(chartStyle.seriesPalette[0],theme.accent);assert.equal(chartStyle.axis,theme.muted);assert.equal(chartStyle.emphasis,theme.accent);

const normalizedContent=normalizeSlideContent({title:'趋势',chart:dataFor('area')});assert.equal(normalizedContent.chart.chartType,'area');
const direct={title:'原生趋势',items:[{label:'Q1',value:'12'},{label:'Q2',value:'24'},{label:'Q3',value:'31'}],chart:{chartType:'line',categories:['Q1','Q2','Q3'],series:[{name:'指标',values:[12,24,31]}]}};
const firstCompile=compileSlide({content:direct,template:'trend-bars-01',theme:'cobalt'}),secondCompile=compileSlide({content:direct,template:'trend-bars-01',theme:'cobalt'});
assert.deepEqual(secondCompile.elements,firstCompile.elements,'Composer native chart output must be deterministic');
assert.equal(firstCompile.elements.filter(element=>element.type==='chart').length,1);assert.equal(firstCompile.elements.find(element=>element.type==='chart').chartType,'line');

const sample=JSON.parse(readFileSync(new URL('../examples/v10-chart-golden/native-chart.deck.json',import.meta.url),'utf8'));
const snapshot=JSON.parse(readFileSync(new URL('./golden/chart.snapshot.json',import.meta.url),'utf8'));
const validation=validateDeckSpec(sample);assert.equal(validation.ok,true,validation.errors?.map(item=>item.message).join('; '));
const compiled=compileDeck(sample,{theme:'cobalt'});assert.equal(compiled.quality.ok,true,compiled.quality.errors?.map(item=>item.code).join(','));
const charts=(compiled.project.children||[]).map(node=>{const native=node.slideElements.filter(element=>element.type==='chart');return {id:node.id,role:node.composer?.role,chartType:native[0]?.chartType||null,nativeChartCount:native.length}});
assert.deepEqual({schemaVersion:compiled.project.schemaVersion,theme:compiled.project.deckTheme,charts},snapshot.expected,'Step 3 chart golden changed');
assert.equal(Quality.validateProject(compiled.project).ok,true,'chart-aware project quality must pass');

const saved=JSON.stringify(compiled.project),reloaded=JSON.parse(saved);Core.Project.normalize(reloaded);assert.equal(reloaded.children[0].slideElements.some(element=>element.type==='chart'),true,'save/load must preserve chart');
const portable=Core.ExportData.project(reloaded,'fusion');assert.equal(portable.children[1].slideElements.some(element=>element.type==='chart'),true,'Portable export data must preserve chart');
const original=reloaded.children[0].slideElements.find(element=>element.type==='chart'),copy=JSON.parse(JSON.stringify(original));copy.id='chart-copy';copy.x+=28;copy.y+=28;copy.w+=20;copy.h+=10;Core.Project.normalizeElement(copy);assert.equal(copy.chartType,original.chartType);assert.notEqual(copy.x,original.x);

const editorSource=readFileSync(new URL('../src/app/modules/20-slide-editor.js',import.meta.url),'utf8');
assert.match(editorSource,/function duplicateSelected\(\)/,'editor must keep generic copy');assert.match(editorSource,/const c=clone\(e\)/,'editor copy must be data-model based');assert.match(editorSource,/el\.x=Math\.round\(st\.x\+dx\)/,'editor move must stay generic');assert.match(editorSource,/el\.w=Math\.round\(nw\)/,'editor resize must stay generic');
console.log('MindDeck V10 Step 3 native chart: OK (7 chart types, Composer, Theme, Editor, Portable, deterministic golden)');
