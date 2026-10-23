/**
 * signatureUI.js — Panel Interactivo de Firmas Digitales y Sellos Institucionales (SNC 551/2023)
 * Proporciona la interfaz modal para:
 * 1. Consultar y reordenar el circuito gubernamental de firmas (Slots 1 a 4).
 * 2. Alzar nuevas firmas o generar sellos provisorios institucionales vectoriales.
 * 3. Gestionar revocaciones (CRL) y bajas de firmas.
 * 4. Ensamblar firmas/sellos en el expediente actual cumpliendo la regla de sellos internos
 *    vs. firma digital definitiva (Ley 6822/2021).
 */

import {
  SignatureAPI,
  TIPOS_FIRMA,
  ESTADOS_FIRMA,
  TIPOS_SELLO_PROVISORIO,
  PROTOCOLO_GUBERNAMENTAL_ORDEN
} from './signatureManager.js';
import { State } from './state.js';
import { showToast } from './utils.js';

let activeTab = 'circuito'; // 'circuito' | 'alzar' | 'catalogo' | 'estampar'
let previewStamp = null;

/**
 * Inicializa y abre el modal de Firmas y Sellos
 */
export function openSignatureModal() {
  let modal = document.getElementById('signatureManagerModal');
  if (!modal) {
    modal = createModalDOM();
    document.body.appendChild(modal);
  }

  modal.classList.remove('hidden');
  modal.classList.add('flex');
  renderCurrentTab();
}

/**
 * Cierra el modal
 */
export function closeSignatureModal() {
  const modal = document.getElementById('signatureManagerModal');
  if (modal) {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  }
}

/**
 * Crea la estructura DOM del modal
 */
function createModalDOM() {
  const div = document.createElement('div');
  div.id = 'signatureManagerModal';
  div.className = 'fixed inset-0 z-[9999] hidden items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4';

  div.innerHTML = `
    <div class="relative w-full max-w-4xl max-h-[90vh] bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-100 font-sans">
      <!-- HEADER -->
      <div class="flex items-center justify-between px-6 py-4 bg-slate-800/90 border-b border-slate-700">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-sky-500/20">
            <i class="fas fa-stamp text-lg text-white"></i>
          </div>
          <div>
            <h2 class="text-lg font-bold text-white flex items-center gap-2">
              Firmas Digitales y Sellos Institucionales
              <span class="text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 border border-sky-400/30">Ley 6822/21 - SNC 551</span>
            </h2>
            <p class="text-xs text-slate-400">Circuito de visado oficial, sellos provisorios de control y firma cualificada</p>
          </div>
        </div>
        <button type="button" class="btn-close-sig text-slate-400 hover:text-white transition p-2 rounded-lg hover:bg-slate-700/60" title="Cerrar modal">
          <i class="fas fa-times text-lg"></i>
        </button>
      </div>

      <!-- TABS -->
      <div class="flex border-b border-slate-700/80 bg-slate-800/40 px-6 gap-2 pt-2">
        <button type="button" data-tab="circuito" class="tab-btn px-4 py-2.5 text-xs font-semibold rounded-t-lg transition flex items-center gap-2 border-b-2 border-transparent text-slate-400 hover:text-slate-200">
          <i class="fas fa-list-ol"></i> Circuito y Orden Gubernamental
        </button>
        <button type="button" data-tab="alzar" class="tab-btn px-4 py-2.5 text-xs font-semibold rounded-t-lg transition flex items-center gap-2 border-b-2 border-transparent text-slate-400 hover:text-slate-200">
          <i class="fas fa-file-arrow-up"></i> Alzar / Generar Sello
        </button>
        <button type="button" data-tab="catalogo" class="tab-btn px-4 py-2.5 text-xs font-semibold rounded-t-lg transition flex items-center gap-2 border-b-2 border-transparent text-slate-400 hover:text-slate-200">
          <i class="fas fa-id-card-clip"></i> Catálogo y Revocación (CRL)
        </button>
        <button type="button" data-tab="estampar" class="tab-btn px-4 py-2.5 text-xs font-semibold rounded-t-lg transition flex items-center gap-2 border-b-2 border-transparent text-slate-400 hover:text-slate-200">
          <i class="fas fa-signature"></i> Estampar en Expediente
        </button>
      </div>

      <!-- BODY CONTENT -->
      <div id="sig-tab-content" class="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar bg-slate-900/60">
        <!-- Contenido dinámico renderizado por JS -->
      </div>

      <!-- FOOTER -->
      <div class="flex items-center justify-between px-6 py-3 bg-slate-800/80 border-t border-slate-700 text-xs text-slate-400">
        <div class="flex items-center gap-2">
          <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>Motor Criptográfico: SHA-256 / Web Crypto API nativo W3C</span>
        </div>
        <button type="button" class="btn-close-sig px-4 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 font-medium transition">
          Cerrar
        </button>
      </div>
    </div>
  `;

  // Listeners
  div.querySelectorAll('.btn-close-sig').forEach(btn => btn.addEventListener('click', closeSignatureModal));
  div.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      activeTab = btn.getAttribute('data-tab');
      renderCurrentTab();
    });
  });

  return div;
}

/**
 * Renderiza la pestaña seleccionada actualmente
 */
function renderCurrentTab() {
  const modal = document.getElementById('signatureManagerModal');
  if (!modal) return;

  // Actualizar estilos de tabs
  modal.querySelectorAll('.tab-btn').forEach(btn => {
    const tabName = btn.getAttribute('data-tab');
    if (tabName === activeTab) {
      btn.className = 'tab-btn px-4 py-2.5 text-xs font-semibold rounded-t-lg transition flex items-center gap-2 border-b-2 border-sky-500 text-sky-400 bg-slate-800/90 shadow-sm';
    } else {
      btn.className = 'tab-btn px-4 py-2.5 text-xs font-semibold rounded-t-lg transition flex items-center gap-2 border-b-2 border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/40';
    }
  });

  const container = modal.querySelector('#sig-tab-content');
  if (!container) return;

  switch (activeTab) {
    case 'circuito':
      renderTabCircuito(container);
      break;
    case 'alzar':
      renderTabAlzar(container);
      break;
    case 'catalogo':
      renderTabCatalogo(container);
      break;
    case 'estampar':
      renderTabEstampar(container);
      break;
    default:
      renderTabCircuito(container);
  }
}

// ==================== PESTAÑA 1: CIRCUITO GUBERNAMENTAL ====================

function renderTabCircuito(container) {
  const circuito = SignatureAPI.obtenerCircuitoGubernamental();

  container.innerHTML = `
    <div class="space-y-4">
      <div class="flex items-center justify-between bg-slate-800/50 p-4 rounded-xl border border-slate-700">
        <div>
          <h3 class="text-sm font-bold text-white flex items-center gap-2">
            <i class="fas fa-sitemap text-sky-400"></i> Protocolo de Circuito Oficial de Firmas y Sellos
          </h3>
          <p class="text-xs text-slate-400 mt-0.5">
            El orden de prelación oficial predeterminado sigue el circuito institucional del SNC y Municipalidades paraguayas.
          </p>
        </div>
        <button id="btn-reset-circuito" class="px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-semibold transition flex items-center gap-1.5 border border-slate-600">
          <i class="fas fa-rotate-left"></i> Restablecer Orden Oficial
        </button>
      </div>

      <div class="space-y-3" id="slots-circuito-list">
        ${circuito.map((slot, index) => {
          const isFirma = slot.tipoPermitido === TIPOS_FIRMA.FIRMA_DIGITAL;
          const badgeColor = isFirma ? 'bg-indigo-500/20 text-indigo-300 border-indigo-400/30' : 'bg-emerald-500/20 text-emerald-300 border-emerald-400/30';
          const icon = isFirma ? 'fa-fingerprint' : 'fa-stamp';
          return `
            <div class="flex items-center justify-between p-4 rounded-xl bg-slate-800/70 border border-slate-700 hover:border-slate-600 transition" data-slot-id="${slot.slotId}">
              <div class="flex items-center gap-4">
                <div class="w-8 h-8 rounded-lg bg-slate-700 text-sky-400 font-bold text-sm flex items-center justify-center border border-slate-600">
                  ${slot.orden}
                </div>
                <div>
                  <div class="flex items-center gap-2">
                    <h4 class="text-sm font-bold text-white">${slot.etiqueta}</h4>
                    <span class="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full border ${badgeColor} flex items-center gap-1">
                      <i class="fas ${icon}"></i> ${slot.tipoPermitido === TIPOS_FIRMA.FIRMA_DIGITAL ? 'Firma Digital Cualificada' : 'Sello Interno de Control'}
                    </span>
                  </div>
                  <p class="text-xs text-slate-400 mt-0.5">${slot.descripcion} • <span class="text-slate-500">Rol: ${slot.rolRequerido}</span></p>
                  <p class="text-[11px] text-slate-500 font-mono mt-0.5">Ubicación Plano: X=${slot.layout.x}mm, Y=${slot.layout.y}mm (${slot.layout.ancho}x${slot.layout.alto}mm)</p>
                </div>
              </div>
              <div class="flex items-center gap-1.5">
                <button type="button" class="btn-subir-orden p-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 transition ${index === 0 ? 'opacity-30 cursor-not-allowed' : ''}" data-idx="${index}" title="Subir orden en circuito" ${index === 0 ? 'disabled' : ''}>
                  <i class="fas fa-arrow-up text-xs"></i>
                </button>
                <button type="button" class="btn-bajar-orden p-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 transition ${index === circuito.length - 1 ? 'opacity-30 cursor-not-allowed' : ''}" data-idx="${index}" title="Bajar orden en circuito" ${index === circuito.length - 1 ? 'disabled' : ''}>
                  <i class="fas fa-arrow-down text-xs"></i>
                </button>
              </div>
            </div>
          `;
        }).join('')}
      </div>

      <div class="p-3 bg-blue-950/40 border border-blue-800/40 rounded-xl text-xs text-blue-300 flex items-start gap-2.5">
        <i class="fas fa-info-circle text-blue-400 mt-0.5"></i>
        <span>
          <strong>Regla de Validez Legal:</strong> Los slots configurados como <em>Sello Interno</em> no invalidan ni consumen firmas cualificadas externas. Los slots marcados con <em>Firma Digital</em> sellan criptográficamente el plano con inmutabilidad SHA-256 una vez emitido el dictamen definitivo.
        </span>
      </div>
    </div>
  `;

  // Handlers
  container.querySelector('#btn-reset-circuito')?.addEventListener('click', () => {
    SignatureAPI.resetearCircuitoOficial();
    showToast('Circuito restablecido al protocolo gubernamental oficial', 'info');
    renderCurrentTab();
  });

  container.querySelectorAll('.btn-subir-orden').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = Number(btn.getAttribute('data-idx'));
      if (idx > 0) {
        const slots = [...circuito];
        const temp = slots[idx - 1];
        slots[idx - 1] = slots[idx];
        slots[idx] = temp;
        // Reasignar orden numérico
        slots.forEach((s, i) => s.orden = i + 1);
        SignatureAPI.reordenarCircuito(slots);
        showToast('Orden del circuito actualizado', 'success');
        renderCurrentTab();
      }
    });
  });

  container.querySelectorAll('.btn-bajar-orden').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = Number(btn.getAttribute('data-idx'));
      if (idx < circuito.length - 1) {
        const slots = [...circuito];
        const temp = slots[idx + 1];
        slots[idx + 1] = slots[idx];
        slots[idx] = temp;
        slots.forEach((s, i) => s.orden = i + 1);
        SignatureAPI.reordenarCircuito(slots);
        showToast('Orden del circuito actualizado', 'success');
        renderCurrentTab();
      }
    });
  });
}

// ==================== PESTAÑA 2: ALZAR / GENERAR SELLO PROVISORIO ====================

function renderTabAlzar(container) {
  container.innerHTML = `
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <!-- FORMULARIO DE ALTA -->
      <div class="space-y-4 bg-slate-800/50 p-5 rounded-xl border border-slate-700">
        <h3 class="text-sm font-bold text-white flex items-center gap-2">
          <i class="fas fa-file-pen text-sky-400"></i> Registrar Nueva Firma o Sello
        </h3>
        
        <div class="space-y-3 text-xs">
          <div>
            <label class="block text-slate-300 font-semibold mb-1">Nombre Completo del Titular *</label>
            <input type="text" id="alzar-nombre" placeholder="Ej: Ing. Juan Pérez / Dra. María Gómez" class="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-sky-500">
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-slate-300 font-semibold mb-1">Cargo Oficial *</label>
              <input type="text" id="alzar-cargo" placeholder="Ej: Revisor Catastral" class="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-sky-500">
            </div>
            <div>
              <label class="block text-slate-300 font-semibold mb-1">Matrícula / Registro</label>
              <input type="text" id="alzar-matricula" placeholder="Ej: MOPC-4581 / SNC-92" class="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-sky-500">
            </div>
          </div>

          <div>
            <label class="block text-slate-300 font-semibold mb-1">Institución / Dependencia</label>
            <input type="text" id="alzar-institucion" value="SERVICIO NACIONAL DE CATASTRO" class="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-sky-500">
          </div>

          <div>
            <label class="block text-slate-300 font-semibold mb-1">Nivel y Tipo de Firma *</label>
            <select id="alzar-tipo" class="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-sky-500">
              <option value="${TIPOS_FIRMA.SELLO_INTERNO}">Sello Institucional Interno (Para trámites y revisiones)</option>
              <option value="${TIPOS_FIRMA.FIRMA_DIGITAL}">Firma Digital Cualificada (Ley 6822/21 - Para Dictamen Definitivo)</option>
            </select>
          </div>

          <div>
            <label class="block text-slate-300 font-semibold mb-1">Estilo de Sello Provisorio Automático</label>
            <div class="grid grid-cols-2 gap-2">
              <label class="flex items-center gap-2 p-2 bg-slate-900 border border-slate-700 rounded-lg cursor-pointer hover:border-slate-600">
                <input type="radio" name="sello-estilo" value="${TIPOS_SELLO_PROVISORIO.CIRCULAR_OFICIAL}" checked class="text-sky-500">
                <span class="text-xs">Circular Oficial (Escudo)</span>
              </label>
              <label class="flex items-center gap-2 p-2 bg-slate-900 border border-slate-700 rounded-lg cursor-pointer hover:border-slate-600">
                <input type="radio" name="sello-estilo" value="${TIPOS_SELLO_PROVISORIO.RECTANGULAR_CONTROL}" class="text-sky-500">
                <span class="text-xs">Rectangular (Control Técnico)</span>
              </label>
            </div>
          </div>
        </div>

        <button id="btn-alzar-guardar" type="button" class="w-full py-2.5 rounded-lg bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-sky-600/30 transition flex items-center justify-center gap-2">
          <i class="fas fa-check"></i> Alzar y Registrar en Catálogo
        </button>
      </div>

      <!-- PREVIEW DEL SELLO PROVISORIO -->
      <div class="flex flex-col items-center justify-center bg-slate-800/40 p-5 rounded-xl border border-slate-700/80 text-center space-y-4">
        <h3 class="text-xs font-bold text-slate-300 uppercase tracking-wider">Vista Previa del Sello Provisorio Generado</h3>
        
        <div id="preview-sello-box" class="w-64 h-64 p-2 rounded-xl bg-white flex items-center justify-center shadow-inner border border-slate-200">
          <!-- Renderizado dinámico de la imagen -->
        </div>

        <p class="text-[11px] text-slate-400 max-w-xs">
          El generador vectoriza automáticamente el escudo nacional, códigos de trazabilidad y membrete institucional sin requerir escáner ni archivos externos.
        </p>
      </div>
    </div>
  `;

  // Previsualización dinámica al escribir
  const updatePreview = () => {
    const nombre = container.querySelector('#alzar-nombre')?.value || 'FUNCIONARIO DESIGNADO';
    const cargo = container.querySelector('#alzar-cargo')?.value || 'REVISOR TÉCNICO';
    const inst = container.querySelector('#alzar-institucion')?.value || 'SERVICIO NACIONAL DE CATASTRO';
    const tipoFirma = container.querySelector('#alzar-tipo')?.value;
    const estilo = container.querySelector('input[name="sello-estilo"]:checked')?.value || TIPOS_SELLO_PROVISORIO.CIRCULAR_OFICIAL;

    const stamp = SignatureAPI.generarSelloProvisorio({
      tipo: estilo,
      entidad: inst,
      dependencia: cargo,
      titulo: tipoFirma === TIPOS_FIRMA.FIRMA_DIGITAL ? 'FIRMA DIGITAL OFICIAL' : 'VISADO TÉCNICO INTERNO',
      fecha: new Date().toLocaleDateString('es-PY')
    });
    previewStamp = stamp.dataUrl;

    const box = container.querySelector('#preview-sello-box');
    if (box) {
      box.innerHTML = `<img src="${stamp.dataUrl}" alt="Sello Provisorio" class="max-w-full max-h-full object-contain filter drop-shadow" />`;
    }
  };

  container.querySelector('#alzar-nombre')?.addEventListener('input', updatePreview);
  container.querySelector('#alzar-cargo')?.addEventListener('input', updatePreview);
  container.querySelector('#alzar-institucion')?.addEventListener('input', updatePreview);
  container.querySelector('#alzar-tipo')?.addEventListener('change', updatePreview);
  container.querySelectorAll('input[name="sello-estilo"]').forEach(r => r.addEventListener('change', updatePreview));

  updatePreview();

  // Guardar firma
  container.querySelector('#btn-alzar-guardar')?.addEventListener('click', () => {
    const nombre = container.querySelector('#alzar-nombre')?.value?.trim();
    const cargo = container.querySelector('#alzar-cargo')?.value?.trim();
    if (!nombre || !cargo) {
      showToast('Por favor complete Nombre y Cargo obligatorio', 'warning');
      return;
    }

    try {
      SignatureAPI.alzarFirma({
        nombre,
        cargo,
        matricula: container.querySelector('#alzar-matricula')?.value?.trim(),
        institucion: container.querySelector('#alzar-institucion')?.value?.trim(),
        tipo: container.querySelector('#alzar-tipo')?.value,
        estampaVisual: previewStamp
      });

      showToast('Firma / Sello alzado y registrado exitosamente', 'success');
      activeTab = 'catalogo';
      renderCurrentTab();
    } catch (err) {
      showToast(err.message, 'error');
    }
  });
}

// ==================== PESTAÑA 3: CATÁLOGO Y REVOCACIÓN (CRL) ====================

function renderTabCatalogo(container) {
  const catalogo = SignatureAPI.obtenerFirmasCatalogo();

  container.innerHTML = `
    <div class="space-y-4">
      <div class="flex items-center justify-between bg-slate-800/50 p-4 rounded-xl border border-slate-700">
        <div>
          <h3 class="text-sm font-bold text-white flex items-center gap-2">
            <i class="fas fa-certificate text-sky-400"></i> Catálogo Activo de Firmantes y Lista de Revocación (CRL)
          </h3>
          <p class="text-xs text-slate-400 mt-0.5">
            Gestione el ciclo de vida de credenciales. La revocación inhabilita de inmediato cualquier validación posterior.
          </p>
        </div>
      </div>

      <div class="space-y-3">
        ${catalogo.length === 0 ? `
          <div class="p-8 text-center bg-slate-800/30 rounded-xl border border-slate-700/60 text-slate-400 text-xs">
            No hay firmas ni sellos registrados en el catálogo. Vaya a la pestaña "Alzar / Generar Sello" para crear uno.
          </div>
        ` : catalogo.map(firma => {
          const isRevocada = firma.estado === ESTADOS_FIRMA.REVOCADA;
          const isFirma = firma.tipo === TIPOS_FIRMA.FIRMA_DIGITAL;
          return `
            <div class="flex items-center justify-between p-4 rounded-xl bg-slate-800/70 border ${isRevocada ? 'border-rose-900/50 bg-rose-950/20' : 'border-slate-700'} transition">
              <div class="flex items-center gap-4">
                <div class="w-14 h-14 bg-white rounded-lg p-1 border border-slate-200 flex items-center justify-center shrink-0">
                  <img src="${firma.estampaVisual}" alt="Estampa" class="max-w-full max-h-full object-contain" />
                </div>
                <div>
                  <div class="flex items-center gap-2">
                    <h4 class="text-sm font-bold text-white ${isRevocada ? 'line-through text-slate-400' : ''}">${firma.nombre}</h4>
                    <span class="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full ${isRevocada ? 'bg-rose-500/20 text-rose-300 border border-rose-400/30' : 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/30'}">
                      ${firma.estado}
                    </span>
                    <span class="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-slate-700 text-slate-300 border border-slate-600">
                      ${isFirma ? 'Firma Digital' : 'Sello Interno'}
                    </span>
                  </div>
                  <p class="text-xs text-slate-300 mt-0.5">${firma.cargo} ${firma.matricula ? `• Matrícula: ${firma.matricula}` : ''}</p>
                  <p class="text-[11px] text-slate-500">${firma.institucion} • ID: <span class="font-mono">${firma.id}</span></p>
                  ${isRevocada ? `<p class="text-xs text-rose-400 font-semibold mt-1"><i class="fas fa-triangle-exclamation"></i> REVOCADA: ${firma.revocacion?.motivo || 'Baja administrativa'}</p>` : ''}
                </div>
              </div>
              <div class="flex items-center gap-2">
                ${!isRevocada ? `
                  <button type="button" class="btn-revocar-sig px-3 py-1.5 rounded-lg bg-rose-900/40 hover:bg-rose-800/60 text-rose-300 border border-rose-700/50 text-xs font-semibold transition flex items-center gap-1.5" data-id="${firma.id}">
                    <i class="fas fa-ban"></i> Revocar
                  </button>
                ` : ''}
                <button type="button" class="btn-eliminar-sig px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs font-semibold transition" data-id="${firma.id}" title="Eliminar del catálogo">
                  <i class="fas fa-trash"></i>
                </button>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;

  // Handlers
  container.querySelectorAll('.btn-revocar-sig').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id');
      const motivo = prompt('Ingrese el motivo oficial de la revocación (Ley 6822/21):', 'Baja de funciones / Matrícula inactiva');
      if (motivo) {
        SignatureAPI.revocarFirma(id, { motivo });
        showToast('Firma revocada inmediatamente e incorporada a la CRL', 'error');
        renderCurrentTab();
      }
    });
  });

  container.querySelectorAll('.btn-eliminar-sig').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id');
      if (confirm('¿Está seguro de eliminar esta firma del catálogo?')) {
        SignatureAPI.eliminarFirma(id);
        showToast('Firma eliminada del catálogo', 'info');
        renderCurrentTab();
      }
    });
  });
}

// ==================== PESTAÑA 4: ESTAMPAR EN EXPEDIENTE ACTUAL ====================

function renderTabEstampar(container) {
  const circuito = SignatureAPI.obtenerCircuitoGubernamental();
  const catalogo = SignatureAPI.obtenerFirmasCatalogo().filter(f => f.estado === ESTADOS_FIRMA.ACTIVA);

  // Obtener estado del expediente actual si existe
  const expedientes = State.get('expedientes') || [];
  const metadata = State.get('expedienteMetadata') || {};
  const estadoActual = metadata.estadoExpediente || 'EN_REVISION';
  const regla = SignatureAPI.evaluarReglaFirma({ estadoExpediente: estadoActual });

  // Firmas ya ensambladas guardadas en State
  const firmasEstampadas = State.get('firmasEnsambladas') || [];

  container.innerHTML = `
    <div class="space-y-5">
      <!-- PANEL DE ESTADO Y REGLA DE NEGOCIO -->
      <div class="p-4 rounded-xl border ${regla.esDefinitivo ? 'bg-indigo-950/40 border-indigo-700/60 text-indigo-200' : 'bg-emerald-950/40 border-emerald-700/60 text-emerald-200'} flex items-start gap-3">
        <i class="fas ${regla.esDefinitivo ? 'fa-stamp' : 'fa-clipboard-check'} text-xl mt-0.5"></i>
        <div class="flex-1">
          <div class="flex items-center justify-between">
            <h4 class="text-sm font-bold uppercase tracking-wide">
              Estado Actual del Expediente: <span class="underline">${estadoActual}</span>
            </h4>
            <span class="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${regla.esDefinitivo ? 'bg-indigo-500/30 text-indigo-300' : 'bg-emerald-500/30 text-emerald-300'}">
              ${regla.esDefinitivo ? 'Fase Resolutiva Definitiva' : 'Fase de Revisión Interna'}
            </span>
          </div>
          <p class="text-xs mt-1 text-slate-300">
            ${regla.descripcion}
          </p>
        </div>
      </div>

      <!-- ASIGNACIÓN DE FIRMAS POR SLOT -->
      <div class="space-y-3">
        <h3 class="text-xs font-bold text-slate-300 uppercase tracking-wider">Estampar por Casillero Oficial</h3>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
          ${circuito.map(slot => {
            const yaEstampada = firmasEstampadas.find(f => f.slotId === slot.slotId);
            const firmasCompatibles = catalogo.filter(f => {
              if (regla.esDefinitivo) return f.tipo === TIPOS_FIRMA.FIRMA_DIGITAL;
              return f.tipo === TIPOS_FIRMA.SELLO_INTERNO;
            });

            return `
              <div class="p-4 rounded-xl bg-slate-800/60 border border-slate-700 space-y-2">
                <div class="flex items-center justify-between">
                  <h4 class="text-xs font-bold text-white">[${slot.orden}] ${slot.etiqueta}</h4>
                  <span class="text-[10px] text-slate-400">Rol: ${slot.rolRequerido}</span>
                </div>

                ${yaEstampada ? `
                  <div class="p-2.5 rounded-lg bg-emerald-950/50 border border-emerald-600/40 text-emerald-300 text-xs flex items-center justify-between">
                    <div>
                      <p class="font-bold flex items-center gap-1.5"><i class="fas fa-check-circle"></i> ${yaEstampada.nombre}</p>
                      <p class="text-[10px] text-emerald-400/80 font-mono">Hash: ${yaEstampada.hashFirma.substring(0, 16)}...</p>
                    </div>
                    <button type="button" class="btn-desestampar text-rose-400 hover:text-rose-300 p-1" data-slot="${slot.slotId}" title="Quitar firma">
                      <i class="fas fa-times"></i>
                    </button>
                  </div>
                ` : `
                  <div class="flex gap-2">
                    <select class="select-firma-slot flex-1 bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none" data-slot="${slot.slotId}">
                      <option value="">-- Seleccionar credencial disponible --</option>
                      ${firmasCompatibles.map(f => `<option value="${f.id}">${f.nombre} (${f.cargo})</option>`).join('')}
                    </select>
                    <button type="button" class="btn-aplicar-estampa px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-semibold text-xs transition" data-slot="${slot.slotId}">
                      Estampar
                    </button>
                  </div>
                `}
              </div>
            `;
          }).join('')}
        </div>
      </div>

      <!-- BOTÓN VERIFICAR INTEGRIDAD -->
      ${firmasEstampadas.length > 0 ? `
        <div class="flex items-center justify-between p-4 bg-slate-800/80 rounded-xl border border-slate-700">
          <div>
            <h4 class="text-xs font-bold text-white">Verificación de Integridad Criptográfica</h4>
            <p class="text-[11px] text-slate-400">Verifica hashes SHA-256 de todas las firmas estampadas y consulta la CRL en tiempo real.</p>
          </div>
          <button id="btn-verificar-todo" class="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition flex items-center gap-1.5 shadow-lg shadow-emerald-600/20">
            <i class="fas fa-shield-halved"></i> Validar Firmas y Sellos
          </button>
        </div>
      ` : ''}
    </div>
  `;

  // Handlers
  container.querySelectorAll('.btn-aplicar-estampa').forEach(btn => {
    btn.addEventListener('click', async () => {
      const slotId = btn.getAttribute('data-slot');
      const select = container.querySelector(`.select-firma-slot[data-slot="${slotId}"]`);
      const firmaId = select?.value;
      if (!firmaId) {
        showToast('Seleccione una credencial del listado', 'warning');
        return;
      }

      try {
        const docId = metadata.expedienteNumero || 'EXP-CAT-' + Date.now();
        const ensamble = await SignatureAPI.ensamblarFirma({
          documentoId: docId,
          firmaId,
          slotId,
          estadoExpediente: estadoActual
        });

        const actuales = State.get('firmasEnsambladas') || [];
        const filtradas = actuales.filter(f => f.slotId !== slotId);
        filtradas.push(ensamble);
        State.set('firmasEnsambladas', filtradas);

        showToast('Firma/Sello estampado correctamente', 'success');
        renderCurrentTab();
      } catch (err) {
        showToast(err.message, 'error');
      }
    });
  });

  container.querySelectorAll('.btn-desestampar').forEach(btn => {
    btn.addEventListener('click', () => {
      const slotId = btn.getAttribute('data-slot');
      const actuales = State.get('firmasEnsambladas') || [];
      const filtradas = actuales.filter(f => f.slotId !== slotId);
      State.set('firmasEnsambladas', filtradas);
      showToast('Estampa retirada', 'info');
      renderCurrentTab();
    });
  });

  container.querySelector('#btn-verificar-todo')?.addEventListener('click', async () => {
    const estampadas = State.get('firmasEnsambladas') || [];
    let todasValidas = true;
    for (const f of estampadas) {
      const res = await SignatureAPI.verificarFirma(f);
      if (!res.valido) {
        todasValidas = false;
        showToast(`Alerta en slot [${f.slotId}]: ${res.razon}`, 'error');
      }
    }
    if (todasValidas) {
      showToast('✅ Todas las firmas y sellos están íntegros y verificados según Ley 6822/21', 'success');
    }
  });
}

// Exponer en window
if (typeof window !== 'undefined') {
  window.SignatureUI = {
    open: openSignatureModal,
    close: closeSignatureModal,
    render: renderCurrentTab
  };
}

export default {
  open: openSignatureModal,
  close: closeSignatureModal,
  render: renderCurrentTab
};
