// Hamburguesa de mapa base: #map-base-selector > toggle + #map-base-menu > [data-layer]
(function initBasemapMenu() {
  'use strict';

  function pageKey() {
    const page = location.pathname.split('/').filter(Boolean).pop() || 'index.html';
    return 'snc_basemap_' + page;
  }

  function applyLayer(name) {
    return [window.MapEngine, window._adminMap, window.AppNotarial].some(engine =>
      typeof engine?.setBaseLayer === 'function' && engine.setBaseLayer(name) === true
    );
  }

  function markActive(menu, name) {
    menu.querySelectorAll('[data-layer]').forEach(btn => {
      const on = btn.dataset.layer === name;
      btn.classList.toggle('active', on);
      btn.setAttribute('aria-checked', String(on));
    });
  }

  function restoreSaved(menu) {
    let saved = null;
    try {
      saved = localStorage.getItem(pageKey());
    } catch (_) {
      return;
    }
    const names = Array.from(menu.querySelectorAll('[data-layer]'), btn => btn.dataset.layer);
    if (!saved || !names.includes(saved)) return;

    markActive(menu, saved);
    let attempts = 0;
    const timer = setInterval(() => {
      attempts += 1;
      if (applyLayer(saved) || attempts >= 40) clearInterval(timer);
    }, 250);
  }

  function setup() {
    document.querySelectorAll('#map-base-menu-toggle').forEach(toggle => {
      if (toggle.dataset.basemapBound === 'true') return;
      toggle.dataset.basemapBound = 'true';

      const box = toggle.closest('#map-base-selector');
      const menu = box?.querySelector('#map-base-menu');
      if (!box || !menu) return;

      const isOpen = () => !menu.hidden;

      function open() {
        menu.hidden = false;
        box.classList.add('is-expanded');
        box.style.zIndex = '1350';
        toggle.setAttribute('aria-expanded', 'true');
      }

      function close() {
        menu.hidden = true;
        box.classList.remove('is-expanded');
        box.style.zIndex = '';
        toggle.setAttribute('aria-expanded', 'false');
      }

      toggle.addEventListener('click', e => {
        e.stopPropagation();
        if (isOpen()) close();
        else open();
      });

      document.addEventListener('click', e => {
        if (isOpen() && !box.contains(e.target)) close();
      });

      document.addEventListener('keydown', e => {
        if (e.key === 'Escape' && isOpen()) {
          close();
          toggle.focus();
        }
      });

      menu.querySelectorAll('[data-layer]').forEach(btn => {
        btn.addEventListener('click', e => {
          e.stopPropagation();
          const name = btn.dataset.layer;
          markActive(menu, name);
          applyLayer(name);
          window.dispatchEvent(new CustomEvent('snc:layers-changed'));
          try {
            localStorage.setItem(pageKey(), name);
          } catch (_) { /* almacenamiento no disponible: la elección solo dura esta sesión */ }
          close();
        });
      });

      restoreSaved(menu);
    });
  }

  window.BasemapMenu = { init: setup };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setup);
  } else {
    setup();
  }
})();
