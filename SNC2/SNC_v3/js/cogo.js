const toRadians = degrees => Number(degrees) * Math.PI / 180;
const toDegrees = radians => Number(radians) * 180 / Math.PI;
export const normalizeAzimuth = degrees => ((Number(degrees) % 360) + 360) % 360;

export function parseBearing(value) {
    if (Number.isFinite(Number(value))) return normalizeAzimuth(value);
    const match = String(value || '').trim().toUpperCase().match(/^([NS])\s*(\d+(?:\.\d+)?)\s*([EW])$/);
    if (!match) throw new Error(`Rumbo inválido: ${value}`);
    const angle = Number(match[2]);
    if (angle < 0 || angle > 90) throw new Error(`Rumbo fuera de rango: ${value}`);
    if (match[1] === 'N' && match[3] === 'E') return angle;
    if (match[1] === 'S' && match[3] === 'E') return 180 - angle;
    if (match[1] === 'S' && match[3] === 'W') return 180 + angle;
    return 360 - angle;
}

export function parseCogoCourses(text) {
    return String(text || '').split(/\r?\n/).map(line => line.trim()).filter(Boolean).map((line, index) => {
        const parts = line.split(/[;,\t]/).map(value => value.trim());
        const type = parts[0].toUpperCase();
        if (type === 'LINEA' || type === 'LINE') {
            return { type: 'line', azimuth: parseBearing(parts[1]), distance: Number(parts[2]) };
        }
        if (type === 'PUNTO' || type === 'POINT') {
            return { type: 'point', easting: Number(parts[1]), northing: Number(parts[2]) };
        }
        if (type === 'ARCO' || type === 'ARC') {
            return { type: 'arc', azimuth: parseBearing(parts[1]), radius: Number(parts[2]), angle: Number(parts[3]), direction: String(parts[4] || 'D').toUpperCase().startsWith('I') ? 'left' : 'right' };
        }
        throw new Error(`Tipo COGO desconocido en línea ${index + 1}: ${parts[0]}`);
    });
}

function validateCourse(course, index) {
    if (course.type === 'line' && (!Number.isFinite(course.azimuth) || !Number.isFinite(course.distance) || course.distance <= 0)) throw new Error(`Línea ${index + 1}: azimut o distancia inválidos`);
    if (course.type === 'point' && (!Number.isFinite(course.easting) || !Number.isFinite(course.northing))) throw new Error(`Punto ${index + 1}: coordenadas inválidas`);
    if (course.type === 'arc' && (!Number.isFinite(course.azimuth) || !Number.isFinite(course.radius) || course.radius <= 0 || !Number.isFinite(course.angle) || course.angle <= 0 || course.angle >= 360)) throw new Error(`Arco ${index + 1}: parámetros inválidos`);
}

export function buildCogoRing(start, courses, { arcStepDegrees = 5 } = {}) {
    const origin = [Number(start?.[0]), Number(start?.[1])];
    if (!origin.every(Number.isFinite)) throw new Error('Punto inicial UTM inválido');
    const coordinates = [[...origin]];
    const report = [];
    let current = [...origin];
    courses.forEach((course, index) => {
        validateCourse(course, index);
        const from = [...current];
        if (course.type === 'line') {
            const azimuth = toRadians(course.azimuth);
            current = [current[0] + Math.sin(azimuth) * course.distance, current[1] + Math.cos(azimuth) * course.distance];
            coordinates.push(current);
            report.push({ index: index + 1, type: 'line', from, to: [...current], declaredDistance: course.distance, geometricDistance: Math.hypot(current[0] - from[0], current[1] - from[1]), azimuth: normalizeAzimuth(course.azimuth) });
        } else if (course.type === 'point') {
            current = [course.easting, course.northing];
            coordinates.push(current);
            report.push({ index: index + 1, type: 'point', from, to: [...current], geometricDistance: Math.hypot(current[0] - from[0], current[1] - from[1]), azimuth: normalizeAzimuth(toDegrees(Math.atan2(current[0] - from[0], current[1] - from[1]))) });
        } else {
            const right = course.direction !== 'left';
            const normalAzimuth = toRadians(normalizeAzimuth(course.azimuth + (right ? 90 : -90)));
            const center = [current[0] + Math.sin(normalAzimuth) * course.radius, current[1] + Math.cos(normalAzimuth) * course.radius];
            const startAngle = Math.atan2(current[1] - center[1], current[0] - center[0]);
            const signedAngle = toRadians(course.angle) * (right ? -1 : 1);
            const steps = Math.max(2, Math.ceil(course.angle / arcStepDegrees));
            for (let step = 1; step <= steps; step++) {
                const angle = startAngle + signedAngle * step / steps;
                current = [center[0] + Math.cos(angle) * course.radius, center[1] + Math.sin(angle) * course.radius];
                coordinates.push(current);
            }
            report.push({ index: index + 1, type: 'arc', from, to: [...current], radius: course.radius, angle: course.angle, direction: course.direction, arcLength: course.radius * Math.abs(signedAngle) });
        }
    });
    const last = coordinates[coordinates.length - 1];
    const closureDistance = Math.hypot(last[0] - origin[0], last[1] - origin[1]);
    if (closureDistance > 1e-9) coordinates.push([...origin]);
    return { coordinates, report, closureDistance, closureRatio: closureDistance > 0 ? coordinates.slice(1).reduce((sum, point, i) => sum + Math.hypot(point[0] - coordinates[i][0], point[1] - coordinates[i][1]), 0) / closureDistance : Infinity };
}
