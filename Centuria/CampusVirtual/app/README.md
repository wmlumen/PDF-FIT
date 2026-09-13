# Moodle Local - Portal TIC Centuria

Instalación preparada en `C:\Users\HP 250 G10\Documents\GITHUT\Centuria\moodle`

## Estado actual (12/09/2026)

✅ `docker-compose.yml` creado (MariaDB 10.11 + moodlehq/moodle-php-apache, puerto 8080)
✅ Moodle clonado en `./moodle` (branch actual, 62662 archivos)
✅ `indicators.json` (10 unidades, 30 indicadores, 5 pts c/u) creado
✅ `import_indicators.php` (detecta `public/config.php` para Moodle 4.4) creado
✅ `theme_custom` copiado desde `public/theme/boost`
✅ Plugin `public/local/marcado` creado (`version.php` + `mark.php` con CORS)
✅ `marcar_leido_moodle.js` en `Portal_TIC_Final/` para integrar "Marcar como leído"
✅ `assets/` y `theme_custom/` montados en docker-compose (corregido para Moodle 4.4 `public/`)

⚠️ **Docker NO detectado** en esta máquina (`docker --version` falló). Debes instalarlo antes de `docker compose up -d`.

## 1️⃣ Instalar Docker Desktop (requerido)

1. Descarga https://www.docker.com/products/docker-desktop/
2. Instala con WSL2 habilitado (Windows 10/11)
3. Reinicia y verifica en PowerShell:
```powershell
docker --version
docker compose version
```

Alternativa sin Docker: usa XAMPP (Apache+PHP 8.2+MariaDB) y copia `moodle/` a `C:/xampp/htdocs/`, luego visita `http://localhost/moodle`.

## 2️⃣ Levantar Moodle (cuando Docker esté listo)

```powershell
cd "C:\Users\HP 250 G10\Documents\GITHUT\Centuria\moodle"
docker compose up -d
# Espera 30-40s, luego:
docker compose logs -f web  # Ctrl+C para salir
```

Abre http://localhost:8080
- Usuario: `admin` / `admin_pwd` (definidos en docker-compose.yml)
- Si ves el instalador, espera a que `moodle_db` termine de inicializar y recarga.

Desmontar:
```powershell
docker compose down        # mantiene DB
docker compose down -v     # borra DB (reset total)
```

## 3️⃣ Tema personalizado

```powershell
# Ya copiado en ./theme_custom, edita:
notepad "C:\Users\HP 250 G10\Documents\GITHUT\Centuria\moodle\theme_custom\config.php"
# Cambia: $THEME->name = 'theme_custom';
# Luego en Moodle: Administración > Apariencia > Temas > Selector de temas > theme_custom
```

Copia tu CSS:
```powershell
Copy-Item "C:\Users\HP 250 G10\Documents\GITHUT\Centuria\TIC\Portal_TIC_Final\estilos.css" -Destination "C:\Users\HP 250 G10\Documents\GITHUT\Centuria\moodle\theme_custom\style\"
```

## 4️⃣ Importar indicadores al Gradebook

1. Crea un curso en Moodle (ej. "TIC - ADE18") y anota su ID (URL `?id=3` → ID 3)
2. Ejecuta:
```powershell
# Desde el host (requiere php local) o dentro del contenedor:
docker exec -i moodle_web php /var/www/html/import_indicators.php 3
# o si tu Moodle está en /var/www/html/public:
docker exec -i moodle_web php /var/www/html/public/local/marcado/../import_indicators.php 3
# Alternativa directa (corregida para 4.4):
docker exec -i moodle_web php /var/www/html/public/local/marcado/../../import_indicators.php 3
```
Si falla la ruta, usa:
```powershell
docker exec -i moodle_web ls /var/www/html/
docker exec -i moodle_web ls /var/www/html/public/
```

## 5️⃣ Probar "Marcar como leído" → Moodle

1. Inicia sesión en Moodle como estudiante
2. Abre `http://localhost:8080` y copia tu `userid` (Perfil > o tabla `mdl_user`)
3. Edita `C:\Users\HP 250 G10\Documents\GITHUT\Centuria\TIC\Portal_TIC_Final\marcar_leido_moodle.js` y pon `window.MOODLE_USER_ID = <tu id>;`
4. En `Portal_TIC_Final/Materiales_Clases/clase_01.html` añade antes de `</script>`:
```html
<script src="../marcar_leido_moodle.js"></script>
```
5. Pulsa "Marcar como Leído" y verifica en BD:
```powershell
docker exec -i moodle_db mysql -u moodle_user -pmoodle_pwd moodle -e "SELECT * FROM mdl_user_preferences WHERE name LIKE 'marcado_%';"
```

## Archivos creados

| Archivo | Propósito |
|---|---|
| `docker-compose.yml` | Levanta DB + Apache + Moodle en 8080 |
| `moodle/` | Código fuente Moodle (clonado) |
| `indicators.json` | 10 unidades x 3 indicadores |
| `import_indicators.php` | Crea categorías/items en gradebook |
| `theme_custom/` | Tema hijo de Boost |
| `moodle/public/local/marcado/` | Plugin API `mark.php` |
| `assets/` | Montaje para tus recursos |

## Próximos pasos

1. Instala Docker Desktop y ejecuta `docker compose up -d`
2. Crea curso y ejecuta `import_indicators.php <courseid>`
3. Activa `theme_custom` y verifica `indicators.json` en Calificaciones
4. Integra `marcar_leido_moodle.js` en tus 10 clases
