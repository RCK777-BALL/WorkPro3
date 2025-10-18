# Asset Hierarchy Import Template

Use the "Download Hierarchy Template" action on the Assets & Locations page to grab a ready-to-use CSV that can be opened in
Excel for bulk creating departments, lines, and stations that feed asset drop-downs. The CSV includes the following columns:

- **Department Name*** – required name of the department to add or update.
- **Department Notes (optional)** – free-form context about the department.
- **Line Name*** – required when defining a new line for a department.
- **Line Notes (optional)** – additional context for the line.
- **Station Name*** – required when defining a station on the line.
- **Station Number (optional)** – numeric or alphanumeric reference used on the shop floor.
- **Station Notes (optional)** – extra context about the station.
- **Station Increment (optional)** – choose how generated station numbers should advance (for example, None, +5, or +10).

Example rows in the template illustrate how to complete the sheet before uploading it through the import flow.

## Example layout

When preparing the CSV in Excel or Google Sheets it can be helpful to mirror the layout of the in-app
import form. The mock layout below demonstrates how the department, line, and station fields can be
captured prior to export:

| Department | Lines     | Stations          | Station Increment |
|------------|-----------|-------------------|-------------------|
| BRONCO     | FRONT MOD | 00-300            | +5                |
| BRONCO     | REAR MOD  | 00-300            | +5                |
| BRONCO     | MAIN LINE | 00-300            | None              |
| RANGER     | FRONT MOD | 00-300            | +10               |
| RANGER     | REAR MOD  | 00-300            | +10               |
| RANGER     | MAIN LINE | 00-300            | None              |
| LAMBDA     | FRONT MOD | 00-300            | +5                |
| LAMBDA     | REAR MOD  | 00-300            | +5                |
| DELTA      | LCA'S     | 00-300            | None              |

The **Station Increment** column represents the optional increment selector that appears in the upload
form. Choose **None** to keep the provided station values as-is, or pick a preset such as **+5** or **+10**
to auto-generate evenly spaced station numbers within the specified range. Additional increments (for
example **+25**) can be added to the spreadsheet if your implementation supports them, and the importer
will respect whichever option is selected for each row.
