/**
 * Validador Municipal - Ley Orgánica Municipal Nº 3966/2010
 * Control de parámetros urbanos, fraccionamientos y restricciones ambientales municipales
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
            const area = parseFloat(f.properties?.AREA_M2 || f.properties?.SUP_SIG_M2 || f.properties?.SUPERFICIE || 0);

            if (tipo === 'CALLE' || tipo === 'VIA' || tipo === 'CALLES') {
                areaCallesCedidas += area;
            } else if (tipo === 'PLAZA' || tipo === 'ESPACIO_VERDE' || tipo === 'VERDE' || tipo === 'EDIFICIO_PUBLICO' || tipo === 'PUBLICO') {
                areaEspaciosVerdes += area;
            } else if (tipo === 'LOTE' || tipo === 'URBANO' || tipo === 'RESIDENCIAL' || tipo === 'COMERCIAL' || !tipo) {
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
     * Estima el frente de un polígono (longitud del lado más largo orientado al acceso vial)
     * @param {Object} feature - Feature GeoJSON
     * @returns {number} Frente estimado en metros
     */
    estimarFrente(feature) {
        try {
            const geom = feature.geometry;
            if (!geom || !['Polygon', 'MultiPolygon'].includes(geom.type)) return 0;

            const polygons = geom.type === 'MultiPolygon' ? geom.coordinates : [geom.coordinates];
            let maxFrente = 0;

            polygons.forEach(polygon => {
                const ring = polygon[0]; // Anillo exterior
                for (let i = 0; i < ring.length - 1; i++) {
                    const [x1, y1] = ring[i];
                    const [x2, y2] = ring[i + 1];
                    const dist = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
                    if (dist > maxFrente) maxFrente = dist;
                }
            });

            return maxFrente;
        } catch (e) {
            console.warn('Error estimando frente:', e);
            return 0;
        }
    }

    /**
     * Valida retiros mínimos (fondo y laterales) - requiere contexto de linderos
     * @param {Object} feature - Feature GeoJSON
     * @returns {Array} Array de alertas
     */
    validarRetiros(feature) {
        const alertas = [];
        const codigo = feature.properties?.CODIGO || feature.properties?.PADRON || 'SIN_CODIGO';
        
        // Nota: Validación real requiere geometría de linderos/edificaciones
        // Aquí solo se documenta el requerimiento
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
            resumen: ''
        };

        const featuresLotes = geojson.features.filter(f => {
            const tipo = (f.properties?.USO_SUELO || '').toUpperCase();
            return tipo !== 'CALLE' && tipo !== 'VIA' && tipo !== 'PLAZA' && tipo !== 'ESPACIO_VERDE';
        });

        // Calcular área total matriz (bounding box o suma de lotes + calles + plazas)
        const areaTotalMatriz = featuresLotes.reduce((sum, f) => {
            const area = parseFloat(f.properties?.AREA_M2 || f.properties?.SUP_SIG_M2 || 0);
            return sum + area;
        }, 0);

        // Validar cada lote individual
        featuresLotes.forEach(feature => {
            const metricas = calcularMetricasPlanasUTM(feature, State.get('currentDisplayProjection') || 'EPSG:32721');
            const frenteEstimado = this.estimarFrente(feature);
            metricas.frenteEstimadoM = frenteEstimado;

            const erroresLote = this.validarLoteUrbano(feature, metricas);
            const alertasLote = this.validarRetiros(feature);

            if (erroresLote.length > 0) {
                reporte.lotesConErrores++;
                reporte.erroresPorLote.push(...erroresLote);
            }
            if (alertasLote.length > 0) {
                reporte.lotesConAlertas++;
                reporte.alertasPorLote.push(...alertasLote);
            }
            reporte.lotesEvaluados++;
        });

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