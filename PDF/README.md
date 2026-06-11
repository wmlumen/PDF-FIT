# PDF-FIT — Herramientas PDF Online

Aplicación web para trabajar con PDFs desde el navegador. Extrae imágenes, edita páginas, agrega marcas de agua, comprime y convierte a Office.

**🌐 Demo online:** [https://pdf-fit.onrender.com](https://pdf-fit.onrender.com) *(después de deployar)*

**📁 Repositorio:** [https://github.com/wmlumen/PDF-FIT](https://github.com/wmlumen/PDF-FIT)

## ✨ Funcionalidades

- 📄 **Extraer imágenes** de PDF y descargar ZIP
- 🖼️ **Vista previa de páginas** con thumbnails reales
- 🔄 **Reordenar páginas** con drag & drop visual
- ➕ **Agregar páginas** en cualquier posición (inicio, final, antes, después)
- 💧 **Marcas de agua** de texto configurables
- 🗜️ **Comprimir PDF** para reducir tamaño
- 📄 **Convertir a Word** (`.docx`)
- 📊 **Convertir a Excel** (`.xlsx`)
- 📽️ **Convertir a PowerPoint** (`.pptx`)
- 🌐 **Exportar imágenes web** optimizadas

## 🚀 Deploy en Render.com (Gratis)

### Paso 1: Crear cuenta en Render
1. Ve a [https://render.com](https://render.com)
2. Regístrate con GitHub (más fácil)

### Paso 2: Crear nuevo Web Service
1. En el dashboard, clic en **"New +"** → **"Web Service"**
2. Conecta tu repositorio `wmlumen/PDF-FIT`
3. Render detectará automáticamente la configuración

### Paso 3: Configurar
- **Name:** `pdf-fit` (o el que prefieras)
- **Runtime:** `Python`
- **Build Command:** `pip install -r requirements.txt`
- **Start Command:** `gunicorn --bind 0.0.0.0:$PORT --workers 2 --threads 4 --timeout 120 app:app`
- **Plan:** Free

### Paso 4: Deploy
1. Clic en **"Create Web Service"**
2. Espera 2-3 minutos a que se instale y deploye
3. ¡Listo! Tu app estará online en `https://pdf-fit.onrender.com`

## 💻 Uso local

### Requisitos
- Python 3.10 o superior
- pip

### Instalación
```bash
pip install -r requirements.txt
```

### Ejecutar
```bash
python app.py
```

Abre en tu navegador: `http://localhost:5000`

### Windows (ejecutable rápido)
Haz doble clic en `iniciar.bat`

## 📦 Archivos principales

| Archivo | Descripción |
|---------|-------------|
| `app.py` | Backend Flask y procesamiento PDF |
| `templates/index.html` | Interfaz web moderna |
| `requirements.txt` | Dependencias Python |
| `Procfile` | Configuración para Render |
| `render.yaml` | Configuración alternativa para Render |
| `compress_pdf.py` | Utilidad de compresión por línea de comandos |
| `iniciar.bat` | Lanzador para Windows |

## ⚙️ Configuración avanzada

### Variables de entorno
- `PORT`: Puerto del servidor (default: 5000)
- `PYTHON_VERSION`: Versión de Python para Render

### Workers Gunicorn
Para más rendimiento en producción, aumenta workers:
```bash
gunicorn --bind 0.0.0.0:$PORT --workers 4 --threads 8 --timeout 120 app:app
```

## 📝 Notas importantes

- **Compresión PDF:** Rasteriza páginas para reducir peso. Puede afectar calidad visual y texto seleccionable.
- **Conversión PowerPoint:** Una diapositiva por página del PDF con imagen de la página.
- **Exportación web:** Requiere Pillow. Optimiza imágenes para publicación web.
- **Almacenamiento:** En producción, los archivos se guardan temporalmente. Reiniciar el servidor limpia las sesiones.

## 🔧 Tecnologías

- **Backend:** Flask + PyMuPDF (fitz)
- **Frontend:** HTML5 + CSS3 + JavaScript vanilla
- **Procesamiento PDF:** PyMuPDF, Pillow
- **Conversión Office:** python-docx, openpyxl, python-pptx

## 📄 Licencia

MIT — Libre para uso personal y comercial.

## 🙏 Referencias

- `Efrice/watermark`: https://github.com/Efrice/watermark
- `deminimis/minimalpdfcompress`: https://github.com/deminimis/minimalpdfcompress
