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
import { showToast, actualizarContadoresUI, actualizarEstadoProyecto, hideLoading } from '../utils.js';
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
      const packageGenerated = await Export.packAndDownload();
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
      const success = await Export.packAndDownload();
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

    // Ocultar loading screen
    hideLoading();
    updateProgressStep(1);

    logger.debug('[App] Inicialización completada');
  },

  setupAuthUI() {
  },

  bindEvents() {
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
  }
};

// La inicialización la dispara app.js (entry point) una sola vez.
// No agregar otro listener DOMContentLoaded aquí: provocaría doble init.
export { App };