/**
 * ASISTENCIA CENTURIA - Google Apps Script (SISTEMA UNIFICADO 9 HOJAS)
 * ====================================================================
 * Spreadsheet: https://docs.google.com/spreadsheets/d/1aMr1KYx7FQ4YYh0WgqzWQQ4FZnOytMwae8JWskG5cPQ/edit
 * 
 * ARQUITECTURA:
 * - 9 hojas estandarizadas: Asistencia, Catálogos, Planificaciones, ProgresoGrupos,
 *   Examenes, Examen_Detalle, Estudiantes, Docentes, Novedades
 * - setupCompleto() crea/limpia toda la estructura desde cero
 * - fixExamenesAhora() parsea hoja legacy ReExVir → Examenes + Examen_Detalle
 * - Modos GET: catalogos, asistencia, planificaciones, progreso_grupo, examenes,
 *   estudiantes, docentes, novedades
 * - Modos POST: guardar_asistencia, guardar_planificacion, guardar_progreso_grupo,
 *   guardar_examen, guardar_novedad
 * 
 * INSTRUCCIONES INICIALES:
 * 1. Pegar este código en el editor de Apps Script (vinculado al spreadsheet)
 * 2. Guardar (Ctrl+S)
 * 3. Ejecutar setupCompleto() — crea las 9 hojas con headers
 * 4. Si hay datos legacy en ReExVir, ejecutar fixExamenesAhora()
 * 5. Implementar → Nueva implementación → Web App
 * 6. Copiar URL en script.js como asistencia_api_url
 * ====================================================================
 */

// ============================================================
// CONFIGURACIÓN
// ============================================================
const SPREADSHEET_ID = '1aMr1KYx7FQ4YYh0WgqzWQQ4FZnOytMwae8JWskG5cPQ';
const API_SECRET = 'CenturiaApi2024!';

// Nombres de hojas del sistema unificado
const SH = {
  ASISTENCIA: 'Asistencia',
  CATALOGOS: 'Catálogos',
  PLANIFICACIONES: 'Planificaciones',
  PROGRESO_GRUPOS: 'ProgresoGrupos',
  EXAMENES: 'Examenes',
  EXAMEN_DETALLE: 'Examen_Detalle',
  ESTUDIANTES: 'Estudiantes',
  DOCENTES: 'Docentes',
  NOVEDADES: 'Novedades'
};

// Headers normalizados para cada hoja
const HEADERS = {
  ASISTENCIA: ['Fecha', 'Nombre', 'Cedula', 'Carrera', 'Seccion', 'Asignatura', 'Estado', 'Observacion', 'MarcaTemporal'],
  CATALOGOS: ['Tipo', 'Codigo', 'Nombre', 'Activo'],
  PLANIFICACIONES: ['Codigo', 'CedulaDocente', 'NombreDocente', 'CodAsignatura', 'CodSeccion', 'CodCarrera', 'FechaInicio', 'FechaCierre', 'Sala', 'Sede', 'Modalidad', 'Observaciones', 'MarcaTemporal'],
  PROGRESO_GRUPOS: ['Codigo', 'CedulaDocente', 'Seccion', 'Asignatura', 'Unidad', 'Tema', 'Fecha', 'Observaciones', 'MarcaTemporal'],
  EXAMENES: ['ExamId', 'MarcaTemporal', 'Nombre', 'Cedula', 'Puntaje', 'Total', 'Fecha', 'Hora', 'Intento'],
  EXAMEN_DETALLE: ['ExamId', 'Seccion', 'NumPregunta', 'Pregunta', 'Respuesta', 'Correcta', 'Acerto'],
  ESTUDIANTES: ['Cedula', 'Nombre', 'Carrera', 'Activo'],
  DOCENTES: ['Cedula', 'Nombre', 'Activo'],
  NOVEDADES: ['Id', 'Titulo', 'Contenido', 'Fecha', 'Autor', 'Activo']
};

// ============================================================
// FUNCIONES AUXILIARES
// ============================================================

function getSheet_(name) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    const h = HEADERS[name];
    if (h) sheet.appendRow(h);
  }
  return sheet;
}

function jsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function getMimeType_(fileName) {
  const ext = (fileName.split('.').pop() || '').toLowerCase();
  const mimeTypes = {
    'pdf': 'application/pdf',
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'gif': 'image/gif',
    'doc': 'application/msword',
    'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  };
  return mimeTypes[ext] || 'application/octet-stream';
}

function sheetToObjects_(sheet) {
  const values = sheet.getDataRange().getValues();
  if (values.length <= 1) return [];
  const headers = values[0];
  return values.slice(1).map(row =>
    headers.reduce((acc, h, i) => { acc[h] = row[i]; return acc; }, {})
  );
}

function marcaTemporal_() {
  return Utilities.formatDate(new Date(), 'America/Asuncion', 'dd/MM/yyyy HH:mm:ss');
}

function validarApiKey_(key) {
  return (key || '').trim() === API_SECRET;
}

// ============================================================
// SETUP COMPLETO — Crea/limpia las 9 hojas desde cero
// Ejecutar manualmente una sola vez desde el editor
// ============================================================

function setupCompleto() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  
  // 1. Crear o limpiar cada hoja
  const hojas = Object.keys(SH);
  hojas.forEach(nombre => {
    let sheet = ss.getSheetByName(nombre);
    if (sheet) {
      // Limpiar completamente
      sheet.clear();
    } else {
      sheet = ss.insertSheet(nombre);
    }
    // Escribir headers
    const h = HEADERS[nombre];
    if (h) sheet.appendRow(h);
    Logger.log('Hoja lista: ' + nombre);
  });

  // 2. Poblar Catálogos desde datos reales de hojas legacy (si existen)
  poblarCatalogosDesdeLegacy_(ss);

  Logger.log('✅ setupCompleto() terminado. 9 hojas listas.');
}

function poblarCatalogosDesdeLegacy_(ss) {
  const catSheet = ss.getSheetByName(SH.CATALOGOS);
  if (!catSheet) return;
  
  // Buscar hojas legacy con datos
  const legacySheets = ['ReExVir', 'Registro'];
  const carreras = new Set();
  const secciones = new Set();
  const asignaturas = new Set();
  const estudiantes = new Map(); // cedula -> {nombre, carrera}
  const docentes = new Map();   // cedula -> nombre

  legacySheets.forEach(name => {
    const sh = ss.getSheetByName(name);
    if (!sh) return;
    const data = sh.getDataRange().getValues();
    if (data.length <= 1) return;
    const headers = data[0].map(h => String(h).trim().toLowerCase().replace(/\s+/g, '_'));
    data.slice(1).forEach(row => {
      const obj = {};
      headers.forEach((h, i) => obj[h] = row[i]);
      const c = String(obj.cedula || obj.cedula_docente || '').replace(/[.\s-]/g, '').trim();
      const n = String(obj.nombre || obj.nombre_y_apellido || obj.nombre_docente || '').trim();
      const ca = String(obj.carrera || '').trim();
      const s = String(obj.seccion || '').trim().toUpperCase();
      const a = String(obj.asignatura || obj.materia || obj.cod_asignatura || '').trim();
      if (ca) carreras.add(ca);
      if (s && s.length <= 10) secciones.add(s);
      if (a) asignaturas.add(a);
      if (c && n) {
        if (!estudiantes.has(c)) estudiantes.set(c, { nombre: n, carrera: ca || '' });
        if (!docentes.has(c)) docentes.set(c, n);
      }
    });
  });

  // Escribir catálogos
  const rows = [];
  carreras.forEach(v => rows.push(['Carrera', v, v, 'SI']));
  secciones.forEach(v => rows.push(['Seccion', v, v, 'SI']));
  asignaturas.forEach(v => rows.push(['Asignatura', v, v, 'SI']));
  if (rows.length) {
    catSheet.getRange(2, 1, rows.length, 4).setValues(rows);
    Logger.log(`Catálogos: ${carreras.size} carreras, ${secciones.size} secciones, ${asignaturas.size} asignaturas`);
  }

  // Poblar Estudiantes
  const estSheet = ss.getSheetByName(SH.ESTUDIANTES);
  if (estSheet && estudiantes.size) {
    const estRows = [];
    estudiantes.forEach((v, k) => estRows.push([k, v.nombre, v.carrera, 'SI']));
    estSheet.getRange(2, 1, estRows.length, 4).setValues(estRows);
    Logger.log(`Estudiantes: ${estudiantes.size} únicos`);
  }

  // Poblar Docentes
  const docSheet = ss.getSheetByName(SH.DOCENTES);
  if (docSheet && docentes.size) {
    const docRows = [];
    docentes.forEach((v, k) => docRows.push([k, v, 'SI']));
    docSheet.getRange(2, 1, docRows.length, 3).setValues(docRows);
    Logger.log(`Docentes: ${docentes.size} únicos`);
  }
}

// ============================================================
// FIX EXAMENES — Parsea hoja legacy ReExVir a Examenes + Examen_Detalle
// USO: Ejecutar manualmente desde el editor después de setupCompleto()
// Versión OPTIMIZADA: usa setValues batch en vez de appendRow individual
// ============================================================

function fixExamenesAhora() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const srcSheet = ss.getSheetByName('ReExVir');
  if (!srcSheet) {
    Logger.log('❌ No existe hoja ReExVir. Nada que parsear.');
    return;
  }
  
  const data = srcSheet.getDataRange().getValues();
  Logger.log('Filas en ReExVir: ' + data.length);
  if (data.length <= 1) {
    Logger.log('Solo headers, sin datos.');
    return;
  }

  const headers = data[0].map(h => String(h).trim().toLowerCase().replace(/\s+/g, '_'));
  const rows = data.slice(1).map(row => {
    const obj = {};
    headers.forEach((h, i) => obj[h] = row[i]);
    return obj;
  });
  
  const examenesSheet = ss.getSheetByName(SH.EXAMENES);
  const detalleSheet = ss.getSheetByName(SH.EXAMEN_DETALLE);
  if (!examenesSheet || !detalleSheet) {
    Logger.log('❌ Faltan hojas Examenes o Examen_Detalle. Ejecuta setupCompleto() primero.');
    return;
  }
  
  // Preparar arrays para batch insert
  const examenesBatch = [];
  const detalleBatch = [];
  const seenExams = new Set();
  const tz = Session.getScriptTimeZone();
  
  rows.forEach(r => {
    const marcaRaw = r.marca_temporal;
    const marcaDate = marcaRaw instanceof Date ? marcaRaw : new Date(marcaRaw);
    if (isNaN(marcaDate.getTime())) return;
    
    const nombre = String(r.nombre_apellido || '').trim();
    const cedula = String(r.cedula || '').replace(/[.\s-]/g, '').trim();
    const puntajeStr = String(r.puntaje || '0/0');
    const [puntaje, total] = puntajeStr.split('/').map(n => parseInt(n) || 0);
    const fecha = r.fecha || Utilities.formatDate(marcaDate, tz, 'dd/MM/yyyy');
    const hora = r.hora || Utilities.formatDate(marcaDate, tz, 'HH:mm:ss');
    const intento = parseInt(r.intento) || 1;
    const respuestaBlob = r.respuesta || '';
    
    if (!cedula || !nombre) return;
    
    const examId = `EXM-${Utilities.formatDate(marcaDate, tz, 'yyyyMMdd')}-${cedula}-${intento}`;
    
    if (!seenExams.has(examId)) {
      seenExams.add(examId);
      examenesBatch.push([
        examId,
        marcaRaw instanceof Date ? Utilities.formatDate(marcaRaw, tz, 'dd/MM/yyyy HH:mm:ss') : String(marcaRaw),
        nombre,
        cedula,
        puntaje,
        total,
        fecha,
        hora,
        intento
      ]);
    }
    
    // Parsear respuestas → detalle
    const lineas = respuestaBlob.split('\n').map(l => l.trim()).filter(l => l);
    let seccionActual = '', numP = 0;
    lineas.forEach(linea => {
      if (linea.match(/^SECCI[OÓ]N\s+[IVX]+/i)) {
        seccionActual = linea.replace(/^SECCI[OÓ]N\s+[IVX]+\.?\s*/i, '').trim();
        numP = 0;
        return;
      }
      const m = linea.match(/^([IVX]+\.\d+):\s*(\w+)\s*\|\s*Correcta:\s*(\w+)\s*\|\s*(OK|MAL)\s*\|\s*(.+)$/);
      if (m) {
        numP++;
        detalleBatch.push([
          examId,
          seccionActual,
          numP,
          m[5].trim(),  // pregunta
          m[2],         // respuesta del alumno
          m[3],         // correcta
          m[4] === 'OK' // acertó?
        ]);
      }
    });
  });
  
  // BATCH INSERT — una sola operación por hoja
  if (examenesBatch.length) {
    const startRow = examenesSheet.getLastRow() + 1;
    examenesSheet.getRange(startRow, 1, examenesBatch.length, 9).setValues(examenesBatch);
    Logger.log('✅ Examenes creados: ' + examenesBatch.length);
  } else {
    Logger.log('⚠️ No se crearon exámenes nuevos.');
  }
  
  if (detalleBatch.length) {
    const startRow2 = detalleSheet.getLastRow() + 1;
    detalleSheet.getRange(startRow2, 1, detalleBatch.length, 7).setValues(detalleBatch);
    Logger.log('✅ Detalles creados: ' + detalleBatch.length);
  } else {
    Logger.log('⚠️ No se crearon detalles.');
  }
  
  Logger.log('🏁 fixExamenesAhora() completado.');
}

// ============================================================
// doGet — TODOS LOS MODOS DE CONSULTA
// ============================================================

function doGet(e) {
  try {
    const data = e?.parameter || {};
    if (!validarApiKey_(data.apiKey || data.api_secret)) {
      return jsonResponse({ ok: false, error: 'Acceso no autorizado. API key inválida.' });
    }
    
    const modo = data.modo || 'asistencia';
    
    // ---- CATÁLOGOS ----
    if (modo === 'catalogos') {
      const sheet = getSheet_(SH.CATALOGOS);
      const objetos = sheetToObjects_(sheet);
      const agrupados = {};
      objetos.forEach(o => {
        const tipo = String(o.Tipo || '').trim();
        if (!agrupados[tipo]) agrupados[tipo] = [];
        agrupados[tipo].push({ codigo: o.Codigo, nombre: o.Nombre });
      });
      return jsonResponse(agrupados);
    }
    
    // ---- ASISTENCIA ----
    if (modo === 'asistencia' || modo === 'registro') {
      const sheet = getSheet_(SH.ASISTENCIA);
      let objetos = sheetToObjects_(sheet);
      
      // Filtros opcionales
      const cedula = (data.cedula || '').replace(/[.\s-]/g, '').trim();
      const seccion = (data.seccion || '').trim().toUpperCase();
      const fechaDesde = (data.fecha_desde || '').trim();
      const fechaHasta = (data.fecha_hasta || '').trim();
      
      if (cedula) objetos = objetos.filter(o => String(o.Cedula || '').replace(/[.\s-]/g, '').trim() === cedula);
      if (seccion) objetos = objetos.filter(o => String(o.Seccion || '').trim().toUpperCase() === seccion);
      if (fechaDesde) objetos = objetos.filter(o => String(o.Fecha || '') >= fechaDesde);
      if (fechaHasta) objetos = objetos.filter(o => String(o.Fecha || '') <= fechaHasta);
      
      objetos.reverse(); // más recientes primero
      
      return jsonResponse({ registros: objetos, total: objetos.length });
    }
    
    // ---- PLANIFICACIONES ----
    if (modo === 'planificaciones') {
      const sheet = getSheet_(SH.PLANIFICACIONES);
      let objetos = sheetToObjects_(sheet);
      const cedula = (data.cedula || '').replace(/[.\s-]/g, '').trim();
      if (cedula) objetos = objetos.filter(o => String(o.CedulaDocente || '').replace(/[.\s-]/g, '').trim() === cedula);
      return jsonResponse({ planificaciones: objetos, total: objetos.length });
    }
    
    // ---- PROGRESO GRUPOS ----
    if (modo === 'progreso_grupo') {
      const sheet = getSheet_(SH.PROGRESO_GRUPOS);
      let objetos = sheetToObjects_(sheet);
      const cedula = (data.cedula || '').replace(/[.\s-]/g, '').trim();
      const seccion = (data.seccion || '').trim().toUpperCase();
      if (cedula) objetos = objetos.filter(o => String(o.CedulaDocente || '').replace(/[.\s-]/g, '').trim() === cedula);
      if (seccion) objetos = objetos.filter(o => String(o.Seccion || '').trim().toUpperCase() === seccion);
      return jsonResponse({ progreso: objetos.reverse(), total: objetos.length });
    }
    
    // ---- EXÁMENES ----
    if (modo === 'examenes') {
      const sheet = getSheet_(SH.EXAMENES);
      let objetos = sheetToObjects_(sheet);
      const cedula = (data.cedula || '').replace(/[.\s-]/g, '').trim();
      if (cedula) objetos = objetos.filter(o => String(o.Cedula || '').replace(/[.\s-]/g, '').trim() === cedula);
      return jsonResponse({ examenes: objetos.reverse(), total: objetos.length });
    }

    // ---- EXÁMENES 999 (legacy) ----
    if (modo === 'examenes_999') {
      // Buscar en hoja Examen999 legacy
      const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
      const sheet = ss.getSheetByName('Examen999') || getSheet_(SH.EXAMENES);
      let objetos = sheetToObjects_(sheet);
      return jsonResponse({ examenes: objetos.reverse(), total: objetos.length });
    }
    
    // ---- ESTUDIANTES ----
    if (modo === 'estudiantes') {
      const sheet = getSheet_(SH.ESTUDIANTES);
      let objetos = sheetToObjects_(sheet);
      const cedula = (data.cedula || '').replace(/[.\s-]/g, '').trim();
      if (cedula) objetos = objetos.filter(o => String(o.Cedula || '').replace(/[.\s-]/g, '').trim() === cedula);
      return jsonResponse({ estudiantes: objetos, total: objetos.length });
    }
    
    // ---- DOCENTES ----
    if (modo === 'docentes') {
      const sheet = getSheet_(SH.DOCENTES);
      let objetos = sheetToObjects_(sheet);
      return jsonResponse({ docentes: objetos, total: objetos.length });
    }
    
    // ---- NOVEDADES ----
    if (modo === 'novedades') {
      const sheet = getSheet_(SH.NOVEDADES);
      let objetos = sheetToObjects_(sheet);
      return jsonResponse({ novedades: objetos.reverse(), total: objetos.length });
    }
    
    // ---- BUSCAR (legacy) ----
    if (modo === 'buscar') {
      return doGet({ parameter: { ...data, modo: 'asistencia', apiKey: API_SECRET } });
    }
    
    // ---- RESÚMEN (legacy) ----
    if (modo === 'resumen') {
      const sheet = getSheet_(SH.ASISTENCIA);
      const objetos = sheetToObjects_(sheet);
      // Construir resumen agrupado por cédula
      const mapa = {};
      const fechas = new Set();
      objetos.forEach(o => {
        const c = String(o.Cedula || '').replace(/[.\s-]/g, '').trim();
        if (!c) return;
        fechas.add(o.Fecha);
        if (!mapa[c]) mapa[c] = { nombre: o.Nombre || '', carrera: o.Carrera || '', presente: 0, ausente: 0, justificada: 0, tarde: 0 };
        const est = String(o.Estado || 'Presente').trim();
        if (est === 'Presente') mapa[c].presente++;
        else if (est === 'Ausente') mapa[c].ausente++;
        else if (est === 'Ausencia Justificada') mapa[c].justificada++;
        else if (est === 'Tarde') mapa[c].tarde++;
        else mapa[c].presente++; // default
      });
      const totalClases = fechas.size;
      const resumen = Object.keys(mapa).sort().map(c => {
        const r = mapa[c];
        const puntaje = r.presente + r.tarde * 0.5 + r.justificada * 0.5;
        const ausencias = totalClases - r.presente - r.tarde - r.justificada;
        return {
          Cedula: c, Nombre: r.nombre, Carrera: r.carrera,
          TotalClases: totalClases, Presentes: r.presente,
          Tardanzas: r.tarde, AusJustificadas: r.justificada,
          Ausencias: Math.max(0, ausencias),
          Porcentaje: totalClases > 0 ? Math.round((puntaje / totalClases) * 100) : 0
        };
      });
      return jsonResponse({ resumen });
    }
    
    // ---- JUSTIFICACIONES (legacy) ----
    if (modo === 'justificaciones') {
      const sheet = getSheet_(SH.ASISTENCIA);
      const objetos = sheetToObjects_(sheet);
      const justificadas = objetos.filter(o => String(o.Estado || '').trim() === 'Ausencia Justificada').reverse();
      return jsonResponse({ justificaciones: justificadas, total: justificadas.length });
    }
    
    // ---- CSV (legacy) ----
    if (modo === 'csv') {
      const sheet = getSheet_(SH.ASISTENCIA);
      const values = sheet.getDataRange().getValues();
      if (values.length <= 1) return ContentService.createTextOutput('').setMimeType(ContentService.MimeType.TEXT);
      const csv = values.map(row => row.map(c => '"' + String(c || '').replace(/"/g, '""') + '"').join(',')).join('\n');
      return ContentService.createTextOutput(csv).setMimeType(ContentService.MimeType.TEXT);
    }
    
    // ---- PLANIFICACION (GET individual, legacy) ----
    if (modo === 'planificacion') {
      const sheet = getSheet_(SH.PLANIFICACIONES);
      const codigo = (data.codigo || '').trim();
      if (!codigo) return jsonResponse({ ok: false, error: 'Código requerido' });
      const objetos = sheetToObjects_(sheet);
      const encontrada = objetos.find(o => String(o.Codigo || '').trim() === codigo);
      if (encontrada) return jsonResponse({ ok: true, planificacion: encontrada });
      return jsonResponse({ ok: false, error: 'No encontrada' });
    }
    
    // fallback: devolver todo
    return jsonResponse({ ok: false, error: 'Modo no reconocido: ' + modo });
  } catch (error) {
    return jsonResponse({ ok: false, error: error.message });
  }
}

// ============================================================
// doPost — TODOS LOS MODOS DE ESCRITURA
// ============================================================

function doPost(e) {
  try {
    if (!e) return jsonResponse({ ok: false, error: 'Ejecutar via Web App, no manualmente' });
    
    const data = e.parameter || {};
    if (!validarApiKey_(data.apiKey || data.api_secret)) {
      return jsonResponse({ ok: false, error: 'Acceso no autorizado. API key inválida.' });
    }
    
    const modo = data.modo || 'asistencia';
    const now = new Date();
    const tz = 'America/Asuncion';
    const marcaTemp = Utilities.formatDate(now, tz, 'dd/MM/yyyy HH:mm:ss');
    
    // ---- GUARDAR PLANIFICACIÓN ----
    if (modo === 'planificacion' || modo === 'guardar_planificacion') {
      const sheet = getSheet_(SH.PLANIFICACIONES);
      const codigo = (data.codigo || '').trim();
      const cedula = (data.cedula || data.cedulaDocente || '').toString().replace(/[.\s-]/g, '').trim();
      const nombre = (data.nombre || data.nombreDocente || '').trim().toUpperCase();
      const codAsignatura = (data.codAsignatura || '').trim();
      const codSeccion = (data.codSeccion || data.seccion || '').trim();
      const codCarrera = (data.codCarrera || data.carrera || '').trim();
      const fechaInicio = (data.fechaInicio || '').trim();
      const fechaCierre = (data.fechaCierre || '').trim();
      const sala = (data.sala || '').trim();
      const sede = (data.sede || '').trim();
      const modalidad = (data.modalidad || '').trim();
      const observaciones = (data.observaciones || '').trim();
      
      if (!codigo || !cedula || !nombre || !codAsignatura || !codSeccion || !fechaInicio) {
        return jsonResponse({ ok: false, error: 'Faltan datos requeridos' });
      }
      
      const valores = sheet.getDataRange().getValues();
      let filaEditar = -1;
      for (let i = 1; i < valores.length; i++) {
        if (String(valores[i][0]).trim() === codigo) { filaEditar = i + 1; break; }
      }
      
      const fila = [codigo, cedula, nombre, codAsignatura, codSeccion, codCarrera, fechaInicio, fechaCierre, sala, sede, modalidad, observaciones, marcaTemp];
      
      if (filaEditar > 0) {
        sheet.getRange(filaEditar, 1, 1, fila.length).setValues([fila]);
        return jsonResponse({ ok: true, mensaje: 'Planificación actualizada', codigo });
      } else {
        sheet.appendRow(fila);
        return jsonResponse({ ok: true, mensaje: 'Planificación guardada', codigo });
      }
    }
    
    // ---- GUARDAR PROGRESO GRUPO ----
    if (modo === 'progreso_grupo' || modo === 'guardar_progreso_grupo') {
      const sheet = getSheet_(SH.PROGRESO_GRUPOS);
      const codigo = (data.codigo || '').trim();
      const cedulaDocente = (data.cedulaDocente || data.cedula || '').toString().replace(/[.\s-]/g, '').trim();
      const seccion = (data.seccion || '').trim();
      const asignatura = (data.asignatura || '').trim();
      const unidad = (data.unidad || '').trim();
      const tema = (data.tema || '').trim();
      const observaciones = (data.observaciones || '').trim();
      const fecha = Utilities.formatDate(now, tz, 'dd/MM/yyyy');
      
      if (!cedulaDocente || !seccion || !asignatura) {
        return jsonResponse({ ok: false, error: 'Faltan datos: cedulaDocente, seccion, asignatura' });
      }
      
      if (codigo) {
        const valores = sheet.getDataRange().getValues();
        for (let i = 1; i < valores.length; i++) {
          if (String(valores[i][0]).trim() === codigo) {
            sheet.getRange(i + 1, 1, 1, 9).setValues([[codigo, cedulaDocente, seccion, asignatura, unidad, tema, fecha, observaciones, marcaTemp]]);
            return jsonResponse({ ok: true, mensaje: 'Progreso actualizado', codigo });
          }
        }
        return jsonResponse({ ok: false, error: 'Código no encontrado' });
      } else {
        const codigoProgreso = 'PG-' + Utilities.formatDate(now, tz, 'yyyyMMddHHmmss') + '-' + Math.random().toString(36).substring(2, 6).toUpperCase();
        sheet.appendRow([codigoProgreso, cedulaDocente, seccion, asignatura, unidad, tema, fecha, observaciones, marcaTemp]);
        return jsonResponse({ ok: true, mensaje: 'Progreso guardado', codigo: codigoProgreso });
      }
    }
    
    // ---- GUARDAR EXÁMEN ----
    if (modo === 'guardar_examen' || modo === 'guardar_examen_999') {
      const targetSheet = modo === 'guardar_examen_999' ? 'Examen999' : SH.EXAMENES;
      const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(targetSheet) || getSheet_(SH.EXAMENES);
      const fecha = Utilities.formatDate(now, tz, 'dd/MM/yyyy');
      const hora = Utilities.formatDate(now, tz, 'HH:mm:ss');
      const nombre = (data.studentName || data.nombre || '').trim().toUpperCase();
      const cedula = (data.studentId || data.cedula || '').toString().replace(/[.\s-]/g, '').trim();
      const carrera = (data.career || data.carrera || '').trim();
      const seccion = (data.seccion || data.section || '').trim();
      const materia = (data.materia || '').trim();
      const nota = (data.nota || '').trim();
      const tipoExamen = (data.tipoExamen || 'Parcial').trim();
      
      if (!nombre || !cedula || !carrera || !seccion || !materia) {
        return jsonResponse({ ok: false, error: 'Faltan datos requeridos' });
      }
      
      sheet.appendRow([fecha, hora, nombre, cedula, carrera, seccion, materia, nota, tipoExamen, marcaTemp]);
      return jsonResponse({ ok: true, mensaje: 'Examen registrado en ' + targetSheet });
    }
    
    // ---- GUARDAR NOVEDAD ----
    if (modo === 'guardar_novedad' || modo === 'novedad') {
      const sheet = getSheet_(SH.NOVEDADES);
      const titulo = (data.titulo || '').trim();
      const contenido = (data.contenido || '').trim();
      const autor = (data.autor || '').trim();
      if (!titulo || !contenido) return jsonResponse({ ok: false, error: 'Título y contenido requeridos' });
      const id = 'NOV-' + Utilities.formatDate(now, tz, 'yyyyMMddHHmmss');
      const fecha = Utilities.formatDate(now, tz, 'dd/MM/yyyy');
      sheet.appendRow([id, titulo, contenido, fecha, autor, 'SI']);
      return jsonResponse({ ok: true, mensaje: 'Novedad publicada', id });
    }
    
    // ---- JUSTIFICAR AUSENCIA (legacy) ----
    if (modo === 'justificar') {
      const sheet = getSheet_(SH.ASISTENCIA);
      const nombre = (data.studentName || data.nombre || '').trim().toUpperCase();
      const cedula = (data.studentId || data.cedula || '').toString().replace(/[.\s-]/g, '').trim();
      const carrera = (data.career || data.carrera || '').trim();
      const seccion = (data.seccion || data.section || '').trim();
      const asignatura = (data.asignatura || data.materia || '').trim();
      const fechaAusencia = (data.fechaAusencia || data.fecha || '').trim();
      const motivo = (data.motivo || '').trim();
      const observacion = (data.notes || data.observacion || '').trim();
      const fileData = data.fileData || '';
      const fileName = data.fileName || '';
      
      if (!nombre || !cedula || !carrera || !seccion || !fechaAusencia) {
        return jsonResponse({ ok: false, error: 'Faltan datos requeridos' });
      }
      
      // Subir archivo a Drive si se proporcionó
      let fileUrl = '';
      if (fileData && fileName) {
        try {
          const folderId = '1mpEs3pytsFEWsb1esJRRay9fiktBh8e0';
          const folder = DriveApp.getFolderById(folderId);
          const decoded = Utilities.base64Decode(fileData);
          const blob = Utilities.newBlob(decoded, getMimeType_(fileName), fileName);
          const file = folder.createFile(blob);
          file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
          fileUrl = file.getUrl();
        } catch (driveError) {
          console.error('Error al subir a Drive:', driveError);
        }
      }
      
      let obsCombinada = motivo ? 'Motivo: ' + motivo : '';
      if (fileUrl) obsCombinada += (obsCombinada ? ' | ' : '') + 'Doc: ' + fileUrl;
      if (observacion) obsCombinada += (obsCombinada ? ' | ' : '') + 'Obs: ' + observacion;
      
      sheet.appendRow([fechaAusencia, nombre, cedula, carrera, seccion, asignatura, 'Ausencia Justificada', obsCombinada, marcaTemp]);
      return jsonResponse({ ok: true, mensaje: 'Ausencia justificada registrada', fileUrl });
    }
    
    // ---- SUBIR ARCHIVO (legacy) ----
    if (modo === 'subirArchivo') {
      const fileData = data.fileData || '';
      const fileName = data.fileName || '';
      const cedula = (data.studentId || data.cedula || '').toString().replace(/[.\s-]/g, '').trim();
      const nombre = (data.studentName || data.nombre || '').trim().toUpperCase();
      
      if (!fileData || !fileName) return jsonResponse({ ok: false, error: 'No se proporcionó archivo' });
      
      let fileUrl = '';
      try {
        const folderId = '1mpEs3pytsFEWsb1esJRRay9fiktBh8e0';
        const folder = DriveApp.getFolderById(folderId);
        const decoded = Utilities.base64Decode(fileData);
        const nombreArchivo = cedula + '_' + nombre.replace(/\s+/g, '_') + '_' + fileName;
        const blob = Utilities.newBlob(decoded, getMimeType_(fileName), nombreArchivo);
        const file = folder.createFile(blob);
        file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
        fileUrl = file.getUrl();
        return jsonResponse({ ok: true, mensaje: 'Archivo subido', fileUrl });
      } catch (driveError) {
        return jsonResponse({ ok: false, error: 'Error al subir: ' + driveError.message });
      }
    }
    
    // ---- ASISTENCIA (default) ----
    const sheet = getSheet_(SH.ASISTENCIA);
    const nombre = (data.studentName || data.nombre || '').trim().toUpperCase();
    const cedula = (data.studentId || data.cedula || '').toString().replace(/[.\s-]/g, '').trim();
    const carrera = (data.career || data.carrera || '').trim();
    const seccion = (data.seccion || data.section || '').trim();
    const asignatura = (data.asignatura || data.materia || '').trim();
    const observacion = (data.notes || data.observacion || '').trim();
    const estado = (data.estado || 'Presente').trim();
    const fechaAusencia = (data.fechaAusencia || '').trim();
    
    if (!nombre || !cedula || !carrera || !seccion) {
      return jsonResponse({ ok: false, error: 'Faltan datos requeridos: nombre, cedula, carrera, seccion' });
    }
    
    // Determinar fecha
    let fechaStr;
    if (estado === 'Ausencia Justificada' && fechaAusencia) {
      const partes = fechaAusencia.split('-');
      fechaStr = partes.length === 3 ? partes[2] + '/' + partes[1] + '/' + partes[0] : fechaAusencia;
    } else {
      fechaStr = Utilities.formatDate(now, tz, 'dd/MM/yyyy');
    }
    
    // Evitar duplicados exactos (solo Presente)
    if (estado === 'Presente') {
      const datos = sheet.getDataRange().getValues();
      const yaExiste = datos.some(row => {
        const rowCedula = (row[2] || '').toString().replace(/[.\s-]/g, '').trim();
        return rowCedula === cedula && String(row[0]) === fechaStr && String(row[6] || '').trim() === 'Presente';
      });
      if (yaExiste) {
        return jsonResponse({ ok: false, duplicado: true, mensaje: 'Ya existe registro para esta cédula en la fecha actual' });
      }
    }
    
    sheet.appendRow([fechaStr, nombre, cedula, carrera, seccion, asignatura, estado, observacion, marcaTemp]);
    return jsonResponse({ ok: true, mensaje: estado === 'Ausencia Justificada' ? 'Ausencia justificada registrada' : 'Asistencia registrada', duplicado: false });
    
  } catch (error) {
    return jsonResponse({ ok: false, error: error.message });
  }
}

// ============================================================
// doOptions — CORS preflight
// ============================================================

function doOptions(e) {
  return jsonResponse({});
}

// ============================================================
// FUNCIONES MANUALES (ejecutar desde el editor)
// ============================================================

function inicializarHojas() {
  Object.keys(SH).forEach(k => getSheet_(SH[k]));
  Logger.log('Hojas inicializadas');
}

function autorizarDrive() {
  try {
    const folderId = '1mpEs3pytsFEWsb1esJRRay9fiktBh8e0';
    const folder = DriveApp.getFolderById(folderId);
    const testBlob = Utilities.newBlob('Test', 'text/plain', 'test.txt');
    const testFile = folder.createFile(testBlob);
    testFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    testFile.setTrashed(true);
    Logger.log('Drive autorizado correctamente. Carpeta: ' + folder.getName());
    return 'Drive autorizado ✅';
  } catch (error) {
    throw new Error('Debe autorizar Drive manualmente: ' + error.message);
  }
}

function probarEscrituraManual() {
  const sheet = getSheet_(SH.ASISTENCIA);
  const now = new Date();
  const fechaStr = Utilities.formatDate(now, 'America/Asuncion', 'dd/MM/yyyy');
  const marcaTemp = Utilities.formatDate(now, 'America/Asuncion', 'dd/MM/yyyy HH:mm:ss');
  sheet.appendRow([fechaStr, 'TEST MANUAL', '9999999', 'CONTABILIDAD', 'S026', 'SOCIOLOGIA', 'Presente', '', marcaTemp]);
  Logger.log('Fila de prueba insertada en ' + SH.ASISTENCIA);
}

function recalcularManualmente() {
  Logger.log('Función de recálculo manual. Los resúmenes se calculan vía GET modo=resumen.');
}
