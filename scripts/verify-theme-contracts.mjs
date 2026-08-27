import fs from 'node:fs';
import assert from 'node:assert/strict';
import { Core } from '../src/core/runtime.js';

const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
for(const marker of ['id="appearanceBtn"','id="themePanel"','data-theme-choice="light"','data-theme-choice="dark"','data-theme-choice="business"','data-theme-choice="minimal"','function applyUiTheme()','id="themeSel"','ThemeCore.apply(document.body','Theme.apply(doc.body']) assert.ok(html.includes(marker),`Theme contract missing: ${marker}`);

const legacyIds=['aurora','cobalt','forest','ember','plum','slate','sand','ink','ocean','mint','rose','mono'];
const requiredFields=['colors','typography','spacing','radius','border','shadow','titleTreatment','subtitleTreatment','numberTreatment','cardTreatment','imageTreatment','decoration','chartStyle','diagramStyle','tableStyle'];
assert.deepEqual(Core.DECK_THEMES.map(theme=>theme.id),legacyIds,'Theme V2 must preserve every V9.9 theme id and order');
assert.equal(Core.Composer.ThemeRegistry.list().length,12);
function assertPureData(value,path='theme'){
  const type=typeof value;
  assert.notEqual(type,'function',`${path} must not contain functions`);
  if(value===null||['string','number','boolean'].includes(type))return;
  assert.equal(type,'object',`${path} contains unsupported ${type}`);
  assert.equal(value.nodeType,undefined,`${path} must not contain DOM-like nodes`);
  if(Array.isArray(value)){value.forEach((item,index)=>assertPureData(item,`${path}[${index}]`));return}
  for(const [key,child] of Object.entries(value))assertPureData(child,`${path}.${key}`);
}
for(const theme of Core.DECK_THEMES){
  assert.equal(theme.schemaVersion,2,`${theme.id} must be Theme V2`);
  for(const field of requiredFields)assert.ok(theme[field]&&typeof theme[field]==='object',`${theme.id}.${field} required`);
  assertPureData(theme,theme.id);
  const roundTrip=JSON.parse(JSON.stringify(theme));assert.equal(roundTrip.id,theme.id,`${theme.id} must be serializable`);
}
const normalized=Core.Composer.ThemeRegistry.normalize({id:'slate',typography:{titleScale:1.11},bad:()=>true,dom:{nodeType:1}});
assert.equal(normalized.id,'slate');assert.equal(normalized.typography.titleScale,1.11);assert.equal('bad' in normalized,false);assert.equal('dom' in normalized,false);assert.ok(normalized.cardTreatment);
assert.equal(Core.Composer.ThemeRegistry.resolve('missing-theme').id,'aurora','unknown theme must fall back to aurora');
assert.equal(Core.Composer.ThemeRegistry.resolve('missing-theme','sand').id,'sand','explicit fallback must be honored');

const spec={schemaVersion:1,title:'Theme V2 Regression',goal:'相同内容验证不同视觉语言',audience:'Design QA',theme:'aurora',randomSeed:'theme-v2-regression',slides:[
  {id:'metrics',role:'metrics',content:{title:'核心指标',summary:'同一数据，不同视觉语言',items:[{value:'32%',label:'效率提升'},{value:'4.8x',label:'反馈速度'},{value:'12',unit:'周',label:'完成闭环'}]}},
  {id:'cards',role:'cards',content:{title:'关键动作',items:[{label:'理解现场'},{label:'聚焦问题'},{label:'验证结果'}]}},
  {id:'visual',role:'image',content:{title:'现场观察',summary:'真实图片承担证据角色',media:[{type:'image',src:'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="16" height="9"/%3E'}]}}
]};
const flatten=project=>{const out=[];const walk=node=>{out.push(node);for(const child of node.children||[])walk(child)};walk(project);return out};
const styleKeys=['fontFamily','fontSize','fontWeight','letterSpacing','lineHeight','radius','borderWidth','shadow','fit','opacity'];
const signature=result=>flatten(result.project).flatMap(node=>(node.slideElements||[]).map(element=>Object.fromEntries([['type',element.type],...styleKeys.map(key=>[key,element[key]??null])])));
const compile=theme=>Core.Composer.compileDeck(spec,{theme,rootId:'theme-v2-root',mapLayout:'right'});
const aurora=compile('aurora'),cobalt=compile('cobalt'),slate=compile('slate'),sand=compile('sand'),cobaltAgain=compile('cobalt');
assert.deepEqual(aurora.assignments.map(item=>item.templateId),cobalt.assignments.map(item=>item.templateId),'theme must not fork template allocation');
const auroraStyle=signature(aurora),cobaltStyle=signature(cobalt),slateStyle=signature(slate),sandStyle=signature(sand);
assert.deepEqual(cobaltStyle,signature(cobaltAgain),'same Theme + same DeckSpec must be deterministic');
assert.notDeepEqual(auroraStyle,cobaltStyle,'light modern and dark tech must differ beyond palette');
assert.notDeepEqual(slateStyle,sandStyle,'consulting and academic themes must differ beyond palette');
const changedKeys=styleKeys.filter(key=>JSON.stringify(auroraStyle.map(item=>item[key]))!==JSON.stringify(cobaltStyle.map(item=>item[key])));
assert.ok(changedKeys.length>=5,`Theme V2 expected at least 5 non-color style differences, got ${changedKeys.join(', ')}`);
assert.ok(cobaltStyle.some(item=>item.shadow&&item.shadow!=='none'),'card/image shadow token must reach slideElements');
assert.ok(cobaltStyle.some(item=>item.fontFamily),'typography font family must reach slideElements');
assert.ok(slateStyle.some(item=>item.radius===8),'consulting card radius must reach slideElements');
assert.ok(sandStyle.some(item=>item.fit==='contain'),'academic image treatment must reach slideElements');
console.log(`Theme contracts: OK (legacy UI + Theme V2; non-color differences: ${changedKeys.join(', ')})`);
