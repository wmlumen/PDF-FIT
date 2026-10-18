# Estructura segura de SNC_v3

- `index.html`, `admin.html`, `members.html`, `register.html`, `recover.html`: entradas web que permanecen en la raíz por compatibilidad con Express y Firebase Hosting.
- `js/`: módulos funcionales de frontend.
- `css/`: estilos de la aplicación.
- `data/`: datos geográficos y base local; las bases de datos no se versionan.
- `tests/`: pruebas automatizadas y páginas manuales de diagnóstico pendientes de migración.
- `config/examples/`: plantillas públicas sin credenciales.
- `scripts/`: respaldo y restauración segura.
- `backup/secure/`: respaldos locales ignorados por Git. Los secretos usan Windows DPAPI y solo pueden descifrarse con la misma cuenta de Windows.

## Reglas de seguridad

1. Nunca subir `.env`, `serviceAccountKey.json`, bases locales, archivos `*.dpapi` o respaldos privados.
2. No colocar contraseñas, claves privadas o `JWT_SECRET` dentro de HTML o JavaScript del navegador.
3. Compartir únicamente las plantillas de `config/examples/`.
4. Ejecutar `scripts/backup-secure.ps1` para generar un ZIP de código y copias cifradas de secretos.
5. El HTML externo `C:\Users\HP 250 G10\Documents\GITHUT\index.html` pertenece a SECCIONAL 40 y no forma parte de SNC_v3.
