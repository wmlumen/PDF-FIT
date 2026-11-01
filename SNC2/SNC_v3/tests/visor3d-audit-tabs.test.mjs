import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('Auditoría Visor 3D - Balance de etiquetas y estructura de #v3-cuerpo', () => {
  const html = fs.readFileSync('visor-3d.html', 'utf8');

  // 1. Balance de etiquetas
  const tagRegex = /<\/?([a-zA-Z0-9]+)(?:\s+[^>]*)?\/?>/g;
  const stack = [];
  const trackedTags = new Set(['div', 'fieldset', 'aside', 'details', 'section', 'form', 'main']);

  let match;
  let mismatches = 0;
  while ((match = tagRegex.exec(html)) !== null) {
    const fullTag = match[0];
    const tagName = match[1].toLowerCase();
    if (!trackedTags.has(tagName)) continue;
    
    const isClosing = fullTag.startsWith('</');
    const isSelfClosing = fullTag.endsWith('/>');

    if (isClosing) {
      if (stack.length === 0) {
        mismatches++;
      } else {
        const top = stack.pop();
        if (top.tagName !== tagName) mismatches++;
      }
    } else if (!isSelfClosing) {
      stack.push({ tagName });
    }
  }

  assert.equal(mismatches, 0, 'No debe haber cierres de etiquetas desbalanceados en visor-3d.html');
  assert.equal(stack.length, 0, 'No debe haber etiquetas sin cerrar al final de visor-3d.html');

  // 2. Comprobar que los 6 fieldsets están dentro del bloque #v3-cuerpo
  const cuerpoIdx = html.indexOf('id="v3-cuerpo"');
  assert.ok(cuerpoIdx > -1, '#v3-cuerpo debe existir en visor-3d.html');

  const closingCuerpoIdx = html.indexOf('</div>\n  </aside>');
  assert.ok(closingCuerpoIdx > cuerpoIdx, '#v3-cuerpo debe cerrarse al final del panel');

  const cuerpoSubstr = html.substring(cuerpoIdx, closingCuerpoIdx);

  const fieldsetIds = [
    'v3-fieldset-sim',
    'v3-fieldset-ubicacion',
    'v3-fieldset-base',
    'v3-fieldset-capas',
    'v3-fieldset-terreno',
    'v3-fieldset-exp'
  ];

  fieldsetIds.forEach(id => {
    assert.ok(
      cuerpoSubstr.includes(`id="${id}"`),
      `El fieldset #${id} debe residir dentro de #v3-cuerpo y no fuera de él`
    );
  });
});

test('Auditoría Visor 3D - Regla CSS fieldset no bloquea display:none con !important', () => {
  const css = fs.readFileSync('css/visor3d.css', 'utf8');

  // Comprobar que fieldset { ... } no tenga display: flex !important
  const fieldsetMatch = css.match(/fieldset\s*\{([^}]+)\}/);
  assert.ok(fieldsetMatch, 'Regla fieldset debe existir en visor3d.css');
  const fieldsetRules = fieldsetMatch[1];

  assert.ok(
    !fieldsetRules.includes('display: flex !important'),
    'fieldset no debe tener display: flex !important porque impide que JS oculte elementos'
  );

  // Comprobar que existe regla de ocultamiento con !important
  assert.ok(
    css.includes('display: none !important'),
    'Debe existir regla display: none !important para ocultar fieldsets'
  );
  assert.ok(
    css.includes('.v3-modo-oculto') || css.includes('fieldset[hidden]'),
    'Debe existir clase o atributo para modo oculto de fieldset'
  );
});

test('Auditoría Visor 3D - Anticolapso en vista Todo (flex-shrink: 0, scroll único en v3-cuerpo y top-sticky fijo)', () => {
  const css = fs.readFileSync('css/visor3d.css', 'utf8');

  // 1. fieldset debe tener flex-shrink: 0 !important para evitar colapso y superposición de textos
  const fieldsetMatch = css.match(/fieldset\s*\{([^}]+)\}/);
  assert.ok(fieldsetMatch, 'Regla fieldset debe existir en visor3d.css');
  const fieldsetRules = fieldsetMatch[1];
  assert.ok(
    fieldsetRules.includes('flex-shrink: 0 !important'),
    'fieldset debe tener flex-shrink: 0 !important para prevenir el aplastamiento y superposición'
  );

  // 2. .v3-cuerpo debe ser el contenedor de scroll vertical unificado
  const cuerpoMatch = css.match(/\.v3-cuerpo\s*\{([^}]+)\}/);
  assert.ok(cuerpoMatch, 'Regla .v3-cuerpo debe existir en visor3d.css');
  const cuerpoRules = cuerpoMatch[1];
  assert.ok(
    cuerpoRules.includes('overflow-y: auto !important'),
    '.v3-cuerpo debe tener overflow-y: auto !important para permitir desplazamiento vertical sin scroll anidado'
  );
  assert.ok(
    cuerpoRules.includes('flex: 1 1 auto'),
    '.v3-cuerpo debe tener flex: 1 1 auto para ocupar el espacio restante bajo la barra sticky'
  );

  // 3. .v3-top-sticky no debe encogerse ni desplazarse
  const stickyMatch = css.match(/\.v3-top-sticky\s*\{([^}]+)\}/);
  assert.ok(stickyMatch, 'Regla .v3-top-sticky debe existir en visor3d.css');
  const stickyRules = stickyMatch[1];
  assert.ok(
    stickyRules.includes('flex-shrink: 0 !important'),
    '.v3-top-sticky debe tener flex-shrink: 0 !important para anclarse permanentemente arriba'
  );
});
