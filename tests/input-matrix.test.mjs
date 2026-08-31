import assert from 'node:assert/strict';
import { Core } from '../src/core/runtime.js';

const C=Core.Composer;
const chartData=(chartType,values=[12,24,18,31])=>{const labels=values.map((_,index)=>`Q${index+1}`),chart={chartType,categories:labels,labels};if(['bar','line','area','radar'].includes(chartType))chart.series=[{name:'实际值',values}];else chart.values=values;return chart};

const normalizedChart=C.normalizeSlideContent({title:'中性标题',chart:chartData('bar')});
assert.equal(normalizedChart.items.length,4,'chart-only content must derive matcher items');
assert.equal(normalizedChart.items[0].label,'Q1');
assert.equal(normalizedChart.items[0].value,'12');

const chartSpec={schemaVersion:1,title:'Chart-only matrix',goal:'chart body must independently satisfy matcher facts',slides:['bar','line','area','donut','radar','funnel','waterfall'].map((chartType,index)=>({id:`chart-${chartType}`,content:{title:`视图 ${index+1}`,chart:chartData(chartType)}}))};
assert.equal(C.validateDeckSpec(chartSpec).ok,true);
const chartDeck=C.compileDeck(chartSpec,{rootId:'input-chart-root'});
assert.equal(chartDeck.quality.ok,true,chartDeck.quality.errors?.map(item=>item.message).join('; '));
assert.equal(chartDeck.project.children.length,7);
for(const node of chartDeck.project.children){assert.ok(node.composer.content.items.length>=4,`${node.id} matcher items`);assert.equal(node.slideElements.filter(element=>element.type==='chart').length,1,`${node.id} native chart`)}
assert.equal(chartDeck.project.children.find(node=>node.id==='chart-line').composer.role,'trend');
assert.equal(chartDeck.project.children.find(node=>node.id==='chart-donut').composer.role,'metrics');

const badRole={schemaVersion:1,title:'Bad role',goal:'role mismatch must be explicit',slides:[{id:'bad',role:'statement',content:{title:'中性',chart:chartData('line')}}]};
const badRoleCheck=C.validateDeckSpec(badRole);assert.equal(badRoleCheck.ok,false);assert.ok(badRoleCheck.errors.some(item=>item.code==='CHART_ROLE_UNSUPPORTED'));

const structuredSpec={schemaVersion:1,title:'Structured-only matrix',goal:'table and diagrams should infer matcher role without duplicate items',slides:[
  {id:'table-auto',content:{title:'视图 A',table:{columns:[{label:'项目'},{label:'进度'}],rows:[['调研','100%'],['设计','80%'],['验证','55%'],['交付','20%']]}}},
  {id:'swot-auto',content:{title:'视图 B',diagram:{subtype:'swot',data:{items:[{label:'优势'},{label:'劣势'},{label:'机会'},{label:'威胁'}]}}}},
  {id:'roadmap-auto',content:{title:'视图 C',diagram:{subtype:'roadmap',data:{items:[{label:'发现'},{label:'设计'},{label:'验证'},{label:'交付'}]}}}},
  {id:'pyramid-auto',content:{title:'视图 D',diagram:{subtype:'pyramid',data:{items:[{label:'基础'},{label:'能力'},{label:'价值'}]}}}},
  {id:'cycle-auto',content:{title:'视图 E',diagram:{subtype:'cycle',data:{items:[{label:'发现'},{label:'分析'},{label:'实施'},{label:'复盘'}]}}}}
]};
const structuredDeck=C.compileDeck(structuredSpec,{rootId:'input-structured-root'});assert.equal(structuredDeck.quality.ok,true,structuredDeck.quality.errors?.map(item=>item.message).join('; '));
const roleById=Object.fromEntries(structuredDeck.project.children.map(node=>[node.id,node.composer.role]));
assert.deepEqual(roleById,{'table-auto':'table','swot-auto':'matrix','roadmap-auto':'roadmap','pyramid-auto':'cards','cycle-auto':'process'});
assert.equal(structuredDeck.project.children.find(node=>node.id==='table-auto').slideElements.some(element=>element.type==='table'),true);
assert.equal(structuredDeck.project.children.filter(node=>node.slideElements.some(element=>element.type==='diagram')).length,4);

const richMarkdown=`# 富 Markdown 输入\n> 同时覆盖表格、强调、链接、引用和代码块\n\n## 核心指标\n| 指标 | 当前 | 目标 |\n| --- | ---: | ---: |\n| 可用性 | 99.9% | 99.99% |\n| 延迟 | 80ms | 50ms |\n| 成功率 | 98% | 99% |\n\n## 技术方案\n**目标**：保持 [单一 Runtime](https://example.com) 并减少重复逻辑。\n\n\`\`\`js\nfunction route(input) { return input ?? 'stable'; }\n\`\`\`\n\n- [x] 统一输入链路\n- [ ] 继续补充回归样例\n\n## 引用\n> 用户真正关心的是结果，而不是代码量。`;
const parsed=C.parseOutline(richMarkdown);assert.equal(parsed.title,'富 Markdown 输入');assert.equal(parsed.pageCount,4);assert.equal(parsed.specs[0].points.length,3);assert.ok(parsed.specs[0].points.every(point=>!point.includes('|')));assert.ok(!parsed.specs[1].text.includes('```'));assert.ok(!parsed.specs[1].text.includes('**'));assert.ok(parsed.specs[1].text.includes('单一 Runtime'));assert.ok(!parsed.specs[2].text.includes('>'));
const markdownDeck=C.compose(richMarkdown,{theme:'aurora',density:'standard'});assert.equal(C.Quality.validateProject(markdownDeck).ok,true);assert.equal(markdownDeck.children[0].composer.role,'metrics');

console.log('MindDeck V10 input matrix: OK (chart/table/diagram-only DeckSpec + rich Markdown)');
