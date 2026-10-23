/**
 * Orquestador Principal - Catastro PY Pro (SNC 551/2023)
 * Coordina todos los módulos de la aplicación
 */

import { State } from '../state.js';
import * as Parser from '../parser.js';
import * as MapEngine from '../mapEngine.js';
import * as Validator from '../validator.js';
import * as Export from '../export.js';
import * as DataTable from '../dataTable.js';
import { showToast, showLoading, actualizarContadoresUI, actualizarEstadoProyecto, hideLoading } from '../utils.js';
import { CAMPOS_REQUERIDOS } from '../config.js';
import { PLANS, resolvePlan } from '../plans.js';
import '../cogoUI.js';
import '../lineageUI.js';
import '../topologyRepairUI.js';
import '../versioningUI.js';
import '../geoprocessingUI.js';
import { logger } from '../logger.js';

// Coordination modules (Node.js only - multi-IA development workflow)
let GraphCoordinator = null;
let getGraphClient = null;
let createAgentSwarm = null;
let DEFAULT_SWARM_CONFIG = null;

if (typeof process !== 'undefined' && process.versions?.node) {
  // Dynamic import for Node.js only (multi-IA development workflow)
  import('../../.opencode/coordination/coordinator.mjs').then(mod => {
    GraphCoordinator = mod.GraphCoordinator;
    getGraphClient = mod.getGraphClient;
    initializeNodeCoordination();
  }).catch(() => {});
  import('../../.opencode/coordination/orchestrator.mjs').then(mod => {
    createAgentSwarm = mod.createAgentSwarm;
    DEFAULT_SWARM_CONFIG = mod.DEFAULT_SWARM_CONFIG;
  }).catch(() => {});
}

let graphCoordinator = null;
let graphClient = null;
let agentOrchestrator = null;

/**
 * CRS destino para la exportación del expediente.
 *
 * Prioridad: selector del panel (window.PiribebuyCrs) > localStorage > UTM 21S.
 * UTM 21S (EPSG:32721) es el valor por defecto porque es el que exige la
 * Resolución SNC N° 551/2023 para la entrega oficial.
 *
 * @returns {string} código EPSG.
 */
function exportTargetCrs() {
  try {
    const fromPanel = window.PiribebuyCrs?.exportCrs?.();
    if (fromPanel) return fromPanel;
  } catch { /* panel no disponible */ }
  try {
    const saved = localStorage.getItem('snc_export_crs');
    if (saved) return saved;
  } catch { /* localStorage no disponible */ }
  return 'EPSG:32721';
}

function initializeNodeCoordination() {
  if (!GraphCoordinator) return;
  
  /**
   * Graph Coordinator Instance - Colaboración multi-IA
   */
  graphCoordinator = new GraphCoordinator('app-agent', {
    defaultTtl: 300000,
    maxRetries: 3
  });

  // Graph Client - Grafo de conocimiento graphify
  let graphClient = null;
  async function initializeGraphClient() {
    try {
      if (!getGraphClient) return;
      const client = await getGraphClient();
      graphClient = client;
      window.GraphClient = client;
      console.log('[App] Graph Client initialized:', client.getStats());
    } catch (e) {
      console.warn('[App] Graph Client init failed (non-critical):', e.message);
    }
  }

  // Agent Orchestrator - Swarm management
  let agentOrchestrator = null;
  async function initializeAgentSwarm() {
    try {
      if (!createAgentSwarm || !DEFAULT_SWARM_CONFIG || !graphCoordinator) return;
      agentOrchestrator = await createAgentSwarm(graphCoordinator, DEFAULT_SWARM_CONFIG);
      console.log('[App] Agent swarm initialized');
      
      window.AgentOrchestrator = agentOrchestrator;
    } catch (e) {
      console.warn('[App] Agent swarm init failed (non-critical):', e.message);
    }
  }

  // Inicializar graph client después de que la app esté lista
  initializeGraphClient();

  // Inicializar swarm después de que la app esté lista
  initializeAgentSwarm();

  // Exponer globalmente
  window.GraphCoordinator = graphCoordinator;

  // Auto-release locks al cerrar
  window.addEventListener('beforeunload', () => {
    graphCoordinator.releaseAllMyLocks?.().catch(console.error);
    if (agentOrchestrator) agentOrchestrator.shutdown?.().catch(console.error);
  });
}

// Inicializar coordinación Node.js si está disponible
if (typeof process !== 'undefined' && process.versions?.node) {
  initializeNodeCoordination();
}

/**
 * Actualiza los pasos del progreso - Sprint 3
 */
function updateProgressStep(stepNumber) {
  const steps = document.querySelectorAll('.step');
  steps.forEach((step, index) => {
    const stepNum = index + 1;
    step.classList.remove('active', 'completed');

    if (stepNum < stepNumber) {
      step.classList.add('completed');
    } else if (stepNum === stepNumber) {
      step.classList.add('active');
    }
  });
}

// Exponer para uso global
window.updateProgressStep = updateProgressStep;

const App = {
  /** Aplica una combinación visual persistente sin alterar datos del expediente. */
  applyTheme(theme = 'default') {
    const themes = {
      default: { label: 'Tema: actual', icon: 'fa-palette' },
      monochrome: { label: 'Tema: blanco y negro', icon: 'fa-circle-half-stroke' },
      navyYellow: { label: 'Tema: azul oscuro y amarillo', icon: 'fa-sun' }
    };
    const selected = themes[theme] ? theme : 'default';
    document.documentElement.dataset.theme = selected;
    localStorage.setItem('theme', selected);
    const btn = document.getElementById('theme-toggle');
    if (btn) {
      btn.title = themes[selected].label;
        btn.dataset.tooltip = themes[selected].label;
        btn.setAttribute('aria-label', themes[selected].label);
        btn.setAttribute('aria-pressed', String(selected !== 'default'));
      btn.innerHTML = `<i class="${themes[selected].icon}"></i>`;
    }
    showToast(`Tema aplicado: ${themes[selected].label}`, 'info');
  },

  cycleTheme() {
    const themes = ['default', 'monochrome', 'navyYellow'];
    const current = document.documentElement.dataset.theme || 'default';
    const next = themes[(themes.indexOf(current) + 1) % themes.length];
    this.applyTheme(next);
  },

  /** Limpia el estado de la aplicación para un nuevo expediente. */
  clear() {
    if (confirm('¿Limpiar todo el expediente actual? Se perderán datos no guardados.')) {
      State.clear();
      hideLoading();
      showToast('Expediente limpiado', 'info');
    }
  },

  /** Abre el selector de archivos de proyecto guardado. */
  openProject() {
    document.getElementById('input-project-open')?.click();
  },

  async openProjectFile(file) {
    showToast('Cargando proyecto...', 'info');
  },

  saveAll() {
    showToast('Guardando proyecto...', 'info');
  },

  renameProject() {
    const name = prompt('Nuevo nombre del proyecto:');
    if (name) {
      localStorage.setItem('projectName', name);
      document.getElementById('active-project-name').textContent = name;
      showToast('Proyecto renombrado', 'success');
    }
  },

  deleteProject() {
    if (confirm('¿Eliminar proyecto y sus expedientes?')) {
      localStorage.clear();
      location.reload();
    }
  },

  /** Valida el expediente completo (SNC 551/2023). */
  async validate() {
    const geojson = State.get('geojson');
    const excelData = State.get('excelData');

    if (!geojson || !excelData) {
      showToast('Debe cargar geometría y datos antes de validar', 'warning');
      return null;
    }

    showToast('🔍 Validando expediente SNC 551/2023...', 'info');

    try {
      const result = await Validator.runValidation();
      this.renderValidationAudit(result.results || []);

      updateProgressStep(4);

      const modal = document.getElementById('validationModal');
      const modalBody = document.getElementById('modalBody');
      const modalTitle = document.getElementById('modalTitle');
      const confirmBtn = document.getElementById('modalConfirmBtn');

      if (modalBody) {
        if (result.reporteHTML) {
          modalBody.innerHTML = result.reporteHTML;
        } else {
          let html = '';
          if (result.valid) {
            html = '<div style="text-align:center; padding:2rem;"><div style="color:#10b981; font-size:3rem;">✅</div><h3>Validación Exitosa</h3><p>Todos los requisitos de la Res. 551/2023 se cumplen.</p></div>';
          } else {
            html = '<div style="text-align:center; padding:2rem;"><div style="color:#ef4444; font-size:3rem;">❌</div><h3>Validación Fallida</h3><p>Revise los errores en el panel semáforo.</p></div>';
          }

          const missingTabularData = result.results?.some(item => item.campo === 'DATOS');
          if (missingTabularData) {
            html += `<div style="margin:16px 0; padding:16px; border:1px solid #f59e0b; border-radius:8px; background:#fffbeb;">
              <h4 style="margin:0 0 8px; color:#92400e;">Datos requeridos para continuar</h4>
              <p style="margin:0 0 10px; font-size:.9rem;">Cargue un Excel con los 15 campos del Anexo SNC 551/2023: ${CAMPOS_REQUERIDOS.join(', ')}.</p>
              <button onclick="window.App.downloadOfficialTemplate()" style="margin-right:8px; padding:7px 10px; border:0; border-radius:5px; background:#166534; color:#fff; cursor:pointer; font-weight:bold;">Descargar plantilla Excel</button>
              <button onclick="window.Workspace?.switchTab('import'); document.getElementById('input-data-import')?.click()" style="padding:7px 10px; border:0; border-radius:5px; background:#2563eb; color:#fff; cursor:pointer; font-weight:bold;">Cargar Excel</button>
            </div>`;
          }

          const requiresExcelReload = result.results?.some(item => item.estado === 'error' && (
            item.campo === 'DATOS' || item.campo === 'ARCHIVOS'
          ));
          if (requiresExcelReload && excelData) {
            html += `<div style="margin:16px 0; padding:16px; border:1px solid #3b82f6; border-radius:8px; background:#eff6ff;">
              <h4 style="margin:0 0 8px; color:#1e40af;">Recargue Excel tras corregir</h4>
              <p style="margin:0 0 10px; font-size:.9rem;">Corrija los datos en su planilla y vuelva a cargar el Excel para revalidar.</              <button onclick="window.Workspace?.switchTab('import'); document.getElementById('input-data-import')?.click()" style="padding:7px 10px; border:0; border-radius:5px; background:#2563eb; color:#fff; cursor:pointer; font-weight:bold;">Cargar Excel corregido</button>
            </div>`;
          }

          const hasTopologyErrors = result.results?.some(item => 
            item.estado === 'error' && (item.campo === 'GEOMETRIA' || item.campo === 'TOPOLOGIA' || String(item.codigo || '').includes('SOLAP') || String(item.codigo || '').includes('GEOM'))
          );
          if (hasTopologyErrors) {
            html += `<div style="margin:16px 0; padding:16px; border:1px solid #d97706; border-radius:8px; background:#fffbeb;">
              <h4 style="margin:0 0 8px; color:#b45309; font-weight:bold;">🛠️ Subsanación Topológica Asistida en 1 Clic</h4>
              <p style="margin:0 0 10px; font-size:.9rem; color:#78350f;">Se detectaron inconsistencias geométricas/topológicas en los polígonos. Puede corregirlas automáticamente con el asistente determinista.</p>
              <button onclick="window.App.closeModal(); window.TopologyRepairUI?.open();" style="padding:8px 14px; border:0; border-radius:6px; background:#d97706; color:#fff; cursor:pointer; font-weight:bold; font-size:12px; display:inline-flex; align-items:center; gap:6px;">
                <i class="fas fa-wand-magic-sparkles"></i> Subsanar automáticamente ahora
              </button>
            </div>`;
          }

          modalBody.innerHTML = html;
        }

        if (modalTitle) modalTitle.textContent = result.valid ? '✅ Validación Exitosa' : '❌ Validación Fallida';
        if (confirmBtn) {
          confirmBtn.textContent = result.valid ? 'Generar Certificado' : 'Cerrar';
          confirmBtn.onclick = () => {
            if (result.valid) {
              this.certify();
            }
            window.App.closeModal();
          };
        }

        if (modal) modal.style.display = 'flex';

        return result;
      }
    } catch (error) {
      logger.error('Error en validación:', error);
      showToast(`Error en validación: ${error.message}`, 'error');
      return null;
    }
  },

  /** Genera certificado de cumplimiento SNC. */
  async certify() {
    const result = await this.validate();
    if (!result) return false;
    if (!result.valid) {
      showToast('❌ No se puede auditar: el expediente tiene errores', 'error');
      return false;
    }

    showToast('🛡️ Generando Auditoría de Cumplimiento...', 'info');
    const generated = await Export.generateComplianceCertificate(result.results);
    if (generated) {
      try {
        await Export.generateConsultaDescriptivaPDF(result.results);
      } catch (e) {
        logger.warn('No se pudo generar la Consulta Descriptiva desde certify():', e);
      }
      const packageGenerated = await Export.packAndDownload(exportTargetCrs());
      if (packageGenerated) {
        showToast('✅ Auditoría, Consulta Descriptiva y expediente SHP (.shp, .shx, .dbf, .prj) generados', 'success');
      }
    } else {
      showToast('❌ No se pudo generar la auditoría o el expediente SHP', 'error');
    }

    try {
      await MapEngine.openCertificateMap(result.results);
    } catch (e) {
      logger.warn('No se pudo abrir la vista de plano de certificación:', e);
    }

    return true;
  },

  /** Exporta expediente completo (SHP + PDF + Excel). */
  async exportSHP() {
    try {
      if (State.getBackendToken()) {
        const allowed = await this._enforceExportLimit();
        if (!allowed) return;
      }
      const success = await Export.packAndDownload(exportTargetCrs());
      if (success) {
        updateProgressStep(5);
        const auditTabCount = document.getElementById('tabAuditCount');
        if (auditTabCount) auditTabCount.style.display = 'none';
        if (State.getBackendToken()) {
          State.backend._lastExportSuccess = true;
          await this._incrementExportUsage();
        }
      }
    } catch (error) {
      logger.error('Error en exportación:', error);
      showToast(`Error al exportar: ${error.message}`, 'error');
    }
  },

  exportGeoJSON() {
    try {
      return Export.exportGeoJSON();
    } catch (error) {
      showToast(`No se pudo exportar GeoJSON: ${error.message}`, 'error');
      return false;
    }
  },

  exportKML() {
    try {
      return Export.exportKML();
    } catch (error) {
      showToast(`No se pudo exportar KML: ${error.message}`, 'error');
      return false;
    }
  },

  exportDXF() {
    try {
      return Export.exportDXF();
    } catch (error) {
      showToast(`No se pudo exportar DXF: ${error.message}`, 'error');
      return false;
    }
  },

  // Carga de archivos (geometría y datos). Los inputs del HTML llaman
  // window.App?.handleFile / handleFiles.
  async handleFile(file, type) {
    try {
      const result = await Parser.handleFile(file, type);
      if (type === 'geo' || (result && result.added > 0)) MapEngine.restoreStartupView?.();
      return result;
    } catch (error) {
      showToast(`No se pudo cargar el archivo: ${error.message}`, 'error');
      logger.error('handleFile error', error);
      return null;
    }
  },

  async handleFiles(fileList, type) {
    try {
      const result = await Parser.handleFiles(fileList, type);
      if (type === 'geo') MapEngine.restoreStartupView?.();
      return result;
    } catch (error) {
      showToast(`No se pudieron cargar los archivos: ${error.message}`, 'error');
      logger.error('handleFiles error', error);
      return null;
    }
  },

  async exportProfessionalReport() {
    try {
      if (State.getBackendToken()) {
        const allowed = await this._enforceExportLimit();
        if (!allowed) return;
      }
      const result = await Export.generateProfessionalReport();
      if (result) {
        showToast(`✅ Certificado Preventivo generado: ${result.validationCode}`, 'success');
      }
    } catch (error) {
      logger.error('Error generando certificado profesional:', error);
      showToast(`Error: ${error.message}`, 'error');
    }
  },

  /** Renderiza el panel de auditoría en la UI. */
  renderValidationAudit(results) {
  },

  /** Cierra el modal de validación. */
  closeModal() {
    const modal = document.getElementById('validationModal');
    if (modal) modal.style.display = 'none';
  },

  async init() {
    logger.debug('[App] Iniciando Catastro PY Pro...');

    // State ya se inicializa como singleton al importar
    // State = new StateManager() en state.js línea 470

    // La coordinación multi-IA es solo Node.js (ver initializeNodeCoordination).
    // En el navegador no se inicializa ningún swarm ni se importa .opencode/.

    // Inicializar módulos (solo los que exponen init; el resto es singleton al importar).
    State.init?.();
    MapEngine.init?.();
    Parser.init?.();
    DataTable.init?.();
    Validator.init?.();
    Export.init?.();

    // Configurar UI
    this.setupAuthUI();
    this.bindEvents();
    this.restoreSession();

    // Sincronizar estado inicial del proyecto o cargar muestra oficial si no hay geometrías
    const currentGeojson = State.get('geojson');
    if (currentGeojson && currentGeojson.features?.length > 0) {
      actualizarEstadoProyecto(currentGeojson, State.get('validationResults'));
      if (window.MapEngine?.loadGeoJSON) {
        window.MapEngine.loadGeoJSON(currentGeojson);
      }
    } else {
      await this.loadSample('piribebuy');
    }

    // Ocultar loading screen
    hideLoading();
    updateProgressStep(1);

    logger.debug('[App] Inicialización completada');
  },

  setupAuthUI() {
    if (window.AuthModal?.init) {
      window.AuthModal.init();
    }
  },

  bindEvents() {
    // Sincronizar panel "Estado del Proyecto" con cambios en State
    State.subscribe('geojson', (geojson) => {
      actualizarEstadoProyecto(geojson, State.get('validationResults'));
      if (geojson && window.MapEngine?.loadGeoJSON) {
        window.MapEngine.loadGeoJSON(geojson);
      }
    });

    State.subscribe('validationResults', (results) => {
      actualizarEstadoProyecto(State.get('geojson'), results);
    });

    State.subscribe('clear', () => {
      actualizarEstadoProyecto(null, null);
    });
  },

  async loadSample(type = 'piribebuy') {
    showLoading('Cargando expediente de muestra...');
    try {
      if (type === 'points') {
        const resp = await fetch('/data/municipal/piribebuy/vertedero/centro.geojson');
        if (!resp.ok) throw new Error('No se pudo descargar centro.geojson');
        const data = await resp.json();
        State.set('geojson', data);
        State.set('sourceGeoFileName', 'puntos_cordenadas.csv');
        window.currentGeoFile = 'puntos_cordenadas.csv';
        actualizarEstadoProyecto(data, null);
        showToast('✅ Puntos de prueba cargados', 'success');
      } else if (type === 'polygons') {
        const csvText = `WKT,nombre,descripción\n"POLYGON ((-61.7464714 -21.735707, -61.9510918 -21.7491007, -61.9510918 -21.758348, -61.9686013 -21.7596235, -61.9668846 -21.7672759, -62.0019036 -21.7704643, -62.0005303 -21.7800291, -62.0073967 -21.7797103, -62.0032769 -21.8549309, -61.8875771 -21.8450525, -61.8903237 -21.8077633, -61.7674141 -21.7985191, -61.7128258 -21.7946938, -61.7138558 -21.7860864, -61.7231255 -21.7774785, -61.7224388 -21.7672759, -61.7547112 -21.7704643, -61.7547112 -21.7640875, -61.7461281 -21.7640875, -61.7464714 -21.735707))",Polígono 1,\n"POLYGON ((-61.781147 -21.8657646, -62.0060234 -21.8657646, -62.0056801 -21.8934821, -61.7818337 -21.8944378, -61.781147 -21.8657646))",Polígono 2,`;
        const blob = new Blob([csvText], { type: 'text/csv' });
        blob.name = 'poligonos_z20.csv';
        await Parser.handleFile(blob, 'geo');
        showToast('✅ Polígonos UTM 20S cargados', 'success');
      } else {
        const resp = await fetch('/data/municipal/piribebuy/casco/casco_historico.geojson');
        if (!resp.ok) throw new Error('No se pudo descargar casco_historico.geojson');
        const data = await resp.json();
        if (data.features && data.features[0]) {
          data.features[0].properties = {
            ...data.features[0].properties,
            CODIGO: '0314-004-0001',
            PADRON: '4278',
            CTA_CTE: '19-0142-01',
            DEPARTAMEN: 'CORDILLERA',
            DISTRITO: 'PIRIBEBUY',
            BARRIO: 'CENTRO',
            PARCELA_ESTADO: 'VIGENTE',
            PROPIETARIO: 'FRANCISCO SOLANO LÓPEZ (HEREDEROS)',
            USO_TIERRA: 'URBANO RESIDENCIAL',
            SUP_TITULO: 1245.50
          };
        }
        State.set('geojson', data);
        State.set('sourceGeoFileName', 'expediente_piribebuy.geojson');
        window.currentGeoFile = 'expediente_piribebuy.geojson';
        if (window.MapEngine?.loadGeoJSON) {
          window.MapEngine.loadGeoJSON(data);
          window.MapEngine.focusWorkPolygon?.();
        }
        actualizarEstadoProyecto(data, null);
        showToast('✅ Expediente de prueba Piribebuy cargado', 'success');
      }
    } catch (e) {
      logger.error('Error al cargar datos de muestra:', e);
      showToast('Error cargando muestra: ' + e.message, 'error');
    } finally {
      hideLoading();
    }
  },

  restoreSession() {
  },

  async _enforceExportLimit() {
    const token = State.getBackendToken?.();
    if (!token) return true;
    try {
      const response = await fetch('/api/usage', { headers: { Authorization: `Bearer ${token}` } });
      if (!response.ok) return true; // sin backend disponible, no bloquear la exportación
      const data = await response.json();
      const used = Number(data?.usage?.exportsToday ?? 0);
      const limit = Number(data?.limits?.exportacionesPorDia ?? Infinity);
      if (Number.isFinite(limit) && used >= limit) {
        showToast('Límite diario de exportaciones alcanzado para tu plan', 'error');
        return false;
      }
      return true;
    } catch {
      return true;
    }
  },

  async _incrementExportUsage() {
    const token = State.getBackendToken?.();
    if (!token) return;
    try {
      await fetch('/api/usage/increment', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
    } catch {
      // El contador es best-effort: nunca debe romper la exportación.
    }
  },

  // ── Métodos referenciados por el HTML que faltaban ─────────────────────────
  // index.html invoca window.App.openPlans()/closePlans()/saveProfile()/
  // closeProfile()/printCertification()/closeCertification()/
  // downloadOfficialTemplate(). Ninguno existía: los clics no hacían nada.

  openPlans() {
    document.getElementById('modal-plans')?.classList.remove('hidden');
    showToast('Planes de trabajo', 'info');
  },

  closePlans() {
    document.getElementById('modal-plans')?.classList.add('hidden');
  },

  openProfile() {
    document.getElementById('modal-profile')?.classList.remove('hidden');
  },

  closeProfile() {
    document.getElementById('modal-profile')?.classList.add('hidden');
  },

  saveProfile() {
    // El perfil se lee de los campos del modal y se guarda en State.
    const nombre = document.getElementById('profile-name')?.value?.trim();
    const cargo = document.getElementById('profile-role')?.value?.trim();
    if (nombre) State.set('profileName', nombre);
    if (cargo) State.set('profileRole', cargo);
    this.closeProfile();
    showToast('Perfil guardado', 'success');
  },

  closeCertification() {
    document.getElementById('modal-certification')?.classList.add('hidden');
  },

  printCertification() {
    window.print();
  },

  downloadOfficialTemplate() {
    // Plantilla Excel oficial del SNC. Se genera como XLSX mínimo válido.
    try {
      const XLSX = window.XLSX;
      if (!XLSX) { showToast('La librería XLSX no está cargada', 'error'); return; }
      const rows = [
        ['SNC_PARCELA_ID', 'CODIGO', 'PADRON', 'PARCELA_ESTADO', 'AREA_M2', 'DEPARTAMENTO', 'DISTRITO'],
        ['', '', '', 'VIGENTE', '', '', '']
      ];
      const ws = XLSX.utils.aoa_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Plantilla SNC');
      XLSX.writeFile(wb, 'plantilla-snc-551.xlsx');
      showToast('Plantilla descargada', 'success');
    } catch (err) {
      showToast('No se pudo generar la plantilla: ' + err.message, 'error');
    }
  }
} // Cierre del objeto App principal

// ============================================================
// MÓDULO 9: Flujo de Aprobación, Mesa de Entrada y Trazabilidad
// Requisitos herranuebras.txt: 171-190
// ============================================================

/** Estado de la Mesa de Entrada Virtual */
const MesaEntrada = {
  /** Historial de expedientes entrados */
  expedientes: new Map(),

  /** Obtener siguiente número único de entrada */
  obtenerSiguienteNumeroUnico() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '');
    const random = Math.floor(1000 + Math.random() * 9000);
    return `ENT-${timestamp}-${random}`;
  },

  /** Registrar un nuevo expediente entrado */
  async registrarExpedienteEntrada(datosExpediente) {
    const numeroUnico = this.obtenerSiguienteNumeroUnico();
    const expediente = {
      id: numeroUnico,
      fechaEntrada: new Date().toISOString(),
      estado: 'BORRADOR',
      profesionalId: datosExpediente?.profesionalId,
      nombreProfesional: datosExpediente?.nombreProfesional,
      tipo: datosExpediente?.tipo,
      geojson: datosExpediente?.geojson,
      observaciones: [],
      version: 1,
      historico: []
    };

    this.expedientes.set(numeroUnico, expediente);
    this.notificarNuevoExpediente(expediente);
    return expediente;
  },

  /** Agregar observación a un expediente */
  agregarObservacion(expedienteId, observacion) {
    const expediente = this.expedientes.get(expedienteId);
    if (!expediente) return null;

    const nuevaObservacion = {
      id: Date.now(),
      fecha: new Date().toISOString(),
      texto: observacion,
      estado: 'PENDIENTE',
      usuario: window.State?.get('usuarioActual')?.nombre || 'Sistema'
    };

    expediente.observaciones.push(nuevaObservacion);
    expediente.historico.push({ accion: 'observacion_agregada', version: expediente.version });
    this.actualizarEstadoExpediente(expedienteId, 'CON_OBSERVACIONES');
    return nuevaObservacion;
  },

  /** Actualizar estado del expediente */
  actualizarEstadoExpediente(expedienteId, nuevoEstado) {
    const expediente = this.expedientes.get(expedienteId);
    if (!expediente) return null;
    const anterior = expediente.estado;
    expediente.estado = nuevoEstado;
    expediente.historico.push({
      accion: 'estado_cambiado',
      anterior,
      nuevo: nuevoEstado,
      fecha: new Date().toISOString()
    });
    return expediente;
  },

  /** Capa fantasma para comparar versiones (Ghost Layer) */
  crearCapaGhost(expedienteId, versionAnterior) {
    const expediente = this.expedientes.get(expedienteId);
    if (!expediente) return null;

    // Crear capa fantasma con la versión anterior para comparación visual
    return {
      id: `ghost_${expedienteId}_${versionAnterior}`,
      tipo: 'ghost',
      geometriaAnterior: versionAnterior ? this._obtenerGeometriaVersion(expediente, versionAnterior) : null,
      geometriaActual: expediente.geojson ? expediente.geojson.geometry : null,
      comparar: function(ghost) {
        // Retornar diferencias simplificadas
        if (!ghost.geometriaAnterior || !ghost.geometriaActual) return {};
        return {
          cambiosGeometricos: 'Comparar usando MapEngine.toggleSplitMode o diff geométrico',
          observaciones: 'Superponer capas en MapEngine para visualizar diferencias'
        };
      }
    };
  },

  _obtenerGeometriaVersion(expediente, version) {
    // Simulación: retornar geometría del histórico en esa versión
    // En producción real usaría el histórico versionado completo
    return expediente.historico?.[version - 1] ? { type: 'Feature', geometry: null } : null;
  },

  /** Notificar nuevo expediente a revisores y solicitante */
  notificarNuevoExpediente(expediente) {
    const mensaje = `Nuevo expediente entrado: ${expediente.id} - ${expediente.tipo || 'Sin tipo'}`;
    showToast(mensaje, 'info');

    // En producción real enviaría correo/y portal notificaciones
    // window.EmailService.enviar('nuevo-expediente', expediente);
    // window.Portal.notificar('nueva-asignacion', expediente.id);
  },

  /** Generar Dictamen Técnico de Agrimensura */
  async generarDictamenTechnico(expedienteId) {
    const expediente = this.expedientes.get(expedienteId);
    if (!expediente) throw new Error('Expediente no encontrado');

    // Crear dictamen simplificado
    const dictamen = {
      expedienteId: expedienteId,
      fecha: new Date().toISOString(),
      profesional: expediente.profesionalId || 'Profesional',
      observaciones: expediente.observaciones
        .filter(o => o.estado === 'APROBADA')
        .map(o => o.texto),
      recomendaciones: [],
      firmaDigital: await this._calcularFirmaDigitalDictamen(expediente),
      estado: 'PENDIENTE_VISADO'
    };

    // Agregar al expediente
    expediente.historico.push({
      accion: 'dictamen_generado',
      fecha: new Date().toISOString()
    });

    // Actualizar estado
    this.actualizarEstadoExpediente(expedienteId, 'DICTAMEN_GENERADO');

    showToast('Dictamen técnico generado', 'success');
    return dictamen;
  },

  _calcularFirmaDigitalDictamen(expediente) {
    // Hash basado en datos del expediente + UUID para validación
    const datos = `${expediente.id}|${expediente.fechaEntrada}|${expediente.profesionalId || 'unknown'}`;
    // En producción usaría crypto.subtle.sign o certificado PSC
    return 'SNC-DIGITAL-' + btoa(datos).replace(/[^a-zA-Z0-9]/g, '').substring(0, 16);
  },

  /** Circuitos de visado: Aprobación Técnica → Fiscalización → Director Geodesia */
  circuitosVisado: {
    etapas: [
      { nombre: 'Aprobación Técnica', responsable: 'Técnico Revisor', estado: 'PENDIENTE' },
      { nombre: 'Fiscalización', responsable: 'Fiscalizador', estado: 'PENDIENTE' },
      { nombre: 'Firma Director Geodesia', responsable: 'Director', estado: 'PENDIENTE' }
    ],

    avanzarEtapa(expedienteId, nombreEtapa) {
      const etap = this.etapas.find(e => e.nombre === nombreEtapa);
      if (etap) {
        etap.estado = 'COMPLETADO';
        showToast(`Etapa completada: ${nombreEtapa}`, 'success');
      }
      this.verificarFinalizacion();
    },

    verificarFinalizacion() {
      const todasCompletas = this.etapas.every(e => e.estado === 'COMPLETADO');
      if (todasCompletas) {
        showToast('Circuito de visado completado - Resolución Administrativa lista', 'success');
      }
    }
  },

  /** Dashboard de métricas de expedientes */
  dashboardMetricas: {
    expedientesPorEstado: new Map(),
    tiemposResolucion: [],

    actualizarMetricas(expedienteId, estadoAnterior, nuevoEstado) {
      this.expedientesPorEstado.set(nuevoEstado,
        (this.expedientesPorEstado.get(nuevoEstado) || 0) + 1);

      // Registrar tiempo de transición
      const ahora = Date.now();
      this.tiemposResolucion.push({
        expedienteId,
        transicion: { estadoAnterior, nuevoEstado },
        timestamp: ahora
      });
    }
  },

  /** Buscar expedientes por diversos criterios */
  buscarExpedientes: function(filtro) {
    const resultados = [];
    const expedientes = Array.from(this.expedientes.values());

    filtro = filtro || {};

    expedientes.forEach(exp => {
      let coincide = true;

      if (filtro.tipo && exp.tipo !== filtro.tipo) coincide = false;
      if (filtro.estado && exp.estado !== filtro.estado) coincide = false;
      if (filtro.profesional && exp.profesionalId !== filtro.profesional) coincide = false;
      if (filtro.fechaInicio) {
        const fechaEntrada = new Date(exp.fechaEntrada);
        if (new Date(filtro.fechaInicio) > fechaEntrada) coincide = false;
      }
      if (filtro.fechaFin) {
        const fechaEntrada = new Date(exp.fechaEntrada);
        if (new Date(filtro.fechaFin) < fechaEntrada) coincide = false;
      }

      if (coincide) resultados.push(exp);
    });

    return resultados;
  }
};

// Exponer globalmente para uso en HTML
window.MesaEntrada = MesaEntrada;

// Add MesaEntrada methods to App object for HTML references
App.registrarExpedienteEntrada = async function(datosExpediente) {
  const result = await MesaEntrada.registrarExpedienteEntrada(datosExpediente);
  updateProgressStep(2);
  showToast(`Expediente registrado: ${result.id}`, 'success');
  return result;
};

App.agregarObservacion = function(expedienteId, observacion) {
  const obs = MesaEntrada.agregarObservacion(expedienteId, observacion);
  showToast('Observación agregada', 'info');
  return obs;
};

App.generarDictamen = async function(expedienteId) {
  try {
    const dictamen = await MesaEntrada.generarDictamenTechnico(expedienteId);
    updateProgressStep(3);
    showToast('Dictamen generado', 'success');
    return dictamen;
  } catch (e) {
    showToast('Error generando dictamen: ' + e.message, 'error');
    throw e;
  }
};

App.avanzarEtapaVisado = function(nombreEtapa) {
  MesaEntrada.circuitosVisado.avanzarEtapa(undefined, nombreEtapa);
};

App.buscarExpediente = function(filtro) {
  return MesaEntrada.buscarExpedientes(filtro);
};

// La inicialización la dispara app.js (entry point) una sola vez.
// No agregar otro listener DOMContentLoaded aquí: provocaría doble init.
export { App };
