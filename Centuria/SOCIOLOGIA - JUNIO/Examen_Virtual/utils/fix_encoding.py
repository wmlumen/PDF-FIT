import os
import re


def generar_patron_doble():
    """Genera bytes de doble codificacion para deteccion"""
    caracteres = 'áéíóúñü¿¡ÁÉÍÓÚÑÜ'
    return [c.encode('utf-8').decode('latin-1').encode('utf-8') for c in caracteres]


PATRONES_DOBLE = generar_patron_doble()


def tiene_doble_codificacion(contenido):
    return any(p in contenido for p in PATRONES_DOBLE)


def corregir_texto(texto):
    """Corrige SOLO los pares corruptos, dejando el resto intacto"""

    # Ã (U+00C3) + X (U+0080-U+00BF) -> U+00C0 + (X & 0x3F)
    texto = re.sub(
        '\u00c3([\u0080-\u00bf])',
        lambda m: chr(0xC0 | (ord(m.group(1)) & 0x3F)),
        texto
    )
    # Â (U+00C2) + X (U+0080-U+00BF) -> U+0080 + (X & 0x3F)
    texto = re.sub(
        '\u00c2([\u0080-\u00bf])',
        lambda m: chr(0x80 | (ord(m.group(1)) & 0x3F)),
        texto
    )
    return texto


def convertir_a_utf8_sin_bom(ruta_archivo):
    with open(ruta_archivo, "rb") as f:
        contenido = f.read()

    if contenido[:3] == b'\xef\xbb\xbf':
        contenido = contenido[3:]
        print(f"  BOM eliminado: {ruta_archivo}")

    if tiene_doble_codificacion(contenido):
        texto = contenido.decode("utf-8")
        texto = corregir_texto(texto)
        print(f"  DOBLE CODIFICACION corregida: {ruta_archivo}")
    else:
        try:
            texto = contenido.decode("utf-8")
        except UnicodeDecodeError:
            texto = contenido.decode("latin-1")
            print(f"  Latin-1 convertido: {ruta_archivo}")

    with open(ruta_archivo, "w", encoding="utf-8") as f:
        f.write(texto)


def procesar_carpeta(ruta_carpeta):
    extensiones = (".txt", ".md", ".html", ".ini", ".cfg", ".js", ".css", ".json")
    for root, _, files in os.walk(ruta_carpeta):
        for nombre in files:
            if nombre.endswith(extensiones):
                ruta = os.path.join(root, nombre)
                convertir_a_utf8_sin_bom(ruta)


def asegurar_data_folder(proyect_dir):
    data_dir = os.path.join(proyect_dir, "data")
    if not os.path.isdir(data_dir):
        os.makedirs(data_dir)
        print(f"  CARPETA CREADA: {data_dir}")
        # Crear archivos placeholder vacios
        for nombre in ["Datos_Generales.txt", "asistencia.txt", "Examen (respuestas).csv"]:
            ruta = os.path.join(data_dir, nombre)
            if not os.path.exists(ruta):
                with open(ruta, "w", encoding="utf-8") as f:
                    f.write(f"# Placeholder - reemplazar con datos reales\n")
                print(f"    {nombre} creado")
    else:
        print(f"  Carpeta data/ existe: {data_dir}")


if __name__ == "__main__":
    proyect_dir = "C:/Users/HP 250 G10/Documents/GITHUT/Centuria/SOCIOLOGIA - COMERCIAL/Examen_Virtual"
    print(f"Procesando: {proyect_dir}")
    asegurar_data_folder(proyect_dir)
    procesar_carpeta(proyect_dir)
    print("Listo.")
