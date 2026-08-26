import { test, expect } from '@playwright/test';

test('app exposes one runtime and the public app adapter',async({page})=>{
  await page.goto('/');
  await expect.poll(()=>page.evaluate(()=>globalThis.MindDeckCore?.VERSION)).toBe('9.8.0');
  await expect.poll(()=>page.evaluate(()=>globalThis.MindDeckApp?.runtimeVersion)).toBe('9.8.0');
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
  expect(html).toContain('Portable Runtime 9.8.0');
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
