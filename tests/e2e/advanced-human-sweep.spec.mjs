import { readFile } from 'node:fs/promises';
import { test, expect } from '@playwright/test';

test.setTimeout(150000);

const chartSpec=JSON.parse(await readFile(new URL('../../examples/v10-chart-golden/native-chart.deck.json',import.meta.url),'utf8'));
const structuredSpec=JSON.parse(await readFile(new URL('../../examples/v10-table-diagram-golden/table-diagram.deck.json',import.meta.url),'utf8'));

async function dismissWelcome(page){
  await page.waitForTimeout(320);
  const overlay=page.locator('#welcomeOverlay');
  if(await overlay.isVisible())await page.locator('#welcomeClose').click();
  await expect(overlay).not.toHaveClass(/open/);
}
function watchPageErrors(page){const errors=[];page.on('pageerror',error=>errors.push(error.message));return errors}
function acceptDialogs(page){page.on('dialog',dialog=>dialog.accept().catch(()=>{}))}
async function project(page){return page.evaluate(()=>structuredClone(globalThis.MindDeckApp.getProject()))}
async function nodeById(page,id){
  return page.evaluate(nodeId=>{
    const walk=node=>node.id===nodeId?node:(node.children||[]).map(walk).find(Boolean);
    return structuredClone(walk(globalThis.MindDeckApp.getProject()));
  },id);
}
async function closePanel(page,id){const close=page.locator(`[data-close-panel="${id}"]`);if(await close.isVisible())await close.click()}
async function waitOverlayClosed(page){await expect(page.locator('.v99-smart-overlay')).toHaveCount(0)}
async function downloadByClick(page,selector){
  const pending=page.waitForEvent('download',{timeout:12000});
  await page.locator(selector).click();
  const download=await pending;
  expect(await download.failure()).toBeNull();
  return download;
}
async function chooseDifferentOption(select,current){
  const values=await select.locator('option').evaluateAll(options=>options.map(option=>option.value).filter(Boolean));
  const next=values.find(value=>value!==current)||values[0];
  expect(next).toBeTruthy();
  await select.selectOption(next);
  return next;
}
async function openNodeEditor(page,nodeId){
  await page.locator(`.node[data-id="${nodeId}"]`).click();
  await expect(page.locator('#nodePanel')).toHaveClass(/open/);
  await page.locator('#editSlideBtn').click();
  await expect(page.locator('#editorShell')).toHaveClass(/open/);
}
async function backToMap(page){
  if(await page.locator('#editorShell').evaluate(el=>el.classList.contains('open')))await page.locator('#backToMapBtn').click();
  await expect(page.locator('#editorShell')).not.toHaveClass(/open/);
}

async function exerciseNativeElement(page,type){
  const target=await page.evaluate(kind=>{
    const walk=node=>{
      const element=(node.slideElements||[]).find(item=>item.type===kind);
      if(element)return {nodeId:node.id,elementId:element.id,x:element.x};
      for(const child of node.children||[]){const found=walk(child);if(found)return found}
      return null;
    };
    return walk(globalThis.MindDeckApp.getProject());
  },type);
  expect(target,`expected generated ${type} element`).toBeTruthy();
  await openNodeEditor(page,target.nodeId);
  const locator=page.locator(`.canvas-el[data-id="${target.elementId}"]`);
  await expect(locator).toBeVisible();
  await locator.click();

  const countBefore=await page.evaluate(({nodeId,type})=>{
    const walk=node=>node.id===nodeId?node:(node.children||[]).map(walk).find(Boolean);
    return walk(globalThis.MindDeckApp.getProject()).slideElements.filter(item=>item.type===type).length;
  },{nodeId:target.nodeId,type});
  await page.locator('#duplicateElBtn').click();
  await expect.poll(()=>page.evaluate(({nodeId,type})=>{
    const walk=node=>node.id===nodeId?node:(node.children||[]).map(walk).find(Boolean);
    return walk(globalThis.MindDeckApp.getProject()).slideElements.filter(item=>item.type===type).length;
  },{nodeId:target.nodeId,type})).toBe(countBefore+1);

  const selectedId=await page.evaluate(()=>document.querySelector('.canvas-el.selected')?.dataset.id||null);
  expect(selectedId).toBeTruthy();
  const beforeX=await page.evaluate(({nodeId,id})=>{
    const walk=node=>node.id===nodeId?node:(node.children||[]).map(walk).find(Boolean);
    return walk(globalThis.MindDeckApp.getProject()).slideElements.find(item=>item.id===id)?.x;
  },{nodeId:target.nodeId,id:selectedId});
  await page.keyboard.press('Shift+ArrowRight');
  await expect.poll(()=>page.evaluate(({nodeId,id})=>{
    const walk=node=>node.id===nodeId?node:(node.children||[]).map(walk).find(Boolean);
    return walk(globalThis.MindDeckApp.getProject()).slideElements.find(item=>item.id===id)?.x;
  },{nodeId:target.nodeId,id:selectedId})).toBe(beforeX+10);

  await page.keyboard.press('Delete');
  await expect.poll(()=>page.evaluate(({nodeId,type})=>{
    const walk=node=>node.id===nodeId?node:(node.children||[]).map(walk).find(Boolean);
    return walk(globalThis.MindDeckApp.getProject()).slideElements.filter(item=>item.type===type).length;
  },{nodeId:target.nodeId,type})).toBe(countBefore);
  await page.keyboard.press('Control+z');
  await expect.poll(()=>page.evaluate(({nodeId,type})=>{
    const walk=node=>node.id===nodeId?node:(node.children||[]).map(walk).find(Boolean);
    return walk(globalThis.MindDeckApp.getProject()).slideElements.filter(item=>item.type===type).length;
  },{nodeId:target.nodeId,type})).toBe(countBefore+1);
  await backToMap(page);
}

test('desktop advanced human sweep generates, rethemes, imports rich DeckSpec and edits native elements',async({page},testInfo)=>{
  test.skip(testInfo.project.name.includes('mobile'),'desktop advanced sweep');
  const pageErrors=watchPageErrors(page);
  acceptDialogs(page);
  await page.goto('/');
  await dismissWelcome(page);

  // Real appearance and layout changes must persist in the project model.
  await page.locator('#appearanceBtn').click();
  await page.locator('[data-theme-choice="dark"]').click();
  await expect.poll(async()=>(await project(page)).uiTheme).toBe('dark');
  await closePanel(page,'themePanel');
  for(const layout of ['radial','down','right','left','balanced']){
    await page.locator('#mapLayoutSelect').selectOption(layout);
    await expect.poll(async()=>(await project(page)).mapLayout).toBe(layout);
  }

  // Actually generate a full editable project from Markdown, not just open the dialog.
  await page.locator('#v99SmartComposeBtn').click();
  await expect(page.locator('#v99Outline')).toBeVisible();
  await page.locator('#v99SampleBtn').click();
  await page.locator('#v99Density').selectOption('rich');
  await page.locator('#v99Layout').selectOption('radial');
  const smartThemeSelect=page.locator('#v99Theme');
  const initialTheme=await smartThemeSelect.inputValue();
  const smartTheme=await chooseDifferentOption(smartThemeSelect,initialTheme);
  await expect(page.locator('#v99Preview')).toContainText('页');
  await page.locator('#v99GenerateBtn').click();
  await waitOverlayClosed(page);
  await expect.poll(async()=>{
    const p=await project(page);
    return {title:p.title,density:p.deckDensity,layout:p.mapLayout,theme:p.deckTheme,uiTheme:p.uiTheme,children:p.children.length};
  }).toEqual({title:'项目复盘：从问题到结果',density:'rich',layout:'radial',theme:smartTheme,uiTheme:'dark',children:5});
  const smartProject=await project(page);
  expect(smartProject.children.every(node=>(node.slideElements||[]).length>0)).toBe(true);
  expect(smartProject.children.every(node=>!!node.composer?.selectedTemplateId)).toBe(true);

  // Apply a real A/B/C template recommendation to a generated page.
  const generatedNode=smartProject.children.find(node=>node.composer?.selectedTemplateId&&node.slideElements?.length);
  expect(generatedNode).toBeTruthy();
  await openNodeEditor(page,generatedNode.id);
  const beforeTemplate=(await nodeById(page,generatedNode.id)).composer.selectedTemplateId;
  await page.locator('#v99PageDesignerBtn').click();
  await expect(page.locator('#v99TemplateGrid')).toBeVisible();
  const templates=page.locator('.v99-smart-template');
  expect(await templates.count()).toBeGreaterThan(0);
  let desiredTemplate=await templates.first().getAttribute('data-template');
  if(await templates.count()>1){desiredTemplate=await templates.nth(1).getAttribute('data-template');await templates.nth(1).click()}
  expect(desiredTemplate).toBeTruthy();
  await page.locator('#v99ApplyTemplate').click();
  await waitOverlayClosed(page);
  await expect.poll(async()=>(await nodeById(page,generatedNode.id)).composer?.selectedTemplateId).toBe(desiredTemplate);
  if(desiredTemplate!==beforeTemplate)expect((await nodeById(page,generatedNode.id)).composer.selectedTemplateId).not.toBe(beforeTemplate);

  // A manual edit makes the page dirty. Retheming the whole generated deck must protect it.
  await page.locator('#addTextBtn').click();
  const manualId=await page.evaluate(id=>{
    const walk=node=>node.id===id?node:(node.children||[]).map(walk).find(Boolean);
    return walk(globalThis.MindDeckApp.getProject()).slideElements.at(-1).id;
  },generatedNode.id);
  const textControl=page.locator('[data-p="text"]');
  await expect(textControl).toBeVisible();
  await textControl.fill('人工修改：这一页必须被 dirty 保护');
  await textControl.blur();
  const dirtyElements=(await nodeById(page,generatedNode.id)).slideElements;
  await page.locator('#v99PageDesignerBtn').click();
  await expect(page.locator('#v99DirtyWarning')).toBeVisible();
  const pageTheme=page.locator('#v99PageTheme');
  const currentDeckTheme=(await project(page)).deckTheme;
  const retheme=await chooseDifferentOption(pageTheme,currentDeckTheme);
  await page.locator('#v99RethemeAll').click();
  await waitOverlayClosed(page);
  await expect.poll(async()=>(await project(page)).deckTheme).toBe(retheme);
  expect((await nodeById(page,generatedNode.id)).slideElements).toEqual(dirtyElements);
  expect((await nodeById(page,generatedNode.id)).slideElements.some(item=>item.id===manualId)).toBe(true);
  await backToMap(page);

  // DeckSpec error feedback must be visible before a valid rich spec replaces the project.
  await page.locator('#v99DeckSpecBtn').click();
  await page.locator('#v99DeckSpecJson').fill('{bad json');
  await page.locator('#v99DeckSpecGenerate').click();
  await expect(page.locator('#v99DeckSpecStatus')).toContainText('JSON_PARSE_ERROR');
  await page.locator('#v99DeckSpecJson').fill(JSON.stringify({schemaVersion:1,title:'缺少目标',slides:[]}));
  await page.locator('#v99DeckSpecGenerate').click();
  await expect(page.locator('#v99DeckSpecStatus')).toContainText('GOAL_REQUIRED');

  const richSpec={
    schemaVersion:1,
    title:'高级富内容 DeckSpec 人工测试',
    goal:'验证浏览器 UI 能真实生成并编辑原生图表、表格和图示',
    audience:'研发与业务评审',
    theme:'cobalt',
    slides:[
      ...chartSpec.slides.map((slide,index)=>({...slide,id:`ui-chart-${index+1}`})),
      ...structuredSpec.slides.map((slide,index)=>({...slide,id:`ui-structured-${index+1}`}))
    ]
  };
  await page.locator('#v99DeckSpecJson').fill(JSON.stringify(richSpec));
  await page.locator('#v99DeckSpecGenerate').click();
  await waitOverlayClosed(page);
  await expect.poll(async()=>(await project(page)).title).toBe(richSpec.title);
  const richProject=await project(page);
  expect(richProject.uiTheme).toBe('dark');
  expect(richProject.children.length).toBe(richSpec.slides.length);
  const nativeTypes=new Set(richProject.children.flatMap(node=>node.slideElements||[]).map(item=>item.type));
  expect(nativeTypes.has('chart')).toBe(true);
  expect(nativeTypes.has('table')).toBe(true);
  expect(nativeTypes.has('diagram')).toBe(true);
  expect(await page.evaluate(()=>globalThis.MindDeckCore.Composer.Quality.validateProject(globalThis.MindDeckApp.getProject()).ok)).toBe(true);

  // Native chart/table/diagram elements must survive actual editor operations.
  await exerciseNativeElement(page,'chart');
  await exerciseNativeElement(page,'table');
  await exerciseNativeElement(page,'diagram');

  // Export and present the rich project through the same user-facing runtime.
  await downloadByClick(page,'#exportViewerBtn');
  await page.locator('#presentBtn').click();
  await expect(page.locator('#presentShell')).toHaveClass(/open/);
  const activeBefore=await page.locator('.toc-item.active').getAttribute('data-id');
  await page.keyboard.press('ArrowRight');
  await expect.poll(async()=>page.locator('.toc-item.active').getAttribute('data-id')).not.toBe(activeBefore);
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowLeft');
  await page.keyboard.press('Escape');
  await expect(page.locator('#presentShell')).not.toHaveClass(/open/);

  expect(pageErrors).toEqual([]);
});
