# Lógica del Proyecto — SECCIONAL 40

## 1. Visión General

Sistema de **Control Electoral** para la **SECCIONAL 40**, diseñado para gestionar la votación en tiempo real durante una jornada electoral.

### Funcionalidades principales:

1. **Votación por mesa** (`index.html`): Grilla de electores con estado (votó, ausente, controversia) y coloreado por dirigente.
2. **Mesas** (`mesas.html`): Vista general de todas las mesas con estadísticas y gráfico de participación.
3. **Registro de No Voto** (`No_voto.html`): Búsqueda de electores y registro de motivo por el cual no votarán.
4. **Padrón Unificado** (`padron_unificado.html`): Consulta de todo el padrón con filtros por mesa, dirigente y estado.
5. **Anomalías** (`anomalias.html`): Monitoreo de irregularidades detectadas durante la votación.
6. **Seguimiento** (`asistencia.html`): Seguimiento de cargas de formularios por mesa.
7. **Panel del Dirigente** (`dirigente.html`): Acceso para dirigentes con credenciales propias.
8. **Registro QR** (`registro_qr.html`): Solicitud de registro previo vía QR.

---

## 2. Arquitectura

- **Frontend**: HTML + CSS (Tailwind CDN) + JavaScript vanilla
- **Estilos compartidos**: `styles.css` (clases responsive globales)
- **Backend**: Google Apps Script (`Código.gs`) alojado en Google Workspace
- **Base de datos**: Google Sheets (hojas: Padron, Dirigentes, Registros, No_voto, Resumen, Miembros_mesa, Pendientes_QR, Respuestas de formulario 1)
- **Hosting**: GitHub Pages (https://wmlumen.github.io/seccional40/)

### Flujo de datos:

```
Usuario → HTML/JS → fetch (POST para escrituras, GET para lecturas) → 
  Google Apps Script Web App (Código.gs) → Google Sheets
```

---

## 3. Autenticación

- **Nivel Colegio** (`Paraguay40`): Acceso a Votación, Mesas, No Voto
- **Nivel PC** (`Paraguay100`): Acceso completo (incluye Padrón, Anomalías, Seguimiento)
- **Dirigentes**: Autenticación por cédula + contraseña propia (desde hoja Dirigentes)
- El nivel se almacena en `sessionStorage` (`seccional40_nivel`)
- Las escrituras se envían por POST para evitar exposición en URLs/logs

---

## 4. Estructura de Google Sheets

| Hoja | Propósito |
|------|-----------|
| Padron | Lista completa de electores (columnas: SECC, N°, LOCAL, MESA, ORDEN, CEDULA, APELLIDO, NOMBRE, FEC.NAC, DIRIGENTE, VOTO) |
| Dirigentes | Cédula, Nombre, Contraseña de cada dirigente |
| Registros | Timestamp, cédula, nombre, mesa, orden, estado, acción, dirigente, origen |
| No_voto | Timestamp, cédula, mesa, orden, motivo, observación |
| Resumen | Mesa, votos, ausentes, controversias, total, participación % |
| Miembros_mesa | Cédula, nombre, contraseña, mesa, horarios, estado |
| Pendientes_QR | Solicitudes de registro QR pendientes de aprobación |
| Respuestas de formulario 1 | Datos duplicados de Registros para formularios |

---

## 5. Endpoints del Backend (Código.gs)

### GET (lectura):

| Action | Descripción |
|--------|-------------|
| `test` | Verifica conexión con todas las hojas |
| `votos` | Devuelve todos los registros de votación |
| `padron_unificado` | Devuelve el padrón completo con filtros |
| `asignacion_dirigentes` | Mapeo cédula → dirigente |
| `miembros_mesa_v2` | Lista de miembros de mesa |
| `resumen` | Resumen de votación por mesa |
| `no_voto` | Lista de registros de no voto |
| `dirigentes` | Lista de dirigentes |
| `pendientes_qr` | Solicitudes QR pendientes |
| `status` | Estado del servicio |

### POST (escritura):

| Action | Body | Propósito |
|--------|------|-----------|
| `registrar` | `{action, cedula, nombre, mesa, orden, estado, ...}` | Registrar voto, ausente, controversia |
| `registrar_miembro` | `{action, cedula, nombre, password, mesa, ...}` | Crear/actualizar miembro de mesa |
| `registrar_pendiente_qr` | `{action, cedula, nombre, mesa, orden, telefono, ...}` | Solicitud de registro QR |

---

## 6. Diseño Responsive

- **Grilla de votación**: Columnas múltiplo de 5 según ancho (5, 10, 15, 20, 25, 30)
- **Vista lista**: En móvil se muestra como tarjetas verticales; en desktop como tabla
- **Menú de navegación**: Usa `flex-wrap` para distribuir en 2 líneas en pantallas chicas (sin scroll horizontal)
- **Tamaños relativos**: `rem` y viewport-based para tipografía y espaciado

---

## 7. Manejo de errores

- `fetchJsonOrThrow()`: Detecta respuestas HTML del backend (sesión expirada) y muestra mensaje claro
- Estados de carga: Botones deshabilitados durante envío para evitar doble click
- Mensajes de error visibles en la interfaz (no solo en consola)

---

## 8. Seguridad

- [ ] Pendiente: Mover contraseñas a validación exclusivamente server-side
- [x] Escrituras vía POST en vez de GET (desde junio 2026)
- [ ] Pendiente: Rate limiting en el backend
- [ ] Pendiente: Sanitización de inputs de texto
