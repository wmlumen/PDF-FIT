/**
 * Entry Point Principal - Catastro PY Pro (SNC 551/2023)
 * Este archivo es el entry point de Vite para index.html
 */

import { App } from './app/index.js';

// Inicializar la app cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', async () => {
  try {
    await App.init();
  } catch (error) {
    console.error('[App] Error en inicialización:', error);
  }
});

// Exportar para uso global
window.App = App;