
## 2026-11-02 - imp_1793580393952_k6kzanbw
**Agent:** Claude
**Type:** task_passed
**Description:** A pedido del usuario (PY-IA/SIG/02.Hidrografia/01.Nacional/Rios principales poligonos: incorporar rios, capturar inundaciones/espejos de agua/laguna y arroyos no identificados). Se incorporo rios_paraguay_2012.shp (4582 cauces sin nombre ni atributos, sin .dbf) como fuente nueva en convertir.cmd y hidrografia-oficial.mjs. Se renombro el bucket 'otro' a 'arroyo_no_identificado' para lineas sin nombre (antes 23641 'otro' -> ahora 9 'otro' real + 28214 'arroyo_no_identificado'); se amplio el regex de arroyo para cubrir canadon/cañadón. Las 1071 areas (poligonos, HIDRO_PARAGUAY_2012_POLYt.shp, solo tienen un Id numerico, sin nombre) se reclasifican por cercania de bbox (margen ~1km) contra las lineas ya identificadas como laguna/embalse: 80 de 1071 quedaron como laguna/embalse (ej. 'Lago del Rio Yguazu'), el resto sigue como 'ribera' generico. HIDRO_PARAGUAY_2002.shp (106313 lineas, mas detallado que el 2012) se inspecciono pero NO se incorporo por redundancia/tamano (duplicaria ~160MB+ con el 2012 sin deduplicacion geometrica); queda pendiente de decision del usuario. El servidor en marcha tiene el cache de /api/v3/hidrografia viejo (hidroCache en memoria, server-api.js:466): falta reinicio para que sirva los datos nuevos, pendiente de confirmacion del usuario (regla de la sesion). npm run lint:encoding OK.

```diff

```

## 2026-11-02 - imp_1793580400442_j2dvc7p1
**Agent:** Claude
**Type:** task_passed
**Description:** convertir.cmd extendido para agregar rios_paraguay_2012.shp -> hidro_oficial_rios2012_sin_nombre.geojson (gitignorado, parte de data/1.Paraguay).

```diff

```
