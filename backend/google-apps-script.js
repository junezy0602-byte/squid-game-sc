const SPREADSHEET_ID = "1jfsAslOYRH6Hy_NURJLxA4W6YQ3p6N717TMmdJewEWs";
const SHEET_NAME = "Student Results";

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
  "Parent Advice",
  "Report Tags",
  "Source",
  "Version"
];

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
      cleanList(entry.rewardNames),
      toNumber(entry.maxMissionCombo),
      toNumber(entry.maxBuilderStreak),
      toNumber(entry.bestFlipMatches),
      toNumber(entry.bestFlipMoves),
      cleanText(entry.mode || "", 40),
      cleanText(entry.reportSummary || "", 500),
      cleanText(entry.reportAdvice || "", 500),
      cleanList(entry.reportTags),
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

function getResultSheet() {
  const spreadsheet = SPREADSHEET_ID
    ? SpreadsheetApp.openById(SPREADSHEET_ID)
    : SpreadsheetApp.getActiveSpreadsheet();
  if (!spreadsheet) {
    throw new Error("No spreadsheet found. Bind this script to a Google Sheet or set SPREADSHEET_ID.");
  }
  return spreadsheet.getSheetByName(SHEET_NAME) || spreadsheet.insertSheet(SHEET_NAME);
}

function ensureHeaders(sheet) {
  if (sheet.getLastRow() > 0) return;
  sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
  sheet.setFrozenRows(1);
  sheet.getRange(1, 1, 1, HEADERS.length)
    .setFontWeight("bold")
    .setBackground("#e8fff8");
  sheet.autoResizeColumns(1, HEADERS.length);
}

function cleanText(value, maxLength) {
  return String(value || "").replace(/\s+/g, " ").trim().slice(0, maxLength);
}

function cleanList(value) {
  if (Array.isArray(value)) return value.map((item) => cleanText(item, 80)).filter(Boolean).join(", ");
  return cleanText(value, 500);
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
