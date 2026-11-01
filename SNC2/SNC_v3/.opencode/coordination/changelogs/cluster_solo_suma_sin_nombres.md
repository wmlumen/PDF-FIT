
## 2026-11-01 - imp_1793573701148_ymg7wyxt
**Agent:** Claude
**Type:** task_passed
**Description:** A pedido del usuario ('que el cluster solo sumen sin separar'): la pastilla fusionada ya no concatena nombres de distritos (antes: 'CAPIATA + SAN LORENZO', hasta 364px de ancho, lo que generaba solape propio); ahora siempre muestra un total corto tipo 'N distritos'/'N departamentos' etc. (PLURAL_NIVEL_CLUSTER), sea cual sea la cantidad fusionada. El detalle de nombres se mantiene en el tooltip (subtitulo), que no afecta el ancho de la pastilla. Verificado en vivo: pastillas muestran '2 distritos', '3 distritos', etc.

```diff

```
