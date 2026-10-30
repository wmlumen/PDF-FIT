#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Extrae y estructura los datos del "ESTUDIO DE LÍMITES DISTRITALES DE LA REPÚBLICA DEL PARAGUAY"
publicado por el Servicio Nacional de Catastro (SNC / Convenio 2016-2025).

Salida:
  - data/snc_estadisticas/estudio_limites_distritales.json
  - data/snc_estadisticas/estudio_limites_distritales.csv
"""
import sys
import os
import re
import json
import csv
import pdfplumber

LETTER_TO_DEP = {
    'B': 'CONCEPCION',
    'C': 'SAN PEDRO',
    'D': 'CORDILLERA',
    'E': 'GUAIRA',
    'F': 'CAAGUAZU',
    'G': 'CAAZAPA',
    'H': 'ITAPUA',
    'I': 'MISIONES',
    'J': 'PARAGUARI',
    'K': 'ALTO PARANA',
    'L': 'CENTRAL',
    'M': 'NEEMBUCU',
    'N': 'AMAMBAY',
    'P': 'PRESIDENTE HAYES',
    'Q': 'BOQUERON',
    'R': 'ALTO PARAGUAY',
    'S': 'CANINDEYU'
}

DEP_SURFACE_KM2 = {
    'CONCEPCION': 18051,
    'SAN PEDRO': 20800,
    'CORDILLERA': 4948,
    'GUAIRA': 3846,
    'CAAGUAZU': 11474,
    'CAAZAPA': 9496,
    'ITAPUA': 16525,
    'MISIONES': 9556,
    'PARAGUARI': 8705,
    'ALTO PARANA': 14895,
    'CENTRAL': 2465,
    'NEEMBUCU': 12147,
    'AMAMBAY': 12933,
    'PRESIDENTE HAYES': 72907,
    'BOQUERON': 91669,
    'ALTO PARAGUAY': 82349,
    'CANINDEYU': 14660
}

def clean(text):
    if not text:
        return ''
    return re.sub(r'\s+', ' ', text).strip()

def parse_middle(middle):
    items = [x for x in middle if x and x != '-']
    tipo_creacion, anio_creacion, doc_normativa, anio_normativa = None, None, None, None
    if len(items) == 4:
        tipo_creacion = items[0]
        anio_creacion = int(items[1]) if re.match(r'^\d{4}$', items[1]) else None
        doc_normativa = items[2]
        anio_normativa = int(items[3]) if re.match(r'^\d{4}$', items[3]) else None
    elif len(items) == 1:
        if 'Sin datos' in items[0] or 'Sin' in items[0]:
            doc_normativa = 'Sin datos'
        else:
            tipo_creacion = items[0]
    elif len(items) == 2:
        if re.match(r'^\d{4}$', items[1]):
            tipo_creacion = items[0]
            anio_creacion = int(items[1])
        else:
            tipo_creacion = items[0]
            doc_normativa = items[1]
    elif len(items) == 3:
        tipo_creacion = items[0]
        if re.match(r'^\d{4}$', items[1]):
            anio_creacion = int(items[1])
            doc_normativa = items[2]
        else:
            doc_normativa = items[1]
            if re.match(r'^\d{4}$', items[2]):
                anio_normativa = int(items[2])
    return tipo_creacion, anio_creacion, doc_normativa, anio_normativa

def main():
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    pdf_path = os.path.join(base_dir, 'data', 'snc_estadisticas', 'estudio_limites_distritales.pdf')
    out_json = os.path.join(base_dir, 'data', 'snc_estadisticas', 'estudio_limites_distritales.json')
    out_csv = os.path.join(base_dir, 'data', 'snc_estadisticas', 'estudio_limites_distritales.csv')

    if not os.path.exists(pdf_path):
        print(f"Error: no existe el archivo {pdf_path}")
        sys.exit(1)

    print(f"Procesando {pdf_path}...")
    p = pdfplumber.open(pdf_path)

    distritos = []

    for pno in range(24, 37):
        page = p.pages[pno - 1]
        tbls = page.extract_tables()
        for tbl in tbls:
            for r in tbl:
                code = None
                code_idx = -1
                for idx, cell in enumerate(r[:2]):
                    val = clean(cell)
                    if re.match(r'^[A-Z]\d{1,2}$', val):
                        code = val
                        code_idx = idx
                        break
                if not code:
                    continue

                dpto_letter = code[0]
                dpto_name = LETTER_TO_DEP.get(dpto_letter, '')
                dist_num = int(code[1:])

                cells = [clean(c) for c in r[code_idx:]]
                while cells and not cells[-1]:
                    cells.pop()

                dist_name = cells[1] if len(cells) > 1 else ''
                obs = cells[-1] if len(cells) > 2 else ''
                middle = cells[2:-1] if len(cells) > 3 else []

                tipo_c, anio_c, doc_n, anio_n = parse_middle(middle)

                obs_upper = obs.upper()
                if 'COORDENADAS UTM' in obs_upper:
                    calidad = 'Coordenadas UTM y rumbo/distancia'
                    grupo_tecnico = 1
                elif 'RUMBO Y DISTANCIA' in obs_upper:
                    calidad = 'Rumbo y distancia'
                    grupo_tecnico = 2
                elif 'FISICO' in obs_upper or 'NATURALES' in obs_upper:
                    calidad = 'Elementos fisico-naturales'
                    grupo_tecnico = 2
                elif 'NO HAY DISPOSICIONES' in obs_upper or 'SIN DATOS' in obs_upper:
                    calidad = 'Sin delimitacion tecnica'
                    grupo_tecnico = 3
                else:
                    calidad = 'Otros'
                    grupo_tecnico = 3

                distritos.append({
                    'codigo': code,
                    'cod_dpto': dpto_letter,
                    'cod_distrito': dist_num,
                    'departamento': dpto_name,
                    'distrito': dist_name,
                    'tipo_creacion': tipo_c,
                    'anio_creacion': anio_c,
                    'doc_normativa': doc_n,
                    'anio_normativa': anio_n,
                    'grupo_tecnico': grupo_tecnico,
                    'calidad_tecnica': calidad,
                    'observaciones': obs
                })

    p.close()

    resumen_grupos = {
        'Grupo 1 (Coordenadas UTM / Mayor precisión técnica)': sum(1 for d in distritos if d['grupo_tecnico'] == 1),
        'Grupo 2 (Rumbo y distancia / Elementos naturales)': sum(1 for d in distritos if d['grupo_tecnico'] == 2),
        'Grupo 3 (Sin delimitación técnica o desprovistos de normas)': sum(1 for d in distritos if d['grupo_tecnico'] == 3)
    }

    resultado = {
        'fuente': 'Servicio Nacional de Catastro (SNC) - Estudio de Límites Distritales de la República del Paraguay',
        'marco': 'Convenio de Cooperación de Fortalecimiento de las Capacidades Catastrales de los Municipios del Paraguay 2016-2025',
        'total_distritos_analizados': len(distritos),
        'resumen_calidad_tecnica': resumen_grupos,
        'superficies_departamentales_km2': DEP_SURFACE_KM2,
        'distritos': distritos
    }

    with open(out_json, 'w', encoding='utf-8') as f:
        json.dump(resultado, f, ensure_ascii=False, indent=2)

    with open(out_csv, 'w', encoding='utf-8', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=[
            'codigo', 'cod_dpto', 'cod_distrito', 'departamento', 'distrito',
            'tipo_creacion', 'anio_creacion', 'doc_normativa', 'anio_normativa',
            'grupo_tecnico', 'calidad_tecnica', 'observaciones'
        ])
        writer.writeheader()
        writer.writerows(distritos)

    print(f"Extracción completada con éxito.")
    print(f"Distritos procesados: {len(distritos)}")
    print(f"Resumen de grupos técnicos: {resumen_grupos}")
    print(f"Archivos guardados en:")
    print(f"  JSON: {out_json}")
    print(f"  CSV:  {out_csv}")

if __name__ == '__main__':
    main()
