// ==================== AUTENTICACIÓN COMPARTIDA ====================
// Todas las páginas usan esta misma sesión.
// Soporte multi-rol: un usuario puede tener múltiples roles asignados.

const AUTH_SHARED_KEY = 'seccional40_user';
const ROL_ACTIVO_KEY = 'seccional40_rol_activo';

// ─── JERARQUÍA DE NIVELES (para compatibilidad) ────────
const NIVEL_HIERARCHY = ['conductor', 'dirigente', 'seccional', 'distrital', 'departamental', 'nacional', 'master'];
const NIVEL_CLIENTE = ['general', 'departamental', 'municipal', 'pc'];

function nivelIndex(nivel) {
    const i = NIVEL_HIERARCHY.indexOf(nivel);
    if (i >= 0) return i;
    return NIVEL_CLIENTE.indexOf(nivel);
}

function tieneNivel(minNivel) {
    const u = getSessionUser();
    if (!u) return false;
    if (!u.roles || u.roles.length === 0) {
        // Legacy: usar nivel directo
        if (typeof minNivel === 'string') {
            const idx = NIVEL_HIERARCHY.indexOf(minNivel);
            if (idx >= 0) return nivelIndex(u.nivel) >= idx;
            return nivelIndex(u.nivel) >= 0;
        }
        return nivelIndex(u.nivel) >= minNivel;
    }
    // Multi-rol: verificar si algún rol cumple
    if (typeof minNivel === 'number') {
        return u.roles.some(r => nivelIndex(r.rol) >= minNivel);
    }
    // String: ver nivel mínimo
    const idxMin = NIVEL_HIERARCHY.indexOf(minNivel);
    if (idxMin >= 0) {
        return u.roles.some(r => {
            const idx = NIVEL_HIERARCHY.indexOf(r.rol);
            return idx >= idxMin;
        });
    }
    // También checkear NIVEL_CLIENTE
    const idxCli = NIVEL_CLIENTE.indexOf(minNivel);
    if (idxCli >= 0) {
        return u.roles.some(r => {
            const idx = NIVEL_CLIENTE.indexOf(r.rol);
            return idx >= idxCli;
        });
    }
    return false;
}

function nivelMinimo(nivel) {
    return nivelIndex(nivel) >= 0;
}

// ─── SESIÓN ─────────────────────────────────────────────
function getSessionUser() {
    try { return JSON.parse(sessionStorage.getItem(AUTH_SHARED_KEY)); }
    catch { return null; }
}

function getRolActivo() {
    const u = getSessionUser();
    if (!u) return null;
    const stored = sessionStorage.getItem(ROL_ACTIVO_KEY);
    if (stored) {
        try { return JSON.parse(stored); } catch {}
    }
    // Default: primer rol
    if (u.roles && u.roles.length > 0) {
        return u.roles[0];
    }
    // Legacy: crear rol virtual
    return { rol: u.nivel || '' };
}

function setRolActivo(rolObj) {
    sessionStorage.setItem(ROL_ACTIVO_KEY, JSON.stringify(rolObj));
}

function getNivel() {
    const rol = getRolActivo();
    return rol ? (rol.rol || '') : '';
}

function getUserName() {
    const u = getSessionUser();
    return u ? (u.nombre || '') : '';
}

function getUserCedula() {
    const u = getSessionUser();
    return u ? (u.cedula || '') : '';
}

function getRoles() {
    const u = getSessionUser();
    return u ? (u.roles || []) : [];
}

function isLoggedIn() {
    return !!getSessionUser();
}

// ─── VERIFICACIONES POR ROL ────────────────────────────
function tieneRol(rol) {
    const u = getSessionUser();
    if (!u || !u.roles) return false;
    return u.roles.some(r => r.rol === rol);
}

function esAdmin() {
    return tieneRol('master') || tieneRol('nacional') || tieneRol('departamental') ||
           tieneRol('distrital') || tieneRol('seccional') || tieneRol('admin');
}

function esConductor() {
    return getNivel() === 'conductor' || tieneRol('conductor');
}

function esCliente() {
    return tieneRol('general') || tieneRol('departamental') || tieneRol('municipal') || tieneRol('pc');
}

function esDirigente() {
    return getNivel() === 'dirigente' || tieneRol('dirigente');
}

function esPc() {
    return esAdmin() || tieneRol('general') || tieneRol('pc');
}

// ─── SWITCH DE ROL ─────────────────────────────────────
function cambiarRol(rol) {
    const u = getSessionUser();
    if (!u || !u.roles) return false;
    const encontrado = u.roles.find(r => r.rol === rol);
    if (encontrado) {
        setRolActivo(encontrado);
        // Recargar la página para que aplique el nuevo rol
        window.location.reload();
        return true;
    }
    return false;
}

// ─── LOGIN ──────────────────────────────────────────────
async function loginConCredenciales(cedula, password) {
    const r = await fetch('/api', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'login', cedula: cedula, password: password })
    });
    const d = await r.json();
    if (d.success) {
        if (d.usuario.session_id) {
            sessionStorage.setItem('dia_d_session_id', d.usuario.session_id);
        }
        sessionStorage.setItem(AUTH_SHARED_KEY, JSON.stringify(d.usuario));
        // Si tiene roles, guardar el primero como activo
        if (d.usuario.roles && d.usuario.roles.length > 0) {
            setRolActivo(d.usuario.roles[0]);
        }
    }
    return d;
}

function logoutGlobal() {
    sessionStorage.removeItem(AUTH_SHARED_KEY);
    sessionStorage.removeItem(ROL_ACTIVO_KEY);
    window.location.href = 'index.html';
}

// ─── WRAPPER POST CON AUTENTICACIÓN ──────────────────
function apiPost(body) {
    const u = getSessionUser();
    if (u) {
        body.cedula_auth = u.cedula;
        const sessionId = sessionStorage.getItem('dia_d_session_id');
        if (sessionId) body.session_id = sessionId;
        body.password_auth = u.nivel === 'dirigente'
            ? (sessionStorage.getItem('dirigente_pw') || '')
            : (sessionStorage.getItem('user_pw') || '');
    }
    return fetch('/api', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    }).then(r => r.json());
}

// alcance: 'general' | 'partido' | 'candidato' | 'dirigente'. scopeId es partido_id para
// 'partido', candidato_id para 'candidato' -- se ignora para 'general'/'dirigente' (ese último
// usa la propia cédula del usuario logueado, no un id aparte).
async function editarPlantillaWhatsappVotacion(alcance, scopeId) {
    const u = getSessionUser();
    if (!u) { alert('Iniciá sesión para editar la plantilla.'); return; }
    const sid = Number(scopeId || 0);
    const qsParams = { action: 'whatsapp_plantilla_votacion' };
    if (alcance === 'partido') qsParams.id = String(sid);
    if (alcance === 'candidato') qsParams.candidato_id = String(sid);
    if (alcance === 'dirigente') qsParams.dirigente = u.cedula;
    const qs = new URLSearchParams(qsParams);
    const current = await fetch('/api?' + qs.toString()).then(r => r.json()).catch(() => ({}));
    const porAlcance = { general: 'plantilla_general', partido: 'plantilla_partido', candidato: 'plantilla_candidato', dirigente: 'plantilla_dirigente' };
    const value = current[porAlcance[alcance]] || current.plantilla_activa || '';
    const body = prompt('Variables: {nombre}, {mesa}, {orden}, {local}, {url_consulta}, {candidatos}. Formato WhatsApp: *negrita*, _cursiva_, ~tachado~, - lista y URL completa para enlace.', value);
    if (body == null || !body.trim()) return;
    const payload = { action: 'whatsapp_plantilla_guardar', alcance, cuerpo: body.trim(),
        cedula_auth: u.cedula,
        password_auth: sessionStorage.getItem('user_pw') || sessionStorage.getItem('dirigente_pw') || '' };
    if (alcance === 'partido') payload.partido_id = sid;
    if (alcance === 'candidato') payload.candidato_id = sid;
    const response = await fetch('/api', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload) });
    const result = await response.json().catch(() => ({}));
    if (!result.success) { alert(result.detail || result.error || 'No se pudo guardar la plantilla.'); return; }
    alert('Plantilla de WhatsApp guardada.');
}

// ─── CAMBIO DE CONTRASEÑA OBLIGATORIO (tras reset por admin o contraseña por defecto) ──
async function promptCambioClave(cedula, passwordActual) {
    alert('Por seguridad, debés cambiar tu contraseña antes de continuar.');
    while (true) {
        const nueva = prompt('Elegí tu nueva contraseña (mínimo 4 caracteres):');
        if (nueva === null) {
            // No se puede omitir: es obligatorio tras un reset o la contraseña por defecto.
            alert('Es necesario definir una nueva contraseña para continuar.');
            continue;
        }
        if (nueva.trim().length < 4) { alert('Debe tener al menos 4 caracteres.'); continue; }
        if (nueva.trim() === passwordActual) { alert('Debe ser diferente a la actual.'); continue; }
        try {
            const r = await fetch('/api/usuarios/cambiar_password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ cedula, password_actual: passwordActual, password_nueva: nueva.trim() })
            });
            const d = await r.json();
            if (d.success) {
                guardarPassword(nueva.trim());
                alert('Contraseña actualizada correctamente.');
                return nueva.trim();
            }
            alert(d.error || 'No se pudo cambiar la contraseña.');
        } catch (e) {
            alert('Error de conexión: ' + e.message + '. Podés cambiarla más tarde.');
            return passwordActual;
        }
    }
}

function guardarPassword(password) {
    sessionStorage.setItem('user_pw', password);
    const u = getSessionUser();
    if (u && (u.nivel === 'dirigente' || (u.roles && u.roles.some(r => r.rol === 'dirigente')))) {
        sessionStorage.setItem('dirigente_pw', password);
    }
}

// ─── UTILIDADES ───────────────────────────────────────
function getRoleConfig() {
    const u = getSessionUser();
    const rol = getRolActivo();
    if (!rol) return {};
    // Merge user data with active role data
    return {
        ...rol,
        nombre: u?.nombre || '',
        cedula: u?.cedula || ''
    };
}

// ═══════════════════════════════════════════════════════════════════
//  MAPEO ROL → PANEL + SELECTOR DE ROL (navegar entre roles)
//  Fuente única del mapeo (refleja static/roles.html). Lo usan tanto la
//  pantalla "Tus accesos" de acceso.html como el selector flotante.
// ═══════════════════════════════════════════════════════════════════
const PANEL_POR_ROL = {
    dirigente: 'dirigente.html',
    conductor: 'conductor.html',
    veedor: 'veedores.html',
    miembro_mesa: 'asistencia.html',
    // Roles de sistema/partido -> Tablero Institucional (acceso.html)
    master: 'acceso.html', admin: 'acceso.html', nacional: 'acceso.html',
    departamental: 'acceso.html', distrital: 'acceso.html', seccional: 'acceso.html',
    general: 'acceso.html', municipal: 'acceso.html', pc: 'acceso.html'
};
const ROL_LABEL = {
    master: 'Admin General', admin: 'Admin General', nacional: 'Nacional',
    departamental: 'Departamental', distrital: 'Distrital', seccional: 'Seccional',
    general: 'Partido (General)', municipal: 'Municipal', pc: 'Puesto de Comando',
    dirigente: 'Dirigente', conductor: 'Conductor', veedor: 'Veedor', miembro_mesa: 'Miembro de Mesa'
};
const ROL_ICON = {
    master: 'fa-users-gear', admin: 'fa-users-gear', nacional: 'fa-flag', departamental: 'fa-building',
    distrital: 'fa-map-pin', seccional: 'fa-layer-group', general: 'fa-flag', municipal: 'fa-city',
    pc: 'fa-map-marked-alt', dirigente: 'fa-user-tie', conductor: 'fa-truck-fast',
    veedor: 'fa-user-shield', miembro_mesa: 'fa-person-booth'
};

function panelDeRol(rol) { return PANEL_POR_ROL[rol] || 'acceso.html'; }

// Lista de paneles/roles habilitados del usuario (TODOS sus roles, no solo el
// primero), deduplicada por panel destino. Devuelve [{rol, href, label, icon}].
function getPanelesDeUsuario(u) {
    u = u || getSessionUser();
    const roles = (u && u.roles && u.roles.length) ? u.roles.map(r => r.rol)
                : (u && u.nivel ? [u.nivel] : []);
    const out = [];
    const vistos = new Set();
    for (const rol of roles) {
        const href = panelDeRol(rol);
        if (!vistos.has(href)) {
            vistos.add(href);
            out.push({ rol, href, label: ROL_LABEL[rol] || rol, icon: ROL_ICON[rol] || 'fa-user' });
        }
    }
    if (!out.length) out.push({ rol: (u && u.nivel) || '', href: 'acceso.html', label: 'Tablero Institucional', icon: 'fa-landmark' });
    return out;
}

// Navega al panel del rol indicado y deja ese rol como activo.
function irAPanelDeRol(rol) {
    const u = getSessionUser();
    if (u && u.roles) {
        const full = u.roles.find(r => r.rol === rol);
        if (full) setRolActivo(full);
    }
    window.location.href = panelDeRol(rol);
}

// ─── BARRA DE PESTAÑAS DE ROL ─────────────────────────
// Se inyecta solo si el usuario tiene más de un panel. Permite saltar entre
// roles desde cualquier página con un clic, sin volver a loguearse.
function initRolSwitcher() {
    if (typeof getSessionUser !== 'function') return;
    // La pantalla de conductor es un puesto de trabajo táctil durante la jornada;
    // no debe ofrecer cambio de rol en caliente desde el vehículo.
    const paginaActual = (location.pathname.split('/').pop() || '').toLowerCase();
    if (paginaActual === 'conductor.html') return;
    const u = getSessionUser();
    if (!u) return;
    const aqui = (location.pathname.split('/').pop() || 'acceso.html');
    if (aqui === 'acceso.html') return;           // el hub ya muestra los accesos
    const paneles = getPanelesDeUsuario(u);
    if (paneles.length < 2) return;               // un solo panel: no hace falta
    if (document.getElementById('rolTabs')) return;

    // Pestaña activa = el panel de esta página. Si la página actual NO es un panel
    // del mapeo (ej. panel_cliente.html, panel_distrital.html), no se marca ninguna.
    const actual = paneles.find(p => p.href === aqui) || null;
    const tabs = paneles.map(p => {
        const esActual = !!actual && p.href === actual.href;
        return '<button onclick="irAPanelDeRol(\'' + p.rol + '\')" title="Ir a ' + p.label + '" style="' +
            'display:flex;align-items:center;gap:7px;padding:8px 16px;border:0;cursor:pointer;white-space:nowrap;' +
            'font-size:12px;font-weight:800;letter-spacing:.02em;border-radius:999px;transition:all .15s;' +
            (esActual
              ? 'background:linear-gradient(135deg,#dfc07b,#c5a059);color:#09090b;box-shadow:0 4px 14px rgba(197,160,89,.35);'
              : 'background:transparent;color:#cbd5e1;') +
            '"><i class="fas ' + p.icon + '"></i><span>' + p.label + '</span></button>';
    }).join('');

    const bar = document.createElement('div');
    bar.id = 'rolTabs';
    // z-index moderado: por encima del contenido/headers (z-40) pero por DEBAJO de
    // modales (z-50) y del bottom-sheet de conductor.html (z-1000), para no taparlos.
    bar.style.cssText = 'position:fixed;left:0;right:0;bottom:0;z-index:45;display:flex;justify-content:center;pointer-events:none;';
    bar.innerHTML =
        '<div style="pointer-events:auto;display:flex;align-items:center;gap:4px;max-width:100%;overflow-x:auto;padding:7px 10px;' +
        'background:rgba(9,9,11,.94);backdrop-filter:blur(8px);border-top:1px solid rgba(197,160,89,.35);box-shadow:0 -6px 24px rgba(0,0,0,.35);">' +
            '<span style="display:flex;align-items:center;gap:6px;padding:0 12px 0 4px;margin-right:4px;border-right:1px solid rgba(148,163,184,.2);color:#94a3b8;font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.08em;white-space:nowrap;">' +
                '<i class="fas fa-user-tag"></i> Roles</span>' +
            tabs +
        '</div>';
    document.body.appendChild(bar);

    // Deja aire abajo para que la barra no tape el contenido (salvo en páginas de
    // alto fijo tipo conductor.html, donde el layout ya maneja su propio espacio).
    const esAlturaFija = !!document.querySelector('#mainApp[style*="100vh"], .phone-container');
    if (!esAlturaFija) document.body.style.paddingBottom = '58px';
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initRolSwitcher);
} else {
    initRolSwitcher();
}
