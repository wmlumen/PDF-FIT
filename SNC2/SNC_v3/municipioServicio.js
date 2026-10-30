/**
 * Tablero de gestión catastral de un municipio (portal municipal): reúne lo que el sistema ya calculó del distrito.
 *   - Liquidación 2026 (data/analisis/analisis-datos.js, generado por scripts/analisis-territorial.mjs)
 *   - Parcelario SNC vinculado (data/parcelario/<D>_<N>_resumen.json y _sin_parcela.csv)
 *   - Edificios OSM frente a la liquidación (data/edificios/<D>_<N>_resumen.json, _comparacion.json/.csv)
 *   - Relevamientos dibujados en el visor (edificiosServicio.listarRelevamientos)
 * Módulo de backend (Node). Solo lectura.
 */
import { existsSync, readFileSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validarDistrito, listarRelevamientos } from './edificiosServicio.js';

const RAIZ = dirname(fileURLToPath(import.meta.url));
const leer = f => (existsSync(f) ? JSON.parse(readFileSync(f, 'utf8')) : null);
let analisis = { mtime: 0, datos: null };
function datosAnalisis() {
  const f = join(RAIZ, 'data', 'analisis', 'analisis-datos.js');
  if (!existsSync(f)) return null;
  const m = statSync(f).mtimeMs;
  if (m !== analisis.mtime) {
    const t = readFileSync(f, 'utf8');
    analisis = { mtime: m, datos: JSON.parse(t.slice(t.indexOf('{'), t.lastIndexOf('}') + 1)) };
  }
  return analisis.datos;
}

export async function tablero(q) {
  const [dpto, dist] = validarDistrito(q.dpto, q.dist);
  const id = `${dpto}|${dist}`;
  const A = datosAnalisis();
  const d = A?.distritos?.find(x => x.id === id) || null;
  const u = d?.urbano, r = d?.rural;
  const par = leer(join(RAIZ, 'data', 'parcelario', `${dpto}_${dist}_resumen.json`));
  const edi = leer(join(RAIZ, 'data', 'edificios', `${dpto}_${dist}_resumen.json`));
  const comp = leer(join(RAIZ, 'data', 'edificios', `${dpto}_${dist}_comparacion.json`)) || [];
  let relev = [];
  try { relev = await listarRelevamientos(dpto, dist); } catch { relev = []; }
  const aCompletarMapa = comp.reduce((a, x) => a + (x.m2_a_completar || 0), 0);
  const aCompletarRelev = relev.reduce((a, x) => a + (x.m2_a_completar || 0), 0);
  const imp = (u?.impuesto || 0) + (r?.impuesto || 0), mun = (u?.municipal70 || 0) + (r?.municipal70 || 0);
  // Recaudación potencial de los m² a completar: valor edificado promedio por m² declarado × tasa efectiva del municipio.
  const vm2Edif = u?.superficieEdifM2 ? u.valorEdificado / u.superficieEdifM2 : null;
  const tasa = u?.valorFiscal ? u.impuesto / u.valorFiscal : null;
  const potencial = vm2Edif && tasa ? Math.round(aCompletarMapa * vm2Edif * tasa) : null;
  return {
    distrito: { id, dpto, dist, nombre: d?.distrito || null, departamento: d?.departamento || null },
    liquidacion: d ? { cuentasUrbanas: u?.cuentas || 0, padronesRurales: r?.padrones || 0, edificadas: u?.edificadas || 0, pctEdificado: u?.pctEdificado ?? null,
      impuesto: Math.round(imp), municipal70: Math.round(mun), impuestoMediano: u?.impuestoMediana ?? null,
      lotesBajoMinimo: u?.lote?.bajoMinimo ?? null, lotesConSuperficie: u?.lote?.conSuperficie ?? null } : null,
    parcelario: par ? { parcelas: par.parcelas, urbanasConCuenta: par.urbanasConCuenta, urbanas: par.urbanas, ruralesConCuenta: par.ruralesConCuenta, rurales: par.rurales,
      cuentasSinParcela: par.cuentasUrbanasSinParcela + par.padronesSinParcela, impuestoSinParcela: par.impuestoSinParcela } : null,
    edificios: edi ? { total: edi.edificios, pendientes: edi.pendientes, sinParcela: edi.sinParcela, sinParcelaM2: edi.sinParcelaM2,
      noDeclaradas: edi.porEstado?.no_declarada || 0, liquidanMenos: edi.porEstado?.menor_declarada || 0, m2ACompletar: Math.round(aCompletarMapa),
      recaudacionPotencial: potencial } : null,
    relevamientos: { cantidad: relev.length, m2ACompletar: Math.round(aCompletarRelev * 10) / 10 },
    archivos: { sinParcela: !!par, diferencias: comp.length > 0 }
  };
}

/** Listas de trabajo en CSV: cuentas sin parcela o diferencias de construcción. */
export function archivo(q) {
  const [dpto, dist] = validarDistrito(q.dpto, q.dist);
  const f = q.tipo === 'sin_parcela' ? join(RAIZ, 'data', 'parcelario', `${dpto}_${dist}_sin_parcela.csv`)
    : q.tipo === 'diferencias' ? join(RAIZ, 'data', 'edificios', `${dpto}_${dist}_comparacion.csv`) : null;
  if (!f) throw Object.assign(new Error('tipo: sin_parcela o diferencias'), { status: 400 });
  if (!existsSync(f)) throw Object.assign(new Error('Todavía no hay datos para este distrito'), { status: 404 });
  return { nombre: `${dpto}_${dist}_${q.tipo}.csv`, contenido: readFileSync(f, 'utf8') };
}
