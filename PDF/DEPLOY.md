# PDF-FIT — Deploy Online (Render.com)

## 🚀 Instrucciones para poner online en Render.com (GRATIS)

### 1. Crear cuenta en Render
1. Ve a **https://render.com**
2. Haz clic en **"Get Started"** o **"Sign Up"**
3. Regístrate con tu cuenta de **GitHub** (más fácil y rápido)
4. Autoriza a Render para acceder a tus repositorios

### 2. Conectar el repositorio
1. En el dashboard de Render, haz clic en el botón **"New +"** (arriba a la derecha)
2. Selecciona **"Web Service"**
3. Busca y selecciona el repositorio: **wmlumen/PDF-FIT**
4. Haz clic en **"Connect"**

### 3. Configurar el servicio
Render detectará automáticamente la configuración, pero verifica estos valores:

- **Name:** `pdf-fit` (o el nombre que prefieras)
- **Runtime:** `Python 3`
- **Build Command:** `pip install -r requirements.txt`
- **Start Command:** `gunicorn --bind 0.0.0.0:$PORT --workers 2 --threads 4 --timeout 120 app:app`
- **Plan:** `Free`

### 4. Deployar
1. Haz clic en **"Create Web Service"**
2. Espera 2-3 minutos mientras Render:
   - Instala las dependencias (PyMuPDF, Flask, etc.)
   - Configura el entorno
   - Inicia el servidor
3. ¡Listo! Verás la URL en verde: `https://pdf-fit.onrender.com`

### 5. Probar
1. Abre la URL en tu navegador
2. Sube un PDF y prueba las funcionalidades
3. ¡Comparte el link con quien quieras!

---

## ⚠️ Consideraciones del plan Free

- **Tiempo de inactividad:** Si nadie usa la app por 15 minutos, se "duerme"
- **Primer acceso:** Después de dormirse, el primer acceso tarda 30-60 segundos en despertar
- **Límites:** 
  - 100 GB de transferencia mensual
  - 512 MB RAM
  - 1 CPU compartido
- **Almacenamiento:** Los archivos subidos se borran al reiniciar el servidor

---

## 🔧 Alternativa: PythonAnywhere (también gratis)

Si prefieres otra opción:

1. Ve a **https://www.pythonanywhere.com**
2. Crea cuenta gratuita
3. Ve a **"Web"** → **"Add a new web app"**
4. Selecciona **Flask** y Python 3.11
5. Sube los archivos via **Files** o conecta GitHub
6. Configura el WSGI file para apuntar a `app.py`

---

## 📞 Soporte

Si tienes problemas con el deploy:
1. Revisa los logs en Render (pestaña **Logs**)
2. Verifica que `requirements.txt` tenga todas las dependencias
3. Asegúrate de que `Procfile` esté en la raíz del proyecto
4. Contacta en GitHub Issues: https://github.com/wmlumen/PDF-FIT/issues

---

## 🎉 ¡Tu app está online!

URL típica: `https://pdf-fit.onrender.com`

Puedes acceder desde cualquier dispositivo con internet:
- 💻 Computadora
- 📱 Celular
- 📱 Tablet
- 🌍 Cualquier navegador

¡Sin instalar nada! 🚀
