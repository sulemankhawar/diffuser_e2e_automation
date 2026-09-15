@ui @sap @diffuser @deletion
Feature: Deletion to reset data
  As a SAP user with runtime access
  I want to delete the internal variants, objects and diffuser programs to be able to run the automated tests without interference from existing data

  Scenario: Delete the diffuser program /BTR/DIF_CL_AUTO_SFLIGHT
    Given I have logged in with valid username "TESTALL"
    When I click on the Diffuser App tile
    Then Verify the Diffuser dashboard is displayed
    When I click on the "Manage Diffuser Programs" tile
    Then Verify the "Manage Diffuser Programs" page is displayed
    When I click on the Diffuser Program "/BTR/DIF_CL_AUTO_SFLIGHT"
    Then Verify the Program details page is displayed for program "/BTR/DIF_CL_AUTO_SFLIGHT"
    When I click on the Edit button
    Then Verify that the "Delete" button is displayed
    When I click on the "Delete" button
    Then Verify that a confirmation popup box appears
    And Verify the message "Do you really want to delete this Diffuser Program?" appears
    When I click the "OK" button on the confirmation popup
    Then Verify the "Successfully deleted Diffuser Program" message appears
    And Verify that the Diffuser Program "/BTR/DIF_CL_AUTO_SFLIGHT" is no longer listed

  Scenario: Delete the diffuser program /BTR/DIF_CL_AUTO_SFLIGHT02
    Given I have logged in with valid username "TESTALL"
    When I click on the Diffuser App tile
    Then Verify the Diffuser dashboard is displayed
    When I click on the "Manage Diffuser Programs" tile
    Then Verify the "Manage Diffuser Programs" page is displayed
    When I click on the Diffuser Program "/BTR/DIF_CL_AUTO_SFLIGHT02"
    Then Verify the Program details page is displayed for program "/BTR/DIF_CL_AUTO_SFLIGHT02"
    When I click on the Edit button
    Then Verify that the "Delete" button is displayed
    When I click on the "Delete" button
    Then Verify that a confirmation popup box appears
    And Verify the message "Do you really want to delete this Diffuser Program?" appears
    When I click the "OK" button on the confirmation popup
    Then Verify the "Successfully deleted Diffuser Program" message appears
    And Verify that the Diffuser Program "/BTR/DIF_CL_AUTO_SFLIGHT02" is no longer listed

  Scenario: Delete the interval variant
    Given I am logged in to SAP FLP with username "TESTALL"
    When I open the Diffuser App from FLP
    Then I should be on the Diffuser homepage
    When I click the "Setup Interval Variants" tile on the Diffuser homepage
    Then the Setup Interval Variants page should be displayed
    When I select the checkbox for the "QACUSTOM" internal variant
    And I click the "Delete" button
    Then Verify that a confirmation popup box appears
    And Verify the message "Do you really want to delete this Interval Variant?" appears
    When I click the "OK" button on the confirmation popup
    Then Verify the "SUCCESSFULLY_DELETED_INTERVAL_VARIANT" message appears
    And Verify that the "QACUSTOM" internal variant is no longer listed

  Scenario: Delete the interval object
    Given I am logged in to SAP FLP with username "TESTALL"
    When I open the Diffuser App from FLP
    Then I should be on the Diffuser homepage
    When I click the "Setup Interval Objects" tile on the Diffuser homepage
    Then the Setup Interval Objects page should be displayed
    When I select the checkbox for the "QACUSTOM" internal object
    And I click the "Delete" button
    Then Verify that a confirmation popup box appears
    And Verify the message "Do you really want to delete this Interval Object?" appears
    When I click the "OK" button on the confirmation popup
    Then Verify the "Successfully deleted Interval Object" message appears
    And Verify that the "QACUSTOM" internal object is no longer listed
