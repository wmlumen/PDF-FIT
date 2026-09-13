'use strict';
(() => {
 const el=id=>document.getElementById(id);
 async function request(payload) {
  const response=await fetch(gSheetUrl, payload ? {method:'POST',body:JSON.stringify(payload)} : undefined);
  if(!response.ok) throw Error('No se pudo conectar con el servidor.');
  const data=await response.json();
  if(!data || data.ok!==true) throw Error(data.error || 'El servidor todavía no tiene habilitada la asistencia por fechas.');
  return data;
 }
 async function cargar() {
  el('asistencia-recargar').disabled=true;
  el('asistencia-detalle').replaceChildren();
  el('asistencia-resumen').textContent='Cargando asistencias…';
  try {
   const response=await fetch(gSheetUrl+'?action=resumen_asistencia_tic&cedula='+encodeURIComponent(sessionStorage.getItem('current_cedula')||''));
   if(!response.ok) throw Error('No se pudo conectar con el servidor.');
   const data=await response.json();
   if(data.ok!==true || !Array.isArray(data.detalle)) throw Error(data.error || 'El servidor todavía no tiene habilitada la asistencia por fechas.');
   const counts={};
   for(const row of data.detalle){
    counts[row.estado]=(counts[row.estado]||0)+1;
    const tr=document.createElement('tr');
    if(row.estado==='Ausente sin justificar') tr.className='table-danger';
    else if(row.estado==='Ausente justificado') tr.className='table-warning';
    for(const value of [row.fecha.split('-').reverse().join('/'),row.estado,row.origen]){const td=document.createElement('td');td.textContent=value;tr.append(td);}
    el('asistencia-detalle').append(tr);
   }
   el('asistencia-resumen').textContent=data.detalle.length ? `${data.carrera} · ${data.seccion} — Presentes: ${counts.Presente||0}. Ausencias sin justificar: ${counts['Ausente sin justificar']||0}. Justificadas: ${counts['Ausente justificado']||0}. Pendientes: ${counts.Pendiente||0}.` : 'Todavía no hay fechas de clase para tu carrera y sección.';
  } catch(error){el('asistencia-resumen').textContent=error.message;}
  finally {el('asistencia-recargar').disabled=false;}
 }
 function bind(id,build){el(id).addEventListener('submit',async event=>{
  event.preventDefault();const button=event.submitter;button.disabled=true;
  el('asistencia-gestion-estado').textContent='Guardando…';
  try {
   await request({...build(),clave:el('asistencia-clave').value});
   el('asistencia-gestion-estado').textContent='Guardado en el servidor.';await cargar();
  }catch(error){el('asistencia-gestion-estado').textContent=error.message;}
  finally {button.disabled=false;}
 });}
 bind('form-clase',()=>({action:'guardar_clase_tic',fecha:el('clase-fecha').value,carrera:el('clase-carrera').value.trim(),seccion:el('clase-seccion').value.trim()}));
 bind('form-justificar',()=>({action:'justificar_ausencia_tic',fecha:el('justificar-fecha').value,cedula:el('justificar-cedula').value.trim(),motivo:el('justificar-motivo').value.trim()}));
 el('asistencia-recargar').addEventListener('click',cargar);
 cargar();
})();
