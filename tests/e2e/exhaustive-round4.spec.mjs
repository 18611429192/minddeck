import { Buffer } from 'node:buffer';
import { readFile } from 'node:fs/promises';
import { test, expect } from '@playwright/test';

test.setTimeout(150000);
const PNG=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9ZfC8AAAAASUVORK5CYII=','base64');

async function dismissWelcome(page){await page.waitForTimeout(320);const o=page.locator('#welcomeOverlay');if(await o.isVisible())await page.locator('#welcomeClose').click();await expect(o).not.toHaveClass(/open/)}
function dialogs(page){page.on('dialog',d=>d.type()==='prompt'?d.accept(d.defaultValue()||'round4').catch(()=>{}):d.accept().catch(()=>{}))}
function errors(page){const out=[];page.on('pageerror',e=>out.push(e.message));return out}
async function project(page){return page.evaluate(()=>structuredClone(globalThis.MindDeckApp.getProject()))}
async function node(page,id){return page.evaluate(nodeId=>{const walk=n=>n.id===nodeId?n:(n.children||[]).map(walk).find(Boolean);return structuredClone(walk(globalThis.MindDeckApp.getProject()))},id)}
async function healthy(page,label){const out=await page.evaluate(()=>{const root=structuredClone(globalThis.MindDeckApp.getProject()),errs=[],nodes=new Set();const els=(list,path)=>{const ids=new Set();for(const [i,e] of (list||[]).entries()){const p=`${path}[${i}]`;if(!e?.id||ids.has(e.id))errs.push(`${p}:id`);ids.add(e?.id);for(const k of ['x','y','w','h','z'])if(!Number.isFinite(e?.[k]))errs.push(`${p}.${k}:${String(e?.[k])}`)}};const walk=(n,path='root')=>{if(!n?.id||nodes.has(n.id))errs.push(`${path}:id`);nodes.add(n?.id);if(!Number.isFinite(n?.pos?.x)||!Number.isFinite(n?.pos?.y))errs.push(`${path}:pos`);els(n?.slideElements,`${path}.slideElements`);(n?.children||[]).forEach((c,i)=>walk(c,`${path}.children[${i}]`))};walk(root);els(root?.master?.elements,'master.elements');return errs});expect(out,`${label}: ${out.join(' | ')}`).toEqual([])}
async function exportSettings(page,{packageMode='auto',image='1',video='3',total='15',fusion='separate'}={}){await page.locator('#exportSettingsBtn').click();await page.locator('#exportFusionMode').selectOption(fusion);await page.locator('#exportPackageMode').selectOption(packageMode);await page.locator('#exportImageLimit').fill(image);await page.locator('#exportVideoLimit').fill(video);await page.locator('#exportTotalLimit').fill(total);await page.locator('#saveExportSettingsBtn').click()}
async function collectDownloads(page,action,count){const list=[];const handler=d=>list.push(d);page.on('download',handler);try{await action();await expect.poll(()=>list.length,{timeout:12000}).toBe(count);for(const d of list)expect(await d.failure()).toBeNull();return list}finally{page.off('download',handler)}}
async function bytes(download){const p=await download.path();expect(p).toBeTruthy();return readFile(p)}
function zipLocalNames(buffer){const names=[];let off=0;while(off+30<=buffer.length&&buffer.readUInt32LE(off)===0x04034b50){const size=buffer.readUInt32LE(off+18),nameLen=buffer.readUInt16LE(off+26),extraLen=buffer.readUInt16LE(off+28),nameStart=off+30;names.push(buffer.subarray(nameStart,nameStart+nameLen).toString('utf8'));off=nameStart+nameLen+extraLen+size}return names}
async function cdp(page){return page.context().newCDPSession(page)}
async function pinch(page,selector,factor=1.55){const box=await page.locator(selector).boundingBox();expect(box).toBeTruthy();const client=await cdp(page);await client.send('Input.synthesizePinchGesture',{x:Math.round(box.x+box.width/2),y:Math.round(box.y+box.height/2),scaleFactor:factor,relativeSpeed:700,gestureSourceType:'touch'})}
async function touchDrag(page,selector,dx,dy){
  const box=await page.locator(selector).boundingBox();expect(box).toBeTruthy();
  const client=await cdp(page),sx=Math.round(box.x+box.width/2),sy=Math.round(box.y+box.height/2);
  const point=(x,y)=>({x:Math.round(x),y:Math.round(y),radiusX:1,radiusY:1,force:1});
  await client.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[point(sx,sy)]});
  for(let i=1;i<=5;i++)await client.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[point(sx+dx*i/5,sy+dy*i/5)]});
  await client.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
}

async function openMobileMore(page){await page.locator('#mobileMainMore').click();await expect(page.locator('#mobileMainSheet')).toHaveClass(/open/)}
async function setMobileLayout(page,value){await openMobileMore(page);await page.locator('#mobileMapLayoutSelect').selectOption(value);await expect.poll(async()=>(await project(page)).mapLayout).toBe(value)}
async function openMobileLocalCompose(page){await page.locator('#v99SmartMobileBtn').click();await expect(page.locator('.compose-v10-modebar')).toBeVisible();await page.locator('[data-compose-mode="local"]').click();await expect(page.locator('#v99Outline')).toBeVisible()}


test('desktop round4 validates auto package thresholds and repeated asset dedup',async({page},testInfo)=>{
  test.skip(testInfo.project.name.includes('mobile'),'desktop round4');
  const pageErrors=errors(page);dialogs(page);await page.goto('/');await dismissWelcome(page);
  const rootId=await page.evaluate(()=>globalThis.MindDeckApp.getProject().id);await page.locator(`.node[data-id="${rootId}"]`).click();await page.locator('#addChildBtn').click();const id=await page.evaluate(()=>globalThis.MindDeckApp.getProject().children.at(-1).id);await page.locator('#editSlideBtn').click();
  let pending=page.waitForEvent('filechooser');await page.locator('#addImageBtn').click();let chooser=await pending;await chooser.setFiles({name:'same.png',mimeType:'image/png',buffer:PNG});await expect.poll(async()=>((await node(page,id)).slideElements.filter(e=>e.type==='image').length)).toBe(1);
  const imageId=(await node(page,id)).slideElements.find(e=>e.type==='image').id;await page.locator(`.canvas-el[data-id="${imageId}"]`).click();await page.locator('#duplicateElBtn').click();await expect.poll(async()=>((await node(page,id)).slideElements.filter(e=>e.type==='image').length)).toBe(2);const images=(await node(page,id)).slideElements.filter(e=>e.type==='image');expect(images[0].src).toBe(images[1].src);await page.locator('#saveEditorBtn').click();await page.locator('#backToMapBtn').click();await healthy(page,'duplicate media');

  // Generous auto thresholds: one HTML only.
  await exportSettings(page,{packageMode:'auto',image:'10',video:'10',total:'10'});let dl=await collectDownloads(page,()=>page.locator('#exportViewerBtn').click(),1);expect(dl[0].suggestedFilename()).toMatch(/\.html$/);

  // Zero threshold: auto must emit HTML + package. Repeated identical media should occupy one asset entry.
  await exportSettings(page,{packageMode:'auto',image:'0',video:'0',total:'0'});dl=await collectDownloads(page,()=>page.locator('#exportViewerBtn').click(),2);const pkg=dl.find(d=>d.suggestedFilename().endsWith('.minddeck'));expect(pkg).toBeTruthy();const names=zipLocalNames(await bytes(pkg));expect(names).toContain('project.json');expect(names).toContain('manifest.json');expect(names.filter(name=>name.startsWith('assets/'))).toHaveLength(1);await healthy(page,'auto package');expect(pageErrors).toEqual([]);
});

test('mobile round4 exercises all layouts map pinch touch drag design intent templates and swipe presentation',async({page},testInfo)=>{
  test.skip(!testInfo.project.name.includes('mobile'),'mobile round4');
  const pageErrors=errors(page);dialogs(page);await page.goto('/');await dismissWelcome(page);
  const context=page.locator('#mobileNodeContext');if(await context.isVisible())await page.locator('#mobileNodeContextClose').click();
  await openMobileLocalCompose(page);await page.locator('#v99SampleBtn').click();await page.locator('#v99GenerateBtn').click();await expect(page.locator('.v99-smart-overlay')).toHaveCount(0);await healthy(page,'generated');

  // Switch to mind-map and exercise every layout through the actual mobile More sheet.
  await page.locator('#mindmapModeBtn').click();const signatures=new Set();
  for(const layout of ['balanced','right','left','down','radial']){await setMobileLayout(page,layout);await page.waitForTimeout(80);const signature=await page.evaluate(()=>globalThis.MindDeckApp.getProject().children.slice(0,4).map(n=>`${Math.round(n.pos.x)},${Math.round(n.pos.y)}`).join('|'));signatures.add(signature);await healthy(page,`layout ${layout}`)}
  expect(signatures.size).toBeGreaterThanOrEqual(4);

  // Real Chromium pinch on map viewport must change the world transform.
  if(await context.isVisible())await page.locator('#mobileNodeContextClose').click();const worldBefore=await page.locator('#world').evaluate(el=>el.style.transform);await pinch(page,'#viewport',1.6);await expect.poll(async()=>page.locator('#world').evaluate(el=>el.style.transform)).not.toBe(worldBefore);

  // Real touch drag on a non-root node must move its model position.
  const dragId=await page.evaluate(()=>globalThis.MindDeckApp.getProject().children[0].id);const dragSel=`.node[data-id="${dragId}"]`;const posBefore=(await node(page,dragId)).pos;await touchDrag(page,dragSel,75,45);await expect.poll(async()=>{const p=(await node(page,dragId)).pos;return Math.round(Math.abs(p.x-posBefore.x)+Math.abs(p.y-posBefore.y))},{timeout:8000}).toBeGreaterThan(15);await healthy(page,'map touch drag');

  // On mobile, Design Intent must be genuinely reachable, then lead into A/B/C page templates.
  await page.locator('#presentationModeBtn').click();const metricId=await page.evaluate(()=>globalThis.MindDeckApp.getProject().children.find(n=>n.title==='核心指标')?.id);expect(metricId).toBeTruthy();await page.locator(`.node[data-id="${metricId}"]`).tap();await page.locator('#mobileEditPageBtn').click();await expect(page.locator('#slideInspectorBtn')).toBeVisible();await page.locator('#slideInspectorBtn').click();await expect(page.locator('#slideInspectorPanel')).toHaveClass(/open/);const controls=page.locator('[data-intent-field]');expect(await controls.count()).toBeGreaterThan(0);await page.locator('#v10InspectorTemplates').click();await expect(page.locator('.v99-smart-overlay')).toBeVisible();await expect(page.locator('.v99-smart-template')).toHaveCount(3);
  const current=await page.evaluate(id=>globalThis.MindDeckApp.getProject().children.find(n=>n.id===id)?.composer?.selectedTemplateId,metricId);const candidates=await page.locator('.v99-smart-template').evaluateAll(nodes=>nodes.map(n=>n.dataset.template));const next=candidates.find(id=>id&&id!==current);expect(next).toBeTruthy();await page.locator(`.v99-smart-template[data-template="${next}"]`).click();await page.locator('#v99ApplyTemplate').click();await expect(page.locator('.v99-smart-overlay')).toHaveCount(0);await expect.poll(()=>page.evaluate(id=>globalThis.MindDeckApp.getProject().children.find(n=>n.id===id)?.composer?.selectedTemplateId,metricId)).toBe(next);await healthy(page,'mobile template');

  // Return and use a real touch swipe to advance presentation.
  await page.locator('#backToMapBtn').click();await page.locator('#mobileMainPresent').click();await expect(page.locator('#presentShell')).toHaveClass(/open/);const activeBefore=await page.locator('.toc-item.active').getAttribute('data-id');await touchDrag(page,'#presentStageWrap',-180,0);await expect.poll(async()=>page.locator('.toc-item.active').getAttribute('data-id'),{timeout:8000}).not.toBe(activeBefore);await page.keyboard.press('Escape');await expect(page.locator('#presentShell')).not.toHaveClass(/open/);expect(pageErrors).toEqual([]);
});
