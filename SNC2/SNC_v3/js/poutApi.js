// js/poutApi.js

import fs from 'node:fs';
import { join } from 'node:path';
import { logger } from './logger.js';

const STORE_PATH = join(process.cwd(), 'Pout/data/municipios-interior.json');
const FILES_DIR = join(process.cwd(), 'Pout/data/municipal');
let store = null;
function loadStore() {
  try { store = JSON.parse(fs.readFileSync(STORE_PATH, 'utf-8')); }
  catch (e) { logger.error('[POUT_API] Error cargando catálogo', e.message); process.exit(1); }
}
loadStore();

export async function POST(req, res) {
  const { departamento, municipio, estado_pout, anio_pout, intendente } = req.body;
  if (!departamento || !municipio) {
    return res.status(400).json({ error: 'departamento y municipio requeridos' });
  }
  const slug = municipio.toLowerCase().replace(/[^\w]+/g, '_');
  if (store.municipios.find(m => m.slug === slug)) {
    return res.status(409).json({ error: 'ya existe un registro para este municipio', id: slug });
  }
  const id = `${departamento}_${slug}`;
  const nuevo = { id, departamento, municipio, estado_pout, anio_pout, intendente, slug, creado: new Date().toISOString() };
  store.municipios.push(nuevo);
  store.resumen.con_pout = store.municipios.reduce((c, m) => c + (m.estado_pout === 'CON_POUT' ? 1 : 0), 0);
  try { fs.writeFileSync(STORE_PATH, JSON.stringify(store, null, 2), 'utf-8'); } catch (e) { logger.error('[POUT_API] Error escribiendo catálogo', e.message); }
  logger.info('[POUT_API] Registro creado', { id, municipio });
  res.status(201).json(nuevo);
}
export function GET(req, res) {
  const { codigo } = req.params;
  const { departamento, estado_pout, busqueda } = req.query;
  let result = store.municipios;
  if (departamento) result = result.filter(m => m.departamento === departamento);
  if (estado_pout) result = result.filter(m => m.estado_pout === estado_pout);
  if (busqueda) {
    const term = busqueda.toLowerCase();
    result = result.filter(m => m.municipio.toLowerCase().includes(term) || m.departamento.toLowerCase().includes(term));
  }
  if (codigo) {
    const unico = result.find(m => m.id === codigo);
    if (!unico) return res.status(404).json({ error: 'registro no encontrado' });
    return res.json(unico);
  }
  res.json(result);
}
export async function PUT(req, res) {
  const { codigo } = req.params;
  const idx = store.municipios.findIndex(m => m.id === codigo);
  if (idx === -1) return res.status(404).json({ error: 'registro no encontrado' });
  const updates = req.body;
  updates.actualizado = new Date().toISOString();
  store.municipios[idx] = { ...store.municipios[idx], ...updates };
  try { fs.writeFileSync(STORE_PATH, JSON.stringify(store, null, 2), 'utf-8'); } catch (e) { logger.error('[POUT_API] Error escribiendo catálogo', e.message); }
  logger.info('[POUT_API] Registro actualizado', { id: codigo });
  res.json(store.municipios[idx]);
}
export async function DELETE(req, res) {
  const { codigo } = req.params;
  const idx = store.municipios.findIndex(m => m.id === codigo);
  if (idx === -1) return res.status(404).json({ error: 'registro no encontrado' });
  const eliminado = store.municipios.splice(idx, 1)[0];
  store.resumen.con_pout = store.municipios.reduce((c, m) => c + (m.estado_pout === 'CON_POUT' ? 1 : 0), 0);
  try { fs.writeFileSync(STORE_PATH, JSON.stringify(store, null, 2), 'utf-8'); } catch (e) { logger.error('[POUT_API] Error escribiendo catálogo', e.message); }
  logger.info('[POUT_API] Registro eliminado', { id: codigo });
  res.status(204).end();
}
export function getStore() { return store; }
export { STORE_PATH, FILES_DIR };
