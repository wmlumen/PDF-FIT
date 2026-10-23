# PLAN DE TRABAJO — MÓDULOS DE EXPANSIÓN PARA SNC_v3

> **Objetivo:** ampliar SNC_v3 con módulos modulares que puedan activarse por perfil, cubriendo funcionalidades de insumos y manejo de mediciones, planos, reportes y certificados.
>
> **Ramo de trabajo:** Desarrollo de módulos de expansión · Supervisor / estandarizador: `moduleRegistry.js`
> **Versión del plan:** 1.0 · **Estado:** En fase de diseño y implementación básica
> **Nota:** Si ocurría que el archivo de trabajo se eliminaba, lo volve a gestionar a través de este archivo y sus revisones.

---

## 1. Contexto y objetivo

### 1.1 ¿Qué nos pide el usuario?
- Generar un **"módulo"** (o varios módulos) que **puedan activarse para cualquier perfil**.
- Que siga el mismo modelo de los módulos existentes: `js/app/index.js`, `js/mapEngine.js`, `js/workspace.js`, etc., es decir, **plug-and-play**: módulo HTML + JS + CSS, que se activa desde un registro central.
- Generar un **plan de trabajo** que ordene el esfuerzo a lo largo del tiempo, sin perder de vista la fecha de cada hito.

### 1.2 ¿Qué queremos exactamente?
- Módulos reutilizables, **autoactivos por perfil** (principal, municipal, ciudadano, admin) y no "otos programas de ventas".
- Que el usuario no tenga que "empezar a hacer" un módulo (no se quede en estado de "módulo de planos para consultoría"); que el módulo **yahoo** el servicio directamente: medida, validación, certificación y planos.
- Estándar: **STC (Sustainable Technical Coherence)**; el módulo es **conectado**, no "desconexionado".

### 1.3 Resultado esperado (definir)
- **SNC_v3 con módulos activos** (name, description, provenance).
- Módulos de uso común:
  - `surveyModule` (Your measurement module) en 54% de la documentación activa;
  - `planModule` (its generation module) in all; `reportModule` (its report module) in 70% of cases.

---

## 2. Arquitectura propuesta de módulos

Para que los módulos sean "igual de los otros" (es decir, se puedan activar por perfil, sin tocar el código base de cada módulo), se define un **registro central de módulos**.

```
SNC_v3/
  modules/
    moduleRegistry.js          ← Registro central de todos los módulos y sus perfiles
    surveyModule/
      surveyModule.html        ← Ui
      surveyModule.js          ← Lógica
      surveyModule.css         ← Estilos
    planModule/
      planModule.html
      planModule.js
      planModule.css
    reportModule/
      reportModule.html
      reportModule.js
      reportModule.css
    fieldModule/
      fieldModule.html
      fieldModule.js
      fieldModule.css
    envModule/
      envModule.html
      envModule.js
      envModule.css
    analyticsModule/
      analyticsModule.html
      analyticsModule.js
      analyticsModule.css
```

### 1.1 Reglas de activación

- Cada módulo declara en `moduleRegistry.js` qué perfiles lo activan.
- La aplicación carga los módulos **dinámicamente** según el perfil del usuario.
- Los módulos **solapan** (no se sobrecargan): si dos módulos comparten un nombre de archivo, se empieza a usar el módulo activo.
- Si un módulo no está activo, el usuario no lo ve.

---

### 1.2 Estructura de un módulo

```
modules/[moduloID]/
  [moduloID].html
  [moduloID].js
  [moduloID].css
  README.md (opcional: documentación del módulo)
```

**Requisitos para que un módulo sea "activable":**

1. Tener el archivo `html` (la interfaz).
2. Tener el archivo `js` (la lógica).
3. Tener el archivo `css` (los estilos).
4. Registrarse en `moduleRegistry.js` con:
   - `id`, `label`, `description`
   - `defaultOn` (bool) — si es `true`, lo activa por defecto.
   - `profiles` — array de perfiles que lo activan.
5. El módulo debe ser **independiente**: no debe modificar el código base de otros módulos.

---

## 3. Módulos propuestos

### 3.1 surveyModule (Ingreso y Medición de Parcelas)

**Qué hace:**
- Ingreso de datos de campo (puntos por GPS, CSV, GPX).
- Cálculo de distancia, área, ángulos y pendiente.
- Validación de las tolerancias CDM (Urbano ≤1/10 000, Rural ≤1/5 000).
- Guardado de mediciones.

**Perfiles:** principal, municipal, ciudadano, admin.

**Archivos:**
- `surveyModule.html`
- `surveyModule.js`
- `surveyModule.css`

---

### 3.2 planModule (Generación de Planos)

**Qué hace:**
- Genera plano planimétrico y altimétrico de la parcela.
- Exporta a PDF, DXF/DWG, TIFF/GeoTIFF.
- Incluye sello digital / firma electrónica.

**Perfiles:** municipal, admin.

**Archivos:**
- `planModule.html`
- `planModule.js`
- `planModule.css`

---

### 3.3 reportModule (Reportes y Certificados)

**Qué hace:**
- Crea certificados de parcela, reportes de medición, informes técnicos y auditorías ambientales.
- Aplica sello digital.
- Exporta PDFs.
- Validación de sellos.

**Perfiles:** municipal, admin.

**Archivos:**
- `reportModule.html`
- `reportModule.js`
- `reportModule.css`

---

## 4. Stack tecnológico

| Componente | Uso | Estado |
|---|---|---|
| **HTML / CSS** | Interfaz de los módulos | OK (estilos definidos) |
| **JavaScript** | Lógica de los módulos | OK |
| **Leaflet** | Mapas interactivos | OK |
| **Turf.js** | Operaciones geométricas (distancia, área) | OK |
| **proj4** | Conversión de proyecciones | OK |
| **Node.js / Express** | Backend | OK |
| **Firebase** | Base de datos | OK |
| **jsPDF / PDFLib** (opcional) | Generación de PDF | Por integrar |
| **Signo electrónico / PKI** | Certificados y sellos | Por integrar |

---

## 5. Proceso de implementación

### Fase 0 — Preparación
- Verificar que el `moduleRegistry.js` se carga correctamente.
- Alinear el estilo (colors, colores, fuentes, tono) con la hoja de estilos del proyecto.
- Producir los cambios de los módulos y la interfaz.
- Ajustes de layout a los arreglos y las conexiones.

### Fase 1 — Módulo de medición e ingestión de campo
- Crear `js/modules/surveyModule.js` con la lógica completa.
- Crear HTML y CSS para la vista.
- Verificar la lógica de lectura de archivos (CSV, GPX, shapefile).
- Revisiones de la lógica de medición.
- **Hito:** medición de campo funcional en el navegador.

### Fase 2 — Validación de tolerancias
- Implementar la validación de unidades CDM.
- Mostrar errores y advertencias claras.
- **Hito:** validación visible y corregida.

### Fase 3 — Módulo de generación de planos
- Crear `planModule` (planimetría, altimetría).
- Exportar en PDF/DXF/TIFF.
- **Hito:** planos exportados correctamente.

### Fase 4 — Módulo de reportes y certificados
- Crear `reportModule` (certificados, reportes, informes).
- Implementar sellos digitales y firma electrónica.
- **Hito:** certificados funcionales.

### Fase 5 — Módulos avanzados
- `fieldModule` (captura offline en el terreno).
- `envModule` (ambiental, tasación).
- `analyticsModule` (métricas y reportes ejecutivos).

### Fase 6 — Integración y pruebas
- Pruebas de integración con Firebase.
- Pruebas en distintos perfiles.
- Seguridad y rendimiento.
- **Hito:** sistema completo y verificado.

### Fase 7 — Documentación
- Guías de uso para cada módulo.
- Actualizar la documentación del proyecto.
- **Hito:** documento final.

---

## 6. Criterios de aceptación

- ✅ Módulos activados por perfil (principal, municipal, ciudadano, admin).
- ✅ Cada módulo incluye: HTML, CSS, JS, y documentación.
- ✅ Código legible, modular y sin dependencias externas no verificadas.
- ✅ Validación de tolerancias CDM correcta.
- ✅ Exportación de planos y certificados.
- ✅ Pruebas exhaustivas y documentación actualizada.

---

## 7. Entregables

| Entregable | Código | Descripción | Prioridad |
|---|---|---|---|
| Registry del módulo | `moduleRegistry.js` | Registro central de módulos y activación por perfil | Alta |
| Módulo de medición | `surveyModule/` | Ingesta y medición de parcelas | Alta |
| Módulo de planos | `planModule/` | Planos, exportación de PDF/DXF/TIFF | Alta |
| Módulo de reportes | `reportModule/` | Certificados, reportes, sellos digitales | Alta |
| Plan de trabajo | `work_plan.md` | Plan y entregables | Media |
| Documentación | README de módulos | Guías de uso | Baja |

---

## 8. Proximos pasos

1. Verificar la coherencia del `moduleRegistry.js` en el proyecto.
2. Crear la **estructura base** de los módulos (HTML, CSS, JS).
3. Implementar el **módulo de medición y validación**.
4. Ajustar las **herramientas del mapa** (mover el `mapEngine`).
5. Implementar el **módulo de reportes** y sellos digitales.
6. Actualizar la **documentación** y el **manual de usuario**.

> **"Los módulos que se pueden activar por perfil son la forma más rápida de llevar la funcionalidad al usuario final. El éxito es que el usuario vea una mejor interfaz.** Sin más requisitos que la actualización del módulo, la agilidad, si la aplicación tiene inteligencia de naves o es requerida una tabla de aspectos de la nube." — *El módulo es la clave para la alegría de la aplicación.*

---

**Nota:** Este documento es una guía de trabajo. Si el **test** (o la documentación) no cumple, se debe **refactorizar** y volver a verificar antes de entregar.
