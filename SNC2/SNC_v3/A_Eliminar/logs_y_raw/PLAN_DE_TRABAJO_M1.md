Este repositorio no tiene index-profesional.md, como ya lo detectamos. El enfoque principal del proyecto (según la investigación) está en la API en server-api.js, js/geodesia.js (implementado para R1–R10), tests/db-modulo1.test.mjs (pasaron), y el workflow (Módulo 9). En el mismo server-api.js, ya hay un endpoint GET /api/health, API de proyectos, etc. Se necesita un endpoint Módulo 1: por ejemplo, GET /api/modulo1/estado, GET /api/modulo1/coordinates, etc. para que el frontend (index.html, index-municipal.html) pueda consumir.

Resumen del plan de trabajo actual:
- Ya se implementó js/geodesia.js (Módulo 1 R1–R10).
- Ya se implementó tests/db-modulo1.test.mjs (completamente OK).
- El workflow está listo (Módulo 9).
- El admin index/index-municipal.html existe (verificado).

Acción siguiente: integrar la API del Módulo 1 en server-api.js con:
   - GET /api/modulo1/estado: devuelve el estado, las transiciones permitidas, el perfil geodésico actual (ZONA_USADA, DATUM_USADO), etc.
   - GET /api/modulo1/coordinates: devuelve un GeoJSON de la geometría UTM actual (basado en la geometría que ahora se genera vía export.js)
   - GET /api/modulo1/certificate: devuelve un certificado de exportación del Módulo 1 (como export.js genera)
   - POST /api/modulo1/validate: valida la geometría del Módulo 1 usando validator.js
   - POST /api/modulo1/export: realiza la exportación del Módulo 1 (integración con export.js)

Tareas:
   - Editar server-api.js: agregar importaciones, authMiddleware, rutas del Módulo 1.
   - Agregar esta API en la misma documentación existente del index-profesional (quizás necesitamos un placeholder documentado como un archivo index-profesional.md).

Resumen del plan de acción:
   - Integrar la API del Módulo 1 en server-api.js y el `script.js` correspondiente.
   - Editar package.json para incluir la API del Módulo 1 si es necesario.
   - Verificar que `npm test` pase completamente.
   - Si hay que crear un archivo index-profesional.md para documentar esta API, agregar uno como registro de seguimiento.