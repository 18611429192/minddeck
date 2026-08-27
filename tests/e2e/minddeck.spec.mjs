import { test, expect } from '@playwright/test';

test('app exposes one runtime and the public app adapter',async({page})=>{
  await page.goto('/');
  await expect.poll(()=>page.evaluate(()=>globalThis.MindDeckCore?.VERSION)).toBe('9.9.0');
  await expect.poll(()=>page.evaluate(()=>globalThis.MindDeckApp?.runtimeVersion)).toBe('9.9.0');
  await expect.poll(()=>page.evaluate(()=>globalThis.MindDeckCore?.Composer?.templates?.length)).toBe(24);
});

test('Pages showcase enters the real presentation view',async({page})=>{
  await page.goto('/?showcase=1');
  await expect(page.locator('#presentShell')).toHaveClass(/open/);
  await expect(page.locator('#tocTree')).not.toBeEmpty();
  await expect(page.locator('#presentStage')).not.toBeEmpty();
});

test('folding a showcase branch changes the real presentation sequence',async({page})=>{
  await page.goto('/?showcase=1');
  const fold=page.locator('.toc-item .fold-mini').filter({hasText:/[+−-]/}).first();
  await expect(fold).toBeAttached();
  if(!(await fold.isVisible()))await page.locator('#presentTocToggle').click();
  const before=await page.locator('.toc-item').count();
  await fold.click();
  await expect.poll(()=>page.locator('.toc-item').count()).toBeLessThan(before);
});

test('portable presentation is generated from the shared shell/runtime',async({page})=>{
  await page.goto('/');
  const html=await page.evaluate(()=>globalThis.MindDeckApp.exportHtml('presentation'));
  expect(html).toContain('Portable Runtime 9.9.0');
  expect(html).toContain('MindDeckCore.Portable.mount');
  expect(html).toContain('id="stage"');
});

test('master editor keeps the fixed 1600x900 virtual stage',async({page})=>{
  await page.goto('/');
  await page.evaluate(()=>globalThis.MindDeckApp.openEditor('master'));
  await expect(page.locator('#editorShell')).toHaveClass(/open/);
  await expect(page.locator('#editorStage')).toHaveCSS('width','1600px');
  await expect(page.locator('#editorStage')).toHaveCSS('height','900px');
});

test('Smart Deck → edit → A/B/C relayout → dirty protection → Presentation → Portable',async({page},testInfo)=>{
  test.skip(testInfo.project.name.includes('mobile'),'desktop freeform workflow coverage');
  page.on('dialog',dialog=>dialog.accept());

  await test.step('generate a Smart Deck through the real UI',async()=>{
    await page.goto('/');
    await expect(page.locator('#v99SmartComposeBtn')).toBeVisible();
    await page.locator('#v99SmartComposeBtn').click();
    await page.locator('#v99Outline').fill(`# V9.9 E2E
> Shared Runtime Composer

## 核心指标
- 32% 转化提升
- 4.8x 效率提升
- 12 周交付

## 推进流程
- 明确问题
- 形成方案
- 小步验证
- 交付复盘

## 方案对比
- 原方案路径长
- 新方案聚焦关键动作

## 结论与下一步
- 确认负责人
- 两周验证
- 复盘结果`);
    await page.locator('#v99GenerateBtn').click();
    await expect(page.locator('.v99-smart-overlay')).toHaveCount(0);
    await expect.poll(()=>page.evaluate(()=>globalThis.MindDeckApp.getProject().deckComposerVersion)).toBe('9.9');
    await expect.poll(()=>page.evaluate(()=>globalThis.MindDeckCore.Composer.Quality.validateProject(globalThis.MindDeckApp.getProject()).ok)).toBe(true);
  });

  const processId=await page.evaluate(()=>globalThis.MindDeckApp.getProject().children.find(node=>node.title==='推进流程')?.id);
  expect(processId).toBeTruthy();

  await test.step('open the generated page and switch to a different A/B/C template',async()=>{
    await page.evaluate(id=>globalThis.MindDeckApp.openEditor('slide',id),processId);
    await expect(page.locator('#editorShell')).toHaveClass(/open/);
    await expect(page.locator('#v99PageDesignerBtn')).toBeVisible();

    const beforeTemplate=await page.evaluate(id=>globalThis.MindDeckApp.getProject().children.find(node=>node.id===id)?.composer?.selectedTemplateId,processId);
    await page.locator('#v99PageDesignerBtn').click();
    await expect(page.locator('.v99-smart-template')).toHaveCount(3);

    const candidateIds=await page.locator('.v99-smart-template').evaluateAll(nodes=>nodes.map(node=>node.dataset.template));
    const nextTemplate=candidateIds.find(id=>id&&id!==beforeTemplate);
    expect(nextTemplate).toBeTruthy();
    await page.locator(`.v99-smart-template[data-template="${nextTemplate}"]`).click();
    await page.locator('#v99ApplyTemplate').click();
    await expect(page.locator('.v99-smart-overlay')).toHaveCount(0);

    const afterTemplate=await page.evaluate(id=>globalThis.MindDeckApp.getProject().children.find(node=>node.id===id)?.composer?.selectedTemplateId,processId);
    expect(afterTemplate).toBe(nextTemplate);
    expect(afterTemplate).not.toBe(beforeTemplate);
    await expect.poll(()=>page.evaluate(id=>{
      const node=globalThis.MindDeckApp.getProject().children.find(item=>item.id===id);
      return globalThis.MindDeckCore.Composer.Provenance.isDirty(node);
    },processId)).toBe(false);
  });

  let dirtyElementsJson='';
  await test.step('make a manual edit and verify provenance becomes dirty',async()=>{
    const editable=page.locator('#editorStage .canvas-el[data-master="0"]').first();
    await expect(editable).toBeVisible();
    await editable.click();
    await page.keyboard.press('Shift+ArrowRight');
    await expect.poll(()=>page.evaluate(id=>{
      const node=globalThis.MindDeckApp.getProject().children.find(item=>item.id===id);
      return globalThis.MindDeckCore.Composer.Provenance.isDirty(node);
    },processId)).toBe(true);
    dirtyElementsJson=await page.evaluate(id=>JSON.stringify(globalThis.MindDeckApp.getProject().children.find(node=>node.id===id).slideElements),processId);
  });

  await test.step('show the dirty warning and protect manual edits during whole-deck retheme',async()=>{
    await page.locator('#v99PageDesignerBtn').click();
    await expect(page.locator('#v99DirtyWarning')).toBeVisible();
    await page.locator('#v99PageTheme').selectOption('forest');
    await page.locator('#v99RethemeAll').click();
    await expect(page.locator('.v99-smart-overlay')).toHaveCount(0);

    const protectedState=await page.evaluate(id=>{
      const project=globalThis.MindDeckApp.getProject();
      const node=project.children.find(item=>item.id===id);
      return {
        elementsJson:JSON.stringify(node.slideElements),
        dirty:globalThis.MindDeckCore.Composer.Provenance.isDirty(node),
        warnings:project.composerWarnings||[]
      };
    },processId);
    expect(protectedState.elementsJson).toBe(dirtyElementsJson);
    expect(protectedState.dirty).toBe(true);
    expect(protectedState.warnings.some(item=>item.code==='COMPOSER_DIRTY'&&item.nodeId===processId)).toBe(true);
  });

  await test.step('reuse the same Project in Presentation and Portable',async()=>{
    await page.locator('#backToMapBtn').click();
    await page.evaluate(()=>globalThis.MindDeckApp.enterPresentation({fullscreen:false}));
    await expect(page.locator('#presentShell')).toHaveClass(/open/);
    await expect(page.locator('#presentStage')).not.toBeEmpty();
    const html=await page.evaluate(()=>globalThis.MindDeckApp.exportHtml('presentation'));
    expect(html).toContain('V9.9 E2E');
    expect(html).toContain('Portable Runtime 9.9.0');
    expect(html).toContain('MindDeckCore.Portable.mount');
  });
});
