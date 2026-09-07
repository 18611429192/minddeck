import { test, expect } from '@playwright/test';

test.setTimeout(240000);

const chartCases=[
  ['chart-bar-complex','bar'],['chart-line-complex','line'],['chart-area-complex','area'],['chart-donut-complex','donut'],['chart-radar-complex','radar'],['chart-funnel-complex','funnel'],['chart-waterfall-complex','waterfall']
];

async function dismissWelcome(page){
  await page.waitForTimeout(320);
  const overlay=page.locator('#welcomeOverlay');
  if(await overlay.isVisible())await page.locator('#welcomeClose').click();
}
async function generateStressSpec(page){
  await page.locator('#v99SmartComposeBtn').click();
  await expect(page.locator('.compose-v10-modebar')).toBeVisible();
  await page.locator('[data-compose-mode="deckspec"]').click();
  await expect(page.locator('#v99DeckSpecJson')).toBeVisible();
  await page.locator('#v99DeckSpecFile').setInputFiles('examples/v10-chart-scheme-stress/chart-scheme-stress.deck.json');
  await page.locator('#v99DeckSpecGenerate').click();
  await expect(page.locator('.v99-smart-overlay')).toHaveCount(0);
  await expect.poll(()=>page.evaluate(()=>globalThis.MindDeckCore.Composer.Quality.validateProject(globalThis.MindDeckApp.getProject()).ok)).toBe(true);
}
async function openSlideByButtons(page,id){
  await page.locator(`.node[data-id="${id}"]`).click();
  await expect(page.locator('#nodePanel')).toHaveClass(/open/);
  await page.locator('#editSlideBtn').click();
  await expect(page.locator('#editorShell')).toHaveClass(/open/);
}
async function chartState(page,id){
  return page.evaluate(nodeId=>{
    const node=globalThis.MindDeckApp.getProject().children.find(item=>item.id===nodeId),element=node?.slideElements?.find(item=>item.type==='chart');
    return {element:structuredClone(element),content:structuredClone(node?.composer?.content?.chart),templateId:node?.composer?.selectedTemplateId,dirty:globalThis.MindDeckCore.Composer.Provenance.isDirty(node)};
  },id);
}
function geom(element){return [Math.round(element.x),Math.round(element.y),Math.round(element.w),Math.round(element.h)].join(':')}

function installFakePptx(page){
  return page.evaluate(()=>{
    class FakeSlide{addImage(){}addShape(){}addText(){}addTable(){}addChart(){}}
    class FakePptx{constructor(){this.ShapeType={rect:'rect',roundRect:'roundRect',ellipse:'ellipse',line:'line'};this.ChartType={bar:'bar',line:'line',area:'area',doughnut:'doughnut',radar:'radar'}}defineLayout(){}addSlide(){return new FakeSlide()}async write(){return new ArrayBuffer(32)}}
    globalThis.PptxGenJS=FakePptx;
  });
}

test('complex DeckSpec generates through real buttons and every native chart type edits canonical data',async({page},testInfo)=>{
  test.skip(testInfo.project.name.includes('mobile'),'desktop chart editing matrix');
  const pageErrors=[];page.on('pageerror',error=>pageErrors.push(error.message));page.on('dialog',dialog=>dialog.accept().catch(()=>{}));
  await page.goto('/');await dismissWelcome(page);await generateStressSpec(page);

  const projectSummary=await page.evaluate(()=>({title:globalThis.MindDeckApp.getProject().title,count:globalThis.MindDeckApp.getProject().children.length}));
  expect(projectSummary).toEqual({title:'复杂图表方案与编辑回归',count:10});

  for(let index=0;index<chartCases.length;index++){
    const [id,type]=chartCases[index];
    await openSlideByButtons(page,id);
    const host=page.locator('#editorStage .canvas-el.el-chart').first();
    await expect(host).toBeVisible();await host.click();
    await expect(page.locator('#propTitle')).toHaveText('图表属性');
    await expect(page.locator('[data-chart-type]')).toHaveValue(type);

    const category=page.locator('[data-chart-category="0"]');
    await category.fill(`已编辑-${type}`);await category.press('Tab');
    const value=page.locator('[data-chart-value-row="0"][data-chart-value-series="0"]');
    const editedValue=700+index*13;await value.fill(String(editedValue));await value.press('Tab');
    const pointCountBefore=await page.locator('[data-chart-category]').count();
    await page.locator('[data-chart-action="add-point"]').click();
    await expect(page.locator('[data-chart-category]')).toHaveCount(pointCountBefore+1);

    if(['bar','line','area','radar'].includes(type)){
      const names=page.locator('[data-chart-series-name]'),seriesCountBefore=await names.count();
      await page.locator('[data-chart-action="add-series"]').click();
      await expect(names).toHaveCount(seriesCountBefore+1);
      const newSeriesIndex=seriesCountBefore;
      await names.nth(newSeriesIndex).fill(`新增系列-${type}`);await names.nth(newSeriesIndex).press('Tab');
      const extra=page.locator(`[data-chart-value-row="0"][data-chart-value-series="${newSeriesIndex}"]`);await extra.fill(String(90+index));await extra.press('Tab');
    }else{
      await expect(page.locator('[data-chart-action="add-series"]')).toBeDisabled();
    }

    const state=await chartState(page,id);
    expect(state.element.chartType).toBe(type);
    expect(state.element.categories[0]).toBe(`已编辑-${type}`);
    expect(state.element.series[0].values[0]).toBe(editedValue);
    expect(state.content.categories[0]).toBe(`已编辑-${type}`);
    expect(state.content.series[0].values[0]).toBe(editedValue);
    expect(state.dirty).toBe(true);
    await page.locator('#backToMapBtn').click();await expect(page.locator('#editorShell')).not.toHaveClass(/open/);
  }

  await installFakePptx(page);
  const downloadPromise=page.waitForEvent('download');
  await page.locator('#exportPptxBtn').click();
  const download=await downloadPromise;expect(await download.failure()).toBeNull();
  await expect(page.locator('#toast')).toContainText('PPTX 已导出');
  expect(pageErrors).toEqual([]);
});

test('A/B/C redesign candidates really reflow chart geometry and preserve edited data',async({page},testInfo)=>{
  test.skip(testInfo.project.name.includes('mobile'),'desktop redesign scheme contract');
  const pageErrors=[];page.on('pageerror',error=>pageErrors.push(error.message));page.on('dialog',dialog=>dialog.accept().catch(()=>{}));
  await page.goto('/');await dismissWelcome(page);await generateStressSpec(page);

  for(const id of ['chart-bar-complex','chart-line-complex']){
    await openSlideByButtons(page,id);
    const host=page.locator('#editorStage .canvas-el.el-chart').first();await host.click();
    const edited=page.locator('[data-chart-value-row="0"][data-chart-value-series="0"]');await edited.fill('987');await edited.press('Tab');
    let state=await chartState(page,id);expect(state.content.series[0].values[0]).toBe(987);expect(state.dirty).toBe(true);

    await page.locator('#v99PageDesignerBtn').click();
    await expect(page.locator('#slideInspectorPanel')).toHaveClass(/open/);
    await expect(page.locator('[data-intent-field="columns"]')).toHaveCount(0);
    await expect(page.locator('[data-intent-field="emphasisIndex"]')).toHaveCount(0);
    await expect(page.locator('[data-intent-field="density"]')).toBeVisible();
    await expect(page.locator('[data-intent-field="alignment"]')).toBeVisible();
    await expect(page.locator('[data-intent-field="visualWeight"]')).toBeVisible();
    await expect(page.locator('[data-intent-field="contentBalance"]')).toBeVisible();
    await page.locator('[data-intent-field="density"]').selectOption('rich');

    const ids=await page.locator('#slideInspectorPanel [data-redesign-template]').evaluateAll(items=>items.map(item=>item.dataset.redesignTemplate));
    expect(ids).toHaveLength(3);expect(new Set(ids).size).toBe(3);
    const geometries=[];
    for(let index=0;index<ids.length;index++){
      const templateId=ids[index];
      await page.locator(`#slideInspectorPanel [data-redesign-template="${templateId}"]`).click();
      await page.locator('#slideInspectorPanel #v99ApplyTemplate').click();
      await expect(page.locator('#slideInspectorPanel')).not.toHaveClass(/open/);
      state=await chartState(page,id);
      expect(state.templateId).toBe(templateId);
      expect(state.element.chartLayout.templateId).toBe(templateId);
      expect(state.content.series[0].values[0]).toBe(987);
      expect(state.element.series[0].values[0]).toBe(987);
      geometries.push(geom(state.element));
      if(index<ids.length-1){await page.locator('#v99PageDesignerBtn').click();await expect(page.locator('#slideInspectorPanel')).toHaveClass(/open/)}
    }
    expect(new Set(geometries).size).toBe(3);

    await page.locator('#v99PageDesignerBtn').click();
    const chosen=(await page.locator('#slideInspectorPanel [data-redesign-template]').first().getAttribute('data-redesign-template'));
    await page.locator('[data-intent-field="contentBalance"]').selectOption('text');
    await page.locator('[data-intent-field="visualWeight"]').evaluate(el=>{el.value='0.9';el.dispatchEvent(new Event('change',{bubbles:true}))});
    const selected=page.locator(`#slideInspectorPanel [data-redesign-template="${chosen}"]`);if(await selected.count())await selected.click();else await page.locator('#slideInspectorPanel [data-redesign-template]').first().click();
    await page.locator('#slideInspectorPanel #v99ApplyTemplate').click();
    const textGeometry=geom((await chartState(page,id)).element);
    await page.locator('#v99PageDesignerBtn').click();
    await page.locator('[data-intent-field="contentBalance"]').selectOption('visual');
    await page.locator('[data-intent-field="visualWeight"]').evaluate(el=>{el.value='1.1';el.dispatchEvent(new Event('change',{bubbles:true}))});
    await page.locator('#slideInspectorPanel [data-redesign-template]').first().click();await page.locator('#slideInspectorPanel #v99ApplyTemplate').click();
    const visualState=await chartState(page,id);expect(geom(visualState.element)).not.toBe(textGeometry);expect(visualState.content.series[0].values[0]).toBe(987);

    await page.locator('#backToMapBtn').click();
  }
  expect(pageErrors).toEqual([]);
});