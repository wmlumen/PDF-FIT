/**
 * Administración general de la plataforma (/admin/plataforma.html): alta de clientes, plan, módulos habilitados
 * por encima del plan, usuarios del cliente y verificación de pagos informados. API: /api/v3/plataforma/* (superadmin/admin).
 */
const $ = id => document.getElementById(id);
const esc = t => String(t ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const gs = v => `Gs ${Number(v || 0).toLocaleString('es-PY')}`;
const token = () => { try { return localStorage.getItem('snc_api_token') || localStorage.getItem('snc_token'); } catch { return null; } };
const msg = t => { $('pf-msg').textContent = t || ''; };
async function api(url, metodo = 'GET', cuerpo) {
  const r = await fetch(url, { method: metodo, headers: { 'Content-Type': 'application/json', ...(token() ? { Authorization: `Bearer ${token()}` } : {}) }, body: cuerpo ? JSON.stringify(cuerpo) : undefined });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(r.status === 401 ? 'Inicie sesión como administrador de la plataforma.' : (d.error || `Error ${r.status}`));
  return d;
}
let catalogo = null, planes = [], clientes = [], sel = null;
const chip = (t, k = t) => `<span class="pf-chip ${esc(k)}">${esc(t)}</span>`;

function dibujarClientes() {
  $('pf-clientes').innerHTML = clientes.length ? clientes.map(c => `<tr data-id="${esc(c.id)}" class="${c.id === sel ? 'pf-sel' : ''}"><td><b>${esc(c.nombre)}</b><br><small>${esc(c.id)}${c.cod_dpto ? ` · ${esc(c.cod_dpto)}|${esc(c.cod_distrito)}` : ''}</small></td>
    <td>${esc(c.tipo)}</td><td>${esc(c.plan?.nombre || '—')}</td><td>${chip(c.estado)}</td><td>${chip(c.pago.estado.replace('_', ' '), c.pago.estado)}</td><td>${c.modulos.length}</td></tr>`).join('')
    : '<tr><td colspan="6" class="pf-vacio">Sin clientes todavía.</td></tr>';
  $('pf-clientes').querySelectorAll('tr[data-id]').forEach(tr => tr.addEventListener('click', () => { sel = tr.dataset.id; dibujarClientes(); ficha(clientes.find(c => c.id === sel)); }));
}

function ficha(c) {
  const nuevo = !c;
  c = c || { id: '', tipo: 'municipalidad', nombre: '', estado: 'prueba', plan_id: 'municipal', ajustes: [], usuarios: [], pagos: [], modulos: [], pago: { estado: '—', detalle: '' } };
  const op = (vals, v) => vals.map(x => `<option value="${esc(x[0])}" ${String(x[0]) === String(v ?? '') ? 'selected' : ''}>${esc(x[1])}</option>`).join('');
  const plan = planes.find(p => p.id === c.plan_id);
  $('pf-detalle').innerHTML = `<h2>${nuevo ? 'Alta de cliente' : esc(c.nombre)}</h2>
    <form class="pf-form" id="pf-form-cliente">
      <label>Identificador<input name="id" value="${esc(c.id)}" ${nuevo ? '' : 'readonly'} placeholder="villa_hayes" required></label>
      <label>Tipo<select name="tipo">${op(catalogo.tipos.map(t => [t, t]), c.tipo)}</select></label>
      <label>Nombre<input name="nombre" value="${esc(c.nombre)}" required></label>
      <label>RUC<input name="ruc" value="${esc(c.ruc)}"></label>
      <label>Email de contacto<input name="contacto_email" type="email" value="${esc(c.contacto_email)}"></label>
      <label>Teléfono<input name="contacto_tel" value="${esc(c.contacto_tel)}"></label>
      <label>Municipio (carpeta)<input name="muni_id" value="${esc(c.muni_id)}" placeholder="villa_hayes"></label>
      <label>Dpto (letra)<input name="cod_dpto" value="${esc(c.cod_dpto)}" maxlength="1" placeholder="P"></label>
      <label>Distrito (n°)<input name="cod_distrito" type="number" value="${esc(c.cod_distrito)}" placeholder="1"></label>
      <label>Plan<select name="plan_id">${op(planes.map(p => [p.id, `${p.nombre} · ${gs(p.precio_mensual)}/mes`]), c.plan_id)}</select></label>
      <label>Estado<select name="estado">${op([['prueba', 'En prueba'], ['activo', 'Activo'], ['suspendido', 'Suspendido']], c.estado)}</select></label>
      <label>Prueba hasta<input name="prueba_hasta" type="date" value="${esc(c.prueba_hasta)}"></label>
      <label>Notas<textarea name="notas" rows="2">${esc(c.notas)}</textarea></label>
      <div class="pf-fila"><button class="pf-boton" type="submit">${nuevo ? 'Dar de alta' : 'Guardar cambios'}</button></div>
    </form>
    ${nuevo ? '' : `
    <h2>Pago</h2><p>${chip(c.pago.estado.replace('_', ' '), c.pago.estado)} ${esc(c.pago.detalle)}</p>
    <h2>Módulos (plan ${esc(plan?.nombre || '—')})</h2>
    <div class="pf-modulos">${Object.entries(catalogo.modulos).map(([k, n]) => {
      const aj = c.ajustes.find(a => a.modulo === k), enPlan = plan?.modulos.includes(k), on = c.modulos.includes(k);
      return `<div class="pf-mod ${on ? 'on' : ''}"><div><b>${esc(n)}</b><br><small>${enPlan ? 'Incluido en el plan' : 'No incluido en el plan'}${on ? ' · habilitado' : ' · no habilitado'}</small></div>
        <select data-mod="${k}" aria-label="Ajuste de ${esc(n)}"><option value="plan" ${!aj ? 'selected' : ''}>Según plan</option><option value="si" ${aj?.habilitado ? 'selected' : ''}>Habilitar</option><option value="no" ${aj && !aj.habilitado ? 'selected' : ''}>Quitar</option></select></div>`; }).join('')}</div>
    <h2>Usuarios del cliente</h2>
    <table class="pf-tabla"><tbody>${c.usuarios.map(u => `<tr><td>${esc(u.email)}</td><td>${esc(u.rol)}</td><td><button type="button" class="pf-boton sec" data-quitar="${esc(u.email)}">Quitar</button></td></tr>`).join('') || '<tr><td class="pf-vacio">Sin usuarios.</td></tr>'}</tbody></table>
    <form class="pf-fila" id="pf-form-usuario"><input name="email" type="email" placeholder="email" required aria-label="Email"><select name="rol" aria-label="Rol">${catalogo.roles.map(r => `<option>${r}</option>`).join('')}</select><button class="pf-boton" type="submit">Agregar</button></form>
    <h2>Pagos</h2>
    <table class="pf-tabla"><tbody>${c.pagos.map(p => `<tr><td>${esc(p.periodo)}</td><td>${gs(p.monto)}</td><td>${esc(p.comprobante || '')}</td><td>${chip(p.estado)}</td></tr>`).join('') || '<tr><td class="pf-vacio">Sin pagos informados.</td></tr>'}</tbody></table>`}`;
  $('pf-form-cliente').addEventListener('submit', async e => {
    e.preventDefault();
    try { const d = Object.fromEntries(new FormData(e.target)); const r = await api('/api/v3/plataforma/clientes', 'POST', d); sel = r.id; msg(`Cliente ${r.nombre} guardado.`); await cargar(); }
    catch (err) { msg(err.message); }
  });
  if (nuevo) return;
  $('pf-detalle').querySelectorAll('select[data-mod]').forEach(s => s.addEventListener('change', async () => {
    try { await api(`/api/v3/plataforma/clientes/${encodeURIComponent(c.id)}/modulos`, 'POST', { modulo: s.dataset.mod, habilitado: s.value === 'plan' ? null : s.value === 'si' }); msg('Módulos actualizados.'); await cargar(); }
    catch (err) { msg(err.message); }
  }));
  $('pf-form-usuario').addEventListener('submit', async e => {
    e.preventDefault();
    try { await api(`/api/v3/plataforma/clientes/${encodeURIComponent(c.id)}/usuarios`, 'POST', Object.fromEntries(new FormData(e.target))); msg('Usuario agregado.'); await cargar(); }
    catch (err) { msg(err.message); }
  });
  $('pf-detalle').querySelectorAll('button[data-quitar]').forEach(b => b.addEventListener('click', async () => {
    try { await api(`/api/v3/plataforma/clientes/${encodeURIComponent(c.id)}/usuarios/${encodeURIComponent(b.dataset.quitar)}`, 'DELETE'); msg('Usuario quitado.'); await cargar(); }
    catch (err) { msg(err.message); }
  }));
}

async function cargarPagos() {
  const ps = await api('/api/v3/plataforma/pagos/pendientes');
  $('pf-pagos').innerHTML = ps.length ? ps.map(p => `<tr><td>${esc(p.cliente)}</td><td>${esc(p.periodo)}</td><td>${gs(p.monto)}</td><td>${esc(p.medio || '')} · ${esc(p.comprobante || '')}</td><td>${esc(p.cargado_por || '')}<br><small>${esc(p.cargado_en)}</small></td>
    <td><button type="button" class="pf-boton ok" data-p="${p.id}" data-e="verificado">Verificar</button> <button type="button" class="pf-boton mal" data-p="${p.id}" data-e="rechazado">Rechazar</button></td></tr>`).join('')
    : '<tr><td colspan="6" class="pf-vacio">No hay pagos pendientes de verificación.</td></tr>';
  $('pf-pagos').querySelectorAll('button[data-p]').forEach(b => b.addEventListener('click', async () => {
    const obs = b.dataset.e === 'rechazado' ? (window.prompt ? window.prompt('Motivo del rechazo') : '') : 'Comprobante verificado';
    try { await api(`/api/v3/plataforma/pagos/${b.dataset.p}`, 'POST', { estado: b.dataset.e, observacion: obs }); msg(`Pago ${b.dataset.e}.`); await cargar(); }
    catch (err) { msg(err.message); }
  }));
}

function dibujarPlanes() {
  $('pf-planes').innerHTML = planes.map(p => `<form class="pf-card" data-plan="${esc(p.id)}"><div class="pf-form"><label>Plan<input name="nombre" value="${esc(p.nombre)}"></label><label>Precio mensual (Gs)<input name="precio_mensual" type="number" min="0" value="${p.precio_mensual}"></label></div>
    <div class="pf-modulos">${Object.entries(catalogo.modulos).map(([k, n]) => `<label class="pf-mod ${p.modulos.includes(k) ? 'on' : ''}"><span>${esc(n)}</span><input type="checkbox" name="m" value="${k}" ${p.modulos.includes(k) ? 'checked' : ''}></label>`).join('')}</div>
    <div class="pf-fila"><button class="pf-boton" type="submit">Guardar plan</button></div></form>`).join('');
  $('pf-planes').querySelectorAll('form[data-plan]').forEach(f => f.addEventListener('submit', async e => {
    e.preventDefault();
    const fd = new FormData(f);
    try { await api('/api/v3/plataforma/planes', 'POST', { id: f.dataset.plan, nombre: fd.get('nombre'), precio_mensual: Number(fd.get('precio_mensual')), modulos: fd.getAll('m') }); msg('Plan guardado.'); await cargar(); }
    catch (err) { msg(err.message); }
  }));
}

async function cargar() {
  try {
    catalogo = catalogo || await api('/api/v3/plataforma/catalogo');
    [planes, clientes] = await Promise.all([api('/api/v3/plataforma/planes'), api('/api/v3/plataforma/clientes')]);
    dibujarClientes(); dibujarPlanes(); await cargarPagos();
    if (sel) ficha(clientes.find(c => c.id === sel));
  } catch (e) { msg(e.message); }
}
document.querySelectorAll('nav button[data-v]').forEach(b => b.addEventListener('click', () => {
  document.querySelectorAll('nav button[data-v]').forEach(x => x.classList.toggle('activo', x === b));
  document.querySelectorAll('section[data-vista]').forEach(s => { s.hidden = s.dataset.vista !== b.dataset.v; });
}));
$('pf-nuevo').addEventListener('click', () => { sel = null; dibujarClientes(); ficha(null); });
cargar();
