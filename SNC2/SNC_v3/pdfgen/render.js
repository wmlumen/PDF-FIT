const { chromium } = require('playwright');
const EXE = 'C:/Users/HP 250 G10/AppData/Local/ms-playwright/chromium-1208/chrome-win64/chrome.exe';

(async () => {
  const browser = await chromium.launch({ executablePath: EXE, headless: true });
  const page = await browser.newPage();
  const htmlPath = 'file:///C:/Users/HP%20250%20G10/Documents/GITHUT/SNC2/SNC_v3/pdfgen/manual.html';
  await page.goto(htmlPath);
  await page.waitForTimeout(600);
  const pdfPath = 'C:/Users/HP 250 G10/Documents/GITHUT/SNC2/SNC_v3/docs/manual/SNC_v3_Manual_Usuario_v1.0.pdf';
  await page.pdf({ path: pdfPath, format: 'A4', printBackground: true, margin: { top: '1.8cm', bottom: '2.2cm', left: '1.8cm', right: '1.8cm' } });
  await browser.close();
  console.log('PDF_OK');
})();
