/**
 * Validador Municipal - Ley Orgánica Municipal Nº 3966/2010
 * Control de parámetros urbanos, perfiles viales, homologación municipal y balance de loteamientos.
 */

import { State } from './state.js';
import { CONFIG_MUNICIPAL, METADATOS_GEODESICOS } from './config.js';
import { calcularMetricasPlanasUTM } from './utils.js';

export class ValidadorMunicipal {
    constructor(config = {}) {
        this.frenteMinimo = config.frenteMinimo || CONFIG_MUNICIPAL.frenteMinimo;
        this.superficieMinima = config.superficieMinima || CONFIG_MUNICIPAL.superficieMinima;
        this.porcentajeCallesMin = config.porcentajeCallesMin || CONFIG_MUNICIPAL.porcentajeCallesMin;
        this.porcentajePlazasMin = config.porcentajePlazasMin || CONFIG_MUNICIPAL.porcentajePlazasMin;
        this.porcentajePlazasMax = config.porcentajePlazasMax || CONFIG_MUNICIPAL.porcentajePlazasMax;
        this.franjaHidricaMinima = config.franjaHidricaMinima || CONFIG_MUNICIPAL.franjaHidricaMinima;
        this.anchoCalleSecundariaMin = config.anchoCalleSecundariaMin || CONFIG_MUNICIPAL.anchoCalleSecundariaMin || 12.0;
        this.anchoAvenidaColectoraMin = config.anchoAvenidaColectoraMin || CONFIG_MUNICIPAL.anchoAvenidaColectoraMin || 24.0;
        this.anchoPasajePeatonalMin = config.anchoPasajePeatonalMin || CONFIG_MUNICIPAL.anchoPasajePeatonalMin || 6.0;
        this.retiroFondoMinimo = config.retiroFondoMinimo || CONFIG_MUNICIPAL.retiroFondoMinimo;
        this.retiroLateralMinimo = config.retiroLateralMinimo || CONFIG_MUNICIPAL.retiroLateralMinimo;
    }

    /**
     * Evalúa dimensiones mínimas por lote individual (Art. Ley 3966/10)
     * @param {Object} feature - Feature GeoJSON de la parcela
     * @param {Object} metricas - Métricas calculadas (areaM2, frenteEstimadoM, etc.)
     * @returns {Array} Array de errores/advertencias
     */
    validarLoteUrbano(feature, metricas) {
        const errores = [];
        const { areaM2, frenteEstimadoM } = metricas;
        const codigo = feature.properties?.CODIGO || feature.properties?.PADRON || 'SIN_CODIGO';

        if (areaM2 < this.superficieMinima) {
            errores.push({
                codigo: `MUNI_AREA_INSUFICIENTE_${codigo}`,
                campo: 'SUPERFICIE_MINIMA',
                valor: areaM2.toFixed(2),
                estado: 'error',
                mensaje: `Superficie (${areaM2.toFixed(2)} m²) inferior al mínimo legal municipal (${this.superficieMinima} m²) - Ley 3966/10 Art. 86.`
            });
        }

        if (frenteEstimadoM < this.frenteMinimo) {
            errores.push({
                codigo: `MUNI_FRENTE_INSUFICIENTE_${codigo}`,
                campo: 'FRENTE_MINIMO',
                valor: frenteEstimadoM.toFixed(2),
                estado: 'alerta',
                mensaje: `Frente del lote (${frenteEstimadoM.toFixed(2)} m) inferior al mínimo de ${this.frenteMinimo} m exigido por Ordenanza Municipal.`
            });
        }

        return errores;
    }

    /**
     * Evalúa balance de fraccionamiento / loteamiento completo
     * @param {Array} featuresLotes - Array de features GeoJSON de todos los lotes
     * @param {number} areaTotalMatriz - Superficie total de la parcela matriz (m²)
     * @returns {Object} Balance con validez y alertas
     */
    validarBalanceLoteamiento(featuresLotes, areaTotalMatriz) {
        let areaUtilLotes = 0;
        let areaCallesCedidas = 0;
        let areaEspaciosVerdes = 0;
        let areaOtros = 0;

        featuresLotes.forEach(f => {
            const tipo = (f.properties?.USO_SUELO || f.properties?.DESTINO || f.properties?.TIPO_LOTE || '').toUpperCase();
            let area = parseFloat(f.properties?.AREA_M2 || f.properties?.SUP_SIG_M2 || f.properties?.SUPERFICIE || 0);
            if (!area || isNaN(area) || area <= 0) {
                try {
                    const m = calcularMetricasPlanasUTM(f, State.get('currentDisplayProjection') || 'EPSG:32721');
                    area = m.areaM2 || 0;
                } catch { area = 0; }
            }

            if (tipo === 'CALLE' || tipo === 'VIA' || tipo === 'CALLES' || tipo === 'RUTA' || tipo === 'AVENIDA') {
                areaCallesCedidas += area;
            } else if (tipo === 'PLAZA' || tipo === 'ESPACIO_VERDE' || tipo === 'VERDE' || tipo === 'EDIFICIO_PUBLICO' || tipo === 'PUBLICO' || tipo === 'PARQUE') {
                areaEspaciosVerdes += area;
            } else if (tipo === 'LOTE' || tipo === 'URBANO' || tipo === 'RESIDENCIAL' || tipo === 'COMERCIAL' || tipo === 'MIXTO' || !tipo) {
                areaUtilLotes += area;
            } else {
                areaOtros += area;
            }
        });

        const pctCalles = areaTotalMatriz > 0 ? areaCallesCedidas / areaTotalMatriz : 0;
        const pctPlazas = areaTotalMatriz > 0 ? areaEspaciosVerdes / areaTotalMatriz : 0;

        const balance = {
            valido: true,
            areaTotalMatriz: areaTotalMatriz.toFixed(2),
            areaUtilLotes: areaUtilLotes.toFixed(2),
            areaCallesCedidas: areaCallesCedidas.toFixed(2),
            areaEspaciosVerdes: areaEspaciosVerdes.toFixed(2),
            areaOtros: areaOtros.toFixed(2),
            detalles: {
                cesionCalles: {
                    actual: (pctCalles * 100).toFixed(2),
                    requeridoMin: (this.porcentajeCallesMin * 100).toFixed(1),
                    unidad: '%'
                },
                cesionPlazas: {
                    actual: (pctPlazas * 100).toFixed(2),
                    requeridoMin: (this.porcentajePlazasMin * 100).toFixed(1),
                    requeridoMax: (this.porcentajePlazasMax * 100).toFixed(1),
                    unidad: '%'
                }
            },
            alertas: []
        };

        if (pctCalles < this.porcentajeCallesMin) {
            balance.valido = false;
            balance.alertas.push({
                codigo: 'MUNI_CESION_VIAL_INSUFICIENTE',
                mensaje: `Cesión vial (${(pctCalles * 100).toFixed(2)}%) inferior al ${(this.porcentajeCallesMin * 100).toFixed(1)}% reglamentario (Ley 3966/10).`,
                estado: 'error'
            });
        }

        if (pctPlazas < this.porcentajePlazasMin) {
            balance.valido = false;
            balance.alertas.push({
                codigo: 'MUNI_CESION_VERDE_INSUFICIENTE',
                mensaje: `Cesión para plazas/edificios públicos (${(pctPlazas * 100).toFixed(2)}%) inferior al mínimo legal ${(this.porcentajePlazasMin * 100).toFixed(1)}%-${(this.porcentajePlazasMax * 100).toFixed(1)}%.`,
                estado: 'error'
            });
        } else if (pctPlazas > this.porcentajePlazasMax) {
            balance.alertas.push({
                codigo: 'MUNI_CESION_VERDE_EXCESIVA',
                mensaje: `Cesión para plazas/edificios públicos (${(pctPlazas * 100).toFixed(2)}%) supera el máximo habitual ${(this.porcentajePlazasMax * 100).toFixed(1)}%.`,
                estado: 'advertencia'
            });
        }

        return balance;
    }

    /**
     * Estima el frente de un polígono (longitud del lado más representativo orientado a vía o cota frontal)
     * @param {Object} feature - Feature GeoJSON
     * @returns {number} Frente estimado en metros
     */
    estimarFrente(feature) {
        if (feature?.properties?.FRENTE_M && !isNaN(parseFloat(feature.properties.FRENTE_M))) {
            return parseFloat(feature.properties.FRENTE_M);
        }
        if (feature?.properties?.FRENTE && !isNaN(parseFloat(feature.properties.FRENTE))) {
            return parseFloat(feature.properties.FRENTE);
        }
        try {
            const geom = feature?.geometry;
            if (!geom || !['Polygon', 'MultiPolygon'].includes(geom.type)) return 0;

            const polygons = geom.type === 'MultiPolygon' ? geom.coordinates : [geom.coordinates];
            let maxFrente = 0;

            polygons.forEach(polygon => {
                const ring = polygon[0];
                if (!Array.isArray(ring) || ring.length < 2) return;
                for (let i = 0; i < ring.length - 1; i++) {
                    const [x1, y1] = ring[i];
                    const [x2, y2] = ring[i + 1];
                    let dist = 0;
                    if (Math.abs(x1) <= 180 && Math.abs(y1) <= 90) {
                        const midLatRad = ((y1 + y2) / 2) * (Math.PI / 180);
                        const dx = (x2 - x1) * 111320 * Math.cos(midLatRad);
                        const dy = (y2 - y1) * 110574;
                        dist = Math.sqrt(dx * dx + dy * dy);
                    } else {
                        dist = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
                    }
                    if (dist > maxFrente) maxFrente = dist;
                }
            });

            return Number(maxFrente.toFixed(2));
        } catch (e) {
            console.warn('Error estimando frente:', e);
            return 0;
        }
    }

    /**
     * Valida retiros mínimos (fondo y laterales)
     * @param {Object} feature - Feature GeoJSON
     * @returns {Array} Array de alertas
     */
    validarRetiros(feature) {
        const alertas = [];
        const codigo = feature.properties?.CODIGO || feature.properties?.PADRON || 'SIN_CODIGO';
        
        alertas.push({
            codigo: `MUNI_RETIROS_PENDIENTE_${codigo}`,
            campo: 'RETIROS_MINIMOS',
            valor: 'PENDIENTE_VERIFICACION',
            estado: 'advertencia',
            mensaje: `Verificar retiros mínimos: Fondo ≥ ${this.retiroFondoMinimo}m, Laterales ≥ ${this.retiroLateralMinimo}m (Ordenanza Municipal). Requiere plano de implantación.`
        });

        return alertas;
    }

    /**
     * Valida la presencia de ochava reglamentaria en lotes de esquina (Ley 3966/10 Art. 235)
     * Exige chaflán mínimo de 3.00m x 3.00m (hipotenusa ≈ 4.24m)
     * @param {Object} feature - Feature GeoJSON del lote
     * @returns {Array} Alertas o errores de ochava
     */
    validarOchavas(feature) {
        const alertas = [];
        const props = feature.properties || {};
        const codigo = props.CODIGO || props.PADRON || 'SIN_CODIGO';
        const esEsquina = props.ESQUINA === true || props.ESQUINA === 'SI' || props.ESQUINA === 'si' ||
            String(props.TIPO_LOTE || '').toUpperCase() === 'ESQUINA' ||
            String(props.UBICACION || '').toUpperCase().includes('ESQUINA');

        if (!esEsquina) return alertas;

        const geom = feature.geometry;
        if (!geom || !['Polygon', 'MultiPolygon'].includes(geom.type)) return alertas;

        const coords = geom.type === 'Polygon' ? geom.coordinates[0] : geom.coordinates[0][0];
        if (!Array.isArray(coords) || coords.length < 4) return alertas;

        let tieneSegmentoOchava = false;
        let segmentoOchavaLongitud = 0;

        for (let i = 0; i < coords.length - 1; i++) {
            const [x1, y1] = coords[i];
            const [x2, y2] = coords[i + 1];
            let dist = 0;
            if (Math.abs(x1) <= 180 && Math.abs(y1) <= 90) {
                const midLatRad = ((y1 + y2) / 2) * (Math.PI / 180);
                const dx = (x2 - x1) * 111320 * Math.cos(midLatRad);
                const dy = (y2 - y1) * 110574;
                dist = Math.sqrt(dx * dx + dy * dy);
            } else {
                dist = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
            }

            if (dist >= 2.5 && dist <= 6.5) {
                tieneSegmentoOchava = true;
                segmentoOchavaLongitud = dist;
                break;
            }
        }

        if (!tieneSegmentoOchava && coords.length <= 5) {
            alertas.push({
                codigo: `MUNI_OCHAVA_FALTANTE_${codigo}`,
                campo: 'OCHAVA_ESQUINA',
                valor: 'NO_DETECTADA',
                estado: 'alerta',
                mensaje: `Lote en esquina sin ochava reglamentaria de 3.00m x 3.00m (Ley 3966/10 Art. 235). Riesgo de rechazo por Dirección de Obras.`
            });
        }

        return alertas;
    }

    /**
     * Valida el perfil vial mínimo de calles y avenidas según Ley 3966/10
     * @param {Object} feature - Feature GeoJSON de la vía
     * @returns {Array} Array de errores o alertas de perfil vial
     */
    validarPerfilVial(feature) {
        const errores = [];
        const props = feature.properties || {};
        const tipo = String(props.USO_SUELO || props.DESTINO || props.TIPO_VIA || props.TIPO || '').toUpperCase();
        const codigo = props.CODIGO || props.PADRON || props.NOMBRE_VIA || 'VIA_SNC';

        const esVia = ['CALLE', 'VIA', 'CALLES', 'RUTA', 'AVENIDA', 'COLECTORA', 'PASAJE'].some(t => tipo.includes(t));
        if (!esVia) return errores;

        let anchoM = parseFloat(props.ANCHO_M || props.ANCHO || props.ANCHO_VIA || 0);
        if (!anchoM || isNaN(anchoM) || anchoM <= 0) {
            anchoM = this.estimarAnchoVia(feature);
        }

        const esAvenida = tipo.includes('AVENIDA') || tipo.includes('COLECTORA') || tipo.includes('RUTA') || tipo.includes('PRINCIPAL');
        const esPasaje = tipo.includes('PASAJE') || tipo.includes('PEATONAL');

        if (esAvenida) {
            if (anchoM < this.anchoAvenidaColectoraMin) {
                errores.push({
                    codigo: `MUNI_PERFIL_AVENIDA_INSUFICIENTE_${codigo}`,
                    campo: 'PERFIL_VIAL_AVENIDA',
                    valor: anchoM.toFixed(2),
                    estado: 'error',
                    mensaje: `Ancho de avenida/colectora (${anchoM.toFixed(2)} m) inferior al mínimo legal de ${this.anchoAvenidaColectoraMin} m (Ley 3966/10).`
                });
            }
        } else if (esPasaje) {
            if (anchoM < this.anchoPasajePeatonalMin) {
                errores.push({
                    codigo: `MUNI_PERFIL_PASAJE_INSUFICIENTE_${codigo}`,
                    campo: 'PERFIL_VIAL_PASAJE',
                    valor: anchoM.toFixed(2),
                    estado: 'alerta',
                    mensaje: `Ancho de pasaje peatonal (${anchoM.toFixed(2)} m) inferior al perfil mínimo de ${this.anchoPasajePeatonalMin} m.`
                });
            }
        } else {
            // Calle secundaria estándar
            if (anchoM < this.anchoCalleSecundariaMin) {
                errores.push({
                    codigo: `MUNI_PERFIL_CALLE_INSUFICIENTE_${codigo}`,
                    campo: 'PERFIL_VIAL_CALLE',
                    valor: anchoM.toFixed(2),
                    estado: 'error',
                    mensaje: `Ancho de calle secundaria (${anchoM.toFixed(2)} m) inferior al perfil mínimo legal de ${this.anchoCalleSecundariaMin} m (Ley 3966/10).`
                });
            }
        }

        return errores;
    }

    /**
     * Estima el ancho promedio de una vía a partir de su geometría poligonal
     */
    estimarAnchoVia(feature) {
        try {
            const geom = feature?.geometry;
            if (!geom || !['Polygon', 'MultiPolygon'].includes(geom.type)) return 0;
            const metricas = calcularMetricasPlanasUTM(feature, State.get('currentDisplayProjection') || 'EPSG:32721');
            const area = metricas?.areaM2 || 0;
            const perim = metricas?.perimetroM || 0;
            if (perim <= 0 || area <= 0) return 0;
            const largoAprox = perim / 2;
            const anchoAprox = area / largoAprox;
            return Number(anchoAprox.toFixed(2));
        } catch {
            return 0;
        }
    }

    /**
     * Valida los requisitos de homologación de la Junta Municipal y promulgación del Intendente
     * Bloqueante para asignación de Padrón/CCC definitiva (Ley 3966/10 y Res. SNC 551/2023)
     * @param {Object} expediente - Datos del expediente o metadata
     * @returns {Array} Errores o bloqueos de homologación
     */
    validarHomologacionMunicipal(expediente = {}) {
        const bloqueos = [];
        const tipo = String(expediente.tipoTramite || expediente.TIPO_TRAMITE || 'FRACCIONAMIENTO').toUpperCase();
        const requiereHomologacion = ['FRACCIONAMIENTO', 'LOTEAMIENTO', 'LOTEO', 'APERTURA_CALLES'].some(t => tipo.includes(t));

        if (!requiereHomologacion) return bloqueos;

        const resJunta = expediente.numeroResolucionJunta || expediente.RESOLUCION_JUNTA || expediente.RES_JUNTA;
        const fechaProm = expediente.fechaPromulgacionIntendente || expediente.FECHA_PROMULGACION || expediente.PROMULGACION_INTENDENTE;

        if (!resJunta) {
            bloqueos.push({
                codigo: 'MUNI_FALTA_RESOLUCION_JUNTA',
                campo: 'RESOLUCION_JUNTA_MUNICIPAL',
                estado: 'error',
                bloqueantePadron: true,
                mensaje: 'Falta Número de Resolución Homologatoria de la Junta Municipal (Ley 3966/10 Art. 136). Trámite bloqueado para Padrón/CCC definitivo.'
            });
        }

        if (!fechaProm) {
            bloqueos.push({
                codigo: 'MUNI_FALTA_PROMULGACION_INTENDENTE',
                campo: 'PROMULGACION_INTENDENCIA',
                estado: resJunta ? 'error' : 'alerta',
                bloqueantePadron: true,
                mensaje: 'Pendiente de Decreto de Promulgación por la Intendencia Municipal. Se requiere para culminación registral en SNC.'
            });
        }

        return bloqueos;
    }

    /**
     * Calcula estimación de Contribución por Mejoras (Ley 5513/2015)
     * en base al frente lineal de los lotes sobre calzadas proyectadas
     * @param {Array} featuresLotes - Array de lotes
     * @param {number} costoPorMetroLinealGs - Costo estimado por metro lineal de calzada en Guaraníes
     * @returns {Object} Desglose por lote y total
     */
    calcularContribucionMejoras(featuresLotes, costoPorMetroLinealGs = 180000) {
        let metrosFrenteTotal = 0;
        const desglosePorLote = [];

        featuresLotes.forEach(f => {
            const padron = f.properties?.PADRON || f.properties?.CODIGO || 'LOTE';
            let frente = parseFloat(f.properties?.FRENTE_M || f.properties?.FRENTE || 0);
            if (!frente || isNaN(frente) || frente <= 0) {
                frente = this.estimarFrente(f);
            }
            metrosFrenteTotal += frente;
            desglosePorLote.push({
                padron,
                frenteM: frente,
                contribucionEstimadaGs: Math.round(frente * costoPorMetroLinealGs)
            });
        });

        return {
            costoPorMetroLinealGs,
            metrosFrenteTotal: Number(metrosFrenteTotal.toFixed(2)),
            totalContribucionGs: Math.round(metrosFrenteTotal * costoPorMetroLinealGs),
            desglosePorLote
        };
    }

    /**
     * Evalúa los indicadores territoriales del modelo Ciudades Sustentables VEP (MEF)
     * para las Direcciones Municipales: Catastro, Medio Ambiente, Tránsito, Riesgos y Recaudaciones.
     * @param {Object} geojson - GeoJSON completo del expediente/distrito
     * @param {Object} opciones - Parámetros demográficos y de contexto (población, costos, etc.)
     * @returns {Object} Indicadores departamentales estructurados con umbrales y diagnósticos
     */
    evaluarIndicadoresSustentablesVEP(geojson, opciones = {}) {
        if (!geojson || !Array.isArray(geojson.features)) {
            return { error: 'GeoJSON no válido para evaluación VEP' };
        }

        const features = geojson.features;
        const poblacionEstimada = opciones.poblacionEstimada || 1000; // Valor base por defecto
        const costoPavimentoGs = opciones.costoPavimentoGs || 180000;

        let areaTotalM2 = 0;
        let areaUtilLotesM2 = 0;
        let areaEspaciosVerdesM2 = 0;
        let areaViasM2 = 0;
        let kmViasTotal = 0;
        let kmViasConformes12m = 0;
        let kmAvenidasConformes24m = 0;
        let kmBicisendas = 0;
        let totalLotes = 0;
        let lotesTitulados = 0;
        let lotesEnZonaRiesgo = 0;
        let lotesEnFajaProteccion = 0;
        let metrosLinealesFrenteTotal = 0;

        features.forEach(f => {
            const props = f.properties || {};
            const uso = (props.USO_SUELO || props.DESTINO || props.TIPO || '').toUpperCase();
            
            let area = parseFloat(props.AREA_M2 || props.SUP_SIG_M2 || props.SUPERFICIE || 0);
            if (!area || isNaN(area) || area <= 0) {
                try {
                    const m = calcularMetricasPlanasUTM(f, State.get('currentDisplayProjection') || 'EPSG:32721');
                    area = m.areaM2 || 0;
                } catch { area = 0; }
            }
            areaTotalM2 += area;

            if (uso === 'PLAZA' || uso === 'ESPACIO_VERDE' || uso === 'PARQUE' || uso === 'RESERVA') {
                areaEspaciosVerdesM2 += area;
            } else if (uso === 'CALLE' || uso === 'VIA' || uso === 'AVENIDA' || uso === 'COLECTORA') {
                areaViasM2 += area;
                const ancho = parseFloat(props.ANCHO_M || props.ANCHO || 0);
                const largo = parseFloat(props.LONGITUD_M || props.LONGITUD || (ancho > 0 ? area / ancho : 0));
                const km = largo / 1000.0;
                kmViasTotal += km;

                if (uso === 'AVENIDA' || uso === 'COLECTORA') {
                    if (ancho >= this.anchoAvenidaColectoraMin) kmAvenidasConformes24m += km;
                } else {
                    if (ancho >= this.anchoCalleSecundariaMin) kmViasConformes12m += km;
                }

                if (props.BICISENDA === 'SI' || props.CICLOVIA === 'SI' || props.AMABICI === 'SI') {
                    kmBicisendas += km;
                }
            } else {
                // Parcela / Lote
                totalLotes++;
                const frente = parseFloat(props.FRENTE_M || props.FRENTE || this.estimarFrente(f) || 0);
                metrosLinealesFrenteTotal += frente;
                areaUtilLotesM2 += area;

                if (props.TITULO === 'SI' || props.FINCA || props.MATRICULA) {
                    lotesTitulados++;
                }

                if (props.ZONA_INUNDABLE === 'SI' || props.RIESGO_ALTO === 'SI') {
                    lotesEnZonaRiesgo++;
                }

                if (props.FAJA_HIDRICA === 'SI' || props.AFECTA_CAUCE === 'SI') {
                    lotesEnFajaProteccion++;
                }
            }
        });

        // 1. Dirección de Catastro y Obras Particulares (DCOP)
        const pctCesionVial = areaTotalM2 > 0 ? (areaViasM2 / areaTotalM2) * 100 : 0;
        const pctCesionVerde = areaTotalM2 > 0 ? (areaEspaciosVerdesM2 / areaTotalM2) * 100 : 0;
        const tasaTitularidad = totalLotes > 0 ? (lotesTitulados / totalLotes) * 100 : 0;
        const densidadHabHa = areaTotalM2 > 0 ? (poblacionEstimada / (areaTotalM2 / 10000.0)) : 0;

        // 2. Dirección de Medio Ambiente y Salubridad (DMAS)
        const m2VerdePorHab = poblacionEstimada > 0 ? (areaEspaciosVerdesM2 / poblacionEstimada) : 0;
        const cumpleMetaOMSVerde = m2VerdePorHab >= 9.0;

        // 3. Dirección de Gestión de Riesgos (DGRRD)
        const pctLotesEnRiesgo = totalLotes > 0 ? (lotesEnZonaRiesgo / totalLotes) * 100 : 0;

        // 4. Dirección de Tránsito y Movilidad (DTTV)
        const pctViasConformes = kmViasTotal > 0 ? ((kmViasConformes12m + kmAvenidasConformes24m) / kmViasTotal) * 100 : 100;

        // 5. Dirección de Recaudaciones / Hacienda (DRHM)
        const estimacionContribucionMejorasGs = Math.round(metrosLinealesFrenteTotal * costoPavimentoGs);

        return {
            fuenteReferencia: 'Proyecto Ciudades Sustentables VEP - MEF / Ley Orgánica Municipal Nº 3966/2010',
            parametrosCalculo: {
                areaTotalM2: Number(areaTotalM2.toFixed(2)),
                totalLotes,
                poblacionEstimada
            },
            direcciones: {
                catastroYObras: {
                    tasaTitularidadFormalPct: Number(tasaTitularidad.toFixed(2)),
                    metaTitularidadFormalPct: 85.0,
                    cesionVialPct: Number(pctCesionVial.toFixed(2)),
                    metaCesionVialMinPct: Number((this.porcentajeCallesMin * 100).toFixed(1)),
                    cesionEspacioVerdePct: Number(pctCesionVerde.toFixed(2)),
                    metaCesionVerdeRangoPct: `${(this.porcentajePlazasMin * 100).toFixed(1)}% - ${(this.porcentajePlazasMax * 100).toFixed(1)}%`,
                    densidadHabitacionalHabHa: Number(densidadHabHa.toFixed(2)),
                    diagnostico: pctCesionVial >= (this.porcentajeCallesMin * 100) && pctCesionVerde >= (this.porcentajePlazasMin * 100)
                        ? 'CONFORME: El loteamiento cumple las reservas de cesión pública obligatoria.'
                        : 'OBSERVADO: Déficit de cesión de vías o plazas públicas (Ley 3966/10 Art. 235).'
                },
                medioAmbiente: {
                    espacioVerdeM2PorHab: Number(m2VerdePorHab.toFixed(2)),
                    metaOMSVerdeMin: 9.0,
                    cumpleMetaVerde: cumpleMetaOMSVerde,
                    lotesAfectanFajaProteccion: lotesEnFajaProteccion,
                    diagnostico: lotesEnFajaProteccion > 0
                        ? `ALERTA: Se detectan ${lotesEnFajaProteccion} lote(s) en faja de servidumbre ribereña (Ley 4241/10).`
                        : (cumpleMetaOMSVerde ? 'EXCELENTE: Índice verde por habitante superior al estándar OMS/VEP.' : 'DEFICITARIO: Área verde por habitante inferior a 9 m²/hab.')
                },
                gestionDeRiesgos: {
                    lotesEnZonaInundable: lotesEnZonaRiesgo,
                    porcentajeLotesEnRiesgo: Number(pctLotesEnRiesgo.toFixed(2)),
                    diagnostico: lotesEnZonaRiesgo > 0
                        ? `CRÍTICO: ${lotesEnZonaRiesgo} lote(s) ubicados en área inundable o de riesgo severo (Ley 3966/10 Art. 238).`
                        : 'SEGURO: Sin afectaciones detectadas en cota de inundabilidad periódica.'
                },
                transitoYMovilidad: {
                    kmRedVialAnalizada: Number(kmViasTotal.toFixed(3)),
                    porcentajeViasConformesPerfil: Number(pctViasConformes.toFixed(2)),
                    kmInfraestructuraCicloviaria: Number(kmBicisendas.toFixed(3)),
                    diagnostico: pctViasConformes >= 95
                        ? 'CONFORME: Trazado vial respeta perfiles mínimos reglamentarios (12m secundarias / 24m colectoras).'
                        : 'OBSERVADO: Tramos viales con servidumbre insuficiente.'
                },
                recaudacionesYHacienda: {
                    metrosLinealesFrenteTotales: Number(metrosLinealesFrenteTotal.toFixed(2)),
                    potencialContribucionMejorasGs: estimacionContribucionMejorasGs,
                    diagnostico: `Potencial de amortización municipal de ₲ ${estimacionContribucionMejorasGs.toLocaleString('es-PY')} en concepto de obras de pavimentación/mejoras (Ley 5513/15).`
                }
            }
        };
    }

    /**
     * Genera reporte completo municipal para el expediente
     * @returns {Object} Reporte consolidado
     */
    generarReporteMunicipal() {
        const geojson = State.get('geojson');
        if (!geojson?.features?.length) {
            return { valido: false, mensaje: 'No hay geometrías cargadas' };
        }

        const reporte = {
            timestamp: new Date().toISOString(),
            normativa: 'Ley Orgánica Municipal Nº 3966/2010',
            lotesEvaluados: 0,
            lotesConErrores: 0,
            lotesConAlertas: 0,
            erroresPorLote: [],
            alertasPorLote: [],
            balanceLoteamiento: null,
            contribucionMejoras: null,
            bloqueosHomologacion: [],
            resumen: ''
        };

        const featuresLotes = geojson.features.filter(f => {
            const tipo = (f.properties?.USO_SUELO || '').toUpperCase();
            return tipo !== 'CALLE' && tipo !== 'VIA' && tipo !== 'PLAZA' && tipo !== 'ESPACIO_VERDE';
        });

        const featuresVias = geojson.features.filter(f => {
            const tipo = (f.properties?.USO_SUELO || f.properties?.DESTINO || '').toUpperCase();
            return tipo === 'CALLE' || tipo === 'VIA' || tipo === 'AVENIDA' || tipo === 'COLECTORA';
        });

        // Calcular área total matriz
        const areaTotalMatriz = geojson.features.reduce((sum, f) => {
            let area = parseFloat(f.properties?.AREA_M2 || f.properties?.SUP_SIG_M2 || f.properties?.SUPERFICIE || 0);
            if (!area || isNaN(area) || area <= 0) {
                try {
                    const m = calcularMetricasPlanasUTM(f, State.get('currentDisplayProjection') || 'EPSG:32721');
                    area = m.areaM2 || 0;
                } catch { area = 0; }
            }
            return sum + area;
        }, 0);

        // Validar cada lote individual
        featuresLotes.forEach(feature => {
            const metricas = calcularMetricasPlanasUTM(feature, State.get('currentDisplayProjection') || 'EPSG:32721');
            const frenteEstimado = this.estimarFrente(feature);
            metricas.frenteEstimadoM = frenteEstimado;

            const erroresLote = this.validarLoteUrbano(feature, metricas);
            const alertasLote = this.validarRetiros(feature);
            const alertasOchava = this.validarOchavas(feature);

            if (erroresLote.length > 0) {
                reporte.lotesConErrores++;
                reporte.erroresPorLote.push(...erroresLote);
            }
            if (alertasLote.length > 0) {
                reporte.lotesConAlertas++;
                reporte.alertasPorLote.push(...alertasLote);
            }
            if (alertasOchava.length > 0) {
                reporte.lotesConAlertas++;
                reporte.alertasPorLote.push(...alertasOchava);
            }
            reporte.lotesEvaluados++;
        });

        // Validar perfiles viales
        featuresVias.forEach(via => {
            const erroresViales = this.validarPerfilVial(via);
            if (erroresViales.length > 0) {
                reporte.alertasPorLote.push(...erroresViales);
            }
        });

        // Validar homologación de Junta si hay metadatos
        const metadata = State.get('expedienteMetadata') || {};
        reporte.bloqueosHomologacion = this.validarHomologacionMunicipal(metadata);
        if (reporte.bloqueosHomologacion.length > 0) {
            reporte.alertasPorLote.push(...reporte.bloqueosHomologacion);
        }

        // Contribución por mejoras
        reporte.contribucionMejoras = this.calcularContribucionMejoras(featuresLotes);

        // Indicadores VEP Ciudades Sustentables (MEF)
        reporte.indicadoresVEP = this.evaluarIndicadoresSustentablesVEP(geojson);

        // Validar balance de fraccionamiento
        const balance = this.validarBalanceLoteamiento(geojson.features, areaTotalMatriz);
        reporte.balanceLoteamiento = balance;

        if (!balance.valido) {
            reporte.alertasPorLote.push(...balance.alertas);
        }

        // Resumen ejecutivo
        const totalProblemas = reporte.erroresPorLote.length + reporte.alertasPorLote.filter(a => a.estado === 'error').length;
        reporte.resumen = totalProblemas === 0
            ? '✅ Expediente CUMPLE parámetros municipales básicos (Ley 3966/10).'
            : `⚠️ Expediente con ${totalProblemas} incumplimiento(s) municipal(es). Revisar detalle.`;

        return reporte;
    }
}

/**
 * Función helper para integrar en validator.js
 */
export async function runMunicipalValidation() {
    const validador = new ValidadorMunicipal();
    return validador.generarReporteMunicipal();
}

// Instancia por defecto para uso directo
export const validadorMunicipalDefault = new ValidadorMunicipal();
