import assert from 'node:assert/strict';
import { Core } from '../src/core/runtime.js';

assert.equal(Core.VERSION,'9.7.0');
for(const name of ['Ids','Tree','Project','Layout','Commands','Presentation','PresentationSession','Stage','MapViewport','Animation','Element','Slide','Fullscreen','Input','Recovery','Diagnostics','InlineEditor','MapRenderer','TocRenderer','PresentationView','ExportData','Portable','Architecture']) assert.ok(Core[name],`missing core ${name}`);

assert.equal(Core.Stage.fitRect(1600,900,1600,900,0).scale,1);
assert.equal(Core.Input.presentationKeyAction({key:'ArrowDown'}),'next');
assert.equal(Core.Input.presentationKeyAction({key:'ArrowUp'}),'prev');
assert.equal(Core.Input.presentationKeyAction({key:'Home'}),'first');
assert.equal(Core.Input.presentationKeyAction({key:'End'}),'last');
assert.equal(Core.Input.wheelStep({deltaX:0,deltaY:100}),1);
assert.equal(Core.Input.wheelStep({deltaX:0,deltaY:-100}),-1);
assert.equal(Core.PresentationView.defaults.stagePadding,20);
assert.equal(Core.PresentationView.defaults.tocBaseIndent,8);
assert.equal(Core.PresentationView.defaults.tocIndent,15);
assert.equal(Core.Recovery.historyLimitForBytes(1000),80);
assert.equal(Core.Recovery.historyLimitForBytes(3*1024*1024),20);
assert.equal(Core.Recovery.historyLimitForBytes(10*1024*1024),6);

const p={id:'root',title:'R',children:[],collapsed:false,pos:{x:0,y:0},slideElements:[],mapLayout:'balanced',uiTheme:'light',presentationOrder:[],master:{bgColor:'#fff',bgImage:null,bgFit:'cover',tocSide:'left',tocVisibility:'auto',defaultAnimation:'soft',elements:[]}};
Core.Project.normalize(p);
const exported=Core.ExportData.project(p,'mindmap');
assert.equal(exported.master,undefined);assert.equal(exported.presentationOrder,undefined);
assert.deepEqual(Object.keys(Core.Architecture.singleSources).sort(),['animation','commands','ids','diagnostics','fullscreen','input','layout','mapRender','portable','presentation','presentationView','project','recovery','slideRender','theme','tocRender','tree','viewport'].sort());
console.log('MindDeck shared runtime tests: OK');
