# Base de Datos Local - Centuria Asistencia

## 📁 Estructura

```
database/
├── schema.sql              # Esquema MySQL (tablas y vistas)
├── export_from_sheets.js   # Exportar desde Google Sheets
├── export_from_local.js    # Exportar desde localStorage JSON
├── .env.example            # Plantilla de configuración
├── data/                   # Carpeta para archivos JSON (NO se sube a GitHub)
└── README.md               # Este archivo
```

## 🚀 Instalación

### 1. Instalar MySQL
- Descargar desde: https://dev.mysql.com/downloads/installer/
- O usar XAMPP/WAMP/MAMP

### 2. Crear la base de datos
```bash
mysql -u root -p < database/schema.sql
```

### 3. Configurar variables de entorno
```bash
cd database
cp .env.example .env
# Editar .env con tus credenciales
```

### 4. Instalar dependencias Node.js
```bash
npm install mysql2 dotenv node-fetch
```

## 📥 Exportar Datos

### Opción A: Desde Google Sheets (Online)
```bash
node database/export_from_sheets.js
```

### Opción B: Desde localStorage (Offline)
1. Abrir `planificacion.html` en el navegador
2. Abrir Consola (F12)
3. Ejecutar:
   ```javascript
   copy(localStorage.getItem('planificaciones_centuria'))
   ```
4. Pegar el contenido en `database/data/planificaciones.json`
5. Ejecutar:
   ```bash
   node database/export_from_local.js
   ```

## 📊 Tablas

### planificaciones
| Campo | Tipo | Descripción |
|-------|------|-------------|
| codigo | VARCHAR(50) | CÉDULA-COD_ASIG-COD_SEC-CORRELATIVO |
| cedula | VARCHAR(20) | Cédula del docente |
| nombre_apellido | VARCHAR(200) | Nombre completo |
| cod_asignatura | VARCHAR(50) | Código de asignatura |
| cod_seccion | VARCHAR(50) | Código de sección |
| cod_carrera | VARCHAR(100) | Código de carrera |
| fecha_inicio | DATE | Fecha de inicio |
| fecha_cierre | DATE | Fecha de cierre |
| sala | VARCHAR(100) | Sala/Aula |
| sede | VARCHAR(100) | Sede |
| modalidad | ENUM | Presencial/Virtual/Híbrida |
| observaciones | TEXT | Notas adicionales |
| fuente | VARCHAR(20) | sheets, local, csv |

### asistencias
Tabla para futura migración de registros de asistencia.

### catalogos
Tabla para asignaturas, secciones y carreras configurables.

## 🔒 Seguridad

- **NO subir** `.env` a GitHub (está en `.gitignore`)
- **NO subir** archivos en `database/data/` (están en `.gitignore`)
- **NO subir** dumps o backups de la base de datos

## 🔄 Migración Futura

Para migrar desde MySQL a otro sistema:

```bash
# Exportar a SQL
mysqldump -u root -p centuria_asistencia > migracion.sql

# Exportar a CSV
mysql -u root -p -e "SELECT * FROM planificaciones INTO OUTFILE '/tmp/planificaciones.csv' FIELDS TERMINATED BY ',' ENCLOSED BY '\"' LINES TERMINATED BY '\n'" centuria_asistencia
```

## 📞 Soporte

Si hay problemas de conexión:
1. Verificar que MySQL esté corriendo: `mysql -u root -p`
2. Verificar credenciales en `.env`
3. Verificar que la base de datos exista: `SHOW DATABASES;`
