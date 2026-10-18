/**
 * UI de Tabla Interactiva
 * Renderiza y permite edición de datos tabulares
 */

import { State } from './state.js';
import { CAMPOS_REQUERIDOS } from './config.js';
import { sanitizeString, showToast } from './utils.js';
import { GeometryHistory } from './geometryHistory.js';
import { logger } from './logger.js';

let currentData = [];
let editingRow = null;
let selectedRowIndex = null;
const attributeHistory = new GeometryHistory(50);

/**
 * Escapa HTML para evitar XSS
 */
export function render() {
    const tbody = document.getElementById('table-body');
    const thead = document.getElementById('data-table-head');
    currentData = State.get('excelData') || [];
    attributeHistory.syncExternal(currentData);
    if (!tbody || !thead) return;

    thead.innerHTML = `<tr><th class="p-3 text-center font-semibold text-yellow-300 uppercase text-xs whitespace-nowrap">Nº</th>${CAMPOS_REQUERIDOS.map(campo =>
        `<th class="p-3 font-semibold text-slate-400 uppercase text-xs whitespace-nowrap">${campo}</th>`
    ).join('')}<th class="p-3"></th></tr>`;

    if (!currentData.length) {
        tbody.innerHTML = `<tr><td colspan="${CAMPOS_REQUERIDOS.length + 2}" class="p-8 text-center text-slate-500">Cargue una geometría o planilla para ver las parcelas.</td></tr>`;
        renderSelectedParcelSummary();
        return;
    }

    const orderedRows = currentData.map((row, rowIndex) => ({ row, rowIndex })).sort((a, b) =>
        (Number(a.row.PARCELA_NUMERO) || Number.MAX_SAFE_INTEGER) - (Number(b.row.PARCELA_NUMERO) || Number.MAX_SAFE_INTEGER)
    );
    tbody.innerHTML = orderedRows.map(({ row, rowIndex }) => {
        const isEditing = editingRow === rowIndex;
        const isSelected = selectedRowIndex === rowIndex;
        const cells = CAMPOS_REQUERIDOS.map(campo => {
            const value = row[campo] ?? '';
            const missing = value === '' || value === null || value === undefined;
            if (!isEditing) {
                return `<td class="p-2 border-b border-slate-800 text-xs ${missing ? 'bg-red-950/30 text-red-300' : 'text-slate-200'}">${missing ? '—' : escapeHtml(String(value))}</td>`;
            }
            const readOnly = campo === 'SUP_SIG_M' ? 'readonly' : '';
            return `<td class="p-1 border-b border-slate-800 ${missing ? 'bg-red-950/30' : ''}">
                <input ${readOnly} data-field="${campo}" class="w-full min-w-24 rounded bg-transparent p-2 text-xs text-slate-100 outline-none focus:bg-slate-800" value="${escapeHtml(String(value))}">
            </td>`;
        }).join('');
        const actions = isEditing
            ? `<button class="rounded px-2 py-1 text-emerald-400 hover:bg-emerald-950" onclick="event.stopPropagation();DataTable.saveRow(${rowIndex})" title="Guardar cambios">Guardar</button><button class="rounded px-2 py-1 text-slate-300 hover:bg-slate-800" onclick="event.stopPropagation();DataTable.cancelEdit()" title="Cancelar edición">Cancelar</button>`
            : `<button class="rounded px-2 py-1 text-blue-400 hover:bg-blue-950" onclick="event.stopPropagation();DataTable.editRow(${rowIndex})" title="Editar parcela">✏️</button><button class="rounded px-2 py-1 text-red-400 hover:bg-red-950" onclick="event.stopPropagation();DataTable.deleteRow(${rowIndex})" title="Eliminar parcela">❌</button>`;
        const number = Number(row.PARCELA_NUMERO) || '—';
        return `<tr data-row-index="${rowIndex}" onclick="DataTable.selectRow(${rowIndex})" class="cursor-pointer transition ${isSelected ? 'bg-yellow-400/10 ring-1 ring-inset ring-yellow-400/50' : 'hover:bg-slate-800/70'}"><td class="border-b border-slate-800 p-2 text-center"><span class="inline-flex h-9 w-9 items-center justify-center rounded-full border-2 border-slate-950 bg-yellow-400 text-lg font-black text-slate-950">${number}</span></td>${cells}<td class="sticky right-0 whitespace-nowrap bg-slate-900 p-1 border-b border-slate-800">${actions}</td></tr>`;
    }).join('');
    updateRequiredFieldsStatus();
    renderSelectedParcelSummary();
}

function renderSelectedParcelSummary() {
    const container = document.getElementById('selected-parcel-summary');
    if (!container) return;
    const row = selectedRowIndex !== null ? currentData[selectedRowIndex] : null;
    if (!row) {
        container.classList.add('hidden');
        container.replaceChildren();
        return;
    }
    const number = Number(row.PARCELA_NUMERO) || '—';
    container.innerHTML = `<div class="mb-3 flex items-center gap-3"><span class="inline-flex h-12 w-12 items-center justify-center rounded-full bg-yellow-400 text-2xl font-black text-slate-950">${number}</span><div><p class="text-[10px] font-bold uppercase tracking-widest text-yellow-300">Parcela seleccionada</p><h3 class="text-base font-bold text-white">${escapeHtml(String(row.PADRON || row.CODIGO || 'Datos pendientes'))}</h3></div></div><dl class="grid grid-cols-2 gap-2 md:grid-cols-4">${CAMPOS_REQUERIDOS.map(campo => `<div class="rounded bg-slate-900 p-2"><dt class="text-[9px] uppercase text-slate-500">${campo}</dt><dd class="mt-1 truncate text-xs font-semibold ${campo === 'SUP_SIG_M' ? 'text-emerald-400' : 'text-slate-200'}">${escapeHtml(String(row[campo] ?? '—'))}</dd></div>`).join('')}</dl>`;
    container.classList.remove('hidden');
}

export function selectRow(rowIndex, fromMap = false) {
    if (!currentData[rowIndex]) return false;
    selectedRowIndex = rowIndex;
    render();
    if (!fromMap) window.MapEngine?.selectParcelByNumber?.(currentData[rowIndex].PARCELA_NUMERO);
    return true;
}

export function selectByParcelNumber(parcelNumber, fromMap = false) {
    const number = Number(parcelNumber);
    const rowIndex = currentData.findIndex(row => Number(row.PARCELA_NUMERO) === number);
    return rowIndex >= 0 ? selectRow(rowIndex, fromMap) : false;
}

export function clearSelection() {
    selectedRowIndex = null;
    renderSelectedParcelSummary();
    document.querySelectorAll('#table-body tr[data-row-index]').forEach(row => {
        row.classList.remove('bg-yellow-400/10', 'ring-1', 'ring-inset', 'ring-yellow-400/50');
    });
    return true;
}

export function editRow(rowIndex) {
    editingRow = rowIndex;
    render();
}

export function cancelEdit() {
    editingRow = null;
    render();
}

export async function saveRow(rowIndex) {
    const rowElement = document.querySelector(`tr[data-row-index="${rowIndex}"]`);
    if (!rowElement || !currentData[rowIndex]) return;
    if (!State.getBackendToken() || !State.getBackendExpediente()) {
        showToast('Inicie sesión y abra un expediente permanente antes de modificar datos.', 'warning', 6000);
        return false;
    }
    const previous = currentData;
    const next = GeometryHistory.clone(currentData);
    for (const campo of CAMPOS_REQUERIDOS) {
        if (campo === 'SUP_SIG_M') continue;
        const input = rowElement.querySelector(`[data-field="${campo}"]`);
        if (input) next[rowIndex][campo] = input.value.trim();
    }
    attributeHistory.commit(previous, next, `Datos de parcela ${Number(next[rowIndex].PARCELA_NUMERO) || rowIndex + 1}`);
    editingRow = null;
    State.set('excelData', next);
    State.joinDataToGeoJSON();
    if (!await State.syncToBackend()) {
        attributeHistory.rollbackLastCommit();
        State.set('excelData', previous);
        State.joinDataToGeoJSON();
        render();
        showToast('La base de datos rechazó el cambio. Los datos anteriores fueron restaurados.', 'error', 7000);
        return false;
    }
    render();
    showToast('Fila guardada en la base de datos.', 'success');
    return true;
}

export async function undoAttributeEdit() {
    const result = attributeHistory.undo(State.get('excelData'));
    if (!result) return false;
    const previous = State.get('excelData');
    State.set('excelData', result.value);
    State.joinDataToGeoJSON();
    if (!await State.syncToBackend()) {
        attributeHistory.redo(result.value);
        State.set('excelData', previous);
        State.joinDataToGeoJSON();
        showToast('No se pudo deshacer en la base de datos.', 'error');
        return false;
    }
    render();
    showToast(`Deshacer: ${result.label}`, 'info');
    return true;
}

export async function redoAttributeEdit() {
    const result = attributeHistory.redo(State.get('excelData'));
    if (!result) return false;
    const previous = State.get('excelData');
    State.set('excelData', result.value);
    State.joinDataToGeoJSON();
    if (!await State.syncToBackend()) {
        attributeHistory.undo(result.value);
        State.set('excelData', previous);
        State.joinDataToGeoJSON();
        showToast('No se pudo rehacer en la base de datos.', 'error');
        return false;
    }
    render();
    showToast(`Rehacer: ${result.label}`, 'info');
    return true;
}

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>"']/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        if (m === '"') return '&quot;';
        if (m === "'") return '&#39;';
        return m;
    });
}

/**
 * Actualiza el badge de campos requeridos faltantes
 */
function updateRequiredFieldsStatus() {
    const container = document.getElementById('requiredFieldsStatus');
    if (!container) return;
    
    let missingCount = 0;
    for (const row of currentData) {
        for (const campo of CAMPOS_REQUERIDOS) {
            const valor = row[campo];
            if (!valor || valor.toString().trim() === '') {
                missingCount++;
                break;
            }
        }
    }
    
    if (missingCount > 0) {
        container.innerHTML = `<span style="background:#ef4444; color:white; padding:2px 6px; border-radius:8px; font-size:0.65rem;">⚠️ ${missingCount} registros incompletos</span>`;
    } else {
        container.innerHTML = `<span style="background:#10b981; color:white; padding:2px 6px; border-radius:8px; font-size:0.65rem;">✅ Todos completos</span>`;
    }
}

/**
 * Actualiza una celda específica con validación
 */
export function updateCell(rowIndex, colName, newValue) {
    if (!currentData[rowIndex]) {
        showToast('Fila no encontrada', 'error');
        return;
    }
    
    const oldValue = currentData[rowIndex][colName];
    const trimmedValue = sanitizeString(newValue).trim();
    
    if (oldValue === trimmedValue) return;
    
    currentData[rowIndex][colName] = trimmedValue;
    State.set('excelData', currentData);
    
    State.joinDataToGeoJSON();
    
    if (colName === 'CODIGO') {
        render();
    }
    
    const cell = document.querySelector(`[data-col="${colName}"][data-row="${rowIndex}"]`);
    if (cell) {
        cell.style.background = '#bbf7d0';
        cell.style.transition = 'background 0.5s';
        setTimeout(() => {
            cell.style.background = 'transparent';
        }, 500);
    }
    
    updateRequiredFieldsStatus();
    
    showToast(`✅ ${colName}: "${trimmedValue}"`, 'success', 1500);
}

/**
 * Agrega una nueva fila vacía
 */
export function addRow() {
    const newRow = {};
    for (const campo of CAMPOS_REQUERIDOS) {
        newRow[campo] = '';
    }
    newRow.CODIGO = `NUEVO_${Date.now()}`;
    
    currentData.push(newRow);
    State.set('excelData', currentData);
    render();
    
    showToast('➕ Nueva fila agregada', 'success');
}

/**
 * Elimina una fila
 */
export function deleteRow(rowIndex) {
    if (confirm('¿Eliminar este registro?')) {
        currentData.splice(rowIndex, 1);
        State.set('excelData', currentData);
        render();
        showToast('🗑️ Registro eliminado', 'warning');
    }
}

/**
 * Exporta los datos actuales a Excel
 */
export function saveToExcel() {
    if (!currentData.length) {
        showToast('No hay datos para exportar', 'warning');
        return;
    }
    
    // Exportar únicamente el contrato oficial; los identificadores internos
    // de vínculo y numeración no forman parte de la planilla SNC.
    const exportRows = currentData.map(row => Object.fromEntries(
        CAMPOS_REQUERIDOS.map(campo => [campo, row[campo] ?? ''])
    ));
    const ws = XLSX.utils.json_to_sheet(exportRows, { header: CAMPOS_REQUERIDOS });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Datos_Catastrales');
    XLSX.writeFile(wb, `datos_catastro_${new Date().toISOString().slice(0,19)}.xlsx`);
    
    showToast('💾 Excel guardado', 'success');
}

/**
 * Pin/Unpin del panel (fijar)
 */
export function togglePin() {
    isPinned = !isPinned;
    const panel = document.getElementById('dataPanel');
    const pinBtn = document.getElementById('pinBtn');
    
    if (isPinned) {
        panel.classList.remove('hidden');
        pinBtn.style.background = '#4f46e5';
        pinBtn.style.color = 'white';
        pinBtn.textContent = '📌 Fijado';
    } else {
        pinBtn.style.background = '#ffffff';
        pinBtn.style.color = '#475569';
        pinBtn.textContent = '📌 Fijar';
    }
}

/**
 * Carga plantilla desde URL
 */
export async function loadTemplateFromLink(url) {
    showToast('Descargando plantilla...', 'info');
    try {
        const response = await fetch(url);
        const blob = await response.blob();
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'estructura_catastro.xlsx';
        link.click();
        URL.revokeObjectURL(link.href);
        showToast('Plantilla descargada', 'success');
    } catch (err) {
        showToast('Error descargando plantilla', 'error');
    }
}

/**
 * Autocompleta datos faltantes de la tabla consultando al backend (Caché local SNC)
 */
export async function autoCompleteWithSNC() {
    const geojson = State.get('geojson');
    if (!geojson || !geojson.features || geojson.features.length === 0) {
        showToast('Debe cargar una capa geométrica primero', 'warning');
        return;
    }
    const token = State.getBackendToken();
    if (!token) {
        showToast('Inicie sesión antes de consultar la caché SNC.', 'warning', 5000);
        return;
    }

    try {
        showToast('⏳ Analizando datos geométricos y consultando caché...', 'info');

        // Construir payload con un punto interior de cada geometría.
        const points = [];
        geojson.features.forEach((f, index) => {
            const codigo = f.properties?.SNC_PARCELA_ID || f.properties?.CODIGO || f.properties?.PADRON || `AUTO_${index}`;
            if (f.geometry) {
                const [x, y] = turf.pointOnFeature(f).geometry.coordinates;
                let lng = x;
                let lat = y;
                if (Math.abs(x) > 180 || Math.abs(y) > 90) {
                    const projection = State.get('currentDisplayProjection') === 'EPSG:32720'
                        ? '+proj=utm +zone=20 +south +datum=WGS84 +units=m +no_defs'
                        : '+proj=utm +zone=21 +south +datum=WGS84 +units=m +no_defs';
                    [lng, lat] = proj4(projection, 'WGS84', [x, y]);
                }
                if (Number.isFinite(lat) && Number.isFinite(lng)) points.push({ id: codigo, lat, lng });
            }
        });

        if (points.length === 0) {
            showToast('No se pudieron extraer coordenadas de los polígonos', 'error');
            return;
        }

        // Llamar al backend
        const response = await fetch('/api/autocompletar', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify(points)
        });

        if (response.status === 401) throw new Error('La sesión expiró. Vuelva a iniciar sesión.');
        if (!response.ok) throw new Error('Error al conectar con el servidor SNC');
        
        const results = await response.json();
        if (results.length === 0) {
            showToast('No se encontró información en la caché para estas parcelas. Intente Descargar el Entorno antes.', 'warning');
            return;
        }

        // Integrar los resultados en currentData
        let matches = 0;
        results.forEach(res => {
            let index = currentData.findIndex(row => row.__featureId === res.id || row.CODIGO === res.id);
            if (index === -1) {
                // Crear vínculo técnico sin inventar un código catastral.
                const newRow = { __featureId: res.id };
                currentData.push(newRow);
                index = currentData.length - 1;
            }
            
            const r = res.properties;
            if (r && !r.NOTA) {
                matches++;
                // Asignar mapeando de propiedades del caché a campos requeridos
                // Solo rellenamos, sobrescribiendo incluso campos no nulos si existen para garantizar coherencia
                const value = (...keys) => keys.map(key => r[key]).find(item => item !== undefined && item !== null && item !== '');
                currentData[index].DPTO = value('dpto', 'DPTO', 'dpto_cod', 'DPTO_COD') || currentData[index].DPTO;
                currentData[index].DIST = value('dist', 'DIST', 'dist_cod', 'DIST_COD') || currentData[index].DIST;
                currentData[index].PADRON = value('padron', 'PADRON') || currentData[index].PADRON;
                currentData[index].ZONA = value('zona', 'ZONA') || currentData[index].ZONA;
                currentData[index].MZ = value('mz', 'MZ', 'manzana', 'MANZANA') || currentData[index].MZ;
                currentData[index].LOTE = value('lote', 'LOTE') || currentData[index].LOTE;
                currentData[index].FINCA = value('finca', 'FINCA') || currentData[index].FINCA;
                currentData[index].MATRICULA = value('nro_matricula', 'NRO_MATRICULA', 'matricula', 'MATRICULA') || currentData[index].MATRICULA;
                const legalArea = value('superficie_tierra', 'SUPERFICIE_TIERRA', 'sup_legal', 'SUP_LEGAL');
                if (legalArea) {
                    currentData[index].SUP_LEGAL = legalArea;
                }
            }
        });

        if (matches === 0) {
            showToast('No se encontraron coincidencias en la caché local. Intente usar "Descargar Entorno SNC" primero.', 'warning', 5000);
            return;
        }

        State.set('excelData', currentData);
        State.joinDataToGeoJSON();
        render();

        showToast(`✅ Se completaron campos desde SNC para ${matches} parcelas`, 'success', 4000);
        
    } catch (error) {
        logger.error('Error autocompletando:', error);
        showToast(`❌ ${error.message || 'Ocurrió un error en el autocompletado'}`, 'error');
    }
}
