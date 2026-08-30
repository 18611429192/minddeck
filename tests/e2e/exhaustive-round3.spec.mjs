import { Buffer } from 'node:buffer';
import { readFile } from 'node:fs/promises';
import { test, expect } from '@playwright/test';

test.setTimeout(150000);

const PNG_1PX=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9ZfC8AAAAASUVORK5CYII=','base64');
const TINY_MP4=Buffer.from([0,0,0,20,102,116,121,112,105,115,111,109,0,0,0,0,105,115,111,109]);

async function dismissWelcome(page){
  await page.waitForTimeout(320);
  const overlay=page.locator('#welcomeOverlay');
  if(await overlay.isVisible())await page.locator('#welcomeClose').click();
  await expect(overlay).not.toHaveClass(/open/);
}

function acceptDialogs(page){
  page.on('dialog',dialog=>{
    if(dialog.type()==='prompt'){
      const value=dialog.message().includes('视频 URL')?'https://example.com/mobile-round3.mp4':(dialog.defaultValue()||'round3-export');
      dialog.accept(value).catch(()=>{});
    }else dialog.accept().catch(()=>{});
  });
}

function watchPageErrors(page){
  const errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  return errors;
}

async function project(page){return page.evaluate(()=>structuredClone(globalThis.MindDeckApp.getProject()))}

async function nodeById(page,id){
  return page.evaluate(nodeId=>{
    const walk=node=>node.id===nodeId?node:(node.children||[]).map(walk).find(Boolean);
    return structuredClone(walk(globalThis.MindDeckApp.getProject()));
  },id);
}

async function setNodeTitle(page,id,title){
  await page.locator(`.node[data-id="${id}"]`).click();
  await expect(page.locator('#nodePanel')).toHaveClass(/open/);
  await page.locator('#nodeTitle').fill(title);
  await page.locator('#saveNodeBtn').click();
  await expect.poll(async()=>(await nodeById(page,id))?.title).toBe(title);
}

async function assertModelHealthy(page,label='state'){
  const report=await page.evaluate(()=>{
    const root=structuredClone(globalThis.MindDeckApp.getProject()),errors=[],nodeIds=new Set();
    const checkElements=(elements,path)=>{
      const ids=new Set();
      for(const [index,el] of (elements||[]).entries()){
        const p=`${path}[${index}]`;
        if(!el?.id)errors.push(`${p}: missing id`);
        else if(ids.has(el.id))errors.push(`${p}: duplicate id ${el.id}`);
        else ids.add(el.id);
        for(const key of ['x','y','w','h','z'])if(!Number.isFinite(el?.[key]))errors.push(`${p}.${key}: ${String(el?.[key])}`);
        if(Number(el?.w)<=0||Number(el?.h)<=0)errors.push(`${p}: non-positive size`);
        if((el?.type==='image'||el?.type==='video')&&!el.src)errors.push(`${p}: empty media src`);
      }
    };
    const walk=(node,path='root')=>{
      if(!node?.id)errors.push(`${path}: missing node id`);
      else if(nodeIds.has(node.id))errors.push(`${path}: duplicate node id ${node.id}`);
      else nodeIds.add(node.id);
      if(!Number.isFinite(node?.pos?.x)||!Number.isFinite(node?.pos?.y))errors.push(`${path}.pos invalid`);
      checkElements(node?.slideElements,`${path}.slideElements`);
      (node?.children||[]).forEach((child,index)=>walk(child,`${path}.children[${index}]`));
    };
    walk(root);
    checkElements(root?.master?.elements,'master.elements');
    try{JSON.stringify(root)}catch(err){errors.push(`json: ${err.message}`)}
    return {errors,nodeCount:nodeIds.size};
  });
  expect(report.errors,`${label}: ${report.errors.join(' | ')}`).toEqual([]);
  expect(report.nodeCount).toBeGreaterThan(0);
}

async function configureExport(page,{fusionMode='separate',packageMode='htmlOnly'}={}){
  await page.locator('#exportSettingsBtn').click();
  await expect(page.locator('#exportSettingsPanel')).toHaveClass(/open/);
  await page.locator('#exportFusionMode').selectOption(fusionMode);
  await page.locator('#exportPackageMode').selectOption(packageMode);
  await page.locator('#saveExportSettingsBtn').click();
}

async function collectDownloads(page,action,expected){
  const items=[];
  const handler=download=>items.push(download);
  page.on('download',handler);
  try{
    await action();
    await expect.poll(()=>items.length,{timeout:12000}).toBe(expected);
    for(const item of items)expect(await item.failure()).toBeNull();
    return items;
  }finally{page.off('download',handler)}
}

async function importBuffer(page,{name,mimeType,buffer}){
  const chooserPromise=page.waitForEvent('filechooser');
  await page.locator('#importBtn').click();
  const chooser=await chooserPromise;
  await chooser.setFiles({name,mimeType,buffer});
}

async function readDownload(download){
  const file=await download.path();
  expect(file).toBeTruthy();
  return readFile(file);
}

async function openMobileInsert(page,kind){
  await page.locator('#mobileInsertBtn').click();
  const button=page.locator(`[data-mi="${kind}"]`);
  await expect(button).toBeVisible();
  await button.click();
}

async function dispatchPinch(page,selector,factor=1.65){
  const box=await page.locator(selector).boundingBox();
  expect(box).toBeTruthy();
  const client=await page.context().newCDPSession(page);
  const cx=box.x+box.width/2,cy=box.y+box.height/2,start=35,end=start*factor;
  await client.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:cx-start,y:cy},{x:cx+start,y:cy}]});
  await client.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:cx-end,y:cy},{x:cx+end,y:cy}]});
  await client.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
}

test('desktop round3 exercises package roundtrip, recovery, export modes, persistence and map shortcuts',async({page},testInfo)=>{
  test.skip(testInfo.project.name.includes('mobile'),'desktop round3');
  const pageErrors=watchPageErrors(page);
  acceptDialogs(page);
  await page.goto('/');
  await dismissWelcome(page);
  const rootId=await page.evaluate(()=>globalThis.MindDeckApp.getProject().id);
  await setNodeTitle(page,rootId,'Round3 项目包原始标题');

  // Create a real child with local image + video so .minddeck must carry assets.
  await page.locator(`.node[data-id="${rootId}"]`).click();
  await page.locator('#addChildBtn').click();
  const mediaNodeId=await page.evaluate(()=>globalThis.MindDeckApp.getProject().children.at(-1).id);
  await setNodeTitle(page,mediaNodeId,'Round3 本地媒体页');
  await page.locator('#editSlideBtn').click();
  await expect(page.locator('#editorShell')).toHaveClass(/open/);

  let chooserPromise=page.waitForEvent('filechooser');
  await page.locator('#addImageBtn').click();
  let chooser=await chooserPromise;
  await chooser.setFiles({name:'round3.png',mimeType:'image/png',buffer:PNG_1PX});
  await expect.poll(async()=>((await nodeById(page,mediaNodeId))?.slideElements||[]).filter(el=>el.type==='image').length).toBe(1);

  chooserPromise=page.waitForEvent('filechooser');
  await page.locator('#addVideoBtn').click();
  chooser=await chooserPromise;
  await chooser.setFiles({name:'round3.mp4',mimeType:'video/mp4',buffer:TINY_MP4});
  await expect.poll(async()=>((await nodeById(page,mediaNodeId))?.slideElements||[]).filter(el=>el.type==='video').length).toBe(1);
  await page.locator('#saveEditorBtn').click();
  await page.locator('#backToMapBtn').click();
  await assertModelHealthy(page,'after local media');

  // Real presentation export with packageMode=always must emit HTML + .minddeck.
  await configureExport(page,{fusionMode:'separate',packageMode:'always'});
  const packageDownloads=await collectDownloads(page,()=>page.locator('#exportViewerBtn').click(),2);
  const minddeck=packageDownloads.find(item=>item.suggestedFilename().endsWith('.minddeck'));
  const presentationHtml=packageDownloads.find(item=>item.suggestedFilename().endsWith('.html'));
  expect(minddeck).toBeTruthy();
  expect(presentationHtml).toBeTruthy();
  const minddeckBytes=await readDownload(minddeck);
  const presentationBytes=await readDownload(presentationHtml);
  expect(presentationBytes.toString('utf8')).toContain('KIND="presentation"');
  expect(minddeckBytes.length).toBeGreaterThan(100);

  // Importing the package must restore the old project; Restore Backup must then restore the pre-import state.
  await setNodeTitle(page,rootId,'Round3 导入前恢复点');
  await importBuffer(page,{name:'round3.minddeck',mimeType:'application/zip',buffer:minddeckBytes});
  await expect.poll(async()=>(await project(page)).title).toBe('Round3 项目包原始标题');
  const restoredMedia=await nodeById(page,mediaNodeId);
  expect(restoredMedia.slideElements.some(el=>el.type==='image'&&el.src.startsWith('data:image/'))).toBe(true);
  expect(restoredMedia.slideElements.some(el=>el.type==='video'&&el.src.startsWith('data:video/'))).toBe(true);
  await assertModelHealthy(page,'after minddeck import');

  await page.locator('#healthCheckBtn').click();
  await expect(page.locator('#restoreBackupBtn')).toBeEnabled();
  await page.locator('#restoreBackupBtn').click();
  await expect.poll(async()=>(await project(page)).title).toBe('Round3 导入前恢复点');
  await assertModelHealthy(page,'after recovery restore');
  const healthClose=page.locator('[data-close-panel="healthPanel"]');
  if(await healthClose.isVisible())await healthClose.click();

  // Re-import the package and exercise all three standalone export kinds through UI settings.
  await importBuffer(page,{name:'round3-again.minddeck',mimeType:'application/zip',buffer:minddeckBytes});
  await expect.poll(async()=>(await project(page)).title).toBe('Round3 项目包原始标题');

  await configureExport(page,{fusionMode:'separate',packageMode:'htmlOnly'});
  await page.locator('#mindmapModeBtn').click();
  const mindmapDownloads=await collectDownloads(page,()=>page.locator('#exportViewerBtn').click(),1);
  const mindmapHtml=(await readDownload(mindmapDownloads[0])).toString('utf8');
  expect(mindmapHtml).toContain('KIND="mindmap"');

  await page.locator('#presentationModeBtn').click();
  await configureExport(page,{fusionMode:'fusion',packageMode:'htmlOnly'});
  const fusionDownloads=await collectDownloads(page,()=>page.locator('#exportViewerBtn').click(),1);
  const fusionHtml=(await readDownload(fusionDownloads[0])).toString('utf8');
  expect(fusionHtml).toContain('KIND="fusion"');

  // Theme choice must survive a real browser reload.
  await page.locator('#appearanceBtn').click();
  await page.locator('[data-theme-choice="dark"]').click();
  await expect.poll(async()=>(await project(page)).uiTheme).toBe('dark');
  await page.waitForTimeout(650);
  await page.reload();
  await dismissWelcome(page);
  await expect.poll(async()=>(await project(page)).uiTheme).toBe('dark');
  await assertModelHealthy(page,'after theme reload');

  // Mind-map keyboard path: Tab child, F2 inline edit, Tab grandchild, Shift+Tab parent,
  // Space fold/unfold, Enter sibling, Delete sibling, then a real mouse drag.
  await page.locator('#mindmapModeBtn').click();
  await page.locator(`.node[data-id="${rootId}"]`).click();
  const rootChildrenBefore=(await nodeById(page,rootId)).children.length;
  await page.keyboard.press('Tab');
  await expect.poll(async()=>(await nodeById(page,rootId)).children.length).toBe(rootChildrenBefore+1);
  const shortcutParentId=await page.locator('.node.selected').getAttribute('data-id');
  expect(shortcutParentId).toBeTruthy();

  await page.keyboard.press('F2');
  const titleEditor=page.locator(`.node[data-id="${shortcutParentId}"] [contenteditable="true"]`).first();
  await expect(titleEditor).toBeVisible();
  await titleEditor.fill('快捷键父节点');
  await titleEditor.press('Enter').catch(()=>{});
  await titleEditor.blur();
  await expect.poll(async()=>(await nodeById(page,shortcutParentId))?.title).toBe('快捷键父节点');

  await page.keyboard.press('Tab');
  await expect.poll(async()=>((await nodeById(page,shortcutParentId))?.children||[]).length).toBe(1);
  const shortcutChildId=(await nodeById(page,shortcutParentId)).children[0].id;
  await page.keyboard.press('Shift+Tab');
  await expect(page.locator(`.node[data-id="${shortcutParentId}"]`)).toHaveClass(/selected/);
  await page.keyboard.press('Space');
  await expect(page.locator(`.node[data-id="${shortcutChildId}"]`)).toHaveCount(0);
  await page.keyboard.press('Space');
  await expect(page.locator(`.node[data-id="${shortcutChildId}"]`)).toBeVisible();

  await page.keyboard.press('Enter');
  const siblingId=await page.locator('.node.selected').getAttribute('data-id');
  expect(siblingId).toBeTruthy();
  expect(siblingId).not.toBe(shortcutParentId);
  await page.keyboard.press('Delete');
  await expect(page.locator(`.node[data-id="${siblingId}"]`)).toHaveCount(0);

  await page.locator(`.node[data-id="${shortcutParentId}"]`).click();
  const beforeDrag=(await nodeById(page,shortcutParentId)).pos;
  const nodeBox=await page.locator(`.node[data-id="${shortcutParentId}"]`).boundingBox();
  expect(nodeBox).toBeTruthy();
  await page.mouse.move(nodeBox.x+nodeBox.width/2,nodeBox.y+nodeBox.height/2);
  await page.mouse.down();
  await page.mouse.move(nodeBox.x+nodeBox.width/2+70,nodeBox.y+nodeBox.height/2+42,{steps:5});
  await page.mouse.up();
  await expect.poll(async()=>{
    const pos=(await nodeById(page,shortcutParentId)).pos;
    return Math.round(Math.abs(pos.x-beforeDrag.x)+Math.abs(pos.y-beforeDrag.y));
  }).toBeGreaterThan(20);
  await assertModelHealthy(page,'after keyboard and node drag');

  expect(pageErrors).toEqual([]);
});

test('mobile round3 generates, edits rich media/master and exercises real touch zoom',async({page},testInfo)=>{
  test.skip(!testInfo.project.name.includes('mobile'),'mobile round3');
  const pageErrors=watchPageErrors(page);
  acceptDialogs(page);
  await page.goto('/');
  await dismissWelcome(page);

  // Generate a real deck from the mobile-only Smart Compose entry.
  await expect(page.locator('#v99SmartMobileBtn')).toBeVisible();
  await page.locator('#v99SmartMobileBtn').click();
  await page.locator('#v99SampleBtn').click();
  await page.locator('#v99GenerateBtn').click();
  await expect(page.locator('.v99-smart-overlay')).toHaveCount(0);
  await assertModelHealthy(page,'mobile smart compose');

  const targetId=await page.evaluate(()=>globalThis.MindDeckApp.getProject().children[0]?.id);
  expect(targetId).toBeTruthy();
  await page.locator(`.node[data-id="${targetId}"]`).tap();
  await expect(page.locator('#mobileNodeContext')).toHaveClass(/open/);
  await page.locator('#mobileEditPageBtn').click();
  await expect(page.locator('#editorShell')).toHaveClass(/open/);

  // Real mobile text + property editing.
  await openMobileInsert(page,'text');
  const textId=await page.evaluate(id=>{
    const walk=node=>node.id===id?node:(node.children||[]).map(walk).find(Boolean);
    return walk(globalThis.MindDeckApp.getProject()).slideElements.at(-1).id;
  },targetId);
  await page.locator('#mobilePropBtn').click();
  await expect(page.locator('[data-p="text"]')).toBeVisible();
  await page.locator('[data-p="text"]').fill('手机端真实属性编辑');
  await page.locator('[data-p="text"]').blur();
  await expect.poll(async()=>((await nodeById(page,targetId)).slideElements.find(el=>el.id===textId)?.text)).toBe('手机端真实属性编辑');
  await page.locator('#mobilePropClose').click();

  // Mobile image insert + fit edit.
  let chooserPromise=page.waitForEvent('filechooser');
  await page.locator('#mobileInsertBtn').click();
  await page.locator('[data-mi="image"]').click();
  let chooser=await chooserPromise;
  await chooser.setFiles({name:'mobile.png',mimeType:'image/png',buffer:PNG_1PX});
  await expect.poll(async()=>((await nodeById(page,targetId)).slideElements.filter(el=>el.type==='image').length)).toBe(1);
  await page.locator('#mobilePropBtn').click();
  await page.locator('[data-p="fit"]').selectOption('cover');
  await page.locator('#mobilePropClose').click();

  // Mobile local video + URL video.
  chooserPromise=page.waitForEvent('filechooser');
  await page.locator('#mobileInsertBtn').click();
  await page.locator('[data-mi="video"]').click();
  chooser=await chooserPromise;
  await chooser.setFiles({name:'mobile.mp4',mimeType:'video/mp4',buffer:TINY_MP4});
  await expect.poll(async()=>((await nodeById(page,targetId)).slideElements.filter(el=>el.type==='video').length)).toBe(1);
  await page.locator('#mobilePropBtn').click();
  await page.locator('[data-p="autoplay"]').selectOption('true');
  await page.locator('[data-p="muted"]').selectOption('true');
  await page.locator('#mobilePropClose').click();

  await openMobileInsert(page,'videoUrl');
  await expect.poll(async()=>((await nodeById(page,targetId)).slideElements.filter(el=>el.type==='video').length)).toBe(2);
  await assertModelHealthy(page,'mobile media');

  // Real two-finger pinch changes the actual 1600x900 editor transform.
  const transformBefore=await page.locator('#editorStage').evaluate(el=>el.style.transform);
  await dispatchPinch(page,'#editorStageWrap',1.75);
  const transformAfter=await page.locator('#editorStage').evaluate(el=>el.style.transform);
  expect(transformAfter).not.toBe(transformBefore);
  await expect(page.locator('#mobileZoomLabel')).not.toHaveText('100%');

  // Switch to master from the mobile insert sheet and edit global settings through mobile properties.
  await openMobileInsert(page,'master');
  await expect(page.locator('#editorModePill')).toHaveText('母版');
  await page.locator('#mobilePropBtn').click();
  await expect(page.locator('[data-master-p="bgColor"]')).toBeVisible();
  await page.locator('[data-master-p="bgColor"]').fill('#203040');
  await page.locator('[data-master-p="tocSide"]').selectOption('right');
  await expect(page.locator('#propPanel')).toHaveClass(/open/);
  await page.locator('#mobilePropClose').click();
  await openMobileInsert(page,'text');
  const masterTextId=await page.evaluate(()=>globalThis.MindDeckApp.getProject().master.elements.at(-1).id);
  await page.locator('#mobilePropBtn').click();
  await page.locator('[data-p="text"]').fill('手机母版标题');
  await page.locator('[data-p="text"]').blur();
  await page.locator('#mobilePropClose').click();
  const masterState=await page.evaluate(id=>{
    const master=globalThis.MindDeckApp.getProject().master;
    return {bgColor:master.bgColor,tocSide:master.tocSide,text:master.elements.find(el=>el.id===id)?.text};
  },masterTextId);
  expect(masterState).toEqual({bgColor:'#203040',tocSide:'right',text:'手机母版标题'});
  await assertModelHealthy(page,'mobile master');

  await page.locator('#backToMapBtn').click();
  await page.locator('#mobileMainPresent').click();
  await expect(page.locator('#presentShell')).toHaveClass(/open/);
  await expect(page.locator('#presentStage')).not.toBeEmpty();
  await page.keyboard.press('Escape');
  await expect(page.locator('#presentShell')).not.toHaveClass(/open/);

  expect(pageErrors).toEqual([]);
});
