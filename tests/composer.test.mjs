import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {composeDeck,parseOutline,inferPageRole,rethemeDeck,describeDeck,deckThemes,pageRoles,templates,normalizeDeckSpec,validateDeckSpec,normalizeSlideContent,TemplateRegistry,Capacity,Provenance,Quality,recommendTemplates,recommendNodeTemplates,applyTemplate,compileDeck} from '../src/core/composer.js';
import {Core} from '../src/core/runtime.js';
const C=Core.Composer, img='data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="16" height="9"/>';
const items=(n,numeric=false)=>Array.from({length:n},(_,i)=>numeric?{value:String((i+1)*10),label:`指标${i+1}`}:{label:`要点${i+1}`});
function content(role){const base={title:`${role} 示例`,summary:'用于 Composer 回归验证'};if(['metrics','trend'].includes(role))return {...base,items:items(4,true)};if(role==='quote')return {...base,summary:'真正的问题往往不在文档里。',takeaway:'先看现场再判断'};if(role==='image')return {...base,items:items(1),media:[{type:'image',src:img}]};if(role==='case')return {...base,items:items(3,true),media:[{type:'image',src:img}]};const counts={cover:3,agenda:4,section:3,statement:1,cards:4,compare:4,problem:3,solution:4,process:4,timeline:4,table:4,matrix:4,roadmap:5,architecture:5,conclusion:3};return {...base,items:items(counts[role]??3)} }
const source=`# 研发价值复盘
> 从代码交付走向解决真实问题

## 为什么要到现场
- 看真实使用
- 找真正卡点
- 带着问题回来

## 核心指标
- 32% 问题定位效率提升
- 4.8x 反馈速度
- 12 周完成闭环

## 推进流程
- 明确问题
- 形成方案
- 小步验证
- 交付复盘

## 方案对比
- 只接需求文档
- 结合现场反馈

## 结论与下一步
- 先验证关键问题
- 再持续完善功能`;
{const p=parseOutline(source);assert.equal(p.title,'研发价值复盘');assert.equal(p.pageCount,6);assert.equal(p.specs.length,5)}
{assert.equal(deckThemes.length,12);assert.equal(pageRoles.length,20);assert.equal(templates.length,72);assert.equal(TemplateRegistry.list().length,72);assert.equal(new Set(templates.map(x=>x.id)).size,72);assert.equal(C.Library.professionalTemplates,48);assert.equal(C.Library.professionalFamilies,24)}
{const n=normalizeSlideContent({title:' 标题 ',text:' 摘要 ',items:['A',{label:'B',value:2}]});assert.equal(n.title,'标题');assert.equal(n.summary,'摘要');assert.equal(n.items.length,2);const spec=normalizeDeckSpec({title:'测试',goal:'验证',slides:[{content:{title:'指标',items:items(2,true)}}]});assert.deepEqual(normalizeDeckSpec(spec),spec);assert.equal(validateDeckSpec(spec).ok,true);assert.equal(validateDeckSpec({schemaVersion:2,title:'',goal:'',slides:[]}).ok,false)}
{const overflow=normalizeSlideContent({title:'指标',items:items(5,true)});assert.equal(Capacity.fits(overflow,TemplateRegistry.get('metrics-cards-01').capacity).ok,false);for(const role of pageRoles){const list=recommendTemplates({role:role.id,content:content(role.id),limit:4});assert.ok(list.length>=(role.id==='cover'?2:3),`${role.id} candidate coverage`);assert.equal(new Set(list.map(x=>x.templateId)).size,list.length)}}
{for(const t of templates){const c=content(t.roles[0]);for(const theme of deckThemes){const a=C.compileSlide({content:c,template:t.id,theme:theme.id,density:'standard'}),b=C.compileSlide({content:c,template:t.id,theme:theme.id,density:'standard'});assert.deepEqual(a.elements,b.elements,`${t.id}/${theme.id} deterministic`);const q=Quality.validateElements(a.elements);assert.equal(q.ok,true,`${t.id}/${theme.id}: ${q.errors.map(e=>e.message).join('; ')}`)}}}
{assert.equal(inferPageRole({title:'趋势变化',points:['Q1 20','Q2 35','Q3 50'],children:[]},{depth:1}),'trend');assert.equal(inferPageRole({title:'推进流程',points:['A','B','C'],children:[]},{depth:1}),'process');assert.equal(inferPageRole({title:'总结与建议',points:['A'],children:[]},{depth:1}),'conclusion');assert.equal(inferPageRole({title:'SWOT 战略矩阵',points:['A','B','C','D'],children:[]},{depth:1}),'matrix');assert.equal(inferPageRole({title:'技术架构说明',points:['A','B','C'],children:[]},{depth:1}),'architecture');assert.equal(inferPageRole({title:'项目路线图',points:['A','B','C'],children:[]},{depth:1}),'roadmap')}
{const deck=composeDeck(source,{theme:'cobalt',density:'standard',mapLayout:'balanced'}),d=describeDeck(deck);assert.equal(deck.deckTheme,'cobalt');assert.equal(deck.deckComposerVersion,'10.0');assert.equal(d.pages,6);assert.equal(d.smartPages,6);assert.equal(deck.children[1].deckRole,'metrics');assert.equal(deck.children[2].deckRole,'process');assert.equal(deck.children[3].deckRole,'compare');assert.equal(deck.children[4].deckRole,'conclusion');assert.ok(deck.children.every(n=>n.composer?.selectedTemplateId));assert.ok(Quality.validateProject(deck).ok);const node=deck.children[1];assert.equal(node.composer.generatedAtVersion,'10.0.0');assert.equal(Provenance.isDirty(node),false);node.slideElements[0].x+=9;assert.equal(Provenance.isDirty(node),true);assert.throws(()=>applyTemplate({node,templateId:node.composer.alternativeTemplateIds[0]}),e=>e.code==='COMPOSER_DIRTY');const list=recommendNodeTemplates(node,{limit:3});applyTemplate({node,templateId:list[0].templateId,force:true});assert.equal(Provenance.isDirty(node),false);assert.equal(node.composer.generatedAtVersion,'10.0.0','regeneration must not downgrade V10 provenance metadata')}
{const deck=composeDeck(source,{theme:'aurora'});deck.children[0].slideElements[0].x+=3;const dirty=deck.children[0].id;rethemeDeck(deck,'forest',{regenerate:true});assert.equal(deck.deckTheme,'forest');assert.ok(deck.composerWarnings.some(x=>x.nodeId===dirty));assert.equal(Provenance.isDirty(deck.children[0]),true)}
{const spec={schemaVersion:1,title:'DeckSpec 示例',goal:'验证完整编译链路',theme:'aurora',randomSeed:'v10-e2e',slides:[{id:'s1',role:'statement',content:content('statement')},{id:'s2',role:'metrics',content:content('metrics')},{id:'s3',role:'process',content:content('process')},{id:'s4',role:'compare',content:content('compare')},{id:'s5',role:'conclusion',content:content('conclusion')}]},r=compileDeck(spec,{mapLayout:'right',rootId:'v10-e2e-root'});assert.equal(r.project.children.length,5);assert.equal(r.assignments.length,6);assert.equal(r.quality.ok,true);assert.equal(r.project.mapLayout,'right');assert.ok(r.project.children.every(n=>n.composer?.generatedHash));assert.equal(r.diversity.unsuitableAssignment,0);assert.equal(r.diversity.capacityViolation,0)}
{const longTitle='面向复杂业务场景的 DeepSeek 智能演示生成与可编辑内容编排能力验证'.repeat(4),longGoal='本次汇报用于验证 AI 在长标题、长汇报目的以及多章节目录条件下仍然能够稳定生成真实可编辑页面，并且不能因为封面模板容量判断而中断整套演示的编译流程。'.repeat(4),slides=Array.from({length:9},(_,i)=>({id:`overflow-${i+1}`,role:'statement',content:{...content('statement'),title:`正文页面 ${i+1}`}})),coverContent={title:longTitle,summary:longGoal,items:slides.slice(0,6).map(slide=>({label:slide.content.title}))},coverCandidates=recommendTemplates({role:'cover',content:coverContent,limit:4});assert.ok(coverCandidates.length>0,'oversized cover must have a safe fallback candidate');assert.ok(coverCandidates.some(candidate=>candidate.warnings.some(warning=>warning.includes('封面内容超出模板容量'))),'fallback candidate must explain safe cover truncation');const r=compileDeck({schemaVersion:1,title:longTitle,goal:longGoal,theme:'aurora',randomSeed:'cover-overflow-regression',slides},{rootId:'root-cover-overflow'});assert.equal(r.assignments.length,10);assert.equal(r.project.composer.content.title,longTitle,'source cover content must remain intact');assert.ok(r.project.composer.selectedTemplateId);assert.equal(r.quality.ok,true)}
{const slides=Array.from({length:30},(_,i)=>({id:`s${i}`,role:'statement',content:content('statement')})),matrix=slides.map(s=>recommendTemplates({role:s.role,content:s.content,limit:6})),a=C.allocateTemplates(slides,matrix,{seed:'stable'}),b=C.allocateTemplates(slides,matrix,{seed:'stable'});assert.deepEqual(a,b);assert.ok(new Set(a.map(x=>x.family)).size>=2)}
{const g=JSON.parse(readFileSync(new URL('../examples/v10-professional-golden/professional-20-page.deck.json',import.meta.url),'utf8')),a=compileDeck(g,{mapLayout:'balanced',rootId:'v10-step5-root'}),b=compileDeck(g,{mapLayout:'balanced',rootId:'v10-step5-root'}),d=a.diversity;assert.deepEqual(a.assignments,b.assignments);assert.equal(a.assignments.length,20);assert.equal(a.quality.ok,true);assert.equal(d.pages,20);assert.equal(d.unsuitableAssignment,0);assert.equal(d.capacityViolation,0);assert.equal(d.roleCoverage,1);assert.equal(d.catalogRoleCoverage,1);assert.ok(d.uniqueTemplates>=18);assert.ok(d.uniqueFamilies>=16);assert.ok(d.repeatedTemplateRate<=.1);assert.ok(d.repeatedFamilyRate<=.2);assert.ok(d.adjacentFamilyReuse<=1);assert.ok(d.maxFamilyShare<=.15)}
console.log('MindDeck V10 Step 5 Composer regression tests: OK (20 roles / 72 templates)');
