/**
 * ACCESIBILIDAD - Campus Virtual Centuria
 * Panel de configuración: tamaño de fuente (+A/-A), alto contraste, zoom
 * Se activa con el ícono ⚙ al lado del botón "Salir"
 */
(function(){
  if(location.pathname.endsWith('index.html') || location.pathname === '/' || location.pathname.endsWith('/Centuria/TIC/')) return;

  let fontSize = parseInt(localStorage.getItem('acenturia_fontsize') || '100');
  let highContrast = localStorage.getItem('acenturia_contraste') === 'true';
  let zoom = parseFloat(localStorage.getItem('acenturia_zoom') || '1');

  // Aplicar preferencias guardadas
  function applyPrefs(){
    document.documentElement.style.fontSize = fontSize + '%';
    document.documentElement.style.zoom = zoom;
    if(highContrast){
      document.documentElement.classList.add('alto-contraste');
      document.body.classList.add('alto-contraste');
    } else {
      document.documentElement.classList.remove('alto-contraste');
      document.body.classList.remove('alto-contraste');
    }
  }

  // Guardar y aplicar
  function savePrefs(){
    localStorage.setItem('acenturia_fontsize', fontSize);
    localStorage.setItem('acenturia_contraste', highContrast);
    localStorage.setItem('acenturia_zoom', zoom);
    applyPrefs();
  }

  // ── Ajustar fuente ──
  window.accenturiaAjustarFuente = function(cambio){
    fontSize = Math.max(70, Math.min(150, fontSize + cambio * 10));
    savePrefs();
    updatePanelValues();
  };

  // ── Ajustar zoom ──
  window.accenturiaAjustarZoom = function(cambio){
    zoom = Math.max(0.7, Math.min(1.5, zoom + cambio * 0.1));
    zoom = Math.round(zoom * 10) / 10;
    savePrefs();
    updatePanelValues();
  };

  // ── Alto contraste ──
  window.accenturiaToggleContraste = function(){
    highContrast = !highContrast;
    savePrefs();
    updatePanelValues();
  };

  // ── Restablecer todo ──
  window.accenturiaReset = function(){
    fontSize = 100;
    zoom = 1;
    highContrast = false;
    savePrefs();
    updatePanelValues();
  };

  // ── Crear panel de accesibilidad ──
  function createPanel(){
    if(document.getElementById('acenturia-settings-panel')) return;
    const panel = document.createElement('div');
    panel.id = 'acenturia-settings-panel';
    panel.style.display = 'none';
    panel.innerHTML = `
      <div class="acenturia-settings-backdrop" onclick="document.getElementById('acenturia-settings-panel').style.display='none'"></div>
      <div class="acenturia-settings-box">
        <div class="acenturia-settings-header">
          <h6><i class="bi bi-gear-fill me-2"></i>Configuración de visualización</h6>
          <button class="btn-close" onclick="document.getElementById('acenturia-settings-panel').style.display='none'"></button>
        </div>
        <div class="acenturia-settings-body">
          <!-- Tamaño de texto -->
          <div class="acenturia-setting-row">
            <span class="acenturia-label"><i class="bi bi-fonts me-2"></i>Tamaño de texto</span>
            <div class="acenturia-controls">
              <button class="acenturia-btn-sm" onclick="accenturiaAjustarFuente(-1)" title="Reducir texto">A-</button>
              <span id="acenturia-font-val" class="acenturia-val">100%</span>
              <button class="acenturia-btn-sm" onclick="accenturiaAjustarFuente(1)" title="Aumentar texto">A+</button>
            </div>
          </div>
          <!-- Zoom -->
          <div class="acenturia-setting-row">
            <span class="acenturia-label"><i class="bi bi-zoom-in me-2"></i>Zoom de página</span>
            <div class="acenturia-controls">
              <button class="acenturia-btn-sm" onclick="accenturiaAjustarZoom(-1)" title="Reducir zoom">−</button>
              <span id="acenturia-zoom-val" class="acenturia-val">100%</span>
              <button class="acenturia-btn-sm" onclick="accenturiaAjustarZoom(1)" title="Aumentar zoom">+</button>
            </div>
          </div>
          <!-- Contraste -->
          <div class="acenturia-setting-row">
            <span class="acenturia-label"><i class="bi bi-circle-half me-2"></i>Alto contraste</span>
            <div class="acenturia-controls">
              <button id="acenturia-contrast-btn" class="acenturia-btn-toggle" onclick="accenturiaToggleContraste()">OFF</button>
            </div>
          </div>
          <!-- Reset -->
          <div class="acenturia-setting-row" style="border-top:1px solid #e9ecef; margin-top:8px; padding-top:12px;">
            <button class="acenturia-btn-reset" onclick="accenturiaReset()"><i class="bi bi-arrow-counterclockwise me-1"></i>Restablecer valores predeterminados</button>
          </div>
        </div>
      </div>`;
    document.body.appendChild(panel);
  }

  // ── Actualizar valores visibles en el panel ──
  function updatePanelValues(){
    const fv = document.getElementById('acenturia-font-val');
    const zv = document.getElementById('acenturia-zoom-val');
    const cv = document.getElementById('acenturia-contrast-btn');
    if(fv) fv.textContent = fontSize + '%';
    if(zv) zv.textContent = Math.round(zoom * 100) + '%';
    if(cv){ cv.textContent = highContrast ? 'ON' : 'OFF'; cv.classList.toggle('active', highContrast); }
  }

  // ── Botón ⚙ al lado del "Salir" ──
  function injectSettingsButton(){
    const btnLogout = document.getElementById('btn-logout');
    if(!btnLogout) return;
    // Evitar duplicar
    if(document.getElementById('acenturia-settings-btn')) return;
    const btn = document.createElement('button');
    btn.id = 'acenturia-settings-btn';
    btn.className = 'btn btn-sm btn-outline-secondary';
    btn.title = 'Configuración de visualización';
    btn.innerHTML = '<i class="bi bi-gear-fill"></i>';
    btn.onclick = function(){
      createPanel();
      const panel = document.getElementById('acenturia-settings-panel');
      if(panel) panel.style.display = panel.style.display === 'none' ? 'flex' : 'none';
      updatePanelValues();
    };
    btnLogout.parentNode.insertBefore(btn, btnLogout);
  }

  // Aplicar preferencias al cargar
  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', ()=>{ applyPrefs(); injectSettingsButton(); });
  } else {
    applyPrefs();
    injectSettingsButton();
  }
})();
