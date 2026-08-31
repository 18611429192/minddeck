import { test, expect } from '@playwright/test';

test.setTimeout(90000);

async function dismissWelcome(page){
  await page.waitForTimeout(320);
  const overlay=page.locator('#welcomeOverlay');
  if(await overlay.isVisible())await page.locator('#welcomeClose').click();
  await expect(overlay).not.toHaveClass(/open/);
}

function capturePageErrors(page){
  const errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  return errors;
}

async function openRootSlideEditor(page){
  const rootId=await page.evaluate(()=>globalThis.MindDeckApp.getProject().id);
  await page.locator(`.node[data-id="${rootId}"]`).click();
  await expect(page.locator('#nodePanel')).toHaveClass(/open/);
  await page.locator('#editSlideBtn').click();
  await expect(page.locator('#editorShell')).toHaveClass(/open/);
  return rootId;
}

async function assertDesktopWorkspace(page,label){
  await expect(page.locator('#editorShell')).toHaveClass(/editor-inspector-docked/);
  const geometry=await page.evaluate(()=>{
    const rect=id=>{
      const r=document.querySelector(id).getBoundingClientRect();
      return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height};
    };
    const shell=document.querySelector('#editorShell');
    const topbar=document.querySelector('.editor-topbar');
    return {
      stage:rect('#editorStage'),wrap:rect('#editorStageWrap'),panel:rect('#propPanel'),
      back:rect('#backToMapBtn'),save:rect('#saveEditorBtn'),topbar:rect('.editor-topbar'),
      logical:{width:document.querySelector('#editorStage').style.width,height:document.querySelector('#editorStage').style.height},
      viewport:{width:innerWidth,height:innerHeight},
      bodyOverflow:document.documentElement.scrollWidth>innerWidth+1 || document.body.scrollWidth>innerWidth+1,
      topbarScrolls:topbar.scrollWidth>topbar.clientWidth+1,
      shellOverflow:shell.scrollWidth>shell.clientWidth+2
    };
  });

  expect(geometry.logical,`${label}: logical slide must remain fixed`).toEqual({width:'1600px',height:'900px'});
  expect(geometry.panel.left,`${label}: inspector must start after usable stage wrap`).toBeGreaterThanOrEqual(geometry.wrap.right-1.5);
  expect(geometry.stage.right,`${label}: stage must not hide behind inspector`).toBeLessThanOrEqual(geometry.panel.left+1.5);
  expect(geometry.stage.left,`${label}: stage left must stay in viewport`).toBeGreaterThanOrEqual(geometry.wrap.left-1.5);
  expect(geometry.stage.top,`${label}: stage top must stay in workspace`).toBeGreaterThanOrEqual(geometry.wrap.top-1.5);
  expect(geometry.stage.bottom,`${label}: stage bottom must stay in workspace`).toBeLessThanOrEqual(geometry.wrap.bottom+1.5);
  expect(geometry.panel.right,`${label}: inspector must end at viewport edge`).toBeLessThanOrEqual(geometry.viewport.width+1.5);
  expect(geometry.back.left,`${label}: back control must stay visible`).toBeGreaterThanOrEqual(0);
  expect(geometry.save.right,`${label}: save control must stay visible`).toBeLessThanOrEqual(geometry.viewport.width+1);
  expect(geometry.topbar.height,`${label}: ribbon height must be deterministic`).toBeLessThanOrEqual(100);
  expect(geometry.bodyOverflow,`${label}: document must not gain horizontal overflow`).toBe(false);
  expect(geometry.shellOverflow,`${label}: editor shell must contain ribbon scrolling internally`).toBe(false);
}

test('desktop editor docks inspector and refits at 1920, 1366 and 1024 widths',async({page},testInfo)=>{
  test.skip(testInfo.project.name.includes('mobile'),'desktop responsive workspace');
  const errors=capturePageErrors(page);
  await page.setViewportSize({width:1920,height:1080});
  await page.goto('/');
  await dismissWelcome(page);
  await openRootSlideEditor(page);

  await page.locator('#addTextBtn').click();
  await expect(page.locator('.canvas-el.el-text').last()).toBeVisible();
  await expect(page.locator('#propPanel')).toHaveClass(/open/);
  await expect(page.locator('#editorShell')).toHaveClass(/editor-inspector-docked/);
  await page.waitForTimeout(80);
  await assertDesktopWorkspace(page,'1920x1080');

  for(const viewport of [{width:1366,height:768},{width:1024,height:768}]){
    await page.setViewportSize(viewport);
    await page.waitForTimeout(120);
    await assertDesktopWorkspace(page,`${viewport.width}x${viewport.height}`);
  }

  const dockedWidth=await page.locator('#editorStage').evaluate(el=>el.getBoundingClientRect().width);
  await page.locator('#desktopPropCollapse').click();
  await expect(page.locator('#propPanel')).toHaveClass(/panel-collapsed/);
  await expect(page.locator('#editorShell')).not.toHaveClass(/editor-inspector-docked/);
  await expect(page.locator('#editorPropRestoreHandle')).toHaveClass(/open/);
  await expect.poll(async()=>page.locator('#editorStage').evaluate(el=>el.getBoundingClientRect().width)).toBeGreaterThan(dockedWidth+30);

  await page.locator('#editorPropRestoreHandle').click();
  await expect(page.locator('#propPanel')).toHaveClass(/open/);
  await expect(page.locator('#editorShell')).toHaveClass(/editor-inspector-docked/);
  await page.waitForTimeout(80);
  await assertDesktopWorkspace(page,'1024x768 restored inspector');
  expect(errors).toEqual([]);
});

test('mobile editor keeps dedicated compact controls and fixed logical page',async({page},testInfo)=>{
  test.skip(!testInfo.project.name.includes('mobile'),'mobile responsive workspace');
  const errors=capturePageErrors(page);
  await page.goto('/');
  await dismissWelcome(page);
  const rootId=await page.evaluate(()=>globalThis.MindDeckApp.getProject().id);
  await page.locator(`.node[data-id="${rootId}"]`).tap();
  await expect(page.locator('#mobileNodeContext')).toHaveClass(/open/);
  await page.locator('#mobileEditPageBtn').click();
  await expect(page.locator('#editorShell')).toHaveClass(/open/);
  await expect(page.locator('#mobileEditorBar')).toBeVisible();
  await expect(page.locator('.element-toolbar')).not.toBeVisible();
  await expect(page.locator('.align-btns')).not.toBeVisible();

  const geometry=await page.evaluate(()=>{
    const stage=document.querySelector('#editorStage').getBoundingClientRect();
    const wrap=document.querySelector('#editorStageWrap').getBoundingClientRect();
    const top=document.querySelector('.editor-topbar').getBoundingClientRect();
    return {
      logical:{width:document.querySelector('#editorStage').style.width,height:document.querySelector('#editorStage').style.height},
      stage:{left:stage.left,right:stage.right,top:stage.top,bottom:stage.bottom},
      wrap:{left:wrap.left,right:wrap.right,top:wrap.top,bottom:wrap.bottom},
      topHeight:top.height,
      bodyOverflow:document.documentElement.scrollWidth>innerWidth+1 || document.body.scrollWidth>innerWidth+1
    };
  });
  expect(geometry.logical).toEqual({width:'1600px',height:'900px'});
  expect(geometry.topHeight).toBeLessThanOrEqual(50);
  expect(geometry.stage.left).toBeGreaterThanOrEqual(geometry.wrap.left-2);
  expect(geometry.stage.right).toBeLessThanOrEqual(geometry.wrap.right+2);
  expect(geometry.stage.top).toBeGreaterThanOrEqual(geometry.wrap.top-2);
  expect(geometry.stage.bottom).toBeLessThanOrEqual(geometry.wrap.bottom+2);
  expect(geometry.bodyOverflow).toBe(false);
  expect(errors).toEqual([]);
});
