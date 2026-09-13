/**
 * Centuria Download Engine
 * Provee funcionalidad de exportación faithful a PDF y Word
 */

document.addEventListener('DOMContentLoaded', () => {
    // 1. Inyectar estilos necesarios
    const styles = `
        .download-hub {
            position: fixed;
            top: 20px;
            right: 20px;
            display: flex;
            gap: 12px;
            z-index: 9999;
            animation: slideInDown 0.6s cubic-bezier(0.23, 1, 0.32, 1);
        }
        .btn-hub {
            padding: 12px 24px;
            border: none;
            border-radius: 50px;
            font-weight: 800;
            font-family: 'Outfit', sans-serif;
            cursor: pointer;
            color: white;
            display: flex;
            align-items: center;
            gap: 10px;
            box-shadow: 0 10px 20px rgba(0,0,0,0.2);
            transition: all 0.3s ease;
            text-transform: uppercase;
            letter-spacing: 1px;
            font-size: 0.8rem;
        }
        .btn-pdf { background: #e74c3c; border: 2px solid #ff7675; }
        .btn-word { background: #2980b9; border: 2px solid #3498db; }
        .btn-hub:hover {
            transform: translateY(-3px) scale(1.05);
            box-shadow: 0 15px 30px rgba(0,0,0,0.3);
            filter: brightness(1.1);
        }
        .btn-hub:active { transform: translateY(0); }
        
        @keyframes slideInDown {
            from { opacity: 0; transform: translateY(-50px); }
            to { opacity: 1; transform: translateY(0); }
        }

        @media print {
            .no-print, .download-hub, .btn-print { display: none !important; }
            body { background: white !important; }
            .page { 
                margin: 0 !important; 
                box-shadow: none !important; 
                border-top: 5px solid #0d47a1 !important;
                width: 100% !important;
            }
        }
    `;

    const styleSheet = document.createElement("style");
    styleSheet.innerText = styles;
    document.head.appendChild(styleSheet);

    // 2. Crear el Hub de botones
    const hub = document.createElement('div');
    hub.className = 'download-hub no-print';

    const pdfBtn = document.createElement('button');
    pdfBtn.className = 'btn-hub btn-pdf';
    pdfBtn.innerHTML = '<span>📄</span> PDF (Original)';
    pdfBtn.onclick = () => window.print();

    const wordBtn = document.createElement('button');
    wordBtn.className = 'btn-hub btn-word';
    wordBtn.innerHTML = '<span>📝</span> WORD (Doc)';
    wordBtn.onclick = () => exportToWord();

    hub.appendChild(pdfBtn);
    hub.appendChild(wordBtn);
    document.body.appendChild(hub);
});

/**
 * Exporta el contenido a Word manteniendo encabezados básicos
 */
function exportToWord() {
    const filename = document.title || 'Clase_Informatica_Aplicada';
    
    // Capturamos el contenido de todas las secciones .page si existen, o el body
    const pages = document.querySelectorAll('.page');
    let content = "";
    
    if (pages.length > 0) {
        pages.forEach(p => content += p.innerHTML + "<br clear='all' style='page-break-before:always'>");
    } else {
        content = document.body.innerHTML;
    }

    const preHtml = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
                    <head><meta charset='utf-8'><title>Export</title>
                    <style>
                        body { font-family: 'Arial', sans-serif; }
                        h1 { color: #0d47a1; }
                        table { border-collapse: collapse; width: 100%; }
                        th, td { border: 1px solid #ccc; padding: 8px; }
                        .badge { background: #eee; padding: 5px; }
                    </style>
                    </head><body>`;
    const postHtml = "</body></html>";
    const fullHtml = preHtml + content + postHtml;

    const blob = new Blob(['\ufeff', fullHtml], {
        type: 'application/msword'
    });
    
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename + ".doc";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}
