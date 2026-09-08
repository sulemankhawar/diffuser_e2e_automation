@ui @sap @diffuser @start-diffuser-program
Feature: Start Diffuser Program tile navigation
  As a SAP user with runtime access
  I want to open the Start Diffuser Program tile
  So that I can verify navigation to the start page works and I can run a diffuser program

  Scenario: Start Diffuser Program tile diffuser program with "Generate Variant Internally" option enabled specifying the interval count and the lock technical settings and lock diffuser mode enabled
    Given I am logged in to SAP FLP with username "TESTALL"
    When I open the Diffuser App from FLP
    Then I should be on the Diffuser homepage
    And the "Start Diffuser Program" tile should be visible on the Diffuser homepage
    When I click the "Start Diffuser Program" tile on the Diffuser homepage
    Then the Start Diffuser Program page should be displayed
    And Verify the column "Program/Class" is displayed
    And Verify the column "Description" is displayed
    And Verify the column "Interval Object" is displayed
    And Verify the column "Actions" is displayed
    And Verify that the program "/BTR/DIF_CL_AUTO_SFLIGHT" is listed in the table   
    When I click on the "Start the selected Diffuser Program" button for "/BTR/DIF_CL_AUTO_SFLIGHT" 
    #Application Job Template
    Then Verify that a new Tab is opened with the title "New Job: Diffuser Automation test Template"
    #Application Job Template Template Selection
    And Verify the Application Job page "Template Selection" is displayed
    And Verify the "Job Template:" field is populated with "Diffuser Automation test Template"
    And Verify the "Job Name:" field is populated with "Diffuser Automation test Template"
    When I click on "Step 2" button
    #Application Job Template Scheduling options
    Then Verify the Application Job page "Scheduling Options" is displayed
    And Verify that "Start immediately" checkbox is selected by default
    And Verify that the "Job Start(Local time):" field is not empty
    And Verify that the "Recurrence Pattern:" field is set to "Single Run"
    When I click on "Step 3" button
    #Application Job Parameters
    Then Verify the Application Job page "Parameters" is displayed
    And Verify that the field "Interval Size:" is defaulted to "0"
    And Verify that the field "Interval Size:" is disabled
    And Verify that the field "Interval Count:" is defaulted to "100"
    And Verify that the field "Interval Count:" is disabled
    And Verify that the field "Number of parallel processes::" is defaulted to "4"
    And Verify that the field "Number of parallel processes::" is disabled
    And Verify that the field "Run Label:" is defaulted to "/BTR/DIF_CL_AUTO_SFLIGHT_1"
    And Verify that the field "Run Label:" is disabled
    When I enter value "5" in the "Delay (per interval):" field    
    And I click on "Check" button
    Then Verify the AJT message "You can go ahead and schedule the job." is displayed
    When I click on the "Schedule" button
    Then Verify that the "Job Diffuser Automation test Template has been scheduled." message is displayed

    #Diffuser tab - Monitor Diffuser Program
    When I switch back to the Diffuser tab
    And Verify the "Program Name:" filter is populated with "/BTR/DIF_CL_AUTO_SFLIGHT" on the Monitor Diffuser Program page
    And Verify the "Started By:" filter is populated with "TESTALL" on the Monitor
    
    #Monitor Diffuser Program - Instance details
    Then Verify that a table is displayed with the title "/BTR/DIF_CL_AUTO_SFLIGHT" on the Monitor Diffuser Program page
    And Verify that there is a row for instance name "/BTR/DIF_CL_AUTO_SFLIGHT_1" in the table on the Monitor Diffuser Program page
    #And Verify that a refresh timer is displayed
    When I click on the "Pause Instance" button for instance name "/BTR/DIF_CL_AUTO_SFLIGHT_1" in the Monitor Diffuser Program page
    Then Verify that the "Instance Status" column for instance name "/BTR/DIF_CL_AUTO_SFLIGHT_1" is updated to "Stopped" on the Monitor Diffuser Program page
    And Verify that the row for instance name "/BTR/DIF_CL_AUTO_SFLIGHT_1" is displayed with "TESTALL" in the "Started By" column on the Monitor Diffuser Program page
    And Verify that the row for instance name "/BTR/DIF_CL_AUTO_SFLIGHT_1" is contains todays date in the "Start Date" column on the Monitor Diffuser Program page
    And Verify that the row for instance name "/BTR/DIF_CL_AUTO_SFLIGHT_1" is displayed with "4" in the "Requested Processes" column on the Monitor Diffuser Program page

    #Monitor Diffuser Program Interval table for instance
    When I click on the row for the instance line "/BTR/DIF_CL_AUTO_SFLIGHT_1" in the Monitor Diffuser Program page
    Then Verify that an interval table is displayed for instance name "/BTR/DIF_CL_AUTO_SFLIGHT_1" on the Monitor Diffuser Program page
    And Verify that the interval table contains 99 rows for instance name "/BTR/DIF_CL_AUTO_SFLIGHT_1" on the Monitor Diffuser Program page
    And Verify that the column "Interval" is displayed in the interval table for instance name "/BTR/DIF_CL_AUTO_SFLIGHT_1" on the Monitor Diffuser Program page
    And Verify that the column "Low" is displayed in the interval table for instance name "/BTR/DIF_CL_AUTO_SFLIGHT_1" on the Monitor Diffuser Program page
    And Verify that the column "High" is displayed in the interval table for instance name "/BTR/DIF_CL_AUTO_SFLIGHT_1" on the Monitor Diffuser Program page
    And Verify that the column "Status" is displayed in the interval table for instance name "/BTR/DIF_CL_AUTO_SFLIGHT_1" on the Monitor Diffuser Program page
    And Verify that the column "Results" is displayed in the interval table for instance name "/BTR/DIF_CL_AUTO_SFLIGHT_1" on the Monitor Diffuser Program page
    When I click on the "Additional Options" button in the interval table on the Monitor Diffuser Program page
    And I click on the "Close" button in the interval table on the Monitor Diffuser Program page
    Then Verify that the interval table is not displayed

    #Monitor Diffuser Program
    When I click on the "Parameters" button for instance name "/BTR/DIF_CL_AUTO_SFLIGHT_1" in the Monitor Diffuser Program page
    
    #Job details
    Then Verify that a new Tab is opened with header "Job Details"
    And Verify the title "Diffuser Automation test Template" is displayed in the Job Details tab
    And Verify there is a tab for "Scheduling Options"
    And Verify there is a tab for "Run Details"
    And Verify there is a tab for "Parameters"
    When I switch back to the Diffuser tab

    #Monitor Diffuser Program Instance line
    And I click on the "Application Log" button for instance name "/BTR/DIF_CL_AUTO_SFLIGHT_1" in the Monitor Diffuser Program page

    #Log details
    Then Verify that a new Tab is opened with header "Log Details"
    And Verify the column "Type" is displayed
    And Verify the column "Message" is displayed
    And Verify the column "Created on" is displayed
    When I switch back to the Diffuser tab

    #Monitor Diffuser Program Instance line
    And I click on the "Parallel Processes" button for instance name "/BTR/DIF_CL_AUTO_SFLIGHT_1" in the Monitor Diffuser Program page
    
    #Monitor Diffuser Program Parralel Processes
    Then Verify the "Parallel Processes" pop up screen appears
    And Verify the column "Job Description" is displayed
    And Verify the column "Status" is displayed
    And Verify the column "Actions" is displayed
    When I click the "Close" button on the Parallel Processes pop up screen

    #Monitor Diffuser Program Instance line
    And I click on the "Resume Instance" button for instance name "/BTR/DIF_CL_AUTO_SFLIGHT_1" in the Monitor Diffuser Program page
    Then Verify that the "Instance Status" column for instance name "/BTR/DIF_CL_AUTO_SFLIGHT_1" is updated to "In Process" on the Monitor Diffuser Program page
    And Verify that the row for instance name "/BTR/DIF_CL_AUTO_SFLIGHT_1" is contains todays date in the "End Date" column on the Monitor Diffuser Program page
    And Verify that the row for instance name "/BTR/DIF_CL_AUTO_SFLIGHT_1" is displayed with "100%" in the "Complete" column on the Monitor Diffuser Program page
    And Verify that the "Instance Status" column for instance name "/BTR/DIF_CL_AUTO_SFLIGHT_1" is updated to "Finished" on the Monitor Diffuser Program page

    #Monitor Diffuser Program Results
    When I click on the "Results" button for instance name "/BTR/DIF_CL_AUTO_SFLIGHT_1" in the Monitor Diffuser Program page
    Then Verify that the "Results" pop up screen appears
    Then Verify the "Results" pop up screen appears
    When I click the "Close" button on the Results pop up screen
    Then Verify that the "Results" pop up screen is closed
    And Verify that a table is displayed with the title "/BTR/DIF_CL_AUTO_SFLIGHT" on the Monitor Diffuser Program page
    And Verify that there is a row for instance name "/BTR/DIF_CL_AUTO_SFLIGHT_1" in the table on the Monitor Diffuser Program page
    When I click on the "Home" button on the Monitor Diffuser Program page
    Then Verify that the Diffuser homepage is displayed
    When I click the "Display Results" tile on the Diffuser homepage

    #Display Results page filters and table
    Then the Display Results page should be displayed
    When I click on the "Open Picker" button on the Display Results page
    And I select the "Today" option
    When I click on the "Go" button on the Display Results page
    And Verify that there is a row for instance name "/BTR/DIF_CL_AUTO_SFLIGHT_1" in the table on the Display Results page
    And Verify that the row for instance name "/BTR/DIF_CL_AUTO_SFLIGHT_1" is displayed with "TESTALL" in the "Started By" column on the Display Results page
    And Verify that the row for instance name "/BTR/DIF_CL_AUTO_SFLIGHT_1" contains todays date in the "Start Date" column on the Display Results page
    And Verify that the row for instance name "/BTR/DIF_CL_AUTO_SFLIGHT_1" contains todays date in the "End Date" column on the Display Results page
    And Verify that the row for instance name "/BTR/DIF_CL_AUTO_SFLIGHT_1" is displayed with "Finished" in the "Instance Status" column on the Display Results page
    And Verify that the row for instance name "/BTR/DIF_CL_AUTO_SFLIGHT_1" is displayed with "100%" in the "Complete" column on the Display Results page 
    When I click on the row for instance name "/BTR/DIF_CL_AUTO_SFLIGHT_1" in the Display Results page

    #Display Results Interval table for instance
    Then Verify that a table is displayed with the title "/BTR/DIF_CL_AUTO_SFLIGHT_1" on the Display Results page
    And Verify that the table contains 99 rows for instance name "/BTR/DIF_CL_AUTO_SFLIGHT_1" on the Display Results page
    And Verify that the column "Interval" is displayed in the table for instance name "/BTR/DIF_CL_AUTO_SFLIGHT_1" on the Display Results page
    And Verify that the column "Low" is displayed in the table for instance name "/BTR/DIF_CL_AUTO_SFLIGHT_1" on the Display Results page
    And Verify that the column "High" is displayed in the table for instance name "/BTR/DIF_CL_AUTO_SFLIGHT_1" on the Display Results page
    And Verify that the column "Status" is displayed in the table for instance name "/BTR/DIF_CL_AUTO_SFLIGHT_1" on the Display Results page
    And Verify that all rows in the "Status" column of the table for instance name "/BTR/DIF_CL_AUTO_SFLIGHT_1" on the Display Results page are displayed with "Completed"
    And Verify that the column "Results" is displayed in the table for instance name "/BTR/DIF_CL_AUTO_SFLIGHT_1" on the Display Results page

    Scenario: Start Diffuser Program tile diffuser program with "Generate Variant Internally" option disabled specifying the interval count and the lock technical settings and lock diffuser mode enabled
    
    Given I am logged in to SAP FLP with username "TESTALL"
    When I open the Diffuser App from FLP
    Then I should be on the Diffuser homepage
    And the "Start Diffuser Program" tile should be visible on the Diffuser homepage
    When I click the "Start Diffuser Program" tile on the Diffuser homepage
    Then the Start Diffuser Program page should be displayed
    And Verify the column "Program/Class" is displayed
    And Verify the column "Description" is displayed
    And Verify the column "Interval Object" is displayed
    And Verify the column "Actions" is displayed
    And Verify that the program "/BTR/DIF_CL_AUTO_SFLIGHT02" is listed in the table   
    And Verify that the program "/BTR/DIF_CL_AUTO_SFLIGHT02" has "Interval Object" as "QACUSTOM"
    When I click on the "Start the selected Diffuser Program" button for "/BTR/DIF_CL_AUTO_SFLIGHT02" 
    
    #Application Job Template
    Then Verify that a new Tab is opened with the title "New Job: Diffuser Automation test Template 2"
    #Application Job Template Template Selection
    And Verify the Application Job page "Template Selection" is displayed
    And Verify the "Job Template:" field is populated with "Diffuser Automation test Template 2"
    And Verify the "Job Name:" field is populated with "Diffuser Automation test Template 2"
    When I click on "Step 2" button
    
    #Application Job Template Scheduling options
    Then Verify the Application Job page "Scheduling Options" is displayed
    And Verify that "Start immediately" checkbox is selected by default
    And Verify that the "Job Start(Local time):" field is not empty
    And Verify that the "Recurrence Pattern:" field is set to "Single Run"
    When I click on "Step 3" button
    
    #Application Job Parameters
    Then Verify the Application Job page "Parameters" is displayed
    And Verify that the field "Interval Size:" is defaulted to "0"
    And Verify that the field "Interval Size:" is enabled
    #And Verify that the field "Interval Count:" is defaulted to "100"
    #And Verify that the field "Interval Count:" is enabled
    And Verify that the field "Number of parallel processes::" is defaulted to "4"
    And Verify that the field "Number of parallel processes::" is ensabled
    And Verify that the field "Run Label:" is defaulted to "/BTR/DIF_CL_AUTO_SFLIGHT02_1"
    And Verify that the field "Run Label:" is enabled
    When I enter value "5" in the "Delay (per interval):" field
    And I enter value "100" in the "Interval Count:" field      
    And I click on "Check" button
    Then Verify the AJT message "You can go ahead and schedule the job." is displayed
    When I click on the "Schedule" button
    Then Verify that the "Job Diffuser Automation test Template 2 has been scheduled." message is displayed

    #Diffuser tab - Monitor Diffuser Program
    When I switch back to the Diffuser tab
    And Verify the "Program Name:" filter is populated with "/BTR/DIF_CL_AUTO_SFLIGHT02" on the Monitor Diffuser Program page
    And Verify the "Started By:" filter is populated with "TESTALL" on the Monitor
    #Monitor Diffuser Program - Instance details
    Then Verify that a table is displayed with the title "/BTR/DIF_CL_AUTO_SFLIGHT02" on the Monitor Diffuser Program page
    And Verify that there is a row for instance name "/BTR/DIF_CL_AUTO_SFLIGHT02_1" in the table on the Monitor Diffuser Program page
    When I click on the "Pause Instance" button for instance name "/BTR/DIF_CL_AUTO_SFLIGHT02_1" in the Monitor Diffuser Program page
    Then Verify that the "Instance Status" column for instance name "/BTR/DIF_CL_AUTO_SFLIGHT02_1" is updated to "Stopped" on the Monitor Diffuser Program page
    And Verify that the row for instance name "/BTR/DIF_CL_AUTO_SFLIGHT02_1" is displayed with "TESTALL" in the "Started By" column on the Monitor Diffuser Program page
    And Verify that the row for instance name "/BTR/DIF_CL_AUTO_SFLIGHT02_1" is contains todays date in the "Start Date" column on the Monitor Diffuser Program page
    And Verify that the row for instance name "/BTR/DIF_CL_AUTO_SFLIGHT02_1" is displayed with "4" in the "Requested Processes" column on the Monitor Diffuser Program page

    #Monitor Diffuser Program Interval table for instance
    When I click on the row for the instance line "/BTR/DIF_CL_AUTO_SFLIGHT02_1" in the Monitor Diffuser Program page
    Then Verify that an interval table is displayed for instance name "/BTR/DIF_CL_AUTO_SFLIGHT02_1" on the Monitor Diffuser Program page
    And Verify that the interval table contains 99 rows for instance name "/BTR/DIF_CL_AUTO_SFLIGHT02_1" on the Monitor Diffuser Program page
    And Verify that the column "Interval" is displayed in the interval table for instance name "/BTR/DIF_CL_AUTO_SFLIGHT02_1" on the Monitor Diffuser Program page
    And Verify that the column "Low" is displayed in the interval table for instance name "/BTR/DIF_CL_AUTO_SFLIGHT02_1" on the Monitor Diffuser Program page
    And Verify that the column "High" is displayed in the interval table for instance name "/BTR/DIF_CL_AUTO_SFLIGHT02_1" on the Monitor Diffuser Program page
    And Verify that the column "Status" is displayed in the interval table for instance name "/BTR/DIF_CL_AUTO_SFLIGHT02_1" on the Monitor Diffuser Program page
    And Verify that the column "Results" is displayed in the interval table for instance name "/BTR/DIF_CL_AUTO_SFLIGHT02_1" on the Monitor Diffuser Program page
    When I click on the "Additional Options" button in the interval table on the Monitor Diffuser Program page
    And I click on the "Close" button in the interval table on the Monitor Diffuser Program page
    Then Verify that the interval table is not displayed

    #Monitor Diffuser Program
    When I click on the "Parameters" button for instance name "/BTR/DIF_CL_AUTO_SFLIGHT02_1" in the Monitor Diffuser Program page
    
    #Job details
    Then Verify that a new Tab is opened with header "Job Details"
    And Verify the title "Diffuser Automation test Template 2" is displayed in the Job Details tab
    And Verify there is a tab for "Scheduling Options"
    And Verify there is a tab for "Run Details"
    And Verify there is a tab for "Parameters"
    When I switch back to the Diffuser tab

    #Monitor Diffuser Program Instance line
    And I click on the "Application Log" button for instance name "/BTR/DIF_CL_AUTO_SFLIGHT02_1" in the Monitor Diffuser Program page

    #Log details
    Then Verify that a new Tab is opened with header "Log Details"
    And Verify the column "Type" is displayed
    And Verify the column "Message" is displayed
    And Verify the column "Created on" is displayed
    When I switch back to the Diffuser tab

    #Monitor Diffuser Program Instance line
    And I click on the "Parallel Processes" button for instance name "/BTR/DIF_CL_AUTO_SFLIGHT02_1" in the Monitor Diffuser Program page
    
    #Monitor Diffuser Program Parralel Processes
    Then Verify the "Parallel Processes" pop up screen appears
    And Verify the column "Job Description" is displayed
    And Verify the column "Status" is displayed
    And Verify the column "Actions" is displayed
    When I click the "Close" button on the Parallel Processes pop up screen

    #Monitor Diffuser Program Instance line
    And I click on the "Resume Instance" button for instance name "/BTR/DIF_CL_AUTO_SFLIGHT02_1" in the Monitor Diffuser Program page
    Then Verify that the "Instance Status" column for instance name "/BTR/DIF_CL_AUTO_SFLIGHT02_1" is updated to "In Process" on the Monitor Diffuser Program page
    And Verify that the row for instance name "/BTR/DIF_CL_AUTO_SFLIGHT02_1" is contains todays date in the "End Date" column on the Monitor Diffuser Program page
    And Verify that the row for instance name "/BTR/DIF_CL_AUTO_SFLIGHT02_1" is displayed with "100%" in the "Complete" column on the Monitor Diffuser Program page
    And Verify that the "Instance Status" column for instance name "/BTR/DIF_CL_AUTO_SFLIGHT02_1" is updated to "Finished" on the Monitor Diffuser Program page

    #Monitor Diffuser Program Results
    When I click on the "Results" button for instance name "/BTR/DIF_CL_AUTO_SFLIGHT02_1" in the Monitor Diffuser Program page
    Then Verify that the "Results" pop up screen appears
    Then Verify the "Results" pop up screen appears
    When I click the "Close" button on the Results pop up screen
    Then Verify that the "Results" pop up screen is closed
    And Verify that a table is displayed with the title "/BTR/DIF_CL_AUTO_SFLIGHT02" on the Monitor Diffuser Program page
    And Verify that there is a row for instance name "/BTR/DIF_CL_AUTO_SFLIGHT02_1" in the table on the Monitor Diffuser Program page
    When I click on the "Home" button on the Monitor Diffuser Program page
    Then Verify that the Diffuser homepage is displayed
    When I click the "Display Results" tile on the Diffuser homepage

    #Display Results page filters and table
    Then the Display Results page should be displayed
    When I click on the "Open Picker" button on the Display Results page
    And I select the "Today" option
    When I click on the "Go" button on the Display Results page
    And Verify that there is a row for instance name "/BTR/DIF_CL_AUTO_SFLIGHT02_1" in the table on the Display Results page
    And Verify that the row for instance name "/BTR/DIF_CL_AUTO_SFLIGHT02_1" is displayed with "TESTALL" in the "Started By" column on the Display Results page
    And Verify that the row for instance name "/BTR/DIF_CL_AUTO_SFLIGHT02_1" contains todays date in the "Start Date" column on the Display Results page
    And Verify that the row for instance name "/BTR/DIF_CL_AUTO_SFLIGHT02_1" contains todays date in the "End Date" column on the Display Results page
    And Verify that the row for instance name "/BTR/DIF_CL_AUTO_SFLIGHT02_1" is displayed with "Finished" in the "Instance Status" column on the Display Results page
    And Verify that the row for instance name "/BTR/DIF_CL_AUTO_SFLIGHT02_1" is displayed with "100%" in the "Complete" column on the Display Results page 
    When I click on the row for instance name "/BTR/DIF_CL_AUTO_SFLIGHT02_1" in the Display Results page

    #Display Results Interval table for instance
    Then Verify that a table is displayed with the title "/BTR/DIF_CL_AUTO_SFLIGHT02_1" on the Display Results page
    And Verify that the table contains 99 rows for instance name "/BTR/DIF_CL_AUTO_SFLIGHT02_1" on the Display Results page
    And Verify that the column "Interval" is displayed in the table for instance name "/BTR/DIF_CL_AUTO_SFLIGHT02_1" on the Display Results page
    And Verify that the column "Low" is displayed in the table for instance name "/BTR/DIF_CL_AUTO_SFLIGHT02_1" on the Display Results page
    And Verify that the column "High" is displayed in the table for instance name "/BTR/DIF_CL_AUTO_SFLIGHT02_1" on the Display Results page
    And Verify that the column "Status" is displayed in the table for instance name "/BTR/DIF_CL_AUTO_SFLIGHT02_1" on the Display Results page
    And Verify that all rows in the "Status" column of the table for instance name "/BTR/DIF_CL_AUTO_SFLIGHT02_1" on the Display Results page are displayed with "Completed"
    And Verify that the column "Results" is displayed in the table for instance name "/BTR/DIF_CL_AUTO_SFLIGHT02_1" on the Display Results page