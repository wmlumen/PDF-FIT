/**
 * app-admin.js — Panel de Super Administrador SNC v3
 * Control total de los 3 subsistemas: Profesional, Municipal, Notarial.
 * Autenticación JWT, gestión de miembros, auditoría, multi-tenant y visor GIS.
 */

// ============================================================
// TOKEN & AUTENTICACIÓN
// ============================================================
export function getToken() { return localStorage.getItem('snc_api_token'); }
export function setToken(t) { localStorage.setItem('snc_api_token', t); }
export function clearToken() {
  localStorage.removeItem('snc_api_token');
  localStorage.removeItem('snc_api_user');
}

export function authHeaders() {
  const t = getToken();
  return t ? { 'Authorization': `Bearer ${t}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' };
}

export async function fetchJSON(url, options = {}) {
  const headers = { ...authHeaders(), ...(options.headers || {}) };
  const res = await fetch(url, { ...options, headers });
  if (res.status === 401) {
    showLoginOverlay();
    throw new Error('Sesión expirada o no autorizada');
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

// ============================================================
// OVERLAY DE LOGIN SUPER ADMIN
// ============================================================
export function showLoginOverlay() {
  let overlay = document.getElementById('admin-login-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'admin-login-overlay';
    overlay.className = 'fixed inset-0 z-[9999] bg-gray-950/95 backdrop-blur-md flex items-center justify-center p-4';
    overlay.innerHTML = `
      <div class="bg-gray-900 border border-gray-800 rounded-2xl p-8 w-full max-w-md shadow-2xl">
        <div class="text-center mb-6">
          <div class="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-amber-500 via-orange-600 to-red-600 flex items-center justify-center shadow-lg shadow-orange-500/30 text-white font-black text-2xl">
            ⚡
          </div>
          <h2 class="text-xl font-bold text-white">Consola de Super Administrador</h2>
          <p class="text-xs text-amber-400 font-mono mt-1 uppercase tracking-wider">SNC v3 · Acceso Total Multi-Perfil</p>
        </div>
        <form id="admin-login-form" class="space-y-4 text-xs">
          <div>
            <label class="block font-medium text-gray-300 mb-1">Correo Electrónico</label>
            <input type="email" id="admin-email" required autocomplete="email"
              class="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
              placeholder="superadmin@snc.gov.py">
          </div>
          <div>
            <label class="block font-medium text-gray-300 mb-1">Contraseña</label>
            <input type="password" id="admin-password" required autocomplete="current-password"
              class="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
              placeholder="••••••••">
          </div>
          <div id="admin-login-error" class="hidden text-xs text-red-400 bg-red-900/30 border border-red-700/50 rounded-lg px-3 py-2"></div>
          <button type="submit" class="w-full py-2.5 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-lg transition-colors shadow-lg shadow-amber-600/30">
            Ingresar a la Consola Master
          </button>
        </form>
      </div>`;
    document.body.appendChild(overlay);
    overlay.querySelector('#admin-login-form').addEventListener('submit', handleLogin);
  }
  overlay.classList.remove('hidden');
  overlay.style.display = 'flex';
}

export function hideLoginOverlay() {
  const overlay = document.getElementById('admin-login-overlay');
  if (overlay) {
    overlay.style.display = 'none';
    overlay.classList.add('hidden');
  }
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
    if (!['admin', 'superadmin', 'soporte_plataforma'].includes(data.user?.role)) {
      throw new Error('Este usuario no cuenta con privilegios de Administrador o Super Administrador');
    }
    setToken(data.token);
    localStorage.setItem('snc_api_user', JSON.stringify(data.user));
    hideLoginOverlay();
    loadDashboard();
    showToast('Sesión de Super Administrador iniciada', 'success');
  } catch (err) {
    errorEl.textContent = err.message;
    errorEl.classList.remove('hidden');
  }
}

// ============================================================
// TOAST NOTIFICATIONS
// ============================================================
export function showToast(msg, type = 'info') {
  const container = document.getElementById('toastContainer');
  if (!container) return;
  const colors = {
    success: 'bg-emerald-600 border-emerald-500',
    error: 'bg-red-600 border-red-500',
    warning: 'bg-amber-600 border-amber-500',
    info: 'bg-blue-600 border-blue-500',
  };
  const el = document.createElement('div');
  el.className = `${colors[type] || colors.info} border text-white text-xs font-semibold px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2 transform transition-all duration-300 translate-y-2 opacity-0`;
  el.innerHTML = `<span>${type === 'success' ? '✓' : type === 'error' ? '✕' : 'ℹ'}</span> <span>${msg}</span>`;
  container.appendChild(el);
  requestAnimationFrame(() => {
    el.classList.remove('translate-y-2', 'opacity-0');
  });
  setTimeout(() => {
    el.classList.add('opacity-0', 'translate-y-2');
    setTimeout(() => el.remove(), 300);
  }, 4000);
}

// ============================================================
// DATOS MAESTROS (PENDIENTES DE INTEGRACIÓN CON BACKEND)
// ============================================================
// No existen endpoints /api/admin/profesionales, /api/admin/notarios ni un
// listado global de expedientes. Mientras no se implementen, las tablas
// correspondientes deben mostrar un estado vacío explícito: nunca datos
// inventados presentados como si fueran reales (Res. SNC 551/2023).

// ============================================================
// DASHBOARD & CARGA DE LOS 3 PILARES
// ============================================================
export async function loadDashboard() {
  const user = JSON.parse(localStorage.getItem('snc_api_user') || '{}');
  const emailEl = document.getElementById('userEmail');
  if (emailEl && user.email) emailEl.textContent = user.email;

  // Carga de contadores
  try {
    const [members, plans] = await Promise.all([
      fetchJSON('/api/admin/members').catch(() => []),
      fetchJSON('/api/admin/plans').catch(() => []),
    ]);
    const membersList = Array.isArray(members) ? members : (members.data || []);
    const plansList = Array.isArray(plans) ? plans : (plans.data || []);

    const countPros = membersList.filter(u => u.role === 'professional').length;
    const countNotaries = membersList.filter(u => u.role === 'notary').length;

    setText('dashProfessionals', String(countPros));
    setText('dashMunicipalities', '1 (Piribebuy)');
    setText('dashNotaries', String(countNotaries));
    setText('dashExpedientes', '—');

    renderMembersTable(membersList);
    renderPlansTable(plansList);
  } catch (e) {
    console.warn('[superadmin] métricas dashboard:', e.message);
  }

  // Cargar tablas de los 3 pilares
  renderProfesionalesTable();
  renderNotariosTable();
  renderExpedientesTable();

  // Iniciar mapa
  loadPiribebuyMap();
}

function setText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

// ============================================================
// PILAR 1: PROFESIONAL (AGRIMENSURA)
// ============================================================
function renderProfesionalesTable() {
  const tbody = document.getElementById('profesionalesTable');
  if (!tbody) return;

  tbody.innerHTML = `<tr><td colspan="6" class="px-4 py-6 text-center text-gray-500 text-xs">
    Registro de profesionales aún no conectado a un backend (sin endpoint /api/admin/profesionales). No hay datos para mostrar.
  </td></tr>`;
}

// ============================================================
// PILAR 2: MUNICIPAL (LEY 3966)
// ============================================================
export async function publicarParcelasCiudadano() {
  const btn = document.getElementById('btnPublicarPiribebuy');
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<span>⏳</span> Publicando...';
  }
  try {
    const res = await fetchJSON('/api/municipal/piribebuy/publicar', {
      method: 'POST',
      body: JSON.stringify({
        nombre: 'Municipalidad de Piribebuy',
        departamento: 'Cordillera',
        distrito: '0306'
      })
    });
    showToast('¡Parcelas de Piribebuy publicadas con éxito en el Portal Ciudadano!', 'success');
  } catch (err) {
    showToast(`Aviso: ${err.message}`, 'info');
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = '<span>ðŸš€</span> Publicar Parcelas a Ciudadanos';
    }
  }
}

// ============================================================
// PILAR 3: NOTARIAL (ESCRIBANÍAS / RUN)
// ============================================================
function renderNotariosTable() {
  const tbody = document.getElementById('notariosTable');
  if (!tbody) return;

  tbody.innerHTML = `<tr><td colspan="5" class="px-4 py-6 text-center text-gray-500 text-xs">
    Registro de escribanías aún no conectado a un backend (sin endpoint /api/admin/notarios). No hay datos para mostrar.
  </td></tr>`;
}

// ============================================================
// EXPEDIENTES B2B2G
// ============================================================
function renderExpedientesTable() {
  const tbody = document.getElementById('expedientesTable');
  if (!tbody) return;

  tbody.innerHTML = `<tr><td colspan="6" class="px-4 py-6 text-center text-gray-500 text-xs">
    Listado global de expedientes B2B2G aún no conectado a un backend (la API de expedientes existe por proyecto en /api/projects/:id/expedientes, pero no hay endpoint agregado de administración). No hay datos para mostrar.
  </td></tr>`;
}

// ============================================================
// USUARIOS Y MIEMBROS GLOBALES
// ============================================================
function renderMembersTable(members) {
  const tbody = document.getElementById('membersTable');
  if (!tbody) return;

  if (!members || members.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="px-4 py-6 text-center text-gray-500">No hay usuarios registrados.</td></tr>`;
    return;
  }

  tbody.innerHTML = members.map(u => `
    <tr class="hover:bg-gray-800/40 transition-colors">
      <td class="px-4 py-3">
        <div class="font-bold text-white">${u.name || 'Usuario'}</div>
        <div class="text-[11px] text-gray-400 font-mono">${u.email}</div>
      </td>
      <td class="px-4 py-3"><span class="px-2 py-0.5 rounded bg-gray-800 text-amber-300 border border-gray-700 font-mono text-[10px]">${u.plan || 'free'}</span></td>
      <td class="px-4 py-3">
        <span class="px-2 py-0.5 rounded-full text-[10px] font-bold ${u.role === 'superadmin' ? 'bg-red-500/20 text-red-300 border border-red-500/30' : u.role === 'admin' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : u.role === 'admin_municipal' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : u.role === 'admin_notarial' ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' : u.role === 'professional' ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' : u.role === 'notary' ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' : u.role === 'soporte_plataforma' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' : 'bg-gray-700 text-gray-300'}">
          ${u.role}
        </span>
      </td>
      <td class="px-4 py-3">
        <span class="px-2 py-0.5 rounded-full text-[10px] font-semibold ${u.status === 'active' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}">
          ${u.status}
        </span>
      </td>
      <td class="px-4 py-3 text-gray-300">${u.projects_count || 0}</td>
      <td class="px-4 py-3 text-gray-400 font-mono text-[11px]">${(u.created_at || '').slice(0, 10) || '2026-10-22'}</td>
      <td class="px-4 py-3 text-right pr-4 space-x-2">
        <button onclick="window.editarUsuario('${u.id}')" class="px-2 py-1 bg-gray-800 hover:bg-gray-700 text-amber-300 rounded text-[11px] border border-gray-700 transition">
          Editar
        </button>
      </td>
    </tr>
  `).join('');
}

// ============================================================
// PLANES & FINANZAS
// ============================================================
function renderPlansTable(plans) {
  const tbody = document.getElementById('plansTable');
  if (!tbody) return;

  if (!plans || plans.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" class="px-4 py-6 text-center text-gray-500">No hay planes configurados.</td></tr>`;
    return;
  }

  tbody.innerHTML = plans.map(p => `
    <tr class="hover:bg-gray-800/40 transition-colors">
      <td class="px-4 py-3 font-mono text-amber-400">${p.id}</td>
      <td class="px-4 py-3 font-bold text-white">${p.name}</td>
      <td class="px-4 py-3 text-gray-300">${p.type}</td>
      <td class="px-4 py-3 font-semibold text-emerald-400 font-mono">${Number(p.price || 0).toLocaleString('es-PY')} PYG</td>
      <td class="px-4 py-3 text-gray-300">${p.limit_projects || 'Ilimitado'}</td>
      <td class="px-4 py-3 text-gray-300">${p.limit_expedientes || 'Ilimitado'}</td>
      <td class="px-4 py-3">
        <span class="px-2 py-0.5 rounded-full text-[10px] font-semibold ${p.active ? 'bg-emerald-500/20 text-emerald-300' : 'bg-red-500/20 text-red-300'}">
          ${p.active ? 'Activo' : 'Inactivo'}
        </span>
      </td>
      <td class="px-4 py-3 text-right pr-4">
        <button class="px-2 py-1 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded text-[11px] border border-gray-700 transition">Configurar</button>
      </td>
    </tr>
  `).join('');
}

// ============================================================
// VISOR DE CAPAS TERRITORIALES (LEAFLET GIS)
// ============================================================
let adminMap = null;
const adminLayers = {};

async function loadPiribebuyMap() {
  const mapContainer = document.getElementById('admin-map');
  if (!mapContainer) return;

  if (!adminMap) {
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

    adminMap = L.map('admin-map', { center: [-26.85790, -58.30369], zoom: 16 });
    window.SNCMapa = adminMap;   // lo usa el paquete Visor catastral Premium (js/visorPremium.js)
    const baseLayers = {
      osm: L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors · SNC v3 Super Admin GIS', maxZoom: 19,
      }),
      satellite: L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        attribution: '© Esri', maxZoom: 19,
      }),
      humanitarian: L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
        attribution: '© Humanitarian OSM', maxZoom: 19,
      }),
      catastro: L.tileLayer.wms('https://www.catastro.gov.py/geoserver/ows', {
        layers: 'snc:parcelas_activas', format: 'image/png8', transparent: true,
        CRS: 'CRS:84', attribution: '© SNC Paraguay',
      }),
      carto_dark: L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '© OpenStreetMap, © CARTO', maxZoom: 19,
      }),
      topo: L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenTopoMap (CC-BY-SA)', maxZoom: 17,
      }),
    };
    baseLayers.osm.addTo(adminMap);
    adminMap._sncBaseLayers = baseLayers;
    adminMap.setBaseLayer = function (name) {
      if (!baseLayers[name]) return false;
      Object.values(baseLayers).forEach(l => adminMap.removeLayer(l));
      baseLayers[name].addTo(adminMap);
      return true;
    };

    // Selector de mapa base hamburguesa (flotante derecha-arriba)
    if (!document.getElementById('map-base-selector')) {
      const selector = document.createElement('div');
      selector.id = 'map-base-selector';
      selector.className = 'absolute right-3 top-3 z-[1000]';
      selector.setAttribute('aria-label', 'Tipos de mapas');
      selector.innerHTML = `
          <button id="map-base-menu-toggle" class="map-selector-btn map-base-menu-toggle" type="button" aria-expanded="false" aria-controls="map-base-menu" title="Tipos de mapas y capas" aria-label="Tipos de mapas y capas"><i class="fas fa-bars" aria-hidden="true"></i></button>
          <div id="map-base-menu" class="map-base-menu" hidden>
            <div class="map-menu-section" role="radiogroup" aria-label="Mapa base">
              <span class="map-menu-heading">Mapa base</span>
              <button type="button" class="map-selector-btn active" data-layer="osm" title="OpenStreetMap (por defecto)" role="radio" aria-checked="true"><i class="fas fa-map" aria-hidden="true"></i><span>OpenStreetMap</span></button>
              <button type="button" class="map-selector-btn" data-layer="satellite" title="Satélite Esri" role="radio" aria-checked="false"><i class="fas fa-satellite" aria-hidden="true"></i><span>Satélite Esri</span></button>
              <button type="button" class="map-selector-btn" data-layer="humanitarian" title="Humanitario OpenStreetMap" role="radio" aria-checked="false"><i class="fas fa-hand-holding-heart" aria-hidden="true"></i><span>Humanitario</span></button>
              <button type="button" class="map-selector-btn" data-layer="catastro" title="SNC Catastro oficial" role="radio" aria-checked="false"><i class="fas fa-landmark" aria-hidden="true"></i><span>SNC</span></button>
              <button type="button" class="map-selector-btn" data-layer="carto_dark" title="Oscuro CartoDB" role="radio" aria-checked="false"><i class="fas fa-moon" aria-hidden="true"></i><span>Oscuro</span></button>
              <button type="button" class="map-selector-btn" data-layer="topo" title="Topográfico OpenTopoMap" role="radio" aria-checked="false"><i class="fas fa-mountain" aria-hidden="true"></i><span>Topográfico</span></button>
            </div>
          </div>`;
      mapContainer.style.position = 'relative';
      mapContainer.appendChild(selector);
      window._adminMap = adminMap;
      if (typeof window.BasemapMenu?.init === 'function') {
        window.BasemapMenu.init();
      }
    }
  }

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
      btn.className = 'px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all';
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
            const carpetaCapa = { barrios: 'base', vias: 'base', hidro: 'base', vertedero: 'vertedero', centro: 'vertedero', casco_historico: 'casco' }[layer.id];
            const res = await fetch(`/data/municipal/piribebuy/${carpetaCapa}/${layer.id}.geojson`);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const gj = await res.json();
            const isPoint = gj.features?.some(f => f.geometry?.type === 'Point');
            adminLayers[layer.id] = isPoint
              ? L.geoJSON(gj, { pointToLayer: (_, ll) => L.circleMarker(ll, { color: layer.color, radius: 6 }) }).addTo(adminMap)
              : L.geoJSON(gj, { style: { color: layer.color, weight: 2, fillOpacity: 0.2 } }).addTo(adminMap);
            btn.style.background = layer.color + '33';
            btn.style.opacity = '1';
          } catch (e) {
            showToast(`Capa ${layer.label}: ${e.message}`, 'error');
          }
        }
      };
      btn.style.opacity = '0.5';
      toggleContainer.appendChild(btn);
    });
  }
}

// ============================================================
// NAVEGACIÓN ENTRE PESTAÑAS
// ============================================================
export function switchTab(tabName) {
  const tabs = document.querySelectorAll('.tab-btn');
  const panels = document.querySelectorAll('.tab-panel');

  tabs.forEach(b => {
    const isTarget = b.dataset.tab === tabName;
    b.setAttribute('aria-selected', isTarget ? 'true' : 'false');
    if (isTarget) {
      b.classList.add('bg-gray-900', 'text-amber-400', 'border-b-2', 'border-amber-400');
      b.classList.remove('text-gray-400');
    } else {
      b.classList.remove('bg-gray-900', 'text-amber-400', 'border-b-2', 'border-amber-400');
      b.classList.add('text-gray-400');
    }
  });

  panels.forEach(p => {
    p.classList.remove('active');
    if (p.id === `panel-${tabName}`) {
      p.classList.add('active');
    }
  });

  if (tabName === 'dashboard' && adminMap) {
    setTimeout(() => adminMap.invalidateSize(), 200);
  }
}
window.switchTab = switchTab;

function setupTabs() {
  const tabs = document.querySelectorAll('.tab-btn');
  tabs.forEach(btn => {
    btn.addEventListener('click', () => {
      switchTab(btn.dataset.tab);
      if (btn.dataset.tab === 'dependencias') loadDependencias();
      if (btn.dataset.tab === 'map-layout') initMapLayoutAdminTab();
      if (btn.dataset.tab === 'vep-metrics') loadVepMetricsTab();
    });
  });
}

// ============================================================
// MODAL DE USUARIO
// ============================================================
function setupModals() {
  const modal = document.getElementById('memberModal');
  const openBtn = document.getElementById('createMemberBtn');
  const closeBtn = document.getElementById('closeMemberModal');
  const cancelBtn = document.getElementById('cancelMemberModal');
  const form = document.getElementById('memberForm');

  if (openBtn && modal) {
    openBtn.addEventListener('click', () => {
      form.reset();
      document.getElementById('memberId').value = '';
      document.getElementById('memberModalTitle').textContent = 'Nuevo Usuario / Miembro';
      modal.classList.remove('hidden');
      modal.classList.add('flex');
    });
  }

  const closeModal = () => {
    if (modal) {
      modal.classList.add('hidden');
      modal.classList.remove('flex');
    }
  };

  if (closeBtn) closeBtn.addEventListener('click', closeModal);
  if (cancelBtn) cancelBtn.addEventListener('click', closeModal);

  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const id = document.getElementById('memberId').value;
      const name = document.getElementById('memberName').value.trim();
      const email = document.getElementById('memberEmail').value.trim().toLowerCase();
      const password = document.getElementById('memberPassword').value;
      const role = document.getElementById('memberRole').value;
      const status = document.getElementById('memberStatus').value;
      const plan = document.getElementById('memberPlan').value;

      try {
        if (id) {
          await fetchJSON(`/api/admin/members/${id}`, {
            method: 'PATCH',
            body: JSON.stringify({ name, role, status, plan })
          });
          showToast('Usuario actualizado exitosamente', 'success');
        } else {
          await fetchJSON('/api/admin/members', {
            method: 'POST',
            body: JSON.stringify({ name, email, password, role, status, plan })
          });
          showToast('Usuario creado exitosamente', 'success');
        }
        closeModal();
        loadDashboard();
      } catch (err) {
        showToast(err.message, 'error');
      }
    });
  }

  // Botón publicar Piribebuy
  const pubBtn = document.getElementById('btnPublicarPiribebuy');
  if (pubBtn) {
    pubBtn.addEventListener('click', publicarParcelasCiudadano);
  }
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
      showToast('Sesión de Super Administrador finalizada', 'info');
    });
  }
}

// ============================================================
// DEPENDENCIAS MUNICIPALES (jerarquía con sub-dependencias)
// ============================================================
const DEPARTAMENTOS = {
  super_admin:     { label: 'Super Administrador',  icon: '⭐', color: 'text-yellow-400', dictamen: true,  secciones: ['*'], parent: null, capas: ['todas'] },
  notarial:        { label: 'Notarial',             icon: 'ðŸ“œ', color: 'text-slate-400',  dictamen: false, secciones: ['municipal-status','qgis-layer-control'], parent: null, capas: ['parcelas','distritos'] },
  junta_municipal: { label: 'Junta Municipal',      icon: 'ðŸ›️', color: 'text-red-400',    dictamen: false, secciones: ['municipal-status','qgis-layer-control'], parent: null, capas: ['barrios','zona_influencia','distritos'] },
  catastro:        { label: 'Catastro',             icon: 'ðŸ“', color: 'text-blue-400',   dictamen: true,  secciones: ['municipal-status','qgis-layer-control','fraccionamiento','balance-sidebar','loteamiento','ambiental','symbology','dictamen'], parent: 'junta_municipal', capas: ['parcelas','sample_fraccionamiento_municipal','barrios','curvas_nivel'] },
  ambiental:       { label: 'Ambiental',            icon: 'ðŸŒ¿', color: 'text-green-400',  dictamen: false, secciones: ['municipal-status','qgis-layer-control','ambiental'], parent: 'junta_municipal', capas: ['hidro','vertedero','vertedero_500','vertedero_1000','cobertura_forestal'] },
  planificacion:   { label: 'Planificación',        icon: 'ðŸ“', color: 'text-purple-400', dictamen: false, secciones: ['municipal-status','qgis-layer-control','fraccionamiento','balance-sidebar','loteamiento'], parent: 'junta_municipal', capas: ['barrios','zona_influencia','sample_fraccionamiento_municipal','censo_viviendas'] },
  obras:           { label: 'Obras y Vialidad',     icon: 'ðŸš§', color: 'text-orange-400', dictamen: false, secciones: ['municipal-status','qgis-layer-control','loteamiento'], parent: 'junta_municipal', capas: ['vias','topografia_curvas'] },
  educacion:       { label: 'Educación',            icon: 'ðŸŽ“', color: 'text-cyan-400',    dictamen: false, secciones: ['municipal-status','qgis-layer-control'], parent: 'junta_municipal', capas: ['establecimientos_escolares_mec','barrios'] },
  patrimonio:      { label: 'Patrimonio',           icon: 'ðŸº', color: 'text-amber-400',  dictamen: false, secciones: ['municipal-status','qgis-layer-control'], parent: 'junta_municipal', capas: ['casco_historico','centro','vuelo_casco'] },
};

async function loadDependencias() {
  const listEl = document.getElementById('depUserList');
  if (!listEl) return;
  listEl.innerHTML = '<p class="text-gray-500 text-sm">Cargando...</p>';
  try {
    const members = await fetchJSON('/api/admin/members');
    const users = Array.isArray(members) ? members : (members.data || []);
    const porDep = {};
    users.forEach(u => {
      const deps = (u.department || '').split(',').map(d => d.trim()).filter(Boolean);
      if (!deps.length) deps.push('sin_asignar');
      deps.forEach(dep => {
        if (!porDep[dep]) porDep[dep] = [];
        porDep[dep].push(u);
      });
    });
    let html = '';
    Object.keys(DEPARTAMENTOS).forEach(depKey => {
      const info = DEPARTAMENTOS[depKey];
      const depUsers = porDep[depKey] || [];
      const parentBadge = info.parent ? ` <span class="text-[8px] text-gray-500">↳ ${DEPARTAMENTOS[info.parent]?.label || info.parent}</span>` : '';
      const dictamenBadge = info.dictamen 
        ? `<span class="text-[9px] px-1.5 py-0.5 bg-emerald-950/80 text-emerald-400 border border-emerald-700/60 rounded">Dictamen: ✅</span>`
        : `<span class="text-[9px] px-1.5 py-0.5 bg-gray-900 text-gray-500 border border-gray-800 rounded">Dictamen: ❌</span>`;
      html += `
        <div class="flex items-center justify-between p-3 bg-gray-950 rounded-lg border border-gray-800">
          <div class="flex items-center gap-3">
            <span class="text-xl">${info.icon}</span>
            <div>
              <div class="flex items-center gap-2">
                <p class="text-sm font-semibold ${info.color}">${info.label}${parentBadge}</p>
                ${dictamenBadge}
              </div>
              <p class="text-[10px] text-gray-400 mt-0.5">${info.secciones.includes('*') ? 'Acceso a todas las secciones' : info.secciones.join(', ')} · ${depUsers.length} usuario(s)</p>
              <div class="flex gap-1 mt-1 flex-wrap">
                ${(info.capas || []).map(c => `<span class="text-[9px] px-1.5 py-0.2 bg-slate-900 text-cyan-400/80 rounded border border-slate-800">ðŸ“‚ ${c}</span>`).join('')}
              </div>
            </div>
          </div>
          <div class="flex gap-1.5 flex-wrap max-w-[40%] justify-end">
            ${depUsers.map(u => `<span class="text-[10px] px-2 py-0.5 bg-gray-800 text-gray-300 rounded-full border border-gray-700">${u.name || u.email}</span>`).join('')}
          </div>
        </div>`;
    });
    const sinDep = porDep['sin_asignar'] || [];
    if (sinDep.length) {
      html += `<div class="p-3 bg-gray-950 rounded-lg border border-red-800/50">
        <p class="text-sm text-red-400">⚠️ ${sinDep.length} usuario(s) sin dependencia asignada</p>
      </div>`;
    }
    listEl.innerHTML = html || '<p class="text-gray-500 text-sm">No hay usuarios.</p>';
  } catch (e) {
    listEl.innerHTML = `<p class="text-red-400 text-sm">Error: ${e.message}</p>`;
  }
}

// ============================================================
// PANEL DE INDICADORES MUNICIPALES VEP/MEF (TAB 10)
// Consume GET /api/admin/metrics/vep (js/vepMetrics.js del lado servidor).
// Ningún número se inventa en el cliente: lo que el motor marca como
// `disponible: false` se muestra tal cual, con el motivo.
// ============================================================
function formatearNumero(valor, decimales = 0) {
  if (typeof valor !== 'number' || !Number.isFinite(valor)) return '—';
  return valor.toLocaleString('es-PY', { maximumFractionDigits: decimales, minimumFractionDigits: decimales });
}

function renderVepReportingCards(reporting) {
  const cards = [
    { label: 'Parcelas evaluadas', valor: formatearNumero(reporting.totalParcelas) },
    { label: 'Superficie total', valor: `${formatearNumero(reporting.superficieTotalHa, 2)} ha` },
    { label: 'Distritos representados', valor: formatearNumero(reporting.distritosRepresentados) },
    { label: 'Matrículas verificadas', valor: formatearNumero(reporting.matriculas.verificadas) },
    { label: 'Propietarios únicos', valor: formatearNumero(reporting.propietarios.personasUnicas) },
    { label: 'Parcelas sin propietario', valor: formatearNumero(reporting.propietarios.parcelasSinPropietario) }
  ];
  return cards.map(c => `
    <div class="bg-gray-900 border border-gray-800 rounded-xl p-4 text-center">
      <div class="text-2xl font-bold text-white">${c.valor}</div>
      <div class="text-[10px] text-gray-400 mt-1 uppercase tracking-wide">${c.label}</div>
    </div>`).join('');
}

function renderVepIndicadoresLista(indicadores) {
  return Object.entries(indicadores).map(([codigo, info]) => {
    if (info.disponible === false) {
      return `<div class="flex items-start gap-2 text-gray-500">
        <span class="text-gray-600 shrink-0">${codigo}</span>
        <span>no disponible — ${info.motivo}</span>
      </div>`;
    }
    const valor = typeof info.valor === 'number' ? `${formatearNumero(info.valor, 2)} ${info.unidad || ''}`.trim() : JSON.stringify(info.valor);
    return `<div class="flex items-start gap-2 text-emerald-400">
      <span class="shrink-0">${codigo}</span>
      <span>${info.nombre || ''} = <strong>${valor}</strong></span>
    </div>`;
  }).join('');
}

function renderVepDatosTabla(parcelas = []) {
  if (!parcelas.length) return '<tr><td colspan="6" class="py-3 text-gray-500">Sin parcelas sincronizadas todavía.</td></tr>';
  const estadoColor = (estado) => estado === 'VERIFICADA' ? 'text-emerald-400' : estado === 'SIN_VERIFICAR' ? 'text-amber-400' : 'text-gray-500';
  return parcelas.map(p => `
    <tr class="border-b border-gray-900">
      <td class="py-1.5 pr-3 font-mono">${p.codigo || '—'}</td>
      <td class="py-1.5 pr-3">${p.departamento || '—'}</td>
      <td class="py-1.5 pr-3">${p.distrito || '—'}</td>
      <td class="py-1.5 pr-3">${formatearNumero(p.superficie_m2, 1)}</td>
      <td class="py-1.5 pr-3 ${estadoColor(p.matricula_estado)}">${p.matricula_estado}</td>
      <td class="py-1.5 pr-3">${p.propietarios}</td>
    </tr>`).join('');
}

function renderBarra(label, valor, total, colorClass) {
  const pct = total > 0 ? Math.round((valor / total) * 100) : 0;
  return `
    <div>
      <div class="flex justify-between text-[11px] text-gray-400 mb-1">
        <span>${label}</span><span>${formatearNumero(valor)} (${pct}%)</span>
      </div>
      <div class="h-2 bg-gray-950 rounded-full border border-gray-800 overflow-hidden">
        <div class="${colorClass} h-full" style="width:${pct}%"></div>
      </div>
    </div>`;
}

function renderVepAnalisis(reporting) {
  const totalParcelas = reporting.totalParcelas || 0;
  const m = reporting.matriculas;
  document.getElementById('vepAnalisisMatriculas').innerHTML =
    renderBarra('Verificadas', m.verificadas, totalParcelas, 'bg-emerald-500') +
    renderBarra('Sin verificar', m.sinVerificar, totalParcelas, 'bg-amber-500') +
    renderBarra('Sin registrar', m.sinRegistrar, totalParcelas, 'bg-gray-600');
  const p = reporting.propietarios;
  document.getElementById('vepAnalisisPropietarios').innerHTML =
    renderBarra('Con propietario registrado', p.parcelasConPropietario, totalParcelas, 'bg-sky-500') +
    renderBarra('Sin propietario registrado', p.parcelasSinPropietario, totalParcelas, 'bg-gray-600');
}

const VEP_PERFIL_LABEL = {
  catastro: { label: 'Catastro', clase: 'border-amber-500/50 text-amber-300 bg-amber-500/10' },
  notarial: { label: 'Notarial', clase: 'border-purple-500/50 text-purple-300 bg-purple-500/10' },
  ambiental: { label: 'Ambiental', clase: 'border-emerald-500/50 text-emerald-300 bg-emerald-500/10' },
  municipal: { label: 'Municipal', clase: 'border-gray-600 text-gray-300 bg-gray-800' }
};

function renderVepPerfilBadge(perfil) {
  const badge = document.getElementById('vepPerfilBadge');
  if (!badge) return;
  const info = VEP_PERFIL_LABEL[perfil];
  if (!info) { badge.classList.add('hidden'); return; }
  badge.textContent = info.label;
  badge.className = `px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide rounded-full border ${info.clase}`;
}

// Oculta del selector las vistas que la respuesta del servidor no trajo
// (M-13: recorte real hecho en el servidor, no solo un botón deshabilitado).
function aplicarSeccionesVisibles(secciones = []) {
  document.querySelectorAll('.vep-view-btn').forEach(btn => {
    const visible = secciones.includes(btn.dataset.vepView);
    btn.classList.toggle('hidden', !visible);
  });
  // Si la vista activa quedó oculta, caer a "resumen" (siempre presente).
  const activa = document.querySelector('.vep-view-btn.active');
  if (activa && activa.classList.contains('hidden')) setVepView('resumen');
}

function renderVepNotarial(matriculasPendientes) {
  const bloque = document.getElementById('vepBloqueNotarial');
  if (!bloque) return;
  if (!Array.isArray(matriculasPendientes)) { bloque.classList.add('hidden'); return; }
  bloque.classList.remove('hidden');
  const tbody = document.getElementById('vepNotarialTabla');
  tbody.innerHTML = matriculasPendientes.length
    ? matriculasPendientes.map(f => `
        <tr class="border-b border-gray-900">
          <td class="py-1.5 pr-3 font-mono">${f.codigo || '—'}</td>
          <td class="py-1.5 pr-3">${f.distrito || '—'}</td>
          <td class="py-1.5 pr-3">${f.propietarios}</td>
        </tr>`).join('')
    : '<tr><td colspan="3" class="py-3 text-gray-500">Sin matrículas pendientes — todas verificadas o sin registrar.</td></tr>';
}

function renderVepAmbiental(porTipo) {
  const bloque = document.getElementById('vepBloqueAmbiental');
  if (!bloque) return;
  if (!porTipo) { bloque.classList.add('hidden'); return; }
  bloque.classList.remove('hidden');
  const entradas = Object.entries(porTipo);
  document.getElementById('vepAnalisisAmbiental').innerHTML = entradas.length
    ? entradas.map(([tipo, n]) => `<div class="flex justify-between"><span>${tipo}</span><strong>${formatearNumero(n)}</strong></div>`).join('')
    : '<p class="text-gray-500">Sin restricciones ambientales activas cargadas todavía.</p>';
}

function renderVepAdministracion() {
  let user = {};
  try { user = JSON.parse(localStorage.getItem('snc_api_user') || '{}'); } catch { /* ignore */ }
  document.getElementById('vepAdminSesion').innerHTML = `
    <div><strong>Usuario:</strong> ${user.email || '—'}</div>
    <div><strong>Rol:</strong> <span class="text-amber-400">${user.role || '—'}</span></div>`;
}

function setVepView(view) {
  document.querySelectorAll('.vep-view-btn').forEach(btn => {
    const active = btn.dataset.vepView === view;
    btn.classList.toggle('active', active);
    btn.classList.toggle('bg-amber-500/10', active);
    btn.classList.toggle('border-amber-500/50', active);
    btn.classList.toggle('text-amber-300', active);
    btn.classList.toggle('border-gray-800', !active);
    btn.classList.toggle('bg-gray-950', !active);
    btn.classList.toggle('text-gray-400', !active);
  });
  document.querySelectorAll('.vep-view').forEach(panel => {
    panel.classList.toggle('hidden', panel.id !== `vepView-${view}`);
  });
}

function setupVepViewSelector() {
  document.querySelectorAll('.vep-view-btn').forEach(btn => {
    btn.onclick = () => setVepView(btn.dataset.vepView);
  });
}

export async function loadVepMetricsTab() {
  const loadingEl = document.getElementById('vepMetricsLoading');
  const contentEl = document.getElementById('vepMetricsContent');
  const errorEl = document.getElementById('vepMetricsError');
  if (!loadingEl || !contentEl || !errorEl) return;
  loadingEl.classList.remove('hidden');
  contentEl.classList.add('hidden');
  errorEl.classList.add('hidden');
  try {
    const data = await fetchJSON('/api/admin/metrics/vep');
    // Vista Resumen
    document.getElementById('vepReportingCards').innerHTML = renderVepReportingCards(data.reportingBasico);
    const cat01 = data.indicadores?.['IND-CAT-01'];
    if (cat01?.disponible === false) {
      document.getElementById('vepIndCat01').textContent = 'No disponible';
      document.getElementById('vepIndCat01Nota').textContent = cat01.motivo;
    } else if (cat01) {
      document.getElementById('vepIndCat01').textContent = `${formatearNumero(cat01.valor, 1)} %`;
      document.getElementById('vepIndCat01Nota').textContent = `Meta VEP: ≥ ${cat01.metaVEP}% · ${cat01.aproximacion}`;
    }
    if (data.indicadores) document.getElementById('vepIndicadoresLista').innerHTML = renderVepIndicadoresLista(data.indicadores);
    // Vista Datos (solo si el servidor la mandó para este perfil)
    if (data.parcelas) document.getElementById('vepDatosTabla').innerHTML = renderVepDatosTabla(data.parcelas);
    // Vista Análisis (reportingBasico viaja siempre que "resumen" esté — todos los perfiles la tienen)
    if (data.reportingBasico) renderVepAnalisis(data.reportingBasico);
    // Insumos propios por perfil (M-13): solo se renderizan/muestran si el
    // servidor los mandó — ausentes para los perfiles que no corresponden.
    renderVepNotarial(data.matriculasPendientes);
    renderVepAmbiental(data.restriccionesAmbientalesPorTipo);
    // Vista Administración
    renderVepPerfilBadge(data.perfil);
    renderVepAdministracion();
    aplicarSeccionesVisibles(data.secciones || []);

    loadingEl.classList.add('hidden');
    contentEl.classList.remove('hidden');
  } catch (e) {
    loadingEl.classList.add('hidden');
    errorEl.classList.remove('hidden');
    errorEl.textContent = `No se pudieron cargar los indicadores: ${e.message}`;
  }
  setupVepViewSelector();
  const btnRefresh = document.getElementById('refreshVepMetrics');
  if (btnRefresh) btnRefresh.onclick = () => loadVepMetricsTab();
}

// ============================================================
// INIT PRINCIPAL
// ============================================================

// ============================================================
// PANEL DE CONTROL DE DISPOSICIÓN DE MAPAS Y WIDGETS (TAB 9)
// ============================================================
let currentLayoutPortal = 'profesional';

export function initMapLayoutAdminTab() {
  const portalBtns = document.querySelectorAll('#layoutPortalSelector .layout-portal-btn');
  portalBtns.forEach(btn => {
    btn.onclick = () => {
      portalBtns.forEach(b => {
        b.classList.remove('active', 'bg-amber-500/10', 'border-amber-500/50', 'text-amber-300');
        b.classList.add('border-gray-800', 'bg-gray-950', 'text-gray-400');
      });
      btn.classList.add('active', 'bg-amber-500/10', 'border-amber-500/50', 'text-amber-300');
      btn.classList.remove('border-gray-800', 'bg-gray-950', 'text-gray-400');
      currentLayoutPortal = btn.dataset.portal;
      renderLayoutAdminView();
    };
  });

  const btnSave = document.getElementById('btnSaveMapLayout');
  if (btnSave) {
    btnSave.onclick = () => {
      const cfg = readCurrentLayoutConfigFromUI();
      if (window.MapLayoutManager?.saveLayout) {
        window.MapLayoutManager.saveLayout(currentLayoutPortal, cfg);
        showToast(`Disposición guardada exitosamente para ${currentLayoutPortal.toUpperCase()}`, 'success');
        renderLayoutAdminView();
      }
    };
  }

  const btnSaveGlobal = document.getElementById('btnSaveGlobalLayout');
  if (btnSaveGlobal) {
    btnSaveGlobal.onclick = () => {
      const cfg = readCurrentLayoutConfigFromUI();
      if (window.MapLayoutManager?.portals) {
        window.MapLayoutManager.portals.forEach(p => {
          window.MapLayoutManager.saveLayout(p.id, cfg, false);
        });
        localStorage.setItem('snc_map_layout_global', JSON.stringify(cfg));
        showToast('Disposición global aplicada a TODOS los portales', 'success');
        renderLayoutAdminView();
      }
    };
  }

  const btnReset = document.getElementById('btnResetMapLayout');
  if (btnReset) {
    btnReset.onclick = () => {
      if (window.MapLayoutManager?.resetLayout) {
        window.MapLayoutManager.resetLayout(currentLayoutPortal);
        showToast(`Valores por defecto restaurados para ${currentLayoutPortal.toUpperCase()}`, 'info');
        renderLayoutAdminView();
      }
    };
  }

  renderLayoutAdminView();
}

function readCurrentLayoutConfigFromUI() {
  const catalog = window.MapLayoutManager?.catalog || {};
  const cfg = {};
  Object.keys(catalog).forEach(id => {
    const visInput = document.getElementById(`widget-vis-${id}`);
    const posSelect = document.getElementById(`widget-pos-${id}`);
    cfg[id] = {
      id: id,
      visible: visInput ? visInput.checked : true,
      position: posSelect ? posSelect.value : (catalog[id].defaultPosition || 'top-left'),
      order: catalog[id].defaultOrder || 1
    };
  });
  return cfg;
}

function renderLayoutAdminView() {
  const badge = document.getElementById('simulatorPortalBadge');
  if (badge) {
    badge.textContent = `Portal: ${currentLayoutPortal.toUpperCase()}`;
  }

  const catalog = window.MapLayoutManager?.catalog || {};
  const positions = window.MapLayoutManager?.positions || [];
  const layout = window.MapLayoutManager?.getLayout ? window.MapLayoutManager.getLayout(currentLayoutPortal) : {};

  // 1. Renderizar lista de widgets en el panel derecho
  const listEl = document.getElementById('widgetsConfigList');
  if (listEl) {
    listEl.innerHTML = Object.values(catalog).map(w => {
      const itemCfg = layout[w.id] || { visible: w.defaultVisible, position: w.defaultPosition };
      const isChecked = itemCfg.visible !== false;

      const posOptions = positions.map(p => `
        <option value="${p.id}" ${itemCfg.position === p.id ? 'selected' : ''}>${p.label}</option>
      `).join('');

      return `
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-gray-950 border border-gray-800 rounded-xl hover:border-gray-700 transition" data-widget-card="${w.id}">
          <div class="flex items-center gap-3">
            <div class="w-9 h-9 rounded-lg bg-gray-900 border border-gray-800 flex items-center justify-center text-amber-400 text-sm shrink-0">
              <i class="fas ${w.icon}"></i>
            </div>
            <div>
              <div class="flex items-center gap-2">
                <span class="text-xs font-bold text-white">${w.name}</span>
                <span class="text-[10px] font-mono px-1.5 py-0.2 rounded ${isChecked ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' : 'bg-red-500/10 text-red-400 border border-red-500/30'}">
                  ${isChecked ? 'Activo' : 'Oculto'}
                </span>
              </div>
              <p class="text-[10px] text-gray-400">${w.description}</p>
            </div>
          </div>

          <div class="flex items-center gap-3 shrink-0 self-end sm:self-center">
            <!-- Selector de Posición -->
            <div class="flex flex-col">
              <label class="text-[9px] uppercase tracking-wider text-gray-500 font-bold mb-0.5">Ubicación</label>
              <select id="widget-pos-${w.id}" class="bg-gray-900 border border-gray-700 text-gray-200 text-xs rounded-lg px-2.5 py-1.5 focus:ring-1 focus:ring-amber-500 focus:outline-none">
                ${posOptions}
              </select>
            </div>

            <!-- Switch Visible -->
            <div class="flex flex-col items-center">
              <label class="text-[9px] uppercase tracking-wider text-gray-500 font-bold mb-0.5">Visible</label>
              <label class="relative inline-flex items-center cursor-pointer mt-0.5">
                <input type="checkbox" id="widget-vis-${w.id}" class="sr-only peer" ${isChecked ? 'checked' : ''}>
                <div class="w-8 h-4 bg-gray-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-emerald-600"></div>
              </label>
            </div>
          </div>
        </div>
      `;
    }).join('');

    // Escuchadores de cambio en tiempo real para reflejar en el simulador
    Object.keys(catalog).forEach(id => {
      const visInput = document.getElementById(`widget-vis-${id}`);
      const posSelect = document.getElementById(`widget-pos-${id}`);
      if (visInput) visInput.onchange = updateSimulatorVisual;
      if (posSelect) posSelect.onchange = updateSimulatorVisual;
    });
  }

  // 2. Actualizar el simulador de cuadrantes visual
  updateSimulatorVisual();
}

function updateSimulatorVisual() {
  const catalog = window.MapLayoutManager?.catalog || {};
  const currentCfg = readCurrentLayoutConfigFromUI();

  // Limpiar cuadrantes
  ['top-left', 'top-right', 'left-center', 'right-center', 'bottom-left', 'bottom-right'].forEach(q => {
    const el = document.querySelector(`#sim-${q} .sim-items`);
    if (el) el.innerHTML = '';
  });

  Object.entries(currentCfg).forEach(([id, cfg]) => {
    if (!cfg.visible) return; // Si está oculto no aparece en la maqueta
    const meta = catalog[id];
    if (!meta) return;

    const targetSim = document.querySelector(`#sim-${cfg.position} .sim-items`);
    if (targetSim) {
      const badge = document.createElement('span');
      badge.className = 'text-[9px] px-1.5 py-0.5 rounded font-mono flex items-center gap-1 shadow-sm border border-amber-500/30 bg-amber-500/10 text-amber-300';
      badge.innerHTML = `<i class="fas ${meta.icon}"></i> <span>${meta.name.split(' ')[0]}</span>`;
      targetSim.appendChild(badge);
    }
  });
}

export function initAdmin() {
  setupTabs();
  setupModals();
  setupLogout();

  const token = getToken();
  if (!token) {
    showLoginOverlay();
  } else {
    loadDashboard();
  }
}

export default { initAdmin };
