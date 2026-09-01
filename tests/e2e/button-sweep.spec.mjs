import { Buffer } from 'node:buffer';
import { test, expect } from '@playwright/test';

test.setTimeout(90000);

async function dismissWelcome(page){
  await page.waitForTimeout(320);
  const overlay=page.locator('#welcomeOverlay');
  if(await overlay.isVisible())await page.locator('#welcomeClose').click();
  await expect(overlay).not.toHaveClass(/open/);
}

async function openComposeMode(page,mode,{mobile=false}={}){
  await page.locator(mobile?'#v99SmartMobileBtn':'#v99SmartComposeBtn').click();
  await expect(page.locator('.compose-v10-modebar')).toBeVisible();
  if(mode!=='ai')await page.locator(`[data-compose-mode="${mode}"]`).click();
}

function watchPageErrors(page){
  const errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  return errors;
}

async function closeMapPanel(page,id){
  const close=page.locator(`[data-close-panel="${id}"]`);
  if(await close.isVisible())await close.click();
}

async function downloadFrom(page,locator){
  const control=await locator.getAttribute('id')||await locator.getAttribute('data-mm')||'unknown-control';
  const download=page.waitForEvent('download',{timeout:8000});
  await locator.click();
  let result;
  try{result=await download}catch(err){
    const toast=(await page.locator('#toast').textContent().catch(()=>''))?.trim();
    throw new Error(`${control} did not start a download${toast?` · toast: ${toast}`:''} · ${err.message}`);
  }
  expect(await result.failure()).toBeNull();
}

async function openMobileCommand(page,command){
  await page.locator('#mobileMainMore').click();
  const button=page.locator(`[data-mm="${command}"]`);
  await expect(button).toBeVisible();
  await button.click();
}

async function downloadMobileCommand(page,command){
  await page.locator('#mobileMainMore').click();
  await downloadFrom(page,page.locator(`[data-mm="${command}"]`));
}

function acceptDialog(dialog){
  const promptText=dialog.type()==='prompt'
    ? (dialog.message().includes('视频 URL')?'https://example.com/demo.mp4':dialog.defaultValue())
    : undefined;
  dialog.accept(promptText).catch(()=>{});
}

test('desktop manual-style sweep clicks project, panel, node, editor and presentation controls',async({page},testInfo)=>{
  test.skip(testInfo.project.name.includes('mobile'),'desktop button sweep');
  const pageErrors=watchPageErrors(page);
  page.on('dialog',acceptDialog);

  await page.goto('/');
  await dismissWelcome(page);

  await page.locator('#presentationModeBtn').click();
  await page.locator('#mindmapModeBtn').click();
  await expect(page.locator('body')).toHaveClass(/mindmap-mode/);
  await page.locator('#presentationModeBtn').click();
  await expect(page.locator('body')).not.toHaveClass(/mindmap-mode/);
  await page.locator('#fitBtn').click();
  for(const layout of ['right','left','down','radial','balanced'])await page.locator('#mapLayoutSelect').selectOption(layout);
  await page.locator('#resetLayoutBtn').click();

  await page.locator('#orderBtn').click();
  await expect(page.locator('#orderPanel')).toHaveClass(/open/);
  await page.locator('#defaultOrderBtn').click();
  await page.locator('#saveOrderBtn').click();
  await closeMapPanel(page,'orderPanel');
  await expect(page.locator('#panelRestoreHandle')).toHaveClass(/open/);
  await page.locator('#panelRestoreHandle').click();
  await closeMapPanel(page,'orderPanel');

  await page.locator('#healthCheckBtn').click();
  await page.locator('#runHealthCheckBtn').click();
  await page.locator('#copyHealthReportBtn').click();
  await closeMapPanel(page,'healthPanel');

  await page.locator('#appearanceBtn').click();
  const themes=page.locator('[data-theme-choice]');
  for(let i=0;i<await themes.count();i++)await themes.nth(i).click();
  await closeMapPanel(page,'themePanel');

  await page.locator('#helpBtn').click();
  await page.locator('#welcomeStart').click();
  await page.locator('#helpBtn').click();
  await page.locator('#welcomeMindmap').click();
  await page.locator('#presentationModeBtn').click();
  await page.locator('#helpBtn').click();
  await page.locator('#welcomeClose').click();

  await page.locator('#exportSettingsBtn').click();
  await page.locator('#resetExportSettingsBtn').click();
  await page.locator('#saveExportSettingsBtn').click();

  await downloadFrom(page,page.locator('#exportBtn'));
  await downloadFrom(page,page.locator('#exportViewerBtn'));

  const snapshot=await page.evaluate(()=>globalThis.MindDeckApp.getProject());
  const chooserPromise=page.waitForEvent('filechooser');
  await page.locator('#importBtn').click();
  const chooser=await chooserPromise;
  await chooser.setFiles({name:'button-sweep.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(snapshot))});
  await expect.poll(()=>page.evaluate(()=>globalThis.MindDeckApp.getProject()?.id)).toBe(snapshot.id);

  await page.locator('#healthCheckBtn').click();
  const restoreBackup=page.locator('#restoreBackupBtn');
  if(await restoreBackup.isEnabled())await restoreBackup.click();
  await closeMapPanel(page,'healthPanel');

  await expect(page.locator('#v99DeckSpecBtn')).toHaveCount(0);
  await expect(page.locator('#aiV10ComposeBtn')).toHaveCount(0);
  await openComposeMode(page,'ai');
  await expect(page.locator('#aiV10Source')).toBeVisible();
  await page.locator('[data-compose-mode="local"]').click();
  await expect(page.locator('#v99Outline')).toBeVisible();
  await page.locator('#v99SampleBtn').click();
  const templateCount=await page.evaluate(()=>globalThis.MindDeckCore.Composer.templates.length);
  await expect(page.locator('#v99Preview')).toContainText(`${templateCount} 个结构模板`);
  await page.locator('[data-compose-mode="deckspec"]').click();
  await expect(page.locator('#v99DeckSpecJson')).toBeVisible();
  await page.locator('#v99DeckSpecCancel').click();

  const rootId=await page.evaluate(()=>globalThis.MindDeckApp.getProject().id);
  await page.locator(`.node[data-id="${rootId}"]`).click();
  await expect(page.locator('#nodePanel')).toHaveClass(/open/);
  await page.locator('#saveNodeBtn').click();
  await page.locator('#addChildBtn').click();
  const createdNodeId=await page.evaluate(()=>globalThis.MindDeckApp.getProject().children.at(-1)?.id);
  expect(createdNodeId).toBeTruthy();
  await page.locator('#editSlideBtn').click();
  await expect(page.locator('#editorShell')).toHaveClass(/open/);

  await page.locator('#addTextBtn').click();
  await page.locator('#desktopPropCollapse').click();
  await expect(page.locator('#editorPropRestoreHandle')).toHaveClass(/open/);
  await page.locator('#editorPropRestoreHandle').click();
  await page.locator('#addRectBtn').click();
  await page.locator('#addCircleBtn').click();

  const insertedIds=await page.evaluate(id=>{
    const node=globalThis.MindDeckApp.getProject().children.find(item=>item.id===id);
    return node.slideElements.slice(-3).map(item=>item.id);
  },createdNodeId);
  expect(insertedIds).toHaveLength(3);
  await page.locator(`.canvas-el[data-id="${insertedIds[0]}"]`).click();
  await page.locator(`.canvas-el[data-id="${insertedIds[1]}"]`).click({modifiers:['Shift']});
  await page.locator(`.canvas-el[data-id="${insertedIds[2]}"]`).click({modifiers:['Shift']});
  for(const action of ['left','hcenter','right','top','vcenter','bottom','sameWidth','sameHeight','distributeH','distributeV'])await page.locator(`[data-align="${action}"]`).click();
  await page.locator('#duplicateElBtn').click();
  await page.locator('#layerUpBtn').click();
  await page.locator('#layerDownBtn').click();
  await page.locator('#frontBtn').click();
  await page.locator('#backBtn').click();
  await page.locator('#deleteElBtn').click();

  const imageChooserPromise=page.waitForEvent('filechooser');
  await page.locator('#addImageBtn').click();
  const imageChooser=await imageChooserPromise;
  await imageChooser.setFiles({name:'pixel.png',mimeType:'image/png',buffer:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9ZfC8AAAAASUVORK5CYII=','base64')});
  await expect.poll(()=>page.evaluate(id=>globalThis.MindDeckApp.getProject().children.find(item=>item.id===id)?.slideElements.some(item=>item.type==='image'),createdNodeId)).toBe(true);

  const videoChooserPromise=page.waitForEvent('filechooser');
  await page.locator('#addVideoBtn').click();
  const videoChooser=await videoChooserPromise;
  await videoChooser.setFiles({name:'tiny.mp4',mimeType:'video/mp4',buffer:Buffer.from([0,0,0,20,102,116,121,112,105,115,111,109])});
  await expect.poll(()=>page.evaluate(id=>globalThis.MindDeckApp.getProject().children.find(item=>item.id===id)?.slideElements.some(item=>item.type==='video'),createdNodeId)).toBe(true);
  await page.locator('#addVideoUrlBtn').click();

  await page.locator('#v99PageDesignerBtn').click();
  await expect(page.locator('#v99PageCancel')).toBeVisible();
  await page.locator('#v99PageCancel').click();
  await page.locator('#slideInspectorBtn').click();
  await expect(page.locator('#v10InspectorReset')).toBeVisible();
  await page.locator('#v10InspectorReset').click();
  await expect(page.locator('#v10InspectorTemplates')).toBeVisible();
  await page.locator('#v10InspectorTemplates').click();
  await expect(page.locator('#v99PageCancel')).toBeVisible();
  await page.locator('#v99PageCancel').click();
  await page.locator('#slideInspectorBtn').click();
  await expect(page.locator('.v10-inspector-close')).toBeVisible();
  await page.locator('.v10-inspector-close').click();

  await page.locator('#saveEditorBtn').click();
  await page.locator('#toggleMasterModeBtn').click();
  await expect(page.locator('#masterSettingsBtn')).toBeVisible();
  await page.locator('#masterSettingsBtn').click();
  await page.locator('#addTextBtn').click();
  await page.locator('#saveEditorBtn').click();
  await page.locator('#toggleMasterModeBtn').click();
  await page.locator('#backToMapBtn').click();

  await page.locator(`.node[data-id="${createdNodeId}"]`).click();
  await page.locator('#deleteNodeBtn').click();
  await expect(page.locator(`.node[data-id="${createdNodeId}"]`)).toHaveCount(0);

  await page.locator('#masterBtn').click();
  await expect(page.locator('#editorShell')).toHaveClass(/open/);
  await page.locator('#backToMapBtn').click();

  await page.locator('#presentBtn').click();
  await expect(page.locator('#presentShell')).toHaveClass(/open/);
  await page.locator('#presentTocToggle').click();
  await page.keyboard.press('Escape');
  await expect(page.locator('#presentShell')).not.toHaveClass(/open/);

  expect(pageErrors).toEqual([]);
});

test('mobile manual-style sweep clicks mobile project and editor controls',async({page},testInfo)=>{
  test.skip(!testInfo.project.name.includes('mobile'),'mobile button sweep');
  const pageErrors=watchPageErrors(page);
  page.on('dialog',acceptDialog);

  await page.goto('/');
  await dismissWelcome(page);
  await expect(page.locator('#mobileMainMore')).toBeVisible();

  await page.locator('#mobileMainFit').click();
  await page.locator('#mobileMainAdd').click();
  const firstChildId=await page.evaluate(()=>globalThis.MindDeckApp.getProject().children.at(-1)?.id);
  await expect(page.locator('#mobileNodeContext')).toHaveClass(/open/);
  await page.locator('#mobileNodeDetailBtn').click();
  await expect(page.locator('#nodePanel')).toHaveClass(/open/);
  await closeMapPanel(page,'nodePanel');
  await expect(page.locator('#mobileNodeContext')).toHaveClass(/open/);
  await page.locator('#mobileNodeChildBtn').click();
  const activeNodeId=await page.evaluate(()=>{
    const project=globalThis.MindDeckApp.getProject();
    const walk=node=>node.id===globalThis.MindDeckApp.getSelectedNodeId?.()?node:(node.children||[]).map(walk).find(Boolean);
    return globalThis.MindDeckApp.getSelectedNodeId?.()||project.children.at(-1)?.children?.at(-1)?.id||project.children.at(-1)?.id;
  });
  await page.locator('#mobileNodeContextClose').click();
  await page.locator(`.node[data-id="${activeNodeId||firstChildId}"]`).tap();
  await expect(page.locator('#mobileNodeContext')).toHaveClass(/open/);
  await page.locator('#mobileEditPageBtn').click();
  await expect(page.locator('#editorShell')).toHaveClass(/open/);

  await page.locator('#mobileInsertBtn').click();
  await page.locator('[data-mi="text"]').click();
  await page.locator('#mobileInsertBtn').click();
  await page.locator('[data-mi="rect"]').click();
  const mobileIds=await page.evaluate(id=>{
    const find=node=>node.id===id?node:(node.children||[]).map(find).find(Boolean);
    const node=find(globalThis.MindDeckApp.getProject());
    return node?.slideElements?.slice(-2).map(item=>item.id)||[];
  },activeNodeId||firstChildId);
  expect(mobileIds).toHaveLength(2);

  await page.locator('#mobileMultiBtn').click();
  await page.locator(`.canvas-el[data-id="${mobileIds[0]}"]`).tap();
  await page.locator('#mobileAlignBtn').click();
  await page.locator('[data-ma="left"]').click();
  await page.locator('#mobileMultiBtn').click();
  await page.locator('#editorStageWrap').tap({position:{x:12,y:12}});
  await page.locator(`.canvas-el[data-id="${mobileIds[1]}"]`).tap();
  await page.locator('#mobilePropBtn').click();
  await page.locator('#mobilePropClose').click();

  await page.locator('#mobileLayerBtn').click();
  await page.locator('[data-ml="duplicate"]').click();
  for(const action of ['up','down','front','back']){
    await page.locator('#mobileLayerBtn').click();
    await page.locator(`[data-ml="${action}"]`).click();
  }
  await page.locator('#mobileViewBtn').click();
  await page.locator('#mobileViewBtn').click();
  await page.locator('#saveEditorBtn').click();
  await page.locator('#backToMapBtn').click();

  await page.locator('#mobileMainPage').click();
  await expect(page.locator('#editorShell')).toHaveClass(/open/);
  await page.locator('#backToMapBtn').click();

  await page.locator('#mobileMainMore').click();
  await page.locator('#mobileMapLayoutSelect').selectOption('left');
  await openMobileCommand(page,'reset');
  await downloadMobileCommand(page,'save');
  await downloadMobileCommand(page,'export');

  const mobileSnapshot=await page.evaluate(()=>globalThis.MindDeckApp.getProject());
  await page.locator('#mobileMainMore').click();
  const chooserPromise=page.waitForEvent('filechooser');
  await page.locator('[data-mm="import"]').click();
  const chooser=await chooserPromise;
  await chooser.setFiles({name:'mobile-button-sweep.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(mobileSnapshot))});
  await expect.poll(()=>page.evaluate(()=>globalThis.MindDeckApp.getProject()?.id)).toBe(mobileSnapshot.id);

  await openMobileCommand(page,'appearance');
  const firstTheme=page.locator('[data-theme-choice]').first();
  await firstTheme.click();
  await closeMapPanel(page,'themePanel');
  await openMobileCommand(page,'health');
  await page.locator('#runHealthCheckBtn').click();
  await closeMapPanel(page,'healthPanel');
  await openMobileCommand(page,'order');
  await page.locator('#saveOrderBtn').click();
  await closeMapPanel(page,'orderPanel');
  await openMobileCommand(page,'settings');
  await page.locator('#saveExportSettingsBtn').click();
  await openMobileCommand(page,'help');
  await page.locator('#welcomeClose').click();
  await openMobileCommand(page,'master');
  await expect(page.locator('#editorShell')).toHaveClass(/open/);
  await page.locator('#backToMapBtn').click();

  await page.locator('#mobileMainMore').click();
  await expect(page.locator('#mobileMainSheet')).toHaveClass(/open/);
  await page.locator('#mobileMainSheetClose').click();

  await page.locator('#mobileMainPresent').click();
  await expect(page.locator('#presentShell')).toHaveClass(/open/);
  await page.keyboard.press('Escape');
  await expect(page.locator('#presentShell')).not.toHaveClass(/open/);

  expect(pageErrors).toEqual([]);
});