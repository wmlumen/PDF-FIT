# Herramientas PDF Locales

**Página web:** [https://wmlumen.github.io/PDF-FIT/](https://wmlumen.github.io/PDF-FIT/)

Aplicacion web local para trabajar con PDFs desde el navegador.

## Funcionalidad

- Extraer imagenes de un PDF y descargar un ZIP
- Reemplazar o girar imagenes extraidas
- Regenerar un PDF con las imagenes editadas
- Comprimir el PDF original o el PDF editado
- Agregar marcas de agua de texto
- Convertir el PDF a Word (`.docx`)
- Convertir el PDF a Excel (`.xlsx`)
- Convertir el PDF a PowerPoint (`.pptx`)
- Exportar un ZIP de imagenes optimizadas para web

## Requisitos

- Python 3.10 o superior
- `pip install -r requirements.txt`

## Ejecutar

```bash
python app.py
```

Luego abre:

- `http://localhost:5000/`

## Conversiones Office soportadas

- Word (`.docx`)
- Excel (`.xlsx`)
- PowerPoint (`.pptx`)

## Imagenes ligeras para web

Despues de extraer imagenes, la interfaz permite generar `ZIP web ligero`.

Ese ZIP:

- reduce el ancho maximo de imagenes grandes
- prioriza formato `WebP`
- baja calidad para publicacion web
- entrega archivos listos para web o CMS

Valores por defecto:

- ancho maximo: `1600px`
- calidad: `72`
- formato preferido: `WebP`

## Archivos principales

- `app.py`: backend Flask y procesamiento PDF
- `compress_pdf.py`: compresion local por linea de comandos
- `templates/index.html`: interfaz web
- `requirements.txt`: dependencias del proyecto

## Notas

- La compresion PDF rasteriza paginas para bajar peso. Puede reducir calidad visual y afectar texto seleccionable.
- La conversion a PowerPoint usa una diapositiva por pagina del PDF con imagen de la pagina y notas basicas.
- La exportacion web de imagenes requiere Pillow.

## Referencias

- `Efrice/watermark`: https://github.com/Efrice/watermark
- `deminimis/minimalpdfcompress`: https://github.com/deminimis/minimalpdfcompress
- `wmlumen/PDF-FIT`: https://github.com/wmlumen/PDF-FIT
