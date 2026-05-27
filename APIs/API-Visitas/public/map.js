/**
 * Mapa Leaflet con marcadores de visitas por ciudad
 */
let map;
let markersLayer;

function initMap() {
  map = L.map('map', {
    center: [20, 0],
    zoom: 2,
    minZoom: 2,
    maxZoom: 12,
    worldCopyJump: true
  });

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://openstreetmap.org">OSM</a>',
    maxZoom: 18
  }).addTo(map);

  markersLayer = L.layerGroup().addTo(map);
}

function loadLocations(project) {
  if (!map) initMap();

  markersLayer.clearLayers();
  document.getElementById('map').classList.remove('loading');
  document.getElementById('map').innerHTML = '';

  fetch(`/api/stats/locations?project=${encodeURIComponent(project)}`)
    .then(r => r.json())
    .then(data => {
      if (!data.cities || data.cities.length === 0) {
        document.getElementById('map').innerHTML = `
          <div style="display:flex;align-items:center;justify-content:center;height:100%;color:#94a3b8;">
            Sin datos de ubicación aún
          </div>`;
        return;
      }

      // Si el mapa no está inicializado, iniciarlo
      if (!map) {
        initMap();
      } else {
        // Si el div del mapa se reemplazó, reinicializar
        const mapContainer = document.getElementById('map');
        if (!mapContainer._leaflet_id) {
          initMap();
        }
      }

      const bounds = [];
      data.cities.forEach(city => {
        if (!city.lat || !city.lon) return;
        const lat = parseFloat(city.lat);
        const lon = parseFloat(city.lon);
        if (isNaN(lat) || isNaN(lon)) return;

        const size = Math.min(30, Math.max(8, Math.sqrt(city.count) * 3));
        const color = city.count > 10 ? '#ef4444' : city.count > 5 ? '#f59e0b' : '#38bdf8';

        const marker = L.circleMarker([lat, lon], {
          radius: size,
          fillColor: color,
          color: '#fff',
          weight: 1,
          opacity: 0.8,
          fillOpacity: 0.6
        });

        marker.bindTooltip(`
          <strong>${city.city}, ${city.country}</strong><br>
          ${city.count} visita${city.count !== 1 ? 's' : ''}
        `, { direction: 'top' });

        marker.bindPopup(`
          <strong>${city.city}</strong><br>
          ${city.region ? city.region + ', ' : ''}${city.country}<br>
          <b>${city.count}</b> visita${city.count !== 1 ? 's' : ''}
        `);

        markersLayer.addLayer(marker);
        bounds.push([lat, lon]);
      });

      // Ajustar vista si hay marcadores
      if (bounds.length > 0) {
        const group = L.featureGroup(bounds.map(b => L.marker(b)));
        map.fitBounds(group.getBounds().pad(0.1));
        if (map.getZoom() > 8) map.setZoom(8);
      }
    })
    .catch(err => {
      console.error('Error loading locations:', err);
      document.getElementById('map').innerHTML = `
        <div style="display:flex;align-items:center;justify-content:center;height:100%;color:#ef4444;">
          Error al cargar ubicaciones
        </div>`;
    });
}
