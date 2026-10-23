/**
 * app-admin.js â€” Panel de Super Administrador SNC v3
 * Control total de los 3 subsistemas: Profesional, Municipal, Notarial.
 * AutenticaciÃ³n JWT, gestiÃ³n de miembros, auditorÃ­a, multi-tenant y visor GIS.
 */

// ============================================================
// TOKEN & AUTENTICACIÃ“N
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
    throw new Error('SesiÃ³n expirada o no autorizada');
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
            âš¡
          </div>
          <h2 class="text-xl font-bold text-white">Consola de Super Administrador</h2>
          <p class="text-xs text-amber-400 font-mono mt-1 uppercase tracking-wider">SNC v3 Â· Acceso Total Multi-Perfil</p>
        </div>
        <form id="admin-login-form" class="space-y-4 text-xs">
          <div>
            <label class="block font-medium text-gray-300 mb-1">Correo ElectrÃ³nico</label>
            <input type="email" id="admin-email" required autocomplete="email"
              class="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
              placeholder="superadmin@snc.gov.py">
          </div>
          <div>
            <label class="block font-medium text-gray-300 mb-1">ContraseÃ±a</label>
            <input type="password" id="admin-password" required autocomplete="current-password"
              class="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
              placeholder="â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢">
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
    if (!res.ok || !data.token) throw new Error(data.error || 'Credenciales invÃ¡lidas');
    if (data.user?.role !== 'admin' && data.user?.role !== 'superadmin') {
      throw new Error('Este usuario no cuenta con privilegios de Administrador o Super Administrador');
    }
    setToken(data.token);
    localStorage.setItem('snc_api_user', JSON.stringify(data.user));
    hideLoginOverlay();
    loadDashboard();
    showToast('SesiÃ³n de Super Administrador iniciada', 'success');
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
  el.innerHTML = `<span>${type === 'success' ? 'âœ“' : type === 'error' ? 'âœ•' : 'â„¹'}</span> <span>${msg}</span>`;
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
// DATOS MAESTROS (MOCK Y PERSISTENCIA LOCAL)
// ============================================================
const PROFESIONALES_DEMO = [
  { id: 'agr-01', nombre: 'Ing. Carlos BenÃ­tez', matricula_mopc: 'MOPC-4821', registro_snc: 'SNC-892', circunscripcion: 'Capital / Central', expedientes: 6, estado: 'Habilitado' },
  { id: 'agr-02', nombre: 'Lic. MarÃ­a FernÃ¡ndez', matricula_mopc: 'MOPC-3910', registro_snc: 'SNC-741', circunscripcion: 'Cordillera (Piribebuy)', expedientes: 4, estado: 'Habilitado' },
  { id: 'agr-03', nombre: 'Top. Jorge Alcaraz', matricula_mopc: 'MOPC-5102', registro_snc: 'SNC-910', circunscripcion: 'ItapÃºa', expedientes: 2, estado: 'Habilitado' },
  { id: 'agr-04', nombre: 'Ing. Roberto GimÃ©nez', matricula_mopc: 'MOPC-2190', registro_snc: 'SNC-511', circunscripcion: 'Alto ParanÃ¡', expedientes: 0, estado: 'Suspendido' }
];

const NOTARIOS_DEMO = [
  { id: 'not-01', nombre: 'Esc. Lourdes Villalba', registro: 'NÂº 142', circunscripcion: 'Capital', minutas: 18, estado: 'Habilitada' },
  { id: 'not-02', nombre: 'Esc. Fernando Duarte', registro: 'NÂº 88', circunscripcion: 'Cordillera', minutas: 12, estado: 'Habilitada' },
  { id: 'not-03', nombre: 'Esc. Beatriz Caballero', registro: 'NÂº 205', circunscripcion: 'Central', minutas: 9, estado: 'Habilitada' },
  { id: 'not-04', nombre: 'Esc. Gustavo Mendoza', registro: 'NÂº 67', circunscripcion: 'GuairÃ¡', minutas: 4, estado: 'En AuditorÃ­a' }
];

const EXPEDIENTES_DEMO = [
  { numero: 'EXP-2026-0049', municipio: 'Piribebuy', agrimensor: 'Lic. MarÃ­a FernÃ¡ndez', notaria: 'Esc. Fernando Duarte', estado: 'Aprobado', fecha: '22/10/2026' },
  { numero: 'EXP-2026-0048', municipio: 'Piribebuy', agrimensor: 'Ing. Carlos BenÃ­tez', notaria: 'Esc. Lourdes Villalba', estado: 'En revisiÃ³n', fecha: '21/10/2026' },
  { numero: 'EXP-2026-0047', municipio: 'AsunciÃ³n', agrimensor: 'Ing. Carlos BenÃ­tez', notaria: 'Esc. Beatriz Caballero', estado: 'Observado', fecha: '19/10/2026' },
  { numero: 'EXP-2026-0046', municipio: 'Piribebuy', agrimensor: 'Lic. MarÃ­a FernÃ¡ndez', notaria: 'Esc. Fernando Duarte', estado: 'Aprobado', fecha: '18/10/2026' }
];

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

    const countPros = membersList.filter(u => u.role === 'professional').length || 12;
    const countNotaries = membersList.filter(u => u.role === 'notary').length || 8;

    setText('dashProfessionals', String(countPros));
    setText('dashMunicipalities', '1 (Piribebuy)');
    setText('dashNotaries', String(countNotaries));
    setText('dashExpedientes', '24');

    renderMembersTable(membersList);
    renderPlansTable(plansList);
  } catch (e) {
    console.warn('[superadmin] mÃ©tricas dashboard:', e.message);
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

  tbody.innerHTML = PROFESIONALES_DEMO.map(p => `
    <tr class="hover:bg-gray-800/40 transition-colors">
      <td class="px-4 py-3 font-semibold text-white">${p.nombre}</td>
      <td class="px-4 py-3 font-mono text-blue-400">${p.matricula_mopc}</td>
      <td class="px-4 py-3 font-mono text-gray-300">${p.registro_snc}</td>
      <td class="px-4 py-3 text-gray-400">${p.circunscripcion}</td>
      <td class="px-4 py-3 text-amber-400 font-bold">${p.expedientes} activos</td>
      <td class="px-4 py-3">
        <span class="px-2 py-0.5 rounded-full text-[10px] font-bold ${p.estado === 'Habilitado' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-red-500/20 text-red-300 border border-red-500/30'}">
          ${p.estado}
        </span>
      </td>
      <td class="px-4 py-3 text-right pr-4 space-x-2">
        <button onclick="window.toggleEstadoAgrimensor('${p.id}')" class="px-2 py-1 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded text-[11px] border border-gray-700 transition">
          ${p.estado === 'Habilitado' ? 'Suspender' : 'Habilitar'}
        </button>
      </td>
    </tr>
  `).join('');
}

window.toggleEstadoAgrimensor = function(id) {
  const item = PROFESIONALES_DEMO.find(p => p.id === id);
  if (item) {
    item.estado = item.estado === 'Habilitado' ? 'Suspendido' : 'Habilitado';
    renderProfesionalesTable();
    showToast(`Estado de ${item.nombre} actualizado a: ${item.estado}`, 'info');
  }
};

// ============================================================
// PILAR 2: MUNICIPAL (LEY 3966)
// ============================================================
export async function publicarParcelasCiudadano() {
  const btn = document.getElementById('btnPublicarPiribebuy');
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<span>â³</span> Publicando...';
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
    showToast('Â¡Parcelas de Piribebuy publicadas con Ã©xito en el Portal Ciudadano!', 'success');
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
// PILAR 3: NOTARIAL (ESCRIBANÃAS / RUN)
// ============================================================
function renderNotariosTable() {
  const tbody = document.getElementById('notariosTable');
  if (!tbody) return;

  tbody.innerHTML = NOTARIOS_DEMO.map(n => `
    <tr class="hover:bg-gray-800/40 transition-colors">
      <td class="px-4 py-3 font-semibold text-white">${n.nombre}</td>
      <td class="px-4 py-3 font-mono text-purple-400 font-bold">${n.registro}</td>
      <td class="px-4 py-3 text-gray-400">${n.circunscripcion}</td>
      <td class="px-4 py-3 text-amber-400 font-bold">${n.minutas} emitidas</td>
      <td class="px-4 py-3">
        <span class="px-2 py-0.5 rounded-full text-[10px] font-bold ${n.estado === 'Habilitada' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30'}">
          ${n.estado}
        </span>
      </td>
      <td class="px-4 py-3 text-right pr-4">
        <a href="/notarial/" target="_blank" class="px-2.5 py-1 bg-purple-900/40 hover:bg-purple-800/60 text-purple-300 rounded text-[11px] border border-purple-700/50 transition">
          Ver Minutas â†—
        </a>
      </td>
    </tr>
  `).join('');
}

// ============================================================
// EXPEDIENTES B2B2G
// ============================================================
function renderExpedientesTable() {
  const tbody = document.getElementById('expedientesTable');
  if (!tbody) return;

  tbody.innerHTML = EXPEDIENTES_DEMO.map(exp => `
    <tr class="hover:bg-gray-800/40 transition-colors">
      <td class="px-4 py-3 font-mono font-bold text-amber-400">${exp.numero}</td>
      <td class="px-4 py-3 text-white font-medium">${exp.municipio}</td>
      <td class="px-4 py-3 text-blue-300">${exp.agrimensor}</td>
      <td class="px-4 py-3 text-purple-300">${exp.notaria}</td>
      <td class="px-4 py-3">
        <span class="px-2 py-0.5 rounded-full text-[10px] font-bold ${exp.estado === 'Aprobado' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : exp.estado === 'En revisiÃ³n' ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' : 'bg-orange-500/20 text-orange-300 border border-orange-500/30'}">
          ${exp.estado}
        </span>
      </td>
      <td class="px-4 py-3 text-gray-400 font-mono text-[11px]">${exp.fecha}</td>
      <td class="px-4 py-3 text-right pr-4">
        <button onclick="window.verDetalleExpediente('${exp.numero}')" class="px-2.5 py-1 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded text-[11px] border border-gray-700 transition">
          Inspeccionar
        </button>
      </td>
    </tr>
  `).join('');
}

window.verDetalleExpediente = function(num) {
  showToast(`Inspeccionando expediente ${num}: Conforme a ResoluciÃ³n SNC 551/2023 y Ley 7424/2025`, 'info');
};

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
        <span class="px-2 py-0.5 rounded-full text-[10px] font-bold ${u.role === 'superadmin' ? 'bg-red-500/20 text-red-300 border border-red-500/30' : u.role === 'admin' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : u.role === 'admin_municipal' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : u.role === 'admin_notarial' ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' : u.role === 'professional' ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' : u.role === 'notary' ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' : 'bg-gray-700 text-gray-300'}">
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
    const baseLayers = {
      osm: L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors · SNC v3 Super Admin GIS', maxZoom: 19,
      }),
      satellite: L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        attribution: '© Esri', maxZoom: 19,
      }),
      topo: L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenTopoMap (CC-BY-SA)', maxZoom: 17,
      }),
      catastro: L.tileLayer.wms('https://www.catastro.gov.py/geoserver/ows', {
        layers: 'snc:parcelas_activas', format: 'image/png8', transparent: true,
        CRS: 'CRS:84', attribution: '© SNC Paraguay',
      }),
    };
    baseLayers.osm.addTo(adminMap);
    adminMap._sncBaseLayers = baseLayers;
    adminMap.setBaseLayer = function (name) {
      Object.values(baseLayers).forEach(l => adminMap.removeLayer(l));
      if (baseLayers[name]) baseLayers[name].addTo(adminMap);
    };

    // Selector de mapa base hamburguesa (flotante derecha-arriba)
    if (!document.getElementById('map-base-selector')) {
      const selector = document.createElement('div');
      selector.id = 'map-base-selector';
      selector.className = 'absolute right-3 top-3 z-[1000]';
      selector.setAttribute('aria-label', 'Tipos de mapas');
      selector.innerHTML = `
        <button id="map-base-menu-toggle" class="bg-gray-900 border border-gray-700 text-gray-300 hover:text-white rounded-lg px-3 py-2 shadow-lg" type="button" aria-expanded="false" title="Tipos de mapas"><i class="fas fa-bars"></i></button>
        <div id="map-base-menu" class="hidden bg-gray-900 border border-gray-700 rounded-lg shadow-xl mt-1 p-1 flex flex-col gap-1 absolute right-0 top-full" role="radiogroup" aria-label="Mapa base">
          <button onclick="window._adminMap?.setBaseLayer('osm')" class="text-xs px-3 py-1.5 text-left rounded hover:bg-gray-800 text-blue-400" data-layer="osm">OpenStreetMap</button>
          <button onclick="window._adminMap?.setBaseLayer('satellite')" class="text-xs px-3 py-1.5 text-left rounded hover:bg-gray-800 text-gray-300" data-layer="satellite">Satélite ESRI</button>
          <button onclick="window._adminMap?.setBaseLayer('topo')" class="text-xs px-3 py-1.5 text-left rounded hover:bg-gray-800 text-gray-300" data-layer="topo">Curvas de nivel</button>
          <button onclick="window._adminMap?.setBaseLayer('catastro')" class="text-xs px-3 py-1.5 text-left rounded hover:bg-gray-800 text-amber-400" data-layer="catastro">Catastro SNC</button>
        </div>`;
      mapContainer.style.position = 'relative';
      mapContainer.appendChild(selector);
      window._adminMap = adminMap;
    }
  }

  const layers = [
    { id: 'barrios', label: 'Barrios', color: '#7c3aed' },
    { id: 'vias', label: 'VÃ­as', color: '#f59e0b' },
    { id: 'hidro', label: 'HidrografÃ­a', color: '#0ea5e9' },
    { id: 'vertedero', label: 'Vertedero', color: '#ef4444' },
    { id: 'casco_historico', label: 'Casco HistÃ³rico', color: '#facc15' },
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
            const res = await fetch(`/data/municipal/piribebuy/${layer.id}.geojson`);
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
// NAVEGACIÃ“N ENTRE PESTAÃ‘AS
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

  // BotÃ³n publicar Piribebuy
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
      showToast('SesiÃ³n de Super Administrador finalizada', 'info');
    });
  }
}

// ============================================================
// DEPENDENCIAS MUNICIPALES (jerarquÃ­a con sub-dependencias)
// ============================================================
const DEPARTAMENTOS = {
  super_admin:     { label: 'Super Administrador',  icon: 'â­', color: 'text-yellow-400', dictamen: true,  secciones: ['*'], parent: null, capas: ['todas'] },
  notarial:        { label: 'Notarial',             icon: 'ðŸ“œ', color: 'text-slate-400',  dictamen: false, secciones: ['municipal-status','qgis-layer-control'], parent: null, capas: ['parcelas','distritos'] },
  junta_municipal: { label: 'Junta Municipal',      icon: 'ðŸ›ï¸', color: 'text-red-400',    dictamen: false, secciones: ['municipal-status','qgis-layer-control'], parent: null, capas: ['barrios','zona_influencia','distritos'] },
  catastro:        { label: 'Catastro',             icon: 'ðŸ“', color: 'text-blue-400',   dictamen: true,  secciones: ['municipal-status','qgis-layer-control','fraccionamiento','balance-sidebar','loteamiento','ambiental','symbology','dictamen'], parent: 'junta_municipal', capas: ['parcelas','sample_fraccionamiento_municipal','barrios','curvas_nivel'] },
  ambiental:       { label: 'Ambiental',            icon: 'ðŸŒ¿', color: 'text-green-400',  dictamen: false, secciones: ['municipal-status','qgis-layer-control','ambiental'], parent: 'junta_municipal', capas: ['hidro','vertedero','vertedero_500','vertedero_1000','cobertura_forestal'] },
  planificacion:   { label: 'PlanificaciÃ³n',        icon: 'ðŸ“', color: 'text-purple-400', dictamen: false, secciones: ['municipal-status','qgis-layer-control','fraccionamiento','balance-sidebar','loteamiento'], parent: 'junta_municipal', capas: ['barrios','zona_influencia','sample_fraccionamiento_municipal','censo_viviendas'] },
  obras:           { label: 'Obras y Vialidad',     icon: 'ðŸš§', color: 'text-orange-400', dictamen: false, secciones: ['municipal-status','qgis-layer-control','loteamiento'], parent: 'junta_municipal', capas: ['vias','topografia_curvas'] },
  educacion:       { label: 'EducaciÃ³n',            icon: 'ðŸŽ“', color: 'text-cyan-400',    dictamen: false, secciones: ['municipal-status','qgis-layer-control'], parent: 'junta_municipal', capas: ['establecimientos_escolares_mec','barrios'] },
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
      const parentBadge = info.parent ? ` <span class="text-[8px] text-gray-500">â†³ ${DEPARTAMENTOS[info.parent]?.label || info.parent}</span>` : '';
      const dictamenBadge = info.dictamen 
        ? `<span class="text-[9px] px-1.5 py-0.5 bg-emerald-950/80 text-emerald-400 border border-emerald-700/60 rounded">Dictamen: âœ…</span>`
        : `<span class="text-[9px] px-1.5 py-0.5 bg-gray-900 text-gray-500 border border-gray-800 rounded">Dictamen: âŒ</span>`;
      html += `
        <div class="flex items-center justify-between p-3 bg-gray-950 rounded-lg border border-gray-800">
          <div class="flex items-center gap-3">
            <span class="text-xl">${info.icon}</span>
            <div>
              <div class="flex items-center gap-2">
                <p class="text-sm font-semibold ${info.color}">${info.label}${parentBadge}</p>
                ${dictamenBadge}
              </div>
              <p class="text-[10px] text-gray-400 mt-0.5">${info.secciones.includes('*') ? 'Acceso a todas las secciones' : info.secciones.join(', ')} Â· ${depUsers.length} usuario(s)</p>
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
        <p class="text-sm text-red-400">âš ï¸ ${sinDep.length} usuario(s) sin dependencia asignada</p>
      </div>`;
    }
    listEl.innerHTML = html || '<p class="text-gray-500 text-sm">No hay usuarios.</p>';
  } catch (e) {
    listEl.innerHTML = `<p class="text-red-400 text-sm">Error: ${e.message}</p>`;
  }
}

// ============================================================
// INIT PRINCIPAL
// ============================================================
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
