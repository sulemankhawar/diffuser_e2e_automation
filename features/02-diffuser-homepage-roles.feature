@ui @sap @diffuser @roles
Feature: Diffuser homepage role-based visibility
  As a SAP user
  I want to open the Diffuser app
  So that I can verify role-based tile and section visibility

  Scenario: Login with valid credentials (admin, display and monitor role) and verify all diffuser tiles and dropdown options are displayed
    Given I open the SAP FLP login page
    When I log on with username "TESTALL"
    Then I should be on the FLP home page
    And the "Diffuser App" tile should be displayed on the FLP home page
    When I click the "Diffuser App" tile
    Then the Diffuser homepage should be displayed
    And Verify that the "Diffuser Configuration" title is displayed on the Diffuser homepage
    And Verify that the "Manage Diffuser Programs" tile is displayed on the Diffuser homepage
    And Verify that the "Setup Interval Objects" tile is displayed on the Diffuser homepage
    And Verify that the "Setup Interval Variants" tile is displayed on the Diffuser homepage
    And Verify that the "Setup Job Formats" tile is displayed on the Diffuser homepage
    And Verify that the "General Parameters" tile is displayed on the Diffuser homepage
    And Verify that the "Diffuser Runtime" title is displayed on the Diffuser homepage
    And Verify that the "Start Diffuser Program" tile is displayed on the Diffuser homepage
    And Verify that the "Monitor Diffuser Program" tile is displayed on the Diffuser homepage
    And Verify that the "Display Results" tile is displayed on the Diffuser homepage
    When I click the "Diffuser" dropdown button on the Diffuser homepage
    Then Verify that the "Diffuser Configuration" dropdown option is displayed on the Diffuser homepage
    And Verify that the "Diffuser Runtime" dropdown option is displayed on the Diffuser homepage
    When I select the "Diffuser Configuration" dropdown option on the Diffuser homepage
    Then Verify that the "Manage Diffuser Programs" tile is displayed on the Diffuser homepage
    And Verify that the "Setup Interval Objects" tile is displayed on the Diffuser homepage
    And Verify that the "Setup Interval Variants" tile is displayed on the Diffuser homepage
    And Verify that the "Setup Job Formats" tile is displayed on the Diffuser homepage
    And Verify that the "General Parameters" tile is displayed on the Diffuser homepage
    When I click the "Diffuser" dropdown button on the Diffuser homepage
    And I select the "Diffuser Runtime" dropdown option on the Diffuser homepage
    Then Verify that the "Start Diffuser Program" tile is displayed on the Diffuser homepage
    And Verify that the "Monitor Diffuser Program" tile is displayed on the Diffuser homepage
    And Verify that the "Display Results" tile is displayed on the Diffuser homepage

  Scenario: Login with valid credentials (admin role) and verify all diffuser tiles and dropdown options are displayed
    Given I open the SAP FLP login page
    When I log on with username "TESTADMIN"
    Then I should be on the FLP home page
    And the "Diffuser App" tile should be displayed on the FLP home page
    When I click the "Diffuser App" tile
    Then the Diffuser homepage should be displayed
    And Verify that the "Diffuser Configuration" title is displayed on the Diffuser homepage
    And Verify that the "Manage Diffuser Programs" tile is displayed on the Diffuser homepage
    And Verify that the "Setup Interval Objects" tile is displayed on the Diffuser homepage
    And Verify that the "Setup Interval Variants" tile is displayed on the Diffuser homepage
    And Verify that the "Setup Job Formats" tile is displayed on the Diffuser homepage
    And Verify that the "General Parameters" tile is displayed on the Diffuser homepage
    And Verify that the "Diffuser Runtime" title is not displayed on the Diffuser homepage
    And Verify that the "Start Diffuser Program" tile is not displayed on the Diffuser homepage
    And Verify that the "Monitor Diffuser Program" tile is not displayed on the Diffuser homepage
    And Verify that the "Display Results" tile is not displayed on the Diffuser homepage

  Scenario: Login with valid credentials (display role) and verify all diffuser tiles and dropdown options are displayed
    Given I open the SAP FLP login page
    When I log on with username "TESTDISPLAY"
    Then I should be on the FLP home page
    And the "Diffuser App" tile should be displayed on the FLP home page
    When I click the "Diffuser App" tile
    Then the Diffuser homepage should be displayed
    And Verify that the "Diffuser Configuration" title is not displayed on the Diffuser homepage
    And Verify that the "Manage Diffuser Programs" tile is not displayed on the Diffuser homepage
    And Verify that the "Setup Interval Objects" tile is not displayed on the Diffuser homepage
    And Verify that the "Setup Interval Variants" tile is not displayed on the Diffuser homepage
    And Verify that the "Setup Job Formats" tile is not displayed on the Diffuser homepage
    And Verify that the "General Parameters" tile is not displayed on the Diffuser homepage
    And Verify that the "Diffuser Runtime" title is displayed on the Diffuser homepage
    And Verify that the "Start Diffuser Program" tile is not displayed on the Diffuser homepage
    And Verify that the "Monitor Diffuser Program" tile is not displayed on the Diffuser homepage
    And Verify that the "Display Results" tile is displayed on the Diffuser homepage

  Scenario: Login with valid credentials (monitor role) and verify all diffuser tiles and dropdown options are displayed
    Given I open the SAP FLP login page
    When I log on with username "TESTMONITOR"
    Then I should be on the FLP home page
    And the "Diffuser App" tile should be displayed on the FLP home page
    When I click the "Diffuser App" tile
    Then the Diffuser homepage should be displayed
    And Verify that the "Diffuser Configuration" title is not displayed on the Diffuser homepage
    And Verify that the "Manage Diffuser Programs" tile is not displayed on the Diffuser homepage
    And Verify that the "Setup Interval Objects" tile is not displayed on the Diffuser homepage
    And Verify that the "Setup Interval Variants" tile is not displayed on the Diffuser homepage
    And Verify that the "Setup Job Formats" tile is not displayed on the Diffuser homepage
    And Verify that the "General Parameters" tile is not displayed on the Diffuser homepage
    And Verify that the "Diffuser Runtime" title is displayed on the Diffuser homepage
    And Verify that the "Start Diffuser Program" tile is displayed on the Diffuser homepage
    And Verify that the "Monitor Diffuser Program" tile is displayed on the Diffuser homepage
    And Verify that the "Display Results" tile is not displayed on the Diffuser homepage

  Scenario: Login with valid credentials (no roles assigned) and verify all diffuser tiles and dropdown options are not displayed
    Given I open the SAP FLP login page
    When I log on with username "TESTNO"
    Then I should be on the FLP home page
    And the "Diffuser App" tile should be displayed on the FLP home page
    When I click the "Diffuser App" tile
    Then the Diffuser homepage should be displayed
    And Verify that the "Diffuser Configuration" title is not displayed on the Diffuser homepage
    And Verify that the "Manage Diffuser Programs" tile is not displayed on the Diffuser homepage
    And Verify that the "Setup Interval Objects" tile is not displayed on the Diffuser homepage
    And Verify that the "Setup Interval Variants" tile is not displayed on the Diffuser homepage
    And Verify that the "Setup Job Formats" tile is not displayed on the Diffuser homepage
    And Verify that the "General Parameters" tile is not displayed on the Diffuser homepage
    And Verify that the "Diffuser Runtime" title is not displayed on the Diffuser homepage
    And Verify that the "Start Diffuser Program" tile is not displayed on the Diffuser homepage
    And Verify that the "Monitor Diffuser Program" tile is not displayed on the Diffuser homepage
    And Verify that the "Display Results" tile is not displayed on the Diffuser homepage
