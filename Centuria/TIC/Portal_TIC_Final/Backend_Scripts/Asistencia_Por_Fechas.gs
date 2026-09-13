/** Asistencia por fechas: módulo aditivo para el backend TIC. */
function ticFecha(value) {
  if (value instanceof Date) return Utilities.formatDate(value, 'America/Asuncion', 'yyyy-MM-dd');
  var s = String(value || '').trim();
  var m = s.match(/^(\d{4})-(\d{2})-(\d{2})(?:$|T)/);
  if (!m) { var d = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\D|$)/); if(d) m = [d[0],d[3],('0'+d[2]).slice(-2),('0'+d[1]).slice(-2)]; }
  if (!m) return '';
  var key=m[1]+'-'+m[2]+'-'+m[3], date=new Date(key+'T12:00:00Z');
  return !isNaN(date.getTime()) && date.toISOString().slice(0,10)===key ? key : '';
}
function ticFilas(ss, nombre) {
  var s=ss.getSheetByName(nombre); return s ? s.getDataRange().getValues().slice(1) : [];
}
function ticResumen(ss, cedula) {
  var alumnos=ticFilas(ss,'RegistroAlumnos'), alumno=alumnos.find(function(r){return String(r[0])===String(cedula);});
  if(!alumno || !alumno[3] || !alumno[4]) throw Error('Falta carrera o sección en RegistroAlumnos. El docente debe completar esos datos.');
  var carrera=String(alumno[3]).trim(), seccion=String(alumno[4]).trim();
  var grupo=new Set(alumnos.filter(function(r){return String(r[3]).trim()===carrera && String(r[4]).trim()===seccion;}).map(function(r){return String(r[0]);}));
  var dias={}, propios=new Set(), justificados=new Set(), hoy=ticFecha(new Date());
  ticFilas(ss,'ClasesTIC').forEach(function(r){var f=ticFecha(r[0]); if(f && String(r[1]).trim()===carrera && String(r[2]).trim()===seccion) dias[f]='Docente';});
  ticFilas(ss,'Asistencias').forEach(function(r){
    var f=ticFecha(r[0]);
    // Los accesos virtuales y avances de unidades no acreditan una clase presencial.
    if(!f || String(r[2]).trim().toLowerCase()!=='presencial' || !grupo.has(String(r[1]))) return;
    dias[f]=dias[f] ? 'Docente y asistencia del grupo' : 'Asistencia del grupo';
    if(String(r[1])===String(cedula)) propios.add(f);
  });
  ticFilas(ss,'JustificacionesTIC').forEach(function(r){if(String(r[1])===String(cedula)) justificados.add(ticFecha(r[0]));});
  var detalle=Object.keys(dias).sort().map(function(f){return {fecha:f,origen:dias[f],estado:propios.has(f)?'Presente':justificados.has(f)?'Ausente justificado':f>=hoy?'Pendiente':'Ausente sin justificar'};});
  return {ok:true,carrera:carrera,seccion:seccion,detalle:detalle};
}
function ticGuardar(ss, data) {
  var clave=PropertiesService.getScriptProperties().getProperty('TIC_DOCENTE_KEY');
  if(!clave || data.clave!==clave) throw Error('Clave docente incorrecta o no configurada.');
  var fecha=ticFecha(data.fecha);
  if(!fecha || fecha!==data.fecha) throw Error('Fecha inválida.');
  var nombre, headers, fila, coincide;
  function texto(v){var t=String(v||'').trim(); if(!t || t.length>300 || /^[=+@\-]/.test(t)) throw Error('Texto obligatorio o no válido.'); return t;}
  if(data.action==='guardar_clase_tic') {
    var carrera=texto(data.carrera), seccion=texto(data.seccion);
    nombre='ClasesTIC'; headers=['Fecha','Carrera','Sección']; fila=[fecha,carrera,seccion];
    coincide=function(r){return ticFecha(r[0])===fecha && String(r[1])===carrera && String(r[2])===seccion;};
  } else {
    if(fecha>ticFecha(new Date())) throw Error('No se justifican fechas futuras.');
    var cedula=texto(data.cedula), motivo=texto(data.motivo);
    if(!ticResumen(ss,cedula).detalle.some(function(r){return r.fecha===fecha && r.estado!=='Presente';})) throw Error('No existe una ausencia para esa fecha.');
    nombre='JustificacionesTIC'; headers=['Fecha','Cédula','Motivo']; fila=[fecha,cedula,motivo];
    coincide=function(r){return ticFecha(r[0])===fecha && String(r[1])===cedula;};
  }
  var lock=LockService.getScriptLock(); lock.waitLock(10000);
  try {
    var sheet=ss.getSheetByName(nombre); if(!sheet){sheet=ss.insertSheet(nombre);sheet.appendRow(headers);}
    var rows=ticFilas(ss,nombre), index=rows.findIndex(coincide);
    sheet.getRange(index<0 ? sheet.getLastRow()+1 : index+2,1,1,fila.length).setNumberFormat('@').setValues([fila]);
  } finally {lock.releaseLock();}
  return {ok:true};
}
