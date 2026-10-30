/**
 * js/patentesMunicipalUI.js - Control visual de Inspectores y Patentes Comerciales (Ley 3966)
 * Gestión de locales comerciales: Con Patente, Sin Patente, Patente Vencida, Inhabilitada, No Declarada.
 */

import { showToast } from './utils.js';

export const PatentesMunicipalUI = {
  modalEl: null,
  localesCache: [],
  resumenCache: null,

  init() {
    this.createModalDOM();
  },

  createModalDOM() {
    if (document.getElementById('patentesModal')) return;

    const modal = document.createElement('div');
    modal.id = 'patentesModal';
    modal.className = 'fixed inset-0 z-[4400] hidden items-center justify-center bg-black/80 backdrop-blur-md p-4';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');

    modal.innerHTML = `
      <div class="w-full max-w-5xl max-h-[90vh] overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl flex flex-col text-slate-200">
        <!-- Header -->
        <div class="flex items-center justify-between border-b border-slate-800 px-6 py-4 bg-slate-950/70">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-800 flex items-center justify-center text-white shadow-lg">
              <i class="fas fa-store text-lg"></i>
            </div>
            <div>
              <h2 class="text-base font-bold text-white flex items-center gap-2">
                Fiscalización Territorial e Inspectores Municipales
                <span class="text-[10px] font-semibold uppercase tracking-wider bg-emerald-950 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-800">Ley 3966 / POUT</span>
              </h2>
              <p class="text-xs text-slate-400">Control de patentes comerciales, liquidaciones, locales clandestinos y actas de fiscalización</p>
            </div>
          </div>
          <button type="button" onclick="window.PatentesMunicipalUI?.close()" class="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white transition" title="Cerrar"><i class="fas fa-xmark text-sm"></i></button>
        </div>

        <!-- Dashboard Estadístico de Patentes -->
        <div class="p-6 overflow-y-auto space-y-6">
          <div class="grid grid-cols-2 sm:grid-cols-5 gap-3" id="patentes-kpi-container">
            <div class="bg-slate-950/60 border border-emerald-900/60 p-3 rounded-xl text-center cursor-pointer hover:border-emerald-500 transition" onclick="window.PatentesMunicipalUI?.filtrar('con_patente')">
              <span class="text-[10px] font-bold text-emerald-400 uppercase tracking-widest block">Con Patente</span>
              <span id="kpi-con-patente" class="text-xl font-extrabold text-white">0</span>
              <span class="text-[9px] text-emerald-500 block mt-0.5">Al día</span>
            </div>
            <div class="bg-slate-950/60 border border-red-900/60 p-3 rounded-xl text-center cursor-pointer hover:border-red-500 transition" onclick="window.PatentesMunicipalUI?.filtrar('sin_patente')">
              <span class="text-[10px] font-bold text-red-400 uppercase tracking-widest block">Sin Patente</span>
              <span id="kpi-sin-patente" class="text-xl font-extrabold text-red-300">0</span>
              <span class="text-[9px] text-red-400 block mt-0.5">Clandestino</span>
            </div>
            <div class="bg-slate-950/60 border border-amber-900/60 p-3 rounded-xl text-center cursor-pointer hover:border-amber-500 transition" onclick="window.PatentesMunicipalUI?.filtrar('patente_vencida')">
              <span class="text-[10px] font-bold text-amber-400 uppercase tracking-widest block">Vencida</span>
              <span id="kpi-patente-vencida" class="text-xl font-extrabold text-amber-300">0</span>
              <span class="text-[9px] text-amber-400 block mt-0.5">Pendiente de pago</span>
            </div>
            <div class="bg-slate-950/60 border border-slate-700/60 p-3 rounded-xl text-center cursor-pointer hover:border-slate-500 transition" onclick="window.PatentesMunicipalUI?.filtrar('inhabilitada')">
              <span class="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Inhabilitada</span>
              <span id="kpi-inhabilitada" class="text-xl font-extrabold text-slate-300">0</span>
              <span class="text-[9px] text-slate-400 block mt-0.5">Clausurada</span>
            </div>
            <div class="bg-slate-950/60 border border-purple-900/60 p-3 rounded-xl text-center cursor-pointer hover:border-purple-500 transition" onclick="window.PatentesMunicipalUI?.filtrar('no_declarada')">
              <span class="text-[10px] font-bold text-purple-400 uppercase tracking-widest block">No Declarada</span>
              <span id="kpi-no-declarada" class="text-xl font-extrabold text-purple-300">0</span>
              <span class="text-[9px] text-purple-400 block mt-0.5">Sin registro catastro</span>
            </div>
          </div>

          <!-- Barra de Acciones y Filtros -->
          <div class="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-950/40 p-3 rounded-xl border border-slate-800">
            <div class="flex items-center gap-2 w-full sm:w-auto">
              <div class="relative flex-1 sm:w-64">
                <span class="absolute left-3 top-2.5 text-slate-500 text-xs"><i class="fas fa-search"></i></span>
                <input type="text" id="patentes-search-input" oninput="window.PatentesMunicipalUI?.onSearch(this.value)" placeholder="Buscar por local, RUC, Cta. Cte..." class="w-full h-9 pl-8 pr-3 rounded-lg border border-slate-700 bg-slate-900 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500">
              </div>
              <button onclick="window.PatentesMunicipalUI?.filtrar('')" class="h-9 px-3 text-xs bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300 transition" title="Ver todos">Todos</button>
            </div>
            <button onclick="window.PatentesMunicipalUI?.abrirFormularioInspeccion()" class="w-full sm:w-auto h-9 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 transition">
              <i class="fas fa-clipboard-user"></i> Registrar Acta de Inspección
            </button>
          </div>

          <!-- Formulario de Inspección de Inspector (Colapsable) -->
          <div id="form-inspeccion-box" class="hidden bg-slate-950/80 border border-emerald-500/40 p-4 rounded-xl space-y-3">
            <div class="flex items-center justify-between border-b border-slate-800 pb-2">
              <h3 class="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-2">
                <i class="fas fa-file-pen"></i> Formulario del Inspector Municipal — Terreno
              </h3>
              <button type="button" onclick="window.PatentesMunicipalUI?.cerrarFormularioInspeccion()" class="text-slate-400 hover:text-white text-xs"><i class="fas fa-times"></i></button>
            </div>
            <form id="inspector-form" onsubmit="window.PatentesMunicipalUI?.guardarInspeccion(event)" class="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <label class="block text-slate-400 mb-1">Cta. Cte. Catastral *</label>
                <input type="text" id="insp-ctacte" required placeholder="190073-08/00-000" class="w-full h-8 px-2.5 rounded bg-slate-900 border border-slate-700 text-white">
              </div>
              <div>
                <label class="block text-slate-400 mb-1">Nombre de Fantasía *</label>
                <input type="text" id="insp-nombre" required placeholder="Ej.: Supermercado El Ahorro" class="w-full h-8 px-2.5 rounded bg-slate-900 border border-slate-700 text-white">
              </div>
              <div>
                <label class="block text-slate-400 mb-1">Rubro / Actividad *</label>
                <input type="text" id="insp-rubro" required placeholder="Ej.: Bodega / Taller Mecánico" class="w-full h-8 px-2.5 rounded bg-slate-900 border border-slate-700 text-white">
              </div>
              <div>
                <label class="block text-slate-400 mb-1">Estado de Patente *</label>
                <select id="insp-estado" required class="w-full h-8 px-2 rounded bg-slate-900 border border-slate-700 text-white">
                  <option value="con_patente">Con Patente Vigente</option>
                  <option value="sin_patente">Sin Patente (Clandestino)</option>
                  <option value="patente_vencida">Patente Vencida</option>
                  <option value="inhabilitada">Inhabilitada / Clausurada</option>
                  <option value="no_declarada">No Declarada a Catastro</option>
                </select>
              </div>
              <div>
                <label class="block text-slate-400 mb-1">Superficie Comercial (m²)</label>
                <input type="number" step="0.1" id="insp-m2" placeholder="85.5" class="w-full h-8 px-2.5 rounded bg-slate-900 border border-slate-700 text-white">
              </div>
              <div>
                <label class="block text-slate-400 mb-1">Nro. de Acta de Inspección *</label>
                <input type="text" id="insp-acta" required placeholder="ACT-125/2026" class="w-full h-8 px-2.5 rounded bg-slate-900 border border-slate-700 text-white">
              </div>
              <div>
                <label class="block text-slate-400 mb-1">Inspector Responsable *</label>
                <input type="text" id="insp-inspector" required placeholder="Nombre del inspector" class="w-full h-8 px-2.5 rounded bg-slate-900 border border-slate-700 text-white">
              </div>
              <div class="sm:col-span-2">
                <label class="block text-slate-400 mb-1">Observaciones de Fiscalización</label>
                <input type="text" id="insp-obs" placeholder="Detalles de infracción, extintores, descargo..." class="w-full h-8 px-2.5 rounded bg-slate-900 border border-slate-700 text-white">
              </div>
              <div class="sm:col-span-3 flex justify-end gap-2 pt-2">
                <button type="button" onclick="window.PatentesMunicipalUI?.cerrarFormularioInspeccion()" class="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 rounded text-slate-300">Cancelar</button>
                <button type="submit" class="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 rounded font-bold text-white shadow">Guardar Acta e Inspección</button>
              </div>
            </form>
          </div>

          <!-- Tabla de Locales Comerciales Fiscalizados -->
          <div class="border border-slate-800 rounded-xl overflow-hidden bg-slate-950/40">
            <div class="overflow-x-auto">
              <table class="w-full text-left text-xs text-slate-300">
                <thead class="bg-slate-950 text-[10px] uppercase font-bold text-slate-400 border-b border-slate-800">
                  <tr>
                    <th class="py-3 px-3">Local Comercial</th>
                    <th class="py-3 px-3">Cta. Cte. Catastral</th>
                    <th class="py-3 px-3">Rubro</th>
                    <th class="py-3 px-3 text-center">Estado Patente</th>
                    <th class="py-3 px-3 text-right">Sup. m²</th>
                    <th class="py-3 px-3">Inspector / Acta</th>
                    <th class="py-3 px-3 text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody id="patentes-table-body" class="divide-y divide-slate-800/60 font-mono text-[11px]">
                  <tr><td colspan="7" class="py-6 text-center text-slate-500">Cargando fiscalizaciones municipales...</td></tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
    this.modalEl = modal;
  },

  async open(estadoFiltro = '') {
    this.createModalDOM();
    if (!this.modalEl) return;
    this.modalEl.classList.remove('hidden');
    this.modalEl.classList.add('flex');
    await this.cargarDatos(estadoFiltro);
  },

  close() {
    if (this.modalEl) {
      this.modalEl.classList.add('hidden');
      this.modalEl.classList.remove('flex');
    }
  },

  abrirFormularioInspeccion(ctaCtePrevia = '') {
    const box = document.getElementById('form-inspeccion-box');
    if (box) {
      box.classList.remove('hidden');
      if (ctaCtePrevia) {
        const inCta = document.getElementById('insp-ctacte');
        if (inCta) inCta.value = ctaCtePrevia;
      }
      setTimeout(() => document.getElementById('insp-nombre')?.focus(), 50);
    }
  },

  cerrarFormularioInspeccion() {
    document.getElementById('form-inspeccion-box')?.classList.add('hidden');
  },

  async cargarDatos(estado = '') {
    try {
      const url = `/api/v3/municipal/patentes?dpto=D&dist=12${estado ? '&estado=' + estado : ''}`;
      const res = await fetch(url);
      const data = await res.json();

      if (!data.ok) throw new Error(data.error || 'Error consultando patentes');

      this.localesCache = data.locales || [];
      this.resumenCache = data.resumen || {};

      this.renderKPIs(this.resumenCache);
      this.renderTabla(this.localesCache);
    } catch (err) {
      showToast('Error cargando fiscalización municipal: ' + err.message, 'error');
    }
  },

  renderKPIs(r) {
    const setT = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.textContent = val;
    };
    setT('kpi-con-patente', r.con_patente || 0);
    setT('kpi-sin-patente', r.sin_patente || 0);
    setT('kpi-patente-vencida', r.patente_vencida || 0);
    setT('kpi-inhabilitada', r.inhabilitada || 0);
    setT('kpi-no-declarada', r.no_declarada || 0);
  },

  renderTabla(locales) {
    const tbody = document.getElementById('patentes-table-body');
    if (!tbody) return;

    if (!locales.length) {
      tbody.innerHTML = `<tr><td colspan="7" class="py-8 text-center text-slate-500">No se encontraron locales comerciales para este filtro.</td></tr>`;
      return;
    }

    tbody.innerHTML = locales.map(l => {
      const meta = l.meta_estado || {};
      return `
        <tr class="hover:bg-slate-800/40 transition">
          <td class="py-2.5 px-3 font-sans">
            <span class="font-bold text-white block">${l.nombre_fantasia}</span>
            <span class="text-[10px] text-slate-400">${l.razon_social || l.ruc || 'Sin razón social'}</span>
          </td>
          <td class="py-2.5 px-3 text-emerald-400 font-bold">${l.cta_cte}</td>
          <td class="py-2.5 px-3 font-sans text-slate-300">${l.rubro}</td>
          <td class="py-2.5 px-3 text-center">
            <span class="px-2 py-0.5 rounded-full text-[10px] font-semibold border ${meta.badge || ''}">
              ${meta.label || l.estado}
            </span>
          </td>
          <td class="py-2.5 px-3 text-right text-slate-200">${l.m2_comercial ? l.m2_comercial + ' m²' : '—'}</td>
          <td class="py-2.5 px-3 font-sans">
            <span class="text-slate-300 block">${l.inspector_asignado || 'Sin inspector'}</span>
            <span class="text-[10px] text-slate-500">${l.nro_acta || ''} (${l.ultima_inspeccion || ''})</span>
          </td>
          <td class="py-2.5 px-3 text-center">
            <button onclick="window.PatentesMunicipalUI?.verDetalle('${l.id}')" class="px-2 py-1 bg-slate-800 hover:bg-slate-700 rounded text-indigo-400 hover:text-white transition" title="Ver ficha y actas">
              <i class="fas fa-eye"></i>
            </button>
          </td>
        </tr>
      `;
    }).join('');
  },

  filtrar(estado) {
    this.cargarDatos(estado);
  },

  onSearch(query) {
    const q = query.trim().toLowerCase();
    if (!q) {
      this.renderTabla(this.localesCache);
      return;
    }
    const filtrados = this.localesCache.filter(l => 
      l.nombre_fantasia?.toLowerCase().includes(q) ||
      l.razon_social?.toLowerCase().includes(q) ||
      l.cta_cte?.toLowerCase().includes(q) ||
      l.rubro?.toLowerCase().includes(q) ||
      l.ruc?.toLowerCase().includes(q)
    );
    this.renderTabla(filtrados);
  },

  async guardarInspeccion(e) {
    e.preventDefault();
    try {
      const payload = {
        cta_cte: document.getElementById('insp-ctacte')?.value.trim(),
        nombre_fantasia: document.getElementById('insp-nombre')?.value.trim(),
        rubro: document.getElementById('insp-rubro')?.value.trim(),
        estado: document.getElementById('insp-estado')?.value,
        m2_comercial: parseFloat(document.getElementById('insp-m2')?.value || 0),
        nro_acta: document.getElementById('insp-acta')?.value.trim(),
        inspector: document.getElementById('insp-inspector')?.value.trim(),
        observaciones: document.getElementById('insp-obs')?.value.trim(),
        dpto: 'D',
        dist: '12'
      };

      const res = await fetch('/api/v3/municipal/patentes/inspeccionar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!data.ok) throw new Error(data.error || 'Error registrando acta');

      showToast(`Acta ${payload.nro_acta} e inspección guardadas con éxito`, 'success');
      this.cerrarFormularioInspeccion();
      document.getElementById('inspector-form')?.reset();
      await this.cargarDatos();
    } catch (err) {
      showToast(err.message, 'error');
    }
  },

  verDetalle(id) {
    const local = this.localesCache.find(l => l.id === id);
    if (!local) return;
    alert(`Local Comercial: ${local.nombre_fantasia}\nCta. Cte.: ${local.cta_cte}\nEstado: ${local.meta_estado?.label || local.estado}\nÚltima Acta: ${local.nro_acta || 'Sin acta'}\nObservaciones: ${local.observaciones || 'Sin observaciones'}`);
  }
};

if (typeof window !== 'undefined') {
  window.PatentesMunicipalUI = PatentesMunicipalUI;
}
