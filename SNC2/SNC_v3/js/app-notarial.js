/**
 * app-notarial.js — Orquestador del Portal Notarial y Escribanías (Notarial PY Pro)
 * Código de Organización Judicial · Ley 7.424/2025 (RUN) · Res. SNC 551/2023 · Ley 3966/2010
 */

import { EscribaniaModule } from './escribania.js';
import { UrbanismoModule } from './urbanismo.js';
import { showToast } from './utils.js';

let mapInstance = null;
let currentParcelLayer = null;
let activeParcelFeature = null;

export const AppNotarial = {
  init() {
    this.initMap();
    this.initEvents();
    console.log('✅ Portal Notarial inicializado correctamente.');
  },

  initMap() {
    const mapEl = document.getElementById('notary-map');
    if (!mapEl || typeof L === 'undefined') return;

    window.AppNotarial = this;

    // Centro inicial: Pilar / Ref Nacional (https://www.openstreetmap.org/#map=16/-26.85790/-58.30369&layers=S)
    mapInstance = L.map('notary-map', {
      center: [-26.85790, -58.30369],
      zoom: 16,
      zoomControl: true
    });

    this.baseLayers = {
      osm: L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors · SNC Notarial',
        maxZoom: 19
      }),
      satellite: L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        attribution: '© ESRI World Imagery',
        maxNativeZoom: 18,
        maxZoom: 19
      }),
      humanitarian: L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
        attribution: '© Humanitarian OSM',
        maxZoom: 19
      }),
      catastro: L.tileLayer.wms('https://www.catastro.gov.py/geoserver/ows', {
        layers: 'snc:parcelas_activas',
        format: 'image/png8',
        transparent: true,
        CRS: 'CRS:84',
        attribution: '© SNC Catastro Oficial'
      }),
      carto_dark: L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '© OpenStreetMap, © CARTO',
        maxZoom: 19
      }),
      topo: L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenTopoMap (CC-BY-SA)',
        maxZoom: 17
      })
    };

    this.baseLayers.osm.addTo(mapInstance);

    if (typeof window.BasemapMenu?.init === 'function') {
      window.BasemapMenu.init();
    }
  },

  setBaseLayer(name) {
    if (!this.baseLayers || !mapInstance || !this.baseLayers[name]) return false;
    Object.values(this.baseLayers).forEach(l => mapInstance.removeLayer(l));
    this.baseLayers[name].addTo(mapInstance);
    return true;
  },

  initEvents() {
    // Calculadora de gastos
    const calcBtn = document.getElementById('btn-notary-calc');
    if (calcBtn) {
      calcBtn.addEventListener('click', () => this.calcularLiquidacion());
    }

    // Botón copiar minuta
    const copyBtn = document.getElementById('btn-copy-minuta');
    if (copyBtn) {
      copyBtn.addEventListener('click', () => this.copiarMinuta());
    }

    // Botón auditar Due Diligence
    const auditBtn = document.getElementById('btn-run-audit');
    if (auditBtn) {
      auditBtn.addEventListener('click', () => this.ejecutarDueDiligence());
    }
  },

  cargarParcela(feature) {
    activeParcelFeature = feature;
    const props = feature.properties || {};

    // Actualizar campos del formulario
    const padronInput = document.getElementById('inp-padron');
    if (padronInput) padronInput.value = props.PADRON || '';

    const cccInput = document.getElementById('inp-ccc');
    if (cccInput) cccInput.value = props.CCC || '';

    const fincaInput = document.getElementById('inp-finca');
    if (fincaInput) fincaInput.value = props.FINCA_MATRICULA || '';

    const distritoInput = document.getElementById('inp-distrito');
    if (distritoInput) distritoInput.value = props.DISTRITO || '';

    const supInput = document.getElementById('inp-superficie');
    if (supInput) supInput.value = props.SUPERFICIE_M2 || '';

    const vfInput = document.getElementById('inp-val-fiscal');
    if (vfInput) vfInput.value = props.VALOR_FISCAL_GS || '';

    const vvInput = document.getElementById('inp-val-venta');
    if (vvInput) vvInput.value = props.VALOR_VENTA_GS || '';

    // Dibujar en mapa
    if (mapInstance && feature.geometry) {
      if (currentParcelLayer) {
        mapInstance.removeLayer(currentParcelLayer);
      }
      currentParcelLayer = L.geoJSON(feature, {
        style: {
          color: '#d97706', // Ámbar dorado notarial
          weight: 3,
          fillColor: '#f59e0b',
          fillOpacity: 0.25
        }
      }).addTo(mapInstance);

      mapInstance.fitBounds(currentParcelLayer.getBounds(), { padding: [40, 40] });
    }

    // Ejecutar cálculos y minuta automáticamente
    this.calcularLiquidacion();
    this.generarMinuta();
    this.ejecutarDueDiligence();
  },

  calcularLiquidacion() {
    const vf = parseFloat(document.getElementById('inp-val-fiscal')?.value || 0);
    const vv = parseFloat(document.getElementById('inp-val-venta')?.value || 0);

    if (!vf || vf <= 0) {
      showToast('Ingrese un valor fiscal válido para liquidar', 'warning');
      return;
    }

    const liq = EscribaniaModule.liquidarGastosTransferencia({
      valorFiscalGs: vf,
      valorVentaGs: vv
    });

    const setTxt = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.textContent = 'Gs. ' + val.toLocaleString('es-PY');
    };

    setTxt('out-base-imponible', liq.precioReferencia);
    setTxt('out-tasa-dgrp', liq.desglose.tasaJudicialDGRP);
    setTxt('out-imp-muni', liq.desglose.impuestoTransferenciaMuni);
    setTxt('out-honorarios', liq.desglose.honorariosNotariales);
    setTxt('out-iva-hon', liq.desglose.ivaHonorarios);
    setTxt('out-irp', liq.desglose.retencionIRP);
    setTxt('out-total-gastos', liq.totalGastosTransferencia);

    const pctEl = document.getElementById('out-pct-gastos');
    if (pctEl) pctEl.textContent = `(~${liq.porcentajeAproximadoTotal}% del valor)`;

    showToast('Liquidación de gastos e impuestos calculada', 'info');
  },

  generarMinuta() {
    if (!activeParcelFeature) return;
    const finca = document.getElementById('inp-finca')?.value || '';
    const minuta = EscribaniaModule.generarMinutaNotarial(activeParcelFeature, {
      fincaMatricula: finca
    });

    const txtArea = document.getElementById('out-minuta-text');
    if (txtArea) {
      txtArea.value = minuta.clausulaObjeto;
    }
  },

  copiarMinuta() {
    const txtArea = document.getElementById('out-minuta-text');
    if (!txtArea || !txtArea.value) {
      showToast('No hay minuta disponible para copiar', 'warning');
      return;
    }
    navigator.clipboard?.writeText(txtArea.value)
      .then(() => showToast('✅ Cláusula notarial copiada al portapapeles', 'success'))
      .catch(() => showToast('Error al copiar al portapapeles', 'error'));
  },

  ejecutarDueDiligence() {
    const estadoDGRP = document.getElementById('sel-dgrp-estado')?.value || 'LIBRE';
    const supTitulo = parseFloat(document.getElementById('inp-superficie')?.value || 0);
    const supPlano = parseFloat(document.getElementById('inp-superficie')?.value || 0);
    const muniAlDia = document.getElementById('chk-muni-dia')?.checked ?? true;
    const afectMades = document.getElementById('chk-mades-afect')?.checked ?? false;

    const audit = EscribaniaModule.auditarDueDiligenceNotarial({
      estadoDGRP,
      superficieTituloM2: supTitulo,
      superficiePlanoM2: supPlano,
      impuestoMunicipalAlDia: muniAlDia,
      afectacionAmbientalMades: afectMades
    });

    const badgeEl = document.getElementById('out-dd-badge');
    const dictamenEl = document.getElementById('out-dd-dictamen');
    const obsListEl = document.getElementById('out-dd-obs');

    if (badgeEl) {
      badgeEl.textContent = `Score: ${audit.score}/100`;
      badgeEl.className = 'px-3 py-1 rounded-full font-bold text-xs ' +
        (audit.semaforo === 'VERDE' ? 'bg-emerald-950 text-emerald-400 border border-emerald-700' :
         audit.semaforo === 'AMARILLO' ? 'bg-amber-950 text-amber-400 border border-amber-700' :
         'bg-red-950 text-red-400 border border-red-700');
    }

    if (dictamenEl) {
      dictamenEl.textContent = audit.dictamen.replace(/_/g, ' ');
    }

    if (obsListEl) {
      if (audit.observaciones.length === 0) {
        obsListEl.innerHTML = '<li class="text-emerald-400 flex items-center gap-1.5"><i class="fas fa-check-circle"></i> Inmueble libre de gravámenes, superficie coincidente y tributos al día. Apto para escriturar.</li>';
      } else {
        obsListEl.innerHTML = audit.observaciones.map(o => `
          <li class="flex items-start gap-1.5 ${o.nivel === 'BLOQUEANTE' ? 'text-red-400' : 'text-amber-400'}">
            <i class="fas fa-triangle-exclamation mt-0.5"></i>
            <span><strong>[${o.origen}]</strong> ${o.mensaje}</span>
          </li>
        `).join('');
      }
    }
  }
};

window.AppNotarial = AppNotarial;

document.addEventListener('DOMContentLoaded', () => {
  AppNotarial.init();
});

export default AppNotarial;
