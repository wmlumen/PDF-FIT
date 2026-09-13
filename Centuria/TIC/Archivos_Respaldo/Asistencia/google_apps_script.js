function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const sheet = SpreadsheetApp.openById('1aSjqcD6Rcg1Yt1NaMVy7Q25TthqzwT_FxxXPTV0ilWA').getActiveSheet();
    const row = [
      new Date(),
      data.student || '',
      data.cedula || '',
      data.attempt || '',
      data.score || '',
      data.total || '',
      data.percent || '',
      JSON.stringify(data.details || [])
    ];
    sheet.appendRow(row);
    return ContentService.createTextOutput(JSON.stringify({status: 'ok'})).setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({status: 'error', message: error.toString()})).setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet() {
  return ContentService.createTextOutput(JSON.stringify({status: 'ok'})).setMimeType(ContentService.MimeType.JSON);
}
