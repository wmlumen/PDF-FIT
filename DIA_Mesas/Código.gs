/**
 * Google Apps Script - Backend Seccional 40
 * Recibe datos de votaciÃ³n y los guarda en Google Sheets
 * 
 * Hojas del sistema:
 * - PadrÃ³n: SECC, NÂ°, LOCAL DE VOTACION, MESA, ORDEN, CEDULA, APELLIDO, NOMBRE, FEC. NAC, DIRIGENTE, VOTO
 * - Dirigentes: CÃ©dula, Dirigente, ContraseÃ±a
 * - Miembros_mesa: CÃ©dula, Dirigente, ContraseÃ±a, MESA, HORARIO DE INICIO, HORARIO DE CIERRE
 * - No_voto: Marca temporal, Cedula, Mesa, Orden, No_voto, Observación
 * - Resumen: Mesa, Votos, Ausentes, Controversias, Total, Participacion %
 * - Registros: timestamp, cedula, nombre, mesa, orden, estado, accion, dirigente, dirigenteNombre, origen
 * 
 * USO:
 * 1. Crear nuevo proyecto en https://script.google.com
 * 2. Copiar este cÃ³digo completo en el editor (archivo .gs)
 * 3. Guardar (Ctrl+S)
 * 4. Implementar > Nueva implementaciÃ³n > AplicaciÃ³n web
 * 5. Ejecutar como: Tu cuenta
 * 6. Acceso: Cualquiera, incluso anÃ³nimo
 * 7. Copiar la URL y pegarla en los archivos HTML
 */

const SHEET_REGISTROS = 'Registros';
const SHEET_RESUMEN = 'Resumen';
const SHEET_NO_VOTO = 'No_voto';
const SHEET_RESPUESTAS = 'Respuestas de formulario 1';
const SHEET_DIRIGENTES = 'Dirigentes';
const SHEET_PADRON = 'Padron';
const SHEET_MIEMBROS_MESA = 'Miembros_mesa';
const SHEET_PENDIENTES_QR = 'Pendientes_QR';
const SPREADSHEET_ID = '1tDtXxCqV5L70-w5wAXBkb73e3ZKtTu7ni8lJ_AUg73I';

function getTargetSpreadsheet() {
  return SpreadsheetApp.openById(SPREADSHEET_ID);
}

function normalizarTexto(valor) {
  return String(valor || '').trim();
}

function normalizarCedula(valor) {
  return normalizarTexto(valor).replace(/[.\s,-]/g, '');
}

function normalizarEstadoMiembro(valor) {
  const estado = normalizarTexto(valor).toUpperCase();
  return estado || 'ACTIVO';
}

function ensureMiembrosSheet(ss) {
  var sheet = ss.getSheetByName(SHEET_MIEMBROS_MESA);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_MIEMBROS_MESA);
  }
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(['Cedula', 'Nombre', 'Contrasena', 'Mesa', 'Horario de Inicio', 'Horario de Cierre', 'Estado']);
    sheet.getRange(1, 1, 1, 7)
      .setFontWeight('bold')
      .setBackground('#1e3a8a')
      .setFontColor('#ffffff');
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function ensurePendientesQrSheet(ss) {
  var sheet = ss.getSheetByName(SHEET_PENDIENTES_QR);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_PENDIENTES_QR);
  }
  if (sheet.getLastRow() === 0) {
    sheet.appendRow([
      'id',
      'timestamp',
      'cedula',
      'nombre',
      'mesa',
      'orden',
      'telefono',
      'observacion',
      'estado',
      'canal',
      'resueltoAt'
    ]);
    sheet.getRange(1, 1, 1, 11)
      .setFontWeight('bold')
      .setBackground('#1e3a8a')
      .setFontColor('#ffffff');
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function appendRespuestaFormulario(ss, data) {
  if ((data.estado || '') !== 'voto') {
    return;
  }

  var sheet = ss.getSheetByName(SHEET_RESPUESTAS);
  if (!sheet) {
    return;
  }

  sheet.appendRow([
    data.timestamp || new Date(),
    data.cedula || '',
    data.mesa || '',
    data.orden || ''
  ]);
}

function obtenerPendientesQr(sheet) {
  if (!sheet || sheet.getLastRow() < 2) {
    return [];
  }
  const allData = sheet.getRange(2, 1, sheet.getLastRow() - 1, 11).getValues();
  return allData.map(function(row, index) {
    return {
      rowNumber: index + 2,
      id: normalizarTexto(row[0]),
      timestamp: row[1],
      cedula: normalizarCedula(row[2]),
      nombre: normalizarTexto(row[3]),
      mesa: normalizarTexto(row[4]),
      orden: normalizarTexto(row[5]),
      telefono: normalizarTexto(row[6]),
      observacion: normalizarTexto(row[7]),
      estado: normalizarTexto(row[8]).toLowerCase() || 'pendiente',
      canal: normalizarTexto(row[9]) || 'qr',
      resueltoAt: row[10]
    };
  });
}

function obtenerMiembros(sheet) {
  if (!sheet || sheet.getLastRow() < 2) {
    return [];
  }
  const allData = sheet.getRange(2, 1, sheet.getLastRow() - 1, Math.max(sheet.getLastColumn(), 7)).getValues();
  return allData
    .map(function(row, index) {
      return {
        rowNumber: index + 2,
        cedula: normalizarCedula(row[0]),
        nombre: normalizarTexto(row[1]),
        contrasena: normalizarTexto(row[2]),
        mesa: normalizarTexto(row[3]),
        horarioInicio: normalizarTexto(row[4]),
        horarioCierre: normalizarTexto(row[5]),
        estado: normalizarEstadoMiembro(row[6])
      };
    })
    .filter(function(miembro) {
      return miembro.cedula && miembro.nombre;
    });
}

/**
 * Maneja solicitudes POST (registrar voto/consulta/no_voto)
 * AGREGAR LOGS PARA DEPURACION
 */
function doPost(e) {
  try {
    Logger.log('=== doPost INICIADO ===');
    Logger.log('Evento recibido: ' + JSON.stringify(e));
    
    var ss = getTargetSpreadsheet();
    var data;
    
    // Intentar obtener datos de postData
    if (e && e.postData && e.postData.contents) {
      Logger.log('Datos de postData: ' + e.postData.contents);
      try {
        data = JSON.parse(e.postData.contents);
      } catch (parseError) {
        Logger.log('Error parseando JSON: ' + parseError.message);
        Logger.log('Contenido: ' + e.postData.contents);
        return jsonResponse({ success: false, error: 'Error parseando JSON: ' + parseError.message });
      }
    } 
    // Si no hay postData, intentar obtener de parameter
    else if (e && e.parameter) {
      Logger.log('Datos de parameter: ' + JSON.stringify(e.parameter));
      data = e.parameter;
    }
    else {
      Logger.log('ERROR: No hay datos en el request');
      return jsonResponse({ success: false, error: 'No data received' });
    }
    
    Logger.log('Data procesada: ' + JSON.stringify(data));
    var action = data.action || 'registrar';
    
    // --- RUTEO DE ACCIONES ---
    
    if (action === 'registrar_miembro') {
      return handleRegistrarMiembro(ss, data);
    }
    
    if (action === 'registrar_pendiente_qr') {
      return handleRegistrarPendienteQr(ss, data);
    }

    if (action === 'rechazar_pendiente_qr') {
      const sheet = ss.getSheetByName(SHEET_PENDIENTES_QR);
      if (!sheet) return jsonResponse({ success: false, error: 'Hoja no encontrada' });
      const id = normalizarTexto(data.id);
      if (!id) return jsonResponse({ success: false, error: 'ID obligatorio' });
      const pendientes = obtenerPendientesQr(ensurePendientesQrSheet(ss));
      const pendiente = pendientes.find(function(p) { return p.id === id; });
      if (!pendiente) return jsonResponse({ success: false, error: 'Solicitud no encontrada' });
      if (pendiente.estado !== 'pendiente') return jsonResponse({ success: false, error: 'Ya fue procesada' });
      sheet.getRange(pendiente.rowNumber, 9, 1, 3).setValues([['rechazado', pendiente.canal, new Date().toISOString()]]);
      return jsonResponse({ success: true, id: id, tipo: 'rechazado' });
    }
    
    // --- REGISTRO DE VOTO / NO VOTO (default) ---
    var esNoVoto = data.estado === 'no_voto' || data.action === 'no_voto';
    Logger.log('Es no_voto: ' + esNoVoto);
    
    if (esNoVoto) {
      // Escribir en la hoja No_voto (columnas: Marca temporal, Cedula, Mesa, Orden, No_voto, Observación)
      var sheetNoVoto = ss.getSheetByName(SHEET_NO_VOTO);
      if (!sheetNoVoto) {
        Logger.log('ERROR: Hoja No_voto no encontrada');
        return jsonResponse({ success: false, error: 'Hoja No_voto no encontrada' });
      }
      
      var rowNoVoto = [
        data.timestamp || new Date(),
        data.cedula || '',
        data.mesa || '',
        data.orden || '',
        data.motivo || 'no_voto',
        data.observacion || ''
      ];
      
      Logger.log('Escribiendo en No_voto: ' + JSON.stringify(rowNoVoto));
      sheetNoVoto.appendRow(rowNoVoto);
      Logger.log('Escrito en fila: ' + sheetNoVoto.getLastRow());
      
      return jsonResponse({ success: true, row: sheetNoVoto.getLastRow(), tipo: 'no_voto' });
    } else {
      // Escribir en la hoja Registros
      var sheetRegistros = ss.getSheetByName(SHEET_REGISTROS);
      if (!sheetRegistros) {
        Logger.log('Creando hoja Registros...');
        sheetRegistros = ss.insertSheet(SHEET_REGISTROS);
        sheetRegistros.appendRow([
          'timestamp', 'cedula', 'nombre', 'mesa', 'orden', 'estado', 'accion', 'dirigente', 'dirigenteNombre', 'origen'
        ]);
        sheetRegistros.getRange(1, 1, 1, 10)
          .setFontWeight('bold')
          .setBackground('#1e3a8a')
          .setFontColor('#ffffff');
        sheetRegistros.setFrozenRows(1);
      }
      
      var rowRegistros = [
        data.timestamp || new Date().toISOString(),
        data.cedula || '',
        data.nombre || '',
        data.mesa || '',
        data.orden || '',
        data.estado || '',
        data.accion || '',
        data.dirigente || 'Dirigente',
        data.dirigenteNombre || 'Dirigente',
        data.origen || 'web'
      ];
      
      Logger.log('Escribiendo en Registros: ' + JSON.stringify(rowRegistros));
      sheetRegistros.appendRow(rowRegistros);
      Logger.log('Escrito en fila: ' + sheetRegistros.getLastRow());
      appendRespuestaFormulario(ss, data);
      
      actualizarResumen(ss);
      
      return jsonResponse({ success: true, row: sheetRegistros.getLastRow(), tipo: 'registro' });
    }
    
  } catch (err) {
    Logger.log('ERROR GENERAL: ' + err.message);
    Logger.log('Stack: ' + err.stack);
    return jsonResponse({ success: false, error: err.message || 'Internal error' });
  }
}

function handleRegistrarMiembro(ss, data) {
  const cedula = normalizarCedula(data.cedula);
  const nombre = normalizarTexto(data.nombre);
  const password = normalizarTexto(data.password);
  const mesa = normalizarTexto(data.mesa);
  const horarioInicio = normalizarTexto(data.horarioInicio);
  const horarioCierre = normalizarTexto(data.horarioCierre);
  const estado = normalizarEstadoMiembro(data.estado);

  if (!cedula || !nombre || !password) {
    return jsonResponse({ success: false, error: 'Cédula, nombre y contraseña son obligatorios' });
  }

  const sheet = ensureMiembrosSheet(ss);
  const miembros = obtenerMiembros(sheet);
  const existente = miembros.find(function(m) { return m.cedula === cedula; });
  const row = [[cedula, nombre, password, mesa, horarioInicio, horarioCierre, estado]];

  if (existente) {
    sheet.getRange(existente.rowNumber, 1, 1, 7).setValues(row);
    return jsonResponse({ success: true, accion: 'actualizado', row: existente.rowNumber });
  }

  sheet.appendRow(row[0]);
  return jsonResponse({ success: true, accion: 'creado', row: sheet.getLastRow() });
}

function handleRegistrarPendienteQr(ss, data) {
  const cedula = normalizarCedula(data.cedula);
  const nombre = normalizarTexto(data.nombre);
  const mesa = normalizarTexto(data.mesa);
  const orden = normalizarTexto(data.orden);
  const telefono = normalizarTexto(data.telefono);
  const observacion = normalizarTexto(data.observacion);

  if (!cedula || !nombre) {
    return jsonResponse({ success: false, error: 'Cedula y nombre son obligatorios' });
  }

  const sheet = ensurePendientesQrSheet(ss);
  const pendientes = obtenerPendientesQr(sheet);
  const yaPendiente = pendientes.find(function(item) {
    return item.cedula === cedula && item.estado === 'pendiente';
  });

  if (yaPendiente) {
    return jsonResponse({ success: false, error: 'Ya existe una solicitud pendiente para esta cedula' });
  }

  const id = 'qr_' + new Date().getTime() + '_' + cedula;
  sheet.appendRow([
    id, new Date().toISOString(), cedula, nombre, mesa, orden, telefono, observacion, 'pendiente', 'qr', ''
  ]);

  return jsonResponse({ success: true, id: id, tipo: 'pendiente_qr' });
}

/**
 * Maneja solicitudes GET (obtener datos)
 */
function doGet(e) {
  try {
    const ss = getTargetSpreadsheet();
    const action = e.parameter.action || 'status';
    
    if (action === 'status') {
      return jsonResponse({
        status: 'ok',
        service: 'Seccional 40 API',
        timestamp: new Date().toISOString()
      });
    }
    
    if (action === 'test') {
      // Endpoint de prueba para verificar que el POST funciona
      return jsonResponse({
        success: true,
        message: 'API funcionando correctamente',
        timestamp: new Date().toISOString(),
        sheets: {
           registros: ss.getSheetByName(SHEET_REGISTROS) ? 'Existe' : 'No existe',
           no_voto: ss.getSheetByName(SHEET_NO_VOTO) ? 'Existe' : 'No existe',
           dirigentes: ss.getSheetByName(SHEET_DIRIGENTES) ? 'Existe' : 'No existe',
           resumen: ss.getSheetByName(SHEET_RESUMEN) ? 'Existe' : 'No existe',
           padron: ss.getSheetByName(SHEET_PADRON) ? 'Existe' : 'No existe'
         }
      });
    }
    
    if (action === 'resumen') {
      const sheet = ss.getSheetByName(SHEET_RESUMEN);
      if (!sheet || sheet.getLastRow() < 2) {
        return jsonResponse({ mesas: [], total: 0 });
      }
      const data = sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).getValues();
      const mesas = data.map(row => ({
        mesa: row[0],
        votos: row[1],
        ausentes: row[2],
        controversias: row[3],
        total: row[4],
        participacion: row[5]
      }));
      return jsonResponse({ mesas: mesas, total: mesas.length });
    }
    
    if (action === 'mesa') {
      const mesaNum = parseInt(e.parameter.mesa) || 0;
      const sheet = ss.getSheetByName(SHEET_REGISTROS);
      if (!sheet || sheet.getLastRow() < 2) {
        return jsonResponse({ mesa: mesaNum, registros: [] });
      }
      const allData = sheet.getRange(2, 1, sheet.getLastRow() - 1, 10).getValues();
      const registros = allData
        .filter(row => parseInt(row[3]) === mesaNum)
        .map(row => ({
          timestamp: row[0],
          cedula: row[1],
          nombre: row[2],
          mesa: row[3],
          orden: row[4],
          estado: row[5],
          accion: row[6],
          dirigente: row[7],
          dirigenteNombre: row[8]
        }));
      return jsonResponse({ mesa: mesaNum, registros: registros });
    }
    
    if (action === 'votos') {
      const sheet = ss.getSheetByName(SHEET_REGISTROS);
      if (!sheet || sheet.getLastRow() < 2) {
        return jsonResponse({ registros: [], total: 0 });
      }
      const allData = sheet.getRange(2, 1, sheet.getLastRow() - 1, 10).getValues();
      const registros = allData
        .map(row => ({
          timestamp: row[0],
          cedula: row[1],
          nombre: row[2],
          mesa: row[3],
          orden: row[4],
          estado: row[5],
          accion: row[6],
          dirigente: row[7],
          dirigenteNombre: row[8]
        }))
        .reverse();
      return jsonResponse({ registros: registros, total: registros.length });
    }
    
    if (action === 'no_votos') {
      // Leer desde la hoja No_voto (columnas: Marca temporal, Cedula, Mesa, Orden, No_voto, Observación)
      const sheet = ss.getSheetByName(SHEET_NO_VOTO);
      if (!sheet || sheet.getLastRow() < 2) {
        return jsonResponse({ registros: [], total: 0 });
      }
      const allData = sheet.getRange(2, 1, sheet.getLastRow() - 1, 6).getValues();
      const registros = allData
        .map(row => ({
          timestamp: row[0],
          cedula: row[1],
          mesa: row[2],
          orden: row[3],
          motivo: row[4],
          observacion: row[5]
        }))
        .reverse();
      return jsonResponse({ registros: registros, total: registros.length });
    }
    
    if (action === 'dirigentes') {
      const sheet = ss.getSheetByName(SHEET_DIRIGENTES);
      if (!sheet || sheet.getLastRow() < 2) {
        return jsonResponse({ dirigentes: [], total: 0 });
      }
      const allData = sheet.getRange(2, 1, sheet.getLastRow() - 1, 3).getValues();
      const dirigentes = allData
        .map(row => ({
          cedula: String(row[0] || '').replace(/\./g, '').trim(),
          nombre: String(row[1] || '').trim(),
          contrasena: String(row[2] || '').trim()
        }))
        .filter(d => d.cedula && d.nombre);
      return jsonResponse({ dirigentes: dirigentes, total: dirigentes.length });
    }

    if (action === 'asignacion_dirigentes') {
      // Endpoint lightweight: solo devuelve cédula -> dirigente asignado desde columna J del Padron
      var pSheet = ss.getSheetByName(SHEET_PADRON);
      if (!pSheet) pSheet = ss.getSheetByName('Padron');
      var asignaciones = {};
      if (pSheet && pSheet.getLastRow() >= 2) {
        var pData = pSheet.getRange(2, 1, pSheet.getLastRow() - 1, 11).getValues();
        for (var i = 0; i < pData.length; i++) {
          var row = pData[i];
          var ced = String(row[5] || '').replace(/[.\s,-]/g, '').trim();
          var dirAsignado = String(row[9] || '').trim(); // Columna J = DIRIGENTE
          if (ced && dirAsignado) {
            asignaciones[ced] = dirAsignado;
          }
        }
      }
      return jsonResponse({
        asignaciones: asignaciones,
        total: Object.keys(asignaciones).length
      });
    }

    if (action === 'padron_unificado') {
      // ============================================================
      // Endpoint: padron_unificado
      // Aglutina datos de Padron + Registros (votos) + No_voto
      // Para cada elector del padrón muestra:
      //   - estado: 'voto' | 'no_voto' | 'sin_registro'
      //   - datos del dirigente que registró (si aplica)
      // Filtros opcionales: mesa, dirigente
      // ============================================================
      const filtroMesa = e.parameter.mesa ? parseInt(e.parameter.mesa) : null;
      const filtroDirigente = e.parameter.dirigente ? normalizarTexto(e.parameter.dirigente) : null;
      
      // 1) Leer Padron (intentar con y sin acento)
      var padronSheet = ss.getSheetByName(SHEET_PADRON);
      if (!padronSheet) padronSheet = ss.getSheetByName('Padron');
      var electores = [];
      if (padronSheet && padronSheet.getLastRow() >= 2) {
        var padronData = padronSheet.getRange(2, 1, padronSheet.getLastRow() - 1, 11).getValues();
        for (var i = 0; i < padronData.length; i++) {
          var row = padronData[i];
          // Columnas: SECC(0), N°(1), LOCAL(2), MESA(3), ORDEN(4), CEDULA(5), APELLIDO(6), NOMBRE(7), FEC.NAC(8), DIRIGENTE(9), VOTO(10)
          var cedula = String(row[5] || '').replace(/[.\s,-]/g, '').trim();
          if (!cedula) continue;
          var mesaVal = parseInt(row[3]) || 0;
          if (filtroMesa && mesaVal !== filtroMesa) continue;
          var dirAsignado = String(row[9] || '').trim(); // Columna J = DIRIGENTE del Padron
          electores.push({
            secc: String(row[0] || '').trim(),
            num: String(row[1] || '').trim(),
            local: String(row[2] || '').trim(),
            mesa: mesaVal,
            orden: parseInt(row[4]) || 0,
            cedula: cedula,
            apellido: String(row[6] || '').trim(),
            nombre: String(row[7] || '').trim(),
            nombreCompleto: (String(row[6] || '') + ' ' + String(row[7] || '')).trim(),
            estado: 'sin_registro',
            dirigenteCedula: '',
            dirigenteNombre: '',
            dirigenteAsignado: dirAsignado, // Columna J del Padron
            timestamp: null
          });
        }
      }
      
      // 2) Leer Registros (votos) y construir mapa cédula -> último voto
      var votosPorCedula = {};
      var registrosSheet = ss.getSheetByName(SHEET_REGISTROS);
      if (registrosSheet && registrosSheet.getLastRow() >= 2) {
        var regData = registrosSheet.getRange(2, 1, registrosSheet.getLastRow() - 1, 10).getValues();
        for (var i = 0; i < regData.length; i++) {
          var r = regData[i];
          var ced = String(r[1] || '').replace(/[.\s,-]/g, '').trim();
          if (!ced) continue;
          var estado = String(r[5] || '').trim().toLowerCase();
          // Solo interesan los registros con estado 'voto' o 'ausente' (contabilizar como voto)
          if (estado !== 'voto' && estado !== 'ausente') continue;
          var ts = new Date(r[0]).getTime() || 0;
          // Conservar el más reciente por cédula
          if (!votosPorCedula[ced] || ts > votosPorCedula[ced].timestamp) {
            votosPorCedula[ced] = {
              estado: estado,
              timestamp: ts,
              dirigenteCedula: String(r[7] || '').trim(),
              dirigenteNombre: String(r[8] || '').trim()
            };
          }
        }
      }
      
      // 3) Leer No_voto y construir mapa cédula
      var noVotosPorCedula = {};
      var noVotoSheet = ss.getSheetByName(SHEET_NO_VOTO);
      if (noVotoSheet && noVotoSheet.getLastRow() >= 2) {
        var nvData = noVotoSheet.getRange(2, 1, noVotoSheet.getLastRow() - 1, 6).getValues();
        for (var i = 0; i < nvData.length; i++) {
          var n = nvData[i];
          var cedN = String(n[1] || '').replace(/[.\s,-]/g, '').trim();
          if (!cedN) continue;
          var tsN = new Date(n[0]).getTime() || 0;
          if (!noVotosPorCedula[cedN] || tsN > noVotosPorCedula[cedN].timestamp) {
            noVotosPorCedula[cedN] = {
              timestamp: tsN,
              motivo: String(n[4] || '').trim(),
              observacion: String(n[5] || '').trim()
            };
          }
        }
      }
      
      // 4) Fusionar estados
      for (var i = 0; i < electores.length; i++) {
        var e = electores[i];
        var voto = votosPorCedula[e.cedula];
        var noVoto = noVotosPorCedula[e.cedula];
        
        // Prioridad: voto > no_voto > sin_registro
        if (voto) {
          e.estado = 'voto';
          e.dirigenteCedula = voto.dirigenteCedula;
          e.dirigenteNombre = voto.dirigenteNombre;
          e.timestamp = voto.timestamp;
        } else if (noVoto) {
          e.estado = 'no_voto';
          e.timestamp = noVoto.timestamp;
          e.motivoNoVoto = noVoto.motivo;
          e.observacionNoVoto = noVoto.observacion;
        }
        // sin_registro queda como está
      }
      
      // 5) Filtrar por dirigente si se especificó
      if (filtroDirigente) {
        // Si el filtro empieza con ASIG_, buscar por dirigente asignado (col J)
        var esAsignado = filtroDirigente.indexOf('ASIG_') === 0;
        var filtroValor = esAsignado ? filtroDirigente.substring(5) : filtroDirigente;
        electores = electores.filter(function(e) {
          if (esAsignado) {
            return normalizarTexto(e.dirigenteAsignado).toLowerCase().indexOf(filtroValor.toLowerCase()) !== -1;
          }
          var dn = normalizarTexto(e.dirigenteNombre).toLowerCase();
          return dn.indexOf(filtroValor.toLowerCase()) !== -1 ||
                 normalizarTexto(e.dirigenteCedula).indexOf(filtroValor) !== -1;
        });
      }
      
      // 6) Recolectar dirigentes disponibles (para filtros en frontend)
      var dirigentesSet = {};
      for (var i = 0; i < electores.length; i++) {
        var dn = electores[i].dirigenteNombre;
        var dc = electores[i].dirigenteCedula;
        if (dn && dc) {
          dirigentesSet[dc] = dn;
        }
        // También agregar dirigentes asignados desde columna J
        var da = electores[i].dirigenteAsignado;
        if (da) {
          dirigentesSet['ASIG_' + da] = '📋 ' + da;
        }
      }
      var dirigentesList = [];
      for (var ced in dirigentesSet) {
        dirigentesList.push({ cedula: ced, nombre: dirigentesSet[ced] });
      }
      dirigentesList.sort(function(a, b) { return a.nombre.localeCompare(b.nombre); });
      
      // 7) Recolectar mesas disponibles
      var mesasSet = {};
      for (var i = 0; i < electores.length; i++) {
        mesasSet[electores[i].mesa] = true;
      }
      var mesasList = Object.keys(mesasSet).map(Number).sort(function(a, b) { return a - b; });
      
      return jsonResponse({
        electores: electores,
        total: electores.length,
        dirigentes: dirigentesList,
        mesas: mesasList,
        filtros: {
          mesa: filtroMesa,
          dirigente: filtroDirigente
        },
        resumen: {
          voto: electores.filter(function(e) { return e.estado === 'voto'; }).length,
          no_voto: electores.filter(function(e) { return e.estado === 'no_voto'; }).length,
          sin_registro: electores.filter(function(e) { return e.estado === 'sin_registro'; }).length
        }
      });
    }

    if (action === 'miembros_mesa_v2') {
      const sheet = ensureMiembrosSheet(ss);
      const miembros = obtenerMiembros(sheet);
      return jsonResponse({ miembros: miembros, total: miembros.length });
    }

    if (action === 'validar_miembro') {
      const cedula = normalizarCedula(e.parameter.cedula);
      const password = normalizarTexto(e.parameter.password);
      const sheet = ensureMiembrosSheet(ss);
      const miembros = obtenerMiembros(sheet);
      const miembro = miembros.find(m => m.cedula === cedula && m.contrasena === password);

      if (!miembro) {
        return jsonResponse({ success: false, error: 'Credenciales invÃ¡lidas' });
      }

      if (miembro.estado !== 'ACTIVO') {
        return jsonResponse({ success: false, error: 'Miembro no habilitado', estado: miembro.estado });
      }

      return jsonResponse({
        success: true,
        miembro: {
          cedula: miembro.cedula,
          nombre: miembro.nombre,
          mesa: miembro.mesa,
          horarioInicio: miembro.horarioInicio,
          horarioCierre: miembro.horarioCierre,
          estado: miembro.estado
        }
      });
    }

    if (action === 'registrar_miembro') {
      const cedula = normalizarCedula(e.parameter.cedula);
      const nombre = normalizarTexto(e.parameter.nombre);
      const password = normalizarTexto(e.parameter.password);
      const mesa = normalizarTexto(e.parameter.mesa);
      const horarioInicio = normalizarTexto(e.parameter.horarioInicio);
      const horarioCierre = normalizarTexto(e.parameter.horarioCierre);
      const estado = normalizarEstadoMiembro(e.parameter.estado);

      if (!cedula || !nombre || !password) {
        return jsonResponse({ success: false, error: 'CÃ©dula, nombre y contraseÃ±a son obligatorios' });
      }

      const sheet = ensureMiembrosSheet(ss);
      const miembros = obtenerMiembros(sheet);
      const existente = miembros.find(m => m.cedula === cedula);
      const row = [[cedula, nombre, password, mesa, horarioInicio, horarioCierre, estado]];

      if (existente) {
        sheet.getRange(existente.rowNumber, 1, 1, 7).setValues(row);
        return jsonResponse({ success: true, accion: 'actualizado', row: existente.rowNumber });
      }

      sheet.appendRow(row[0]);
      return jsonResponse({ success: true, accion: 'creado', row: sheet.getLastRow() });
    }

    if (action === 'registrar_pendiente_qr') {
      const cedula = normalizarCedula(e.parameter.cedula);
      const nombre = normalizarTexto(e.parameter.nombre);
      const mesa = normalizarTexto(e.parameter.mesa);
      const orden = normalizarTexto(e.parameter.orden);
      const telefono = normalizarTexto(e.parameter.telefono);
      const observacion = normalizarTexto(e.parameter.observacion);

      if (!cedula || !nombre) {
        return jsonResponse({ success: false, error: 'Cedula y nombre son obligatorios' });
      }

      const sheet = ensurePendientesQrSheet(ss);
      const pendientes = obtenerPendientesQr(sheet);
      const yaPendiente = pendientes.find(function(item) {
        return item.cedula === cedula && item.estado === 'pendiente';
      });

      if (yaPendiente) {
        return jsonResponse({ success: false, error: 'Ya existe una solicitud pendiente para esta cedula' });
      }

      const id = 'qr_' + new Date().getTime() + '_' + cedula;
      sheet.appendRow([
        id,
        new Date().toISOString(),
        cedula,
        nombre,
        mesa,
        orden,
        telefono,
        observacion,
        'pendiente',
        'qr',
        ''
      ]);

      return jsonResponse({ success: true, id: id, row: sheet.getLastRow() });
    }

    if (action === 'pendientes_qr') {
      const sheet = ensurePendientesQrSheet(ss);
      const pendientes = obtenerPendientesQr(sheet).reverse();
      return jsonResponse({ registros: pendientes, total: pendientes.length });
    }

    if (action === 'aprobar_pendiente_qr') {
      const id = normalizarTexto(e.parameter.id);
      if (!id) {
        return jsonResponse({ success: false, error: 'ID obligatorio' });
      }

      const sheet = ensurePendientesQrSheet(ss);
      const pendientes = obtenerPendientesQr(sheet);
      const pendiente = pendientes.find(function(item) {
        return item.id === id;
      });

      if (!pendiente) {
        return jsonResponse({ success: false, error: 'Solicitud no encontrada' });
      }

      if (pendiente.estado !== 'pendiente') {
        return jsonResponse({ success: false, error: 'La solicitud ya fue procesada' });
      }

      var sheetRegistros = ss.getSheetByName(SHEET_REGISTROS);
      if (!sheetRegistros) {
        sheetRegistros = ss.insertSheet(SHEET_REGISTROS);
        sheetRegistros.appendRow([
          'timestamp', 'cedula', 'nombre', 'mesa', 'orden', 'estado', 'accion', 'dirigente', 'dirigenteNombre', 'origen'
        ]);
        sheetRegistros.getRange(1, 1, 1, 10)
          .setFontWeight('bold')
          .setBackground('#1e3a8a')
          .setFontColor('#ffffff');
        sheetRegistros.setFrozenRows(1);
      }

      sheetRegistros.appendRow([
        new Date().toISOString(),
        pendiente.cedula,
        pendiente.nombre,
        pendiente.mesa,
        pendiente.orden,
        'voto',
        'aprobar_qr',
        'Panel QR',
        'Panel QR',
        'qr'
      ]);

      sheet.getRange(pendiente.rowNumber, 9, 1, 3).setValues([[
        'aprobado',
        pendiente.canal,
        new Date().toISOString()
      ]]);

      actualizarResumen(ss);
      return jsonResponse({ success: true, id: id, tipo: 'aprobado' });
    }
    
    if (action === 'rechazar_pendiente_qr') {
      const id = normalizarTexto(e.parameter.id);
      if (!id) return jsonResponse({ success: false, error: 'ID obligatorio' });

      const sheet = ensurePendientesQrSheet(ss);
      const pendientes = obtenerPendientesQr(sheet);
      const pendiente = pendientes.find(function(item) { return item.id === id; });
      if (!pendiente) return jsonResponse({ success: false, error: 'Solicitud no encontrada' });
      if (pendiente.estado !== 'pendiente') return jsonResponse({ success: false, error: 'La solicitud ya fue procesada' });

      sheet.getRange(pendiente.rowNumber, 9, 1, 3).setValues([['rechazado', pendiente.canal, new Date().toISOString()]]);
      return jsonResponse({ success: true, id: id, tipo: 'rechazado' });
    }

    if (action === 'miembros_mesa') {
      const sheet = ensureMiembrosSheet(ss);
      if (!sheet || sheet.getLastRow() < 2) {
        return jsonResponse({ miembros: [], total: 0 });
      }
      const miembros = obtenerMiembros(sheet);
      return jsonResponse({ miembros: miembros, total: miembros.length });
    }
    
    // NUEVO: Endpoint para registrar voto/no_voto via GET (mÃ¡s confiable en GAS)
    if (action === 'registrar') {
      var data = e.parameter;
      Logger.log('Registrar via GET: ' + JSON.stringify(data));
      
      var esNoVoto = data.estado === 'no_voto';
      
      if (esNoVoto) {
        var sheetNoVoto = ss.getSheetByName(SHEET_NO_VOTO);
        if (!sheetNoVoto) {
          return jsonResponse({ success: false, error: 'Hoja No_voto no encontrada' });
        }
        
        var rowNoVoto = [
          data.timestamp || new Date(),
          data.cedula || '',
          data.mesa || '',
          data.orden || '',
          data.motivo || 'no_voto',
          data.observacion || ''
        ];
        
        sheetNoVoto.appendRow(rowNoVoto);
        return jsonResponse({ success: true, row: sheetNoVoto.getLastRow(), tipo: 'no_voto' });
      } else {
        var sheetRegistros = ss.getSheetByName(SHEET_REGISTROS);
        if (!sheetRegistros) {
          sheetRegistros = ss.insertSheet(SHEET_REGISTROS);
          sheetRegistros.appendRow(['timestamp', 'cedula', 'nombre', 'mesa', 'orden', 'estado', 'accion', 'dirigente', 'dirigenteNombre', 'origen']);
          sheetRegistros.getRange(1, 1, 1, 10).setFontWeight('bold').setBackground('#1e3a8a').setFontColor('#ffffff');
          sheetRegistros.setFrozenRows(1);
        }
        
        var rowRegistros = [
          data.timestamp || new Date().toISOString(),
          data.cedula || '',
          data.nombre || '',
          data.mesa || '',
          data.orden || '',
          data.estado || '',
          data.accion || '',
          data.dirigente || 'Dirigente',
          data.dirigenteNombre || 'Dirigente',
          data.origen || 'web'
        ];
        
        sheetRegistros.appendRow(rowRegistros);
        appendRespuestaFormulario(ss, data);
        actualizarResumen(ss);
        return jsonResponse({ success: true, row: sheetRegistros.getLastRow(), tipo: 'registro' });
      }
    }
    
    return jsonResponse({ success: false, error: 'Unknown action' });
    
  } catch (err) {
    return jsonResponse({ success: false, error: err.message || 'Internal error' });
  }
}

/**
 * Actualiza la hoja de Resumen con estadÃ­sticas por mesa
 */
function actualizarResumen(ss) {
  let sheet = ss.getSheetByName(SHEET_RESUMEN);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_RESUMEN);
    sheet.appendRow(['Mesa', 'Votos', 'Ausentes', 'Controversias', 'Total', 'Participacion %']);
    sheet.getRange(1, 1, 1, 6)
      .setFontWeight('bold')
      .setBackground('#1e3a8a')
      .setFontColor('#ffffff');
    sheet.setFrozenRows(1);
  }
  
  const dataSheet = ss.getSheetByName(SHEET_REGISTROS);
  if (!dataSheet || dataSheet.getLastRow() < 2) return;
  
  const data = dataSheet.getRange(2, 1, dataSheet.getLastRow() - 1, 9).getValues();
  
  // Agrupar por mesa
  const stats = {};
  data.forEach(row => {
    const mesa = parseInt(row[3]) || 0;
    const estado = row[5];
    if (!stats[mesa]) {
      stats[mesa] = { votos: 0, ausentes: 0, controversias: 0, total: 0 };
    }
    if (estado === 'voto') stats[mesa].votos++;
    else if (estado === 'ausente') stats[mesa].ausentes++;
    else if (estado === 'controversia') stats[mesa].controversias++;
    stats[mesa].total++;
  });
  
  // Limpiar y reescribir resumen
  if (sheet.getLastRow() > 1) {
    sheet.getRange(2, 1, sheet.getLastRow() - 1, 6).clear();
  }
  
  Object.keys(stats).sort((a, b) => a - b).forEach(mesa => {
    const s = stats[mesa];
    const participacion = s.total > 0 ? ((s.votos / s.total) * 100).toFixed(1) : 0;
    sheet.appendRow([mesa, s.votos, s.ausentes, s.controversias, s.total, participacion + '%']);
  });
}

/**
 * Se ejecuta automÃ¡ticamente al abrir la hoja
 * Actualiza el resumen sin necesidad de trigger manual
 */
function onOpen() {
  const ss = getTargetSpreadsheet();
  actualizarResumen(ss);
}

/**
 * Utilidad: devuelve JSON con headers CORS
 */
function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

