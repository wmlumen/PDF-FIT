#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import os

content = """/**
 * Entry Point Admin - Admin SNC v3
 * Panel completo de administración
 */

var MOROSIDAD_COLORS = ['morosidad-verde', 'morosidad-amarillo', 'morosidad-naranja', 'morosidad-rojo'];
var MOROSIDAD_LABELS = ['Buena', 'Regular', 'Alto', 'Crítico'];

document.addEventListener('DOMContentLoaded', function() {
  var init = function() {
    try {
      initDashboard();
      initMembers();
      initPlans();
      initFinance();
      initAudit();
      initFiscalizacion();
      initAmbiental();
      initDictamenes();
      initExpedientes();
      initTabs();
      loadDashboard();
      loadMembers();
      loadPlans();
      loadFinance();
      loadAudit();
      loadMunicipios();
    } catch (e) {
      console.error('Error inicializando admin:', e);
    }
  };
  setTimeout(init, 300);
});

window.initTabs = function() {
  var tabs = document.querySelectorAll('[role="tab"]');
  var panels = document.querySelectorAll('.tab-panel');
  tabs.forEach(function(tab) {
    tab.addEventListener('click', function() {
      var tabName = tab.dataset.tab;
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

function initDashboard() {
  var refreshBtn = document.getElementById('refreshDashboard');
  if (refreshBtn) refreshBtn.addEventListener('click', loadDashboard);
}

window.loadDashboard = async function() {
  try {
    var response = await fetch('/api/admin/metrics');
    var metrics = {};
    if (response.ok) {
      metrics = await response.json();
    }
    document.getElementById('kpi-municipios').textContent = metrics?.municipios_activos || '-';
    document.getElementById('kpi-profesionales').textContent = metrics?.profesionales || '-';
    document.getElementById('kpi-expedientes').textContent = metrics?.expedientes || '-';
    document.getElementById('kpi-transacciones').textContent = metrics?.transacciones || '-';
    initCharts();
  } catch (e) {
    console.warn('No se pudieron cargar KPIs:', e);
  }
};

function initCharts() {
  var ctx1 = document.getElementById('activityChart');
  if (ctx1) {
    new Chart(ctx1, {
      type: 'line',
      data: {
        labels: ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'],
        datasets: [{
          label: 'Actividad',
          data: [12, 19, 15, 25, 22, 30, 28],
          borderColor: '#f59e0b',
          backgroundColor: 'rgba(245, 158, 11, 0.1)',
          fill: true,
          tension: 0.4
        }]
      },
      options: { responsive: true, plugins: { legend: { display: false } } }
    });
  }
  var ctx2 = document.getElementById('planUsageChart');
  if (ctx2) {
    new Chart(ctx2, {
      type: 'bar',
      data: {
        labels: ['Free', 'Paid', 'Enterprise'],
        datasets: [{
          label: 'Usuarios',
          data: [42, 18, 5],
          backgroundColor: ['#9ca3af', '#f59e0b', '#10b981'],
          borderColor: ['#6b7280', '#d97706', '#059669'],
          borderWidth: 1
        }]
      },
      options: { responsive: true, plugins: { legend: { display: false } } }
    });
  }
}

function initMembers() {
  var search = document.getElementById('memberSearch');
  var roleFilter = document.getElementById('roleFilter');
  var statusFilter = document.getElementById('statusFilter');
  var tableBody = document.getElementById('membersTable');
  var refreshBtn = document.getElementById('createMemberBtn');
  var prevBtn = document.getElementById('prevPage');
  var nextBtn = document.getElementById('nextPage');
  function filterTable() {
    var searchTerm = search.value.toLowerCase();
    var role = roleFilter.value;
    var status = statusFilter.value;
    var rows = tableBody.querySelectorAll('tr');
    rows.forEach(function(row) {
      if (row.cells.length === 0) return;
      var text = row.textContent.toLowerCase();
      var matchesRole = !role || row.cells[2]?.textContent.toLowerCase().includes(role);
      var matchesStatus = !status || row.cells[3]?.textContent.toLowerCase().includes(status);
      if (text.includes(searchTerm) && matchesRole && matchesStatus) {
        row.style.display = '';
      } else {
        row.style.display = 'none';
      }
    });
  }
  search.addEventListener('input', filterTable);
  roleFilter.addEventListener('change', filterTable);
  statusFilter.addEventListener('change', filterTable);
  if (refreshBtn) {
    refreshBtn.addEventListener('click', function() {
      loadMembers();
      showToast('Miembros actualizados', 'success');
    });
  }
  if (prevBtn) prevBtn.addEventListener('click', function() { loadMembers(); });
  if (nextBtn) nextBtn.addEventListener('click', function() { loadMembers(); });
}

window.loadMembers = async function() {
  try {
    var response = await fetch('/api/admin/members');
    if (!response.ok) return;
    var members = await response.json();
    var tbody = document.getElementById('membersTable');
    tbody.innerHTML = '';
    if (members.length === 0) {
      tbody.innerHTML = '<tr><td colspan="8">Sin miembros</td></tr>';
      return;
    }
    members.forEach(function(m) {
      var tr = document.createElement('tr');
      var statusColor = m.status === 'active' ? 'text-green-400' : m.status === 'suspended' ? 'text-yellow-400' : 'text-gray-400';
      tr.innerHTML = '<td>' + (m.name || m.email) + '</td>' +
                     '<td>' + (m.plan_name || m.plan) + '</td>' +
                     '<td>' + m.role + '</td>' +
                     '<td><span class="px-2 py-1 rounded-full text-xs font-medium ' + statusColor + '">' + m.status + '</span></td>' +
                     '<td>' + (m.project_count || 0) + '</td>' +
                     '<td>' + (m.project_limit || 0) + '</td>' +
                     '<td>' + new Date(m.created_at).toLocaleDateString() + '</td>' +
                     '<td style="text-align:right">' +
                       '<button onclick="admin.blockMember(' + JSON.stringify(m.id) + ')" style="color:#f59e0b">Suspender</button>' +
                       '<button onclick="admin.editMember(' + JSON.stringify(m.id) + ')" style="color:#9ca3af">Editar</button>' +
                     '</td>';
      tbody.appendChild(tr);
    });
    var total = members.length;
    var pages = Math.ceil(total / 20);
    document.getElementById('membersPagination').classList.remove('hidden');
    document.getElementById('paginationInfo').textContent = 'Página 1 de ' + pages;
  } catch (e) {
    console.warn('No se pudieron cargar miembros:', e);
  }
};

window.loadPlans = async function() {
  try {
    var response = await fetch('/api/admin/plans');
    if (!response.ok) return;
    var plans = await response.json();
    var tableBody = document.getElementById('plansTable');
    tableBody.innerHTML = '';
    if (plans.length === 0) {
      tableBody.innerHTML = '<tr><td colspan="9">Sin planes</td></tr>';
      return;
    }
    plans.forEach(function(p) {
      var tr = document.createElement('tr');
      tr.innerHTML = '<td>' + p.id + '</td>' +
                     '<td>' + p.name + '</td>' +
                     '<td>' + p.type + '</td>' +
                     '<td>' + p.price + ' ' + p.currency + '</td>' +
                     '<td>' + (p.limits?.projects || 0) + '</td>' +
                     '<td>' + (p.limits?.expedientes || 0) + '</td>' +
                     '<td>' + (p.watermark ? 'Sí' : 'No') + '</td>' +
                     '<td>' + (p.active ? '<span style="color:#10b981">Activo</span>' : '<span style="color:#9ca3af">Inactivo</span>') + '</td>' +
                     '<td style="text-align:right">' +
                       '<button onclick="admin.togglePlan(' + JSON.stringify(p.id) + ', ' + JSON.stringify(p.active) + ')" style="color:#f59e0b">' + (p.active ? 'Desactivar' : 'Activar') + '</button>' +
                     '</td>';
      tableBody.appendChild(tr);
    });
  } catch (e) {
    console.warn('No se pudieron cargar planes:', e);
  }
};

window.loadFinance = async function() {
  try {
    var response = await fetch('/api/admin/finance');
    if (!response.ok) return;
    var data = await response.json();
    document.getElementById('finTotalTx').textContent = data.total_tx || '-';
    document.getElementById('finPaidTx').textContent = data.paid_tx || '-';
    document.getElementById('finPendingTx').textContent = data.pending_tx || '-';
    document.getElementById('finFees').textContent = data.fees || '-';
    var tbody = document.getElementById('financeTable');
    tbody.innerHTML = '';
    (data.transactions || []).forEach(function(tx) {
      var tr = document.createElement('tr');
      tr.innerHTML = '<td>' + tx.id + '</td>' +
                     '<td>' + (tx.user_name || tx.user) + '</td>' +
                     '<td>' + tx.plan + '</td>' +
                     '<td>' + tx.amount + '</td>' +
                     '<td>' + tx.currency + '</td>' +
                     '<td>' + tx.status + '</td>' +
                     '<td>' + (tx.provider || '-') + '</td>' +
                     '<td>' + new Date(tx.date).toLocaleDateString() + '</td>';
      tbody.appendChild(tr);
    });
  } catch (e) {
    console.warn('No se pudieron cargar finanzas:', e);
  }
};

window.loadAudit = async function() {
  try {
    var errorRes = await fetch('/api/admin/errors');
    if (errorRes.ok) {
      var errors = await errorRes.json();
      var container = document.getElementById('errorLogs');
      container.innerHTML = '';
      if (errors.length === 0) {
        container.innerHTML = '<p class="text-gray-500">No hay errores registrados</p>';
      } else {
        errors.slice(0, 50).forEach(function(e) {
          var div = document.createElement('div');
          div.className = 'text-xs text-red-400 p-2 border-b border-gray-800';
          div.textContent = new Date(e.timestamp).toLocaleString() + ': ' + e.message + ' (IP: ' + e.ip + ')';
          container.appendChild(div);
        });
      }
    }
    var auditRes = await fetch('/api/admin/audit?limit=20');
    if (auditRes.ok) {
      var logs = await auditRes.json();
      var container = document.getElementById('auditLogs');
      container.innerHTML = '';
      logs.forEach(function(l) {
        var div = document.createElement('div');
        div.className = 'text-xs p-2 border-b border-gray-800';
        div.innerHTML = '<span class="text-gray-400">' + new Date(l.timestamp).toLocaleString() + '</span> <span class="text-white">' + l.user + '</span> <span class="text-gray-500">' + l.action + '</span>';
        container.appendChild(div);
      });
    }
  } catch (e) {
    console.warn('No se pudieron cargar auditoría:', e);
  }
};

window.loadFiscalizacion = async function() {
  try {
    var municipio = document.getElementById('fiscalizacionMunicipio').value;
    var response = await fetch('/api/admin/fiscalizacion?municipio=' + municipio);
    if (!response.ok) return;
    var data = await response.json();
    var mapDiv = document.getElementById('fiscalizacionMap');
    if (mapDiv) {
      if (window.fiscalizacionMap) {
        window.fiscalizacionMap.remove();
      }
      window.fiscalizacionMap = L.map(mapDiv).setView([-25.2637, -57.5759], 10);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap'
      }).addTo(window.fiscalizacionMap);
      if (data.mapas) {
        L.geoJSON(data.mapas, {
          style: function(feature) {
            var nivel = feature.properties.nivel_morosidad;
            var color = MOROSIDAD_COLORS[Math.min(nivel, 3)] || MOROSIDAD_COLORS[0];
            return { fillColor: color, color: '#374151', weight: 1, fillOpacity: 0.6 };
          },
          onEachFeature: function(feature, layer) {
            layer.bindPopup('<b>' + feature.properties.propietario + '</b><br>Nivel: ' + MOROSIDAD_LABELS[feature.properties.nivel_morosidad]);
          }
        }).addTo(window.fiscalizacionMap);
      }
    }
    document.getElementById('fugasCount').textContent = data.fugas || 0;
    document.getElementById('morosidadAltoCount').textContent = data.morosidad_alto || 0;
    document.getElementById('morosidadMedioCount').textContent = data.morosidad_medio || 0;
    var alertsContainer = document.getElementById('prescripcionAlerts');
    alertsContainer.innerHTML = '';
    (data.alertas || []).forEach(function(a) {
      var div = document.createElement('div');
      div.className = 'text-xs p-2 border-b border-gray-800';
      div.innerHTML = '<span style="color:#f59e0b">⚠️</span> <span class="text-white">' + a.lote + '</span> <span class="text-gray-500">' + a.deuda + '</span>';
      alertsContainer.appendChild(div);
    });
  } catch (e) {
    console.warn('No se pudieron cargar fiscalización:', e);
  }
};

window.loadAmbiental = async function() {
  try {
    var municipio = document.getElementById('ambienteMunicipio').value;
    var response = await fetch('/api/admin/ambiental?municipio=' + municipio);
    if (!response.ok) return;
    var data = await response.json();
    var mapDiv = document.getElementById('ambienteMap');
    if (mapDiv) {
      if (window.ambienteMap) {
        window.ambienteMap.remove();
      }
      window.ambienteMap = L.map(mapDiv).setView([-25.2637, -57.5759], 10);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap'
      }).addTo(window.ambienteMap);
      if (data.cursos) {
        L.geoJSON(data.cursos, {
          style: { color: '#f59e0b', weight: 3, fillOpacity: 0 }
        }).addTo(window.ambienteMap);
      }
      if (data.resultados) {
        L.geoJSON(data.resultados, {
          style: function(feature) {
            var viola = feature.properties.infraccion;
            return { color: viola ? '#ef4444' : '#10b981', weight: 2, fillOpacity: 0.3 };
          },
          onEachFeature: function(feature, layer) {
            layer.bindPopup('<b>' + feature.properties.nombre + '</b><br>Infracción: ' + (feature.properties.infraccion ? 'Sí' : 'No'));
          }
        }).addTo(window.ambienteMap);
      }
    }
    var resultadosContainer = document.getElementById('ambienteResultados');
    resultadosContainer.innerHTML = '';
    (data.resultados || []).forEach(function(r) {
      var div = document.createElement('div');
      div.className = 'text-xs p-2 border-b border-gray-800';
      div.innerHTML = '<span class="text-white">' + r.nombre + '</span> <span class="text-gray-500">(' + r.distrito + ')</span> <span style="color:' + (r.infraccion ? '#ef4444' : '#10b981') + '">' + (r.infraccion ? 'Infracción' : 'OK') + '</span>';
      resultadosContainer.appendChild(div);
    });
  } catch (e) {
    console.warn('No se pudieron cargar ambiental:', e);
  }
};

window.loadDictamenes = async function() {
  try {
    var response = await fetch('/api/admin/dictamenes');
    if (!response.ok) return;
    var dictamenes = await response.json();
    var container = document.getElementById('dictamenList');
    container.innerHTML = '';
    (dictamenes || []).forEach(function(d) {
      var div = document.createElement('div');
      div.className = 'text-xs p-2 border-b border-gray-800';
      div.innerHTML = '<span style="color:#f59e0b">📄</span> <span class="text-white">' + d.type + ' - ' + d.nombre + '</span> <span class="text-gray-500">' + new Date(d.created_at).toLocaleDateString() + '</span> <a href="' + d.url + '" class="text-blue-400 text-xs">Descargar</a>';
      container.appendChild(div);
    });
  } catch (e) {
    console.warn('No se pudieron cargar dictámenes:', e);
  }
};

window.loadExpedientes = async function() {
  try {
    var response = await fetch('/api/admin/expedientes');
    if (!response.ok) return;
    var expedientes = await response.json();
    var tableBody = document.getElementById('expedientesTable');
    tableBody.innerHTML = '';
    (expedientes || []).forEach(function(e) {
      var tr = document.createElement('tr');
      tr.innerHTML = '<td>' + e.id + '</td>' +
                     '<td>' + (e.municipio || '-') + '</td>' +
                     '<td>' + (e.profesional || '-') + '</td>' +
                     '<td>' + e.estado + '</td>' +
                     '<td>' + new Date(e.fecha).toLocaleDateString() + '</td>' +
                     '<td style="text-align:right">' +
                       '<button style="color:#3b82f6">Ver</button>' +
                       '<button style="color:#9ca3af">Editar</button>' +
                     '</td>';
      tableBody.appendChild(tr);
    });
  } catch (e) {
    console.warn('No se pudieron cargar expedientes:', e);
  }
};

function initMunicipios() {
  var municipioSelect = document.getElementById('fiscalizacionMunicipio');
  var ambienteSelect = document.getElementById('ambienteMunicipio');
  if (municipioSelect) {
    fetch('/api/admin/municipios').then(function(r) { return r.json(); }).then(function(municipios) {
      municipioSelect.innerHTML = '<option value="">Seleccionar municipio</option>';
      municipios.forEach(function(m) {
        var opt = document.createElement('option');
        opt.value = m.id;
        opt.textContent = m.name;
        municipioSelect.appendChild(opt);
      });
    });
  }
  if (ambienteSelect) {
    fetch('/api/admin/municipios').then(function(r) { return r.json(); }).then(function(municipios) {
      ambienteSelect.innerHTML = '<option value="">Seleccionar municipio</option>';
      municipios.forEach(function(m) {
        var opt = document.createElement('option');
        opt.value = m.id;
        opt.textContent = m.name;
        ambienteSelect.appendChild(opt);
      });
    });
  }
}

function initDictamenProyectos() {
  var projectSelect = document.getElementById('dictamenProject');
  if (projectSelect) {
    fetch('/api/admin/projects').then(function(r) { return r.json(); }).then(function(projects) {
      projectSelect.innerHTML = '<option value="">Seleccionar proyecto</option>';
      projects.forEach(function(p) {
        var opt = document.createElement('option');
        opt.value = p.id;
        opt.textContent = p.name + ' (' + p.expedientes + ')';
        projectSelect.appendChild(opt);
      });
    });
  }
}

window.showToast = function(message, type) {
  type = type || 'info';
  var container = document.getElementById('toastContainer');
  var div = document.createElement('div');
  div.className = 'px-4 py-2 rounded-lg text-sm ' +
    (type === 'success' ? 'bg-green-900/50 text-green-300' :
     type === 'error' ? 'bg-red-900/50 text-red-300' : 'bg-gray-700/50 text-gray-300');
  div.textContent = message;
  container.appendChild(div);
  setTimeout(function() { div.remove(); }, 3000);
};

window.admin = {
  blockMember: function(id) {
    fetch('/api/admin/members/' + id + '/block', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason: 'Bloqueo administrativo' })
    }).then(function() { loadMembers(); }).catch(function() { showToast('Error bloqueando miembro', 'error'); });
  },
  editMember: function(id) {},
  togglePlan: function(id, active) {
    fetch('/api/admin/plans/' + id, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active: !active })
    }).then(function() { loadPlans(); }).catch(function() { showToast('Error actualizando plan', 'error'); });
  }
};
"""

os.makedirs('js', exist_ok=True)
with open('js/app-municipal.js', 'w', encoding='utf-8') as f:
    f.write(content)
print('File written successfully')
