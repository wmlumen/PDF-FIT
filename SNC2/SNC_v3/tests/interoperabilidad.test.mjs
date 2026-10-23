// tests/interoperabilidad.test.mjs
// Test unitario completo para Módulo 10: Interoperabilidad DGRP / MADES / INDERT / INDI y Servicios OGC (SNC 551/2023)

globalThis.window = globalThis;
globalThis.localStorage = {
  data: new Map(),
  getItem(key) { return this.data.get(key) ?? null; },
  setItem(key, value) { this.data.set(key, String(value)); },
  removeItem(key) { this.data.delete(key); }
};

const {
  InteroperabilidadAPI,
  TIPOS_RESTRICCION,
  ESTADOS_BLOQUEO_DGRP,
  CAPAS_RESTRICCION_OFFICIAL,
  consultarRegistroDGRP,
  verificarCorrespondenciaCatastroDGRP,
  registrarBloqueoPreventivo,
  verificarBloqueoRegistral,
  levantarBloqueoPreventivo,
  notificarEmpadronamientoMunicipal,
  obtenerNotificacionesMunicipales,
  evaluarRestriccionesEspaciales,
  generarDescriptorServiciosOGC
} = await import('../js/interoperabilidad.js');

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
  console.log('\n🧪 TESTS UNITARIOS - Módulo 10: Interoperabilidad DGRP / MADES / INDERT / INDI (SNC 186-188, 193, 199)\n');

  // 1. Adaptador DGRP / RGP (R186)
  const dgrpLibre = await consultarRegistroDGRP({ finca: '1420', distrito: 'PIRIBEBUY' });
  ok('Consulta DGRP encuentra finca libre', dgrpLibre.encontrado === true && dgrpLibre.estadoJuridico === ESTADOS_BLOQUEO_DGRP.LIBRE);

  const correspOk = verificarCorrespondenciaCatastroDGRP({ finca: '1420' }, dgrpLibre);
  ok('Correspondencia Catastro-DGRP es conforme para finca libre', correspOk.coincide === true && correspOk.bloqueante === false);

  const dgrpNoExiste = await consultarRegistroDGRP({ finca: '', matricula: '' });
  const correspFail = verificarCorrespondenciaCatastroDGRP({}, dgrpNoExiste);
  ok('Inmueble no localizado en DGRP bloquea trámite', correspFail.coincide === false && correspFail.bloqueante === true);

  // 2. Bloqueo Registral Preventivo (R188)
  const fincaLitigio = '9999';
  registrarBloqueoPreventivo({
    finca: fincaLitigio,
    distrito: 'ASUNCION',
    tipoBloqueo: ESTADOS_BLOQUEO_DGRP.LITIGIO,
    juzgado: 'Juzgado 3ra Instancia Civil',
    oficio: 'Oficio N° 124/2026',
    motivo: 'Superposición de títulos en litigio'
  });

  const estadoBlq = verificarBloqueoRegistral({ finca: fincaLitigio, distrito: 'ASUNCION' });
  ok('Detección inmediata de bloqueo registral preventivo', estadoBlq.estaBloqueado === true && estadoBlq.bloqueo.tipoBloqueo === ESTADOS_BLOQUEO_DGRP.LITIGIO);

  const dgrpBloqueado = await consultarRegistroDGRP({ finca: fincaLitigio, distrito: 'ASUNCION' });
  const correspBlq = verificarCorrespondenciaCatastroDGRP({ finca: fincaLitigio }, dgrpBloqueado);
  ok('Inmueble en litigio DGRP bloquea trámite catastral', correspBlq.bloqueante === true && correspBlq.mensaje.includes('BLOQUEO REGISTRAL ACTIVO'));

  // Levantamiento de bloqueo
  const levantado = levantarBloqueoPreventivo({ finca: fincaLitigio, distrito: 'ASUNCION', oficioLevantamiento: 'Oficio 200/2026' });
  ok('Levantamiento judicial de medida cautelar libera el inmueble', levantado === true);
  ok('Finca queda libre tras levantamiento', verificarBloqueoRegistral({ finca: fincaLitigio, distrito: 'ASUNCION' }).estaBloqueado === false);

  // 3. Notificación Automática Municipal de Empadronamiento (R187)
  const notif = notificarEmpadronamientoMunicipal({
    padronNuevo: '4278',
    ccc: '14-0234-01-000',
    finca: '1420',
    distrito: 'PIRIBEBUY',
    municipio: 'Municipalidad de Piribebuy',
    superficieM2: 750.50,
    titular: 'Juan Perez',
    expedienteId: 'SNC-2026-000421'
  });
  ok('Genera notificación municipal estructurada con padrón y CCC', notif.datosCatastrales.padronAsignado === '4278' && notif.datosCatastrales.codigoCatastralComercial === '14-0234-01-000');
  ok('Estado de transmisión despachado con éxito', notif.estadoTransmision === 'DESPACHADO_EXITOSO');

  const histNotifs = obtenerNotificacionesMunicipales();
  ok('Notificación registrada en el historial', histNotifs.length >= 1 && histNotifs.some(n => n.id === notif.id));

  // Error si faltan datos
  let tiroErrorNotif = false;
  try {
    notificarEmpadronamientoMunicipal({ padronNuevo: null, ccc: null });
  } catch {
    tiroErrorNotif = true;
  }
  ok('Falta de padrón o CCC lanza error en notificación', tiroErrorNotif);

  // 4. Restricciones Ambientales MADES / Ley 3239 / INDI (R199)
  const parcelaConArroyo = {
    properties: { CODIGO: 'L-01', CAUCE_AGUA: true },
    geometry: { type: 'Polygon', coordinates: [[[0,0],[10,0],[10,10],[0,10],[0,0]]] }
  };
  const restrHidro = evaluarRestriccionesEspaciales(parcelaConArroyo);
  ok('Detecta cruce con cauce hídrico y exige franja de 30m', restrHidro.tieneRestricciones === true && restrHidro.restricciones.some(r => r.tipo === TIPOS_RESTRICCION.FRANJA_HIDRICA_MADES && r.bufferExigidoMetros === 30));

  const parcelaParque = {
    properties: { CODIGO: 'L-02', RESTRICCION: 'SINASIP_PARQUE' },
    geometry: { type: 'Polygon', coordinates: [[[0,0],[10,0],[10,10],[0,10],[0,0]]] }
  };
  const restrSinasip = evaluarRestriccionesEspaciales(parcelaParque);
  ok('Detecta cruce con SINASIP y marca como bloqueante', restrSinasip.bloqueante === true && restrSinasip.restricciones.some(r => r.tipo === TIPOS_RESTRICCION.PARQUE_SINASIP));

  const parcelaIndi = {
    properties: { CODIGO: 'L-03', RESTRICCION: 'INDIGENA_INDI' },
    geometry: { type: 'Polygon', coordinates: [[[0,0],[10,0],[10,10],[0,10],[0,0]]] }
  };
  const restrIndi = evaluarRestriccionesEspaciales(parcelaIndi);
  ok('Detecta afectación de comunidad indígena inembargable', restrIndi.bloqueante === true && restrIndi.restricciones.some(r => r.tipo === TIPOS_RESTRICCION.TIERRA_INDIGENA_INDI));

  const parcelaLimpia = {
    properties: { CODIGO: 'L-04', USO_SUELO: 'URBANO' },
    geometry: { type: 'Polygon', coordinates: [[[0,0],[10,0],[10,10],[0,10],[0,0]]] }
  };
  const sinRestr = evaluarRestriccionesEspaciales(parcelaLimpia);
  ok('Parcela sin afectación territorial queda limpia', sinRestr.tieneRestricciones === false && sinRestr.bloqueante === false);

  // 5. Servicios OGC WMS/WFS (R193)
  const ogc = generarDescriptorServiciosOGC('http://localhost:5556');
  ok('Descriptor OGC define servicio WMS 1.3.0', ogc.servicios.WMS.version === '1.3.0' && ogc.servicios.WMS.getMapUrl.includes('GetMap'));
  ok('Descriptor OGC define servicio WFS 2.0.0', ogc.servicios.WFS.version === '2.0.0' && ogc.servicios.WFS.getFeatureUrl.includes('GetFeature'));
  ok('Capas OGC oficiales disponibles en catálogo', ogc.servicios.WMS.capasDisponibles.length === CAPAS_RESTRICCION_OFFICIAL.length);

  console.log(`\n📊 RESUMEN MÓDULO 10: ${passed} pasaron, ${failed} fallaron.\n`);
  if (failed > 0) process.exit(1);
}

run().catch(e => {
  console.error('Error fatal:', e);
  process.exit(1);
});
