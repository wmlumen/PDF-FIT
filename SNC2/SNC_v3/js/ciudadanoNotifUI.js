/**
 * js/ciudadanoNotifUI.js - Portal Ciudadano / Propietario Particular
 * Vinculación de Cta. Cte. Catastral, teléfono móvil (WhatsApp/SMS) y consulta de situación tributaria.
 */

import { State } from './state.js';
import { showToast, formatNumber } from './utils.js';

export const CiudadanoNotifUI = {
  modalEl: null,
  currentSituacion: null,

  init() {
    this.createModalDOM();
  },

  createModalDOM() {
    if (document.getElementById('ciudadanoNotifModal')) return;

    const modal = document.createElement('div');
    modal.id = 'ciudadanoNotifModal';
    modal.className = 'fixed inset-0 z-[4400] hidden items-center justify-center bg-black/80 backdrop-blur-md p-4';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');

    modal.innerHTML = `
      <div class="w-full max-w-4xl max-h-[92vh] overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl flex flex-col text-slate-200">
        <!-- Header -->
        <div class="flex items-center justify-between border-b border-slate-800 px-6 py-4 bg-slate-950/70">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-700 flex items-center justify-center text-white shadow-lg">
              <i class="fas fa-bell text-lg"></i>
            </div>
            <div>
              <h2 class="text-base font-bold text-white flex items-center gap-2">
                Mi Cuenta Catastral y Notificaciones Oficiales
                <span class="text-[10px] font-semibold uppercase tracking-wider bg-indigo-950 text-indigo-400 px-2 py-0.5 rounded-full border border-indigo-800">Ciudadano PY Pro</span>
              </h2>
              <p class="text-xs text-slate-400">Vinculación de Cta. Cte., situación tributaria, fiscalizaciones y alertas por WhatsApp/SMS</p>
            </div>
          </div>
          <button type="button" onclick="window.CiudadanoNotifUI?.close()" class="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white transition" title="Cerrar"><i class="fas fa-xmark text-sm"></i></button>
        </div>

        <div class="p-6 overflow-y-auto space-y-6">
          <!-- 1. Buscador y Consulta de Situación -->
          <div class="bg-slate-950/60 border border-slate-800 p-4 rounded-xl space-y-3">
            <h3 class="text-xs font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-2">
              <i class="fas fa-search"></i> 1. Consultar Situación de Cuenta Corriente Catastral
            </h3>
            <div class="flex flex-col sm:flex-row gap-2">
              <div class="relative flex-1">
                <span class="absolute left-3 top-2.5 text-slate-500 text-xs"><i class="fas fa-landmark"></i></span>
                <input type="text" id="ciu-search-ctacte" placeholder="Ej.: 190073-08/00-000 o Padrón 3479" class="w-full h-10 pl-8 pr-3 rounded-lg border border-slate-700 bg-slate-900 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500">
              </div>
              <button onclick="window.CiudadanoNotifUI?.consultar()" class="h-10 px-5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-lg flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/30 transition">
                <i class="fas fa-check"></i> Consultar Situación
              </button>
            </div>
          </div>

          <!-- 2. Tarjeta de Situación Tributaria e Inmueble -->
          <div id="ciu-situacion-card" class="hidden bg-slate-950/90 border border-slate-700 p-5 rounded-xl space-y-4">
            <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-slate-800 pb-3 gap-2">
              <div>
                <span class="text-[10px] text-slate-400 uppercase tracking-widest block font-mono">Inmueble Identificado</span>
                <span id="sit-ctacte-title" class="text-base font-extrabold text-white"></span>
                <span id="sit-distrito" class="text-xs text-slate-400 ml-2"></span>
              </div>
              <div id="sit-badge-semaforo" class="px-3 py-1 rounded-full text-xs font-bold border flex items-center gap-1.5">
                <span class="w-2 h-2 rounded-full animate-ping"></span>
                <span id="sit-semaforo-text">AL DÍA</span>
              </div>
            </div>

            <!-- Desglose de Valores y Liquidación Fiscal -->
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div class="bg-slate-900/60 p-3 rounded-lg border border-slate-800">
                <span class="text-[10px] text-slate-400 uppercase block">Superficie Terreno</span>
                <span id="sit-terreno-m2" class="text-sm font-bold text-white">0 m²</span>
              </div>
              <div class="bg-slate-900/60 p-3 rounded-lg border border-slate-800">
                <span class="text-[10px] text-slate-400 uppercase block">Área Edificada</span>
                <span id="sit-edificada-m2" class="text-sm font-bold text-white">0 m²</span>
              </div>
              <div class="bg-slate-900/60 p-3 rounded-lg border border-slate-800">
                <span class="text-[10px] text-slate-400 uppercase block">Valor Fiscal Total</span>
                <span id="sit-val-fiscal" class="text-sm font-bold text-emerald-400">Gs. 0</span>
              </div>
              <div class="bg-slate-900/60 p-3 rounded-lg border border-slate-800">
                <span class="text-[10px] text-slate-400 uppercase block">Impuesto Total Anual</span>
                <span id="sit-total-anual" class="text-sm font-bold text-indigo-400">Gs. 0</span>
              </div>
            </div>

            <!-- Patentes Comerciales en el lote -->
            <div id="sit-patentes-box" class="hidden bg-amber-950/30 border border-amber-800/60 p-3 rounded-lg text-xs space-y-1">
              <span class="font-bold text-amber-400 flex items-center gap-1.5">
                <i class="fas fa-store"></i> Locales Comerciales detectados en este lote:
              </span>
              <div id="sit-patentes-list" class="text-slate-300"></div>
            </div>

            <!-- Formulario de Vinculación de Teléfono para Notificaciones -->
            <div class="border-t border-slate-800 pt-4 space-y-3">
              <h4 class="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-2">
                <i class="fas fa-phone"></i> 2. Vincular este inmueble a mi celular para comunicaciones
              </h4>
              <form id="vinculacion-form" onsubmit="window.CiudadanoNotifUI?.guardarVinculacion(event)" class="space-y-3 text-xs">
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label class="block text-slate-400 mb-1">Número de Celular / WhatsApp <span class="text-amber-400">*</span></label>
                    <input type="tel" id="vinc-telefono" required placeholder="Ej.: 0981 123 456" class="w-full h-9 px-3 rounded-lg bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-emerald-500">
                    <span class="text-[10px] text-slate-500 mt-0.5 block">Se enviarán avisos por WhatsApp y SMS</span>
                  </div>
                  <div>
                    <label class="block text-slate-400 mb-1">Nombre o Alias del Inmueble</label>
                    <input type="text" id="vinc-alias" placeholder="Ej.: Casa Familiar / Terreno Quinta" class="w-full h-9 px-3 rounded-lg bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-emerald-500">
                  </div>
                </div>

                <div class="bg-slate-900/60 p-3 rounded-lg border border-slate-800 space-y-2">
                  <span class="text-[11px] font-bold text-slate-300 block mb-1">Canales y Alertas activadas:</span>
                  <div class="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <label class="flex items-center gap-2 cursor-pointer text-slate-300">
                      <input type="checkbox" id="vinc-alerta-venc" checked class="accent-emerald-500 rounded">
                      <span>Vencimiento de Impuestos</span>
                    </label>
                    <label class="flex items-center gap-2 cursor-pointer text-slate-300">
                      <input type="checkbox" id="vinc-alerta-fisc" checked class="accent-emerald-500 rounded">
                      <span>Fiscalización Municipal</span>
                    </label>
                    <label class="flex items-center gap-2 cursor-pointer text-slate-300">
                      <input type="checkbox" id="vinc-alerta-cat" checked class="accent-emerald-500 rounded">
                      <span>Modificaciones Catastrales</span>
                    </label>
                  </div>
                </div>

                <div class="flex justify-end pt-1">
                  <button type="submit" class="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg shadow-lg shadow-emerald-600/20 transition flex items-center gap-2">
                    <i class="fas fa-link"></i> Vincular mi Inmueble y Activar Notificaciones
                  </button>
                </div>
              </form>
            </div>
          </div>

          <!-- 3. Buzón de Notificaciones y Cuentas Vinculadas -->
          <div class="space-y-3">
            <h3 class="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
              <span class="flex items-center gap-2"><i class="fas fa-inbox text-indigo-400"></i> Mis Inmuebles y Notificaciones Oficiales</span>
              <button onclick="window.CiudadanoNotifUI?.cargarMisParcelas()" class="text-[10px] text-indigo-400 hover:underline"><i class="fas fa-rotate mr-1"></i>Actualizar</button>
            </h3>
            <div id="ciu-mis-parcelas-container" class="space-y-2">
              <div class="p-4 bg-slate-950/40 border border-slate-800 rounded-xl text-center text-xs text-slate-500">
                No tiene inmuebles vinculados actualmente. Consulte una Cta. Cte. arriba y vincule su número para recibir avisos.
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
    this.modalEl = modal;
  },

  open(ctaCtePrevia = '') {
    this.createModalDOM();
    if (!this.modalEl) return;
    this.modalEl.classList.remove('hidden');
    this.modalEl.classList.add('flex');

    if (ctaCtePrevia) {
      const inSearch = document.getElementById('ciu-search-ctacte');
      if (inSearch) inSearch.value = ctaCtePrevia;
      this.consultar(ctaCtePrevia);
    } else {
      this.cargarMisParcelas();
    }
  },

  close() {
    if (this.modalEl) {
      this.modalEl.classList.add('hidden');
      this.modalEl.classList.remove('flex');
    }
  },

  async consultar(ctaQuery = '') {
    const query = (ctaQuery || document.getElementById('ciu-search-ctacte')?.value || '').trim();
    if (!query) {
      showToast('Ingrese una Cuenta Corriente Catastral o Padrón', 'warning');
      return;
    }

    try {
      const res = await fetch(`/api/v3/ciudadano/situacion-cta-cte?cta_cte=${encodeURIComponent(query)}&dpto=D&dist=12`);
      const data = await res.json();

      if (!data.ok) throw new Error(data.error || 'Error consultando situación');

      this.currentSituacion = data;
      this.renderSituacion(data);
    } catch (err) {
      showToast('Error consultando cuenta: ' + err.message, 'error');
    }
  },

  renderSituacion(data) {
    const card = document.getElementById('ciu-situacion-card');
    if (!card) return;

    const sit = data.situacion || {};
    const desglose = sit.desglose_catastral || {};
    const sup = sit.superficies || {};
    const liq = sit.liquidacion_fiscal || {};
    const tributo = sit.situacion_tributaria || {};

    const setT = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.textContent = val;
    };

    setT('sit-ctacte-title', sit.cta_cte);
    setT('sit-distrito', `(${desglose.distrito_nombre} · Zona ${desglose.zona} Mz ${desglose.manzana} Lote ${desglose.lote})`);
    setT('sit-terreno-m2', `${sup.terreno_m2 || 0} m²`);
    setT('sit-edificada-m2', `${sup.edificado_cubierto_m2 || 0} m²`);
    setT('sit-val-fiscal', `Gs. ${(liq.valor_fiscal_total_gs || 0).toLocaleString('es-PY')}`);
    setT('sit-total-anual', `Gs. ${(liq.total_a_pagar_gs || 0).toLocaleString('es-PY')}`);

    const badge = document.getElementById('sit-badge-semaforo');
    const badgeText = document.getElementById('sit-semaforo-text');
    if (badge && badgeText) {
      if (tributo.estado === 'AL_DIA') {
        badge.className = 'px-3 py-1 rounded-full text-xs font-bold border border-emerald-700 bg-emerald-950 text-emerald-300 flex items-center gap-1.5';
        badgeText.textContent = 'AL DÍA (2026)';
      } else {
        badge.className = 'px-3 py-1 rounded-full text-xs font-bold border border-amber-700 bg-amber-950 text-amber-300 flex items-center gap-1.5';
        badgeText.textContent = 'PENDIENTE DE PAGO';
      }
    }

    // Patentes vinculadas
    const patentesBox = document.getElementById('sit-patentes-box');
    const patentesList = document.getElementById('sit-patentes-list');
    if (patentesBox && patentesList) {
      if (data.patentes && data.patentes.length) {
        patentesBox.classList.remove('hidden');
        patentesList.innerHTML = data.patentes.map(p => `
          <div class="mt-1 flex items-center justify-between">
            <span><strong>${p.nombre_fantasia}</strong> (${p.rubro})</span>
            <span class="font-semibold px-2 py-0.5 rounded text-[10px] ${p.meta_estado?.badge || 'bg-slate-800'}">${p.meta_estado?.label || p.estado}</span>
          </div>
        `).join('');
      } else {
        patentesBox.classList.add('hidden');
      }
    }

    card.classList.remove('hidden');
  },

  async guardarVinculacion(e) {
    e.preventDefault();
    if (!this.currentSituacion) return;

    try {
      const payload = {
        cta_cte: this.currentSituacion.situacion?.cta_cte,
        dpto: this.currentSituacion.situacion?.dpto || 'D',
        dist: this.currentSituacion.situacion?.dist || '12',
        telefono: document.getElementById('vinc-telefono')?.value.trim(),
        alias: document.getElementById('vinc-alias')?.value.trim(),
        recibir_whatsapp: document.getElementById('vinc-alerta-venc')?.checked ? 1 : 0,
        alerta_vencimientos: document.getElementById('vinc-alerta-venc')?.checked ? 1 : 0,
        alerta_fiscalizaciones: document.getElementById('vinc-alerta-fisc')?.checked ? 1 : 0,
        alerta_cambios_catastro: document.getElementById('vinc-alerta-cat')?.checked ? 1 : 0
      };

      const token = State.getBackendToken?.() || localStorage.getItem('snc_token');
      const res = await fetch('/api/v3/ciudadano/vincular-cta-cte', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : ''
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!data.ok) throw new Error(data.error || 'Error al vincular inmueble');

      showToast(`¡Inmueble ${payload.cta_cte} vinculado con éxito! Notificaciones activas en ${payload.telefono}`, 'success');
      await this.cargarMisParcelas();
    } catch (err) {
      showToast(err.message, 'error');
    }
  },

  async cargarMisParcelas() {
    const container = document.getElementById('ciu-mis-parcelas-container');
    if (!container) return;

    try {
      const token = State.getBackendToken?.() || localStorage.getItem('snc_token');
      const res = await fetch('/api/v3/ciudadano/mis-parcelas', {
        headers: {
          'Authorization': token ? `Bearer ${token}` : ''
        }
      });
      const data = await res.json();

      if (!data.ok || !data.parcelas?.length) {
        container.innerHTML = `
          <div class="p-4 bg-slate-950/40 border border-slate-800 rounded-xl text-center text-xs text-slate-500">
            No tiene inmuebles vinculados en esta sesión. Consulte arriba y agregue su Cta. Cte.
          </div>
        `;
        return;
      }

      container.innerHTML = data.parcelas.map(p => `
        <div class="p-3.5 bg-slate-950/70 border border-slate-800 hover:border-indigo-500/50 rounded-xl transition flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <div class="flex items-center gap-2">
              <span class="font-bold text-white text-xs">${p.alias || p.cta_cte}</span>
              <span class="text-[10px] text-emerald-400 font-mono bg-emerald-950 px-2 py-0.5 rounded border border-emerald-800">Vinculado</span>
            </div>
            <span class="text-[10px] text-slate-400 block mt-0.5">Cta. Cte. ${p.cta_cte} · Notificaciones al ${p.telefono}</span>
          </div>
          <div class="flex items-center gap-2">
            <button onclick="window.CiudadanoNotifUI?.consultar('${p.cta_cte}')" class="px-2.5 py-1 text-xs bg-indigo-950 border border-indigo-800 text-indigo-300 hover:text-white rounded transition">
              <i class="fas fa-file-invoice mr-1"></i> Estado Tributario
            </button>
            <button onclick="window.CiudadanoNotifUI?.desvincular('${p.cta_cte}')" class="px-2 py-1 text-xs bg-red-950/40 border border-red-900 text-red-400 hover:text-red-200 rounded transition" title="Desvincular">
              <i class="fas fa-trash"></i>
            </button>
          </div>
        </div>
      `).join('');
    } catch {
      // Sesión no autenticada en el momento
    }
  },

  async desvincular(cta_cte) {
    if (!confirm(`¿Desea desvincular la Cta. Cte. ${cta_cte}? Dejará de recibir alertas para este inmueble.`)) return;

    try {
      const token = State.getBackendToken?.() || localStorage.getItem('snc_token');
      const res = await fetch('/api/v3/ciudadano/desvincular-cta-cte', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : ''
        },
        body: JSON.stringify({ cta_cte })
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || 'Error desvinculando');

      showToast(`Inmueble ${cta_cte} desvinculado`, 'info');
      await this.cargarMisParcelas();
    } catch (err) {
      showToast(err.message, 'error');
    }
  }
};

if (typeof window !== 'undefined') {
  window.CiudadanoNotifUI = CiudadanoNotifUI;
}
