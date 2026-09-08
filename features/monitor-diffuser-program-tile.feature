# @ui @sap @diffuser @monitor-diffuser-program
# Feature: Monitor Diffuser Program tile navigation
#   As a SAP user with runtime access
#   I want to open the Monitor Diffuser Program tile
#   So that I can verify a diffuser program has been run and an instance has been created and the instance can be monitored

# Scenario: Monitor Diffuser Program tile diffuser program with "Generate Variant Internally" option enabled and the lock technical settings and lock diffuser mode enabled
#     Given I am logged in to SAP FLP with username "TESTALL"
#     When I open the Diffuser App from FLP
#     Then I should be on the Diffuser homepage
#     And the "Monitor Diffuser Program" tile should be visible on the Diffuser homepage
#     When I click the "Monitor Diffuser Program" tile on the Diffuser homepage
#     #Monitor Diffuser Program
#     Then Verify the "Monitor Diffuser Program" page is displayed
#     When I click on the dropdown for the "Program Name:" filter on the Monitor Diffuser Program page
#     And I select the "/BTR/DIF_CL_AUTO_SFLIGHT" option
#     Then Verify that the "Program Name:" filter is populated with "/BTR/DIF_CL_AUTO_SFLIGHT" on the Monitor Diffuser Program page
#     When I enter "TESTALL" in the "Started By:" filter on the Monitor Diffuser Program page
#     Then Verify that the "Started By:" filter is populated with "TESTALL" on the Monitor Diffuser Program page
#     When I click on the "Open Picker" button for the "Date:" filter on the Monitor Diffuser Program page
#     And I select the "Today" option
#     Then Verify that the "Date:" filter is populated with todays date on the Monitor Diffuser Program page
#     When I click on the "Go" button on the Monitor Diffuser Program page
#     Then Verify that the program "/BTR/DIF_CL_AUTO_SFLIGHT" is displayed on the Monitor Diffuser Program page
#     When I click on the program "/BTR/DIF_CL_AUTO_SFLIGHT" in the Monitor Diffuser Program page
#     Then Verify that a table is displayed with the title "/BTR/DIF_CL_AUTO_SFLIGHT" on the Monitor Diffuser Program page
#     And Verify that there is a row for instance name "/BTR/DIF_CL_AUTO_SFLIGHT_1" in the table on the Monitor Diffuser Program page
#     #And Verify that a refresh timer is displayed
#     When I click on the "Pause Instance" button for instance name "/BTR/DIF_CL_AUTO_SFLIGHT_1" in the Monitor Diffuser Program page
#     Then Verify that the "Instance Status" column for instance name "/BTR/DIF_CL_AUTO_SFLIGHT_1" is updated to "Stopped" on the Monitor Diffuser Program page
#     And Verify that the row for instance name "/BTR/DIF_CL_AUTO_SFLIGHT_1" is displayed with "TESTALL" in the "Started By" column on the Monitor Diffuser Program page
#     And Verify that the row for instance name "/BTR/DIF_CL_AUTO_SFLIGHT_1" is contains todays date in the "Start Date" column on the Monitor Diffuser Program page
#     And Verify that the row for instance name "/BTR/DIF_CL_AUTO_SFLIGHT_1" is displayed with "4" in the "Requested Processes" column on the Monitor Diffuser Program page

    # #Monitor Diffuser Program Interval table for instance
    # Then Verify that an interval table is displayed for instance name "/BTR/DIF_CL_AUTO_SFLIGHT_1" on the Monitor Diffuser Program page
    # And Verify that the interval table contains 99 rows for instance name "/BTR/DIF_CL_AUTO_SFLIGHT_1" on the Monitor Diffuser Program page
    # And Verify that the column "Interval" is displayed in the interval table for instance name "/BTR/DIF_CL_AUTO_SFLIGHT_1" on the Monitor Diffuser Program page
    # And Verify that the column "Low" is displayed in the interval table for instance name "/BTR/DIF_CL_AUTO_SFLIGHT_1" on the Monitor Diffuser Program page
    # And Verify that the column "High" is displayed in the interval table for instance name "/BTR/DIF_CL_AUTO_SFLIGHT_1" on the Monitor Diffuser Program page
    # And Verify that the column "Status" is displayed in the interval table for instance name "/BTR/DIF_CL_AUTO_SFLIGHT_1" on the Monitor Diffuser Program page
    # And Verify that all rows in the "Status" column of the interval table for instance name "/BTR/DIF_CL_AUTO_SFLIGHT_1" on the Monitor Diffuser Program page are displayed with "Stopped"
    # And Verify that the column "Results" is displayed in the interval table for instance name "/BTR/DIF_CL_AUTO_SFLIGHT_1" on the Monitor Diffuser Program page
    # When I click on the "Additional Options" button in the interval table on the Monitor Diffuser Program page
    # And I click on the "Close" button
    # Then Verify that the interval table is not displayed

    # #Monitor Diffuser Program
    # When I click on the "Parameters" button for instance name "/BTR/DIF_CL_AUTO_SFLIGHT_1" in the Monitor Diffuser Program page
    
    # #Job details
    # Then Verify that a new Tab is opened with header "Job Details"
    # And Verify the title "Sample Late Bill Template" is displayed in the Job Details tab
    # And Verify there is a tab for "Scheduling Options"
    # And Verify there is a tab for "Run Details"
    # And Verify there is a tab for "Parameters"
    # When I click on the existing Diffuser tab

    # # #Monitor Diffuser Program Instance line
    # When I click on the "Application Log" button for instance name "/BTR/DIF_CL_AUTO_SFLIGHT_1" in the Monitor Diffuser Program page

    # # #Log details
    # Then Verify that a new Tab is opened with header "Log Details"
    # And Verify the column "Type" is displayed
    # And Verify the column "Message" is displayed
    # And Verify the column "Created on" is displayed
    # When I click on the existing Diffuser tab

    # # #Monitor Diffuser Program Instance line
    # When I click on the "Parallel Processes" button for instance name "/BTR/DIF_CL_AUTO_SFLIGHT_1" in the Monitor Diffuser Program page
    
    # # #Monitor Diffuser Program Parralel Processes
    # Then Verify the "Parallel Processes" pop up screen appears
    # And Verify the column "Job Description" is displayed
    # And Verify the column "Status" is displayed
    # And Verify the column "Actions" is displayed
    # When I click the "Close" button on the Parallel Processes pop up screen

    # # #Monitor Diffuser Program Instance line
    # Then Verify the "Monitor Diffuser Program" page is displayed
    # When I click on the "Resume Instance" button for instance name "/BTR/DIF_CL_AUTO_SFLIGHT_1" in the Monitor Diffuser Program page
    # Then Verify that the "Instance Status" column for instance name "/BTR/DIF_CL_AUTO_SFLIGHT_1" is updated to "In Process" on the Monitor Diffuser Program page
    # And Verify that the row for instance name "/BTR/DIF_CL_AUTO_SFLIGHT_1" is contains todays date in the "End Date" column on the Monitor Diffuser Program page
    # And Verify that the row for instance name "/BTR/DIF_CL_AUTO_SFLIGHT_1" is displayed with "100%" in the "Complete" column on the Monitor Diffuser Program page


    # # #Monitor Diffuser Program Results
    # When I click on the "Results" button for instance name "/BTR/DIF_CL_AUTO_SFLIGHT_1" in the Monitor Diffuser Program page
    # Then Verify that the "Results" pop up screen appears
    # Then Verify the "Results" pop up screen appears
    # When I click the "Close" button on the Results pop up screen
    # Then Verify the "Monitor Diffuser Program" page is displayed
    # When I click on the "Home" button on the Monitor Diffuser Program page