# 🔐 Configuración Local - Centuria Asistencia

> **IMPORTANTE:** El repositorio de GitHub solo contiene el código base.  
> **Los datos sensibles (credenciales, URLs, API keys) se configuran LOCALMENTE** y nunca se suben a GitHub.

---

## 📁 Qué NO está en GitHub (y por qué)

| Archivo | Por qué no está | Dónde va |
|:---|:---|:---|
| `public/Datos_asistencia.txt` | Contiene credenciales, cédulas, URLs de API | Tu PC local |
| `database/.env` | Contiene password de MySQL y API keys | Tu PC local |
| `database/data/` | Archivos exportados con datos reales | Tu PC local |
| `.env` | Variables de entorno con secretos | Tu PC local |

---

## 🚀 Setup Inicial (Primera vez)

### 1. Clonar el repositorio
```bash
git clone https://github.com/TU_USUARIO/Asistencia.git
cd Asistencia
```

### 2. Crear archivo de configuración del sistema
```bash
cd public
cp Datos_asistencia.txt.example Datos_asistencia.txt
```

Editar `public/Datos_asistencia.txt` con tus datos reales:
```
# === DATOS DEL DOCENTE ===
name.docente=Tu Nombre
cedula.docente=TuCedula

# === CREDENCIALES ===
cedula.panel.docente=TuCedula
teacher.password=TuContrasenaSegura

# === SEGURIDAD ===
api.secret=TU_API_SECRET_UNICO

# === CONFIGURACIÓN ===
asistencia.public.url=https://TU_USUARIO.github.io/Asistencia/asistencia.html
asistencia.api.url=https://script.google.com/macros/s/TU_ID/exec
link.asistencia=https://docs.google.com/spreadsheets/d/TU_SHEET_ID/edit
asistencia.csv.url=https://docs.google.com/spreadsheets/d/e/TU_ID/pub?output=csv

# === CATÁLOGOS ===
asistencia.carreras=CARRERA 1|CARRERA 2|CARRERA 3
asistencia.secciones=SECCION 1|SECCION 2
```

### 3. Configurar base de datos MySQL (opcional)
```bash
cd database
cp .env.example .env
# Editar .env con tus credenciales de MySQL
```

### 4. Instalar dependencias (para sincronización)
```bash
npm install
# o manualmente:
npm install mysql2 dotenv node-fetch
```

---

## 🔄 Flujo de trabajo diario

### Para desarrollar localmente:
```bash
npm run dev
# o
npx serve public
```

### Para sincronizar con MySQL:
```bash
# Manual
node database/sync.js

# Automático (cada 5 minutos)
node database/sync_auto.js

# Panel web
node database/sync_server.js
# Abrir http://localhost:3000
```

### Para subir cambios a GitHub (solo código):
```bash
git add .
git commit -m "descripcion del cambio"
git push origin main
```

**⚠️ Git automáticamente ignora los archivos sensibles gracias a `.gitignore`.**

---

## 🛡️ Seguridad

### Rotar credenciales (si se filtraron)
1. Cambiar `API_SECRET` en Google Apps Script
2. Cambiar `teacher.password` en `Datos_asistencia.txt`
3. Cambiar `api.secret` en `Datos_asistencia.txt`
4. Actualizar Google Apps Script con nueva API_SECRET

### Verificar qué se sube a GitHub
```bash
git status
# Solo debería mostrar archivos de código (HTML, CSS, JS, .md)
# NO debe mostrar: Datos_asistencia.txt, .env, archivos de database/data/
```

---

## 📞 Soporte

Si `git status` muestra archivos sensibles, NO hagas commit.  
Revisa `.gitignore` y asegúrate de que estén excluidos.

---

## ✅ Checklist de seguridad

- [ ] `public/Datos_asistencia.txt` existe localmente pero NO en GitHub
- [ ] `database/.env` existe localmente pero NO en GitHub
- [ ] `database/data/` existe localmente pero NO en GitHub
- [ ] Los archivos `.example` SÍ están en GitHub (son plantillas seguras)
- [ ] `script.js` no tiene credenciales reales hardcodeadas
- [ ] Google Apps Script tiene API_SECRET único y seguro
