// ═══════════════════════════════════════════════════════════════
// API Config - Redirige llamadas /api al backend local
// ═══════════════════════════════════════════════════════════════
// El frontend usa rutas relativas:
//   /api                       (login, apiPost)
//   /api?action=...            (GET con query)
//   /api/partido/config        (rutas REST)
//   /api/usuarios/cambiar_password
// Cuando la app corre en Firebase Hosting (sin backend), todas esas
// llamadas caen en 404/HTML. Este shim las reescribe al backend local.

window.LOCAL_API_URL = 'http://localhost:8000';

(function () {
    const BASE = window.LOCAL_API_URL;
    if (!BASE) return;

    function esApi(u) {
        // '/api' exacto, '/api?query' o '/api/resto'
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
            input = reescribir(input);
        } else if (input && typeof input === 'object' && input.url) {
            const nueva = reescribir(input.url);
            if (nueva !== input.url) {
                input = new Request(nueva, input);
            }
        }
        return _fetch.call(this, input, init);
    };

    // ── Interceptar XMLHttpRequest (por si algún HTML lo usa) ──
    const _open = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function (method, url, ...rest) {
        return _open.call(this, method, reescribir(url), ...rest);
    };
})();
