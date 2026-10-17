---
name: electoral-kpi-dashboard
description: "Estándar de visualización electoral para DIA D MASTER — KPIs de jornada, gráficos y tablas de respaldo con color semántico y datos en vivo."
version: 1.0.0
metadata:
  hermes:
    tags: [electoral, dashboard, kpi, graficos, dondt, tablero, dia-d]
    created_by: agent
---

# Electoral KPI Dashboard — estándar de visualización (DIA D MASTER)

Cómo se ve un tablero de jornada electoral "Día D": qué KPIs, qué gráficos y qué
tablas. Aplica a dhondt.html, escrutinio.html, ranking.html, mesas.html,
transporte.html, veedores.html, consulta_mesa.html y cualquier página nueva.

No reemplaza páginas existentes: define el LENGUAJE VISUAL común para que todas
hablen el mismo idioma. Encaja con la paleta de `styles.css` (grafito + dorado +
pasteles + var(--party-color)) y el theming dinámico de `tema-cliente.css`.

## 1) KPIs esenciales (tarjetas superiores "semáforo")

El comando de campaña mira estos números todo el día:

| KPI | Cálculo | Semáforo / lectura |
|-----|---------|--------------------|
| % Avance de votación | votos emitidos / habilitados de la mesa | rojo <40%, ámbar 40-70%, verde >70% (según hora) |
| Curva de afluencia | votos por hora vs. elección anterior | arriba/abajo de la línea de referencia |
| Abstención / ausentismo | % de habilitados que NO votaron aún | alto = activar transporte |
| Cobertura de mesas | X de Y mesas reportadas | "412/508 (81%)" |
| Votos por lista/candidato | barras ordenadas, ganador arriba | diferencia con el segundo |
| Brecha género/edad | composición M/F y rangos de edad | a quién estás movilizando |

Regla: UN número héroe por pantalla (el % de avance o el ganador), grande, arriba.

## 2) Gráficos que sirven (y para qué)

| Gráfico | Usar para | Color |
|---------|-----------|-------|
| Línea/barras de avance horario | evolución del % de votación hora a hora; picos y valles | var(--party-color) |
| Torta / donut | composición del voto por lista (parte de un todo, %) | color por lista (lista.color_hex) |
| Barras apiladas | voto por lista desglosado por departamento o género | paleta por lista |
| Mapa de calor | dónde ganás/perdés por departamento/distrito | escala partido→neutro |
| D'Hondt | proyección de bancas/escaños (el diferenciador) | destacar, tabla debajo |
| Embudo (funnel) | habilitados → empadronados → votaron (dónde se fuga gente) | degradé partido |
| Gauge / velocímetro | % de avance de escrutinio | arco partido |
| Barras horizontales | ranking de candidatos con color de partido | color de cada uno |

Implementación: Chart.js desde `vendor/` (offline, igual que Leaflet/Tailwind).
Path exacto: `<script src="vendor/chart.umd.js"></script>` → se sirve en
`/vendor/chart.umd.js` vía el mount StaticFiles (NO por el catch-all `/{page}`).
YA ESTÁ DESCARGADO en `static/vendor/chart.umd.js` (v4.4.3, 205 KB, UMD, verificado).
NUNCA CDN en runtime (rompe el modo offline). Si falta, descargarlo de
`https://cdn.jsdelivr.net/npm/chart.js@4/dist/chart.umd.js` a `static/vendor/`.

Nota caché: el backend (`serve_page`, app.py ~8060) sirve .css/.js con
`no-store` y .html con `no-cache`, así los cambios de paleta se ven sin Ctrl+F5.
El mount `/vendor` NO lleva esas cabeceras (da igual, el vendor no cambia).

## 3) Tablas de respaldo (el gráfico resume, la tabla prueba)

Toda visualización lleva su tabla debajo. Columnas mínimas:

- Mesas: mesa, local, habilitados, votaron, %, estado (pendiente/en_curso/cerrada), última actualización. Buscador + orden por columna.
- Escaños D'Hondt: lista, votos, %, escaños. Total al pie.
- Anomalías: mesa, tipo (votos>habilitados, doble voto, acta incompleta), hora, estado de revisión.
- Transporte/ausentismo: votante, estado (pendiente/en_camino/entregado), conductor.
- Afiliados por comité/seccional: con filtro por departamento.

Cada tabla: botón de exportar (XLSX — preferencia del usuario sobre CSV).

## 4) Principios de diseño

1. COLOR = datos, no decoración. var(--party-color) para el partido/candidato focus;
   colores fijos de estado (verde=ok, ámbar=alerta, rojo=problema) para el resto.
   Un color = un significado en TODO el tablero.
2. Tiempo real con fallback honesto: poll a /api cada X s; mostrar SIEMPRE la hora
   de "última actualización". Si el poll falla → estado offline, NUNCA datos viejos
   disfrazados de actuales.
3. Móvil primero: el comando lo mira en el celular en la mesa. Tarjetas apilables,
   tablas con scroll horizontal.
4. Un número héroe por pantalla.
5. Exportable: toda tabla baja a XLSX. "Dato que no se puede bajar, no es oficial."
6. Accesible: contraste sobre el fondo grafito/claro definido; no depender solo del
   color (icono + color para estado).

## 5) Datos — de dónde sale cada KPI en este proyecto

- padron_tsje (padrones.db): habilitados por mesa/local/departamento → denominadores.
- registros (ddia.db, accion='simulacion_general' o real): votos emitidos → numerador.
- candidatos / listas_partido (partido_id=2 PLRA): color_hex para gráficos por lista.
- afiliados_anr / afiliados_plra: composición de voto, transporte.
- Estado de ruta: pendiente → en_curso → completado (SIEMPRE 'completado').

## 6) Pitfalls de datos electorales en vivo

- Mesas que reportan tarde: no asumas 0 = 0 votos; puede ser "sin reportar". Mostrar
  estado 'sin reportar' distinto de '0 votos'.
- Doble conteo: una mesa no debe sumar dos veces. Idempotencia por mesa+acción.
- Deniminador correcto: habilitados de ESA mesa, no del total. El % de avance es local.
- D'Hondt necesita últimos datos: recalcular solo con mesas cerradas; mostrar cuántas
  faltan para no proyectar sobre datos parciales sin avisarlo.
- Zona horaria / hora de corte: fijar la hora de referencia y mostrarla.
- Nunca inventar datos: si el endpoint no da el dato, mostrar "—", no 0.
