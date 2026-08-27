import assert from 'node:assert/strict';
import {composeDeck,parseOutline,inferPageRole,rethemeDeck,describeDeck,deckThemes,pageRoles,templates,normalizeDeckSpec,validateDeckSpec,normalizeSlideContent,TemplateRegistry,Capacity,Provenance,Quality,recommendTemplates,recommendNodeTemplates,applyTemplate,compileDeck} from '../src/core/composer.js';
import { Core } from '../src/core/runtime.js';
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
const roleContent={cover:{title:'年度业务复盘',subtitle:'从现场问题到交付结果',summary:'聚焦真实需求',items:[{label:'业务'},{label:'研发'},{label:'结果'}]},section:{title:'第一部分：问题洞察',summary:'先理解现场，再进入方案',items:[{label:'现状'},{label:'问题'},{label:'目标'}]},statement:{title:'研发价值不只在代码',summary:'真正的价值来自对业务问题的理解与解决。',takeaway:'先找到真正的问题，再写代码。',items:[{label:'现场验证'}]},cards:{title:'三个关键动作',items:[{label:'到现场'},{label:'问原因'},{label:'做验证'},{label:'看结果'}]},compare:{title:'两种研发方式对比',items:[{label:'只看需求文档'},{label:'结合现场反馈'},{label:'信息间接'},{label:'反馈闭环'}]},process:{title:'推进流程',items:[{label:'明确问题'},{label:'形成方案'},{label:'小步验证'},{label:'交付复盘'}]},metrics:{title:'核心指标',items:[{value:'32%',label:'定位效率'},{value:'4.8x',label:'反馈速度'},{value:'12',unit:'周',label:'完成闭环'}]},trend:{title:'效率提升趋势',items:[{value:'20',label:'Q1'},{value:'35',label:'Q2'},{value:'52',label:'Q3'},{value:'78',label:'Q4'}]},timeline:{title:'年度路线图',items:[{label:'1月 调研'},{label:'3月 验证'},{label:'6月 上线'},{label:'9月 复盘'}]},quote:{title:'现场的一句话',summary:'真正的问题，往往不在需求文档里。',takeaway:'先去看，再判断。'},image:{title:'现场观察',summary:'用真实现场支撑判断。',items:[{label:'用户操作路径'}],media:[{type:'image',src:'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg"/>'}]},conclusion:{title:'结论与下一步',summary:'先解决真实问题，再持续完善功能。',items:[{label:'确认负责人'},{label:'两周验证'},{label:'复盘结果'}]}};
{const parsed=parseOutline(source);assert.equal(parsed.title,'研发价值复盘');assert.equal(parsed.pageCount,6);assert.equal(parsed.specs.length,5)}
{assert.equal(deckThemes.length,12);assert.equal(pageRoles.length,12);assert.equal(templates.length,24);assert.equal(TemplateRegistry.list().length,24);assert.equal(new Set(templates.map(item=>item.id)).size,24)}
{const normalized=normalizeSlideContent({title:'  标题  ',text:' 摘要 ',items:['A',{label:'B',value:2}]});assert.equal(normalized.title,'标题');assert.equal(normalized.summary,'摘要');assert.equal(normalized.items.length,2);const spec=normalizeDeckSpec({title:'测试',goal:'验证',slides:[{content:{title:'指标',items:[{value:'32%',label:'提升'},{value:'4x',label:'效率'}]}}]});assert.deepEqual(normalizeDeckSpec(spec),spec);assert.equal(validateDeckSpec(spec).ok,true);assert.equal(validateDeckSpec({schemaVersion:2,title:'',goal:'',slides:[]}).ok,false)}
{const overflow=normalizeSlideContent({title:'指标',items:Array.from({length:5},(_,i)=>({value:String(i+1),label:`指标${i+1}`}))});assert.equal(Capacity.fits(overflow,TemplateRegistry.get('metrics-cards-01').capacity).ok,false);for(const role of pageRoles){const candidates=recommendTemplates({role:role.id,content:roleContent[role.id],limit:3});assert.equal(candidates.length,3,`${role.id} should have A/B/C candidates`);assert.equal(new Set(candidates.map(item=>item.templateId)).size,3)}}
{for(const template of templates){const role=template.roles[0],content=roleContent[role];for(const theme of deckThemes){const first=Core.Composer.compileSlide({content,template:template.id,theme:theme.id,density:'standard'}),second=Core.Composer.compileSlide({content,template:template.id,theme:theme.id,density:'standard'});assert.deepEqual(first.elements,second.elements,`${template.id}/${theme.id} deterministic`);const qr=Quality.validateElements(first.elements);assert.equal(qr.ok,true,`${template.id}/${theme.id}: ${qr.errors.map(e=>e.message).join('; ')}`);assert.ok(first.elements.every(element=>['text','image','video','shape'].includes(element.type)))}}}
{assert.equal(inferPageRole({title:'趋势变化',text:'',points:['Q1 20','Q2 35','Q3 50'],children:[]},{depth:1}),'trend');assert.equal(inferPageRole({title:'推进流程',text:'',points:['A','B','C'],children:[]},{depth:1}),'process');assert.equal(inferPageRole({title:'总结与建议',text:'',points:['A'],children:[]},{depth:1}),'conclusion')}
{const deck=composeDeck(source,{theme:'cobalt',density:'standard',mapLayout:'balanced'}),desc=describeDeck(deck);assert.equal(deck.deckTheme,'cobalt');assert.equal(deck.deckComposerVersion,'9.9');assert.equal(desc.pages,6);assert.equal(desc.smartPages,6);assert.equal(deck.children[1].deckRole,'metrics');assert.equal(deck.children[2].deckRole,'process');assert.equal(deck.children[3].deckRole,'compare');assert.equal(deck.children[4].deckRole,'conclusion');assert.ok(deck.children.every(node=>node.composer?.selectedTemplateId));assert.ok(Quality.validateProject(deck).ok);const node=deck.children[1];assert.equal(Provenance.isDirty(node),false);node.slideElements[0].x+=9;assert.equal(Provenance.isDirty(node),true);assert.throws(()=>applyTemplate({node,templateId:node.composer.alternativeTemplateIds[0]}),err=>err.code==='COMPOSER_DIRTY');const candidates=recommendNodeTemplates(node,{limit:3});assert.equal(candidates.length,3);applyTemplate({node,templateId:candidates[0].templateId,force:true});assert.equal(Provenance.isDirty(node),false)}
{const deck=composeDeck(source,{theme:'aurora'});deck.children[0].slideElements[0].x+=3;const dirtyId=deck.children[0].id;rethemeDeck(deck,'forest',{regenerate:true});assert.equal(deck.deckTheme,'forest');assert.ok(deck.composerWarnings.some(item=>item.nodeId===dirtyId));assert.equal(Provenance.isDirty(deck.children[0]),true)}
{const spec={schemaVersion:1,title:'DeckSpec 示例',goal:'验证完整编译链路',audience:'研发团队',theme:'aurora',randomSeed:'v99-e2e',slides:[{id:'s1',role:'statement',content:roleContent.statement},{id:'s2',role:'metrics',content:roleContent.metrics},{id:'s3',role:'process',content:roleContent.process},{id:'s4',role:'compare',content:roleContent.compare},{id:'s5',role:'conclusion',content:roleContent.conclusion}]},result=compileDeck(spec,{mapLayout:'right'});assert.equal(result.project.children.length,5);assert.equal(result.assignments.length,6);assert.equal(result.quality.ok,true);assert.equal(result.project.mapLayout,'right');assert.ok(result.project.children.every(node=>node.composer?.generatedHash))}
{const slides=Array.from({length:30},(_,i)=>({id:`s${i}`,role:'statement',content:roleContent.statement})),matrix=slides.map(slide=>recommendTemplates({role:slide.role,content:slide.content,limit:6})),a=Core.Composer.allocateTemplates(slides,matrix,{seed:'stable'}),b=Core.Composer.allocateTemplates(slides,matrix,{seed:'stable'});assert.deepEqual(a,b);assert.ok(new Set(a.map(item=>item.family)).size>=2)}
console.log('MindDeck V9.9 Composer Epic regression tests: OK');
