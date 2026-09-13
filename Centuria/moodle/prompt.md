# Sub‑agent Synchronization Checklist

## 1️⃣ Prerequisitos del entorno
- **Sistema operativo**: Windows 10 (versión 2004 o superior) o Windows 11.
- **Docker Desktop** instalado y **daemon activo** (icono verde en la barra de tareas).
- **WSL 2** habilitado **o** Hyper‑V activo (Docker Desktop lo requiere).
- **PowerShell** ejecutado como **administrador** para los comandos de servicios.
- **Acceso a internet** (para descargar imágenes Docker y paquetes npm si se usan).

## 2️⃣ Herramientas y dependencias
- `docker` y `docker compose` (incluidos con Docker Desktop).
- **Python 3.10+** (para los scripts de extracción y generación de HTML).
- **Node.js** (solo si los sub‑agents usan scripts JS).
- **Git** (opcional, para clonaciones y control de versiones).

## 3️⃣ Configuración del proyecto
1. **Clonar o copiar** el repositorio en una carpeta dentro del workspace:
   ```
   C:\Users\HP 250 G10\Documents\GITHUT\Centuria\moodle
   ```
2. **Copiar** el `docker‑compose.yml` del directorio de artefactos al directorio **moodle**.
3. **Eliminar** la línea `version: "3.8"` del compose (solo una advertencia).
4. **Crear** la carpeta `local/` dentro de Moodle y colocar allí `import_indicators.php`.

## 4️⃣ Lanzar los contenedores
```powershell
cd "C:\Users\HP 250 G10\Documents\GITHUT\Centuria\moodle"
docker compose up -d
```
- Verificar con `docker ps` que aparecen `moodle_web` y `moodle_db`.
- Acceder a `http://localhost:8080` y entrar con `admin / admin_pwd`.

## 5️⃣ Sub‑agents (sincronización)
- Cada sub‑agent se crea con **`invoke_subagent`** y recibe su propio **conversationId**.
- Para que trabajen **sincronizados** deben compartir:
  1. **Estado común** (por ejemplo, el ID del curso de Moodle) guardado en un archivo JSON dentro del workspace o en una variable de entorno.
  2. **Mensajes de coordinación** usando `send_message` entre sus IDs de conversación.
  3. **Bloqueos de recurso** opcionales usando `schedule` (timer) o `manage_task` para esperar a que un agente finalice una tarea antes de que otro la continúe.
- **Ejemplo de flujo**:
  1. **Agente A** crea el curso en Moodle y escribe el `courseId` en `shared_state.json`.
  2. **Agente B** lee `shared_state.json`, importa los indicadores usando el `courseId` y notifica a **Agente C**.
  3. **Agente C** genera la página de evaluación y actualiza la UI.
  
  Los agentes usan `read_file`/`write_file` para el JSON y `send_message` para avisar al siguiente agente.

## 6️⃣ Qué falta todavía (para que todo funcione)
- **Docker Desktop** todavía no está instalado o el daemon no está corriendo. Instalarlo y habilitar WSL 2/Hyper‑V es imprescindible.
- **`com.docker.service`** no existe porque Docker Desktop no se ha registrado como servicio; al instalar Docker Desktop se creará automáticamente.
- **Archivo `docker-compose.yml`** debe estar en la carpeta `moodle` (ya copiado, solo falta eliminar la línea `version`).
- **Credenciales de Moodle** (`admin_pwd`) deben coincidir con las variables del compose.
- **Sub‑agents** aún no se han creado; se necesita definir al menos dos (por ejemplo, `create_course` y `import_indicators`) usando `define_subagent` o directamente `invoke_subagent` con la descripción adecuada.
- **Archivo `shared_state.json`** (o similar) debe ser creado antes de la primera coordinación.

## 7️⃣ Pasos finales recomendados
1. Instalar Docker Desktop y reiniciar.
2. Verificar `docker version` (ambas secciones).
3. Ejecutar `docker compose up -d` dentro de `moodle`.
4. Definir los sub‑agents con `define_subagent` (o usar `invoke_subagent` directamente) y asegurarse de que comparten `shared_state.json`.
5. Probar la sincronización enviando un mensaje de prueba entre agentes.

---
*Este documento está pensado para ser guardado como `prompt.md` en el directorio de artefactos y usado como referencia para la puesta en marcha y la coordinación de sub‑agents.*
