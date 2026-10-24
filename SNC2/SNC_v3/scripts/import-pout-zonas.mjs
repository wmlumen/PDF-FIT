// Fase 11, M-2 (POUT) — ver docs/PLAN_FASE11_BACKLOG.md y js/poutEngine.js.
//
// Carga en la base real (db.cjs):
//   1. `usos_suelo`: catálogo de 13 zonas normativas del AMA, transcrito de
//      docs/pout-manuales/generador/_pout_modelo.py (metodología oficial
//      MEF/PNUD/ONU Ambiente — no inventado acá).
//   2. `zonas_pout`: polígonos reales de Capiatá, convertidos del shapefile
//      oficial en docs/pout-manuales/folder-zonificacion-pout-ama/.
//
// El campo `Zonif` del shapefile de Capiatá es texto libre ("Residencial
// baja 1", "Mixta media", ...). Se mapea a un código del catálogo de 13
// zonas SOLO cuando el nombre corresponde con certeza razonable; las zonas
// municipales sin equivalente normativo (Casco histórico, Subestación de
// 220KV, Cementerio, Industrial, Cancha, Interés ambiental 1/2, Residencial
// alta, Residencial baja 2, y las filas sin valor) quedan con
// `codigo_zona = NULL` — js/poutEngine.js las clasifica como `sin_catalogo`
// en vez de adivinar un código.
//
// Uso:
//   node scripts/import-pout-zonas.mjs
//
// Para agregar otro municipio: sumar una entrada a MUNICIPIOS abajo con su
// shapefile, el nombre del campo de zonificación en su .dbf (varía por
// municipio — inspeccionar con shpjs antes de asumirlo) y su propio mapa
// ZONIF_A_CODIGO si el texto difiere del de Capiatá.
globalThis.self = globalThis;

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { dbAPI } from '../db.cjs';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const SHAPEFILES_DIR = path.join(
  ROOT, 'docs', 'pout-manuales', 'folder-zonificacion-pout-ama',
  'ZONIFICACION-USO-DE-SUELO-AMA-y-Jerarquizacion-de-Vias', 'ZONIFICACION USO DE SUELO', 'shapefiles'
);

// ---------------------------------------------------------------------------
// 1. Catálogo de 13 zonas normativas (fuente: docs/pout-manuales/generador/_pout_modelo.py)
// ---------------------------------------------------------------------------
const USOS_SUELO = [
  {
    codigo: 'ZPA', nombre: 'Zona de Protección Ambiental de Recursos Hídricos', tipo: 'Zona de Uso Público',
    descripcion: 'Franja de protección de cauces hídricos. 5 m de ancho en zonas urbanas medidos a partir de las márgenes del cauce.',
    uso_permitido: ['Recreación, ocio y turismo de la naturaleza', 'Infraestructuras livianas y mobiliario urbano vinculado a la recreación y al ocio', 'Infraestructura verde-azul para el manejo y control de las aguas de lluvia'],
    uso_condicionado: [],
    usos_no_permitidos: ['Todo lo que no se encuentra contemplado en los apartados anteriores'],
    altura: '7 m / PB + 1', tasa_ocupacion: '0,05', tasa_permeabilidad: '0,90', edificabilidad: '0,1', retiros: '0 m'
  },
  {
    codigo: 'ZCH', nombre: 'Zona de conservación y restauración de bosques protectores en cauces hídricos', tipo: 'Zona de Protección Ambiental',
    descripcion: 'Franja de bosque protector en cada margen según el ancho del cauce.',
    uso_permitido: ['Recreación, ocio y turismo de la naturaleza', 'Infraestructuras livianas y mobiliario urbano vinculado a la recreación y al ocio', 'Infraestructura verde-azul para el manejo y control de las aguas de lluvia'],
    uso_condicionado: ['Vivienda unifamiliar (cuando la franja de bosque protector cubra la totalidad de la superficie del predio)'],
    usos_no_permitidos: ['Todo lo que no se encuentra contemplado en los apartados anteriores'],
    altura: 'Según Zona', tasa_ocupacion: '0,05 (permitido) / 0,30 (condicionado)', tasa_permeabilidad: '0,90 (permitido) / 0,65 (condicionado)', edificabilidad: 'Según Zona', retiros: 'Según Zona'
  },
  {
    codigo: 'ZAC', nombre: 'Zona de amortiguamiento de cauces hídricos', tipo: 'Zona de Protección Ambiental',
    descripcion: '100 m de ancho a ambas márgenes, a partir del límite de la zona pública del cauce hídrico.',
    uso_permitido: ['Ver según la Zona de Uso de Suelo en que está inserta el cauce hídrico, a excepción de los usos no permitidos'],
    uso_condicionado: ['Ver según la Zona de Uso de Suelo en que está inserta el cauce hídrico, a excepción de los usos no permitidos'],
    usos_no_permitidos: ['Comercios y servicios de gran escala', 'Industrias inocuas, molestas y riesgosas de pequeña, mediana y gran escala', 'Depósitos inocuos, molestos y riesgosos de pequeña, mediana y gran escala', 'Otras actividades que puedan perjudicar al ecosistema y a los recursos hídricos'],
    altura: 'Según Zona', tasa_ocupacion: '0,50', tasa_permeabilidad: '0,65', edificabilidad: 'Según Zona', retiros: 'Según Zona'
  },
  {
    codigo: 'ZPN', nombre: 'Zona de protección de nacientes', tipo: 'Zona de Protección Ambiental',
    descripcion: 'Franja de protección de nacientes de cursos de agua.',
    uso_permitido: ['Recreación, ocio y turismo de la naturaleza', 'Infraestructuras de recreación, ocio y turismo de la naturaleza', 'Infraestructura verde-azul para el manejo y control de las aguas de lluvia'],
    uso_condicionado: [],
    usos_no_permitidos: ['Todo lo que no se encuentra contemplado en los apartados anteriores'],
    altura: 'Según Zona', tasa_ocupacion: '0,05', tasa_permeabilidad: '0,90', edificabilidad: 'Según Zona', retiros: 'Según Zona'
  },
  {
    codigo: 'ZRM', nombre: 'Zona Residencial Media', tipo: 'Zona Residencial',
    descripcion: 'Uso habitacional de media densidad y actividades compatibles, resguardando la seguridad y tranquilidad de la vida doméstica.',
    uso_permitido: ['Vivienda unifamiliar, vivienda adosada, edificio multifamiliar y conjunto habitacional', 'Comercios y servicios de pequeña escala', 'Equipamientos urbanos de pequeña y mediana escala'],
    uso_condicionado: ['Comercios y servicios de mediana escala'],
    usos_no_permitidos: ['Comercios y servicios de mediana y gran escala', 'Equipamientos urbanos de gran escala', 'Industrias inocuas de mediana y gran escala', 'Industrias molestas y riesgosas de pequeña, mediana y gran escala'],
    altura: '19 m / PB + 5', tasa_ocupacion: '0,70', tasa_permeabilidad: '0,20', edificabilidad: '4,2', retiros: 'Retiro frontal 3 m – Calle / 6 m – Avenida'
  },
  {
    codigo: 'ZRB1', nombre: 'Zona Residencial Baja 1', tipo: 'Zona Residencial',
    descripcion: 'Uso habitacional de baja densidad y actividades compatibles, resguardando la seguridad y tranquilidad de la vida doméstica.',
    uso_permitido: ['Vivienda unifamiliar y vivienda adosada', 'Comercios y servicios de pequeña escala', 'Equipamientos urbanos de pequeña escala'],
    uso_condicionado: ['Edificio multifamiliar y conjunto habitacional'],
    usos_no_permitidos: ['Comercios y servicios de mediana y gran escala', 'Equipamientos urbanos de gran escala', 'Industrias inocuas de mediana y gran escala', 'Industrias molestas y riesgosas de pequeña, mediana y gran escala'],
    altura: '10 m / PB + 2', tasa_ocupacion: '0,60', tasa_permeabilidad: '0,25', edificabilidad: '2,8', retiros: 'Retiro frontal 3 m – Calle / 6 m – Avenida'
  },
  {
    codigo: 'ZMA1', nombre: 'Zona Mixta Alta 1', tipo: 'Zona Mixta',
    descripcion: 'Asume la complejidad de la vida urbana: comercios y servicios de pequeña, mediana o gran escala, uso residencial de mayor densidad.',
    uso_permitido: ['Vivienda unifamiliar, vivienda adosada, edificio multifamiliar y conjunto habitacional', 'Comercios y servicios de pequeña, mediana y gran escala', 'Equipamientos urbanos de pequeña, mediana y gran escala'],
    uso_condicionado: ['Depósitos inocuos de pequeña escala'],
    usos_no_permitidos: ['Industrias inocuas de mediana y gran escala', 'Industrias molestas y riesgosas de pequeña, mediana y gran escala', 'Depósitos molestos y riesgosos de pequeña, mediana y gran escala'],
    altura: '49 m / PB + 15', tasa_ocupacion: '0,75', tasa_permeabilidad: '0,15', edificabilidad: '12,0', retiros: 'Retiro frontal 3 m – Calle / 6 m – Avenida'
  },
  {
    codigo: 'ZMA2', nombre: 'Zona Mixta Alta 2', tipo: 'Zona Mixta',
    descripcion: 'Complejidad urbana con predominio de usos mixtos de alta densidad.',
    uso_permitido: ['Vivienda unifamiliar, vivienda adosada, edificio multifamiliar y conjunto habitacional', 'Comercios y servicios de pequeña y mediana escala', 'Equipamientos urbanos de pequeña, mediana y gran escala'],
    uso_condicionado: ['Comercios y servicios de gran escala'],
    usos_no_permitidos: ['Comercios y servicios de gran escala', 'Industrias inocuas de mediana y gran escala', 'Industrias molestas y riesgosas de pequeña, mediana y gran escala', 'Depósitos molestos y riesgosos de pequeña, mediana y gran escala'],
    altura: '25 m / PB + 7', tasa_ocupacion: '0,75', tasa_permeabilidad: '0,15', edificabilidad: '6,0', retiros: 'Retiro frontal 3 m – Calle / 6 m – Avenida'
  },
  {
    codigo: 'ZMM', nombre: 'Zona Mixta Media', tipo: 'Zona Mixta',
    descripcion: 'Usos mixtos de media densidad, residencial y comercios y servicios compatibles.',
    uso_permitido: ['Vivienda unifamiliar, vivienda adosada, edificio multifamiliar y conjunto habitacional', 'Comercios y servicios de pequeña y mediana escala', 'Equipamientos urbanos de pequeña y mediana escala'],
    uso_condicionado: ['Comercios y servicios de gran escala'],
    usos_no_permitidos: ['Industrias inocuas de mediana y gran escala', 'Industrias molestas y riesgosas de pequeña, mediana y gran escala', 'Depósitos molestos y riesgosos de pequeña, mediana y gran escala'],
    altura: '19 m / PB + 5', tasa_ocupacion: '0,75', tasa_permeabilidad: '0,15', edificabilidad: '4,5', retiros: 'Retiro frontal 3 m – Calle / 6 m – Avenida'
  },
  {
    codigo: 'ZMB', nombre: 'Zona Mixta Baja', tipo: 'Zona Mixta',
    descripcion: 'Usos mixtos de baja densidad, predominando el uso residencial.',
    uso_permitido: ['Vivienda unifamiliar, vivienda adosada y edificio multifamiliar', 'Comercios y servicios de pequeña escala', 'Equipamientos urbanos de pequeña escala'],
    uso_condicionado: ['Comercios y servicios de mediana escala'],
    usos_no_permitidos: ['Comercios y servicios de mediana y gran escala', 'Industrias inocuas de mediana y gran escala', 'Industrias molestas y riesgosas de pequeña, mediana y gran escala', 'Depósitos molestos y riesgosos de pequeña, mediana y gran escala'],
    altura: '13 m / PB + 3', tasa_ocupacion: '0,60', tasa_permeabilidad: '0,20', edificabilidad: '2,4', retiros: 'Retiro frontal 3 m – Calle / 6 m – Avenida'
  },
  {
    codigo: 'ZML', nombre: 'Zona Mixta y Logística', tipo: 'Zona Mixta y Logística',
    descripcion: 'Permite actividades logísticas, comercios y servicios de gran escala con impacto por carga y tráfico vehicular.',
    uso_permitido: ['Comercios y servicios de gran escala', 'Depósitos inocuos de pequeña, mediana y gran escala', 'Actividades logísticas y centros de distribución'],
    uso_condicionado: ['Vivienda unifamiliar'],
    usos_no_permitidos: ['Edificio multifamiliar, conjunto habitacional', 'Equipamientos urbanos de mediana y gran escala', 'Industrias inocuas de mediana y gran escala', 'Industrias molestas y riesgosas de pequeña, mediana y gran escala', 'Depósitos molestos y riesgosos de pequeña, mediana y gran escala'],
    altura: '19 m / PB + 5', tasa_ocupacion: '0,75', tasa_permeabilidad: '0,15', edificabilidad: '4,5', retiros: 'Retiro frontal 3 m – Calle / 6 m – Avenida'
  },
  {
    codigo: 'ZIT', nombre: 'Zona Industrial Tecnológica', tipo: 'Zona Industrial Tecnológica',
    descripcion: 'Destinada a la instalación de actividades formativas, científicas, industriales y tecnológicas de bajo impacto ambiental.',
    uso_permitido: ['Actividades industriales y tecnológicas de bajo impacto ambiental', 'Actividades formativas y científicas', 'Comercios y servicios de pequeña y mediana escala'],
    uso_condicionado: ['Depósitos inocuos de pequeña y mediana escala'],
    usos_no_permitidos: ['Loteamientos de urbanizaciones', 'Viviendas unifamiliares, viviendas adosadas, edificios multifamiliares y conjuntos habitacionales', 'Industrias molestas y riesgosas de pequeña, mediana y gran escala'],
    altura: '13 m / PB + 3', tasa_ocupacion: '0,50', tasa_permeabilidad: '0,25', edificabilidad: '2,4', retiros: 'Retiro frontal 6 m – Calle / 10 m – Avenida'
  },
  {
    codigo: 'ZBC', nombre: 'Zona Borde Costero del Río Paraguay', tipo: 'Zona de Borde Costero',
    descripcion: 'Destinada a actividades relacionadas con la recreación y turismo de naturaleza en el borde costero.',
    uso_permitido: ['Recreación, ocio y turismo de la naturaleza', 'Infraestructura verde-azul', 'Vivienda unifamiliar'],
    uso_condicionado: ['Equipamientos urbanos de pequeña escala'],
    usos_no_permitidos: ['Vivienda adosada y conjunto habitacional', 'Comercios y servicios de mediana y gran escala', 'Industrias inocuas, molestas y riesgosas de pequeña, mediana y gran escala', 'Depósitos inocuos, molestos y riesgosos de pequeña, mediana y gran escala'],
    altura: '10 m / PB + 3', tasa_ocupacion: '0,40', tasa_permeabilidad: '0,40', edificabilidad: '1,6', retiros: 'Retiro frontal 5 m'
  }
];
const FUENTE_CATALOGO = 'docs/pout-manuales/generador/_pout_modelo.py (Guía MEF/PNUD/ONU Ambiente, catálogo normativo AMA)';

// ---------------------------------------------------------------------------
// 2. Municipios a importar (shapefile real -> zonas_pout)
// ---------------------------------------------------------------------------
const MUNICIPIOS = [
  {
    municipio: 'capiata',
    shp: path.join(SHAPEFILES_DIR, 'CAPIATA_Zonificacion.shp'),
    dbf: path.join(SHAPEFILES_DIR, 'CAPIATA_Zonificacion.dbf'),
    prj: path.join(SHAPEFILES_DIR, 'CAPIATA_Zonificacion.prj'),
    campoZonificacion: 'Zonif',
    // Solo se mapea cuando el nombre del shapefile corresponde con certeza
    // razonable a una zona del catálogo de 13. El resto queda sin código
    // (ver cabecera de este archivo) en vez de adivinar.
    zonifACodigo: {
      'Residencial baja 1': 'ZRB1',
      'Residencial media': 'ZRM',
      'Mixta baja': 'ZMB',
      'Mixta media': 'ZMM',
      'Mixta alta 1': 'ZMA1',
      'Mixta alta 2': 'ZMA2',
      'Amortiguamiento': 'ZAC'
    },
    fuente: 'docs/pout-manuales/folder-zonificacion-pout-ama/.../shapefiles/CAPIATA_Zonificacion.shp'
  }
  // Para sumar otro municipio: agregar una entrada acá con su propio shp/dbf,
  // el campo de zonificación de su .dbf (verificar con un script de
  // inspección antes — no asumir que es "Zonif" en todos) y su propio mapeo.
];

async function main() {
  const mod = await import('shpjs');
  const shp = mod.default || mod;

  console.log('[pout-import] cargando catálogo de usos de suelo (13 zonas AMA)...');
  for (const zona of USOS_SUELO) {
    await dbAPI.usosSuelo.upsertByCodigo({ ...zona, fuente: FUENTE_CATALOGO });
  }
  console.log(`[pout-import] usos_suelo: ${USOS_SUELO.length} zonas cargadas/actualizadas.`);

  for (const muni of MUNICIPIOS) {
    if (!fs.existsSync(muni.shp) || !fs.existsSync(muni.dbf)) {
      console.log(`[pout-import] SKIP ${muni.municipio}: no se encontró el shapefile (${muni.shp})`);
      continue;
    }
    // Idempotente: una corrida previa (o una corregida, como esta) no debe
    // dejar filas duplicadas ni en una proyección vieja.
    const borradas = await dbAPI.zonasPout.deleteByMunicipio(muni.municipio);
    if (borradas.changes) console.log(`[pout-import] ${muni.municipio}: ${borradas.changes} filas previas borradas antes de reimportar`);
    // El .prj es obligatorio: sin él, shpjs devuelve las coordenadas crudas
    // del shapefile (UTM 21S / EPSG:32721 en estos datos), no WGS84 lon/lat
    // — rompería silenciosamente cualquier intersección contra geometrías
    // que sí están en lon/lat (expedientes, restricciones ambientales).
    const geojson = await shp({
      shp: fs.readFileSync(muni.shp),
      dbf: fs.readFileSync(muni.dbf),
      prj: fs.existsSync(muni.prj) ? fs.readFileSync(muni.prj, 'utf8') : undefined
    });
    const features = Array.isArray(geojson) ? geojson[0].features : geojson.features;
    let insertadas = 0;
    let sinCodigo = 0;
    for (const feature of features) {
      if (!feature.geometry) continue;
      const nombreFuente = String(feature.properties?.[muni.campoZonificacion] || '').trim();
      const codigo = muni.zonifACodigo[nombreFuente] || null;
      if (!codigo) sinCodigo++;
      await dbAPI.zonasPout.insert({
        municipio: muni.municipio,
        codigo_zona: codigo,
        nombre_zona_fuente: nombreFuente || null,
        geojson: feature,
        fuente: muni.fuente
      });
      insertadas++;
    }
    console.log(`[pout-import] ${muni.municipio}: ${insertadas} polígonos cargados (${sinCodigo} sin código normativo mapeado).`);
  }

  console.log('[pout-import] listo.');
}

main().catch(err => {
  console.error('[pout-import] ERROR', err);
  process.exitCode = 1;
});
