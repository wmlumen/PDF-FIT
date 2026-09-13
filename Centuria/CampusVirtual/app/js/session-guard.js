/**
 * SESSION GUARD - Campus Virtual Centuria
 * - Botón "Salir" → limpia sesión y vuelve al index
 * - Sin actividad 1 hora → modal de confirmación
 * - Sin respuesta 1 min → auto-logout
 */
(function(){
  // No ejecutar en el index (login)
  if(location.pathname.endsWith('index.html') || location.pathname.endsWith('/')) return;

  const TIMEOUT_MS = 60 * 60 * 1000; // 1 hora
  const WARN_MS    = 60 * 1000;       // 1 min para responder
  let timerWarn    = null;
  let timerLogout  = null;
  let lastActivity = Date.now();

  // ── Función de logout completa ──
  function doLogout(){
    sessionStorage.clear();
    // Limpiar también localStorage de marcas leído
    try {
      Object.keys(localStorage).forEach(k => {
        if(k.startsWith('marcado_') || k.startsWith('leccion_') || k.startsWith('unidad_')) {
          localStorage.removeItem(k);
        }
      });
    } catch(e){}
    location.replace('../index.html');
  }

  // ── Ruta absoluta al index.html ──
  function getIndexPath(){
    // Buscar index.html subiendo directorios hasta encontrarlo
    const parts = location.pathname.split('/').filter(Boolean);
    for(let i = parts.length - 1; i >= 0; i--){
      if(parts[i] === 'Portal_TIC_Final' || parts[i] === 'TIC'){
        // Reconstruir hasta ese punto + index.html
        const base = parts.slice(0, i + 1).join('/');
        return '/' + base + '/index.html';
      }
    }
    // Fallback: si no encontramos la carpeta raíz, usar path relativo
    const depth = parts.length;
    return depth > 1 ? '../'.repeat(depth - 1) + 'index.html' : 'index.html';
  }

  function doLogoutSmart(){
    sessionStorage.clear();
    try {
      Object.keys(localStorage).forEach(k => {
        if(k.startsWith('marcado_') || k.startsWith('leccion_') || k.startsWith('unidad_')) {
          localStorage.removeItem(k);
        }
      });
    } catch(e){}
    location.replace(getIndexPath());
  }

  // ── Resetear timer de inactividad ──
  function resetTimer(){
    lastActivity = Date.now();
    clearTimeout(timerWarn);
    clearTimeout(timerLogout);
    // Programar alerta a los 59 min
    timerWarn = setTimeout(showWarning, TIMEOUT_MS - 60000);
    // Ocultar modal si estaba visible
    const modal = document.getElementById('session-timeout-modal');
    if(modal) modal.style.display = 'none';
  }

  // ── Mostrar aviso de inactividad ──
  function showWarning(){
    const now = Date.now();
    const elapsed = now - lastActivity;
    // Si ya pasó la hora completa sin respuesta
    if(elapsed >= TIMEOUT_MS){
      doLogoutSmart();
      return;
    }
    // Crear o mostrar modal
    let modal = document.getElementById('session-timeout-modal');
    if(!modal){
      modal = document.createElement('div');
      modal.id = 'session-timeout-modal';
      modal.innerHTML = `
        <div style="position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:99999;display:flex;align-items:center;justify-content:center;">
          <div style="background:#fff;border-radius:16px;max-width:420px;width:90%;box-shadow:0 20px 60px rgba(0,0,0,.4);overflow:hidden;">
            <div style="background:#007A33;padding:20px 24px;color:white;">
              <h5 style="margin:0;font-weight:700;"><i class="bi bi-clock-history me-2"></i>¿Sigues ahí?</h5>
            </div>
            <div style="padding:24px;text-align:center;">
              <p style="font-size:.95rem;color:#333;margin-bottom:8px;">Han pasado <strong>59 minutos</strong> sin actividad.</p>
              <p style="font-size:.85rem;color:#666;margin-bottom:20px;">Tu sesión se cerrará automáticamente en <strong id="session-countdown">60</strong> segundos.</p>
              <div class="d-flex gap-2 justify-content-center">
                <button id="session-stay-btn" class="btn fw-bold" style="background:#007A33;color:white;border-radius:30px;padding:10px 28px;">
                  <i class="bi bi-arrow-counterclockwise me-1"></i>Seguir aquí
                </button>
                <button id="session-quit-btn" class="btn fw-bold btn-outline-danger" style="border-radius:30px;padding:10px 28px;">
                  <i class="bi bi-box-arrow-right me-1"></i>Salir ahora
                </button>
              </div>
            </div>
          </div>
        </div>`;
      document.body.appendChild(modal);

      // Botones
      document.getElementById('session-stay-btn').addEventListener('click', resetTimer);
      document.getElementById('session-quit-btn').addEventListener('click', doLogoutSmart);
    }
    modal.style.display = 'flex';

    // Contador regresivo 60→0
    let remaining = 60;
    const countdownEl = document.getElementById('session-countdown');
    const countInterval = setInterval(() => {
      remaining--;
      if(countdownEl) countdownEl.textContent = remaining;
      if(remaining <= 0){
        clearInterval(countInterval);
        doLogoutSmart();
      }
    }, 1000);

    // Guardar interval para limpiar si responden
    modal._countInterval = countInterval;
  }

  // ── Eventos que resetean el timer ──
  ['mousemove','mousedown','keydown','touchstart','scroll'].forEach(evt => {
    document.addEventListener(evt, resetTimer, {passive:true});
  });

  // ── Bind del botón Salir existente ──
  document.addEventListener('DOMContentLoaded', () => {
    const btn = document.getElementById('btn-logout');
    if(btn) btn.addEventListener('click', doLogoutSmart);
    resetTimer();
  });

  // Si el modal ya existía, limpiar su interval al cerrar
  const obs = new MutationObserver(() => {
    const m = document.getElementById('session-timeout-modal');
    if(m && m.style.display === 'none' && m._countInterval){
      clearInterval(m._countInterval);
    }
  });
  obs.observe(document.body, {childList:true, subtree:true, attributes:true});
})();
