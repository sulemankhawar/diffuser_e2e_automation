@ui @sap @diffuser @manage-diffuser-programs
Feature: Manage Diffuser Programs tile visibility
  As a SAP user
  I want to validate access to the Manage Diffuser Programs tile
  So that I can create, change and delete diffuser programs

Scenario: Create and run a diffuser program with "Generate Variant Internally" option enabled specifying the interval count and the lock technical settings and lock diffuser mode enabled
    #Home
    Given I have logged in with valid username "TESTALL"
    When I click on the Diffuser App tile
    #Diffuser Launchpad
    Then Verify the Diffuser dashboard is displayed
    When I click on the "Manage Diffuser Programs" tile
    #Manage Diffuser Programs 
    Then Verify the "Manage Diffuser Programs" page is displayed
    When I click on the "Add" button
    #Create Diffuser Program
    Then Verify the Create Diffuser Program page is displayed
    And Verify the create button is disabled
    When I click on the "Cancel" button
    Then Verify the "Manage Diffuser Programs" page is displayed
    When I click on the "Add" button
    And I enter the Diffuser Program Name as "/BTR/DIF_CL_AUTO_SFLIGHT"
    And I click on the Create Button
    Then Verify the Program details page is displayed
    And Verify that the title is "/BTR/DIF_CL_AUTO_SFLIGHT"
    And Verify the diffuser program field defaults to "/BTR/DIF_CL_AUTO_SFLIGHT"
    And Verify the label field defaults to "/BTR/DIF_CL_AUTO_SFLIGHT"
    And Verify the "Generate Variant Internally" field is ticked by default
    And Verify the "Interval Object" dropdown is disabled
    When I click the "Save" button
    Then Verify that the "Changes saved successfully" message is displayed
    #Manage Diffuser Programs
    When I click on the Diffuser Program "/BTR/DIF_CL_AUTO_SFLIGHT"
    Then Verify the Program details page is displayed for program "/BTR/DIF_CL_AUTO_SFLIGHT"
    When I click on the Edit button
    #Edit Diffuser Programs #DIF-229, DIF-171
    And I enter "/BTR/DIF_CL_AUTO_SFLIGHT" in the "Description" field
    And I enter "/BTR/DIF_CL_AUTO_SFLIGHT" in the "Transform Program" field
    And I enter "/BTR/DIF_CL_AUTO_SFLIGHT" in the "URL Extension Pattern" field
    When I click on the "Show More" link
    Then Verify that the Advanced Settings fields are shown
    And Verify the "Application Log Object" field defaults to "/BTR/DIF"
    And Verify the "Job Catalog Entry:" field defaults to "ZDIF_AUTO_SFLIGHT_CATALOG"
    And Verify the "Application Job Template:" field defaults to "ZDIF_AUTO_SFLIGHT_TEMPLATE"
    When I click on the "Default Settings" tab
    And I enter "/BTR/DIF_CL_AUTO_SFLIGHT_1" in the "Label" field in the instance settings section
    And I select the radiobutton of "Interval Count" field
    And I enter "100" in "Interval Count" field
    And I enter "4" in "No. of batch jobs in the server" field
    And I check the "Lock Technical Settings" checkbox
    And I check the "Lock Diffuser Mode" checkbox
    When I click on save button
    Then Verify that the "Changes saved successfully" message is displayed

    Scenario: Create and run a diffuser program with "Generate Variant Internally" option disabled specifying the interval object and variant
    #Home
    Given I have logged in with valid username "TESTALL"
    When I click on the Diffuser App tile
    #Diffuser Launchpad
    Then Verify the Diffuser dashboard is displayed
    When I click on the "Manage Diffuser Programs" tile
    #Manage Diffuser Programs 
    Then Verify the "Manage Diffuser Programs" page is displayed
    When I click on the "Add" button
    #Create Diffuser Program
    Then Verify the Create Diffuser Program page is displayed
    When I click on the "Add" button
    And I enter the Diffuser Program Name as "/BTR/DIF_CL_AUTO_SFLIGHT02"
    And I click on the Create Button
    Then Verify the Program details page is displayed
    And Verify that the title is "/BTR/DIF_CL_AUTO_SFLIGHT02"
    And Verify the diffuser program field defaults to "/BTR/DIF_CL_AUTO_SFLIGHT02"
    And Verify the label field defaults to "/BTR/DIF_CL_AUTO_SFLIGHT02"	
    When I uncheck the "Generate Variant Internally" checkbox
  	Then Verify the "Interval Object:" field is enabled  
  	When I click the "Save" button
    Then Verify that the "Changes saved successfully" message is displayed  
	  #Manage Diffuser Programs
    When I click on the Diffuser Program "/BTR/DIF_CL_AUTO_SFLIGHT02"
    Then Verify the Program details page is displayed for program "/BTR/DIF_CL_AUTO_SFLIGHT02"
    When I click on the Edit button
    #Edit Diffuser Programs
    And I enter "/BTR/DIF_CL_AUTO_SFLIGHT02" in the "Description" field
    And I enter "/BTR/DIF_CL_AUTO_SFLIGHT02" in the "Transform Program" field
    And I enter "/BTR/DIF_CL_AUTO_SFLIGHT02" in the "URL Extension Pattern" field
    When I click on the dropdown for the "Job Format ID:" filter And I select the "<UNAME>-<DATE1>-<TIME>" option
	  Then Verify that the "Job Format ID:" filter is populated with "<UNAME>-<DATE1>-<TIME>"
	  When I click on the dropdown for the "Interval Object:" filter And I select the "Test interval object" option
	  Then Verify that the "Interval Object:" filter is populated with "Test interval object"
    When I click on the "Show More" link
    Then Verify that the Advanced Settings fields are shown
    And Verify the "Application Log Object" field defaults to "/BTR/DIF"
    And Verify the "Job Catalog Entry:" field defaults to "ZDIF_AUTO_SFLIGHT_CATALOG02"
    And Verify the "Application Job Template:" field defaults to "ZDIF_AUTO_SFLIGHT_TEMPLATE02"
    When I click on the "Default Settings" tab
    And I enter "/BTR/DIF_CL_AUTO_SFLIGHT02_1" in the "Label" field in the instance settings section
    #When I click on the dropdown for the "Interval Variant" filter And I select the "QAVARIANT" option
    Then Verify that the "Interval Variant" filter is populated with "QAVARIANT"
    When I select the radiobutton of "Number of Batch Jobs Across All Servers" field
    And I enter "4" in "No. of batch jobs in the server" field
    And I check the "Wait for Run to Complete" checkbox
    And I enter "TESTALL" in "Notification List:" field
    #When I click on the dropdown for the "Message Log Level:" filter And I select the "Medium" option
    #Then Verify that the "Message Log Level:" filter is populated with "Medium"
    When I click on save button
    Then Verify that the "Changes saved successfully" message is displayed
    