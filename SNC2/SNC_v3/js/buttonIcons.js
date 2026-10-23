const ICONS = [
  [/propiedad|opciones|configurar|preferencias/i, 'fa-gear'],
  [/navegación|mapa/i, 'fa-map'],
  [/importar archivos/i, 'fa-file-import'],
  [/datos excel|tabla/i, 'fa-table'],
  [/resultado|auditoría/i, 'fa-clipboard-check'],
  [/historial|linaje/i, 'fa-code-branch'],
  [/versión|comparar/i, 'fa-code-compare'],
  [/nuevo expediente|nuevo proyecto/i, 'fa-file-circle-plus'],
  [/abrir (proyecto|expediente)/i, 'fa-folder-open'],
  [/guardar perfil|guardar proyecto|guardar/i, 'fa-floppy-disk'],
  [/renombrar/i, 'fa-pen-to-square'],
  [/eliminar|quitar|borrar/i, 'fa-trash'],
  [/validar/i, 'fa-list-check'],
  [/generar auditoría|certificado|informe/i, 'fa-file-circle-check'],
  [/exportar.*shp|zip/i, 'fa-file-zipper'],
  [/geojson/i, 'fa-file-code'],
  [/código/i, 'fa-code'],
  [/kml|tierra|globo/i, 'fa-earth-americas'],
  [/catastro oficial/i, 'fa-building-columns'],
  [/tema|color/i, 'fa-palette'],
  [/zoom in|acercar/i, 'fa-plus'], [/zoom out|alejar/i, 'fa-minus'],
  [/centrar|encuadrar/i, 'fa-crosshairs'],
  [/coordenada/i, 'fa-location-crosshairs'],
  [/carpeta/i, 'fa-folder-plus'],
  [/crear versión/i, 'fa-camera'],
  [/comparar/i, 'fa-code-compare'],
  [/previsualizar|vista previa/i, 'fa-eye'],
  [/crear parcela/i, 'fa-draw-polygon'],
  [/correcciones|aplicar correcci/i, 'fa-wand-magic-sparkles'],
  [/ejecutar|procesar/i, 'fa-play'],
  [/imprimir/i, 'fa-print'],
  [/copiar/i, 'fa-copy'],
  [/medir|distancia/i, 'fa-ruler'],
  [/subdividir|corte/i, 'fa-scissors'],
  [/geoprocesamiento/i, 'fa-diagram-project'],
  [/topol[oó]gic/i, 'fa-wand-magic-sparkles'],
  [/cogo|construcción/i, 'fa-compass-drafting'],
  [/orden.*parcelas|numerar.*parcelas/i, 'fa-arrow-down-1-9'],
  [/leyenda/i, 'fa-list'],
  [/opacidad|transparen/i, 'fa-droplet'],
  [/ascender|mover arriba/i, 'fa-arrow-up'],
  [/descender|mover abajo/i, 'fa-arrow-down'],
  [/seleccionar|selección/i, 'fa-arrow-pointer'],
  [/cerrar|cancel|descartar/i, 'fa-xmark'],
  [/guardar|save/i, 'fa-floppy-disk'],
  [/confirm|aceptar/i, 'fa-check'],
  [/alzar|subir/i, 'fa-file-arrow-up'],
  [/descargar parcelas|vecinas/i, 'fa-cloud-arrow-down'],
  [/descargar/i, 'fa-download'],
  [/exportar.*json/i, 'fa-file-lines'],
  [/export/i, 'fa-file-export'],
  [/eliminar|quitar|borrar/i, 'fa-trash'],
  [/folder/i, 'fa-folder-plus'], [/agregar|crear|nuevo|añadir/i, 'fa-plus'],
  [/editar|renombrar/i, 'fa-pen'],
  [/buscar|filtrar/i, 'fa-magnifying-glass'],
  [/tabla|atributos|datos excel/i, 'fa-table'],
  [/mapa|encuadrar|capas|leyenda/i, 'fa-map'],
  [/propiedad|detalle|información/i, 'fa-circle-info'],
  [/imprimir/i, 'fa-print'],
  [/deshacer/i, 'fa-rotate-left'], [/rehacer/i, 'fa-rotate-right'],
  [/volver|atrás|anterior/i, 'fa-arrow-left'], [/siguiente|continuar/i, 'fa-arrow-right']
];
const GLYPH = /^[+×✕✖✓✔✚#⋮…‹›←→↑↓⌕]$/u;

function visibleLabel(button) {
  const clone = button.cloneNode(true);
  clone.querySelectorAll('i, svg, [aria-hidden="true"], .ml-count-badge, .ml-caret').forEach(node => node.remove());
  return (clone.textContent || '').replace(/[+×✕✖✓✔⋮…‹›←→↑↓]/gu, '').replace(/\s+/g, ' ').trim();
}

function iconClass(label) {
  return ICONS.find(([pattern]) => pattern.test(label))?.[1] || 'fa-circle-question';
}

function refreshIcon(button, label) {
  if (!button.dataset.iconOnlyAutoIcon) return;
  const icon = button.querySelector(':scope > i[data-auto-icon="true"]');
  if (!icon) return;
  icon.className = `fas ${iconClass(label)}`;
}

function decorate(button) {
  if (!(button instanceof HTMLButtonElement) || button.dataset.iconOnlyProcessed === 'true') return;
  button.dataset.iconOnlyProcessed = 'true';
  if (button.classList.contains('lp-menu-item') || button.closest('#lp-menu, [role="menu"]')) return;
  const label = button.getAttribute('aria-label') || button.dataset.tooltip || button.getAttribute('title') || visibleLabel(button);
  const compact = visibleLabel(button);
  if (label) {
    if (!button.title) button.title = label;
    if (!button.hasAttribute('aria-label')) button.setAttribute('aria-label', label);
    if (!button.dataset.tooltip && button.classList.contains('header-icon-btn')) button.dataset.tooltip = label;
  }
  if (!button.querySelector('i, svg')) {
    if (GLYPH.test(compact)) {
      button.classList.add('icon-only-glyph');
    } else {
      const icon = document.createElement('i');
      icon.className = `fas ${iconClass(label || compact)}`;
      icon.setAttribute('aria-hidden', 'true');
      icon.dataset.autoIcon = 'true';
      button.dataset.iconOnlyAutoIcon = 'true';
      button.prepend(icon);
    }
  }
  if (!compact || compact.length === 0) {
    button.classList.add('icon-only-action');
  }
}

export function initButtonIcons(root = document.body) {
  if (!root) return;
  root.querySelectorAll('button').forEach(decorate);
  if (initButtonIcons.observer) return;
  initButtonIcons.observer = new MutationObserver(records => {
    records.forEach(record => record.addedNodes.forEach(node => {
      if (!(node instanceof Element)) return;
      if (node.matches('button')) decorate(node);
      node.querySelectorAll('button').forEach(decorate);
    }));
  });
  initButtonIcons.observer.observe(root, { childList: true, subtree: true });
}
