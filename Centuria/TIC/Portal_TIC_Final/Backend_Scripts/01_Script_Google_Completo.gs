/**
 * SCRIPT BACKEND CENTURIA - VERSIÓN 03
 * Sistema multi-rol: una cédula puede tener múltiples roles
 * (Alumno en una carrera, Docente en otra, Admin, Académico)
 * 
 * Hojas esperadas:
 * - RegistroAlumnos: [Cédula, Nombre, Apellido, Email, Grado, Carrera, Sección]
 * - Roles: [Cédula, Nombre, Rol, Carrera, Sección, Asignatura, Estado, FechaAsignación, AsignadoPor]
 * - Asistencias, ProgresoUnidades, Notas (las mismas de siempre)
 */

function doGet(e) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var action = e.parameter.action;

  // ── Asistencia TIC ──
  if(action === 'resumen_asistencia_tic') {
    try { return responderJSON(ticResumen(ss, e.parameter.cedula)); }
    catch(error) { return responderJSON({ok:false,error:error.message}); }
  }
  
  // ── Verificar alumno (datos básicos) ──
  if (action === 'verificar_alumno') {
    var cedula = e.parameter.cedula;
    var sheetAlumnos = ss.getSheetByName('RegistroAlumnos');
    if(!sheetAlumnos) return responderJSON({existe: false});
    
    var data = sheetAlumnos.getDataRange().getValues();
    for (var i = 1; i < data.length; i++) {
      if (data[i][0].toString() === cedula.toString()) {
        var nombre = data[i][1] || '';
        var apellido = data[i][2] || '';
        var nombreCompleto = (nombre + ' ' + apellido).trim();
        return responderJSON({
          existe: true,
          nombre: nombreCompleto || nombre,
          nombre_separado: { nombre: nombre, apellido: apellido },
          email: data[i][3] || '',
          grado: data[i][4] || '',
          carrera: data[i][5] || '',
          seccion: data[i][6] || ''
        });
      }
    }
    return responderJSON({existe: false});
  }

  // ── Verificar roles de una cédula ──
  if (action === 'verificar_roles') {
    var cedula = e.parameter.cedula;
    var roles = obtenerRoles(ss, cedula);
    return responderJSON({ roles: roles });
  }

  // ── Listar cursos/asignaturas según el rol ──
  if (action === 'listar_cursos') {
    var cedula = e.parameter.cedula;
    var rol = e.parameter.rol || 'alumno';
    var carrera = e.parameter.carrera || '';
    var cursos = obtenerCursosPorRol(ss, cedula, rol, carrera);
    return responderJSON({ cursos: cursos });
  }
  
  // ── Notas (fallback) ──
  var sheetNotas = ss.getSheetByName('Notas') || ss.getActiveSheet();
  var dataNotas = sheetNotas.getDataRange().getValues();
  var result = [];
  for (var j = 1; j < dataNotas.length; j++) {
    var row = dataNotas[j];
    if (!row[0]) continue;
    result.push({
      cedula: row[0].toString(), nombre: row[1],
      asistencia: row[2] || 0, parcial1: row[3] || 0, parcial2: row[4] || 0, final: row[5] || 0
    });
  }
  return responderJSON(result);
}

function doPost(e) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var data = JSON.parse(e.postData.contents);

  // ── Asistencia TIC ──
  if(data.action === 'guardar_clase_tic' || data.action === 'justificar_ausencia_tic') {
    try { return responderJSON(ticGuardar(ss, data)); }
    catch(error) { return responderJSON({ok:false,error:error.message}); }
  }

  // ── 1. REGISTRAR ALUMNO NUEVO ──
  if (data.action === 'registrar_alumno') {
    var sheetAlumnos = ss.getSheetByName('RegistroAlumnos');
    if(!sheetAlumnos) {
      sheetAlumnos = ss.insertSheet('RegistroAlumnos');
      sheetAlumnos.appendRow(['Cédula', 'Nombre', 'Apellido', 'Email', 'Grado', 'Carrera', 'Sección']);
    }
    var nombre = '', apellido = '';
    if(data.nombre_separado) {
      nombre = data.nombre_separado.nombre || '';
      apellido = data.nombre_separado.apellido || '';
    } else if(data.nombre) {
      var partes = data.nombre.trim().split(/\s+/);
      nombre = partes[0] || '';
      apellido = partes.slice(1).join(' ');
    }
    sheetAlumnos.appendRow([
      data.cedula, nombre, apellido, data.email || '',
      data.grado || '', data.carrera || '', data.seccion || ''
    ]);

    // Registrar también en hoja Roles como "alumno" por defecto
    var sheetRoles = ss.getSheetByName('Roles');
    if(!sheetRoles) {
      sheetRoles = ss.insertSheet('Roles');
      sheetRoles.appendRow(['Cédula', 'Nombre', 'Rol', 'Carrera', 'Sección', 'Asignatura', 'Estado', 'FechaAsignación', 'AsignadoPor']);
    }
    var ts = new Date().toLocaleString('es-ES', {timeZone: 'America/Asuncion'});
    sheetRoles.appendRow([
      data.cedula, nombre + ' ' + apellido, 'alumno',
      data.carrera || '', data.seccion || '', data.asignatura || 'TIC',
      'activo', ts, 'auto-registro'
    ]);

    return responderJSON({status: "Éxito", mensaje: "Alumno y rol registrado correctamente"});
  } 
  
  // ── 2. ASIGNAR ROL (solo admin/docente) ──
  if (data.action === 'asignar_rol') {
    var sheetRoles = ss.getSheetByName('Roles');
    if(!sheetRoles) {
      sheetRoles = ss.insertSheet('Roles');
      sheetRoles.appendRow(['Cédula', 'Nombre', 'Rol', 'Carrera', 'Sección', 'Asignatura', 'Estado', 'FechaAsignación', 'AsignadoPor']);
    }
    var ts2 = new Date().toLocaleString('es-ES', {timeZone: 'America/Asuncion'});
    sheetRoles.appendRow([
      data.cedula,
      data.nombre || '',
      data.rol || 'alumno',
      data.carrera || '',
      data.seccion || '',
      data.asignatura || '',
      data.estado || 'activo',
      ts2,
      data.asignado_por || 'admin'
    ]);
    return responderJSON({status: "Éxito", mensaje: "Rol asignado correctamente"});
  }

  // ── 3. DESACTIVAR ROL ──
  if (data.action === 'desactivar_rol') {
    var sheetRoles2 = ss.getSheetByName('Roles');
    if(sheetRoles2) {
      var rolesData = sheetRoles2.getDataRange().getValues();
      for(var r = 1; r < rolesData.length; r++) {
        if(rolesData[r][0].toString() === data.cedula.toString() &&
           rolesData[r][2] === data.rol &&
           rolesData[r][3] === data.carrera) {
          sheetRoles2.getRange(r + 1, 7).setValue('inactivo');
          return responderJSON({status: "Éxito", mensaje: "Rol desactivado"});
        }
      }
    }
    return responderJSON({status: "Error", mensaje: "Rol no encontrado"});
  }

  // ── 4. MARCAR ASISTENCIA ──
  if (data.action === 'marcar_asistencia') {
    var sheetAsistencia = ss.getSheetByName('Asistencias');
    if(!sheetAsistencia) {
      sheetAsistencia = ss.insertSheet('Asistencias');
      sheetAsistencia.appendRow(['Fecha/Hora', 'Cédula', 'Unidad/Lugar', 'Observación']);
    }
    var ts3 = new Date().toLocaleString('es-ES', {timeZone: 'America/Asuncion'}); 
    sheetAsistencia.appendRow([ts3, data.cedula, data.unidad || "Presencial", data.observacion || ""]);
    return responderJSON({status: "Éxito"});
  }

  // ── 5. REGISTRAR PROGRESO ──
  if (data.action === 'registrar_progreso') {
    var sheetProgreso = ss.getSheetByName('ProgresoUnidades');
    if(!sheetProgreso) {
      sheetProgreso = ss.insertSheet('ProgresoUnidades');
      sheetProgreso.appendRow(['Fecha/Hora', 'Cédula', 'Unidad Terminada', 'Estado']);
    }
    var ts4 = new Date().toLocaleString('es-ES', {timeZone: 'America/Asuncion'});
    sheetProgreso.appendRow([ts4, data.cedula, data.unidad, "Completado"]);
    return responderJSON({status: "Éxito"});
  }

  // ── 6. GUARDAR CALIFICACIONES ──
  if (data.action === 'guardar_nota') {
    var sheetNotas = ss.getSheetByName('Notas');
    if(sheetNotas) {
      var notasData = sheetNotas.getDataRange().getValues();
      var colIndex = -1;
      if(data.evaluacion === 'parcial1') colIndex = 4;
      if(data.evaluacion === 'parcial2') colIndex = 5;
      if(data.evaluacion === 'final') colIndex = 6;
      if(colIndex !== -1) {
        for(var k = 1; k < notasData.length; k++) {
          if(notasData[k][0].toString() === data.cedula.toString()) {
            sheetNotas.getRange(k + 1, colIndex).setValue(data.puntaje);
            return responderJSON({status: "Nota Guardada"});
          }
        }
      }
    }
    return responderJSON({status: "Error: Alumno no encontrado en pestaña Notas"});
  }

  // ── 7. REGISTRAR ACCESO A CURSO ──
  if (data.action === 'registrar_acceso_curso') {
    return responderJSON({status: "Acceso registrado"});
  }
}

// ═══ FUNCIONES AUXILIARES ═══

/**
 * Obtener todos los roles activos de una cédula
 */
function obtenerRoles(ss, cedula) {
  var sheetRoles = ss.getSheetByName('Roles');
  if(!sheetRoles) return [];
  
  var data = sheetRoles.getDataRange().getValues();
  var roles = [];
  
  for (var i = 1; i < data.length; i++) {
    if (data[i][0].toString() === cedula.toString() && data[i][6] === 'activo') {
      roles.push({
        cedula: data[i][0].toString(),
        nombre: data[i][1] || '',
        rol: data[i][2] || 'alumno',
        carrera: data[i][3] || '',
        seccion: data[i][4] || '',
        asignatura: data[i][5] || '',
        estado: data[i][6] || 'activo'
      });
    }
  }
  
  // Si no hay roles en la hoja Roles, crear uno por defecto desde RegistroAlumnos
  if (roles.length === 0) {
    var sheetAlumnos = ss.getSheetByName('RegistroAlumnos');
    if(sheetAlumnos) {
      var alumnos = sheetAlumnos.getDataRange().getValues();
      for (var j = 1; j < alumnos.length; j++) {
        if (alumnos[j][0].toString() === cedula.toString()) {
          roles.push({
            cedula: cedula,
            nombre: (alumnos[j][1] + ' ' + alumnos[j][2]).trim(),
            rol: 'alumno',
            carrera: alumnos[j][5] || '',
            seccion: alumnos[j][6] || '',
            asignatura: 'TIC',
            estado: 'activo'
          });
          break;
        }
      }
    }
  }
  
  return roles;
}

/**
 * Obtener cursos/asignaturas según el rol y carrera
 */
function obtenerCursosPorRol(ss, cedula, rol, carrera) {
  if (rol === 'admin' || rol === 'academico') {
    // Admin/Académico ve TODAS las asignaturas
    return [
      { id: 'TIC', nombre: 'TIC - Tecnología de la Información y Comunicación', codigo: 'ADE18', seccion: '', color: '#007A33', icono: 'bi-laptop', rol: rol },
      { id: 'ADMIN', nombre: 'Panel de Administración', codigo: 'ADM', seccion: '', color: '#2D2D2D', icono: 'bi-gear', rol: 'admin' }
    ];
  }
  
  if (rol === 'docente') {
    // Docente ve las asignaturas que dicta
    var sheetRoles = ss.getSheetByName('Roles');
    var cursos = [];
    if(sheetRoles) {
      var data = sheetRoles.getDataRange().getValues();
      for (var i = 1; i < data.length; i++) {
        if (data[i][0].toString() === cedula.toString() && data[i][2] === 'docente' && data[i][6] === 'activo') {
          var asignatura = data[i][5] || 'TIC';
          var car = data[i][3] || '';
          var sec = data[i][4] || '';
          cursos.push({
            id: asignatura.replace(/\s+/g, '_'),
            nombre: asignatura + (car ? ' - ' + car : ''),
            codigo: car || 'DOC',
            seccion: sec,
            color: '#00B140',
            icono: 'bi-easel',
            rol: 'docente'
          });
        }
      }
    }
    if (cursos.length === 0) {
      cursos.push({ id: 'TIC', nombre: 'TIC - Tecnología de la Información', codigo: 'ADE18', seccion: '', color: '#00B140', icono: 'bi-easel', rol: 'docente' });
    }
    return cursos;
  }
  
  // Alumno: ver sus asignaturas
  var sheetRoles2 = ss.getSheetByName('Roles');
  var cursosAlumno = [];
  if(sheetRoles2) {
    var data2 = sheetRoles2.getDataRange().getValues();
    for (var k = 1; k < data2.length; k++) {
      if (data2[k][0].toString() === cedula.toString() && data2[k][2] === 'alumno' && data2[k][6] === 'activo') {
        var asig = data2[k][5] || 'TIC';
        var carr = data2[k][3] || '';
        var sec2 = data2[k][4] || '';
        var icono = asig.toUpperCase().includes('TIC') ? 'bi-laptop' : 'bi-book';
        cursosAlumno.push({
          id: asig.replace(/\s+/g, '_'),
          nombre: asig + (carr ? ' - ' + carr : ''),
          codigo: carr || 'ADE18',
          seccion: sec2,
          color: '#007A33',
          icono: icono,
          rol: 'alumno'
        });
      }
    }
  }
  
  // Fallback si no hay roles registrados
  if (cursosAlumno.length === 0) {
    cursosAlumno.push({ id: 'TIC', nombre: 'TIC - Tecnología de la Información y Comunicación', codigo: 'ADE18', seccion: '', color: '#007A33', icono: 'bi-laptop', rol: 'alumno' });
  }
  
  return cursosAlumno;
}

function responderJSON(objeto) {
  return ContentService.createTextOutput(JSON.stringify(objeto)).setMimeType(ContentService.MimeType.JSON);
}
