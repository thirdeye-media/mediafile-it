# Spreadsheet Configuration

This application fetches data from a Google Spreadsheet using its unique ID. By default, it expects a public spreadsheet.

## Spreadsheet ID

**ID:** `1p_VQI3HhaNQj9BiLpzvuH4WRgIxrxbDsUWnnRmKlktM`

To change the spreadsheet the application reads from, replace the ID above. 

**IMPORTANT: Keep the `**ID:** \`[YOUR_ID]\`` format exactly as it is, as the application parses this file to extract it.**

## Requirements

1. **Public Access:** The spreadsheet must be accessible via the link. Go to "Share" in Google Sheets and set the general access to **"Anyone with the link" can "Viewer"**.
2. **Strict Format:** The application requires specific column headers to function correctly. You cannot rename or remove the core columns without modifying the source code.
3. **Getting the ID:** The ID is the long string of characters in the URL of your Google Sheet. For example, if your URL is `https://docs.google.com/spreadsheets/d/1abc123DEF456/edit`, the ID is `1abc123DEF456`.

## Using the Template

In the same folder as this file, you will find `SPREADSHEET_TEMPLATE.csv`. 

To start a new project:
1. Create a new Google Sheet.
2. Go to **File -> Import -> Upload** and upload the `SPREADSHEET_TEMPLATE.csv` file. 
3. Replace the data in the template with your own data, but **DO NOT** change the headers in the first row.
4. Set the sharing permissions to "Anyone with the link".
5. Extract the new ID from the URL and replace it in the **Spreadsheet ID** section above.
