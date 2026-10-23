/**
 * basemapMenu.js — Selector de mapa base tipo hamburguesa (flotante derecha-arriba).
 * Maneja el toggle del menú y el estado activo en TODAS las páginas con mapa.
 *
 * Requisitos en el HTML:
 *   <div id="map-base-selector" class="map-selector-box absolute right-3 top-3 z-[1000]">
 *     <button id="map-base-menu-toggle" class="map-selector-btn map-base-menu-toggle">☰</button>
 *     <div id="map-base-menu" class="map-base-menu" hidden>
 *       <button onclick="window.MapEngine?.setBaseLayer('osm')" class="map-selector-btn active" data-layer="osm">OSM</button>
 *       ...
 *     </div>
 *   </div>
 *
 * Este script se auto-inicializa al cargar. No requiere export/import.
 */
(function initBasemapMenu() {
  'use strict';

  function setup() {
    const toggle = document.getElementById('map-base-menu-toggle');
    const menu = document.getElementById('map-base-menu');
    if (!toggle || !menu) return; // la página no tiene el componente

    // --- Toggle abrir/cerrar ---
    toggle.addEventListener('click', function (e) {
      e.stopPropagation();
      const abierto = !menu.hidden;
      menu.hidden = abierto;
      toggle.setAttribute('aria-expanded', String(!abierto));
    });

    // --- Cerrar al hacer clic fuera ---
    document.addEventListener('click', function (e) {
      if (menu.hidden) return;
      const box = document.getElementById('map-base-selector');
      if (box && !box.contains(e.target)) {
        menu.hidden = true;
        toggle.setAttribute('aria-expanded', 'false');
      }
    });

    // --- Cerrar con Escape ---
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !menu.hidden) {
        menu.hidden = true;
        toggle.setAttribute('aria-expanded', 'false');
        toggle.focus();
      }
    });

    // --- Sincronizar estado activo al seleccionar una capa ---
    menu.querySelectorAll('[data-layer]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        // Quitar active de todos
        menu.querySelectorAll('[data-layer]').forEach(function (b) {
          b.classList.remove('active');
          b.setAttribute('aria-checked', 'false');
        });
        // Marcar el seleccionado
        btn.classList.add('active');
        btn.setAttribute('aria-checked', 'true');
        // Cerrar el menú
        menu.hidden = true;
        toggle.setAttribute('aria-expanded', 'false');
      });
    });

    // --- Restaurar última capa base elegida (por página) ---
    try {
      const page = location.pathname.split('/').pop() || 'index.html';
      const guardada = localStorage.getItem('snc_basemap_' + page);
      if (guardada && window.MapEngine?.setBaseLayer) {
        window.MapEngine.setBaseLayer(guardada);
        menu.querySelectorAll('[data-layer]').forEach(function (b) {
          const activo = b.dataset.layer === guardada;
          b.classList.toggle('active', activo);
          b.setAttribute('aria-checked', String(activo));
        });
      }
    } catch (e) { /* localStorage no disponible */ }

    // --- Guardar la elección del usuario ---
    const original = window.MapEngine?.setBaseLayer;
    if (original) {
      window.MapEngine.setBaseLayer = function (name) {
        original(name);
        try {
          const page = location.pathname.split('/').pop() || 'index.html';
          localStorage.setItem('snc_basemap_' + page, name);
        } catch (e) { /* noop */ }
      };
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setup);
  } else {
    setup();
  }
})();
