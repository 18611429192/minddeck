import { test, expect } from '@playwright/test';

async function dismissWelcome(page){
  await page.waitForTimeout(320);
  const overlay=page.locator('#welcomeOverlay');
  if(await overlay.isVisible())await page.locator('#welcomeClose').click();
}

test('project JSON and .minddeck roundtrip preserve the native Project',async({page},testInfo)=>{
  test.skip(testInfo.project.name.includes('mobile'),'project file commands live in the desktop project toolbar');
  await page.goto('/');
  await dismissWelcome(page);

  const original=await page.evaluate(()=>{
    const project=globalThis.MindDeckApp.getProject();
    return {title:project.title,order:[...(project.presentationOrder||[])],json:JSON.stringify(project)};
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

  await page.evaluate(()=>localStorage.setItem('minddeck-v8-export-settings',JSON.stringify({fusionMode:'separate',packageMode:'always',imageLimitMB:1,videoLimitMB:3,totalLimitMB:15})));
  page.once('dialog',dialog=>dialog.accept('v99-roundtrip'));
  const downloads=[];
  const listener=download=>downloads.push(download);
  page.on('download',listener);
  await page.locator('#exportViewerBtn').click();
  await expect.poll(()=>downloads.length).toBeGreaterThanOrEqual(2);
  page.off('download',listener);
  const packageDownload=downloads.find(download=>download.suggestedFilename().endsWith('.minddeck'));
  expect(packageDownload).toBeTruthy();
  const packagePath=await packageDownload.path();
  expect(packagePath).toBeTruthy();

  await page.evaluate(()=>{const project=globalThis.MindDeckApp.getProject();project.title='PACKAGE-MUTATED';project.children=[];project.presentationOrder=[]});
  await page.locator('#importFile').setInputFiles(packagePath);
  await expect.poll(()=>page.evaluate(()=>globalThis.MindDeckApp.getProject().title)).toBe(original.title);
  const restored=await page.evaluate(()=>({json:JSON.stringify(globalThis.MindDeckApp.getProject()),order:globalThis.MindDeckApp.getProject().presentationOrder,quality:globalThis.MindDeckCore.Diagnostics.inspect(globalThis.MindDeckApp.getProject()).fail===0}));
  expect(restored.order).toEqual(original.order);
  expect(restored.quality).toBe(true);
});
