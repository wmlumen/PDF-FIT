#!/usr/bin/env python3

"""
Herramienta de administración de simbología para SNC_v3 — agrega un panel collapsible de "Simbología Por Categoría"
antes de cualquier bloque de scripts en index.html, index-municipal.html, etc.

Funciona en el working directory actual del repositorio.

Usa un prefijo configurable opcional: "$simbologia_prefix" se inserta ante el ID del contenedor y
los IDs de todos sus elementos internos (ej: "$simbologia_prefix-symbo-section",
"$simbologia_prefix-symbo-category-field", etc.). Esto permite múltiples paneles
paralelos en la misma página sin conflictos de ID.

Para: cambios visuales en el front-end de visualizaciones basadas en mapas.
"""

import os
import re

# ------------------------------------------------------------
# Configuración global
# ------------------------------------------------------------
# Prefijo opcional para evitar colisiones de ID. Ejemplo: "$simbologia_prefix=" -> se convierten en "myproj-symbo-..."
SYMBOLOGY_PREFIX = ""

# Define el contenido del panel de simbología por categoría (puedes rellenarlo con los estilos/titles reales que necesitas)
symbology_section = """
      <!-- SIMBOLOGÍA CATEGÓRICA -->
      <section id="{}" class="operational-section hidden" aria-labelledby="{}">
        <h3 id="{}" class="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3 flex items-center">
          <i class="fas fa-palette mr-3 text-emerald-500"></i> Simbología Por Categoría
        </h3>
        <div class="space-y-4">
          <!-- Capa seleccionada -->
          <div class="flex items-center gap-2 text-sm text-slate-300 bg-slate-900/50 p-3 rounded-lg border border-slate-800">
            <i class="fas fa-layer-group text-emerald-500"></i>
            <span>Capa: <strong id="{}">—</strong></span>
          </div>

          <!-- Campo de categoría -->
          <div class="bg-slate-900/50 p-3 rounded-lg border border-slate-800">
            <label class="text-[10px] text-slate-400 mb-1 block">Campo de categoría <span class="text-slate-500">(para agrupar)</span></label>
            <select id="{}" class="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white outline-none focus:border-emerald-500">
              <option value="">— Seleccione campo —</option>
            </select>
            <div class="flex gap-2 mt-2">
              <button onclick="window.MapEngine?.addCategorySymbology?.()" class="text-[10px] text-emerald-400 hover:underline">Agregar</button>
              <button onclick="window.MapEngine?.removeCategorySymbology?.()" class="text-[10px] text-red-400 hover:underline">Remover</button>
            </div>
          </div>

          <!-- Campo de cantidad -->
          <div class="bg-slate-900/50 p-3 rounded-lg border border-slate-800">
            <label class="text-[10px] text-slate-400 mb-1 block">Campo de cantidad <span class="text-slate-500">(valor cuantitativo)</span></label>
            <select id="{}" class="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white outline-none focus:border-emerald-500">
              <option value="">— Seleccione campo —</option>
            </select>
            <div class="flex gap-2 mt-2">
              <button onclick="window.MapEngine?.addGroupSymbology?.()" class="text-[10px] text-emerald-400 hover:underline">Agregar</button>
              <button onclick="window.MapEngine?.removeGroupSymbology?.()" class="text-[10px] text-red-400 hover:underline">Remover</button>
            </div>
          </div>

          <!-- Esquema de simbolización -->
          <div class="bg-slate-900/50 p-3 rounded-lg border border-slate-800">
            <label class="text-[10px] text-slate-400 mb-2 block">Esquema de simbolización</label>
            <div class="grid grid-cols-2 gap-2">
              <label class="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="symbology-scheme" value="color" class="accent-emerald-600">
                <span class="text-[10px] text-slate-300">Ráfaga de color</span>
              </label>
              <label class="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="symbology-scheme" value="size" class="accent-emerald-600">
                <span class="text-[10px] text-slate-300">Tamaño de símbolo</span>
              </label>
            </div>
          </div>

          <!-- Ráfaga de color -->
          <div class="bg-slate-900/50 p-3 rounded-lg border border-slate-800">
            <label class="text-[10px] text-slate-400 mb-1 block">Ráfaga de color <span class="text-slate-500">(valor)</span></label>
            <input id="{}" type="number" step="0.1" class="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white outline-none focus:border-emerald-500" placeholder="Ingrese valor cuantitativo">
            <div class="flex gap-2 mt-2">
              <button onclick="window.MapEngine?.addColorLegend?.()" class="px-3 py-1 rounded-lg bg-emerald-600 text-white text-[10px] font-bold hover:bg-emerald-500">Agregar ráfaga</button>
              <button onclick="window.MapEngine?.removeColorLegend?.()" class="px-3 py-1 rounded-lg bg-red-600 text-white text-[10px] font-bold hover:bg-red-500">Remover ráfaga</button>
            </div>
          </div>

          <!-- Tamaño de símbolo -->
          <div class="bg-slate-900/50 p-3 rounded-lg border border-slate-800">
            <label class="text-[10px] text-slate-400 mb-1 block">Tamaño de símbolo <span class="text-slate-500">(valor)</span></label>
            <input id="{}" type="number" step="0.1" class="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white outline-none focus:border-emerald-500" placeholder="Ingrese valor cuantitativo">
            <div class="flex gap-2 mt-2">
              <button onclick="window.MapEngine?.addSymbolSize?.()" class="px-3 py-1 rounded-lg bg-emerald-600 text-white text-[10px] font-bold hover:bg-emerald-500">Agregar tamaño</button>
              <button onclick="window.MapEngine?.removeSymbolSize?.()" class="px-3 py-1 rounded-lg bg-red-600 text-white text-[10px] font-bold hover:bg-red-500">Remover tamaño</button>
            </div>
          </div>

          <div class="flex gap-2">
            <button onclick="window.MapEngine?.applySymbology?.()" class="flex-1 px-4 py-2 rounded-lg bg-emerald-600 text-white text-[10px] font-bold hover:bg-emerald-500">Aplicar simbología</button>
            <button onclick="window.MapEngine?.resetSymbology?.()" class="px-4 py-2 rounded-lg bg-slate-700 text-white text-[10px] font-bold hover:bg-slate-600">Reiniciar</button>
          </div>
        </div>
      </section>
"""

# ------------------------------------------------------------
# Mapeo de IDs internos (al ser ajustados con prefijo)
# ------------------------------------------------------------
internal_ids = {
    'section': 'symbology-section',
    'title': 'symbology-title',
    'layer_name': 'symbology-layer-name',
    'category_field': 'symbology-category-field',
    'quantity_field': 'symbology-quantity-field',
    'quantity_value_color': 'symbology-quantity-value',
    'quantity_value_size': 'symbology-quantity-value-size',
}

# ------------------------------------------------------------
# Función principal: agregar a un archivo HTML individual
# ------------------------------------------------------------
def process_file(filepath):
    if not os.path.exists(filepath):
        print(f"✗ {filepath}: archivo no encontrado")
        return False

    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    if 'id="symbology-section"' in content:
        print(f"✓ {filepath}: ya tiene la sección de simbología")
        return True

    if 'id="map"' not in content:
        print(f"✗ {filepath}: no tiene mapa (sin id='map')")
        return False

    # Construir IDs con prefijo
    ids = {key: (SYMBOLOGY_PREFIX + val if SYMBOLOGY_PREFIX else val) for key, val in internal_ids.items()}

    # Insertar el bloque antes del script más cercano después del map
    script_pos = content.find('<script', 500)
    if script_pos == -1:
        script_pos = len(content) - 100

    # Encontrar el último </div> antes del script (época del main view)
    main_view_close = content.rfind('</div>', 0, script_pos)
    if main_view_close == -1:
        # Fallback: encontrar la primera etiqueta </main>
        main_close = content.rfind('</main>', 0, script_pos)
        if main_close != -1:
            insertion_point = main_close + len('</main>')
        else:
            print(f"✗ {filepath}: no se pudo encontrar punto de inserción")
            return False
    else:
        insertion_point = main_view_close + len('</div>')

    # Insertar el HTML ajustado con los IDs corregidos
    section_with_ids = symbology_section.format(
        ids['section'], ids['title'], ids['layer_name'],
        ids['category_field'], ids['quantity_field'],
        ids['quantity_value_color'], ids['quantity_value_size']
    )

    content = content[:insertion_point] + '\n' + section_with_ids + content[insertion_point:]

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

    print(f"✓ {filepath}: sección de simbología añadida con prefijo '{SYMBOLOGY_PREFIX}'")
    return True

# ------------------------------------------------------------
# Lista de archivos objetivo (relativos al working directory)
# ------------------------------------------------------------
files_to_update = [
    'municipal/index.html',
    'index.html',
    'index-municipal.html',
    'index_server.html',
    'ciudadano/index.html',
    'fluxograma.html',
    'dist/index-municipal.html',
    'dist/index.html'
]

# ------------------------------------------------------------
# Función principal
# ------------------------------------------------------------
if __name__ == '__main__':
    success = True
    for filepath in files_to_update:
        success = process_file(filepath) and success

    print("\n=== PRUEBA DE COMPROBACIÓN ===")
    for filepath in files_to_update:
        if os.path.exists(filepath):
            with open(filepath, 'r', encoding='utf-8') as f:
                content = f.read()
            if 'id="symbology-section"' in content:
                print(f"✓ {filepath}: tiene la sección de simbología")
            else:
                print(f"✗ {filepath}: no tiene la sección de simbología")
        else:
            print(f"✗ {filepath}: archivo no encontrado")

    exit(0 if success else 1)