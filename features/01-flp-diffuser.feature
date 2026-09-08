@ui @sap @diffuser
Feature: SAP FLP Diffuser app launch
  As a SAP user
  I want to open the Diffuser tile from FLP home
  So that I can verify the Diffuser homepage loads

  Scenario: Launch Diffuser app from FLP home
    Given I open the SAP FLP login page
    When I log on with username "TESTALL"
    Then I should be on the FLP home page
    And the "Diffuser App" tile should be displayed on the FLP home page
    When I click the "Diffuser App" tile
    Then the Diffuser homepage should be displayed
