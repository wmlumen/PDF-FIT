/**
 * Empareja nombres de distrito de distintas fuentes (liquidación DNIT, estadísticas DNIT, INE…) dentro de un departamento.
 * Entiende abreviaturas ("PEDRO J.CABALLERO" = "PEDRO JUAN CABALLERO", "GRAL." = "GENERAL") y una lista corta de equivalencias.
 */
export const normalizar = t => String(t ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/[^A-Z0-9]+/g, ' ').trim();
const EXPANDIR = { GRAL: 'GENERAL', CNEL: 'CORONEL', MCAL: 'MARISCAL', TTE: 'TENIENTE', PTE: 'PRESIDENTE', PTO: 'PUERTO', STA: 'SANTA', DR: 'DOCTOR', '1RO': 'PRIMERO', '1': 'PRIMERO', ITAC: 'ITACURUBI', FDO: 'FERNANDO' };
const VACIAS = new Set(['DE', 'DEL', 'LA', 'EL', 'Y', 'MUNICIPIO', 'DISTRITO']);
// Equivalencias que la regla de abreviaturas no resuelve (nombre DNIT liquidación → nombre en estadísticas).
export const ALIAS = {
  'CANINDEYU|CURUGUATY': 'SAN ISIDRO DEL CURUGUATY', 'SAN PEDRO|SAN PEDRO': 'SAN PEDRO DE YCUAMANDYYU', 'CANINDEYU|YASY CANY': 'YASY KANY',
  'SAN PEDRO|GUAJAYVI': 'GUAYAIBI', 'PARAGUARI|YBYTIMI': 'YBYTYMI', 'GUAIRA|PASO YOBAI': 'PASO YOBAY', 'CANINDEYU|VILLA YGATYMI': 'VILLA YGATIMI',
  'PTE HAYES|PUERTO PINASCO': 'PTO PINAZCO', 'CONCEPCION|YBY YAU': 'YBY YA U', 'CORDILLERA|PRIMERO DE MARZO': '1RO DE MARZO',
  'GUAIRA|MBOCAYATY DEL GUAIRA': 'MBOCAYATY', 'CAPITAL|ASUNCION': 'ASUNCION DISTRITO',
  // Informe SNC "Recaudación potencial 2024" (abreviaturas del gráfico)
  'CAPITAL|SANTISIMA TRINIDAD': 'STMA TRINIDAD', 'CONCEPCION|SARGENTO JOSE FELIX LOPEZ': 'SGTO JOSE F LOPEZ', 'SAN PEDRO|GRAL ISIDORO RESQUIN': ['GRAL RESQUIN', 'ISIDORO RESQUIN'],
  'SAN PEDRO|25 DE DICIEMBRE': 'DE DICIEMBRE', 'GUAIRA|DR BOTRELL': ['DR BOTREL', 'DR BOTTREL'], 'GUAIRA|MAURICIO J TROCHE': ['MAURICIO JOSE TROCHE', 'MAURICIO TROCHE'],
  'CAAGUAZU|DR CECILIO BAEZ': 'CECILIO BAEZ', 'CAAGUAZU|R I 3 CORRALES': 'CORRALES', 'CAAGUAZU|3 DE FEBRERO': 'DE FEBRERO', 'CAAZAPA|3 DE MAYO': 'DE MAYO',
  'ITAPUA|CAPITAN MIRANDA': 'CAP MIRANDA', 'ALTO PARANA|JUAN E O LEARY': 'JUAN E OLEARY', 'NEEMBUCU|GRAL J E DIAZ': ['GRAL JOSE EDUVIGIS DIAZ', 'GRAL DIAZ'],
  'PTE HAYES|GRAL JOSE MARIA BRUGUEZ': 'JOSE MA BRUGUEZ', 'PTE HAYES|TTE ESTEBAN MARTINEZ': 'MARTINEZ',
  'BOQUERON|DR PEDRO P PENA': 'PEDRO P PENA', 'BOQUERON|PEDRO P PENA': 'PEDRO P PENA', 'ALTO PARANA|PTE FRANCO': 'PUERTO PTE FRANCO'
};
const tokens = t => normalizar(t).split(' ').filter(x => x && !VACIAS.has(x)).map(x => EXPANDIR[x] || x);
// Puntaje: cada palabra del nombre corto debe coincidir con una del largo (igual, o inicial abreviada). 1 = coincidencia total.
function puntaje(a, b) {
  const [ca, cb] = [tokens(a), tokens(b)];
  if (!ca.length || !cb.length) return 0;
  const [cort, larg] = ca.length <= cb.length ? [ca, cb] : [cb, ca];
  let j = 0, ok = 0;
  for (const t of cort) {
    while (j < larg.length && !(larg[j] === t || (t.length <= 2 && larg[j].startsWith(t)) || (larg[j].length <= 2 && t.startsWith(larg[j])))) j++;
    if (j < larg.length) { ok++; j++; }
  }
  return ok / cort.length * (cort.length / larg.length >= 0.5 ? 1 : 0.8);
}
/** Devuelve la clave de `candidatos` (mapa "DEP|DISTRITO" → dato) que corresponde al distrito, o null. */
export function emparejar(departamento, distrito, candidatos) {
  const dep = normalizar(departamento), dis = normalizar(distrito);
  if (candidatos[`${dep}|${dis}`]) return `${dep}|${dis}`;
  for (const alias of [].concat(ALIAS[`${dep}|${dis}`] || [])) if (candidatos[`${dep}|${alias}`]) return `${dep}|${alias}`;
  let mejor = null, max = 0;
  for (const k of Object.keys(candidatos)) {
    const [d2, n2] = k.split('|');
    if (d2 !== dep) continue;
    // Un nombre propio más largo que el candidato (p. ej. PASO HORQUETA frente a HORQUETA) es otro distrito.
    if (tokens(dis).length > tokens(n2).length) continue;
    const p = puntaje(dis, n2);
    if (p > max) { max = p; mejor = k; }
  }
  return max >= 0.99 ? mejor : null;
}
