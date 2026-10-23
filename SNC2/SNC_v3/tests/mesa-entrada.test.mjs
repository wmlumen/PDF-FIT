// tests/mesa-entrada.test.mjs
// Test unitario completo para Módulo 9: Mesa de Entrada Virtual y Circuito Registral (SNC 551/2023)

globalThis.window = globalThis;
globalThis.localStorage = {
  data: new Map(),
  getItem(key) { return this.data.get(key) ?? null; },
  setItem(key, value) { this.data.set(key, String(value)); },
  removeItem(key) { this.data.delete(key); }
};

const {
  MesaEntradaAPI,
  ESTADOS_MESA_ENTRADA,
  generarNumeroEntrada,
  generarFichaTecnicaEntrada,
  precalificarGeometria,
  asignarRevisorBalanceado,
  calcularDiffGeometria,
  registrarAccionBitacora,
  verificarCadenaBitacora,
  generarDictamenTecnico
} = await import('../js/mesaEntrada.js');

let passed = 0;
let failed = 0;

function ok(nombre, cond, detalle = '') {
  if (cond) {
    console.log(`✅ PASS: ${nombre}`);
    passed++;
  } else {
    console.log(`❌ FAIL: ${nombre} ${detalle}`);
    failed++;
  }
}

async function run() {
  console.log('\n🧪 TESTS UNITARIOS - Módulo 9: Mesa de Entrada y Circuito Registral (SNC 171-190)\n');

  // 1. Número Único Oficial de Entrada (R171)
  const num = generarNumeroEntrada(2026, 42);
  ok('Genera formato oficial SNC-AÑO-CORRELATIVO', num === 'SNC-2026-000042');
  const numAuto = generarNumeroEntrada();
  ok('Generación automática contiene año actual y 6 dígitos', /^SNC-\d{4}-\d{6}$/.test(numAuto));

  // 2. Ficha Técnica Oficial (R172)
  const ficha = generarFichaTecnicaEntrada({
    expedienteNumero: 'SNC-2026-000100',
    profesionalNombre: 'Ing. Carlos Galeano',
    propietarioNombre: 'Juan Silguero',
    padronCtaCte: '14-0234-01'
  }, {
    features: [
      { properties: { SUP_LEGAL: 500 }, geometry: { type: 'Polygon', coordinates: [[[0,0],[10,0],[10,50],[0,50],[0,0]]] } }
    ]
  });
  ok('Ficha técnica asigna número oficial', ficha.numeroEntrada === 'SNC-2026-000100');
  ok('Ficha técnica resume titular y profesional', ficha.profesional.nombre === 'Ing. Carlos Galeano' && ficha.inmueble.titular === 'Juan Silguero');
  ok('Ficha técnica calcula superficie total', ficha.resumenGeometrico.superficieTotalM2 === 500);

  // 3. Pre-calificación geométrica como Gate (R174)
  const vacio = precalificarGeometria({ features: [] });
  ok('Expediente sin geometrías es rechazado como bloqueante', vacio.admitido === false && vacio.gateStatus === 'RECHAZADO_BLOQUEANTE');

  const corrupto = precalificarGeometria({
    features: [
      { properties: { CODIGO: 'P1' }, geometry: { type: 'Polygon', coordinates: [[[0,0],[10,0],[10,10]] /* no cerrado */] } }
    ]
  });
  ok('Polígono no cerrado es rechazado con observaciones', corrupto.admitido === false && corrupto.erroresCriticos.length > 0);

  const valido = precalificarGeometria({
    features: [
      { properties: { CODIGO: 'P1' }, geometry: { type: 'Polygon', coordinates: [[[0,0],[20,0],[20,30],[0,30],[0,0]]] } }
    ]
  });
  ok('Geometría cerrada y conforme es admitida por el Gate', valido.admitido === true && valido.gateStatus === 'APROBADO_PRECALIFICACION');

  // 4. Bandeja de revisores con asignación balanceada (R173)
  const revisores = [
    { id: 'r1', nombre: 'Revisor A', cargo: 'Técnico', expedientesActivos: 5 },
    { id: 'r2', nombre: 'Revisor B', cargo: 'Técnico', expedientesActivos: 1 },
    { id: 'r3', nombre: 'Revisor C', cargo: 'Técnico', expedientesActivos: 3 }
  ];
  const asig = asignarRevisorBalanceado('EXP-001', revisores);
  ok('Asigna al revisor con menor carga activa (r2)', asig.revisorId === 'r2');
  ok('Incrementa la carga activa del revisor asignado', revisores.find(r => r.id === 'r2').expedientesActivos === 2);

  // 5. Pila de reingresos y Diff Geométrico (R178, R179)
  const versionAnt = {
    features: [
      { properties: { CODIGO: 'P1', AREA_M2: 600 }, geometry: { type: 'Polygon', coordinates: [[[0,0],[20,0],[20,30],[0,30],[0,0]]] } },
      { properties: { CODIGO: 'P2_BORRAR', AREA_M2: 200 }, geometry: { type: 'Polygon', coordinates: [[[20,0],[30,0],[30,20],[20,20],[20,0]]] } }
    ]
  };
  const versionSub = {
    features: [
      // P1 modificada (se amplió a 35m)
      { properties: { CODIGO: 'P1', AREA_M2: 700 }, geometry: { type: 'Polygon', coordinates: [[[0,0],[20,0],[20,35],[0,35],[0,0]]] } },
      // P3 nueva agregada
      { properties: { CODIGO: 'P3_NUEVA', AREA_M2: 300 }, geometry: { type: 'Polygon', coordinates: [[[20,0],[35,0],[35,20],[20,20],[20,0]]] } }
    ]
  };
  const diff = calcularDiffGeometria(versionAnt, versionSub);
  ok('Diff detecta que hubo cambios', diff.hayCambios === true);
  ok('Diff detecta 1 parcela agregada (P3)', diff.agregadasCount === 1);
  ok('Diff detecta 1 parcela eliminada (P2)', diff.eliminadasCount === 1);
  ok('Diff detecta 1 parcela con vértices modificados (P1)', diff.modificadasCount === 1 && diff.detalleModificadas[0].id === 'P1');
  ok('Diff calcula variación de área delta', diff.deltaAreaTotalM2 === 100);

  // 6. Bitácora inmutable de auditoría (R180)
  const expId = 'SNC-TEST-' + Date.now();
  await registrarAccionBitacora(expId, { accion: 'INGRESO', estadoDesde: 'BORRADOR', estadoHacia: 'MESA_ENTRADA' });
  await registrarAccionBitacora(expId, { accion: 'ASIGNACION', estadoDesde: 'MESA_ENTRADA', estadoHacia: 'ASIGNADO' });
  await registrarAccionBitacora(expId, { accion: 'REVISION', estadoDesde: 'ASIGNADO', estadoHacia: 'EN_REVISION' });

  const verifOk = await verificarCadenaBitacora(expId);
  ok('Cadena de 3 transiciones consecutivas es íntegra y válida', verifOk.ok === true && verifOk.total === 3);

  // 7. Dictamen Técnico de Agrimensura (R181, R182)
  const dictConforme = generarDictamenTecnico({ expedienteNumero: expId }, valido, { nombre: 'Ing. Test' });
  ok('Dictamen técnico conforme para homologación', dictConforme.conclusionTecnica === 'CONFORME_PARA_HOMOLOGACION');
  ok('Dictamen conforme exige firma digital definitiva con 4 slots', dictConforme.requiereFirmaDigitalDefinitiva === true && dictConforme.circuitoFirmasRequerido.length === 4);

  const dictObservado = generarDictamenTecnico({ expedienteNumero: expId }, corrupto, { nombre: 'Ing. Test' });
  ok('Dictamen con observaciones técnicas requiere subsanación', dictObservado.conclusionTecnica === 'OBSERVADO_REQUIERE_SUBSANACION');
  ok('Dictamen observado solo utiliza sello de revisor', dictObservado.requiereFirmaDigitalDefinitiva === false);

  console.log(`\n📊 RESUMEN MÓDULO 9: ${passed} pasaron, ${failed} fallaron.\n`);
  if (failed > 0) process.exit(1);
}

run().catch(e => {
  console.error('Error fatal:', e);
  process.exit(1);
});
