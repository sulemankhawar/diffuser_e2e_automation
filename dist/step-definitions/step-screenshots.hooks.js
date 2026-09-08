"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const playwright_bdd_1 = require("playwright-bdd");
const { AfterStep } = (0, playwright_bdd_1.createBdd)();
function safeName(value) {
    return value
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 80);
}
AfterStep(async ({ page, $testInfo, $step, $bddContext }) => {
    if (page.isClosed()) {
        return;
    }
    const stepIndex = $bddContext.stepIndex + 1;
    const stepTitle = $step.title?.trim() || `step-${stepIndex}`;
    const attachmentName = `${String(stepIndex).padStart(2, '0')}-${safeName(stepTitle)}.png`;
    const body = await page.screenshot({
        fullPage: true,
        timeout: 10_000,
    });
    await $testInfo.attach(attachmentName, {
        body,
        contentType: 'image/png',
    });
});
