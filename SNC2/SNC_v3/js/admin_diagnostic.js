import { logger } from './logger.js';
/**
 * admin_diagnostic.js
 * Script de autodiagnóstico para el panel administrativo.
 * Monitorea el estado de las librerías, módulos y herramientas en tiempo real.
 */

const Diagnostic = {
    // Definición de dependencias y su estado
    registry: {
        libraries: [
            { name: 'Leaflet', global: 'L' },
            { name: 'Turf.js', global: 'turf' },
            { name: 'XLSX (SheetJS)', global: 'XLSX' },
            { name: 'JSZip', global: 'JSZip' },
            { name: 'shp.js', global: 'shp' },
            { name: 'DXF Parser', global: 'dxfParser' },
            { name: 'proj4js', global: 'proj4' },
            { name: 'jsPDF', global: 'jspdf' },
            { name: 'shpwrite', global: 'shpwrite' }
        ],
        modules: [
            { name: 'State', global: 'State' },
            { name: 'Parser', global: 'Parser' },
            { name: 'Validator', global: 'Validator' },
            { name: 'MapEngine', global: 'MapEngine' },
            { name: 'Export', global: 'Export' },
            { name: 'DataTable', global: 'DataTable' },
            { name: 'App', global: 'App' }
        ],
        tools: [
            { name: 'IsolateParcel', check: () => typeof window.App?.isolateParcel === 'function' },
            { name: 'BatchAutocomplete', check: () => typeof window.App?.batchAutocomplete === 'function' },
            { name: 'ParsingLogs', check: () => typeof window.Parser?.getParsingLogs === 'function' && window.Parser.getParsingLogs().length > 0 },
            { name: 'ConvexHull', check: () => window.State?.get('pointConversionMethod') === 'CONVEX' }
        ]
    },

    updateUI() {
        let libOk = 0;
        let modOk = 0;

        // Forzar chequeo de objetos expuestos en window
        this.verifyStandaloneExposure();

        // Diagnóstico de Rendimiento
        this.updatePerformance();

        // Diagnóstico de Librerías
        this.registry.libraries.forEach(lib => {
            const isAvailable = typeof window[lib.global] !== 'undefined';
            if (isAvailable) libOk++;
            this.setVisualStatus(lib.name, isAvailable);
        });

        // Diagnóstico de Módulos
        this.registry.modules.forEach(mod => {
            const isAvailable = typeof window[mod.global] !== 'undefined';
            if (isAvailable) {
                modOk++;
                if (mod.name === 'Parser' && typeof window.Parser?.getParsingLogs === 'function' && window.Parser.getParsingLogs().length > 2) {
                    this.setVisualStatus('ParsingLogs', true);
                }
            }
            this.setVisualStatus(mod.name, isAvailable);
        });

        // Diagnóstico de Herramientas
        this.registry.tools.forEach(tool => {
            this.setVisualStatus(tool.name, tool.check());
        });

        // Actualizar contadores en las cabeceras de sección (ej: "📚 Librerias Externas 6/9 OK")
        this.updateHeaderCounter('Librerias Externas', libOk, this.registry.libraries.length);
        this.updateHeaderCounter('Modulos Internos', modOk, this.registry.modules.length);
    },

    verifyStandaloneExposure() {
        this.registry.modules.forEach(mod => {
            // Intentar recuperar del bundle si no está en window
            if (typeof window[mod.global] === 'undefined' && window.App?.[mod.global]) {
                window[mod.global] = window.App[mod.global];
            }
        });
    },

    updatePerformance() {
        const perfContainer = document.getElementById('performance-metrics') || this.injectPerformanceUI();
        if (!perfContainer) return;

        const proxyStatus = perfContainer.querySelector('.proxy-status');
        const memVal = perfContainer.querySelector('.mem-val');
        const timeVal = perfContainer.querySelector('.time-val');

        // Mostrar uso de memoria (Chromium solo)
        if (window.performance && window.performance.memory && memVal) {
            const used = (window.performance.memory.usedJSHeapSize / 1048576).toFixed(2);
            memVal.textContent = `${used} MB`;
            if (parseFloat(used) > 200) memVal.className = 'mem-val font-mono font-bold text-red-500 animate-pulse';
            else memVal.className = 'mem-val font-mono font-bold text-indigo-600';
        }

        // Mostrar latencia de la última validación
        const lastResults = window.State?.get('validationResults');
        if (timeVal) {
            timeVal.textContent = lastResults?.executionTime ? `${lastResults.executionTime} ms` : 'Sin datos';
        }

        // Verificar CORS Proxy
        if (proxyStatus) {
            fetch('http://127.0.0.1:5501/api/health', { method: 'HEAD', mode: 'no-cors' })
                .then(() => {
                    proxyStatus.textContent = 'OK';
                    proxyStatus.className = 'proxy-status font-mono font-bold text-green-600';
                    this.setVisualStatus('CORS Proxy', true);
                })
                .catch(() => {
                    proxyStatus.textContent = 'ERROR';
                    proxyStatus.className = 'proxy-status font-mono font-bold text-red-500 animate-pulse';
                    this.setVisualStatus('CORS Proxy', false);
                });
        }
    },

    injectPerformanceUI() {
        const main = document.querySelector('.container, main, body');
        const div = document.createElement('div');
        div.id = 'performance-metrics';
        div.className = 'mt-6 p-4 bg-white rounded-lg border border-slate-200 shadow-sm';
        div.innerHTML = `
            <h3 class="text-md font-bold text-slate-700 mb-3 flex items-center gap-2">⚡ Rendimiento del Sistema</h3>
            <div class="grid grid-cols-2 gap-4">
                <div class="p-2 bg-slate-50 rounded flex justify-between text-xs">
                    <span class="text-slate-500">Heap Memory (JS):</span>
                    <span class="mem-val font-mono font-bold text-indigo-600">...</span>
                </div>
                <div class="p-2 bg-slate-50 rounded flex justify-between text-xs">
                    <span class="text-slate-500">Latencia Validación:</span>
                    <span class="time-val font-mono font-bold text-indigo-600">Sin datos</span>
                </div>
            </div>`;
        main.appendChild(div);
        return div;
    },

    updateHeaderCounter(sectionName, ok, total) {
        const headers = document.querySelectorAll('h2, h3, div.section-header');
        headers.forEach(h => {
            if (h.textContent.includes(sectionName)) {
                let counter = h.querySelector('.diagnostic-counter');
                if (!counter) {
                    counter = document.createElement('span');
                    counter.className = 'diagnostic-counter ml-2 text-sm font-mono p-1 rounded bg-slate-100';
                    h.appendChild(counter);
                }
                counter.textContent = `${ok}/${total} OK`;
                counter.style.color = (ok === total) ? '#10b981' : '#f59e0b';
            }
        });
    },

    setVisualStatus(name, status) {
        const rows = document.querySelectorAll('tr, li, div.diagnostic-item');
        rows.forEach(row => {
            if (row.textContent.includes(name)) {
                const indicator = row.querySelector('.diag-indicator') || row.firstChild;
                const statusLabel = row.querySelector('.status-text') || row.querySelector('td:last-child');

                if (status) {
                    if (indicator && indicator.nodeType === 3) row.innerHTML = row.innerHTML.replace('❌', '✅').replace('⚠️', '✅');
                    else if (indicator) indicator.textContent = '✅';
                    
                    if (statusLabel) {
                        statusLabel.textContent = 'OK';
                        statusLabel.style.color = '#10b981';
                        statusLabel.style.fontWeight = 'bold';
                    }
                } else {
                    if (indicator && indicator.nodeType === 3) row.innerHTML = row.innerHTML.replace('✅', '❌');
                    else if (indicator) indicator.textContent = '❌';

                    if (statusLabel) {
                        statusLabel.textContent = 'ERROR';
                        statusLabel.style.color = '#ef4444';
                        statusLabel.style.fontWeight = 'bold';
                    }
                }
            }
        });
    }
};

// Iniciar bucle de monitoreo cada segundo
setInterval(() => Diagnostic.updateUI(), 1000);
logger.debug('✅ Sistema de Autodiagnóstico Activo');