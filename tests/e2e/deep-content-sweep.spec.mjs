import { Buffer } from 'node:buffer';
import { readFile } from 'node:fs/promises';
import { test, expect } from '@playwright/test';

test.setTimeout(120000);

const PNG_1PX=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9ZfC8AAAAASUVORK5CYII=','base64');
const TINY_MP4=Buffer.from([0,0,0,20,102,116,121,112,105,115,111,109,0,0,0,0,105,115,111,109]);

async function dismissWelcome(page){
  await page.waitForTimeout(320);
  const overlay=page.locator('#welcomeOverlay');
  if(await overlay.isVisible())await page.locator('#welcomeClose').click();
  await expect(overlay).not.toHaveClass(/open/);
}

function watchPageErrors(page){
  const errors=[];
  page.on('pageerror',err=>errors.push(err.message));
  return errors;
}

function acceptDialogs(page){
  page.on('dialog',dialog=>{
    if(dialog.type()==='prompt')dialog.accept('https://example.com/deep-test.mp4').catch(()=>{});
    else dialog.accept().catch(()=>{});
  });
}

async function project(page){return page.evaluate(()=>globalThis.MindDeckApp.getProject())}

async function nodeData(page,id){
  return page.evaluate(nodeId=>{
    const walk=node=>node.id===nodeId?node:(node.children||[]).map(walk).find(Boolean);
    return walk(globalThis.MindDeckApp.getProject());
  },id);
}

async function editNode(page,id,title,text){
  await page.locator(`.node[data-id="${id}"]`).click();
  await expect(page.locator('#nodePanel')).toHaveClass(/open/);
  await page.locator('#nodeTitle').fill(title);
  await page.locator('#nodeText').fill(text);
  await page.locator('#saveNodeBtn').click();
  await expect.poll(async()=>({title:(await nodeData(page,id)).title,text:(await nodeData(page,id)).text})).toEqual({title,text});
}

async function addChild(page,parentId){
  await page.locator(`.node[data-id="${parentId}"]`).click();
  const before=await page.evaluate(id=>{
    const walk=node=>node.id===id?node:(node.children||[]).map(walk).find(Boolean);
    return (walk(globalThis.MindDeckApp.getProject())?.children||[]).length;
  },parentId);
  await page.locator('#addChildBtn').click();
  await expect.poll(async()=>page.evaluate(id=>{
    const walk=node=>node.id===id?node:(node.children||[]).map(walk).find(Boolean);
    return (walk(globalThis.MindDeckApp.getProject())?.children||[]).length;
  },parentId)).toBe(before+1);
  return page.evaluate(id=>{
    const walk=node=>node.id===id?node:(node.children||[]).map(walk).find(Boolean);
    return walk(globalThis.MindDeckApp.getProject()).children.at(-1).id;
  },parentId);
}

async function lastSlideElement(page,nodeId){
  return page.evaluate(id=>{
    const walk=node=>node.id===id?node:(node.children||[]).map(walk).find(Boolean);
    return structuredClone(walk(globalThis.MindDeckApp.getProject()).slideElements.at(-1));
  },nodeId);
}

async function slideElement(page,nodeId,elementId){
  return page.evaluate(({nodeId,elementId})=>{
    const walk=node=>node.id===nodeId?node:(node.children||[]).map(walk).find(Boolean);
    return structuredClone(walk(globalThis.MindDeckApp.getProject()).slideElements.find(el=>el.id===elementId));
  },{nodeId,elementId});
}

async function slideCount(page,nodeId){
  return page.evaluate(id=>{
    const walk=node=>node.id===id?node:(node.children||[]).map(walk).find(Boolean);
    return walk(globalThis.MindDeckApp.getProject()).slideElements.length;
  },nodeId);
}

async function selectElement(page,id,modifiers=[]){
  await page.locator(`.canvas-el[data-id="${id}"]`).click({modifiers});
}

async function setProp(page,key,value){
  const control=page.locator(`[data-p="${key}"]`);
  await expect(control).toBeVisible();
  const tag=await control.evaluate(el=>el.tagName);
  if(tag==='SELECT')await control.selectOption(String(value));
  else await control.fill(String(value));
  await control.blur();
}

async function downloadByClick(page,selector){
  const pending=page.waitForEvent('download',{timeout:10000});
  await page.locator(selector).click();
  const download=await pending;
  expect(await download.failure()).toBeNull();
  return download;
}

test('desktop deep sweep creates real content, edits geometry/media, roundtrips and presents',async({page},testInfo)=>{
  test.skip(testInfo.project.name.includes('mobile'),'desktop deep browser sweep');
  const pageErrors=watchPageErrors(page);
  acceptDialogs(page);

  await page.goto('/');
  await dismissWelcome(page);

  const rootId=await page.evaluate(()=>globalThis.MindDeckApp.getProject().id);
  await editNode(page,rootId,'深度测试演示','模拟人工操作：结构、页面、媒体、母版、演示、导入导出。');

  const statusId=await addChild(page,rootId);
  await editNode(page,statusId,'业务现状','当前流程依赖人工整理，信息分散，现场反馈进入研发较慢。');

  const problemId=await addChild(page,statusId);
  await editNode(page,problemId,'关键问题','需求理解偏差、反馈链路长、页面表达不统一。');

  const solutionId=await addChild(page,rootId);
  await editNode(page,solutionId,'解决方案','现场理解业务，再通过结构化页面和可编辑元素表达。');

  const resultId=await addChild(page,rootId);
  await editNode(page,resultId,'预期结果','减少返工，提高交付质量，让演示内容可持续维护。');

  // Real fold/unfold changes visible graph contents.
  await page.locator(`.node[data-id="${statusId}"] .fold`).click();
  await expect(page.locator(`.node[data-id="${problemId}"]`)).toHaveCount(0);
  await page.locator(`.node[data-id="${statusId}"] .fold`).click();
  await expect(page.locator(`.node[data-id="${problemId}"]`)).toBeVisible();

  // Reorder actual presentation sequence and verify the new nodes keep the user-set relative order.
  await page.locator('#orderBtn').click();
  await expect(page.locator('#orderPanel')).toHaveClass(/open/);
  await page.locator(`[data-order-id="${solutionId}"]`).fill('1');
  await page.locator(`[data-order-id="${statusId}"]`).fill('2');
  await page.locator(`[data-order-id="${problemId}"]`).fill('3');
  await page.locator(`[data-order-id="${resultId}"]`).fill('4');
  await page.locator('#saveOrderBtn').click();
  await expect.poll(async()=>{
    const p=await project(page);
    const pos=[solutionId,statusId,problemId,resultId].map(id=>p.presentationOrder.indexOf(id));
    return pos.every(i=>i>0)&&pos.every((v,i)=>i===0||pos[i-1]<v);
  }).toBe(true);
  const orderClose=page.locator('[data-close-panel="orderPanel"]');
  if(await orderClose.isVisible())await orderClose.click();

  // Open a real slide and create/edit every main element type.
  await page.locator(`.node[data-id="${statusId}"]`).click();
  await page.locator('#editSlideBtn').click();
  await expect(page.locator('#editorShell')).toHaveClass(/open/);

  await page.locator('#addTextBtn').click();
  const textEl=await lastSlideElement(page,statusId);
  expect(textEl.type).toBe('text');
  await setProp(page,'text','现场问题：反馈链路过长');
  await setProp(page,'x',120);
  await setProp(page,'y',120);
  await setProp(page,'w',520);
  await setProp(page,'h',150);
  await setProp(page,'fontSize',46);
  await setProp(page,'fontWeight',700);
  await setProp(page,'color','#123456');
  await setProp(page,'textAlign','center');
  const animSelect=page.locator('[data-p="animType"]');
  const animValues=await animSelect.locator('option').evaluateAll(opts=>opts.map(o=>o.value));
  if(animValues.length>1)await animSelect.selectOption(animValues[1]);
  await setProp(page,'animDelay',0.2);
  await setProp(page,'animDuration',0.8);
  await expect.poll(async()=>{
    const el=await slideElement(page,statusId,textEl.id);
    return {text:el.text,x:el.x,y:el.y,w:el.w,h:el.h,fontSize:el.fontSize,fontWeight:el.fontWeight,color:el.color,textAlign:el.textAlign};
  }).toEqual({text:'现场问题：反馈链路过长',x:120,y:120,w:520,h:150,fontSize:46,fontWeight:700,color:'#123456',textAlign:'center'});

  // Inline text editing exercises the contenteditable path, not only the property form.
  const textDom=page.locator(`.canvas-el[data-id="${textEl.id}"]`);
  await textDom.dblclick();
  const editable=textDom.locator('.text-content');
  await expect(editable).toHaveAttribute('contenteditable','true');
  await editable.press('Control+A');
  await editable.fill('现场问题：中文直接编辑也要稳定');
  await page.locator('#editorTitle').click();
  await expect.poll(async()=>(await slideElement(page,statusId,textEl.id)).text).toBe('现场问题：中文直接编辑也要稳定');

  // Real drag and resize must change model geometry.
  await selectElement(page,textEl.id);
  const beforeDrag=await slideElement(page,statusId,textEl.id);
  const box=await textDom.boundingBox();
  expect(box).toBeTruthy();
  await page.mouse.move(box.x+box.width/2,box.y+box.height/2);
  await page.mouse.down();
  await page.mouse.move(box.x+box.width/2+60,box.y+box.height/2+36,{steps:5});
  await page.mouse.up();
  const afterDrag=await slideElement(page,statusId,textEl.id);
  expect(afterDrag.x).not.toBe(beforeDrag.x);
  expect(afterDrag.y).not.toBe(beforeDrag.y);
  const beforeResize=await slideElement(page,statusId,textEl.id);
  const handle=page.locator(`.canvas-el[data-id="${textEl.id}"] .resize-handle.se`);
  const hb=await handle.boundingBox();
  expect(hb).toBeTruthy();
  await page.mouse.move(hb.x+hb.width/2,hb.y+hb.height/2);
  await page.mouse.down();
  await page.mouse.move(hb.x+hb.width/2+70,hb.y+hb.height/2+45,{steps:5});
  await page.mouse.up();
  const afterResize=await slideElement(page,statusId,textEl.id);
  expect(afterResize.w).toBeGreaterThan(beforeResize.w);
  expect(afterResize.h).toBeGreaterThan(beforeResize.h);

  await page.locator('#addRectBtn').click();
  const rectEl=await lastSlideElement(page,statusId);
  expect(rectEl.shape).toBe('rect');
  await setProp(page,'fill','#88ccff');
  await setProp(page,'borderColor','#224466');
  await setProp(page,'borderWidth',5);
  await setProp(page,'x',760);
  await setProp(page,'y',180);
  await setProp(page,'w',360);
  await setProp(page,'h',220);

  await page.locator('#addCircleBtn').click();
  const circleEl=await lastSlideElement(page,statusId);
  expect(circleEl.shape).toBe('circle');
  await setProp(page,'fill','#ffeeaa');
  await setProp(page,'borderWidth',3);
  await setProp(page,'x',1180);
  await setProp(page,'y',210);
  await setProp(page,'w',220);
  await setProp(page,'h',220);

  const imageChooserPromise=page.waitForEvent('filechooser');
  await page.locator('#addImageBtn').click();
  const imageChooser=await imageChooserPromise;
  await imageChooser.setFiles({name:'deep.png',mimeType:'image/png',buffer:PNG_1PX});
  await expect.poll(async()=>{
    const n=await nodeData(page,statusId);return n.slideElements.some(el=>el.type==='image');
  }).toBe(true);
  const imageEl=await lastSlideElement(page,statusId);
  expect(imageEl.type).toBe('image');
  await setProp(page,'fit','cover');
  await expect.poll(async()=>(await slideElement(page,statusId,imageEl.id)).fit).toBe('cover');

  const videoChooserPromise=page.waitForEvent('filechooser');
  await page.locator('#addVideoBtn').click();
  const videoChooser=await videoChooserPromise;
  await videoChooser.setFiles({name:'deep.mp4',mimeType:'video/mp4',buffer:TINY_MP4});
  await expect.poll(async()=>{
    const n=await nodeData(page,statusId);return n.slideElements.filter(el=>el.type==='video').length;
  }).toBe(1);
  const localVideo=await lastSlideElement(page,statusId);
  expect(localVideo.src.startsWith('data:video/mp4')).toBe(true);
  await setProp(page,'fit','cover');
  await setProp(page,'controls','false');
  await setProp(page,'autoplay','true');
  await setProp(page,'muted','true');
  await setProp(page,'loop','true');
  await expect.poll(async()=>{
    const v=await slideElement(page,statusId,localVideo.id);
    return {fit:v.fit,controls:v.controls,autoplay:v.autoplay,muted:v.muted,loop:v.loop};
  }).toEqual({fit:'cover',controls:false,autoplay:true,muted:true,loop:true});

  await page.locator('#addVideoUrlBtn').click();
  await expect.poll(async()=>{
    const n=await nodeData(page,statusId);return n.slideElements.filter(el=>el.type==='video').length;
  }).toBe(2);
  const urlVideo=await lastSlideElement(page,statusId);
  expect(urlVideo.src).toBe('https://example.com/deep-test.mp4');

  // Multi-selection alignment must modify all selected model elements, not only visual outlines.
  await selectElement(page,textEl.id);
  await selectElement(page,rectEl.id,['Shift']);
  await selectElement(page,circleEl.id,['Shift']);
  const preAlign=await Promise.all([textEl.id,rectEl.id,circleEl.id].map(id=>slideElement(page,statusId,id)));
  await page.locator('[data-align="left"]').click();
  const aligned=await Promise.all([textEl.id,rectEl.id,circleEl.id].map(id=>slideElement(page,statusId,id)));
  expect(new Set(aligned.map(el=>el.x)).size).toBe(1);
  await page.locator('[data-align="sameWidth"]').click();
  const sameWidth=await Promise.all([textEl.id,rectEl.id,circleEl.id].map(id=>slideElement(page,statusId,id)));
  expect(new Set(sameWidth.map(el=>el.w)).size).toBe(1);
  await page.locator('[data-align="distributeV"]').click();
  const distributed=await Promise.all([textEl.id,rectEl.id,circleEl.id].map(id=>slideElement(page,statusId,id)));
  distributed.forEach(el=>{expect(Number.isFinite(el.x)).toBe(true);expect(Number.isFinite(el.y)).toBe(true)});

  // Restore the original layout through the real multi-level undo stack before targeted clicks.
  await page.keyboard.press('Control+z');
  await page.keyboard.press('Control+z');
  await page.keyboard.press('Control+z');
  await expect.poll(async()=>{
    const restored=await Promise.all([textEl.id,rectEl.id,circleEl.id].map(id=>slideElement(page,statusId,id)));
    return restored.map(el=>({x:el.x,y:el.y,w:el.w,h:el.h}));
  }).toEqual(preAlign.map(el=>({x:el.x,y:el.y,w:el.w,h:el.h})));

  // Duplicate, z-order, clipboard, keyboard nudge and undo/redo.
  await selectElement(page,rectEl.id);
  const beforeDuplicate=await slideCount(page,statusId);
  await page.locator('#duplicateElBtn').click();
  await expect.poll(()=>slideCount(page,statusId)).toBe(beforeDuplicate+1);
  const duplicate=await lastSlideElement(page,statusId);
  await page.locator('#frontBtn').click();
  let currentNode=await nodeData(page,statusId);
  expect((await slideElement(page,statusId,duplicate.id)).z).toBe(Math.max(...currentNode.slideElements.map(el=>el.z)));
  await page.locator('#backBtn').click();
  currentNode=await nodeData(page,statusId);
  expect((await slideElement(page,statusId,duplicate.id)).z).toBe(Math.min(...currentNode.slideElements.map(el=>el.z)));

  await selectElement(page,textEl.id);
  const nudgeBefore=await slideElement(page,statusId,textEl.id);
  await page.keyboard.press('Shift+ArrowRight');
  await expect.poll(async()=>(await slideElement(page,statusId,textEl.id)).x).toBe(nudgeBefore.x+10);
  await page.keyboard.press('Control+z');
  await expect.poll(async()=>(await slideElement(page,statusId,textEl.id)).x).toBe(nudgeBefore.x);
  await page.keyboard.press('Control+Shift+z');
  await expect.poll(async()=>(await slideElement(page,statusId,textEl.id)).x).toBe(nudgeBefore.x+10);

  // Undo/redo restores the project snapshot and intentionally clears selection, so a real
  // clipboard workflow must reselect the element before copying it.
  await selectElement(page,textEl.id);
  const clipBefore=await slideCount(page,statusId);
  await page.keyboard.press('Control+c');
  await page.keyboard.press('Control+v');
  await expect.poll(()=>slideCount(page,statusId)).toBe(clipBefore+1);
  await page.keyboard.press('Delete');
  await expect.poll(()=>slideCount(page,statusId)).toBe(clipBefore);
  await page.keyboard.press('Control+z');
  await expect.poll(()=>slideCount(page,statusId)).toBe(clipBefore+1);

  // Master editing: background, image, TOC policy and a real master element.
  await page.locator('#toggleMasterModeBtn').click();
  await expect(page.locator('#masterSettingsBtn')).toBeVisible();
  await page.locator('#masterSettingsBtn').click();
  await page.locator('#masterBgColor').fill('#102030');
  await page.locator('#masterBgFit').selectOption('contain');
  await page.locator('#masterTocVisibility').selectOption('show');
  await page.locator('#masterTocSide').selectOption('right');
  await page.locator('#masterBgFile').setInputFiles({name:'master.png',mimeType:'image/png',buffer:PNG_1PX});
  await expect.poll(async()=>{
    const p=await project(page);return !!p.master.bgImage;
  }).toBe(true);
  await page.locator('#addTextBtn').click();
  const masterTextId=await page.evaluate(()=>globalThis.MindDeckApp.getProject().master.elements.at(-1).id);
  await setProp(page,'text','统一母版标题');
  await setProp(page,'fontSize',24);
  await page.locator('#saveEditorBtn').click();
  const master=await page.evaluate(()=>structuredClone(globalThis.MindDeckApp.getProject().master));
  expect(master.bgColor).toBe('#102030');
  expect(master.bgFit).toBe('contain');
  expect(master.tocVisibility).toBe('show');
  expect(master.tocSide).toBe('right');
  expect(master.elements.find(el=>el.id===masterTextId)?.text).toBe('统一母版标题');
  await page.locator('#toggleMasterModeBtn').click();
  await page.locator('#saveEditorBtn').click();
  await page.locator('#backToMapBtn').click();

  // Export settings must survive close/reopen.
  await page.locator('#exportSettingsBtn').click();
  await page.locator('#exportFusionMode').selectOption('fusion');
  await page.locator('#exportPackageMode').selectOption('htmlOnly');
  await page.locator('#exportImageLimit').fill('2.5');
  await page.locator('#exportVideoLimit').fill('4.5');
  await page.locator('#exportTotalLimit').fill('20');
  await page.locator('#saveExportSettingsBtn').click();
  await page.locator('#exportSettingsBtn').click();
  await expect(page.locator('#exportFusionMode')).toHaveValue('fusion');
  await expect(page.locator('#exportPackageMode')).toHaveValue('htmlOnly');
  await expect(page.locator('#exportImageLimit')).toHaveValue('2.5');
  await page.locator('[data-close-panel="exportSettingsPanel"]').click();

  // Save a real project, mutate it, then import the downloaded bytes and verify restoration.
  const savedDownload=await downloadByClick(page,'#exportBtn');
  const savedPath=await savedDownload.path();
  expect(savedPath).toBeTruthy();
  const savedBytes=await readFile(savedPath);
  const savedJson=JSON.parse(savedBytes.toString('utf8'));
  expect(savedJson.title).toBe('深度测试演示');
  expect(savedJson.children.length).toBeGreaterThanOrEqual(3);

  await editNode(page,rootId,'临时覆盖标题','这段内容应被导入操作恢复。');
  const chooserPromise=page.waitForEvent('filechooser');
  await page.locator('#importBtn').click();
  const chooser=await chooserPromise;
  await chooser.setFiles({name:'deep-roundtrip.json',mimeType:'application/json',buffer:savedBytes});
  await expect.poll(async()=>(await project(page)).title).toBe('深度测试演示');
  await expect.poll(async()=>((await nodeData(page,statusId))?.slideElements||[]).length).toBeGreaterThanOrEqual(7);

  // Browser persistence: reload without importing again and require the same real project to return.
  await page.reload();
  await dismissWelcome(page);
  await expect.poll(async()=>(await project(page)).title).toBe('深度测试演示');
  await expect(page.locator(`.node[data-id="${statusId}"]`)).toBeVisible();

  // Health check on the populated project and real HTML export.
  await page.locator('#healthCheckBtn').click();
  await page.locator('#runHealthCheckBtn').click();
  await expect(page.locator('#healthScore')).not.toHaveText('—');
  const healthClose=page.locator('[data-close-panel="healthPanel"]');
  if(await healthClose.isVisible())await healthClose.click();
  await downloadByClick(page,'#exportViewerBtn');

  // Present the actual created deck, verify TOC contents, side, hide/show and keyboard navigation.
  await page.locator('#presentBtn').click();
  await expect(page.locator('#presentShell')).toHaveClass(/open/);
  await expect(page.locator('#presentLayout')).toHaveClass(/toc-right/);
  await expect(page.locator('#tocTree')).toContainText('解决方案');
  await expect(page.locator('#tocTree')).toContainText('业务现状');
  await page.locator('#presentTocToggle').click();
  await expect(page.locator('#presentLayout')).toHaveClass(/toc-hidden/);
  await page.locator('#presentTocToggle').click();
  await expect(page.locator('#presentLayout')).not.toHaveClass(/toc-hidden/);
  const activeBefore=await page.locator('.toc-item.active').getAttribute('data-id');
  await page.keyboard.press('ArrowRight');
  await expect.poll(async()=>page.locator('.toc-item.active').getAttribute('data-id')).not.toBe(activeBefore);
  await page.keyboard.press('Escape');
  await expect(page.locator('#presentShell')).not.toHaveClass(/open/);

  // Real node deletion and global undo/redo after leaving presentation.
  await page.locator(`.node[data-id="${resultId}"]`).click();
  await page.locator('#deleteNodeBtn').click();
  await expect(page.locator(`.node[data-id="${resultId}"]`)).toHaveCount(0);
  await page.keyboard.press('Control+z');
  await expect(page.locator(`.node[data-id="${resultId}"]`)).toBeVisible();
  await page.keyboard.press('Control+Shift+z');
  await expect(page.locator(`.node[data-id="${resultId}"]`)).toHaveCount(0);
  await page.keyboard.press('Control+z');
  await expect(page.locator(`.node[data-id="${resultId}"]`)).toBeVisible();

  expect(pageErrors).toEqual([]);
});
