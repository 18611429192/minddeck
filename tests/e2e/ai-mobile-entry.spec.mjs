import { test, expect } from '@playwright/test';

async function dismissWelcome(page){
  await page.waitForTimeout(350);
  const overlay=page.locator('#welcomeOverlay');
  if(await overlay.isVisible())await page.locator('#welcomeClose').click();
  await expect(overlay).not.toHaveClass(/open/);
}

test('mobile mindmap exposes local compose and DeepSeek compose as separate real entries',async({page},testInfo)=>{
  test.skip(!testInfo.project.name.includes('mobile'),'mobile entry verification');
  await page.goto('/');
  await dismissWelcome(page);
  await page.locator('#mindmapModeBtn').click();
  await expect(page.locator('body')).toHaveClass(/mindmap-mode/);

  await expect(page.locator('#v99SmartMobileBtn')).toBeVisible();
  await page.locator('#v99SmartMobileBtn').click();
  await expect(page.locator('#v99Outline')).toBeVisible();
  await page.locator('#v99CancelBtn').click();

  await expect(page.locator('#aiV10MobileComposeBtn')).toBeVisible();
  await page.locator('#aiV10MobileComposeBtn').click();
  await expect(page.locator('#aiV10Source')).toBeVisible();
  await page.locator('#aiV10ComposeCancel').click();
});
