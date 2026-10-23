{
  "document": "README_ensamble_auth.md",
  "title": "Ensamblaje de Login: Obsolescencia y Merges",
  "date": "2026-10-23",
  "status": "PENDIENTE_FUSION",
  "build_type": "modular (sin modificar código existente)",
  "backend": {
    "ruta": "./server-api.js",
    "endpoint_login": "/api/auth/login",
    "endpoint_register": "/api/auth/register",
    "endpoint_recover": "/api/auth/recover",
    "endpoint_reset": "/api/auth/reset",
    "authMiddleware": "authMiddleware",
    "adminMiddleware": "adminMiddleware",
    "rateLimit": "rateLimit",
    "sensitiveRateLimit": "sensitiveRateLimit",
    "dbAPI_users": "dbAPI.users (findByEmail, insert, findById, update)"
  },
  "components": [
    {
      "file": "login-directo.html",
      "tipo": "login base",
      "estado": "existing",
      "observaciones": "Formulario con email + password, toggle de mostrar clave, spinner, validación cliente con regex, mapeo de errores HTTP, enlaces de olvidé/contraseña. No tocar."
    },
    {
      "file": "login-safe.html",
      "tipo": "login mejorado (nuevo, sin tocar existente)",
      "estado": "PENDIENTE",
      "descripcion": "Versión con almacenamiento seguro de token (httpOnly cookie o localStorage + httpOnly proxy), protección CSRF, rate limiting en el cliente, mensajes de error más detallados, accesibilidad mejorada (aria-live en caja de error, role=\"alert\" en campos, etiqueta label correcta), y botón de logout.",
      "requisitos_fusion": [
        "Backend debe exponer /api/auth/logout (POST) que invalida el token y limpie localStorage",
        "Backend debe exponer /api/auth/check (GET) que verifique token vigente",
        "Backend debe exponer /api/auth/me (GET) que devuelva perfil del usuario autenticado",
        "CORS configurado para permitir credenciales (withCredentials: true)",
        "HttpOnly cookie name: 'snc_token' o 'snc_session'"
      ],
      "buenas_practicas_apply": [
        "Autocomplete correcto: email y current-password",
        "Toggle contraseña con aria-pressed y aria-label",
        "Loading state: spinner + disabled",
        "Mensajes de error por código HTTP: 400, 401, 403, 409, 429, 500",
        "Validación cliente: regex de email + required",
        "A11y: input label for + id, aria-live para errores"
      ]
    },
    {
      "file": "register.html",
      "tipo": "registro de usuario",
      "estado": "existing",
      "observaciones": "Página de registro existente (referenciada en login-link). Sin modificar."
    },
    {
      "file": "recover.html",
      "tipo": "recuperación de contraseña",
      "estado": "existing",
      "observaciones": "Página de recuperación existente (referenciada en login-link). Sin modificar."
    }
  ],
  "lo_que_falta_para_fusion": [
    {
      "id": 1,
      "componente": "Backend: logout endpoint",
      "descripcion": "POST /api/auth/logout para invalidar token y limpiar localStorage/cookies.",
      "fuente_codigo": "server-api.js (ya existe middlewares authMiddleware, adminMiddleware, rateLimit)",
      "estimado": "10-15 min"
    },
    {
      "id": 2,
      "componente": "Backend: /api/auth/check",
      "descripcion": "GET /api/auth/check para verificar si el token enviado es válido, devolviendo estado de autenticación.",
      "fuente_codigo": "server-api.js (authMiddleware existe; solo falta endpoint)",
      "estimado": "5 min"
    },
    {
      "id": 3,
      "componente": "Backend: /api/auth/me",
      "descripcion": "GET /api/auth/me que devuelve perfil del usuario (email, role, plan, status, created_at).",
      "fuente_codigo": "dbAPI.users.findById existe; endpoint nuevo",
      "estimado": "5 min"
    },
    {
      "id": 4,
      "componente": "CORS config",
      "descripcion": "Configurar CORS para permitir conectar el frontend de login-directo.html con el backend server-api.js.",
      "fuente_codigo": "server-api.js (express cors debe configurarse)",
      "estimado": "10 min"
    },
    {
      "id": 5,
      "componente": "HttpOnly cookie name",
      "descripcion": "Decidir nombre de cookie: 'snc_token' (predeterminado) o 'snc_session'.",
      "fuente_codigo": "ENV.JWT_SECRET, ENV.JWT_EXPIRES en config.env.js",
      "estimado": "5 min"
    },
    {
      "id": 6,
      "componente": "Login front-end: código de tupla",
      "descripcion": "Reemplazar localStorage.setItem('snc_token', token) por envío de cookie con httpOnly, o por un proxy que adapte la respuesta.",
      "fuente_codigo": "login-directo.html (línea 323), login-component.js (nuevo)",
      "estimado": "15-20 min"
    },
    {
      "id": 7,
      "componente": "Login front-end: CSRF token",
      "descripcion": "Añadir token CSRF al login (opcional si se usa httpOnly cookie).",
      "fuente_codigo": "login-directo.html (nuevo)",
      "estimado": "10 min"
    },
    {
      "id": 8,
      "componente": "A11y: aria-live en caja de error",
      "descripcion": "Agregar <div id=\"login-error\" aria-live=\"polite\" role=\"alert\">.",
      "fuente_codigo": "login-directo.html",
      "estimado": "5 min"
    },
    {
      "id": 9,
      "componente": "A11y: role=\"alert\" en campos",
      "descripcion": "Agregar aria-describedby y aria-invalid al input email/password cuando haya error.",
      "fuente_codigo": "login-directo.html",
      "estimado": "5 min"
    },
    {
      "id": 10,
      "componente": "Logout front-end",
      "descripcion": "Añadir botón de logout que llame POST /api/auth/logout y redirija al inicio.",
      "fuente_codigo": "login-directo.html (header/footer), login-component.js",
      "estimado": "10 min"
    }
  ],
  "referencia_frontend": {
    "file": "login-directo.html",
    "lines": {
      "form_start": 137,
      "email_input": 143,
      "password_input": 159,
      "pw_toggle": 168,
      "submit_btn": 182,
      "error_box": 134,
      "localStorage_save": 323,
      "login_route": 325
    }
  },
  "catalogo_backend_endpoints": {
    "existentes": [
      "GET /api/health",
      "GET /api/v3/catastro/vector-view",
      "GET /api/v3/mag/catalog",
      "POST /api/v3/mag/sync",
      "POST /api/municipal/:muniId/publicar",
      "POST /api/map/snc-toggle",
      "POST /api/auth/register",
      "POST /api/auth/login",
      "POST /api/auth/recover",
      "POST /api/auth/reset",
      "POST /api/admin/members",
      "POST /api/admin/members/:id/stats",
      "POST /api/admin/members/:id/block",
      "POST /api/projects",
      "POST /api/projects/temp",
      "POST /api/projects/temp/:id",
      "POST /api/projects/:projectId/expedientes",
      "POST /api/expedientes/:id/files",
      "POST /api/reports",
      "POST /api/autocompletar",
      "POST /api/auth/recover",
      "POST /api/auth/reset"
    ],
    "nuevos_para_fusion": [
      "POST /api/auth/logout",
      "GET /api/auth/check",
      "GET /api/auth/me",
      "GET /api/auth/recover/confirm",
      "GET /api/auth/reset/confirm"
    ]
  },
  "actas_carga": [],
  "errores_y_fijas": [],
  "boletín_de_fusión": "¡Solo tocar server-api.js y login-directo.html!",
  "historial": []
}
