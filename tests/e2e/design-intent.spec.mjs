import { test, expect } from '@playwright/test';

async function dismissWelcome(page){
  await page.waitForTimeout(320);
  const overlay=page.locator('#welcomeOverlay');
  if(await overlay.isVisible())await page.locator('#welcomeClose').click();
}
async function openDeckSpecCompose(page){
  await page.locator('#v99SmartComposeBtn').click();
  await expect(page.locator('.compose-v10-modebar')).toBeVisible();
  await page.locator('[data-compose-mode="deckspec"]').click();
  await expect(page.locator('#v99DeckSpecJson')).toBeVisible();
}
async function changeNumber(page,field,value){
  const locator=page.locator(`[data-intent-field="${field}"]`);
  await locator.evaluate((el,next)=>{el.value=String(next);el.dispatchEvent(new Event('change',{bubbles:true}))},value);
}
async function applySelected(page){
  await page.locator('#v99ApplyTemplate').click();
  await expect(page.locator('#slideInspectorPanel')).not.toHaveClass(/open/);
}

test('V10 unified Redesign panel drafts DesignIntent then applies one A/B/C outcome through Composer',async({page},testInfo)=>{
  test.skip(testInfo.project.name.includes('mobile'),'desktop redesign coverage');
  page.on('dialog',dialog=>dialog.message().includes('人工编辑')?dialog.dismiss():dialog.accept());
  await page.goto('/');
  await dismissWelcome(page);

  await openDeckSpecCompose(page);
  await page.locator('#v99DeckSpecFile').setInputFiles('examples/v10-design-intent/design-intent.deck.json');
  await page.locator('#v99DeckSpecGenerate').click();
  await expect(page.locator('.v99-smart-overlay')).toHaveCount(0);

  const cardsId='intent-cards';
  await page.evaluate(id=>globalThis.MindDeckApp.openEditor('slide',id),cardsId);
  await page.locator('#slideInspectorBtn').click();
  await expect(page.locator('#slideInspectorPanel')).toHaveClass(/open/);
  await expect(page.locator('#slideInspectorPanel .v10-inspector-head h3')).toHaveText('重新设计本页');
  await expect(page.locator('[data-intent-field="columns"]')).toBeVisible();
  await expect(page.locator('[data-intent-field="emphasisIndex"]')).toBeVisible();
  await expect(page.locator('[data-intent-field="density"]')).toBeVisible();
  await expect(page.locator('[data-intent-field="mediaRatio"]')).toHaveCount(0);
  await expect(page.locator('[data-redesign-template]')).toHaveCount(3);

  const initial=await page.evaluate(id=>{const node=globalThis.MindDeckApp.getProject().children.find(item=>item.id===id);return {hash:node.composer.generatedHash,intent:node.composer.designIntent,template:node.composer.selectedTemplateId}},cardsId);
  await changeNumber(page,'columns',2);
  const drafted=await page.evaluate(id=>{const node=globalThis.MindDeckApp.getProject().children.find(item=>item.id===id);return {hash:node.composer.generatedHash,intent:node.composer.designIntent,template:node.composer.selectedTemplateId}},cardsId);
  expect(drafted.hash).toBe(initial.hash);
  expect(drafted.intent).toEqual(initial.intent);
  expect(drafted.template).toBe(initial.template);
  await expect(page.locator('[data-redesign-template]')).toHaveCount(3);
  await page.locator('[data-redesign-template]').first().click();
  await applySelected(page);

  const columnsState=await page.evaluate(id=>{const node=globalThis.MindDeckApp.getProject().children.find(item=>item.id===id);return {hash:node.composer.generatedHash,intent:node.composer.designIntent,params:node.composer.selectedTemplateParams,resolution:node.composer.intentResolution,dirty:globalThis.MindDeckCore.Composer.Provenance.isDirty(node)}},cardsId);
  expect(columnsState.intent.columns).toBe(2);
  expect(columnsState.params.columns).toBe(2);
  expect(columnsState.resolution.matcher).toBe('Core.Composer.matchTemplates');
  expect(columnsState.resolution.candidateCount).toBeGreaterThan(0);
  expect(columnsState.dirty).toBe(false);

  await page.locator('#slideInspectorBtn').click();
  await page.locator('[data-intent-field="emphasisIndex"]').selectOption('1');
  await page.locator('[data-intent-field="density"]').selectOption('compact');
  await page.locator('[data-redesign-template]').first().click();
  await applySelected(page);
  await expect.poll(()=>page.evaluate(id=>globalThis.MindDeckApp.getProject().children.find(item=>item.id===id)?.composer?.designIntent?.emphasisIndex,cardsId)).toBe(1);
  await expect.poll(()=>page.evaluate(id=>globalThis.MindDeckApp.getProject().children.find(item=>item.id===id)?.deckDensity,cardsId)).toBe('compact');

  await page.waitForTimeout(650);
  await page.reload();
  await dismissWelcome(page);
  const reloadedCards=await page.evaluate(id=>{const node=globalThis.MindDeckApp.getProject().children.find(item=>item.id===id);return {intent:node?.composer?.designIntent,resolution:node?.composer?.intentResolution}},cardsId);
  expect(reloadedCards.intent).toEqual(expect.objectContaining({columns:2,emphasisIndex:1,density:'compact'}));
  expect(reloadedCards.resolution.matcher).toBe('Core.Composer.matchTemplates');

  const imageId='intent-image';
  await page.evaluate(id=>globalThis.MindDeckApp.openEditor('slide',id),imageId);
  await page.locator('#slideInspectorBtn').click();
  await expect(page.locator('[data-intent-field="mediaRatio"]')).toBeVisible();
  await expect(page.locator('[data-intent-field="direction"]')).toBeVisible();
  await changeNumber(page,'mediaRatio',.62);
  await page.locator('[data-intent-field="direction"]').selectOption('right');
  await page.locator('[data-redesign-template]').first().click();
  await applySelected(page);
  const imageState=await page.evaluate(id=>{const node=globalThis.MindDeckApp.getProject().children.find(item=>item.id===id);return {intent:node.composer.designIntent,params:node.composer.selectedTemplateParams,dirty:globalThis.MindDeckCore.Composer.Provenance.isDirty(node)}},imageId);
  expect(imageState.intent.mediaRatio).toBe(.62);
  expect(imageState.intent.direction).toBe('right');
  expect(imageState.params.direction).toBe('right');
  expect(imageState.dirty).toBe(false);

  const editable=page.locator('#editorStage .canvas-el[data-master="0"]').first();
  await editable.click();
  await page.keyboard.press('Shift+ArrowRight');
  await expect.poll(()=>page.evaluate(id=>{const node=globalThis.MindDeckApp.getProject().children.find(item=>item.id===id);return globalThis.MindDeckCore.Composer.Provenance.isDirty(node)},imageId)).toBe(true);
  const dirtyBefore=await page.evaluate(id=>JSON.stringify(globalThis.MindDeckApp.getProject().children.find(item=>item.id===id).slideElements),imageId);
  await page.locator('#slideInspectorBtn').click();
  await changeNumber(page,'mediaRatio',.55);
  await page.locator('[data-redesign-template]').first().click();
  await page.locator('#v99ApplyTemplate').click();
  const protectedState=await page.evaluate(id=>{const node=globalThis.MindDeckApp.getProject().children.find(item=>item.id===id);return {elements:JSON.stringify(node.slideElements),ratio:node.composer.designIntent.mediaRatio,dirty:globalThis.MindDeckCore.Composer.Provenance.isDirty(node)}},imageId);
  expect(protectedState.elements).toBe(dirtyBefore);
  expect(protectedState.ratio).toBe(.62);
  expect(protectedState.dirty).toBe(true);
});
