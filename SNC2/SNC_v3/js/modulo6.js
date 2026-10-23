/**
 * modulo6.js — Módulo 6: Topometría y Compensación de Cierre Bowditch (R19 / Res. SNC 551/2023)
 * 
 * Funcionalidades:
 * 1. Cálculo de error lineal y angular de cierre de poligonales catastrales.
 * 2. Compensación geométrica por el método de Bowditch (Regla de la Brújula / Compass Rule).
 * 3. Cálculo de precisión relativa de cierre (1:N).
 * 4. Preparación de exportación de geometrías compensadas conformes para el Módulo 1 y DGRP.
 */

export class BowditchCompensator {
  /**
   * Calcula la distancia euclidiana entre dos puntos en metros (UTM).
   */
  static distance(p1, p2) {
    const dx = p2[0] - p1[0];
    const dy = p2[1] - p1[1];
    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * Evalúa el error de cierre y aplica la compensación de Bowditch sobre una poligonal.
   * 
   * @param {Array<Array<number>>} coordinates - Lista de vértices [x, y]
   * @param {number} toleranciaLinealM - Tolerancia de cierre admisible en metros (ej. 0.05m urbano, 0.20m rural)
   * @returns {Object} Poligonal compensada y métricas de precisión
   */
  static compensate(coordinates, toleranciaLinealM = 0.10) {
    if (!coordinates || coordinates.length < 3) {
      throw new Error('Se requieren al menos 3 vértices para evaluar y compensar una poligonal.');
    }

    const n = coordinates.length;
    const startPoint = coordinates[0];
    const endPoint = coordinates[n - 1];

    // Errores de cierre
    const ex = endPoint[0] - startPoint[0];
    const ey = endPoint[1] - startPoint[1];
    const linearError = Math.sqrt(ex * ex + ey * ey);

    // Longitudes de lados y perímetro acumulado
    const segmentLengths = [];
    let perimeter = 0;

    for (let i = 0; i < n - 1; i++) {
      const d = this.distance(coordinates[i], coordinates[i + 1]);
      segmentLengths.push(d);
      perimeter += d;
    }

    // Si el último punto no es idéntico al primero, sumar el segmento de cierre
    const isExplicitlyClosed = (linearError < 1e-5);
    if (!isExplicitlyClosed && perimeter > 0) {
      const closingSegment = this.distance(endPoint, startPoint);
      perimeter += closingSegment;
    }

    const relativePrecision = linearError > 0 && perimeter > 0
      ? Math.round(perimeter / linearError)
      : Infinity;

    const withinTolerance = linearError <= toleranciaLinealM;

    // Aplicar compensación de Bowditch:
    // corrección_x = -ex * (distancia_acumulada / perímetro)
    // corrección_y = -ey * (distancia_acumulada / perímetro)
    const compensatedCoords = [];
    let accumulatedDist = 0;

    for (let i = 0; i < n; i++) {
      if (i > 0) {
        accumulatedDist += segmentLengths[i - 1] || 0;
      }

      if (perimeter === 0 || isExplicitlyClosed) {
        compensatedCoords.push([coordinates[i][0], coordinates[i][1]]);
      } else {
        const corrX = -ex * (accumulatedDist / perimeter);
        const corrY = -ey * (accumulatedDist / perimeter);
        compensatedCoords.push([
          Number((coordinates[i][0] + corrX).toFixed(4)),
          Number((coordinates[i][1] + corrY).toFixed(4))
        ]);
      }
    }

    // Asegurar que el polígono cierre perfectamente en su primer vértice
    if (compensatedCoords.length > 2) {
      compensatedCoords[compensatedCoords.length - 1] = [
        compensatedCoords[0][0],
        compensatedCoords[0][1]
      ];
    }

    return {
      ex: Number(ex.toFixed(4)),
      ey: Number(ey.toFixed(4)),
      linearError: Number(linearError.toFixed(4)),
      perimeter: Number(perimeter.toFixed(2)),
      relativePrecision: relativePrecision === Infinity ? '1:Inf' : `1:${relativePrecision}`,
      withinTolerance,
      toleranciaLinealM,
      dictamen: withinTolerance ? 'CONFORME_BOWDITCH' : 'EXCEDE_TOLERANCIA_CIERRE',
      compensatedCoords
    };
  }
}

export default BowditchCompensator;
