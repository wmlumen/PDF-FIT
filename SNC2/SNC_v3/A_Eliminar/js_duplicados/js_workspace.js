/**
 * Workspace - Navegación y estado de vistas compartido
 * Módulo ESM para uso en index.html e index-municipal.html
 */

export const Workspace = {
  currentTab: 'map',
  
  switchTab(tab) {
    this.currentTab = tab;
    
    // Ocultar todas las vistas
    document.querySelectorAll('.main-view').forEach(v => v.classList.remove('active'));
    
    // Mostrar la vista seleccionada
    const viewEl = document.getElementById('view-' + tab);
    if (viewEl) viewEl.classList.add('active');
    
    // Actualizar botones de navegación
    document.querySelectorAll('.header-tab').forEach(b => b.classList.remove('active'));
    const tabBtn = document.getElementById('tab-' + tab);
    if (tabBtn) tabBtn.classList.add('active');
    
    // Acciones específicas por pestaña
    if (tab === 'map' && window.MapEngine) {
      setTimeout(() => window.MapEngine.invalidateSize?.(), 100);
    }
    
    if (tab === 'balance' && window.MunicipalClient) {
      const rep = window.State ? window.State.get('reporteMunicipal') : null;
      if (rep) window.MunicipalClient.renderBalanceMunicipal?.(rep);
    }
  }
};

// Exponer globalmente para compatibilidad
window.Workspace = Workspace;

export default Workspace;