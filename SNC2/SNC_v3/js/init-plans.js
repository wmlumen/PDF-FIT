// Archivo auxiliar para resolver la dependencia circular
// Exporta initPlans como initPlans 
function initPlans() {
  console.log('Planimientos inicializados');
}

// Para mantener la compatibilidad con app-municipal.js, expone initPlans globalmente
window.initPlans = initPlans;