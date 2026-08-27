import assert from 'node:assert/strict';
import {composeDeck,parseOutline,inferPageRole,rethemeDeck,describeDeck,deckThemes,pageRoles,templates,normalizeDeckSpec,validateDeckSpec,normalizeSlideContent,TemplateRegistry,ThemeRegistry,Capacity,Provenance,Quality,recommendTemplates,recommendNodeTemplates,applyTemplate,compileDeck} from '../src/core/composer.js';
import { Core } from '../src/core/runtime.js';
import { Project, Presentation, Tree } from '../src/runtime/modules/model.js';

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

const mediaData='data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg"/>';
const roleContent={
cover:{title:'年度业务复盘',subtitle:'从现场问题到交付结果',summary:'聚焦真实需求',items:[{label:'业务'},{label:'研发'},{label:'结果'}]},
section:{title:'第一部分：问题洞察',summary:'先理解现场，再进入方案',items:[{label:'现状'},{label:'问题'},{label:'目标'}]},
statement:{title:'研发价值不只在代码',summary:'真正的价值来自对业务问题的理解与解决。',takeaway:'先找到真正的问题，再写代码。',items:[{label:'现场验证'}]},
cards:{title:'三个关键动作',items:[{label:'到现场'},{label:'问原因'},{label:'做验证'},{label:'看结果'}]},
compare:{title:'两种研发方式对比',items:[{label:'只看需求文档'},{label:'结合现场反馈'},{label:'信息间接'},{label:'反馈闭环'}]},
process:{title:'推进流程',items:[{label:'明确问题'},{label:'形成方案'},{label:'小步验证'},{label:'交付复盘'}]},
metrics:{title:'核心指标',items:[{value:'32%',label:'定位效率'},{value:'4.8x',label:'反馈速度'},{value:'12',unit:'周',label:'完成闭环'}]},
trend:{title:'效率提升趋势',items:[{value:'20',label:'Q1'},{value:'35',label:'Q2'},{value:'52',label:'Q3'},{value:'78',label:'Q4'}]},
timeline:{title:'年度路线图',items:[{label:'1月 调研'},{label:'3月 验证'},{label:'6月 上线'},{label:'9月 复盘'}]},
quote:{title:'现场的一句话',summary:'真正的问题，往往不在需求文档里。',takeaway:'先去看，再判断。'},
image:{title:'现场观察',summary:'用真实现场支撑判断。',items:[{label:'用户操作路径'}],media:[{type:'image',src:mediaData}]},
conclusion:{title:'结论与下一步',summary:'先解决真实问题，再持续完善功能。',items:[{label:'确认负责人'},{label:'两周验证'},{label:'复盘结果'}]}
};

const validSpec={schemaVersion:1,title:'DeckSpec 示例',goal:'验证完整编译链路',audience:'研发团队',theme:'aurora',randomSeed:'v99-e2e',slides:[
{id:'s1',role:'statement',content:roleContent.statement},{id:'s2',role:'metrics',content:roleContent.metrics},{id:'s3',role:'process',content:roleContent.process},{id:'s4',role:'compare',content:roleContent.compare},{id:'s5',role:'conclusion',content:roleContent.conclusion}
]};

{const parsed=parseOutline(source);assert.equal(parsed.title,'研发价值复盘');assert.equal(parsed.pageCount,6);assert.equal(parsed.specs.length,5)}

{
  assert.equal(deckThemes.length,12);assert.equal(pageRoles.length,12);assert.ok(templates.length>=24);assert.equal(TemplateRegistry.list().length,templates.length);assert.equal(new Set(templates.map(item=>item.id)).size,templates.length);
  for(const template of templates)assert.equal(Core.Composer.validateTemplate(template).ok,true,`${template.id} manifest`);
  for(const theme of deckThemes){
    assert.equal(Core.Composer.validateTheme(theme).ok,true,`${theme.id} theme`);
    for(const key of ['colors','typography','shape','spacing'])assert.ok(theme[key],`${theme.id}.${key}`);
  }
}

{
  const normalized=normalizeSlideContent({title:'  标题  ',text:' 摘要 ',items:['A',{label:'B',value:2}]});assert.equal(normalized.title,'标题');assert.equal(normalized.summary,'摘要');assert.equal(normalized.items.length,2);
  const normalizedSpec=normalizeDeckSpec(validSpec);assert.deepEqual(normalizeDeckSpec(normalizedSpec),normalizedSpec);assert.equal(validateDeckSpec(validSpec).ok,true);
  const invalids=[
    [{...validSpec,theme:'not-a-theme'},'INVALID_THEME'],
    [{...validSpec,title:123},'TITLE_TYPE'],
    [{...validSpec,goal:false},'GOAL_TYPE'],
    [{...validSpec,audience:[]},'AUDIENCE_TYPE'],
    [{...validSpec,randomSeed:99},'RANDOM_SEED_TYPE'],
    [{...validSpec,slides:{}},'SLIDES_TYPE'],
    [{...validSpec,schemaVersion:2},'SCHEMA_VERSION'],
    [{...validSpec,slides:[{id:2,role:'statement',content:roleContent.statement}]},'SLIDE_ID_TYPE'],
    [{...validSpec,slides:[{id:'x',role:'bad',content:roleContent.statement}]},'INVALID_ROLE'],
    [{...validSpec,slides:[{id:'x',role:'statement',content:'bad'}]},'CONTENT_TYPE'],
    [{...validSpec,slides:[{id:'x',role:'statement',content:{title:3}}]},'CONTENT_FIELD_TYPE'],
    [{...validSpec,slides:[{id:'x',role:'statement',content:{title:'x',items:{}}}]},'ITEMS_TYPE'],
    [{...validSpec,slides:[{id:'x',role:'statement',content:{title:'x',items:[{label:3}]}}]},'ITEM_FIELD_TYPE'],
    [{...validSpec,slides:[{id:'x',role:'statement',content:{title:'x',media:{}}}]},'MEDIA_TYPE'],
    [{...validSpec,slides:[{id:'x',role:'statement',content:{title:'x',media:[{type:'audio',src:'a'}]}}]},'MEDIA_KIND'],
    [{...validSpec,slides:[{id:'x',role:'statement',content:{title:'x',media:[{type:'image',src:3}]}}]},'MEDIA_FIELD_TYPE'],
    [{...validSpec,slides:[{id:'x',role:'statement',content:roleContent.statement},{id:'x',role:'cards',content:roleContent.cards}]},'DUPLICATE_SLIDE_ID']
  ];
  for(const [candidate,code] of invalids){const result=validateDeckSpec(candidate);assert.equal(result.ok,false,code);assert.ok(result.errors.some(item=>item.code===code),JSON.stringify(result.errors))}
}

{
  const base=TemplateRegistry.get('cards-grid-01');
  const malformed=[
    {...base,capacity:{...base.capacity,evil:{min:0,max:1}}},
    {...base,capacity:{...base.capacity,items:{min:4,max:2}}},
    {...base,slots:[...base.slots,{...base.slots[0]}]},
    {...base,slots:base.slots.map((slot,index)=>index?slot:{...slot,kind:'dom'})},
    {...base,layout:{...base.layout,canvas:{width:1920,height:1080}}},
    {...base,layout:{...base.layout,renderer(){}}}
  ];
  for(const candidate of malformed)assert.equal(Core.Composer.validateTemplate(candidate).ok,false);
  assert.throws(()=>Core.Composer.createTemplateRegistry([base,{...base}]),/duplicate template id/);
}

{
  const overflow=normalizeSlideContent({title:'指标',items:Array.from({length:5},(_,i)=>({value:String(i+1),label:`指标${i+1}`}))});
  assert.equal(Capacity.fits(overflow,TemplateRegistry.get('metrics-cards-01').capacity).ok,false);
  assert.equal(recommendTemplates({role:'image',content:{title:'没有媒体'},limit:12}).some(item=>item.templateId==='image-left-01'),false);
  for(const role of pageRoles){
    const candidates=recommendTemplates({role:role.id,content:roleContent[role.id],limit:6});
    assert.ok(candidates.length>=2,`${role.id} should have at least two candidates`);
    const signatures=candidates.slice(0,3).map(candidate=>Core.Composer.compileSlide({content:roleContent[role.id],template:candidate.templateId,theme:'aurora'}).structuralSignature);
    assert.equal(new Set(signatures).size,signatures.length,`${role.id} recommendations must be structurally distinct`);
    if(!['quote','image'].includes(role.id))assert.ok(candidates.length>=3,`${role.id} should keep A/B/C`);
  }
}

{
  for(const template of templates){
    const role=template.roles[0],content=roleContent[role];
    for(const theme of deckThemes){
      const first=Core.Composer.compileSlide({content,template:template.id,theme:theme.id,density:'standard'}),second=Core.Composer.compileSlide({content,template:template.id,theme:theme.id,density:'standard'});
      assert.deepEqual(first.elements,second.elements,`${template.id}/${theme.id} deterministic`);
      const qr=Quality.validateElements(first.elements);assert.equal(qr.ok,true,`${template.id}/${theme.id}: ${qr.errors.map(e=>e.message).join('; ')}`);
      assert.ok(first.elements.every(element=>['text','image','video','shape'].includes(element.type)));
      assert.ok(first.structuralSignature);
    }
  }
  const fallback=Core.Composer.compileSlide({content:roleContent.statement,template:'statement-panel-01',theme:{colors:{primary:'#123456'}}});
  assert.ok(fallback.elements.length>0);assert.ok(fallback.elements.some(element=>element.fill==='#123456'||element.color==='#123456'));
}

{assert.equal(inferPageRole({title:'趋势变化',text:'',points:['Q1 20','Q2 35','Q3 50'],children:[]},{depth:1}),'trend');assert.equal(inferPageRole({title:'推进流程',text:'',points:['A','B','C'],children:[]},{depth:1}),'process');assert.equal(inferPageRole({title:'总结与建议',text:'',points:['A'],children:[]},{depth:1}),'conclusion')}

{
  const deck=composeDeck(source,{theme:'cobalt',density:'standard',mapLayout:'balanced'}),desc=describeDeck(deck);
  assert.equal(deck.deckTheme,'cobalt');assert.equal(deck.deckComposerVersion,'9.9');assert.equal(desc.pages,6);assert.equal(desc.smartPages,6);
  assert.deepEqual(deck.presentationOrder,[deck.id,...deck.children.map(node=>node.id)]);
  assert.equal(Presentation.order(deck)[0],deck.id);
  assert.ok(Quality.validateProject(deck).ok);
  const normalizedOnce=Project.clone(deck);Project.normalize(normalizedOnce,{schemaVersion:1});const normalizedTwice=Project.clone(normalizedOnce);Project.normalize(normalizedTwice,{schemaVersion:1});assert.deepEqual(normalizedTwice,normalizedOnce);
  const roundtrip=JSON.parse(JSON.stringify(deck));Project.normalize(roundtrip,{schemaVersion:1});assert.deepEqual(roundtrip.presentationOrder,deck.presentationOrder);
  const node=deck.children[1];assert.equal(Provenance.isDirty(node),false);node.slideElements[0].x+=9;assert.equal(Provenance.isDirty(node),true);assert.throws(()=>applyTemplate({node,templateId:node.composer.alternativeTemplateIds[0]}),err=>err.code==='COMPOSER_DIRTY');const candidates=recommendNodeTemplates(node,{limit:3});assert.equal(candidates.length,3);applyTemplate({node,templateId:candidates[0].templateId,force:true});assert.equal(Provenance.isDirty(node),false);
}

{
  const deck=composeDeck(source,{theme:'aurora'});deck.children[0].slideElements[0].x+=3;const dirtyId=deck.children[0].id;rethemeDeck(deck,'forest',{regenerate:true});assert.equal(deck.deckTheme,'forest');assert.ok(deck.composerWarnings.some(item=>item.nodeId===dirtyId));assert.equal(Provenance.isDirty(deck.children[0]),true);
}

{
  const result=compileDeck(validSpec,{mapLayout:'right'});assert.equal(result.project.children.length,5);assert.equal(result.assignments.length,6);assert.equal(result.quality.ok,true);assert.equal(result.project.mapLayout,'right');assert.ok(result.project.children.every(node=>node.composer?.generatedHash));
  assert.equal(result.project.presentationOrder.length,6);assert.equal(result.project.presentationOrder[0],result.project.id);
  const ids=new Set();Tree.walkAll(result.project,node=>ids.add(node.id));assert.ok(result.project.presentationOrder.every(id=>ids.has(id)));
  assert.throws(()=>compileDeck({...validSpec,theme:'bad'}),err=>err.code==='SPEC_VALIDATION_ERROR');
}

{
  const slides=Array.from({length:30},(_,i)=>({id:`s${i}`,role:['statement','cards','process','metrics','compare'][i%5],content:roleContent[['statement','cards','process','metrics','compare'][i%5]]}));
  const matrix=slides.map(slide=>recommendTemplates({role:slide.role,content:slide.content,limit:6})),a=Core.Composer.allocateTemplates(slides,matrix,{seed:'stable'}),b=Core.Composer.allocateTemplates(slides,matrix,{seed:'stable'});
  assert.deepEqual(a,b);assert.ok(new Set(a.map(item=>item.family)).size>=4);
}

{
  const noCandidate=recommendTemplates({role:'metrics',content:{title:'超载',items:Array.from({length:20},(_,i)=>({value:String(i),label:`M${i}`}))},limit:5});assert.equal(noCandidate.length,0);
  const project=compileDeck(validSpec).project;
  project.presentationOrder.push(project.children[0].id);let q=Quality.validateProject(project);assert.ok(q.errors.some(item=>item.code==='PRESENTATION_ORDER_DUPLICATE'));
  project.presentationOrder=[project.id,'missing-node'];q=Quality.validateProject(project);assert.ok(q.errors.some(item=>item.code==='PRESENTATION_ORDER_ORPHAN'));
}

{
  const largeSource=['# 55 页回归','> 大项目自动门禁',...Array.from({length:55},(_,i)=>`\n## 章节 ${i+1}\n- 要点 A\n- 要点 B\n- 要点 C`)].join('\n');
  const large=composeDeck(largeSource,{theme:'aurora',seed:'large-55'}),nodes=[];Tree.walkAll(large,node=>nodes.push(node));
  assert.ok(nodes.length>=56);assert.equal(large.presentationOrder.length,nodes.length);assert.equal(Quality.validateProject(large).ok,true);
}

{
  const mediaSpec={schemaVersion:1,title:'媒体项目',goal:'验证图片与视频',theme:'ocean',randomSeed:'media',slides:[
    {id:'img',role:'image',content:{title:'图片页',summary:'图片内容',media:[{type:'image',src:mediaData}]}},
    {id:'vid',role:'image',content:{title:'视频页',summary:'视频内容',media:[{type:'video',src:'data:video/mp4;base64,AAAA'}]}},
    {id:'end',role:'conclusion',content:{title:'结论',summary:'媒体链路正常',items:[{label:'完成'}]}}
  ]};
  const mediaProject=compileDeck(mediaSpec).project,all=[];Tree.walkAll(mediaProject,node=>all.push(...(node.slideElements||[])));
  assert.ok(all.some(element=>element.type==='image'));assert.ok(all.some(element=>element.type==='video'));assert.equal(Quality.validateProject(mediaProject).ok,true);
}

{
  const legacy=Project.createNode({id:'legacy-root',title:'旧项目',text:'无 Composer metadata'});legacy.deckTheme='aurora';legacy.children=[Project.createNode({id:'legacy-child',title:'旧页面',text:'继续工作'})];legacy.presentationOrder=['legacy-root','legacy-child'];
  Project.normalize(legacy,{schemaVersion:1});assert.equal(legacy.composer,undefined);assert.equal(legacy.children[0].composer,undefined);assert.deepEqual(Presentation.order(legacy),['legacy-root','legacy-child']);
  const legacyRoundtrip=JSON.parse(JSON.stringify(legacy));Project.normalize(legacyRoundtrip,{schemaVersion:1});assert.deepEqual(Presentation.order(legacyRoundtrip),['legacy-root','legacy-child']);
}

console.log('MindDeck V9.9 final Composer regression tests: OK');
