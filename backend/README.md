# Y4 Science Game Database Setup

This folder contains the Google Apps Script backend for saving student results into Google Sheets.

## What It Saves

Each saved result records:

- class
- student name
- score
- stars
- unlocked pattern stickers
- red-light combo
- sentence streak
- flip-card matches
- learning performance text
- parent advice text
- submission time

## Setup

1. Create a Google Sheet, for example: `Y4 Science Game Student Results`.
2. In the Sheet, open `Extensions` > `Apps Script`.
3. Delete the starter code and paste everything from `google-apps-script.js`.
4. Save the Apps Script project.
5. Click `Deploy` > `New deployment`.
6. Choose `Web app`.
7. Set:
   - Execute as: `Me`
   - Who has access: `Anyone`
8. Deploy and copy the Web app URL.
9. Open `index.html` and replace:

```js
const CLOUD_DATABASE_URL = "";
```

with:

```js
const CLOUD_DATABASE_URL = "YOUR_WEB_APP_URL_HERE";
```

10. Commit and push the updated `index.html` to GitHub.

## Teacher View

Teachers can open the Google Sheet to see all submitted student results. The game still keeps a local backup in each browser, but the Google Sheet is the central class database.

## Privacy Note

Use student first names, nicknames, or class codes if you do not want full names in the database. Do not collect private student ID numbers unless your school has approved it.
