# @ui @sap @diffuser @display-results
# Feature:Display results tile navigation
#   As a SAP user with runtime access
#   I want to open the Display Results tile
#   So that I can verify navigation to the display results page works

#   Scenario: Display the results of running diffuser program with "Generate Variant Internally" option enabled specifying the interval count and the lock technical settings and lock diffuser mode enabled
#     # Given I am logged in to SAP FLP with username "TESTALL"
#     # When I open the Diffuser App from FLP
#     # Then I should be on the Diffuser homepage
#     # And the "Display Results" tile should be visible on the Diffuser homepage
#     When I click the "Display Results" tile on the Diffuser homepage
#     Then the Display Results page should be displayed

#     #Display Results page filters and table
#     # When I refresh the page
#     # When I click on the dropdown for the "Program Name:" filter on the Display Results page
#     # And I select the "/BTR/DIF_CL_AUTO_SFLIGHT" option
#     # Then Verify that the "Program Name:" filter is populated with "/BTR/DIF_CL_AUTO_SFLIGHT" on the Display Results page
#     When I click on the "Open Picker" button on the Display Results page
#     And I select the "Today" option
#     # Then Verify that the "Date:" filter is populated with "Today" and todays date on the Monitor Diffuser Program page
#     When I click on the "Go" button on the Display Results page
#     And Verify that there is a row for instance name "/BTR/DIF_CL_AUTO_SFLIGHT_1" in the table on the Display Results page
#     And Verify that the row for instance name "/BTR/DIF_CL_AUTO_SFLIGHT_1" is displayed with "TESTALL" in the "Started By" column on the Display Results page
#     And Verify that the row for instance name "/BTR/DIF_CL_AUTO_SFLIGHT_1" contains todays date in the "Start Date" column on the Display Results page
#     And Verify that the row for instance name "/BTR/DIF_CL_AUTO_SFLIGHT_1" contains todays date in the "End Date" column on the Display Results page
#     And Verify that the row for instance name "/BTR/DIF_CL_AUTO_SFLIGHT_1" is displayed with "Finished" in the "Instance Status" column on the Display Results page
#     And Verify that the row for instance name "/BTR/DIF_CL_AUTO_SFLIGHT_1" is displayed with "100%" in the "Complete" column on the Display Results page 
#     When I click on the row for instance name "/BTR/DIF_CL_AUTO_SFLIGHT_1" in the Display Results page

#     #Display Results Interval table for instance
#     Then Verify that a table is displayed with the title "/BTR/DIF_CL_AUTO_SFLIGHT_1" on the Display Results page
#     And Verify that the table contains 99 rows for instance name "/BTR/DIF_CL_AUTO_SFLIGHT_1" on the Display Results page
#     And Verify that the column "Interval" is displayed in the table for instance name "/BTR/DIF_CL_AUTO_SFLIGHT_1" on the Display Results page
#     And Verify that the column "Low" is displayed in the table for instance name "/BTR/DIF_CL_AUTO_SFLIGHT_1" on the Display Results page
#     And Verify that the column "High" is displayed in the table for instance name "/BTR/DIF_CL_AUTO_SFLIGHT_1" on the Display Results page
#     And Verify that the column "Status" is displayed in the table for instance name "/BTR/DIF_CL_AUTO_SFLIGHT_1" on the Display Results page
#     And Verify that all rows in the "Status" column of the table for instance name "/BTR/DIF_CL_AUTO_SFLIGHT_1" on the Display Results page are displayed with "Completed"
#     And Verify that the column "Results" is displayed in the table for instance name "/BTR/DIF_CL_AUTO_SFLIGHT_1" on the Display Results page