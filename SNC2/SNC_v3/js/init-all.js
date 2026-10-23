function initDashboard() {
  console.log('Dashboard inicializado');
}

function initMembers() {
  console.log('Miembros inicializados');
}

function initPlans() {
  console.log('Planimientos inicializados');
}

function initFinance() {
  console.log('Finanzas inicializadas');
}

function initAudit() {
  console.log('Auditoría inicializada');
}

function initFiscalizacion() {
  console.log('Fiscalización inicializada');
}

function initAmbiental() {
  console.log('Medio ambiente inicializado');
}

function initDictamenes() {
  console.log('Dictámenes inicializados');
}

function initExpedientes() {
  console.log('Expedientes inicializados');
}

window.initTabs = function() {
  var tabs = document.querySelectorAll('[role="tab"]');
  var panels = document.querySelectorAll('.tab-panel');
  tabs.forEach(function(tab) {
    tab.addEventListener('click', function() {
      var tabName = tab.getAttribute('data-tab');
      tabs.forEach(function(t) { t.classList.remove('active'); });
      tab.classList.add('active');
      panels.forEach(function(p) {
        p.classList.remove('active');
        p.classList.add('hidden');
      });
      var target = document.getElementById('panel-' + tabName);
      if (target) {
        target.classList.remove('hidden');
        target.classList.add('active');
      }
      switch(tabName) {
        case 'dashboard': loadDashboard(); break;
        case 'members': loadMembers(); break;
        case 'plans': loadPlans(); break;
        case 'finance': loadFinance(); break;
        case 'audit': loadAudit(); break;
        case 'fiscalizacion': loadFiscalizacion(); break;
        case 'ambiental': loadAmbiental(); break;
        case 'dictamenes': loadDictamenes(); break;
        case 'expedientes': loadExpedientes(); break;
      }
    });
  });
};