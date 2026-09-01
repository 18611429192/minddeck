import { Buffer } from 'node:buffer';
import { readFile } from 'node:fs/promises';
import { test, expect } from '@playwright/test';

test.setTimeout(150000);
const PNG=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9ZfC8AAAAASUVORK5CYII=','base64');
const MP4=Buffer.from([0,0,0,20,102,116,121,112,105,115,111,109,0,0,0,0,105,115,111,109]);

async function dismissWelcome(page){
  await page.waitForTimeout(320);
  const overlay=page.locator('#welcomeOverlay');
  if(await overlay.isVisible())await page.locator('#welcomeClose').click();
  await expect(overlay).not.toHaveClass(/open/);
}
function dialogs(page){
  page.on('dialog',d=>{
    if(d.type()==='prompt')d.accept(d.message().includes('视频 URL')?'https://example.com/mobile-round3.mp4':(d.defaultValue()||'round3-export')).catch(()=>{});
    else d.accept().catch(()=>{});
  });
}
function pageErrors(page){const errors=[];page.on('pageerror',e=>errors.push(e.message));return errors}
async function project(page){return page.evaluate(()=>structuredClone(globalThis.MindDeckApp.getProject()))}
async function node(page,id){return page.evaluate(nodeId=>{const walk=n=>n.id===nodeId?n:(n.children||[]).map(walk).find(Boolean);return structuredClone(walk(globalThis.MindDeckApp.getProject()))},id)}
async function title(page,id,value){
  await page.locator(`.node[data-id="${id}"]`).click();
  await expect(page.locator('#nodePanel')).toHaveClass(/open/);
  await page.locator('#nodeTitle').fill(value);
  await page.locator('#saveNodeBtn').click();
  await expect.poll(async()=>(await node(page,id))?.title).toBe(value);
}
async function healthy(page,label){
  const errors=await page.evaluate(()=>{
    const root=structuredClone(globalThis.MindDeckApp.getProject()),out=[],nodeIds=new Set();
    const elements=(items,path)=>{const ids=new Set();for(const [i,el] of (items||[]).entries()){const p=`${path}[${i}]`;if(!el?.id)out.push(`${p}:id`);else if(ids.has(el.id))out.push(`${p}:dup:${el.id}`);else ids.add(el.id);for(const k of ['x','y','w','h','z'])if(!Number.isFinite(el?.[k]))out.push(`${p}.${k}:${String(el?.[k])}`);if(Number(el?.w)<=0||Number(el?.h)<=0)out.push(`${p}:size`);if((el?.type==='image'||el?.type==='video')&&!el.src)out.push(`${p}:src`)}};
    const walk=(n,path='root')=>{if(!n?.id)out.push(`${path}:id`);else if(nodeIds.has(n.id))out.push(`${path}:dup:${n.id}`);else nodeIds.add(n.id);if(!Number.isFinite(n?.pos?.x)||!Number.isFinite(n?.pos?.y))out.push(`${path}:pos`);elements(n?.slideElements,`${path}.slideElements`);(n?.children||[]).forEach((c,i)=>walk(c,`${path}.children[${i}]`))};
    walk(root);elements(root?.master?.elements,'master.elements');try{JSON.stringify(root)}catch(e){out.push(`json:${e.message}`)}return out;
  });
  expect(errors,`${label}: ${errors.join(' | ')}`).toEqual([]);
}
async function exportSettings(page,fusionMode,packageMode){
  await page.locator('#exportSettingsBtn').click();
  await expect(page.locator('#exportSettingsPanel')).toHaveClass(/open/);
  await page.locator('#exportFusionMode').selectOption(fusionMode);
  await page.locator('#exportPackageMode').selectOption(packageMode);
  await page.locator('#saveExportSettingsBtn').click();
}
async function downloads(page,action,count){
  const items=[];const handler=d=>items.push(d);page.on('download',handler);
  try{await action();await expect.poll(()=>items.length,{timeout:12000}).toBe(count);for(const d of items)expect(await d.failure()).toBeNull();return items}finally{page.off('download',handler)}
}
async function bytes(download){const p=await download.path();expect(p).toBeTruthy();return readFile(p)}
async function importBytes(page,name,mimeType,buffer){const pending=page.waitForEvent('filechooser');await page.locator('#importBtn').click();const chooser=await pending;await chooser.setFiles({name,mimeType,buffer})}
async function mobileInsert(page,kind){await page.locator('#mobileInsertBtn').click();const b=page.locator(`[data-mi="${kind}"]`);await expect(b).toBeVisible();await b.click()}
async function openMobileLocalCompose(page){await page.locator('#v99SmartMobileBtn').click();await expect(page.locator('.compose-v10-modebar')).toBeVisible();await page.locator('[data-compose-mode="local"]').click();await expect(page.locator('#v99Outline')).toBeVisible()}
async function pinch(page){
  const box=await page.locator('#editorStageWrap').boundingBox();expect(box).toBeTruthy();
  const c=await page.context().newCDPSession(page),x=Math.round(box.x+box.width/2),y=Math.round(box.y+box.height/2);
  await c.send('Input.synthesizePinchGesture',{x,y,scaleFactor:1.7,relativeSpeed:800,gestureSourceType:'touch'});
}

test('desktop round3 package recovery exports persistence shortcuts and node drag',async({page},testInfo)=>{
  test.skip(testInfo.project.name.includes('mobile'),'desktop round3');
  const errors=pageErrors(page);dialogs(page);await page.goto('/');await dismissWelcome(page);
  const rootId=await page.evaluate(()=>globalThis.MindDeckApp.getProject().id);
  await title(page,rootId,'Round3 项目包原始标题');
  await page.locator(`.node[data-id="${rootId}"]`).click();await page.locator('#addChildBtn').click();
  const mediaId=await page.evaluate(()=>globalThis.MindDeckApp.getProject().children.at(-1).id);await title(page,mediaId,'Round3 本地媒体页');
  await page.locator('#editSlideBtn').click();
  let pending=page.waitForEvent('filechooser');await page.locator('#addImageBtn').click();let chooser=await pending;await chooser.setFiles({name:'round3.png',mimeType:'image/png',buffer:PNG});
  await expect.poll(async()=>((await node(page,mediaId)).slideElements.filter(e=>e.type==='image').length)).toBe(1);
  pending=page.waitForEvent('filechooser');await page.locator('#addVideoBtn').click();chooser=await pending;await chooser.setFiles({name:'round3.mp4',mimeType:'video/mp4',buffer:MP4});
  await expect.poll(async()=>((await node(page,mediaId)).slideElements.filter(e=>e.type==='video').length)).toBe(1);
  await page.locator('#saveEditorBtn').click();await page.locator('#backToMapBtn').click();await healthy(page,'media');

  await exportSettings(page,'separate','always');
  const pair=await downloads(page,()=>page.locator('#exportViewerBtn').click(),2),pkg=pair.find(d=>d.suggestedFilename().endsWith('.minddeck')),html=pair.find(d=>d.suggestedFilename().endsWith('.html'));
  expect(pkg).toBeTruthy();expect(html).toBeTruthy();const pkgBytes=await bytes(pkg);expect((await bytes(html)).toString('utf8')).toContain('KIND="presentation"');
  await title(page,rootId,'Round3 导入前恢复点');await importBytes(page,'round3.minddeck','application/zip',pkgBytes);
  await expect.poll(async()=>(await project(page)).title).toBe('Round3 项目包原始标题');
  let restored=await node(page,mediaId);expect(restored.slideElements.some(e=>e.type==='image'&&e.src.startsWith('data:image/'))).toBe(true);expect(restored.slideElements.some(e=>e.type==='video'&&e.src.startsWith('data:video/'))).toBe(true);await healthy(page,'package import');
  await page.locator('#healthCheckBtn').click();await expect(page.locator('#restoreBackupBtn')).toBeEnabled();await page.locator('#restoreBackupBtn').click();
  await expect.poll(async()=>(await project(page)).title).toBe('Round3 导入前恢复点');await healthy(page,'recovery');
  const hc=page.locator('[data-close-panel="healthPanel"]');if(await hc.isVisible())await hc.click();
  await importBytes(page,'round3-again.minddeck','application/zip',pkgBytes);await expect.poll(async()=>(await project(page)).title).toBe('Round3 项目包原始标题');

  await exportSettings(page,'separate','htmlOnly');await page.locator('#mindmapModeBtn').click();let one=await downloads(page,()=>page.locator('#exportViewerBtn').click(),1);expect((await bytes(one[0])).toString('utf8')).toContain('KIND="mindmap"');
  await page.locator('#presentationModeBtn').click();await exportSettings(page,'fusion','htmlOnly');one=await downloads(page,()=>page.locator('#exportViewerBtn').click(),1);expect((await bytes(one[0])).toString('utf8')).toContain('KIND="fusion"');

  await page.locator('#appearanceBtn').click();await page.locator('[data-theme-choice="dark"]').click();await expect.poll(async()=>(await project(page)).uiTheme).toBe('dark');
  await page.waitForTimeout(650);await page.reload();await dismissWelcome(page);await expect.poll(async()=>(await project(page)).uiTheme).toBe('dark');await healthy(page,'reload');

  await page.locator('#mindmapModeBtn').click();await page.locator(`.node[data-id="${rootId}"]`).click();const before=(await node(page,rootId)).children.length;await page.keyboard.press('Tab');await expect.poll(async()=>(await node(page,rootId)).children.length).toBe(before+1);
  const parentId=await page.locator('.node.selected').getAttribute('data-id');expect(parentId).toBeTruthy();await page.keyboard.press('F2');const editor=page.locator(`.node[data-id="${parentId}"] [contenteditable="true"]`).first();await expect(editor).toBeVisible();await editor.fill('快捷键父节点');await editor.press('Enter');
  await expect.poll(async()=>(await node(page,parentId))?.title).toBe('快捷键父节点');
  await page.keyboard.press('Tab');await expect.poll(async()=>((await node(page,parentId))?.children||[]).length).toBe(1);const childId=(await node(page,parentId)).children[0].id;
  await page.keyboard.press('Shift+Tab');await expect(page.locator(`.node[data-id="${parentId}"]`)).toHaveClass(/selected/);await page.keyboard.press('Space');await expect(page.locator(`.node[data-id="${childId}"]`)).toHaveCount(0);await page.keyboard.press('Space');await expect(page.locator(`.node[data-id="${childId}"]`)).toBeVisible();
  await page.keyboard.press('Enter');const siblingId=await page.locator('.node.selected').getAttribute('data-id');expect(siblingId).not.toBe(parentId);await page.keyboard.press('Delete');await expect(page.locator(`.node[data-id="${siblingId}"]`)).toHaveCount(0);
  await page.locator(`.node[data-id="${parentId}"]`).click();const pos=(await node(page,parentId)).pos,box=await page.locator(`.node[data-id="${parentId}"]`).boundingBox();expect(box).toBeTruthy();await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();await page.mouse.move(box.x+box.width/2+70,box.y+box.height/2+42,{steps:5});await page.mouse.up();
  await expect.poll(async()=>{const p=(await node(page,parentId)).pos;return Math.round(Math.abs(p.x-pos.x)+Math.abs(p.y-pos.y))}).toBeGreaterThan(20);await healthy(page,'shortcuts drag');expect(errors).toEqual([]);
});

test('mobile round3 smart compose media properties touch zoom master and presentation',async({page},testInfo)=>{
  test.skip(!testInfo.project.name.includes('mobile'),'mobile round3');
  const errors=pageErrors(page);dialogs(page);await page.goto('/');await dismissWelcome(page);
  const context=page.locator('#mobileNodeContext');if(await context.isVisible()){await page.locator('#mobileNodeContextClose').click();await expect(context).not.toHaveClass(/open/)}
  await expect(page.locator('#v99SmartMobileBtn')).toBeVisible();await openMobileLocalCompose(page);await page.locator('#v99SampleBtn').click();await page.locator('#v99GenerateBtn').click();await expect(page.locator('.v99-smart-overlay')).toHaveCount(0);await healthy(page,'mobile compose');
  const targetId=await page.evaluate(()=>globalThis.MindDeckApp.getProject().children[0]?.id);expect(targetId).toBeTruthy();await page.locator(`.node[data-id="${targetId}"]`).tap();await expect(page.locator('#mobileNodeContext')).toHaveClass(/open/);await page.locator('#mobileEditPageBtn').click();

  await mobileInsert(page,'text');const textId=await page.evaluate(id=>{const walk=n=>n.id===id?n:(n.children||[]).map(walk).find(Boolean);return walk(globalThis.MindDeckApp.getProject()).slideElements.at(-1).id},targetId);await page.locator('#mobilePropBtn').click();await page.locator('[data-p="text"]').fill('手机端真实属性编辑');await page.locator('[data-p="text"]').blur();await expect.poll(async()=>((await node(page,targetId)).slideElements.find(e=>e.id===textId)?.text)).toBe('手机端真实属性编辑');await page.locator('#mobilePropClose').click();
  let pending=page.waitForEvent('filechooser');await page.locator('#mobileInsertBtn').click();await page.locator('[data-mi="image"]').click();let chooser=await pending;await chooser.setFiles({name:'mobile.png',mimeType:'image/png',buffer:PNG});await expect.poll(async()=>((await node(page,targetId)).slideElements.filter(e=>e.type==='image').length)).toBe(1);await page.locator('#mobilePropBtn').click();await page.locator('[data-p="fit"]').selectOption('cover');await page.locator('#mobilePropClose').click();
  pending=page.waitForEvent('filechooser');await page.locator('#mobileInsertBtn').click();await page.locator('[data-mi="video"]').click();chooser=await pending;await chooser.setFiles({name:'mobile.mp4',mimeType:'video/mp4',buffer:MP4});await expect.poll(async()=>((await node(page,targetId)).slideElements.filter(e=>e.type==='video').length)).toBe(1);await page.locator('#mobilePropBtn').click();await page.locator('[data-p="autoplay"]').selectOption('true');await page.locator('[data-p="muted"]').selectOption('true');await page.locator('#mobilePropClose').click();
  await mobileInsert(page,'videoUrl');await expect.poll(async()=>((await node(page,targetId)).slideElements.filter(e=>e.type==='video').length)).toBe(2);await healthy(page,'mobile media');

  const transform=await page.locator('#editorStage').evaluate(el=>el.style.transform);await pinch(page);await expect.poll(async()=>page.locator('#editorStage').evaluate(el=>el.style.transform)).not.toBe(transform);await expect(page.locator('#mobileZoomLabel')).not.toHaveText('100%');
  await mobileInsert(page,'master');await expect(page.locator('#editorModePill')).toHaveText('母版');await page.locator('#mobilePropBtn').click();await page.locator('[data-master-p="bgColor"]').fill('#203040');await page.locator('[data-master-p="tocSide"]').selectOption('right');await expect(page.locator('#propPanel')).toHaveClass(/open/);await page.locator('#mobilePropClose').click();
  await mobileInsert(page,'text');const masterId=await page.evaluate(()=>globalThis.MindDeckApp.getProject().master.elements.at(-1).id);await page.locator('#mobilePropBtn').click();await page.locator('[data-p="text"]').fill('手机母版标题');await page.locator('[data-p="text"]').blur();await page.locator('#mobilePropClose').click();
  const master=await page.evaluate(id=>{const m=globalThis.MindDeckApp.getProject().master;return {bgColor:m.bgColor,tocSide:m.tocSide,text:m.elements.find(e=>e.id===id)?.text}},masterId);expect(master).toEqual({bgColor:'#203040',tocSide:'right',text:'手机母版标题'});await healthy(page,'mobile master');
  await page.locator('#backToMapBtn').click();await page.locator('#mobileMainPresent').click();await expect(page.locator('#presentShell')).toHaveClass(/open/);await expect(page.locator('#presentStage')).not.toBeEmpty();await page.keyboard.press('Escape');await expect(page.locator('#presentShell')).not.toHaveClass(/open/);expect(errors).toEqual([]);
});