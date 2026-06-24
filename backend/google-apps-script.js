const SPREADSHEET_ID = "1jfsAslOYRH6Hy_NURJLxA4W6YQ3p6N717TMmdJewEWs";
const SHEET_NAME = "Student Results";
const CONTACTS_SHEET_NAME = "Parent Contacts";

const HEADERS = [
  "Submitted At",
  "Class",
  "Student Name",
  "Score",
  "Stars",
  "Pattern Count",
  "Pattern Names",
  "Highest Red Light Combo",
  "Sentence Streak",
  "Flip Matches",
  "Flip Moves",
  "Last Mode",
  "Learning Performance",
  "Missed Points",
  "Mistake Details",
  "Parent Advice",
  "Report Tags",
  "Skill Diagnostics",
  "Email Report",
  "Email Sent At",
  "Source",
  "Version"
];

const CONTACT_HEADERS = [
  "Class",
  "Student Name",
  "Parent Email",
  "Parent Name",
  "Notes"
];

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu("Y4 Reports")
    .addItem("Create parent contacts sheet", "createParentContactsSheet")
    .addItem("Send report for selected rows", "sendReportsForSelectedRows")
    .addToUi();
}

function doGet() {
  return jsonOutput({
    ok: true,
    service: "Y4 Science Memory Game database",
    message: "Ready to receive student results."
  });
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);

  try {
    const body = parseBody(e);
    const entry = body.entry || body;
    const sheet = getResultSheet();
    ensureHeaders(sheet);

    sheet.appendRow([
      new Date(),
      cleanText(entry.className || "Y4", 24),
      cleanText(entry.name || "Student", 40),
      toNumber(entry.score),
      toNumber(entry.stars),
      toNumber(entry.rewards),
      cleanList(entry.rewardNames, 500),
      toNumber(entry.maxMissionCombo),
      toNumber(entry.maxBuilderStreak),
      toNumber(entry.bestFlipMatches),
      toNumber(entry.bestFlipMoves),
      cleanText(entry.mode || "", 40),
      cleanText(entry.reportSummary || "", 500),
      cleanText(entry.reportMisses || "", 800),
      cleanList(entry.mistakeDetails, 1200),
      cleanText(entry.reportAdvice || "", 800),
      cleanList(entry.reportTags, 500),
      cleanSkillDiagnostics(entry.skillStats),
      cleanText(entry.emailReport || "", 3000),
      "",
      cleanText(body.source || "squid-game-sc", 60),
      cleanText(body.version || "", 40)
    ]);

    return jsonOutput({ ok: true });
  } catch (error) {
    return jsonOutput({ ok: false, error: String(error.message || error) });
  } finally {
    lock.releaseLock();
  }
}

function parseBody(e) {
  if (!e || !e.postData || !e.postData.contents) {
    throw new Error("Missing POST body.");
  }
  return JSON.parse(e.postData.contents);
}

function getSpreadsheet() {
  const spreadsheet = SPREADSHEET_ID
    ? SpreadsheetApp.openById(SPREADSHEET_ID)
    : SpreadsheetApp.getActiveSpreadsheet();
  if (!spreadsheet) {
    throw new Error("No spreadsheet found. Bind this script to a Google Sheet or set SPREADSHEET_ID.");
  }
  return spreadsheet;
}

function getResultSheet() {
  const spreadsheet = getSpreadsheet();
  return spreadsheet.getSheetByName(SHEET_NAME) || spreadsheet.insertSheet(SHEET_NAME);
}

function ensureHeaders(sheet) {
  if (sheet.getLastRow() <= 0) {
    sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
  } else {
    const width = Math.max(sheet.getLastColumn(), 1);
    const existing = sheet.getRange(1, 1, 1, width).getValues()[0].map(String);
    HEADERS.forEach((header) => {
      if (!existing.includes(header)) {
        sheet.getRange(1, sheet.getLastColumn() + 1).setValue(header);
        existing.push(header);
      }
    });
  }
  sheet.setFrozenRows(1);
  sheet.getRange(1, 1, 1, sheet.getLastColumn())
    .setFontWeight("bold")
    .setBackground("#e8fff8");
  sheet.autoResizeColumns(1, sheet.getLastColumn());
}

function createParentContactsSheet() {
  const spreadsheet = getSpreadsheet();
  const sheet = spreadsheet.getSheetByName(CONTACTS_SHEET_NAME) || spreadsheet.insertSheet(CONTACTS_SHEET_NAME);
  if (sheet.getLastRow() <= 0) {
    sheet.getRange(1, 1, 1, CONTACT_HEADERS.length).setValues([CONTACT_HEADERS]);
    sheet.setFrozenRows(1);
  }
  sheet.getRange(1, 1, 1, CONTACT_HEADERS.length)
    .setFontWeight("bold")
    .setBackground("#fff4d8");
  sheet.autoResizeColumns(1, CONTACT_HEADERS.length);
  SpreadsheetApp.getUi().alert("Parent Contacts sheet is ready. Add Class, Student Name, and Parent Email before sending reports.");
}

function sendReportsForSelectedRows() {
  const ui = SpreadsheetApp.getUi();
  const sheet = SpreadsheetApp.getActiveSheet();
  if (!sheet || sheet.getName() !== SHEET_NAME) {
    ui.alert(`Open the "${SHEET_NAME}" sheet first, then select the student row or rows to send.`);
    return;
  }

  ensureHeaders(sheet);
  const range = sheet.getActiveRange();
  if (!range) {
    ui.alert("Select one or more student result rows first.");
    return;
  }

  const rows = [];
  for (let row = range.getRow(); row < range.getRow() + range.getNumRows(); row += 1) {
    if (row > 1) rows.push(row);
  }
  if (!rows.length) {
    ui.alert("Select one or more student result rows first. Do not select only the header row.");
    return;
  }

  const result = sendReportsForRows_(rows);
  ui.alert(`Reports sent: ${result.sent}\nSkipped: ${result.skipped.join("\n") || "None"}`);
}

function sendReportsForRows_(rows) {
  const sheet = getResultSheet();
  ensureHeaders(sheet);
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(String);
  const contacts = loadParentContacts_();
  const sentAtColumn = headers.indexOf("Email Sent At") + 1;
  const result = { sent: 0, skipped: [] };

  rows.forEach((row) => {
    const values = sheet.getRange(row, 1, 1, sheet.getLastColumn()).getValues()[0];
    const entry = rowToObject_(headers, values);
    const className = cleanText(entry["Class"], 24);
    const studentName = cleanText(entry["Student Name"], 40);
    const contact = contacts[contactKey_(className, studentName)];
    if (!contact || !contact.email) {
      result.skipped.push(`${className} ${studentName}: no parent email`);
      return;
    }

    MailApp.sendEmail({
      to: contact.email,
      subject: buildParentEmailSubject_(entry),
      body: buildParentEmailBody_(entry, contact)
    });
    if (sentAtColumn > 0) sheet.getRange(row, sentAtColumn).setValue(new Date());
    result.sent += 1;
  });

  return result;
}

function loadParentContacts_() {
  const spreadsheet = getSpreadsheet();
  let sheet = spreadsheet.getSheetByName(CONTACTS_SHEET_NAME);
  if (!sheet) {
    sheet = spreadsheet.insertSheet(CONTACTS_SHEET_NAME);
    sheet.getRange(1, 1, 1, CONTACT_HEADERS.length).setValues([CONTACT_HEADERS]);
    sheet.setFrozenRows(1);
  }

  const values = sheet.getDataRange().getValues();
  const contacts = {};
  values.slice(1).forEach((row) => {
    const className = cleanText(row[0], 24);
    const studentName = cleanText(row[1], 40);
    const email = cleanText(row[2], 120);
    const parentName = cleanText(row[3], 80);
    if (className && studentName && email) {
      contacts[contactKey_(className, studentName)] = { email, parentName };
    }
  });
  return contacts;
}

function contactKey_(className, studentName) {
  return `${cleanText(className, 24).toLowerCase()}|${cleanText(studentName, 40).toLowerCase()}`;
}

function rowToObject_(headers, values) {
  return headers.reduce((entry, header, index) => {
    entry[header] = values[index];
    return entry;
  }, {});
}

function buildParentEmailSubject_(entry) {
  return `Y4 Science Game Learning Report - ${cleanText(entry["Student Name"], 40)}`;
}

function buildParentEmailBody_(entry, contact) {
  const parentGreeting = contact.parentName ? `Dear ${contact.parentName},` : "Dear Parent / Guardian,";
  const savedReport = cleanText(entry["Email Report"], 3000);
  if (savedReport) {
    return [
      parentGreeting,
      "",
      savedReport,
      "",
      "This report is generated from the Y4 Science Game practice activity.",
      "Thank you."
    ].join("\n");
  }

  return [
    parentGreeting,
    "",
    `Student: ${cleanText(entry["Student Name"], 40)} (${cleanText(entry["Class"], 24)})`,
    `Score: ${toNumber(entry["Score"])} | Stars: ${toNumber(entry["Stars"])} | Patterns: ${toNumber(entry["Pattern Count"])}`,
    "",
    `Learning performance: ${cleanText(entry["Learning Performance"], 800)}`,
    `Missed points: ${cleanText(entry["Missed Points"], 800)}`,
    `Recent mistakes: ${cleanText(entry["Mistake Details"], 1200)}`,
    `Parent advice: ${cleanText(entry["Parent Advice"], 800)}`,
    "",
    "This report is generated from the Y4 Science Game practice activity.",
    "Thank you."
  ].join("\n");
}

function cleanText(value, maxLength) {
  return String(value || "").replace(/\s+/g, " ").trim().slice(0, maxLength);
}

function cleanList(value, maxLength) {
  const limit = maxLength || 500;
  if (Array.isArray(value)) return value.map((item) => cleanText(item, 160)).filter(Boolean).join("; ").slice(0, limit);
  return cleanText(value, limit);
}

function cleanSkillDiagnostics(value) {
  if (!Array.isArray(value)) return cleanText(value || "", 1200);
  return value
    .map((item) => `${cleanText(item.skill || "", 80)} correct:${toNumber(item.correct)} wrong:${toNumber(item.wrong)} timeout:${toNumber(item.timeout)} misses:${toNumber(item.misses)}`)
    .filter(Boolean)
    .join("; ")
    .slice(0, 1200);
}

function toNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function jsonOutput(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}
