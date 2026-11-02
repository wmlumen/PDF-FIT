
## 2026-11-02 - imp_1793581016474_posg6uvg
**Agent:** Claude
**Type:** task_passed
**Description:** A pedido explicito del usuario ('Sumalo igual') se sumo HIDRO_PARAGUAY_2002.shp (106.313 lineas, con NOMBRE, .prj propio UTM21S) como fuente adicional en convertir.cmd (-select NOMBRE) y hidrografia-oficial.mjs (detalle:'nacional_2002', clasificado con el mismo tipoDeNombre que 2012). NO reemplaza al 2012, se suma sin deduplicacion geometrica (advertido antes de sumarlo): puede haber el mismo rio dibujado 2 veces (2002 y 2012). Resultado: lineas.geojson paso de 48.796 a 154.867 features (396MB en disco, antes 201MB); laguna/embalse reclasificados en areas subio de 80 a 126 de 1071 (mas lineas con nombre 'laguna'/'embalse' disponibles del 2002 para el match por bbox). Medido: node -e JSON.parse del archivo nuevo tarda ~2.5s y usa ~1.6GB RSS en memoria (antes bastante menos) -- el servidor en marcha todavia no se reinicio con esto, pendiente de confirmacion explicita del usuario (ya se le aviso del costo de memoria/tiempo). npm run lint:encoding OK, node --check OK.

```diff

```

## 2026-11-02 - imp_1793581022206_ixg8ut90
**Agent:** Claude
**Type:** task_passed
**Description:** convertir.cmd: se agrego conversion de HIDRO_PARAGUAY_2002.shp -> hidro_oficial_2002.geojson (-select NOMBRE).

```diff

```
