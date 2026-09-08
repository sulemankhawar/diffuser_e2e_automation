@ui @sap @diffuser  
Feature: Setup Interval Objects tile navigation
  As a SAP user with runtime access
  I want to open the Setup Interval Objects tile
  So that I can verify navigation to the setup page works and I can configure interval objects

  Scenario: Create a new interval object @intervals
    Given I am logged in to SAP FLP with username "TESTALL"
    When I open the Diffuser App from FLP
    Then I should be on the Diffuser homepage
    And the "Setup Interval Objects" tile should be visible on the Diffuser homepage
    When I click the "Setup Interval Objects" tile on the Diffuser homepage
    Then the Setup Interval Objects page should be displayed
    When I click on the "Add" button
    Then the "Create Interval Object" dialog should be displayed
    And the "Save" button should be disabled
    When I enter "QACUSTOM" in the "Interval Object" field
    #And I select "Standard" from the "Type" dropdown
    And I enter "Test interval object" in the "Description" field
    And I enter "/BTR/DIF_CL_INTGEN_SCUSTOM" in the "Class Name" field
    Then Verify that the "Save" button is enabled
    When I click the "Save" button
    Then Verify that the message "Changes saved successfully" is displayed

    #Choose from requests which I am involved
    When I click on the "Transport Interval Object" button for the "QACUSTOM" interval object on the Setup Interval Objects page
    Then Verify that the "Select Transport Request" dialog is displayed
    When I click on the "Choose from requests which I am involved" radio button on the "Select Transport Request" dialog
    When I click on the "Transport Interval Object" button on the Setup Interval Objects page
    Then Verify that the "Select Transport Request" dialog is displayed
    When I click on the "Cancel" button on the "Select Transport Request" dialog
    Then Verify that the "Select Transport Request" dialog is closed

    When I click on the "Transport Interval Object" button for the "QACUSTOM" interval object on the Setup Interval Objects page
    Then Verify that the "Select Transport Request" dialog is displayed
    When I click on the "Choose from requests which I am involved" radio button on the "Select Transport Request" dialog
    And I click on the radio button in the first row in the table below
    And I click on the "Transport" button on the "Select Transport Request" dialog
    Then Verify that the message "Transport successful" is displayed

    #Create a new request
    When I click on the "Transport Interval Object" button for the "QACUSTOM" interval object on the Setup Interval Objects page
    Then Verify that the "Select Transport Request" dialog is displayed
    When I click on the "Create a new request" radio button on the "Select Transport Request" dialog
    And I enter in "QA_TEST" in the "Request Description" field
    And I enter in "B5T_P00001" in the "CTS Project:" field
    And I click on the "Transport" button on the "Select Transport Request" dialog
    Then Verify that the message "Transport successful" is displayed

    #Create a new request
    When I click on the "Transport Interval Object" button for the "QACUSTOM" interval object on the Setup Interval Objects page
    Then Verify that the "Select Transport Request" dialog is displayed
    When I click on the "Enter a request number" radio button on the "Select Transport Request" dialog
    And I enter in "B5TK900037" in the "Request Number:" field
    And I click on the "Transport" button on the "Select Transport Request" dialog
    Then Verify that the message "Transport successful" is displayed
