import { Script } from 'node:vm';
import { test, expect } from '@playwright/test';

async function dismissWelcome(page){
  await page.waitForTimeout(320);
  const overlay=page.locator('#welcomeOverlay');
  if(await overlay.isVisible())await page.locator('#welcomeClose').click();
}

function scriptSyntaxError(source,index){
  try{new Script(source,{filename:`minddeck-portable-export-${index}.js`});return null}
  catch(err){return String(err?.stack||err)}
}

test('portable presentation export contains parseable inline JavaScript',async({page},testInfo)=>{
  test.skip(testInfo.project.name.includes('mobile'),'one desktop syntax regression is enough');
  await page.goto('/');
  await expect.poll(()=>page.evaluate(()=>!!globalThis.MindDeckApp)).toBe(true);
  const html=await page.evaluate(()=>globalThis.MindDeckApp.exportHtml('presentation'));
  const scripts=[...html.matchAll(/<script>([\s\S]*?)<\/script>/gi)].map(match=>match[1]);
  expect(scripts.length).toBeGreaterThan(0);
  const failures=scripts.map(scriptSyntaxError).filter(Boolean);
  expect(failures,failures.join('\n\n')).toEqual([]);
});

test('A/B/C generated template hash matches rebuilt runtime output',async({page},testInfo)=>{
  test.skip(testInfo.project.name.includes('mobile'),'desktop provenance diagnostic');
  page.on('dialog',dialog=>dialog.accept());
  await page.goto('/');
  await dismissWelcome(page);
  await page.locator('#v99SmartComposeBtn').click();
  await page.locator('#v99Outline').fill(`# Provenance diagnostic\n\n## 推进流程\n- 明确问题\n- 形成方案\n- 小步验证\n- 交付复盘`);
  await page.locator('#v99GenerateBtn').click();
  await expect(page.locator('.v99-smart-overlay')).toHaveCount(0);
  const nodeId=await page.evaluate(()=>globalThis.MindDeckApp.getProject().children.find(node=>node.title==='推进流程')?.id);
  await page.evaluate(id=>globalThis.MindDeckApp.openEditor('slide',id),nodeId);
  const before=await page.evaluate(id=>globalThis.MindDeckApp.getProject().children.find(node=>node.id===id)?.composer?.selectedTemplateId,nodeId);
  await page.locator('#v99PageDesignerBtn').click();
  const ids=await page.locator('.v99-smart-template').evaluateAll(nodes=>nodes.map(node=>node.dataset.template));
  const next=ids.find(id=>id&&id!==before);
  await page.locator(`.v99-smart-template[data-template="${next}"]`).click();
  await page.locator('#v99ApplyTemplate').click();
  await expect(page.locator('.v99-smart-overlay')).toHaveCount(0);
  await page.waitForTimeout(50);
  const state=await page.evaluate(id=>{
    const project=globalThis.MindDeckApp.getProject();
    const node=project.children.find(item=>item.id===id);
    const C=globalThis.MindDeckCore.Composer;
    const rebuilt=C.buildSlideElements(node,{templateId:node.composer.selectedTemplateId,params:node.composer.selectedTemplateParams,role:node.composer.role,theme:node.deckTheme,density:node.deckDensity});
    return {
      templateId:node.composer.selectedTemplateId,
      generatedHash:node.composer.generatedHash,
      currentHash:C.Provenance.hashElements(node.slideElements),
      rebuiltHash:C.Provenance.hashElements(rebuilt),
      dirty:C.Provenance.isDirty(node),
      current:node.slideElements.map(e=>({id:e.id,type:e.type,x:e.x,y:e.y,w:e.w,h:e.h,z:e.z,animation:e.animation,fontFamily:e.fontFamily,lineHeight:e.lineHeight,letterSpacing:e.letterSpacing,opacity:e.opacity,shadow:e.shadow})),
      rebuilt:rebuilt.map(e=>({id:e.id,type:e.type,x:e.x,y:e.y,w:e.w,h:e.h,z:e.z,animation:e.animation,fontFamily:e.fontFamily,lineHeight:e.lineHeight,letterSpacing:e.letterSpacing,opacity:e.opacity,shadow:e.shadow}))
    };
  },nodeId);
  expect(state.dirty,JSON.stringify(state,null,2)).toBe(false);
});
