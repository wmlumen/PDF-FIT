const fs = require('fs');
let s = fs.readFileSync('js/export.js', 'utf8');

// 1. Add import
if (!s.includes('signatureManager.js')) {
  s = s.replace(/import { logger } from '\.\/logger\.js';(\r?\n)/, "import { logger } from './logger.js';$1import { SignatureAPI } from './signatureManager.js';$1");
}

// 2. Locate región
const startStr = '// ==================== FIRMA DIGITAL SIMBÓLICA ====================';
const endStr = 'generarFirmaDigitalCualificada(doc, profesionalData, true);';

const pStart = s.indexOf(startStr);
const pEnd = s.indexOf(endStr);

if (pStart !== -1 && pEnd !== -1) {
  const replacement = `// ==================== PROTOCOLO OFICIAL DE FIRMAS Y SELLOS (Ley 6822/21) ====================\r\n` +
    `        if (yPosition > 210) {\r\n` +
    `            doc.addPage();\r\n` +
    `            yPosition = 25;\r\n` +
    `        }\r\n` +
    `        const firmasEnsambladas = State.get('firmasEnsambladas') || [];\r\n` +
    `        SignatureAPI.renderizarFirmasEnPDF(doc, firmasEnsambladas);\r\n`;
  s = s.substring(0, pStart) + replacement + s.substring(pEnd + endStr.length);
  fs.writeFileSync('js/export.js', s, 'utf8');
  console.log('Patch applied successfully to js/export.js!');
} else {
  console.error('Target región not found:', pStart, pEnd);
  process.exit(1);
}
