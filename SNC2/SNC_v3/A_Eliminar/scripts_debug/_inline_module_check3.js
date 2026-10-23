  import { CRS_LABELS, CRS_WKT } from '/js/crs.js';
  import LayerManager from '/js/layerManager.js';
  import LayerPanel from '/js/layerPanel.js';
  import MapLegend from '/js/mapLegend.js';
  import * as AttributeTableUI from '/js/attributeTableUI.js';
  import { showToast } from '/js/utils.js';
  import * as LayerDialog from '/js/layerDialog.js';
  import * as Labels from '/js/labels.js';
  import * as LabelEngine from '/js/labelEngine.js';
  import * as AttributeEditor from '/js/attributeEditor.js';
  import Workspace from '/js/workspace.js';

  // ── Globales que el HTML invoca pero que nunca se expusieron ──────────
  // El markup llama a window.Workspace.switchTab(...) en las 6 pestañas;
  // workspace.js lo define y lo asigna él mismo, pero el módulo no se importaba
  // desde acá, así que la asignación nunca ocurría en este entry point.
  window.Workspace = Workspace;
  window.AttributeEditor = AttributeEditor;
  window.LayerDialog = LayerDialog;
  window.Labels = Labels;
  window.LabelEngine = LabelEngine;

  // ── LocalActions: acciones de proyecto referenciadas por el HTML ───────
  // (abrir, guardar, renombrar, eliminar proyecto; copiar/centrar coordenadas)
  // No existía en ningún módulo: se implementa acá contra la API real.
  (function buildLocalActions() {
    const g = (k) => window.State?.get?.(k);
    const s = (k, v) => window.State?.set?.(k, v);
    const toast = (m, t) => window.showToast?.(m, t);

    async function openProjectFile() {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.geojson,.json,.shp,.kml,.zip,.csv';
      input.onchange = async (e) => {
        const f = e.target.files?.[0];
        if (!f) return;
        await window.App?.handleFiles?.([f], 'geo');
      };
      input.click();
    }

    async function saveAll() {
      const fc = g('geojson');
      if (!fc) { toast('No hay geometrías para guardar', 'warning'); return; }
      try {
        const blob = new Blob([JSON.stringify(fc, null, 2)], { type: 'application/geo+json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'expediente-snc.geojson';
        a.click();
        URL.revokeObjectURL(a.href);
        toast('Proyecto exportado', 'success');
      } catch (err) { toast('No se pudo guardar: ' + err.message, 'error'); }
    }

    function renameProject() {
      const nuevo = prompt('Nuevo nombre del proyecto');
      if (!nuevo) return;
      s('projectName', nuevo);
      document.title = nuevo + ' · Catastro PY Pro';
      toast('Proyecto renombrado', 'success');
    }

    function deleteProject() {
      if (!confirm('¿Eliminar el proyecto actual? Esta acción no se puede deshacer.')) return;
      window.App?.clear?.();
      toast('Proyecto eliminado', 'info');
    }

    function copyCoordinates() {
      const c = g('cursorCoordinates') || g('lastCoordinates');
      const text = c ? `${c[1] ?? c.lat}, ${c[0] ?? c.lng}` : '';
      if (!text) { toast('Acércate al mapa para tomar coordenadas', 'warning'); return; }
      navigator.clipboard?.writeText(text)
        .then(() => toast('Coordenadas copiadas', 'success'))
        .catch(() => toast('No se pudo copiar', 'error'));
    }

    function centerMapOnCoordinates() {
      const input = prompt('Ingresá las coordenadas (lat, lon):');
      if (!input) return;
      const parts = input.split(',').map(x => parseFloat(x.trim()));
      if (parts.length !== 2 || parts.some(isNaN)) { toast('Formato inválido', 'error'); return; }
      window.MapEngine?.flyTo?.([parts[0], parts[1]], 18);
    }

    window.LocalActions = { openProjectFile, saveAll, renameProject, deleteProject, copyCoordinates, centerMapOnCoordinates };
  })();

  const CRS_LABEL = (c) => CRS_LABELS[c] || c;

  // Guarda la proyeccion de exportacion elegida para que la use el exportador.
  function exportCrs() {
    const v = document.getElementById('piribebuy-export-crs')?.value || 'EPSG:32721';
    try { localStorage.setItem('snc_export_crs', v); } catch {}
    return v;
  }
  window.PiribebuyCrs = { exportCrs, CRS_LABEL, CRS_WKT };

  // Restaurar la proyeccion de exportacion guardada.
  (function restoreExportCrs(){
    try {
      const saved = localStorage.getItem('snc_export_crs');
      const sel = document.getElementById('piribebuy-export-crs');
      if (saved && sel && [...sel.options].some(o => o.value === saved)) sel.value = saved;
    } catch {}
  })();

  document.getElementById('piribebuy-export-crs')?.addEventListener('change', () => {
    const v = exportCrs();
    window.showToast?.(`Proyección de exportación: ${CRS_LABEL(v)}`, 'info');
  });

  /**
   * Renderiza el informe CRS. Solo muestra capas que requieren ATENCIÓN
   * (reproyectadas o no identificadas). Las correctas ya se ven como badge
   * en el árbol, así que listarlas acá sería duplicar información y ocupar
   * alto de pantalla sin aportar nada.
   */
  function renderCrsReport() {
    const box = document.getElementById('piribebuyCrsReport');
    if (!box) return;
    const list = (window.MapEngine?.listPiribebuyCrs?.() || [])
      .filter(i => i.corrected || !i.source || i.confidence < 0.9);
    if (!list.length) { box.innerHTML = ''; box.hidden = true; return; }
    box.hidden = false;
    box.innerHTML = `<div class="text-[8px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">Proyección — requiere atención</div>` +
      list.map(item => {
        const conf = Math.round((item.confidence || 0) * 100);
        const color = item.corrected ? 'text-emerald-400' : 'text-amber-400';
        const icon = item.corrected ? 'fa-wand-magic-sparkles' : 'fa-triangle-exclamation';
        const src = item.source ? CRS_LABEL(item.source) : 'no identificada';
        return `<div class="flex items-start gap-1.5 rounded border border-slate-800 bg-slate-950/60 px-1.5 py-1">
          <i class="fas ${icon} ${color} text-[9px] mt-0.5"></i>
          <div class="min-w-0 flex-1">
            <div class="text-[9px] font-bold text-slate-300 truncate">${item.name}</div>
            <div class="text-[8px] ${color}">${src}${item.corrected ? ' · reproyectada' : ''} <span class="text-slate-600">(${conf}%)</span></div>
          </div>
        </div>`;
      }).join('');
  }
  window.PiribebuyCrs.render = renderCrsReport;

  // Refrescar el informe cuando cambie la visibilidad de una capa.
  window.addEventListener('snc:layers-changed', () => {
    setTimeout(renderCrsReport, 100);
  });
  document.getElementById('piribebuy-crs-refresh')?.addEventListener('click', () => {
    renderCrsReport();
    window.showToast?.('Diagnóstico de proyección actualizado', 'info');
  });

  // Informe inicial
  setTimeout(renderCrsReport, 2500);

  // ─── Alternar visibilidad de capas de referencia ────────────────────────────
  function toggleLayersSection() {
    const section = document.getElementById('reference-layers-section');
    const btn = document.getElementById('layers-toggle-btn');
    if (!section) return;
    const isHidden = section.classList.contains('hidden');
    if (isHidden) {
      section.classList.remove('hidden');
      btn.innerHTML = '<i class="fas fa-chevron-up mr-1"></i>';
      btn.title = 'Ocultar capas de referencia';
    } else {
      section.classList.add('hidden');
      btn.innerHTML = '<i class="fas fa-chevron-down mr-1"></i>';
      btn.title = 'Mostrar capas de referencia';
    }
  }

  // ─── Tabla de contenido (LayerManager + LayerPanel) ─────────────────────────
  // Registra las capas de Piribebuy y monta el panel tipo ArcGIS.
  const PIRI_DEFS = {
    barrios:        { title: 'Barrios',               group: 'g_base', geometryType: 'Polygon' },
    vias:           { title: 'Vías generales',        group: 'g_base', geometryType: 'LineString' },
    hidro:          { title: 'Hidrografía',           group: 'g_base', geometryType: 'LineString' },
    vertedero:      { title: 'Vertedero',             group: 'g_vert', geometryType: 'Polygon' },
    centro:         { title: 'Centro',                group: 'g_vert', geometryType: 'Point' },
    vertedero_500:  { title: 'Buffer vertedero 500 m', group: 'g_vert', geometryType: 'Polygon' },
    vertedero_1000: { title: 'Buffer vertedero 1000 m',group: 'g_vert', geometryType: 'Polygon' },
    vuelo_casco:    { title: 'Vuelo casco histórico', group: 'g_casco', geometryType: 'Polygon' },
    casco_historico:{ title: 'Casco Histórico',       group: 'g_casco', geometryType: 'Polygon' }
  };

  function buildLayerTree() {
    LayerManager.reset();
    // Capas base (para el modo "Origen" y para que la leyenda las excluya).
    LayerManager.registerLayer({ id: 'basemap', title: 'Mapa base', sourceType: 'basemap', visible: true });
    // El mapa base SÍ figura en la leyenda unificada del mapa (antes se
    // ocultaba porque la leyenda vivía en el panel de contenido y solo
    // listaba capas temáticas). Se puede quitar con la X o desde Propiedades.
    LayerManager.get('basemap').legend.hideInLegend = false;

    LayerManager.registerGroup({ id: 'g_piri', title: 'Piribebuy' });
    LayerManager.registerGroup({ id: 'g_base', title: 'Base territorial', parentId: 'g_piri' });
    LayerManager.registerGroup({ id: 'g_vert', title: 'Vertedero y entorno', parentId: 'g_piri' });
    LayerManager.registerGroup({ id: 'g_casco', title: 'Casco histórico', parentId: 'g_piri' });

    const STYLES = window.MapEngine?._piribebuyStyles || null;
    for (const [id, def] of Object.entries(PIRI_DEFS)) {
      LayerManager.registerLayer({
        id,
        title: def.title,
        parentId: def.group,
        geometryType: def.geometryType,
        sourcePath: 'data/piribebuy',
        sourceType: 'geojson',
        style: STYLES?.[id] || null
      });
    }
    LayerManager.registerLayer({
      id: 'snc-ref', title: 'Referencia catastral SNC',
      sourceType: 'servicio', sourcePath: 'catastro.gov.py',
      geometryType: 'Polygon'
    });
    LayerManager.get('snc-ref').legend.hideInLegend = true;
    // Por defecto la referencia NO se muestra: solo aparece si el usuario la
    // activa. Y no figura en la leyenda salvo que se lo indique.
    LayerManager.get('snc-ref').visible = false;
    LayerManager.get('snc-ref').sncRef = {
        visualEnabled: false, remotaEnabled: false,
        remotaOpacity: 0.85, remotaInLegend: false
    };
    return true;
  }

  function mountContentPanel() {
    const host = document.getElementById('content-panel-host');
    if (!host) return false;
    return LayerPanel.mount(host, {
      onToggleLayer: async (id, visible) => {
        // Solo las capas de Piribebuy tienen cargador propio.
        if (PIRI_DEFS[id]) {
          await window.MapEngine?.togglePiribebuyLayer(id, visible);
        } else if (id === 'snc-ref') {
          // El checkbox del arbol maneja la capa VISUAL (opcional). La capa
          // REMOTA se controla aparte, desde Propiedades.
          await window.MapEngine?.toggleSNCReferenceLayer(visible);
        }
      },
      onZoomLayer: (id) => {
        if (PIRI_DEFS[id]) window.MapEngine?.zoomToPiribebuyLayer(id);
        else window.MapEngine?.focusWorkPolygon();
      },
      // Etiquetado por atributo: al cambiar la config en Propiedades, se
      // redibujan las etiquetas de la capa sobre el mapa.
      onLabelChange: (id, config) => {
        if (PIRI_DEFS[id]) {
          const n = window.MapEngine?.setLayerLabelConfig?.(id, config) || 0;
          if (config?.enabled && !n && !(config.field || config.expression)) {
            showToast('Elegí una columna para mostrar en la etiqueta', 'warning');
          }
        }
      }
    });
  }

  // Sincroniza la escala del visor para que los rangos minScale/maxScale funcionen.
  function bindScaleSync() {
    const map = window.MapEngine?.getMap?.();
    if (!map) return;
    const sync = () => {
      LayerPanel.syncScaleFromMap(map);
      // Las etiquetas pueden tener su propio rango de escala: al cambiar el
      // zoom hay que reevaluar si corresponde mostrarlas.
      if ((LayerManager.labelsActiveLayers?.()?.length || 0) > 0) {
        window.MapEngine?.refreshAllLabels?.(LayerManager.currentScale ?? null);
      }
    };
    map.on('zoomend', sync);
    sync();
  }

  // Reconstruye el panel cuando se activa/desactiva una capa de Piribebuy,
  // para que el árbol refleje el estado real.
  window.addEventListener('snc:layers-changed', () => {
    const map = window.MapEngine?.getMap?.();
    if (map) LayerPanel.syncScaleFromMap(map);
    LayerPanel.render();
  });

  /**
   * Carga en el mapa las capas que el modelo marca como visibles.
   *
   * Bug que resuelve: los checkboxes del panel nacen marcados (el modelo
   * registra `visible: true`), pero nadie dibujaba esas capas al arrancar.
   * Resultado: el panel mostraba todo activo y la leyenda solo el mapa base,
   * porque `getActiveLayersInfo()` lee lo que el MAPA tiene dibujado.
   *
   * Rendimiento: las capas se cargan EN PARALELO (son ~4.5 MB de GeoJSON y
   * cada una hace su propio fetch) y con los avisos silenciados; el panel y
   * la leyenda se refrescan una sola vez al terminar. En serie tardaba
   * decenas de segundos y mostraba 9 avisos emergentes.
   */
  async function loadVisibleLayers() {
    const visibles = Object.keys(PIRI_DEFS).filter(id => LayerManager.get(id)?.visible);
    const t0 = performance.now();
    const resultados = await Promise.all(visibles.map(async id => {
      try {
        await window.MapEngine?.togglePiribebuyLayer?.(id, true, { silent: true, deferRefresh: true });
        return { id, ok: true };
      } catch (e) {
        console.warn(`No se pudo cargar la capa ${id}`, e);
        return { id, ok: false, error: e.message };
      }
    }));
    const fallidas = resultados.filter(r => !r.ok);
    if (fallidas.length) {
      console.warn('Capas que no cargaron:', fallidas.map(f => `${f.id}: ${f.error}`).join(' | '));
    }

    // La referencia SNC es un servicio externo: no debe bloquear el arranque.
    if (LayerManager.get('snc-ref')?.visible) {
      Promise.resolve(window.MapEngine?.toggleSNCReferenceLayer?.(true)).catch(() => {});
    }

    // Un solo refresco, ya con todas las capas dibujadas.
    LayerPanel.render();
    window.MapEngine?.refreshActiveLayersUI?.();
    console.info(`Capas visibles cargadas en ${Math.round(performance.now() - t0)} ms`);

    // Actualizar panel de control de capas
  function updateLayerControlPanel() {
    const layerControlList = document.getElementById('layer-control-list');
    const layerControlCount = document.getElementById('layer-control-count');
    if (!layerControlList || !layerControlCount) return;
    
    // Obtener todas las capas registradas en LayerManager
    const allLayers = [];
    const visibleCount = [];
    
    // Agrupar por grupos definidos en PIRI_DEFS
    const groups = {
      g_piri: { title: 'Piribebuy', layers: [] },
      g_base: { title: 'Base territorial', layers: [] },
      g_vert: { title: 'Vertedero y entorno', layers: [] },
      g_casco: { title: 'Casco histórico', layers: [] }
    };
    
    // Iterar sobre PIRI_DEFS para obtener las capas y sus grupos
    const piriDefs = PIRI_DEFS || {};
    for (const [id, def] of Object.entries(piriDefs)) {
      const layerNode = LayerManager.get(id);
      if (!layerNode) continue;
      
      const title = layerNode.title || id;
      const isVisible = layerNode.visible !== false; // visible por defecto es true
      const group = def.group || 'g_piri'; // Grupo por defecto
      
      // Asegurar que el grupo existe
      if (!groups[group]) {
        groups[group] = { title: group, layers: [] };
      }
      
      groups[group].layers.push({
        id,
        title,
        visible: isVisible
      });
    }
    
    // También incluir la referencia SNC si está registrada
    const sncRefNode = LayerManager.get('snc-ref');
    if (sncRefNode) {
      groups['g_base'] = groups['g_base'] || { title: 'Base territorial', layers: [] };
      groups['g_base'].layers.push({
        id: 'snc-ref',
        title: 'Referencia catastral SNC',
        visible: sncRefNode.visible !== false
      });
    }
    
    // Construir el HTML del panel
    let html = '';
    let totalVisible = 0;
    
    for (const [groupId, group] of Object.entries(groups)) {
      if (group.layers.length === 0) continue;
      
      html += `<div class="bg-slate-900/50 p-3 rounded-xl border border-slate-800 mb-3">
                  <div class="flex items-center justify-between mb-2">
                    <span class="text-[9px] font-bold text-slate-400 uppercase tracking-wider">${group.title}</span>
                    <span class="text-[8px] text-slate-500">${group.layers.length} capas</span>
                  </div>`;
      
      group.layers.forEach((layer, index) => {
        const checked = layer.visible ? 'checked' : '';
        const layerId = layer.id;
        const layerTitle = layer.title;
        
        html += `<label class="flex items-start gap-2 cursor-pointer select-none">
                    <input type="checkbox" ${checked} 
                           class="mt-0.5 accent-blue-500 layer-checkbox" 
                           data-layer-id="${layerId}"
                           aria-label="Mostrar/ocultar ${layerTitle}">
                    <div class="flex-1 min-w-0">
                      <div class="text-[9px] font-bold text-slate-300 truncate">${layerTitle}</div>
                      <div class="text-[8px] text-slate-400">${layerId}</div>
                    </div>
                    <span class="text-[8px] text-slate-500">${index + 1}</span>
                  </label>`;
        
        if (layer.visible) totalVisible++;
      });
      
      html += `</div>`;
    }
    
    layerControlList.innerHTML = html;
    layerControlCount.textContent = totalVisible;
    
    // Añadir event listeners a los checkboxs
    document.querySelectorAll('.layer-checkbox').forEach(checkbox => {
      checkbox.addEventListener('change', function() {
        const layerId = this.getAttribute('data-layer-id');
        toggleLayerVisibility(layerId, this.checked);
      });
    });
  }
  
  // Función para alternar visibilidad de una capa
  function toggleLayerVisibility(layerId, visible) {
    // Evitar toggles múltiples simultáneos
    const layerNode = LayerManager.get(layerId);
    if (!layerNode) return;
    
    // Actualizar visibilidad en LayerManager
    layerNode.visible = visible;
    
    // Si es la referencia SNC, también actualizar el motor del mapa
    if (layerId === 'snc-ref') {
      window.MapEngine?.toggleSNCReferenceLayer?.(visible);
    } else {
      // Para capas de Piribebuy, recargar la capa
      window.MapEngine?.togglePiribebuyLayer?.(layerId, visible, { silent: true });
    }
    
    // Actualizar panel y leyenda
    updateLayerControlPanel();
    LayerPanel.render();
    window.MapEngine?.refreshActiveLayersUI?.();
  }

  /**
   * Espera a que el mapa esté realmente listo, en vez de dormir un tiempo fijo.
   *
   * Antes se usaba `setTimeout(..., 2600)`: si el mapa tardaba más, el panel
   * se montaba sin mapa y las capas no cargaban; si tardaba menos, se perdían
   * 2.6 s de arranque. Acá se sondea cada 100 ms y se arranca en cuanto hay
   * mapa (con un tope de 15 s para no colgarse si algo falla).
   */
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

  whenMapReady().then(listo => {
    if (!listo) {
      console.warn('El mapa no quedó listo en 15 s; se monta el panel igual.');
    }
    buildLayerTree();
    if (mountContentPanel()) {
      bindScaleSync();
      // Reflejar el estado inicial real de las capas visibles.
      LayerPanel.render();
    }
    // Leyenda unificada DENTRO del mapa (abajo a la izquierda): fusiona el
    // antiguo "📍 Capas Activas" con la sección "Leyenda" del panel.
    MapLegend.mount(document.getElementById('view-map'), {
      getActiveLayers: () => window.MapEngine?.getActiveLayersInfo?.() || [],
      onZoomLayer: (id) => {
        if (window.MapEngine?.getPiribebuyFeatures?.(id)?.length) {
          window.MapEngine.zoomToPiribebuyLayer(id);
        } else {
          window.MapEngine?.focusWorkPolygon?.();
        }
      }
    });
    // Dibujar las capas que el panel muestra como activas.
    loadVisibleLayers();
  });

  // ─── Tabla de atributos (spec §3) ───────────────────────────────────────────
  // Se abre desde el menú contextual de una capa ("Abrir tabla de atributos").
  // El evento lo emite js/layerPanel.js.
  window.addEventListener('snc:open-attribute-table', async (e) => {
    const layerId = e.detail?.layerId;
    if (!layerId) return;

    // Las capas de Piribebuy se leen del mapa; otras del estado del proyecto.
    let features = window.MapEngine?.getPiribebuyFeatures?.(layerId) || [];
    if (!features.length && layerId === 'parcelas') {
      features = window.State?.get?.('geojson')?.features || [];
    }
    if (!features.length) {
      // Si la capa no está activa, se activa y se reintenta una vez.
      await window.MapEngine?.togglePiribebuyLayer?.(layerId, true);
      await new Promise(r => setTimeout(r, 900));
      features = window.MapEngine?.getPiribebuyFeatures?.(layerId) || [];
    }
    if (!features.length) {
      showToast(`La capa "${layerId}" no tiene registros para mostrar`, 'warning');
      return;
    }

    const node = LayerManager.get(layerId);
    const info = window.MapEngine?.getPiribebuyCrsInfo?.(layerId);
    const cfg = node?.tableConfig || {};

    AttributeTableUI.open({
      layerId,
      features,
      layerNode: node,
      tableConfig: cfg,
      hooks: {
        getMap: () => window.MapEngine?.getMap?.(),
        getLayerNode: () => LayerManager.get(AttributeTableUI.AttributeTable.layerId),
        onSelectionChanged: () => { /* el resaltado lo maneja la UI */ },
        onSortChanged: (field, order) => {
          // Persistir el orden en la config de la capa.
          if (node) LayerManager.setTableConfig(layerId, { sortField: field, sortOrder: order || 'ASC' });
        },
        onFilterChanged: () => {},
        onPageSizeChanged: (n) => {
          // Persistir las filas por página en la config de la capa.
          if (node) LayerManager.setTableConfig(layerId, { pageSize: n });
        },
        onColumnsChanged: (hidden, order) => {
          if (node) LayerManager.setTableConfig(layerId, { hiddenColumns: hidden, columnOrder: order });
        },
        onOpenRelated: (rowIndex, field) => {
          // Relate 1:N: se buscan los hijos por coincidencia del campo.
          const parentFeature = AttributeTableUI.AttributeTable.features[rowIndex];
          const key = parentFeature?.properties?.[field];
          // Buscar la capa hija entre las cargadas, por nombre del campo.
          const childId = field.toLowerCase().includes('detalle') ? 'casco_hist'
                        : field.toLowerCase().includes('vertedero') ? 'vertedero_integrado'
                        : null;
          if (!childId) {
            showToast('Esta capa no tiene registros relacionados configurados', 'info');
            return;
          }
          const childFeatures = window.MapEngine?.getPiribebuyFeatures?.(childId) || [];
          if (!childFeatures.length) {
            showToast('Los registros relacionados no están disponibles', 'warning');
            return;
          }
          AttributeTableUI.openRelated({
            childLayerId: childId,
            childFeatures,
            parentRowIndex: rowIndex,
            field,
            label: LayerManager.get(childId)?.title || childId
          });
        },
        onRelatedClose: () => { showToast('Volvió a la tabla principal', 'info'); }
      }
    });
    showToast(`Tabla de atributos: ${features.length} registro(s)`, 'info');
  });
  </script>

  <!-- DIAGNÓSTICO TEMPORAL: muestra cualquier error JS en pantalla -->
  <script>