import { test, expect } from '@playwright/test';

test.setTimeout(120000);

async function dismissWelcome(page){
  await page.waitForTimeout(320);
  const overlay=page.locator('#welcomeOverlay');
  if(await overlay.isVisible())await page.locator('#welcomeClose').click();
}
async function project(page){return page.evaluate(()=>structuredClone(globalThis.MindDeckApp.getProject()))}
async function openMarkdown(page,source){
  await page.locator('#v99SmartComposeBtn').click();
  await expect(page.locator('#v99Outline')).toBeVisible();
  await page.locator('#v99Outline').fill(source);
  await expect(page.locator('#v99Preview')).not.toContainText('无法解析');
  await expect(page.locator('#v99Preview')).toContainText('72 个结构模板');
}
async function generateSpec(page,spec){
  await page.locator('#v99DeckSpecBtn').click();
  await expect(page.locator('#v99DeckSpecJson')).toBeVisible();
  await page.locator('#v99DeckSpecJson').fill(JSON.stringify(spec,null,2));
  await page.locator('#v99DeckSpecGenerate').click();
  await expect(page.locator('.v99-smart-overlay')).toHaveCount(0);
}
function chartData(chartType,values=[12,24,18,31],multi=false){
  const labels=values.map((_,index)=>`P${index+1}`),chart={chartType,categories:labels,labels,options:{showValues:true}};
  if(['bar','line','area','radar'].includes(chartType)){chart.series=[{name:'实际值',values}];if(multi)chart.series.push({name:'目标值',values:values.map(value=>value+5)})}
  else chart.values=values;
  return chart;
}
const scaledChartCases=[['bar',7],['line',12],['area',24],['donut',12],['radar',6],['funnel',18],['waterfall',12]];
function chartOnlySpec(){
  return {schemaVersion:1,title:'Chart-only 输入矩阵',goal:'验证不同图表类型和数据规模都无需重复填写 items，也能完成模板匹配和原生渲染',slides:scaledChartCases.map(([chartType,count],index)=>({id:`chart-${chartType}`,content:{title:`视图 ${index+1}`,chart:chartData(chartType,Array.from({length:count},(_,i)=>(i+1)*7),count>=12)}}))};
}
function structuredOnlySpec(){
  const tableRows=Array.from({length:24},(_,index)=>[`项目 ${index+1}`,`${(index+1)*3}%`,index%2?'进行中':'完成']);
  const items=count=>Array.from({length:count},(_,index)=>({label:`节点 ${index+1}`,detail:`说明 ${index+1}`}));
  return {schemaVersion:1,title:'Structured-only 输入矩阵',goal:'验证表格和 Diagram 在较大数据规模下无需显式 role/items 也能完成匹配',slides:[
    {id:'table-auto',content:{title:'视图 A',table:{columns:[{label:'项目'},{label:'进度'},{label:'状态'}],rows:tableRows}}},
    {id:'swot-auto',content:{title:'视图 B',diagram:{subtype:'swot',data:{items:items(12)}}}},
    {id:'roadmap-auto',content:{title:'视图 C',diagram:{subtype:'roadmap',data:{items:items(12)}}}},
    {id:'pyramid-auto',content:{title:'视图 D',diagram:{subtype:'pyramid',data:{items:items(9)}}}},
    {id:'cycle-auto',content:{title:'视图 E',diagram:{subtype:'cycle',data:{items:items(12)}}}}
  ]};
}

const markdownCases=[
  `# 极简输入\n> 一句话说明\n\n## 核心观点\n- 只保留真正需要表达的内容\n- 页面继续可编辑`,
  `# 多层结构\n> 验证标题层级和编号列表\n\n## 第一章\n1. 背景\n2. 目标\n\n### 子页面\n- [x] 已完成\n- [ ] 待验证\n\n## 第二章\n- A\n- B\n- C`,
  `# 富 Markdown 输入\n> 同时覆盖表格、强调、链接、引用和代码块\n\n## 核心指标\n| 指标 | 当前 | 目标 |\n| --- | ---: | ---: |\n| 可用性 | 99.9% | 99.99% |\n| 延迟 | 80ms | 50ms |\n| 成功率 | 98% | 99% |\n\n## 技术方案\n**目标**：保持 [单一 Runtime](https://example.com) 并减少重复逻辑。\n\n\`\`\`js\nfunction route(input) { return input ?? 'stable'; }\n\`\`\`\n\n- [x] 统一输入链路\n- [ ] 继续补充回归样例\n\n## 引用\n> 用户真正关心的是结果，而不是代码量。`
];
const longBullets=`# 长列表压力测试\n\n## 单一章节包含大量要点\n${Array.from({length:17},(_,index)=>`- 长列表要点 ${index+1}`).join('\n')}`;
const manySections=['# 十二章节压力测试','> 封面只取有限摘要，不应因章节数量失败',...Array.from({length:12},(_,index)=>`\n## 章节 ${index+1}\n- 要点 A${index+1}\n- 要点 B${index+1}\n- 要点 C${index+1}`)].join('\n');

test('Markdown entry stays toolbar-consistent in light/dark themes and accepts varied Markdown richness and scale',async({page},testInfo)=>{
  test.skip(testInfo.project.name.includes('mobile'),'desktop input-entry sweep');
  const pageErrors=[];page.on('pageerror',err=>pageErrors.push(err.message));page.on('dialog',dialog=>dialog.accept());
  await page.goto('/');await dismissWelcome(page);

  const smart=page.locator('#v99SmartComposeBtn'),deck=page.locator('#v99DeckSpecBtn');
  await expect(smart).toBeVisible();await expect(deck).toBeVisible();
  await expect(smart).not.toHaveClass(/primary/);
  const light=await page.evaluate(()=>{const a=getComputedStyle(document.getElementById('v99SmartComposeBtn')),b=getComputedStyle(document.getElementById('v99DeckSpecBtn'));return {smart:[a.backgroundColor,a.color,a.borderColor],deck:[b.backgroundColor,b.color,b.borderColor]}});
  expect(light.smart).toEqual(light.deck);

  await page.locator('#appearanceBtn').click();await page.locator('[data-theme-choice="dark"]').click();
  const dark=await page.evaluate(()=>{const a=getComputedStyle(document.getElementById('v99SmartComposeBtn')),b=getComputedStyle(document.getElementById('v99DeckSpecBtn'));return {smart:[a.backgroundColor,a.color,a.borderColor],deck:[b.backgroundColor,b.color,b.borderColor]}});
  expect(dark.smart).toEqual(dark.deck);
  const closeTheme=page.locator('[data-close-panel="themePanel"]');if(await closeTheme.isVisible())await closeTheme.click();

  for(let index=0;index<markdownCases.length;index++){
    await openMarkdown(page,markdownCases[index]);
    if(index<markdownCases.length-1){await page.locator('#v99CancelBtn').click();await expect(page.locator('.v99-smart-overlay')).toHaveCount(0)}
  }
  await page.locator('#v99GenerateBtn').click();await expect(page.locator('.v99-smart-overlay')).toHaveCount(0);
  let generated=await project(page);expect(generated.title).toBe('富 Markdown 输入');expect(generated.children).toHaveLength(3);
  expect(generated.children[0].composer.content.items).toHaveLength(3);
  expect(generated.children[0].composer.content.items.some(item=>/\|\s*---/.test(item.label))).toBe(false);
  expect(generated.children[1].composer.content.summary).not.toContain('```');
  expect(generated.children[1].composer.content.summary).not.toContain('**');
  expect(generated.children[1].composer.content.summary).toContain('单一 Runtime');

  await openMarkdown(page,longBullets);await page.locator('#v99GenerateBtn').click();await expect(page.locator('.v99-smart-overlay')).toHaveCount(0);
  generated=await project(page);expect(generated.children).toHaveLength(3);expect(generated.children.every(node=>node.composer.content.items.length<=6)).toBe(true);

  await openMarkdown(page,manySections);await page.locator('#v99GenerateBtn').click();await expect(page.locator('.v99-smart-overlay')).toHaveCount(0);
  generated=await project(page);expect(generated.children).toHaveLength(12);expect(generated.composer.content.items.length).toBeLessThanOrEqual(6);
  await expect.poll(()=>page.evaluate(()=>globalThis.MindDeckCore.Composer.Quality.validateProject(globalThis.MindDeckApp.getProject()).ok)).toBe(true);
  expect(pageErrors).toEqual([]);
});

test('DeckSpec matrix accepts scaled chart/table/diagram-only bodies and rejects invalid rich-body contracts',async({page},testInfo)=>{
  test.skip(testInfo.project.name.includes('mobile'),'desktop input-entry sweep');
  const pageErrors=[];page.on('pageerror',err=>pageErrors.push(err.message));page.on('dialog',dialog=>dialog.accept());
  await page.goto('/');await dismissWelcome(page);

  await generateSpec(page,chartOnlySpec());
  let generated=await project(page);expect(generated.children).toHaveLength(7);
  const charts=generated.children.map(node=>({id:node.id,role:node.composer.role,chart:node.slideElements.find(element=>element.type==='chart'),items:node.composer.content.items.length}));
  expect(charts.map(item=>item.chart?.chartType)).toEqual(scaledChartCases.map(item=>item[0]));
  expect(charts.every(item=>item.items<=4)).toBe(true);
  for(const [chartType,count] of scaledChartCases){const item=charts.find(entry=>entry.chart?.chartType===chartType);expect(Math.max(item.chart.categories?.length||0,item.chart.labels?.length||0,item.chart.values?.length||0,item.chart.series?.[0]?.values?.length||0)).toBe(count)}
  expect(charts.find(item=>item.chart?.chartType==='line').role).toBe('trend');expect(charts.find(item=>item.chart?.chartType==='donut').role).toBe('metrics');

  await generateSpec(page,structuredOnlySpec());
  generated=await project(page);expect(generated.children).toHaveLength(5);
  const summary=generated.children.map(node=>({id:node.id,role:node.composer.role,types:node.slideElements.map(element=>element.type),tableRows:node.slideElements.find(element=>element.type==='table')?.rows?.length||0,diagram:node.slideElements.find(element=>element.type==='diagram')||null,items:node.composer.content.items.length}));
  expect(summary.find(item=>item.id==='table-auto').role).toBe('table');expect(summary.find(item=>item.id==='table-auto').types).toContain('table');expect(summary.find(item=>item.id==='table-auto').tableRows).toBe(24);expect(summary.find(item=>item.id==='table-auto').items).toBeLessThanOrEqual(6);
  expect(summary.find(item=>item.id==='swot-auto').role).toBe('matrix');expect(summary.find(item=>item.id==='roadmap-auto').role).toBe('roadmap');expect(summary.find(item=>item.id==='pyramid-auto').role).toBe('cards');expect(summary.find(item=>item.id==='cycle-auto').role).toBe('process');
  expect(summary.filter(item=>item.diagram).map(item=>item.diagram.subtype)).toEqual(['swot','roadmap','pyramid','cycle']);expect(summary.filter(item=>item.diagram).every(item=>item.items<=4)).toBe(true);expect(summary.find(item=>item.id==='swot-auto').diagram.data.items.length).toBe(12);

  const invalid={schemaVersion:1,title:'Invalid rich body',goal:'必须明确拒绝冲突',slides:[{id:'bad',role:'metrics',content:{title:'冲突页',chart:chartData('bar'),table:{rows:[['A','1']]}}}]};
  await page.locator('#v99DeckSpecBtn').click();await page.locator('#v99DeckSpecJson').fill(JSON.stringify(invalid));await page.locator('#v99DeckSpecGenerate').click();
  await expect(page.locator('#v99DeckSpecStatus')).toContainText('RICH_BODY_CONFLICT');await page.locator('#v99DeckSpecCancel').click();

  const invalidRole={schemaVersion:1,title:'Invalid chart role',goal:'图表角色错误必须显式报告',slides:[{id:'bad-role',role:'statement',content:{title:'冲突角色',chart:chartData('line')}}]};
  await page.locator('#v99DeckSpecBtn').click();await page.locator('#v99DeckSpecJson').fill(JSON.stringify(invalidRole));await page.locator('#v99DeckSpecGenerate').click();
  await expect(page.locator('#v99DeckSpecStatus')).toContainText('CHART_ROLE_UNSUPPORTED');await page.locator('#v99DeckSpecCancel').click();

  await expect.poll(()=>page.evaluate(()=>globalThis.MindDeckCore.Composer.Quality.validateProject(globalThis.MindDeckApp.getProject()).ok)).toBe(true);
  expect(pageErrors).toEqual([]);
});
