// tests/signature-manager.test.mjs
// Test unitario completo para el módulo de firmas digitales y sellos institucionales (SNC 551/2023)

import {
    SignatureAPI,
    TIPOS_FIRMA,
    ESTADOS_FIRMA,
    TIPOS_SELLO_PROVISORIO,
    PROTOCOLO_GUBERNAMENTAL_ORDEN,
    generarSelloProvisorio,
    alzarFirma,
    revocarFirma,
    estaRevocada,
    eliminarFirma,
    obtenerCircuitoGubernamental,
    reordenarCircuito,
    resetearCircuitoOficial,
    configurarSlotLayout,
    evaluarReglaFirma,
    calcularHashSHA256,
    ensamblarFirma,
    verificarFirma,
    renderizarFirmasEnPDF
} from '../js/signatureManager.js';

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
    console.log('\n🧪 TESTS UNITARIOS - Módulo de Firmas Digitales y Sellos (Ley 6822/21 - SNC 551/2023)\n');

    // 1. Generador de sellos provisorios (Circular y Rectangular)
    const stampCirc = generarSelloProvisorio({
        tipo: TIPOS_SELLO_PROVISORIO.CIRCULAR_OFICIAL,
        entidad: 'SERVICIO NACIONAL DE CATASTRO',
        dependencia: 'DIRECCIÓN DE GEODESIA',
        titulo: 'VISADO TÉCNICO',
        expediente: 'EXP-TEST-01'
    });
    ok('Generador sello circular retorna SVG válido', stampCirc.svg.includes('<svg') && stampCirc.svg.includes('SERVICIO NACIONAL DE CATASTRO'));
    ok('Generador sello circular retorna DataURL codificado', stampCirc.dataUrl.startsWith('data:image/svg+xml;charset=utf-8,'));

    const stampRect = generarSelloProvisorio({
        tipo: TIPOS_SELLO_PROVISORIO.RECTANGULAR_CONTROL,
        entidad: 'MUNICIPALIDAD DE ASUNCIÓN',
        dependencia: 'DIRECCIÓN DE OBRAS',
        titulo: 'DICTAMEN DEFINITIVO',
        expediente: 'EXP-MUNI-99'
    });
    ok('Generador sello rectangular retorna SVG válido', stampRect.svg.includes('<svg') && stampRect.svg.includes('MUNICIPALIDAD DE ASUNCIÓN'));
    ok('Generador sello rectangular incluye expediente', stampRect.svg.includes('EXP-MUNI-99'));

    // 2. Alzar firmas y sellos
    const firma1 = alzarFirma({
        id: 'sig_prof_01',
        nombre: 'Ing. Carlos Galeano',
        cargo: 'Agrimensor Matriculado',
        matricula: 'MOPC-1234',
        tipo: TIPOS_FIRMA.FIRMA_DIGITAL
    });
    ok('Alzar firma digital asigna ID y genera estampa provisoria automática', firma1.id === 'sig_prof_01' && Boolean(firma1.estampaVisual));
    ok('Firma alzada se encuentra en estado ACTIVA', firma1.estado === ESTADOS_FIRMA.ACTIVA);

    const selloRevisor = alzarFirma({
        id: 'sello_rev_01',
        nombre: 'Lic. Laura Benitez',
        cargo: 'Técnico Revisor Catastral',
        tipo: TIPOS_FIRMA.SELLO_INTERNO
    });
    ok('Alzar sello interno registra tipo SELLO_INTERNO', selloRevisor.tipo === TIPOS_FIRMA.SELLO_INTERNO);

    // 3. Regla de Negocio: Sello Interno vs Firma Digital Definitiva
    const reglaRevision = evaluarReglaFirma({ estadoExpediente: 'EN_REVISION' });
    ok('En estado EN_REVISION se exige SELLO_INTERNO', reglaRevision.tipoRequerido === TIPOS_FIRMA.SELLO_INTERNO && !reglaRevision.esDefinitivo);

    const reglaObservado = evaluarReglaFirma({ estadoExpediente: 'OBSERVADO' });
    ok('En estado OBSERVADO no es definitivo y permite sello interno', reglaObservado.permiteSelloInterno === true);

    const reglaDictamen = evaluarReglaFirma({ estadoExpediente: 'DICTAMEN' });
    ok('En estado DICTAMEN se exige FIRMA_DIGITAL', reglaDictamen.tipoRequerido === TIPOS_FIRMA.FIRMA_DIGITAL && reglaDictamen.esDefinitivo === true);

    const reglaDirector = evaluarReglaFirma({ estadoExpediente: 'FIRMADO_DIRECTOR' });
    ok('En estado FIRMADO_DIRECTOR bloquea sellos simples', reglaDirector.bloqueadoParaSellosSimples === true);

    // 4. Circuito Gubernamental y Gestión de Órdenes
    resetearCircuitoOficial();
    const circuito = obtenerCircuitoGubernamental();
    ok('Circuito oficial predeterminado tiene 4 slots', circuito.length === 4);
    ok('Slot 1 es Responsable Técnico', circuito[0].slotId === 'slot_profesional' && circuito[0].orden === 1);
    ok('Slot 4 es Autoridad Resolutiva', circuito[3].slotId === 'slot_director' && circuito[3].orden === 4);

    // Reordenar circuito
    const nuevoOrden = [
        { ...circuito[1], orden: 1 },
        { ...circuito[0], orden: 2 },
        { ...circuito[2], orden: 3 },
        { ...circuito[3], orden: 4 }
    ];
    const circuitoReordenado = reordenarCircuito(nuevoOrden);
    ok('Reordenar circuito cambia orden respetando prelación', circuitoReordenado[0].slotId === 'slot_revisor' && circuitoReordenado[0].orden === 1);

    // Configurar slot layout
    const slotModificado = configurarSlotLayout('slot_profesional', { x: 25, y: 230, ancho: 50, alto: 40 });
    ok('Modificar layout de slot actualiza coordenadas', slotModificado.layout.x === 25 && slotModificado.layout.ancho === 50);

    // Restablecer por defecto
    resetearCircuitoOficial();

    // 5. Criptografía y Ensamble de Firma
    const hash = await calcularHashSHA256('ContenidoDocumentoSNC2026');
    ok('Cálculo de hash SHA-256 genera 64 caracteres hex', typeof hash === 'string' && hash.length === 64);

    // Ensamble válido en revisión con Sello Interno
    const ensambleInterno = await ensamblarFirma({
        documentoId: 'DOC-PLAN-001',
        firmaId: 'sello_rev_01',
        slotId: 'slot_revisor',
        estadoExpediente: 'EN_REVISION'
    });
    ok('Ensamblar sello interno genera token con hash y timestamp', Boolean(ensambleInterno.hashFirma) && Boolean(ensambleInterno.timestamp));

    // Verificación de firma íntegra
    const verif1 = await verificarFirma(ensambleInterno);
    ok('Verificación de firma recién ensamblada es válida', verif1.valido === true);

    // Detección de manipulación
    const tokenManipulado = { ...ensambleInterno, hashFirma: 'a'.repeat(64) };
    const verifManipulado = await verificarFirma(tokenManipulado);
    ok('Verificación detecta manipulación del hash (invalidez)', verifManipulado.valido === false && verifManipulado.razon.includes('HASH_MISMATCH'));

    // Bloqueo de Sello Interno en Dictamen Definitivo
    let falloBloqueoDefinitivo = false;
    try {
        await ensamblarFirma({
            documentoId: 'DOC-PLAN-002',
            firmaId: 'sello_rev_01', // Es SELLO_INTERNO
            slotId: 'slot_director',
            estadoExpediente: 'DICTAMEN' // Requiere FIRMA_DIGITAL
        });
    } catch (err) {
        falloBloqueoDefinitivo = err.message.includes('ERROR DE PROTOCOLO');
    }
    ok('Bloquea uso de sello interno si el estado es DICTAMEN definitivo', falloBloqueoDefinitivo);

    // 6. Revocación de firmas (CRL)
    ok('Firma antes de revocación no está revocada', estaRevocada('sig_prof_01') === false);
    revocarFirma('sig_prof_01', { motivo: 'Matrícula vencida no renovada' });
    ok('Firma después de revocarFirma está marcada en CRL', estaRevocada('sig_prof_01') === true);

    // Intentar ensamblar firma con certificado revocado debe lanzar error
    let rechazoRevocada = false;
    try {
        await ensamblarFirma({
            documentoId: 'DOC-PLAN-003',
            firmaId: 'sig_prof_01',
            slotId: 'slot_profesional',
            estadoExpediente: 'DICTAMEN'
        });
    } catch (err) {
        rechazoRevocada = err.message.includes('OPERACIÓN DENEGADA') && err.message.includes('REVOCADA');
    }
    ok('Intento de ensamblar firma revocada es denegado de inmediato', rechazoRevocada);

    // 7. Eliminar firma
    const firmaAEliminar = alzarFirma({
        id: 'sig_temp_eliminar',
        nombre: 'Temp User',
        cargo: 'Asistente',
        tipo: TIPOS_FIRMA.SELLO_INTERNO
    });
    ok('Firma temporal creada', Boolean(firmaAEliminar.id));
    const eliminada = eliminarFirma('sig_temp_eliminar');
    ok('Eliminar firma remueve del catálogo', eliminada === true);

    // 8. Renderizado en jsPDF simulado
    const calls = { rect: [], text: [], addImage: [] };
    const fakeDoc = {
        setDrawColor: () => {},
        setLineWidth: () => {},
        setFillColor: () => {},
        setFontSize: () => {},
        setFont: () => {},
        setTextColor: () => {},
        rect: (...args) => calls.rect.push(args),
        text: (...args) => calls.text.push(args),
        addImage: (...args) => calls.addImage.push(args)
    };
    renderizarFirmasEnPDF(fakeDoc, [ensambleInterno]);
    ok('renderizarFirmasEnPDF dibuja los recuadros de slots y textos', calls.rect.length >= 8 && calls.text.length >= 4);

    console.log(`\n📊 RESUMEN FIRMAS Y SELLOS: ${passed} pasaron, ${failed} fallaron.\n`);
    if (failed > 0) process.exit(1);
}

run().catch(e => {
    console.error('Error fatal en tests:', e);
    process.exit(1);
});
