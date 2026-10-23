/**
 * Entry Point Municipal - Municipal PY Pro (Ley 3966/2010)
 * Orquesta la interfaz municipal con el motor cartográfico y de validación urbana
 */

import { App } from './app/index.js';
import { initButtonIcons } from './buttonIcons.js';
import { MunicipalClient } from './municipalClient.js';
import * as MunicipalValidator from './municipal.js';
import { State } from './state.js';
import { showToast } from './utils.js';
import './coordLocator.js';
import './expedienteModal.js';
import * as LayerPanel from './layerPanel.js';
import * as MapLegend from './mapLegend.js';
import OverviewMap from './overviewMap.js';
import { LayerManager } from './layerManager.js';
import * as AttributeTableUI from './attributeTableUI.js';
import * as LayerDialog from './layerDialog.js';
import * as Labels from './labels.js';
import * as LabelEngine from './labelEngine.js';
import * as AttributeEditor from './attributeEditor.js';
import Workspace from './workspace.js';
import { CRS_LABELS, CRS_WKT } from './crs.js';

// Exponer componentes en window
window.App = App;
window.MunicipalClient = MunicipalClient;
window.MunicipalValidator = MunicipalValidator;
window.Workspace = Workspace;
window.AttributeEditor = AttributeEditor;
window.LayerDialog = LayerDialog;
window.Labels = Labels;
window.LabelEngine = LabelEngine;
window.AttributeTableUI = AttributeTableUI;
window.LayerManager = LayerManager;

// Conectar métodos municipales en App para los botones del HTML
App.validateMunicipal = async function() {
  return await MunicipalClient.validateMunicipal();
};

App.generateMunicipalReport = async function() {
  return await MunicipalClient.generateMunicipalReport();
};

App.exportMunicipalDictamen = async function() {
  return await MunicipalClient.exportMunicipalDictamen();
};

App.exportDualDictamen = async function() {
  return await MunicipalClient.exportDualDictamen();
};

App.closeModal = function() {
  const modal = document.getElementById('validationModal');
  if (modal) modal.classList.add('hidden');
};

// Cargar muestra de fraccionamiento municipal demo (Ley 3966/2010)
App.loadSampleMunicipal = async function() {
  showToast('Cargando fraccionamiento demo municipal (Ley 3966)...', 'info');
  try {
    const resp = await fetch('/data/piribebuy/sample_fraccionamiento_municipal.geojson');
    if (!resp.ok) throw new Error('No se pudo cargar el archivo demo');
    const geojson = await resp.json();
    State.set('geojson', geojson);
    State.set('sourceGeoFileName', 'Fraccionamiento_Piribebuy_Demo.geojson');
    State.set('projectName', 'Fraccionamiento Piribebuy Centro');
    
    const titleEl = document.getElementById('active-project-name');
    if (titleEl) titleEl.textContent = 'Fraccionamiento Piribebuy Centro';
    
    if (window.MapEngine?.loadGeoJSON) {
      window.MapEngine.loadGeoJSON(geojson);
    }
    showToast('Fraccionamiento cargado. Ejecutando dictamen municipal...', 'success');
    await App.validateMunicipal();
  } catch (err) {
    showToast('Error cargando demo: ' + err.message, 'error');
  }
};

// LocalActions para las acciones de archivo y coordenadas del menú
const LocalActions = {
  openProjectFile: async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.geojson,.json,.shp,.kml,.zip,.csv';
    input.onchange = async (e) => {
      const f = e.target.files?.[0];
      if (!f) return;
      await window.App?.handleFiles?.([f], 'geo');
    };
    input.click();
  },
  saveAll: async () => {
    const fc = State.get('geojson');
    if (!fc) { showToast('No hay geometrías para guardar', 'warning'); return; }
    try {
      const blob = new Blob([JSON.stringify(fc, null, 2)], { type: 'application/geo+json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'expediente-municipal-fraccionamiento.geojson';
      a.click();
      URL.revokeObjectURL(a.href);
      showToast('Proyecto municipal exportado', 'success');
    } catch (err) { showToast('No se pudo guardar: ' + err.message, 'error'); }
  },
  renameProject: () => {
    const nuevo = prompt('Nuevo nombre del proyecto municipal:');
    if (!nuevo) return;
    State.set('projectName', nuevo);
    const titleEl = document.getElementById('active-project-name');
    if (titleEl) titleEl.textContent = nuevo;
    document.title = nuevo + ' · Municipal PY Pro';
    showToast('Proyecto renombrado', 'success');
  },
  deleteProject: () => {
    if (!confirm('¿Eliminar el proyecto actual? Esta acción no se puede deshacer.')) return;
    window.App?.clear?.();
    showToast('Proyecto eliminado', 'info');
  },
  copyCoordinates: () => {
    const c = State.get('cursorCoordinates') || State.get('lastCoordinates');
    const text = c ? `${c[1] ?? c.lat}, ${c[0] ?? c.lng}` : '';
    if (!text) { showToast('Acércate al mapa para tomar coordenadas', 'warning'); return; }
    navigator.clipboard?.writeText(text)
      .then(() => showToast('Coordenadas copiadas: ' + text, 'success'))
      .catch(() => showToast('No se pudo copiar', 'error'));
  },
  centerMapOnCoordinates: () => {
    const inputEl = document.getElementById('coord-search-input');
    if (inputEl) {
      inputEl.focus();
      inputEl.select();
      if (inputEl.value.trim()) {
        window.CoordLocator?.locateFromInput?.(inputEl.value.trim());
        return;
      }
    }
    const input = prompt('Ingresá coordenadas o enlace de Google Maps (DMS, Lat/Lng o UTM):');
    if (!input) return;
    window.CoordLocator?.fillAndLocate?.(input.trim());
  }
};
window.LocalActions = LocalActions;

// Helper para selector CRS de exportación
const CRS_LABEL = (c) => CRS_LABELS[c] || c;
function exportCrs() {
  const v = document.getElementById('piribebuy-export-crs')?.value || 'EPSG:32721';
  try { localStorage.setItem('snc_export_crs', v); } catch {}
  return v;
}
window.PiribebuyCrs = { exportCrs, CRS_LABEL, CRS_WKT };

// Sincronización de capa de proyecto importado
function syncProjectFileLayer(geojson) {
  const count = document.getElementById('layer-control-count');
  const features = Array.isArray(geojson?.features) ? geojson.features : [];
  if (!features.length) {
    if (LayerManager.has('g_project')) LayerManager.remove('g_project');
    if (count) count.textContent = '0';
    return;
  }
  if (!LayerManager.has('g_project')) {
    LayerManager.registerGroup({ id: 'g_project', title: 'Archivos cargados' });
  }
  const title = State.get('projectName') || 'Fraccionamiento municipal';
  const firstGeometryType = features.find(feature => feature?.geometry?.type)?.geometry.type || null;
  const node = LayerManager.registerLayer({
    id: 'project-import',
    title,
    parentId: 'g_project',
    sourceType: 'geojson',
    sourcePath: 'Expediente municipal',
    geometryType: firstGeometryType
  });
  node.title = title;
  node.featureCount = features.length;
  node.geometryType = firstGeometryType;
  node.properties = [...new Set(features.flatMap(feature => Object.keys(feature?.properties || {})))];
  if (count) count.textContent = node.visible ? '1' : '0';
  LayerPanel.render();
}

function whenMapReady() {
  return new Promise(resolve => {
    const t0 = performance.now();
    const tick = () => {
      if (window.MapEngine?.getMap?.()) return resolve(true);
      if (performance.now() - t0 > 15000) return resolve(false);
      setTimeout(tick, 100);
    };
    tick();
  });
}

// Inicializar iconos en el DOM
initButtonIcons(document.body);
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => initButtonIcons(document.body), { once: true });
}

// Inicializar motor y cliente municipal cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', async () => {
  initButtonIcons(document.body);
  try {
    await App.init();
    MunicipalClient.init();

    // Suscribir estado
    State.subscribe('geojson', syncProjectFileLayer);
    State.subscribe('clear', () => {
      syncProjectFileLayer(null);
      window.MapEngine?.clearProjectLayer?.();
    });

    // Esperar a que el mapa esté listo para montar widgets cartográficos
    await whenMapReady();

    // 1. Stack inferior izquierdo: Leyenda unificada + Mini-mapa de ubicación
    const stackHost = document.getElementById('map-bottom-left-stack') || document.getElementById('map-container') || document.getElementById('view-map');
    if (stackHost) {
      MapLegend.mount(stackHost, {
        getActiveLayers: () => window.MapEngine?.getActiveLayersInfo?.() || [],
        getMap: () => window.MapEngine?.getMap?.(),
        onZoomLayer: (id) => {
          if (window.MapEngine?.getPiribebuyFeatures?.(id)?.length) {
            window.MapEngine.zoomToPiribebuyLayer(id);
          } else {
            window.MapEngine?.focusWorkPolygon?.();
          }
        }
      });
      OverviewMap.mount(stackHost, window.MapEngine?.getMap?.());
    }

    // 2. Montar panel de capas en content-panel-host
    const host = document.getElementById('content-panel-host');
    if (host) {
      LayerPanel.mount(host, {
        onToggleLayer: async (id, visible) => {
          if (id === 'project-import') {
            const count = document.getElementById('layer-control-count');
            if (count) count.textContent = visible ? '1' : '0';
            if (visible) window.MapEngine?.loadGeoJSON?.(State.get('geojson'));
            else window.MapEngine?.clearProjectLayer?.();
          } else {
            await window.MapEngine?.togglePiribebuyLayer?.(id, visible);
          }
        },
        onZoomLayer: (id) => {
          if (id === 'project-import') window.MapEngine?.focusWorkPolygon?.();
          else window.MapEngine?.zoomToPiribebuyLayer?.(id);
        }
      });
    }

    // Sincronizar zoom con panel de capas
    const map = window.MapEngine?.getMap?.();
    if (map) {
      map.on('zoomend', () => LayerPanel.syncScaleFromMap(map));
      LayerPanel.syncScaleFromMap(map);
    }

  } catch (error) {
    console.error('[MunicipalApp] Error en inicialización:', error);
  } finally {
    const loadingEl = document.getElementById('loading');
    if (loadingEl) {
      loadingEl.style.opacity = '0';
      loadingEl.style.transition = 'opacity 0.25s ease';
      setTimeout(() => loadingEl.remove(), 250);
    }
    if (window.MapEngine?.getMap?.()) {
      setTimeout(() => window.MapEngine.getMap().invalidateSize(), 200);
    }
  }
});

// Listener para abrir tabla de atributos desde menús contextuales
window.addEventListener('snc:open-attribute-table', async (e) => {
  const layerId = e.detail?.layerId;
  if (!layerId) return;
  let features = window.MapEngine?.getPiribebuyFeatures?.(layerId) || [];
  if (!features.length && (layerId === 'parcelas' || layerId === 'project-import')) {
    features = window.State?.get?.('geojson')?.features || [];
  }
  if (!features.length) {
    showToast(`La capa "${layerId}" no tiene registros para mostrar`, 'warning');
    return;
  }
  AttributeTableUI.open({
    layerId,
    title: e.detail?.title || layerId,
    features,
    onFeatureSelect: (idx) => {
      const feat = features[idx];
      if (feat) window.MapEngine?.highlightFeature?.(feat);
    }
  });
});

export { App, MunicipalClient };
