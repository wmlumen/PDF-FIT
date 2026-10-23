/**
 * Cliente Municipal - UI y lógica específica para Ley 3966/2010
 * Se conecta al motor de validación municipal (js/municipal.js)
 */

import { State } from './state.js';
import { showToast, hideLoading } from './utils.js';
import { logger } from './logger.js';
import * as MunicipalValidator from './municipal.js';

/**
 * Renderiza el dictamen municipal en la UI
 */
export function renderMunicipalAudit(reporte) {
  const container = document.getElementById('municipal-results');
  if (!container) return;

  let html = '';

  // Semáforo
  const semaforo = reporte.lotesConErrores > 0 ? '🔴' : (reporte.lotesConAlertas > 0 ? '🟡' : '🟢');
  const semaforoColor = reporte.lotesConErrores > 0 ? '#ef4444' : (reporte.lotesConAlertas > 0 ? '#f59e0b' : '#10b981');

  html += `<div style="text-align:center; padding:16px; margin-bottom:16px; border-radius:8px; background:${semaforoColor}20; border:2px solid ${semaforoColor};">
    <div style="font-size:2rem;">${semaforo}</div>
    <strong>${reporte.resumen}</strong>
  </div>`;

  // Balance de loteamiento
  if (reporte.balanceLoteamiento) {
    const b = reporte.balanceLoteamiento;
    html += `<div style="margin-bottom:16px; padding:12px; background:#1e293b; border-radius:8px; border:1px solid #334155;">
      <h4 style="color:#10b981; margin-bottom:8px;">⚖️ Balance de Loteamiento</h4>
      <div class="grid grid-cols-2 gap-2 text-sm">
        <div><span class="text-slate-500">Área matriz:</span> <span class="font-bold">${b.areaTotalMatriz} m²</span></div>
        <div><span class="text-slate-500">Área útil lotes:</span> <span class="font-bold">${b.areaUtilLotes} m²</span></div>
        <div><span class="text-slate-500">Cesión vial:</span> <span class="font-bold ${parseFloat(b.detalles.cesionCalles.actual) >= 16 ? 'text-emerald-400' : 'text-red-400'}">${b.detalles.cesionCalles.actual}% (mín ${b.detalles.cesionCalles.requeridoMin}%)</span></div>
        <div><span class="text-slate-500">Espacios verdes:</span> <span class="font-bold ${parseFloat(b.detalles.cesionPlazas.actual) >= 5 ? 'text-emerald-400' : 'text-red-400'}">${b.detalles.cesionPlazas.actual}% (mín ${b.detalles.cesionPlazas.requeridoMin}%)</span></div>
      </div>
      ${b.alertas.length ? '<div style="margin-top:8px; color:#f59e0b; font-size:.85rem;">' + b.alertas.map(a => `• ${a.mensaje}`).join('<br>') + '</div>' : ''}
    </div>`;
  }

  // Errores por lote
  if (reporte.erroresPorLote?.length) {
    html += `<h4 style="color:#ef4444; margin:16px 0 8px;">❌ Lotes con Incumplimientos (${reporte.erroresPorLote.length})</h4>`;
    reporte.erroresPorLote.forEach(err => {
      html += `<div style="padding:8px; margin:4px 0; background:#450a0a; border:1px solid #ef4444; border-radius:6px; font-size:.8rem;">
        <strong>${err.codigo}</strong>: ${err.mensaje}
      </div>`;
    });
  }

  // Alertas por lote
  if (reporte.alertasPorLote?.length) {
    html += `<h4 style="color:#f59e0b; margin:16px 0 8px;">⚠️ Lotes con Advertencias (${reporte.alertasPorLote.length})</h4>`;
    reporte.alertasPorLote.forEach(alert => {
      html += `<div style="padding:8px; margin:4px 0; background:#451a03; border:1px solid #f59e0b; border-radius:6px; font-size:.8rem;">
        <strong>${alert.codigo}</strong>: ${alert.mensaje}
      </div>`;
    });
  }

  // Resumen
  if (!reporte.erroresPorLote?.length && !reporte.alertasPorLote?.length) {
    html += `<div style="text-align:center; padding:24px; color:#10b981;">
      <div style="font-size:3rem;">✅</div>
      <h3>Todos los lotes cumplen parámetros municipales</h3>
      <p class="text-slate-400 text-sm">Listo para ingreso a Municipalidad</p>
    </div>`;
  }

  container.innerHTML = html;

  // Cambiar a la pestaña de resultados
  if (window.Workspace) window.Workspace.switchTab('municipal');
}

/**
 * Renderiza el balance de loteamiento en la UI
 */
export function renderBalanceMunicipal(reporte) {
  if (!reporte?.balanceLoteamiento) return;

  const container = document.getElementById('balance-content');
  if (!container) return;

  const b = reporte.balanceLoteamiento;
  let html = `
    <div class="bg-slate-800/30 rounded-xl p-6 border border-slate-700">
      <h3 class="text-sm font-bold text-emerald-300 mb-4">⚖️ Balance de Loteamiento</h3>
      <div class="grid grid-cols-2 gap-4 text-sm">
        <div><span class="text-slate-500">Área matriz:</span> <span class="font-bold">${b.areaTotalMatriz} m²</span></div>
        <div><span class="text-slate-500">Área útil lotes:</span> <span class="font-bold">${b.areaUtilLotes} m²</span></div>
        <div><span class="text-slate-500">Cesión vial:</span> <span class="font-bold ${parseFloat(b.detalles.cesionCalles.actual) >= 16 ? 'text-emerald-400' : 'text-red-400'}">${b.detalles.cesionCalles.actual}% (mín ${b.detalles.cesionCalles.requeridoMin}%)</span></div>
        <div><span class="text-slate-500">Espacios verdes:</span> <span class="font-bold ${parseFloat(b.detalles.cesionPlazas.actual) >= 5 ? 'text-emerald-400' : 'text-red-400'}">${b.detalles.cesionPlazas.actual}% (mín ${b.detalles.cesionPlazas.requeridoMin}%)</span></div>
      </div>
      ${b.alertas.length ? '<div style="margin-top:8px; color:#f59e0b; font-size:.85rem;">' + b.alertas.map(a => `• ${a.mensaje}`).join('<br>') + '</div>' : ''}
    </div>`;

  if (container) container.innerHTML = html;
}

/**
 * Cliente Municipal - Conecta UI municipal con validador
 */
export const MunicipalClient = {
  init() {
    logger.debug('[MunicipalClient] Inicializando cliente municipal');
    this.bindEvents();
  },

  bindEvents() {
    // Botón validar municipal
    const validateBtn = document.getElementById('btn-project-validate');
    if (validateBtn) {
      validateBtn.addEventListener('click', () => this.validateMunicipal());
    }

    // Botón generar dictamen
    const auditBtn = document.getElementById('btn-project-audit');
    if (auditBtn) {
      auditBtn.addEventListener('click', () => this.generateMunicipalReport());
    }

    // Botón exportar dictamen
    const exportBtn = document.getElementById('exportBtn');
    if (exportBtn) {
      exportBtn.addEventListener('click', () => this.exportMunicipalDictamen());
    }

    // Botón dictamen dual
    const dualBtn = document.getElementById('exportDualBtn');
    if (dualBtn) {
      dualBtn.addEventListener('click', () => this.exportDualDictamen());
    }

    // Botón balance
    const balanceBtn = document.getElementById('tab-balance');
    if (balanceBtn) {
      balanceBtn.addEventListener('click', () => this.renderBalance());
    }
  },

  async validateMunicipal() {
    const geojson = State.get('geojson');

    if (!geojson || !geojson.features || geojson.features.length === 0) {
      showToast('Debe cargar geometría antes de validar', 'warning');
      return null;
    }

    showToast('🔍 Ejecutando Dictamen Municipal (Ley 3966/2010)...', 'info');

    try {
      const { runMunicipalValidation } = await import('./municipal.js');
      const reporte = await runMunicipalValidation();

      if (reporte) {
        State.set('reporteMunicipal', reporte);
        this.renderMunicipalAudit(reporte);

        const muniBtn = document.getElementById('btn-project-audit');
        if (muniBtn) muniBtn.disabled = false;

        showToast(
          `✅ Dictamen Municipal: ${reporte.resumen}`,
          reporte.lotesConErrores > 0 ? 'warning' : 'success'
        );
      }

      return reporte;
    } catch (e) {
      logger.error('Error en validación municipal:', e);
      showToast(`Error en dictamen municipal: ${e.message}`, 'error');
      return null;
    }
  },

  async generateMunicipalReport() {
    const Export = await import('./export.js');
    return Export.generateProfessionalReport({ tipo: 'MUNICIPAL' });
  },

  async exportMunicipalDictamen() {
    const Export = await import('./export.js');
    return Export.generateProfessionalReport({ tipo: 'MUNICIPAL' });
  },

  async exportDualDictamen() {
    const Export = await import('./export.js');
    return Export.generateProfessionalReport({ tipo: 'DUAL' });
  },

  renderMunicipalAudit(reporte) {
    renderMunicipalAudit(reporte);
  },

  renderBalance(reporte) {
    const rep = reporte || State.get('reporteMunicipal');
    renderBalanceMunicipal(rep);
  }
};

if (typeof window !== 'undefined') {
  window.MunicipalClient = MunicipalClient;
}

export default MunicipalClient;
