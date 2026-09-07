import { test, expect } from '@playwright/test';

async function dismissWelcome(page){
  await page.waitForTimeout(350);
  const overlay=page.locator('#welcomeOverlay');
  if(await overlay.isVisible())await page.locator('#welcomeClose').click();
  await expect(overlay).not.toHaveClass(/open/);
}

async function openMobileComposeMode(page,mode){
  await page.locator('#v99SmartMobileBtn').click();
  await expect(page.locator('.compose-v10-modebar')).toBeVisible();
  if(mode!=='ai')await page.locator(`[data-compose-mode="${mode}"]`).click();
}

test('mobile mindmap exposes one unified compose entry with AI local and DeckSpec modes',async({page},testInfo)=>{
  test.skip(!testInfo.project.name.includes('mobile'),'mobile entry verification');
  await page.goto('/');
  await dismissWelcome(page);
  await page.locator('#mindmapModeBtn').click();
  await expect(page.locator('body')).toHaveClass(/mindmap-mode/);

  await expect(page.locator('#v99SmartMobileBtn')).toBeVisible();
  await expect(page.locator('#aiV10MobileComposeBtn')).toHaveCount(0);

  await openMobileComposeMode(page,'ai');
  await expect(page.locator('#aiV10Source')).toBeVisible();
  await expect(page.locator('[data-compose-mode="ai"]')).toHaveClass(/active/);
  await page.locator('[data-compose-mode="local"]').click();
  await expect(page.locator('#v99Outline')).toBeVisible();
  await page.locator('[data-compose-mode="deckspec"]').click();
  await expect(page.locator('#v99DeckSpecJson')).toBeVisible();
  await page.locator('#v99DeckSpecCancel').click();
});
