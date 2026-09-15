// Generated from: features\01-flp-diffuser.feature
import { test } from "playwright-bdd";

test.describe('SAP FLP Diffuser app launch', () => {

  test('Launch Diffuser app from FLP home', { tag: ['@ui', '@sap', '@diffuser'] }, async ({ Given, When, Then, And, page }) => { 
    await Given('I open the SAP FLP login page', null, { page }); 
    await When('I log on with username "TESTALL"', null, { page }); 
    await Then('I should be on the FLP home page', null, { page }); 
    await And('the "Diffuser App" tile should be displayed on the FLP home page', null, { page }); 
    await When('I click the "Diffuser App" tile', null, { page }); 
    await Then('the Diffuser homepage should be displayed', null, { page }); 
  });

});

// == technical section ==

test.beforeEach('BeforeEach Hooks', ({ $runScenarioHooks }) => $runScenarioHooks('before', {  }));

test.use({
  $test: [({}, use) => use(test), { scope: 'test', box: true }],
  $uri: [({}, use) => use('features\\01-flp-diffuser.feature'), { scope: 'test', box: true }],
  $bddFileData: [({}, use) => use(bddFileData), { scope: "test", box: true }],
});

const bddFileData = [ // bdd-data-start
  {"pwTestLine":6,"pickleLine":7,"tags":["@ui","@sap","@diffuser"],"steps":[{"pwStepLine":7,"gherkinStepLine":8,"keywordType":"Context","textWithKeyword":"Given I open the SAP FLP login page","stepMatchArguments":[]},{"pwStepLine":8,"gherkinStepLine":9,"keywordType":"Action","textWithKeyword":"When I log on with username \"TESTALL\"","stepMatchArguments":[{"group":{"start":23,"value":"\"TESTALL\"","children":[{"start":24,"value":"TESTALL","children":[{}]},{"children":[{}]}]},"parameterTypeName":"string"}]},{"pwStepLine":9,"gherkinStepLine":10,"keywordType":"Outcome","textWithKeyword":"Then I should be on the FLP home page","stepMatchArguments":[]},{"pwStepLine":10,"gherkinStepLine":11,"keywordType":"Outcome","textWithKeyword":"And the \"Diffuser App\" tile should be displayed on the FLP home page","stepMatchArguments":[{"group":{"start":4,"value":"\"Diffuser App\"","children":[{"start":5,"value":"Diffuser App","children":[{}]},{"children":[{}]}]},"parameterTypeName":"string"}]},{"pwStepLine":11,"gherkinStepLine":12,"keywordType":"Action","textWithKeyword":"When I click the \"Diffuser App\" tile","stepMatchArguments":[{"group":{"start":12,"value":"\"Diffuser App\"","children":[{"start":13,"value":"Diffuser App","children":[{}]},{"children":[{}]}]},"parameterTypeName":"string"}]},{"pwStepLine":12,"gherkinStepLine":13,"keywordType":"Outcome","textWithKeyword":"Then the Diffuser homepage should be displayed","stepMatchArguments":[]}]},
]; // bdd-data-end