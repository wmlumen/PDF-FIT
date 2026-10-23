/**
 * reportModule.js
 * -----------------------------------------------------------
 * Lógica del módulo de reportes y certificados.
 * Genera documentos, sellos digitales y validación de firmas.
 * -----------------------------------------------------------
 */

(function () {
  'use strict';

  const state = {
    reportes: [],
    tipoDoc: 'certificado',
    parcelaCode: '',
    fecha: '',
    autor: '',
    resumen: ''
  };

  const $ = (s) => document.querySelector(s);
  const $$ = (s) => document.querySelectorAll(s);

  // ---------- Utilidades ----------
  function notificar(titulo, msg, tipo = 'info') {
    const toast = document.createElement('div');
    toast.style.cssText =
      'position:fixed;bottom:20px;left:50%;transform:translateX(-50%);background:#333;color:#fff;padding:10px 18px;border-radius:6px;font-weight:600;font-size:0.85rem;z-index:9999;opacity:0;transition:opacity 0.4s;';
    if (tipo === 'success') toast.style.background = '#2e7d32';
    else if (tipo === 'warning') toast.style.background = '#e65100';
    else if (tipo === 'error') toast.style.background = '#c62828';
    toast.textContent = `${titulo} — ${msg}`;
    document.body.appendChild(toast);
    toast.style.opacity = '1';
    setTimeout(() => { toast.style.opacity = '0'; setTimeout(() => toast.remove(), 4000); }, 4000);
  }

  // ---------- Cargar reporte guardado ----------
  function cargarReporte(id) {
    const r = state.reportes.find(r => r.id === id);
    if (!r) return;
    $('#reporteParcel').value = r.parcelaCode || '';
    $('#reporteFecha').value = r.fecha || '';
    $('#reporteAutor').value = r.autor || '';
    $('#reporteResumen').value = r.resumen || '';
    notificar('Cargado', `Reporte ${r.id} cargado.`, 'success');
  }

  // ---------- Guardar reporte ----------
  function guardarReporte() {
    const tipo = $('#tipoDoc').value;
    const parcela = $('#reporteParcel').value.trim();
    const fecha = $('#reporteFecha').value;
    const autor = $('#reporteAutor').value.trim();
    const resumen = $('#reporteResumen').value.trim();

    if (!parcela) {
      notificar('Error', 'Ingresa el código de la parcela.', 'error');
      return;
    }
    if (!fecha) {
      notificar('Error', 'Ingresa la fecha.', 'error');
      return;
    }

    const reporte = {
      id: 'rep_' + Date.now(),
      tipo,
      parcelaCode: parcela,
      fecha,
      autor,
      resumen,
      firmado: false,
      fechaRegistro: new Date().toISOString()
    };

    state.reportes.unshift(reporte);
    notificar('Guardado', `Reporte ${reporte.id} guardado.`, 'success');
    $('#reporteParcel').value = '';
    $('#reporteFecha').value = '';
    $('#reporteAutor').value = '';
    $('#reporteResumen').value = '';
    listarReportes();
  }

  // ---------- Listar reportes ----------
  function listarReportes() {
    const container = document.getElementById('reporteList');
    if (!state.reportes.length) {
      container.innerHTML = '<p class="muted">No hay reportes guardados.</p>';
      return;
    }
    container.innerHTML = '';
    state.reportes.forEach(r => {
      const div = document.createElement('div');
      div.className = 'historial-item';
      div.innerHTML = `
        <div class="id">${r.tipo}: ${r.parcelaCode}</div>
        <div class="meta">${r.fecha} · ${r.autor} · ${r.firmado ? '🔏 Firmado' : 'Sin firmar'}</div>
        <div class="meta" style="font-size:0.75rem;color:#6b7280;">${r.fechaRegistro}</div>
        <div style="display:flex;gap:0.4rem;flex-wrap:wrap;">
          <button class="btn btn--secondary btn-sm" onclick="ReportModule.cargarReporte('${r.id}')">📄 Ver</button>
          <button class="btn btn--secondary btn-sm" onclick="ReportModule.downloadReporte('${r.id}')">📄 Descargar</button>
        </div>
      `;
      container.appendChild(div);
    });
  }

  // ---------- Descargar reporte ----------
  function downloadReporte(id) {
    const r = state.reportes.find(x => x.id === id);
    if (!r) return;
    // Simulación de descarga de PDF
    const texto = `REPORTE: ${r.tipo} · Parcela: ${r.parcelaCode} · Fecha: ${r.fecha} · Autor: ${r.autor} · Resumen: ${r.resumen}`;
    const blob = new Blob([texto], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `reporte_${r.parcelaCode}_${r.fecha}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // ---------- Firmas y sellos ----------
  function generarSello() {
    const id = $('#reporteParcel').value;
    if (!id) {
      notificar('Error', 'Ingresa el código de la parcela.', 'error');
      return;
    }
    // Sello digital simulado (en producción, integrar con firma electrónica / PKI)
    const fecha = new Date().toISOString().split('T')[0];
    const codigo = 'SIG-' + Date.now().toString(36).toUpperCase();
    notificar('Sello', `Sello aplicado: ${codigo}`, 'success');
    // Actualizan los campos de la vista
    $('#firmCertificado').textContent = 'Sello aplicado';
    $('#firmCodigo').textContent = codigo;
    $('#firmFecha').textContent = fecha;
  }

  function verificarSello() {
    const codigo = prompt('Ingresa el código de verificación del sello:', '');
    if (!codigo) return;
    notificar('Verificación', `Código recibido: ${codigo} (simulado). Resuelto.`, 'success');
  }

  // ---------- Inicialización ----------
  function init() {
    // Pestañas
    $$('.tab').forEach(tab => {
      tab.addEventListener('click', () => {
        $$('.tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        $$('.tab-panel').forEach(p => p.classList.remove('active'));
        const t = tab.dataset.tab;
        const panel = document.getElementById('tab-' + t);
        if (panel) panel.classList.add('active');
      });
    });

    // Botón nuevo reporte
    $('#btnNuevo').addEventListener('click', () => {
      $('#tipoDoc').value = 'certificado';
      $('#reporteParcel').value = '';
      $('#reporteFecha').value = new Date().toISOString().split('T')[0];
      $('#reporteAutor').value = '';
      $('#reporteResumen').value = '';
    });

    // Guardar reporte
    const btnGuardar = document.createElement('button');
    btnGuardar.className = 'btn btn--primary';
    btnGuardar.textContent = '💾 Guardar reporte';
    $('#tab-nuevo').firstElementChild.appendChild(btnGuardar);
    btnGuardar.addEventListener('click', guardarReporte);

    // Listar reportes
    listarReportes();

    // Firmas
    $('#btnGenerarSello').addEventListener('click', generarSello);
    $('#btnVerificarSello').addEventListener('click', verificarSello);
  }

  // Exponer al window
  window.ReportModule = {
    init,
    guardarReporte,
    cargarReporte,
    downloadReporte,
    generarSello,
    verificarSello,
    state
  };
})();
