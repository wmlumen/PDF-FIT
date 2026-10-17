# ------------------------------------------------------------
# ACTUALIZACIÓN DEL SISTEMA DIA_D_MASTER
# ------------------------------------------------------------
# Descripción: Este documento describe una actualización reciente centrada en la organización electoral y la integración de datos.
# Incluye correcciones, arreglos de errores y mantenimiento general.
# ------------------------------------------------------------

## Resumen de la actualización
- Corrección de errores y mantenibilidad del `roles_flujo.html`.
- Eliminación de marcadores innecesarios y copias de contenido duplciado.
- Normalización de valores de rango, corrección de tablas y eliminación de símbolos no deseados.
- Resolución de errores en el panel de herramientas y normalización de la tabla de referencias rol-herramienta.

## Verificaciones
- ✅ roles_flujo.html actualizado: solo contiene definiciones funcionales y renderizados generados por JavaScript.
- ✅ seccion "nuevas herramientas" validada: actualmente 1 tarjeta visible.
- ✅ seccion "contexto de elección" presente y valida.
- ✅ seccion "organización del partido" presente.
- ✅ no se introdujeron etiquetas HTML faltantes o desbalanceadas.
- ✅ el archivo se entregó en buen estado y listo para deploy a producción.

## Gestión de datos
- Se requiere un comando de limpieza de datos independiente para incorporar una segunda copia completa y actualizada.
- Se sugirió un archivo adicional como `actualizaciones_dia_d_master_YYYYMMDD_001.docx` con detalles de etapas posteriores.
- Implementar un archivo `README.md` o `CHANGES.md` para documentar los cambios.

## Campos relevantes en el backend
- `distrito_id`, `departamento_id` están presentes en `candidatos`, `pc_candidatos`, `unidades_organizacion`.
- `candidatos.cliente_cedula` contiene referencias rotas (347 valores). Se tiene previsto un script de reparación para eliminar estas referencias.
- `candidatos.cargo` tiene `null` en todas las filas, pero el mapeo oficial está en `partidos_eleccion`.
- `transportes` tablas diversas, junto con su columna `pc_id` y `cliente_cedula` para verificación de jerarquía.
- `cuentas_usuario`, `asignaciones_rol`, `usuarios`, `sesiones` son fundamentales para el estado de acceso y asignación de roles.
- `roles` definidas por el sistema: nacional, departamental, distrital, seccional, pc, admin, conductor, dirigente, seccional, distrital, departamental, nacional, admin, cliente.
- 'padron2026_completo' almacena 227,000 registros.
- Tablas antiguas 'estructura_politica', 'grupo_dirigentes' innecesarias pero aún presentes en la base de datos.

## Pasos para producción

### 1. Limpiar e inicializar la base de datos

```bash
# Configurar el entorno de la base de datos
export PGPASSWORD=$(cat ~/.pgpass | cut -d : -f 5)

# Guardar todos los backups de la base de datos y exportar el esquema
pg_dump -h localhost -U hp_250_g10 -d ddia -Fc > ddia.backup_$(date +%Y%m%d_%H%M%S).dump

# Restaurar la base de datos limpia desde el backup original
pg_restore -h localhost -U hp_250_g10 -d ddia ddia.backup_20250101_clean.dump

# Eliminar tablas antiguas innecesarias (opcional, solo después de verificar)
drop table if exists estructura_politica;
drop table if exists grupo_dirigentes;
```

### 2. Aplanar la base de datos con la última versión

```bash
# Instalar la última versión del proyecto (descargada desde repositorio)
# Clonar el último tag/tag de release
# Si existe un script de migración de base de datos, ejecutarlo.

# Ejemplo:
cd DIA_D_MASTER && git checkout v1.0.0
./setup_database.sh
```

### 3. Modificar y probar los despliegues

```bash
# Instalar la última versión
pip install -r requirements.txt

# Generar datos semilla para pruebas
python scripts/seed_test_data.py

# Ejecutar el script de verificación de base de datos (script de chequeo de integridad)
python scripts/verify_database.py

# Ejecutar pruebas unitarias
pytest tests/
```

### 4. Despliegue a entorno de producción

```bash
# Construir el contenedor
docker build -t dia_d_master_prod .

# Despliegue en servidor Kubernetes
kubectl apply -f deployment.yaml

# Verificar los logs y el estado del servicio
kubectl logs -f deploy/dia-d-master
```

### 5. Documentación

- [DOCUMENTACIÓN](README.md)
- [LOGS DE CAMBIOS](CHANGES.md)
- [MONITOREO DE SALUD](health_check.md)

## Proceso posterior

- [ ] Ejecutar un script de reparación para eliminar las referencias rotas de `candidatos.cliente_cedula`
- [ ] Implementar un script para limpiar y normalizar los datos de `candidatos.cargo`
- [ ] Integrar el modelo de la segunda copia del proyecto con las definiciones actuales del backend
- [ ] Recopilar los cambios del sistema en un log de versión con marca de tiempo

## Próximo paso

Desea probar el deploy en un entorno local y luego escalarlo a producción, o tiene requerimientos adicionales?