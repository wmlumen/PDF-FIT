import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const DOMAIN_GRAPH_PATH = 'graphify-out/grafo_dominio.json';
const BACKLOG_JSON_PATH = 'docs/PLAN_MEJORA_PRODUCTO_BACKLOG.json';

// 1. Actualizar grafo_dominio.json
const g = JSON.parse(readFileSync(DOMAIN_GRAPH_PATH, 'utf8'));

const nuevoNodo = {
  id: 'pendiente:analisis-territorial-mapa-visor',
  tipo: 'verificacion',
  nombre: 'PENDIENTE — Integración de Mapa Georreferenciado en Análisis Territorial',
  archivo: 'data/analisis/AnalisisTerritorial.html',
  linea: 0,
  datos: {
    estado: 'ABIERTO',
    prioridad: 1,
    modulo: 'Análisis Territorial y Cartografía Municipal',
    contexto: 'El informe de Análisis Territorial (data/analisis/AnalisisTerritorial.html) cuenta con indicadores estadísticos y económicos del Impuesto Inmobiliario 2026, pero requiere un mapa interactivo (Leaflet) integrado que renderice espacialmente el distrito seleccionado, las parcelas con edificación/baldías, las zonas POUT y las franjas de restricción hídrica MADES.',
    evidencia_real: {
      implementado_ok: 'CSS institucional 10x aplicado a data/analisis/analisis.css (paleta Navy/Gold/Slate, tokens semánticos, tarjetas KPI, matrices FODA, tablas y modo print A4). Endpoint /analisis-territorial.html configurado en server-api.js:1673.',
      falta: [
        'Contenedor Leaflet interactivo montado en AnalisisTerritorial.html (#mapa-territorial).',
        'Lógica en data/analisis/analisis-app.js para escuchar el cambio de distrito (sel-dist) y ajustar el encuadre/bounds del mapa.',
        'Superposición de capas GeoJSON: polígono del distrito (/data/distritos_py_light.geojson o /data/municipal/<distrito>), faja hídrica de 30m (MADES Ley 3239/07) y zonas POUT.',
        'Popup interactivo sobre parcelas que muestre padrón, superficie, valuación fiscal y estado ambiental.'
      ],
      causa_raiz: 'AnalisisTerritorial.html nació como dashboard gráfico con Chart.js pero sin integración espacial nativa al motor de mapas Leaflet del SNC.'
    },
    pendiente_detalle: [
      '1. Agregar contenedor de mapa <div id="mapa-territorial" class="lienzo alto"> dentro de AnalisisTerritorial.html.',
      '2. En data/analisis/analisis-app.js inicializar L.map("mapa-territorial") con mapa base OSM/Carto e inyectar estilos de analisis.css.',
      '3. Cargar /data/distritos_py_light.geojson para filtrar la geometría del distrito seleccionado y hacer map.fitBounds().',
      '4. Vincular con capas de /data/municipal/<distrito> (ej. Piribebuy) si existen datos vectoriales detallados.',
      '5. Conectar evaluación de restricciones ambientales con /api/parcelas/:id/evaluar-ambiental o el motor js/ambientalEngine.js.'
    ],
    como_retomar: 'Abrir data/analisis/AnalisisTerritorial.html y data/analisis/analisis-app.js. Incluir /vendor/leaflet.js y /vendor/leaflet.css en el head (o CDN autorizada por CSP). Inicializar el mapa dentro de la función dibujar(d) de analisis-app.js llamando a un nuevo helper dibujarMapa(d).',
    api_a_reusar: [
      'server-api.js:1673 (/analisis-territorial.html)',
      'server-api.js:113 (/data/distritos_py_light.geojson)',
      'server-api.js:117 (/data/municipal)',
      'server-api.js:1680 (/api/spatial-identify)',
      'js/mapEngine.js (referencia de Leaflet y CRS UTM 21S)'
    ],
    riesgos_conocidos: [
      'CSP estricta en server-api.js: script-src y style-src solo permiten self, unpkg, cdnjs, jsdelivr. Cargar Leaflet siempre desde /vendor/ o CDN permitida.',
      'Rendimiento móvil: no cargar GeoJSON completos de gran tamaño sin simplificar.',
      'Codificación UTF-8 sin BOM obligatoria en todo archivo (AGENTS.md §1.3).'
    ]
  }
};

g.nodos = g.nodos.filter(n => n.id !== nuevoNodo.id);
g.nodos.push(nuevoNodo);

const nuevasAristas = [
  { source: nuevoNodo.id, target: 'data/analisis/AnalisisTerritorial.html', tipo: 'implementa', descripcion: 'Contenedor y vista del mapa' },
  { source: nuevoNodo.id, target: 'data/analisis/analisis-app.js', tipo: 'logica', descripcion: 'Inicialización de mapa y reactividad al distrito' },
  { source: nuevoNodo.id, target: 'server-api.js', tipo: 'consumo', descripcion: 'Endpoints de GeoJSON distrital y capas municipales' }
];

g.aristas = g.aristas.filter(a => a.source !== nuevoNodo.id);
g.aristas.push(...nuevasAristas);

writeFileSync(DOMAIN_GRAPH_PATH, JSON.stringify(g, null, 2), 'utf8');
console.log('✅ graphify-out/grafo_dominio.json actualizado.');

// 2. Actualizar PLAN_MEJORA_PRODUCTO_BACKLOG.json si existe
try {
  const backlog = JSON.parse(readFileSync(BACKLOG_JSON_PATH, 'utf8'));
  const nuevaTarea = {
    id: 'PM-40',
    carril: 'B',
    accion: 'Mapa interactivo en Análisis Territorial: integrar Leaflet sincronizado con el selector de distritos, mostrando perímetro distrital, capas de parcelas y fajas hídricas.',
    depende_de: 'PM-04',
    archivos: [
      'data/analisis/AnalisisTerritorial.html',
      'data/analisis/analisis-app.js',
      'data/analisis/analisis.css'
    ],
    criterio_de_cierre: 'Al cambiar el selector de distrito en /analisis-territorial.html, el mapa Leaflet se re-encuadra al BBOX del distrito y proyecta sus capas vectoriales y restricciones.',
    estado: 'abierto'
  };

  const idx = backlog.tareas.findIndex(t => t.id === 'PM-40');
  if (idx >= 0) {
    backlog.tareas[idx] = nuevaTarea;
  } else {
    backlog.tareas.push(nuevaTarea);
  }

  writeFileSync(BACKLOG_JSON_PATH, JSON.stringify(backlog, null, 2), 'utf8');
  console.log('✅ docs/PLAN_MEJORA_PRODUCTO_BACKLOG.json actualizado con PM-40.');
} catch (err) {
  console.error('Error al actualizar backlog json:', err.message);
}
