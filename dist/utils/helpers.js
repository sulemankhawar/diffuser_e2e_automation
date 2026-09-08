"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.clickElement = clickElement;
exports.fillInput = fillInput;
exports.waitForText = waitForText;
exports.captureDebugScreenshot = captureDebugScreenshot;
const test_1 = require("@playwright/test");
async function clickElement(page, selector) {
    await page.locator(selector).click();
}
async function fillInput(page, selector, value) {
    await page.locator(selector).fill(value);
}
async function waitForText(page, text) {
    await (0, test_1.expect)(page.getByText(text)).toBeVisible();
}
async function captureDebugScreenshot(page, testInfo, fileName = 'debug.png') {
    const screenshot = await page.screenshot({ fullPage: true });
    await testInfo.attach(fileName, {
        body: screenshot,
        contentType: 'image/png',
    });
}
