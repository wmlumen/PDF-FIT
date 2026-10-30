/**
 * Administración del municipio (/municipal/admin.html): el administrador del cliente ve su plan, estado de pago y
 * módulos, da de alta técnicos y usuarios de consulta, e informa pagos para que la plataforma los verifique.
 * API: /api/v3/mi-cliente/* (requiere ser admin_cliente).
 */
const $ = id => document.getElementById(id);
const esc = t => String(t ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const gs = v => `Gs ${Number(v || 0).toLocaleString('es-PY')}`;
const token = () => { try { return localStorage.getItem('snc_api_token') || localStorage.getItem('snc_token'); } catch { return null; } };
const msg = t => { $('pf-msg').textContent = t || ''; };
const chip = (t, k = t) => `<span class="pf-chip ${esc(k)}">${esc(t)}</span>`;
async function api(url, metodo = 'GET', cuerpo) {
  const r = await fetch(url, { method: metodo, headers: { 'Content-Type': 'application/json', ...(token() ? { Authorization: `Bearer ${token()}` } : {}) }, body: cuerpo ? JSON.stringify(cuerpo) : undefined });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(r.status === 401 ? 'Inicie sesión con su usuario de administrador del municipio.' : (d.error || `Error ${r.status}`));
  return d;
}
const NOMBRES = { visor_premium: 'Visor catastral Premium', parcelas_dnit: 'Parcelas con Cta. Cte. y ficha DNIT', edificios: 'Edificios frente a la liquidación', relevamiento: 'Relevamiento de construcciones',
  informe_lote: 'Informe municipal del lote', tablero_municipal: 'Tablero de gestión catastral', analisis_territorial: 'Análisis territorial', listas_trabajo: 'Listas de trabajo CSV', notarial: 'Portal notarial', gps_campo: 'GPS de campo' };

async function cargar() {
  try {
    const c = await api('/api/v3/mi-cliente');
    $('ma-titulo').textContent = `Administración · ${c.nombre}`;
    $('ma-sub').textContent = `${c.tipo}${c.cod_dpto ? ` · distrito ${c.cod_dpto}|${c.cod_distrito}` : ''}`;
    $('ma-plan').innerHTML = `<p><b>${esc(c.plan?.nombre || 'Sin plan')}</b> · ${gs(c.plan?.precio_mensual)}/mes</p><p>${chip(c.pago.estado.replace('_', ' '), c.pago.estado)} ${esc(c.pago.detalle)}</p>
      ${c.pago.estado === 'vencido' ? '<p class="pf-msg">Con el pago vencido solo quedan habilitados los módulos básicos. Informe el pago abajo.</p>' : ''}`;
    $('ma-modulos').innerHTML = Object.entries(NOMBRES).map(([k, n]) => `<div class="pf-mod ${c.modulos.includes(k) ? 'on' : ''}"><span>${esc(n)}</span>${chip(c.modulos.includes(k) ? 'habilitado' : 'no incluido', c.modulos.includes(k) ? 'activo' : '')}</div>`).join('');
    $('ma-usuarios').innerHTML = c.usuarios.map(u => `<tr><td>${esc(u.email)}</td><td>${esc(u.rol)}</td><td><small>${esc(u.alta_en || '')}</small></td><td>${u.rol === 'admin_cliente' ? '' : `<button type="button" class="pf-boton sec" data-quitar="${esc(u.email)}">Quitar</button>`}</td></tr>`).join('') || '<tr><td colspan="4" class="pf-vacio">Sin usuarios.</td></tr>';
    $('ma-pagos').innerHTML = c.pagos.map(p => `<tr><td>${esc(p.periodo)}</td><td>${gs(p.monto)}</td><td>${esc(p.comprobante || '')}</td><td>${chip(p.estado)}${p.observacion ? `<br><small>${esc(p.observacion)}</small>` : ''}</td></tr>`).join('') || '<tr><td colspan="4" class="pf-vacio">Sin pagos informados.</td></tr>';
    $('ma-usuarios').querySelectorAll('button[data-quitar]').forEach(b => b.addEventListener('click', async () => {
      try { await api(`/api/v3/mi-cliente/usuarios/${encodeURIComponent(b.dataset.quitar)}`, 'DELETE'); msg('Usuario quitado.'); cargar(); } catch (e) { msg(e.message); }
    }));
  } catch (e) { msg(e.message); }
}
$('ma-form-usuario').addEventListener('submit', async e => {
  e.preventDefault();
  try { await api('/api/v3/mi-cliente/usuarios', 'POST', Object.fromEntries(new FormData(e.target))); msg('Usuario agregado.'); e.target.reset(); cargar(); } catch (err) { msg(err.message); }
});
$('ma-form-pago').addEventListener('submit', async e => {
  e.preventDefault();
  const d = Object.fromEntries(new FormData(e.target)); d.monto = Number(d.monto);
  try { await api('/api/v3/mi-cliente/pagos', 'POST', d); msg('Pago informado: queda pendiente de verificación por la plataforma.'); e.target.reset(); cargar(); } catch (err) { msg(err.message); }
});
cargar();
