import { expect, Page, TestInfo } from '@playwright/test';

export async function clickElement(page: Page, selector: string): Promise<void> {
  await page.locator(selector).click();
}

export async function fillInput(page: Page, selector: string, value: string): Promise<void> {
  await page.locator(selector).fill(value);
}

export async function waitForText(page: Page, text: string): Promise<void> {
  await expect(page.getByText(text)).toBeVisible();
}

export async function captureDebugScreenshot(
  page: Page,
  testInfo: TestInfo,
  fileName = 'debug.png',
): Promise<void> {
  const screenshot = await page.screenshot({ fullPage: true });
  await testInfo.attach(fileName, {
    body: screenshot,
    contentType: 'image/png',
  });
}
