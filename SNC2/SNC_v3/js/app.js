/**
 * Entry Point Principal - Catastro PY Pro (SNC 551/2023)
 * Este archivo es el entry point de Vite para index.html
 */

import { App } from './app/index.js';
import { initButtonIcons } from './buttonIcons.js';
import './coordLocator.js';
import './expedienteModal.js';
import './signatureUI.js';
import './mesaEntrada.js';
import './interoperabilidad.js';
import './magService.js';
import './authModal.js';
import './modulo5.js';
import './madesService.js';
import './escribania.js';
import './urbanismo.js';

initButtonIcons(document.body);
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => initButtonIcons(document.body), { once: true });
}

// Inicializar la app cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', async () => {
  initButtonIcons(document.body);
  try {
    await App.init();
  } catch (error) {
    console.error('[App] Error en inicialización:', error);
  }
});

// Exportar para uso global
window.App = App;
