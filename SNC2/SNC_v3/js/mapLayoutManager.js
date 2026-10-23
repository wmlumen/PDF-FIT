/**
 * mapLayoutManager.js — Gestor Maestro de Disposición de Widgets y Controles de Mapa.
 * 
 * Permite al Super Admin y a cada usuario configurar la posición y visibilidad
 * de todos los componentes del visor cartográfico de manera independiente o agrupada:
 * - Mini-mapa de ubicación (overviewMap)
 * - Leyenda de capas (mapLegend)
 * - Icono Hamburguesa de mapas base (basemapMenu)
 * - Herramientas de medición y edición CAD (mapTools)
 * - Controles de zoom, escala, vuelo y centrado
 *
 * Soporta configuración por portal (profesional, municipal, notarial, ciudadano, admin)
 * y persistencia en localStorage con propagación reactiva en tiempo real.
 */

(function initMapLayoutManagerScope() {
  'use strict';

  // Catálogo oficial de componentes de mapa
  const WIDGET_CATALOG = {
    minimap: {
      id: 'minimap',
      name: 'Mini-Mapa de Ubicación',
      icon: 'fa-map-location-dot',
      description: 'Vista panorámica nacional con recuadro BBOX en tiempo real',
      defaultPosition: 'bottom-left',
      defaultOrder: 1,
      defaultVisible: true,
      selector: '#map-overview, .map-overview-card'
    },
    legend: {
      id: 'legend',
      name: 'Leyenda y Capas Activas',
      icon: 'fa-layer-group',
      description: 'Simbología temática, colores y conteo de geometrías',
      defaultPosition: 'bottom-left',
      defaultOrder: 2,
      defaultVisible: true,
      selector: '#map-legend'
    },
    basemap_burger: {
      id: 'basemap_burger',
      name: 'Hamburguesa de Mapa Base',
      icon: 'fa-bars',
      description: 'Selector flotante de capas OSM, Satélite, Topo y Catastro SNC',
      defaultPosition: 'top-right',
      defaultOrder: 1,
      defaultVisible: true,
      selector: '#map-base-selector'
    },
    measure_tools: {
      id: 'measure_tools',
      name: 'Herramientas de Medición y CAD',
      icon: 'fa-ruler-combined',
      description: 'Botonera vertical de medición, corte, edición de vértices y Osnap',
      defaultPosition: 'right-center',
      defaultOrder: 1,
      defaultVisible: true,
      selector: '#map-tools'
    },
    zoom_controls: {
      id: 'zoom_controls',
      name: 'Botones de Zoom (+ / -)',
      icon: 'fa-magnifying-glass-plus',
      description: 'Controles nativos de acercamiento y alejamiento Leaflet',
      defaultPosition: 'top-left',
      defaultOrder: 1,
      defaultVisible: true,
      selector: '.leaflet-control-zoom'
    },
    flight_asuncion: {
      id: 'flight_asuncion',
      name: 'Vuelo / Vista General',
      icon: 'fa-plane-arrival',
      description: 'Botón de navegación rápida a la vista por defecto',
      defaultPosition: 'top-left',
      defaultOrder: 2,
      defaultVisible: true,
      selector: '.home-button'
    },
    focus_parcel: {
      id: 'focus_parcel',
      name: 'Centrar Polígono de Trabajo',
      icon: 'fa-crosshairs',
      description: 'Ajuste de encuadre automático a las parcelas activas',
      defaultPosition: 'top-left',
      defaultOrder: 3,
      defaultVisible: true,
      selector: '.focus-parcel-control'
    },
    scale_control: {
      id: 'scale_control',
      name: 'Barra de Escala Métrica',
      icon: 'fa-ruler-horizontal',
      description: 'Escala gráfica en metros/kilómetros en tiempo real',
      defaultPosition: 'bottom-left',
      defaultOrder: 3,
      defaultVisible: true,
      selector: '.leaflet-control-scale'
    }
  };

  const POSITIONS = [
    { id: 'top-left', label: 'Izquierda Arriba', class: 'pos-top-left' },
    { id: 'top-right', label: 'Derecha Arriba', class: 'pos-top-right' },
    { id: 'left-center', label: 'Centro Izquierda', class: 'pos-left-center' },
    { id: 'right-center', label: 'Centro Derecha', class: 'pos-right-center' },
    { id: 'bottom-left', label: 'Izquierda Abajo', class: 'pos-bottom-left' },
    { id: 'bottom-right', label: 'Derecha Abajo', class: 'pos-bottom-right' }
  ];

  const PORTALS = [
    { id: 'profesional', name: 'Mesa Técnica Profesional', path: 'index.html', icon: 'fa-compass-drafting' },
    { id: 'municipal',   name: 'Geoportal Municipal',       path: 'municipal',  icon: 'fa-landmark' },
    { id: 'notarial',    name: 'Portal Notarial',           path: 'notarial',   icon: 'fa-file-signature' },
    { id: 'ciudadano',   name: 'Portal Ciudadano Pro',      path: 'ciudadano',  icon: 'fa-users' },
    { id: 'admin',       name: 'Super Admin GIS',           path: 'admin',      icon: 'fa-shield-halved' }
  ];

  function detectCurrentPortal() {
    const p = location.pathname.toLowerCase();
    if (p.includes('/municipal')) return 'municipal';
    if (p.includes('/notarial')) return 'notarial';
    if (p.includes('/ciudadano')) return 'ciudadano';
    if (p.includes('/admin') || p.includes('/superadmin')) return 'admin';
    return 'profesional';
  }

  function getDefaultLayout() {
    const layout = {};
    Object.values(WIDGET_CATALOG).forEach(w => {
      layout[w.id] = {
        id: w.id,
        visible: w.defaultVisible,
        position: w.defaultPosition,
        order: w.defaultOrder
      };
    });
    return layout;
  }

  function getLayout(portalId) {
    const pid = portalId || detectCurrentPortal();
    try {
      const saved = localStorage.getItem('snc_map_layout_' + pid);
      if (saved) {
        const parsed = JSON.parse(saved);
        return Object.assign(getDefaultLayout(), parsed);
      }
      // Verificar si hay configuración global compartida
      const globalSaved = localStorage.getItem('snc_map_layout_global');
      if (globalSaved) {
        return Object.assign(getDefaultLayout(), JSON.parse(globalSaved));
      }
    } catch (e) {
      console.warn('[MapLayoutManager] Error leyendo layout:', e);
    }
    return getDefaultLayout();
  }

  function saveLayout(portalId, layoutConfig, applyNow = true) {
    const pid = portalId || detectCurrentPortal();
    try {
      localStorage.setItem('snc_map_layout_' + pid, JSON.stringify(layoutConfig));
      if (applyNow && pid === detectCurrentPortal()) {
        applyLayout(pid);
      }
      window.dispatchEvent(new CustomEvent('snc:map-layout-updated', { detail: { portal: pid, layout: layoutConfig } }));
      return true;
    } catch (e) {
      console.error('[MapLayoutManager] Error guardando layout:', e);
      return false;
    }
  }

  function resetLayout(portalId) {
    const pid = portalId || detectCurrentPortal();
    try {
      localStorage.removeItem('snc_map_layout_' + pid);
      applyLayout(pid);
      window.dispatchEvent(new CustomEvent('snc:map-layout-updated', { detail: { portal: pid, layout: getDefaultLayout() } }));
      return true;
    } catch (e) {
      return false;
    }
  }

  function applyLayout(portalId) {
    const pid = portalId || detectCurrentPortal();
    const layout = getLayout(pid);

    // Asegurar estilos CSS dinámicos de cuadrantes en el documento
    ensureLayoutStyles();

    Object.entries(layout).forEach(([widgetId, cfg]) => {
      const meta = WIDGET_CATALOG[widgetId];
      if (!meta) return;

      const elements = document.querySelectorAll(meta.selector);
      elements.forEach(el => {
        // 1. Control de Visibilidad
        if (!cfg.visible) {
          el.classList.add('map-widget-hidden');
          el.style.display = 'none';
          return;
        } else {
          el.classList.remove('map-widget-hidden');
          el.style.display = '';
        }

        // 2. Control de Posición Dinámica
        POSITIONS.forEach(pos => {
          el.classList.remove('map-pos-' + pos.id);
        });
        el.classList.add('map-pos-' + cfg.position);

        // Si es contenedor de mapa flotante, reubicarlo limpiamente con estilos inline prioritarios
        applyPositionStyles(el, cfg.position, cfg.order);
      });
    });

    // Caso especial: Mini-mapa y Leyenda en bottom-left
    // Mantener la pila ordenada si ambos comparten cuadrante
    syncStackedWidgets(layout);
  }

  function applyPositionStyles(el, position, order) {
    // Si el elemento pertenece a la pila izquierda de Leaflet nativo, no forzar absolute destructivo
    if (el.classList.contains('leaflet-control') && el.id !== 'map-tools') {
      return;
    }

    el.style.position = 'absolute';
    el.style.zIndex = '1000';

    switch (position) {
      case 'top-left':
        el.style.top = '12px';
        el.style.left = '12px';
        el.style.bottom = 'auto';
        el.style.right = 'auto';
        el.style.transform = 'none';
        break;
      case 'top-right':
        el.style.top = '12px';
        el.style.right = '12px';
        el.style.bottom = 'auto';
        el.style.left = 'auto';
        el.style.transform = 'none';
        break;
      case 'left-center':
        el.style.left = '12px';
        el.style.top = '50%';
        el.style.transform = 'translateY(-50%)';
        el.style.bottom = 'auto';
        el.style.right = 'auto';
        break;
      case 'right-center':
        el.style.right = '12px';
        el.style.top = '50%';
        el.style.transform = 'translateY(-50%)';
        el.style.bottom = 'auto';
        el.style.left = 'auto';
        break;
      case 'bottom-left':
        el.style.bottom = '12px';
        el.style.left = '12px';
        el.style.top = 'auto';
        el.style.right = 'auto';
        el.style.transform = 'none';
        break;
      case 'bottom-right':
        el.style.bottom = '12px';
        el.style.right = '12px';
        el.style.top = 'auto';
        el.style.left = 'auto';
        el.style.transform = 'none';
        break;
    }
  }

  function syncStackedWidgets(layout) {
    const stack = document.getElementById('map-bottom-left-stack');
    if (!stack) return;

    const miniCfg = layout.minimap || {};
    const legendCfg = layout.legend || {};

    // Si ambos están en bottom-left, asegurar que minimap esté arriba de leyenda
    if (miniCfg.position === 'bottom-left' && legendCfg.position === 'bottom-left') {
      stack.style.display = 'flex';
      stack.style.flexDirection = 'column';
      stack.style.left = '10px';
      stack.style.bottom = '10px';
      stack.style.right = 'auto';
      stack.style.top = 'auto';

      const miniEl = document.getElementById('map-overview');
      const legEl = document.getElementById('map-legend');
      if (miniEl && legEl && miniEl.parentElement === stack && legEl.parentElement === stack) {
        stack.insertBefore(legEl, miniEl); // Leyenda encima; mini mapa debajo
      }
    }
  }

  function ensureLayoutStyles() {
    if (document.getElementById('map-layout-manager-styles')) return;
    const style = document.createElement('style');
    style.id = 'map-layout-manager-styles';
    style.textContent = `
      .map-widget-hidden { display: none !important; }
      .map-pos-top-left { top: 12px !important; left: 12px !important; right: auto !important; bottom: auto !important; }
      .map-pos-top-right { top: 12px !important; right: 12px !important; left: auto !important; bottom: auto !important; }
      .map-pos-left-center { top: 50% !important; left: 12px !important; right: auto !important; bottom: auto !important; transform: translateY(-50%) !important; }
      .map-pos-right-center { top: 50% !important; right: 12px !important; left: auto !important; bottom: auto !important; transform: translateY(-50%) !important; }
      .map-pos-bottom-left { bottom: 12px !important; left: 12px !important; right: auto !important; top: auto !important; }
      .map-pos-bottom-right { bottom: 12px !important; right: 12px !important; left: auto !important; top: auto !important; }
    `;
    document.head.appendChild(style);
  }

  // API pública universal
  window.MapLayoutManager = {
    catalog: WIDGET_CATALOG,
    positions: POSITIONS,
    portals: PORTALS,
    detectPortal: detectCurrentPortal,
    getDefaultLayout: getDefaultLayout,
    getLayout: getLayout,
    saveLayout: saveLayout,
    resetLayout: resetLayout,
    applyLayout: applyLayout,
    init: function () {
      applyLayout();
    }
  };

  // Inicialización automática al cargar el DOM
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => applyLayout());
  } else {
    setTimeout(() => applyLayout(), 100);
  }
})();
