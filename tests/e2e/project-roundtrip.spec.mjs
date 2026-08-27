import { test, expect } from '@playwright/test';

async function dismissWelcome(page){
  await page.waitForTimeout(320);
  const overlay=page.locator('#welcomeOverlay');
  if(await overlay.isVisible())await page.locator('#welcomeClose').click();
}

async function generateHealthyDeck(page){
  page.on('dialog',dialog=>dialog.accept());
  await page.locator('#v99DeckSpecBtn').click();
  await page.locator('#v99DeckSpecFile').setInputFiles('examples/deck-spec-v1.json');
  await expect(page.locator('#v99DeckSpecStatus')).toContainText('deck-spec-v1.json');
  await page.locator('#v99DeckSpecGenerate').click();
  await expect(page.locator('.v99-smart-overlay')).toHaveCount(0);
  await expect.poll(()=>page.evaluate(()=>globalThis.MindDeckCore.Composer.Quality.validateProject(globalThis.MindDeckApp.getProject()).ok)).toBe(true);
}

async function captureMinddeckExport(page){
  await page.evaluate(()=>{
    globalThis.__minddeckCapturedDownloads=[];
    HTMLAnchorElement.prototype.click=function(){
      globalThis.__minddeckCapturedDownloads.push({name:this.download,href:this.href});
    };
    localStorage.setItem('minddeck-v8-export-settings',JSON.stringify({fusionMode:'separate',packageMode:'always',imageLimitMB:1,videoLimitMB:3,totalLimitMB:15}));
  });
  await page.locator('#exportViewerBtn').click();
  await expect.poll(()=>page.evaluate(()=>globalThis.__minddeckCapturedDownloads.map(item=>item.name))).toContainEqual(expect.stringMatching(/\.minddeck$/));
  const bytes=await page.evaluate(async()=>{
    const item=globalThis.__minddeckCapturedDownloads.find(entry=>entry.name.endsWith('.minddeck'));
    if(!item)throw new Error('minddeck export blob missing');
    const response=await fetch(item.href),buffer=await response.arrayBuffer();
    return Array.from(new Uint8Array(buffer));
  });
  expect(bytes.length).toBeGreaterThan(100);
  return Buffer.from(bytes);
}

test('project JSON and .minddeck roundtrip preserve the native Project',async({page},testInfo)=>{
  test.skip(testInfo.project.name.includes('mobile'),'project file commands live in the desktop project toolbar');
  await page.goto('/');
  await dismissWelcome(page);
  await generateHealthyDeck(page);

  const original=await page.evaluate(()=>{
    const project=globalThis.MindDeckApp.getProject();
    return {title:project.title,order:[...(project.presentationOrder||[])],childCount:project.children.length};
  });

  const jsonDownloadPromise=page.waitForEvent('download');
  await page.locator('#exportBtn').click();
  const jsonDownload=await jsonDownloadPromise;
  expect(jsonDownload.suggestedFilename()).toMatch(/\.json$/);
  const jsonPath=await jsonDownload.path();
  expect(jsonPath).toBeTruthy();

  await page.evaluate(()=>{const project=globalThis.MindDeckApp.getProject();project.title='ROUNDTRIP-MUTATED';project.presentationOrder=[]});
  await page.locator('#importFile').setInputFiles(jsonPath);
  await expect.poll(()=>page.evaluate(()=>globalThis.MindDeckApp.getProject().title)).toBe(original.title);
  expect(await page.evaluate(()=>globalThis.MindDeckApp.getProject().presentationOrder)).toEqual(original.order);

  const packageBuffer=await captureMinddeckExport(page);
  await page.evaluate(()=>{const project=globalThis.MindDeckApp.getProject();project.title='PACKAGE-MUTATED';project.children=[];project.presentationOrder=[]});
  await page.locator('#importFile').setInputFiles({name:'v99-roundtrip.minddeck',mimeType:'application/zip',buffer:packageBuffer});
  await expect.poll(()=>page.evaluate(()=>globalThis.MindDeckApp.getProject().title)).toBe(original.title);
  const restored=await page.evaluate(()=>({order:globalThis.MindDeckApp.getProject().presentationOrder,childCount:globalThis.MindDeckApp.getProject().children.length,quality:globalThis.MindDeckCore.Composer.Quality.validateProject(globalThis.MindDeckApp.getProject()).ok}));
  expect(restored.order).toEqual(original.order);
  expect(restored.childCount).toBe(original.childCount);
  expect(restored.quality).toBe(true);
});
