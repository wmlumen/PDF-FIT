/**
 * app-admin.js — Panel de Administración SNC v3
 * Login con JWT, dashboard con métricas reales y visor de capas municipales (Piribebuy).
 * Exporta initAdmin() que consume admin/index.html.
 */

// ============================================================
// LOGIN
// ============================================================
function getToken() { return localStorage.getItem('snc_api_token'); }
function setToken(t) { localStorage.setItem('snc_api_token', t); }
function clearToken() { localStorage.removeItem('snc_api_token'); localStorage.removeItem('snc_api_user'); }

function authHeaders() {
  const t = getToken();
  return t ? { 'Authorization': `Bearer ${t}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' };
}

function showLoginOverlay() {
  let overlay = document.getElementById('admin-login-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'admin-login-overlay';
    overlay.className = 'fixed inset-0 z-[9999] bg-gray-950/95 backdrop-blur-sm flex items-center justify-center';
    overlay.innerHTML = `
      <div class="bg-gray-900 border border-gray-800 rounded-2xl p-8 w-full max-w-md shadow-2xl">
        <div class="text-center mb-6">
          <div class="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
            <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
          </div>
          <h2 class="text-xl font-bold text-white">Panel de Administración</h2>
          <p class="text-sm text-gray-400 mt-1">SNC v3 · Acceso restringido</p>
        </div>
        <form id="admin-login-form" class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-300 mb-1">Correo electrónico</label>
            <input type="email" id="admin-email" required autocomplete="email"
              class="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
              placeholder="usuario@municipalidad.gov.py">
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-300 mb-1">Contraseña</label>
            <input type="password" id="admin-password" required autocomplete="current-password"
              class="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
              placeholder="••••••••">
          </div>
          <div id="admin-login-error" class="hidden text-sm text-red-400 bg-red-900/30 border border-red-700/50 rounded-lg px-3 py-2"></div>
          <button type="submit" class="w-full py-2.5 bg-amber-600 hover:bg-amber-500 text-white font-semibold rounded-lg transition-colors">
            Iniciar sesión
          </button>
        </form>
      </div>`;
    document.body.appendChild(overlay);
    overlay.querySelector('#admin-login-form').addEventListener('submit', handleLogin);
  }
  overlay.classList.remove('hidden');
  overlay.style.display = 'flex';
}

function hideLoginOverlay() {
  const overlay = document.getElementById('admin-login-overlay');
  if (overlay) { overlay.style.display = 'none'; overlay.classList.add('hidden'); }
}

async function handleLogin(e) {
  e.preventDefault();
  const email = document.getElementById('admin-email').value.trim().toLowerCase();
  const password = document.getElementById('admin-password').value;
  const errorEl = document.getElementById('admin-login-error');
  errorEl.classList.add('hidden');
  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok || !data.token) throw new Error(data.error || 'Credenciales inválidas');
    if (data.user?.role !== 'admin') throw new Error('Este usuario no tiene rol de administrador');
    setToken(data.token);
    localStorage.setItem('snc_api_user', JSON.stringify(data.user));
    hideLoginOverlay();
    loadDashboard();
    showToast('Sesión iniciada', 'success');
  } catch (err) {
    errorEl.textContent = err.message;
    errorEl.classList.remove('hidden');
  }
}

// ============================================================
// TOAST
// ============================================================
function showToast(msg, type = 'info') {
  const container = document.getElementById('toastContainer');
  if (!container) return;
  const colors = { success: 'bg-emerald-600', error: 'bg-red-600', warning: 'bg-amber-600', info: 'bg-blue-600' };
  const el = document.createElement('div');
  el.className = `${colors[type] || colors.info} text-white text-sm font-medium px-4 py-2.5 rounded-lg shadow-lg`;
  el.textContent = msg;
  container.appendChild(el);
  setTimeout(() => el.remove(), 4000);
}

// ============================================================
// DASHBOARD
// ============================================================
async function fetchJSON(url) {
  const res = await fetch(url, { headers: authHeaders() });
  if (res.status === 401) { showLoginOverlay(); throw new Error('No autorizado'); }
  if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
  return res.json();
}

async function loadDashboard() {
  const user = JSON.parse(localStorage.getItem('snc_api_user') || '{}');
  const emailEl = document.getElementById('userEmail');
  if (emailEl && user.email) emailEl.textContent = user.email;

  // Métricas principales
  try {
    const [members, plans] = await Promise.all([
      fetchJSON('/api/admin/members').catch(() => []),
      fetchJSON('/api/admin/plans').catch(() => []),
    ]);
    const membersList = Array.isArray(members) ? members : (members.data || []);
    const plansList = Array.isArray(plans) ? plans : (plans.data || []);
    set('dashMunicipalities', '1'); // Piribebuy
    set('dashMembers', String(membersList.length));
    set('dashPlans', String(plansList.length));
    set('dashExpedientes', '—');
  } catch (e) {
    console.warn('[admin] métricas:', e.message);
  }

  // Cargar capas de Piribebuy en el mapa
  loadPiribebuyMap();
}

function set(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

// ============================================================
// VISOR DE CAPAS PIRIBEBUY
// ============================================================
let adminMap = null;
const adminLayers = {};

async function loadPiribebuyMap() {
  const mapContainer = document.getElementById('admin-map');
  if (!mapContainer) {
    // Crear contenedor de mapa si no existe (en el tab "panel")
    const panel = document.getElementById('panel-dashboard');
    if (!panel) return;
    const mapSection = document.createElement('div');
    mapSection.className = 'bg-gray-900 border border-gray-800 rounded-lg p-4 mt-6';
    mapSection.innerHTML = `
      <h3 class="text-sm font-bold text-white mb-3 flex items-center gap-2">
        <svg class="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 20l-5.447-2.724A1 1 0 014 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"/></svg>
        Capas de Piribebuy
      </h3>
      <div class="flex flex-wrap gap-2 mb-3" id="piribebuy-layer-toggles"></div>
      <div id="admin-map" style="height:400px;border-radius:8px;border:1px solid #374151;background:#0d1117;"></div>
    `;
    panel.appendChild(mapSection);
  }

  if (!adminMap) {
    // Cargar Leaflet si no está cargado
    if (typeof L === 'undefined') {
      await new Promise(resolve => {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = '/vendor/leaflet.css';
        document.head.appendChild(link);
        const script = document.createElement('script');
        script.src = '/vendor/leaflet.js';
        script.onload = resolve;
        document.head.appendChild(script);
      });
    }
    adminMap = L.map('admin-map', { center: [-25.45, -57.05], zoom: 13 });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap', maxZoom: 19,
    }).addTo(adminMap);
  }

  // Crear toggles para cada capa
  const layers = [
    { id: 'barrios', label: 'Barrios', color: '#7c3aed' },
    { id: 'vias', label: 'Vías', color: '#f59e0b' },
    { id: 'hidro', label: 'Hidrografía', color: '#0ea5e9' },
    { id: 'vertedero', label: 'Vertedero', color: '#ef4444' },
    { id: 'casco_historico', label: 'Casco Histórico', color: '#facc15' },
  ];
  const toggleContainer = document.getElementById('piribebuy-layer-toggles');
  if (toggleContainer) {
    toggleContainer.innerHTML = '';
    layers.forEach(layer => {
      const btn = document.createElement('button');
      btn.className = 'px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors';
      btn.style.borderColor = layer.color;
      btn.style.color = layer.color;
      btn.textContent = layer.label;
      btn.onclick = async () => {
        if (adminLayers[layer.id]) {
          adminMap.removeLayer(adminLayers[layer.id]);
          delete adminLayers[layer.id];
          btn.style.background = 'transparent';
          btn.style.opacity = '0.5';
        } else {
          try {
            const res = await fetch(`/data/piribebuy/${layer.id}.geojson`);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const gj = await res.json();
            const isPoint = gj.features?.some(f => f.geometry?.type === 'Point');
            adminLayers[layer.id] = isPoint
              ? L.geoJSON(gj, { pointToLayer: (_, ll) => L.circleMarker(ll, { color: layer.color, radius: 6 }) }).addTo(adminMap)
              : L.geoJSON(gj, { style: { color: layer.color, weight: 1.5, fillOpacity: 0.15 } }).addTo(adminMap);
            btn.style.background = layer.color + '33';
            btn.style.opacity = '1';
          } catch (e) {
            showToast(`No se pudo cargar ${layer.label}: ${e.message}`, 'error');
          }
        }
      };
      btn.style.opacity = '0.5';
      toggleContainer.appendChild(btn);
    });
  }
}

// ============================================================
// TABS
// ============================================================
function setupTabs() {
  const tabs = document.querySelectorAll('.tab-btn');
  const panels = document.querySelectorAll('.tab-panel');
  tabs.forEach(btn => {
    btn.addEventListener('click', () => {
      tabs.forEach(b => { b.setAttribute('aria-selected', 'false'); b.classList.remove('bg-gray-800', 'text-amber-400'); });
      btn.setAttribute('aria-selected', 'true');
      btn.classList.add('bg-gray-800', 'text-amber-400');
      panels.forEach(p => p.classList.remove('active'));
      const panel = document.getElementById(`panel-${btn.dataset.tab}`);
      if (panel) panel.classList.add('active');
    });
  });
}

// ============================================================
// LOGOUT
// ============================================================
function setupLogout() {
  const btn = document.getElementById('logoutBtn');
  if (btn) {
    btn.addEventListener('click', () => {
      clearToken();
      showLoginOverlay();
      showToast('Sesión cerrada', 'info');
    });
  }
}

// ============================================================
// INIT
// ============================================================
export function initAdmin() {
  setupTabs();
  setupLogout();
  const token = getToken();
  if (!token) {
    showLoginOverlay();
  } else {
    loadDashboard();
  }
}

export default { initAdmin };
