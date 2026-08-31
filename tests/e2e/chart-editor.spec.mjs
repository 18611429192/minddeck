import { test, expect } from '@playwright/test';

test.setTimeout(120000);

async function dismissWelcome(page){
  await page.waitForTimeout(320);
  const overlay=page.locator('#welcomeOverlay');
  if(await overlay.isVisible())await page.locator('#welcomeClose').click();
}

function editableChartSpec(){
  return {
    schemaVersion:1,
    title:'可编辑图表验收',
    goal:'验证图表数据在编辑、重绘和重新套版后保持一致',
    audience:'MindDeck QA',
    theme:'aurora',
    slides:[{
      id:'chart-edit',
      role:'trend',
      content:{
        title:'季度趋势',
        summary:'原生图表必须可以直接修改真实数据。',
        chart:{
          chartType:'line',
          categories:['Q1','Q2','Q3'],
          series:[{id:'series-1',name:'收入',values:[10,20,30]}],
          options:{showLegend:true,showLabels:true,showValues:true,showGrid:true,smooth:true}
        }
      }
    }]
  };
}

async function currentChart(page){
  return page.evaluate(()=>{
    const node=globalThis.MindDeckApp.getProject().children.find(item=>item.id==='chart-edit');
    const element=(node.slideElements||[]).find(item=>item.type==='chart');
    return {element:structuredClone(element),content:structuredClone(node.composer?.content?.chart)};
  });
}

test('native chart editor changes real data and survives unified redesign recompile',async({page},testInfo)=>{
  test.skip(testInfo.project.name.includes('mobile'),'desktop chart editor contract');
  const pageErrors=[];
  page.on('pageerror',error=>pageErrors.push(error.message));
  page.on('dialog',dialog=>dialog.accept());

  await page.goto('/');
  await dismissWelcome(page);

  await page.locator('#v99DeckSpecBtn').click();
  await page.locator('#v99DeckSpecJson').fill(JSON.stringify(editableChartSpec(),null,2));
  await page.locator('#v99DeckSpecGenerate').click();
  await expect(page.locator('.v99-smart-overlay')).toHaveCount(0);

  await page.locator('.node[data-id="chart-edit"]').click();
  await page.locator('#editSlideBtn').click();
  await expect(page.locator('#editorShell')).toHaveClass(/open/);
  await expect(page.locator('#editorStage svg[aria-label="line chart"]')).toBeVisible();

  const chartHost=page.locator('#editorStage .canvas-el.el-chart').first();
  await chartHost.click();
  await expect(page.locator('#propTitle')).toHaveText('图表属性');
  await expect(page.locator('[data-chart-type]')).toHaveValue('line');
  await expect(page.locator('[data-chart-category]')).toHaveCount(3);
  await expect(page.locator('[data-chart-series-name]')).toHaveCount(1);

  await page.locator('[data-chart-type]').selectOption('bar');
  await expect(page.locator('#editorStage svg[aria-label="bar chart"]')).toBeVisible();

  const category0=page.locator('[data-chart-category="0"]');
  await category0.fill('第一季度');
  await category0.press('Tab');

  const series0=page.locator('[data-chart-series-name="0"]');
  await series0.fill('销售额');
  await series0.press('Tab');

  const value00=page.locator('[data-chart-value-row="0"][data-chart-value-series="0"]');
  await value00.fill('123');
  await value00.press('Tab');

  await page.locator('[data-chart-action="add-point"]').click();
  await expect(page.locator('[data-chart-category]')).toHaveCount(4);
  await page.locator('[data-chart-category="3"]').fill('第四季度');
  await page.locator('[data-chart-category="3"]').press('Tab');
  await page.locator('[data-chart-value-row="3"][data-chart-value-series="0"]').fill('456');
  await page.locator('[data-chart-value-row="3"][data-chart-value-series="0"]').press('Tab');

  await page.locator('[data-chart-action="add-series"]').click();
  await expect(page.locator('[data-chart-series-name]')).toHaveCount(2);
  await page.locator('[data-chart-series-name="1"]').fill('利润');
  await page.locator('[data-chart-series-name="1"]').press('Tab');
  await page.locator('[data-chart-value-row="0"][data-chart-value-series="1"]').fill('42');
  await page.locator('[data-chart-value-row="0"][data-chart-value-series="1"]').press('Tab');

  let chart=await currentChart(page);
  expect(chart.element.chartType).toBe('bar');
  expect(chart.element.categories).toEqual(['第一季度','Q2','Q3','第四季度']);
  expect(chart.element.series[0].name).toBe('销售额');
  expect(chart.element.series[0].values).toEqual([123,20,30,456]);
  expect(chart.element.series[1].name).toBe('利润');
  expect(chart.element.series[1].values[0]).toBe(42);
  expect(chart.content).toEqual(expect.objectContaining({
    chartType:'bar',
    categories:['第一季度','Q2','Q3','第四季度']
  }));
  expect(chart.content.series[0].values).toEqual([123,20,30,456]);
  expect(chart.content.series[1].name).toBe('利润');

  // Recompile the dirty slide through the unified Redesign panel. Intent is the
  // constraint input and A/B/C are concrete template outcomes. Edited chart source
  // must remain canonical instead of restoring the original DeckSpec data.
  await page.locator('#v99PageDesignerBtn').click();
  await expect(page.locator('#slideInspectorPanel')).toHaveClass(/open/);
  await expect(page.locator('#slideInspectorPanel .v10-inspector-head h3')).toHaveText('重新设计本页');
  const candidates=page.locator('#slideInspectorPanel [data-redesign-template]');
  await expect(candidates).not.toHaveCount(0);
  await candidates.first().click();
  await expect(page.locator('#editorStage svg[aria-label="bar chart"]')).toBeVisible();

  chart=await currentChart(page);
  expect(chart.element.chartType).toBe('bar');
  expect(chart.element.categories).toEqual(['第一季度','Q2','Q3','第四季度']);
  expect(chart.element.series[0].name).toBe('销售额');
  expect(chart.element.series[0].values).toEqual([123,20,30,456]);
  expect(chart.element.series[1].name).toBe('利润');
  expect(chart.element.series[1].values[0]).toBe(42);
  expect(chart.content.series[0].values).toEqual([123,20,30,456]);
  expect(pageErrors).toEqual([]);
});
