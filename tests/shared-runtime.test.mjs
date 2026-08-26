import assert from 'node:assert/strict';
import { createMindDeckCore } from '../src/runtime/index.js';
import { Core } from '../src/core/runtime.js';

assert.equal(Core.VERSION,'source');
const SourceCore=createMindDeckCore('source-test');
assert.equal(SourceCore.VERSION,'source-test');
await import('../src/runtime/shared-core.js?generated-runtime-test');
const GeneratedCore=globalThis.MindDeckCore;
assert.equal(GeneratedCore.VERSION,'9.8.0');

const names=['Ids','Tree','Project','Layout','Commands','Presentation','PresentationSession','Stage','MapViewport','Animation','Element','Slide','Fullscreen','Input','Recovery','Diagnostics','InlineEditor','MapRenderer','TocRenderer','PresentationView','ExportData','Portable','Architecture'];
for(const name of names){
  assert.ok(Core[name],`missing source adapter core ${name}`);
  assert.ok(SourceCore[name],`missing ESM source core ${name}`);
  assert.ok(GeneratedCore[name],`missing generated browser core ${name}`);
}

for(const runtime of [Core,GeneratedCore]){
  assert.equal(runtime.Stage.fitRect(1600,900,1600,900,0).scale,1);
  assert.equal(runtime.Input.presentationKeyAction({key:'ArrowDown'}),'next');
  assert.equal(runtime.Input.presentationKeyAction({key:'ArrowUp'}),'prev');
  assert.equal(runtime.Input.presentationKeyAction({key:'Home'}),'first');
  assert.equal(runtime.Input.presentationKeyAction({key:'End'}),'last');
  assert.equal(runtime.Input.wheelStep({deltaX:0,deltaY:100}),1);
  assert.equal(runtime.Input.wheelStep({deltaX:0,deltaY:-100}),-1);
  assert.equal(runtime.PresentationView.defaults.stagePadding,20);
  assert.equal(runtime.PresentationView.defaults.tocBaseIndent,8);
  assert.equal(runtime.PresentationView.defaults.tocIndent,15);
  assert.equal(runtime.Recovery.historyLimitForBytes(1000),80);
  assert.equal(runtime.Recovery.historyLimitForBytes(3*1024*1024),20);
  assert.equal(runtime.Recovery.historyLimitForBytes(10*1024*1024),6);
}

const p={id:'root',title:'R',children:[],collapsed:false,pos:{x:0,y:0},slideElements:[],mapLayout:'balanced',uiTheme:'light',presentationOrder:[],master:{bgColor:'#fff',bgImage:null,bgFit:'cover',tocSide:'left',tocVisibility:'auto',defaultAnimation:'soft',elements:[]}};
Core.Project.normalize(p);
const exported=Core.ExportData.project(p,'mindmap');
assert.equal(exported.master,undefined);assert.equal(exported.presentationOrder,undefined);
assert.deepEqual(Object.keys(Core.Architecture.singleSources).sort(),['animation','commands','ids','diagnostics','fullscreen','input','layout','mapRender','portable','presentation','presentationView','project','recovery','slideRender','theme','tocRender','tree','viewport'].sort());
console.log('MindDeck source ESM + generated browser runtime tests: OK');
