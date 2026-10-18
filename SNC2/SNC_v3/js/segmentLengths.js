export function formatMeters(value, decimals = 2) {
    if (!Number.isFinite(Number(value))) return 'N/A';
    return new Intl.NumberFormat('es-PY', { minimumFractionDigits: decimals, maximumFractionDigits: decimals, useGrouping: true }).format(Number(value));
}

export function calculateRingSegments(ring, project = coordinate => coordinate) {
    if (!Array.isArray(ring) || ring.length < 2) return [];
    const vertices = ring.length > 2 && ring[0][0] === ring.at(-1)[0] && ring[0][1] === ring.at(-1)[1] ? ring.slice(0, -1) : ring;
    if (vertices.length < 2) return [];
    return vertices.map((start, index) => {
        const endIndex = (index + 1) % vertices.length;
        const end = vertices[endIndex];
        const [x1, y1] = project(start);
        const [x2, y2] = project(end);
        return { index, startVertex: index + 1, endVertex: endIndex + 1, start, end,
            midpoint: [(start[0] + end[0]) / 2, (start[1] + end[1]) / 2], lengthMeters: Math.hypot(x2 - x1, y2 - y1) };
    });
}
