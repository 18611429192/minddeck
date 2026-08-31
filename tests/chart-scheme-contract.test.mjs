import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import JSZip from 'jszip';
import { Core } from '../src/core/runtime.js';
import { PptxExporter } from '../src/runtime/modules/pptx-exporter.js';

const C=Core.Composer;
const spec=JSON.parse(readFileSync(new URL('../examples/v10-chart-scheme-stress/chart-scheme-stress.deck.json',import.meta.url),'utf8'));
const validation=C.validateDeckSpec(spec);
assert.equal(validation.ok,true,validation.errors?.map(item=>`${item.code}:${item.message}`).join('; '));
const compiled=C.compileDeck(spec,{theme:'aurora'});
assert.equal(compiled.quality.ok,true,compiled.quality.errors?.map(item=>`${item.code}:${item.message}`).join('; '));
assert.equal(compiled.project.children.length,10,'complex stress DeckSpec must generate all requested pages');

const expectedTypes=['bar','line','area','donut','radar','funnel','waterfall'];
const chartNodes=compiled.project.children.filter(node=>node.composer?.content?.chart);
assert.equal(chartNodes.length,7,'stress DeckSpec must generate seven chart pages');
assert.deepEqual(chartNodes.map(node=>node.slideElements.find(element=>element.type==='chart')?.chartType),expectedTypes);
for(const node of chartNodes){
  const chart=node.slideElements.find(element=>element.type==='chart');
  assert.ok(chart,'chart page must contain a native chart element');
  assert.equal(chart.chartLayout?.templateId,node.composer?.selectedTemplateId,'chart geometry must record the selected real template');
  assert.equal(chart.chartLayout?.source,'template-body');
  assert.ok(chart.w>=420&&chart.h>=230,'chart geometry must remain usable');
}

const chartCapabilities=C.designIntentCapabilities(chartNodes[0]).map(item=>item.field);
assert.ok(chartCapabilities.includes('density'));
assert.ok(chartCapabilities.includes('alignment'));
assert.ok(chartCapabilities.includes('visualWeight'));
assert.ok(chartCapabilities.includes('contentBalance'));
assert.ok(!chartCapabilities.includes('columns'),'chart pages must not expose fake column controls');
assert.ok(!chartCapabilities.includes('emphasisIndex'),'chart pages must not expose fake item emphasis controls');

function geometry(chart){return [Math.round(chart.x),Math.round(chart.y),Math.round(chart.w),Math.round(chart.h)].join(':')}
for(const nodeId of ['chart-bar-complex','chart-line-complex']){
  const node=compiled.project.children.find(item=>item.id===nodeId),sourceChart=JSON.parse(JSON.stringify(node.composer.content.chart));
  const intent={density:'standard',alignment:'center',visualWeight:1,contentBalance:'balanced',titleWeight:'balanced'};
  const resolution=C.resolveDesignIntent({node,intent,role:node.composer.role,theme:node.deckTheme,limit:3});
  assert.equal(resolution.candidates.length,3,`${nodeId} must expose A/B/C candidates`);
  const signatures=[];
  for(const candidate of resolution.candidates){
    C.applyTemplate({node,templateId:candidate.templateId,params:candidate.params,theme:node.deckTheme,density:'standard',role:node.composer.role,force:true,strictParams:true,intent});
    const chart=node.slideElements.find(element=>element.type==='chart');
    assert.ok(chart,`${candidate.templateId} must keep a chart element`);
    assert.equal(chart.chartLayout?.templateId,candidate.templateId,`${candidate.templateId} must be the geometry source`);
    assert.deepEqual(node.composer.content.chart,sourceChart,`${candidate.templateId} must preserve canonical chart data`);
    signatures.push(geometry(chart));
  }
  assert.equal(new Set(signatures).size,3,`${nodeId} A/B/C must produce three visibly different chart geometries`);

  const first=resolution.candidates[0];
  C.applyTemplate({node,templateId:first.templateId,params:first.params,theme:node.deckTheme,density:'standard',role:node.composer.role,force:true,strictParams:true,intent:{...intent,contentBalance:'text',visualWeight:.9}});
  const textGeometry=geometry(node.slideElements.find(element=>element.type==='chart'));
  C.applyTemplate({node,templateId:first.templateId,params:first.params,theme:node.deckTheme,density:'rich',role:node.composer.role,force:true,strictParams:true,intent:{...intent,density:'rich',contentBalance:'visual',visualWeight:1.1}});
  const visualGeometry=geometry(node.slideElements.find(element=>element.type==='chart'));
  assert.notEqual(visualGeometry,textGeometry,`${nodeId} meaningful DesignIntent must really reflow the chart`);
  assert.deepEqual(node.composer.content.chart,sourceChart,'DesignIntent reflow must not alter chart data');
}

const pptxResult=await PptxExporter.exportProject(compiled.project,{outputType:'arraybuffer'});
const zip=await JSZip.loadAsync(pptxResult.data),names=Object.keys(zip.files),chartParts=names.filter(name=>/^ppt\/charts\/chart\d+\.xml$/.test(name));
assert.equal(chartParts.length,7,'all seven MindDeck chart pages must export as editable PowerPoint chart objects');
assert.equal(pptxResult.warnings.some(item=>item.code==='PPTX_CHART_FALLBACK'),false,'supported MindDeck charts must not fall back to static/diagram output');
const approximations=pptxResult.warnings.filter(item=>item.code==='PPTX_CHART_APPROXIMATION');
assert.ok(approximations.some(item=>item.type==='funnel'&&item.editableAs==='bar'),'funnel must remain data-editable in PPTX via explicit native-chart approximation');
assert.ok(approximations.some(item=>item.type==='waterfall'&&item.editableAs==='bar'),'waterfall must remain data-editable in PPTX via explicit native-chart approximation');

console.log('MindDeck chart scheme contract: OK',JSON.stringify({slides:compiled.project.children.length,charts:chartNodes.length,pptxChartParts:chartParts.length,approximations:approximations.map(item=>item.type)}));
