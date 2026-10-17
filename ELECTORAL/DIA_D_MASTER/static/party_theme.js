/**
 * =====================================================================
 * DIA D MASTER — Party Customization & Dynamic Theming Engine (White-Label)
 * Soporta:
 *  - ANR: Color Rojo (#DC2626), Unidad Operativa: "Seccional", Sub-unidades: "PC"
 *  - PLRA: Color Azul (#1D4ED8), Unidad Operativa: "Comité", Sub-unidades: "PC"
 *  - Personalizado: Renombrar cualquier partido, color, unidad y PCs.
 *  - Gestión directa de Unidades Operativas y despliegue de múltiples PCs.
 * =====================================================================
 */

(function (window, document) {
  'use strict';

  // Sesion actual (la guardan las paginas en sessionStorage al iniciar sesion)
  function sesionActual() {
    try {
      for (let i = 0; i < sessionStorage.length; i++) {
        const v = sessionStorage.getItem(sessionStorage.key(i));
        if (v && v.indexOf('session_id') !== -1) {
          try { const sid = JSON.parse(v).session_id; if (sid) return sid; } catch (e) { /* no es JSON */ }
        }
      }
    } catch (e) { /* storage bloqueado */ }
    return '';
  }
  window.diaSesionActual = sesionActual;

  // Solo el Admin Master puede ver y usar el selector "Configurar Partido y Estructura":
  // cambia el partido activo de TODO el sistema y puede borrar Seccionales/PCs de cualquier
  // partido, asi que no debe quedar expuesto a un cliente comun ni a nadie sin sesion.
  function _usuarioSesion() {
    try {
      for (let i = 0; i < sessionStorage.length; i++) {
        const v = sessionStorage.getItem(sessionStorage.key(i));
        if (!v) continue;
        try {
          const obj = JSON.parse(v);
          if (obj && obj.cedula && (obj.nivel || obj.rol)) return obj;
        } catch (e) { /* no es JSON */ }
      }
    } catch (e) { /* storage bloqueado */ }
    return null;
  }
  function esAdminMaster() {
    const u = _usuarioSesion();
    return !!(u && (u.nivel === 'master' || u.rol === 'master'));
  }
  window.diaEsAdminMaster = esAdminMaster;

  // Credenciales para las acciones que el backend exige validar contra 'master'
  function credencialesAuth() {
    const u = _usuarioSesion();
    let pw = '';
    try { pw = sessionStorage.getItem('user_pw') || ''; } catch (e) {}
    return { cedula_auth: u ? u.cedula : '', password_auth: pw };
  }
  window.diaCredencialesAuth = credencialesAuth;

  // Admin Master: "ver como cliente" (solo afecta lecturas; el servidor valida que la sesion sea master)
  const VER_CLIENTE_KEY = 'dia_ver_cliente';
  function clienteObservado() {
    try { return JSON.parse(sessionStorage.getItem(VER_CLIENTE_KEY) || 'null'); } catch (e) { return null; }
  }
  window.diaVerCliente = function (cedula, nombre) {
    try {
      if (cedula) sessionStorage.setItem(VER_CLIENTE_KEY, JSON.stringify({ cedula: String(cedula), nombre: nombre || '' }));
      else sessionStorage.removeItem(VER_CLIENTE_KEY);
    } catch (e) { /* storage bloqueado */ }
    location.reload();
  };
  function mostrarBannerCliente() {
    const ver = clienteObservado();
    if (!ver || document.getElementById('dia-banner-cliente')) return;
    const b = document.createElement('div');
    b.id = 'dia-banner-cliente';
    b.style.cssText = 'position:fixed;left:50%;bottom:16px;transform:translateX(-50%);z-index:99999;' +
      'background:#0f172a;color:#fff;border:2px solid #f59e0b;border-radius:999px;padding:8px 14px;' +
      'font:600 13px Inter,Arial,sans-serif;box-shadow:0 8px 24px rgba(0,0,0,.35);display:flex;gap:10px;align-items:center;max-width:calc(100% - 32px)';
    const t = document.createElement('span');
    t.textContent = 'Viendo datos de: ' + (ver.nombre || ver.cedula) + ' (' + ver.cedula + ')';
    const x = document.createElement('button');
    x.textContent = 'Ver todo';
    x.style.cssText = 'background:#f59e0b;color:#000;border:0;border-radius:999px;padding:4px 10px;font-weight:800;cursor:pointer';
    x.onclick = function () { window.diaVerCliente(null); };
    b.appendChild(t); b.appendChild(x);
    document.body.appendChild(b);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mostrarBannerCliente);
  else mostrarBannerCliente();

  // Envia la sesion en cada consulta al servidor: el backend limita los datos segun el plan del cliente
  if (window.fetch && !window.fetch.__diaSesion) {
    const fetchOriginal = window.fetch.bind(window);
    window.fetch = function (input, init) {
      try {
        const url = typeof input === 'string' ? input : (input && input.url) || '';
        const mismoOrigen = !/^https?:\/\//i.test(url) || url.indexOf(location.origin) === 0;
        const sid = mismoOrigen ? sesionActual() : '';
        if (sid) {
          init = Object.assign({}, init || {});
          const h = new Headers(init.headers || (typeof input !== 'string' && input.headers) || {});
          if (!h.has('X-Session-Id')) h.set('X-Session-Id', sid);
          const ver = clienteObservado();
          if (ver && !h.has('X-Ver-Cliente')) h.set('X-Ver-Cliente', ver.cedula);
          init.headers = h;
        }
      } catch (e) { /* si algo falla, la consulta sale igual */ }
      return fetchOriginal(input, init);
    };
    window.fetch.__diaSesion = true;
  }

  const STORAGE_KEY = 'dia_party_theme_config';
  const STORAGE_LIST_KEY = 'dia_partidos_list';

  // Configuración predeterminada institucional (ANR / Colorado)
  const DEFAULT_CONFIG = {
    id: 1,
    codigo_partido: 'ANR',
    sigla: 'ANR',
    nombre_oficial: 'Asociación Nacional Republicana - Partido Colorado',
    color_principal_hex: '#DC2626',
    color_secundario_hex: '#FFFFFF',
    nombre_unidad: 'Seccional',
    prefijo_unidad: 'Secc',
    nombre_pc: 'PC',
    logo_url: '/assets/logos/anr.svg'
  };

  // Preajustes rápidos estándar
  const PRESETS = {
    ANR: {
      id: 1,
      codigo_partido: 'ANR',
      sigla: 'ANR',
      nombre_oficial: 'Asociación Nacional Republicana - Partido Colorado',
      color_principal_hex: '#DC2626',
      color_secundario_hex: '#FFFFFF',
      nombre_unidad: 'Seccional',
      prefijo_unidad: 'Secc',
      nombre_pc: 'PC'
    },
    PLRA: {
      id: 2,
      codigo_partido: 'PLRA',
      sigla: 'PLRA',
      nombre_oficial: 'Partido Liberal Radical Auténtico',
      color_principal_hex: '#1D4ED8',
      color_secundario_hex: '#FFFFFF',
      nombre_unidad: 'Comité',
      prefijo_unidad: 'Comité',
      nombre_pc: 'PC'
    },
    NEUTRAL: {
      id: 0,
      codigo_partido: 'NEUTRO',
      sigla: 'NEUTRO',
      nombre_oficial: 'Centro de Control Electoral Independiente',
      color_principal_hex: '#C5A059',
      color_secundario_hex: '#0F172A',
      nombre_unidad: 'Centro Operativo',
      prefijo_unidad: 'Centro',
      nombre_pc: 'PC'
    }
  };

  class PartyThemeEngine {
    constructor() {
      this.config = this._loadLocalConfig();
      this.partidos = this._loadLocalPartidos();
      this.unidadesCache = [];
      this.metricas = { total_unidades: 0, total_pcs: 0 };
      this.modalEl = null;
      this.activeTab = 'presets'; // presets | personalizar | estructura
      this.listeners = [];

      // Aplicar estilos inmediatamente con la configuración local en caché
      this._applyCssVariables(this.config.color_principal_hex);
    }

    // Inicialización del motor
    init() {
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => this._onDomReady());
      } else {
        this._onDomReady();
      }
    }

    _onDomReady() {
      this._applyCssVariables(this.config.color_principal_hex);
      this.applyDom();
      this.injectHeaderPill();
      this.fetchRemoteConfig();
    }

    // Carga de configuración desde localStorage
    _loadLocalConfig() {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && parsed.color_principal_hex) return parsed;
        }
      } catch (e) {
        console.warn('[PartyTheme] Error leyendo localStorage:', e);
      }
      return Object.assign({}, DEFAULT_CONFIG);
    }

    _loadLocalPartidos() {
      try {
        const raw = localStorage.getItem(STORAGE_LIST_KEY);
        if (raw) return JSON.parse(raw);
      } catch (e) {}
      return [PRESETS.ANR, PRESETS.PLRA];
    }

    _saveLocalConfig(cfg) {
      this.config = Object.assign({}, cfg);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.config));
      } catch (e) {}
      this._applyCssVariables(this.config.color_principal_hex);
      this.applyDom();
      this._notifyListeners();
    }

    _saveLocalPartidos(list) {
      this.partidos = list;
      try {
        localStorage.setItem(STORAGE_LIST_KEY, JSON.stringify(list));
      } catch (e) {}
    }

    // Convertir Hex a RGB
    _hexToRgb(hex) {
      let c = (hex || '#DC2626').replace('#', '');
      if (c.length === 3) c = c.split('').map(x => x + x).join('');
      const num = parseInt(c, 16);
      if (isNaN(num)) return { r: 220, g: 38, b: 38 };
      return {
        r: (num >> 16) & 255,
        g: (num >> 8) & 255,
        b: num & 255
      };
    }

    // Inyección de variables CSS en :root
    _applyCssVariables(colorHex) {
      const color = colorHex || this.config.color_principal_hex || '#DC2626';
      const rgb = this._hexToRgb(color);
      const root = document.documentElement;

      root.style.setProperty('--party-color', color);
      root.style.setProperty('--party-color-rgb', `${rgb.r}, ${rgb.g}, ${rgb.b}`);
      root.style.setProperty('--party-subtle', `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.12)`);
      root.style.setProperty('--party-border', `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.38)`);
      root.style.setProperty('--party-gradient', `linear-gradient(135deg, ${color} 0%, rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.85) 100%)`);
      this._reloadClientCss();
    }

    // Recarga el tema del cliente (candidato) de la sesion actual: /tema-cliente.css?s=<session_id>
    _reloadClientCss() {
      const link = document.getElementById('tema-cliente');
      if (!link) return;
      const sid = sesionActual();
      if (link.dataset.sid === sid) return;
      link.dataset.sid = sid;
      link.href = 'tema-cliente.css?s=' + encodeURIComponent(sid) + '&v=' + Date.now();
    }

    // Consulta remota de configuración (/api/partido/config)
    async fetchRemoteConfig() {
      try {
        const res = await fetch('/api/partido/config?v=' + Date.now());
        if (!res.ok) return;
        const data = await res.json();
        if (data.success && data.partido_activo) {
          this._saveLocalConfig(data.partido_activo);
          if (data.partidos && data.partidos.length) {
            this._saveLocalPartidos(data.partidos);
          }
          if (data.metricas) {
            this.metricas = data.metricas;
          }
          this.updateHeaderPill();
        }
      } catch (err) {
        console.warn('[PartyTheme] Operando en modo local/offline:', err.message);
      }
    }

    // Obtener valores vigentes
    getConfig() { return this.config; }
    getNombreUnidad() { return this.config.nombre_unidad || (this.isANR() ? 'Seccional' : 'Comité'); }
    getPrefijoUnidad() { return this.config.prefijo_unidad || (this.isANR() ? 'Secc' : 'Comité'); }
    getNombrePC() { return this.config.nombre_pc || 'PC'; }
    getColor() { return this.config.color_principal_hex || (this.isANR() ? '#DC2626' : '#1D4ED8'); }
    getSigla() { return this.config.sigla || this.config.codigo_partido || 'PARTIDO'; }

    isANR() { return (this.config.codigo_partido || '').toUpperCase() === 'ANR'; }
    isPLRA() { return (this.config.codigo_partido || '').toUpperCase() === 'PLRA'; }

    // Suscripción a cambios
    onChange(fn) {
      if (typeof fn === 'function') this.listeners.push(fn);
    }
    _notifyListeners() {
      this.listeners.forEach(fn => {
        try { fn(this.config); } catch (e) { console.error(e); }
      });
    }

    // Reemplazo dinámico de textos en el DOM
    applyDom(container) {
      const root = container || document;
      const unidad = this.getNombreUnidad();
      const prefijo = this.getPrefijoUnidad();
      const pc = this.getNombrePC();
      const sigla = this.getSigla();

      // Elementos con atributos específicos
      root.querySelectorAll('[data-party-text="unidad"]').forEach(el => el.textContent = unidad);
      root.querySelectorAll('[data-party-text="prefijo"]').forEach(el => el.textContent = prefijo);
      root.querySelectorAll('[data-party-text="pc"]').forEach(el => el.textContent = pc);
      root.querySelectorAll('[data-party-text="sigla"]').forEach(el => el.textContent = sigla);

      // Clases auxiliares
      root.querySelectorAll('.party-text-unidad').forEach(el => el.textContent = unidad);
      root.querySelectorAll('.party-text-prefijo').forEach(el => el.textContent = prefijo);
      root.querySelectorAll('.party-text-pc').forEach(el => el.textContent = pc);
      root.querySelectorAll('.party-text-sigla').forEach(el => el.textContent = sigla);

      // Placeholders en inputs
      root.querySelectorAll('input[data-party-placeholder="unidad"]').forEach(el => {
        el.placeholder = `Ej: ${prefijo} Nº 1`;
      });
      root.querySelectorAll('input[data-party-placeholder="pc"]').forEach(el => {
        el.placeholder = `Ej: ${pc} 01-01`;
      });

      this.updateHeaderPill();
    }

    // Inyectar o actualizar el botón/insignia de acceso rápido en el header
    // (solo Admin Master: activa/renombra partidos y borra Seccionales/PCs de TODO el sistema)
    injectHeaderPill() {
      if (!esAdminMaster()) {
        const existente = document.getElementById('party-theme-pill-container');
        if (existente) existente.remove();
        return;
      }
      if (document.getElementById('party-theme-pill-container')) {
        this.updateHeaderPill();
        return;
      }

      // Buscar encabezado principal
      const targetHeader = document.querySelector('header .max-w-7xl, header, .header-institutional, nav');
      const pill = document.createElement('div');
      pill.id = 'party-theme-pill-container';
      pill.className = 'party-theme-pill-wrap flex items-center';
      pill.innerHTML = this._renderPillHtml();

      if (targetHeader) {
        // Intentar insertar antes del botón de salir o al final
        const logoutBtn = targetHeader.querySelector('button[onclick*="logout"], a[href*="logout"], .logout-btn');
        if (logoutBtn && logoutBtn.parentElement) {
          logoutBtn.parentElement.insertBefore(pill, logoutBtn);
        } else {
          targetHeader.appendChild(pill);
        }
      } else {
        // Fallback a botón flotante en esquina superior derecha
        pill.className = 'fixed top-3 right-4 z-50 shadow-2xl';
        document.body.appendChild(pill);
      }
    }

    _renderPillHtml() {
      const color = this.getColor();
      const sigla = this.getSigla();
      const unidad = this.getNombreUnidad();
      const isRed = this.isANR();
      const isBlue = this.isPLRA();
      const icon = isRed ? '🔴' : (isBlue ? '🔵' : '⚪');

      return `
        <button type="button" onclick="window.PartyTheme.openModal()"
          class="party-badge cursor-pointer hover:opacity-95 transition-all text-[11px] font-black uppercase tracking-wider shadow-sm mr-2"
          style="background:rgba(15, 23, 42, 0.85); border:1px solid ${color}; color:#fff;"
          title="Configurar Partido y Estructura (${unidad} / PC)">
          <span class="w-2.5 h-2.5 rounded-full inline-block mr-1 shadow-sm" style="background:${color};"></span>
          <span class="font-black" style="color:${color};">${sigla}</span>
          <span class="text-slate-400 mx-1">·</span>
          <span class="text-slate-200">${unidad}</span>
          <i class="fas fa-sliders text-[9px] text-amber-400 ml-1.5 opacity-80"></i>
        </button>
      `;
    }

    updateHeaderPill() {
      const container = document.getElementById('party-theme-pill-container');
      if (container) {
        container.innerHTML = this._renderPillHtml();
      }
    }

    // Modal de personalización y estructura
    openModal(tab = 'presets') {
      if (!esAdminMaster()) return;
      this.activeTab = tab;
      if (!this.modalEl) {
        this._createModal();
      }
      this._renderModalContent();
      this.modalEl.classList.remove('hidden');
      document.body.style.overflow = 'hidden';
    }

    closeModal() {
      if (this.modalEl) {
        this.modalEl.classList.add('hidden');
        document.body.style.overflow = '';
      }
    }

    _createModal() {
      const wrap = document.createElement('div');
      wrap.id = 'party-theme-modal';
      wrap.className = 'fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm hidden';
      wrap.innerHTML = `
        <div class="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-2xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
          <div id="party-modal-inner" class="flex flex-col h-full overflow-hidden"></div>
        </div>
      `;
      // Cerrar al hacer clic en fondo
      wrap.addEventListener('click', (e) => {
        if (e.target === wrap) this.closeModal();
      });
      document.body.appendChild(wrap);
      this.modalEl = wrap;
    }

    _renderModalContent() {
      const inner = document.getElementById('party-modal-inner');
      if (!inner) return;

      const c = this.config;
      const color = this.getColor();

      inner.innerHTML = `
        <!-- HEADER MODAL -->
        <div class="bg-slate-950 text-white p-5 border-b border-amber-500/30 flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-2xl flex items-center justify-center text-white font-black text-lg shadow-md"
                 style="background:${color};">
              ${c.sigla ? c.sigla.charAt(0) : 'P'}
            </div>
            <div>
              <div class="flex items-center gap-2">
                <h3 class="text-base font-black tracking-tight text-white uppercase">${c.sigla || 'Partido'} — Configuración</h3>
                <span class="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider"
                      style="background:rgba(197, 160, 89, 0.2); color:#dfc07b; border:1px solid rgba(197, 160, 89, 0.4);">
                  Unidad: ${c.nombre_unidad || 'Seccional'}
                </span>
              </div>
              <p class="text-xs text-slate-400 font-medium">${c.nombre_oficial || 'Personalización de Partido y Nomenclatura'}</p>
            </div>
          </div>
          <button onclick="window.PartyTheme.closeModal()" class="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition-all">
            <i class="fas fa-times text-sm"></i>
          </button>
        </div>

        <!-- TABS NAV -->
        <div class="bg-slate-100 px-4 pt-2 border-b border-slate-200 flex gap-2 overflow-x-auto">
          <button onclick="window.PartyTheme.setTab('presets')"
            class="px-4 py-2.5 rounded-t-xl text-xs font-black transition-all border-b-2 ${this.activeTab === 'presets' ? 'bg-white text-slate-900 border-amber-500 shadow-sm' : 'text-slate-500 hover:text-slate-800 border-transparent'}">
            <i class="fas fa-landmark mr-1.5 text-amber-500"></i>1. Partidos / Preajustes
          </button>
          <button onclick="window.PartyTheme.setTab('personalizar')"
            class="px-4 py-2.5 rounded-t-xl text-xs font-black transition-all border-b-2 ${this.activeTab === 'personalizar' ? 'bg-white text-slate-900 border-amber-500 shadow-sm' : 'text-slate-500 hover:text-slate-800 border-transparent'}">
            <i class="fas fa-pen-ruler mr-1.5 text-blue-500"></i>2. Renombrar / Personalizar
          </button>
          <button onclick="window.PartyTheme.setTab('estructura')"
            class="px-4 py-2.5 rounded-t-xl text-xs font-black transition-all border-b-2 ${this.activeTab === 'estructura' ? 'bg-white text-slate-900 border-amber-500 shadow-sm' : 'text-slate-500 hover:text-slate-800 border-transparent'}">
            <i class="fas fa-sitemap mr-1.5 text-green-500"></i>3. Estructura (${c.nombre_unidad} & PCs)
          </button>
        </div>

        <!-- TAB BODY (SCROLLABLE) -->
        <div class="p-5 overflow-y-auto flex-1 space-y-4">
          ${this.activeTab === 'presets' ? this._renderTabPresets() :
            this.activeTab === 'personalizar' ? this._renderTabPersonalizar() :
            this._renderTabEstructura()}
        </div>

        <!-- FOOTER -->
        <div class="bg-slate-50 p-4 border-t border-slate-200 flex items-center justify-between">
          <div class="text-[11px] text-slate-500 font-bold flex items-center gap-2">
            <span class="w-2.5 h-2.5 rounded-full inline-block" style="background:${color};"></span>
            Activo: <strong class="text-slate-800">${c.sigla}</strong> (${c.nombre_unidad} · Varios ${c.nombre_pc})
          </div>
          <button onclick="window.PartyTheme.closeModal()" class="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl text-xs transition-all">
            Listo / Cerrar
          </button>
        </div>
      `;
    }

    setTab(tab) {
      this.activeTab = tab;
      this._renderModalContent();
      if (tab === 'estructura') {
        this.cargarUnidadesOperativas();
      }
    }

    // ─────────────────────────────────────────────────────────────
    // TAB 1: PREAJUSTES (ANR, PLRA, OTROS)
    // ─────────────────────────────────────────────────────────────
    _renderTabPresets() {
      const currentId = this.config.id;
      const currentCode = (this.config.codigo_partido || '').toUpperCase();

      return `
        <div class="space-y-4">
          <div class="bg-amber-50 border border-amber-200 rounded-2xl p-3 text-xs text-amber-900 flex items-start gap-2.5">
            <i class="fas fa-info-circle text-amber-600 mt-0.5 text-sm"></i>
            <div>
              <strong>Selección rápida de Partido Político:</strong>
              Al activar un partido, el sistema adopta automáticamente su color oficial, su unidad operativa base y su estructura de Puestos de Comando (PCs).
            </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            <!-- TARJETA ANR -->
            <div class="border-2 rounded-2xl p-4 transition-all relative ${currentCode === 'ANR' ? 'border-red-600 bg-red-50/40 shadow-md ring-2 ring-red-500/20' : 'border-slate-200 hover:border-red-300 bg-white'}">
              <div class="flex items-start justify-between">
                <div class="flex items-center gap-3">
                  <div class="w-12 h-12 rounded-2xl bg-red-600 text-white font-black text-xl flex items-center justify-center shadow-md">
                    ANR
                  </div>
                  <div>
                    <h4 class="font-black text-slate-900 text-sm">ANR — Partido Colorado</h4>
                    <span class="inline-block px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-[10px] font-black uppercase">
                      Color Oficial: Rojo (#DC2626)
                    </span>
                  </div>
                </div>
                ${currentCode === 'ANR' ? '<span class="px-2 py-1 bg-red-600 text-white text-[10px] font-black rounded-lg">ACTIVO</span>' : ''}
              </div>

              <div class="mt-3.5 pt-3 border-t border-slate-100 space-y-1.5 text-xs">
                <div class="flex justify-between text-slate-600">
                  <span class="font-semibold text-slate-400">Unidad Operativa:</span>
                  <span class="font-black text-red-700">Seccional (Secc Nº)</span>
                </div>
                <div class="flex justify-between text-slate-600">
                  <span class="font-semibold text-slate-400">Sub-unidades:</span>
                  <span class="font-black text-slate-800">Varios PC (Puestos de Comando)</span>
                </div>
              </div>

              <button onclick="window.PartyTheme.activarPreset('ANR')"
                class="mt-4 w-full py-2.5 rounded-xl font-black text-xs transition-all shadow-sm flex items-center justify-center gap-2
                  ${currentCode === 'ANR' ? 'bg-red-600 text-white cursor-default' : 'bg-red-50 hover:bg-red-600 text-red-700 hover:text-white border border-red-200'}">
                <i class="fas ${currentCode === 'ANR' ? 'fa-check-circle' : 'fa-flag'}"></i>
                ${currentCode === 'ANR' ? 'Partido Activo en el Sistema' : 'Activar ANR (Colorado)'}
              </button>
            </div>

            <!-- TARJETA PLRA -->
            <div class="border-2 rounded-2xl p-4 transition-all relative ${currentCode === 'PLRA' ? 'border-blue-600 bg-blue-50/40 shadow-md ring-2 ring-blue-500/20' : 'border-slate-200 hover:border-blue-300 bg-white'}">
              <div class="flex items-start justify-between">
                <div class="flex items-center gap-3">
                  <div class="w-12 h-12 rounded-2xl bg-blue-600 text-white font-black text-xl flex items-center justify-center shadow-md">
                    PLRA
                  </div>
                  <div>
                    <h4 class="font-black text-slate-900 text-sm">PLRA — Partido Liberal</h4>
                    <span class="inline-block px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-[10px] font-black uppercase">
                      Color Oficial: Azul (#1D4ED8)
                    </span>
                  </div>
                </div>
                ${currentCode === 'PLRA' ? '<span class="px-2 py-1 bg-blue-600 text-white text-[10px] font-black rounded-lg">ACTIVO</span>' : ''}
              </div>

              <div class="mt-3.5 pt-3 border-t border-slate-100 space-y-1.5 text-xs">
                <div class="flex justify-between text-slate-600">
                  <span class="font-semibold text-slate-400">Unidad Operativa:</span>
                  <span class="font-black text-blue-700">Comité (Comité Nº)</span>
                </div>
                <div class="flex justify-between text-slate-600">
                  <span class="font-semibold text-slate-400">Sub-unidades:</span>
                  <span class="font-black text-slate-800">Varios PC (Puestos de Comando)</span>
                </div>
              </div>

              <button onclick="window.PartyTheme.activarPreset('PLRA')"
                class="mt-4 w-full py-2.5 rounded-xl font-black text-xs transition-all shadow-sm flex items-center justify-center gap-2
                  ${currentCode === 'PLRA' ? 'bg-blue-600 text-white cursor-default' : 'bg-blue-50 hover:bg-blue-600 text-blue-700 hover:text-white border border-blue-200'}">
                <i class="fas ${currentCode === 'PLRA' ? 'fa-check-circle' : 'fa-flag'}"></i>
                ${currentCode === 'PLRA' ? 'Partido Activo en el Sistema' : 'Activar PLRA (Liberal)'}
              </button>
            </div>
          </div>

          <!-- OTROS PARTIDOS REGISTRADOS -->
          <div class="mt-4">
            <h5 class="text-xs font-black text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <i class="fas fa-list text-amber-500"></i> Otros Partidos Disponibles en el Padrón:
            </h5>
            <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              ${(this.partidos || [])
                .filter(p => p.codigo_partido !== 'ANR' && p.codigo_partido !== 'PLRA')
                .slice(0, 8)
                .map(p => `
                  <button onclick="window.PartyTheme.activarPorId(${p.id})"
                    class="p-2.5 rounded-xl border text-left flex items-center gap-2 transition-all hover:shadow-sm ${p.id === currentId ? 'border-amber-500 bg-amber-50/50 font-black' : 'border-slate-200 bg-white hover:border-slate-300'}">
                    <span class="w-4 h-4 rounded-full flex-shrink-0" style="background:${p.color_principal_hex || '#94a3b8'};"></span>
                    <div class="min-w-0">
                      <p class="text-xs font-black text-slate-800 truncate">${p.sigla || p.codigo_partido}</p>
                      <p class="text-[9px] text-slate-400 truncate">${p.nombre_unidad || 'Unidad'}</p>
                    </div>
                  </button>
                `).join('')}
            </div>
          </div>
        </div>
      `;
    }

    // ─────────────────────────────────────────────────────────────
    // TAB 2: RENOMBRAR Y PERSONALIZAR CUALQUIER PARTIDO
    // ─────────────────────────────────────────────────────────────
    _renderTabPersonalizar() {
      const c = this.config;
      const color = this.getColor();

      return `
        <form id="party-custom-form" onsubmit="window.PartyTheme.guardarPersonalizado(event)" class="space-y-4">
          <div class="bg-blue-50 border border-blue-200 rounded-2xl p-3 text-xs text-blue-900 flex items-start gap-2">
            <i class="fas fa-sliders text-blue-600 mt-0.5 text-sm"></i>
            <div>
              <strong>Personalización a Medida:</strong>
              Acá podés renombrar el partido político, cambiar su color característico, definir el nombre de la unidad operativa (ej. <em>Seccional</em>, <em>Comité</em>, <em>Comando Central</em>) y el nombre de los PCs.
            </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <!-- Sigla -->
            <div>
              <label class="block text-xs font-black text-slate-700 uppercase mb-1">Sigla / Código del Partido</label>
              <input type="text" id="custom-sigla" value="${c.sigla || c.codigo_partido || ''}" required
                class="w-full px-3.5 py-2.5 border-2 border-slate-200 rounded-xl font-bold text-sm focus:border-amber-500 focus:outline-none transition-all"
                oninput="window.PartyTheme.updatePreview()">
            </div>

            <!-- Nombre Oficial -->
            <div>
              <label class="block text-xs font-black text-slate-700 uppercase mb-1">Nombre Oficial del Partido</label>
              <input type="text" id="custom-nombre" value="${c.nombre_oficial || ''}" required
                class="w-full px-3.5 py-2.5 border-2 border-slate-200 rounded-xl font-bold text-sm focus:border-amber-500 focus:outline-none transition-all"
                oninput="window.PartyTheme.updatePreview()">
            </div>

            <!-- Color Principal -->
            <div>
              <label class="block text-xs font-black text-slate-700 uppercase mb-1">Color Principal del Partido</label>
              <div class="flex items-center gap-2.5">
                <input type="color" id="custom-color" value="${color}"
                  class="w-12 h-11 rounded-xl border-2 border-slate-200 cursor-pointer p-0.5"
                  oninput="window.PartyTheme.updatePreview()">
                <input type="text" id="custom-color-hex" value="${color}"
                  class="flex-1 px-3.5 py-2.5 border-2 border-slate-200 rounded-xl font-mono text-sm font-bold uppercase focus:border-amber-500 focus:outline-none transition-all"
                  oninput="document.getElementById('custom-color').value = this.value; window.PartyTheme.updatePreview()">
              </div>
              <!-- Paleta rápida de muestra -->
              <div class="flex items-center gap-1.5 mt-2">
                <span class="text-[10px] text-slate-400 font-bold mr-1">Paletas:</span>
                <button type="button" onclick="window.PartyTheme.setQuickColor('#DC2626')" class="w-5 h-5 rounded-full bg-red-600 border" title="Rojo Colorado (#DC2626)"></button>
                <button type="button" onclick="window.PartyTheme.setQuickColor('#1D4ED8')" class="w-5 h-5 rounded-full bg-blue-600 border" title="Azul Liberal (#1D4ED8)"></button>
                <button type="button" onclick="window.PartyTheme.setQuickColor('#16A34A')" class="w-5 h-5 rounded-full bg-green-600 border" title="Verde (#16A34A)"></button>
                <button type="button" onclick="window.PartyTheme.setQuickColor('#EA580C')" class="w-5 h-5 rounded-full bg-orange-600 border" title="Naranja (#EA580C)"></button>
                <button type="button" onclick="window.PartyTheme.setQuickColor('#9333EA')" class="w-5 h-5 rounded-full bg-purple-600 border" title="Púrpura (#9333EA)"></button>
                <button type="button" onclick="window.PartyTheme.setQuickColor('#C5A059')" class="w-5 h-5 rounded-full bg-amber-500 border" title="Dorado Institucional (#C5A059)"></button>
                <button type="button" onclick="window.PartyTheme.setQuickColor('#0F172A')" class="w-5 h-5 rounded-full bg-slate-900 border" title="Obsidiana Ejecutivo (#0F172A)"></button>
              </div>
            </div>

            <!-- Nombre de Unidad Operativa -->
            <div>
              <label class="block text-xs font-black text-slate-700 uppercase mb-1">
                Nombre Unidad Operativa <span class="text-amber-600">(Ej. Seccional / Comité)</span>
              </label>
              <input type="text" id="custom-unidad" value="${c.nombre_unidad || 'Seccional'}" required
                placeholder="Seccional, Comité, Base Zonal..."
                class="w-full px-3.5 py-2.5 border-2 border-slate-200 rounded-xl font-bold text-sm focus:border-amber-500 focus:outline-none transition-all"
                oninput="window.PartyTheme.updatePreview()">
            </div>

            <!-- Prefijo Unidad -->
            <div>
              <label class="block text-xs font-black text-slate-700 uppercase mb-1">
                Abreviatura / Prefijo de Unidad <span class="text-amber-600">(Ej. Secc / Comité)</span>
              </label>
              <input type="text" id="custom-prefijo" value="${c.prefijo_unidad || 'Secc'}" required
                placeholder="Secc, Comité, Subcomité..."
                class="w-full px-3.5 py-2.5 border-2 border-slate-200 rounded-xl font-bold text-sm focus:border-amber-500 focus:outline-none transition-all"
                oninput="window.PartyTheme.updatePreview()">
            </div>

            <!-- Nombre Sub-unidad (PC) -->
            <div>
              <label class="block text-xs font-black text-slate-700 uppercase mb-1">
                Nombre de Sub-unidades <span class="text-amber-600">(Ej. PC / Puesto de Comando)</span>
              </label>
              <input type="text" id="custom-pc" value="${c.nombre_pc || 'PC'}" required
                placeholder="PC, Puesto de Comando, Comando Barrial..."
                class="w-full px-3.5 py-2.5 border-2 border-slate-200 rounded-xl font-bold text-sm focus:border-amber-500 focus:outline-none transition-all"
                oninput="window.PartyTheme.updatePreview()">
            </div>
          </div>

          <!-- VISTA PREVIA EN VIVO -->
          <div class="border-2 border-dashed border-slate-200 rounded-2xl p-4 bg-slate-50">
            <h5 class="text-[11px] font-black text-slate-500 uppercase tracking-wider mb-2">Vista Previa de Nomenclatura en Vivo:</h5>
            <div id="custom-preview-card" class="bg-white rounded-xl p-3 border shadow-sm flex items-center justify-between">
              <div class="flex items-center gap-3">
                <div id="preview-badge" class="w-10 h-10 rounded-xl text-white font-black flex items-center justify-center text-sm shadow-sm"
                     style="background:${color};">
                  ${c.sigla ? c.sigla.charAt(0) : 'P'}
                </div>
                <div>
                  <h4 id="preview-party-title" class="font-black text-slate-900 text-sm">${c.sigla || 'PARTIDO'} — ${c.nombre_oficial || 'Nombre Oficial'}</h4>
                  <p id="preview-hierarchy" class="text-xs text-slate-500">
                    Unidad Base: <strong class="text-slate-800">${c.prefijo_unidad || 'Secc'} Nº 1</strong> &rarr; de aquí se despliegan varios <strong class="text-slate-800">${c.nombre_pc || 'PC'}</strong> (Puestos de Comando)
                  </p>
                </div>
              </div>
              <span id="preview-pill" class="px-2.5 py-1 rounded-full text-xs font-black text-white" style="background:${color};">
                ${c.sigla || 'PARTIDO'}
              </span>
            </div>
          </div>

          <!-- BOTONES DE ACCIÓN -->
          <div class="flex items-center gap-3 pt-2">
            <button type="submit" class="flex-1 py-3 bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-600 hover:to-yellow-700 text-slate-950 font-black rounded-xl text-xs uppercase tracking-wider shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center gap-2">
              <i class="fas fa-save"></i> Guardar y Aplicar en Todo el Sistema
            </button>
            <button type="button" onclick="window.PartyTheme.restablecerDefault()" class="px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-all">
              Restablecer
            </button>
          </div>
        </form>
      `;
    }

    setQuickColor(hex) {
      const colorInput = document.getElementById('custom-color');
      const hexInput = document.getElementById('custom-color-hex');
      if (colorInput) colorInput.value = hex;
      if (hexInput) hexInput.value = hex;
      this.updatePreview();
    }

    updatePreview() {
      const sigla = (document.getElementById('custom-sigla')?.value || 'PARTIDO').trim();
      const nombre = (document.getElementById('custom-nombre')?.value || 'Nombre Oficial').trim();
      const color = document.getElementById('custom-color')?.value || '#DC2626';
      const unidad = (document.getElementById('custom-unidad')?.value || 'Seccional').trim();
      const prefijo = (document.getElementById('custom-prefijo')?.value || 'Secc').trim();
      const pc = (document.getElementById('custom-pc')?.value || 'PC').trim();

      const badge = document.getElementById('preview-badge');
      const title = document.getElementById('preview-party-title');
      const hier = document.getElementById('preview-hierarchy');
      const pill = document.getElementById('preview-pill');

      if (badge) {
        badge.style.backgroundColor = color;
        badge.textContent = sigla.charAt(0) || 'P';
      }
      if (title) title.textContent = `${sigla} — ${nombre}`;
      if (hier) {
        hier.innerHTML = `Unidad Base: <strong class="text-slate-800">${prefijo} Nº 1</strong> &rarr; de aquí se despliegan varios <strong class="text-slate-800">${pc}</strong> (Puestos de Comando)`;
      }
      if (pill) {
        pill.style.backgroundColor = color;
        pill.textContent = sigla;
      }
    }

    // ─────────────────────────────────────────────────────────────
    // TAB 3: ESTRUCTURA OPERATIVA (UNIDADES Y PCs)
    // ─────────────────────────────────────────────────────────────
    _renderTabEstructura() {
      const c = this.config;
      const color = this.getColor();
      const unidad = this.getNombreUnidad();
      const prefijo = this.getPrefijoUnidad();
      const pc = this.getNombrePC();

      return `
        <div class="space-y-4">
          <div class="flex items-center justify-between bg-slate-900 text-white rounded-2xl p-4 border border-amber-500/20">
            <div>
              <h4 class="text-sm font-black uppercase text-amber-400">Estructura Operativa: ${c.sigla}</h4>
              <p class="text-xs text-slate-300">
                Cada <strong>${unidad}</strong> puede contener <strong>varios ${pc}</strong> dependientes para intendente y concejales.
              </p>
            </div>
            <button onclick="window.PartyTheme.mostrarFormNuevaUnidad()"
              class="px-3.5 py-2 bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 font-black rounded-xl text-xs hover:brightness-110 transition-all flex items-center gap-1.5 shadow-md">
              <i class="fas fa-plus"></i> Nueva ${unidad}
            </button>
          </div>

          <!-- FORMULARIO CREAR UNIDAD (OCULTO POR DEFECTO) -->
          <div id="form-nueva-unidad" class="hidden card border-2 border-amber-400/50 bg-amber-50/20 p-4 rounded-2xl space-y-3">
            <div class="flex justify-between items-center">
              <h5 class="text-xs font-black text-slate-900 uppercase">Crear Nueva Unidad: ${unidad}</h5>
              <button onclick="document.getElementById('form-nueva-unidad').classList.add('hidden')" class="text-slate-400 hover:text-slate-600 text-xs font-bold">
                Cancelar
              </button>
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div>
                <label class="text-[10px] font-black text-slate-500 uppercase">Número</label>
                <input type="number" id="nueva-unidad-num" placeholder="Ej: 1" class="w-full p-2 border rounded-xl text-xs font-bold">
              </div>
              <div class="sm:col-span-2">
                <label class="text-[10px] font-black text-slate-500 uppercase">Nombre Completo</label>
                <input type="text" id="nueva-unidad-nombre" placeholder="Ej: ${prefijo} Nº 45 - Barrio Obrero" class="w-full p-2 border rounded-xl text-xs font-bold">
              </div>
            </div>
            <button onclick="window.PartyTheme.crearUnidadConfirm()" class="w-full py-2 bg-slate-900 hover:bg-black text-white font-black rounded-xl text-xs transition-all">
              Guardar ${unidad}
            </button>
          </div>

          <!-- LISTA DE UNIDADES Y PCS -->
          <div id="lista-unidades-container" class="space-y-3">
            <div class="text-center py-8 text-slate-400 text-xs">
              <i class="fas fa-spinner fa-spin text-2xl text-amber-500 mb-2"></i>
              <p>Cargando unidades operativas y puestos de comando...</p>
            </div>
          </div>
        </div>
      `;
    }

    async cargarUnidadesOperativas() {
      const cont = document.getElementById('lista-unidades-container');
      if (!cont) return;

      try {
        const res = await fetch(`/api/partido/unidades?partido_id=${this.config.id}&v=${Date.now()}`);
        const data = await res.json();
        if (!data.success) {
          cont.innerHTML = `<p class="text-red-500 text-xs p-4">${data.error || 'Error al cargar unidades'}</p>`;
          return;
        }

        this.unidadesCache = data.unidades || [];
        this._renderListaUnidades(this.unidadesCache);
      } catch (e) {
        cont.innerHTML = `<p class="text-slate-400 text-xs p-4">No se pudo conectar con el servidor.</p>`;
      }
    }

    _renderListaUnidades(unidades) {
      const cont = document.getElementById('lista-unidades-container');
      if (!cont) return;

      const c = this.config;
      const color = this.getColor();
      const unidadLabel = this.getNombreUnidad();
      const pcLabel = this.getNombrePC();

      if (!unidades || !unidades.length) {
        cont.innerHTML = `
          <div class="border-2 border-dashed border-slate-200 rounded-2xl p-6 text-center text-slate-400">
            <i class="fas fa-sitemap text-3xl mb-2 text-slate-300"></i>
            <p class="text-xs font-bold">No hay unidades cargadas para este partido.</p>
            <p class="text-[11px] text-slate-400 mt-1">Podés hacer clic en "+ Nueva ${unidadLabel}" para dar de alta la primera.</p>
          </div>
        `;
        return;
      }

      cont.innerHTML = unidades.map(u => `
        <div class="border border-slate-200 rounded-2xl p-3.5 bg-white shadow-sm hover:border-slate-300 transition-all space-y-2.5">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2.5">
              <span class="w-8 h-8 rounded-xl flex items-center justify-center text-white font-black text-xs shadow-sm" style="background:${color};">
                ${u.numero}
              </span>
              <div>
                <h5 class="text-xs font-black text-slate-900">${u.nombre || `${c.prefijo_unidad} Nº ${u.numero}`}</h5>
                <p class="text-[10px] text-slate-400 font-bold">${u.total_pcs || 0} ${pcLabel}s desplegados</p>
              </div>
            </div>
            <div class="flex items-center gap-1.5">
              <button onclick="window.PartyTheme.mostrarFormNuevoPC(${u.id})"
                class="px-2.5 py-1 bg-green-50 hover:bg-green-100 text-green-700 rounded-lg text-[10px] font-black border border-green-200 transition-all flex items-center gap-1">
                <i class="fas fa-plus"></i> + PC
              </button>
              <button onclick="window.PartyTheme.eliminarUnidadConfirm(${u.id})"
                class="p-1 text-slate-400 hover:text-red-600 rounded-lg text-xs transition-all" title="Eliminar ${unidadLabel}">
                <i class="fas fa-trash"></i>
              </button>
            </div>
          </div>

          <!-- FORMULARIO NUEVO PC (DINÁMICO) -->
          <div id="form-pc-${u.id}" class="hidden p-2.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
            <div class="flex items-center justify-between">
              <span class="text-[10px] font-black text-slate-700 uppercase">Desplegar nuevo ${pcLabel} en ${u.nombre}</span>
              <button onclick="document.getElementById('form-pc-${u.id}').classList.add('hidden')" class="text-slate-400 text-[10px]">Cerrar</button>
            </div>
            <div class="grid grid-cols-2 gap-2">
              <input type="text" id="pc-codigo-${u.id}" placeholder="Código (ej: ${pcLabel} ${u.numero}-01)" class="p-1.5 text-xs border rounded-lg">
              <select id="pc-rol-${u.id}" class="p-1.5 text-xs border rounded-lg font-bold">
                <option value="intendente">Intendente</option>
                <option value="concejal" selected>Concejal</option>
                <option value="coordinacion">Coordinación</option>
              </select>
              <input type="text" id="pc-escuela-${u.id}" placeholder="🏫 Escuela / Local de Votación (ej: Escuela 1)" class="p-1.5 text-xs border rounded-lg col-span-2">
            </div>
            <button onclick="window.PartyTheme.crearPCConfirm(${u.id})" class="w-full py-1.5 bg-slate-800 text-white font-bold text-[10px] rounded-lg">
              Confirmar Despliegue de ${pcLabel}
            </button>
          </div>

          <!-- LISTA DE PCS ASOCIADOS -->
          <div class="space-y-1 pl-3 border-l-2 border-slate-100">
            ${(u.pcs && u.pcs.length) ? u.pcs.map(pc => `
              <div class="flex items-center justify-between py-1 px-2 rounded-lg bg-slate-50/70 border border-slate-100 text-xs">
                <div class="flex items-center gap-2">
                  <span class="w-2 h-2 rounded-full" style="background:${color};"></span>
                  <span class="font-black text-slate-800">${pc.codigo || `${pcLabel} Nº ${pc.numero}`}</span>
                  <span class="px-1.5 py-0.2 bg-slate-200 text-slate-600 rounded text-[9px] font-bold uppercase">${pc.rol}</span>
                  ${pc.escuela_nombre ? `<span class="px-1.5 py-0.2 bg-amber-100 text-amber-800 border border-amber-200 rounded text-[9px] font-bold"><i class="fas fa-school mr-1"></i>${pc.escuela_nombre}</span>` : ''}
                </div>
                <button onclick="window.PartyTheme.eliminarPCConfirm(${pc.id})" class="text-slate-300 hover:text-red-500 text-[10px]">
                  <i class="fas fa-times"></i>
                </button>
              </div>
            `).join('') : `
              <p class="text-[10px] text-slate-400 italic">No hay ${pcLabel}s desplegados aún en esta ${unidadLabel}.</p>
            `}
          </div>
        </div>
      `).join('');
    }

    // Acciones de unidades y PCs
    mostrarFormNuevaUnidad() {
      const f = document.getElementById('form-nueva-unidad');
      if (f) f.classList.toggle('hidden');
    }

    mostrarFormNuevoPC(unidadId) {
      const f = document.getElementById(`form-pc-${unidadId}`);
      if (f) f.classList.toggle('hidden');
    }

    async crearUnidadConfirm() {
      const numInput = document.getElementById('nueva-unidad-num');
      const nomInput = document.getElementById('nueva-unidad-nombre');
      const num = numInput ? parseInt(numInput.value) : null;
      const nom = nomInput ? nomInput.value.trim() : '';

      try {
        const res = await fetch('/api/partido/unidades', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(Object.assign({
            partido_id: this.config.id,
            numero: num,
            nombre: nom
          }, credencialesAuth()))
        });
        const d = await res.json();
        if (d.success) {
          document.getElementById('form-nueva-unidad')?.classList.add('hidden');
          await this.cargarUnidadesOperativas();
        } else {
          alert('Error: ' + (d.error || 'No se pudo crear la unidad'));
        }
      } catch (e) {
        alert('Error de conexión');
      }
    }

    async crearPCConfirm(unidadId) {
      const codInput = document.getElementById(`pc-codigo-${unidadId}`);
      const rolInput = document.getElementById(`pc-rol-${unidadId}`);
      const escuelaInput = document.getElementById(`pc-escuela-${unidadId}`);
      const codigo = codInput ? codInput.value.trim() : '';
      const rol = rolInput ? rolInput.value : 'concejal';
      const escuelaNom = escuelaInput ? escuelaInput.value.trim() : '';

      try {
        const res = await fetch(`/api/partido/unidades/${unidadId}/pcs`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(Object.assign({
            codigo: codigo,
            rol: rol,
            escuela_nombre: escuelaNom
          }, credencialesAuth()))
        });
        const d = await res.json();
        if (d.success) {
          await this.cargarUnidadesOperativas();
        } else {
          alert('Error: ' + (d.error || 'No se pudo crear el PC'));
        }
      } catch (e) {
        alert('Error de conexión');
      }
    }

    async eliminarPCConfirm(pcId) {
      if (!confirm('¿Desea eliminar este Puesto de Comando (PC)?')) return;
      try {
        await fetch(`/api/partido/pcs/${pcId}`, {
          method: 'DELETE', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(credencialesAuth())
        });
        await this.cargarUnidadesOperativas();
      } catch (e) {
        console.error(e);
      }
    }

    async eliminarUnidadConfirm(unidadId) {
      if (!confirm('¿Desea eliminar esta unidad operativa y todos sus PCs dependientes?')) return;
      try {
        await fetch(`/api/partido/unidades/${unidadId}`, {
          method: 'DELETE', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(credencialesAuth())
        });
        await this.cargarUnidadesOperativas();
      } catch (e) {
        console.error(e);
      }
    }

    // ─────────────────────────────────────────────────────────────
    // ACCIONES DE PRESETS Y GUARDADO
    // ─────────────────────────────────────────────────────────────
    async activarPreset(codigo) {
      const target = PRESETS[codigo] || (codigo === 'ANR' ? PRESETS.ANR : PRESETS.PLRA);
      await this.activarPorId(target.id, target);
    }

    async activarPorId(partidoId, fallbackObj = null) {
      try {
        const res = await fetch('/api/partido/config', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(Object.assign({ accion: 'activar', partido_id: partidoId }, credencialesAuth()))
        });
        const data = await res.json();
      } catch (e) {
        console.warn('Error al activar en backend, aplicando localmente:', e);
      }

      // Buscar configuración en lista de partidos o fallback
      let found = (this.partidos || []).find(p => p.id === partidoId);
      if (!found && fallbackObj) found = fallbackObj;
      if (!found) {
        if (partidoId === 1) found = PRESETS.ANR;
        else if (partidoId === 2) found = PRESETS.PLRA;
        else found = Object.assign({}, DEFAULT_CONFIG, { id: partidoId });
      }

      this._saveLocalConfig(found);
      await this.fetchRemoteConfig();
      this._renderModalContent();
    }

    async guardarPersonalizado(evt) {
      if (evt && evt.preventDefault) evt.preventDefault();

      const sigla = (document.getElementById('custom-sigla')?.value || '').trim();
      const nombre = (document.getElementById('custom-nombre')?.value || '').trim();
      const color = document.getElementById('custom-color')?.value || '#DC2626';
      const unidad = (document.getElementById('custom-unidad')?.value || 'Seccional').trim();
      const prefijo = (document.getElementById('custom-prefijo')?.value || 'Secc').trim();
      const pc = (document.getElementById('custom-pc')?.value || 'PC').trim();

      const payload = Object.assign({
        partido_id: this.config.id || 1,
        codigo_partido: sigla,
        sigla: sigla,
        nombre_oficial: nombre,
        color_principal_hex: color,
        nombre_unidad: unidad,
        prefijo_unidad: prefijo,
        nombre_pc: pc,
        activar: true
      }, credencialesAuth());

      try {
        const res = await fetch('/api/partido/config', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (data.success && data.partido_activo) {
          this._saveLocalConfig(data.partido_activo);
        } else {
          this._saveLocalConfig(payload);
        }
      } catch (e) {
        this._saveLocalConfig(payload);
      }

      await this.fetchRemoteConfig();
      this.closeModal();
      this._mostrarToast(`Partido personalizado con éxito: ${sigla} (${unidad})`);
    }

    restablecerDefault() {
      if (confirm('¿Restablecer a valores predeterminados (ANR - Partido Colorado)?')) {
        this.activarPreset('ANR');
      }
    }

    _mostrarToast(msg) {
      const toast = document.createElement('div');
      toast.className = 'fixed bottom-5 right-5 z-50 bg-slate-900 text-white border border-amber-500/40 px-4 py-3 rounded-2xl shadow-2xl text-xs font-bold flex items-center gap-2 animate-in slide-in-from-bottom-5 duration-200';
      toast.innerHTML = `<i class="fas fa-check-circle text-amber-400"></i> ${msg}`;
      document.body.appendChild(toast);
      setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transition = 'opacity 0.4s ease';
        setTimeout(() => toast.remove(), 400);
      }, 3500);
    }
  }

  // Instanciar e inicializar globalmente
  const instance = new PartyThemeEngine();
  window.PartyTheme = instance;
  instance.init();

})(window, document);
