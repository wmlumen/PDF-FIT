/**
 * municipalPatentesServicio.js - Gestión Municipal / Catastro Distrital / POUT (Ley 3966)
 *
 * Módulo de fiscalización territorial de locales comerciales, inspectores municipales,
 * estados de patente comercial (con patente, sin patente, patente vencida, inhabilitada, no declarada)
 * y liquidaciones tributarias municipales.
 */

import Database from 'better-sqlite3';
import { existsSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = dirname(fileURLToPath(import.meta.url));
const DB_DIR = join(RAIZ, 'data', 'municipal');
const DB_PATH = join(DB_DIR, 'patentes_comerciales.sqlite');

export const ESTADOS_PATENTE = {
  CON_PATENTE: 'con_patente',          // Patente vigente y canon al día
  SIN_PATENTE: 'sin_patente',          // Local activo sin patente (clandestino/no registrado)
  PATENTE_VENCIDA: 'patente_vencida',  // Patente con plazo vencido pendiente de pago
  INHABILITADA: 'inhabilitada',        // Local clausurado/inhabilitado por resolución
  NO_DECLARADA: 'no_declarada'         // Actividad comercial detectada no declarada a catastro
};

export const ETIQUETAS_ESTADO = {
  con_patente: { label: 'Con Patente Vigente', color: '#10b981', badge: 'bg-emerald-950 text-emerald-300 border-emerald-800' },
  sin_patente: { label: 'Sin Patente (Clandestino)', color: '#ef4444', badge: 'bg-red-950 text-red-300 border-red-800' },
  patente_vencida: { label: 'Patente Vencida', color: '#f59e0b', badge: 'bg-amber-950 text-amber-300 border-amber-800' },
  inhabilitada: { label: 'Inhabilitada / Clausurada', color: '#6b7280', badge: 'bg-slate-800 text-slate-300 border-slate-700' },
  no_declarada: { label: 'No Declarada a Catastro', color: '#8b5cf6', badge: 'bg-purple-950 text-purple-300 border-purple-800' }
};

let db = null;

export function getDb() {
  if (!db) {
    if (!existsSync(DB_DIR)) mkdirSync(DB_DIR, { recursive: true });
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('synchronous = NORMAL');
    inicializarEsquema();
  }
  return db;
}

function inicializarEsquema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS locales_comerciales (
      id TEXT PRIMARY KEY,
      cta_cte TEXT NOT NULL,
      dpto TEXT NOT NULL,
      dist TEXT NOT NULL,
      nombre_fantasia TEXT NOT NULL,
      razon_social TEXT,
      ruc TEXT,
      rubro TEXT NOT NULL,
      estado TEXT NOT NULL CHECK(estado IN ('con_patente', 'sin_patente', 'patente_vencida', 'inhabilitada', 'no_declarada')),
      nro_patente TEXT,
      vencimiento_patente TEXT,
      m2_comercial REAL DEFAULT 0,
      canon_anual_gs INTEGER DEFAULT 0,
      inspector_asignado TEXT,
      ultima_inspeccion TEXT,
      nro_acta TEXT,
      observaciones TEXT,
      lat REAL,
      lng REAL,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS actas_inspeccion (
      id TEXT PRIMARY KEY,
      local_id TEXT NOT NULL,
      inspector TEXT NOT NULL,
      fecha TEXT NOT NULL,
      estado_verificado TEXT NOT NULL,
      nro_acta TEXT NOT NULL,
      resultado TEXT NOT NULL,
      notificado_propietario INTEGER DEFAULT 0,
      plazo_descargo_dias INTEGER DEFAULT 5,
      observaciones TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY(local_id) REFERENCES locales_comerciales(id)
    );

    CREATE INDEX IF NOT EXISTS idx_pat_cta ON locales_comerciales(cta_cte);
    CREATE INDEX IF NOT EXISTS idx_pat_dist ON locales_comerciales(dpto, dist);
    CREATE INDEX IF NOT EXISTS idx_pat_estado ON locales_comerciales(estado);
  `);

  // Semilla de demostración si la tabla está vacía
  const count = db.prepare('SELECT count(*) as total FROM locales_comerciales').get().total;
  if (count === 0) {
    insertarSemillasDemo();
  }
}

function insertarSemillasDemo() {
  const seedLocales = [
    {
      id: 'LOC-D12-001',
      cta_cte: '190073-08/00-000',
      dpto: 'D',
      dist: '12',
      nombre_fantasia: 'Supermercado y Ferretería El Centro',
      razon_social: 'Comercial Piribebuy S.A.',
      ruc: '80012345-6',
      rubro: 'Venta de Alimentos y Ferretería',
      estado: 'con_patente',
      nro_patente: 'PAT-2026-0412',
      vencimiento_patente: '2026-12-31',
      m2_comercial: 280.5,
      canon_anual_gs: 1450000,
      inspector_asignado: 'Carlos Benítez (Insp. 04)',
      ultima_inspeccion: '2026-08-15',
      nro_acta: 'ACT-084/2026',
      observaciones: 'Local habilitado con extintores y salida de emergencia según ordenanza.',
      lat: -25.4665,
      lng: -57.0423
    },
    {
      id: 'LOC-D12-002',
      cta_cte: '190805-01/00-000',
      dpto: 'D',
      dist: '12',
      nombre_fantasia: 'Taller Mecánico San Blas',
      razon_social: 'Blas Antonio Gómez',
      ruc: '3456789-1',
      rubro: 'Taller Mecánico y Chapería',
      estado: 'sin_patente',
      nro_patente: null,
      vencimiento_patente: null,
      m2_comercial: 120.0,
      canon_anual_gs: 0,
      inspector_asignado: 'Ramón Silva (Insp. 02)',
      ultima_inspeccion: '2026-09-10',
      nro_acta: 'ACT-102/2026',
      observaciones: 'Actividad clandestina detectada en zona residencial. Notificado para descargo.',
      lat: -25.4688,
      lng: -57.0451
    },
    {
      id: 'LOC-D12-003',
      cta_cte: '190014-05/00-000',
      dpto: 'D',
      dist: '12',
      nombre_fantasia: 'Farmacia y Perfumería La Salud',
      razon_social: 'FarmaSalud S.R.L.',
      ruc: '80054321-9',
      rubro: 'Farmacia y Cosmética',
      estado: 'patente_vencida',
      nro_patente: 'PAT-2025-0199',
      vencimiento_patente: '2025-12-31',
      m2_comercial: 85.0,
      canon_anual_gs: 680000,
      inspector_asignado: 'Carlos Benítez (Insp. 04)',
      ultima_inspeccion: '2026-07-20',
      nro_acta: 'ACT-073/2026',
      observaciones: 'Patente comercial vencida 1er y 2do semestre. Deuda liquidada con recargo.',
      lat: -25.4642,
      lng: -57.0410
    },
    {
      id: 'LOC-D12-004',
      cta_cte: '190022-11/00-000',
      dpto: 'D',
      dist: '12',
      nombre_fantasia: 'Depósito de Bebidas Los Hermanos',
      razon_social: 'Distribuidora Hnos. Martínez',
      ruc: '80098765-4',
      rubro: 'Depósito y Distribución',
      estado: 'inhabilitada',
      nro_patente: 'PAT-2024-0050',
      vencimiento_patente: '2024-06-30',
      m2_comercial: 350.0,
      canon_anual_gs: 0,
      inspector_asignado: 'Marta Villalba (Insp. Jefa)',
      ultima_inspeccion: '2026-05-18',
      nro_acta: 'ACT-CLAUS-012/26',
      observaciones: 'Clausurado por Res. Intendencia Nº 45/2026 por ruidos molestos e infracción POUT.',
      lat: -25.4695,
      lng: -57.0380
    },
    {
      id: 'LOC-D12-005',
      cta_cte: '190045-03/00-000',
      dpto: 'D',
      dist: '12',
      nombre_fantasia: 'Gimnasio y Centro Fitness Atenas',
      razon_social: 'Mario Cáceres',
      ruc: '2987654-0',
      rubro: 'Gimnasio / Deportes',
      estado: 'no_declarada',
      nro_patente: null,
      vencimiento_patente: null,
      m2_comercial: 190.0,
      canon_anual_gs: 0,
      inspector_asignado: 'Ramón Silva (Insp. 02)',
      ultima_inspeccion: '2026-10-02',
      nro_acta: 'ACT-118/2026',
      observaciones: 'Construcción comercial de 190 m² no declarada en catastro municipal (figura como baldío).',
      lat: -25.4671,
      lng: -57.0438
    }
  ];

  const stmt = db.prepare(`
    INSERT INTO locales_comerciales (
      id, cta_cte, dpto, dist, nombre_fantasia, razon_social, ruc, rubro, estado,
      nro_patente, vencimiento_patente, m2_comercial, canon_anual_gs,
      inspector_asignado, ultima_inspeccion, nro_acta, observaciones, lat, lng
    ) VALUES (
      @id, @cta_cte, @dpto, @dist, @nombre_fantasia, @razon_social, @ruc, @rubro, @estado,
      @nro_patente, @vencimiento_patente, @m2_comercial, @canon_anual_gs,
      @inspector_asignado, @ultima_inspeccion, @nro_acta, @observaciones, @lat, @lng
    )
  `);

  for (const loc of seedLocales) {
    stmt.run(loc);
  }
}

/**
 * Lista locales comerciales con filtros por distrito, estado de patente y búsqueda de texto
 */
export function listarLocales({ dpto = 'D', dist = '12', estado = '', q = '', limit = 100 } = {}) {
  const d = getDb();
  let sql = 'SELECT * FROM locales_comerciales WHERE dpto = ? AND dist = ?';
  const params = [dpto, dist];

  if (estado && Object.values(ESTADOS_PATENTE).includes(estado)) {
    sql += ' AND estado = ?';
    params.push(estado);
  }

  if (q) {
    sql += ' AND (nombre_fantasia LIKE ? OR razon_social LIKE ? OR ruc LIKE ? OR cta_cte LIKE ? OR rubro LIKE ?)';
    const term = `%${q}%`;
    params.push(term, term, term, term, term);
  }

  sql += ' ORDER BY estado, nombre_fantasia LIMIT ?';
  params.push(limit);

  const rows = d.prepare(sql).all(...params);
  return rows.map(r => ({
    ...r,
    meta_estado: ETIQUETAS_ESTADO[r.estado] || {}
  }));
}

/**
 * Obtiene el detalle de un local comercial por su ID
 */
export function obtenerLocalPorId(id) {
  const d = getDb();
  const row = d.prepare('SELECT * FROM locales_comerciales WHERE id = ?').get(id);
  if (!row) return null;
  const actas = d.prepare('SELECT * FROM actas_inspeccion WHERE local_id = ? ORDER BY fecha DESC').all(id);
  return {
    ...row,
    meta_estado: ETIQUETAS_ESTADO[row.estado] || {},
    actas
  };
}

/**
 * Obtiene locales comerciales vinculados a una Cuenta Corriente Catastral
 */
export function obtenerLocalesPorCtaCte(cta_cte) {
  const d = getDb();
  const rows = d.prepare('SELECT * FROM locales_comerciales WHERE cta_cte = ?').all(cta_cte);
  return rows.map(r => ({
    ...r,
    meta_estado: ETIQUETAS_ESTADO[r.estado] || {}
  }));
}

/**
 * Registra o actualiza una fiscalización de inspector municipal
 */
export function registrarInspeccion({
  local_id,
  cta_cte,
  dpto = 'D',
  dist = '12',
  nombre_fantasia,
  razon_social = '',
  ruc = '',
  rubro,
  estado,
  nro_patente = '',
  vencimiento_patente = '',
  m2_comercial = 0,
  canon_anual_gs = 0,
  inspector,
  nro_acta,
  observaciones = '',
  lat = null,
  lng = null
}) {
  const d = getDb();
  if (!Object.values(ESTADOS_PATENTE).includes(estado)) {
    throw new Error(`Estado de patente inválido. Opciones: ${Object.values(ESTADOS_PATENTE).join(', ')}`);
  }
  if (!cta_cte || !nombre_fantasia || !inspector || !nro_acta) {
    throw new Error('cta_cte, nombre_fantasia, inspector y nro_acta son obligatorios');
  }

  const id = local_id || `LOC-${dpto}${dist}-${Date.now().toString().slice(-6)}`;
  const fechaHoy = new Date().toISOString().split('T')[0];

  const stmt = d.prepare(`
    INSERT INTO locales_comerciales (
      id, cta_cte, dpto, dist, nombre_fantasia, razon_social, ruc, rubro, estado,
      nro_patente, vencimiento_patente, m2_comercial, canon_anual_gs,
      inspector_asignado, ultima_inspeccion, nro_acta, observaciones, lat, lng, updated_at
    ) VALUES (
      ?, ?, ?, ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?,
      ?, ?, ?, ?, ?, ?, datetime('now')
    )
    ON CONFLICT(id) DO UPDATE SET
      cta_cte=excluded.cta_cte,
      nombre_fantasia=excluded.nombre_fantasia,
      razon_social=excluded.razon_social,
      ruc=excluded.ruc,
      rubro=excluded.rubro,
      estado=excluded.estado,
      nro_patente=excluded.nro_patente,
      vencimiento_patente=excluded.vencimiento_patente,
      m2_comercial=excluded.m2_comercial,
      canon_anual_gs=excluded.canon_anual_gs,
      inspector_asignado=excluded.inspector_asignado,
      ultima_inspeccion=excluded.ultima_inspeccion,
      nro_acta=excluded.nro_acta,
      observaciones=excluded.observaciones,
      lat=coalesce(excluded.lat, locales_comerciales.lat),
      lng=coalesce(excluded.lng, locales_comerciales.lng),
      updated_at=datetime('now')
  `);

  stmt.run(
    id, cta_cte, dpto, dist, nombre_fantasia, razon_social, ruc, rubro, estado,
    nro_patente || null, vencimiento_patente || null, Number(m2_comercial) || 0, Math.round(Number(canon_anual_gs) || 0),
    inspector, fechaHoy, nro_acta, observaciones, lat, lng
  );

  // Registrar el acta en el historial de inspección
  const actaId = `ACT-${Date.now()}`;
  d.prepare(`
    INSERT INTO actas_inspeccion (
      id, local_id, inspector, fecha, estado_verificado, nro_acta, resultado, observaciones
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    actaId, id, inspector, fechaHoy, estado, nro_acta,
    `Inspección territorial: ${ETIQUETAS_ESTADO[estado]?.label || estado}`,
    observaciones
  );

  return obtenerLocalPorId(id);
}

/**
 * Resumen estadístico y financiero de fiscalización por municipio
 */
export function obtenerResumenDistrito(dpto = 'D', dist = '12') {
  const d = getDb();
  const conteos = d.prepare(`
    SELECT estado, count(*) as cantidad, sum(m2_comercial) as total_m2, sum(canon_anual_gs) as total_canon
    FROM locales_comerciales
    WHERE dpto = ? AND dist = ?
    GROUP BY estado
  `).all(dpto, dist);

  const resumen = {
    dpto,
    dist,
    total_locales: 0,
    con_patente: 0,
    sin_patente: 0,
    patente_vencida: 0,
    inhabilitada: 0,
    no_declarada: 0,
    recaudacion_actual_gs: 0,
    recaudacion_potencial_pendiente_gs: 0,
    total_m2_comerciales: 0,
    porcentajes: {}
  };

  for (const c of conteos) {
    resumen.total_locales += c.cantidad;
    resumen.total_m2_comerciales += (c.total_m2 || 0);

    if (c.estado === 'con_patente') {
      resumen.con_patente = c.cantidad;
      resumen.recaudacion_actual_gs += (c.total_canon || 0);
    } else if (c.estado === 'sin_patente') {
      resumen.sin_patente = c.cantidad;
      // Estimación de canon evadido: 5.000 Gs / m² anual
      resumen.recaudacion_potencial_pendiente_gs += Math.round((c.total_m2 || 0) * 5000);
    } else if (c.estado === 'patente_vencida') {
      resumen.patente_vencida = c.cantidad;
      resumen.recaudacion_potencial_pendiente_gs += (c.total_canon || 0);
    } else if (c.estado === 'inhabilitada') {
      resumen.inhabilitada = c.cantidad;
    } else if (c.estado === 'no_declarada') {
      resumen.no_declarada = c.cantidad;
      resumen.recaudacion_potencial_pendiente_gs += Math.round((c.total_m2 || 0) * 6000);
    }
  }

  if (resumen.total_locales > 0) {
    resumen.porcentajes = {
      al_dia_pct: Math.round((resumen.con_patente / resumen.total_locales) * 100),
      irregular_pct: Math.round(((resumen.sin_patente + resumen.patente_vencida + resumen.no_declarada) / resumen.total_locales) * 100)
    };
  }

  return resumen;
}
