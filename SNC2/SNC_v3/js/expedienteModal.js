/**
 * ExpedienteModal — Panel y Modal de Datos del Profesional y Expediente
 * Permite registrar y persistir los metadatos oficiales del Topógrafo / Perito,
 * Propietario, Finca, Padrón, Municipio y Colindancias para la emisión de
 * informes y certificados según Resolución SNC 551/2023 y Ley 3966/2010.
 */

import { State } from './state.js';
import { showToast } from './utils.js';

const STORAGE_KEY = 'snc_expediente_metadata';

const DEFAULT_METADATA = {
  // Profesional Actuante
  profesionalNombre: '',
  profesionalMatricula: '',
  profesionalDoc: '',
  profesionalContacto: '',
  profesionalRegistroMOPC: '',
  
  // Inmueble y Titularidad
  propietarioNombre: '',
  propietarioDoc: '',
  fincaMatricula: '',
  padronCtaCte: '',
  departamento: '',
  distrito: '',
  lugarBarrio: '',
  
  // Expediente Administrativo / Municipal
  municipioNombre: '',
  expedienteNumero: '',
  tipoTramite: 'FRACCIONAMIENTO',
  
  // Colindancias oficiales
  linderosNorte: '',
  linderosSur: '',
  linderosEste: '',
  linderosOeste: ''
};

/**
 * Obtiene los metadatos del expediente actuales
 */
export function getExpedienteMetadata() {
  const fromState = State.get('expedienteMetadata');
  if (fromState && typeof fromState === 'object') return { ...DEFAULT_METADATA, ...fromState };

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return { ...DEFAULT_METADATA, ...parsed };
    }
  } catch {}

  // Extraer datos si están en el primer feature del proyecto
  const geojson = State.get('geojson');
  const feat = geojson?.features?.[0];
  const props = feat?.properties || {};

  return {
    ...DEFAULT_METADATA,
    profesionalNombre: props.PROFESIONAL || props.PROFESIONA || '',
    profesionalMatricula: props.REG_PROF || props.MATRICULA || '',
    propietarioNombre: props.PROPIETARIO || props.Propietari || props.TITULAR || '',
    fincaMatricula: props.FINCA || props.FINCA_N || '',
    padronCtaCte: props.PADRON || props.CTA_CTE || props.CODIGO || '',
    departamento: props.DEPARTAMEN || props.DPTO || '',
    distrito: props.DISTRITO || props.DIST || '',
    lugarBarrio: props.LUGAR || props.BARRIO || ''
  };
}

/**
 * Guarda los metadatos del expediente
 */
export function saveExpedienteMetadata(data) {
  const merged = { ...getExpedienteMetadata(), ...data };
  State.set('expedienteMetadata', merged);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
  } catch {}

  // Sincronizar en el feature principal del proyecto si existe
  const geojson = State.get('geojson');
  if (geojson?.features?.length) {
    geojson.features.forEach(f => {
      if (!f.properties) f.properties = {};
      if (merged.profesionalNombre) f.properties.PROFESIONAL = merged.profesionalNombre;
      if (merged.profesionalMatricula) f.properties.REG_PROF = merged.profesionalMatricula;
      if (merged.propietarioNombre && !f.properties.PROPIETARIO) f.properties.PROPIETARIO = merged.propietarioNombre;
      if (merged.fincaMatricula && !f.properties.FINCA) f.properties.FINCA = merged.fincaMatricula;
    });
  }

  return merged;
}

/**
 * Abre el modal interactivo de Datos del Profesional y Expediente
 */
export function openExpedienteModal(onSaveCallback = null) {
  let modal = document.getElementById('expedienteDataModal');
  if (!modal) {
    modal = createModalDOM();
    document.body.appendChild(modal);
  }

  const data = getExpedienteMetadata();
  populateForm(modal, data);

  modal.classList.remove('hidden');
  modal.classList.add('flex');

  // Conectar callback de guardado
  modal._onSaveCallback = onSaveCallback;
}

/**
 * Cierra el modal
 */
export function closeExpedienteModal() {
  const modal = document.getElementById('expedienteDataModal');
  if (modal) {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  }
}

function populateForm(modal, data) {
  const setVal = (id, val) => {
    const el = modal.querySelector('#' + id);
    if (el) el.value = val || '';
  };

  setVal('exp-prof-nombre', data.profesionalNombre);
  setVal('exp-prof-matricula', data.profesionalMatricula);
  setVal('exp-prof-doc', data.profesionalDoc);
  setVal('exp-prof-contacto', data.profesionalContacto);
  setVal('exp-prof-mopc', data.profesionalRegistroMOPC);

  setVal('exp-inm-propietario', data.propietarioNombre);
  setVal('exp-inm-doc', data.propietarioDoc);
  setVal('exp-inm-finca', data.fincaMatricula);
  setVal('exp-inm-padron', data.padronCtaCte);
  setVal('exp-inm-depto', data.departamento);
  setVal('exp-inm-distrito', data.distrito);
  setVal('exp-inm-lugar', data.lugarBarrio);

  setVal('exp-muni-nombre', data.municipioNombre || data.distrito || '');
  setVal('exp-muni-expediente', data.expedienteNumero);
  setVal('exp-muni-tipo', data.tipoTramite || 'FRACCIONAMIENTO');

  setVal('exp-col-norte', data.linderosNorte);
  setVal('exp-col-sur', data.linderosSur);
  setVal('exp-col-este', data.linderosEste);
  setVal('exp-col-oeste', data.linderosOeste);
}

function readForm(modal) {
  const getVal = (id) => modal.querySelector('#' + id)?.value?.trim() || '';

  return {
    profesionalNombre: getVal('exp-prof-nombre'),
    profesionalMatricula: getVal('exp-prof-matricula'),
    profesionalDoc: getVal('exp-prof-doc'),
    profesionalContacto: getVal('exp-prof-contacto'),
    profesionalRegistroMOPC: getVal('exp-prof-mopc'),

    propietarioNombre: getVal('exp-inm-propietario'),
    propietarioDoc: getVal('exp-inm-doc'),
    fincaMatricula: getVal('exp-inm-finca'),
    padronCtaCte: getVal('exp-inm-padron'),
    departamento: getVal('exp-inm-depto'),
    distrito: getVal('exp-inm-distrito'),
    lugarBarrio: getVal('exp-inm-lugar'),

    municipioNombre: getVal('exp-muni-nombre'),
    expedienteNumero: getVal('exp-muni-expediente'),
    tipoTramite: getVal('exp-muni-tipo'),

    linderosNorte: getVal('exp-col-norte'),
    linderosSur: getVal('exp-col-sur'),
    linderosEste: getVal('exp-col-este'),
    linderosOeste: getVal('exp-col-oeste')
  };
}

function createModalDOM() {
  const div = document.createElement('div');
  div.id = 'expedienteDataModal';
  div.className = 'fixed inset-0 z-[4200] hidden items-center justify-center bg-black/75 backdrop-blur-sm p-4';
  div.setAttribute('role', 'dialog');
  div.setAttribute('aria-modal', 'true');
  div.setAttribute('aria-labelledby', 'expModalTitle');

  div.innerHTML = `
    <div class="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl">
      <!-- HEADER -->
      <div class="flex items-center justify-between border-b border-slate-800 px-6 py-4 bg-slate-950/80">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600 to-amber-600 flex items-center justify-center text-white shadow">
            <i class="fas fa-file-signature text-lg"></i>
          </div>
          <div>
            <h2 id="expModalTitle" class="text-base font-bold text-white">Datos del Profesional y Expediente</h2>
            <p class="text-[11px] text-slate-400">Información legal requerida para el informe SNC 551/2023 y Dictamen Ley 3966</p>
          </div>
        </div>
        <button type="button" class="btn-close-modal rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white transition" aria-label="Cerrar">
          <i class="fas fa-times text-sm"></i>
        </button>
      </div>

      <!-- BODY WITH TABS -->
      <div class="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar text-xs">
        
        <!-- SECCIÓN 1: PROFESIONAL TOPÓGRAFO / PERITO -->
        <div class="p-4 rounded-xl border border-indigo-500/30 bg-indigo-950/15 space-y-3">
          <div class="flex items-center justify-between">
            <span class="text-xs font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-2">
              <i class="fas fa-user-tie"></i> 1. Profesional Responsable (Topógrafo / Agrimensor)
            </span>
            <span class="text-[10px] text-slate-400">Declaración Jurada SNC</span>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label class="block text-[10px] uppercase font-bold text-slate-400 mb-1">Nombre y Apellido Completo</label>
              <input id="exp-prof-nombre" type="text" placeholder="Ej. Ing. Geóg. Carlos M. Benítez" class="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-100 focus:border-indigo-500 focus:outline-none">
            </div>
            <div>
              <label class="block text-[10px] uppercase font-bold text-slate-400 mb-1">Registro / Matrícula Profesional SNC</label>
              <input id="exp-prof-matricula" type="text" placeholder="Ej. SNC N° 458 / MOPC N° 1240" class="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-100 focus:border-indigo-500 focus:outline-none">
            </div>
            <div>
              <label class="block text-[10px] uppercase font-bold text-slate-400 mb-1">C.I. / R.U.C. del Profesional</label>
              <input id="exp-prof-doc" type="text" placeholder="Ej. 1.845.620-4" class="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-100 focus:border-indigo-500 focus:outline-none">
            </div>
            <div>
              <label class="block text-[10px] uppercase font-bold text-slate-400 mb-1">Teléfono / Correo de Contacto</label>
              <input id="exp-prof-contacto" type="text" placeholder="Ej. (0981) 450-200 / perito@geodesia.py" class="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-100 focus:border-indigo-500 focus:outline-none">
            </div>
            <div class="md:col-span-2">
              <label class="block text-[10px] uppercase font-bold text-slate-400 mb-1">Registro MOPC / Asociación Profesional</label>
              <input id="exp-prof-mopc" type="text" placeholder="Ej. Habilitación MOPC N° 892 - Asociación de Agrimensores del Paraguay" class="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-100 focus:border-indigo-500 focus:outline-none">
            </div>
          </div>
        </div>

        <!-- SECCIÓN 2: INMUEBLE Y PROPIETARIO -->
        <div class="p-4 rounded-xl border border-emerald-500/30 bg-emerald-950/15 space-y-3">
          <span class="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-2">
            <i class="fas fa-landmark"></i> 2. Datos del Inmueble y Titularidad
          </span>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div class="md:col-span-2">
              <label class="block text-[10px] uppercase font-bold text-slate-400 mb-1">Propietario / Solicitante Registrado</label>
              <input id="exp-inm-propietario" type="text" placeholder="Ej. María Antonia Giménez de López" class="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-100 focus:border-emerald-500 focus:outline-none">
            </div>
            <div>
              <label class="block text-[10px] uppercase font-bold text-slate-400 mb-1">C.I. / R.U.C. Propietario</label>
              <input id="exp-inm-doc" type="text" placeholder="Ej. 2.450.118" class="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-100 focus:border-emerald-500 focus:outline-none">
            </div>
            <div>
              <label class="block text-[10px] uppercase font-bold text-slate-400 mb-1">N° de Finca / Matrícula DGRP</label>
              <input id="exp-inm-finca" type="text" placeholder="Ej. Finca 14.850 / Matr. L08-450" class="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-100 focus:border-emerald-500 focus:outline-none">
            </div>
            <div>
              <label class="block text-[10px] uppercase font-bold text-slate-400 mb-1">Padrón / Cta. Cte. Catastral</label>
              <input id="exp-inm-padron" type="text" placeholder="Ej. Padrón 4.250 / Cta. 27-0482-10" class="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-100 focus:border-emerald-500 focus:outline-none">
            </div>
            <div>
              <label class="block text-[10px] uppercase font-bold text-slate-400 mb-1">Lugar / Compañía / Barrio</label>
              <input id="exp-inm-lugar" type="text" placeholder="Ej. Compañía Guasu Rocai" class="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-100 focus:border-emerald-500 focus:outline-none">
            </div>
            <div>
              <label class="block text-[10px] uppercase font-bold text-slate-400 mb-1">Distrito / Municipio</label>
              <input id="exp-inm-distrito" type="text" placeholder="Ej. Piribebuy" class="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-100 focus:border-emerald-500 focus:outline-none">
            </div>
            <div>
              <label class="block text-[10px] uppercase font-bold text-slate-400 mb-1">Departamento</label>
              <input id="exp-inm-depto" type="text" placeholder="Ej. Cordillera (o CAPITAL)" class="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-100 focus:border-emerald-500 focus:outline-none">
            </div>
          </div>
        </div>

        <!-- SECCIÓN 3: EXPEDIENTE ADMINISTRATIVO Y MUNICIPAL -->
        <div class="p-4 rounded-xl border border-sky-500/30 bg-sky-950/15 space-y-3">
          <span class="text-xs font-bold uppercase tracking-wider text-sky-400 flex items-center gap-2">
            <i class="fas fa-city"></i> 3. Trámite Municipal (Ley 3966/2010)
          </span>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label class="block text-[10px] uppercase font-bold text-slate-400 mb-1">Municipalidad Competente</label>
              <input id="exp-muni-nombre" type="text" placeholder="Ej. Municipalidad de Piribebuy" class="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-100 focus:border-sky-500 focus:outline-none">
            </div>
            <div>
              <label class="block text-[10px] uppercase font-bold text-slate-400 mb-1">N° Expediente / Mesa de Entrada</label>
              <input id="exp-muni-expediente" type="text" placeholder="Ej. EXP-MUNI-2026/0842" class="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-100 focus:border-sky-500 focus:outline-none">
            </div>
            <div>
              <label class="block text-[10px] uppercase font-bold text-slate-400 mb-1">Tipo de Trámite</label>
              <select id="exp-muni-tipo" class="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-100 focus:border-sky-500 focus:outline-none">
                <option value="FRACCIONAMIENTO">Fraccionamiento Urbano / Subdivisión</option>
                <option value="LOTEAMIENTO">Loteamiento Mayor (Cesión 16% + Plazas)</option>
                <option value="UNIFICACION">Unificación / Refundición de Parcelas</option>
                <option value="MENSURA_PERICIAL">Mensura Judicial / Deslinde</option>
                <option value="REGULARIZACION">Regularización Catastral SNC</option>
              </select>
            </div>
          </div>
        </div>

        <!-- SECCIÓN 4: COLINDANCIAS OFICIALES -->
        <div class="p-4 rounded-xl border border-amber-500/30 bg-amber-950/15 space-y-3">
          <span class="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-2">
            <i class="fas fa-compass"></i> 4. Linderos y Colindancias Escritas
          </span>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label class="block text-[10px] uppercase font-bold text-slate-400 mb-1">Al Norte linda con:</label>
              <input id="exp-col-norte" type="text" placeholder="Ej. Calle Pública de 16m y Derechos de Juan Pérez" class="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-100 focus:border-amber-500 focus:outline-none">
            </div>
            <div>
              <label class="block text-[10px] uppercase font-bold text-slate-400 mb-1">Al Sur linda con:</label>
              <input id="exp-col-sur" type="text" placeholder="Ej. Lote 04 de la Manzana B" class="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-100 focus:border-amber-500 focus:outline-none">
            </div>
            <div>
              <label class="block text-[10px] uppercase font-bold text-slate-400 mb-1">Al Este linda con:</label>
              <input id="exp-col-este" type="text" placeholder="Ej. Finca 12.300 Padrón 8.400 de Suc. Gómez" class="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-100 focus:border-amber-500 focus:outline-none">
            </div>
            <div>
              <label class="block text-[10px] uppercase font-bold text-slate-400 mb-1">Al Oeste linda con:</label>
              <input id="exp-col-oeste" type="text" placeholder="Ej. Arroyo Piribebuy (Franja de protección 30m)" class="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-100 focus:border-amber-500 focus:outline-none">
            </div>
          </div>
        </div>

      </div>

      <!-- FOOTER -->
      <div class="flex items-center justify-between border-t border-slate-800 px-6 py-4 bg-slate-950/80">
        <span class="text-[10px] text-slate-500 italic">
          <i class="fas fa-lock text-slate-600 mr-1"></i> Se guardará localmente para todas las exportaciones.
        </span>
        <div class="flex gap-2">
          <button type="button" class="btn-open-signatures px-3 py-2 rounded-lg bg-sky-900/60 hover:bg-sky-800/80 text-sky-200 border border-sky-700/60 font-semibold transition text-xs flex items-center gap-1.5" title="Gestionar circuito de firmas y sellos institucionales">
            <i class="fas fa-stamp"></i> Firmas y Sellos
          </button>
          <button type="button" class="btn-cancel-modal px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold transition text-xs">
            Cancelar
          </button>
          <button type="button" class="btn-save-modal px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition text-xs shadow flex items-center gap-1.5">
            <i class="fas fa-floppy-disk"></i> Guardar y Aplicar al Expediente
          </button>
        </div>
      </div>
    </div>
  `;

  // Eventos de botones
  div.querySelector('.btn-close-modal').addEventListener('click', closeExpedienteModal);
  div.querySelector('.btn-cancel-modal').addEventListener('click', closeExpedienteModal);
  div.querySelector('.btn-open-signatures')?.addEventListener('click', () => {
    if (typeof window !== 'undefined' && window.SignatureUI) {
      window.SignatureUI.open();
    }
  });

  div.querySelector('.btn-save-modal').addEventListener('click', () => {
    const data = readForm(div);
    const saved = saveExpedienteMetadata(data);
    showToast('Datos del expediente actualizados con éxito', 'success');
    closeExpedienteModal();
    if (typeof div._onSaveCallback === 'function') {
      div._onSaveCallback(saved);
    }
  });

  return div;
}

// Exponer en window
if (typeof window !== 'undefined') {
  window.ExpedienteModal = {
    open: openExpedienteModal,
    close: closeExpedienteModal,
    get: getExpedienteMetadata,
    save: saveExpedienteMetadata
  };
}

export default {
  open: openExpedienteModal,
  close: closeExpedienteModal,
  get: getExpedienteMetadata,
  save: saveExpedienteMetadata
};
