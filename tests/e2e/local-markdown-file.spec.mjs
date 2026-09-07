import { test, expect } from '@playwright/test';

test.setTimeout(120000);

async function dismissWelcome(page){
  await page.waitForTimeout(320);
  const overlay=page.locator('#welcomeOverlay');
  if(await overlay.isVisible())await page.locator('#welcomeClose').click();
}

test('local Markdown mode opens .md files and never fails silently on generate',async({page},testInfo)=>{
  test.skip(testInfo.project.name.includes('mobile'),'desktop local Markdown file import');
  const dialogs=[];
  page.on('dialog',async dialog=>{dialogs.push(dialog.type());await dialog.dismiss()});
  await page.goto('/');
  await dismissWelcome(page);

  await page.locator('#v99SmartComposeBtn').click();
  await expect(page.locator('#aiV10Source')).toBeVisible();
  await page.locator('[data-compose-mode="local"]').click();
  await expect(page.locator('#v99Outline')).toBeVisible();
  await expect(page.locator('#v99MarkdownFileBtn')).toBeVisible();

  const markdown=`# 工作任务总览\n> 按任务聚合同类工作\n\n## 密钥管理\n- 完成协议整理\n- 联调设备接口\n\n## MindDeck\n- 修复本地 Markdown 导入\n- 验证整套演示生成`;
  await page.locator('#v99MarkdownFile').setInputFiles({name:'工作任务.md',mimeType:'text/markdown',buffer:Buffer.from(markdown)});
  await expect(page.locator('#v99Outline')).toHaveValue(markdown);
  await expect(page.locator('#v99LocalComposeStatus')).toContainText('已读取 工作任务.md');
  await expect(page.locator('#v99Preview')).toContainText('3 页');

  const generate=page.locator('#v99GenerateBtn');
  await generate.click();
  await expect(page.locator('.v99-smart-overlay')).toBeVisible();
  await expect(page.locator('#v99LocalComposeStatus')).toContainText('请再次点击');
  await expect(generate).toHaveText('确认替换并生成');
  expect(dialogs).toEqual([]);

  await generate.click();
  await expect(page.locator('.v99-smart-overlay')).toHaveCount(0);
  const project=await page.evaluate(()=>structuredClone(globalThis.MindDeckApp.getProject()));
  expect(project.title).toBe('工作任务总览');
  expect(project.children).toHaveLength(2);
  expect(dialogs).toEqual([]);
});
