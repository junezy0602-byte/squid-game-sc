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
  "WhatsApp Report",
  "WhatsApp Link",
  "WhatsApp Link Created At",
  "Source",
  "Version"
];

const CONTACT_HEADERS = [
  "Class",
  "Student Name",
  "Parent WhatsApp",
  "Parent Name",
  "Notes"
];

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu("Y4 Reports")
    .addItem("Create parent contacts sheet", "createParentContactsSheet")
    .addItem("Build WhatsApp links for selected rows", "buildWhatsAppLinksForSelectedRows")
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
      cleanText(entry.whatsAppReport || "", 3000),
      "",
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
  SpreadsheetApp.getUi().alert("Parent Contacts sheet is ready. Add Class, Student Name, and Parent WhatsApp number. Use country code, for example 60123456789.");
}

function buildWhatsAppLinksForSelectedRows() {
  const ui = SpreadsheetApp.getUi();
  const sheet = SpreadsheetApp.getActiveSheet();
  if (!sheet || sheet.getName() !== SHEET_NAME) {
    ui.alert(`Open the "${SHEET_NAME}" sheet first, then select the student row or rows.`);
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

  const result = buildWhatsAppLinksForRows_(rows);
  ui.alert(`WhatsApp links ready: ${result.ready}\nSkipped: ${result.skipped.join("\n") || "None"}`);
}

function buildWhatsAppLinksForRows_(rows) {
  const sheet = getResultSheet();
  ensureHeaders(sheet);
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(String);
  const contacts = loadParentContacts_();
  const linkColumn = headers.indexOf("WhatsApp Link") + 1;
  const createdAtColumn = headers.indexOf("WhatsApp Link Created At") + 1;
  const result = { ready: 0, skipped: [] };

  rows.forEach((row) => {
    const values = sheet.getRange(row, 1, 1, sheet.getLastColumn()).getValues()[0];
    const entry = rowToObject_(headers, values);
    const className = cleanText(entry["Class"], 24);
    const studentName = cleanText(entry["Student Name"], 40);
    const contact = contacts[contactKey_(className, studentName)];
    if (!contact || !contact.phone) {
      result.skipped.push(`${className} ${studentName}: no parent WhatsApp number`);
      return;
    }

    const link = buildWhatsAppUrl_(contact.phone, buildWhatsAppMessage_(entry, contact));
    if (linkColumn > 0) {
      sheet.getRange(row, linkColumn)
        .setFormula(`=HYPERLINK("${link}", "Open WhatsApp")`);
    }
    if (createdAtColumn > 0) sheet.getRange(row, createdAtColumn).setValue(new Date());
    result.ready += 1;
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
    const phone = cleanPhone(row[2]);
    const parentName = cleanText(row[3], 80);
    if (className && studentName && phone) {
      contacts[contactKey_(className, studentName)] = { phone, parentName };
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

function buildWhatsAppUrl_(phone, message) {
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}

function buildWhatsAppMessage_(entry, contact) {
  const greeting = contact.parentName ? `Hi ${contact.parentName},` : "Hi Parent / Guardian,";
  const savedReport = cleanText(entry["WhatsApp Report"], 3000);
  if (savedReport) {
    return [
      greeting,
      "",
      savedReport,
      "",
      "这份报告根据孩子在 Y4 科学格式小游戏中的练习自动整理。"
    ].join("\n");
  }

  return [
    greeting,
    "",
    "*Y4 科学格式学习报告*",
    "",
    `学生：${cleanText(entry["Student Name"], 40)}`,
    `班级：${cleanText(entry["Class"], 24)}`,
    `分数：${toNumber(entry["Score"])}｜星星：${toNumber(entry["Stars"])}｜图案：${toNumber(entry["Pattern Count"])}`,
    "",
    `*学习表现*：${cleanText(entry["Learning Performance"], 800)}`,
    `*需要复习*：${cleanText(entry["Missed Points"], 800)}`,
    `*最近 miss 的点*：${cleanText(entry["Mistake Details"], 1200)}`,
    `*给家长的建议*：${cleanText(entry["Parent Advice"], 800)}`,
    "",
    "这份报告根据孩子在 Y4 科学格式小游戏中的练习自动整理。"
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

function cleanPhone(value) {
  let phone = String(value || "").replace(/\D/g, "");
  if (phone.startsWith("0")) phone = `6${phone}`;
  return phone.slice(0, 20);
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
