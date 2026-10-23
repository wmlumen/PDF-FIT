# Changelog de Coordinación: Osnap (Refent F3) y Osnap Tracking (F11)

**Fecha:** 2026-10-22
**Agente:** Antigravity
**Módulo:** Motor Cartográfico y Acotamiento CAD/GIS (Mesa Técnica Profesional / Leaflet)

---

### 1. Resumen de Implementación
Se amplió la herramienta de medición y acotamiento integrando dos capacidades clave CAD/GIS:

1. **Osnap / Refent (Referencia a Objetos - F3 / Icono 🗲):**
   - Anclaje automático de precisión milimétrica a cuatro puntos críticos:
     - **Extremo / Vértice (`endpoint`)**: Símbolo `□` verde esmeralda (`#10b981`).
     - **Punto Medio (`midpoint`)**: Símbolo `▲` cyan (`#06b6d4`).
     - **Centro / Centroide (`center`)**: Símbolo `◯` ámbar (`#f59e0b`).
     - **Intersección (`intersection`)**: Símbolo `✕` magenta (`#ec4899`).
   - Elimina desviaciones de click manual, calculando cotas y distancias con la geometría matemática real del dibujo.
   - Atajo de teclado: `F3` conmuta activación interactiva.
   - Botón toolbar: `#map-tool-osnap` con estado visual dinámico.

2. **Osnap Tracking (Rastreo de Refent - F11 / Icono 📐):**
   - Proyección de líneas guía vectoriales imaginarias ortogonales (Horizontal a 0° y Vertical a 90°) o alineadas desde un punto ancla detectado.
   - Permite alinear el cursor, textos y cotas con otros elementos sin necesidad de tocar físicamente el objeto.
   - Atajo de teclado: `F11` conmuta activación interactiva.
   - Botón toolbar: `#map-tool-osnap-tracking` con estado visual dinámico.

3. **Medición Dinámica con Cotas en Tiempo Real:**
   - Previsualización en línea discontinua con tooltip métrico en tiempo real durante el `mousemove`.
   - Generación de rótulo de cota permanente sobre cada segmento medido (`formatMeters` / Leyenda oficial).

---

### 2. Archivos Afectados
- `js/osnapManager.js`: Módulo completo de Osnap y Tracking vectorial con clase `OsnapManager` y utilidades puras.
- `js/mapEngine.js`: Integración de `OsnapManager` en ciclo de vida del mapa, listeners `mousemove`/`click`, y funciones `toggleOsnap`, `toggleOsnapTracking`.
- `index.html`: Botones `#map-tool-osnap` y `#map-tool-osnap-tracking` en la barra de herramientas del mapa.
- `tests/osnap-measurement.test.mjs`: Suite de 8 tests unitarios validando puntos críticos, intersección, centroide, snap magnético, tracking horizontal/vertical y conmutación F3/F11.
- `package.json`: Incorporación de `tests/osnap-measurement.test.mjs` a la suite oficial.

---

### 3. Estado de Verificación
- `npm test`: 34 de 34 suites en verde (100% pasando).
