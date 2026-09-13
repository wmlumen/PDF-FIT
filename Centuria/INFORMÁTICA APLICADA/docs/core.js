/**
 * Centuria Core System 2.0
 * Handles Navigation, Global Teacher ID, Library and Class Map
 */

const UNIT_LIST = [
    { id: 1, title: 'Concepto de Sistemas', file: 'Unidad_I_Plan_Clase.html' },
    { id: 2, title: 'Algoritmia y Lógica', file: 'Unidad_II_Plan_Clase.html' },
    { id: 3, title: 'Word y Reportes', file: 'Unidad_III_Plan_Clase.html' },
    { id: 4, title: 'Excel Avanzado', file: 'Unidad_IV_Plan_Clase.html' },
    { id: 5, title: 'Integración I', file: 'Unidad_V_Plan_Clase.html' },
    { id: 6, title: 'ERP y Gestión', file: 'Unidad_VI_Plan_Clase.html' },
    { id: 7, title: 'SIC Moderno', file: 'Unidad_VII_Plan_Clase.html' },
    { id: 8, title: 'Legal DNIT', file: 'Unidad_VIII_Plan_Clase.html' },
    { id: 9, title: 'E-Commerce', file: 'Unidad_IX_Plan_Clase.html' },
    { id: 10, title: 'Examen Parcial', file: 'Unidad_X_Plan_Clase.html' },
    { id: 11, title: 'Auditoría Sist.', file: 'Unidad_XI_Plan_Clase.html' },
    { id: 12, title: 'Auditoría Prog.', file: 'Unidad_XII_Plan_Clase.html' },
    { id: 13, title: 'Control Interno', file: 'Unidad_XIII_Plan_Clase.html' },
    { id: 14, title: 'Seguridad Inf.', file: 'Unidad_XIV_Plan_Clase.html' },
    { id: 15, title: 'Big Data / BI', file: 'Unidad_XV_Plan_Clase.html' },
    { id: 16, title: 'Ética Informática', file: 'Unidad_XVI_Plan_Clase.html' },
    { id: 17, title: 'Teletrabajo', file: 'Unidad_XVII_Plan_Clase.html' },
    { id: 18, title: 'IA en Contabilidad', file: 'Unidad_XVIII_Plan_Clase.html' },
    { id: 19, title: 'Blockchain', file: 'Unidad_XIX_Plan_Clase.html' },
    { id: 20, title: 'Repaso Final', file: 'Unidad_XX_Plan_Clase.html' },
    { id: 21, title: 'Proyectos I', file: 'Unidad_XXI_Plan_Clase.html' },
    { id: 22, title: 'Proyectos II', file: 'Unidad_XXII_Plan_Clase.html' },
    { id: 23, title: 'Cierre de Actas', file: 'Unidad_XXIII_Plan_Clase.html' }
];

document.addEventListener('DOMContentLoaded', () => {
    injectGlobalStyles();
    injectNavigation();
    updateTeacherName();
    injectClassMap();
});

function injectGlobalStyles() {
    const css = `
        :root {
            --nav-bg: #0f172a;
            --nav-accent: #3b82f6;
            --nav-text: #f8fafc;
        }
        
        /* Navigation Bar */
        .master-nav {
            position: fixed; top: 0; left: 0; right: 0;
            background: var(--nav-bg);
            color: var(--nav-text);
            height: 60px;
            display: flex; align-items: center; justify-content: space-between;
            padding: 0 20px;
            z-index: 10000;
            box-shadow: 0 2px 10px rgba(0,0,0,0.3);
            font-family: 'Outfit', sans-serif;
        }
        
        .nav-group { display: flex; gap: 15px; align-items: center; }
        
        .btn-nav {
            background: rgba(255,255,255,0.05);
            border: 1px solid rgba(255,255,255,0.1);
            color: white;
            padding: 8px 15px;
            border-radius: 8px;
            font-size: 0.85rem;
            cursor: pointer;
            text-decoration: none;
            transition: 0.3s;
            display: flex; align-items: center; gap: 8px;
        }
        
        .btn-nav:hover { background: var(--nav-accent); transform: translateY(-2px); }
        
        .teacher-badge {
            background: var(--nav-accent);
            padding: 5px 12px;
            border-radius: 20px;
            font-size: 0.75rem;
            font-weight: bold;
        }

        /* Class Map Overlay */
        #classMap {
            position: fixed; top: 0; right: -350px;
            width: 320px; height: 100vh;
            background: #1e293b;
            z-index: 10001;
            transition: 0.4s cubic-bezier(0.19, 1, 0.22, 1);
            box-shadow: -5px 0 30px rgba(0,0,0,0.5);
            padding: 30px;
            overflow-y: auto;
            color: white;
            font-family: 'Outfit', sans-serif;
        }
        
        #classMap.open { right: 0; }
        
        .map-item {
            padding: 12px;
            border-bottom: 1px solid rgba(255,255,255,0.05);
            display: block;
            color: #94a3b8;
            text-decoration: none;
            font-size: 0.9rem;
            transition: 0.2s;
        }
        
        .map-item:hover { color: white; background: rgba(255,255,255,0.02); }
        .map-item.active { color: var(--nav-accent); font-weight: bold; border-left: 3px solid var(--nav-accent); padding-left: 15px; }

        /* Downloader Hub */
        .download-hub-fixed {
            position: fixed; bottom: 30px; right: 30px;
            display: flex; flex-direction: column; gap: 10px;
            z-index: 9999;
        }
        
        .btn-download-fixed {
            width: 50px; height: 50px; border-radius: 50%;
            border: none; cursor: pointer; color: white;
            display: flex; align-items: center; justify-content: center;
            box-shadow: 0 5px 15px rgba(0,0,0,0.3);
            transition: 0.3s; font-size: 1.2rem;
        }
        .btn-pdf { background: #e74c3c; }
        .btn-word { background: #2980b9; }
        .btn-download-fixed:hover { transform: scale(1.1) rotate(5deg); }

        @media print {
            .master-nav, #classMap, .download-hub-fixed { display: none !important; }
            body { padding-top: 0 !important; }
        }
        
        body { padding-top: 70px; } /* Space for navbar */
    `;
    const styleSheet = document.createElement("style");
    styleSheet.innerText = css;
    document.head.appendChild(styleSheet);
}

function injectNavigation() {
    const currentFile = window.location.pathname.split('/').pop();
    const currentIndex = UNIT_LIST.findIndex(u => u.file === currentFile);
    
    const prev = currentIndex > 0 ? UNIT_LIST[currentIndex - 1] : null;
    const next = currentIndex < UNIT_LIST.length - 1 ? UNIT_LIST[currentIndex + 1] : null;

    const nav = document.createElement('div');
    nav.className = 'master-nav no-print';
    
    const leftGroup = document.createElement('div');
    leftGroup.className = 'nav-group';
    leftGroup.innerHTML = `
        <a href="../index.html" class="btn-nav">🏠 Inicio</a>
        <a href="Biblioteca_Digital.html" class="btn-nav">📚 Biblioteca</a>
    `;

    const centerGroup = document.createElement('div');
    centerGroup.className = 'nav-group';
    if (prev) centerGroup.innerHTML += `<a href="${prev.file}" class="btn-nav">⬅️ Anterior</a>`;
    centerGroup.innerHTML += `<span class="teacher-badge" id="globalTeacherName">Docente: No Asignado</span>`;
    if (next) centerGroup.innerHTML += `<a href="${next.file}" class="btn-nav">Siguiente ➡️</a>`;

    const rightGroup = document.createElement('div');
    rightGroup.className = 'nav-group';
    rightGroup.innerHTML = `
        <button class="btn-nav" onclick="toggleMap()">🗺️ Mapa de Clase</button>
    `;

    nav.appendChild(leftGroup);
    nav.appendChild(centerGroup);
    nav.appendChild(rightGroup);
    document.body.appendChild(nav);

    // Fixed Downloader Hub (PDF/Word)
    const hub = document.createElement('div');
    hub.className = 'download-hub-fixed no-print';
    hub.innerHTML = `
        <button class="btn-download-fixed btn-pdf" onclick="window.print()" title="Bajar PDF">PDF</button>
        <button class="btn-download-fixed btn-word" onclick="exportToWord()" title="Bajar Word">W</button>
    `;
    document.body.appendChild(hub);
}

function injectClassMap() {
    const map = document.createElement('div');
    map.id = 'classMap';
    map.className = 'no-print';
    
    let html = `<h2>🗺️ Mapa de Ruta</h2><p style="color: #64748b; font-size: 0.8rem; margin-bottom: 20px;">Navegación rápida por unidades</p>`;
    
    UNIT_LIST.forEach(u => {
        const isActive = window.location.pathname.endsWith(u.file) ? 'active' : '';
        html += `<a href="${u.file}" class="map-item ${isActive}"><strong>Clase ${u.id}:</strong> ${u.title}</a>`;
    });
    
    map.innerHTML = html;
    document.body.appendChild(map);
}

window.toggleMap = () => {
    document.getElementById('classMap').classList.toggle('open');
};

function updateTeacherName() {
    const savedName = localStorage.getItem('teacher_name');
    if (savedName) {
        const badges = document.querySelectorAll('#globalTeacherName');
        badges.forEach(b => b.innerText = "Docente: " + savedName);
        
        // Also update any internal placeholders in the unit (if any)
        const placeholders = document.querySelectorAll('.profesor-name, .teacher-placeholder');
        placeholders.forEach(p => p.innerText = savedName);
    }
}

/** Exportar a Word (Mismo lógica que antes pero optimizada) */
function exportToWord() {
    const filename = document.title || 'Clase_Informatica';
    const pages = document.querySelectorAll('.page');
    let content = "";
    if (pages.length > 0) {
        pages.forEach(p => content += p.innerHTML + "<br clear='all' style='page-break-before:always'>");
    } else {
        content = document.body.innerHTML;
    }
    const preHtml = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'><head><meta charset='utf-8'><title>Export</title><style>body{font-family:Arial;} h1{color:#1a237e;} table{border-collapse:collapse; width:100%;} th,td{border:1px solid #ddd; padding:8px;}</style></head><body>`;
    const postHtml = "</body></html>";
    const blob = new Blob(['\ufeff', preHtml + content + postHtml], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename + ".doc";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}
