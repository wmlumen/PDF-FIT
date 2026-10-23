/**
 * Entry Point Municipal - Municipal PY Pro (Ley 3966/2010)
 * Entry point dedicado para index-municipal.html
 */

import { App } from '/js/app/index.js';
import { MunicipalClient } from '/js/municipalClient.js';
import { logger } from '/js/logger.js';

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', async () => {
  const boot = async () => {
    try {
      // Inicializar app base
      if (window.App && typeof window.App.init === 'function') {
        await window.App.init();
      }
    } catch (e) {
      if (window.logger) window.logger.warn('App.init no se completó en cliente municipal:', e?.message);
    }
    
    // Inicializar cliente municipal
    if (window.MunicipalClient) {
      window.MunicipalClient.init?.();
    }
  };
  
  // app.js ejecuta App.init() en su propio DOMContentLoaded; reintentamos a los 600ms
  setTimeout(boot, 600);
});

// Exportar para uso global
window.MunicipalClient = MunicipalClient;
window.App = App;