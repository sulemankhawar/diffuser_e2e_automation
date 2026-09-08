"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const playwright_bdd_1 = require("playwright-bdd");
const FlpDiffuserPage_1 = require("../pages/FlpDiffuserPage");
const { Given, When, Then } = (0, playwright_bdd_1.createBdd)();
Given('I open the SAP FLP login page', async ({ page }) => {
    const flpDiffuserPage = new FlpDiffuserPage_1.FlpDiffuserPage(page);
    await flpDiffuserPage.gotoLoginPage();
});
When('I log on with username {string} and password {string}', async ({ page }, username, password) => {
    const flpDiffuserPage = new FlpDiffuserPage_1.FlpDiffuserPage(page);
    await flpDiffuserPage.login(username, password);
});
Then('I should be on the FLP home page', async ({ page }) => {
    const flpDiffuserPage = new FlpDiffuserPage_1.FlpDiffuserPage(page);
    await flpDiffuserPage.verifyOnHomePage();
});
Then('the {string} tile should be displayed on the FLP home page', async ({ page }, tileName) => {
    const flpDiffuserPage = new FlpDiffuserPage_1.FlpDiffuserPage(page);
    await flpDiffuserPage.verifyTileDisplayed(tileName);
});
When('I click the {string} tile', async ({ page }, tileName) => {
    const flpDiffuserPage = new FlpDiffuserPage_1.FlpDiffuserPage(page);
    await flpDiffuserPage.clickTile(tileName);
});
Then('the Diffuser homepage should be displayed', async ({ page }) => {
    const flpDiffuserPage = new FlpDiffuserPage_1.FlpDiffuserPage(page);
    await flpDiffuserPage.verifyDiffuserHomepageDisplayed();
});
Then('Verify that the {string} title is displayed on the Diffuser homepage', async ({ page }, titleName) => {
    const flpDiffuserPage = new FlpDiffuserPage_1.FlpDiffuserPage(page);
    await flpDiffuserPage.verifyTitleDisplayed(titleName);
});
Then('Verify that the {string} tile is displayed on the Diffuser homepage', async ({ page }, tileName) => {
    const flpDiffuserPage = new FlpDiffuserPage_1.FlpDiffuserPage(page);
    await flpDiffuserPage.verifyTileDisplayed(tileName);
});
Then('Verify that the {string} title is not displayed on the Diffuser homepage', async ({ page }, titleName) => {
    const flpDiffuserPage = new FlpDiffuserPage_1.FlpDiffuserPage(page);
    await flpDiffuserPage.verifyTitleNotDisplayed(titleName);
});
Then('Verify that the {string} tile is not displayed on the Diffuser homepage', async ({ page }, tileName) => {
    const flpDiffuserPage = new FlpDiffuserPage_1.FlpDiffuserPage(page);
    await flpDiffuserPage.verifyTileNotDisplayed(tileName);
});
When('I click the {string} dropdown button on the Diffuser homepage', async ({ page }, dropdownName) => {
    const flpDiffuserPage = new FlpDiffuserPage_1.FlpDiffuserPage(page);
    await flpDiffuserPage.openHomepageDropdown(dropdownName);
});
Then('Verify that the {string} dropdown option is displayed on the Diffuser homepage', async ({ page }, optionName) => {
    const flpDiffuserPage = new FlpDiffuserPage_1.FlpDiffuserPage(page);
    await flpDiffuserPage.verifyDropdownOptionDisplayed(optionName);
});
Then('Verify that the {string} dropdown option is not displayed on the Diffuser homepage', async ({ page }, optionName) => {
    const flpDiffuserPage = new FlpDiffuserPage_1.FlpDiffuserPage(page);
    await flpDiffuserPage.verifyDropdownOptionNotDisplayed(optionName);
});
When('I select the {string} dropdown option on the Diffuser homepage', async ({ page }, optionName) => {
    const flpDiffuserPage = new FlpDiffuserPage_1.FlpDiffuserPage(page);
    await flpDiffuserPage.selectDropdownOption(optionName);
});
