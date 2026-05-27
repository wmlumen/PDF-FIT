/**
 * Dashboard logic: carga proyectos, stats, gráficos y tabla de visitas recientes
 */
let timelineChartInstance = null;
let browserChartInstance = null;
let currentProject = 'default';

// Inicialización
document.addEventListener('DOMContentLoaded', () => {
  loadProjects();
  updateFooterTime();
  setInterval(updateFooterTime, 1000);
  setInterval(() => loadAll(currentProject), 30000); // auto-refresh cada 30s
});

function updateFooterTime() {
  document.getElementById('footerTime').textContent = new Date().toLocaleString('es-PY');
}

function showLoading(el) {
  if (typeof el === 'string') el = document.getElementById(el);
  el.innerHTML = '<div class="loading">Cargando...</div>';
}

async function loadProjects() {
  try {
    const res = await fetch('/api/projects');
    const projects = await res.json();
    const select = document.getElementById('projectSelect');
    select.innerHTML = '';

    if (projects.length === 0) {
      select.innerHTML = '<option value="default">default</option>';
      currentProject = 'default';
    } else {
      projects.forEach(p => {
        const opt = document.createElement('option');
        opt.value = p.name;
        opt.textContent = `${p.name} (${p.real_visits || 0} visits)`;
        select.appendChild(opt);
      });
      currentProject = projects[0].name;
    }
    select.value = currentProject;
    loadAll(currentProject);
  } catch (err) {
    console.error('Error loading projects:', err);
    document.getElementById('projectSelect').innerHTML = '<option value="default">default</option>';
    loadAll('default');
  }
}

function changeProject() {
  currentProject = document.getElementById('projectSelect').value;
  loadAll(currentProject);
}

async function loadAll(project) {
  loadOverview(project);
  loadTimeline(project);
  loadDevices(project);
  loadLocations(project);
  loadRecent(project);
  loadTopPages(project);
}

// ─── Overview ──────────────────────────────────────────────

async function loadOverview(project) {
  try {
    const res = await fetch(`/api/stats/overview?project=${encodeURIComponent(project)}`);
    const data = await res.json();
    document.getElementById('totalVisits').textContent = data.total.toLocaleString();
    document.getElementById('uniqueVisitors').textContent = data.unique_visitors.toLocaleString();
    document.getElementById('todayVisits').textContent = data.today.toLocaleString();
    document.getElementById('uniqueToday').textContent = data.unique_today.toLocaleString();
    document.getElementById('weekVisits').textContent = data.this_week.toLocaleString();
  } catch (err) {
    console.error('Error loading overview:', err);
  }
}

// ─── Top Pages ─────────────────────────────────────────────

async function loadTopPages(project) {
  try {
    const res = await fetch(`/api/stats/overview?project=${encodeURIComponent(project)}`);
    const data = await res.json();
    const container = document.getElementById('topPages');

    if (!data.top_pages || data.top_pages.length === 0) {
      container.innerHTML = '<div style="color:#94a3b8;text-align:center;padding:1rem;">Sin datos de páginas</div>';
      return;
    }

    let html = '<table><thead><tr><th>Página</th><th style="text-align:right">Visitas</th></tr></thead><tbody>';
    data.top_pages.forEach(p => {
      const max = data.top_pages[0].count;
      const pct = Math.round((p.count / max) * 100);
      html += `<tr>
        <td>${escHtml(p.page)}</td>
        <td style="text-align:right">
          ${p.count}
          <div style="background:#1e293b;height:4px;border-radius:2px;margin-top:4px;">
            <div style="background:#38bdf8;height:4px;border-radius:2px;width:${pct}%"></div>
          </div>
        </td>
      </tr>`;
    });
    html += '</tbody></table>';
    container.innerHTML = html;
  } catch (err) {
    console.error('Error loading top pages:', err);
  }
}

// ─── Timeline Chart ────────────────────────────────────────

async function loadTimeline(project) {
  try {
    const res = await fetch(`/api/stats/timeline?project=${encodeURIComponent(project)}&days=30`);
    const data = await res.json();

    const labels = data.timeline.map(d => {
      const parts = d.date.split('-');
      return `${parts[2]}/${parts[1]}`;
    });
    const visits = data.timeline.map(d => d.count);
    const unique = data.timeline.map(d => d.unique_count);

    const ctx = document.getElementById('timelineChart').getContext('2d');

    if (timelineChartInstance) timelineChartInstance.destroy();

    timelineChartInstance = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Visitas',
            data: visits,
            borderColor: '#38bdf8',
            backgroundColor: 'rgba(56, 189, 248, 0.1)',
            fill: true,
            tension: 0.3,
            pointRadius: 2,
          },
          {
            label: 'Únicos',
            data: unique,
            borderColor: '#a78bfa',
            backgroundColor: 'rgba(167, 139, 250, 0.1)',
            fill: true,
            tension: 0.3,
            pointRadius: 2,
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            labels: { color: '#94a3b8', boxWidth: 12, padding: 12 }
          }
        },
        scales: {
          x: {
            ticks: { color: '#64748b', maxTicksLimit: 15 },
            grid: { color: '#1e293b' }
          },
          y: {
            beginAtZero: true,
            ticks: { color: '#64748b' },
            grid: { color: '#1e293b' }
          }
        }
      }
    });
  } catch (err) {
    console.error('Error loading timeline:', err);
  }
}

// ─── Browser/OS/Device Chart ──────────────────────────────

async function loadDevices(project) {
  try {
    const res = await fetch(`/api/stats/devices?project=${encodeURIComponent(project)}`);
    const data = await res.json();

    const browsers = data.browsers || [];
    const colors = ['#38bdf8', '#f59e0b', '#22c55e', '#ef4444', '#a78bfa', '#ec4899', '#14b8a6', '#64748b'];

    const ctx = document.getElementById('browserChart').getContext('2d');
    if (browserChartInstance) browserChartInstance.destroy();

    browserChartInstance = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: browsers.map(b => b.browser),
        datasets: [{
          data: browsers.map(b => b.count),
          backgroundColor: colors.slice(0, browsers.length),
          borderWidth: 0
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: { color: '#94a3b8', boxWidth: 12, padding: 10 }
          }
        }
      }
    });
  } catch (err) {
    console.error('Error loading devices:', err);
  }
}

// ─── Recent visits table ───────────────────────────────────

async function loadRecent(project) {
  try {
    const res = await fetch(`/api/stats/recent?project=${encodeURIComponent(project)}&limit=20`);
    const visits = await res.json();
    const container = document.getElementById('recentVisits');

    if (!visits || visits.length === 0) {
      container.innerHTML = '<div style="color:#94a3b8;text-align:center;padding:1rem;">Sin visitas recientes</div>';
      return;
    }

    let html = `<table>
      <thead><tr>
        <th>País</th><th>Ciudad</th><th>Navegador</th><th>SO</th><th>Dispositivo</th><th>Página</th><th>Fecha</th>
      </tr></thead><tbody>`;

    visits.forEach(v => {
      const time = new Date(v.created_at + 'Z');
      const formatted = time.toLocaleString('es-PY');
      html += `<tr>
        <td>${escHtml(v.country || '—')}</td>
        <td>${escHtml(v.city || '—')}</td>
        <td>${escHtml(v.browser || '—')}</td>
        <td>${escHtml(v.os || '—')}</td>
        <td>${escHtml(v.device || '—')}</td>
        <td>${escHtml(v.page || '—')}</td>
        <td style="font-size:0.8rem;color:#94a3b8">${formatted}</td>
      </tr>`;
    });

    html += '</tbody></table>';
    container.innerHTML = html;
  } catch (err) {
    console.error('Error loading recent:', err);
  }
}

// ─── Helpers ───────────────────────────────────────────────

function escHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
