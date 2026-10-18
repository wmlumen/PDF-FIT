// ═══════════════════════════════════════════════════════════════
// API Config v2 - Redirige llamadas /api al backend local
// ═══════════════════════════════════════════════════════════════
// El frontend usa rutas relativas:
//   /api                       (login, apiPost)
//   /api?action=...            (GET con query)
//   /api/partido/config        (rutas REST)
//   /api/usuarios/cambiar_password
// Cuando la app corre en Firebase Hosting (sin backend), todas esas
// llamadas caen en 404/HTML. Este shim las reescribe al backend local.
//
// Deploy real (firebase.json reenvía TODO a Cloud Run): las rutas
// relativas /api ya llegan al backend sin reescritura — dejar
// LOCAL_API_URL vacío desactiva el shim (ver "if (!BASE) return;"
// abajo). Volver a poner 'http://localhost:8000' solo para probar
// el HTML abriéndolo como archivo local (file://) contra un backend
// corriendo en esta máquina.
//
// IMPORTANTE: si cambiás LOCAL_API_URL, también cambiá CACHE_BUSTER
// en los HTML para forzar recarga del navegador.

window.LOCAL_API_URL = '';

(function () {
    const BASE = window.LOCAL_API_URL;
    if (!BASE) return;

    function esApi(u) {
        return u === '/api' || u.startsWith('/api?') || u.startsWith('/api/');
    }

    function reescribir(u) {
        if (typeof u !== 'string') return u;
        if (u.startsWith(BASE)) return u;          // ya apunta al backend
        if (u.startsWith('http')) return u;        // URL absoluta (CDN, etc.)
        if (esApi(u)) return BASE + u;
        return u;
    }

    // ── Interceptar fetch ──
    const _fetch = window.fetch;
    window.fetch = function (input, init) {
        if (typeof input === 'string') {
            const n = reescribir(input);
            if (n !== input) console.debug('[api-config] fetch', input, '->', n);
            input = n;
        } else if (input && typeof input === 'object' && input.url) {
            const n = reescribir(input.url);
            if (n !== input.url) input = new Request(n, input);
        }
        return _fetch.call(this, input, init);
    };

    // ── Interceptar XMLHttpRequest ──
    const _open = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function (method, url, ...rest) {
        return _open.call(this, method, reescribir(url), ...rest);
    };
})();
