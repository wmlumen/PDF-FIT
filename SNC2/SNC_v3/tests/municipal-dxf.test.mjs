import test from 'node:test';
import assert from 'node:assert/strict';

globalThis.window = globalThis;
globalThis.localStorage = {
    data: new Map(),
    getItem(key) { return this.data.get(key) ?? null; },
    setItem(key, value) { this.data.set(key, String(value)); },
    removeItem(key) { this.data.delete(key); }
};

const { ValidadorMunicipal } = await import('../js/municipal.js');
const { buildDXF } = await import('../js/exportFormats.js');

test('Municipal - Detección de ochava reglamentaria en lote de esquina', () => {
    const validador = new ValidadorMunicipal();

    // 1. Lote normal (no esquina) -> sin alertas
    const loteNormal = {
        type: 'Feature',
        properties: { CODIGO: 'L-01', ESQUINA: 'NO', USO_SUELO: 'LOTE' },
        geometry: {
            type: 'Polygon',
            coordinates: [[[0, 0], [12, 0], [12, 30], [0, 30], [0, 0]]]
        }
    };
    const alertasNormal = validador.validarOchavas(loteNormal);
    assert.equal(alertasNormal.length, 0);

    // 2. Lote en esquina sin ochava (4 esquinas a 90 grados) -> alerta de ochava faltante
    const loteEsquinaSinOchava = {
        type: 'Feature',
        properties: { CODIGO: 'L-ESQ-01', ESQUINA: 'SI', USO_SUELO: 'LOTE' },
        geometry: {
            type: 'Polygon',
            coordinates: [[[0, 0], [15, 0], [15, 30], [0, 30], [0, 0]]]
        }
    };
    const alertasFaltante = validador.validarOchavas(loteEsquinaSinOchava);
    assert.equal(alertasFaltante.length, 1);
    assert.equal(alertasFaltante[0].codigo, 'MUNI_OCHAVA_FALTANTE_L-ESQ-01');

    // 3. Lote en esquina con ochava reglamentaria (chaflán de ~4.24m entre x=3 y y=3)
    const loteEsquinaConOchava = {
        type: 'Feature',
        properties: { CODIGO: 'L-ESQ-02', ESQUINA: 'SI', USO_SUELO: 'LOTE' },
        geometry: {
            type: 'Polygon',
            coordinates: [[[3, 0], [15, 0], [15, 30], [0, 30], [0, 3], [3, 0]]]
        }
    };
    const alertasConOchava = validador.validarOchavas(loteEsquinaConOchava);
    assert.equal(alertasConOchava.length, 0);
});

test('Municipal - Cálculo de contribución por mejoras (Ley 5513/2015)', () => {
    const validador = new ValidadorMunicipal();
    const lotes = [
        {
            type: 'Feature',
            properties: { PADRON: '101', FRENTE_M: 12 },
            geometry: { type: 'Polygon', coordinates: [[[0, 0], [12, 0], [12, 30], [0, 30], [0, 0]]] }
        },
        {
            type: 'Feature',
            properties: { PADRON: '102', FRENTE_M: 15 },
            geometry: { type: 'Polygon', coordinates: [[[12, 0], [27, 0], [27, 30], [12, 30], [12, 0]]] }
        }
    ];

    const contrib = validador.calcularContribucionMejoras(lotes, 180000);
    assert.equal(contrib.metrosFrenteTotal, 27);
    assert.equal(contrib.totalContribucionGs, 27 * 180000);
    assert.equal(contrib.desglosePorLote.length, 2);
    assert.equal(contrib.desglosePorLote[0].contribucionEstimadaGs, 12 * 180000);
});

test('Municipal - Perfiles viales mínimos (calles secundarias 12m, avenidas 24m)', () => {
    const validador = new ValidadorMunicipal();

    // 1. Calle secundaria con 10m (< 12m) -> Error
    const calleEstrecha = {
        type: 'Feature',
        properties: { CODIGO: 'VIA-01', USO_SUELO: 'CALLE', ANCHO_M: 10.0 },
        geometry: { type: 'Polygon', coordinates: [[[0, 0], [10, 0], [10, 100], [0, 100], [0, 0]]] }
    };
    const erroresCalle = validador.validarPerfilVial(calleEstrecha);
    assert.equal(erroresCalle.length, 1);
    assert.equal(erroresCalle[0].codigo, 'MUNI_PERFIL_CALLE_INSUFICIENTE_VIA-01');

    // 2. Calle secundaria con 12m (conforme) -> OK
    const calleConforme = {
        type: 'Feature',
        properties: { CODIGO: 'VIA-02', USO_SUELO: 'CALLE', ANCHO_M: 12.0 },
        geometry: { type: 'Polygon', coordinates: [[[0, 0], [12, 0], [12, 100], [0, 100], [0, 0]]] }
    };
    assert.equal(validador.validarPerfilVial(calleConforme).length, 0);

    // 3. Avenida colectora con 20m (< 24m) -> Error
    const avenidaInsuficiente = {
        type: 'Feature',
        properties: { CODIGO: 'AVE-01', USO_SUELO: 'AVENIDA', ANCHO_M: 20.0 },
        geometry: { type: 'Polygon', coordinates: [[[0, 0], [20, 0], [20, 200], [0, 200], [0, 0]]] }
    };
    const erroresAve = validador.validarPerfilVial(avenidaInsuficiente);
    assert.equal(erroresAve.length, 1);
    assert.equal(erroresAve[0].codigo, 'MUNI_PERFIL_AVENIDA_INSUFICIENTE_AVE-01');

    // 4. Avenida con 24m (conforme) -> OK
    const avenidaConforme = {
        type: 'Feature',
        properties: { CODIGO: 'AVE-02', USO_SUELO: 'AVENIDA', ANCHO_M: 24.0 },
        geometry: { type: 'Polygon', coordinates: [[[0, 0], [24, 0], [24, 200], [0, 200], [0, 0]]] }
    };
    assert.equal(validador.validarPerfilVial(avenidaConforme).length, 0);
});

test('Municipal - Homologación de Junta y promulgación para Padrón/CCC definitivo', () => {
    const validador = new ValidadorMunicipal();

    // 1. Fraccionamiento sin resolución municipal -> Bloqueante
    const expSinHomologacion = {
        tipoTramite: 'FRACCIONAMIENTO',
        expedienteNumero: 'EXP-2026-99'
    };
    const bloqueos = validador.validarHomologacionMunicipal(expSinHomologacion);
    assert.ok(bloqueos.some(b => b.codigo === 'MUNI_FALTA_RESOLUCION_JUNTA' && b.bloqueantePadron === true));

    // 2. Fraccionamiento con resolución y promulgación -> Conforme
    const expCompleto = {
        tipoTramite: 'FRACCIONAMIENTO',
        expedienteNumero: 'EXP-2026-99',
        numeroResolucionJunta: 'RES-JM-412/2026',
        fechaPromulgacionIntendente: '2026-05-10'
    };
    const sinBloqueos = validador.validarHomologacionMunicipal(expCompleto);
    assert.equal(sinBloqueos.length, 0);
});

test('DXF Export - Generación de entidades y capas oficiales AutoCAD R12', () => {
    const sampleGeoJSON = {
        type: 'FeatureCollection',
        features: [
            {
                type: 'Feature',
                properties: { PADRON: '4278', CODIGO: '0314-001' },
                geometry: {
                    type: 'Polygon',
                    coordinates: [[[500000, 7200000], [500020, 7200000], [500020, 7200030], [500000, 7200030], [500000, 7200000]]]
                }
            }
        ]
    };

    const dxf = buildDXF(sampleGeoJSON);
    assert.ok(dxf.includes('0\nSECTION\n2\nHEADER'));
    assert.ok(dxf.includes('0_LIMITES_PARCELAS'));
    assert.ok(dxf.includes('1_VERTICES_MOJONES'));
    assert.ok(dxf.includes('2_TEXTOS_PADRON'));
    assert.ok(dxf.includes('LWPOLYLINE'));
    assert.ok(dxf.includes('PADRON 4278'));
    assert.ok(dxf.includes('0\nEOF'));
});

test('Municipal - Indicadores Territoriales Ciudades Sustentables VEP (MEF)', () => {
    const validador = new ValidadorMunicipal();
    const mockGeoJSON = {
        type: 'FeatureCollection',
        features: [
            // Parcela 1: Lote urbano titulado
            {
                type: 'Feature',
                properties: { CODIGO: 'L-01', PADRON: '101', TITULO: 'SI', USO_SUELO: 'LOTE', AREA_M2: 360, FRENTE_M: 12 },
                geometry: { type: 'Polygon', coordinates: [[[0, 0], [12, 0], [12, 30], [0, 30], [0, 0]]] }
            },
            // Parcela 2: Lote en zona inundable y con faja hidrica
            {
                type: 'Feature',
                properties: { CODIGO: 'L-02', PADRON: '102', TITULO: 'NO', USO_SUELO: 'LOTE', AREA_M2: 360, FRENTE_M: 12, ZONA_INUNDABLE: 'SI', FAJA_HIDRICA: 'SI' },
                geometry: { type: 'Polygon', coordinates: [[[12, 0], [24, 0], [24, 30], [12, 30], [12, 0]]] }
            },
            // Plaza / Espacio Verde: 500 m²
            {
                type: 'Feature',
                properties: { CODIGO: 'ESP-VERDE-01', USO_SUELO: 'PLAZA', AREA_M2: 500 },
                geometry: { type: 'Polygon', coordinates: [[[0, 30], [25, 30], [25, 50], [0, 50], [0, 30]]] }
            },
            // Vía pública conforme (12m ancho) con ciclovía AMABICI
            {
                type: 'Feature',
                properties: { CODIGO: 'VIA-01', USO_SUELO: 'CALLE', ANCHO_M: 12, LONGITUD_M: 100, AREA_M2: 1200, AMABICI: 'SI' },
                geometry: { type: 'Polygon', coordinates: [[[0, 0], [12, 0], [12, 100], [0, 100], [0, 0]]] }
            }
        ]
    };

    const vep = validador.evaluarIndicadoresSustentablesVEP(mockGeoJSON, { poblacionEstimada: 50, costoPavimentoGs: 200000 });

    assert.ok(vep.direcciones);
    // Catastro y Obras: 1 de 2 lotes titulado (50%)
    assert.equal(vep.direcciones.catastroYObras.tasaTitularidadFormalPct, 50);
    // Medio Ambiente: 500 m² / 50 hab = 10 m²/hab (supera meta de 9 m²)
    assert.equal(vep.direcciones.medioAmbiente.espacioVerdeM2PorHab, 10);
    assert.equal(vep.direcciones.medioAmbiente.cumpleMetaVerde, true);
    assert.equal(vep.direcciones.medioAmbiente.lotesAfectanFajaProteccion, 1);
    // Riesgos: 1 lote en riesgo
    assert.equal(vep.direcciones.gestionDeRiesgos.lotesEnZonaInundable, 1);
    // Tránsito: red analizada y ciclovía presente
    assert.equal(vep.direcciones.transitoYMovilidad.kmRedVialAnalizada, 0.1);
    assert.equal(vep.direcciones.transitoYMovilidad.kmInfraestructuraCicloviaria, 0.1);
    // Recaudaciones: 24 metros frente * 200.000 Gs = 4.800.000 Gs
    assert.equal(vep.direcciones.recaudacionesYHacienda.metrosLinealesFrenteTotales, 24);
    assert.equal(vep.direcciones.recaudacionesYHacienda.potencialContribucionMejorasGs, 4800000);
});
