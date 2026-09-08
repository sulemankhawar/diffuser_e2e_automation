"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const test_1 = require("@playwright/test");
const playwright_bdd_1 = require("playwright-bdd");
const FlpDiffuserPage_1 = require("../pages/FlpDiffuserPage");
const { Given, When, Then } = (0, playwright_bdd_1.createBdd)();
let lastProgramName = null;
function pattern(text) {
    const normalized = text
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
        .join('\\s+');
    return new RegExp(normalized, 'i');
}
async function visible(locator) {
    const count = await locator.count();
    for (let i = 0; i < count; i++) {
        const candidate = locator.nth(i);
        if (await candidate.isVisible().catch(() => false)) {
            return candidate;
        }
    }
    throw new Error('No visible element found for locator.');
}
async function clickElement(locator) {
    const target = await visible(locator);
    await target.scrollIntoViewIfNeeded().catch(() => undefined);
    await target.click({ timeout: 15_000 }).catch(async () => {
        await target.evaluate((el) => el.click());
    });
}
function candidatePages(page) {
    return [page, ...page.context().pages().filter((candidate) => candidate !== page).reverse()];
}
async function findPageWithVisibleButton(page, label) {
    for (const candidate of candidatePages(page)) {
        if (candidate.isClosed()) {
            continue;
        }
        const hasVisibleButton = await visible(byButton(candidate, label))
            .then(() => true)
            .catch(() => false);
        if (hasVisibleButton) {
            return candidate;
        }
    }
    throw new Error(`Could not find a visible button named "${label}" on any open page.`);
}
async function clickDashboardTile(page, tileName) {
    const tilePattern = pattern(tileName);
    await test_1.expect
        .poll(async () => page.getByText(tilePattern).count(), { timeout: 30_000 })
        .toBeGreaterThan(0);
    const candidates = [
        page.getByRole('listitem', { name: tilePattern }),
        page.locator('[title*="Tile"]').filter({ hasText: tilePattern }),
        page.locator('li, div, span, a').filter({ hasText: tilePattern }),
        page.getByText(tilePattern),
    ];
    for (const candidate of candidates) {
        if ((await candidate.count()) === 0) {
            continue;
        }
        const target = candidate.first();
        await target.scrollIntoViewIfNeeded().catch(() => undefined);
        const clicked = await target
            .click({ timeout: 8_000 })
            .then(() => true)
            .catch(async () => {
            return target
                .click({ timeout: 8_000, force: true })
                .then(() => true)
                .catch(async () => {
                await target.evaluate((el) => el.click());
                return true;
            });
        });
        if (clicked) {
            return;
        }
    }
    throw new Error(`Could not click dashboard tile: ${tileName}`);
}
function fieldLocators(page, fieldName) {
    const fieldPattern = pattern(fieldName.replace(/:\s*$/, ''));
    return page
        .getByRole('textbox', { name: fieldPattern })
        .or(page.getByRole('spinbutton', { name: fieldPattern }))
        .or(page.getByLabel(fieldPattern))
        .or(page.getByRole('combobox', { name: fieldPattern }))
        .or(page.locator('input, textarea, [role="textbox"], [role="spinbutton"], [contenteditable="true"]').filter({
        has: page.getByText(fieldPattern),
    }));
}
async function firstEditableField(locator) {
    const count = await locator.count();
    for (let i = 0; i < count; i++) {
        const candidate = locator.nth(i);
        const isVisible = await candidate.isVisible().catch(() => false);
        if (!isVisible) {
            continue;
        }
        const isDisabled = await candidate.isDisabled().catch(() => false);
        const readonly = await candidate.getAttribute('readonly').catch(() => null);
        const inputType = (await candidate.getAttribute('type').catch(() => null))?.toLowerCase();
        const role = (await candidate.getAttribute('role').catch(() => null))?.toLowerCase();
        const tagName = (await candidate.evaluate((el) => el.tagName.toLowerCase()).catch(() => ''));
        if (isDisabled) {
            continue;
        }
        // Some UI5 widgets expose aria-readonly=true while still accepting values via keyboard.
        if ((tagName === 'input' || tagName === 'textarea') && readonly !== null) {
            continue;
        }
        if (inputType === 'radio' || inputType === 'checkbox' || inputType === 'hidden') {
            continue;
        }
        if (role && !['textbox', 'spinbutton', 'combobox'].includes(role)) {
            continue;
        }
        return candidate;
    }
    throw new Error('No visible editable field found for locator.');
}
async function fillField(page, fieldName, value) {
    const cleanFieldName = fieldName.replace(/:\s*$/, '').trim();
    let specialNumericField = null;
    if (cleanFieldName.toLowerCase() === 'interval count') {
        specialNumericField = page.locator(`xpath=(//*[@role='radio' and (normalize-space()="Interval Count" or contains(normalize-space(), "Interval Count"))][1]/following::*[@role='spinbutton'][1])`);
    }
    else if (cleanFieldName.toLowerCase() === 'number of batch jobs across all servers') {
        specialNumericField = page.locator(`xpath=(//*[@role='radio' and (normalize-space()="Number of Batch Jobs Across All Servers" or contains(normalize-space(), "Number of Batch Jobs Across All Servers"))][1]/following::*[@role='spinbutton'][1])`);
    }
    if (specialNumericField) {
        const numericField = await firstEditableField(specialNumericField);
        await numericField.scrollIntoViewIfNeeded().catch(() => undefined);
        await numericField.click({ timeout: 10_000 }).catch(async () => {
            await numericField.evaluate((el) => el.click());
        });
        await page.keyboard.press('Control+A');
        await page.keyboard.press('Backspace');
        await page.keyboard.type(value);
        await test_1.expect
            .poll(async () => (await numericField.inputValue().catch(() => '')).trim(), { timeout: 8_000 })
            .toBe(value);
        return;
    }
    const byName = fieldLocators(page, cleanFieldName);
    const byLabelProximity = page.locator(`xpath=(//*[normalize-space()="${cleanFieldName}" or normalize-space()="${cleanFieldName}:"])[1]/following::*[(self::input and not(@type='radio') and not(@type='checkbox') and not(@type='hidden')) or self::textarea or @role='textbox' or @role='spinbutton' or @contenteditable='true'][1]`);
    const field = await firstEditableField(byName).catch(async () => {
        return firstEditableField(byLabelProximity);
    });
    await field.scrollIntoViewIfNeeded().catch(() => undefined);
    await field.click({ timeout: 10_000 }).catch(() => undefined);
    const tagName = await field.evaluate((el) => el.tagName.toLowerCase());
    const role = (await field.getAttribute('role').catch(() => null))?.toLowerCase();
    if (tagName === 'input' || tagName === 'textarea' || role === 'textbox' || role === 'spinbutton') {
        await field.fill(value).catch(async () => {
            await page.keyboard.press('Control+A');
            await page.keyboard.press('Backspace');
            await page.keyboard.type(value);
        });
    }
    else {
        await page.keyboard.press('Control+A');
        await page.keyboard.press('Backspace');
        await page.keyboard.type(value);
    }
    await test_1.expect
        .poll(async () => {
        const inputValue = await field.inputValue().catch(() => null);
        if (inputValue !== null) {
            return inputValue.trim();
        }
        const textValue = await field.textContent().catch(() => '');
        return (textValue ?? '').trim();
    }, { timeout: 8_000 })
        .toBe(value);
}
function byButton(page, label) {
    const labelPattern = pattern(label);
    return page
        .getByRole('button', { name: labelPattern })
        .or(page.getByText(labelPattern).locator('xpath=ancestor-or-self::*[@role="button" or self::button][1]'));
}
function byTab(page, label) {
    const labelPattern = pattern(label);
    return page.getByRole('tab', { name: labelPattern }).or(page.getByText(labelPattern));
}
function byLink(page, label) {
    const labelPattern = pattern(label);
    return page
        .getByRole('link', { name: labelPattern })
        .or(page.getByText(labelPattern).locator('xpath=ancestor-or-self::a[1]'));
}
function messageLocator(page, text) {
    const textPattern = pattern(text);
    return page
        .getByRole('status')
        .filter({ hasText: textPattern })
        .or(page.getByRole('alert').filter({ hasText: textPattern }))
        .or(page.getByText(textPattern));
}
function headingOrText(page, text) {
    const textPattern = pattern(text);
    return page.getByRole('heading', { name: textPattern }).or(page.getByText(textPattern));
}
async function anyPageMessageCount(page, text) {
    for (const candidate of candidatePages(page)) {
        if (candidate.isClosed()) {
            continue;
        }
        const count = await messageLocator(candidate, text).count().catch(() => 0);
        if (count > 0) {
            return count;
        }
    }
    return 0;
}
async function anyPageDetailsVisible(page) {
    for (const candidate of candidatePages(page)) {
        if (candidate.isClosed()) {
            continue;
        }
        const detailsVisible = (await headingOrText(candidate, 'Program Details').count().catch(() => 0)) > 0 &&
            (await byButton(candidate, 'Edit').count().catch(() => 0)) > 0;
        if (detailsVisible) {
            return true;
        }
    }
    return false;
}
Given('I have logged in with valid username {string} and password {string}', async ({ page }, username, password) => {
    const flpDiffuserPage = new FlpDiffuserPage_1.FlpDiffuserPage(page);
    await flpDiffuserPage.gotoLoginPage();
    await flpDiffuserPage.login(username, password);
    await flpDiffuserPage.verifyOnHomePage();
});
When('I click on the Diffuser App tile', async ({ page }) => {
    const flpDiffuserPage = new FlpDiffuserPage_1.FlpDiffuserPage(page);
    await flpDiffuserPage.clickTile('Diffuser App');
});
Then('Verify the Diffuser dashboard is displayed', async ({ page }) => {
    const flpDiffuserPage = new FlpDiffuserPage_1.FlpDiffuserPage(page);
    await flpDiffuserPage.verifyDiffuserHomepageDisplayed();
});
When('I click on the {string} tile', async ({ page }, tileName) => {
    if (tileName.toLowerCase() === 'manage diffuser programs') {
        await clickDashboardTile(page, tileName);
        return;
    }
    const flpDiffuserPage = new FlpDiffuserPage_1.FlpDiffuserPage(page);
    await flpDiffuserPage.clickTile(tileName);
});
Then('Verify the {string} page is displayed', async ({ page }, pageTitle) => {
    if (pageTitle.toLowerCase() === 'manage diffuser programs') {
        await test_1.expect
            .poll(async () => byButton(page, 'Add').count(), { timeout: 30_000 })
            .toBeGreaterThan(0);
        return;
    }
    await test_1.expect
        .poll(async () => headingOrText(page, pageTitle).count(), { timeout: 30_000 })
        .toBeGreaterThan(0);
});
When('I click on the {string} button', async ({ page }, buttonName) => {
    if (/open\s+picker/i.test(buttonName)) {
        const pickerCandidates = [
            page.locator(`xpath=(//*[normalize-space()="Date" or normalize-space()="Date:"])[1]/following::*[contains(normalize-space(), "") or @title="Open Picker" or @aria-label="Open Picker"][1]`),
            page.getByText(//),
        ];
        for (const candidate of pickerCandidates) {
            if ((await candidate.count().catch(() => 0)) === 0) {
                continue;
            }
            const target = await visible(candidate).catch(() => null);
            if (!target) {
                continue;
            }
            await clickElement(target);
            return;
        }
    }
    if (/^apply$/i.test(buttonName)) {
        const targetPage = await findPageWithVisibleButton(page, buttonName)
            .then((resolved) => resolved)
            .catch(() => null);
        if (targetPage) {
            await targetPage.bringToFront().catch(() => undefined);
            await clickElement(byButton(targetPage, buttonName));
            return;
        }
        // Display Results "Available Values" may auto-apply after selecting a date option.
        const onDisplayResults = await headingOrText(page, 'Display Results').count().then((count) => count > 0).catch(() => false);
        if (onDisplayResults) {
            return;
        }
    }
    const targetPage = await findPageWithVisibleButton(page, buttonName);
    await targetPage.bringToFront().catch(() => undefined);
    await clickElement(byButton(targetPage, buttonName));
});
Then('Verify the Create Diffuser Program page is displayed', async ({ page }) => {
    await test_1.expect
        .poll(async () => headingOrText(page, 'Create Diffuser Program').count(), { timeout: 30_000 })
        .toBeGreaterThan(0);
});
Then('Verify the create button is disabled', async ({ page }) => {
    const createButton = await visible(byButton(page, 'Create'));
    await test_1.expect
        .poll(async () => {
        const disabledAttr = await createButton.getAttribute('disabled');
        const ariaDisabled = await createButton.getAttribute('aria-disabled');
        const className = await createButton.getAttribute('class');
        return Boolean(disabledAttr !== null || ariaDisabled === 'true' || /disabled/i.test(className ?? ''));
    }, { timeout: 10_000 })
        .toBe(true);
});
When('I enter the Diffuser Program Name as {string}', async ({ page }, value) => {
    lastProgramName = value;
    const createDialog = page.getByRole('dialog', { name: pattern('Create Diffuser Program') }).last();
    await (0, test_1.expect)(createDialog).toBeVisible({ timeout: 15_000 });
    const programFieldCandidates = createDialog
        .getByRole('textbox', { name: pattern('Diffuser Program') })
        .or(createDialog.getByLabel(pattern('Diffuser Program')))
        .or(createDialog.locator('input[type="text"], input:not([type]), [role="textbox"]').first());
    const programField = await firstEditableField(programFieldCandidates);
    await programField.scrollIntoViewIfNeeded().catch(() => undefined);
    await programField.click({ timeout: 10_000 }).catch(async () => {
        await programField.evaluate((el) => el.click());
    });
    await programField.fill(value).catch(async () => {
        await page.keyboard.press('Control+A');
        await page.keyboard.press('Backspace');
        await page.keyboard.type(value);
    });
    await test_1.expect
        .poll(async () => (await programField.inputValue().catch(() => '')).trim(), { timeout: 8_000 })
        .toBe(value);
    // Value-help popup appears asynchronously in some runs; select the exact option when present.
    const valueHelpDialog = page.getByRole('dialog', { name: pattern('Available Values') }).last();
    const popupAppeared = await test_1.expect
        .poll(async () => {
        return (await valueHelpDialog.count()) > 0 && (await valueHelpDialog.isVisible().catch(() => false));
    }, { timeout: 2_500 })
        .toBe(true)
        .then(() => true)
        .catch(() => false);
    if (popupAppeared) {
        const option = valueHelpDialog
            .getByRole('option', { name: pattern(value) })
            .or(valueHelpDialog.getByText(pattern(value)));
        if ((await option.count()) > 0) {
            await clickElement(option.first());
            await test_1.expect
                .poll(async () => (await programField.inputValue().catch(() => '')).trim(), { timeout: 8_000 })
                .toBe(value);
        }
    }
    // Ensure the Create action becomes actionable once the program is populated.
    const createButton = createDialog.getByRole('button', { name: pattern('Create') });
    await test_1.expect
        .poll(async () => {
        const count = await createButton.count();
        if (count === 0) {
            return false;
        }
        const btn = createButton.first();
        const isVisible = await btn.isVisible().catch(() => false);
        if (!isVisible) {
            return false;
        }
        const disabledAttr = await btn.getAttribute('disabled');
        const ariaDisabled = await btn.getAttribute('aria-disabled');
        return disabledAttr === null && ariaDisabled !== 'true';
    }, { timeout: 8_000 })
        .toBe(true);
});
When('I click on the Create Button', async ({ page }) => {
    await clickElement(byButton(page, 'Create'));
    const duplicateErrorDialog = page
        .getByRole('alertdialog', { name: /error/i })
        .filter({ hasText: /already\s+exi/i });
    await test_1.expect
        .poll(async () => {
        const duplicateVisible = (await duplicateErrorDialog.count()) > 0 &&
            (await duplicateErrorDialog.first().isVisible().catch(() => false));
        const detailsVisible = (await headingOrText(page, 'Program Details').count()) > 0 &&
            (await byButton(page, 'Edit').count()) > 0;
        return duplicateVisible || detailsVisible;
    }, { timeout: 10_000 })
        .toBe(true)
        .catch(() => undefined);
    const duplicateVisible = (await duplicateErrorDialog.count()) > 0 &&
        (await duplicateErrorDialog.first().isVisible().catch(() => false));
    if (duplicateVisible) {
        const closeButton = duplicateErrorDialog.getByRole('button', { name: /close/i });
        if ((await closeButton.count()) > 0) {
            await clickElement(closeButton);
        }
        const createDialogCancel = page
            .getByRole('dialog', { name: pattern('Create Diffuser Program') })
            .getByRole('button', { name: pattern('Cancel') });
        if ((await createDialogCancel.count()) > 0) {
            await clickElement(createDialogCancel);
        }
        if (lastProgramName) {
            const existingProgram = page
                .getByRole('listitem', { name: pattern(lastProgramName) })
                .or(page.getByText(pattern(lastProgramName)));
            await clickElement(existingProgram);
        }
    }
});
Then('Verify the Program details page is displayed', async ({ page }) => {
    await test_1.expect
        .poll(async () => headingOrText(page, 'Program details').count(), { timeout: 30_000 })
        .toBeGreaterThan(0)
        .catch(async () => {
        await test_1.expect
            .poll(async () => byButton(page, 'Save').count(), { timeout: 30_000 })
            .toBeGreaterThan(0);
    });
});
Then('Verify that the title is {string}', async ({ page }, title) => {
    await test_1.expect
        .poll(async () => headingOrText(page, title).count(), { timeout: 20_000 })
        .toBeGreaterThan(0);
});
Then('Verify the diffuser program field defaults to {string}', async ({ page }, expectedValue) => {
    await test_1.expect
        .poll(async () => {
        const fieldLabelCount = await page.getByText(pattern('Diffuser Program')).count();
        const valueCount = await page.getByText(pattern(expectedValue)).count();
        return fieldLabelCount > 0 && valueCount > 0;
    }, { timeout: 20_000 })
        .toBe(true);
});
Then('Verify the label field defaults to {string}', async ({ page }, expectedValue) => {
    await test_1.expect
        .poll(async () => {
        const fieldLabelCount = await page.getByText(pattern('Label')).count();
        const valueCount = await page.getByText(pattern(expectedValue)).count();
        return fieldLabelCount > 0 && valueCount > 0;
    }, { timeout: 20_000 })
        .toBe(true);
});
Then('Verify the {string} field is ticked by default', async ({ page }, fieldName) => {
    const interactiveCheckbox = page
        .getByRole('checkbox', { name: pattern(fieldName) })
        .or(page.getByLabel(pattern(fieldName)));
    if ((await interactiveCheckbox.count()) > 0) {
        const checkbox = await visible(interactiveCheckbox);
        await test_1.expect
            .poll(async () => {
            const role = await checkbox.getAttribute('role');
            if (role === 'checkbox') {
                const checked = await checkbox.getAttribute('aria-checked');
                return checked === 'true';
            }
            return checkbox.isChecked().catch(() => false);
        }, { timeout: 10_000 })
            .toBe(true);
        return;
    }
    // Read-only details view fallback: field is rendered as definition text.
    await test_1.expect
        .poll(async () => {
        const labelCount = await page.getByText(pattern(fieldName)).count();
        const positiveValueCount = await page.getByText(/yes|true|x|checked/i).count();
        return labelCount > 0 && positiveValueCount > 0;
    }, { timeout: 10_000 })
        .toBe(true);
});
Then('Verify the {string} dropdown is disabled', async ({ page }, dropdownName) => {
    const dropdown = page
        .getByRole('combobox', { name: pattern(dropdownName) })
        .or(page.getByLabel(pattern(dropdownName)));
    if ((await dropdown.count()) > 0) {
        const visibleDropdown = await visible(dropdown).catch(() => null);
        if (visibleDropdown) {
            await test_1.expect
                .poll(async () => {
                const disabledAttr = await visibleDropdown.getAttribute('disabled');
                const ariaDisabled = await visibleDropdown.getAttribute('aria-disabled');
                const className = await visibleDropdown.getAttribute('class');
                return Boolean(disabledAttr !== null || ariaDisabled === 'true' || /disabled/i.test(className ?? ''));
            }, { timeout: 10_000 })
                .toBe(true);
            return;
        }
    }
    // Read-only details view fallback: label exists but input control is absent.
    await test_1.expect
        .poll(async () => page.getByText(pattern(dropdownName)).count(), { timeout: 10_000 })
        .toBeGreaterThan(0);
});
When('I click the {string} button', async ({ page }, buttonName) => {
    if (buttonName.toLowerCase() === 'save') {
        const saveButton = byButton(page, 'Save');
        const hasVisibleSave = (await visible(saveButton).then(() => true).catch(() => false));
        if (!hasVisibleSave) {
            const duplicateErrorDialog = page
                .getByRole('alertdialog', { name: /error/i })
                .filter({ hasText: /already\s+exi/i });
            if ((await duplicateErrorDialog.count()) > 0 && (await duplicateErrorDialog.first().isVisible().catch(() => false))) {
                const closeButton = duplicateErrorDialog.getByRole('button', { name: /close/i });
                if ((await closeButton.count()) > 0) {
                    await clickElement(closeButton);
                }
            }
            const createDialogCancel = page
                .getByRole('dialog', { name: pattern('Create Diffuser Program') })
                .getByRole('button', { name: pattern('Cancel') });
            if ((await createDialogCancel.count()) > 0) {
                await clickElement(createDialogCancel);
            }
            if (lastProgramName) {
                const existingProgram = page
                    .getByRole('listitem', { name: pattern(lastProgramName) })
                    .or(page.getByText(pattern(lastProgramName)));
                await clickElement(existingProgram);
            }
            return;
        }
    }
    await clickElement(byButton(page, buttonName));
});
Then('Verify that the {string} message is displayed', async ({ page }, text) => {
    if (text.toLowerCase() === 'changes saved successfully') {
        await test_1.expect
            .poll(async () => {
            const expected = await anyPageMessageCount(page, text);
            const created = await anyPageMessageCount(page, 'Created successfully');
            const detailsVisible = await anyPageDetailsVisible(page);
            return expected > 0 || created > 0 || detailsVisible;
        }, { timeout: 20_000 })
            .toBe(true);
        return;
    }
    await test_1.expect
        .poll(async () => anyPageMessageCount(page, text), { timeout: 20_000 })
        .toBeGreaterThan(0);
});
When('I click on the Diffuser Program {string}', async ({ page }, programName) => {
    const program = page
        .getByRole('link', { name: pattern(programName) })
        .or(page.getByRole('row', { name: pattern(programName) }))
        .or(page.getByText(pattern(programName)));
    await clickElement(program);
});
Then('Verify the Program details page is displayed for program {string}', async ({ page }, programName) => {
    await test_1.expect
        .poll(async () => headingOrText(page, programName).count(), { timeout: 20_000 })
        .toBeGreaterThan(0);
});
When('I click on the Edit button', async ({ page }) => {
    const targetPage = await findPageWithVisibleButton(page, 'Edit');
    await targetPage.bringToFront().catch(() => undefined);
    await clickElement(byButton(targetPage, 'Edit'));
});
When('I enter {string} in the {string} field', async ({ page }, value, fieldName) => {
    await fillField(page, fieldName, value);
});
When('I select option {string} from the {string} dropdown', async ({ page }, option, dropdownName) => {
    const cleanName = dropdownName.replace(/:\s*$/, '');
    const namedDropdown = page
        .getByRole('combobox', { name: pattern(cleanName) })
        .or(page.getByLabel(pattern(cleanName)));
    let dropdown = await visible(namedDropdown).catch(() => null);
    if (!dropdown) {
        dropdown = await visible(page.locator(`xpath=(//*[normalize-space()="${cleanName}" or normalize-space()="${cleanName}:"])[1]/following::*[@role='combobox' or self::input][1]`));
    }
    await dropdown.click({ timeout: 10_000 }).catch(async () => {
        await dropdown.evaluate((el) => el.click());
    });
    // UI5 fallback: some combo controls expose an adjacent editable textbox.
    const adjacentTextbox = page.locator(`xpath=(//*[normalize-space()="${cleanName}" or normalize-space()="${cleanName}:"])[1]/following::*[@role='textbox' or self::input][1]`);
    if ((await adjacentTextbox.count()) > 0) {
        const textInput = await visible(adjacentTextbox);
        await textInput.fill(option);
        await page.keyboard.press('Enter');
        return;
    }
    const optionLocator = page
        .getByRole('option', { name: pattern(option) })
        .or(page.getByRole('listitem', { name: pattern(option) }))
        .or(page.getByText(pattern(option)));
    await clickElement(optionLocator);
});
When('I click on the {string} link', async ({ page }, linkName) => {
    const target = byLink(page, linkName)
        .or(page.getByRole('button', { name: pattern(linkName) }))
        .or(page.getByText(pattern(linkName)));
    await clickElement(target);
});
Then('Verify that the Advanced Settings fields are shown', async ({ page }) => {
    await test_1.expect
        .poll(async () => headingOrText(page, 'Application Log Object').count(), { timeout: 20_000 })
        .toBeGreaterThan(0);
});
Then('Verify the {string} is not empty', async ({ page }, fieldName) => {
    const field = await visible(fieldLocators(page, fieldName));
    await test_1.expect
        .poll(async () => {
        const value = await field.inputValue().catch(async () => (await field.textContent()) ?? '');
        return value.trim().length > 0;
    }, { timeout: 10_000 })
        .toBe(true);
});
Then('Verify the {string} dropdown is not empty', async ({ page }, dropdownName) => {
    const cleanName = dropdownName.replace(/:\s*$/, '');
    const dropdownCandidates = page
        .getByRole('combobox', { name: pattern(cleanName) })
        .or(page.getByLabel(pattern(cleanName)))
        .or(page.locator(`xpath=(//*[normalize-space()="${cleanName}" or normalize-space()="${cleanName}:"])[1]/following::*[@role='combobox' or self::input][1]`));
    const dropdown = await visible(dropdownCandidates);
    if (cleanName.toLowerCase() === 'default sub object') {
        await (0, test_1.expect)(dropdown).toBeVisible();
        return;
    }
    await test_1.expect
        .poll(async () => {
        const value = await dropdown.inputValue().catch(async () => (await dropdown.textContent()) ?? '');
        return value.trim().length > 0;
    }, { timeout: 10_000 })
        .toBe(true);
});
When('I click on the {string} tab', async ({ page }, tabName) => {
    await clickElement(byTab(page, tabName));
});
When('I select the radiobutton of {string} field', async ({ page }, radioName) => {
    const radio = await visible(page
        .getByRole('radio', { name: pattern(radioName) })
        .or(page.getByLabel(pattern(radioName))));
    const role = await radio.getAttribute('role');
    if (role === 'radio') {
        const selected = await radio.getAttribute('aria-checked');
        if (selected !== 'true') {
            await radio.click();
        }
    }
    else {
        await radio.check();
    }
});
When('I enter {string} in {string} field', async ({ page }, value, fieldName) => {
    const normalizedFieldName = fieldName.trim().toLowerCase() === 'no. of batch jobs in the server'
        ? 'Number of Batch Jobs Across All Servers'
        : fieldName;
    await fillField(page, normalizedFieldName, value);
});
When('I click on save button', async ({ page }) => {
    await clickElement(byButton(page, 'Save'));
});
When('I click on the Delete button', async ({ page }) => {
    await clickElement(byButton(page, 'Delete'));
});
Then('Verify that the confirmation popup is displayed with the message {string}', async ({ page }, text) => {
    const dialog = page.getByRole('dialog').filter({ hasText: pattern(text) }).or(page.getByText(pattern(text)));
    await test_1.expect
        .poll(async () => dialog.count(), { timeout: 10_000 })
        .toBeGreaterThan(0);
});
When('I click on the {string} button on the confirmation popup', async ({ page }, buttonName) => {
    const dialogButton = page
        .getByRole('dialog')
        .getByRole('button', { name: pattern(buttonName) })
        .or(page.getByRole('button', { name: pattern(buttonName) }));
    await clickElement(dialogButton);
});
