import assert from 'node:assert/strict';
import { normalizeProject } from '../src/core/project.js';
import { inspectProject } from '../src/core/diagnostics.js';

const project=normalizeProject({id:'root',title:'Root',mapLayout:'balanced',uiTheme:'light',presentationOrder:[],collapsed:false,pos:{x:0,y:0},slideElements:[],master:{tocVisibility:'auto',tocSide:'left',bgColor:'#fff',bgFit:'cover',defaultAnimation:'soft',elements:[]},children:[{id:'a',title:'A',collapsed:false,pos:{x:0,y:0},slideElements:[{id:'e1',type:'text',x:20,y:30,w:300,h:100,z:1000}],children:[]}]});
let report=inspectProject(project);assert.equal(report.fail,0);assert.equal(report.nodeCount,2);assert.ok(report.score>=95);
project.children.push(structuredClone(project.children[0]));report=inspectProject(project);assert.ok(report.fail>=1);
console.log('MindDeck diagnostics tests: OK');
