
## 2026-11-02 - imp_1793585440301_mruveoal
**Agent:** Claude
**Type:** task_passed
**Description:** A pedido del usuario (seleccion de #stat-barrio mostrando 'MARIA AUXILI...' cortado + 'no muestra todo el dato'): index.html:271,275,279 (Dpto./Distrito/Barrio en 'Estado del Proyecto') usaban 'truncate' (white-space:nowrap + ellipsis) en una grilla de 3 columnas con celdas de solo ~82px; nombres largos como 'Maria Auxiliadora' se cortaban. Se cambio 'truncate' por 'whitespace-normal break-words leading-tight' en los 3 <p> de valor (no en las etiquetas Dpto./Distrito/Barrio, que son fijas y cortas) para que el texto baje de linea en vez de cortarse. Verificado en vivo: con 'MARIA AUXILIADORA' el texto completo se ve en 2 lineas, scrollWidth=clientWidth (sin recorte), sin errores nuevos en consola. npm run lint:encoding y tests/all-index-functionalities.test.mjs (8/8) en verde.

```diff

```
