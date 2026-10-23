// Arquitectura del módulo POUT Municipal en SNC_v3
// Arquitectura del Módulo POUT Municipal (integración con servidor SNC_v3)
// 1. Web Server (server-api.js)
//    - Agrega ruta '/Pout' para servir recursos estáticos:
//      app.use('/Pout', express.static(join(__dirname, 'Pout'), STATIC_OPTIONS));

// 2. Módulo POUT (carpeta /Pout)
//    - poutModule.html      → UI principal dentro del layout del SNC_v3 (drawer modal)
//    - poutModule.js       → lógica del módulo: diagnóstico, estado/vigencia, geoportal, bitácora, recursos oficiales.
//    - poutModule.css      → estilos: tokens SNC, componentes reutilizables, acorde con planModule.css / surveyModule.css.

// 3. Drawer de integración (js/openPoutModule.js)
//    - Se inyecta en index.html como script.
//    - Al hacer clic en el botón de header (id="btn-pout-module"):
//      • Si ya existe el drawer, mostrarlo; si no, crearlo.
//      • El drawer carga /Pout/poutModule.html dentro de un iframe con sandbox.
//      • Layout: similar al panel lateral derecho (z-index alto, backdrop-blur, transición).
//    - Cerrar con botón o ESC.

// 4. Enlace en index.html (header)
//    <button id="btn-pout-module" onclick="window.openPoutModule?.()"
//              class="btn-tool header-icon-btn"
//              data-tooltip="Módulo POUT Municipal"
//              title="Módulo POUT Municipal">
//      <i class="fas fa-file-signature text-amber-300"></i>
//    </button>
//    • Se añade script (js/openPoutModule.js) después de js/app.js.

// 5. Recursos oficiales (4.1)
//    • Tabla en /Pout/poutModule.html con fuentes oficiales: INE, MAG, MADES, MOPC, IGN Paraguay.
//    • Enlaces externos con target="_blank".
//
// 6. Diagrama de flujo del módulo POUT (10 × mejorado)
//    1. Dashboard de diagnóstico territorial → guardar/mostrar estadísticas.
//    2. Panel de estado del POUT (vigencia) → evaluar vigencia (>=5 años) y alertas.
//    3. Geoportal interactivo → mapa base OSM + capas oficiales MAG/MADES.
//    4. Bitácora / auditoría → registrar cambios con hash SHA-256.
//    5. Exportar datos (JSON) para municipios o exportar capa (GeoJSON/SHP).
//    6. Generator de ordenanza (stub) → generar PDF institucional.
//    7. Recursos oficiales → navegación directa a geoportales paraguayos.
//    8. Alertas de actualización periódica → notificar al MEF/STP.
//    9. Trazabilidad de cambios → git local, hash SHA-256 para archivos espaciales, IPFS opcional.
//   10. Dashboard de métricas → pop-ups con KPIs por municipio.
//
// 7. Dashboard de métricas (opcional)
//    • Gráficos de barras/lineales (d3 o Chart.js) para:
//        - crecimiento poblacional, acceso a servicios, planificación territorial.
//    • Exportar dashboards (CSV/PNG) para uso institucional.
//
// 8. API nacional con MEF/STP
//    • GET /api/pout/municipios/:codigo → devuelve el POUT del municipio.
//    • POST /api/pout/export/:tipo → descarga Excel, SHP, GeoJSON o PDF institucional.
//
// 9. Módulo reutilizable (para otros proyectos paraguayos)
//    • Exportar como módulo standalone (HTML+JS+CSS) respetando el esquema visual SNC.
//
// 10. Seguridad institucional (heredado de SNC_v3)
//    • Autenticación OAuth 2.0 para endpoints.
//    • TLS/SSL para tráfico externo.
//    • Auditoría en log (db.log) e integridad SHA-256.
