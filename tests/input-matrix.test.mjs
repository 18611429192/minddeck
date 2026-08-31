import assert from 'node:assert/strict';
import { Core } from '../src/core/runtime.js';

const C=Core.Composer;
const chartTypes=['bar','line','area','donut','radar','funnel','waterfall'];
const scaleSizes=[1,2,3,4,6,7,12,24,48];
const chartData=(chartType,values=[12,24,18,31],multi=false)=>{const labels=values.map((_,index)=>`P${index+1}`),chart={chartType,categories:labels,labels,options:{showValues:true}};if(['bar','line','area','radar'].includes(chartType)){chart.series=[{name:'实际值',values}];if(multi)chart.series.push({name:'目标值',values:values.map(value=>value+5)})}else chart.values=values;return chart};
const valuesOf=count=>Array.from({length:count},(_,index)=>(index%5===0?-1:1)*(index+1)*7);
const allNodes=root=>{const out=[];const walk=node=>{out.push(node);for(const child of node.children||[])walk(child)};walk(root);return out};

// Chart-only content must use representative matcher facts rather than every chart point.
const normalizedChart=C.normalizeSlideContent({title:'中性标题',chart:chartData('bar',valuesOf(12))});
assert.equal(normalizedChart.items.length,4,'12-point chart should expose only four matcher items');
assert.equal(normalizedChart.items[0].label,'P1');
assert.equal(normalizedChart.items.at(-1).label,'P12');

for(const chartType of chartTypes){
  for(const size of scaleSizes){
    const spec={schemaVersion:1,title:`${chartType}-${size}`,goal:'rich chart scale boundary',slides:[{id:`${chartType}-${size}`,content:{title:`${chartType} ${size} points`,chart:chartData(chartType,valuesOf(size),size>=12)}}]};
    const check=C.validateDeckSpec(spec);
    if(chartType==='radar'&&size<3){assert.equal(check.ok,false,`radar ${size} must fail validation`);assert.ok(check.errors.some(item=>item.code==='CHART_RADAR_TOO_SMALL'));continue}
    assert.equal(check.ok,true,`${chartType} ${size} validation`);
    const deck=C.compileDeck(spec,{rootId:`root-${chartType}-${size}`});
    assert.equal(deck.quality.ok,true,`${chartType} ${size}: ${deck.quality.errors?.map(item=>item.message).join('; ')}`);
    const node=deck.project.children[0],native=node.slideElements.find(element=>element.type==='chart');
    assert.ok(native,`${chartType} ${size} native chart`);
    assert.equal(Math.max(native.categories?.length||0,native.labels?.length||0,native.values?.length||0,native.series?.[0]?.values?.length||0),size,`${chartType} ${size} preserves full data`);
    assert.ok(node.composer.content.items.length<=4,`${chartType} ${size} matcher facts bounded`);
    const expectedRole=['line','area','waterfall'].includes(chartType)&&size>=3?'trend':'metrics';
    assert.equal(node.composer.role,expectedRole,`${chartType} ${size} inferred role`);
  }
}

// Exact regression reported from Pages: 12-point, two-series line chart must compile.
const reportedLine={schemaVersion:1,title:'reported chart-line',goal:'the reported 12-point line must not hit NO_TEMPLATE_CANDIDATE',slides:[{id:'chart-line',content:{title:'12 个月需求返工率趋势',summary:'从第 4 个月开始引入现场调研和快速验证机制，返工率持续下降。',chart:{chartType:'line',categories:Array.from({length:12},(_,i)=>`M${i+1}`),series:[{name:'返工率',values:[38,41,39,34,31,27,24,22,19,17,15,13]},{name:'目标线',values:Array(12).fill(20)}],options:{showLegend:true,showLabels:true,showGrid:true,smooth:true}}}}]};
const reportedDeck=C.compileDeck(reportedLine,{rootId:'reported-chart-line-root'});assert.equal(reportedDeck.quality.ok,true);assert.equal(reportedDeck.project.children[0].composer.role,'trend');assert.equal(reportedDeck.project.children[0].slideElements.find(item=>item.type==='chart').categories.length,12);

const badRole={schemaVersion:1,title:'Bad role',goal:'role mismatch must be explicit',slides:[{id:'bad',role:'statement',content:{title:'中性',chart:chartData('line',valuesOf(4))}}]};
const badRoleCheck=C.validateDeckSpec(badRole);assert.equal(badRoleCheck.ok,false);assert.ok(badRoleCheck.errors.some(item=>item.code==='CHART_ROLE_UNSUPPORTED'));

// Native tables: template matching stays bounded while all rows remain in the native table.
for(const rowCount of [1,2,6,12,13,24,48]){
  const rows=Array.from({length:rowCount},(_,index)=>[`项目 ${index+1}`,`${(index+1)*3}%`,index%2?'进行中':'完成']);
  const spec={schemaVersion:1,title:`table-${rowCount}`,goal:'table row scale boundary',slides:[{id:`table-${rowCount}`,content:{title:`${rowCount} 行数据表`,table:{columns:[{label:'项目'},{label:'进度'},{label:'状态'}],rows}}}]};
  const deck=C.compileDeck(spec,{rootId:`table-root-${rowCount}`});assert.equal(deck.quality.ok,true,`table ${rowCount}`);
  const node=deck.project.children[0],native=node.slideElements.find(element=>element.type==='table');assert.ok(native);assert.equal(native.rows.length,rowCount);assert.ok(node.composer.content.items.length<=6);assert.equal(node.composer.role,'table');
}

// Large diagrams of every supported family should keep their full native data without overflowing matcher capacity.
const diagramCases=[['swot','matrix',12],['pest','matrix',12],['porter','matrix',15],['matrix','matrix',20],['roadmap','roadmap',24],['cycle','process',24],['funnel','process',18],['pyramid','cards',18]];
for(const [subtype,role,count] of diagramCases){
  const items=Array.from({length:count},(_,index)=>({label:`${subtype} ${index+1}`,detail:`说明 ${index+1}`,value:String(index+1)}));
  const spec={schemaVersion:1,title:`diagram-${subtype}`,goal:'diagram item scale boundary',slides:[{id:`diagram-${subtype}`,content:{title:`${subtype} large`,diagram:{subtype,data:{items}}}}]};
  const deck=C.compileDeck(spec,{rootId:`diagram-root-${subtype}`});assert.equal(deck.quality.ok,true,`${subtype} ${count}`);
  const node=deck.project.children[0],native=node.slideElements.find(element=>element.type==='diagram');assert.ok(native);assert.equal(native.data.items.length,count);assert.ok(node.composer.content.items.length<=4);assert.equal(node.composer.role,role);
}

// Rich Markdown syntax remains normalized.
const richMarkdown=`# 富 Markdown 输入\n> 同时覆盖表格、强调、链接、引用和代码块\n\n## 核心指标\n| 指标 | 当前 | 目标 |\n| --- | ---: | ---: |\n| 可用性 | 99.9% | 99.99% |\n| 延迟 | 80ms | 50ms |\n| 成功率 | 98% | 99% |\n\n## 技术方案\n**目标**：保持 [单一 Runtime](https://example.com) 并减少重复逻辑。\n\n\`\`\`js\nfunction route(input) { return input ?? 'stable'; }\n\`\`\`\n\n- [x] 统一输入链路\n- [ ] 继续补充回归样例\n\n## 引用\n> 用户真正关心的是结果，而不是代码量。`;
const parsed=C.parseOutline(richMarkdown);assert.equal(parsed.title,'富 Markdown 输入');assert.equal(parsed.pageCount,4);assert.equal(parsed.specs[0].points.length,3);assert.ok(parsed.specs[0].points.every(point=>!point.includes('|')));assert.ok(!parsed.specs[1].text.includes('```'));assert.ok(!parsed.specs[1].text.includes('**'));assert.ok(parsed.specs[1].text.includes('单一 Runtime'));assert.ok(!parsed.specs[2].text.includes('>'));
const markdownDeck=C.compose(richMarkdown,{theme:'aurora',density:'standard'});assert.equal(C.Quality.validateProject(markdownDeck).ok,true);assert.equal(markdownDeck.children[0].composer.role,'metrics');

// Markdown scale boundaries: many sections and long bullet lists must not overflow template capacities.
const manySections=['# 十二章节压力测试','> 封面只取有限摘要，不应因章节数量失败',...Array.from({length:12},(_,index)=>`\n## 章节 ${index+1}\n- 要点 A${index+1}\n- 要点 B${index+1}\n- 要点 C${index+1}`)].join('\n');
const manySectionsDeck=C.compose(manySections,{theme:'aurora'});assert.equal(C.Quality.validateProject(manySectionsDeck).ok,true);assert.equal(manySectionsDeck.children.length,12);assert.ok(manySectionsDeck.composer.content.items.length<=6);

const bulletValues=Array.from({length:17},(_,index)=>`长列表要点 ${index+1}`),manyBullets=`# 长列表压力测试\n\n## 单一章节包含大量要点\n${bulletValues.map(item=>`- ${item}`).join('\n')}`;
const manyBulletsDeck=C.compose(manyBullets,{theme:'aurora'});assert.equal(C.Quality.validateProject(manyBulletsDeck).ok,true);assert.equal(manyBulletsDeck.children.length,3,'17 bullets should become 3 bounded pages');assert.ok(manyBulletsDeck.children.every(node=>node.composer.content.items.length<=6));assert.deepEqual(manyBulletsDeck.children.flatMap(node=>node.points),bulletValues);

assert.ok(allNodes(manySectionsDeck).every(node=>!node.composer||node.composer.selectedTemplateId),'every generated Markdown node receives a template');
console.log('MindDeck V10 input matrix: OK (rich-body type x scale boundaries + complex Markdown boundaries)');
