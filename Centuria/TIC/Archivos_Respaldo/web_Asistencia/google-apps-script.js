const SPREADSHEET_ID = "PEGA_AQUI_EL_ID_DE_TU_SHEET";
const SHEET_NAME = "Asistencia";

function doGet() {
  const sheet = getSheet_();
  const values = sheet.getDataRange().getValues();

  if (values.length <= 1) {
    return jsonOutput_({ records: [] });
  }

  const headers = values[0];
  const records = values.slice(1).reverse().map((row) => {
    return headers.reduce((acc, header, index) => {
      acc[header] = row[index];
      return acc;
    }, {});
  });

  return jsonOutput_({ records });
}

function doPost(e) {
  const data = JSON.parse(e.postData.contents || "{}");
  const sheet = getSheet_();

  sheet.appendRow([
    data.studentName || "",
    data.studentId || "",
    data.career || "",
    data.notes || "",
    data.sourcePage || "",
    data.timestamp || new Date().toISOString()
  ]);

  return jsonOutput_({
    ok: true,
    message: "Asistencia guardada"
  });
}

function getSheet_() {
  const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = spreadsheet.getSheetByName(SHEET_NAME) || spreadsheet.insertSheet(SHEET_NAME);

  if (sheet.getLastRow() === 0) {
    sheet.appendRow([
      "studentName",
      "studentId",
      "career",
      "notes",
      "sourcePage",
      "timestamp"
    ]);
  }

  return sheet;
}

function jsonOutput_(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}
